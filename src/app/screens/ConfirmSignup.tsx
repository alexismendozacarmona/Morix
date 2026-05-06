import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuroraBackground } from '../components/AuroraBackground';

export default function ConfirmSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      navigate('/registro', { replace: true });
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [email, navigate]);

  const startCooldown = () => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = char;
    setOtp(next);
    setError('');
    if (char && index < 7) otpRefs.current[index + 1]?.focus();
    if (char && index === 7) {
      const full = [...next].join('');
      if (full.length === 8) setTimeout(() => verifyCode(full), 80);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (code = otp.join('')) => {
    if (code.length < 8) {
      setError('Ingresa los 8 dígitos.');
      return;
    }
    const trimmed = email.trim().toLowerCase();

    setLoading(true);
    const { error: authErr } = await supabase.auth.verifyOtp({
      email: trimmed,
      token: code,
      type: 'signup',
    });

    if (authErr) {
      setLoading(false);
      setError('Código incorrecto o expirado. Solicita uno nuevo.');
      setOtp(['', '', '', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      return;
    }

    setLoading(false);
    navigate('/setup-perfil', { replace: true });
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setOtp(['', '', '', '', '', '', '', '']);
    const trimmed = email.trim().toLowerCase();

    setLoading(true);
    const { error: authErr } = await supabase.auth.resend({ type: 'signup', email: trimmed });
    setLoading(false);

    if (authErr) {
      setError('Error al reenviar el código. Intenta de nuevo.');
      return;
    }

    startCooldown();
    otpRefs.current[0]?.focus();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: '#030309' }}
    >
      <AuroraBackground intensity="medium" />

      <div className="relative z-10 flex flex-col h-full px-6 pt-14 pb-10 overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 active:opacity-60 transition-opacity"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Volver</span>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col flex-1"
        >
          <div className="mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              <span style={{ fontSize: 24 }}>📨</span>
            </div>
            <h2 className="font-black mb-2" style={{ fontSize: '22px', color: 'white' }}>
              Confirma tu correo
            </h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Enviamos un código de 8 dígitos a{' '}
              <span style={{ color: '#a78bfa' }}>{email}</span>
            </p>
          </div>

          <div className="flex gap-2 justify-center mb-6">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  otpRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
                  if (text.length === 8) {
                    e.preventDefault();
                    setOtp(text.split(''));
                    setTimeout(() => verifyCode(text), 80);
                  }
                }}
                className="text-center font-black text-lg rounded-[14px] outline-none transition-all"
                style={{
                  width: 36,
                  height: 48,
                  background: digit ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
                  border: digit ? '1.5px solid rgba(139,92,246,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
                  color: 'white',
                  boxShadow: digit ? '0 0 10px rgba(139,92,246,0.2)' : 'none',
                }}
              />
            ))}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-[14px] mb-4"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <AlertCircle size={15} style={{ color: '#f87171', flexShrink: 0 }} />
                <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-center gap-1 mb-6">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              ¿No recibiste el código?
            </span>
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || loading}
              className="text-xs font-bold flex items-center gap-1 transition-opacity"
              style={{
                color: resendCooldown > 0 ? 'rgba(255,255,255,0.25)' : '#a78bfa',
                cursor: resendCooldown > 0 ? 'default' : 'pointer',
              }}
            >
              <RefreshCw size={11} />
              {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar'}
            </button>
          </div>

          <div className="mt-auto">
            <motion.button
              onClick={() => verifyCode()}
              disabled={loading || otp.join('').length < 8}
              whileTap={{ scale: otp.join('').length === 8 ? 0.97 : 1 }}
              className="w-full py-4 rounded-[20px] font-black text-sm tracking-wide transition-all flex items-center justify-center"
              style={{
                background: otp.join('').length === 8
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)'
                  : 'rgba(255,255,255,0.07)',
                color: otp.join('').length === 8 ? 'white' : 'rgba(255,255,255,0.3)',
                boxShadow: otp.join('').length === 8 ? '0 0 28px rgba(139,92,246,0.45)' : 'none',
              }}
            >
              {loading ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="block w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                />
              ) : (
                'Verificar cuenta'
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
