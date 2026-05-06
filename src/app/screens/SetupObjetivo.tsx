import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Target, Bell, BellOff, Check, Zap } from 'lucide-react';
import { AuroraBackground } from '../components/AuroraBackground';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

const LS_DAILY_GOAL = (userId: string) => `morix_daily_goal_${userId}`;

const METAS = [
  { minutos: 5,  label: '5 min',  emoji: '🌱', desc: 'Inicio suave',     color: '#10b981' },
  { minutos: 10, label: '10 min', emoji: '⚡', desc: 'Constante',         color: '#3b82f6' },
  { minutos: 15, label: '15 min', emoji: '🎯', desc: 'Recomendado',       color: '#8b5cf6', popular: true },
  { minutos: 20, label: '20 min', emoji: '🔥', desc: 'Comprometido',      color: '#f59e0b' },
  { minutos: 30, label: '30 min', emoji: '🚀', desc: 'Modo intenso',      color: '#ef4444' },
];

export default function SetupObjetivo() {
  const navigate = useNavigate();
  const { user, completeSetup } = useAuth();
  const { updateAppSettings } = useSettings();
  const [metaMin, setMetaMin] = useState(15);
  const [notifOn, setNotifOn] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleFinalizar = async () => {
    setLoading(true);

    // Guardar meta diaria en localStorage namespaceada por userId
    if (user?.id) {
      try {
        localStorage.setItem(LS_DAILY_GOAL(user.id), String(metaMin));
      } catch { /* ignore */ }
    }

    // Sincronizar preferencia de notificaciones al settings
    updateAppSettings({ notificaciones: notifOn });

    // Marcar setup como completado
    await completeSetup();

    navigate('/inicio', { replace: true });
  };

  const metaSeleccionada = METAS.find((m) => m.minutos === metaMin)!;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-y-auto no-scrollbar relative"
      style={{ background: '#030309' }}
    >
      <AuroraBackground intensity="medium" />

      <div className="relative z-10 px-5 pt-12 pb-10 flex flex-col min-h-full">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div key={s} className="h-1 rounded-full transition-all"
                style={{
                  width: s === 3 ? '20px' : '8px',
                  background: '#8b5cf6',
                  boxShadow: s === 3 ? '0 0 8px rgba(139,92,246,0.6)' : 'none',
                }} />
            ))}
          </div>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Paso 3 de 3</span>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="w-12 h-12 rounded-[16px] flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.15))', border: '1px solid rgba(139,92,246,0.3)' }}>
            <Target size={22} style={{ color: '#a78bfa' }} />
          </div>
          <h1 className="font-black mb-1.5" style={{
            fontSize: '26px',
            background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Tu meta diaria
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            ¿Cuánto tiempo quieres dedicar a crecer cada día?
          </p>
        </motion.div>

        {/* Meta selector */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-2.5 mb-8"
        >
          {METAS.map((m, i) => {
            const isSelected = metaMin === m.minutos;
            return (
              <motion.button
                key={m.minutos}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.05 }}
                onClick={() => setMetaMin(m.minutos)}
                className="relative flex items-center gap-4 px-4 py-3.5 rounded-[18px] transition-all active:scale-[0.98]"
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, ${m.color}18, ${m.color}08)`
                    : 'rgba(255,255,255,0.04)',
                  border: isSelected
                    ? `1.5px solid ${m.color}50`
                    : '1.5px solid rgba(255,255,255,0.07)',
                  boxShadow: isSelected ? `0 0 18px ${m.color}30` : 'none',
                }}
              >
                {/* Popular badge */}
                {m.popular && (
                  <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full text-[9px] font-black"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff', boxShadow: '0 0 8px rgba(139,92,246,0.5)' }}>
                    POPULAR
                  </div>
                )}

                {/* Emoji */}
                <span className="text-2xl w-8 flex-shrink-0">{m.emoji}</span>

                {/* Info */}
                <div className="flex-1 text-left">
                  <p className="font-black text-sm text-white">{m.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: isSelected ? m.color : 'rgba(255,255,255,0.35)' }}>
                    {m.desc}
                  </p>
                </div>

                {/* Check */}
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: isSelected ? `linear-gradient(135deg, ${m.color}, ${m.color}cc)` : 'rgba(255,255,255,0.07)',
                    border: isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
                    boxShadow: isSelected ? `0 0 10px ${m.color}60` : 'none',
                  }}>
                  {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Notificaciones */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8"
        >
          <p className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            RECORDATORIOS DIARIOS
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setNotifOn(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[16px] transition-all active:scale-95"
              style={{
                background: notifOn ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.1))' : 'rgba(255,255,255,0.04)',
                border: notifOn ? '1.5px solid rgba(139,92,246,0.45)' : '1.5px solid rgba(255,255,255,0.07)',
                boxShadow: notifOn ? '0 0 14px rgba(139,92,246,0.25)' : 'none',
              }}
            >
              <Bell size={15} style={{ color: notifOn ? '#a78bfa' : 'rgba(255,255,255,0.3)' }} />
              <span className="text-xs font-bold" style={{ color: notifOn ? '#a78bfa' : 'rgba(255,255,255,0.35)' }}>
                Sí, actívalos
              </span>
            </button>
            <button
              onClick={() => setNotifOn(false)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[16px] transition-all active:scale-95"
              style={{
                background: !notifOn ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
                border: !notifOn ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid rgba(255,255,255,0.07)',
              }}
            >
              <BellOff size={15} style={{ color: !notifOn ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)' }} />
              <span className="text-xs font-bold" style={{ color: !notifOn ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)' }}>
                No por ahora
              </span>
            </button>
          </div>
        </motion.div>

        {/* Summary card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="flex items-center gap-3 px-4 py-3.5 rounded-[16px] mb-8"
          style={{
            background: `linear-gradient(135deg, ${metaSeleccionada.color}10, rgba(139,92,246,0.05))`,
            border: `1px solid ${metaSeleccionada.color}25`,
          }}
        >
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ background: `${metaSeleccionada.color}20` }}>
            <Zap size={15} style={{ color: metaSeleccionada.color }} />
          </div>
          <div>
            <p className="text-xs font-black text-white">
              Meta: {metaMin} min/día · {notifOn ? 'con recordatorios' : 'sin recordatorios'}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Puedes cambiar esto en cualquier momento desde Perfil
            </p>
          </div>
        </motion.div>

        {/* CTA */}
        <div className="mt-auto">
          <motion.button
            onClick={handleFinalizar}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="relative w-full py-4 rounded-[20px] font-black text-sm tracking-wide overflow-hidden transition-all"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)',
              color: 'white',
              boxShadow: '0 0 28px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="block w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                />
                Preparando tu experiencia…
              </span>
            ) : (
              '¡Comenzar mi journey! 🚀'
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
