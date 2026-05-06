import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video, Clock, Calendar, Flame, TrendingUp, Lock, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuroraBackground } from '../components/AuroraBackground';
import { useUserProgress } from '../contexts/UserProgressContext';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../i18n/useT';
import { useSettings } from '../contexts/SettingsContext';
import {
  ACHIEVEMENTS, RARITY_CONFIG, CATEGORY_CONFIG,
  buildAchievementProgress,
  type AchievementCategory,
} from '../utils/achievementsConfig';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function CircleProgress({ value, max, size = 96, strokeW = 5, color = '#8b5cf6', children }: {
  value: number; max: number; size?: number; strokeW?: number; color?: string; children?: React.ReactNode;
}) {
  const r    = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = max > 0 ? Math.min(value / max, 1) : 0;
  const cx   = size / 2;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} />
        <motion.circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={strokeW}
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${circ * pct} ${circ * (1 - pct)}` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

const WEEK_LABELS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WEEK_LABELS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getWeekDates(offset = 0): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    const diff = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - diff + i + offset * 7);
    return d.toISOString().split('T')[0];
  });
}

function formatShortDate(dateStr: string, lang: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' });
}

function WeekBar({ count, active, isToday, label }: { count: number; active: boolean; isToday: boolean; label: string }) {
  const barH = count > 0 ? Math.max(6, Math.min(40, count * 14)) : 6;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative flex flex-col justify-end" style={{ height: 48 }}>
        {count > 0 && (
          <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="text-[9px] font-bold mb-1 text-center" style={{ color: '#a78bfa' }}>
            {count}
          </motion.span>
        )}
        <motion.div
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
          className="w-7 rounded-[8px]"
          style={{
            height: barH, transformOrigin: 'bottom',
            background: active ? (isToday ? 'linear-gradient(180deg,#f0abfc,#8b5cf6)' : 'linear-gradient(180deg,#8b5cf6,#6366f1)') : 'rgba(255,255,255,0.05)',
            border: active ? 'none' : '1px solid rgba(255,255,255,0.07)',
            boxShadow: active ? `0 0 12px rgba(139,92,246,${isToday ? '0.7' : '0.4'})` : 'none',
          }}
        />
      </div>
      <span className="text-[10px]" style={{ color: active ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.2)' }}>{label}</span>
    </div>
  );
}

/* ─── Achievement Card ───────────────────────────────────────────────────── */
function AchievementCard({
  achievement,
  unlocked,
  lang,
  index,
}: {
  achievement: typeof ACHIEVEMENTS[0];
  unlocked: boolean;
  lang: string;
  index: number;
}) {
  const rarity   = RARITY_CONFIG[achievement.rarity];
  const color    = unlocked ? rarity.color : 'rgba(255,255,255,0.25)';
  const labelKey = lang === 'en' ? 'en' : 'es';

  // Build progress hint for locked achievements
  const progressHint = !unlocked && achievement.progress
    ? (() => {
        // We can't call hooks here; progress is passed via props
        return null; // Will be handled by parent
      })()
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.88, y: 12 }}
      animate={{ opacity: unlocked ? 1 : 0.55, scale: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="relative rounded-[20px] p-3.5 overflow-hidden"
      style={{
        background: unlocked ? rarity.bg : 'rgba(255,255,255,0.03)',
        border: `1px solid ${unlocked ? rarity.border : 'rgba(255,255,255,0.06)'}`,
        boxShadow: unlocked ? `0 0 20px ${rarity.glow}` : 'none',
      }}
    >
      {/* Glow behind emoji when unlocked */}
      {unlocked && (
        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${rarity.glow}, transparent)`, filter: 'blur(12px)' }} />
      )}

      {/* Rarity badge top-right */}
      <div className="absolute top-2.5 right-2.5">
        {unlocked ? (
          <CheckCircle2 size={12} style={{ color: rarity.color, filter: `drop-shadow(0 0 4px ${rarity.color})` }} />
        ) : (
          <Lock size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />
        )}
      </div>

      {/* Emoji */}
      <div
        className="w-11 h-11 rounded-[14px] flex items-center justify-center text-xl mb-2.5"
        style={{
          background: unlocked ? `${rarity.color}20` : 'rgba(255,255,255,0.05)',
          boxShadow: unlocked ? `0 0 18px ${rarity.glow}` : 'none',
          filter: unlocked ? 'none' : 'grayscale(1)',
        }}
      >
        {achievement.emoji}
      </div>

      {/* Title + desc */}
      <p className="text-[11px] leading-snug mb-0.5 pr-4"
        style={{ color: unlocked ? rarity.color : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
        {achievement.titulo[labelKey]}
      </p>
      <p className="text-[9.5px] leading-snug mb-2"
        style={{ color: 'rgba(255,255,255,0.3)' }}>
        {achievement.desc[labelKey]}
      </p>

      {/* Rarity label */}
      <span
        className="inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full"
        style={{
          background: unlocked ? `${rarity.color}18` : 'rgba(255,255,255,0.05)',
          color: unlocked ? rarity.color : 'rgba(255,255,255,0.25)',
          border: `1px solid ${unlocked ? rarity.border : 'rgba(255,255,255,0.08)'}`,
        }}
      >
        {rarity.label[labelKey].toUpperCase()}
      </span>
    </motion.div>
  );
}

/* ─── Achievement Card with progress ────────────────────────────────────── */
function AchievementCardWithProgress({
  achievement,
  unlocked,
  lang,
  index,
  progressData,
}: {
  achievement: typeof ACHIEVEMENTS[0];
  unlocked: boolean;
  lang: string;
  index: number;
  progressData: ReturnType<typeof buildAchievementProgress>;
}) {
  const rarity   = RARITY_CONFIG[achievement.rarity];
  const labelKey = lang === 'en' ? 'en' : 'es';
  const prog     = !unlocked && achievement.progress ? achievement.progress(progressData) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.88, y: 12 }}
      animate={{ opacity: unlocked ? 1 : 0.55, scale: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="relative rounded-[20px] p-3.5 overflow-hidden"
      style={{
        background: unlocked ? rarity.bg : 'rgba(255,255,255,0.03)',
        border: `1px solid ${unlocked ? rarity.border : 'rgba(255,255,255,0.06)'}`,
        boxShadow: unlocked ? `0 0 20px ${rarity.glow}` : 'none',
      }}
    >
      {unlocked && (
        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${rarity.glow}, transparent)`, filter: 'blur(12px)' }} />
      )}

      <div className="absolute top-2.5 right-2.5">
        {unlocked
          ? <CheckCircle2 size={12} style={{ color: rarity.color, filter: `drop-shadow(0 0 4px ${rarity.color})` }} />
          : <Lock size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />
        }
      </div>

      <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-xl mb-2.5"
        style={{
          background: unlocked ? `${rarity.color}20` : 'rgba(255,255,255,0.05)',
          boxShadow: unlocked ? `0 0 18px ${rarity.glow}` : 'none',
          filter: unlocked ? 'none' : 'grayscale(1)',
        }}>
        {achievement.emoji}
      </div>

      <p className="text-[11px] leading-snug mb-0.5 pr-4"
        style={{ color: unlocked ? rarity.color : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
        {achievement.titulo[labelKey]}
      </p>
      <p className="text-[9.5px] leading-snug mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
        {achievement.desc[labelKey]}
      </p>

      {/* Progress bar (only when locked AND has progress fn) */}
      {!unlocked && prog && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {prog.current.toLocaleString()} / {prog.total.toLocaleString()}
            </span>
            <span className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {Math.round((prog.current / prog.total) * 100)}%
            </span>
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(prog.current / prog.total) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.04 + 0.2 }}
              className="h-full rounded-full"
              style={{ background: rarity.color, boxShadow: `0 0 6px ${rarity.glow}` }}
            />
          </div>
        </div>
      )}

      <span className="inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full"
        style={{
          background: unlocked ? `${rarity.color}18` : 'rgba(255,255,255,0.05)',
          color: unlocked ? rarity.color : 'rgba(255,255,255,0.25)',
          border: `1px solid ${unlocked ? rarity.border : 'rgba(255,255,255,0.08)'}`,
        }}>
        {rarity.label[labelKey].toUpperCase()}
      </span>
    </motion.div>
  );
}

/* ─── Main screen ────────────────────────────────────────────────────────── */
export default function Progreso() {
  const t    = useT();
  const { appSettings } = useSettings();
  const lang = appSettings.idioma ?? 'es';
  const { user } = useAuth();

  const progress = useUserProgress();
  const {
    levelInfo, streak, bestStreak, totalXP, totalVideosWatched, totalMinutes,
    daysActive, watchHistory, categoryStats, dailyStats, savedVideos,
  } = progress;

  const WEEK_LABELS = lang === 'en' ? WEEK_LABELS_EN : WEEK_LABELS_ES;

  // ── Week navigation ─────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0);  // 0 = this week, -1 = last week, …

  // Earliest week allowed: week of account creation (or first recorded activity)
  const accountCreatedAt = user?.createdAt ?? null;
  const earliestDate = (() => {
    const candidates: string[] = [];
    if (accountCreatedAt) candidates.push(accountCreatedAt.split('T')[0]);
    if (watchHistory.length > 0) {
      const sorted = [...watchHistory].sort((a, b) => a.date.localeCompare(b.date));
      candidates.push(sorted[0].date);
    }
    if (daysActive.size > 0) {
      const sorted = [...daysActive].sort();
      candidates.push(sorted[0]);
    }
    if (candidates.length === 0) return null;
    return candidates.sort()[0];
  })();

  const minWeekOffset = (() => {
    if (!earliestDate) return -52; // fallback: 1 year back
    const today = new Date();
    const diff = (today.getDay() + 6) % 7;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - diff);
    const earliest = new Date(earliestDate + 'T12:00:00');
    const earlyMonday = new Date(earliest);
    const earlyDiff = (earliest.getDay() + 6) % 7;
    earlyMonday.setDate(earliest.getDate() - earlyDiff);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    return -Math.ceil((thisMonday.getTime() - earlyMonday.getTime()) / msPerWeek);
  })();

  const canGoBack    = weekOffset > minWeekOffset;
  const canGoForward = weekOffset < 0;

  // ── Week label ──────────────────────────────────────────────────────────
  const weekDates  = getWeekDates(weekOffset);
  const todayStr   = new Date().toISOString().split('T')[0];

  const weekLabel = (() => {
    if (weekOffset === 0) return lang === 'en' ? 'This week' : 'Esta semana';
    if (weekOffset === -1) return lang === 'en' ? 'Last week' : 'Semana pasada';
    const start = new Date(weekDates[0] + 'T12:00:00');
    const end   = new Date(weekDates[6] + 'T12:00:00');
    const fmt = (d: Date) => d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' });
    return `${fmt(start)} – ${fmt(end)}`;
  })();

  const weekData  = weekDates.map((date, i) => ({
    date, count: watchHistory.filter((w) => w.date === date).length,
    active: daysActive.has(date), isToday: date === todayStr, label: WEEK_LABELS[i],
  }));
  const weekActive  = weekData.filter((d) => d.active).length;
  const weekVideos  = weekData.reduce((s, d) => s + d.count, 0);
  const weekMinutes = Math.round(watchHistory.filter((w) => weekDates.includes(w.date)).reduce((s, w) => s + w.minutes, 0));

  // ── Category stats ─────────────────────────────────────────────────────
  const catEntries    = Object.entries(categoryStats).sort((a, b) => b[1].count - a[1].count).slice(0, 4);
  const maxCatCount   = catEntries[0]?.[1].count ?? 1;

  // ── Next milestone ─────────────────────────────────────────────────────
  const videoMilestones    = [1, 5, 10, 25, 50, 100, 200, 500];
  const nextVideoMilestone = videoMilestones.find((m) => m > totalVideosWatched) ?? totalVideosWatched + 50;

  // ── Recent history ─────────────────────────────────────────────────────
  const recentHistory = [...watchHistory].reverse().slice(0, 5);

  // ── Achievement data ───────────────────────────────────────────────────
  const progressData = buildAchievementProgress({
    totalVideosWatched,
    totalMinutes,
    bestStreak,
    categoryStats,
    levelInfo,
    totalXP,
    savedVideos,
    watchHistory,
    daysActive,
    dailyStats,
  });

  const achievementsWithStatus = ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: a.check(progressData),
  }));

  const totalUnlocked = achievementsWithStatus.filter(a => a.unlocked).length;

  // ── Category filter ────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<'all' | AchievementCategory>('all');
  const filterScrollRef = useRef<HTMLDivElement>(null);

  // Drag-to-scroll con mouse (para PC)
  const isDragging   = useRef(false);
  const startX       = useRef(0);
  const scrollLeft   = useRef(0);
  const hasDragged   = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = filterScrollRef.current;
    if (!el) return;
    isDragging.current = true;
    hasDragged.current = false;
    startX.current     = e.pageX - el.offsetLeft;
    scrollLeft.current = el.scrollLeft;
    el.style.cursor    = 'grabbing';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const el = filterScrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x    = e.pageX - el.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    if (Math.abs(walk) > 4) hasDragged.current = true;
    el.scrollLeft = scrollLeft.current - walk;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (filterScrollRef.current) filterScrollRef.current.style.cursor = 'grab';
  }, []);

  // Prevenir click si fue drag
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.stopPropagation();
      hasDragged.current = false;
    }
  }, []);

  // ── Touch direction detection para el scroll de pills (Android WebView) ──
  useEffect(() => {
    const el = filterScrollRef.current;
    if (!el) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchScrollStart = 0;
    let direction: 'h' | 'v' | null = null;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchScrollStart = el.scrollLeft;
      direction = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (!direction && (absDx > 5 || absDy > 5)) {
        direction = absDx > absDy ? 'h' : 'v';
      }

      if (direction === 'h') {
        e.preventDefault();
        el.scrollLeft = touchScrollStart - dx;
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  const categories: Array<'all' | AchievementCategory> = [
    'all', 'videos', 'tiempo', 'racha', 'categorias', 'nivel', 'xp', 'especial',
  ];

  const filteredAchievements = activeCategory === 'all'
    ? achievementsWithStatus
    : achievementsWithStatus.filter(a => a.category === activeCategory);

  // Sort: unlocked first, then by rarity desc
  const rarityOrder = { legendario: 0, epico: 1, raro: 2, comun: 3 };
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
  });

  // ── Empty state ────────────────────────────────────────────────────────
  const isNew = totalVideosWatched === 0;

  const labelKey = lang === 'en' ? 'en' : 'es';

  // Count unlocked per rarity for the summary strip
  const rarityStats = (['legendario', 'epico', 'raro', 'comun'] as const).map(r => ({
    r,
    total:    ACHIEVEMENTS.filter(a => a.rarity === r).length,
    unlocked: achievementsWithStatus.filter(a => a.rarity === r && a.unlocked).length,
    color:    RARITY_CONFIG[r].color,
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative bg-[#030309] min-h-full overflow-y-auto">
      <AuroraBackground intensity="medium" />

      <div className="relative z-10 px-5 pt-14 pb-28">
        {/* ── Header ── */}
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="font-black mb-1"
          style={{ fontSize: '26px', background: 'linear-gradient(135deg,#fff,rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {t.progreso.titulo}
        </motion.h1>
        <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {t.progreso.nivel_label} {levelInfo.level} · {totalXP.toLocaleString()} {t.progreso.xp_totales_sub}
        </p>

        {/* ── Empty state ── */}
        <AnimatePresence>
          {isNew && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-[22px] p-5 mb-5 flex flex-col items-center text-center"
              style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <span className="text-4xl mb-3">🚀</span>
              <p className="text-sm font-bold text-white mb-1">{t.progreso.empezar_titulo}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.progreso.empezar_desc}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HERO XP CARD ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-[28px] p-5 mb-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.18),rgba(59,130,246,0.1))', border: '1px solid rgba(139,92,246,0.25)', backdropFilter: 'blur(20px)' }}>
          <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(139,92,246,0.25),transparent 70%)', filter: 'blur(20px)' }} />

          <div className="relative flex items-center gap-5 mb-4">
            <CircleProgress value={levelInfo.currentLevelXP} max={levelInfo.nextLevelXP} size={92} color="#8b5cf6">
              <div className="flex flex-col items-center">
                <span className="text-white font-black text-xl leading-none">{levelInfo.level}</span>
                <span className="text-[9px] font-bold" style={{ color: '#a78bfa' }}>{t.progreso.nvl}</span>
              </div>
            </CircleProgress>
            <div className="flex-1">
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-white font-black" style={{ fontSize: '28px', lineHeight: 1 }}>{levelInfo.currentLevelXP.toLocaleString()}</span>
                <span className="text-sm pb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>/ {levelInfo.nextLevelXP.toLocaleString()} XP</span>
              </div>
              <p className="text-xs mb-3" style={{ color: '#a78bfa' }}>
                {t.progreso.nivel_label} {levelInfo.level} · <span style={{ color: 'rgba(255,255,255,0.5)' }}>{(levelInfo.nextLevelXP - levelInfo.currentLevelXP).toLocaleString()} {t.progreso.xp_para_subir}</span>
              </p>
              <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo.pct * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(to right,#8b5cf6,#60a5fa)', boxShadow: '0 0 10px rgba(139,92,246,0.7)' }}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2.5">
            {[
              { labelKey: 'dias_racha' as const, value: streak, icon: '🔥', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.2)' },
              { labelKey: 'xp_totales'  as const, value: totalXP.toLocaleString(), icon: '⚡', color: '#a78bfa', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.2)' },
            ].map((s) => (
              <div key={s.labelKey} className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-[14px]"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                <span className="text-lg">{s.icon}</span>
                <div>
                  <p className="text-white font-black text-base leading-none">{s.value}</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.progreso[s.labelKey]}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── ESTA SEMANA ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-[22px] p-4 mb-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {/* Arrow back */}
              <button
                onClick={() => canGoBack && setWeekOffset(o => o - 1)}
                disabled={!canGoBack}
                className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-all"
                style={{
                  background: canGoBack ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${canGoBack ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  opacity: canGoBack ? 1 : 0.3,
                }}
              >
                <ChevronLeft size={12} style={{ color: canGoBack ? '#a78bfa' : 'rgba(255,255,255,0.3)' }} />
              </button>

              <AnimatePresence mode="wait">
                <motion.p
                  key={weekOffset}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.18 }}
                  className="text-xs font-bold text-white"
                >
                  {weekLabel}
                </motion.p>
              </AnimatePresence>

              {/* Arrow forward */}
              <button
                onClick={() => canGoForward && setWeekOffset(o => o + 1)}
                disabled={!canGoForward}
                className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-all"
                style={{
                  background: canGoForward ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${canGoForward ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  opacity: canGoForward ? 1 : 0.3,
                }}
              >
                <ChevronRight size={12} style={{ color: canGoForward ? '#a78bfa' : 'rgba(255,255,255,0.3)' }} />
              </button>
            </div>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{weekActive}/7 {t.progreso.dias_activos}</p>
          </div>
          <div className="flex gap-3 mb-4">
            {[
              { labelKey: 'videos'  as const, value: weekVideos,  color: '#a78bfa' },
              { labelKey: 'minutos' as const, value: weekMinutes, color: '#60a5fa' },
            ].map((s) => (
              <div key={s.labelKey} className="flex items-center gap-1">
                <span className="font-black text-sm" style={{ color: s.color }}>{s.value}</span>
                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.progreso[s.labelKey]}</span>
              </div>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={weekOffset}
              initial={{ opacity: 0, x: weekOffset < 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-1.5 justify-between items-end"
            >
              {weekData.map((d) => (
                <WeekBar key={d.date} count={d.count} active={d.active} isToday={d.isToday} label={d.label} />
              ))}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ── STATS GRID ── */}
        <p className="text-[11px] font-bold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.progreso.estadisticas}</p>
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {[
            { label: t.progreso.videos_vistos,   value: totalVideosWatched, Icon: Video,    color: '#8b5cf6', glow: 'rgba(139,92,246,0.5)' },
            { label: t.progreso.minutos_totales,  value: Math.round(totalMinutes),       Icon: Clock,    color: '#3b82f6', glow: 'rgba(59,130,246,0.5)' },
            { label: t.progreso.dias_activo,      value: daysActive.size,    Icon: Calendar, color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
            { label: t.progreso.mejor_racha,      value: bestStreak,         Icon: Flame,    color: '#f97316', glow: 'rgba(249,115,22,0.5)' },
          ].map(({ label, value, Icon, color, glow }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.07 }}
              className="rounded-[20px] p-4 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}>
              <div className="w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18`, boxShadow: `0 0 14px ${glow}` }}>
                <Icon size={17} style={{ color, filter: `drop-shadow(0 0 4px ${color})` }} />
              </div>
              <div>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.1 }}
                  className="text-white font-black text-xl leading-none">{value.toLocaleString()}</motion.p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── VIDEO MILESTONE ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-[20px] p-4 mb-5"
          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-white">
              {t.progreso.proximo_hito}: <span style={{ color: '#60a5fa' }}>{nextVideoMilestone} videos</span>
            </p>
            <span className="text-[10px] font-bold" style={{ color: '#60a5fa' }}>
              {totalVideosWatched}/{nextVideoMilestone}
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${nextVideoMilestone > 0 ? (totalVideosWatched / nextVideoMilestone) * 100 : 0}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(to right,#3b82f6,#60a5fa)', boxShadow: '0 0 8px rgba(59,130,246,0.6)' }}
            />
          </div>
        </motion.div>

        {/* ── CATEGORIES ── */}
        {catEntries.length > 0 && (
          <>
            <p className="text-[11px] font-bold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.progreso.s_categorias}</p>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="rounded-[22px] p-4 mb-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {catEntries.map(([cat, stats], i) => {
                const catColors = ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981'];
                const col = catColors[i % catColors.length];
                return (
                  <motion.div key={cat} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.07 }} className="mb-3 last:mb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{Math.round(stats.minutes)} {t.progreso.min}</span>
                        <span className="text-[10px] font-bold" style={{ color: col }}>{stats.count} videos</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(stats.count / maxCatCount) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 + i * 0.08 }}
                        className="h-full rounded-full"
                        style={{ background: col, boxShadow: `0 0 6px ${col}80` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </>
        )}

        {/* ── HISTORIAL RECIENTE ── */}
        {recentHistory.length > 0 && (
          <>
            <p className="text-[11px] font-bold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.progreso.ultimos_vistos}</p>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              className="rounded-[22px] overflow-hidden mb-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {recentHistory.map((entry, i) => (
                <motion.div key={`${entry.videoId}-${entry.ts}`}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.06 }}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < recentHistory.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                    <TrendingUp size={13} style={{ color: '#a78bfa' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{entry.title}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {entry.category} · {Math.round(entry.minutes)} {t.progreso.min}
                    </p>
                  </div>
                  <p className="text-[9px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {formatShortDate(entry.date, lang)}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* ════════════════════════════════════ LOGROS ════════════════════════════════════ */}
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {t.progreso.logros}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {totalUnlocked}/{ACHIEVEMENTS.length} {lang === 'en' ? 'unlocked' : 'desbloqueados'}
            </p>
          </div>
          {/* Rarity summary — badges más legibles */}
          <div className="flex items-center gap-1">
            {rarityStats.map(rs => (
              <div key={rs.r}
                className="flex items-center gap-0.5 px-2 py-1 rounded-full"
                style={{
                  background: `${rs.color}14`,
                  border: `1px solid ${rs.color}30`,
                }}
              >
                <span className="text-xs font-black" style={{ color: rs.color }}>
                  {rs.unlocked}
                </span>
                <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  /{rs.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rarity legend strip */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {(['legendario', 'epico', 'raro', 'comun'] as const).map(r => (
            <div key={r} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: RARITY_CONFIG[r].color, boxShadow: `0 0 5px ${RARITY_CONFIG[r].glow}` }} />
              <span className="text-[10px] font-bold" style={{ color: RARITY_CONFIG[r].color }}>
                {RARITY_CONFIG[r].label[labelKey]}
              </span>
            </div>
          ))}
        </div>

        {/* Category filter pills — scroll horizontal */}
        <div className="mb-4" style={{ marginLeft: -20, marginRight: -20 }}>
          <div
            ref={filterScrollRef}
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 8,
              overflowX: 'scroll',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: 6,
              paddingTop: 2,
              touchAction: 'auto',
              willChange: 'scroll-position',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onClickCapture={onClickCapture}
          >
            {categories.map(cat => {
              const isActive = activeCategory === cat;
              const cfg = cat !== 'all' ? CATEGORY_CONFIG[cat] : null;
              const catUnlocked = cat === 'all'
                ? totalUnlocked
                : achievementsWithStatus.filter(a => a.category === cat && a.unlocked).length;
              const catTotal = cat === 'all'
                ? ACHIEVEMENTS.length
                : ACHIEVEMENTS.filter(a => a.category === cat).length;

              return (
                /* Botón nativo — motion.button captura eventos touch e impide el scroll */
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    paddingLeft: 12,
                    paddingRight: 12,
                    paddingTop: 8,
                    paddingBottom: 8,
                    borderRadius: 999,
                    fontSize: '11px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: isActive
                      ? (cfg ? `${cfg.color}22` : 'rgba(139,92,246,0.2)')
                      : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isActive ? (cfg ? `${cfg.color}40` : 'rgba(139,92,246,0.35)') : 'rgba(255,255,255,0.08)'}`,
                    color: isActive ? (cfg ? cfg.color : '#a78bfa') : 'rgba(255,255,255,0.45)',
                    boxShadow: isActive ? `0 0 12px ${cfg ? cfg.color + '30' : 'rgba(139,92,246,0.2)'}` : 'none',
                  }}
                >
                  <span>{cfg ? cfg.emoji : '🏅'}</span>
                  <span>
                    {cat === 'all'
                      ? (lang === 'en' ? 'All' : 'Todos')
                      : cfg!.label[labelKey]
                    }
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      padding: '2px 6px',
                      borderRadius: 999,
                      background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
                      color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {catUnlocked}/{catTotal}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Achievement grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-3"
          >
            {sortedAchievements.map((a, i) => (
              <AchievementCardWithProgress
                key={a.id}
                achievement={a}
                unlocked={a.unlocked}
                lang={lang}
                index={i}
                progressData={progressData}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Empty filter state */}
        {sortedAchievements.length === 0 && (
          <div className="flex flex-col items-center py-10">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-sm font-bold text-white">{lang === 'en' ? 'No achievements here' : 'Sin logros aquí'}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}