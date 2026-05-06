/**
 * useMediaSession — Media Session API completa para Morix.
 *
 * ── Por qué un phantom <audio> ────────────────────────────────────────────────
 * En Capacitor Android WebView, los elementos <video> no garantizan que el OS
 * muestre la notificación de Media Session (los controles de reproducción en la
 * barra de notificaciones). El OS requiere que la app haya adquirido "audio focus"
 * a través de un elemento <audio> real, no solo un <video> o AudioContext.
 *
 * El phantom audio:
 *  - Genera un WAV silencioso de 1 segundo programáticamente (sin red, sin archivos).
 *  - Lo reproduce en loop con volume=1 (el PCM es ceros → genuinamente inaudible).
 *  - El browser ve un <audio> reproduciéndose → adquiere audio focus → Android muestra
 *    la notificación con los controles de Play/Pause/Skip.
 *  - Se pausa cuando el usuario pausa el video → la notificación desaparece.
 *
 * ── Otros fixes ───────────────────────────────────────────────────────────────
 *  1. previoustrack + nexttrack son OBLIGATORIOS en Android para que aparezcan
 *     los botones de control en la notificación.
 *  2. WakeLock API — evita que el CPU se duerma y corte la sesión.
 *  3. Artwork con múltiples tamaños — mejora compatibilidad.
 *  4. playbackState se actualiza sincrónicamente en togglePlay (en VideoPlayer).
 *  5. Re-aplica metadata al cambiar a playing y al volver al frente.
 */

import { useEffect, useRef, useCallback } from 'react';

export interface UseMediaSessionOptions {
  title:          string;
  artist:         string;
  artwork:        string;
  playing:        boolean;
  duration:       number;
  currentTime:    number;
  onPlay:         () => void;
  onPause:        () => void;
  onSeekForward:  () => void;
  onSeekBackward: () => void;
  onSeekTo?:      (seconds: number) => void;
  onStop?:        () => void;
  onNext?:        () => void;
  onPrev?:        () => void;
  enabled?:       boolean;
}

// ── WakeLock singleton ────────────────────────────────────────────────────────
let wakeLock: WakeLockSentinel | null = null;

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  if (wakeLock && !wakeLock.released) return;
  try {
    wakeLock = await (navigator as any).wakeLock.request('screen');
    if (wakeLock) {
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { /* batería baja — no crítico */ }
}

async function releaseWakeLock() {
  const currentLock = wakeLock;
  if (currentLock && !currentLock.released) {
    try { await currentLock.release(); } catch { /* ignore */ }
    wakeLock = null;
  }
}

// ── Phantom audio (WAV silencioso generado en memoria) ────────────────────────
// Genera un WAV PCM de 1 segundo, 22050 Hz, mono, 16-bit, todo ceros (silencio).
// Se crea una sola vez y se reutiliza durante la sesión.
let _silentSrc: string | null = null;

function getSilentAudioSrc(): string {
  if (_silentSrc) return _silentSrc;
  try {
    const sampleRate = 22050;
    const numSamples = sampleRate; // 1 segundo
    const dataBytes  = numSamples * 2; // 16-bit = 2 bytes/sample
    const buf        = new ArrayBuffer(44 + dataBytes);
    const v          = new DataView(buf);
    const str = (s: string, off: number) =>
      [...s].forEach((c, i) => v.setUint8(off + i, c.charCodeAt(0)));

    // RIFF header
    str('RIFF', 0);
    v.setUint32(4, 36 + dataBytes, true);
    str('WAVE', 8);
    // fmt chunk
    str('fmt ', 12);
    v.setUint32(16, 16, true);          // chunk size
    v.setUint16(20, 1, true);           // PCM
    v.setUint16(22, 1, true);           // mono
    v.setUint32(24, sampleRate, true);  // sample rate
    v.setUint32(28, sampleRate * 2, true); // byte rate
    v.setUint16(32, 2, true);           // block align
    v.setUint16(34, 16, true);          // bits per sample
    // data chunk (all zeros = silence)
    str('data', 36);
    v.setUint32(40, dataBytes, true);
    // PCM data is implicitly zero (ArrayBuffer initializes to zero)

    const blob = new Blob([buf], { type: 'audio/wav' });
    _silentSrc = URL.createObjectURL(blob);
  } catch {
    _silentSrc = ''; // fallback: no phantom
  }
  return _silentSrc;
}

// ── Phantom audio singleton — accesible desde VideoPlayer directamente ────────
// Permite llamar playPhantomAudio() SINCRÓNICAMENTE desde el gesto del usuario,
// garantizando que Android no bloquee el play() por autoplay policy.
let _phantomAudio: HTMLAudioElement | null = null;

function getPhantomAudio(): HTMLAudioElement | null {
  if (_phantomAudio) return _phantomAudio;
  const src = getSilentAudioSrc();
  if (!src) return null;
  const audio = new Audio(src);
  audio.loop   = true;
  audio.volume = 1; // PCM es ceros → genuinamente inaudible
  _phantomAudio = audio;
  return audio;
}

/** Llama esto DIRECTAMENTE en el handler del botón Play (gesto del usuario). */
export function playPhantomAudio(): void {
  try { getPhantomAudio()?.play().catch(() => {}); } catch { /* ignore */ }
}

/** Llama esto cuando el usuario pausa. */
export function pausePhantomAudio(): void {
  try { _phantomAudio?.pause(); } catch { /* ignore */ }
}

// ── Artwork resolver ──────────────────────────────────────────────────────────
// Android MediaSession requiere URLs HTTPS absolutas para la artwork de la notificación.
const FALLBACK_ARTWORK = 'https://pub-cf98189c45a3467ab9548c4bfc743c51.r2.dev/Morix-cover.jpg';

function resolveArtwork(src: string): string {
  if (!src) return FALLBACK_ARTWORK;
  if (src.startsWith('https://') || src.startsWith('http://')) return src;
  // URLs relativas / capacitor:// / file:// → no cargables desde la notificación
  return FALLBACK_ARTWORK;
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useMediaSession({
  title,
  artist,
  artwork,
  playing,
  duration,
  currentTime,
  onPlay,
  onPause,
  onSeekForward,
  onSeekBackward,
  onSeekTo,
  onStop,
  onNext,
  onPrev,
  enabled = true,
}: UseMediaSessionOptions) {
  const supported = typeof navigator !== 'undefined' && 'mediaSession' in navigator;

  // Refs estables para callbacks — evita re-registrar en cada render
  const cb = useRef({
    onPlay, onPause, onSeekForward, onSeekBackward,
    onSeekTo, onStop, onNext, onPrev,
  });
  useEffect(() => {
    cb.current = { onPlay, onPause, onSeekForward, onSeekBackward, onSeekTo, onStop, onNext, onPrev };
  });

  // ── Phantom audio: sincronización desde el estado React ──────────────────
  // El play/pause principal se llama SINCRÓNICAMENTE desde VideoPlayer (gesto del usuario).
  // Este efecto es un fallback por si el estado cambia por otra vía (p.ej. Media Session action).
  useEffect(() => {
    if (!enabled) return;
    if (playing) {
      playPhantomAudio();
    } else {
      pausePhantomAudio();
    }
  }, [playing, enabled]);

  // ── Función para (re)escribir metadata ──────────────────────────────────────
  const artworkUrl = resolveArtwork(artwork);
  const applyMetadata = useCallback(() => {
    if (!supported || !enabled || !title) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: 'Morix',
      artwork: [
        { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '96x96',   type: 'image/jpeg' },
      ],
    });
  }, [supported, enabled, title, artist, artworkUrl]);

  // ── Registrar action handlers ─────────────────────────────────────────────
  useEffect(() => {
    if (!supported || !enabled) return;

    const set = (action: MediaSessionAction, fn: (() => void) | null) => {
      try { navigator.mediaSession.setActionHandler(action, fn); } catch { /* not supported */ }
    };

    set('play',  () => cb.current.onPlay());
    set('pause', () => cb.current.onPause());
    set('stop',  () => cb.current.onStop?.() ?? cb.current.onPause());

    set('seekforward',  () => cb.current.onSeekForward());
    set('seekbackward', () => cb.current.onSeekBackward());

    // ⚠️ CRÍTICO Android: previoustrack + nexttrack son OBLIGATORIOS.
    // Sin estos dos handlers, Android NO muestra los botones en la notificación.
    set('previoustrack', () => {
      if (cb.current.onPrev) cb.current.onPrev();
      else cb.current.onSeekBackward();
    });
    set('nexttrack', () => {
      if (cb.current.onNext) cb.current.onNext();
      else cb.current.onSeekForward();
    });

    // seekto: actualiza la barra de progreso nativa
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number') {
          cb.current.onSeekTo?.(details.seekTime);
        }
      });
    } catch { /* not supported */ }

    return () => {
      const actions: MediaSessionAction[] = [
        'play', 'pause', 'stop', 'seekforward', 'seekbackward',
        'previoustrack', 'nexttrack',
      ];
      actions.forEach((a) => set(a, null));
      try { navigator.mediaSession.setActionHandler('seekto', null); } catch { /* ignore */ }
    };
  }, [supported, enabled]);

  // ── Metadata: aplicar al montar y si cambia el contenido ─────────────────
  useEffect(() => {
    applyMetadata();
  }, [applyMetadata]);

  // ── Re-aplicar metadata cuando la app vuelve al frente ──────────────────
  useEffect(() => {
    if (!supported || !enabled) return;
    const onVisible = () => {
      if (!document.hidden) applyMetadata();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [supported, enabled, applyMetadata]);

  // ── playbackState + metadata re-apply + WakeLock ──────────────────────────
  useEffect(() => {
    if (!supported || !enabled) return;
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';

    if (playing) {
      // Re-aplica metadata JUSTO al reproducir.
      // Android a veces limpia la metadata al hacer background/foreground.
      applyMetadata();
      acquireWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [supported, enabled, playing, applyMetadata]);

  // ── Posición / progreso (actualiza barra nativa) ──────────────────────────
  const flooredTime = Math.floor(currentTime);
  useEffect(() => {
    if (!supported || !enabled || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration:     Math.max(duration, 1),
        playbackRate: 1,
        position:     Math.min(Math.max(flooredTime, 0), duration),
      });
    } catch { /* setPositionState no disponible en todos los navegadores */ }
  }, [supported, enabled, flooredTime, duration]);

  // ── Limpieza al desmontar ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!supported) return;
      try {
        navigator.mediaSession.playbackState = 'none';
        navigator.mediaSession.metadata = null;
      } catch { /* ignore */ }
      releaseWakeLock();
    };
  }, [supported]);
}