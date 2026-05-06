import { motion, AnimatePresence } from 'motion/react';
import { useT } from '../i18n/useT';

export type NoRewardType = 'skipped' | 'already_watched';

interface NoRewardModalProps {
  type: NoRewardType | null;
  videoTitle: string;
  onClose: () => void;
  onRewatch: () => void;
}

const ICON_CONFIGS = {
  skipped:          { icon: '⏩', iconBg: 'linear-gradient(135deg, #f59e0b, #ef4444)', iconGlow: 'rgba(245,158,11,0.5)', accentColor: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)', bgColor: 'rgba(245,158,11,0.06)' },
  already_watched:  { icon: '✓',  iconBg: 'linear-gradient(135deg, #6366f1, #8b5cf6)', iconGlow: 'rgba(99,102,241,0.5)',  accentColor: '#8b5cf6', borderColor: 'rgba(139,92,246,0.25)', bgColor: 'rgba(139,92,246,0.06)' },
};

export function NoRewardModal({ type, videoTitle, onClose, onRewatch }: NoRewardModalProps) {
  const t = useT();
  const tr = t.no_reward;
  const cfg = type ? ICON_CONFIGS[type] : null;
  const txt = type ? tr[type] : null;

  return (
    <AnimatePresence>
      {type && cfg && txt && (
        <motion.div
          key="no-reward-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex flex-col items-center justify-center px-6"
          style={{ background: 'rgba(3,3,9,0.92)', backdropFilter: 'blur(20px)', zIndex: 50 }}
        >
          <div className="absolute top-1/4 left-1/2 w-48 h-48 rounded-full pointer-events-none"
            style={{ transform: 'translateX(-50%)', background: cfg.iconGlow, filter: 'blur(60px)', opacity: 0.25 }} />

          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 16, stiffness: 260, delay: 0.05 }}
            className="relative z-10 w-full flex flex-col items-center gap-5"
          >
            <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
              style={{ background: cfg.iconBg, boxShadow: `0 0 50px ${cfg.iconGlow}` }}>
              {cfg.icon}
            </motion.div>

            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                style={{ color: cfg.accentColor, background: cfg.bgColor, border: `1px solid ${cfg.borderColor}` }}>
                {txt.subtitle}
              </span>
              <h2 className="text-white font-black text-[22px] leading-tight mt-1">{txt.title}</h2>
              <p className="text-[13px] leading-relaxed mt-1" style={{ color: 'rgba(255,255,255,0.45)' }} title={videoTitle}>
                {txt.description}
              </p>
            </div>

            <div className="w-full rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)' }}>⚡</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{tr.xp_sesion}</span>
                  <span className="text-sm font-black" style={{ color: 'rgba(255,255,255,0.25)' }}>+0</span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div className="h-full w-0 rounded-full" style={{ background: cfg.accentColor }} />
                </div>
              </div>
            </div>

            <p className="text-[12px] text-center px-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {txt.tip}
            </p>

            <div className="w-full flex flex-col gap-2.5 mt-1">
              <motion.button whileTap={{ scale: 0.97 }} onClick={onRewatch}
                className="w-full py-3.5 rounded-2xl font-black text-sm text-white"
                style={{ background: cfg.iconBg, boxShadow: `0 0 24px ${cfg.iconGlow}` }}>
                {txt.rewatchLabel}
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
                className="w-full py-3 rounded-2xl font-semibold text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}>
                {txt.closeLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}