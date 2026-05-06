/**
 * VideoComments — sistema de comentarios con replies, likes y moderación admin.
 *
 * SQL para crear las tablas (ejecutar en Supabase SQL Editor):
 * ─────────────────────────────────────────────────────────
 * CREATE TABLE IF NOT EXISTS morix_video_comments (
 *   id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   video_id   TEXT NOT NULL,
 *   user_id    TEXT NOT NULL,
 *   user_name  TEXT NOT NULL,
 *   content    TEXT NOT NULL,
 *   parent_id  UUID REFERENCES morix_video_comments(id) ON DELETE CASCADE,
 *   likes      TEXT[] DEFAULT '{}',
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE morix_video_comments ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "public_all" ON morix_video_comments FOR ALL USING (true) WITH CHECK (true);
 * ─────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Trash2, Reply, Send, ChevronDown, ChevronUp } from 'lucide-react';
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
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'justo ahora';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ─── CommentItem ──────────────────────────────────────────────────────────────
function CommentItem({
  comment,
  replies,
  userId,
  isAdmin,
  videoId,
  onDelete,
  onLike,
  onReply,
  depth = 0,
}: {
  comment: Comment;
  replies: Comment[];
  userId: string;
  isAdmin: boolean;
  videoId: string;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  onReply: (parentId: string, parentName: string) => void;
  depth?: number;
}) {
  const liked  = comment.likes.includes(userId);
  const canDel = isAdmin || comment.user_id === userId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22 }}
      className="flex gap-2.5"
      style={{ marginLeft: depth > 0 ? '28px' : 0 }}
    >
      {/* Avatar */}
      <AvatarDisplay avatarId={undefined} userName={comment.user_name} size={28} showGlow={false} />

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="text-[11px] font-bold text-white">{comment.user_name}</span>
          {isAdmin && comment.user_id !== userId && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}>admin</span>
          )}
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.28)' }}>{timeAgo(comment.created_at)}</span>
        </div>

        {/* Body */}
        <p className="text-[12px] leading-relaxed mb-1.5" style={{ color: 'rgba(255,255,255,0.72)' }}>
          {depth > 0 && (
            <span className="font-bold mr-1" style={{ color: '#a78bfa' }}>
              @{comment.user_name}
            </span>
          )}
          {comment.content}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Like */}
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
              <span className="text-[9px] font-bold tabular-nums"
                style={{ color: liked ? '#f43f5e' : 'rgba(255,255,255,0.3)' }}>
                {comment.likes.length}
              </span>
            )}
          </button>

          {/* Reply (only top-level comments can be replied to) */}
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

          {/* Delete (admin or own) */}
          {canDel && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1 active:scale-90 transition-transform ml-auto"
            >
              <Trash2 size={10} style={{ color: 'rgba(239,68,68,0.55)' }} />
            </button>
          )}
        </div>

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {replies.map((r) => (
              <CommentItem
                key={r.id}
                comment={r}
                replies={[]}
                userId={userId}
                isAdmin={isAdmin}
                videoId={videoId}
                onDelete={onDelete}
                onLike={onLike}
                onReply={onReply}
                depth={1}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── VideoComments (inline, below description) ───────────────────────────────
interface Props {
  videoId: string;
}

const PREVIEW_COUNT = 3;

export function VideoComments({ videoId }: Props) {
  const { user } = useAuth();
  const userId   = user?.email ?? 'anon';
  const userName = user?.name ?? user?.email?.split('@')[0] ?? 'Usuario';
  const isAdmin  = isAdminEmail(user?.email);

  const [comments,    setComments]    = useState<Comment[]>([]);
  const [expanded,    setExpanded]    = useState(false);
  const [inputText,   setInputText]   = useState('');
  const [replyTo,     setReplyTo]     = useState<{ id: string; name: string } | null>(null);
  const [sending,     setSending]     = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('morix_video_comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });
    if (data) setComments(data as Comment[]);
  }, [videoId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    const { data, error } = await supabase
      .from('morix_video_comments')
      .insert({
        video_id:  videoId,
        user_id:   userId,
        user_name: userName,
        content:   text,
        parent_id: replyTo?.id ?? null,
        likes:     [],
      })
      .select()
      .single();
    if (!error && data) {
      setComments((prev) => [data as Comment, ...prev]);
      setExpanded(true);
    }
    setInputText('');
    setReplyTo(null);
    setSending(false);
  };

  // ── Like comment ───────────────────────────────────────────────────────────
  const handleLike = async (id: string) => {
    const c = comments.find((x) => x.id === id);
    if (!c) return;
    const alreadyLiked = c.likes.includes(userId);
    const newLikes = alreadyLiked
      ? c.likes.filter((u) => u !== userId)
      : [...c.likes, userId];
    setComments((prev) => prev.map((x) => x.id === id ? { ...x, likes: newLikes } : x));
    await supabase
      .from('morix_video_comments')
      .update({ likes: newLikes })
      .eq('id', id);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    // Eliminar también los hijos (respuestas)
    setComments((prev) => prev.filter((x) => x.id !== id && x.parent_id !== id));
    await supabase
      .from('morix_video_comments')
      .delete()
      .eq('id', id);
    // Supabase ON DELETE CASCADE borra respuestas automáticamente
  };

  // ── Separar top-level y respuestas ────────────────────────────────────────
  const topLevel = comments.filter((c) => !c.parent_id);
  const totalTop = topLevel.length;
  const visible  = expanded ? topLevel : topLevel.slice(0, PREVIEW_COUNT);

  function getReplies(parentId: string) {
    return comments.filter((c) => c.parent_id === parentId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-black text-white">Comentarios</span>
        {totalTop > 0 && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}
          >
            {totalTop}
          </span>
        )}
      </div>

      {/* ── Input ── */}
      <div
        className="flex gap-2.5 mb-4 p-3 rounded-[16px]"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Avatar */}
        <AvatarDisplay avatarId={user?.avatarId} avatarGradient={user?.avatarGradient} userName={userName} size={28} showGlow={false} />

        <div className="flex-1 flex flex-col gap-2">
          {/* Reply tag */}
          <AnimatePresence>
            {replyTo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1.5 overflow-hidden"
              >
                <Reply size={10} style={{ color: '#a78bfa' }} />
                <span className="text-[10px]" style={{ color: '#a78bfa' }}>
                  Respondiendo a <b>{replyTo.name}</b>
                </span>
                <button
                  onClick={() => setReplyTo(null)}
                  className="ml-auto text-[9px]"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={replyTo ? `Responder a ${replyTo.name}…` : 'Escribe un comentario…'}
            rows={inputText.length > 60 ? 3 : 1}
            className="w-full bg-transparent outline-none resize-none text-[12px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.8)', caretColor: '#8b5cf6' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
          />

          <div className="flex items-center justify-between">
            <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {inputText.length > 0 ? `${inputText.length}/300` : 'Enter para enviar'}
            </span>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-40 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 0 10px rgba(139,92,246,0.5)' }}
            >
              <Send size={11} className="text-white" style={{ marginLeft: '1px' }} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Lista de comentarios ── */}
      {totalTop === 0 ? (
        <p className="text-[11px] text-center py-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Sé el primero en comentar ✨
        </p>
      ) : (
        <>
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {visible.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  replies={getReplies(c.id)}
                  userId={userId}
                  isAdmin={isAdmin}
                  videoId={videoId}
                  onDelete={handleDelete}
                  onLike={handleLike}
                  onReply={(id, name) => {
                    setReplyTo({ id, name });
                    setExpanded(true);
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Ver más / Ver menos */}
          {totalTop > PREVIEW_COUNT && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setExpanded((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-3 mt-3 rounded-[14px] active:scale-95 transition-transform"
              style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)' }}
            >
              {expanded
                ? <><ChevronUp size={13} style={{ color: '#a78bfa' }} /><span className="text-[11px] font-bold" style={{ color: '#a78bfa' }}>Ver menos</span></>
                : <><ChevronDown size={13} style={{ color: '#a78bfa' }} /><span className="text-[11px] font-bold" style={{ color: '#a78bfa' }}>Ver {totalTop - PREVIEW_COUNT} comentario{totalTop - PREVIEW_COUNT > 1 ? 's' : ''} más</span></>
              }
            </motion.button>
          )}
        </>
      )}
    </div>
  );
}