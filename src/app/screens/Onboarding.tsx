import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { IMGS } from '../data/mockData';
import { AuroraBackground } from '../components/AuroraBackground';
import { useT } from '../i18n/useT';
import { LegalModal } from '../components/LegalModal';

const EMOJIS = ['🧘', '📚', '👻', '⚡', '💎', '📖'];

export default function Onboarding() {
  const navigate = useNavigate();
  const t = useT();
  const to = t.onboarding;
  const [legalType, setLegalType] = useState<'terms' | 'privacy' | null>(null);

  return (
    <div className="h-full flex flex-col overflow-y-auto no-scrollbar relative" style={{ background: '#030309' }}>
      <div className="absolute inset-0">
        <img src={IMGS.galaxia} alt="" className="w-full h-full object-cover" style={{ opacity: 0.2 }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(3,3,9,0.2) 0%, rgba(3,3,9,0.5) 35%, rgba(3,3,9,0.92) 65%, #030309 82%)' }} />
      </div>

      <AuroraBackground intensity="high" />

      <div className="relative z-10 flex flex-col items-center px-6 pt-10 pb-10 min-h-full">
        {/* MASCOT VIDEO — reemplaza el orbo morado */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 160, delay: 0.1 }}
          className="relative mb-2 flex items-center justify-center"
          style={{ width: '280px', height: '130px' }}
        >
          {/* Halo de glow pulsante detrás de la mascota */}
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(99,102,241,0.25) 50%, transparent 75%)',
              filter: 'blur(24px)',
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Anillos orbitales decorativos */}
          {[0, 0.9, 1.8].map((delay, i) => (
            <div key={i} className="pulse-ring absolute rounded-full"
              style={{ inset: 0, border: '1.5px solid rgba(139,92,246,0.3)', animationDelay: `${delay}s` }} />
          ))}
          {/* Video mascota con transparencia */}
          <img
            src="/morix-logo.png"
            alt="Morix"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              background: 'transparent',
              filter: 'drop-shadow(0 0 18px rgba(139,92,246,0.8)) drop-shadow(0 0 36px rgba(99,102,241,0.5))',
              position: 'relative',
              zIndex: 1,
              transform: 'scale(2.5)',
            }}
          />
        </motion.div>


        {/* TAGLINE */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.6 }} className="text-center mb-5">
          <p className="font-black leading-tight mb-2" style={{ fontSize: '26px', background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 40%, #93c5fd 80%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {to.tagline1}<br />{to.tagline2}
          </p>
          <p className="text-sm leading-relaxed max-w-[280px] mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {to.tagline_sub}
          </p>
        </motion.div>

        {/* FEATURE PILLS */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="w-full mb-5">
          <div className="flex flex-wrap justify-center gap-2">
            {to.features.map((label: string, i: number) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.06 }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(12px)' }}
              >
                <span style={{ fontSize: '13px' }}>{EMOJIS[i]}</span>
                <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.8)' }}>{label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }} className="w-full space-y-3 mt-auto">
          <button
            onClick={() => navigate('/registro')}
            className="relative w-full py-4 rounded-[20px] text-white font-bold text-sm tracking-wide overflow-hidden active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)', boxShadow: '0 0 30px rgba(139,92,246,0.55), 0 0 60px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.18)' }}
          >
            {to.comenzar}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 rounded-[20px] font-semibold text-sm tracking-wide active:scale-[0.97] transition-transform"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
          >
            {to.ya_cuenta}
          </button>
          <p className="text-[10px] text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Al continuar aceptas los{' '}
            <button onClick={() => setLegalType('terms')} className="font-bold underline decoration-[rgba(255,255,255,0.2)] underline-offset-2 active:opacity-60 transition-opacity">Términos</button>
            {' '}y la{' '}
            <button onClick={() => setLegalType('privacy')} className="font-bold underline decoration-[rgba(255,255,255,0.2)] underline-offset-2 active:opacity-60 transition-opacity">Política de Privacidad</button>
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {legalType && (
          <LegalModal type={legalType} onClose={() => setLegalType(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}