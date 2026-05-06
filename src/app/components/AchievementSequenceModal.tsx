import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AchievementDef } from '../utils/achievementsConfig';
import { RARITY_CONFIG } from '../utils/achievementsConfig';
import { useT } from '../i18n/useT';

const PARTICLES = [
  { x: 10, size: 8, delay: 0 },
  { x: 22, size: 6, delay: 0.08 },
  { x: 35, size: 9, delay: 0.15 },
  { x: 50, size: 7, delay: 0.05 },
  { x: 62, size: 8, delay: 0.12 },
  { x: 75, size: 6, delay: 0.18 },
  { x: 88, size: 9, delay: 0.1 },
  { x: 16, size: 5, delay: 0.22 },
  { x: 82, size: 7, delay: 0.07 },
  { x: 44, size: 5, delay: 0.25 },
  { x: 28, size: 6, delay: 0.14 },
  { x: 68, size: 7, delay: 0.19 },
];

interface AchievementSequenceModalProps {
  achievements: AchievementDef[];
  onComplete: () => void;
}

export function AchievementSequenceModal({ achievements, onComplete }: AchievementSequenceModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const t = useT();

  useEffect(() => {
    if (currentIndex >= achievements.length) {
      const t = setTimeout(() => onComplete(), 400); // pequeña pausa antes de ir a XP
      return () => clearTimeout(t);
    }
    
    // Mostrar cada logro por 3 segundos
    const timer = setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 3200);

    return () => clearTimeout(timer);
  }, [currentIndex, achievements.length, onComplete]);

  if (currentIndex >= achievements.length) return null;

  const achievement = achievements[currentIndex];
  const rarityColor = RARITY_CONFIG[achievement.rarity].color;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`ach-${achievement.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 z-[60] flex items-center justify-center overflow-hidden"
        style={{ background: 'rgba(3,3,9,0.9)', backdropFilter: 'blur(24px)' }}
      >
        {/* Confetti / Particles */}
        <div className="absolute inset-0 pointer-events-none">
          {PARTICLES.map((p, i) => (
            <motion.div key={`p-${currentIndex}-${i}`}
              initial={{ y: '100%', x: `${p.x}%`, opacity: 1, scale: 0, rotate: 0 }}
              animate={{ y: '-20%', opacity: 0, scale: 1.5, rotate: 720 }}
              transition={{ delay: p.delay, duration: 1.5, ease: 'easeOut' }}
              className="absolute bottom-0 rounded-sm"
              style={{ width: p.size, height: p.size, background: rarityColor, filter: `drop-shadow(0 0 8px ${rarityColor})` }}
            />
          ))}
          {['🏆', '✨', '🌟', '💫'].map((e, i) => (
            <motion.div key={`em-${currentIndex}-${i}`}
              initial={{ y: '100%', x: `${20 + i * 20}%`, opacity: 1, scale: 0 }}
              animate={{ y: '-10%', opacity: 0, scale: 1.5 }}
              transition={{ delay: 0.2 + i * 0.15, duration: 1.8 }}
              className="absolute bottom-0 text-3xl">
              {e}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ scale: 0.8, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 1.1, y: -30, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="relative flex flex-col items-center text-center px-6 w-full max-w-sm"
        >
          {/* Rarity Ring */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.2, damping: 15 }}
            className="relative w-32 h-32 rounded-full flex items-center justify-center mb-6"
            style={{ 
              background: `linear-gradient(135deg, ${rarityColor}40, ${rarityColor}10)`,
              boxShadow: `0 0 60px ${rarityColor}60, inset 0 0 30px ${rarityColor}30`,
              border: `2px solid ${rarityColor}`
            }}
          >
            <span className="text-6xl filter drop-shadow-lg">{achievement.emoji}</span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xs font-black tracking-[0.2em] uppercase mb-2"
            style={{ color: rarityColor }}
          >
            {RARITY_CONFIG[achievement.rarity].label.es}
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-white font-black text-2xl leading-tight mb-3"
            style={{ textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
          >
            {achievement.titulo.es}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-base"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            {achievement.desc.es}
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
