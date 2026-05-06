import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Plus, X, Trash2, ListMusic } from 'lucide-react';
import { usePlaylist } from '../contexts/PlaylistContext';
import { useAdminContent } from '../contexts/AdminContentContext';

const EMOJIS = ['📋', '🎯', '🔥', '✨', '💪', '🧘', '🎬', '🌟', '💡', '🏆', '📚', '🎵'];

interface PlaylistModalProps {
  videoId: string;
  onClose: () => void;
}

export function PlaylistModal({ videoId, onClose }: PlaylistModalProps) {
  const { playlists, createPlaylist, toggleInPlaylist, isInPlaylist, deletePlaylist } = usePlaylist();
  const { videos: adminVideos } = useAdminContent();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('📋');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const video = adminVideos.find((v) => v.id === videoId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const p = createPlaylist(newName, newEmoji);
    // Auto-add the current video to the new playlist
    setTimeout(() => {
      toggleInPlaylist(p.id, videoId);
    }, 50);
    setNewName('');
    setNewEmoji('📋');
    setCreating(false);
  };

  const phoneFrame = document.getElementById('phone-frame');
  if (!phoneFrame) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-end justify-end"
      style={{
        background: 'rgba(3,3,9,0.78)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        zIndex: 210,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        className="w-full rounded-t-[32px] flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #0e0e22 0%, #080817 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          maxHeight: '80vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[12px] flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
              <ListMusic size={15} style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <h3 className="text-white font-black text-[14px]">Guardar en playlist</h3>
              {video && (
                <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)', maxWidth: '220px' }}>
                  {video.titulo}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <X size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">

          {/* Empty state */}
          {playlists.length === 0 && !creating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-8 gap-3"
            >
              <div className="w-16 h-16 rounded-[22px] flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <ListMusic size={28} style={{ color: '#a78bfa' }} />
              </div>
              <p className="text-white font-bold text-sm">Sin playlists todavía</p>
              <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Crea tu primera playlist para organizar tus contenidos favoritos
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { setCreating(true); setTimeout(() => inputRef.current?.focus(), 100); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[16px] mt-1"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #4f46e5)', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}
              >
                <Plus size={14} className="text-white" />
                <span className="text-white text-[12px] font-bold">Crear primera playlist</span>
              </motion.button>
            </motion.div>
          )}

          {/* Playlists list */}
          {playlists.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {playlists.map((playlist, i) => {
                const active = isInPlaylist(playlist.id, videoId);
                const coverVideo = playlist.videoIds.length > 0
                  ? adminVideos.find((v) => v.id === playlist.videoIds[0])
                  : null;
                return (
                  <motion.div
                    key={playlist.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-[18px] active:opacity-80 transition-opacity"
                    style={{
                      background: active ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)',
                      border: active ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {/* Cover */}
                    <button
                      onClick={() => toggleInPlaylist(playlist.id, videoId)}
                      className="relative w-12 h-12 rounded-[14px] overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(139,92,246,0.15)' }}
                    >
                      {coverVideo
                        ? <img src={coverVideo.imagen} alt="" className="w-full h-full object-cover opacity-70" />
                        : <span className="text-xl">{playlist.emoji}</span>
                      }
                      {active && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.6)' }}>
                          <Check size={18} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>

                    {/* Info */}
                    <button
                      className="flex-1 text-left"
                      onClick={() => toggleInPlaylist(playlist.id, videoId)}
                    >
                      <p className="text-white text-[13px] font-bold leading-tight">{playlist.emoji} {playlist.name}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {playlist.videoIds.length} {playlist.videoIds.length === 1 ? 'video' : 'videos'}
                        {active && <span style={{ color: '#a78bfa' }}> · Guardado ✓</span>}
                      </p>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deletePlaylist(playlist.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
                      style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}
                    >
                      <Trash2 size={11} style={{ color: '#f43f5e' }} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Create form */}
          <AnimatePresence>
            {creating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="p-4 rounded-[20px] mb-3"
                  style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)' }}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Nueva playlist
                  </p>

                  {/* Emoji picker */}
                  <div className="mb-3">
                    <p className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Ícono</p>
                    <div className="flex flex-wrap gap-2">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => setNewEmoji(e)}
                          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg transition-all active:scale-90"
                          style={{
                            background: newEmoji === e ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)',
                            border: newEmoji === e ? '1.5px solid rgba(139,92,246,0.5)' : '1.5px solid transparent',
                          }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name input */}
                  <input
                    ref={inputRef}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="Nombre de la playlist…"
                    maxLength={40}
                    className="w-full px-4 py-3 rounded-[14px] text-white text-[13px] outline-none mb-3"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1.5px solid rgba(139,92,246,0.35)',
                      caretColor: '#a78bfa',
                    }}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setCreating(false); setNewName(''); }}
                      className="flex-1 py-2.5 rounded-[14px] text-[12px] font-bold"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreate}
                      className="flex-1 py-2.5 rounded-[14px] text-[12px] font-bold text-white"
                      style={{
                        background: newName.trim() ? 'linear-gradient(135deg, #8b5cf6, #4f46e5)' : 'rgba(255,255,255,0.05)',
                        boxShadow: newName.trim() ? '0 0 16px rgba(139,92,246,0.4)' : 'none',
                        opacity: newName.trim() ? 1 : 0.4,
                      }}
                    >
                      Crear y guardar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add more button (when playlists exist) */}
          {playlists.length > 0 && !creating && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { setCreating(true); setTimeout(() => inputRef.current?.focus(), 100); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-[18px]"
              style={{ background: 'rgba(139,92,246,0.07)', border: '1.5px dashed rgba(139,92,246,0.3)' }}
            >
              <Plus size={14} style={{ color: '#a78bfa' }} />
              <span className="text-[12px] font-bold" style={{ color: '#a78bfa' }}>Nueva playlist</span>
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>,
    phoneFrame
  );
}