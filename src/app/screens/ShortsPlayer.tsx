import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Heart, MessageCircle,
  Music2, Play, Volume2, VolumeX,
} from 'lucide-react';
import { type Short } from '../data/shortsData';
import { CommentsSheet } from '../components/CommentsSheet';
import { useAdminContent } from '../contexts/AdminContentContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useT } from '../i18n/useT';
import { VideoLoader } from '../components/VideoLoader';
import { TRANSPARENT_POSTER } from '../components/VideoLoader';

/* ─── Tag colors ─────────────────────────────────────────────────────────── */
const TAG_COLORS: Record<string, string> = {
  'MEDITACIÓN & SONIDOS':  '#10b981',
  'LIBROS & RESÚMENES':    '#3b82f6',
  'TERROR & MISTERIOS':    '#8b5cf6',
  'DATOS & VERDADES':      '#f59e0b',
};

/* ─── Progress bar sincronizada con video ────────────────────────────────── */
function ProgressBar({
  videoRef, duration, playing, loopKey,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  duration: number;
  playing:  boolean;
  loopKey:  number;
}) {
  const [progress, setProgress] = useState(0);
  const startRef  = useRef(Date.now());
  const rafRef    = useRef(0);

  useEffect(() => {
    setProgress(0);
    startRef.current = Date.now();
  }, [loopKey]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!playing) return;

    const video = videoRef.current;
    const tick = () => {
      if (video && video.duration > 0) {
        setProgress(video.currentTime / video.duration);
      } else {
        const elapsed = (Date.now() - startRef.current) / 1000;
        setProgress(Math.min(elapsed / Math.max(duration, 1), 1));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, duration, loopKey, videoRef]);

  return (
    <div className="w-full h-[3px] rounded-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.22)' }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${progress * 100}%`,
          background: 'linear-gradient(to right, rgba(255,255,255,0.9), white)',
          transition: 'none',
        }}
      />
    </div>
  );
}

/* ─── Like button — Supabase backed ─────────────────────────────────────────── */
function LikeBtn({ shortId }: { shortId: string }) {
  const { user } = useAuth();
  const userId   = user?.id ?? 'anon';
  const [count,  setCount]  = useState(0);
  const [liked,  setLiked]  = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch like state & count on mount / shortId change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('morix_video_likes')
        .select('user_id')
        .eq('video_id', shortId);
      if (cancelled || !data) return;
      setCount(data.length);
      setLiked(data.some((r: { user_id: string }) => r.user_id === userId));
    })();
    return () => { cancelled = true; };
  }, [shortId, userId]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    if (liked) {
      // Optimistic
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));
      await supabase
        .from('morix_video_likes')
        .delete()
        .eq('video_id', shortId)
        .eq('user_id', userId);
    } else {
      // Optimistic
      setLiked(true);
      setCount((c) => c + 1);
      await supabase
        .from('morix_video_likes')
        .insert({ video_id: shortId, user_id: userId });
    }
    setLoading(false);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.82 }}
      onClick={handleLike}
      className="flex flex-col items-center gap-1.5"
    >
      <motion.div
        animate={liked ? { scale: [1, 1.5, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background:     liked ? 'rgba(239,68,68,0.22)' : 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(10px)',
          border:         liked ? '1.5px solid rgba(239,68,68,0.45)' : '1.5px solid rgba(255,255,255,0.18)',
          boxShadow:      liked ? '0 0 22px rgba(239,68,68,0.45)' : 'none',
        }}
      >
        <Heart
          size={17}
          style={{ color: liked ? '#ef4444' : 'white' }}
          fill={liked ? '#ef4444' : 'none'}
        />
      </motion.div>
      <span className="text-[9px] font-black text-white drop-shadow">
        {count > 0
          ? count >= 1000
            ? `${(count / 1000).toFixed(1)}k`
            : count
          : 'Me gusta'}
      </span>
    </motion.button>
  );
}

/* ── Individual Short ──────────────────────────────────────────────────── */
interface ShortSlideProps {
  short:        Short;
  isActive:     boolean;
  shouldMountVideo: boolean;
  onComment:    () => void;
  commentCount: number;
}

function ShortSlide({ short, isActive, shouldMountVideo, onComment, commentCount }: ShortSlideProps) {
  const [playing,     setPlaying]     = useState(false);
  const [muted,       setMuted]       = useState(false);
  const [showHeart,   setHeart]       = useState(false);
  const [loopKey,     setLoopKey]     = useState(0);
  const [isBuffering, setIsBuffering] = useState(true); // true until first canplay
  const lastTap  = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const t = useT();

  // For double-tap like: use Supabase directly
  const { user } = useAuth();
  const userId = user?.id ?? 'anon';

  const doubleTapLike = useCallback(async () => {
    setHeart(true);
    setTimeout(() => setHeart(false), 900);
    // Insert like (ignore duplicate errors)
    await supabase
      .from('morix_video_likes')
      .insert({ video_id: short.id, user_id: userId })
      .then(() => {}); // fire & forget
  }, [short.id, userId]);

  /* ── Auto-play / pause based on visibility ── */
  useEffect(() => {
    const video = videoRef.current;
    if (isActive) {
      setIsBuffering(true); // reset on each slide activation
      const t = setTimeout(() => {
        setPlaying(true);
        if (video) {
          video.currentTime = 0;
          video.muted = true; // must start muted for autoplay policy
          video.play().then(() => {
            // Unmute immediately after autoplay succeeds
            video.muted = false;
            setMuted(false);
          }).catch(() => {
            // If autoplay fails even muted, stay muted
            setMuted(true);
          });
        }
      }, 150);
      return () => clearTimeout(t);
    } else {
      setPlaying(false);
      setLoopKey(0);
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    }
  }, [isActive]);

  /* ── Toggle mute: go straight to the DOM property ── */
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !muted;
    setMuted(next);
    if (videoRef.current) {
      videoRef.current.muted = next;
      if (!next && videoRef.current.paused && isActive) {
        videoRef.current.play().catch(() => {});
        setPlaying(true);
      }
    }
  };

  /* ── Loop: when video ends, restart ── */
  const handleVideoEnded = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
      setLoopKey((k) => k + 1);
    }
  }, []);

  /* ── Tap: single = play/pause, double = like ── */
  const handleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTap.current < 300) {
      doubleTapLike();
    } else {
      const video = videoRef.current;
      if (playing) {
        setPlaying(false);
        video?.pause();
      } else {
        setPlaying(true);
        video?.play().catch(() => {});
      }
    }
    lastTap.current = now;
  };

  const hasVideo = !!short.videoUrl;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Thumbnail — visible solo hasta que el video esté listo */}
      <img
        src={short.thumbnail}
        alt={short.titulo}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'brightness(0.72)', opacity: playing ? 0 : 1, transition: 'opacity 0.4s ease' }}
        draggable={false}
      />

      {/* Video */}
      {hasVideo && shouldMountVideo && (
        <video
          ref={videoRef}
          src={short.videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          loop={false}
          preload="auto"
          poster={TRANSPARENT_POSTER}
          onEnded={handleVideoEnded}
          onCanPlay={() => setIsBuffering(false)}
          onWaiting={() => setIsBuffering(true)}
          style={{ opacity: playing ? 1 : 0, transition: 'opacity 0.4s ease' }}
        />
      )}

      {/* Gradient top */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 25%)',
      }} />
      {/* Gradient bottom */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0) 60%)',
      }} />

      {/* ── Buffering loader — replaces browser native UI ── */}
      <AnimatePresence>
        {(isBuffering || !playing) && isActive && (
          <VideoLoader visible={true} />
        )}
      </AnimatePresence>

      {/* Tap zone */}
      <div className="absolute inset-0 z-10" onClick={handleTap} />

      {/* Double-tap heart */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1.3 }}
            exit={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 0.38 }}
          >
            <Heart
              size={100}
              fill="#ef4444"
              style={{ color: '#ef4444', filter: 'drop-shadow(0 0 24px rgba(239,68,68,0.8))' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paused indicator */}
      <AnimatePresence>
        {!playing && isActive && !showHeart && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(0,0,0,0.52)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.35)',
              }}>
              <Play size={28} className="text-white" style={{ marginLeft: 4 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Right sidebar ── */}
      <div className="absolute right-3 z-40 flex flex-col items-center gap-3"
        style={{ bottom: 52 }}>

        {/* Like */}
        <LikeBtn shortId={short.id} />

        {/* Comment */}
        <button
          onClick={(e) => { e.stopPropagation(); onComment(); }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(10px)',
              border: '1.5px solid rgba(255,255,255,0.18)',
            }}>
            <MessageCircle size={17} className="text-white" />
          </div>
          <span className="text-[9px] font-black text-white drop-shadow">
            {commentCount > 0 ? commentCount : 'Comentar'}
          </span>
        </button>

        {/* Mute */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleMute(e); }}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: muted ? 'rgba(239,68,68,0.18)' : 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(10px)',
            border: muted ? '1.5px solid rgba(239,68,68,0.35)' : '1.5px solid rgba(255,255,255,0.18)',
          }}
        >
          {muted
            ? <VolumeX size={16} style={{ color: '#f87171' }} />
            : <Volume2 size={16} className="text-white" />
          }
        </button>
      </div>

      {/* ── Bottom info ── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-8 pr-20">
        {/* Author */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg,#8b5cf6,#4f46e5)',
              boxShadow: '0 0 10px rgba(139,92,246,0.6)',
            }}>
            {(short.autor ?? 'M').charAt(0).toUpperCase()}
          </div>
          <span className="text-white font-bold text-[13px]">
            @{(short.autor ?? 'Morix').toLowerCase().replace(/\s+/g, '')}
          </span>
        </div>

        {/* Title */}
        <p className="text-white font-black text-[14px] leading-snug mb-1.5">
          {short.titulo}
        </p>

        {/* Description */}
        <p className="text-[11px] leading-relaxed mb-3"
          style={{ color: 'rgba(255,255,255,0.6)' }}>
          {short.descripcion}
        </p>

        {/* Audio ticker */}
        {short.audio && (
          <div className="flex items-center gap-2 mb-4 overflow-hidden">
            <Music2 size={11} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
            <div className="flex-1 overflow-hidden">
              <motion.p
                animate={{ x: [0, -120, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                className="text-[10px] whitespace-nowrap"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                ♫ {short.audio} · Morix Original · ♫ {short.audio} · Morix Original ·
              </motion.p>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <ProgressBar
          videoRef={videoRef}
          duration={short.duracionSeg}
          playing={playing && isActive}
          loopKey={loopKey}
        />
      </div>

    </div>
  );
}

/* ─── Main screen ─────────────────────────────────────────────────────────── */
export default function ShortsPlayer() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const startIndex = (location.state as { startIndex?: number })?.startIndex ?? 0;
  const t = useT();

  const { shorts: adminShorts } = useAdminContent();
  const allShorts: Short[] = adminShorts;

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [commentsOpen, setCommentsOpen] = useState(false);
  // Map shortId → comment count (top-level only), loaded from Supabase
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch comment counts for all shorts once on mount
  useEffect(() => {
    if (allShorts.length === 0) return;
    const ids = allShorts.map((s) => s.id);
    supabase
      .from('morix_video_comments')
      .select('video_id')
      .in('video_id', ids)
      .is('parent_id', null)
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        data.forEach((row: { video_id: string }) => {
          counts[row.video_id] = (counts[row.video_id] ?? 0) + 1;
        });
        setCommentCounts(counts);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allShorts.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || startIndex === 0) return;
    container.scrollTop = startIndex * container.clientHeight;
  }, []); // eslint-disable-line

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const newIndex = Math.round(container.scrollTop / container.clientHeight);
    if (newIndex !== currentIndex) setCurrentIndex(newIndex);
  }, [currentIndex]);

  const current = allShorts[currentIndex];
  if (!current) return null;

  return (
    <div className="absolute inset-0 bg-black overflow-hidden" style={{ zIndex: 50 }}>

      {/* ── Top bar ── */}
      <div
        className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 pt-12 pb-3 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform pointer-events-auto"
          style={{
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <ArrowLeft size={18} className="text-white" />
        </button>

        <div className="absolute left-0 right-0 flex items-center justify-center gap-2 pointer-events-none">
          <div className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}>
            <span className="text-white font-black" style={{ fontSize: '9px' }}>S</span>
          </div>
          <span className="text-white font-black text-sm tracking-wider">Morix Shorts</span>
        </div>

        {/* spacer para mantener justify-between balanceado */}
        <div className="w-9 h-9" />
      </div>

      {/* ── Scroll-snap container ── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="absolute inset-0"
        style={{
          overflowY:          'scroll',
          scrollSnapType:     'y mandatory',
          overscrollBehavior: 'contain',
          scrollbarWidth:     'none',
          msOverflowStyle:    'none',
        } as React.CSSProperties}
      >
        {allShorts.map((short, i) => (
          <div
            key={short.id}
            style={{
              height:          '100%',
              width:           '100%',
              scrollSnapAlign: 'start',
              scrollSnapStop:  'always',
              flexShrink:       0,
              position:        'relative',
            }}
          >
            <ShortSlide
              short={short}
              isActive={currentIndex === i}
              shouldMountVideo={Math.abs(currentIndex - i) <= 1}
              onComment={() => { if (currentIndex === i) setCommentsOpen(true); }}
              commentCount={commentCounts[short.id] ?? 0}
            />
          </div>
        ))}
      </div>

      {/* ── Swipe hint ── */}
      <AnimatePresence>
        {currentIndex === 0 && (
          <motion.div
            className="absolute z-40 flex flex-col items-center gap-1 pointer-events-none"
            style={{ bottom: 38, left: '50%', transform: 'translateX(-50%)' }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 0.75, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 2, duration: 0.5 }}
          >
            <motion.span
              className="text-[11px] font-bold text-white"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.4, repeat: 4, ease: 'easeInOut' }}
            >
              ↑ {t.shorts.desliza.replace('↑ ', '')}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dot indicator ── */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1.5 pointer-events-none">
        {allShorts.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              height:  i === currentIndex ? 18 : 5,
              opacity: i === currentIndex ? 1 : 0.3,
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="rounded-full bg-white"
            style={{ width: 3 }}
          />
        ))}
      </div>

      {/* ── Comments sheet ── */}
      <CommentsSheet
        videoId={current.id}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        totalLabel={current.titulo.length > 32 ? current.titulo.slice(0, 32) + '…' : current.titulo}
        onCountChange={(n) => setCommentCounts((prev) => ({ ...prev, [current.id]: n }))}
      />
    </div>
  );
}