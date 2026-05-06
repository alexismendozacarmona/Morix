/**
 * useBackgroundAudio — mantiene el contexto de audio activo en Capacitor Android.
 *
 * Problema: los WebViews de Android throttlean o silencian el audio cuando la app
 * va al fondo si no hay un AudioContext activo con un nodo "keeper".
 *
 * Solución:
 *  1. Crea un AudioContext al primer gesto del usuario (requisito del navegador).
 *  2. Conecta un OscillatorNode con ganancia 0 (silencioso) que corre infinitamente.
 *     Esto "engaña" al sistema para que clasifique la app como reproductora de audio.
 *  3. Reanuda el AudioContext cuando la app vuelve al frente (visibilitychange).
 *
 * Uso: llama a `unlockAudio()` en cualquier interacción del usuario (tap, play).
 * Después de eso el sistema nunca cerrará el pipeline de audio.
 */

let audioCtx: AudioContext | null = null;
let keeperNode: OscillatorNode | null = null;
let gainNode: GainNode | null = null;

function createKeeperNodes(ctx: AudioContext) {
  // OscillatorNode con ganancia 0 → completamente silencioso
  keeperNode = ctx.createOscillator();
  gainNode   = ctx.createGain();
  gainNode.gain.setValueAtTime(0, ctx.currentTime); // silencioso
  keeperNode.connect(gainNode);
  gainNode.connect(ctx.destination);
  keeperNode.start();
}

/**
 * Llama esto en el primer gesto del usuario (p.ej. botón Play).
 * Si ya está inicializado, solo asegura que el contexto esté corriendo.
 */
export function unlockAudioContext() {
  if (typeof window === 'undefined') return;

  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      createKeeperNodes(audioCtx);
    }

    // El AudioContext puede suspenderse si el navegador lo throttlea
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch {
    // AudioContext no disponible — no crítico, solo es un keep-alive
  }
}

/**
 * Hook que:
 * - Escucha visibilitychange y reanuda el AudioContext al volver al frente
 * - Proporciona `unlockAudio` para llamar en gestos del usuario
 */
import { useEffect } from 'react';

export function useBackgroundAudio() {
  useEffect(() => {
    const onVisibility = () => {
      // Al volver al frente: reanudar AudioContext si estaba suspendido
      if (!document.hidden && audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return { unlockAudio: unlockAudioContext };
}
