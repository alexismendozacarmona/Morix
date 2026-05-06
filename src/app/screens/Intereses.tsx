import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Check } from 'lucide-react';
import { AuroraBackground } from '../components/AuroraBackground';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../i18n/useT';

/**
 * Los labels DEBEN coincidir exactamente con los valores de CATEGORIAS_VIDEO
 * en adminConfig.ts para que el filtrado de contenido funcione de verdad.
 */
const CATEGORIAS = [
  { label: 'Meditación & Sonidos',    emoji: '🧘', from: '#8b5cf6', to: '#6366f1', glow: 'rgba(139,92,246,0.4)' },
  { label: 'Libros & Resúmenes',      emoji: '📚', from: '#0891b2', to: '#3b82f6', glow: 'rgba(8,145,178,0.4)'  },
  { label: 'Terror & Misterios',      emoji: '👻', from: '#9f1239', to: '#be123c', glow: 'rgba(159,18,57,0.4)'  },
  { label: 'Datos & Verdades',        emoji: '📊', from: '#475569', to: '#64748b', glow: 'rgba(71,85,105,0.4)'  },
];

export default function Intereses() {
  const navigate = useNavigate();
  const { updateInterests } = useAuth();
  const t = useT();
  const ti = t.intereses;

  // Guardamos los LABELS (nombres de categoría) no IDs numéricos
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  const toggle = (label: string) => {
    setSeleccionados((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  };

  const handleContinuar = async () => {
    if (seleccionados.length === 0) return;
    await updateInterests(seleccionados);
    navigate('/setup-objetivo', { replace: true });
  };

  const handleSaltar = async () => {
    // Saltar = sin intereses definidos, igual avanza al paso 3
    navigate('/setup-objetivo', { replace: true });
  };

  return (
    <div
      className="h-full flex flex-col overflow-y-auto no-scrollbar relative px-5 pt-12 pb-8"
      style={{ background: '#030309' }}
    >
      <AuroraBackground intensity="low" />

      <div className="relative z-10 flex flex-col h-full">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 w-fit active:opacity-60 transition-opacity"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Volver</span>
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div key={s} className="h-1 rounded-full transition-all"
                style={{
                  width: s === 2 ? '20px' : '8px',
                  background: s <= 2 ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                  boxShadow: s === 2 ? '0 0 8px rgba(139,92,246,0.6)' : 'none',
                }} />
            ))}
          </div>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Paso 2 de 3</span>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1
            className="font-black mb-2"
            style={{
              fontSize: '26px',
              background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 60%, #93c5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {ti.titulo}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {ti.subtitle}
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {CATEGORIAS.map((cat, i) => {
            const isSelected = seleccionados.includes(cat.label);
            return (
              <motion.button
                key={cat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => toggle(cat.label)}
                className="relative rounded-[22px] p-4 text-left transition-all duration-200 active:scale-[0.96]"
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, ${cat.from}22, ${cat.to}15)`
                    : 'rgba(255,255,255,0.04)',
                  border: isSelected
                    ? `1.5px solid ${cat.from}55`
                    : '1.5px solid rgba(255,255,255,0.07)',
                  boxShadow: isSelected ? `0 0 20px ${cat.glow}` : 'none',
                }}
              >
                {/* Check mark */}
                {isSelected && (
                  <div
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${cat.from}, ${cat.to})`,
                      boxShadow: `0 0 10px ${cat.glow}`,
                    }}
                  >
                    <Check size={10} className="text-white" strokeWidth={3} />
                  </div>
                )}

                <div className="text-2xl mb-2">{cat.emoji}</div>
                <p
                  className="text-xs font-semibold leading-snug"
                  style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.65)' }}
                >
                  {cat.label}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Counter */}
        <p className="text-center text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {seleccionados.length === 0
            ? 'Selecciona al menos un tema'
            : `${seleccionados.length} tema${seleccionados.length > 1 ? 's' : ''} seleccionado${seleccionados.length > 1 ? 's' : ''}`}
        </p>

        {/* CTAs */}
        <div className="mt-auto space-y-3">
          <motion.button
            onClick={handleContinuar}
            disabled={seleccionados.length === 0}
            whileTap={{ scale: seleccionados.length > 0 ? 0.97 : 1 }}
            className="relative w-full py-4 rounded-[20px] text-white font-bold text-sm tracking-wide overflow-hidden transition-all duration-150 disabled:opacity-30"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1, #4f46e5)',
              boxShadow:
                seleccionados.length > 0
                  ? '0 0 30px rgba(139,92,246,0.5), 0 0 60px rgba(139,92,246,0.2)'
                  : 'none',
            }}
          >
            {ti.continuar}
          </motion.button>
          <button
            onClick={handleSaltar}
            className="w-full py-3 text-sm"
            style={{ color: 'rgba(255,255,255,0.28)' }}
          >
            Saltar por ahora
          </button>
        </div>
      </div>
    </div>
  );
}