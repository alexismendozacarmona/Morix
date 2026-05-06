import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward,
  Star, Clock, Minimize2, Heart, ListMusic, Maximize2, Minimize, Crown,
} from 'lucide-react';
import type { Contenido } from '../data/mockData';
import { ContentCard } from '../components/ContentCard';
import { ContentPreviewSheet } from '../components/ContentPreviewSheet';
import { PreviewProvider, usePreview } from '../contexts/PreviewContext';
import { useUserProgress } from '../contexts/UserProgressContext';
import { usePiP } from '../contexts/PiPContext';
import { usePlaylist } from '../contexts/PlaylistContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { PlaylistModal } from '../components/PlaylistModal';
import { HScrollRow } from '../components/HScrollRow';
import type { XPReward } from '../contexts/UserProgressContext';
import { AuroraBackground } from '../components/AuroraBackground';
import { getCatColors } from '../components/ContentCard';
import { toCanonicalCategory } from '../utils/categoryUtils';
import { CommentsSheet } from '../components/CommentsSheet';
import { VideoLikes } from '../components/VideoLikes';
import { InlineCommentsSection } from '../components/InlineCommentsSection';
import { useSettings } from '../contexts/SettingsContext';
import { useT } from '../i18n/useT';
import { R2_FOLDERS } from '../config/r2Config';
import { useAdminContent } from '../contexts/AdminContentContext';
import { getPresignedGetUrl } from '../utils/r2Upload';
import { useTrending } from '../contexts/TrendingContext';
import { usePlanAccess } from '../hooks/usePlanAccess';
import { PaywallModal } from '../components/PaywallModal';
import { useMediaSession, playPhantomAudio, pausePhantomAudio } from '../hooks/useMediaSession';
import { useBackgroundAudio } from '../hooks/useBackgroundAudio';
import { VideoLoader, TRANSPARENT_POSTER } from '../components/VideoLoader';
import { useSocial } from '../contexts/SocialContext';

// Skip-detection threshold (85% of progress must come from real watch time)
const SKIP_THRESHOLD = 0.85;

// ── Safe string helper — always returns a string ─────────────────────────────
function toStr(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

/** Devuelve la duración en SEGUNDOS. Soporta "45:23" y "35 min" */
function parseDuration(d: string): number {
  const mmss = d.match(/^(\d+):(\d{2})$/);
  if (mmss) return parseInt(mmss[1]) * 60 + parseInt(mmss[2]);
  const mins = d.match(/(\d+)/);
  return mins ? parseInt(mins[1]) * 60 : 600;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Completion result types ───────────────────────────────────────────────
type CompletionResult =
  | { kind: 'xp'; reward: XPReward }
  | { kind: 'no_reward'; reason: NoRewardType };

/**
 * Moves an existing <video> DOM element into a fullscreen container
 * WITHOUT creating a second element (avoids double audio, re-buffering, etc.)
 */
function FullscreenVideoPortal({ videoEl }: { videoEl: HTMLVideoElement }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const originalParentRef = useRef<HTMLElement | null>(null);
  const originalStylesRef = useRef<{ cssText: string; className: string }>({ cssText: '', className: '' });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !videoEl) return;

    // Save original position & styles
    originalParentRef.current = videoEl.parentElement;
    originalStylesRef.current = {
      cssText: videoEl.style.cssText,
      className: videoEl.className,
    };

    // Move the video element into the fullscreen container
    videoEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;';
    videoEl.className = '';
    container.appendChild(videoEl);

    return () => {
      // Restore: move it back to original parent
      const origParent = originalParentRef.current;
      if (origParent && videoEl) {
        videoEl.style.cssText = originalStylesRef.current.cssText;
        videoEl.className = originalStylesRef.current.className;
        origParent.appendChild(videoEl);
      }
    };
  }, [videoEl]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function PlayerInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setPreviewItem, previewItem } = usePreview();
  const {
    completeVideo,
    toggleSave,
    isSaved,
    updateVideoProgress,
    getVideoProgress,
    watchedVideos,
    totalXP,
    triggerNoReward,
  } = useUserProgress();
  const { publishActivity } = useSocial();
  const { startPiP, pip } = usePiP();
  const { playlists, getVideoPlaylists, toggleInPlaylist } = usePlaylist();
  const { addNotification } = useNotifications();
  const [commentCount, setCommentCount] = useState(0);
  const { appSettings } = useSettings();
  const t = useT();
  const { videos: adminVideos } = useAdminContent();
  const { trackView } = useTrending();
  const { canWatch } = usePlanAccess();
  const { unlockAudio } = useBackgroundAudio();

  // Buscar el video en el contenido real del admin
  // Fallback dummy para que los hooks no crasheen si aún no hay contenido
  const DUMMY: Contenido = { id: '__empty__', titulo: '', categoria: 'Meditación & Sonidos', duracion: '0 min', imagen: '' };
  const video: Contenido = adminVideos.find((v) => v.id === id) ?? adminVideos[0] ?? DUMMY;
  const isVideoMissing = video.id === '__empty__';
  const isLocked = !canWatch(video);

  const totalContentSeconds = parseDuration(video.duracion); // ya en segundos
  const colors = getCatColors(video.categoria);
  const catDisplay = (t.categorias as Record<string, string>)[toCanonicalCategory(video.categoria)] ?? video.categoria;

  // If navigated via "Ver siguiente video", always start fresh from 0
  const isFresh = location.state?.fresh === true;

  // If navigated from PiP expansion, carry over exact position + autoplay intent
  const fromPiP         = location.state?.fromPiP === true;
  const pipProgressSecs = typeof location.state?.pipProgressSecs === 'number'
    ? (location.state.pipProgressSecs as number)
    : null;
  const pipWasPlaying   = location.state?.pipWasPlaying === true;

  // Resume from saved position (PiP or context) — only if NOT a fresh navigation
  const savedProgress = isFresh ? 0
    : pip?.videoId === video.id ? pip.progressPct
    : getVideoProgress(video.id);
  // Prefer exact seconds from PiP handoff (more accurate than pct→secs roundtrip)
  const savedSeconds = fromPiP && pipProgressSecs !== null
    ? pipProgressSecs
    : savedProgress > 0 && savedProgress < 100
      ? (savedProgress / 100) * totalContentSeconds
      : 0;

  // Auto-play ref: set once on mount when coming from a playing PiP
  const shouldAutoPlayRef = useRef(fromPiP && pipWasPlaying);

  // Was this video already fully watched before this session?
  // If fresh navigation, treat it as not watched so XP can be awarded again
  const safeWatched = Array.isArray(watchedVideos) ? watchedVideos : [];
  const wasAlreadyWatched = !isFresh && safeWatched.includes(video.id);

  const [progressSeconds, setProgressSeconds] = useState(isFresh ? 0 : savedSeconds);
  const [descExpanded, setDescExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [completed, setCompleted] = useState(false); // always start fresh — never auto-fire the reward modal on mount
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [saved, setSaved] = useState(isSaved(video.id));
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);


  const [isFullscreen, setIsFullscreen] = useState(false);
  const [frameSize, setFrameSize] = useState({ w: 390, h: 844 });
  // ── Subtitle cycling ──────────────────────────────────────────────────────
  const [subtitleIdx, setSubtitleIdx] = useState(0);
  const subtitleLines = (t.player as Record<string, unknown>).subtitle_lines as string[] | undefined ?? ['…'];
  useEffect(() => {
    if (!appSettings.subtitulos || !playing) return;
    const interval = setInterval(() => {
      setSubtitleIdx((i) => (i + 1) % subtitleLines.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [appSettings.subtitulos, playing, subtitleLines.length]);

  // ── Playlist state ────────────────────────────────────────────────────────
  const defaultPlaylist = playlists[0];
  const [inPlaylist, setInPlaylist] = useState(
    defaultPlaylist ? (Array.isArray(defaultPlaylist.videoIds) ? defaultPlaylist.videoIds : []).includes(video.id) : false
  );
  const addVideoToPlaylist = () => {
    if (defaultPlaylist) toggleInPlaylist(defaultPlaylist.id, video.id);
  };
  const removeVideoFromPlaylist = () => {
    if (defaultPlaylist) toggleInPlaylist(defaultPlaylist.id, video.id);
  };

  // Read phone-frame dimensions when entering fullscreen
  useEffect(() => {
    if (isFullscreen) {
      const frame = document.getElementById('phone-frame');
      if (frame) {
        setFrameSize({ w: frame.offsetWidth, h: frame.offsetHeight });
      }
    }
  }, [isFullscreen]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const audioRef  = useRef<HTMLAudioElement>(null);  // ← modo audio+loop
  const loopRef   = useRef<HTMLVideoElement>(null);  // ← video loop silencioso
  const bgAudioRef = useRef<HTMLAudioElement>(null); // ← audio de fondo para videos pesados
  const bgActiveRef = useRef(false);                 // ← true cuando el bgAudio está sonando en background
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewardTriggered = useRef(false);

  // ── Detecta modo audio+loop ───────────────────────────────────────────────
  const esAudioLoop = typeof video.audioFile === 'string' && video.audioFile.length > 0
    && typeof video.loopFile === 'string' && video.loopFile.length > 0;

  // ── Detecta video largo con audio de fondo disponible ─────────────────────
  const tieneBgAudio = !esAudioLoop
    && typeof video.bgAudioFile === 'string' && video.bgAudioFile.length > 0;

  // ── Datos móviles gate ────────────────────────────────────────────────────
  const [cellularBlocked, setCellularBlocked] = useState(false);

  useEffect(() => {
    if (appSettings.datosMoviles) { setCellularBlocked(false); return; }
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (!conn) { return; } // network API not available — don't block
    const check = () => {
      const netType  = conn.type ?? '';
      const effType  = conn.effectiveType ?? '';
      const isCellular = ['cellular', '2g', '3g', '4g', '5g'].includes(netType)
        || ['2g', '3g', 'slow-2g'].includes(effType);
      setCellularBlocked(isCellular);
    };
    check();
    conn.addEventListener('change', check);
    return () => conn.removeEventListener('change', check);
  }, [appSettings.datosMoviles]);

  // ── URLs de reproducción con presigned (funciona sin acceso público en R2) ─
  const [mediaSrc, setMediaSrc] = useState<{
    video: string | null;
    audio: string | null;
    loop:  string | null;
    bgAudio: string | null;
  }>({ video: null, audio: null, loop: null, bgAudio: null });

  useEffect(() => {
    if (isVideoMissing) return;
    if (cellularBlocked) return; // don't fetch presigned URL on cellular if disabled
    let cancelled = false;

    async function buildUrls() {
      try {
        if (esAudioLoop) {
          // Both audioFile and loopFile are guaranteed strings here (checked in esAudioLoop)
          const af = toStr(video.audioFile);
          const lf = toStr(video.loopFile);
          const aFile = af.includes('.') ? af : `${af}.mp3`;
          const lFile = lf.includes('.') ? lf : `${lf}.mp4`;
          const [audio, loop] = await Promise.all([
            getPresignedGetUrl(R2_FOLDERS.audios, aFile),
            getPresignedGetUrl(R2_FOLDERS.loops,  lFile),
          ]);
          if (!cancelled) setMediaSrc({ video: null, audio, loop, bgAudio: null });
        } else {
          const vName = toStr(video.videoFile ?? video.id);
          const vFile = vName.includes('.') ? vName : `${vName}.mp4`;
          // Fetch video URL + optional bgAudio URL in parallel
          const bgName = toStr(video.bgAudioFile ?? '');
          const promises: [Promise<string>, Promise<string | null>] = [
            getPresignedGetUrl(R2_FOLDERS.videos, vFile),
            bgName
              ? getPresignedGetUrl(R2_FOLDERS.audios, bgName.includes('.') ? bgName : `${bgName}.m4a`)
              : Promise.resolve(null),
          ];
          const [videoUrl, bgAudioUrl] = await Promise.all(promises);
          if (!cancelled) setMediaSrc({ video: videoUrl, audio: null, loop: null, bgAudio: bgAudioUrl });
        }
      } catch (e) {
        console.error('[VideoPlayer] Error generando presigned URL:', e);
      }
    }

    buildUrls();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id, esAudioLoop, video.audioFile, video.loopFile, video.videoFile, video.bgAudioFile, isVideoMissing]);

  // ── Real video state ──────────────────────────────────────────────────────
  const [buffering,   setBuffering]   = useState(false);
  const [videoReady,  setVideoReady]  = useState(false);
  const [videoError,  setVideoError]  = useState(false);
  // Actual duration updated when video metadata loads
  const [videoDuration, setVideoDuration] = useState(parseDuration(video.duracion)); // segundos

  // ── Anti-skip tracking ────────────────────────────────────────────────────
  // lastTimeRef: previous currentTime — used to calc delta in onTimeUpdate
  const viewTrackedRef = useRef(false); // track view only once per session
  const lastTimeRef = useRef(savedSeconds);
  const actualWatchedRef = useRef(0);
  const sessionStartSecondsRef = useRef(savedSeconds);

  // Use videoDuration for all progress calculations
  const totalContentSecondsRef = videoDuration;
  const progressPct = Math.min((progressSeconds / totalContentSecondsRef) * 100, 100);

  // Derived: did user skip too much this session?
  function detectSkip(finalProgressSecs: number): boolean {
    const progressGained = finalProgressSecs - sessionStartSecondsRef.current;
    if (progressGained <= 0) return false;
    return actualWatchedRef.current < progressGained * SKIP_THRESHOLD;
  }

  // Scroll back to top when any result modal appears
  useEffect(() => {
    if (completionResult && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [completionResult]);

  // Periodic progress save
  const lastSavedPct = useRef(-1);
  useEffect(() => {
    const rounded = Math.floor(progressPct / 2) * 2;
    if (rounded !== lastSavedPct.current) {
      lastSavedPct.current = rounded;
      updateVideoProgress(video.id, progressPct);
    }
  }, [Math.floor(progressPct)]);

  const startHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    // modoSinDistracciones: hide after 800ms instead of 3200ms
    const delay = appSettings.modoSinDistracciones ? 800 : 3200;
    hideTimerRef.current = setTimeout(() => setShowControls(false), delay);
  }, [appSettings.modoSinDistracciones]);

  // ── Real video event handlers ─────────────────────────────────────────────
  const handleMetadata = useCallback(() => {
    // En modo audio+loop, el metadata real viene del audio
    const media: HTMLVideoElement | HTMLAudioElement | null =
      esAudioLoop ? audioRef.current : videoRef.current;
    if (!media || !isFinite(media.duration) || media.duration <= 0) return;
    setVideoDuration(media.duration);
    setVideoReady(true);
    // Determine start position: PiP exact secs take priority over % calculation
    const startSecs = savedSeconds > 0 ? savedSeconds : 0;
    if (startSecs > 0) {
      media.currentTime = startSecs;
      lastTimeRef.current = startSecs;
      sessionStartSecondsRef.current = startSecs;
      setProgressSeconds(startSecs);
    }
    // Auto-play if coming from an actively playing PiP
    if (shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false;
      media.play().catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSeconds, esAudioLoop]);

  const handleTimeUpdate = useCallback(() => {
    const media: HTMLVideoElement | HTMLAudioElement | null =
      esAudioLoop ? audioRef.current : videoRef.current;
    if (!media) return;
    const delta = media.currentTime - lastTimeRef.current;
    if (delta > 0 && delta < 1.5) actualWatchedRef.current += delta;
    lastTimeRef.current = media.currentTime;
    setProgressSeconds(media.currentTime);
    // Registrar una vista cuando el usuario haya visto al menos el 10%
    if (!viewTrackedRef.current && media.duration > 0 && media.currentTime / media.duration >= 0.1) {
      viewTrackedRef.current = true;
      trackView(video.id).catch(() => {});
    }
  }, [esAudioLoop, video.id, trackView]);

  const handleVideoEnded = useCallback(() => {
    setPlaying(false);
    setCompleted(true);
  }, []);

  const pauseVideo = useCallback(() => {
    if (esAudioLoop) {
      audioRef.current?.pause();
      // loop video no necesita pause explícito — se pausa solo cuando el audio para
    } else {
      const vid = videoRef.current;
      if (vid && !vid.paused) vid.pause();
    }
    // Siempre pausar bgAudio (esté en background o no, puede estar muteado sonando)
    if (bgAudioRef.current && !bgAudioRef.current.paused) {
      bgAudioRef.current.pause();
      bgAudioRef.current.muted = true;
    }
    bgActiveRef.current = false;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, [esAudioLoop]);

  // ── Completion detection (edge-case fallback for seek-to-end) ────────────
  useEffect(() => {
    if (!completed && totalContentSecondsRef > 0 &&
        progressSeconds >= totalContentSecondsRef - 0.5) {
      pauseVideo();
      setCompleted(true);
    }
  }, [progressSeconds, totalContentSecondsRef, completed, pauseVideo]);

  // ── Reward logic ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!completed || rewardTriggered.current) return;
    rewardTriggered.current = true;
    updateVideoProgress(video.id, 100);
    const skipped = detectSkip(totalContentSecondsRef);
    setTimeout(() => {
      if (wasAlreadyWatched) {
        setCompletionResult({ kind: 'no_reward', reason: 'already_watched' });
        triggerNoReward('already_watched', video.titulo, nextVideo);
      } else if (skipped) {
        setCompletionResult({ kind: 'no_reward', reason: 'skipped' });
        triggerNoReward('skipped', video.titulo, nextVideo);
      } else {
        const r = completeVideo(video.id, video.titulo, Math.round(parseDuration(video.duracion) / 60), video.categoria, nextVideo);
        setCompletionResult({ kind: 'xp', reward: r });
        // Publicar actividad social
        publishActivity('video_watched', video.titulo, `¡Completó ${video.titulo} y ganó ${r.xp} XP!`, '📺');
      }
    }, 600);
  }, [completed]); // eslint-disable-line

  // ── Audio+Loop sync: sincroniza el loop visual con el audio ──────────────
  useEffect(() => {
    const aud = audioRef.current;
    const loop = loopRef.current;
    if (!esAudioLoop || !aud || !loop) return;
    const onPlay  = () => loop.play().catch(() => {});
    const onPause = () => loop.pause();
    aud.addEventListener('play',  onPlay);
    aud.addEventListener('pause', onPause);
    return () => {
      aud.removeEventListener('play',  onPlay);
      aud.removeEventListener('pause', onPause);
    };
  }, [esAudioLoop]);

  // ── Cuando el loop recibe su URL presignada, iniciarlo si el audio ya suena ─
  useEffect(() => {
    if (!mediaSrc.loop) return;
    const t = setTimeout(() => {
      const loop = loopRef.current;
      const aud  = audioRef.current;
      if (loop && aud && !aud.paused) loop.play().catch(() => {});
    }, 150);
    return () => clearTimeout(t);
  }, [mediaSrc.loop]);

  // ── Volume: always max (user controls via hardware buttons) ──────────────
  useEffect(() => {
    if (esAudioLoop) {
      if (audioRef.current) audioRef.current.volume = 1;
    } else {
      if (videoRef.current) videoRef.current.volume = 1;
    }
  }, [esAudioLoop]);

  // ── Volume stub: UI removed, stubs satisfy dead-JSX refs ──────────────────
  const volume = 0;
  const setVolume = (_v: number) => { void _v; };
  const setShowVolume = (_s: boolean) => { void _s; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const volumeHideTimer = { current: null as ReturnType<typeof setTimeout> | null };

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      pauseVideo();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [pauseVideo]);

  const togglePlay = useCallback(() => {
    if (completed) return;
    // Desbloquear AudioContext en el primer gesto del usuario —
    // necesario para que Capacitor Android mantenga el audio en background.
    unlockAudio();
    setShowControls(true);
    if (esAudioLoop) {
      const aud = audioRef.current;
      if (!aud) return;
      if (playing) {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        pausePhantomAudio(); // ← pausa el phantom SINCRÓNICAMENTE en gesto del usuario
        aud.pause();
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      } else {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        playPhantomAudio(); // ← activa phantom SINCRÓNICAMENTE → Android ve <audio> tocando → notificación
        aud.play().catch(() => {});
        startHideTimer();
      }
    } else {
      const vid = videoRef.current;
      if (!vid) return;
      if (playing) {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        pausePhantomAudio();
        vid.pause();
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      } else {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        playPhantomAudio();
        vid.play().catch(() => {});
        startHideTimer();
      }
    }
  }, [completed, playing, esAudioLoop, startHideTimer, unlockAudio]);

  const tapPlayer = () => {
    if (appSettings.modoSinDistracciones && playing) { startHideTimer(); return; }
    setShowControls((s) => !s);
    if (!playing) return;
    startHideTimer();
  };

  const skipForward = useCallback(() => {
    if (esAudioLoop) {
      const aud = audioRef.current;
      if (aud) aud.currentTime = Math.min(aud.currentTime + 30, totalContentSecondsRef);
    } else {
      const vid = videoRef.current;
      if (vid) vid.currentTime = Math.min(vid.currentTime + 30, totalContentSecondsRef);
      if (vid && tieneBgAudio && bgAudioRef.current) bgAudioRef.current.currentTime = vid.currentTime;
    }
  }, [esAudioLoop, totalContentSecondsRef]);

  const skipBack = useCallback(() => {
    if (esAudioLoop) {
      const aud = audioRef.current;
      if (aud) aud.currentTime = Math.max(aud.currentTime - 30, 0);
    } else {
      const vid = videoRef.current;
      if (vid) vid.currentTime = Math.max(vid.currentTime - 30, 0);
      if (vid && tieneBgAudio && bgAudioRef.current) bgAudioRef.current.currentTime = vid.currentTime;
    }
  }, [esAudioLoop]);

  // ── Seek a posición absoluta (usado por Media Session seekto) ────────────
  const seekTo = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, totalContentSecondsRef));
    if (esAudioLoop) {
      if (audioRef.current) audioRef.current.currentTime = clamped;
    } else {
      if (videoRef.current) videoRef.current.currentTime = clamped;
    }
    setProgressSeconds(clamped);
    if (clamped < totalContentSecondsRef - 0.5) {
      setCompleted(false);
      rewardTriggered.current = false;
      setCompletionResult(null);
    }
  }, [esAudioLoop, totalContentSecondsRef]);

  // ── Play / Pause explícitos para Media Session (no togglean) ────────────
  const playMedia = useCallback(() => {
    if (completed) return;
    const media = esAudioLoop ? audioRef.current : videoRef.current;
    if (!media || !media.paused) return;
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    playPhantomAudio(); // ← garantiza audio focus en Android desde action handler
    media.play().catch(() => {});
    startHideTimer();
  }, [completed, esAudioLoop, startHideTimer]);

  const pauseMedia = useCallback(() => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    pausePhantomAudio();
    pauseVideo();
  }, [pauseVideo]);

  // ── Background: swap video↔bgAudio para videos pesados ────────
  // El bgAudio YA está reproduciéndose muteado y sincronizado.
  // Al ir a background solo desmuteamos bgAudio y pausamos el video.
  // Al volver, muteamos bgAudio, sincronizamos tiempo y reanudamos video.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // ── APP VA A SEGUNDO PLANO ──
        if (tieneBgAudio && bgAudioRef.current && videoRef.current && !videoRef.current.paused) {
          const vid = videoRef.current;
          const bgAud = bgAudioRef.current;
          // Sincronizar tiempo exacto
          bgAud.currentTime = vid.currentTime;
          // Desmutear el bgAudio (ya está en play, el OS no lo mata)
          bgAud.muted = false;
          // Pausar el video pesado para liberar recursos
          vid.pause();
          bgActiveRef.current = true;
        }
        return;
      }

      // ── APP VUELVE AL FRENTE ──
      if (bgActiveRef.current && tieneBgAudio) {
        const vid = videoRef.current;
        const bgAud = bgAudioRef.current;
        if (vid && bgAud) {
          const exactTime = bgAud.currentTime;
          // Mutear bgAudio de nuevo
          bgAud.muted = true;
          // Sincronizar video al tiempo exacto del audio
          vid.currentTime = exactTime;
          vid.addEventListener('seeked', () => {
            vid.play().then(() => {
              // Re-sincronizar bgAudio muteado
              if (bgAud) {
                bgAud.currentTime = vid.currentTime;
                bgAud.play().catch(() => {});
              }
            }).catch(() => {});
          }, { once: true });
        }
        bgActiveRef.current = false;
      }

      // Sincronizar estado de playing
      const media: HTMLVideoElement | HTMLAudioElement | null =
        esAudioLoop ? audioRef.current : videoRef.current;
      if (media) setPlaying(!media.paused);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [esAudioLoop, tieneBgAudio]);

  // ── Media Session API — notificación nativa del SO ───────────────────────
  useMediaSession({
    title:          video.titulo,
    artist:         catDisplay,
    artwork:        video.imagen,
    playing,
    duration:       videoDuration,
    currentTime:    progressSeconds,
    onPlay:         playMedia,
    onPause:        pauseMedia,
    onSeekForward:  skipForward,
    onSeekBackward: skipBack,
    onSeekTo:       seekTo,
    onStop:         pauseMedia,
    enabled:        !isVideoMissing && !isLocked,  // ← videoReady quitado: la sesión se registra desde que abre el player
  });

  const seek = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * totalContentSecondsRef;
    if (esAudioLoop) {
      if (audioRef.current) audioRef.current.currentTime = newTime;
    } else {
      if (videoRef.current) videoRef.current.currentTime = newTime;
      if (tieneBgAudio && bgAudioRef.current) bgAudioRef.current.currentTime = newTime;
    }
    if (pct < 0.999) {
      setCompleted(false);
      rewardTriggered.current = false;
      setCompletionResult(null);
    }
  }, [esAudioLoop, totalContentSecondsRef]);

  const restartVideo = useCallback(() => {
    if (esAudioLoop) {
      const aud = audioRef.current;
      if (aud) { aud.currentTime = 0; aud.pause(); }
    } else {
      const vid = videoRef.current;
      if (vid) { vid.currentTime = 0; vid.pause(); }
    }
    setProgressSeconds(0);
    lastTimeRef.current = 0;
    sessionStartSecondsRef.current = 0;
    actualWatchedRef.current = 0;
    setCompleted(false);
    rewardTriggered.current = false;
    setCompletionResult(null);
    lastSavedPct.current = -1;
  }, []);

  const handleSave = () => { toggleSave(video.id); setSaved(!saved); };

  const handlePlaylist = () => {
    if (inPlaylist) {
      removeVideoFromPlaylist();
    } else {
      addVideoToPlaylist();
    }
    setInPlaylist(!inPlaylist);
  };

  const goBack = useCallback(() => {
    if (location.key === 'default') {
      navigate('/inicio', { replace: true });
    } else {
      navigate(-1);
    }
  }, [location.key, navigate]);

  const handleBack = () => {
    const wasPlaying = playing;
    pauseVideo();
    // Notificación de recordatorio si dejó a medias (10–90%)
    if (progressPct > 10 && progressPct < 90) {
      addNotification({
        type: 'reminder',
        title: 'Continúa donde lo dejaste',
        body: `"${video.titulo}" — llevas el ${Math.round(progressPct)}% visto`,
        videoId: video.id,
        icon: '▶️',
        accentColor: '#3b82f6',
      });
    }
    if (!completed && progressPct > 1 && progressPct < 99) {
      startPiP({
        videoId:      video.id,
        title:        video.titulo,
        thumbnail:    video.imagen,
        progressPct,
        progressSecs: progressSeconds,
        durationSecs: videoDuration,
        categoria:    video.categoria,
        audioSrc:     esAudioLoop ? (mediaSrc.audio ?? null) : null,
        videoSrc:     !esAudioLoop ? (mediaSrc.video ?? null) : null,
      }, wasPlaying);
    }
    goBack();
  };

  const handleMinimize = () => {
    if (completed) {
      goBack();
      return;
    }
    const wasPlaying = playing;
    pauseVideo();
    startPiP({
      videoId:      video.id,
      title:        video.titulo,
      thumbnail:    video.imagen,
      progressPct,
      progressSecs: progressSeconds,
      durationSecs: videoDuration,
      categoria:    video.categoria,
      audioSrc:     esAudioLoop ? (mediaSrc.audio ?? null) : null,
      videoSrc:     !esAudioLoop ? (mediaSrc.video ?? null) : null,
    }, wasPlaying);
    goBack();
  };

  // ── Smart next video ─────────────────────────────────────────────────────
  // 1. Exclude current + already fully watched
  // 2. Prefer same category; fall back to any category
  // 3. Sort by match score and pick the best unwatched one
  // 4. If everything is watched, pick the highest-rated different video
  const nextVideo: Contenido | null = (() => {
    const unwatched = adminVideos.filter(
      (v) => v.id !== video.id && !safeWatched.includes(v.id)
    );
    const sameCat = unwatched.filter((v) => v.categoria === video.categoria);
    const pool = sameCat.length > 0 ? sameCat : unwatched;

    if (pool.length > 0) {
      return [...pool].sort((a, b) => (b.match ?? 0) - (a.match ?? 0))[0];
    }
    return [...adminVideos]
      .filter((v) => v.id !== video.id)
      .sort((a, b) => (b.match ?? 0) - (a.match ?? 0))[0] ?? null;
  })();

  // ── Related content ──────────────────────────────────────────────────────
  // Show a mix: prioritise same category but inject other categories so
  // the row never looks identical to what the user just watched.
  const relacionados = (() => {
    const notCurrent = adminVideos.filter((v) => v.id !== video.id);
    // Unwatched first, then watched — so freshness always comes first
    const byFreshness = [
      ...notCurrent.filter((v) => !safeWatched.includes(v.id)),
      ...notCurrent.filter((v) => safeWatched.includes(v.id)),
    ];
    const sameCat = byFreshness.filter((v) => v.categoria === video.categoria);
    const otherCat = byFreshness.filter((v) => v.categoria !== video.categoria);
    // Interleave: 3 from same category + 3 from others
    const mixed: Contenido[] = [];
    for (let i = 0; mixed.length < 6; i++) {
      if (i < sameCat.length) mixed.push(sameCat[i]);
      if (mixed.length < 6 && i < otherCat.length) mixed.push(otherCat[i]);
      if (i >= sameCat.length && i >= otherCat.length) break;
    }
    return mixed.slice(0, 6);
  })();

  // Helper to derive what to show in the info/status area
  const getWatchStatus = () => {
    if (completed && completionResult?.kind === 'xp') return 'xp_earned';
    if (completed && completionResult?.kind === 'no_reward') return completionResult.reason;
    if (completed) return 'loading';
    if (progressPct > 0 && progressPct < 100) {
      return wasAlreadyWatched ? 'already_watched_inprogress' : 'in_progress';
    }
    return wasAlreadyWatched ? 'already_watched_fresh' : 'not_started';
  };

  const watchStatus = getWatchStatus();

  // Any modal showing? → lock scroll
  const hasModal = !!completionResult;

  // ── Datos móviles bloqueados ───────────────────────────────────────────────
  if (cellularBlocked) {
    const isSpa = appSettings.idioma === 'es';
    return (
      <div className="relative bg-[#030309] h-full flex flex-col items-center justify-center px-8 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}
        >
          <span className="text-3xl">📡</span>
        </div>
        <p className="text-white font-black text-[17px] mb-2">
          {isSpa ? 'Datos móviles desactivados' : 'Mobile data disabled'}
        </p>
        <p className="text-[13px] leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {isSpa
            ? 'Estás usando datos móviles. Activa "Reproducir con datos móviles" en Configuración o conéctate a WiFi.'
            : 'You\'re on mobile data. Enable "Play on mobile data" in Settings or connect to WiFi.'}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-[240px]">
          <button
            onClick={() => navigate(-1)}
            className="w-full px-5 py-3 rounded-[14px] text-sm font-bold active:scale-95 transition-transform"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
          >
            {isSpa ? 'Volver' : 'Go back'}
          </button>
        </div>
      </div>
    );
  }

  // ── Sin contenido disponible ───────────────────────────────────────────────
  if (isVideoMissing) {
    return (
      <div className="relative bg-[#030309] h-full flex flex-col items-center justify-center px-8 text-center">
        <div className="text-5xl mb-4">🎬</div>
        <p className="text-white font-bold mb-2">Video no disponible</p>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
          El contenido aún no ha sido subido.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-full text-sm font-bold"
          style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa' }}
        >
          Volver
        </button>
      </div>
    );
  }

  // ── Paywall: usuario free intentando acceder a video premium ──────────────
  if (isLocked) {
    return (
      <div
        className="relative h-full flex flex-col items-center justify-center px-6 text-center overflow-hidden"
        style={{ background: '#030309' }}
      >
        {/* Blurred background image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${video.imagen})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(18px) brightness(0.25)',
            transform: 'scale(1.1)',
          }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #030309 30%, rgba(3,3,9,0.75) 70%, rgba(3,3,9,0.5) 100%)' }} />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 flex items-center gap-2 z-10 active:opacity-60 transition-opacity"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          <ArrowLeft size={20} />
        </button>

        <div className="relative z-10 flex flex-col items-center">
          {/* Lock orb */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
            className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(167,139,250,0.2) 100%)',
              border: '1.5px solid rgba(245,158,11,0.5)',
              boxShadow: '0 0 50px rgba(245,158,11,0.3), 0 0 100px rgba(167,139,250,0.15)',
            }}
          >
            <Crown size={38} style={{ color: '#f59e0b' }} />
          </motion.div>

          <p className="text-xs font-black tracking-widest mb-3" style={{ color: 'rgba(245,158,11,0.8)' }}>
            {t.player.contenido_premium}
          </p>

          <h2 className="text-white font-black text-xl mb-2 leading-tight px-4">{video.titulo}</h2>
          <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{catDisplay} · {video.duracion}</p>

          <p className="text-sm mb-8 mt-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {t.player.exclusivo_sub.split('\n').map((line: string, i: number) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </p>

          <button
            onClick={() => navigate('/suscripcion')}
            className="w-full max-w-xs py-4 rounded-[20px] font-black text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-transform mb-3"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #a78bfa 100%)',
              boxShadow: '0 0 30px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
              fontSize: '15px',
            }}
          >
            <Crown size={16} />
            {t.player.ver_planes}
          </button>

          <button
            onClick={() => navigate(-1)}
            className="text-sm py-3 active:opacity-60 transition-opacity"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            {t.player.volver}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-[#030309]">

      {/* ══════ SCROLLABLE CONTENT ══════ */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar"
      >

        {/* ══════ VIDEO AREA ══════ */}
        <div
          className="relative flex-shrink-0"
          style={{ height: '268px', cursor: 'pointer' }}
          onClick={tapPlayer}
        >
          {/* ── MODO AUDIO + LOOP (Meditación, Libros) ── */}
          {esAudioLoop && (<>
            {/* Audio invisible — controla el progreso */}
            <audio
              ref={audioRef}
              src={mediaSrc.audio ?? undefined}
              preload="metadata"
              onLoadedMetadata={handleMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onWaiting={() => setBuffering(true)}
              onCanPlay={() => {
                setBuffering(false);
                setVideoReady(true);
                // Auto-play when coming from PiP (onLoadedMetadata may fire before seek is settable)
                if (shouldAutoPlayRef.current) {
                  shouldAutoPlayRef.current = false;
                  audioRef.current?.play().catch(() => {});
                }
              }}
              onError={() => setVideoError(true)}
            />
            {/* Loop visual silencioso — se repite infinitamente */}
            <video
              ref={loopRef}
              src={mediaSrc.loop ?? undefined}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: videoReady && !videoError ? 1 : 0, transition: 'opacity 0.4s ease' }}
              playsInline muted loop autoPlay preload="auto"
              poster={TRANSPARENT_POSTER}
              onCanPlay={() => {
                // Si el audio ya está sonando cuando el loop cargó, arrancarlo
                const aud = audioRef.current;
                if (aud && !aud.paused) loopRef.current?.play().catch(() => {});
              }}
            />
          </>)}

          {/* ── MODO VIDEO COMPLETO ── */}
          {!esAudioLoop && (
            <video
              ref={videoRef}
              src={mediaSrc.video ?? undefined}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: videoReady && !videoError ? 1 : 0, transition: 'opacity 0.4s ease' }}
              playsInline
              preload="metadata"
              poster={TRANSPARENT_POSTER}
              onLoadedMetadata={handleMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onWaiting={() => setBuffering(true)}
              onCanPlay={() => {
                setBuffering(false);
                // Auto-play when coming from PiP
                if (shouldAutoPlayRef.current) {
                  shouldAutoPlayRef.current = false;
                  videoRef.current?.play().catch(() => {});
                }
              }}
              onError={() => setVideoError(true)}
            />
          )}
          {/* Hidden audio element for background playback on heavy videos
              Se reproduce MUTEADO y sincronizado con el video desde el inicio.
              Al ir a background solo se desmutea; así el OS no lo bloquea. */}
          {tieneBgAudio && mediaSrc.bgAudio && (
            <audio
              ref={bgAudioRef}
              src={mediaSrc.bgAudio}
              preload="auto"
              muted
              style={{ display: 'none' }}
              onTimeUpdate={() => {
                if (bgActiveRef.current && bgAudioRef.current) {
                  const ct = bgAudioRef.current.currentTime;
                  const delta = ct - lastTimeRef.current;
                  if (delta > 0 && delta < 1.5) actualWatchedRef.current += delta;
                  lastTimeRef.current = ct;
                  setProgressSeconds(ct);
                }
              }}
              onEnded={() => {
                if (bgActiveRef.current) {
                  bgActiveRef.current = false;
                  setPlaying(false);
                  setCompleted(true);
                }
              }}
            />
          )}
          {/* Thumbnail fallback (shown while loading or on error) */}
          <motion.img
            key={video.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: videoReady && !videoError ? 0 : (playing ? 0.5 : 0.82) }}
            transition={{ duration: 0.4 }}
            src={video.imagen}
            alt={video.titulo}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
          {/* Buffering/loading loader — Morix branded dots, fondo negro */}
          <AnimatePresence>
            {(!videoReady || buffering) && !completed && (
              <VideoLoader visible={true} />
            )}
          </AnimatePresence>
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${colors.from}14, transparent 65%)`, pointerEvents: 'none' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(3,3,9,0.55) 0%, rgba(3,3,9,0) 35%, rgba(3,3,9,0.75) 100%)', pointerEvents: 'none' }} />
          <div className="absolute top-0 left-0 right-0 h-[2.5px]"
            style={{ background: `linear-gradient(to right, transparent, ${colors.from}, ${colors.to}, transparent)` }} />

          {playing && (
            <motion.div className="absolute inset-0 pointer-events-none"
              animate={{ opacity: [0, 0.04, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ background: `linear-gradient(135deg, ${colors.from}, transparent)` }} />
          )}

          {/* ── "Calculando…" loading spinner (before result is ready) ── */}
          {completed && !completionResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(3,3,9,0.65)', backdropFilter: 'blur(6px)', zIndex: 10 }}
            >
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`, boxShadow: `0 0 40px ${colors.glow}` }}
                >
                  <span className="text-3xl">✓</span>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-white font-black text-sm"
                >
                  {t.player.calculando}
                </motion.p>
              </div>
            </motion.div>
          )}

          {/* TOP BAR – z-20, always above completion overlay (z-10) */}
          <AnimatePresence>
            {(showControls || completed) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-11 pb-3"
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.72), transparent)', zIndex: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleBack}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <ArrowLeft size={17} className="text-white" />
                </button>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: `${colors.from}22`, border: `1px solid ${colors.from}40`, color: colors.from }}
                  >
                    {catDisplay}
                  </span>
                  {/* ── Quality badge ── */}
                  {appSettings.calidad !== 'auto' && t.player.quality_badge[appSettings.calidad] && (
                    <span
                      className="text-[9px] font-black px-2 py-1 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)' }}
                    >
                      {t.player.quality_badge[appSettings.calidad]}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); setShowControls(true); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Maximize2 size={15} className="text-white" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Subtitle overlay ── */}
          <AnimatePresence>
            {appSettings.subtitulos && playing && !completed && (
              <motion.div
                key={subtitleIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="absolute bottom-10 left-4 right-4 flex justify-center pointer-events-none"
                style={{ zIndex: 16 }}
              >
                <span
                  className="text-[11px] font-semibold text-center px-3 py-1.5 rounded-[10px] leading-relaxed"
                  style={{
                    background: 'rgba(0,0,0,0.72)',
                    backdropFilter: 'blur(8px)',
                    color: 'rgba(255,255,255,0.92)',
                    maxWidth: '90%',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {subtitleLines[subtitleIdx]}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CENTER CONTROLS */}
          <AnimatePresence>
            {showControls && !completed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.82 }}
                transition={{ type: 'spring', damping: 18, stiffness: 280 }}
                className="absolute inset-0 flex items-center justify-center gap-9"
                style={{ zIndex: 15 }}
                onClick={(e) => e.stopPropagation()}
              >
                <motion.button onClick={skipBack} whileTap={{ scale: 0.82 }} className="flex flex-col items-center gap-1">
                  <SkipBack size={24} className="text-white" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.9))' }} />
                  <span className="text-[9px] text-white" style={{ opacity: 0.7 }}>-30s</span>
                </motion.button>
                <motion.button
                  onClick={togglePlay}
                  whileTap={{ scale: 0.88 }}
                  className="rounded-full flex items-center justify-center"
                  style={{
                    width: '68px', height: '68px',
                    background: 'rgba(255,255,255,0.13)',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid rgba(255,255,255,0.32)',
                    boxShadow: `0 0 50px ${colors.glow}, 0 0 100px ${colors.from}25`,
                  }}
                >
                  {playing
                    ? <Pause size={28} fill="white" className="text-white" />
                    : <Play size={28} fill="white" className="text-white ml-1" />
                  }
                </motion.button>
                <motion.button onClick={skipForward} whileTap={{ scale: 0.82 }} className="flex flex-col items-center gap-1">
                  <SkipForward size={24} className="text-white" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.9))' }} />
                  <span className="text-[9px] text-white" style={{ opacity: 0.7 }}>+30s</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BOTTOM PROGRESS + SEEK */}
          <AnimatePresence>
            {showControls && !completed && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-0 left-0 right-0 px-4 pb-3"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)', zIndex: 15 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full h-6 flex items-center cursor-pointer mb-1" onPointerDown={seek}>
                  <div className="w-full h-[4.5px] rounded-full relative" style={{ background: 'rgba(255,255,255,0.18)' }}>
                    <div
                      className="absolute left-0 top-0 h-full rounded-full"
                      style={{ width: `${progressPct}%`, background: `linear-gradient(to right, ${colors.from}, ${colors.to})`, boxShadow: `0 0 10px ${colors.glow}` }}
                    >
                      <div
                        className="absolute right-0 top-1/2 w-[15px] h-[15px] rounded-full bg-white shadow-lg"
                        style={{ transform: 'translateX(50%) translateY(-50%)', boxShadow: `0 0 12px ${colors.glow}` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-white">{formatTime(progressSeconds)}</span>
                  <div className="flex items-center gap-2">
                    {/* ── Volume popup ─────────────────────────────── */}
                    <div className="relative flex items-center">
                      <AnimatePresence>
                        {false && (
                          <motion.div
                            initial={{ opacity: 0, scaleX: 0, x: 8 }}
                            animate={{ opacity: 1, scaleX: 1, x: 0 }}
                            exit={{ opacity: 0, scaleX: 0, x: 8 }}
                            style={{
                              originX: 1,
                              position: 'absolute',
                              right: '100%',
                              marginRight: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '7px',
                              padding: '5px 10px',
                              borderRadius: '999px',
                              background: 'rgba(15,15,30,0.92)',
                              backdropFilter: 'blur(16px)',
                              border: `1px solid ${colors.from}40`,
                              boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${colors.glow}30`,
                              whiteSpace: 'nowrap',
                              zIndex: 20,
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            {/* Track */}
                            <div
                              style={{
                                width: '80px',
                                height: '4px',
                                borderRadius: '999px',
                                background: 'rgba(255,255,255,0.15)',
                                position: 'relative',
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                              onPointerDown={(e) => {
                                e.preventDefault();
                                const r = e.currentTarget.getBoundingClientRect();
                                const newVol = Math.max(0, Math.min(100, Math.round(((e.clientX - r.left) / r.width) * 100)));
                                setVolume(newVol);
                                // reset timer
                                if (volumeHideTimer.current) clearTimeout(volumeHideTimer.current);
                                volumeHideTimer.current = setTimeout(() => setShowVolume(false), 5000);
                              }}
                              onPointerMove={(e) => {
                                if (e.buttons !== 1) return;
                                e.preventDefault();
                                const r = e.currentTarget.getBoundingClientRect();
                                const newVol = Math.max(0, Math.min(100, Math.round(((e.clientX - r.left) / r.width) * 100)));
                                setVolume(newVol);
                                if (volumeHideTimer.current) clearTimeout(volumeHideTimer.current);
                                volumeHideTimer.current = setTimeout(() => setShowVolume(false), 5000);
                              }}
                            >
                              {/* Fill */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  height: '100%',
                                  width: `${volume}%`,
                                  borderRadius: '999px',
                                  background: `linear-gradient(to right, ${colors.from}, ${colors.to})`,
                                  boxShadow: `0 0 6px ${colors.glow}`,
                                }}
                              >
                                {/* Thumb */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '50%',
                                    width: '11px',
                                    height: '11px',
                                    borderRadius: '50%',
                                    background: 'white',
                                    transform: 'translateX(50%) translateY(-50%)',
                                    boxShadow: `0 0 8px ${colors.glow}`,
                                  }}
                                />
                              </div>
                            </div>
                            {/* Percentage label */}
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.75)', minWidth: '26px', textAlign: 'right' }}>
                              {volume}%
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        onClick={() => {
                          /* noop */
                        }}
                        className="active:scale-90 transition-transform"
                      >
                        {null}
                      </button>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-white">{formatTime(totalContentSecondsRef)}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ══════ INFO BELOW VIDEO ══════ */}
        <div className="relative bg-[#030309]">
          <AuroraBackground intensity="low" />
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="relative z-10 px-5 pt-5"
          >
            {/* Meta */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: `${colors.from}18`, border: `1px solid ${colors.from}35`, color: colors.from }}
              >
                {catDisplay}
              </span>
              {video.rating && (
                <div className="flex items-center gap-1">
                  <Star size={11} fill="#fbbf24" style={{ color: '#fbbf24' }} />
                  <span className="text-[11px] font-bold" style={{ color: '#fbbf24' }}>{video.rating}</span>
                </div>
              )}
              {video.match && (
                <span className="text-[10px] font-bold" style={{ color: '#4ade80' }}>{video.match}{t.player.para_ti}</span>
              )}
            </div>

            {/* Title + Like */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-white font-black text-[17px] leading-snug flex-1">{video.titulo}</h1>
              {!isVideoMissing && <VideoLikes videoId={video.id} />}
            </div>

            {/* Duration + small inline action buttons */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <Clock size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{video.duracion}</span>
                </div>
                {video.autor && (
                  <><span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{video.autor}</span></>
                )}
              </div>

              {/* Small pill action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Guardado */}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleSave}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-all"
                  style={{
                    background: saved ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.06)',
                    border: saved ? '1px solid rgba(244,63,94,0.35)' : '1px solid rgba(255,255,255,0.09)',
                  }}
                >
                  <Heart
                    size={12}
                    fill={saved ? '#f43f5e' : 'none'}
                    strokeWidth={saved ? 0 : 1.8}
                    style={{ color: saved ? '#f43f5e' : 'rgba(255,255,255,0.5)' }}
                  />
                  <span className="text-[10px] font-semibold" style={{ color: saved ? '#f43f5e' : 'rgba(255,255,255,0.5)' }}>
                    {saved ? t.player.guardado : t.player.guardar}
                  </span>
                </motion.button>

                {/* Playlist */}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setShowPlaylistModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full relative transition-all"
                  style={{
                    background: getVideoPlaylists(video.id).length > 0 ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.06)',
                    border: getVideoPlaylists(video.id).length > 0 ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(255,255,255,0.09)',
                  }}
                >
                  <ListMusic size={12} style={{ color: getVideoPlaylists(video.id).length > 0 ? '#a78bfa' : 'rgba(255,255,255,0.5)' }} />
                  <span className="text-[10px] font-semibold" style={{ color: getVideoPlaylists(video.id).length > 0 ? '#a78bfa' : 'rgba(255,255,255,0.5)' }}>
                    Playlist
                  </span>
                  {getVideoPlaylists(video.id).length > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                      style={{ background: '#a78bfa' }}
                    >
                      {getVideoPlaylists(video.id).length}
                    </span>
                  )}
                </motion.button>

              </div>
            </div>

            {/* Description with expand/collapse — tags aparecen al final cuando está expandida */}
            {video.descripcion && (
              <div className="mb-4">
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: descExpanded ? 'none' : 3,
                    overflow: descExpanded ? 'visible' : 'hidden',
                  }}
                >
                  {video.descripcion}
                </p>

                {/* Tags — solo visibles cuando la descripción está expandida */}
                <AnimatePresence>
                  {descExpanded && video.tags && video.tags.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-wrap gap-1.5 mt-3"
                    >
                      {video.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => navigate(`/categoria/${encodeURIComponent(tag)}`)}
                          className="text-[10px] font-medium px-2.5 py-1 rounded-full active:scale-95 transition-transform"
                          style={{
                            background: `${colors.from}12`,
                            border: `1px solid ${colors.from}30`,
                            color: colors.from,
                          }}
                        >
                          # {tag}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {video.descripcion.length > 120 && (
                  <button
                    onClick={() => setDescExpanded((v) => !v)}
                    className="text-[11px] font-bold mt-2 active:opacity-70 transition-opacity"
                    style={{ color: colors.from }}
                  >
                    {descExpanded ? t.player.ver_menos : t.player.ver_mas}
                  </button>
                )}
              </div>
            )}

            {/* ── COMENTARIOS INLINE estilo YouTube ── */}
            {!isVideoMissing && (
              <InlineCommentsSection
                videoId={video.id}
                accentColor={colors.from}
                onCountChange={setCommentCount}
              />
            )}

            {/* ── XP STATUS BANNER ─────────────────────────────────── */}
            <div className="mb-5">
              <AnimatePresence mode="wait">
                {watchStatus === 'not_started' && (
                  <motion.div
                    key="not_started"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl mb-3"
                    style={{ background: `${colors.from}0D`, border: `1px solid ${colors.from}25` }}
                  >
                    <span className="text-base">⚡</span>
                    <div>
                      <p className="text-[11px] font-bold" style={{ color: colors.from }}>{t.player.xp_disp}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {t.player.xp_disp_sub}
                      </p>
                    </div>
                  </motion.div>
                )}

                {watchStatus === 'already_watched_fresh' && (
                  <motion.div
                    key="already_watched_fresh"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl mb-3"
                    style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}
                  >
                    <span className="text-base">✓</span>
                    <div>
                      <p className="text-[11px] font-bold" style={{ color: '#a78bfa' }}>{t.player.ya_visto}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {t.player.ya_visto_sub}
                      </p>
                    </div>
                  </motion.div>
                )}

                {watchStatus === 'in_progress' && (
                  <motion.div
                    key="in_progress"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl mb-3"
                    style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
                  >
                    <span className="text-base">🎬</span>
                    <div>
                      <p className="text-[11px] font-bold" style={{ color: '#60a5fa' }}>{t.player.en_progreso}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {t.player.en_progreso_sub}
                      </p>
                    </div>
                  </motion.div>
                )}

                {watchStatus === 'already_watched_inprogress' && (
                  <motion.div
                    key="already_watched_inprogress"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl mb-3"
                    style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}
                  >
                    <span className="text-base">✓</span>
                    <div>
                      <p className="text-[11px] font-bold" style={{ color: '#a78bfa' }}>{t.player.ya_completado}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {t.player.ya_completado_sub}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>


            </div>



            {/* Related */}
            {relacionados.length > 0 && (
              <div className="pb-8">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-white font-bold text-sm">{t.player.relacionado}</h3>
                  <span
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#a78bfa' }}
                  >
                    {relacionados.length} videos
                  </span>
                </div>
                <HScrollRow gap={12} style={{ marginLeft: '-20px', marginRight: '-20px', paddingLeft: '20px', paddingRight: '20px' }}>
                  {relacionados.map((item, i) => (
                    <ContentCard key={item.id} contenido={item} delay={i * 0.04} />
                  ))}
                </HScrollRow>
              </div>
            )}
          </motion.div>
        </div>

        <ContentPreviewSheet item={previewItem} onClose={() => setPreviewItem(null)} />
      </div>
      {/* ══════ END SCROLLABLE CONTENT ══════ */}

      {/* ══════ RESULT MODALS — outside scroll, covers full phone frame ══════ */}

      {/* Playlist modal */}
      <AnimatePresence>
        {showPlaylistModal && (
          <PlaylistModal
            videoId={video.id}
            onClose={() => setShowPlaylistModal(false)}
          />
        )}
      </AnimatePresence>

      {/* CommentsSheet — conservado para posibles usos futuros (actualmente inline) */}

      {/* Share removed */}

      {/* ══════ FULLSCREEN LANDSCAPE OVERLAY ══════ */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute inset-0 bg-black overflow-hidden"
            style={{ zIndex: 130 }}
          >
            {/* Inner landscape canvas: rotated 90° to fill the frame horizontally */}
            <div
              style={{
                position: 'absolute',
                width: `${frameSize.h}px`,
                height: `${frameSize.w}px`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(90deg)',
                transformOrigin: 'center center',
                overflow: 'hidden',
              }}
              onClick={tapPlayer}
            >
              {/* ── Reuse the SAME video element — no duplicate download/audio ── */}
              {esAudioLoop && loopRef.current && (
                <FullscreenVideoPortal videoEl={loopRef.current} />
              )}
              {!esAudioLoop && videoRef.current && (
                <FullscreenVideoPortal videoEl={videoRef.current} />
              )}

              {/* Thumbnail fallback en fullscreen (si aún no cargó) */}
              <motion.img
                src={video.imagen}
                alt={video.titulo}
                className="absolute inset-0 w-full h-full object-cover"
                animate={{ opacity: (esAudioLoop ? !!mediaSrc.loop : !!mediaSrc.video) ? 0 : (playing ? 0.48 : 0.82) }}
                transition={{ duration: 0.4 }}
                draggable={false}
              />
              {/* Color tint */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, ${colors.from}14, transparent 60%)` }} />
              {/* Gradient top + bottom */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 28%, transparent 65%, rgba(0,0,0,0.9) 100%)' }} />
              {/* Chromatic top line */}
              <div className="absolute top-0 left-0 right-0 h-[2.5px] pointer-events-none" style={{ background: `linear-gradient(to right, transparent, ${colors.from}, ${colors.to}, transparent)` }} />
              {playing && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ opacity: [0, 0.05, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ background: `radial-gradient(ellipse at center, ${colors.from}60 0%, transparent 65%)` }}
                />
              )}

              {/* ── TOP BAR ── */}
              <AnimatePresence>
                {showControls && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-0 left-0 right-0 flex items-center gap-3 px-5 pt-5 pb-5"
                    style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)', zIndex: 30 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={handleBack}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <ArrowLeft size={17} className="text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black text-[15px] truncate">{video.titulo}</p>
                      <p className="text-[10px] truncate" style={{ color: colors.from }}>{catDisplay} · {video.duracion}</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                      style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.18)' }}
                    >
                      <Minimize size={15} className="text-white" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── CENTER PLAY CONTROLS ── */}
              <AnimatePresence>
                {showControls && !completed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.82 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.82 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 280 }}
                    className="absolute inset-0 flex items-center justify-center gap-14"
                    style={{ zIndex: 10, pointerEvents: 'none' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <motion.button onClick={skipBack} whileTap={{ scale: 0.8 }} className="flex flex-col items-center gap-1.5" style={{ pointerEvents: 'auto' }}>
                      <SkipBack size={32} className="text-white" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))' }} />
                      <span className="text-[10px] font-bold text-white" style={{ opacity: 0.7 }}>-30s</span>
                    </motion.button>
                    <motion.button
                      onClick={togglePlay}
                      whileTap={{ scale: 0.86 }}
                      className="rounded-full flex items-center justify-center"
                      style={{
                        pointerEvents: 'auto',
                        width: '88px', height: '88px',
                        background: 'rgba(255,255,255,0.14)',
                        backdropFilter: 'blur(24px)',
                        border: '2.5px solid rgba(255,255,255,0.35)',
                        boxShadow: `0 0 60px ${colors.glow}, 0 0 120px ${colors.from}30`,
                      }}
                    >
                      {playing
                        ? <Pause size={36} fill="white" className="text-white" />
                        : <Play size={36} fill="white" className="text-white ml-1" />
                      }
                    </motion.button>
                    <motion.button onClick={skipForward} whileTap={{ scale: 0.8 }} className="flex flex-col items-center gap-1.5" style={{ pointerEvents: 'auto' }}>
                      <SkipForward size={32} className="text-white" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))' }} />
                      <span className="text-[10px] font-bold text-white" style={{ opacity: 0.7 }}>+30s</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── BOTTOM BAR ── */}
              <AnimatePresence>
                {showControls && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                    className="absolute bottom-0 left-0 right-0 px-5 pb-5"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)', zIndex: 30 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-white">{formatTime(progressSeconds)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold" style={{ color: colors.from }}>{Math.round(progressPct)}%</span>
                      </div>
                      <span className="text-[11px] font-semibold text-white">{formatTime(totalContentSecondsRef)}</span>
                    </div>
                    <div
                      className="w-full h-7 flex items-center cursor-pointer"
                      onPointerDown={seek}
                    >
                      <div className="w-full h-[5px] rounded-full relative" style={{ background: 'rgba(255,255,255,0.18)' }}>
                        <div
                          className="absolute left-0 top-0 h-full rounded-full"
                          style={{ width: `${progressPct}%`, background: `linear-gradient(to right, ${colors.from}, ${colors.to})`, boxShadow: `0 0 12px ${colors.glow}` }}
                        >
                          <div
                            className="absolute right-0 top-1/2 w-[18px] h-[18px] rounded-full bg-white"
                            style={{ transform: 'translateX(50%) translateY(-50%)', boxShadow: `0 0 14px ${colors.glow}` }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Completion overlay */}
              {completed && !completionResult && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: 'rgba(3,3,9,0.65)', backdropFilter: 'blur(8px)', zIndex: 15 }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1 }}
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`, boxShadow: `0 0 50px ${colors.glow}` }}
                    >
                      <span className="text-4xl">✓</span>
                    </motion.div>
                    <p className="text-white font-black text-base">{t.player.calculando}</p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VideoPlayer() {
  const { id } = useParams();
  return (
    <PreviewProvider>
      <PlayerInner key={id} />
    </PreviewProvider>
  );
}
