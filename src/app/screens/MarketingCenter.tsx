import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Send, Image as ImageIcon, Type, Link as LinkIcon, 
  Eye, CheckCircle2, AlertCircle, Users, Mail, Sparkles 
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { ResendService, type NewsletterPayload } from '../services/resendService';

export default function MarketingCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState<NewsletterPayload>({
    subject: '',
    title: '',
    body: '',
    imageUrl: '',
    ctaText: 'Ver ahora',
    ctaUrl: 'https://morixoficial.com/inicio'
  });

  // Fetch target audience count
  useEffect(() => {
    async function getCount() {
      const { count } = await supabase
        .from('morix_users')
        .select('*', { count: 'exact', head: true })
        .eq('marketing_opt_in', true);
      setUserCount(count || 0);
    }
    getCount();
  }, []);

  const handleSend = async () => {
    if (!formData.subject || !formData.title || !formData.body) {
      setStatus({ type: 'error', msg: 'Por favor completa los campos básicos (Asunto, Título y Mensaje).' });
      return;
    }

    const confirmSend = window.confirm(`¿Estás seguro de enviar este correo a ${userCount} usuarios? Esta acción no se puede deshacer.`);
    if (!confirmSend) return;

    setSending(true);
    setStatus(null);

    try {
      // 1. Obtener lista de emails
      const { data: users, error: fetchError } = await supabase
        .from('morix_users')
        .select('email')
        .eq('marketing_opt_in', true);

      if (fetchError || !users) throw new Error('No se pudo obtener la lista de usuarios para el marketing.');

      const emails = users.map(u => u.email).filter(email => !!email);
      if (emails.length === 0) throw new Error('No hay usuarios suscritos a la lista de marketing actualmente.');

      // 2. Enviar masivo vía Supabase Edge Function
      await ResendService.sendBulk(emails, formData);

      setStatus({ type: 'success', msg: `¡Boletín enviado con éxito a ${emails.length} usuarios! 🎉` });
      // Reset form
      setFormData({ subject: '', title: '', body: '', imageUrl: '', ctaText: 'Ver ahora', ctaUrl: 'https://morixoficial.com/inicio' });
    } catch (err: any) {
      console.error('[MarketingCenter] Error en el flujo de envío:', err);
      // Extraer mensaje de error más legible
      let errorMsg = 'Error al enviar el boletín.';
      if (err.message) errorMsg = err.message;
      if (err.message?.includes('Failed to fetch')) {
        errorMsg = 'Error de conexión: No se pudo contactar con el servidor de Supabase.';
      }
      
      setStatus({ type: 'error', msg: errorMsg });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030213] text-white p-6 relative overflow-y-auto font-sans">
      {/* Background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Volver a Admin</span>
          </button>
          
          <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <Users size={16} className="text-purple-400" />
            <span className="text-sm font-bold">{userCount} Usuarios suscritos</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Editor Part */}
          <div className="flex-1 space-y-6">
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[32px] p-8 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="text-purple-400" size={24} />
                <h1 className="text-2xl font-black">Centro de Marketing</h1>
              </div>

              <div className="space-y-5">
                {/* Subject */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Asunto del correo (lo que ven en su bandeja)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                      type="text" 
                      value={formData.subject}
                      onChange={e => setFormData({...formData, subject: e.target.value})}
                      placeholder="Ej: ¡Novedades de la semana en Morix! 🚀"
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:border-purple-500/50 focus:ring-0 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Título principal (dentro del correo)</label>
                  <div className="relative">
                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                      type="text" 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="Ej: Prepárate para lo nuevo"
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:border-purple-500/50 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Body */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Mensaje / Contenido</label>
                  <textarea 
                    rows={6}
                    value={formData.body}
                    onChange={e => setFormData({...formData, body: e.target.value})}
                    placeholder="Escribe aquí el cuerpo del boletín..."
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl p-4 focus:border-purple-500/50 outline-none transition-all resize-none"
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">URL de Imagen Hero (Opcional)</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                      type="text" 
                      value={formData.imageUrl}
                      onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:border-purple-500/50 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* CTA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Texto del Botón</label>
                    <input 
                      type="text" 
                      value={formData.ctaText}
                      onChange={e => setFormData({...formData, ctaText: e.target.value})}
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 px-4 focus:border-purple-500/50 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">URL del Botón</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                      <input 
                        type="text" 
                        value={formData.ctaUrl}
                        onChange={e => setFormData({...formData, ctaUrl: e.target.value})}
                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-10 pr-4 focus:border-purple-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Msg */}
              <AnimatePresence>
                {status && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-6 p-4 rounded-2xl flex items-center gap-3 ${status.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}
                  >
                    {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="text-sm font-medium">{status.msg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action */}
              <button 
                onClick={handleSend}
                disabled={sending}
                className="w-full mt-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg shadow-purple-900/20 active:scale-[0.98]"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={20} />
                    <span>ENVIAR BOLETÍN AHORA</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Part */}
          <div className="lg:w-[400px]">
            <div className="sticky top-6">
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Previsualización en vivo</span>
                <Eye size={16} className="text-zinc-500" />
              </div>
              
              <div className="bg-[#0a0a1a] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl scale-[0.85] origin-top md:scale-100">
                {/* Email Header */}
                <div className="p-6 text-center border-b border-white/5">
                   {/* Mock Logo */}
                   <div className="w-24 h-6 mx-auto bg-zinc-800 rounded animate-pulse mb-1 flex items-center justify-center">
                      <span className="text-[10px] font-black text-zinc-600 italic">MORIX LOGO</span>
                   </div>
                </div>

                {/* Email Hero */}
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} className="w-full aspect-video object-cover" alt="Hero" />
                ) : (
                  <div className="w-full aspect-video bg-zinc-900 flex items-center justify-center border-b border-white/5">
                    <ImageIcon className="text-zinc-800" size={40} />
                  </div>
                )}

                {/* Email Content */}
                <div className="p-8">
                  <h2 className="text-xl font-black mb-4 text-white leading-tight">
                    {formData.title || 'Título del Boletín'}
                  </h2>
                  <p className="text-sm text-zinc-400 whitespace-pre-line leading-relaxed mb-6">
                    {formData.body || 'Tu mensaje aparecerá aquí de forma profesional y elegante...'}
                  </p>
                  
                  {formData.ctaUrl && (
                    <div className="inline-block px-6 py-3 bg-[#8b5cf6] rounded-xl text-white text-xs font-bold shadow-lg shadow-purple-900/40">
                      {formData.ctaText || 'Ver ahora'}
                    </div>
                  )}
                </div>

                {/* Email Footer */}
                <div className="p-6 bg-black/40 border-t border-white/5 text-center">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest">
                    © 2026 Morix Oficial · <span className="text-purple-500/50">Unsubscribe</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
