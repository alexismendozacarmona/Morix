import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../../lib/supabase';
import { fireSystemNotification } from '../utils/capacitorUtils';

// ─── Types ────────────────────────────────────────────────────────────────────
export type BroadcastType =
  | 'info'
  | 'new_content'
  | 'achievement'
  | 'streak'
  | 'promo'
  | 'update';

export interface BroadcastNotif {
  id: string;
  type: BroadcastType;
  title: string;
  body: string;
  icon: string;
  accentColor: string;
  sentAt: number;
  sentBy: string;
}

interface BroadcastNotificationsCtxType {
  broadcasts: BroadcastNotif[];
  dismissedIds: Set<string>;
  readIds: Set<string>;
  addBroadcast: (n: Omit<BroadcastNotif, 'id' | 'sentAt'>) => Promise<void>;
  deleteBroadcast: (id: string) => Promise<void>;
  dismissBroadcast: (id: string) => Promise<void>;
  markBroadcastRead: (id: string) => Promise<void>;
  markAllBroadcastsRead: (ids: string[]) => Promise<void>;
  dismissAllBroadcasts: (ids: string[]) => Promise<void>;
  requestPushPermission: () => Promise<NotificationPermission>;
  pushPermission: NotificationPermission | null;
  loading: boolean;
}

// ─── HMR-safe singleton ───────────────────────────────────────────────────────
const CTX_KEY = '__morix_broadcast_ctx__';
declare global { interface Window { [CTX_KEY]: unknown } }
if (!window[CTX_KEY]) {
  window[CTX_KEY] = createContext<BroadcastNotificationsCtxType | null>(null);
}
const BroadcastCtx = window[CTX_KEY] as React.Context<BroadcastNotificationsCtxType | null>;

// ─── localStorage cache keys (fallback offline) ───────────────────────────────
const LS_BROADCASTS   = 'morix_broadcast_notifs_v1';
const LS_DISMISSED    = (uid: string) => `morix_bc_dismissed_v2_${uid}`;
const LS_READ         = (uid: string) => `morix_bc_read_v2_${uid}`;

function loadCache(): BroadcastNotif[] {
  try { return JSON.parse(localStorage.getItem(LS_BROADCASTS) || '[]'); }
  catch { return []; }
}
function saveCache(list: BroadcastNotif[]) {
  try { localStorage.setItem(LS_BROADCASTS, JSON.stringify(list)); } catch { /* ignore */ }
}
function loadDismissedCache(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(LS_DISMISSED(uid));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveDismissedCache(ids: Set<string>, uid: string) {
  try { localStorage.setItem(LS_DISMISSED(uid), JSON.stringify([...ids])); } catch { /* ignore */ }
}
function loadReadCache(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(LS_READ(uid));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveReadCache(ids: Set<string>, uid: string) {
  try { localStorage.setItem(LS_READ(uid), JSON.stringify([...ids])); } catch { /* ignore */ }
}

function makeId() {
  return `bc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function fireNativePush(title: string, body: string) {
  // Usar fireSystemNotification que maneja correctamente Capacitor/Android
  // y cae en Web Notification API como fallback en browser
  fireSystemNotification(title, body).catch(() => {
    // fallback silencioso si falla
  });
}

// ─── DB row → BroadcastNotif ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToNotif(row: any): BroadcastNotif {
  return {
    id:          row.id,
    type:        row.type as BroadcastType,
    title:       row.title,
    body:        row.body,
    icon:        row.icon,
    accentColor: row.accent_color,
    sentAt:      row.sent_at,
    sentBy:      row.sent_by,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function BroadcastNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId    = user?.id ?? null;
  const userIdRef = useRef<string | null>(userId);
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user?.id]);

  // Render instantáneo desde cache, Supabase corrige después
  const [broadcasts,   setBroadcasts]   = useState<BroadcastNotif[]>(loadCache);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [readIds,      setReadIds]      = useState<Set<string>>(new Set());
  const [loading,      setLoading]      = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(
    () => 'Notification' in window ? Notification.permission : null,
  );

  // ── 1. Cargar broadcasts desde Supabase ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchBroadcasts() {
      setLoading(true);
      const { data, error } = await supabase
        .from('morix_broadcast_notifications')
        .select('*')
        .order('sent_at', { ascending: false });

      if (cancelled) return;
      if (!error && data) {
        const list = data.map(rowToNotif);
        setBroadcasts(list);
        saveCache(list);
      }
      setLoading(false);
    }
    fetchBroadcasts();
    return () => { cancelled = true; };
  }, []);

  // ── 2. Cargar estado read/dismissed del usuario desde Supabase ───────────
  const prevUidRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prevUidRef.current === userId) return;
    prevUidRef.current = userId;

    if (!userId) {
      setDismissedIds(new Set());
      setReadIds(new Set());
      return;
    }

    // Mostrar cache inmediatamente mientras carga Supabase
    setDismissedIds(loadDismissedCache(userId));
    setReadIds(loadReadCache(userId));

    async function fetchUserState() {
      const { data, error } = await supabase
        .from('morix_notification_reads')
        .select('notification_id, is_read, dismissed')
        .eq('user_id', userId);

      if (error || !data) return;

      const dismissed = new Set<string>();
      const read      = new Set<string>();
      data.forEach(row => {
        if (row.dismissed)       dismissed.add(row.notification_id);
        else if (row.is_read)    read.add(row.notification_id);
      });

      setDismissedIds(dismissed);
      setReadIds(read);
      saveDismissedCache(dismissed, userId!);
      saveReadCache(read, userId!);
    }
    fetchUserState();
  }, [userId]);

  // ── Escuchar storage events (otras pestañas) ─────────────────────────────
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === LS_BROADCASTS) {
        const fresh = loadCache();
        setBroadcasts(fresh);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // ── addBroadcast: Supabase primero, luego local ──────────────────────────
  const addBroadcast = useCallback(
    async (n: Omit<BroadcastNotif, 'id' | 'sentAt'>) => {
      const id    = makeId();
      const sentAt = Date.now();
      const notif: BroadcastNotif = { ...n, id, sentAt };

      const { error } = await supabase
        .from('morix_broadcast_notifications')
        .insert({
          id,
          type:        n.type,
          title:       n.title,
          body:        n.body,
          icon:        n.icon,
          accent_color: n.accentColor,
          sent_at:     sentAt,
          sent_by:     n.sentBy,
        });

      if (!error) {
        setBroadcasts(prev => {
          const next = [notif, ...prev];
          saveCache(next);
          return next;
        });
        fireNativePush(n.title, n.body);
      }
    },
    [],
  );

  // ── deleteBroadcast: borrar de Supabase y local ──────────────────────────
  const deleteBroadcast = useCallback(async (id: string) => {
    await supabase
      .from('morix_broadcast_notifications')
      .delete()
      .eq('id', id);

    setBroadcasts(prev => {
      const next = prev.filter(n => n.id !== id);
      saveCache(next);
      return next;
    });
  }, []);

  // ── upsert helper para morix_notification_reads ─────────────────────────
  async function upsertRead(uid: string, notifId: string, isRead: boolean, dismissed: boolean) {
    await supabase
      .from('morix_notification_reads')
      .upsert(
        { user_id: uid, notification_id: notifId, is_read: isRead, dismissed, updated_at: Date.now() },
        { onConflict: 'user_id,notification_id' },
      );
  }

  // ── dismissBroadcast: marcar como leída+descartada ───────────────────────
  const dismissBroadcast = useCallback(async (id: string) => {
    const uid = userIdRef.current;
    if (uid) await upsertRead(uid, id, true, true);

    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      if (uid) saveDismissedCache(next, uid);
      return next;
    });
    // Quitar de readIds si estaba
    setReadIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // ── markBroadcastRead: solo marcar como leída (NO descartada) ───────────
  const markBroadcastRead = useCallback(async (id: string) => {
    const uid = userIdRef.current;
    if (uid) await upsertRead(uid, id, true, false);

    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      if (uid) saveReadCache(next, uid);
      return next;
    });
  }, []);

  // ── markAllBroadcastsRead ────────────────────────────────────────────────
  const markAllBroadcastsRead = useCallback(async (ids: string[]) => {
    const uid = userIdRef.current;
    if (uid && ids.length > 0) {
      await supabase.from('morix_notification_reads').upsert(
        ids.map(id => ({
          user_id: uid, notification_id: id,
          is_read: true, dismissed: false, updated_at: Date.now(),
        })),
        { onConflict: 'user_id,notification_id' },
      );
    }
    setReadIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      if (uid) saveReadCache(next, uid);
      return next;
    });
  }, []);

  // ── dismissAllBroadcasts ────────────────────────────────────────────────
  const dismissAllBroadcasts = useCallback(async (ids: string[]) => {
    const uid = userIdRef.current;
    if (uid && ids.length > 0) {
      await supabase.from('morix_notification_reads').upsert(
        ids.map(id => ({
          user_id: uid, notification_id: id,
          is_read: true, dismissed: true, updated_at: Date.now(),
        })),
        { onConflict: 'user_id,notification_id' },
      );
    }
    setDismissedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      if (uid) saveDismissedCache(next, uid);
      return next;
    });
  }, []);

  const requestPushPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    const result = await Notification.requestPermission();
    setPushPermission(result);
    return result;
  }, []);

  return (
    <BroadcastCtx.Provider value={{
      broadcasts,
      dismissedIds,
      readIds,
      addBroadcast,
      deleteBroadcast,
      dismissBroadcast,
      markBroadcastRead,
      markAllBroadcastsRead,
      dismissAllBroadcasts,
      requestPushPermission,
      pushPermission,
      loading,
    }}>
      {children}
    </BroadcastCtx.Provider>
  );
}

export function useBroadcastNotifications() {
  const ctx = useContext(BroadcastCtx);
  if (!ctx) throw new Error('useBroadcastNotifications must be inside BroadcastNotificationsProvider');
  return ctx;
}
