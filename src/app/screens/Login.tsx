import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { AuroraBackground } from '../components/AuroraBackground';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../i18n/useT';
import { ForgotPasswordFlow } from '../components/ForgotPasswordFlow';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const t = useT();
  const tl = t.login;

  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [showForgot, setShowForgot]   = useState(false);

  const canSubmit = email.trim().length > 0 && password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    const result = await login(email, password);
    setLoading(false);

    if (result.ok) {
      navigate('/inicio', { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-y-auto no-scrollbar relative"
      style={{ background: '#030309' }}
    >
      <AuroraBackground intensity="medium" />

      <div className="relative z-10 px-6 pt-14 pb-10 flex flex-col min-h-full">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-10 w-fit active:opacity-60 transition-opacity"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Volver</span>
        </button>

        {/* Logo orb */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, delay: 0.05 }}
          className="flex flex-col items-center mb-8"
        >
          {/* Mascota Menty */}
          <div className="relative flex items-center justify-center mb-2" style={{ width: 280, height: 130 }}>
            {/* Glow detrás */}
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(99,102,241,0.2) 50%, transparent 75%)',
                filter: 'blur(20px)',
              }}
              animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <img
              src="/morix-logo.png"
              alt="Morix"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: 'transparent',
                filter: 'drop-shadow(0 0 16px rgba(139,92,246,0.8)) drop-shadow(0 0 32px rgba(99,102,241,0.5))',
                position: 'relative',
                zIndex: 1,
                transform: 'scale(2.5)',
              }}
            />
          </div>
          <h1 className="font-black" style={{ fontSize: '28px', background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {tl.bienvenido}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {tl.subtitle}
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="flex-1 flex flex-col gap-4"
          noValidate
        >
          {/* Email */}
          <div>
            <label className="text-xs font-bold mb-2 block" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {tl.email_label}
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder={tl.email_ph}
                autoComplete="email"
                className="w-full py-3.5 pl-11 pr-4 rounded-[16px] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: error ? '1.5px solid rgba(239,68,68,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-bold mb-2 block" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {tl.pass_label}
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder={tl.pass_ph}
                autoComplete="current-password"
                className="w-full py-3.5 pl-11 pr-12 rounded-[16px] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: error ? '1.5px solid rgba(239,68,68,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
                }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-4 top-1/2 -translate-y-1/2 active:opacity-60">
                {showPw
                  ? <EyeOff size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  : <Eye size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                }
              </button>
            </div>
          </div>

          {/* Forgot link */}
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="text-right text-xs active:opacity-60"
            style={{ color: '#a78bfa' }}
          >
            {tl.olvide}
          </button>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-[14px]"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <AlertCircle size={15} style={{ color: '#f87171', flexShrink: 0 }} />
                <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-auto pt-6 space-y-3">
            <motion.button
              type="submit"
              disabled={!canSubmit || loading}
              whileTap={{ scale: canSubmit ? 0.97 : 1 }}
              className="relative w-full py-4 rounded-[20px] font-black text-sm tracking-wide overflow-hidden transition-all"
              style={{
                background: canSubmit
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)'
                  : 'rgba(255,255,255,0.07)',
                color: canSubmit ? 'white' : 'rgba(255,255,255,0.3)',
                boxShadow: canSubmit ? '0 0 28px rgba(139,92,246,0.5)' : 'none',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="block w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                  />
                  {tl.cargando}
                </span>
              ) : (
                tl.btn
              )}
            </motion.button>

            <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {tl.no_cuenta}{' '}
              <button type="button" onClick={() => navigate('/registro')}
                className="font-bold active:opacity-70" style={{ color: '#a78bfa' }}>
                {tl.registrate}
              </button>
            </p>
          </div>
        </motion.form>
      </div>

      {/* Flujo de recuperación de contraseña */}
      <AnimatePresence>
        {showForgot && (
          <ForgotPasswordFlow onClose={() => setShowForgot(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}