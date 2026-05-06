/**
 * CommentsSheet — panel deslizable con comentarios Supabase.
 * Funciones: likes, replies, editar (propio), borrar (propio o admin).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Pencil, Trash2, Check, ChevronDown, Heart, Reply } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { isAdminEmail } from '../config/adminConfig';
import { AvatarDisplay } from './AvatarDisplay';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Comment {
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

// ─── CommentItem ──────────────────────────────────────────────────────────────
function CommentItem({
  comment, replies, userId, isAdmin,
  onDelete, onLike, onEdit, onReply, depth = 0,
}: {
  comment: Comment;
  replies: Comment[];
  userId: string;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onReply: (parentId: string, parentName: string) => void;
  depth?: number;
}) {
  const liked   = comment.likes.includes(userId);
  const isMe    = comment.user_id === userId;
  const canDel  = isAdmin || isMe;
  const [editing,   setEditing]   = useState(false);
  const [editText,  setEditText]  = useState(comment.content);

  const saveEdit = () => {
    if (!editText.trim()) return;
    onEdit(comment.id, editText.trim());
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex gap-2.5"
      style={{ marginLeft: depth > 0 ? 32 : 0 }}
    >
      <AvatarDisplay avatarId={undefined} userName={comment.user_name} size={depth > 0 ? 26 : 32} showGlow={false} />

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className="text-[11px] font-bold" style={{ color: isMe ? '#a78bfa' : 'rgba(255,255,255,0.85)' }}>
            {isMe ? 'Tú' : comment.user_name}
          </span>
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {timeAgo(comment.created_at)}
          </span>
          {comment.edited && (
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.22)' }}>· editado</span>
          )}
        </div>

        {/* Body / Edit mode */}
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
            <button onClick={saveEdit}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.4)' }}>
              <Check size={11} className="text-white" />
            </button>
            <button onClick={() => setEditing(false)}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              <X size={11} style={{ color: 'rgba(255,255,255,0.45)' }} />
            </button>
          </div>
        ) : (
          <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {depth > 0 && (
              <span className="font-bold mr-1" style={{ color: '#a78bfa' }}>
                @{comment.user_name}{' '}
              </span>
            )}
            {comment.content}
          </p>
        )}

        {/* Actions */}
        {!editing && (
          <div className="flex items-center gap-3 mt-1.5">
            {/* Like */}
            <button onClick={() => onLike(comment.id)}
              className="flex items-center gap-1 active:scale-90 transition-transform">
              <Heart size={11} fill={liked ? '#f43f5e' : 'none'} strokeWidth={liked ? 0 : 1.8}
                style={{ color: liked ? '#f43f5e' : 'rgba(255,255,255,0.3)' }} />
              {comment.likes.length > 0 && (
                <span className="text-[9px] font-bold tabular-nums"
                  style={{ color: liked ? '#f43f5e' : 'rgba(255,255,255,0.3)' }}>
                  {comment.likes.length}
                </span>
              )}
            </button>

            {/* Reply (solo top-level) */}
            {depth === 0 && (
              <button onClick={() => onReply(comment.id, comment.user_name)}
                className="flex items-center gap-1 active:scale-90 transition-transform">
                <Reply size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
                <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Responder
                </span>
              </button>
            )}

            {/* Edit (solo propio) */}
            {isMe && (
              <button onClick={() => { setEditing(true); setEditText(comment.content); }}
                className="flex items-center gap-1 active:scale-90 transition-transform">
                <Pencil size={10} style={{ color: 'rgba(167,139,250,0.55)' }} />
                <span className="text-[9px] font-bold" style={{ color: 'rgba(167,139,250,0.55)' }}>
                  Editar
                </span>
              </button>
            )}

            {/* Delete (propio o admin) */}
            {canDel && (
              <button onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 active:scale-90 transition-transform ml-auto">
                <Trash2 size={10} style={{ color: 'rgba(239,68,68,0.5)' }} />
              </button>
            )}
          </div>
        )}

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {replies.map((r) => (
              <CommentItem
                key={r.id} comment={r} replies={[]}
                userId={userId} isAdmin={isAdmin}
                onDelete={onDelete} onLike={onLike} onEdit={onEdit} onReply={onReply}
                depth={1}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── CommentsSheet ─────────────────────────────────────────────────────────────
interface CommentsSheetProps {
  videoId:        string;
  open:           boolean;
  onClose:        () => void;
  onCountChange?: (n: number) => void;
  totalLabel?:    string; // optional label shown in header (e.g. short title)
}

export function CommentsSheet({ videoId, open, onClose, onCountChange, totalLabel }: CommentsSheetProps) {
  const { user }  = useAuth();
  const userId    = user?.id ?? user?.email ?? 'anon';
  const userName  = user?.name ?? user?.email?.split('@')[0] ?? 'Usuario';
  const isAdmin   = isAdminEmail(user?.email);

  const [comments,  setComments]  = useState<Comment[]>([]);
  const [input,     setInput]     = useState('');
  const [replyTo,   setReplyTo]   = useState<{ id: string; name: string } | null>(null);
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);
  const startY    = useRef(0);
  const dragY     = useRef(0);

  // Keep onCountChange in a ref so it never needs to be a useCallback/useEffect dependency
  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => { onCountChangeRef.current = onCountChange; });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from('morix_video_comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[CommentsSheet] fetch error:', error);
      return;
    }
    if (data) {
      setComments(data as Comment[]);
      // Use the ref — never triggers a re-render cycle
      onCountChangeRef.current?.(data.filter((c: Comment) => !c.parent_id).length);
    }
  }, [videoId]); // ← onCountChange removed from deps intentionally

  useEffect(() => { if (open) fetchComments(); }, [open, fetchComments]);

  // Focus when open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 350);
  }, [open]);

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);

    // Build payload WITHOUT 'edited' — column may not exist in all deployments
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
      console.error('[CommentsSheet] insert error:', error);
      setSendError('No se pudo guardar el comentario. Intenta de nuevo.');
      setSending(false);
      return;
    }

    if (data) {
      const newComment = data as Comment;
      // Build the next list synchronously so we can call onCountChange
      // OUTSIDE the setComments updater (calling it inside causes the
      // "setState during render of a different component" React warning).
      const nextComments = [...comments, newComment];
      setComments(nextComments);
      onCountChangeRef.current?.(nextComments.filter((c) => !c.parent_id).length);
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 80);
    }
    setInput('');
    setReplyTo(null);
    setSending(false);
  };

  // ── Like ───────────────────────────────────────────────────────────────────
  const handleLike = async (id: string) => {
    const c = comments.find((x) => x.id === id);
    if (!c) return;
    const already = c.likes.includes(userId);
    const newLikes = already ? c.likes.filter((u) => u !== userId) : [...c.likes, userId];
    setComments((prev) => prev.map((x) => x.id === id ? { ...x, likes: newLikes } : x));
    await supabase.from('morix_video_comments').update({ likes: newLikes }).eq('id', id);
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEdit = async (id: string, text: string) => {
    setComments((prev) => prev.map((x) => x.id === id ? { ...x, content: text, edited: true } : x));
    // Only update 'edited' column if it exists — use a try/catch approach
    await supabase.from('morix_video_comments').update({ content: text }).eq('id', id);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const updated = comments.filter((x) => x.id !== id && x.parent_id !== id);
    setComments(updated);
    onCountChange?.(updated.filter((c) => !c.parent_id).length);
    await supabase.from('morix_video_comments').delete().eq('id', id);
  };

  // ── Drag to close ──────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; dragY.current = 0; };
  const onTouchMove  = (e: React.TouchEvent) => {
    const d = e.touches[0].clientY - startY.current;
    if (d > 0) { dragY.current = d; setDragOffset(d); }
  };
  const onTouchEnd = () => { if (dragY.current > 100) onClose(); setDragOffset(0); };

  // ── Separar top-level y replies ────────────────────────────────────────────
  const topLevel = comments.filter((c) => !c.parent_id);
  const getReplies = (pid: string) =>
    comments.filter((c) => c.parent_id === pid)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const portal = document.getElementById('phone-frame');
  if (!portal) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-50 flex flex-col"
            style={{
              maxHeight: '78%',
              background: 'linear-gradient(180deg, rgba(12,10,30,0.98) 0%, rgba(8,7,20,1) 100%)',
              borderTop: '1px solid rgba(139,92,246,0.22)',
              borderRadius: '24px 24px 0 0',
              transform: `translateY(${dragOffset}px)`,
              boxShadow: '0 -12px 40px rgba(0,0,0,0.6), 0 -1px 0 rgba(139,92,246,0.15)',
            }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            {/* Drag handle */}
            <div
              className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
              onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            >
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-white font-bold text-sm">Comentarios</p>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.32)' }}>
                  {topLevel.length} {topLevel.length === 1 ? 'comentario' : 'comentarios'}
                </p>
                {totalLabel && (
                  <p className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {totalLabel}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.45)' }} />
              </button>
            </div>

            {/* List */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
              style={{ overscrollBehavior: 'contain' }}>
              {topLevel.length === 0 && (
                <div className="flex flex-col items-center py-10 gap-2">
                  <span className="text-3xl">💬</span>
                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    Sé el primero en comentar
                  </p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {topLevel.map((c) => (
                  <CommentItem
                    key={c.id} comment={c} replies={getReplies(c.id)}
                    userId={userId} isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onLike={handleLike}
                    onEdit={handleEdit}
                    onReply={(pid, pname) => {
                      setReplyTo({ id: pid, name: pname });
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Input */}
            <div className="px-4 py-3 flex flex-col gap-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

              {/* Send error feedback */}
              {sendError && (
                <p className="text-[10px] text-red-400 text-center pb-1">{sendError}</p>
              )}

              {/* Reply tag */}
              <AnimatePresence>
                {replyTo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-1.5 overflow-hidden"
                  >
                    <Reply size={10} style={{ color: '#a78bfa' }} />
                    <span className="text-[10px]" style={{ color: '#a78bfa' }}>
                      Respondiendo a <b>{replyTo.name}</b>
                    </span>
                    <button onClick={() => setReplyTo(null)} className="ml-auto"
                      style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>✕</button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-3">
                <AvatarDisplay avatarId={user?.avatarId} avatarGradient={user?.avatarGradient} userName={userName} size={30} showGlow={false} />
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={replyTo ? `Responder a ${replyTo.name}…` : 'Escribe un comentario…'}
                    className="flex-1 bg-transparent outline-none text-[13px] text-white placeholder-white/30"
                    style={{ minWidth: 0 }}
                  />
                  <AnimatePresence>
                    {input.trim() && (
                      <motion.button
                        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={handleSend}
                        disabled={sending}
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 0 12px rgba(139,92,246,0.5)' }}>
                        <Send size={12} className="text-white" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Safe area */}
            <div style={{ height: 'env(safe-area-inset-bottom, 8px)', minHeight: 8 }} />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    portal
  );
}