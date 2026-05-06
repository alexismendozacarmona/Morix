import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Contenido } from '../data/mockData';
import type { Short } from '../data/shortsData';
import { getPresignedGetUrl } from '../utils/r2Upload';
import { R2_ENDPOINT, R2_PUBLIC_DEV_URL } from '../config/r2Config';
import { supabase } from '../../lib/supabase';
import { toCanonicalCategory } from '../utils/categoryUtils';

/* ─── Admin video type (extiende Contenido) ─────────────────────────────── */
export type AdminVideo = Omit<Contenido, 'id'> & {
  id:         string;
  createdAt:  number;
  updatedAt:  number;
};

export type AdminShort = Omit<Short, 'id'> & {
  id:        string;
  createdAt: number;
  updatedAt: number;
};

/* ─── Context ────────────────────────────────────────────────────────────── */
interface AdminContentCtxType {
  videos:       AdminVideo[];
  shorts:       AdminShort[];
  loading:      boolean;
  addVideo:     (v: Omit<AdminVideo, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AdminVideo>;
  updateVideo:  (id: string, v: Partial<AdminVideo>) => Promise<void>;
  deleteVideo:  (id: string) => Promise<void>;
  addShort:     (s: Omit<AdminShort, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AdminShort>;
  updateShort:  (id: string, s: Partial<AdminShort>) => Promise<void>;
  deleteShort:  (id: string) => Promise<void>;
  videoCountByCat: Record<string, number>;
  shortCountByCat: Record<string, number>;
}

/* ─── Storage keys (localStorage cache) ─────────────────────────────────── */
const LS_VIDEOS = 'morix_admin_videos_v1';
const LS_SHORTS = 'morix_admin_shorts_v1';

// IDs de las filas en morix_admin_content
const DB_VIDEOS_ID = 'videos';
const DB_SHORTS_ID = 'shorts';

function loadLS<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function saveLS<T>(key: string, data: T[]) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
}
function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ─── Supabase helpers ───────────────────────────────────────────────────── */
async function loadFromSupabase<T>(id: string): Promise<T[] | null> {
  try {
    const { data, error } = await supabase
      .from('morix_admin_content')
      .select('data')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return (data.data as T[]) ?? [];
  } catch {
    return null;
  }
}

async function saveToSupabase<T>(id: string, items: T[]): Promise<void> {
  try {
    await supabase
      .from('morix_admin_content')
      .upsert({ id, data: items, updated_at: new Date().toISOString() });
  } catch {
    // silencioso — ya está en localStorage
  }
}

/* ─── Presign R2 image URLs ─────────────────────────────────────────────── */
async function presignR2ImageUrl(url: string): Promise<string> {
  if (!url) return url;
  
  // Solo procesar si pertenece a R2, a nuestro R2_PUBLIC_DEV_URL antiguo o al nuevo dominio oficial
  if (!url.includes(R2_ENDPOINT) && !url.includes('r2.dev') && !url.includes('morixoficial.com')) return url;
  
  try {
    const urlObj  = new URL(url);
    const rawParts = urlObj.pathname.split('/').filter(Boolean);
    
    let folder = '';
    let filenameParts: string[] = [];

    if (url.includes('cloudflarestorage')) {
      // Formato nativo S3: /morix/covers/imagen.jpg
      if (rawParts.length < 3) return url;
      folder = decodeURIComponent(rawParts[1]);
      filenameParts = rawParts.slice(2);
    } else {
      // Formato antiguo dev: /covers/imagen.jpg (sin bucket)
      if (rawParts.length < 2) return url;
      folder = decodeURIComponent(rawParts[0]);
      filenameParts = rawParts.slice(1);
    }

    const filename = filenameParts.map(decodeURIComponent).join('/');
    
    // Al generar la firma nueva, se ignoran los parámetros ?X-Amz... antiguos si los hubiera.
    return await getPresignedGetUrl(folder, filename, 604800);
  } catch {
    return url;
  }
}

/* ─── HMR-safe singleton ─────────────────────────────────────────────────── */
const CTX_KEY = '__morix_admin_content_ctx__';
declare global { interface Window { [CTX_KEY]: unknown } }
if (!window[CTX_KEY]) {
  window[CTX_KEY] = createContext<AdminContentCtxType | null>(null);
}
const AdminCtx = window[CTX_KEY] as React.Context<AdminContentCtxType | null>;

/* ─── Provider ───────────────────────────────────────────────────────────── */
export function AdminContentProvider({ children }: { children: ReactNode }) {
  // Inicializar desde localStorage (cache local) mientras carga Supabase
  // Normalizamos categoría por si hay datos antiguos con nombres incorrectos
  const [rawVideos, setRawVideos] = useState<AdminVideo[]>(() =>
    loadLS<AdminVideo>(LS_VIDEOS).map((v) => ({ ...v, categoria: toCanonicalCategory(v.categoria) }))
  );
  const [rawShorts, setRawShorts] = useState<AdminShort[]>(() =>
    loadLS<AdminShort>(LS_SHORTS).map((s) => ({ ...s, categoria: toCanonicalCategory(s.categoria) }))
  );
  const [loading,   setLoading]   = useState(true);

  // Videos/shorts enriquecidos con presigned URLs para imágenes
  const [videos, setVideos] = useState<AdminVideo[]>(rawVideos);
  const [shorts, setShorts] = useState<AdminShort[]>(rawShorts);

  // ── Carga inicial desde Supabase ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function syncFromSupabase() {
      const [dbVideos, dbShorts] = await Promise.all([
        loadFromSupabase<AdminVideo>(DB_VIDEOS_ID),
        loadFromSupabase<AdminShort>(DB_SHORTS_ID),
      ]);

      if (!cancelled) {
        // Si Supabase tiene datos y son más recientes que localStorage → usarlos
        // También normalizamos la categoría por si hay datos antiguos con nombres incorrectos
        if (dbVideos !== null) {
          const normalized = dbVideos.map((v) => ({ ...v, categoria: toCanonicalCategory(v.categoria) }));
          setRawVideos(normalized);
          saveLS(LS_VIDEOS, normalized);
        }
        if (dbShorts !== null) {
          const normalized = dbShorts.map((s) => ({ ...s, categoria: toCanonicalCategory(s.categoria) }));
          setRawShorts(normalized);
          saveLS(LS_SHORTS, normalized);
        }
        setLoading(false);
      }
    }
    syncFromSupabase();
    return () => { cancelled = true; };
  }, []);


  // ── Enriquecer presigned URLs cuando cambian rawVideos ────────────────────
  useEffect(() => {
    let cancelled = false;
    async function enrich() {
      if (rawVideos.length === 0) { if (!cancelled) setVideos([]); return; }
      const enriched = await Promise.all(rawVideos.map(async (v) => ({
        ...v,
        imagen:          await presignR2ImageUrl(v.imagen),
        imagenLandscape: v.imagenLandscape ? await presignR2ImageUrl(v.imagenLandscape) : v.imagenLandscape,
      })));
      enriched.sort((a, b) => b.createdAt - a.createdAt);
      if (!cancelled) setVideos(enriched);
    }
    enrich();
    return () => { cancelled = true; };
  }, [rawVideos]);

  useEffect(() => {
    let cancelled = false;
    async function enrich() {
      if (rawShorts.length === 0) { if (!cancelled) setShorts([]); return; }
      const enriched = await Promise.all(rawShorts.map(async (s) => {
        const thumbnail = await presignR2ImageUrl(s.thumbnail);
        // Si el short tiene un archivo de video en R2, generar presigned URL
        let videoUrl: string | undefined;
        if (s.videoFile) {
          try {
            const filename = s.videoFile.includes('.') ? s.videoFile : `${s.videoFile}.mp4`;
            videoUrl = await getPresignedGetUrl('shorts', filename, 604800); // 7 días
          } catch { /* silencioso */ }
        }
        return { ...s, thumbnail, ...(videoUrl ? { videoUrl } : {}) };
      }));
      enriched.sort((a, b) => b.createdAt - a.createdAt);
      if (!cancelled) setShorts(enriched);
    }
    enrich();
    return () => { cancelled = true; };
  }, [rawShorts]);

  // ── Helper interno: actualizar estado + localStorage + Supabase ───────────
  const persistVideos = useCallback((updated: AdminVideo[]) => {
    setRawVideos(updated);
    saveLS(LS_VIDEOS, updated);
    saveToSupabase(DB_VIDEOS_ID, updated);
  }, []);

  const persistShorts = useCallback((updated: AdminShort[]) => {
    setRawShorts(updated);
    saveLS(LS_SHORTS, updated);
    saveToSupabase(DB_SHORTS_ID, updated);
  }, []);

  /* ── Videos CRUD ─────────────────────────────────────────────────────────── */
  const addVideo = useCallback(async (v: Omit<AdminVideo, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminVideo> => {
    const now  = Date.now();
    const newV: AdminVideo = { ...v, categoria: toCanonicalCategory(v.categoria), id: genId('av'), createdAt: now, updatedAt: now };
    setRawVideos((prev) => { const u = [...prev, newV]; persistVideos(u); return u; });

    // La notificación ahora se gestiona vía addBroadcast en Admin.tsx


    return newV;
  }, [persistVideos]);

  const updateVideo = useCallback(async (id: string, v: Partial<AdminVideo>) => {
    setRawVideos((prev) => {
      const u = prev.map((x) => x.id === id ? { ...x, ...v, updatedAt: Date.now() } : x);
      persistVideos(u);
      return u;
    });
  }, [persistVideos]);

  const deleteVideo = useCallback(async (id: string) => {
    setRawVideos((prev) => { const u = prev.filter((x) => x.id !== id); persistVideos(u); return u; });
  }, [persistVideos]);

  /* ── Shorts CRUD ─────────────────────────────────────────────────────────── */
  const addShort = useCallback(async (s: Omit<AdminShort, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminShort> => {
    const now  = Date.now();
    const newS: AdminShort = { ...s, categoria: toCanonicalCategory(s.categoria), id: genId('as'), createdAt: now, updatedAt: now };
    setRawShorts((prev) => { const u = [...prev, newS]; persistShorts(u); return u; });
    return newS;
  }, [persistShorts]);

  const updateShort = useCallback(async (id: string, s: Partial<AdminShort>) => {
    setRawShorts((prev) => {
      const u = prev.map((x) => x.id === id ? { ...x, ...s, updatedAt: Date.now() } : x);
      persistShorts(u);
      return u;
    });
  }, [persistShorts]);

  const deleteShort = useCallback(async (id: string) => {
    setRawShorts((prev) => { const u = prev.filter((x) => x.id !== id); persistShorts(u); return u; });
  }, [persistShorts]);

  /* ── Counts per category (always use canonical category name) ─────────────── */
  const videoCountByCat: Record<string, number> = {};
  rawVideos.forEach((v) => {
    const cat = toCanonicalCategory(v.categoria);
    videoCountByCat[cat] = (videoCountByCat[cat] ?? 0) + 1;
  });

  const shortCountByCat: Record<string, number> = {};
  rawShorts.forEach((s) => {
    const cat = toCanonicalCategory(s.categoria);
    shortCountByCat[cat] = (shortCountByCat[cat] ?? 0) + 1;
  });

  return (
    <AdminCtx.Provider value={{
      videos, shorts, loading,
      addVideo, updateVideo, deleteVideo,
      addShort, updateShort, deleteShort,
      videoCountByCat, shortCountByCat,
    }}>
      {children}
    </AdminCtx.Provider>
  );
}

export function useAdminContent() {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error('useAdminContent must be used inside AdminContentProvider');
  return ctx;
}