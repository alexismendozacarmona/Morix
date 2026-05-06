import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Crown, Check, Infinity as InfinityIcon, Download,
  Headphones, Sparkles, Zap, Shield, Star, Calendar,
} from 'lucide-react';
import { AuroraBackground } from '../components/AuroraBackground';
import { useT } from '../i18n/useT';
import { useAuth } from '../contexts/AuthContext';
import { usePlanAccess } from '../hooks/usePlanAccess';
import { BillingService } from '../services/billingService';

const BENEFIT_ICONS = [InfinityIcon, Crown, Download, Headphones, Sparkles, Zap, Shield];

/* ─── Trial countdown helper ─────────────────────────────────────────────────── */
function trialDaysLeft(trialStart: string | null): number | null {
  if (!trialStart) return null;
  const end = new Date(trialStart).getTime() + 7 * 24 * 60 * 60 * 1000;
  const diff = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export default function Suscripcion() {
  const navigate = useNavigate();
  const t  = useT();
  const ts = t.suscripcion;
  const { user } = useAuth();
  const { isUnlocked, plan } = usePlanAccess();

  const [planSeleccionado, setPlanSeleccionado] = useState<'mensual' | 'anual'>('anual');
  const [loading, setLoading]                 = useState(false);
  const { updatePlan }                        = useAuth();

  const daysLeft = trialDaysLeft(user?.trialStart ?? null);
  const isTrial  = plan === 'trial';
  const isPremium = plan === 'premium';

  /* ─── Planes con precios correctos ──────────────────────────────────────── */
  const planes = [
    {
      id:        'mensual' as const,
      label:     ts.mensual,
      precio:    '$4.99',
      perMes:    null,
      periodo:   ts.mes,
      ahorro:    null,
      highlight: false,
    },
    {
      id:        'anual' as const,
      label:     ts.anual,
      precio:    '$4.16',
      perMes:    null,
      periodo:   ts.mes,
      total:     '$49.90/año',
      ahorro:    ts.ahorra,
      highlight: true,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-y-auto no-scrollbar relative"
      style={{ background: '#030309' }}
    >
      <AuroraBackground intensity="high" />

      <div className="relative z-10 pt-12 px-5 pb-8">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-8 active:opacity-60 transition-opacity"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <ArrowLeft size={18} />
          <span className="text-sm">{ts.volver}</span>
        </button>

        {/* ── Estado actual: trial activo ───────────────────────────────── */}
        {isTrial && daysLeft !== null && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3.5 rounded-[18px] mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(139,92,246,0.08))',
              border:     '1px solid rgba(245,158,11,0.3)',
            }}
          >
            <div className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Calendar size={16} style={{ color: '#fbbf24' }} />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-bold" style={{ color: '#fde68a' }}>
                Prueba activa — {daysLeft} {daysLeft === 1 ? 'día' : 'días'} restantes
              </p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Acceso completo hasta que expire tu prueba gratuita
              </p>
            </div>
            <div className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
              <span className="text-[9px] font-black" style={{ color: '#4ade80' }}>ACTIVO</span>
            </div>
          </motion.div>
        )}

        {/* ── Estado: premium ───────────────────────────────────────────── */}
        {isPremium && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3.5 rounded-[18px] mb-6"
            style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)' }}
          >
            <Star size={18} style={{ color: '#a78bfa' }} fill="#a78bfa" />
            <div>
              <p className="text-[12px] font-bold" style={{ color: '#c4b5fd' }}>Eres suscriptor Premium</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Acceso ilimitado a todo el contenido Morix</p>
            </div>
          </motion.div>
        )}

        {/* Crown orb */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 180 }}
          className="flex flex-col items-center text-center mb-7"
        >
          <div className="relative mb-5">
            {[0, 0.8, 1.6].map((delay, i) => (
              <div
                key={i}
                className="pulse-ring absolute rounded-full"
                style={{ inset: 0, border: '1.5px solid rgba(245,158,11,0.35)', animationDelay: `${delay}s` }}
              />
            ))}
            <div
              className="relative w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background:  'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.4) 0%, #f59e0b 40%, #b45309 100%)',
                boxShadow:   '0 0 40px rgba(245,158,11,0.7), 0 0 80px rgba(245,158,11,0.3)',
                border:      '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <div
                className="absolute rounded-full"
                style={{ top: '12px', left: '16px', width: '18px', height: '12px', background: 'radial-gradient(circle, rgba(255,255,255,0.5), transparent)', filter: 'blur(2px)' }}
              />
              <Crown size={32} className="text-white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} />
            </div>
          </div>

          <h1 className="font-black mb-1" style={{
            fontSize:   '28px',
            background: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 50%, #d97706 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Morix Premium
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{ts.subtitulo}</p>
        </motion.div>

        {/* ── Plan selector ─────────────────────────────────────────────── */}
        {!isPremium && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-2 gap-3 mb-4"
            >
              {planes.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setPlanSeleccionado(plan.id)}
                  className="relative rounded-[22px] p-4 text-left active:scale-[0.97] transition-transform overflow-hidden"
                  style={{
                    background: planSeleccionado === plan.id
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(139,92,246,0.12))'
                      : 'rgba(255,255,255,0.04)',
                    border: planSeleccionado === plan.id
                      ? '1.5px solid rgba(245,158,11,0.45)'
                      : '1.5px solid rgba(255,255,255,0.08)',
                    boxShadow: planSeleccionado === plan.id ? '0 0 30px rgba(245,158,11,0.1)' : 'none',
                  }}
                >
                  {planSeleccionado === plan.id && (
                    <div className="absolute -top-[1px] left-0 right-0 h-[2px] rounded-t-[22px]"
                      style={{ background: 'linear-gradient(to right, transparent, #f59e0b, transparent)' }} />
                  )}

                  {plan.ahorro && (
                    <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-full"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                      <span className="text-[8px] font-black text-white">{plan.ahorro}</span>
                    </div>
                  )}

                  <p className="text-[10px] font-black tracking-wide mb-2"
                    style={{ color: planSeleccionado === plan.id ? '#fbbf24' : 'rgba(255,255,255,0.5)' }}>
                    {plan.label}
                  </p>

                  <div className="flex items-end gap-1">
                    <span className="font-black" style={{ fontSize: '26px', lineHeight: 1, color: planSeleccionado === plan.id ? '#fde68a' : 'white' }}>
                      {plan.precio}
                    </span>
                    <span className="text-[10px] mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {plan.periodo}
                    </span>
                  </div>

                  {plan.id === 'anual' && (
                    <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      $49.90/año · ahorras $9.98
                    </p>
                  )}
                  {plan.id === 'mensual' && (
                    <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Facturado mensualmente
                    </p>
                  )}
                </button>
              ))}
            </motion.div>

            {/* Price comparison note */}
            <AnimatePresence mode="wait">
              <motion.div
                key={planSeleccionado}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 mb-5"
              >
                {planSeleccionado === 'anual' ? (
                  <>
                    <div className="h-px flex-1" style={{ background: 'rgba(245,158,11,0.2)' }} />
                    <span className="text-[10px] font-bold" style={{ color: 'rgba(245,158,11,0.7)' }}>
                      Obtén 12 meses por el precio de 10 🎉
                    </span>
                    <div className="h-px flex-1" style={{ background: 'rgba(245,158,11,0.2)' }} />
                  </>
                ) : (
                  <>
                    <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      Cambia a anual y ahorra 2 meses gratis
                    </span>
                    <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}

        {/* Free trial badge */}
        {!isPremium && !isTrial && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-[16px] mb-6 w-full"
            style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.22)' }}
          >
            <Sparkles size={13} style={{ color: '#a78bfa' }} />
            <span className="text-xs font-bold" style={{ color: '#c4b5fd' }}>{ts.prueba_gratis}</span>
          </motion.div>
        )}

        {/* Benefits */}
        <p className="text-[10px] font-black tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {ts.incluye}
        </p>
        <div className="space-y-3 mb-7">
          {ts.beneficios.map((text, i) => {
            const Icon = BENEFIT_ICONS[i] ?? Sparkles;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                className="flex items-center gap-3"
              >
                <div
                  className="w-9 h-9 rounded-[13px] flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(139,92,246,0.1))',
                    border:     '1px solid rgba(245,158,11,0.18)',
                  }}
                >
                  <Icon size={15} style={{ color: '#f59e0b' }} />
                </div>
                <span className="text-sm flex-1" style={{ color: 'rgba(255,255,255,0.8)' }}>{text}</span>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  <Check size={10} style={{ color: '#22c55e' }} strokeWidth={3} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── CTAs ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          {!isPremium && !isTrial && (
            <>
              <button
                onClick={async () => {
                  setLoading(true);
                  // 1. Iniciar compra nativa (Google/Apple)
                  const success = await BillingService.purchasePlan(planSeleccionado);
                  if (success) {
                    // 2. Si el pago fue exitoso, actualizar Localmente/Supabase
                    await updatePlan('premium');
                  }
                  setLoading(false);
                }}
                disabled={loading}
                className="relative w-full py-4 rounded-[22px] font-black text-white text-sm tracking-wide overflow-hidden active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
                style={{
                  background:  'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
                  boxShadow:   '0 0 30px rgba(245,158,11,0.55), 0 0 60px rgba(245,158,11,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
                  opacity:     loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <span>{ts.cta_prueba}</span>
                    <span className="ml-2" style={{ opacity: 0.7 }}>· 7 días gratis</span>
                  </>
                )}
              </button>

              <button
                onClick={() => navigate('/inicio')}
                className="w-full py-4 rounded-[22px] text-sm font-semibold active:scale-[0.97] transition-transform"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border:     '1px solid rgba(255,255,255,0.08)',
                  color:      'rgba(255,255,255,0.35)',
                }}
              >
                {ts.cta_free}
              </button>
            </>
          )}

          {(isTrial || isPremium) && (
            <button
              onClick={() => navigate(-1)}
              className="w-full py-4 rounded-[22px] text-sm font-semibold active:scale-[0.97] transition-transform"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.12))',
                border:     '1px solid rgba(139,92,246,0.3)',
                color:      '#a78bfa',
              }}
            >
              Volver al inicio
            </button>
          )}

          <p className="text-center text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.18)' }}>
            {ts.legal}
          </p>

          <button
            onClick={async () => {
              setLoading(true);
              const success = await BillingService.restorePurchases();
              if (success) {
                await updatePlan('premium');
                alert('¡Suscripción restaurada con éxito! 🎉');
              } else {
                alert('No se encontraron suscripciones previas vinculadas a esta cuenta de la tienda.');
              }
              setLoading(false);
            }}
            disabled={loading}
            className="w-full py-2 text-[10px] font-bold tracking-widest active:opacity-50 transition-opacity uppercase mb-6"
            style={{ color: 'rgba(255,255,255,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}
          >
            {loading ? 'Verificando...' : 'Restaurar compras'}
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
