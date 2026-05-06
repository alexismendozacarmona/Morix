import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Plus, Pencil, Trash2, X, Check,
  Video, Zap, Image, ChevronDown, LayoutGrid,
  AlertTriangle, Shield, Music, Film, Users, Lock,
  Bell, Send, Smartphone, CheckCircle2, XCircle, Info, BarChart2, Search, Sparkles
} from 'lucide-react';
import { AuroraBackground } from '../components/AuroraBackground';
import { AnalyticsDashboard } from '../components/admin/AnalyticsDashboard';
import { useAdminContent, type AdminVideo, type AdminShort } from '../contexts/AdminContentContext';
import { useAuth } from '../contexts/AuthContext';
import { isAdminEmail, CATEGORIAS_VIDEO, CATEGORIAS_SHORT, SHORT_TAGS, usaAudioLoop } from '../config/adminConfig';
import { R2Uploader } from '../components/R2Uploader';
import {
  useBroadcastNotifications,
  type BroadcastNotif,
  type BroadcastType,
} from '../contexts/BroadcastNotificationsContext';

/* ─── Blank forms ────────────────────────────────────────────────────────── */
const BLANK_VIDEO: Omit<AdminVideo, 'id' | 'createdAt' | 'updatedAt'> = {
  titulo:          '',
  descripcion:     '',
  categoria:       'Meditación & Sonidos',
  duracion:        '30:00',
  imagen:          '',
  imagenLandscape: '',
  autor:           '',
  año:             new Date().getFullYear().toString(),
  rating:          '4.5',
  tags:            [],
  premium:         false,
  esFree:          false,
  nuevo:           true,
  estreno:         false,
  match:           90,
  videoFile:       '',
  audioFile:       '',
  loopFile:        '',
  bgAudioFile:     '',
  player_mode:     'video_completo',
};

const BLANK_SHORT: Omit<AdminShort, 'id' | 'createdAt' | 'updatedAt'> = {
  titulo:      '',
  descripcion: '',
  categoria:   'Meditación & Sonidos',
  duracionSeg: 60,
  thumbnail:   '',
  audio:       '',
  tag:         'MEDITACIÓN',
  autor:       'Morix',
  videoFile:   '',
};

// ─── Configuración de subida pública de Shorts ───────────────────────────────
const LS_PUBLIC_SHORTS = 'morix_allow_public_shorts';
function getPublicShortsEnabled(): boolean {
  try { return localStorage.getItem(LS_PUBLIC_SHORTS) === 'true'; }
  catch { return false; }
}
function setPublicShortsEnabled(v: boolean) {
  try { localStorage.setItem(LS_PUBLIC_SHORTS, String(v)); } catch { /* ignore */ }
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function timeAgo(ts: number): string {
  const s = (Date.now() - ts) / 1000;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/* ─── Field components ───────────────────────────────────────────────────── */
function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-bold mb-1.5 tracking-wider"
        style={{ color: 'rgba(255,255,255,0.45)' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3.5 py-2.5 rounded-[12px] text-sm text-white outline-none transition-all";
const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border:     '1px solid rgba(255,255,255,0.1)',
};
const inputFocusStyle = {
  background: 'rgba(139,92,246,0.1)',
  border:     '1px solid rgba(139,92,246,0.4)',
};

function TextInput({
  value, onChange, placeholder, multiline = false,
}: { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const [focused, setFocused] = useState(false);
  const style = { ...inputStyle, ...(focused ? inputFocusStyle : {}), color: 'white' };
  if (multiline) {
    return (
      <textarea value={value} onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={placeholder} rows={3}
        className={inputCls + ' resize-none'} style={style}
      />
    );
  }
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      placeholder={placeholder}
      className={inputCls} style={style}
    />
  );
}

function SelectInput<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: readonly T[] | T[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value as T)}
        className={inputCls + ' appearance-none pr-8 cursor-pointer'}
        style={{ ...inputStyle, color: 'white' }}>
        {options.map((o) => <option key={o} value={o} style={{ background: '#0d0b1e' }}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'rgba(255,255,255,0.4)' }} />
    </div>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!value)}
      className="flex items-center justify-between w-full py-2"
    >
      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
      <div className="w-10 h-5.5 rounded-full transition-all duration-200 relative flex-shrink-0"
        style={{
          background: value ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'rgba(255,255,255,0.1)',
          width: 40, height: 22,
          boxShadow: value ? '0 0 10px rgba(139,92,246,0.5)' : 'none',
        }}>
        <motion.div animate={{ x: value ? 20 : 2 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
        />
      </div>
    </button>
  );
}

/* ─── Modo badge ─────────────────────────────────────────────────────────── */
function ModoBadge({ video }: { video: AdminVideo }) {
  const isAudioLoop = usaAudioLoop(video);
  if (isAudioLoop) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-[14px] mb-5"
        style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}>
        <Music size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
        <div>
          <p className="text-[12px] font-black" style={{ color: '#fbbf24' }}>Modo Audio + Loop</p>
          <p className="text-[10px] leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Esta categoría usa audio narrado + video corto en loop. Hasta 10x más ligero que video completo.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-[14px] mb-5"
      style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)' }}>
      <Film size={14} style={{ color: '#a78bfa', flexShrink: 0 }} />
      <div>
        <p className="text-[12px] font-black" style={{ color: '#a78bfa' }}>Modo Video Completo</p>
        <p className="text-[10px] leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Esta categoría usa video completo con sus propios apoyos visuales.
        </p>
      </div>
    </div>
  );
}

/* ─── Delete confirm modal ───────────────────────────────────────────────── */
function DeleteConfirm({
  title, onConfirm, onCancel,
}: { title: string; onConfirm: () => void; onCancel: () => void }) {
  const portal = document.getElementById('phone-frame');
  if (!portal) return null;
  return createPortal(
    <motion.div className="absolute inset-0 z-[90] flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.88, y: 20 }} animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[300px] rounded-[24px] p-5"
        style={{ background: 'rgba(15,12,32,0.98)', border: '1px solid rgba(239,68,68,0.3)' }}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertTriangle size={22} style={{ color: '#ef4444' }} />
          </div>
          <p className="text-white font-bold">¿Eliminar contenido?</p>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            "{title}" será eliminado permanentemente.
          </p>
          <div className="flex gap-3 w-full mt-1">
            <button onClick={onCancel}
              className="flex-1 py-2.5 rounded-[12px] text-sm font-bold active:scale-95 transition-transform"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>
              Cancelar
            </button>
            <button onClick={onConfirm}
              className="flex-1 py-2.5 rounded-[12px] text-sm font-bold active:scale-95 transition-transform"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
              Eliminar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    portal
  );
}

/* ─── Video form modal ───────────────────────────────────────────────────── */
interface VideoFormProps {
  initial: Omit<AdminVideo, 'id' | 'createdAt' | 'updatedAt'>;
  onSave:  (data: Omit<AdminVideo, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
  isEdit?: boolean;
}

function VideoForm({ initial, onSave, onClose, isEdit }: VideoFormProps) {
  const [form, setForm] = useState({ ...initial });
  const [tagsStr, setTagsStr] = useState((initial.tags ?? []).join(', '));

  const update = (key: keyof typeof form) => (v: unknown) =>
    setForm((f) => ({ ...f, [key]: v }));

  // Determina si mostramos campos de audio+loop basado en el estado del form o elección manual
  const esAudioLoop = form.player_mode === 'audio_loop' || (form.audioFile && form.loopFile);

  const handleSave = () => {
    if (!form.titulo.trim() || !form.imagen.trim()) return;
    onSave({ ...form, tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean) });
  };

  const portal = document.getElementById('phone-frame');
  if (!portal) return null;
  return createPortal(
    <motion.div className="absolute inset-0 z-[80] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute bottom-0 left-0 right-0 flex flex-col rounded-t-[28px] overflow-hidden"
        style={{ maxHeight: '92%', background: 'linear-gradient(180deg,rgba(10,8,25,0.99) 0%,rgba(6,5,18,1) 100%)', border: '1px solid rgba(139,92,246,0.2)', borderBottom: 'none' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Video size={15} style={{ color: '#a78bfa' }} />
            <p className="text-white font-bold text-sm">{isEdit ? 'Editar video' : 'Nuevo video'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <X size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ overscrollBehavior: 'contain' }}>

          {/* ── Info básica ── */}
          <Field label="Título" required>
            <TextInput value={form.titulo} onChange={update('titulo')} placeholder="Ej: El poder del hábito" />
          </Field>
          <Field label="Descripción">
            <TextInput value={form.descripcion ?? ''} onChange={update('descripcion')} placeholder="Descripción del contenido..." multiline />
          </Field>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="Categoría" required>
              <SelectInput value={form.categoria} onChange={update('categoria')} options={CATEGORIAS_VIDEO} />
            </Field>
            <Field label="Duración (mm:ss)" required>
              <TextInput value={form.duracion} onChange={update('duracion')} placeholder="45:23" />
            </Field>
          </div>

          {/* ── Selección de Modo de Reproducción ── */}
          <div className="mb-6 p-4 rounded-[18px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[11px] font-bold mb-3 tracking-wider text-purple-400 uppercase">Modo de Reproducción</p>
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.preventDefault(); update('player_mode')('video_completo'); }}
                className={`flex-1 py-3 rounded-[14px] flex flex-col items-center gap-1.5 transition-all
                  ${form.player_mode === 'video_completo' ? 'bg-purple-600/20 border-purple-500/50' : 'bg-white/5 border-transparent'}`}
                style={{ border: '1px solid' }}
              >
                <Film size={18} className={form.player_mode === 'video_completo' ? 'text-purple-400' : 'text-white/30'} />
                <span className="text-[10px] font-bold">Video completo</span>
              </button>
              <button
                onClick={(e) => { e.preventDefault(); update('player_mode')('audio_loop'); }}
                className={`flex-1 py-3 rounded-[14px] flex flex-col items-center gap-1.5 transition-all
                  ${form.player_mode === 'audio_loop' ? 'bg-amber-600/20 border-amber-500/50' : 'bg-white/5 border-transparent'}`}
                style={{ border: '1px solid' }}
              >
                <Music size={18} className={form.player_mode === 'audio_loop' ? 'text-amber-400' : 'text-white/30'} />
                <span className="text-[10px] font-bold">Audio + Loop</span>
              </button>
            </div>
          </div>

          <ModoBadge video={form as any} />

          {/* ── Portadas ── */}
          <Field label="Portada cuadrada" required>
            <TextInput value={form.imagen} onChange={update('imagen')} placeholder="URL o sube desde R2 ↓" />
            {form.imagen && (
              <div className="mt-2 rounded-[10px] overflow-hidden h-20 w-20">
                <img src={form.imagen} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="mt-2">
              <R2Uploader
                folder="covers"
                contentTitle={form.titulo}
                currentValue={form.imagen || undefined}
                onUploaded={(url) => update('imagen')(url)}
              />
            </div>
          </Field>

          <Field label="Portada landscape (opcional)">
            <TextInput value={form.imagenLandscape ?? ''} onChange={update('imagenLandscape')} placeholder="URL panorámica 16:9 o sube ↓" />
            <div className="mt-2">
              <R2Uploader
                folder="covers"
                contentTitle={`${form.titulo}-landscape`}
                currentValue={form.imagenLandscape || undefined}
                onUploaded={(url) => update('imagenLandscape')(url)}
              />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="Autor">
              <TextInput value={form.autor ?? ''} onChange={update('autor')} placeholder="Nombre" />
            </Field>
            <Field label="Año">
              <TextInput value={form.año ?? ''} onChange={update('año')} placeholder="2025" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="Rating (0-5)">
              <TextInput value={form.rating ?? ''} onChange={update('rating')} placeholder="4.8" />
            </Field>
            <Field label="% Match">
              <TextInput value={String(form.match ?? 90)} onChange={(v) => update('match')(Number(v) || 90)} placeholder="90" />
            </Field>
          </div>
          <Field label="Tags (separados por coma)">
            <TextInput value={tagsStr} onChange={setTagsStr} placeholder="Motivación, Hábitos, Liderazgo" />
          </Field>

          {/* Toggles */}
          <div className="rounded-[16px] overflow-hidden mb-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-4 py-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <Toggle value={form.premium ?? false} onChange={update('premium')} label="🔒 Contenido Premium" />
              <Toggle value={form.esFree ?? false} onChange={update('esFree')} label="🆓 Contenido Gratuito" />
              <Toggle value={form.nuevo ?? false} onChange={update('nuevo')} label="🆕 Marcar como Nuevo" />
              <Toggle value={form.estreno ?? false} onChange={update('estreno')} label="⭐ Marcar como Estreno" />
            </div>
          </div>

          {/* ══════════════════════════════════════════
              SECCIÓN DE MEDIOS — cambia según categoría
              ══════════════════════════════════════════ */}
          <AnimatePresence mode="wait">

            {/* ── MODO AUDIO + LOOP (Meditación, Libros) ── */}
            {esAudioLoop && (
              <motion.div key="audio-loop-mode"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="space-y-5">

                {/* AUDIO */}
                <div className="rounded-[18px] p-4"
                  style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Music size={14} style={{ color: '#fbbf24' }} />
                    <span className="text-[12px] font-black tracking-wide" style={{ color: '#fbbf24' }}>
                      AUDIO — narración o música
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-auto"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                      audios/
                    </span>
                  </div>
                  <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    El audio principal: narración del libro, guía de meditación o música. MP3 o M4A.
                    La duración del audio define el tiempo del reproductor — ponla exacta en mm:ss arriba.
                  </p>
                  <div className="mb-2">
                    <TextInput
                      value={form.audioFile ?? ''}
                      onChange={update('audioFile')}
                      placeholder="nombre-del-audio (sin extensión)"
                    />
                    {form.audioFile && (
                      <p className="text-[10px] mt-1 pl-1" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                        → audios/{form.audioFile}.mp3
                      </p>
                    )}
                  </div>
                  <R2Uploader
                    folder="audios"
                    contentTitle={form.titulo}
                    currentValue={form.audioFile || undefined}
                    onUploaded={(_url, filename) => update('audioFile')(filename)}
                  />
                </div>

                {/* LOOP */}
                <div className="rounded-[18px] p-4"
                  style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Film size={14} style={{ color: '#38bdf8' }} />
                    <span className="text-[12px] font-black tracking-wide" style={{ color: '#38bdf8' }}>
                      CLIP VISUAL EN LOOP — fondo visual
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-auto"
                      style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>
                      loops/
                    </span>
                  </div>
                  <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Video corto SIN AUDIO (cualquier duración) que se repite en loop como fondo visual
                    mientras suena el audio. Ej: lluvia, velas, naturaleza, espacio…
                  </p>
                  <div className="mb-2">
                    <TextInput
                      value={form.loopFile ?? ''}
                      onChange={update('loopFile')}
                      placeholder="nombre-del-loop (sin extensión)"
                    />
                    {form.loopFile && (
                      <p className="text-[10px] mt-1 pl-1" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                        → loops/{form.loopFile}.mp4
                      </p>
                    )}
                  </div>
                  <R2Uploader
                    folder="loops"
                    contentTitle={`loop-${form.titulo}`}
                    currentValue={form.loopFile || undefined}
                    onUploaded={(_url, filename) => update('loopFile')(filename)}
                    forceExt=".mp4"
                  />
                </div>
              </motion.div>
            )}

            {/* ── MODO VIDEO COMPLETO (Historias de Líderes, Negocios, etc.) ── */}
            {!esAudioLoop && (
              <motion.div key="video-full-mode"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>

                <div className="rounded-[18px] p-4"
                  style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Film size={14} style={{ color: '#a78bfa' }} />
                    <span className="text-[12px] font-black tracking-wide" style={{ color: '#a78bfa' }}>
                      VIDEO COMPLETO
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-auto"
                      style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                      videos/
                    </span>
                  </div>
                  <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Video completo con sus apoyos visuales propios (imágenes, clips, animaciones). MP4.
                  </p>
                  <div className="mb-2">
                    <TextInput
                      value={form.videoFile ?? ''}
                      onChange={update('videoFile')}
                      placeholder="nombre-del-video (sin extensión)"
                    />
                    {form.videoFile && (
                      <p className="text-[10px] mt-1 pl-1" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                        → videos/{form.videoFile}.mp4
                      </p>
                    )}
                  </div>
                  <R2Uploader
                    folder="videos"
                    contentTitle={form.titulo}
                    currentValue={form.videoFile || undefined}
                    onUploaded={(_url, filename) => update('videoFile')(filename)}
                    forceExt=".mp4"
                  />
                </div>

                {/* AUDIO DE FONDO (para background playback en videos pesados) */}
                <div className="rounded-[18px] p-4 mt-5"
                  style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Music size={14} style={{ color: '#fbbf24' }} />
                    <span className="text-[12px] font-black tracking-wide" style={{ color: '#fbbf24' }}>
                      AUDIO DE FONDO — background
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-auto"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                      audios/
                    </span>
                  </div>
                  <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Audio extraído del video (ffmpeg -i video.mp4 -vn -acodec aac -b:a 128k audio.m4a).
                    Se usa cuando el usuario minimiza la app para seguir escuchando sin decodificar el video pesado. Opcional.
                  </p>
                  <div className="mb-2">
                    <TextInput
                      value={form.bgAudioFile ?? ''}
                      onChange={update('bgAudioFile')}
                      placeholder="nombre-del-audio-bg (sin extensión)"
                    />
                    {form.bgAudioFile && (
                      <p className="text-[10px] mt-1 pl-1" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                        → audios/{form.bgAudioFile}.m4a
                      </p>
                    )}
                  </div>
                  <R2Uploader
                    folder="audios"
                    contentTitle={`bg-${form.titulo}`}
                    currentValue={form.bgAudioFile || undefined}
                    onUploaded={(_url, filename) => update('bgAudioFile')(filename)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-4" />
        </div>

        {/* Save button */}
        <div className="px-5 pb-8 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleSave}
            disabled={!form.titulo.trim() || !form.imagen.trim()}
            className="w-full py-3.5 rounded-[16px] flex items-center justify-center gap-2 font-bold text-sm active:scale-98 transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}
          >
            <Check size={16} className="text-white" />
            <span className="text-white">{isEdit ? 'Guardar cambios' : 'Publicar video'}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>,
    portal
  );
}

/* ─── Short form modal ───────────────────────────────────────────────────── */
interface ShortFormProps {
  initial: Omit<AdminShort, 'id' | 'createdAt' | 'updatedAt'>;
  onSave:  (data: Omit<AdminShort, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
  isEdit?: boolean;
}

function ShortForm({ initial, onSave, onClose, isEdit }: ShortFormProps) {
  const [form, setForm] = useState({ ...initial });
  const update = (key: keyof typeof form) => (v: unknown) =>
    setForm((f) => ({ ...f, [key]: v }));
  const [showCatTag, setShowCatTag] = useState(false);

  const handleSave = () => {
    if (!form.titulo.trim() || !form.thumbnail.trim()) return;
    onSave({ ...form });
  };

  const portal = document.getElementById('phone-frame');
  if (!portal) return null;
  return createPortal(
    <motion.div className="absolute inset-0 z-[80] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute bottom-0 left-0 right-0 flex flex-col rounded-t-[28px] overflow-hidden"
        style={{ maxHeight: '85%', background: 'linear-gradient(180deg,rgba(10,8,25,0.99) 0%,rgba(6,5,18,1) 100%)', border: '1px solid rgba(236,72,153,0.2)', borderBottom: 'none' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Zap size={15} style={{ color: '#ec4899' }} />
            <p className="text-white font-bold text-sm">{isEdit ? 'Editar short' : 'Nuevo short'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <X size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ overscrollBehavior: 'contain' }}>
          <Field label="Título" required>
            <TextInput value={form.titulo} onChange={update('titulo')} placeholder="Ej: 3 técnicas de meditación" />
          </Field>
          <Field label="Descripción" required>
            <TextInput value={form.descripcion} onChange={update('descripcion')} placeholder="Descripción breve del short..." multiline />
          </Field>
          <div className="mb-4">
            <Field label="Duración (seg)">
              <TextInput value={String(form.duracionSeg)} onChange={(v) => update('duracionSeg')(Number(v) || 60)} placeholder="60" />
            </Field>
          </div>

          {/* Toggle categoría/etiqueta — ocultos por defecto */}
          <button
            type="button"
            onClick={() => setShowCatTag(v => !v)}
            className="flex items-center gap-2 mb-3 text-[11px] font-semibold active:opacity-70 transition-opacity"
            style={{ color: showCatTag ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}
          >
            <div
              className="w-8 h-4 rounded-full relative transition-colors"
              style={{ background: showCatTag ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.1)', border: showCatTag ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.12)' }}
            >
              <div
                className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                style={{ left: showCatTag ? '17px' : '2px', background: showCatTag ? '#a78bfa' : 'rgba(255,255,255,0.35)' }}
              />
            </div>
            Habilitar categoría y etiqueta (próximamente)
          </button>

          {showCatTag && (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Field label="Categoría" required>
                  <SelectInput value={form.categoria} onChange={update('categoria')} options={CATEGORIAS_SHORT} />
                </Field>
              </div>
              <Field label="Etiqueta (Tag)">
                <SelectInput value={form.tag} onChange={update('tag')} options={SHORT_TAGS} />
              </Field>
            </div>
          )}

          <Field label="Thumbnail vertical" required>
            <TextInput value={form.thumbnail} onChange={update('thumbnail')} placeholder="https://... (9:16)" />
            {form.thumbnail && (
              <div className="mt-2 rounded-[10px] overflow-hidden" style={{ width: 60, height: 100 }}>
                <img src={form.thumbnail} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="mt-2">
              <R2Uploader
                folder="covers"
                contentTitle={`short-${form.titulo}`}
                currentValue={form.thumbnail || undefined}
                onUploaded={(url) => update('thumbnail')(url)}
              />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="Autor">
              <TextInput value={form.autor} onChange={update('autor')} placeholder="Morix" />
            </Field>
            <Field label="Audio / Canción">
              <TextInput value={form.audio} onChange={update('audio')} placeholder="Nombre del audio" />
            </Field>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-[12px] mb-6"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <span className="text-sm">☁️</span>
            <p className="text-[11px]" style={{ color: 'rgba(245,158,11,0.8)' }}>
              El video del short se sube a R2/shorts/ desde esta pantalla. La thumbnail es la portada visible al navegar.
            </p>
          </div>

          {/* Short video upload */}
          <div className="rounded-[18px] p-4"
            style={{ background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.15)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} style={{ color: '#ec4899' }} />
              <span className="text-[12px] font-black tracking-wide" style={{ color: '#ec4899' }}>
                VIDEO DEL SHORT
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-auto"
                style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899', border: '1px solid rgba(236,72,153,0.3)' }}>
                shorts/
              </span>
            </div>
            <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Clip vertical 9:16, máx 60 seg. Se reproducirá en loop en el feed de Shorts.
            </p>
            {/* Campo manual de nombre */}
            <div className="mb-3">
              <TextInput
                value={form.videoFile ?? ''}
                onChange={update('videoFile')}
                placeholder="nombre-del-video (sin extensión)"
              />
              {form.videoFile && (
                <p className="text-[10px] mt-1 pl-1" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                  → shorts/{form.videoFile}.mp4
                </p>
              )}
            </div>
            <R2Uploader
              folder="shorts"
              contentTitle={form.titulo}
              currentValue={form.videoFile || undefined}
              onUploaded={(_url, filename) => update('videoFile')(filename)}
              forceExt=".mp4"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="px-5 pb-8 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleSave}
            disabled={!form.titulo.trim() || !form.thumbnail.trim()}
            className="w-full py-3.5 rounded-[16px] flex items-center justify-center gap-2 font-bold text-sm active:scale-98 transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', boxShadow: '0 0 20px rgba(236,72,153,0.4)' }}
          >
            <Check size={16} className="text-white" />
            <span className="text-white">{isEdit ? 'Guardar cambios' : 'Publicar short'}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>,
    portal
  );
}

/* ─── Video card item ───────────────────────────────────────────────────── */
function VideoItem({
  video, onEdit, onDelete,
}: { video: AdminVideo; onEdit: () => void; onDelete: () => void }) {
  const esAL = usaAudioLoop(video);
  const tieneMedia = esAL ? !!(video.audioFile) : !!(video.videoFile);
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 p-3 rounded-[18px] mb-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-[12px] overflow-hidden flex-shrink-0 bg-white/5">
        {video.imagen
          ? <img src={video.imagen} alt={video.titulo} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Image size={18} style={{ color: 'rgba(255,255,255,0.2)' }} /></div>
        }
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-[13px] font-bold leading-tight line-clamp-2 mb-0.5">{video.titulo}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}>
            {video.categoria}
          </span>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{video.duracion}</span>
          {video.premium && <span className="text-[9px]" style={{ color: '#f59e0b' }}>👑</span>}
          {video.esFree && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
              🆓 Free
            </span>
          )}
          {/* Modo badge */}
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
            style={{
              background: esAL ? 'rgba(251,191,36,0.1)' : 'rgba(139,92,246,0.1)',
              color: esAL ? '#fbbf24' : '#a78bfa',
              border: `1px solid ${esAL ? 'rgba(251,191,36,0.2)' : 'rgba(139,92,246,0.2)'}`,
            }}>
            {esAL ? '🎵 Audio+Loop' : '🎬 Video'}
          </span>
          {/* Media status */}
          {tieneMedia
            ? (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
                ☁️ R2
              </span>
            ) : (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                Sin media
              </span>
            )
          }
        </div>
        <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Hace {timeAgo(video.updatedAt)}
        </p>
      </div>
      {/* Actions */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <button onClick={onEdit}
          className="w-7 h-7 rounded-[8px] flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
          <Pencil size={11} style={{ color: '#a78bfa' }} />
        </button>
        <button onClick={onDelete}
          className="w-7 h-7 rounded-[8px] flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <Trash2 size={11} style={{ color: '#f87171' }} />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Short card item ─────────────────────────────────────────────────────── */
function ShortItem({
  short, onEdit, onDelete,
}: { short: AdminShort; onEdit: () => void; onDelete: () => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 p-3 rounded-[18px] mb-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="rounded-[10px] overflow-hidden flex-shrink-0 bg-white/5" style={{ width: 40, height: 66 }}>
        {short.thumbnail
          ? <img src={short.thumbnail} alt={short.titulo} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Image size={14} style={{ color: 'rgba(255,255,255,0.2)' }} /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-[13px] font-bold leading-tight line-clamp-2 mb-0.5">{short.titulo}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: 'rgba(236,72,153,0.2)', color: '#f472b6' }}>
            {short.tag}
          </span>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{short.duracionSeg}s</span>
        </div>
        <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Hace {timeAgo(short.updatedAt)}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <button onClick={onEdit}
          className="w-7 h-7 rounded-[8px] flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.25)' }}>
          <Pencil size={11} style={{ color: '#f472b6' }} />
        </button>
        <button onClick={onDelete}
          className="w-7 h-7 rounded-[8px] flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <Trash2 size={11} style={{ color: '#f87171' }} />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Broadcast types config ─────────────────────────────────────────────── */
const BROADCAST_TYPES: { key: BroadcastType; label: string; icon: string; color: string }[] = [
  { key: 'info',        label: 'Información',    icon: 'ℹ️',  color: '#3b82f6' },
  { key: 'new_content', label: 'Nuevo contenido', icon: '⭐',  color: '#8b5cf6' },
  { key: 'achievement', label: 'Logro',           icon: '🏆',  color: '#f59e0b' },
  { key: 'streak',      label: 'Motivación',      icon: '🔥',  color: '#f97316' },
  { key: 'promo',       label: 'Promoción',       icon: '🎁',  color: '#ec4899' },
  { key: 'update',      label: 'Actualización',   icon: '🚀',  color: '#22c55e' },
];

/* ─── BroadcastForm ──────────────────────────────────────────────────────── */
function BroadcastForm({
  onSend, onClose, senderEmail,
}: {
  onSend: (n: Omit<BroadcastNotif, 'id' | 'sentAt'>) => void;
  onClose: () => void;
  senderEmail: string;
}) {
  const [title, setTitle]       = useState('');
  const [body,  setBody]        = useState('');
  const [selectedType, setType] = useState<BroadcastType>('info');
  const typeInfo = BROADCAST_TYPES.find(t => t.key === selectedType)!;

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return;
    onSend({ type: selectedType, title: title.trim(), body: body.trim(), icon: typeInfo.icon, accentColor: typeInfo.color, sentBy: senderEmail });
  };

  const portal = document.getElementById('phone-frame');
  if (!portal) return null;
  return createPortal(
    <motion.div className="absolute inset-0 z-[80] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute bottom-0 left-0 right-0 flex flex-col rounded-t-[28px] overflow-hidden"
        style={{ maxHeight: '90%', background: 'linear-gradient(180deg,rgba(10,8,25,0.99) 0%,rgba(6,5,18,1) 100%)', border: '1px solid rgba(59,130,246,0.25)', borderBottom: 'none' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Bell size={15} style={{ color: '#3b82f6' }} />
            <p className="text-white font-bold text-sm">Nueva notificación global</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <X size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>
        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ overscrollBehavior: 'contain' }}>
          <p className="text-[11px] font-bold mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>TIPO</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {BROADCAST_TYPES.map(t => (
              <button key={t.key} onClick={() => setType(t.key)}
                className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-[14px] transition-all active:scale-95"
                style={{ background: selectedType === t.key ? `${t.color}18` : 'rgba(255,255,255,0.04)', border: selectedType === t.key ? `1px solid ${t.color}50` : '1px solid rgba(255,255,255,0.07)', boxShadow: selectedType === t.key ? `0 0 12px ${t.color}25` : 'none' }}>
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <span className="text-[9px] font-bold" style={{ color: selectedType === t.key ? t.color : 'rgba(255,255,255,0.4)' }}>{t.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>TÍTULO <span style={{ color: '#f87171' }}>*</span></p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: ¡Nuevo curso disponible!" maxLength={80}
            className="w-full rounded-[12px] px-3 py-2.5 text-white text-sm outline-none mb-3"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', caretColor: typeInfo.color }} />
          <p className="text-[11px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>MENSAJE <span style={{ color: '#f87171' }}>*</span></p>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Escribe el mensaje para todos los usuarios..." maxLength={200} rows={3}
            className="w-full rounded-[12px] px-3 py-2.5 text-white text-sm outline-none resize-none mb-1"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', caretColor: typeInfo.color }} />
          <p className="text-[10px] text-right mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>{body.length}/200</p>
          {(title || body) && (
            <div className="mb-4 rounded-[16px] p-3 flex items-start gap-3"
              style={{ background: `${typeInfo.color}10`, border: `1px solid ${typeInfo.color}30` }}>
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: `${typeInfo.color}20` }}>
                <span style={{ fontSize: 18 }}>{typeInfo.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[12px] font-bold leading-tight mb-0.5 line-clamp-1">{title || 'Título'}</p>
                <p className="text-[11px] leading-snug line-clamp-2" style={{ color: 'rgba(255,255,255,0.55)' }}>{body || 'Vista previa...'}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] mb-5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Smartphone size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Se enviará a todos los usuarios. También como notificación del dispositivo si lo han permitido.
            </p>
          </div>
        </div>
        {/* Send button */}
        <div className="px-5 pb-8 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <motion.button whileTap={{ scale: 0.96 }} onClick={handleSend} disabled={!title.trim() || !body.trim()}
            className="w-full py-3.5 rounded-[16px] font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: (!title.trim() || !body.trim()) ? 'rgba(255,255,255,0.07)' : `linear-gradient(135deg,${typeInfo.color},${typeInfo.color}cc)`, color: (!title.trim() || !body.trim()) ? 'rgba(255,255,255,0.25)' : 'white', boxShadow: (!title.trim() || !body.trim()) ? 'none' : `0 0 20px ${typeInfo.color}50` }}>
            <Send size={15} />
            Enviar a todos los usuarios
          </motion.button>
        </div>
      </motion.div>
    </motion.div>,
    portal,
  );
}

/* ─── BroadcastItem ──────────────────────────────────────────────────────── */
function BroadcastItem({ notif, onDelete }: { notif: BroadcastNotif; onDelete: () => void }) {
  const ago = (() => {
    const diff = Date.now() - notif.sentAt;
    const min  = Math.floor(diff / 60_000);
    const h    = Math.floor(diff / 3_600_000);
    const d    = Math.floor(diff / 86_400_000);
    if (min < 1)  return 'ahora';
    if (min < 60) return `hace ${min}m`;
    if (h < 24)   return `hace ${h}h`;
    if (d === 1)  return 'ayer';
    return `hace ${d} días`;
  })();

  return (
    <motion.div layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}
      className="flex items-start gap-3 mb-3 rounded-[16px] p-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${notif.accentColor}25` }}>
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: `${notif.accentColor}18` }}>
        <span style={{ fontSize: 18 }}>{notif.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-[12px] font-bold leading-tight mb-0.5 line-clamp-1">{notif.title}</p>
        <p className="text-[11px] leading-snug line-clamp-2 mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{notif.body}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: `${notif.accentColor}20`, color: notif.accentColor }}>
            {BROADCAST_TYPES.find(t => t.key === notif.type)?.label ?? notif.type}
          </span>
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{ago}</span>
        </div>
      </div>
      <button onClick={onDelete} className="w-7 h-7 rounded-[8px] flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <Trash2 size={12} style={{ color: '#f87171' }} />
      </button>
    </motion.div>
  );
}

/* ─── SearchBar reutilizable ─────────────────────────────────────────────── */
function SearchBar({
  value, onChange, placeholder, accent = '#a78bfa',
}: { value: string; onChange: (v: string) => void; placeholder?: string; accent?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative mb-4">
      <Search
        size={13}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: focused ? accent : 'rgba(255,255,255,0.3)' }}
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder ?? 'Buscar...'}
        className="w-full pl-9 pr-9 py-2.5 rounded-[14px] text-sm text-white outline-none transition-all"
        style={{
          background: focused ? `${accent}0d` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${focused ? accent + '50' : 'rgba(255,255,255,0.09)'}`,
          caretColor: accent,
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <X size={10} style={{ color: 'rgba(255,255,255,0.6)' }} />
        </button>
      )}
    </div>
  );
}

/* ─── NotifsTab ──────────────────────────────────────────────────────────── */
function NotifsTab({ adminEmail, onOpenForm }: { adminEmail: string; onOpenForm: () => void }) {
  const { broadcasts, deleteBroadcast, requestPushPermission, pushPermission } = useBroadcastNotifications();
  const [deleteTarget, setDelete] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const permColor = pushPermission === 'granted' ? '#22c55e' : pushPermission === 'denied' ? '#ef4444' : '#f59e0b';
  const permLabel = pushPermission === 'granted' ? 'Push activado' : pushPermission === 'denied' ? 'Push bloqueado' : 'Push sin configurar';
  const PermIcon  = pushPermission === 'granted' ? CheckCircle2 : pushPermission === 'denied' ? XCircle : Info;

  const q = query.toLowerCase().trim();
  const filtered = q
    ? broadcasts.filter(b => b.title.toLowerCase().includes(q) || b.body.toLowerCase().includes(q))
    : broadcasts;

  return (
    <motion.div key="notifs" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
      {/* Estado push */}
      <div className="flex items-center justify-between rounded-[16px] p-3 mb-4"
        style={{ background: `${permColor}0d`, border: `1px solid ${permColor}30` }}>
        <div className="flex items-center gap-2">
          <PermIcon size={14} style={{ color: permColor }} />
          <div>
            <p className="text-white text-[11px] font-bold">{permLabel}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Notificaciones del dispositivo</p>
          </div>
        </div>
        {pushPermission !== 'granted' && pushPermission !== 'denied' && (
          <button onClick={requestPushPermission}
            className="px-3 py-1.5 rounded-full text-[10px] font-bold active:scale-95 transition-transform"
            style={{ background: `${permColor}20`, color: permColor, border: `1px solid ${permColor}40` }}>
            Activar
          </button>
        )}
      </div>
      {/* Stats */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 rounded-[14px] p-3 text-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <p className="text-white font-black text-lg">{broadcasts.length}</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>enviadas</p>
        </div>
        <div className="flex-1 rounded-[14px] p-3 text-center" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <p className="text-white font-black text-lg">{broadcasts.filter(b => Date.now() - b.sentAt < 86_400_000).length}</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>hoy</p>
        </div>
      </div>

      {/* Buscador */}
      {broadcasts.length > 0 && (
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar por título o mensaje..." accent="#60a5fa" />
      )}

      {/* Lista */}
      {broadcasts.length === 0 ? (
        <div className="flex flex-col items-center py-14 gap-4">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <Bell size={28} style={{ color: 'rgba(59,130,246,0.4)' }} />
          </div>
          <div className="text-center">
            <p className="text-white font-bold mb-1">Sin notificaciones enviadas</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Toca el + para crear tu primera notificación global</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-3">
          <Search size={28} style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Sin resultados para "{query}"</p>
        </div>
      ) : (
        <AnimatePresence>
          {filtered.map(b => (
            <BroadcastItem key={b.id} notif={b} onDelete={() => setDelete(b.id)} />
          ))}
        </AnimatePresence>
      )}
      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm key="bc-delete" title="esta notificación"
            onConfirm={() => { deleteBroadcast(deleteTarget); setDelete(null); }}
            onCancel={() => setDelete(null)} />
        )}
      </AnimatePresence>
      <div className="h-24" />
    </motion.div>
  );
}

/* ─── Main Admin screen ───────────────────────────────────────────────────── */
export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    videos, shorts,
    addVideo, updateVideo, deleteVideo,
    addShort, updateShort, deleteShort,
  } = useAdminContent();

  // ── Navigation: null = hub principal, string = sub-pantalla activa ──────
  const [view, setView] = useState<'videos' | 'shorts' | 'notifs' | 'stats' | null>(null);

  // ── Búsqueda por sub-pantalla ────────────────────────────────────────────
  const [videoQuery, setVideoQuery] = useState('');
  const [shortQuery, setShortQuery] = useState('');

  // Limpiar query al navegar
  const goTo = (v: typeof view) => {
    setVideoQuery('');
    setShortQuery('');
    setView(v);
  };

  const [videoFormOpen, setVideoFormOpen]   = useState(false);
  const [editingVideo, setEditingVideo]     = useState<AdminVideo | null>(null);
  const [shortFormOpen, setShortFormOpen]   = useState(false);
  const [editingShort, setEditingShort]     = useState<AdminShort | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<{ type: 'video' | 'short'; id: string; title: string } | null>(null);
  const [publicShorts, setPublicShorts]     = useState(getPublicShortsEnabled);
  const [broadcastFormOpen, setBroadcastFormOpen] = useState(false);
  const [broadcastSent, setBroadcastSent]   = useState(false);
  const { addBroadcast } = useBroadcastNotifications();

  if (!user || !isAdminEmail(user.email)) {
    return (
      <div className="absolute inset-0 bg-[#030309] flex flex-col items-center justify-center gap-4 px-8 text-center">
        <Shield size={40} style={{ color: 'rgba(255,255,255,0.2)' }} />
        <p className="text-white font-bold">Acceso restringido</p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          No tienes permisos para ver esta sección.
        </p>
        <button onClick={() => navigate(-1)}
          className="px-5 py-2 rounded-full text-sm font-bold"
          style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}>
          Volver
        </button>
      </div>
    );
  }

  const handleSaveVideo = async (data: Omit<AdminVideo, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingVideo) {
      await updateVideo(editingVideo.id, data);
    } else {
      await addVideo(data);
      // Notificar a todos los usuarios
      addBroadcast({
        type: 'new_content',
        title: '🎬 ¡Nuevo video disponible!',
        body: `Ya puedes ver "${data.titulo}" en la categoría ${data.categoria}.`,
        icon: '🎬',
        accentColor: '#8b5cf6',
        sentBy: user.email ?? 'Admin',
      });
    }
    setVideoFormOpen(false);
    setEditingVideo(null);
  };

  const handleSaveShort = async (data: Omit<AdminShort, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingShort) {
      await updateShort(editingShort.id, data);
    } else {
      await addShort(data);
      // Notificar a todos los usuarios
      addBroadcast({
        type: 'new_content',
        title: '⚡ ¡Nuevo short publicado!',
        body: `Descubre: "${data.titulo}". ¡No te lo pierdas!`,
        icon: '⚡',
        accentColor: '#ec4899',
        sentBy: user.email ?? 'Admin',
      });
    }
    setShortFormOpen(false);
    setEditingShort(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'video') await deleteVideo(deleteTarget.id);
    else await deleteShort(deleteTarget.id);
    setDeleteTarget(null);
  };

  /* ── Filtrado de listas ────────────────────────────────────────────────── */
  const vq = videoQuery.toLowerCase().trim();
  const filteredVideos = vq
    ? videos.filter(v =>
        v.titulo.toLowerCase().includes(vq) ||
        v.categoria.toLowerCase().includes(vq) ||
        (v.autor ?? '').toLowerCase().includes(vq) ||
        (v.descripcion ?? '').toLowerCase().includes(vq)
      )
    : videos;

  const sq = shortQuery.toLowerCase().trim();
  const filteredShorts = sq
    ? shorts.filter(s =>
        s.titulo.toLowerCase().includes(sq) ||
        s.categoria.toLowerCase().includes(sq) ||
        (s.autor ?? '').toLowerCase().includes(sq) ||
        s.tag.toLowerCase().includes(sq)
      )
    : shorts;

  /* ── Secciones config ──────────────────────────────────────────────────── */
  const SECTIONS = [
    {
      key: 'videos'  as const,
      label: 'Videos',
      icon: <Video size={18} />,
      count: videos.length,
      accent: '#a78bfa',
      accentBg: 'rgba(139,92,246,0.12)',
      accentBorder: 'rgba(139,92,246,0.3)',
      badgeBg: '#8b5cf6' as string | null,
      onAdd: () => { setEditingVideo(null); setVideoFormOpen(true); },
      sub: `${videos.length} publicado${videos.length !== 1 ? 's' : ''}`,
      liveBadge: false,
    },
    {
      key: 'shorts'  as const,
      label: 'Shorts',
      icon: <Zap size={18} />,
      count: shorts.length,
      accent: '#f472b6',
      accentBg: 'rgba(236,72,153,0.12)',
      accentBorder: 'rgba(236,72,153,0.3)',
      badgeBg: '#ec4899' as string | null,
      onAdd: () => { setEditingShort(null); setShortFormOpen(true); },
      sub: `${shorts.length} publicado${shorts.length !== 1 ? 's' : ''}`,
      liveBadge: false,
    },
    {
      key: 'notifs'  as const,
      label: 'Notificaciones',
      icon: <Bell size={18} />,
      count: null as number | null,
      accent: '#60a5fa',
      accentBg: 'rgba(59,130,246,0.12)',
      accentBorder: 'rgba(59,130,246,0.3)',
      badgeBg: null as string | null,
      onAdd: () => setBroadcastFormOpen(true),
      sub: 'Mensajes globales',
      liveBadge: false,
    },
    {
      key: 'stats'   as const,
      label: 'Estadísticas',
      icon: <BarChart2 size={18} />,
      count: null as number | null,
      accent: '#fbbf24',
      accentBg: 'rgba(251,191,36,0.1)',
      accentBorder: 'rgba(251,191,36,0.3)',
      badgeBg: null as string | null,
      onAdd: null as (() => void) | null,
      sub: 'Analítica completa de la plataforma',
      liveBadge: true,
    },
    {
      key: 'marketing' as any,
      label: 'Marketing Corporativo',
      icon: <Sparkles size={18} />,
      count: null,
      accent: '#a78bfa',
      accentBg: 'rgba(139,92,246,0.12)',
      accentBorder: 'rgba(139,92,246,0.3)',
      badgeBg: null,
      onAdd: null,
      sub: 'Boletines, descuentos y noticias',
      liveBadge: false,
      path: '/admin/marketing'
    },
  ];

  /* ── Sub-screen slide wrapper ──────────────────────────────────────────── */
  const slideProps = {
    initial:    { x: '100%' },
    animate:    { x: 0 },
    exit:       { x: '100%' },
    transition: { type: 'spring' as const, damping: 28, stiffness: 280 },
  };

  return (
    <div className="absolute inset-0 bg-[#030309] flex flex-col overflow-hidden" style={{ zIndex: 50 }}>
      <AuroraBackground intensity="low" />

      <AnimatePresence mode="wait">

        {/* ══════════════════ HUB PRINCIPAL ══════════════════ */}
        {view === null && (
          <motion.div key="hub" className="relative z-10 flex flex-col h-full"
            initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-12 pb-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <ArrowLeft size={18} className="text-white" />
              </button>
              <div className="px-2.5 py-1 rounded-full flex items-center gap-1.5"
                style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                <Shield size={12} style={{ color: '#a78bfa' }} />
                <span className="text-[11px] font-black tracking-wider" style={{ color: '#a78bfa' }}>SUPER ADMIN</span>
              </div>
              <div className="flex gap-2">
                <div className="flex flex-col items-center">
                  <span className="text-white font-black text-sm">{videos.length}</span>
                  <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>videos</span>
                </div>
                <div className="w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div className="flex flex-col items-center">
                  <span className="text-white font-black text-sm">{shorts.length}</span>
                  <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>shorts</span>
                </div>
              </div>
            </div>

            {/* Cards de navegación */}
            <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4 flex flex-col gap-3"
              style={{ overscrollBehavior: 'contain' }}>
              {SECTIONS.map((sec, i) => (
                <motion.div key={sec.key}
                  initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-[18px] overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-full flex items-center gap-3 px-4 py-4 cursor-pointer select-none active:opacity-75 transition-opacity"
                    role="button" onClick={() => {
                      if ((sec as any).path) navigate((sec as any).path);
                      else goTo(sec.key);
                    }}>
                    {/* Icono */}
                    <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                      style={{ background: sec.accentBg, border: `1px solid ${sec.accentBorder}` }}>
                      <span style={{ color: sec.accent }}>{sec.icon}</span>
                    </div>
                    {/* Texto */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-[14px] leading-tight">{sec.label}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{sec.sub}</p>
                    </div>
                    {/* Count badge */}
                    {sec.count !== null && sec.count > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                        style={{ background: sec.badgeBg ?? sec.accent }}>{sec.count}</span>
                    )}
                    {/* LIVE badge */}
                    {sec.liveBadge && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-black"
                        style={{ background: 'rgba(251,191,36,0.18)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                        LIVE
                      </span>
                    )}
                    {/* Botón + */}
                    {sec.onAdd && (
                      <button
                        onClick={e => { e.stopPropagation(); sec.onAdd!(); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform ml-1"
                        style={{ background: sec.accentBg, border: `1px solid ${sec.accentBorder}` }}>
                        <Plus size={14} style={{ color: sec.accent }} />
                      </button>
                    )}
                    {/* Flecha → */}
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.3)', transform: 'rotate(-90deg)' }} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ══════════════════ PANTALLA VIDEOS ══════════════════ */}
        {view === 'videos' && (
          <motion.div key="view-videos" className="absolute inset-0 z-20 bg-[#030309] flex flex-col" {...slideProps}>
            <AuroraBackground intensity="low" />
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-3 px-4 pt-12 pb-4"
                style={{ borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
                <button onClick={() => goTo(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <ArrowLeft size={17} className="text-white" />
                </button>
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                  style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)' }}>
                  <Video size={14} style={{ color: '#a78bfa' }} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-black text-[15px] leading-tight">Videos</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{videos.length} publicados</p>
                </div>
                <button onClick={() => { setEditingVideo(null); setVideoFormOpen(true); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 0 14px rgba(139,92,246,0.5)' }}>
                  <Plus size={16} className="text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pt-3 pb-10" style={{ overscrollBehavior: 'contain' }}>
                {videos.length === 0 ? (
                  <div className="flex flex-col items-center py-20 gap-4">
                    <div className="w-14 h-14 rounded-[18px] flex items-center justify-center"
                      style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                      <LayoutGrid size={24} style={{ color: 'rgba(139,92,246,0.4)' }} />
                    </div>
                    <p className="text-white font-bold">Sin videos publicados</p>
                    <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>Toca el + para agregar tu primer video</p>
                  </div>
                ) : (
                  <>
                    <SearchBar
                      value={videoQuery}
                      onChange={setVideoQuery}
                      placeholder="Buscar por título, categoría, autor..."
                      accent="#a78bfa"
                    />
                    {filteredVideos.length === 0 ? (
                      <div className="flex flex-col items-center py-10 gap-3">
                        <Search size={28} style={{ color: 'rgba(255,255,255,0.15)' }} />
                        <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Sin resultados para "{videoQuery}"</p>
                      </div>
                    ) : (
                      <>
                        {vq && (
                          <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {filteredVideos.length} resultado{filteredVideos.length !== 1 ? 's' : ''} de {videos.length}
                          </p>
                        )}
                        {filteredVideos.map((v) => (
                          <VideoItem key={v.id} video={v}
                            onEdit={() => { setEditingVideo(v); setVideoFormOpen(true); }}
                            onDelete={() => setDeleteTarget({ type: 'video', id: v.id, title: v.titulo })}
                          />
                        ))}
                      </>
                    )}
                  </>
                )}
                <div className="h-8" />
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════ PANTALLA SHORTS ══════════════════ */}
        {view === 'shorts' && (
          <motion.div key="view-shorts" className="absolute inset-0 z-20 bg-[#030309] flex flex-col" {...slideProps}>
            <AuroraBackground intensity="low" />
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-3 px-4 pt-12 pb-4"
                style={{ borderBottom: '1px solid rgba(236,72,153,0.15)' }}>
                <button onClick={() => goTo(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <ArrowLeft size={17} className="text-white" />
                </button>
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                  style={{ background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.35)' }}>
                  <Zap size={14} style={{ color: '#f472b6' }} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-black text-[15px] leading-tight">Shorts</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{shorts.length} publicados</p>
                </div>
                <button onClick={() => { setEditingShort(null); setShortFormOpen(true); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', boxShadow: '0 0 14px rgba(236,72,153,0.5)' }}>
                  <Plus size={16} className="text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pt-3 pb-10" style={{ overscrollBehavior: 'contain' }}>
                {/* Toggle subida pública */}
                <div className="mb-4 rounded-[14px] p-3"
                  style={{ background: publicShorts ? 'rgba(236,72,153,0.06)' : 'rgba(255,255,255,0.03)', border: publicShorts ? '1px solid rgba(236,72,153,0.25)' : '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                      style={{ background: publicShorts ? 'rgba(236,72,153,0.2)' : 'rgba(255,255,255,0.07)' }}>
                      {publicShorts ? <Users size={14} style={{ color: '#f472b6' }} /> : <Lock size={14} style={{ color: 'rgba(255,255,255,0.35)' }} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-[11px] font-bold">Subida pública</p>
                      <p className="text-[10px] mt-0.5" style={{ color: publicShorts ? 'rgba(244,114,182,0.8)' : 'rgba(255,255,255,0.35)' }}>
                        {publicShorts ? 'Cualquier usuario puede subir' : 'Solo admin puede subir'}
                      </p>
                    </div>
                    <button onClick={() => { const v = !publicShorts; setPublicShorts(v); setPublicShortsEnabled(v); }}
                      className="relative flex-shrink-0 rounded-full transition-all duration-200"
                      style={{ background: publicShorts ? 'linear-gradient(135deg,#ec4899,#8b5cf6)' : 'rgba(255,255,255,0.1)', width: 38, height: 21, boxShadow: publicShorts ? '0 0 10px rgba(236,72,153,0.5)' : 'none' }}>
                      <motion.div animate={{ x: publicShorts ? 19 : 2 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="absolute top-[2.5px] w-4 h-4 rounded-full bg-white"
                        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
                    </button>
                  </div>
                </div>
                {shorts.length === 0 ? (
                  <div className="flex flex-col items-center py-20 gap-4">
                    <div className="w-14 h-14 rounded-[18px] flex items-center justify-center"
                      style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)' }}>
                      <Zap size={24} style={{ color: 'rgba(236,72,153,0.4)' }} />
                    </div>
                    <p className="text-white font-bold">Sin shorts publicados</p>
                    <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>Toca el + para agregar tu primer short</p>
                  </div>
                ) : (
                  <>
                    <SearchBar
                      value={shortQuery}
                      onChange={setShortQuery}
                      placeholder="Buscar por título, categoría, tag..."
                      accent="#f472b6"
                    />
                    {filteredShorts.length === 0 ? (
                      <div className="flex flex-col items-center py-10 gap-3">
                        <Search size={28} style={{ color: 'rgba(255,255,255,0.15)' }} />
                        <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Sin resultados para "{shortQuery}"</p>
                      </div>
                    ) : (
                      <>
                        {sq && (
                          <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {filteredShorts.length} resultado{filteredShorts.length !== 1 ? 's' : ''} de {shorts.length}
                          </p>
                        )}
                        {filteredShorts.map((s) => (
                          <ShortItem key={s.id} short={s}
                            onEdit={() => { setEditingShort(s); setShortFormOpen(true); }}
                            onDelete={() => setDeleteTarget({ type: 'short', id: s.id, title: s.titulo })}
                          />
                        ))}
                      </>
                    )}
                  </>
                )}
                <div className="h-8" />
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════ PANTALLA NOTIFICACIONES ══════════════════ */}
        {view === 'notifs' && (
          <motion.div key="view-notifs" className="absolute inset-0 z-20 bg-[#030309] flex flex-col" {...slideProps}>
            <AuroraBackground intensity="low" />
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-3 px-4 pt-12 pb-4"
                style={{ borderBottom: '1px solid rgba(59,130,246,0.15)' }}>
                <button onClick={() => goTo(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <ArrowLeft size={17} className="text-white" />
                </button>
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                  style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.35)' }}>
                  <Bell size={14} style={{ color: '#60a5fa' }} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-black text-[15px] leading-tight">Notificaciones</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Mensajes globales</p>
                </div>
                <button onClick={() => setBroadcastFormOpen(true)}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 0 14px rgba(59,130,246,0.5)' }}>
                  <Plus size={16} className="text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pt-3 pb-10" style={{ overscrollBehavior: 'contain' }}>
                <NotifsTab adminEmail={user.email ?? ''} onOpenForm={() => setBroadcastFormOpen(true)} />
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════ PANTALLA ESTADÍSTICAS ══════════════════ */}
        {view === 'stats' && (
          <motion.div key="view-stats" className="absolute inset-0 z-20 bg-[#030309] flex flex-col" {...slideProps}>
            <AuroraBackground intensity="low" />
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-3 px-4 pt-12 pb-4"
                style={{ borderBottom: '1px solid rgba(251,191,36,0.15)' }}>
                <button onClick={() => goTo(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <ArrowLeft size={17} className="text-white" />
                </button>
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                  style={{ background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.35)' }}>
                  <BarChart2 size={14} style={{ color: '#fbbf24' }} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-black text-[15px] leading-tight">Estadísticas</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Analítica completa de la plataforma</p>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-black"
                  style={{ background: 'rgba(251,191,36,0.18)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                  LIVE
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pt-3 pb-10" style={{ overscrollBehavior: 'contain' }}>
                <AnalyticsDashboard />
                <div className="h-8" />
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── Formularios (portals) — flotan sobre cualquier vista activa ── */}
      <AnimatePresence>
        {videoFormOpen && (
          <VideoForm key="video-form" initial={editingVideo ?? BLANK_VIDEO} isEdit={!!editingVideo}
            onSave={handleSaveVideo} onClose={() => { setVideoFormOpen(false); setEditingVideo(null); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {shortFormOpen && (
          <ShortForm key="short-form" initial={editingShort ?? BLANK_SHORT} isEdit={!!editingShort}
            onSave={handleSaveShort} onClose={() => { setShortFormOpen(false); setEditingShort(null); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm key="delete-confirm" title={deleteTarget.title}
            onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {broadcastFormOpen && (
          <BroadcastForm key="broadcast-form" senderEmail={user.email ?? ''}
            onSend={(n) => {
              addBroadcast(n);
              setBroadcastFormOpen(false);
              setBroadcastSent(true);
              setTimeout(() => setBroadcastSent(false), 3000);
            }}
            onClose={() => setBroadcastFormOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Toast éxito broadcast */}
      <AnimatePresence>
        {broadcastSent && (() => {
          const portal = document.getElementById('phone-frame');
          if (!portal) return null;
          return createPortal(
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="absolute bottom-24 left-4 right-4 z-[90] flex items-center gap-3 px-4 py-3 rounded-[16px]"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', backdropFilter: 'blur(12px)' }}>
              <CheckCircle2 size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
              <p className="text-[13px] font-bold" style={{ color: '#4ade80' }}>
                ✅ Notificación enviada a todos los usuarios
              </p>
            </motion.div>,
            portal,
          );
        })()}
      </AnimatePresence>
    </div>
  );
}