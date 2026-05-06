import {
  createContext, useContext, useState, useEffect, useRef, type ReactNode,
} from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Playlist {
  id:        string;
  name:      string;
  emoji:     string;
  createdAt: number;
  videoIds:  string[];
}

interface PlaylistCtxValue {
  playlists:          Playlist[];
  createPlaylist:     (name: string, emoji?: string) => Playlist;
  deletePlaylist:     (id: string) => void;
  addToPlaylist:      (playlistId: string, videoId: string) => void;
  removeFromPlaylist: (playlistId: string, videoId: string) => void;
  toggleInPlaylist:   (playlistId: string, videoId: string) => void;
  isInPlaylist:       (playlistId: string, videoId: string) => boolean;
  getVideoPlaylists:  (videoId: string) => Playlist[];
  renamePlaylist:     (id: string, name: string) => void;
}

// ─── Singleton context (HMR-safe) ─────────────────────────────────────────────
const CTX_WIN_KEY = '__morix_playlist_context__';
let _ctx: ReturnType<typeof createContext<PlaylistCtxValue | null>>;
if ((window as any)[CTX_WIN_KEY]) {
  _ctx = (window as any)[CTX_WIN_KEY];
} else {
  _ctx = createContext<PlaylistCtxValue | null>(null);
  (window as any)[CTX_WIN_KEY] = _ctx;
}
const PlaylistContext = _ctx;

// ─── localStorage ─────────────────────────────────────────────────────────────
const getStorageKey = (userId: string | null | undefined) =>
  userId ? `morix_playlists_v1_${userId}` : 'morix_playlists_v1_guest';

function loadLocal(userId?: string | null): Playlist[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) return JSON.parse(raw) as Playlist[];
  } catch { /* ignore */ }
  return [];
}

function saveLocal(p: Playlist[], userId?: string | null) {
  try { localStorage.setItem(getStorageKey(userId), JSON.stringify(p)); } catch { /* ignore */ }
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────
// Almacenamos las playlists dentro del campo app_settings de morix_user_settings
// como sub-clave "__playlists". Esta tabla ya existe → no requiere SQL extra.

async function fetchFromSupabase(userId: string): Promise<Playlist[] | null> {
  const { data, error } = await supabase
    .from('morix_user_settings')
    .select('app_settings')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  const raw = (data.app_settings as Record<string, unknown>)?.__playlists;
  if (!Array.isArray(raw)) return null;
  return raw as Playlist[];
}

async function upsertToSupabase(userId: string, playlists: Playlist[]): Promise<void> {
  // Leer los settings actuales para no borrarlos
  const { data } = await supabase
    .from('morix_user_settings')
    .select('app_settings, privacy_settings')
    .eq('user_id', userId)
    .maybeSingle();

  const existingApp     = (data?.app_settings     as Record<string, unknown>) ?? {};
  const existingPrivacy = (data?.privacy_settings as Record<string, unknown>) ?? {};

  await supabase
    .from('morix_user_settings')
    .upsert(
      {
        user_id:          userId,
        app_settings:     { ...existingApp, __playlists: playlists },
        privacy_settings: existingPrivacy,
        updated_at:       new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function PlaylistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    // Synchronous init: use session ID from localStorage
    const sessionId = localStorage.getItem('morix_session_v1');
    return loadLocal(sessionId);
  });

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef    = useRef<string | null>(user?.id ?? null);
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user?.id]);

  // ── Cuando el usuario cambia: recargar sus playlists desde su clave ───────
  const prevPlaylistUserRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prevPlaylistUserRef.current === (user?.id ?? null)) return;
    prevPlaylistUserRef.current = user?.id ?? null;

    if (!user?.id) {
      // Logout: limpiar estado
      setPlaylists([]);
      return;
    }

    // Login/switch: cargar desde clave del nuevo usuario (Supabase lo sobreescribirá si hay datos remotos)
    const stored = loadLocal(user.id);
    setPlaylists(stored);
  }, [user?.id]);

  // ── Al iniciar sesión: cargar desde Supabase y fusionar ──────────────────
  useEffect(() => {
    if (!user?.id) return;

    fetchFromSupabase(user.id).then((remote) => {
      if (!remote) return; // no hay datos remotos todavía → localStorage manda

      setPlaylists((local) => {
        // Supabase es fuente de verdad; añadimos playlists locales que no estén
        const merged = [...remote];
        local.forEach((lp) => {
          const idx = merged.findIndex((rp) => rp.id === lp.id);
          if (idx === -1) {
            merged.push(lp);
          } else if (lp.videoIds.length > merged[idx].videoIds.length) {
            // Local tiene más videos → usar local
            merged[idx] = lp;
          }
        });
        saveLocal(merged, user.id);
        return merged;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Sync a Supabase debounced 1.5 s ──────────────────────────────────────
  function scheduleSyncToSupabase(next: Playlist[]) {
    const uid = userIdRef.current;
    if (!uid) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      upsertToSupabase(uid, next).catch((err) =>
        console.warn('[Playlist] Supabase sync error:', err?.message ?? err)
      );
    }, 1500);
  }

  // ── Actualiza estado + persiste en ambos lados ────────────────────────────
  function update(next: Playlist[]) {
    setPlaylists(next);
    saveLocal(next, userIdRef.current);
    scheduleSyncToSupabase(next);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function createPlaylist(name: string, emoji = '📋'): Playlist {
    const p: Playlist = {
      id:        `pl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name:      name.trim() || 'Mi playlist',
      emoji,
      createdAt: Date.now(),
      videoIds:  [],
    };
    update([...playlists, p]);
    return p;
  }

  function deletePlaylist(id: string) {
    update(playlists.filter((p) => p.id !== id));
  }

  function addToPlaylist(playlistId: string, videoId: string) {
    update(
      playlists.map((p) =>
        p.id === playlistId && !p.videoIds.includes(videoId)
          ? { ...p, videoIds: [...p.videoIds, videoId] }
          : p
      )
    );
  }

  function removeFromPlaylist(playlistId: string, videoId: string) {
    update(
      playlists.map((p) =>
        p.id === playlistId
          ? { ...p, videoIds: p.videoIds.filter((v) => v !== videoId) }
          : p
      )
    );
  }

  function toggleInPlaylist(playlistId: string, videoId: string) {
    const p = playlists.find((pl) => pl.id === playlistId);
    if (!p) return;
    p.videoIds.includes(videoId)
      ? removeFromPlaylist(playlistId, videoId)
      : addToPlaylist(playlistId, videoId);
  }

  function isInPlaylist(playlistId: string, videoId: string) {
    return playlists.find((p) => p.id === playlistId)?.videoIds.includes(videoId) ?? false;
  }

  function getVideoPlaylists(videoId: string) {
    return playlists.filter((p) => p.videoIds.includes(videoId));
  }

  function renamePlaylist(id: string, name: string) {
    update(playlists.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)));
  }

  return (
    <PlaylistContext.Provider
      value={{
        playlists,
        createPlaylist,
        deletePlaylist,
        addToPlaylist,
        removeFromPlaylist,
        toggleInPlaylist,
        isInPlaylist,
        getVideoPlaylists,
        renamePlaylist,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error('usePlaylist must be used inside PlaylistProvider');
  return ctx;
}