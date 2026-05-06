import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, MessageCircle, Send, ChevronDown, CheckCircle } from 'lucide-react';
import { AuroraBackground } from './AuroraBackground';

interface SoporteModalProps {
  onClose: () => void;
}

const FAQS = [
  {
    q: '¿Cómo cambio mi contraseña?',
    a: 'Ve a la pestaña "Clave" en la pantalla de Editar Perfil, ingresa tu nueva contraseña y haz clic en Guardar.',
  },
  {
    q: '¿Cómo cancelo mi suscripción?',
    a: 'Puedes gestionar o cancelar tu suscripción activa desde la sección "Suscripción" en tu perfil, haciendo clic en "Gestionar plan".',
  },
  {
    q: '¿Por qué no carga mi progreso?',
    a: 'Asegúrate de tener conexión a internet. El progreso se guarda localmente y se sincroniza automáticamente con la nube cuando vuelves a estar en línea.',
  },
  {
    q: '¿Cómo desbloqueo más avatares?',
    a: 'Los avatares exclusivos se desbloquean a medida que ganas experiencia (XP) y subes de nivel viendo y completando videos en la app.',
  },
];

export function SoporteModal({ onClose }: SoporteModalProps) {
  const [view, setView] = useState<'faq' | 'form'>('faq');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Form state
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleOpenEmailForm = () => {
    setView('form');
  };

  const handleSendEmail = () => {
    const email = 'contacto@morixoficial.com';
    const subject = encodeURIComponent(asunto || 'Soporte Morix');
    const body = encodeURIComponent(mensaje);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    onClose();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[999] flex flex-col justify-end"
        style={{ background: 'rgba(3,3,9,0.7)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          style={{
            background: 'linear-gradient(180deg, #0e0e22 0%, #080817 100%)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderBottom: 'none',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </div>
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <X size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />
            </button>
            <h3 className="text-white font-black text-[15px]">Soporte y Ayuda</h3>
            {view === 'form' ? (
              <button onClick={() => setView('faq')} className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Volver</button>
            ) : (
              <div className="w-8" />
            )}
          </div>

          <div className="flex-1 overflow-y-auto w-full relative">
            <AuroraBackground intensity="low" />

            <AnimatePresence mode="wait">
              {view === 'faq' ? (
                <motion.div key="faq" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="px-5 pt-6 pb-28 relative z-10 flex flex-col gap-6">
                  {/* Hero Intro */}
                  <div className="flex flex-col items-center text-center px-4">
                    <div className="w-16 h-16 rounded-[24px] flex items-center justify-center mb-4" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', boxShadow: '0 0 30px rgba(139,92,246,0.15)' }}>
                      <MessageCircle size={28} style={{ color: '#a78bfa' }} />
                    </div>
                    <h4 className="text-white font-black text-[18px] leading-tight mb-2">¿En qué podemos ayudarte?</h4>
                    <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Revisa nuestras preguntas frecuentes o envíanos un mensaje directo. En Morix estamos para ti.
                    </p>
                  </div>

                  {/* FAQ List */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest pl-2 mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Preguntas Frecuentes</p>
                    {FAQS.map((faq, i) => {
                      const isOpen = openFaq === i;
                      return (
                        <div key={i} className="rounded-[16px] overflow-hidden transition-colors" style={{ background: isOpen ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <button onClick={() => setOpenFaq(isOpen ? null : i)} className="w-full text-left px-4 py-4 flex items-center justify-between gap-3">
                            <span className="text-[13px] font-bold text-white flex-1">{faq.q}</span>
                            <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                              <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                            </motion.div>
                          </button>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                                <div className="px-4 pb-4 pt-0">
                                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{faq.a}</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  {/* Contact Buttons */}
                  <div className="flex flex-col gap-3 mt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest pl-2 mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>¿Aún necesitas ayuda?</p>
                    
                    <button onClick={handleOpenEmailForm} className="w-full flex items-center justify-between px-5 py-4 rounded-[18px] active:scale-[0.98] transition-transform" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))', border: '1px solid rgba(139,92,246,0.3)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)' }}>
                          <Mail size={16} style={{ color: '#a78bfa' }} />
                        </div>
                        <div className="text-left">
                          <p className="text-[13px] font-bold text-white">Contactar por Correo</p>
                          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Te responderemos en 24h</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="px-5 pt-6 pb-28 relative z-10 flex flex-col gap-6">
                  
                  <div className="flex flex-col gap-2 mb-2">
                    <h4 className="text-white font-black text-[18px]">Envíanos un mensaje</h4>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Describe tu problema o sugerencia. Se abrirá tu aplicación de correo lista para enviarnos tu caso.</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        Motivo / Asunto
                      </label>
                      <input
                        value={asunto}
                        onChange={(e) => setAsunto(e.target.value)}
                        placeholder="Ej: Problema con suscripción"
                        className="w-full px-4 py-3.5 rounded-[16px] text-white text-[13px] font-semibold outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1.5px solid rgba(255,255,255,0.08)',
                          caretColor: '#a78bfa',
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        Mensaje
                      </label>
                      <textarea
                        value={mensaje}
                        onChange={(e) => setMensaje(e.target.value)}
                        rows={5}
                        placeholder="Hola equipo de Morix, me gustaría consultar..."
                        className="w-full px-4 py-3.5 rounded-[16px] text-white text-[13px] outline-none resize-none"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1.5px solid rgba(255,255,255,0.08)',
                          caretColor: '#a78bfa',
                        }}
                      />
                    </div>
                  </div>

                  <button
                    disabled={!asunto.trim() || !mensaje.trim()}
                    onClick={handleSendEmail}
                    className="w-full py-4 mt-2 rounded-[18px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    style={{
                      background: (!asunto.trim() || !mensaje.trim()) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #8b5cf6, #4f46e5)',
                      color: (!asunto.trim() || !mensaje.trim()) ? 'rgba(255,255,255,0.3)' : 'white',
                      boxShadow: (!asunto.trim() || !mensaje.trim()) ? 'none' : '0 0 20px rgba(139,92,246,0.4)',
                    }}
                  >
                    <Send size={15} />
                    <span className="text-[13px] font-bold">Abrir App de Correo</span>
                  </button>
                  
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
