import { useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Compass, Users, TrendingUp, User } from 'lucide-react';
import { useT } from '../i18n/useT';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();

  const tabs = [
    { label: t.nav.inicio,    icon: Home,       path: '/inicio' },
    { label: t.nav.explorar,  icon: Compass,    path: '/explorar' },
    { label: t.nav.social,    icon: Users,      path: '/social' },
    { label: t.nav.progreso,  icon: TrendingUp, path: '/progreso' },
    { label: t.nav.perfil,    icon: User,       path: '/perfil' },
  ];

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
      className="flex items-center gap-1 px-2 py-2 rounded-[32px]"
      style={{
        background: 'rgba(8,8,22,0.9)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 0 0 0.5px rgba(255,255,255,0.03) inset, 0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(139,92,246,0.07)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="relative flex flex-col items-center justify-center gap-1 w-[58px] h-[50px] rounded-[24px] transition-all duration-300 active:scale-90"
            style={{
              background: isActive ? 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))' : 'transparent',
              border: isActive ? '1px solid rgba(139,92,246,0.35)' : '1px solid transparent',
              boxShadow: isActive ? '0 0 20px rgba(139,92,246,0.2)' : 'none',
            }}
          >
            {isActive && (
              <motion.div
                layoutId="navGlow"
                className="absolute inset-0 rounded-[24px] pointer-events-none"
                style={{ background: 'radial-gradient(circle at center, rgba(167,139,250,0.12), transparent 70%)' }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              />
            )}

            <Icon
              size={19}
              strokeWidth={isActive ? 2.2 : 1.6}
              style={{
                color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.28)',
                filter: isActive ? 'drop-shadow(0 0 8px rgba(196,181,253,0.9))' : 'none',
                transition: 'all 0.3s ease',
              }}
            />

            <AnimatePresence>
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  className="text-[8px] font-bold leading-none"
                  style={{ color: '#c4b5fd' }}
                >
                  {tab.label}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        );
      })}
    </motion.div>
  );
}