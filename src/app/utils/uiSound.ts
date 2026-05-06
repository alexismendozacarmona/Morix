/**
 * Minimal Web Audio API utility for UI click sounds.
 * Used when appSettings.sonidosUI === true.
 */

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!_ctx) _ctx = new AudioContext();
    return _ctx;
  } catch {
    return null;
  }
}

/** Plays a short, subtle toggle click sound. */
export function playToggle(on: boolean) {
  const ctx = getCtx();
  if (!ctx) return;

  // Resume if browser suspended it
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(on ? 880 : 660, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(on ? 1100 : 440, ctx.currentTime + 0.06);

  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
}

/** Plays a short save/confirm chime. */
export function playSave() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  [0, 0.06, 0.13].forEach((t, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    const freqs = [880, 1100, 1320];
    osc.frequency.setValueAtTime(freqs[i], ctx.currentTime + t);
    gain.gain.setValueAtTime(0.07, ctx.currentTime + t);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.1);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + 0.1);
  });
}
