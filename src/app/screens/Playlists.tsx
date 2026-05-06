import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ListMusic, Play, ChevronRight, Trash2, X, ChevronDown } from 'lucide-react';
import { AuroraBackground } from '../components/AuroraBackground';
import { usePlaylist } from '../contexts/PlaylistContext';
import type { Playlist } from '../contexts/PlaylistContext';
import { useAdminContent } from '../contexts/AdminContentContext';
import { useT } from '../i18n/useT';

const EMOJIS = ['📋', '🎯', '🔥', '✨', '💪', '🧘', '🎬', '🌟', '💡', '🏆', '📚', '🎵'];

const GRADIENT_PAIRS = [
  ['#8b5cf6', '#4f46e5'],
  ['#3b82f6', '#0ea5e9'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#059669'],
  ['#f43f5e', '#e11d48'],
  ['#06b6d4', '#8b5cf6'],
];

function getGradient(id: string) {
  const idx = parseInt(id.slice(-2), 36) % GRADIENT_PAIRS.length;
  return GRADIENT_PAIRS[idx] ?? GRADIENT_PAIRS[0];
}

// ── Create Playlist Modal ─────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, emoji: string) => void }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📋');
  const t = useT();
  const tp = t.playlists;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-end"
      style={{ background: 'rgba(3,3,9,0.8)', backdropFilter: 'blur(18px)', zIndex: 200 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        className="w-full rounded-t-[32px] p-5 pb-10"
        style={{ background: 'linear-gradient(180deg, #0e0e22 0%, #080817 100%)', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-black text-[16px]">{tp.modal_titulo}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <X size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{tp.icono}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className="w-10 h-10 rounded-[12px] text-xl flex items-center justify-center transition-all active:scale-90"
              style={{
                background: emoji === e ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)',
                border: emoji === e ? '1.5px solid rgba(139,92,246,0.5)' : '1.5px solid transparent',
              }}
            >
              {e}
            </button>
          ))}
        </div>

        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{tp.nombre}</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onCreate(name, emoji)}
          placeholder={tp.nombre_ph}
          maxLength={40}
          className="w-full px-4 py-3.5 rounded-[16px] text-white text-[14px] outline-none mb-4"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(139,92,246,0.35)', caretColor: '#a78bfa' }}
        />

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => name.trim() && onCreate(name, emoji)}
          className="w-full py-4 rounded-[20px] text-white text-[14px] font-bold flex items-center justify-center gap-2"
          style={{
            background: name.trim() ? 'linear-gradient(135deg, #8b5cf6, #4f46e5)' : 'rgba(255,255,255,0.07)',
            boxShadow: name.trim() ? '0 0 24px rgba(139,92,246,0.5)' : 'none',
            opacity: name.trim() ? 1 : 0.4,
          }}
        >
          <Plus size={16} />
          {tp.crear}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ── Playlist Card ─────────────────────────────────────────────────────────────
function PlaylistCard({ playlist, onDelete }: { playlist: Playlist; onDelete: () => void }) {
  const navigate = useNavigate();
  const { videos: adminVideos } = useAdminContent();
  const t = useT();
  const tp = t.playlists;
  const [expanded, setExpanded] = useState(false);
  const [from, to] = getGradient(playlist.id);
  const videos = playlist.videoIds.map((id) => adminVideos.find((v) => v.id === id)).filter(Boolean);
  const cover = videos[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-[24px] overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Card header */}
      <div className="relative h-28 overflow-hidden">
        {cover ? (
          <img src={cover.imagen} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        ) : null}
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${from}70, ${to}50)` }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,3,9,0.9) 0%, transparent 60%)' }} />

        {/* Emoji */}
        <div className="absolute top-3 left-3 w-10 h-10 rounded-[14px] flex items-center justify-center text-xl backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {playlist.emoji}
        </div>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(244,63,94,0.2)', border: '1px solid rgba(244,63,94,0.3)', backdropFilter: 'blur(8px)' }}
        >
          <Trash2 size={11} style={{ color: '#f43f5e' }} />
        </button>

        {/* Name + count */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
          <p className="text-white font-black text-[13px] leading-tight truncate">{playlist.name}</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {videos.length} {videos.length === 1 ? 'video' : 'videos'}
          </p>
        </div>
      </div>

      {/* Toggle expand */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 active:opacity-70 transition-opacity"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {expanded ? tp.ocultar_videos : tp.ver_videos}
        </span>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
        </motion.div>
      </button>

      {/* Video list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            {videos.length === 0 ? (
              <div className="px-4 pb-4 pt-1">
                <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {tp.playlist_vacia}
                </p>
              </div>
            ) : (
              <div className="pb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {videos.map((v, i) => v && (
                  <button
                    key={v.id}
                    onClick={() => navigate(`/video/${v.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 active:opacity-60 transition-opacity"
                    style={{ borderBottom: i < videos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  >
                    <div className="relative rounded-[10px] overflow-hidden flex-shrink-0" style={{ width: '44px', height: '30px' }}>
                      <img src={v.imagen} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <Play size={9} fill="white" className="text-white ml-0.5" />
                      </div>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-[11px] font-semibold truncate">{v.titulo}</p>
                      <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{v.duracion} · {v.categoria}</p>
                    </div>
                    <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function Playlists() {
  const { playlists, createPlaylist, deletePlaylist } = usePlaylist();
  const t = useT();
  const tp = t.playlists;
  const [showCreate, setShowCreate] = useState(false);

  const totalVideos = playlists.reduce((acc, p) => acc + p.videoIds.length, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative bg-[#030309] min-h-full">
      <AuroraBackground intensity="low" />

      {/* Header */}
      <div className="relative z-10 px-5 pt-14 pb-5">
        <div className="flex items-end justify-between mb-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {tp.mi_coleccion}
            </p>
            <h1 className="text-white font-black text-2xl">{tp.titulo}</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[16px]"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #4f46e5)', boxShadow: '0 0 20px rgba(139,92,246,0.45)' }}
          >
            <Plus size={14} className="text-white" />
            <span className="text-white text-[12px] font-bold">{tp.nueva}</span>
          </motion.button>
        </div>

        {/* Stats pills */}
        <div className="flex gap-2 mt-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <ListMusic size={11} style={{ color: '#a78bfa' }} />
            <span className="text-[11px] font-bold" style={{ color: '#c4b5fd' }}>{playlists.length} playlists</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}>
            <Play size={11} style={{ color: '#60a5fa' }} />
            <span className="text-[11px] font-bold" style={{ color: '#93c5fd' }}>{totalVideos} videos</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-5 pb-8">
        {playlists.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 gap-4"
          >
            <div className="w-20 h-20 rounded-[28px] flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)' }}>
              <ListMusic size={36} style={{ color: '#8b5cf6' }} />
            </div>
            <div className="text-center">
              <p className="text-white font-black text-base mb-1">{tp.empty_titulo}</p>
              <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {tp.empty_desc}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-[18px] mt-1"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #4f46e5)', boxShadow: '0 0 24px rgba(139,92,246,0.45)' }}
            >
              <Plus size={15} className="text-white" />
              <span className="text-white text-[13px] font-bold">{tp.crear_primera}</span>
            </motion.button>
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="flex flex-col gap-4">
              {playlists.map((pl) => (
                <PlaylistCard
                  key={pl.id}
                  playlist={pl}
                  onDelete={() => deletePlaylist(pl.id)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreate={(name, emoji) => {
              createPlaylist(name, emoji);
              setShowCreate(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}