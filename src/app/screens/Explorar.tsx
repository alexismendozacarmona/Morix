import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, SlidersHorizontal, Flame, MessageCircle, Heart, Eye } from 'lucide-react';
import { IMGS } from '../data/mockData';
import type { Contenido } from '../data/mockData';
import { ContentRow } from '../components/ContentCard';
import { AuroraBackground } from '../components/AuroraBackground';
import { HScrollRow } from '../components/HScrollRow';
import { useAdminContent } from '../contexts/AdminContentContext';
import { useTrending } from '../contexts/TrendingContext';
import { getCatColors } from '../components/ContentCard';
import { useT } from '../i18n/useT';
import { toCanonicalCategory, getCategoryNames } from '../utils/categoryUtils';

const CATEGORIAS_BASE = [
  { id: '1', key: 'Meditación & Sonidos',    emoji: '🧘', imagen: IMGS.meditacion,   from: '#8b5cf6', to: '#6366f1' },
  { id: '3', key: 'Libros & Resúmenes',      emoji: '📚', imagen: IMGS.lectura,      from: '#0891b2', to: '#3b82f6' },
  { id: '7', key: 'Terror & Misterios',      emoji: '👻', imagen: IMGS.naturaleza,   from: '#9f1239', to: '#be123c' },
  { id: '10',key: 'Datos & Verdades',        emoji: '📊', imagen: IMGS.descanso,     from: '#475569', to: '#64748b' },
];

const RANK_COLORS: Record<number, string> = {
  1: '#f59e0b',
  2: '#9ca3af',
  3: '#b45309',
};

export default function Explorar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const t = useT();
  const { videos, videoCountByCat } = useAdminContent();
  const { trendingVideos, loading: trendingLoading } = useTrending();

  const [query,       setQuery]       = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(location.state?.category ?? null);
  const [showFilter,  setShowFilter]  = useState(false);

  useEffect(() => {
    if (location.state?.category) setSelectedCat(location.state.category);
  }, [location.state]);

  // Cross-language search: searches title, author, and category in any language
  const searchResults: Contenido[] = query.length >= 2
    ? videos.filter((c) => {
        const q = query.toLowerCase();
        const catNames = getCategoryNames(c.categoria);
        return (
          c.titulo.toLowerCase().includes(q) ||
          catNames.some((name) => name.includes(q)) ||
          (c.autor ?? '').toLowerCase().includes(q)
        );
      }).slice(0, 12)
    : [];

  // Filter: always compare using canonical (Spanish) form
  const catFiltered: Contenido[] = selectedCat
    ? videos.filter((c) => toCanonicalCategory(c.categoria) === toCanonicalCategory(selectedCat))
    : [];

  // Build categories with translated label + count
  const categorias = CATEGORIAS_BASE.map((c) => ({
    ...c,
    label: (t.categorias as Record<string, string>)[c.key] ?? c.key, // display in current lang
    count: videoCountByCat[c.key] ?? 0, // count always uses canonical key
  }));

  // Translated display for selected category filter header
  const selectedCatDisplay = selectedCat
    ? ((t.categorias as Record<string, string>)[toCanonicalCategory(selectedCat)] ?? selectedCat)
    : '';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="relative bg-[#030309] min-h-full">
      <AuroraBackground intensity="low" />
      <div className="relative z-10">
        {/* Header */}
        <div className="px-5 pt-14 pb-4">
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="font-black mb-5"
            style={{ fontSize: '26px', background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.75))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {t.explorar.titulo}
          </motion.h1>
          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-2.5">
            <div className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-[18px]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              <Search size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              <input
                type="text" value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedCat(null); }}
                placeholder={t.explorar.buscar_ph}
                className="bg-transparent flex-1 text-sm text-white placeholder-[rgba(255,255,255,0.28)] outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="active:scale-90">
                  <X size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilter((v) => !v)}
              className="w-12 h-12 rounded-[16px] flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
              style={{ background: showFilter ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.15)', border: showFilter ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(139,92,246,0.3)' }}
            >
              <SlidersHorizontal size={17} style={{ color: '#a78bfa' }} />
            </button>
          </motion.div>
          {/* Filter chips */}
          {showFilter && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 overflow-hidden">
              <HScrollRow gap={8} paddingX={0} style={{ paddingBottom: '2px' }}>
                <button onClick={() => setSelectedCat(null)}
                  className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-transform"
                  style={{ background: !selectedCat ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'rgba(255,255,255,0.06)', border: !selectedCat ? 'none' : '1px solid rgba(255,255,255,0.1)', color: !selectedCat ? 'white' : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                  {t.explorar.todas}
                </button>
                {categorias.map((c) => (
                  <button key={c.id} onClick={() => { setSelectedCat(c.key); setQuery(''); }}
                    className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-transform"
                    style={{ background: toCanonicalCategory(selectedCat ?? '') === c.key ? c.from : 'rgba(255,255,255,0.06)', border: toCanonicalCategory(selectedCat ?? '') === c.key ? 'none' : '1px solid rgba(255,255,255,0.1)', color: toCanonicalCategory(selectedCat ?? '') === c.key ? 'white' : 'rgba(255,255,255,0.5)', boxShadow: toCanonicalCategory(selectedCat ?? '') === c.key ? `0 0 12px ${c.from}70` : 'none', whiteSpace: 'nowrap' }}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </HScrollRow>
            </motion.div>
          )}
        </div>

        {/* SEARCH RESULTS */}
        {query.length >= 2 && (
          <div className="px-5 mb-6">
            <p className="text-[11px] font-bold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {searchResults.length} {t.explorar.resultados_para} "{query.toUpperCase()}"
            </p>
            {searchResults.length > 0 ? (
              <ContentRow titulo="" contenido={searchResults} />
            ) : (
              <div className="flex flex-col items-center py-12 text-center">
                <span className="text-4xl mb-3">🔍</span>
                <p className="text-white font-bold mb-1">{t.explorar.sin_resultados}</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.explorar.sin_res_sub}</p>
              </div>
            )}
          </div>
        )}

        {/* CATEGORY FILTER RESULTS */}
        {selectedCat && query.length < 2 && (
          <div className="mb-6">
            <div className="flex items-center justify-between px-5 mb-3">
              <p className="text-white font-bold text-sm">{selectedCatDisplay}</p>
              <button onClick={() => setSelectedCat(null)} className="flex items-center gap-1 text-[11px] active:scale-95 px-3 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>
                <X size={11} /> {t.explorar.quitar_filtro}
              </button>
            </div>
            <ContentRow titulo="" contenido={catFiltered} />
          </div>
        )}

        {/* DEFAULT VIEW */}
        {!query && !selectedCat && (
          <>
            {/* Categories grid */}
            <div className="px-5 mb-7">
              <p className="text-[11px] font-bold tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.explorar.categorias}</p>
              <div className="grid grid-cols-2 gap-3">
                {categorias.map((cat, i) => (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setSelectedCat(cat.key); setShowFilter(true); }}
                    className="relative overflow-hidden text-left"
                    style={{ height: '90px', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
                  >
                    <img src={cat.imagen} alt={cat.label} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.4 }} />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${cat.from}60 0%, ${cat.to}40 100%)` }} />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,3,9,0.85) 0%, transparent 55%)' }} />
                    <div className="absolute top-0 left-0 right-0 h-[2.5px]" style={{ background: `linear-gradient(to right, ${cat.from}, ${cat.to})` }} />
                    <div className="absolute inset-0 flex flex-col justify-end p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cat.emoji}</span>
                        <div>
                          <p className="text-white text-xs font-bold">{cat.label}</p>
                          {cat.count > 0 ? (
                            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                              {cat.count} {cat.count === 1 ? 'video' : 'videos'}
                            </p>
                          ) : (
                            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                              {t.explorar.proximamente}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* EN TENDENCIA */}
            <div className="px-5 mb-7">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-[8px] flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #f59e0b22, #ef444422)' }}>
                  <Flame size={13} style={{ color: '#f59e0b' }} />
                </div>
                <p className="text-[11px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.explorar.en_tendencia}</p>
              </div>

              {trendingLoading || trendingVideos.length === 0 ? (
                <div className="rounded-[22px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {trendingLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-6 h-6 rounded-full border-2 border-transparent"
                        style={{ borderTopColor: '#a78bfa', borderRightColor: 'rgba(167,139,250,0.3)' }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-10 text-center px-6">
                      <span className="text-3xl mb-3">📊</span>
                      <p className="text-white text-xs font-bold mb-1">{t.explorar.tendencias_vac}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {t.explorar.tendencias_sub}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[22px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}>
                  <AnimatePresence>
                    {trendingVideos.map((v, i) => {
                      const c = getCatColors(v.categoria);
                      const rankColor = RANK_COLORS[i + 1] ?? 'rgba(255,255,255,0.25)';
                      return (
                        <motion.button
                          key={v.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => navigate(`/video/${v.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-3 active:bg-white/5 transition-colors"
                          style={{ borderBottom: i < trendingVideos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                        >
                          <div
                            className="w-7 h-7 rounded-[10px] flex items-center justify-center flex-shrink-0"
                            style={{ background: i < 3 ? `${rankColor}22` : 'rgba(255,255,255,0.05)' }}
                          >
                            <span className="text-xs font-black" style={{ color: i < 3 ? rankColor : 'rgba(255,255,255,0.35)' }}>{i + 1}</span>
                          </div>
                          <div className="relative flex-shrink-0 rounded-[8px] overflow-hidden" style={{ width: '40px', height: '40px' }}>
                            <img src={v.imagen} alt={v.titulo} className="w-full h-full object-cover" />
                            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${c.from}30, transparent)` }} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-white text-xs font-bold truncate">{v.titulo}</p>
                            <p className="text-[10px] font-semibold mt-0.5" style={{ color: c.from }}>
                              #{(t.categorias as Record<string, string>)[toCanonicalCategory(v.categoria)] ?? v.categoria}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            <div className="flex items-center gap-1">
                              <Heart size={9} style={{ color: '#f43f5e' }} />
                              <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>{v.likesCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye size={9} style={{ color: '#60a5fa' }} />
                              <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>{v.viewsCount}</span>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Filas dinámicas de contenido real */}
            {videos.length > 0 ? (
              <>
                {[...new Set(videos.map((v) => v.categoria))].map((cat) => (
                  <ContentRow
                    key={cat}
                    titulo={cat}
                    contenido={videos.filter((v) => v.categoria === cat)}
                    onVerTodo={() => { setSelectedCat(cat); setShowFilter(true); }}
                    verTodoLabel={t.explorar.ver_todo}
                  />
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center py-16 px-5 text-center">
                <div className="text-5xl mb-4">🎬</div>
                <p className="text-white font-bold mb-2">{t.inicio.pronto_titulo}</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {t.inicio.pronto_desc}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}