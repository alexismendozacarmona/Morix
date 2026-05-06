/**
 * InlineCommentsSection — comentarios inline del VideoPlayer.
 *
 * Modo colapsado (por defecto):
 *   • Muestra 1 comentario top-level aleatorio a la vez.
 *   • Rota automáticamente cada 10 segundos con animación fade/slide.
 *   • Botón "Ver todos los comentarios ↓"
 *
 * Modo expandido:
 *   • Lista completa con replies, like, edit, delete.
 *   • Botón "Ver menos ↑" para volver al scroll automático.
 *
 * El input para escribir siempre visible en ambos modos.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, Heart, Reply, Pencil, Trash2, Check, X,
  ChevronDown, ChevronUp, MessageCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { isAdminEmail } from '../config/adminConfig';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Comment {
  id: string;
  video_id: string;
  user_id: string;
  user_name: string;
  content: string;
  parent_id: string | null;
  likes: string[];
  edited?: boolean;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'ahora';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function avatarColor(name: string): string {
  const palette = ['#8b5cf6', '#6366f1', '#0891b2', '#059669', '#d97706', '#db2777', '#0d9488'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return palette[h % palette.length];
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const color = avatarColor(name);
  return (
    <div
      className="flex-shrink-0 rounded-full flex items-center justify-center font-black text-white select-none"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${color}, ${color}88)`,
        boxShadow: `0 0 8px ${color}50`,
        fontSize: size * 0.38,
      }}
    >
      {(name || '?').slice(0, 2).toUpperCase()}
    </div>
  );
}

// ─── CommentRow ───────────────────────────────────────────────────────────────
function CommentRow({
  comment, replies, userId, isAdmin,
  onDelete, onLike, onEdit, onReply, depth = 0,
}: {
  comment: Comment; replies: Comment[];
  userId: string; isAdmin: boolean;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onReply: (parentId: string, parentName: string) => void;
  depth?: number;
}) {
  const liked  = comment.likes.includes(userId);
  const isMe   = comment.user_id === userId;
  const canDel = isAdmin || isMe;
  const [editing,     setEditing]     = useState(false);
  const [editText,    setEditText]    = useState(comment.content);
  const [showReplies, setShowReplies] = useState(false);

  const saveEdit = () => {
    if (!editText.trim()) return;
    onEdit(comment.id, editText.trim());
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className="flex gap-2.5"
      style={{ marginLeft: depth > 0 ? 36 : 0 }}
    >
      <Avatar name={comment.user_name} size={depth > 0 ? 24 : 30} />

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span
            className="text-[11px] font-bold"
            style={{ color: isMe ? '#a78bfa' : 'rgba(255,255,255,0.85)' }}
          >
            {isMe ? 'Tú' : comment.user_name}
          </span>
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {timeAgo(comment.created_at)}
          </span>
          {comment.edited && (
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>· editado</span>
          )}
        </div>

        {/* Body */}
        {editing ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="flex-1 bg-transparent outline-none text-[12px] text-white border-b py-0.5"
              style={{ borderColor: 'rgba(139,92,246,0.6)' }}
            />
            <button
              onClick={saveEdit}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.4)' }}
            >
              <Check size={11} className="text-white" />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <X size={11} style={{ color: 'rgba(255,255,255,0.45)' }} />
            </button>
          </div>
        ) : (
          <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {depth > 0 && (
              <span className="font-bold mr-1" style={{ color: avatarColor(comment.user_name) }}>
                @{comment.user_name}{' '}
              </span>
            )}
            {comment.content}
          </p>
        )}

        {/* Actions */}
        {!editing && (
          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={() => onLike(comment.id)}
              className="flex items-center gap-1 active:scale-90 transition-transform"
            >
              <Heart
                size={11}
                fill={liked ? '#f43f5e' : 'none'}
                strokeWidth={liked ? 0 : 1.8}
                style={{ color: liked ? '#f43f5e' : 'rgba(255,255,255,0.3)' }}
              />
              {comment.likes.length > 0 && (
                <span className="text-[9px] font-bold tabular-nums" style={{ color: liked ? '#f43f5e' : 'rgba(255,255,255,0.3)' }}>
                  {comment.likes.length}
                </span>
              )}
            </button>

            {depth === 0 && (
              <button
                onClick={() => onReply(comment.id, comment.user_name)}
                className="flex items-center gap-1 active:scale-90 transition-transform"
              >
                <Reply size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
                <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Responder
                </span>
              </button>
            )}

            {isMe && (
              <button
                onClick={() => { setEditing(true); setEditText(comment.content); }}
                className="flex items-center gap-1 active:scale-90 transition-transform"
              >
                <Pencil size={10} style={{ color: 'rgba(167,139,250,0.55)' }} />
                <span className="text-[9px] font-bold" style={{ color: 'rgba(167,139,250,0.55)' }}>
                  Editar
                </span>
              </button>
            )}

            {canDel && (
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 active:scale-90 transition-transform ml-auto"
              >
                <Trash2 size={10} style={{ color: 'rgba(239,68,68,0.5)' }} />
              </button>
            )}
          </div>
        )}

        {/* Toggle replies */}
        {depth === 0 && replies.length > 0 && (
          <button
            onClick={() => setShowReplies((v) => !v)}
            className="flex items-center gap-1 mt-2 active:scale-95 transition-transform"
          >
            {showReplies ? (
              <ChevronUp size={12} style={{ color: '#6366f1' }} />
            ) : (
              <ChevronDown size={12} style={{ color: '#6366f1' }} />
            )}
            <span className="text-[10px] font-bold" style={{ color: '#6366f1' }}>
              {showReplies ? 'Ocultar' : `${replies.length} respuesta${replies.length > 1 ? 's' : ''}`}
            </span>
          </button>
        )}

        {/* Replies */}
        <AnimatePresence>
          {showReplies && replies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-3 overflow-hidden"
            >
              {replies.map((r) => (
                <CommentRow
                  key={r.id} comment={r} replies={[]}
                  userId={userId} isAdmin={isAdmin}
                  onDelete={onDelete} onLike={onLike} onEdit={onEdit} onReply={onReply}
                  depth={1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── AutoScrollComment — muestra 1 comentario a la vez girando cada 10s ───────
function AutoScrollComment({
  comments,
  userId,
  accentColor,
}: {
  comments: Comment[];
  userId: string;
  accentColor: string;
}) {
  const [idx, setIdx]       = useState(0);
  const [dir, setDir]       = useState<1 | -1>(1);   // 1 = entra por abajo, -1 = entra por arriba
  const prevIdxRef          = useRef(0);

  // Elegir siguiente índice aleatorio distinto al actual
  const pickNext = useCallback((current: number, total: number): number => {
    if (total <= 1) return 0;
    let next: number;
    do { next = Math.floor(Math.random() * total); }
    while (next === current);
    return next;
  }, []);

  // Avanzar automáticamente cada 10 segundos
  useEffect(() => {
    if (comments.length <= 1) return;
    const timer = setInterval(() => {
      setDir(1);
      setIdx((cur) => pickNext(cur, comments.length));
    }, 10_000);
    return () => clearInterval(timer);
  }, [comments.length, pickNext]);

  // Resetear a 0 cuando llegan nuevos comentarios
  useEffect(() => {
    setIdx(0);
  }, [comments.length]);

  if (comments.length === 0) return null;

  const comment = comments[idx];
  const liked   = comment.likes.includes(userId);
  const isMe    = comment.user_id === userId;

  return (
    <div
      className="relative overflow-hidden rounded-[14px] px-3.5 py-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${accentColor}20`,
        minHeight: 68,
      }}
    >
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={comment.id + idx}
          custom={dir}
          initial={{ opacity: 0, y: dir * 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: dir * -14 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="flex gap-2.5 items-start"
        >
          <Avatar name={comment.user_name} size={28} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className="text-[11px] font-bold"
                style={{ color: isMe ? '#a78bfa' : 'rgba(255,255,255,0.85)' }}
              >
                {isMe ? 'Tú' : comment.user_name}
              </span>
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                {timeAgo(comment.created_at)}
              </span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.68)' }}>
              {comment.content}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Heart
                size={10}
                fill={liked ? '#f43f5e' : 'none'}
                strokeWidth={liked ? 0 : 1.8}
                style={{ color: liked ? '#f43f5e' : 'rgba(255,255,255,0.25)' }}
              />
              {comment.likes.length > 0 && (
                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  {comment.likes.length}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots de progreso / total */}
      {comments.length > 1 && (
        <div className="absolute bottom-2 right-3 flex items-center gap-1">
          {comments.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width:  i === idx ? 12 : 4,
                height: 4,
                background: i === idx ? accentColor : `${accentColor}30`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── InlineCommentsSection ────────────────────────────────────────────────────
interface InlineCommentsSectionProps {
  videoId: string;
  accentColor?: string;
  onCountChange?: (n: number) => void;
}

export function InlineCommentsSection({
  videoId,
  accentColor = '#6366f1',
  onCountChange,
}: InlineCommentsSectionProps) {
  const { user }  = useAuth();
  const userId    = user?.id ?? user?.email ?? 'anon';
  const userName  = user?.name ?? user?.email?.split('@')[0] ?? 'Usuario';
  const isAdmin   = isAdminEmail(user?.email);

  const [comments,  setComments]  = useState<Comment[]>([]);
  const [input,     setInput]     = useState('');
  const [replyTo,   setReplyTo]   = useState<{ id: string; name: string } | null>(null);
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [expanded,  setExpanded]  = useState(false);
  const inputRef             = useRef<HTMLInputElement>(null);
  const onCountChangeRef     = useRef(onCountChange);
  useEffect(() => { onCountChangeRef.current = onCountChange; });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from('morix_video_comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: true });
    if (error) { console.error('[InlineComments] fetch error:', error); return; }
    if (data) {
      setComments(data as Comment[]);
      onCountChangeRef.current?.(data.filter((c: Comment) => !c.parent_id).length);
    }
  }, [videoId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    const payload: Record<string, unknown> = {
      video_id:  videoId,
      user_id:   userId,
      user_name: userName,
      content:   text,
      parent_id: replyTo?.id ?? null,
      likes:     [],
    };
    const { data, error } = await supabase
      .from('morix_video_comments')
      .insert(payload)
      .select()
      .single();
    if (error) {
      setSendError('No se pudo guardar. Intenta de nuevo.');
      setSending(false);
      return;
    }
    setComments((prev) => [...prev, data as Comment]);
    onCountChangeRef.current?.((comments.filter((c) => !c.parent_id).length) + (replyTo ? 0 : 1));
    setInput('');
    setReplyTo(null);
    setSending(false);
    setExpanded(true); // al enviar, abrir la lista completa
  };

  // ── Like ───────────────────────────────────────────────────────────────────
  const handleLike = async (id: string) => {
    const c = comments.find((c) => c.id === id);
    if (!c) return;
    const already  = c.likes.includes(userId);
    const newLikes = already ? c.likes.filter((l) => l !== userId) : [...c.likes, userId];
    setComments((prev) => prev.map((x) => x.id === id ? { ...x, likes: newLikes } : x));
    await supabase.from('morix_video_comments').update({ likes: newLikes }).eq('id', id);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
    await supabase.from('morix_video_comments').delete().eq('id', id);
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEdit = async (id: string, text: string) => {
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, content: text, edited: true } : c));
    await supabase.from('morix_video_comments').update({ content: text, edited: true }).eq('id', id);
  };

  // ── Reply ──────────────────────────────────────────────────────────────────
  const handleReply = (parentId: string, parentName: string) => {
    setReplyTo({ id: parentId, name: parentName });
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Data derivada ──────────────────────────────────────────────────────────
  const topLevel  = comments.filter((c) => !c.parent_id);
  const topCount  = topLevel.length;
  const getReplies = (id: string) => comments.filter((c) => c.parent_id === id);

  return (
    <div className="mb-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageCircle size={14} style={{ color: accentColor }} />
          <span className="text-[13px] font-bold text-white">Comentarios</span>
          {topCount > 0 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30`, color: accentColor }}
            >
              {topCount}
            </span>
          )}
        </div>
      </div>

      {/* ── Input (siempre visible) ── */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-[14px] mb-3"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Avatar name={userName} size={28} />
        <div className="flex-1 flex items-center gap-2">
          {replyTo && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: `${accentColor}25`, color: accentColor }}
            >
              @{replyTo.name}
              <button onClick={() => setReplyTo(null)} className="ml-1 opacity-60">×</button>
            </span>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
            placeholder={replyTo ? `Responder a ${replyTo.name}…` : 'Agrega un comentario…'}
            className="flex-1 bg-transparent outline-none text-[12px] text-white placeholder-white/30 min-w-0"
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity"
            style={{
              background: input.trim()
                ? `linear-gradient(135deg, ${accentColor}, ${accentColor}88)`
                : 'rgba(255,255,255,0.06)',
              opacity: input.trim() ? 1 : 0.4,
            }}
          >
            <Send size={12} className="text-white" style={{ transform: 'translateX(1px)' }} />
          </motion.button>
        </div>
      </div>

      {sendError && (
        <p className="text-[10px] mb-2" style={{ color: '#f87171' }}>{sendError}</p>
      )}

      {/* ── Sin comentarios ── */}
      {topCount === 0 && (
        <div
          className="flex flex-col items-center gap-2 py-5 rounded-[14px]"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <MessageCircle size={22} style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Sé el primero en comentar
          </p>
        </div>
      )}

      {/* ── Con comentarios ── */}
      {topCount > 0 && (
        <>
          {/* MODO COLAPSADO: auto-scroll 1 comentario cada 10s */}
          {!expanded && (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <AutoScrollComment
                comments={topLevel}
                userId={userId}
                accentColor={accentColor}
              />

              {/* Botón "Ver todos los comentarios" */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setExpanded(true)}
                className="mt-2.5 w-full py-3 rounded-[14px] flex items-center justify-center gap-2 text-[11px] font-bold active:opacity-80 transition-opacity"
                style={{
                  background: `${accentColor}0E`,
                  border: `1px solid ${accentColor}28`,
                  color: accentColor,
                }}
              >
                <MessageCircle size={12} style={{ color: accentColor }} />
                Ver todos los comentarios ({topCount})
                <ChevronDown size={12} style={{ color: accentColor }} />
              </motion.button>
            </motion.div>
          )}

          {/* MODO EXPANDIDO: lista completa */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="space-y-4 pt-1">
                  <AnimatePresence>
                    {topLevel.map((c) => (
                      <CommentRow
                        key={c.id}
                        comment={c}
                        replies={getReplies(c.id)}
                        userId={userId}
                        isAdmin={isAdmin}
                        onDelete={handleDelete}
                        onLike={handleLike}
                        onEdit={handleEdit}
                        onReply={handleReply}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Botón "Ver menos" */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setExpanded(false); setReplyTo(null); }}
                  className="mt-4 w-full py-3 rounded-[14px] flex items-center justify-center gap-2 text-[11px] font-bold active:opacity-80 transition-opacity"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.45)',
                  }}
                >
                  <ChevronUp size={12} style={{ color: 'rgba(255,255,255,0.45)' }} />
                  Ver menos
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
