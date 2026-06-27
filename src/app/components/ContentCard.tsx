import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Crown, Play } from 'lucide-react';
import type { Contenido } from '../data/mockData';
import { usePreview } from '../contexts/PreviewContext';
import { useUserProgress } from '../contexts/UserProgressContext';
import { HScrollRow } from './HScrollRow';
import { useT } from '../i18n/useT';
import { toCanonicalCategory } from '../utils/categoryUtils';

export const CAT_COLORS: Record<string, { from: string; to: string; glow: string }> = {
  'Meditación & Sonidos':    { from: '#8b5cf6', to: '#6366f1', glow: 'rgba(139,92,246,0.8)' },
  'Libros & Resúmenes':      { from: '#0891b2', to: '#3b82f6', glow: 'rgba(8,145,178,0.8)' },
  'Terror & Misterios':      { from: '#9f1239', to: '#be123c', glow: 'rgba(159,18,57,0.8)' },
  'Datos & Verdades':        { from: '#475569', to: '#64748b', glow: 'rgba(71,85,105,0.8)' },
};

/** Get colors for any category (handles both ES and EN names) */
export function getCatColors(categoria: string) {
  const canonical = toCanonicalCategory(categoria);
  return CAT_COLORS[canonical] ?? CAT_COLORS['Meditación & Sonidos'];
}

/** Categories where we show the author name instead of category */
const SHOW_AUTHOR_CANONICAL = ['Libros & Resúmenes', 'Historias de Vida', 'Historias de Éxito'];
function showAuthor(cat: string) {
  return SHOW_AUTHOR_CANONICAL.includes(toCanonicalCategory(cat));
}

/**
 * ── TAP DETECTION STRATEGY ────────────────────────────────────────────────────
 *
 * Android WebView fires `pointercancel` instead of `pointerup` for ANY touch
 * inside scrollable containers. This makes pointer-event-based tap detection
 * fundamentally unreliable on Android.
 *
 * SOLUTION: Use `onClick` as the ONLY tap trigger.
 *  • `onClick` fires after touchend for taps (no significant movement).
 *  • Browser automatically suppresses `click` after horizontal scroll
 *    (because HScrollRow calls e.preventDefault() in touchmove).
 *  • Browser automatically suppresses `click` after vertical scroll.
 *  • `touch-action: manipulation` removes 300ms tap delay.
 *  • No coordinate tracking, no timers, no pointer cancel hacks needed.
 *
 * Touch events are used ONLY for `pressed` visual state:
 *  • onTouchStart: record start position, set pressed
 *  • onTouchMove: if moved > 8px, clear pressed (user is scrolling)
 *  • onTouchEnd / onTouchCancel: clear pressed
 *  • onMouseDown / onMouseUp / onMouseLeave: desktop pressed state
 */

/* ─────────── Portrait Card ─────────── */
export function ContentCard({ contenido, delay = 0 }: { contenido: Contenido; delay?: number }) {
  const { setPreviewItem } = usePreview();
  const { isSaved, getVideoProgress } = useUserProgress();
  const t = useT();
  const [pressed, setPressed] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const c = getCatColors(contenido.categoria);
  const saved = isSaved(contenido.id);
  const realProgress = getVideoProgress(contenido.id) || contenido.progreso;
  const catDisplay = (t.categorias as Record<string, string>)[toCanonicalCategory(contenido.categoria)] ?? contenido.categoria;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      className="flex-shrink-0"
    >
      <div
        onClick={() => setPreviewItem(contenido)}
        onTouchStart={(e) => {
          touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          setPressed(true);
        }}
        onTouchMove={(e) => {
          if (!touchStart.current) return;
          const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
          const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
          if (dx > 8 || dy > 8) setPressed(false);
        }}
        onTouchEnd={() => { setPressed(false); touchStart.current = null; }}
        onTouchCancel={() => { setPressed(false); touchStart.current = null; }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        className="relative overflow-hidden cursor-pointer select-none"
        style={{
          width: '132px',
          height: '188px',
          borderRadius: '20px',
          background: '#0d0d1f',
          border: pressed ? `1.5px solid ${c.from}80` : '1px solid rgba(255,255,255,0.07)',
          boxShadow: pressed
            ? `0 0 0 1px ${c.from}55, 0 0 28px ${c.glow}, 0 0 56px ${c.from}40, inset 0 0 20px ${c.from}15`
            : '0 6px 20px rgba(0,0,0,0.5)',
          transform: pressed ? 'scale(0.93)' : 'scale(1)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border 0.15s ease',
          touchAction: 'manipulation',
        }}
      >
        <img
          src={contenido.imagen}
          alt={contenido.titulo}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: pressed ? 0.9 : 0.72, transition: 'opacity 0.15s ease', pointerEvents: 'none' }}
          draggable={false}
        />

        {/* Color overlay on press */}
        {pressed && (
          <div className="absolute inset-0" style={{ background: `${c.from}20`, pointerEvents: 'none' }} />
        )}

        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px]" style={{ background: `linear-gradient(to right, ${c.from}, ${c.to})`, boxShadow: `0 0 8px ${c.glow}` }} />

        {/* Gradient */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,3,9,1) 0%, rgba(3,3,9,0.65) 42%, rgba(3,3,9,0.05) 78%, transparent 100%)', pointerEvents: 'none' }} />

        {/* Badges top-left */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none">
          {contenido.estreno && (
            <div className="px-2 py-0.5 rounded-full" style={{ background: c.from, boxShadow: `0 0 8px ${c.glow}` }}>
              <span className="text-[8px] font-black text-white tracking-wider">{t.badges.estreno}</span>
            </div>
          )}
          {!contenido.estreno && contenido.nuevo && (
            <div className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.85)' }}>
              <span className="text-[8px] font-black text-white tracking-wider">{t.badges.nuevo}</span>
            </div>
          )}
        </div>

        {/* Premium / Free + Saved badges top-right */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 items-end pointer-events-none">
          {contenido.premium ? (
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
              <Crown size={9} className="text-white" />
            </div>
          ) : (
            <div className="px-1.5 h-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 0 8px rgba(16,185,129,0.45)' }}>
              <span className="text-[8px] font-black text-white tracking-wider">{t.badges.gratis}</span>
            </div>
          )}
          {saved && (
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.9)', boxShadow: '0 0 8px rgba(139,92,246,0.6)' }}>
              <Bookmark size={9} className="text-white" fill="white" />
            </div>
          )}
        </div>

        {/* Progress bar */}
        {realProgress !== undefined && realProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full" style={{ width: `${realProgress}%`, background: `linear-gradient(to right, ${c.from}, ${c.to})`, boxShadow: `0 0 6px ${c.glow}` }} />
          </div>
        )}

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 pointer-events-none">
          {realProgress !== undefined && realProgress > 0 && <div className="mb-2" />}
          {contenido.rating && (
            <div className="flex items-center gap-0.5 mb-1">
              <span style={{ fontSize: '9px', color: '#fbbf24' }}>★</span>
              <span className="text-[9px] font-bold" style={{ color: '#fbbf24' }}>{contenido.rating}</span>
            </div>
          )}
          <p className="text-white text-[11px] font-bold leading-tight line-clamp-2 text-left">{contenido.titulo}</p>
          {showAuthor(contenido.categoria) && contenido.autor ? (
            <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{contenido.autor}</p>
          ) : (
            <p className="text-[9px] mt-0.5 font-semibold" style={{ color: c.from }}>{catDisplay}</p>
          )}
        </div>

        {/* Play icon center on press */}
        {pressed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${c.from}cc`, backdropFilter: 'blur(8px)' }}>
              <Play size={16} fill="white" className="text-white ml-0.5" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────── Landscape Card ─────────── */
export function LandscapeCard({ contenido, delay = 0 }: { contenido: Contenido; delay?: number }) {
  const { setPreviewItem } = usePreview();
  const { isSaved, getVideoProgress } = useUserProgress();
  const t = useT();
  const [pressed, setPressed] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const c = getCatColors(contenido.categoria);
  const realProgress = getVideoProgress(contenido.id) || contenido.progreso;
  const saved = isSaved(contenido.id);
  const catDisplay = (t.categorias as Record<string, string>)[toCanonicalCategory(contenido.categoria)] ?? contenido.categoria;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      className="flex-shrink-0"
    >
      <div
        onClick={() => setPreviewItem(contenido)}
        onTouchStart={(e) => {
          touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          setPressed(true);
        }}
        onTouchMove={(e) => {
          if (!touchStart.current) return;
          const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
          const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
          if (dx > 8 || dy > 8) setPressed(false);
        }}
        onTouchEnd={() => { setPressed(false); touchStart.current = null; }}
        onTouchCancel={() => { setPressed(false); touchStart.current = null; }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        className="relative overflow-hidden cursor-pointer select-none"
        style={{
          width: '200px',
          height: '122px',
          borderRadius: '18px',
          background: '#0d0d1f',
          border: pressed ? `1.5px solid ${c.from}70` : '1px solid rgba(255,255,255,0.07)',
          boxShadow: pressed
            ? `0 0 24px ${c.glow}, 0 0 50px ${c.from}35`
            : '0 6px 20px rgba(0,0,0,0.5)',
          transform: pressed ? 'scale(0.93)' : 'scale(1)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          touchAction: 'manipulation',
        }}
      >
        <img
          src={contenido.imagen}
          alt={contenido.titulo}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: pressed ? 0.85 : 0.7, transition: 'opacity 0.15s ease', pointerEvents: 'none' }}
          draggable={false}
        />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${c.from}18, transparent 60%)`, pointerEvents: 'none' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,3,9,0.95) 0%, rgba(3,3,9,0.35) 50%, transparent 100%)', pointerEvents: 'none' }} />
        <div className="absolute top-0 left-0 right-0 h-[2.5px]" style={{ background: `linear-gradient(to right, ${c.from}, ${c.to})`, boxShadow: `0 0 6px ${c.glow}` }} />

        {realProgress !== undefined && realProgress > 0 && (
          <>
            <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full" style={{ width: `${realProgress}%`, background: `linear-gradient(to right, ${c.from}, ${c.to})` }} />
            </div>
            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full pointer-events-none" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
              <span className="text-[9px] font-bold" style={{ color: c.from }}>{Math.round(realProgress)}%</span>
            </div>
          </>
        )}

        {saved && (
          <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full flex items-center justify-center pointer-events-none" style={{ background: 'rgba(139,92,246,0.9)' }}>
            <Bookmark size={9} className="text-white" fill="white" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-3 pointer-events-none">
          {realProgress !== undefined && realProgress > 0 && <div className="mb-1.5" />}
          <p className="text-white text-[11px] font-bold leading-tight line-clamp-1 text-left">{contenido.titulo}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {showAuthor(contenido.categoria) && contenido.autor ? (
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{contenido.autor}</span>
            ) : (
              <span className="text-[9px] font-semibold" style={{ color: c.from }}>{catDisplay}</span>
            )}
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '8px' }}>·</span>
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{contenido.duracion}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────── Top 10 Card ─────────── */
export function Top10Card({ contenido, rank, delay = 0 }: { contenido: Contenido; rank: number; delay?: number }) {
  const { setPreviewItem } = usePreview();
  const [pressed, setPressed] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const c = getCatColors(contenido.categoria);

  // Color palette per rank position
  const rankStyle =
    rank === 1
      ? { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)', stroke: '#f59e0b' }   // gold
      : rank === 2
      ? { color: '#c0cfe0', glow: 'rgba(192,207,224,0.4)', stroke: '#c0cfe0' }  // silver
      : rank === 3
      ? { color: '#cd7c3a', glow: 'rgba(205,124,58,0.5)', stroke: '#cd7c3a' }   // bronze
      : rank <= 5
      ? { color: '#8b5cf6', glow: 'rgba(139,92,246,0.45)', stroke: '#8b5cf6' }  // purple
      : { color: '#4f67a8', glow: 'rgba(79,103,168,0.35)', stroke: '#4f67a8' }; // dark blue

  const CARD_W = 100;
  const CARD_H = 144;
  const NUM_PEEK = 32;
  const CONTAINER_W = CARD_W + NUM_PEEK;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      className="flex-shrink-0 relative"
      style={{ width: `${CONTAINER_W}px`, height: `${CARD_H}px` }}
    >
      {/* ── Big rank number — behind the card ── */}
      <div
        className="absolute select-none pointer-events-none"
        style={{
          bottom: -6,
          left: 0,
          fontSize: '100px',
          fontWeight: 900,
          lineHeight: 1,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: 'transparent',
          WebkitTextStroke: `3px ${rankStyle.color}`,
          textShadow: `0 0 28px ${rankStyle.glow}, 0 0 8px ${rankStyle.glow}`,
          zIndex: 0,
          overflow: 'hidden',
          letterSpacing: '-4px',
        }}
      >
        {rank}
      </div>

      {/* ── Card thumbnail ── */}
      <div
        onClick={() => setPreviewItem(contenido)}
        onTouchStart={(e) => {
          touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          setPressed(true);
        }}
        onTouchMove={(e) => {
          if (!touchStart.current) return;
          const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
          const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
          if (dx > 8 || dy > 8) setPressed(false);
        }}
        onTouchEnd={() => { setPressed(false); touchStart.current = null; }}
        onTouchCancel={() => { setPressed(false); touchStart.current = null; }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        className="absolute top-0 right-0 cursor-pointer select-none overflow-hidden"
        style={{
          width: `${CARD_W}px`,
          height: `${CARD_H}px`,
          borderRadius: '16px',
          border: pressed ? `1.5px solid ${c.from}70` : '1px solid rgba(255,255,255,0.09)',
          boxShadow: pressed
            ? `0 0 22px ${c.glow}, 0 0 44px ${c.from}30`
            : `0 8px 28px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)`,
          transform: pressed ? 'scale(0.93)' : 'scale(1)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          zIndex: 1,
          touchAction: 'manipulation',
        }}
      >
        <img
          src={contenido.imagen}
          alt={contenido.titulo}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.82, pointerEvents: 'none' }}
          draggable={false}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(3,3,9,0.95) 0%, rgba(3,3,9,0.2) 50%, transparent 100%)' }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-[2.5px] pointer-events-none"
          style={{ background: `linear-gradient(to right, ${c.from}, ${c.to})`, boxShadow: `0 0 6px ${c.glow}` }}
        />
        <div
          className="absolute top-2 left-2 flex items-center justify-center rounded-full pointer-events-none"
          style={{
            paddingInline: rank >= 10 ? '5px' : '6px',
            height: '16px',
            background: `${rankStyle.color}22`,
            border: `1px solid ${rankStyle.color}60`,
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="font-black leading-none" style={{ fontSize: '8px', color: rankStyle.color, letterSpacing: '0px' }}>
            #{rank}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2 pointer-events-none">
          <p className="text-white text-[9px] font-bold leading-tight line-clamp-2 text-left">
            {contenido.titulo}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────── Section Row ─────────── */
type RowVariant = 'portrait' | 'landscape' | 'top10';

export function ContentRow({
  titulo,
  subtitulo,
  contenido,
  variant = 'portrait',
  badge,
  onVerTodo,
  verTodoLabel = 'Ver todo',
}: {
  titulo: string;
  subtitulo?: string;
  contenido: Contenido[];
  variant?: RowVariant;
  badge?: string;
  onVerTodo?: () => void;
  verTodoLabel?: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 px-5 mb-3.5">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-sm" style={{ letterSpacing: '0.01em' }}>{titulo}</h3>
          {subtitulo && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{subtitulo}</p>
          )}
        </div>
        {badge && (
          <span className="text-[9px] font-black px-2 py-1 rounded-full" style={{ background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd' }}>
            {badge}
          </span>
        )}
        {onVerTodo && (
          <button
            onClick={onVerTodo}
            className="text-[11px] font-semibold px-3 py-1 rounded-full transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
          >
            {verTodoLabel}
          </button>
        )}
      </div>
      <HScrollRow gap={6} paddingX={20}>
        {variant === 'portrait'  && contenido.map((item, i) => <ContentCard  key={item.id} contenido={item} delay={i * 0.04} />)}
        {variant === 'landscape' && contenido.map((item, i) => <LandscapeCard key={item.id} contenido={item} delay={i * 0.04} />)}
        {variant === 'top10'     && contenido.map((item, i) => <Top10Card     key={item.id} contenido={item} rank={i + 1} delay={i * 0.04} />)}
      </HScrollRow>
    </div>
  );
}
