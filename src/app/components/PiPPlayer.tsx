/**
 * PiPPlayer — Reproductor flotante Picture-in-Picture con audio/video REAL.
 * Usa la URL presignada que recibió del VideoPlayer para continuar la reproducción.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, X, Maximize2 } from 'lucide-react';
import { usePiP } from '../contexts/PiPContext';
import { useUserProgress } from '../contexts/UserProgressContext';
import { CAT_COLORS, getCatColors } from './ContentCard';

import { useMediaSession } from '../hooks/useMediaSession';
import { useBackgroundAudio } from '../hooks/useBackgroundAudio';

interface PiPPlayerProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

export function PiPPlayer({ containerRef }: PiPPlayerProps) {
  const navigate  = useNavigate();
  const { pip, pipPlaying, stopPiP, togglePiPPlay, setPiPProgress } = usePiP();
  const { completeVideo, updateVideoProgress, triggerNoReward, watchedVideos } = useUserProgress();
  const { unlockAudio } = useBackgroundAudio();

  const audioRef    = useRef<HTMLAudioElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const [isDragging,    setIsDragging]    = useState(false);
  const [completed,     setCompleted]     = useState(false);
  const [pipCurrentSecs, setPipCurrentSecs] = useState(0); // para Media Session position
  const completedRef = useRef(false);
  const seekedRef    = useRef(false);  // evita doble seek
  // Ref estable para pipPlaying (evita closures stale en handlers de Media Session)
  const pipPlayingRef = useRef(pipPlaying);
  useEffect(() => { pipPlayingRef.current = pipPlaying; }, [pipPlaying]);

  // Helper: referencia al elemento media activo
  const getMedia = useCallback((): HTMLAudioElement | HTMLVideoElement | null => {
    if (!pip) return null;
    return pip.audioSrc ? audioRef.current : videoRef.current;
  }, [pip]);

  // Reset cuando cambia el video
  useEffect(() => {
    completedRef.current = false;
    seekedRef.current    = false;
    setCompleted(false);
  }, [pip?.videoId]);

  // Responde a cambios de pipPlaying (play/pause desde contexto)
  useEffect(() => {
    const media = getMedia();
    if (!media) return;
    if (pipPlaying) {
      media.play().catch(() => {});
    } else {
      media.pause();
    }
  }, [pipPlaying, getMedia]);

  // ── Handlers del elemento media ────────────────────────────────────────────
  const handleCanPlay = useCallback(() => {
    const media = getMedia();
    if (!media || !pip || seekedRef.current) return;
    seekedRef.current = true;
    media.currentTime = pip.progressSecs;
    if (pipPlaying) media.play().catch(() => {});
  }, [pip, pipPlaying, getMedia]);

  const handleTimeUpdate = useCallback(() => {
    const media = getMedia();
    if (!media || !pip || completedRef.current || !seekedRef.current) return;
    const secs = media.currentTime;
    const pct  = pip.durationSecs > 0
      ? Math.min((secs / pip.durationSecs) * 100, 100)
      : 0;
    setPiPProgress(pct, secs);
    setPipCurrentSecs(secs);
    // Guardar progreso cada ~2%
    updateVideoProgress(pip.videoId, pct);
  }, [pip, getMedia, setPiPProgress, updateVideoProgress]);

  const handleEnded = useCallback(() => {
    if (!pip || completedRef.current) return;
    completedRef.current = true;
    
    const media = getMedia();
    if (media) {
      media.pause();
      media.muted = true;
      media.volume = 0;
      media.currentTime = 0;
      media.src = ""; // Liberar el recurso inmediatamente
    }
    
    setPiPProgress(100, pip.durationSecs);
    updateVideoProgress(pip.videoId, 100);

    const isAlreadyWatched = watchedVideos.includes(pip.videoId);
    if (isAlreadyWatched) {
      triggerNoReward('already_watched', pip.title);
    } else {
      completeVideo(pip.videoId, pip.title, pip.durationSecs / 60, pip.categoria);
    }
    
    setCompleted(true);
    setTimeout(() => stopPiP(), 2500);
  }, [pip, setPiPProgress, updateVideoProgress, completeVideo, stopPiP, getMedia]);

  // ── Expand (volver al reproductor completo) ────────────────────────────────
  const handleExpand = useCallback(() => {
    if (isDragging || !pip) return;
    // Captura posición exacta del elemento media antes de pausar
    const media = getMedia();
    const currentSecs = media ? media.currentTime : pip.progressSecs;
    const wasPlaying  = pipPlaying;
    if (media) media.pause();
    updateVideoProgress(pip.videoId, pip.progressPct);
    stopPiP();
    // Pasa al VideoPlayer: posición exacta y si debe arrancar automáticamente
    navigate(`/video/${pip.videoId}`, {
      state: {
        fromPiP:        true,
        pipProgressSecs: currentSecs,
        pipWasPlaying:   wasPlaying,
      },
    });
  }, [isDragging, pip, pipPlaying, getMedia, updateVideoProgress, stopPiP, navigate]);

  // ── Seek absoluto (Media Session seekto) ──────────────────────────────────
  const seekToPiP = useCallback((time: number) => {
    const media = getMedia();
    if (!media || !pip) return;
    media.currentTime = Math.max(0, Math.min(time, pip.durationSecs));
  }, [getMedia, pip]);

  // ── Play / Pause explícitos para Media Session ─────────────────────────
  const pipPlayMedia = useCallback(() => {
    if (!pipPlayingRef.current) togglePiPPlay();
  }, [togglePiPPlay]);

  const pipPauseMedia = useCallback(() => {
    if (pipPlayingRef.current) togglePiPPlay();
  }, [togglePiPPlay]);

  // ── Background: sincronizar estado al volver al frente ─────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) return; // NO pausar al salir
      const media = getMedia();
      if (media && pipPlayingRef.current !== !media.paused) {
        // El media se auto-pausó (ej. iOS); intentar reanudar si pipPlaying=true
        if (pipPlayingRef.current && media.paused) {
          media.play().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [getMedia]);

  // ── Media Session API para PiP ─────────────────────────────────────────
  useMediaSession({
    title:          pip?.title ?? '',
    artist:         pip?.categoria ?? '',
    artwork:        pip?.thumbnail ?? '',
    playing:        pipPlaying && !completed,
    duration:       pip?.durationSecs ?? 0,
    currentTime:    pipCurrentSecs,
    onPlay:         pipPlayMedia,
    onPause:        pipPauseMedia,
    onSeekForward:  useCallback(() => {
      const media = getMedia();
      if (media && pip) media.currentTime = Math.min(media.currentTime + 30, pip.durationSecs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getMedia, pip]),
    onSeekBackward: useCallback(() => {
      const media = getMedia();
      if (media) media.currentTime = Math.max(media.currentTime - 30, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getMedia]),
    onSeekTo:       seekToPiP,
    onStop:         pipPauseMedia,
    enabled:        !!pip && !completed,
  });

  const c = pip 
    ? getCatColors(pip.categoria) 
    : (CAT_COLORS['Meditación & Sonidos'] || { from: '#8b5cf6', to: '#6366f1', glow: 'rgba(139,92,246,0.8)' });


  return (
    <AnimatePresence>
      {pip && !completed && (
        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={containerRef}
          dragElastic={0}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setTimeout(() => setIsDragging(false), 80)}
          initial={{ opacity: 0, scale: 0.7, y: 60 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.75, y: 40 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          style={{
            position:    'absolute',
            bottom:      '100px',
            right:       '14px',
            zIndex:      9999,
            width:       '234px',
            cursor:      isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          className="select-none"
        >
          {/* ── Elementos media ocultos ── */}
          {pip.audioSrc && (
            <audio
              ref={audioRef}
              src={pip.audioSrc}
              preload="auto"
              onCanPlay={handleCanPlay}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              style={{ display: 'none' }}
            />
          )}
          {pip.videoSrc && !pip.audioSrc && (
            <video
              ref={videoRef}
              src={pip.videoSrc}
              preload="auto"
              playsInline
              onCanPlay={handleCanPlay}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              style={{ display: 'none' }}
            />
          )}

          {/* ── UI visual ── */}
          <div
            style={{
              borderRadius:    '22px',
              overflow:        'hidden',
              background:      'rgba(10,10,24,0.96)',
              backdropFilter:  'blur(24px)',
              border:          `1.5px solid ${c.from}55`,
              boxShadow:       `0 8px 32px rgba(0,0,0,0.7), 0 0 24px ${c.from}30`,
            }}
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2.5px]"
              style={{ background: `linear-gradient(to right, ${c.from}, ${c.to})`, boxShadow: `0 0 8px ${c.glow}` }} />

            <div className="flex items-stretch">
              {/* Thumbnail */}
              <div className="relative flex-shrink-0" style={{ width: '72px' }}>
                <img src={pip.thumbnail} alt={pip.title} className="w-full h-full object-cover" style={{ opacity: 0.85 }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent 50%, rgba(10,10,24,0.9))' }} />
                {/* Animación de barras cuando está reproduciendo */}
                {pipPlaying && !completed && (
                  <div className="absolute bottom-2 left-2 flex items-end gap-[2px]">
                    {[4, 8, 6, 10, 7].map((h, i) => (
                      <motion.div key={i} style={{ width: '2px', background: c.from, borderRadius: '1px' }}
                        animate={{ height: [h, h + 5, h - 2, h + 3, h] }}
                        transition={{ duration: 0.6 + i * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 flex flex-col justify-center px-2.5 py-2.5 min-w-0">
                {completed ? (
                  <div className="flex flex-col items-center py-1">
                    <span className="text-xl mb-0.5">✅</span>
                    <p className="text-white text-[10px] font-bold">¡Completado!</p>
                  </div>
                ) : (
                  <>
                    <p className="text-white text-[11px] font-bold leading-tight line-clamp-2 mb-1.5">{pip.title}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-semibold" style={{ color: c.from }}>{pip.categoria}</span>
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '8px' }}>·</span>
                      <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{Math.round(pip.progressPct)}%</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-[3px] rounded-full mt-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <motion.div
                        animate={{ width: `${pip.progressPct}%` }}
                        transition={{ duration: 0.3 }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(to right, ${c.from}, ${c.to})`, boxShadow: `0 0 6px ${c.glow}` }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Controls */}
              {!completed && (
                <div className="flex flex-col items-center justify-between py-2.5 pr-2.5 gap-2 flex-shrink-0">
                  {/* Play/Pause */}
                  <button
                    onClick={(e) => { e.stopPropagation(); unlockAudio(); togglePiPPlay(); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})`, boxShadow: `0 0 10px ${c.glow}` }}
                  >
                    {pipPlaying
                      ? <Pause size={11} fill="white" className="text-white" />
                      : <Play  size={11} fill="white" className="text-white ml-0.5" />
                    }
                  </button>

                  {/* Expand → vuelve al reproductor completo */}
                  <button
                    onClick={handleExpand}
                    className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <Maximize2 size={9} style={{ color: 'rgba(255,255,255,0.7)' }} />
                  </button>

                  {/* Close */}
                  <button
                    onClick={(e) => { e.stopPropagation(); stopPiP(); }}
                    className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <X size={9} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Drag hint */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
            <p className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>arrastrar</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}