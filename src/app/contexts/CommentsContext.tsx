import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface Comment {
  id:        string;
  videoId:   string;
  userId:    string;
  userName:  string;
  userColor: string; // gradient css
  text:      string;
  ts:        number;
  edited:    boolean;
}

interface LikeState {
  count:  number;
  liked:  boolean;
}

interface CommentsContextType {
  getComments:   (videoId: string) => Comment[];
  getLike:       (videoId: string) => LikeState;
  addComment:    (videoId: string, text: string, userId: string, userName: string, userColor: string) => void;
  editComment:   (videoId: string, commentId: string, text: string) => void;
  deleteComment: (videoId: string, commentId: string) => void;
  toggleLike:    (videoId: string, defaultCount?: number) => void;
}

/* ─── Storage key ────────────────────────────────────────────────────────── */
const LS_COMMENTS = 'morix_comments_v1';
const LS_LIKES    = 'morix_likes_v1';

function loadComments(): Record<string, Comment[]> {
  try { return JSON.parse(localStorage.getItem(LS_COMMENTS) || '{}'); }
  catch { return {}; }
}
function loadLikes(): Record<string, LikeState> {
  try { return JSON.parse(localStorage.getItem(LS_LIKES) || '{}'); }
  catch { return {}; }
}
function saveComments(c: Record<string, Comment[]>) {
  try { localStorage.setItem(LS_COMMENTS, JSON.stringify(c)); } catch { /* ignore */ }
}
function saveLikes(l: Record<string, LikeState>) {
  try { localStorage.setItem(LS_LIKES, JSON.stringify(l)); } catch { /* ignore */ }
}

/* ─── HMR-safe singleton ─────────────────────────────────────────────────── */
const CTX_KEY = '__morix_comments_ctx__';
declare global { interface Window { [CTX_KEY]: unknown } }
if (!window[CTX_KEY]) {
  window[CTX_KEY] = createContext<CommentsContextType | null>(null);
}
const CommentsCtx = window[CTX_KEY] as React.Context<CommentsContextType | null>;

/* ─── Provider ───────────────────────────────────────────────────────────── */
export function CommentsProvider({ children }: { children: ReactNode }) {
  const [comments, setComments] = useState<Record<string, Comment[]>>(loadComments);
  const [likes, setLikes]       = useState<Record<string, LikeState>>(loadLikes);

  const getComments = useCallback((videoId: string): Comment[] => {
    return comments[videoId] ?? [];
  }, [comments]);

  const getLike = useCallback((videoId: string, defaultCount = 0): LikeState => {
    return likes[videoId] ?? { count: defaultCount, liked: false };
  }, [likes]);

  const addComment = useCallback((
    videoId: string, text: string,
    userId: string, userName: string, userColor: string
  ) => {
    const newComment: Comment = {
      id:        `c_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      videoId, userId, userName, userColor,
      text: text.trim(),
      ts:     Date.now(),
      edited: false,
    };
    setComments((prev) => {
      const updated = { ...prev, [videoId]: [...(prev[videoId] ?? []), newComment] };
      saveComments(updated);
      return updated;
    });
  }, []);

  const editComment = useCallback((videoId: string, commentId: string, text: string) => {
    setComments((prev) => {
      const updated = {
        ...prev,
        [videoId]: (prev[videoId] ?? []).map((c) =>
          c.id === commentId ? { ...c, text: text.trim(), edited: true } : c
        ),
      };
      saveComments(updated);
      return updated;
    });
  }, []);

  const deleteComment = useCallback((videoId: string, commentId: string) => {
    setComments((prev) => {
      const updated = {
        ...prev,
        [videoId]: (prev[videoId] ?? []).filter((c) => c.id !== commentId),
      };
      saveComments(updated);
      return updated;
    });
  }, []);

  const toggleLike = useCallback((videoId: string, defaultCount = 0) => {
    setLikes((prev) => {
      const current = prev[videoId] ?? { count: defaultCount, liked: false };
      const updated = {
        ...prev,
        [videoId]: {
          count:  current.liked ? current.count - 1 : current.count + 1,
          liked: !current.liked,
        },
      };
      saveLikes(updated);
      return updated;
    });
  }, []);

  return (
    <CommentsCtx.Provider value={{
      getComments, getLike, addComment, editComment, deleteComment, toggleLike,
    }}>
      {children}
    </CommentsCtx.Provider>
  );
}

export function useComments() {
  const ctx = useContext(CommentsCtx);
  if (!ctx) throw new Error('useComments must be used inside CommentsProvider');
  return ctx;
}
