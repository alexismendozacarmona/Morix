/**
 * NotificationsContext — Offline-first con Supabase como respaldo
 *
 * Estrategia:
 *  1. localStorage como fuente primaria (carga inmediata, sin latencia)
 *  2. Supabase como respaldo persistente
 *
 * REGLA FUNDAMENTAL: nunca procesar userId === null.
 * Solo usuarios autenticados tienen notificaciones persistentes.
 *
 * Flujos:
 *  • Al montar/login: carga localStorage → fetch Supabase → merge+dedup → actualiza ambos
 *  • Al logout:       limpia estado en memoria (no toca localStorage del usuario)
 *  • Al crear notif:  verifica dedupKey → guarda localStorage + upsert Supabase
 *  • Al marcar leída: localStorage + Supabase inmediato
 *  • Al descartar:    tombstone + localStorage + delete Supabase
 *  • Al limpiar todo: tombstone masivo + localStorage + delete all Supabase
 */
import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, useMemo, type ReactNode,
} from 'react';
import { supabase, type DbPersonalNotification } from '../../lib/supabase';
import { useAuth } from './AuthContext';
import { useUserProgress } from './UserProgressContext';
import { useSettings } from './SettingsContext';
import { useBroadcastNotifications } from './BroadcastNotificationsContext';
import { useSocial } from './SocialContext';
import type { Contenido } from '../data/mockData';
import {
  ACHIEVEMENTS, RARITY_CONFIG, buildAchievementProgress,
} from '../utils/achievementsConfig';
import { fireSystemNotification } from '../utils/capacitorUtils';

// ─── Helpers de datos ─────────────────────────────────────────────────────────
function getAdminVideosFromStorage(): Contenido[] {
  try { return JSON.parse(localStorage.getItem('morix_admin_videos_v1') || '[]'); }
  catch { return []; }
}

/** Fuente de verdad: user_id de la sesión activa (síncrono) */
function sessionUid(): string | null {
  return localStorage.getItem('morix_session_v1');
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type NotifType =
  | 'completion' | 'reminder' | 'new_content'
  | 'streak'     | 'achievement' | 'level_up';

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  videoId?: string;
  timestamp: number;
  read: boolean;
  icon: string;
  accentColor: string;
}

interface NotificationsContextType {
  notifications:   AppNotification[];
  unreadCount:     number;
  supabaseSynced:  boolean;
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markRead:        (id: string) => void;
  markAllRead:     () => void;
  dismiss:         (id: string) => void;
  clearAll:        () => void;
}

// ─── HMR-safe singleton ───────────────────────────────────────────────────────
const CTX_KEY = '__morix_notifications_ctx__';
declare global { interface Window { [CTX_KEY]: unknown } }
if (!window[CTX_KEY]) {
  window[CTX_KEY] = createContext<NotificationsContextType | null>(null);
}
const NotificationsCtx = window[CTX_KEY] as React.Context<NotificationsContextType | null>;

// ─── localStorage keys (siempre con uid real, nunca null/guest) ───────────────
const lsNotifs               = (uid: string) => `morix_notifications_v1_${uid}`;
const lsSeeded               = (uid: string) => `morix_notifs_seeded_v1_${uid}`;
const lsReminded             = (uid: string) => `morix_notifs_reminded_v1_${uid}`;
const lsCompletedNotif       = (uid: string) => `morix_notifs_completed_v1_${uid}`;
const lsNotifiedLevel        = (uid: string) => `morix_notifs_level_v1_${uid}`;
const lsNotifiedAchievements = (uid: string) => `morix_notifs_achievements_v1_${uid}`;
const lsNewContentNotifIds   = (uid: string) => `morix_notifs_new_content_ids_v1_${uid}`;
const lsDeletedIds           = (uid: string) => `morix_notifs_deleted_v1_${uid}`;

// ─── localStorage helpers ─────────────────────────────────────────────────────
function loadNotifs(uid: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(lsNotifs(uid));
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch { return []; }
}
function saveNotifs(n: AppNotification[], uid: string): void {
  try { localStorage.setItem(lsNotifs(uid), JSON.stringify(n)); } catch { /* ignore */ }
}

function loadDeletedIds(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(lsDeletedIds(uid));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveDeletedIds(ids: Set<string>, uid: string): void {
  try { localStorage.setItem(lsDeletedIds(uid), JSON.stringify([...ids])); } catch { /* ignore */ }
}
function addDeletedId(id: string, uid: string): void {
  const ids = loadDeletedIds(uid); ids.add(id); saveDeletedIds(ids, uid);
}
function addDeletedIds(newIds: string[], uid: string): void {
  if (!newIds.length) return;
  const ids = loadDeletedIds(uid); newIds.forEach(id => ids.add(id)); saveDeletedIds(ids, uid);
}

function hasBeenSeeded(uid: string): boolean { return !!localStorage.getItem(lsSeeded(uid)); }
function markSeeded(uid: string): void { try { localStorage.setItem(lsSeeded(uid), '1'); } catch { /* ignore */ } }

function loadNotifiedLevel(uid: string): number {
  try { return parseInt(localStorage.getItem(lsNotifiedLevel(uid)) ?? '0', 10) || 0; } catch { return 0; }
}
function saveNotifiedLevel(level: number, uid: string): void {
  try { localStorage.setItem(lsNotifiedLevel(uid), String(level)); } catch { /* ignore */ }
}

function loadNotifiedAchievementIds(uid: string): Set<string> {
  try { const raw = localStorage.getItem(lsNotifiedAchievements(uid)); return new Set(raw ? JSON.parse(raw) : []); }
  catch { return new Set(); }
}
function saveNotifiedAchievementIds(ids: Set<string>, uid: string): void {
  try { localStorage.setItem(lsNotifiedAchievements(uid), JSON.stringify([...ids])); } catch { /* ignore */ }
}

function loadNewContentNotifIds(uid: string): Set<string> {
  try { const raw = localStorage.getItem(lsNewContentNotifIds(uid)); return new Set(raw ? JSON.parse(raw) : []); }
  catch { return new Set(); }
}
function saveNewContentNotifIds(ids: Set<string>, uid: string): void {
  try { localStorage.setItem(lsNewContentNotifIds(uid), JSON.stringify([...ids])); } catch { /* ignore */ }
}

function loadRemindedIds(uid: string): Set<string> {
  try { const raw = localStorage.getItem(lsReminded(uid)); return new Set(raw ? JSON.parse(raw) : []); }
  catch { return new Set(); }
}
function saveRemindedIds(ids: Set<string>, uid: string): void {
  try { localStorage.setItem(lsReminded(uid), JSON.stringify([...ids])); } catch { /* ignore */ }
}

function loadCompletedNotifIds(uid: string): Set<string> {
  try { const raw = localStorage.getItem(lsCompletedNotif(uid)); return new Set(raw ? JSON.parse(raw) : []); }
  catch { return new Set(); }
}
function saveCompletedNotifIds(ids: Set<string>, uid: string): void {
  try { localStorage.setItem(lsCompletedNotif(uid), JSON.stringify([...ids])); } catch { /* ignore */ }
}

function makeId(): string { return `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

// ─── Clave de deduplicación lógica ────────────────────────────────────────────
/**
 * Dos notificaciones con la misma dedupKey son "el mismo evento lógico".
 * Solo se conserva la más reciente (con merge del estado read).
 */
function dedupKey(n: AppNotification): string {
  if (n.videoId) return `${n.type}::${n.videoId}`;
  if (n.type === 'level_up')    return `level_up::${n.title}`;
  if (n.type === 'streak')      return 'streak';
  if (n.type === 'achievement') return `achievement::${n.body}`;
  return `${n.type}::${n.title}`;
}

/** Elimina duplicados lógicos: por cada dedupKey conserva la notificación más reciente. */
function deduplicateNotifs(notifs: AppNotification[]): AppNotification[] {
  const map = new Map<string, AppNotification>();
  // Ordenar desc por timestamp para que el primero que inserte en el map sea el más reciente
  const sorted = [...notifs].sort((a, b) => b.timestamp - a.timestamp);
  sorted.forEach(n => {
    const key = dedupKey(n);
    if (!map.has(key)) {
      map.set(key, n);
    } else {
      // Preservar read=true si alguno lo tiene
      const existing = map.get(key)!;
      if (n.read && !existing.read) map.set(key, { ...existing, read: true });
    }
  });
  return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
}

// ─── Conversores App ↔ Supabase ───────────────────────────────────────────────
function notifToRow(n: AppNotification, uid: string): DbPersonalNotification {
  return {
    id: n.id, user_id: uid, type: n.type, title: n.title, body: n.body,
    video_id: n.videoId ?? null, timestamp: n.timestamp, read: n.read,
    icon: n.icon, accent_color: n.accentColor,
  };
}
function rowToNotif(r: DbPersonalNotification): AppNotification {
  return {
    id: r.id, type: r.type as NotifType, title: r.title, body: r.body,
    videoId: r.video_id ?? undefined, timestamp: r.timestamp, read: r.read,
    icon: r.icon, accentColor: r.accent_color,
  };
}

/**
 * Merge local + remoto:
 * 1. Ignora IDs en tombstone
 * 2. read=true gana
 * 3. Deduplica por clave lógica al final
 * 4. Retorna IDs de Supabase que son duplicados para borrarlos allá
 */
function mergeNotifs(
  local: AppNotification[],
  remote: AppNotification[],
  deletedIds: Set<string>,
): { merged: AppNotification[]; supabaseIdsToDelete: string[] } {
  const byId = new Map<string, AppNotification>();

  local.forEach(n => { if (!deletedIds.has(n.id)) byId.set(n.id, n); });
  remote.forEach(r => {
    if (deletedIds.has(r.id)) return;
    const existing = byId.get(r.id);
    if (!existing) {
      byId.set(r.id, r);
    } else {
      byId.set(r.id, { ...existing, read: existing.read || r.read });
    }
  });

  const all = Array.from(byId.values()).sort((a, b) => b.timestamp - a.timestamp);

  // Segunda pasada: deduplicar por clave lógica
  const dedupMap = new Map<string, AppNotification>();
  const remoteIdSet = new Set(remote.map(r => r.id));
  const supabaseIdsToDelete: string[] = [];

  all.forEach(n => {
    const key = dedupKey(n);
    if (!dedupMap.has(key)) {
      dedupMap.set(key, n);
    } else {
      const existing = dedupMap.get(key)!;
      if (n.timestamp > existing.timestamp) {
        // n es más reciente → existing es el duplicado a borrar de Supabase
        if (remoteIdSet.has(existing.id)) supabaseIdsToDelete.push(existing.id);
        dedupMap.set(key, { ...n, read: n.read || existing.read });
      } else {
        // existing es más reciente → n es el duplicado
        if (remoteIdSet.has(n.id)) supabaseIdsToDelete.push(n.id);
        if (n.read) dedupMap.set(key, { ...existing, read: true });
      }
    }
  });

  return {
    merged: Array.from(dedupMap.values()).sort((a, b) => b.timestamp - a.timestamp),
    supabaseIdsToDelete,
  };
}

// ─── Supabase operations ──────────────────────────────────────────────────────
async function supabaseFetchNotifs(uid: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('morix_personal_notifications')
    .select('*')
    .eq('user_id', uid)
    .order('timestamp', { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return (data as DbPersonalNotification[]).map(rowToNotif);
}
async function supabaseUpsertNotifs(notifs: AppNotification[], uid: string): Promise<void> {
  if (!uid || !notifs.length) return;
  const rows = notifs.map(n => notifToRow(n, uid));
  const { error } = await supabase
    .from('morix_personal_notifications')
    .upsert(rows, { onConflict: 'id,user_id' });
  if (error) console.warn('[Notifs] upsert error:', error.message);
}
async function supabaseDeleteNotif(id: string, uid: string): Promise<void> {
  const { error } = await supabase
    .from('morix_personal_notifications')
    .delete().eq('id', id).eq('user_id', uid);
  if (error) console.warn('[Notifs] delete error:', error.message);
}
async function supabaseDeleteManyNotifs(ids: string[], uid: string): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase
    .from('morix_personal_notifications')
    .delete().in('id', ids).eq('user_id', uid);
  if (error) console.warn('[Notifs] deleteMany error:', error.message);
}
async function supabaseDeleteAllNotifs(uid: string): Promise<void> {
  const { error } = await supabase
    .from('morix_personal_notifications')
    .delete().eq('user_id', uid);
  if (error) console.warn('[Notifs] deleteAll error:', error.message);
}
async function supabaseMarkRead(id: string, uid: string): Promise<void> {
  const { error } = await supabase
    .from('morix_personal_notifications')
    .update({ read: true }).eq('id', id).eq('user_id', uid);
  if (error) console.warn('[Notifs] markRead error:', error.message);
}
async function supabaseMarkAllRead(uid: string): Promise<void> {
  const { error } = await supabase
    .from('morix_personal_notifications')
    .update({ read: true }).eq('user_id', uid);
  if (error) console.warn('[Notifs] markAllRead error:', error.message);
}

// ─── Seed inicial (solo para usuarios nuevos, SIN datos inventados) ──────────
/**
 * Solo genera notificaciones de contenido nuevo real disponible en el admin.
 * NO genera notificaciones de racha ni de logros inventados.
 * Las rachas y logros se notifican solo cuando ocurren de verdad (useEffects reactivos).
 */
function seedInitial(uid: string): AppNotification[] {
  const now = Date.now();
  const newVideos = getAdminVideosFromStorage().filter(v => v.nuevo).slice(0, 3);

  if (newVideos.length > 0) {
    const existing = loadNewContentNotifIds(uid);
    saveNewContentNotifIds(new Set([...existing, ...newVideos.map(v => v.id)]), uid);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return deduplicateNotifs(newVideos.map((v): AppNotification => ({
    id: makeId(), type: 'new_content',
    title: '⭐ Nuevo contenido disponible',
    body: `"${v.titulo}" ya está disponible en ${v.categoria}`,
    videoId: v.id, timestamp: (v as any).createdAt ?? now,
    read: false, icon: '⭐', accentColor: '#8b5cf6',
  })));
}

// ─── Limpia notificaciones falsas generadas por versiones anteriores ──────────
const lsCleanedFakes = (uid: string) => `morix_notifs_cleaned_fakes_v1_${uid}`;

/**
 * Elimina de localStorage y Supabase las notificaciones inventadas que
 * generaba la versión anterior de seedInitial:
 *  - type='streak' con título que contenga "días de racha" (solo las de seed, no las reales)
 *  - type='achievement' con título 'Logro cercano: Explorador'
 *
 * Solo corre una vez por usuario (flag lsCleanedFakes).
 */
async function cleanFakeNotifications(uid: string, currentNotifs: AppNotification[]): Promise<AppNotification[]> {
  const alreadyCleaned = !!localStorage.getItem(lsCleanedFakes(uid));
  if (alreadyCleaned) return currentNotifs;

  const isFake = (n: AppNotification): boolean => {
    if (n.type === 'streak' && n.title.includes('días de racha')) return true;
    if (n.type === 'achievement' && n.title === 'Logro cercano: Explorador') return true;
    return false;
  };

  const fakeIds = currentNotifs.filter(isFake).map(n => n.id);
  if (fakeIds.length > 0) {
    addDeletedIds(fakeIds, uid);
    // Borrar de Supabase
    await supabase
      .from('morix_personal_notifications')
      .delete()
      .eq('user_id', uid)
      .in('id', fakeIds);
  }

  localStorage.setItem(lsCleanedFakes(uid), '1');
  return currentNotifs.filter(n => !isFake(n));
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const {
    streak, levelInfo, watchedVideos, videoProgresses, totalVideosWatched,
    totalMinutes, bestStreak, categoryStats, totalXP, savedVideos, watchHistory, daysActive, dailyStats,
  } = useUserProgress();
  const { appSettings } = useSettings();
  const {
    broadcasts, dismissedIds, readIds: bcReadIds,
    dismissBroadcast, markBroadcastRead, markAllBroadcastsRead,
    dismissAllBroadcasts,
  } = useBroadcastNotifications();
  const { publishActivity } = useSocial();

  // ── Estado principal ───────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const uid = sessionUid();
    return uid ? deduplicateNotifs(loadNotifs(uid)) : [];
  });
  const [supabaseSynced, setSupabaseSynced] = useState(false);

  // Ref para acceder a notifications actual desde cualquier callback sin stale closure
  const notificationsRef = useRef(notifications);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  // Ref para appSettings.notificaciones (accesible dentro de addNotifs sin stale closure)
  const notifsEnabledRef = useRef(appSettings.notificaciones);
  useEffect(() => { notifsEnabledRef.current = appSettings.notificaciones; }, [appSettings.notificaciones]);

  // ── Guardado en localStorage en cada cambio ───────────────────────────────
  useEffect(() => {
    const uid = sessionUid();
    if (uid) saveNotifs(notifications, uid);
  }, [notifications]);

  // ── Safety net: guardar al cerrar la pestaña ─────────────────────────────
  useEffect(() => {
    const handleUnload = () => {
      const uid = sessionUid();
      if (uid) saveNotifs(notificationsRef.current, uid);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // ── addNotifs: agrega evitando duplicados lógicos ─────────────────────────
  const addNotifs = useCallback((newItems: AppNotification[]) => {
    const uid = sessionUid();
    if (!uid) return; // nunca agregar notifs sin usuario autenticado
    setNotifications(prev => {
      const existingKeys = new Set(prev.map(dedupKey));
      const toAdd = newItems.filter(n => !existingKeys.has(dedupKey(n)));
      if (!toAdd.length) return prev;
      const next = deduplicateNotifs([...toAdd, ...prev]);
      saveNotifs(next, uid);
      supabaseUpsertNotifs(toAdd, uid);

      // ── Disparar notificaciones del sistema para cada nueva notif ──
      if (notifsEnabledRef.current) {
        toAdd.forEach(n => {
          fireSystemNotification(n.title, n.body);
        });
      }

      return next;
    });
  }, []);

  // ── Debounce sync a Supabase ──────────────────────────────────────────────
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleReadSync = useCallback((notifs: AppNotification[], uid: string) => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => { supabaseUpsertNotifs(notifs, uid); }, 2000);
  }, []);

  // ─── Carga inicial / cambio de usuario ───────────────────────────────────
  const prevUserRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prevUserRef.current === userId) return;
    prevUserRef.current = userId;
    setSupabaseSynced(false);

    // REGLA: sin usuario autenticado → limpiar y salir
    if (!userId) {
      setNotifications([]);
      setSupabaseSynced(true);
      return;
    }

    // 1. Carga inmediata desde localStorage (deduplicado)
    const local = deduplicateNotifs(loadNotifs(userId));

    if (!hasBeenSeeded(userId)) {
      markSeeded(userId);
      const seeded = seedInitial(userId);
      // Combinar con local existente (puede haber notifs de sesión anterior sin seed)
      const combined = deduplicateNotifs([...seeded, ...local]);
      saveNotifs(combined, userId);
      setNotifications(combined);
      supabaseUpsertNotifs(combined, userId);
    } else {
      // Limpiar notificaciones falsas de versiones anteriores (async, sin bloquear)
      const uid = userId;
      cleanFakeNotifications(uid, local).then(cleaned => {
        if (cleaned.length !== local.length) {
          saveNotifs(cleaned, uid);
          setNotifications(cleaned);
        } else {
          setNotifications(local);
        }
      });
    }

    // 2. Fetch Supabase en background → merge+dedup → sincronizar
    supabaseFetchNotifs(userId).then(async remote => {
      const uid = userId;
      // Limpiar también en remoto
      const cleanedRemote = await cleanFakeNotifications(uid, remote);

      setNotifications(prev => {
        const deletedIds = loadDeletedIds(uid);
        const { merged, supabaseIdsToDelete } = mergeNotifs(prev, cleanedRemote, deletedIds);
        saveNotifs(merged, uid);

        // Subir a Supabase notifs que solo existen localmente
        const remoteIds = new Set(cleanedRemote.map(r => r.id));
        const onlyLocal = merged.filter(n => !remoteIds.has(n.id) && !deletedIds.has(n.id));
        if (onlyLocal.length > 0) supabaseUpsertNotifs(onlyLocal, uid);

        // Borrar de Supabase: tombstone + duplicados detectados
        const toDelete = [
          ...cleanedRemote.filter(r => deletedIds.has(r.id)).map(r => r.id),
          ...supabaseIdsToDelete,
        ];
        if (toDelete.length > 0) supabaseDeleteManyNotifs([...new Set(toDelete)], uid);

        return merged;
      });
      setSupabaseSynced(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ─── Guards de detección ──────────────────────────────────────────────────
  const reminderRunRef       = useRef(false);
  const prevWatchedRef       = useRef<Set<string>>(new Set<string>());
  const trackingReadyRef     = useRef(false);
  const prevLevelRef         = useRef<number>(0);
  const levelReadyRef        = useRef(false);
  const achievementsReadyRef = useRef(false);

  const currentLevelRef = useRef(levelInfo.level);
  useEffect(() => { currentLevelRef.current = levelInfo.level; }, [levelInfo.level]);

  const progressSnapshotRef = useRef<ReturnType<typeof buildAchievementProgress>>({
    totalVideosWatched: 0, totalMinutes: 0, bestStreak: 0,
    categoryStats: {}, level: 0, totalXP: 0, savedVideos: [],
    watchHistory: [], daysActive: new Set(), dailyStats: { date: '', completed: 0, minutes: 0 },
  });
  progressSnapshotRef.current = buildAchievementProgress({
    totalVideosWatched, totalMinutes, bestStreak, categoryStats,
    levelInfo, totalXP, savedVideos, watchHistory, daysActive, dailyStats,
  });

  const [notifiedAchievementIds, setNotifiedAchievementIds] = useState<Set<string>>(() => {
    const uid = sessionUid();
    return uid ? loadNotifiedAchievementIds(uid) : new Set<string>();
  });
  const notifiedAchIdRef = useRef(notifiedAchievementIds);
  useEffect(() => { notifiedAchIdRef.current = notifiedAchievementIds; }, [notifiedAchievementIds]);

  // ─── Resets al cambiar de usuario ─────────────────────────────────────────
  const prevStabUserRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prevStabUserRef.current === userId) return;
    prevStabUserRef.current = userId;

    reminderRunRef.current       = false;
    prevWatchedRef.current       = new Set();
    trackingReadyRef.current     = false;
    levelReadyRef.current        = false;
    achievementsReadyRef.current = false;

    if (!userId) return;

    const loadedAchIds = loadNotifiedAchievementIds(userId);
    setNotifiedAchievementIds(loadedAchIds);
    notifiedAchIdRef.current = loadedAchIds;

    const uid = userId;

    const levelTimer = setTimeout(() => {
      const persisted = loadNotifiedLevel(uid);
      const baseline  = Math.max(persisted, currentLevelRef.current);
      prevLevelRef.current  = baseline;
      levelReadyRef.current = true;
      if (baseline !== persisted) saveNotifiedLevel(baseline, uid);
    }, 5000);

    const achTimer = setTimeout(() => {
      const progress    = progressSnapshotRef.current;
      const alreadyHave = loadNotifiedAchievementIds(uid);
      const currentlyUnlocked = ACHIEVEMENTS.filter(a => a.check(progress)).map(a => a.id);
      const mergedIds = new Set([...alreadyHave, ...currentlyUnlocked]);
      saveNotifiedAchievementIds(mergedIds, uid);
      notifiedAchIdRef.current = mergedIds;
      setNotifiedAchievementIds(mergedIds);
      achievementsReadyRef.current = true;
    }, 5000);

    return () => { clearTimeout(levelTimer); clearTimeout(achTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ─── Recordatorios de videos en progreso ─────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    if (reminderRunRef.current) return;
    reminderRunRef.current = true;

    const uid = userId;
    const reminded = loadRemindedIds(uid);
    const inProgress = Object.entries(videoProgresses)
      .filter(([id, pct]) => pct > 8 && pct < 92 && !reminded.has(id))
      .slice(0, 3);
    if (!inProgress.length) return;

    const newNotifs: AppNotification[] = [];
    const updatedReminded = new Set(reminded);
    inProgress.forEach(([videoId, pct], i) => {
      const video = getAdminVideosFromStorage().find(v => v.id === videoId);
      if (!video) return;
      newNotifs.push({
        id: makeId(), type: 'reminder',
        title: '▶️ Continúa donde lo dejaste',
        body: `"${video.titulo}" — llevas el ${Math.round(pct)}% visto`,
        videoId, timestamp: Date.now() - (i + 1) * 3_600_000,
        read: false, icon: '▶️', accentColor: '#3b82f6',
      });
      updatedReminded.add(videoId);
    });
    if (newNotifs.length > 0) {
      addNotifs(newNotifs);
      saveRemindedIds(updatedReminded, uid);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ─── Detección de nuevos videos del admin ─────────────────────────────────
  const newContentReadyRef = useRef(false);
  useEffect(() => {
    if (!userId) return;

    newContentReadyRef.current = false;
    const uid = userId;
    const timer = setTimeout(() => {
      newContentReadyRef.current = true;
      checkNewAdminVideos(uid);
    }, 4000);

    return () => { clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);


  function checkNewAdminVideos(uid: string) {
    if (!newContentReadyRef.current || !uid) return;
    const notifiedIds = loadNewContentNotifIds(uid);
    // Revisar tanto localStorage como estado en memoria
    const inMemoryVideoIds = new Set(
      notificationsRef.current
        .filter(n => n.type === 'new_content' && n.videoId)
        .map(n => n.videoId!)
    );
    const unnotified = getAdminVideosFromStorage().filter(
      v => v.nuevo && !notifiedIds.has(v.id) && !inMemoryVideoIds.has(v.id)
    );
    if (!unnotified.length) return;

    const updated = new Set(notifiedIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newNotifs: AppNotification[] = unnotified.map(v => {
      updated.add(v.id);
      return {
        id: makeId(), type: 'new_content' as NotifType,
        title: '⭐ Nuevo contenido disponible',
        body: `"${v.titulo}" ya está disponible en ${v.categoria}`,
        videoId: v.id, timestamp: (v as any).createdAt ?? Date.now(),
        read: false, icon: '⭐', accentColor: '#8b5cf6',
      };
    });
    addNotifs(newNotifs);
    saveNewContentNotifIds(updated, uid);
  }

  // ─── Fase 1: estabilizar completaciones al cambiar de usuario ─────────────
  useEffect(() => {
    if (!userId) return;
    const uid = userId;
    const timer = setTimeout(() => {
      const existing = loadCompletedNotifIds(uid);
      const updated  = new Set([...existing, ...watchedVideos]);
      saveCompletedNotifIds(updated, uid);
      watchedVideos.forEach(id => prevWatchedRef.current.add(id));
      trackingReadyRef.current = true;
    }, 4000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ─── Fase 2: detectar nuevas completaciones ───────────────────────────────
  useEffect(() => {
    if (!trackingReadyRef.current || !userId) return;
    const prev         = prevWatchedRef.current;
    const newlyWatched = watchedVideos.filter(id => !prev.has(id));
    newlyWatched.forEach(id => prev.add(id));
    if (!newlyWatched.length) return;

    const uid      = userId;
    const doneIds  = loadCompletedNotifIds(uid);
    const toNotify = newlyWatched.filter(id => !doneIds.has(id));
    if (!toNotify.length) return;

    const updatedIds = new Set(doneIds);
    const newNotifs: AppNotification[] = toNotify.map(videoId => {
      updatedIds.add(videoId);
      const video = getAdminVideosFromStorage().find(v => v.id === videoId);
      return {
        id: makeId(), type: 'completion' as NotifType,
        title: '✅ ¡Video completado!',
        body: video ? `Completaste "${video.titulo}" y ganaste XP` : 'Completaste un video y ganaste XP',
        videoId, timestamp: Date.now(), read: false, icon: '✅', accentColor: '#22c55e',
      };
    });
    addNotifs(newNotifs);
    saveCompletedNotifIds(updatedIds, uid);
  }, [watchedVideos, userId, addNotifs]);

  // ─── Subida de nivel ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!levelReadyRef.current || !userId) return;
    if (levelInfo.level <= prevLevelRef.current) return;
    prevLevelRef.current = levelInfo.level;
    saveNotifiedLevel(levelInfo.level, userId);
    addNotifs([{
      id: makeId(), type: 'level_up',
      title: `⬆️ ¡Subiste al nivel ${levelInfo.level}!`,
      body: `Alcanzaste el nivel ${levelInfo.level}. ¡Sigue así, tu conocimiento crece!`,
      timestamp: Date.now(), read: false, icon: '⬆️', accentColor: '#a78bfa',
    }]);
    publishActivity('level_up', `Nivel ${levelInfo.level}`, `¡Alcanzó el nivel ${levelInfo.level}! 🚀`, '⬆️');
  }, [levelInfo.level, userId, addNotifs, publishActivity]);

  // ─── Sistema de logros ────────────────────────────────────────────────────
  useEffect(() => {
    if (!achievementsReadyRef.current || !userId) return;
    const progress        = progressSnapshotRef.current;
    const alreadyNotified = notifiedAchIdRef.current;
    const newlyUnlocked   = ACHIEVEMENTS.filter(a => !alreadyNotified.has(a.id) && a.check(progress));
    if (!newlyUnlocked.length) return;

    const uid = userId;
    const updatedIds = new Set(alreadyNotified);
    newlyUnlocked.forEach(a => updatedIds.add(a.id));
    saveNotifiedAchievementIds(updatedIds, uid);
    notifiedAchIdRef.current = updatedIds;
    setNotifiedAchievementIds(updatedIds);

    newlyUnlocked.forEach((achievement, i) => {
      const rarityColor = RARITY_CONFIG[achievement.rarity].color;
      setTimeout(() => {
        addNotifs([{
          id: makeId(), type: 'achievement',
          title: `${achievement.emoji} ¡Logro desbloqueado!`,
          body: achievement.titulo.es,
          timestamp: Date.now(), read: false,
          icon: achievement.emoji, accentColor: rarityColor,
        }]);
        publishActivity('achievement', achievement.titulo.es, `¡Desbloqueó el logro: ${achievement.titulo.es}! 🏆`, achievement.emoji);
      }, i * 800);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalVideosWatched, totalMinutes, bestStreak, levelInfo.level, totalXP, savedVideos.length,
      Object.keys(categoryStats).length, userId, addNotifs, publishActivity]);

  // ─── Acciones ─────────────────────────────────────────────────────────────
  const addNotification = useCallback(
    (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
      if (!appSettings.notificaciones || !userId) return;
      addNotifs([{ ...n, id: makeId(), timestamp: Date.now(), read: false }]);
      fireSystemNotification(n.title, n.body);
    },
    [appSettings.notificaciones, userId, addNotifs],
  );

  const markRead = useCallback((id: string) => {
    const uid = sessionUid();
    if (!uid) return;
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveNotifs(next, uid);
      return next;
    });
    supabaseMarkRead(id, uid);
  }, []);

  const markAllRead = useCallback(() => {
    const uid = sessionUid();
    if (!uid) return;
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      saveNotifs(next, uid);
      supabaseMarkAllRead(uid);
      return next;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    const uid = sessionUid();
    if (!uid) return;
    setNotifications(prev => {
      const next = prev.filter(n => n.id !== id);
      saveNotifs(next, uid);
      return next;
    });
    addDeletedId(id, uid);
    supabaseDeleteNotif(id, uid);
  }, []);

  const clearAll = useCallback(() => {
    const uid = sessionUid();
    if (!uid) return;
    
    // 1. Limpiar personales
    setNotifications(prev => {
      addDeletedIds(prev.map(n => n.id), uid);
      return [];
    });
    saveNotifs([], uid);
    supabaseDeleteAllNotifs(uid);

    // 2. Limpiar broadcasts (globales) visibles
    const bcIds = broadcasts.filter(b => !dismissedIds.has(b.id)).map(b => b.id);
    if (bcIds.length > 0) {
      dismissAllBroadcasts(bcIds);
    }
  }, [broadcasts, dismissedIds, dismissAllBroadcasts]);

  // ── Mezclar personales + broadcasts globales ──────────────────────────────
  const mergedNotifications = useMemo((): AppNotification[] => {
    const broadcastAsNotifs: AppNotification[] = broadcasts
      .filter(b => !dismissedIds.has(b.id))
      .map(b => ({
        id: b.id, type: b.type as AppNotification['type'],
        title: b.title, body: b.body, icon: b.icon, accentColor: b.accentColor,
        timestamp: b.sentAt, read: bcReadIds.has(b.id), videoId: undefined,
      } as AppNotification));
    return [...broadcastAsNotifs, ...notifications]
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [broadcasts, dismissedIds, notifications, bcReadIds]);

  const unreadCount = mergedNotifications.filter(n => !n.read).length;

  const dismissUnified = useCallback((id: string) => {
    if (broadcasts.find(b => b.id === id)) { dismissBroadcast(id); }
    else { dismiss(id); }
  }, [broadcasts, dismissBroadcast, dismiss]);

  const markReadUnified = useCallback((id: string) => {
    if (broadcasts.find(b => b.id === id)) { markBroadcastRead(id); }
    else { markRead(id); }
  }, [broadcasts, markBroadcastRead, markRead]);

  const markAllReadUnified = useCallback(() => {
    markAllRead();
    const bcIds = broadcasts.filter(b => !dismissedIds.has(b.id)).map(b => b.id);
    if (bcIds.length > 0) markAllBroadcastsRead(bcIds);
  }, [markAllRead, broadcasts, dismissedIds, markAllBroadcastsRead]);

  // sync read/unread a Supabase (debounced)
  useEffect(() => {
    const uid = sessionUid();
    if (!uid) return;
    scheduleReadSync(notifications, uid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  return (
    <NotificationsCtx.Provider value={{
      notifications:  mergedNotifications,
      unreadCount,
      supabaseSynced,
      addNotification,
      markRead:       markReadUnified,
      markAllRead:    markAllReadUnified,
      dismiss:        dismissUnified,
      clearAll,
    }}>
      {children}
    </NotificationsCtx.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsCtx);
  if (!ctx) throw new Error('useNotifications must be inside NotificationsProvider');
  return ctx;
}