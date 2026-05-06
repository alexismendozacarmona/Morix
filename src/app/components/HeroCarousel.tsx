import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Plus, Info, Heart, ListMusic, Check, X, Lock } from 'lucide-react';
import type { Contenido } from '../data/mockData';
import { useUserProgress } from '../contexts/UserProgressContext';
import { usePlaylist } from '../contexts/PlaylistContext';
import { PlaylistModal } from './PlaylistModal';
import { usePlanAccess } from '../hooks/usePlanAccess';
import { useT } from '../i18n/useT';
import { toCanonicalCategory } from '../utils/categoryUtils';

const catColors: Record<string, string> = {
  'Meditación & Sonidos':  '#8b5cf6',
  'Libros & Resúmenes':    '#0891b2',
  'Terror & Misterios':    '#059669',
  'Datos & Verdades':      '#d97706',
};

interface HeroCarouselProps {
  items: Contenido[];
  onPreview: (item: Contenido) => void;
}

export function HeroCarousel({ items, onPreview }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [imgKey, setImgKey] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const navigate = useNavigate();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { toggleSave, isSaved } = useUserProgress();
  const { getVideoPlaylists } = usePlaylist();
  const { canWatch } = usePlanAccess();

  const t = useT();
  const th = t.hero;

  const startInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % items.length);
      setImgKey((k) => k + 1);
    }, 5500);
  };

  useEffect(() => {
    startInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Close menu when tapping outside
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [showMenu]);

  // Pause autoplay while menu is open
  useEffect(() => {
    if (showMenu || showPlaylist) {
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      startInterval();
    }
  }, [showMenu, showPlaylist]);

  const goTo = (i: number) => {
    setCurrent(i);
    setImgKey((k) => k + 1);
    startInterval();
  };

  const item = items[current];
  const accent = catColors[item.categoria] ?? '#8b5cf6';
  const saved = isSaved(item.id);
  const playlistCount = getVideoPlaylists(item.id).length;

  const handleToggleSave = () => {
    toggleSave(item.id);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1800);
    setShowMenu(false);
  };

  const handleAddPlaylist = () => {
    setShowMenu(false);
    setTimeout(() => setShowPlaylist(true), 120);
  };

  return (
    <>
      <div className="relative w-full overflow-hidden" style={{ height: '420px' }}>
        {/* BG Image with ken-burns */}
        <AnimatePresence mode="sync">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <img
              key={imgKey}
              src={item.imagen}
              alt={item.titulo}
              className="absolute inset-0 w-full h-full object-cover ken-burns"
              style={{ transformOrigin: 'center center' }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Gradients */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to right, rgba(3,3,9,0.75) 0%, rgba(3,3,9,0.2) 60%, transparent 100%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, #030309 0%, rgba(3,3,9,0.6) 40%, rgba(3,3,9,0.15) 70%, transparent 100%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(3,3,9,0.6) 0%, transparent 30%)' }} />

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="absolute bottom-0 left-0 right-0 px-5 pb-5"
          >
            {/* Badges */}
            <div className="flex items-center gap-2 mb-3">
              {item.estreno && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                  style={{ background: accent, boxShadow: `0 0 12px ${accent}80` }}>
                  <span className="text-[9px] font-black text-white tracking-widest">{t.hero_ui.estreno}</span>
                </div>
              )}
              {item.autor === 'Morix Originals' && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                  <div className="w-1.5 h-1.5 rounded-full glow-pulse" style={{ background: '#a78bfa' }} />
                  <span className="text-[9px] font-black text-white tracking-widest">Morix ORIGINAL</span>
                </div>
              )}
              {item.match && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <span className="text-[9px] font-bold" style={{ color: '#4ade80' }}>{item.match}{t.hero_ui.para_ti}</span>
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="text-white font-black mb-2 leading-tight" style={{ fontSize: '24px', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
              {item.titulo}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs font-semibold" style={{ color: accent }}>
                {(t.categorias as Record<string, string>)[toCanonicalCategory(item.categoria)] ?? item.categoria}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{item.duracion}</span>
              {item.rating && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
                  <span className="text-xs font-bold" style={{ color: '#fbbf24' }}>★ {item.rating}</span>
                </>
              )}
            </div>

            {/* Buttons row */}
            <div className="flex items-center gap-2.5 relative" ref={menuRef}>
              <button
                onClick={() => {
                  if (!canWatch(item)) { onPreview(item); return; }
                  navigate(`/video/${item.id}`);
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-[16px] font-bold text-xs text-white active:scale-95 transition-transform"
                style={{
                  background: canWatch(item)
                    ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
                    : 'linear-gradient(135deg, #f59e0b, #d97706cc)',
                  boxShadow: canWatch(item)
                    ? `0 0 24px ${accent}70, inset 0 1px 0 rgba(255,255,255,0.2)`
                    : '0 0 24px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                {canWatch(item) ? <Play size={13} fill="white" strokeWidth={0} /> : <Lock size={13} />}
                {canWatch(item) ? t.hero_ui.reproducir : t.hero_ui.premium_btn}
              </button>
              <button
                onClick={() => onPreview(item)}
                className="flex items-center gap-2 px-4 py-3 rounded-[16px] font-semibold text-xs active:scale-95 transition-transform"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', color: 'rgba(255,255,255,0.9)' }}
              >
                <Info size={14} style={{ color: 'rgba(255,255,255,0.85)' }} />
                {t.hero_ui.info}
              </button>

              {/* + Button */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setShowMenu((v) => !v)}
                className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ml-auto relative"
                style={{
                  background: showMenu
                    ? `linear-gradient(135deg, ${accent}55, ${accent}33)`
                    : saved
                      ? 'rgba(244,63,94,0.2)'
                      : 'rgba(255,255,255,0.08)',
                  border: showMenu
                    ? `1.5px solid ${accent}80`
                    : saved
                      ? '1.5px solid rgba(244,63,94,0.5)'
                      : '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: saved ? '0 0 14px rgba(244,63,94,0.35)' : 'none',
                }}
              >
                {/* Badge: playlist count */}
                {playlistCount > 0 && !showMenu && (
                  <div
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
                  >
                    <span className="text-white" style={{ fontSize: '8px', fontWeight: 900 }}>{playlistCount}</span>
                  </div>
                )}
                <AnimatePresence mode="wait">
                  {savedFeedback ? (
                    <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Check size={15} className="text-green-400" />
                    </motion.div>
                  ) : showMenu ? (
                    <motion.div key="x" initial={{ rotate: -45, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: -45, scale: 0 }}>
                      <X size={15} className="text-white" />
                    </motion.div>
                  ) : (
                    <motion.div key="plus" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Plus size={16} style={{ color: saved ? '#f87171' : 'white' }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Action mini-menu (floats above the button) */}
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.88, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.88, y: 8 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 340 }}
                    className="absolute right-0 flex flex-col gap-1 p-1.5 rounded-[18px]"
                    style={{
                      bottom: 'calc(100% + 10px)',
                      minWidth: '190px',
                      background: 'rgba(12,12,28,0.92)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(28px)',
                      boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
                      zIndex: 50,
                    }}
                  >
                    {/* Mi lista */}
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={handleToggleSave}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-[14px] w-full text-left transition-colors"
                      style={{
                        background: saved ? 'rgba(244,63,94,0.15)' : 'transparent',
                        border: saved ? '1px solid rgba(244,63,94,0.3)' : '1px solid transparent',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-[11px] flex items-center justify-center flex-shrink-0"
                        style={{
                          background: saved ? 'rgba(244,63,94,0.25)' : 'rgba(255,255,255,0.08)',
                          border: saved ? '1px solid rgba(244,63,94,0.4)' : '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <Heart
                          size={15}
                          fill={saved ? '#f43f5e' : 'none'}
                          strokeWidth={saved ? 0 : 1.8}
                          style={{ color: saved ? '#f43f5e' : 'rgba(255,255,255,0.7)' }}
                        />
                      </div>
                      <div>
                        <p className="text-white text-[12px] font-bold leading-none mb-0.5">
                          {saved ? th.quitar_lista : th.guardar_lista}
                        </p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {saved ? th.ya_guardado : th.acceso_rapido}
                        </p>
                      </div>
                    </motion.button>

                    {/* Divisor */}
                    <div className="mx-3 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

                    {/* Playlist */}
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={handleAddPlaylist}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-[14px] w-full text-left transition-colors"
                      style={{
                        background: playlistCount > 0 ? `rgba(167,139,250,0.12)` : 'transparent',
                        border: playlistCount > 0 ? '1px solid rgba(167,139,250,0.25)' : '1px solid transparent',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-[11px] flex items-center justify-center flex-shrink-0"
                        style={{
                          background: playlistCount > 0 ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.08)',
                          border: playlistCount > 0 ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <ListMusic size={15} style={{ color: playlistCount > 0 ? '#a78bfa' : 'rgba(255,255,255,0.7)' }} />
                      </div>
                      <div>
                        <p className="text-white text-[12px] font-bold leading-none mb-0.5">
                          {playlistCount > 0 ? (playlistCount > 1 ? th.en_playlists.replace('{n}', String(playlistCount)) : th.en_playlist.replace('{n}', String(playlistCount))) : th.add_playlist}
                        </p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {playlistCount > 0 ? th.gestionar_pl : th.organiza}
                        </p>
                      </div>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dots */}
            <div className="flex items-center gap-1.5 mt-4">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="rounded-full transition-all duration-400"
                  style={{
                    height: '3px',
                    width: i === current ? '22px' : '6px',
                    background: i === current ? accent : 'rgba(255,255,255,0.25)',
                    boxShadow: i === current ? `0 0 6px ${accent}` : 'none',
                  }}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Playlist modal */}
      <AnimatePresence>
        {showPlaylist && (
          <PlaylistModal
            videoId={item.id}
            onClose={() => setShowPlaylist(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}