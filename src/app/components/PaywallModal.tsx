import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { Crown, Lock, Zap, Check, X } from 'lucide-react';
import { useT } from '../i18n/useT';

interface PaywallModalProps {
  open:    boolean;
  onClose: () => void;
  videoTitle?: string;
}

export function PaywallModal({ open, onClose, videoTitle }: PaywallModalProps) {
  const navigate = useNavigate();
  const t = useT();
  const pw = t.paywall;
  const portal = document.getElementById('phone-frame');
  if (!portal) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200]"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-[201] overflow-hidden"
            style={{
              borderRadius: '32px 32px 0 0',
              background: 'linear-gradient(180deg, #100c28 0%, #06040f 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(to right, transparent, #f59e0b, #a78bfa, transparent)' }} />

            <button onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10 active:scale-90 transition-transform"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <X size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>

            <div className="px-6 pt-8 pb-10">
              {/* Crown orb */}
              <div className="flex justify-center mb-5">
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                  className="w-20 h-20 rounded-full flex items-center justify-center relative"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(167,139,250,0.2) 100%)',
                    border: '1.5px solid rgba(245,158,11,0.4)',
                    boxShadow: '0 0 40px rgba(245,158,11,0.25), 0 0 80px rgba(167,139,250,0.15)',
                  }}
                >
                  <Crown size={34} style={{ color: '#f59e0b' }} />
                  <div className="absolute inset-[-6px] rounded-full pointer-events-none"
                    style={{ border: '1px solid rgba(245,158,11,0.15)', animation: 'spin 8s linear infinite' }} />
                </motion.div>
              </div>

              {/* Badge */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <Lock size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-xs font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {pw.badge}
                </span>
              </div>

              <h2 className="text-white text-center leading-tight mb-2" style={{ fontSize: '22px', fontWeight: 900 }}>
                {pw.titulo}<br />
                <span style={{ background: 'linear-gradient(90deg,#f59e0b,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Morix Premium
                </span>
              </h2>

              {videoTitle && videoTitle.trim().length > 1 ? (
                <p className="text-center text-sm mb-5 px-4" style={{ color: 'rgba(255,255,255,0.42)' }}>
                  «{videoTitle}» {pw.solo_disponible}
                </p>
              ) : (
                <p className="text-center text-sm mb-5 px-4" style={{ color: 'rgba(255,255,255,0.42)' }}>
                  {pw.desc_generica}
                </p>
              )}
              {!videoTitle && (
                <p className="text-center text-sm mb-5" style={{ color: 'rgba(255,255,255,0.42)' }}>
                  {pw.desc_generica}<br />{pw.desc_upgrade}
                </p>
              )}

              {/* Perks */}
              <div className="space-y-2.5 mb-6">
                {pw.perks.map((perk) => (
                  <div key={perk} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.35)' }}>
                      <Check size={10} style={{ color: '#f59e0b' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>{perk}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => { onClose(); navigate('/suscripcion'); }}
                className="w-full py-4 rounded-[20px] font-black text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-transform mb-3"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #a78bfa 100%)',
                  boxShadow: '0 0 28px rgba(245,158,11,0.4), 0 0 60px rgba(167,139,250,0.2), inset 0 1px 0 rgba(255,255,255,0.25)',
                  fontSize: '15px',
                }}
              >
                <Zap size={16} fill="white" strokeWidth={0} />
                {pw.cta}
              </button>
              <button onClick={onClose}
                className="w-full py-3 rounded-[16px] text-sm font-semibold active:opacity-70 transition-opacity"
                style={{ color: 'rgba(255,255,255,0.35)' }}>
                {pw.ahora_no}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}