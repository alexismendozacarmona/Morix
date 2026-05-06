/**
 * VideoLikes — botón de ❤️ con contador que persiste en Supabase.
 *
 * SQL para crear la tabla (ejecutar en Supabase SQL Editor):
 * ─────────────────────────────────────────────────────────
 * CREATE TABLE IF NOT EXISTS morix_video_likes (
 *   id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   video_id   TEXT NOT NULL,
 *   user_id    TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   UNIQUE(video_id, user_id)
 * );
 * ALTER TABLE morix_video_likes ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "public_all" ON morix_video_likes FOR ALL USING (true) WITH CHECK (true);
 * ─────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  videoId: string;
}

export function VideoLikes({ videoId }: Props) {
  const { user } = useAuth();
  const userId = user?.email ?? 'anon';

  const [likesCount, setLikesCount]   = useState(0);
  const [liked,      setLiked]        = useState(false);
  const [loading,    setLoading]      = useState(false);
  const [burst,      setBurst]        = useState(false);

  // ── Cargar likes ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchLikes() {
      // Total de likes
      const { count } = await supabase
        .from('morix_video_likes')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId);

      // Si el usuario ya dio like
      const { data: mine } = await supabase
        .from('morix_video_likes')
        .select('id')
        .eq('video_id', videoId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!cancelled) {
        setLikesCount(count ?? 0);
        setLiked(!!mine);
      }
    }
    fetchLikes();
    return () => { cancelled = true; };
  }, [videoId, userId]);

  // ── Toggle like ─────────────────────────────────────────────────────────────
  const handleLike = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    if (liked) {
      // Quitar like
      await supabase
        .from('morix_video_likes')
        .delete()
        .eq('video_id', videoId)
        .eq('user_id', userId);
      setLiked(false);
      setLikesCount((n) => Math.max(0, n - 1));
    } else {
      // Dar like
      const { error } = await supabase
        .from('morix_video_likes')
        .insert({ video_id: videoId, user_id: userId });
      if (!error) {
        setLiked(true);
        setLikesCount((n) => n + 1);
        setBurst(true);
        setTimeout(() => setBurst(false), 600);
      }
    }
    setLoading(false);
  }, [liked, loading, videoId, userId]);

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className="flex items-center gap-1.5 select-none active:scale-90 transition-transform"
      style={{ outline: 'none' }}
    >
      <div className="relative">
        {/* Burst animado al dar like */}
        <AnimatePresence>
          {burst && (
            <motion.div
              key="burst"
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ zIndex: 10 }}
            >
              <div
                className="w-5 h-5 rounded-full"
                style={{ background: 'radial-gradient(circle, #f43f5e88 0%, transparent 70%)' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={liked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Heart
            size={16}
            fill={liked ? '#f43f5e' : 'none'}
            strokeWidth={liked ? 0 : 1.8}
            style={{ color: liked ? '#f43f5e' : 'rgba(255,255,255,0.45)', transition: 'color 0.2s' }}
          />
        </motion.div>
      </div>

      <AnimatePresence mode="popLayout">
        <motion.span
          key={likesCount}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.18 }}
          className="text-[11px] font-bold tabular-nums"
          style={{ color: liked ? '#f43f5e' : 'rgba(255,255,255,0.38)', minWidth: '14px' }}
        >
          {likesCount > 0 ? likesCount : ''}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
