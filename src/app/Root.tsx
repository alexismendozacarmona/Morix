import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { PiPPlayer } from './components/PiPPlayer';
import { GlobalRewardManager } from './components/GlobalRewardManager';
import { UserProgressProvider } from './contexts/UserProgressContext';
import { PiPProvider } from './contexts/PiPContext';
import { PlaylistProvider } from './contexts/PlaylistContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { BroadcastNotificationsProvider } from './contexts/BroadcastNotificationsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CommentsProvider } from './contexts/CommentsContext';
import { AdminContentProvider } from './contexts/AdminContentContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { TrendingProvider } from './contexts/TrendingContext';
import { SocialProvider } from './contexts/SocialContext';
import { SplashScreen } from './screens/SplashScreen';
import { PermissionGate } from './components/PermissionGate';
import { AnimatePresence, motion } from 'motion/react';
import { useNotificationPermission } from './hooks/useNotificationPermission';
import { initNotificationChannel } from './utils/capacitorUtils';
import { MorixLogo } from './components/MorixLogo';
import { Capacitor } from '@capacitor/core';

/* ── Inner shell — has access to all contexts ─────────────────────────── */
function AppShell({ phoneRef }: { phoneRef: React.RefObject<HTMLDivElement> }) {
  const [splashDone,      setSplashDone]      = useState(false);
  const [permissionDone,  setPermissionDone]  = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, authLoading } = useAuth();
  const { alreadyAsked, loading: permLoading, status } = useNotificationPermission();

  const isNative = Capacitor.isNativePlatform();
  // En web y ruta raíz "/": mostrar la Landing en ancho completo.
  // En native o en cualquier otra ruta: mantener el encuadre del phone-frame.
  const isLanding = !isNative && location.pathname === '/';

  const showPermissions =
    splashDone &&
    !permissionDone &&
    !permLoading &&
    !alreadyAsked &&
    status !== 'granted' &&
    !isLanding; // No mostrar en la landing

  const readyToNavigate = splashDone && (permissionDone || alreadyAsked || status === 'granted' || isLanding);

  // ── Protección anti-flicker: no mostrar Onboarding si estamos a punto de entrar a /inicio ──
  // Si estamos autenticados y seguimos en '/', a un par de milisegundos de saltar a /inicio, 
  // congelamos la salida para que no se vea el "Login" ni la "Carga con 3 puntos".
  const hideOutlet = !authLoading && isAuthenticated && location.pathname === '/';

  // Mostrar el overlay interno SOLO si genuinamente la base de datos de Auth sigue cargando.
  const showAuthLoading = splashDone && authLoading;

  useEffect(() => {
    if (!readyToNavigate) return;
    if (authLoading) return;

    if (isAuthenticated && user?.setupComplete) {
      navigate('/inicio', { replace: true });
    } else if (isAuthenticated && !user?.setupComplete) {
      navigate('/setup-perfil', { replace: true });
    }
  }, [readyToNavigate, authLoading, isAuthenticated, user?.setupComplete, navigate]);



  return (
    <div
      className="h-screen flex items-center justify-center overflow-hidden"
      style={{ background: isLanding ? '#030309' : '#01010a' }}
    >
      <div
        ref={phoneRef}
        id="phone-frame"
        className="relative h-full flex flex-col"
        style={isLanding ? {
          width: '100%',
          background: '#030309',
          overflowX: 'hidden',
          overflowY: 'auto',
        } : {
          width: '100%',
          maxWidth: '390px',
          maxHeight: '844px',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 30px 80px rgba(0,0,0,0.9), 0 0 120px rgba(139,92,246,0.1)',
        }}
      >
        {/* Si estamos en el milisegundo antes de cambiar a /inicio, nos brincamos pintar el Outlet */}
        {hideOutlet ? null : <Outlet />}
        <PiPPlayer containerRef={phoneRef} />
        <GlobalRewardManager />

        {/* ── Splash ── */}
        <AnimatePresence>
          {!splashDone && (
            <SplashScreen onComplete={() => setSplashDone(true)} />
          )}
        </AnimatePresence>

        {/* ── Auth loading overlay: solo si la BDD es muy lenta ── */}
        <AnimatePresence>
          {showAuthLoading && (
            <motion.div
              key="auth-loading"
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: '#030309', zIndex: 998 }}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 70% 55% at 50% 40%, rgba(139,92,246,0.14) 0%, rgba(99,102,241,0.06) 45%, transparent 75%)',
                }}
              />

              <div style={{ marginTop: '-40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    filter: 'drop-shadow(0 0 18px rgba(139,92,246,0.65)) drop-shadow(0 0 36px rgba(99,102,241,0.3))',
                    marginBottom: '32px',
                  }}
                >
                  <MorixLogo height={46} glowIntensity={1.2} />
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        boxShadow: '0 0 8px rgba(139,92,246,0.8)',
                      }}
                      animate={{
                        opacity: [0.3, 1, 0.3],
                        scale:   [0.7, 1.1, 0.7],
                        y:       [0, -6, 0],
                      }}
                      transition={{
                        duration: 1.1,
                        repeat: Infinity,
                        delay: i * 0.22,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Permisos (solo primera vez, justo después del splash) ── */}
        <AnimatePresence>
          {showPermissions && (
            <PermissionGate onDone={() => setPermissionDone(true)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Root — providers wrap AppShell ──────────────────────────────────── */
export default function Root() {
  const phoneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    initNotificationChannel();
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <SocialProvider>
          <UserProgressProvider>
            <BroadcastNotificationsProvider>
              <NotificationsProvider>
                <PiPProvider>
                  <PlaylistProvider>
                    <CommentsProvider>
                      <AdminContentProvider>
                        <TrendingProvider>
                          <AppShell phoneRef={phoneRef as React.RefObject<HTMLDivElement>} />
                        </TrendingProvider>
                      </AdminContentProvider>
                    </CommentsProvider>
                  </PlaylistProvider>
                </PiPProvider>
              </NotificationsProvider>
            </BroadcastNotificationsProvider>
          </UserProgressProvider>
        </SocialProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}