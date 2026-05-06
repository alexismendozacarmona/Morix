/**
 * R2Uploader — Componente genérico de upload para cualquier tipo de archivo.
 * Soporta videos, imágenes y audios. Muestra progreso real y preview.
 */
import { useRef, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, CheckCircle, AlertCircle, X,
  Film, Image, Music, Loader, Copy, FolderOpen,
} from 'lucide-react';
import { uploadToR2, getPresignedGetUrl, slugify, formatBytes, type UploadProgress } from '../utils/r2Upload';
import { R2_CREDENTIALS_SET, R2_FOLDERS, type R2Folder } from '../config/r2Config';

// ─── Config por tipo de archivo ───────────────────────────────────────────────
const FOLDER_CONFIG: Record<R2Folder, {
  label:   string;
  accept:  string;
  icon:    ReactNode;
  color:   string;
  hint:    string;
}> = {
  videos: {
    label:  'Video completo',
    accept: 'video/*',
    icon:   <Film size={16} />,
    color:  '#a78bfa',
    hint:   'MP4, MOV, WebM',
  },
  shorts: {
    label:  'Short (clip vertical)',
    accept: 'video/*',
    icon:   <Film size={16} />,
    color:  '#f472b6',
    hint:   'MP4, MOV — formato vertical 9:16',
  },
  covers: {
    label:  'Portada / Imagen',
    accept: 'image/*',
    icon:   <Image size={16} />,
    color:  '#34d399',
    hint:   'JPG, PNG, WebP',
  },
  audios: {
    label:  'Audio (narración / música)',
    accept: 'audio/*',
    icon:   <Music size={16} />,
    color:  '#fbbf24',
    hint:   'MP3, M4A, WAV — la narración o música principal',
  },
  loops: {
    label:  'Clip visual en loop (sin audio)',
    accept: 'video/*',
    icon:   <Film size={16} />,
    color:  '#38bdf8',
    hint:   'MP4 corto • se repite en bucle como fondo visual • sin audio',
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface R2UploaderProps {
  /** Carpeta R2 destino */
  folder: R2Folder;
  /** Título del contenido — genera el slug para el nombre del archivo */
  contentTitle: string;
  /** Se llama al terminar con éxito: (url, filename) */
  onUploaded: (url: string, filename: string) => void;
  /** URL/valor actual (para mostrar si ya existe) */
  currentValue?: string;
  /** Extensión forzada (ej. '.mp4'). Si no se da, usa la del archivo. */
  forceExt?: string;
}

type State = 'idle' | 'ready' | 'uploading' | 'success' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────
export function R2Uploader({
  folder,
  contentTitle,
  onUploaded,
  currentValue,
  forceExt,
}: R2UploaderProps) {
  const cfg = FOLDER_CONFIG[folder];

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const [state,    setState]    = useState<State>(currentValue ? 'success' : 'idle');
  const [file,     setFile]     = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percent: 0 });
  const [result,   setResult]   = useState<{ url: string; filename: string } | null>(
    currentValue ? { url: currentValue, filename: currentValue } : null,
  );
  const [error,  setError]  = useState('');
  const [dragOn, setDragOn] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Selección de archivo ─────────────────────────────────────────────────
  const pickFile = useCallback((f: File | null | undefined) => {
    if (!f) return;
    const isRight =
      folder === 'covers' ? f.type.startsWith('image/')  :
      folder === 'audios' ? f.type.startsWith('audio/')  :
      f.type.startsWith('video/');

    if (!isRight) {
      setError(`Archivo no válido. Se esperaba: ${cfg.hint}`);
      setState('error');
      return;
    }
    setFile(f);
    setState('ready');
    setError('');
  }, [folder, cfg.hint]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => pickFile(e.target.files?.[0]);
  const handleDrop   = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOn(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  // ── Upload ───────────────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!file) return;

    const rawExt  = file.name.split('.').pop() || 'bin';
    const ext     = forceExt ?? `.${rawExt}`;
    const base    = slugify(contentTitle || file.name.replace(/\.[^.]+$/, '')) || `file-${Date.now()}`;
    const filename = `${base}${ext.startsWith('.') ? ext : '.' + ext}`;

    setState('uploading');
    setProgress({ loaded: 0, total: file.size, percent: 0 });
    setError('');

    try {
      const res = await uploadToR2(
        file, folder, filename,
        setProgress,
        (abort) => { abortRef.current = abort; },
      );

      // Guarda siempre la URL base de S3, el AdminContentContext se encargará de crear la presigned URL para verla.
      let displayUrl = res.url;

      setResult({ ...res, url: displayUrl });
      setState('success');
      onUploaded(displayUrl, res.filename);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('AbortError')) { setState('ready'); return; }
      setError(msg);
      setState('error');
    }
  }, [file, folder, contentTitle, forceExt, onUploaded]);

  const handleCancel = () => { abortRef.current?.(); setState('ready'); };
  const handleReset  = () => {
    setState('idle'); setFile(null); setError('');
    setResult(null); setProgress({ loaded: 0, total: 0, percent: 0 });
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleCopy = () => {
    if (!result?.url) return;
    navigator.clipboard.writeText(result.url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  // ─── Sin credenciales ─────────────────────────────────────────────────────
  if (!R2_CREDENTIALS_SET) {
    return (
      <div className="rounded-[14px] p-3 flex items-start gap-2.5"
        style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <AlertCircle size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
        <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Configura las credenciales R2 en{' '}
          <code className="px-1 rounded text-[10px]"
            style={{ background: 'rgba(255,255,255,0.07)', color: '#f59e0b' }}>
            r2Config.ts
          </code>{' '}
          para activar el upload.
        </p>
      </div>
    );
  }

  // ─── Folder path indicator ────────────────────────────────────────────────
  const actualFolder = R2_FOLDERS[folder];
  const FolderBadge = () => (
    <div className="flex items-center gap-1.5 mb-2">
      <FolderOpen size={11} style={{ color: cfg.color, opacity: 0.7 }} />
      <span className="text-[10px] font-bold tracking-wide"
        style={{ color: cfg.color, opacity: 0.7, fontFamily: 'monospace' }}>
        Morix / {actualFolder} /
      </span>
    </div>
  );

  return (
    <AnimatePresence mode="wait">

      {/* ── idle / ready / error ── */}
      {(state === 'idle' || state === 'ready' || state === 'error') && (
        <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <FolderBadge />

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOn(true); }}
            onDragLeave={() => setDragOn(false)}
            onDrop={handleDrop}
            className="rounded-[14px] flex flex-col items-center justify-center gap-2 py-5 cursor-pointer transition-all"
            style={{
              border:     `2px dashed ${dragOn ? cfg.color : 'rgba(255,255,255,0.1)'}`,
              background: dragOn ? `${cfg.color}12` : 'rgba(255,255,255,0.02)',
            }}
          >
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center"
              style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`, color: cfg.color }}>
              {cfg.icon}
            </div>
            <div className="text-center px-4">
              <p className="text-[12px] font-bold" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {file ? file.name : `Arrastra o selecciona ${cfg.label.toLowerCase()}`}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {file ? formatBytes(file.size) : cfg.hint}
              </p>
            </div>
          </div>

          <input ref={inputRef} type="file" accept={cfg.accept} onChange={handleChange} className="hidden" />

          {/* Error */}
          {state === 'error' && error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 p-3 rounded-[12px] mt-2"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={12} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
              <p className="text-[11px] leading-snug" style={{ color: '#fca5a5' }}>{error}</p>
            </motion.div>
          )}

          {/* Botón upload */}
          {state === 'ready' && file && (
            <motion.button
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleUpload}
              className="w-full mt-2.5 py-2.5 rounded-[13px] flex items-center justify-center gap-2 font-bold text-[13px]"
              style={{
                background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color}88)`,
                color: 'white',
                boxShadow: `0 0 18px ${cfg.color}30`,
              }}
            >
              <Upload size={14} />
              Subir a R2 → {actualFolder}/
            </motion.button>
          )}
        </motion.div>
      )}

      {/* ── Uploading ── */}
      {state === 'uploading' && (
        <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="rounded-[14px] p-4 space-y-3"
          style={{ background: `${cfg.color}0a`, border: `1px solid ${cfg.color}25` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
                <Loader size={13} style={{ color: cfg.color }} />
              </motion.div>
              <span className="text-[12px] font-bold" style={{ color: cfg.color }}>
                Subiendo a {actualFolder}/...
              </span>
            </div>
            <span className="text-[12px] font-black text-white">{progress.percent}%</span>
          </div>

          {/* Barra de progreso */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: `linear-gradient(to right, ${cfg.color}, ${cfg.color}88)` }}
              animate={{ width: `${progress.percent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
            </span>
            <button onClick={handleCancel}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Success ── */}
      {state === 'success' && result && (
        <motion.div key="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          className="rounded-[14px] p-3.5 space-y-2.5"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} style={{ color: '#4ade80' }} />
              <span className="text-[12px] font-bold" style={{ color: '#4ade80' }}>
                ¡Subido a {actualFolder}/!
              </span>
            </div>
            <button onClick={handleReset}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <X size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </div>

          {/* Preview imagen */}
          {folder === 'covers' && result.url && (
            <div className="rounded-[10px] overflow-hidden" style={{ height: 80 }}>
              <img src={result.url} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}

          {/* URL */}
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-[10px]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[9px] truncate flex-1" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
              {actualFolder}/{result.filename}
            </p>
            <button onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0"
              style={{
                background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                color: copied ? '#4ade80' : 'rgba(255,255,255,0.4)',
              }}>
              <Copy size={9} />
              <span className="text-[9px] font-bold">{copied ? 'Copiado' : 'URL'}</span>
            </button>
          </div>

          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Campo actualizado automáticamente ↑
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}