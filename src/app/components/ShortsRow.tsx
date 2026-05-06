import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Play, Zap } from 'lucide-react';
import type { Short } from '../data/shortsData';
import { HScrollRow } from './HScrollRow';
import { useAdminContent } from '../contexts/AdminContentContext';

const TAG_COLORS: Record<string, string> = {
  'MEDITACIÓN & SONIDOS':  '#10b981',
  'LIBROS & RESÚMENES':    '#3b82f6',
  'TERROR & MISTERIOS':    '#8b5cf6',
  'DATOS & VERDADES':      '#f59e0b',
};

export function ShortsRow() {
  const navigate = useNavigate();
  const { shorts } = useAdminContent();

  // No renderizar nada hasta que haya al menos un short subido por el admin
  if (shorts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }} className="mt-6 mb-1"
    >
      {/* Section header */}
      <div className="flex items-center justify-between px-5 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', boxShadow: '0 0 14px rgba(236,72,153,0.5)' }}>
            <Zap size={13} className="text-white" />
          </div>
          <div>
            <p className="text-white font-black text-sm tracking-wide">Morix Shorts</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Conocimiento en menos de 1 minuto
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/shorts')}
          className="text-[11px] font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)' }}
        >
          Ver todos
        </button>
      </div>

      {/* Thumbnails horizontal scroll */}
      <HScrollRow gap={10} paddingX={20}>
        {shorts.map((short: Short, i: number) => (
          <motion.button
            key={short.id}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * i }}
            onClick={() => navigate('/shorts', { state: { startIndex: i } })}
            className="flex-shrink-0 relative rounded-[16px] overflow-hidden active:scale-95 transition-transform"
            style={{ width: 110, height: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}
          >
            {/* Thumbnail */}
            <img
              src={short.thumbnail}
              alt={short.titulo}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.1) 100%)'
            }} />

            {/* Border */}
            <div className="absolute inset-0 rounded-[16px]" style={{
              border: '1px solid rgba(255,255,255,0.12)'
            }} />

            {/* Tag — oculto, shorts no tienen categorías por ahora */}

            {/* Duration badge */}
            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
              <span className="text-[9px] font-bold text-white">{short.duracionSeg}s</span>
            </div>

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.35)' }}>
                <Play size={14} className="text-white" style={{ marginLeft: 2 }} />
              </div>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="text-white text-[10px] font-bold leading-tight line-clamp-2">
                {short.titulo}
              </p>
            </div>
          </motion.button>
        ))}
      </HScrollRow>
    </motion.div>
  );
}