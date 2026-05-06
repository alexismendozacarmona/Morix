import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { Zap, Crown, Users, Star, Shield, ChevronRight, Check, Menu, X } from 'lucide-react';
import { MorixLogo } from '../components/MorixLogo';

/* ─── Badge SVGs oficiales ──────────────────────────────────────────── */
const APPLE_BADGE = 'https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg';
const GOOGLE_BADGE = 'https://play.google.com/intl/en_us/badges/static/images/badges/es_badge_web_generic.png';

/* ─── Datos ─────────────────────────────────────────────────────────────── */
const CATEGORIAS = [
  { label: 'Meditación & Sonidos',    emoji: '🧘', from: '#8b5cf6', to: '#6366f1' },
  { label: 'Libros & Resúmenes',      emoji: '📚', from: '#0891b2', to: '#3b82f6' },
  { label: 'Terror & Misterios',      emoji: '👻', from: '#9f1239', to: '#be123c' },
  { label: 'Datos & Verdades',        emoji: '⚡', from: '#475569', to: '#64748b' },
];

const FEATURES = [
  {
    icon: Zap,
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.3)',
    title: 'Sistema de Gamificación',
    desc: 'Gana XP, sube de nivel y desbloquea avatares exclusivos mientras aprendes. El desarrollo personal nunca fue tan adictivo.',
  },
  {
    icon: Star,
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.3)',
    title: 'Contenido Curado Premium',
    desc: 'Categorías de contenido seleccionado por expertos: meditaciones, libros resumidos, misterios, datos y mucho más.',
  },
  {
    icon: Users,
    color: '#10b981',
    glow: 'rgba(16,185,129,0.3)',
    title: 'Comunidad Real',
    desc: 'Chat en vivo, rankings globales y actividad social. Aprende rodeado de personas que comparten tu ambición de crecer.',
  },
];

const PLANES = [
  {
    name: 'Free',
    price: '$0',
    period: 'para siempre',
    color: '#64748b',
    features: [
      'Acceso a contenido gratuito',
      'Sistema de XP y niveles',
      'Comunidad básica',
      'Avatares nivel inicial',
    ],
    highlight: false,
  },
  {
    name: 'Premium Mensual',
    price: '$4.99',
    period: 'al mes',
    color: '#8b5cf6',
    features: [
      'Todo el contenido sin límites',
      'Más de 200+ videos premium',
      'Audios en segundo plano',
      'Avatares y logros exclusivos',
    ],
    highlight: false,
  },
  {
    name: 'Premium Anual',
    price: '$4.16',
    period: 'al mes',
    color: '#8b5cf6',
    features: [
      'Facturado como $49.90/año',
      'Ahorra 2 meses ($9.98)',
      'Todo el contenido ilimitado',
      'Beneficios exclusivos',
    ],
    highlight: true,
  },
];

/* ─── Componente principal ──────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // Close mobile menu on scroll
  useEffect(() => {
    const handle = () => setMenuOpen(false);
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  return (
    <div className="relative overflow-x-hidden" style={{ background: '#030309', color: 'white', fontFamily: "'Inter', 'Outfit', system-ui, sans-serif" }}>

      {/* ── Google Font ────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Outfit:wght@400;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #030309; }
        .gradient-text {
          background: linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #93c5fd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .aurora {
          position: absolute;
          border-radius: 50%;
          filter: blur(110px);
          pointer-events: none;
        }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      {/* ── NAVBAR ───────────────────────────────────────────── */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-6">
        <nav
          className="flex items-center gap-6 px-8 py-3 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 0 12px rgba(255,255,255,0.02)',
          }}
        >
          {/* Desktop nav only links */}
          <div className="hidden md:flex items-center gap-10">
            {['Categorías', 'Características', 'Precios'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace('í', 'i').replace('é', 'e')}`}
                style={{ 
                  color: 'rgba(255,255,255,0.45)', 
                  fontSize: '13px', 
                  fontWeight: 700, 
                  textDecoration: 'none', 
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.textShadow = '0 0 15px rgba(255,255,255,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                  e.currentTarget.style.textShadow = 'none';
                }}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Mobile hamburger (visible inside pill) */}
          <button
            className="md:hidden flex items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
            <span className="ml-2 text-[12px] font-bold tracking-wider">MENÚ</span>
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ position: 'fixed', top: 68, left: 16, right: 16, zIndex: 49, background: 'rgba(14,12,28,0.97)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.09)', padding: '20px', backdropFilter: 'blur(24px)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['Categorías', 'Características', 'Precios'].map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace('í', 'i').replace('é', 'e')}`} onClick={() => setMenuOpen(false)} style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '15px', textDecoration: 'none', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {item}
                </a>
              ))}
              {/* Removed auth links from mobile menu */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', paddingTop: '80px', paddingBottom: '60px', overflow: 'hidden' }}>

        {/* Aurora blobs */}
        <div className="aurora" style={{ width: 700, height: 700, top: -200, left: -200, background: 'radial-gradient(circle, rgba(139,92,246,0.18), transparent 65%)' }} />
        <div className="aurora" style={{ width: 600, height: 600, top: -100, right: -150, background: 'radial-gradient(circle, rgba(99,102,241,0.14), transparent 65%)' }} />
        <div className="aurora" style={{ width: 500, height: 500, bottom: -100, left: '30%', background: 'radial-gradient(circle, rgba(59,130,246,0.1), transparent 65%)' }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity, width: '100%', maxWidth: '900px', margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '100px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', marginBottom: '28px' }}>
            <span style={{ fontSize: '13px' }}>✨</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.04em' }}>LA APP DE DESARROLLO PERSONAL #1</span>
          </motion.div>

          {/* Big centered logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', damping: 14, stiffness: 160 }}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}
          >
            <MorixLogo height={90} glowIntensity={1.3} />
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(36px, 6vw, 76px)', lineHeight: 1.08, marginBottom: '20px' }}>
            <span className="gradient-text">Tu desarrollo personal</span>
            <br />
            <span style={{ color: 'rgba(255,255,255,0.9)' }}>al siguiente nivel</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: '580px', margin: '0 auto 40px' }}>
            Meditaciones, libros resumidos, historias de terror, datos curiosos y mucho más. Aprende, sube de nivel y únete a una comunidad que quiere crecer contigo.
          </motion.p>

          {/* CTAs */}
          <div style={{ marginBottom: '40px' }} /> {/* Removed Hero auth buttons */}

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', marginBottom: '48px' }}>
            <img src={APPLE_BADGE} alt="App Store" style={{ height: '48px', cursor: 'default' }} />
            <img src={GOOGLE_BADGE} alt="Google Play" style={{ height: '48px', cursor: 'default' }} />
          </motion.div>

          {/* Social proof */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            <div style={{ display: 'flex', gap: '-4px' }}>
              {['🟣', '🔵', '🟢', '🟡', '🔴'].map((c, i) => (
                <div key={i} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(139,92,246,0.3)', border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', marginLeft: i > 0 ? '-8px' : '0' }}>
                  {c}
                </div>
              ))}
            </div>
            <span>+1,200 personas ya están aprendiendo</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f59e0b' }}>
              {'★★★★★'} <span style={{ color: 'rgba(255,255,255,0.35)' }}>4.9</span>
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* ── CATEGORÍAS ──────────────────────────────────────── */}
      <section id="categorias" style={{ padding: 'clamp(60px, 8vw, 120px) 24px', position: 'relative' }}>
        <div className="aurora" style={{ width: 500, height: 500, top: '20%', right: -200, background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 65%)' }} />

        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '100px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.06em' }}>CONTENIDO PREMIUM</span>
            </div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 4vw, 48px)', marginBottom: '12px' }}>
              <span className="gradient-text">Todo lo que necesitas</span>
              {' '}para crecer
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              Desde meditación guiada hasta datos sorprendentes. Contenido premium elegido para tu crecimiento.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
            {CATEGORIAS.map((cat, i) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ scale: 1.04, y: -4 }}
                style={{ borderRadius: '20px', padding: '20px 16px', background: `linear-gradient(135deg, ${cat.from}14, ${cat.to}0a)`, border: `1px solid ${cat.from}30`, cursor: 'default', transition: 'box-shadow 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 30px ${cat.from}30`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>{cat.emoji}</div>
                <p style={{ fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.3 }}>{cat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CARACTERÍSTICAS ─────────────────────────────────── */}
      <section id="caracteristicas" style={{ padding: 'clamp(60px, 8vw, 120px) 24px', position: 'relative' }}>
        <div className="aurora" style={{ width: 600, height: 600, top: '10%', left: -200, background: 'radial-gradient(circle, rgba(139,92,246,0.12), transparent 65%)' }} />

        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '100px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.06em' }}>¿POR QUÉ MORIX?</span>
            </div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 4vw, 48px)', marginBottom: '12px' }}>
              Diseñado para que{' '}
              <span className="gradient-text">no abandones</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              La mayoría de apps de aprendizaje son aburridas. Morix lo cambia todo.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  whileHover={{ y: -6 }}
                  style={{ borderRadius: '24px', padding: '32px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.2s' }}
                >
                  <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: `rgba(${feat.color.replace('#', '').match(/../g)?.map(h => parseInt(h, 16)).join(',')}, 0.15)`, border: `1px solid ${feat.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: `0 0 20px ${feat.glow}` }}>
                    <Icon size={24} color={feat.color} />
                  </div>
                  <h3 style={{ fontWeight: 800, fontSize: '18px', marginBottom: '10px', color: 'white' }}>{feat.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.65 }}>{feat.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PRECIOS ─────────────────────────────────────────── */}
      <section id="precios" style={{ padding: 'clamp(60px, 8vw, 120px) 24px', position: 'relative' }}>
        <div className="aurora" style={{ width: 700, height: 700, top: '20%', left: '20%', background: 'radial-gradient(circle, rgba(139,92,246,0.09), transparent 65%)' }} />

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '100px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.06em' }}>PLANES Y PRECIOS</span>
            </div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 4vw, 48px)', marginBottom: '12px' }}>
              <span className="gradient-text">Invierte en ti mismo.</span>
              {' '}Sin excusas.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '16px' }}>
              Empieza gratis. Desbloquea todo cuando estés listo.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'start' }}>
            {PLANES.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                style={{
                  borderRadius: '28px',
                  padding: '32px',
                  background: plan.highlight ? 'linear-gradient(145deg, rgba(139,92,246,0.15), rgba(99,102,241,0.08))' : 'rgba(255,255,255,0.03)',
                  border: plan.highlight ? '1.5px solid rgba(139,92,246,0.45)' : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: plan.highlight ? '0 0 60px rgba(139,92,246,0.2)' : 'none',
                  position: 'relative',
                }}
              >
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', borderRadius: '100px', background: 'linear-gradient(135deg, #8b5cf6, #4f46e5)', fontSize: '11px', fontWeight: 800, color: 'white', letterSpacing: '0.06em', whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(139,92,246,0.5)' }}>
                    ⭐ MÁS POPULAR
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  {plan.highlight ? <Crown size={20} color="#f59e0b" /> : <Shield size={20} color="#64748b" />}
                  <span style={{ fontWeight: 800, fontSize: '18px' }}>{plan.name}</span>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '44px', background: plan.highlight ? 'linear-gradient(135deg, #c4b5fd, #a78bfa)' : 'none', WebkitBackgroundClip: plan.highlight ? 'text' : 'unset', WebkitTextFillColor: plan.highlight ? 'transparent' : 'white', backgroundClip: plan.highlight ? 'text' : 'unset' }}>
                    {plan.price}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', marginLeft: '6px' }}>{plan.period}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: plan.highlight ? 'linear-gradient(135deg, #8b5cf6, #4f46e5)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check size={10} color="white" strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{f}</span>
                    </div>
                  ))}
                </div>

                <div style={{ width: '100%', padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '14px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                  Solo en la App
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(60px, 8vw, 100px) 24px', position: 'relative', textAlign: 'center' }}>
        <div className="aurora" style={{ width: 800, height: 800, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'radial-gradient(circle, rgba(139,92,246,0.14), transparent 65%)' }} />

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ fontSize: '52px', marginBottom: '20px' }}>🚀</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 4.5vw, 54px)', marginBottom: '16px', lineHeight: 1.1 }}>
            <span className="gradient-text">¿Listo para empezar</span>
            <br />a crecer de verdad?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px', marginBottom: '36px', lineHeight: 1.6 }}>
            Únete a miles de personas que ya están transformando su vida con Morix. Gratis, sin compromisos.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '40px' }}>
            <img src={APPLE_BADGE} alt="App Store" style={{ height: '48px' }} />
            <img src={GOOGLE_BADGE} alt="Google Play" style={{ height: '48px' }} />
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 24px', position: 'relative' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '24px', marginBottom: '28px' }}>
            <MorixLogo height={24} glowIntensity={0.6} />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
              {[
                { label: 'Términos de Servicio', action: () => navigate('/registro') },
                { label: 'Política de Privacidad', action: () => navigate('/registro') },
                { label: 'contacto@morixoficial.com', action: () => window.open('mailto:contacto@morixoficial.com') },
              ].map(({ label, action }) => (
                <button key={label} onClick={action} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '13px', cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>
              © {new Date().getFullYear()} Morix Company. Todos los derechos reservados.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '12px' }}>
              morixoficial.com
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
