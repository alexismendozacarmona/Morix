/**
 * TrendingContext — Métricas de tendencia en tiempo real.
 *
 * Calcula un score por video usando:
 *   score = (likes × 3) + (comments × 2) + (views × 1)
 *
 * Tablas Supabase requeridas:
 *   morix_video_likes    — ya existe (video_id, user_id)
 *   morix_video_comments — ya existe (video_id)
 *   morix_video_views    — CREAR con este SQL en Supabase SQL Editor:
 *
 *   CREATE TABLE IF NOT EXISTS morix_video_views (
 *     video_id   TEXT PRIMARY KEY,
 *     view_count BIGINT DEFAULT 0,
 *     updated_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE morix_video_views DISABLE ROW LEVEL SECURITY;
 *
 * Si la tabla no existe, los contadores de vistas simplemente muestran 0.
 * Los datos se cachean en localStorage y se refrescan cada 5 minutos.
 */
import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminContent } from './AdminContentContext';
import type { AdminVideo } from './AdminContentContext';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TrendingVideo extends AdminVideo {
  score:       number;
  likesCount:  number;
  commentsCount: number;
  viewsCount:  number;
}

interface TrendingCtxType {
  /** Top N videos ordenados por score (trending) */
  trendingVideos: TrendingVideo[];
  /** Top 10 para la fila Top 10 en Inicio */
  top10Videos:    TrendingVideo[];
  loading:        boolean;
  /** Registra una vista de video (llamar cuando el usuario empieza a reproducir) */
  trackView:      (videoId: string) => Promise<void>;
  /** Fuerza un refresh de las métricas */
  refresh:        () => void;
}

// ── Cache ────────────────────────────────────────────────────────────────────
const LS_CACHE_KEY = 'morix_trending_cache_v2';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry {
  timestamp: number;
  metrics:   Record<string, { likes: number; comments: number; views: number }>;
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CacheEntry;
    if (Date.now() - c.timestamp > CACHE_TTL_MS) return null;
    return c;
  } catch { return null; }
}

function writeCache(metrics: CacheEntry['metrics']) {
  try {
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), metrics }));
  } catch { /* ignore */ }
}

// ── Singleton Context (HMR-safe) ─────────────────────────────────────────────
const CTX_KEY = '__morix_trending_ctx__';
declare global { interface Window { [CTX_KEY]: unknown } }
if (!window[CTX_KEY]) {
  window[CTX_KEY] = createContext<TrendingCtxType | null>(null);
}
const TrendingContext = window[CTX_KEY] as React.Context<TrendingCtxType | null>;

// ── Provider ─────────────────────────────────────────────────────────────────
export function TrendingProvider({ children }: { children: ReactNode }) {
  const { videos } = useAdminContent();

  const [metrics, setMetrics] = useState<Record<string, { likes: number; comments: number; views: number }>>({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick]       = useState(0); // para forzar refresh

  // ── Fetch metrics from Supabase ──────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    // Intentar cache primero
    const cached = readCache();
    if (cached) {
      setMetrics(cached.metrics);
      setLoading(false);
      return;
    }

    try {
      // 1. Likes: contar por video_id
      const { data: likesRaw } = await supabase
        .from('morix_video_likes')
        .select('video_id');

      // 2. Comments: contar por video_id
      const { data: commentsRaw } = await supabase
        .from('morix_video_comments')
        .select('video_id');

      // 3. Views: buscar en tabla de vistas
      const { data: viewsRaw } = await supabase
        .from('morix_video_views')
        .select('video_id, view_count');

      // Agregar likes
      const likesMap: Record<string, number> = {};
      (likesRaw ?? []).forEach((r: { video_id: string }) => {
        likesMap[r.video_id] = (likesMap[r.video_id] ?? 0) + 1;
      });

      // Agregar comments
      const commentsMap: Record<string, number> = {};
      (commentsRaw ?? []).forEach((r: { video_id: string }) => {
        commentsMap[r.video_id] = (commentsMap[r.video_id] ?? 0) + 1;
      });

      // Agregar views
      const viewsMap: Record<string, number> = {};
      (viewsRaw ?? []).forEach((r: { video_id: string; view_count: number }) => {
        viewsMap[r.video_id] = r.view_count ?? 0;
      });

      // Combinar en un map unificado
      const allIds = new Set([
        ...Object.keys(likesMap),
        ...Object.keys(commentsMap),
        ...Object.keys(viewsMap),
        ...(videos.map((v) => v.id)),
      ]);

      const combined: Record<string, { likes: number; comments: number; views: number }> = {};
      allIds.forEach((id) => {
        combined[id] = {
          likes:    likesMap[id]    ?? 0,
          comments: commentsMap[id] ?? 0,
          views:    viewsMap[id]    ?? 0,
        };
      });

      writeCache(combined);
      setMetrics(combined);
    } catch (e) {
      console.warn('[TrendingContext] Error fetching metrics:', e);
    } finally {
      setLoading(false);
    }
  }, [videos]);

  // Re-fetch cuando cambian los videos o cuando se fuerza un refresh
  useEffect(() => {
    if (videos.length === 0) {
      setLoading(false);
      return;
    }
    fetchMetrics();
  }, [videos, tick, fetchMetrics]);

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    const t = setInterval(() => {
      // Invalidar cache y refrescar
      try { localStorage.removeItem(LS_CACHE_KEY); } catch { /* ignore */ }
      setTick((n) => n + 1);
    }, CACHE_TTL_MS);
    return () => clearInterval(t);
  }, []);

  // ── trackView ────────────────────────────────────────────────────────────
  const trackView = useCallback(async (videoId: string) => {
    if (!videoId) return;

    // Actualizar local inmediatamente
    setMetrics((prev) => ({
      ...prev,
      [videoId]: {
        likes:    prev[videoId]?.likes    ?? 0,
        comments: prev[videoId]?.comments ?? 0,
        views:    (prev[videoId]?.views   ?? 0) + 1,
      },
    }));
    // Invalidar cache para próxima carga
    try { localStorage.removeItem(LS_CACHE_KEY); } catch { /* ignore */ }

    // Persistir en Supabase con upsert e incremento
    try {
      // Intentar incrementar
      const { data: existing } = await supabase
        .from('morix_video_views')
        .select('view_count')
        .eq('video_id', videoId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('morix_video_views')
          .update({ view_count: (existing.view_count ?? 0) + 1, updated_at: new Date().toISOString() })
          .eq('video_id', videoId);
      } else {
        await supabase
          .from('morix_video_views')
          .insert({ video_id: videoId, view_count: 1, updated_at: new Date().toISOString() });
      }
    } catch {
      // silencioso — se intenta en siguiente refresh
    }
  }, []);

  const refresh = useCallback(() => {
    try { localStorage.removeItem(LS_CACHE_KEY); } catch { /* ignore */ }
    setTick((n) => n + 1);
  }, []);

  // ── Compute scored + sorted videos ──────────────────────────────────────
  const scoredVideos: TrendingVideo[] = videos
    .map((v) => {
      const m = metrics[v.id] ?? { likes: 0, comments: 0, views: 0 };
      const score = m.likes * 3 + m.comments * 2 + m.views * 1;
      return {
        ...v,
        score,
        likesCount:    m.likes,
        commentsCount: m.comments,
        viewsCount:    m.views,
      };
    })
    // Orden: primero por score desc, luego por createdAt desc (más reciente primero si hay empate)
    .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);

  const trendingVideos = scoredVideos.slice(0, 8);
  const top10Videos    = scoredVideos.slice(0, 10);

  return (
    <TrendingContext.Provider value={{ trendingVideos, top10Videos, loading, trackView, refresh }}>
      {children}
    </TrendingContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useTrending() {
  const ctx = useContext(TrendingContext);
  if (!ctx) throw new Error('useTrending must be used inside TrendingProvider');
  return ctx;
}