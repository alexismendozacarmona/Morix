import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Check, ArrowLeft, Sparkles, Crown } from 'lucide-react';
import { AuroraBackground } from '../components/AuroraBackground';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../i18n/useT';
import { LegalModal } from '../components/LegalModal';

/* ─── Password strength ──────────────────────────────────────────────────── */
function getPasswordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: '', color: '' };
  if (pw.length < 6)   return { level: 1, label: 'Muy corta', color: '#ef4444' };
  const hasNum = /\d/.test(pw);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  if (pw.length >= 8 && hasNum && (hasSpecial || hasUpper)) {
    return { level: 3, label: 'Segura', color: '#22c55e' };
  }
  if (pw.length >= 8 && hasNum) return { level: 2, label: 'Media', color: '#f59e0b' };
  return { level: 1, label: 'Débil', color: '#ef4444' };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function Registro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const t = useT();
  const tr = t.registro;

  const planParam = searchParams.get('plan') ?? 'free';
  const isTrial   = planParam === 'trial';
  const planLabel = isTrial ? 'Premium (7 días gratis)' : 'Plan Gratuito';

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [terms, setTerms]           = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [touched, setTouched]       = useState({ email: false, password: false, confirm: false });
  const [legalType, setLegalType]   = useState<'terms' | 'privacy' | null>(null);

  const strength   = getPasswordStrength(password);
  const emailValid = validateEmail(email);
  const pwMatch    = password === confirm && confirm.length > 0;
  const canSubmit  = emailValid && strength.level >= 2 && pwMatch && terms;

  // Clear server-level error on any change
  useEffect(() => { setError(''); }, [email, password, confirm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true, confirm: true });
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    const result = await register(email, password, isTrial ? 'trial' : 'free');
    setLoading(false);

    if (result.ok) {
      if (result.needsEmailVerification) {
        navigate(`/confirmar-cuenta?email=${encodeURIComponent(email)}`, { replace: true });
      } else {
        navigate('/setup-perfil', { replace: true });
      }
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
          className="flex items-center gap-2 mb-8 w-fit active:opacity-60 transition-opacity"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Volver</span>
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          {/* Plan badge */}
          {isTrial ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-4"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Crown size={12} style={{ color: '#f59e0b' }} />
              <span className="text-xs font-bold" style={{ color: '#fbbf24' }}>7 días Premium gratis</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-4"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>
              <Sparkles size={12} style={{ color: '#a78bfa' }} />
              <span className="text-xs font-bold" style={{ color: '#a78bfa' }}>{planLabel}</span>
            </div>
          )}
          <h1 className="font-black mb-1.5" style={{
            fontSize: '28px',
            background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Crea tu cuenta
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Comienza tu viaje de crecimiento personal
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 flex flex-col gap-4"
          noValidate
        >
          {/* Email */}
          <div>
            <label className="text-xs font-bold mb-2 block" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {tr.email_label}
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder={tr.email_ph}
                autoComplete="email"
                className="w-full py-3.5 pl-11 pr-4 rounded-[16px] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: touched.email && !emailValid && email
                    ? '1.5px solid rgba(239,68,68,0.6)'
                    : touched.email && emailValid
                    ? '1.5px solid rgba(34,197,94,0.5)'
                    : '1.5px solid rgba(255,255,255,0.08)',
                }}
              />
              {touched.email && emailValid && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.2)' }}>
                  <Check size={11} style={{ color: '#22c55e' }} strokeWidth={3} />
                </div>
              )}
            </div>
            {touched.email && !emailValid && email && (
              <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: '#ef4444' }}>
                <AlertCircle size={11} />{tr.email_error}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-bold mb-2 block" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {tr.pass_label}
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                className="w-full py-3.5 pl-11 pr-12 rounded-[16px] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: touched.password && password && strength.level < 2
                    ? '1.5px solid rgba(239,68,68,0.6)'
                    : touched.password && strength.level >= 2
                    ? `1.5px solid ${strength.color}80`
                    : '1.5px solid rgba(255,255,255,0.08)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-4 top-1/2 -translate-y-1/2 active:opacity-60 transition-opacity"
              >
                {showPw
                  ? <EyeOff size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  : <Eye size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                }
              </button>
            </div>
            {/* Strength bar */}
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3].map((lvl) => (
                    <div key={lvl} className="flex-1 h-1 rounded-full transition-all duration-300"
                      style={{
                        background: strength.level >= lvl ? strength.color : 'rgba(255,255,255,0.08)',
                        boxShadow: strength.level >= lvl ? `0 0 6px ${strength.color}` : 'none',
                      }}
                    />
                  ))}
                </div>
                <p className="text-[11px]" style={{ color: strength.color }}>{strength.label}</p>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="text-xs font-bold mb-2 block" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {tr.confirm_label}
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                placeholder={tr.confirm_ph}
                autoComplete="new-password"
                className="w-full py-3.5 pl-11 pr-12 rounded-[16px] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: touched.confirm && confirm && !pwMatch
                    ? '1.5px solid rgba(239,68,68,0.6)'
                    : touched.confirm && pwMatch
                    ? '1.5px solid rgba(34,197,94,0.5)'
                    : '1.5px solid rgba(255,255,255,0.08)',
                }}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 active:opacity-60">
                {showConfirm
                  ? <EyeOff size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  : <Eye size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                }
              </button>
            </div>
            {touched.confirm && confirm && !pwMatch && (
              <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: '#ef4444' }}>
                <AlertCircle size={11} />{tr.confirm_error}
              </p>
            )}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <div
              onClick={() => setTerms(!terms)}
              className="flex-shrink-0 w-5 h-5 rounded-[7px] flex items-center justify-center mt-0.5 transition-all"
              style={{
                background: terms ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'rgba(255,255,255,0.07)',
                border: terms ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
                boxShadow: terms ? '0 0 12px rgba(139,92,246,0.5)' : 'none',
              }}
            >
              {terms && <Check size={11} className="text-white" strokeWidth={3} />}
            </div>
            <span className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Acepto los{' '}
              <button type="button" onClick={() => setLegalType('terms')} className="font-bold underline decoration-[rgba(167,139,250,0.5)] underline-offset-2 active:opacity-60 transition-opacity" style={{ color: '#a78bfa' }}>Términos de Servicio</button>{' '}y la{' '}
              <button type="button" onClick={() => setLegalType('privacy')} className="font-bold underline decoration-[rgba(167,139,250,0.5)] underline-offset-2 active:opacity-60 transition-opacity" style={{ color: '#a78bfa' }}>Política de Privacidad</button>
            </span>
          </label>

          {/* Server error */}
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
                {(error.includes('iniciar sesión') || error.includes('sign in')) && (
                  <button type="button" onClick={() => navigate('/login')}
                    className="ml-auto text-xs font-bold whitespace-nowrap" style={{ color: '#a78bfa' }}>
                    {tr.inicia}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-auto pt-4 space-y-3">
            {/* CTA */}
            <motion.button
              type="submit"
              disabled={!canSubmit || loading}
              whileTap={{ scale: canSubmit ? 0.97 : 1 }}
              className="relative w-full py-4 rounded-[20px] font-black text-sm tracking-wide overflow-hidden transition-all"
              style={{
                background: canSubmit
                  ? isTrial
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)'
                    : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)'
                  : 'rgba(255,255,255,0.07)',
                color: canSubmit ? 'white' : 'rgba(255,255,255,0.3)',
                boxShadow: canSubmit
                  ? isTrial
                    ? '0 0 28px rgba(245,158,11,0.5)'
                    : '0 0 28px rgba(139,92,246,0.5)'
                  : 'none',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="block w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                  />
                  Creando cuenta…
                </span>
              ) : (
                isTrial ? 'Comenzar prueba gratis' : 'Crear cuenta gratis'
              )}
            </motion.button>

            {/* Login link */}
            <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {tr.ya_cuenta}{' '}
              <button type="button" onClick={() => navigate('/login')}
                className="font-bold active:opacity-70" style={{ color: '#a78bfa' }}>
                {tr.inicia}
              </button>
            </p>

            {isTrial && (
              <p className="text-center text-[10px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
                Sin compromiso · Cancela cuando quieras · Reembolso 30 días
              </p>
            )}
          </div>
        </motion.form>
      </div>

      <AnimatePresence>
        {legalType && (
          <LegalModal type={legalType} onClose={() => setLegalType(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}