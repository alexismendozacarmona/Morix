import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Heart, Crown } from 'lucide-react';
import type { Contenido } from '../data/mockData';
import { AuroraBackground } from '../components/AuroraBackground';
import { useUserProgress } from '../contexts/UserProgressContext';
import { getCatColors } from '../components/ContentCard';
import { useAdminContent } from '../contexts/AdminContentContext';
import { useT } from '../i18n/useT';

const LibraryRow = ({ item, showProgress, idx }: { item: Contenido; showProgress?: boolean; idx: number }) => {
  const navigate = useNavigate();
  const { toggleSave, isSaved, getVideoProgress } = useUserProgress();
  const [liked, setLiked] = useState(isSaved(item.id));
  const c = getCatColors(item.categoria);
  const realProg = Math.round(getVideoProgress(item.id) ?? item.progreso ?? 0) || undefined;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05, duration: 0.3 }}
      className="flex items-center gap-3 py-3.5"
    >
      {/* Thumbnail */}
      <button
        onClick={() => navigate(`/video/${item.id}`)}
        className="relative rounded-[16px] overflow-hidden flex-shrink-0 active:scale-95 transition-transform"
        style={{ width: '92px', height: '64px', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
      >
        <img src={item.imagen} alt={item.titulo} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.32)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Play size={12} fill="white" className="text-white ml-0.5" />
          </div>
        </div>
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(to right, ${c.from}, ${c.to})` }} />
        {showProgress && realProg !== undefined && realProg > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full" style={{ width: `${realProg}%`, background: c.from }} />
          </div>
        )}
      </button>

      {/* Info */}
      <button onClick={() => navigate(`/video/${item.id}`)} className="flex-1 min-w-0 text-left">
        <p className="text-white text-xs font-semibold leading-snug truncate">{item.titulo}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-semibold" style={{ color: c.from }}>{item.categoria}</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.duracion}</span>
          {item.rating && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span className="text-[10px] font-bold" style={{ color: '#fbbf24' }}>★ {item.rating}</span>
            </>
          )}
        </div>
        {showProgress && realProg !== undefined && realProg > 0 && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)', maxWidth: '80px' }}>
              <div className="h-full rounded-full" style={{ width: `${realProg}%`, background: c.from }} />
            </div>
            <span className="text-[9px] font-bold" style={{ color: c.from }}>{realProg}%</span>
          </div>
        )}
      </button>

      <button
        onClick={() => { toggleSave(item.id); setLiked(!liked); }}
        className="p-2 flex-shrink-0 active:scale-90 transition-transform"
      >
        <Heart size={16} style={{ color: liked ? '#f43f5e' : 'rgba(255,255,255,0.2)', transition: 'color 0.2s ease' }} fill={liked ? '#f43f5e' : 'none'} />
      </button>
    </motion.div>
  );
};

export default function Biblioteca() {
  const t = useT();
  const { savedVideos, videoProgresses, watchedVideos } = useUserProgress();
  const { videos } = useAdminContent();

  // Tab keys (internal) → translated labels
  const TABS = [
    { key: 'fav',    label: t.biblioteca.tab_fav   },
    { key: 'inicio', label: t.biblioteca.tab_inicio },
    { key: 'hist',   label: t.biblioteca.tab_hist   },
  ];

  const [tabActiva, setTabActiva] = useState(TABS[0].key);

  const savedItems = videos.filter((c) => savedVideos.includes(c.id));

  // "Iniciados": tienen progreso > 0 pero NUNCA han sido completados (no están en watchedVideos)
  const inProgressItems = videos.filter((c) => {
    const p = videoProgresses[c.id] ?? 0;
    const alreadyCompleted = watchedVideos.includes(c.id);
    return p > 0 && p < 100 && !alreadyCompleted;
  }).slice(0, 10);

  // "Historial": todos los videos que el usuario completó alguna vez (watchedVideos es la fuente de verdad)
  const historialItems = videos.filter((c) => watchedVideos.includes(c.id)).slice(0, 50);

  const tabData: Record<string, Contenido[]> = {
    fav:    savedItems,
    inicio: inProgressItems,
    hist:   historialItems,
  };

  const items = tabData[tabActiva];

  const emptyTitle = tabActiva === 'fav'
    ? t.biblioteca.empty_fav
    : tabActiva === 'inicio'
    ? t.biblioteca.empty_inicio
    : t.biblioteca.empty_hist;

  const emptySub = tabActiva === 'fav'
    ? t.biblioteca.empty_fav_sub
    : tabActiva === 'inicio'
    ? t.biblioteca.empty_inicio_sub
    : t.biblioteca.empty_hist_sub;

  const emptyIcon = tabActiva === 'fav' ? '🔖' : tabActiva === 'inicio' ? '▶️' : '✅';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative bg-[#030309] min-h-full">
      <AuroraBackground intensity="low" />

      <div className="relative z-10 px-5 pt-14 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-black" style={{ fontSize: '26px', background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {t.biblioteca.titulo}
          </h1>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Crown size={11} style={{ color: '#f59e0b' }} />
            <span className="text-[10px] font-bold" style={{ color: '#fbbf24' }}>Free</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1.5 rounded-[22px] mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setTabActiva(tab.key)}
              className="flex-1 py-2.5 rounded-[16px] text-xs font-bold transition-all duration-250 active:scale-95"
              style={{
                background: tabActiva === tab.key ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent',
                color: tabActiva === tab.key ? 'white' : 'rgba(255,255,255,0.35)',
                boxShadow: tabActiva === tab.key ? '0 0 20px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.12)' : 'none',
              }}>
              {tab.label}
              {tab.key === 'fav' && savedItems.length > 0 && (
                <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: tabActiva === tab.key ? 'rgba(255,255,255,0.2)' : 'rgba(139,92,246,0.3)', color: tabActiva === tab.key ? 'white' : '#c4b5fd' }}>
                  {savedItems.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex gap-2 mb-5">
          {[
            { label: t.biblioteca.guardados,   value: savedItems.length,      color: '#f43f5e' },
            { label: t.biblioteca.en_progreso,  value: inProgressItems.length, color: '#8b5cf6' },
            { label: t.biblioteca.completados,  value: historialItems.length,  color: '#3b82f6' },
          ].map((s) => (
            <div key={s.label} className="flex-1 rounded-[16px] p-3 text-center" style={{ background: `${s.color}0d`, border: `1px solid ${s.color}20` }}>
              <p className="font-black text-lg text-white leading-none">{s.value}</p>
              <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* List */}
        <AnimatePresence mode="wait">
          <motion.div key={tabActiva} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {items.length > 0 ? (
              <div className="rounded-[24px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
                {items.map((item, i) => (
                  <div key={item.id} className="px-4" style={{ borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <LibraryRow item={item} showProgress={tabActiva === 'inicio'} idx={i} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="text-5xl mb-4">{emptyIcon}</div>
                <p className="text-white font-bold mb-1.5">{emptyTitle}</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>{emptySub}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}