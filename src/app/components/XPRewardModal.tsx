import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ChevronRight, TrendingUp, Play, Clock, Star } from 'lucide-react';
import type { XPReward } from '../contexts/UserProgressContext';
import { getLevelInfo } from '../contexts/UserProgressContext';
import type { Contenido } from '../data/mockData';
import { useT } from '../i18n/useT';
import { toCanonicalCategory } from '../utils/categoryUtils';

function useCounter(target: number, duration = 1200, active = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) { setValue(0); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, active]);
  return value;
}

const PARTICLES = [
  { x: 10, color: '#8b5cf6', size: 8, delay: 0 },
  { x: 22, color: '#fbbf24', size: 6, delay: 0.08 },
  { x: 35, color: '#f43f5e', size: 9, delay: 0.15 },
  { x: 50, color: '#3b82f6', size: 7, delay: 0.05 },
  { x: 62, color: '#10b981', size: 8, delay: 0.12 },
  { x: 75, color: '#f97316', size: 6, delay: 0.18 },
  { x: 88, color: '#a78bfa', size: 9, delay: 0.1 },
  { x: 16, color: '#fde68a', size: 5, delay: 0.22 },
  { x: 82, color: '#6ee7b7', size: 7, delay: 0.07 },
  { x: 44, color: '#c4b5fd', size: 5, delay: 0.25 },
  { x: 28, color: '#fca5a5', size: 6, delay: 0.14 },
  { x: 68, color: '#93c5fd', size: 7, delay: 0.19 },
];

interface XPRewardModalProps {
  reward: XPReward | null;
  totalXP: number;
  nextVideo?: Contenido | null;
  onClose: () => void;
  autoplay?: boolean; // kept for API compat but no longer used
}

export function XPRewardModal({ reward, totalXP, nextVideo, onClose }: XPRewardModalProps) {
  const navigate = useNavigate();
  const t = useT();
  const tx = t.xp_modal;
  const [phase, setPhase] = useState<'reward' | 'levelup'>('reward');
  const [counting, setCounting] = useState(false);
  const displayXP = useCounter(reward?.xp ?? 0, 1200, counting);
  const levelInfo = getLevelInfo(totalXP);

  useEffect(() => {
    if (!reward) { setPhase('reward'); setCounting(false); return; }
    const t1 = setTimeout(() => setCounting(true), 350);
    const t2 = setTimeout(() => {
      if (reward.leveledUp) setPhase('levelup');
    }, 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [reward]);

  const handleContinue = () => { onClose(); navigate('/inicio'); };
  const handleNext = () => {
    if (!nextVideo) return;
    onClose();
    setTimeout(() => navigate(`/video/${nextVideo.id}`, { state: { fresh: true } }), 120);
  };

  const dailyDots = useMemo(() => {
    if (!reward) return [];
    return Array.from({ length: reward.dailyTarget }, (_, i) => i < reward.dailyCompleted);
  }, [reward?.dailyCompleted, reward?.dailyTarget]);

  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-50 flex items-end justify-center overflow-hidden"
          style={{ background: 'rgba(3,3,9,0.85)', backdropFilter: 'blur(18px)' }}
        >
          {/* Particle burst */}
          <div className="absolute inset-0 pointer-events-none">
            {PARTICLES.map((p, i) => (
              <motion.div key={i}
                initial={{ y: '95%', x: `${p.x}%`, opacity: 1, scale: 0, rotate: 0 }}
                animate={{ y: `${50 - Math.random() * 40}%`, opacity: 0, scale: 1.2, rotate: 540 }}
                transition={{ delay: p.delay, duration: 1.1, ease: 'easeOut' }}
                className="absolute bottom-0 rounded-sm"
                style={{ width: p.size, height: p.size, background: p.color, filter: `drop-shadow(0 0 5px ${p.color})` }}
              />
            ))}
            {['🌟', '💫', '✨', '⭐'].map((e, i) => (
              <motion.div key={`em-${i}`}
                initial={{ y: '90%', x: `${20 + i * 20}%`, opacity: 1, scale: 0 }}
                animate={{ y: '30%', opacity: 0, scale: 1 }}
                transition={{ delay: 0.18 + i * 0.14, duration: 1.0 }}
                className="absolute bottom-0 text-xl">
                {e}
              </motion.div>
            ))}
          </div>

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%', scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="relative w-full overflow-hidden"
            style={{
              borderRadius: '36px 36px 0 0',
              background: 'linear-gradient(180deg, #0e0e26 0%, #060612 100%)',
              border: '1px solid rgba(139,92,246,0.22)',
              borderBottom: 'none',
              maxHeight: '86%',
              overflowY: 'auto',
            }}
          >
            {/* Top glow line */}
            <div className="absolute top-0 left-0 right-0 h-[2.5px]"
              style={{ background: 'linear-gradient(to right, transparent, #8b5cf6, #60a5fa, #f59e0b, #8b5cf6, transparent)', boxShadow: '0 0 20px rgba(139,92,246,0.5)' }} />

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
            </div>

            <div className="px-5 pb-7">
              {/* ── PHASE: REWARD ── */}
              <AnimatePresence mode="wait">
                {phase === 'reward' && (
                  <motion.div key="reward" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }}>

                    {/* Header */}
                    <div className="flex flex-col items-center mb-5 pt-1">
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                        className="relative mb-3"
                      >
                        {[0, 0.4, 0.8].map((d, i) => (
                          <motion.div key={i} initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 2.6, opacity: 0 }}
                            transition={{ delay: d, duration: 0.85, repeat: Infinity, repeatDelay: 1.5 }}
                            className="absolute rounded-full inset-0"
                            style={{ border: '2px solid rgba(139,92,246,0.45)' }} />
                        ))}
                        <div className="relative w-16 h-16 rounded-full flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 0 40px rgba(139,92,246,0.75), 0 0 80px rgba(139,92,246,0.25)' }}>
                          <span className="text-2xl">✓</span>
                        </div>
                      </motion.div>
                      <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="text-[10px] font-black tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.38)' }}>
                        {tx.completado_badge}
                      </motion.p>
                      <motion.h2 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                        className="text-white font-black text-base text-center leading-snug px-4">
                        {reward.videoTitle}
                      </motion.h2>
                    </div>

                    {/* XP Big Display */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.75 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', delay: 0.3 }}
                      className="flex items-center gap-3 px-5 py-4 rounded-[22px] mb-3 justify-center"
                      style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(99,102,241,0.12))', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 0 30px rgba(139,92,246,0.12)' }}
                    >
                      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 0 20px rgba(139,92,246,0.65)' }}>
                        <Zap size={20} fill="white" className="text-white" />
                      </div>
                      <div>
                        <div className="flex items-end gap-1.5">
                          <span className="font-black text-white" style={{ fontSize: '40px', lineHeight: 1 }}>+{displayXP}</span>
                          <span className="font-bold mb-1.5" style={{ color: '#a78bfa', fontSize: '20px' }}>XP</span>
                        </div>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{tx.xp_ganada}</p>
                      </div>
                    </motion.div>

                    {/* Bonus breakdown */}
                    {counting && reward.bonusReasons.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                        className="space-y-1.5 mb-4">
                        <p className="text-[10px] font-bold tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>{tx.desglose}</p>
                        <div className="flex items-center justify-between px-3 py-2 rounded-[12px]"
                          style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{tx.xp_base}</span>
                          <span className="text-xs font-bold text-white">+{reward.baseXP} XP</span>
                        </div>
                        {reward.bonusReasons.map((r, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + i * 0.08 }}
                            className="flex items-center justify-between px-3 py-2 rounded-[12px]"
                            style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.12)' }}>
                            <span className="text-xs" style={{ color: '#c4b5fd' }}>{r.replace(/\+\d+ XP /g, '')}</span>
                            <span className="text-xs font-bold" style={{ color: '#a78bfa' }}>{r.match(/\+\d+ XP/)?.[0]}</span>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}

                    {/* ── STATS ROW ── */}
                    {counting && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
                        className="grid grid-cols-3 gap-2 mb-4">

                        {/* Daily goal */}
                        <div className="flex flex-col items-center gap-1.5 py-3 rounded-[18px]"
                          style={{ background: reward.dailyCompleted >= reward.dailyTarget ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)', border: reward.dailyCompleted >= reward.dailyTarget ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.07)' }}>
                          <div className="flex items-center gap-[3px]">
                            {dailyDots.map((done, i) => (
                              <div key={i} className="w-2 h-2 rounded-full"
                                style={{ background: done ? '#22c55e' : 'rgba(255,255,255,0.15)', boxShadow: done ? '0 0 6px rgba(34,197,94,0.8)' : 'none' }} />
                            ))}
                          </div>
                          <p className="text-white text-[11px] font-bold">{reward.dailyCompleted}/{reward.dailyTarget}</p>
                          <p className="text-[9px] text-center leading-tight" style={{ color: 'rgba(255,255,255,0.35)' }}>{tx.meta_diaria}</p>
                        </div>

                        {/* Streak */}
                        <div className="flex flex-col items-center gap-1 py-3 rounded-[18px]"
                          style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
                          <span className="text-xl">🔥</span>
                          <p className="text-white text-[11px] font-bold">{reward.newStreak}</p>
                          <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{tx.dias_racha}</p>
                        </div>

                        {/* Minutes today */}
                        <div className="flex flex-col items-center gap-1 py-3 rounded-[18px]"
                          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}>
                          <Clock size={16} style={{ color: '#60a5fa' }} />
                          <p className="text-white text-[11px] font-bold">{reward.totalMinutesToday.toFixed(1)} min</p>
                          <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{tx.hoy}</p>
                        </div>
                      </motion.div>
                    )}

                    {/* ── XP TO NEXT LEVEL ── */}
                    {counting && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}
                        className="rounded-[18px] p-3.5 mb-4"
                        style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center"
                              style={{ background: 'linear-gradient(135deg, #8b5cf6, #4f46e5)' }}>
                              <TrendingUp size={11} className="text-white" />
                            </div>
                            <span className="text-xs font-bold text-white">{tx.nivel} {levelInfo.level}</span>
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: reward.xpToNextLevel <= 50 ? '#4ade80' : '#a78bfa' }}>
                            {reward.xpToNextLevel <= 50 ? tx.casi_sube : `${reward.xpToNextLevel} ${tx.xp_para_nivel}${levelInfo.level + 1}`}
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <motion.div
                            initial={{ width: `${Math.max(0, (levelInfo.currentLevelXP - reward.xp) / levelInfo.nextLevelXP) * 100}%` }}
                            animate={{ width: `${levelInfo.pct * 100}%` }}
                            transition={{ duration: 1.0, delay: 0.2, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: 'linear-gradient(to right, #8b5cf6, #60a5fa)', boxShadow: '0 0 10px rgba(139,92,246,0.65)' }}
                          />
                        </div>
                        <div className="flex justify-between mt-1.5">
                          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{levelInfo.currentLevelXP} XP</span>
                          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{levelInfo.nextLevelXP} XP</span>
                        </div>
                      </motion.div>
                    )}

                    {/* Daily goal achieved banner */}
                    {counting && reward.dailyCompleted >= reward.dailyTarget && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.2, type: 'spring' }}
                        className="rounded-[18px] p-3.5 mb-4 flex items-center gap-3"
                        style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.08))', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 0 20px rgba(34,197,94,0.08)' }}>
                        <span className="text-2xl">🎯</span>
                        <div>
                          <p className="text-white text-xs font-bold">{tx.meta_cumplida}</p>
                          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            {tx.completaste} {reward.dailyCompleted} {tx.videos_hoy} +{reward.dailyCompleted * 5} {tx.xp_bonus}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* ── SIGUIENTE VIDEO RELACIONADO ── */}
                    {nextVideo && counting && (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 4.5 }}
                        className="mb-4">
                        <p className="text-[10px] font-black tracking-widest mb-2.5" style={{ color: 'rgba(255,255,255,0.22)' }}>
                          SIGUIENTE VIDEO RELACIONADO
                        </p>
                        {/* Card de preview grande */}
                        <button onClick={handleNext}
                          className="w-full rounded-[20px] overflow-hidden active:scale-[0.97] transition-transform text-left"
                          style={{ border: '1px solid rgba(139,92,246,0.25)', background: 'rgba(10,8,30,0.8)' }}>
                          {/* Thumbnail landscape */}
                          <div className="relative w-full" style={{ height: 110 }}>
                            <img
                              src={nextVideo.imagenLandscape || nextVideo.imagen}
                              alt={nextVideo.titulo}
                              className="w-full h-full object-cover"
                            />
                            {/* Gradient overlay */}
                            <div className="absolute inset-0"
                              style={{ background: 'linear-gradient(to top, rgba(10,8,30,0.85) 0%, rgba(0,0,0,0.1) 60%)' }} />
                            {/* Play circle */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(139,92,246,0.85)', boxShadow: '0 0 20px rgba(139,92,246,0.6)', backdropFilter: 'blur(4px)' }}>
                                <Play size={18} fill="white" className="text-white ml-0.5" />
                              </div>
                            </div>
                            {/* Duration chip */}
                            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-[6px]"
                              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
                              <Clock size={9} style={{ color: 'rgba(255,255,255,0.7)' }} />
                              <span className="text-[10px] font-bold text-white">{nextVideo.duracion}</span>
                            </div>
                            {/* Match chip */}
                            {nextVideo.match && (
                              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-[6px]"
                                style={{ background: 'rgba(34,197,94,0.2)', backdropFilter: 'blur(6px)', border: '1px solid rgba(34,197,94,0.35)' }}>
                                <span className="text-[9px] font-black" style={{ color: '#4ade80' }}>{nextVideo.match}% match</span>
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="px-3.5 py-3">
                            <p className="text-white font-bold text-[13px] leading-snug line-clamp-2 mb-1.5">{nextVideo.titulo}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                style={{ background: 'rgba(139,92,246,0.18)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' }}>
                                {(t.categorias as Record<string, string>)[toCanonicalCategory(nextVideo.categoria)] ?? nextVideo.categoria}
                              </span>
                              {nextVideo.rating && (
                                <div className="flex items-center gap-1">
                                  <Star size={9} fill="#fbbf24" style={{ color: '#fbbf24' }} />
                                  <span className="text-[10px] font-bold" style={{ color: '#fbbf24' }}>{nextVideo.rating}</span>
                                </div>
                              )}
                              {nextVideo.autor && (
                                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                  · {nextVideo.autor}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </motion.div>
                    )}

                    {/* Buttons */}
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 4.7 }}
                      className="space-y-2.5">
                      {nextVideo && (
                        <button onClick={handleNext}
                          className="w-full py-4 rounded-[20px] font-bold text-white text-sm tracking-wide active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
                          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 0 28px rgba(139,92,246,0.55), inset 0 1px 0 rgba(255,255,255,0.16)' }}>
                          <Play size={15} fill="white" strokeWidth={0} />
                          Ver siguiente video
                        </button>
                      )}
                      <button onClick={handleContinue}
                        className="w-full py-3.5 rounded-[20px] font-semibold text-sm active:scale-[0.97] transition-transform"
                        style={{ background: nextVideo ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: nextVideo ? '1px solid rgba(255,255,255,0.1)' : 'none', color: 'rgba(255,255,255,0.75)', boxShadow: nextVideo ? 'none' : '0 0 28px rgba(139,92,246,0.55)' }}>
                        {tx.volver_inicio}
                      </button>
                    </motion.div>
                  </motion.div>
                )}

                {/* ── PHASE: LEVEL UP ── */}
                {phase === 'levelup' && (
                  <motion.div key="levelup" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 14 }}
                    className="flex flex-col items-center py-8">
                    {/* Extra level-up particles */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {[...PARTICLES, ...PARTICLES].map((p, i) => (
                        <motion.div key={`lu-${i}`}
                          initial={{ y: '100%', x: `${(p.x + i * 5) % 100}%`, opacity: 1, scale: 0 }}
                          animate={{ y: '-20%', opacity: 0, scale: 1.4 }}
                          transition={{ delay: i * 0.04, duration: 1.2, ease: 'easeOut' }}
                          className="absolute bottom-0 rounded-full"
                          style={{ width: p.size, height: p.size, background: p.color, filter: `blur(1px) drop-shadow(0 0 6px ${p.color})` }}
                        />
                      ))}
                    </div>
                    {/* Glow rings */}
                    {[0, 0.5, 1.0].map((d, i) => (
                      <motion.div key={i} initial={{ scale: 0.5, opacity: 0.7 }} animate={{ scale: 3.5, opacity: 0 }}
                        transition={{ delay: d, duration: 1.0 }}
                        className="absolute w-24 h-24 rounded-full border-2" style={{ borderColor: '#fbbf24', top: '18%' }} />
                    ))}
                    <div className="relative w-24 h-24 rounded-full flex flex-col items-center justify-center mb-4"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 60px rgba(245,158,11,0.9), 0 0 120px rgba(245,158,11,0.3)' }}>
                      <TrendingUp size={30} className="text-white" />
                    </div>
                    <motion.h2 className="font-black mb-2" style={{ fontSize: '30px', background: 'linear-gradient(135deg, #fde68a, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      {tx.nivel_up_title} {reward.levelAfter}!
                    </motion.h2>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="font-black text-2xl" style={{ color: 'rgba(255,255,255,0.35)' }}>Nv.{reward.levelBefore}</span>
                      <motion.div animate={{ x: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 0.5 }}>
                        <ChevronRight size={20} style={{ color: '#f59e0b' }} />
                      </motion.div>
                      <span className="font-black text-3xl text-white">Nv.{reward.levelAfter}</span>
                    </div>
                    <p className="text-sm text-center px-6 mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {tx.nivel_up_msg}
                    </p>
                    <div className="px-3 w-full space-y-2.5">
                      {nextVideo && (
                        <button onClick={handleNext}
                          className="w-full py-4 rounded-[20px] font-bold text-white text-sm active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
                          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 0 28px rgba(139,92,246,0.55)' }}>
                          <Play size={15} fill="white" strokeWidth={0} />
                          Ver siguiente video relacionado
                        </button>
                      )}
                      <button onClick={handleContinue}
                        className="w-full py-3.5 rounded-[20px] font-bold text-white text-sm active:scale-[0.97] transition-transform"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 28px rgba(245,158,11,0.55)' }}>
                        {tx.seguir}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}