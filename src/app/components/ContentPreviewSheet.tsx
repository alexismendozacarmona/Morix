import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Bookmark, X, Star, Clock, Crown, Lock } from 'lucide-react';
import type { Contenido } from '../data/mockData';
import { useUserProgress } from '../contexts/UserProgressContext';
import { usePlanAccess } from '../hooks/usePlanAccess';
import { PaywallModal } from './PaywallModal';
import { useT } from '../i18n/useT';
import { toCanonicalCategory } from '../utils/categoryUtils';
import { getCatColors } from './ContentCard';

interface ContentPreviewSheetProps {
  item: Contenido | null;
  onClose: () => void;
}

export function ContentPreviewSheet({ item, onClose }: ContentPreviewSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSave, isSaved, getVideoProgress, watchedVideos } = useUserProgress();
  const { canWatch } = usePlanAccess();
  const t = useT();
  const tp = t.preview;
  const tpl = t.player;
  const [localSaved, setLocalSaved] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    if (item) setLocalSaved(isSaved(item.id));
  }, [item?.id, isSaved]);

  useEffect(() => {
    if (item) setDescExpanded(false);
  }, [item?.id]);

  const colors = getCatColors(item?.categoria ?? 'Meditación & Sonidos');

  const progress = item ? getVideoProgress(item.id) : 0;

  const safeWatched = Array.isArray(watchedVideos) ? watchedVideos : [];
  const wasAlreadyWatched = item ? safeWatched.includes(item.id) : false;

  const getPreviewWatchStatus = () => {
    if (!item) return 'not_started';
    if (wasAlreadyWatched && progress > 0 && progress < 100) return 'already_watched_inprogress';
    if (wasAlreadyWatched) return 'already_watched_fresh';
    if (progress > 0 && progress < 100) return 'in_progress';
    return 'not_started';
  };
  const watchStatus = getPreviewWatchStatus();

  const handlePlay = () => {
    if (!item) return;
    if (!canWatch(item)) { setPaywallOpen(true); return; }
    onClose();
    setTimeout(() => navigate(`/video/${item.id}`), 150);
  };

  const handleSave = () => {
    if (!item) return;
    toggleSave(item.id);
    setLocalSaved(!localSaved);
  };

  return (
    <>
      <AnimatePresence>
        {item && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)', zIndex: 105 }}
              onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 flex flex-col"
              style={{
                borderRadius: '32px 32px 0 0',
                background: 'linear-gradient(180deg, #0f0f24 0%, #070713 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderBottom: 'none',
                maxHeight: '90%',
                zIndex: 110,
              }}
            >
              {/* Image header — altura fija, no encoge */}
              <div className="relative w-full overflow-hidden flex-shrink-0" style={{ height: '200px' }}>
                <img
                  src={item.imagen}
                  alt={item.titulo}
                  className="w-full h-full object-cover"
                  style={{ opacity: 0.78 }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(135deg, ${colors.from}28, transparent 55%)` }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, #0f0f24 0%, rgba(15,15,36,0.15) 50%, transparent 100%)' }}
                />
                {/* Top accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2.5px]"
                  style={{
                    background: `linear-gradient(to right, transparent, ${colors.from}, ${colors.to}, transparent)`,
                    boxShadow: `0 0 10px ${colors.glow}`,
                  }}
                />

                {/* Progress bar */}
                {progress > 0 && progress < 100 && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3.5px]" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full"
                      style={{ width: `${progress}%`, background: `linear-gradient(to right, ${colors.from}, ${colors.to})` }}
                    />
                  </div>
                )}

                {/* Close */}
                <button
                  onClick={onClose}
                  className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <X size={14} className="text-white" />
                </button>

                {/* Badges */}
                <div className="absolute bottom-3.5 left-4 flex items-center gap-2">
                  {item.estreno && (
                    <span
                      className="text-[9px] font-black text-white px-2.5 py-1 rounded-full"
                      style={{ background: colors.from, boxShadow: `0 0 10px ${colors.glow}` }}
                    >
                      {tp.estreno}
                    </span>
                  )}
                  {!item.estreno && item.nuevo && (
                    <span className="text-[9px] font-black text-white px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.85)' }}>
                      {tp.nuevo}
                    </span>
                  )}
                  {item.premium && (
                    <span
                      className="flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full"
                      style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white' }}
                    >
                      <Crown size={8} /> {tp.premium_badge}
                    </span>
                  )}
                  {progress > 0 && progress < 100 && (
                    <span
                      className="text-[9px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: `${colors.from}35`, border: `1px solid ${colors.from}50`, color: colors.from }}
                    >
                      {Math.round(progress)}{tp.visto}
                    </span>
                  )}
                </div>
              </div>

              {/* Content — flex-1 + min-h-0 para scroll perfecto */}
              <div className="px-5 pt-4 pb-10 overflow-y-auto no-scrollbar flex-1 min-h-0">
                <h2 className="text-white font-black text-lg leading-snug mb-2">{item.titulo}</h2>

                {/* Meta */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {item.match && (
                    <span className="text-xs font-bold" style={{ color: '#4ade80' }}>
                      {item.match}{tp.para_ti}
                    </span>
                  )}
                  {item.match && <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>}
                  {item.año && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{item.año}</span>}
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                  <div className="flex items-center gap-1">
                    <Clock size={11} style={{ color: 'rgba(255,255,255,0.45)' }} />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{item.duracion}</span>
                  </div>
                  {item.rating && (
                    <>
                      <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                      <div className="flex items-center gap-1">
                        <Star size={11} fill="#fbbf24" style={{ color: '#fbbf24' }} />
                        <span className="text-xs font-bold" style={{ color: '#fbbf24' }}>{item.rating}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: `${colors.from}18`, border: `1px solid ${colors.from}35`, color: colors.from }}
                  >
                    {(tp as any).por_autor
                      ? ((t.categorias as Record<string, string>)[toCanonicalCategory(item.categoria)] ?? item.categoria)
                      : item.categoria}
                  </span>
                  {item.autor && (
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {tp.por_autor} {item.autor}
                    </span>
                  )}
                </div>

                {item.descripcion && (
                  <div className="mb-4">
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: 'rgba(255,255,255,0.55)',
                        display: '-webkit-box',
                        WebkitLineClamp: descExpanded ? 'unset' : 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: descExpanded ? 'visible' : 'hidden',
                      }}
                    >
                      {item.descripcion}
                    </p>
                    {item.descripcion.length > 120 && (
                      <button
                        onClick={() => setDescExpanded((v) => !v)}
                        className="text-xs font-semibold mt-1 active:opacity-70 transition-opacity"
                        style={{ color: 'rgba(255,255,255,0.38)' }}
                      >
                        {descExpanded ? tp.ver_menos : tp.ver_mas}
                      </button>
                    )}
                  </div>
                )}

                {/* Tags — navegan con previewOrigin para que ← vuelva aquí directamente */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {item.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          onClose();
                          const origin = location.pathname + location.search;
                          setTimeout(
                            () =>
                              navigate(`/categoria/${encodeURIComponent(tag)}`, {
                                state: { previewOrigin: origin },
                              }),
                            180
                          );
                        }}
                        className="text-[10px] font-medium px-2.5 py-1 rounded-full active:scale-95 transition-transform"
                        style={{
                          background: `${colors.from}12`,
                          border: `1px solid ${colors.from}30`,
                          color: colors.from,
                        }}
                      >
                        # {tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* XP preview */}
                <AnimatePresence mode="wait">
                  {watchStatus === 'not_started' && (
                    <motion.div
                      key="not_started"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[14px] mb-4"
                      style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}
                    >
                      <span className="text-base">⚡</span>
                      <div>
                        <p className="text-[10px] font-bold text-white">{tp.gana_xp}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          ≈ {Math.max(15, Math.floor(parseInt(item!.duracion) * 4))} {tp.xp_bonus}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {watchStatus === 'in_progress' && (
                    <motion.div
                      key="in_progress"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[14px] mb-4"
                      style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
                    >
                      <span className="text-base">🎬</span>
                      <div>
                        <p className="text-[10px] font-bold" style={{ color: '#60a5fa' }}>{tpl.en_progreso}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{tpl.en_progreso_sub}</p>
                      </div>
                    </motion.div>
                  )}

                  {watchStatus === 'already_watched_fresh' && (
                    <motion.div
                      key="already_watched_fresh"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[14px] mb-4"
                      style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}
                    >
                      <span className="text-base">✓</span>
                      <div>
                        <p className="text-[10px] font-bold" style={{ color: '#a78bfa' }}>{tpl.ya_visto}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{tpl.ya_visto_sub}</p>
                      </div>
                    </motion.div>
                  )}

                  {watchStatus === 'already_watched_inprogress' && (
                    <motion.div
                      key="already_watched_inprogress"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[14px] mb-4"
                      style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}
                    >
                      <span className="text-base">✓</span>
                      <div>
                        <p className="text-[10px] font-bold" style={{ color: '#a78bfa' }}>{tpl.ya_completado}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{tpl.ya_completado_sub}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CTA Play */}
                {canWatch(item) ? (
                  <button
                    onClick={handlePlay}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-[20px] text-white font-bold text-sm mb-3 active:scale-[0.97] transition-transform"
                    style={{
                      background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                      boxShadow: `0 0 28px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
                    }}
                  >
                    <Play size={16} fill="white" strokeWidth={0} />
                    {progress > 0 && progress < 100 ? `${tp.continuar} (${Math.round(progress)}%)` : tp.reproducir}
                  </button>
                ) : (
                  <button
                    onClick={() => setPaywallOpen(true)}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-[20px] text-white font-bold text-sm mb-3 active:scale-[0.97] transition-transform"
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #a78bfa 100%)',
                      boxShadow: '0 0 28px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                    }}
                  >
                    <Lock size={16} />
                    {tp.desbloquear}
                  </button>
                )}

                <div className="flex gap-2.5">
                  <button
                    onClick={handleSave}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-[16px] font-semibold text-sm active:scale-95 transition-transform"
                    style={{
                      background: localSaved ? `${colors.from}18` : 'rgba(255,255,255,0.06)',
                      border: localSaved ? `1px solid ${colors.from}40` : '1px solid rgba(255,255,255,0.09)',
                      color: localSaved ? colors.from : 'rgba(255,255,255,0.7)',
                      boxShadow: localSaved ? `0 0 14px ${colors.glow}` : 'none',
                    }}
                  >
                    <Bookmark
                      size={16}
                      fill={localSaved ? colors.from : 'none'}
                      style={{ color: localSaved ? colors.from : 'inherit' }}
                    />
                    {localSaved ? tp.guardado : tp.mi_lista}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        videoTitle={item?.titulo}
      />
    </>
  );
}
