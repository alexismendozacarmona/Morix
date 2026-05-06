/**
 * PermissionGate — Pantalla de solicitud de permisos de Morix.
 *
 * Aparece una sola vez (primera instalación / primer uso) después del Splash.
 * Solicita permiso de Notificaciones del sistema, que en Android activa:
 *  - El diálogo nativo "¿Permitir notificaciones?"
 *  - La MediaStyle notification para reproducción en segundo plano
 *  - Los controles del reproductor en la pantalla de bloqueo
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Headphones, Lock, Music2, ChevronRight, ExternalLink } from 'lucide-react';
import { useNotificationPermission } from '../hooks/useNotificationPermission';
import { openAppNotificationSettings, isCapacitorNative } from '../utils/capacitorUtils';

interface PermissionGateProps {
  onDone: () => void;
}

export function PermissionGate({ onDone }: PermissionGateProps) {
  const { requestPermission, skipPermission } = useNotificationPermission();
  const [step, setStep]       = useState<'main' | 'granting' | 'done' | 'settings'>('main');
  const [granted, setGranted] = useState(false);
  const inNative = isCapacitorNative();

  const handleAllow = async () => {
    setStep('granting');
    const result = await requestPermission();

    // En Capacitor sin Web API, requestPermission puede abrir Settings
    // y devolver 'prompt'. En ese caso mostramos instrucciones.
    if (result === 'prompt' && inNative) {
      setStep('settings');
      return;
    }

    setGranted(result === 'granted');
    setStep('done');
    setTimeout(onDone, 1400);
  };

  const handleSkip = () => {
    skipPermission();
    onDone();
  };

  const handleOpenSettings = async () => {
    await openAppNotificationSettings();
    // Después de que vuelvan de Settings, continuamos
    // El hook redetectará el permiso via visibilitychange
    setTimeout(onDone, 600);
  };

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-between overflow-hidden"
      style={{ background: '#030309', zIndex: 100 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Fondo aurora estático ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{
          position: 'absolute', top: '-10%', left: '-20%',
          width: '80%', height: '60%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', right: '-15%',
          width: '70%', height: '50%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%)',
          filter: 'blur(50px)',
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '-10%',
          width: '50%', height: '40%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 65%)',
          filter: 'blur(48px)',
        }} />
      </div>

      {/* ── Top spacer ── */}
      <div />

      {/* ── Contenido principal ── */}
      <div className="relative z-10 flex flex-col items-center px-6 w-full" style={{ marginTop: '-24px' }}>
        <AnimatePresence mode="wait">

          {/* ──────────── ESTADO PRINCIPAL ──────────── */}
          {step === 'main' && (
            <motion.div
              key="main"
              className="flex flex-col items-center w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              {/* Ícono central animado */}
              <motion.div
                className="relative mb-8"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 14, stiffness: 180, delay: 0.1 }}
              >
                {/* Anillos de pulso */}
                {[1, 2, 3].map((ring) => (
                  <motion.div
                    key={ring}
                    className="absolute rounded-full"
                    style={{
                      width:  72 + ring * 24,
                      height: 72 + ring * 24,
                      top:    '50%',
                      left:   '50%',
                      transform: 'translate(-50%, -50%)',
                      border: `1px solid rgba(139,92,246,${0.22 - ring * 0.06})`,
                    }}
                    animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.2, 0.6] }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      delay: ring * 0.4,
                      ease: 'easeInOut',
                    }}
                  />
                ))}

                {/* Círculo principal */}
                <div
                  className="relative w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.15))',
                    border: '1.5px solid rgba(139,92,246,0.45)',
                    boxShadow: '0 0 40px rgba(139,92,246,0.35), 0 0 80px rgba(99,102,241,0.15)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <Bell size={32} style={{ color: '#a78bfa' }} />
                </div>
              </motion.div>

              {/* Título */}
              <h1
                className="text-white font-black text-center mb-3"
                style={{ fontSize: '22px', letterSpacing: '-0.02em', lineHeight: 1.2 }}
              >
                Activa tu<br />
                <span style={{
                  background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  experiencia completa
                </span>
              </h1>

              <p
                className="text-center mb-8"
                style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', lineHeight: 1.6, maxWidth: 280 }}
              >
                Permite notificaciones para controlar el audio de Morix
                desde la barra de estado mientras haces otra cosa.
              </p>

              {/* Beneficios */}
              <div className="w-full flex flex-col gap-3 mb-8">
                {[
                  {
                    icon: <Music2 size={16} style={{ color: '#a78bfa' }} />,
                    title: 'Reproductor en notificaciones',
                    desc: 'Pausa, reanuda y controla el audio sin abrir la app',
                    color: 'rgba(139,92,246,0.12)',
                    border: 'rgba(139,92,246,0.22)',
                  },
                  {
                    icon: <Lock size={16} style={{ color: '#60a5fa' }} />,
                    title: 'Pantalla de bloqueo',
                    desc: 'Controles del reproductor visibles al bloquear tu celular',
                    color: 'rgba(99,102,241,0.12)',
                    border: 'rgba(99,102,241,0.22)',
                  },
                  {
                    icon: <Headphones size={16} style={{ color: '#34d399' }} />,
                    title: 'Audio en segundo plano',
                    desc: 'Sigue escuchando mientras usas otras apps',
                    color: 'rgba(52,211,153,0.10)',
                    border: 'rgba(52,211,153,0.20)',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.1, duration: 0.3 }}
                    className="flex items-start gap-3 rounded-2xl p-3.5"
                    style={{
                      background: item.color,
                      border: `1px solid ${item.border}`,
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold" style={{ fontSize: '12px' }}>
                        {item.title}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', marginTop: 2 }}>
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Botones */}
              <div className="w-full flex flex-col gap-3">
                {/* Botón principal */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleAllow}
                  className="w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    boxShadow: '0 0 32px rgba(139,92,246,0.5), 0 4px 16px rgba(0,0,0,0.4)',
                    color: 'white',
                    fontSize: '15px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Permitir notificaciones
                  <ChevronRight size={18} />
                </motion.button>

                {/* Botón secundario */}
                <button
                  onClick={handleSkip}
                  className="w-full py-3 rounded-2xl font-semibold"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.32)',
                    fontSize: '13px',
                  }}
                >
                  Ahora no
                </button>
              </div>

              {/* Nota de privacidad */}
              <p className="mt-4 text-center" style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px' }}>
                Solo para controles de audio. No enviamos spam.
              </p>
            </motion.div>
          )}

          {/* ──────────── ESTADO CONCEDIENDO ──────────── */}
          {step === 'granting' && (
            <motion.div
              key="granting"
              className="flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Spinner */}
              <div className="relative w-20 h-20 mb-6">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: '2px solid rgba(139,92,246,0.15)',
                    borderTopColor: '#8b5cf6',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Bell size={28} style={{ color: '#a78bfa' }} />
                </div>
              </div>
              <p className="text-white font-bold" style={{ fontSize: '15px' }}>
                Abriendo diálogo...
              </p>
              <p className="mt-2 text-center" style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}>
                Acepta en el diálogo de Android
              </p>
            </motion.div>
          )}

          {/* ──────────── ESTADO RESULTADO ──────────── */}
          {step === 'done' && (
            <motion.div
              key="done"
              className="flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 180 }}
            >
              {/* Ícono resultado */}
              <motion.div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                style={{
                  background: granted
                    ? 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1))'
                    : 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
                  border: `2px solid ${granted ? 'rgba(52,211,153,0.4)' : 'rgba(139,92,246,0.3)'}`,
                  boxShadow: granted
                    ? '0 0 40px rgba(52,211,153,0.3)'
                    : '0 0 40px rgba(139,92,246,0.2)',
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              >
                <span style={{ fontSize: '40px' }}>{granted ? '🎵' : '👍'}</span>
              </motion.div>

              <h2 className="text-white font-black text-center" style={{ fontSize: '20px', letterSpacing: '-0.02em' }}>
                {granted ? '¡Listo!' : '¡Entendido!'}
              </h2>
              <p className="mt-2 text-center" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', lineHeight: 1.5, maxWidth: 260 }}>
                {granted
                  ? 'Ahora puedes controlar el audio de Morix desde la barra de notificaciones y la pantalla de bloqueo.'
                  : 'Puedes activarlo luego en Ajustes → Notificaciones de tu celular.'}
              </p>
            </motion.div>
          )}

          {/* ──────────── ESTADO CONFIGURACIÓN ──────────── */}
          {step === 'settings' && (
            <motion.div
              key="settings"
              className="flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 180 }}
            >
              {/* Ícono resultado */}
              <motion.div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
                  border: '2px solid rgba(139,92,246,0.3)',
                  boxShadow: '0 0 40px rgba(139,92,246,0.2)',
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              >
                <ExternalLink size={40} style={{ color: '#a78bfa' }} />
              </motion.div>

              <h2 className="text-white font-black text-center" style={{ fontSize: '20px', letterSpacing: '-0.02em' }}>
                Configura notificaciones
              </h2>
              <p className="mt-2 text-center" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', lineHeight: 1.5, maxWidth: 260 }}>
                Abre la configuración de notificaciones de Morix para permitir notificaciones.
              </p>

              {/* Botones */}
              <div className="w-full flex flex-col gap-3">
                {/* Botón principal */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleOpenSettings}
                  className="w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    boxShadow: '0 0 32px rgba(139,92,246,0.5), 0 4px 16px rgba(0,0,0,0.4)',
                    color: 'white',
                    fontSize: '15px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Abrir configuración
                  <ChevronRight size={18} />
                </motion.button>

                {/* Botón secundario */}
                <button
                  onClick={handleSkip}
                  className="w-full py-3 rounded-2xl font-semibold"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.32)',
                    fontSize: '13px',
                  }}
                >
                  Ahora no
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Bottom spacer ── */}
      <div style={{ height: 40 }} />
    </motion.div>
  );
}