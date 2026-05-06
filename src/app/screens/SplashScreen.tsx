import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MorixLogo } from '../components/MorixLogo';

/* ─── Phases ────────────────────────────────────────────────────────────── */
const PHASES = [
  'Iniciando sistema neural...',
  'Cargando universo mental...',
  'Sincronizando progreso...',
  'Calibrando experiencia...',
  '¡Todo listo!',
];

/* ─── Main component ─────────────────────────────────────────────────────── */
interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase,    setPhase]    = useState(0);
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [done,     setDone]     = useState(false);
  const [exiting,  setExiting]  = useState(false);

  const runSequence = useCallback(() => {
    const t = (ms: number, fn: () => void) => setTimeout(fn, ms);

    // Show content after one frame so layout is ready
    t(80,   () => setShowContent(true));

    // Phase 0 → 1
    t(600,  () => { setProgress(22); });
    // Phase 1 → 2
    t(1100, () => { setPhase(1); setProgress(45); });
    // Phase 2 → 3
    t(1700, () => { setPhase(2); setProgress(72); });
    // Phase 3 → 4
    t(2200, () => { setPhase(3); setProgress(90); });
    // Done
    t(2700, () => { setPhase(4); setProgress(100); setDone(true); });
    // Exit
    t(3200, () => setExiting(true));
    t(3700, () => onComplete());
  }, [onComplete]);

  useEffect(() => {
    const timer = setTimeout(runSequence, 60);
    return () => clearTimeout(timer);
  }, [runSequence]);

  const isDone = phase === 4;

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#030309', zIndex: 999, willChange: 'transform, opacity' }}
      animate={exiting ? { opacity: 0, scale: 1.04 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
    >
      {/* ── Static radial glow — no animation, pure CSS ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 40%, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.08) 45%, transparent 75%)',
        }}
      />

      {/* ── Soft corner accents — static ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 260, height: 260,
          left: -70, top: -70,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.13) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 200, height: 200,
          right: -50, bottom: 80,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.11) 0%, transparent 70%)',
          filter: 'blur(36px)',
        }}
      />

      {/* ── Content ── */}
      {showContent && (
        <motion.div
          className="relative z-10 flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{ marginTop: '-40px', willChange: 'opacity' }}
        >
            {/* Logo principal — reemplaza el video de Menty */}
            <motion.div
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 16, stiffness: 160, delay: 0.05 }}
              className="mb-4 relative flex items-center justify-center"
              style={{ width: 200, height: 120 }}
            >
              {/* Glow halo detrás del logo */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle, rgba(139,92,246,0.42) 0%, rgba(99,102,241,0.18) 55%, transparent 78%)',
                  filter: 'blur(28px)',
                  borderRadius: '50%',
                }}
              />
              <div style={{ filter: 'drop-shadow(0 0 22px rgba(139,92,246,0.75)) drop-shadow(0 0 44px rgba(99,102,241,0.4))' }}>
                <MorixLogo height={52} glowIntensity={1.4} />
              </div>
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.22 }}
              className="text-[10px] font-bold tracking-[0.2em] uppercase mb-10"
              style={{ color: 'rgba(255,255,255,0.38)' }}
            >
              Aprende · Evoluciona · Domina
            </motion.p>

            {/* ── Progress section ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.28 }}
              className="flex flex-col items-center gap-3 w-56"
            >
              {/* Linear progress bar */}
              <div
                className="w-full rounded-full overflow-hidden"
                style={{ height: 3, background: 'rgba(255,255,255,0.07)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(to right, #8b5cf6, #6366f1, #a78bfa)',
                    boxShadow: '0 0 8px rgba(139,92,246,0.7)',
                  }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                />
              </div>

              {/* Percentage */}
              <span
                className="font-black text-white tabular-nums"
                style={{ fontSize: '13px', letterSpacing: '-0.01em' }}
              >
                {Math.round(progress)}%
              </span>

              {/* Phase text */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  {/* Status dot */}
                  {!isDone ? (
                    <PulseDot />
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        boxShadow: '0 0 10px rgba(34,197,94,0.7)',
                      }}
                    >
                      <span className="text-white" style={{ fontSize: '8px' }}>✓</span>
                    </motion.div>
                  )}
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: isDone ? '#4ade80' : 'rgba(255,255,255,0.48)' }}
                  >
                    {PHASES[phase]}
                  </span>
                </motion.div>
              </AnimatePresence>

              {/* Step dots */}
              <div className="flex gap-1.5 mt-1">
                {PHASES.map((_, i) => (
                  <motion.div
                    key={i}
                    className="rounded-full"
                    style={{
                      height: 5,
                      background: i <= phase ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                    }}
                    animate={{
                      width: i === phase ? 18 : 5,
                      boxShadow: i === phase ? '0 0 8px rgba(139,92,246,0.8)' : 'none',
                    }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  />
                ))}
              </div>
            </motion.div>
        </motion.div>
      )}

      {/* ── Done flash ── */}
      <AnimatePresence>
        {done && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{ duration: 0.55, times: [0, 0.3, 1] }}
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(139,92,246,0.55) 0%, transparent 65%)',
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Tiny pulsing dot — CSS keyframe via inline style ── */
function PulseDot() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#8b5cf6',
        boxShadow: '0 0 6px #8b5cf6',
        flexShrink: 0,
        animation: 'Morix-pulse 1s ease-in-out infinite',
      }}
    />
  );
}