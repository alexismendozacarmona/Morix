import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthContext';

/* ─── Types ──────────────────────────────────────────────────────────────── */
export type ChatMessage = {
  id: string;
  user_id: string;
  user_name: string;
  avatar_gradient: number;
  avatar_id?: string;
  content: string;
  created_at: string;
  likes?: string[];
  reply_to_id?: string;
  reply_to_name?: string;
  reply_to_content?: string;
};

export type RankingUser = {
  id: string;
  name: string;
  avatar_gradient: number;
  avatar_id?: string;
  total_xp: number;
  streak: number;
  position: number;
};

export type ActivityItem = {
  id: string;
  user_id: string;
  user_name: string;
  avatar_gradient: number;
  avatar_id?: string;
  type: 'video_watched' | 'achievement' | 'level_up' | 'streak';
  title: string;
  detail: string;
  icon: string;
  created_at: string;
};

/* ─── Context shape ──────────────────────────────────────────────────────── */
interface SocialContextType {
  /* Chat */
  messages: ChatMessage[];
  sendMessage: (content: string, replyTo?: ChatMessage) => Promise<void>;
  deleteChatMessage: (id: string) => Promise<void>;
  toggleLike: (id: string, currentLikes: string[]) => Promise<void>;
  loadingChat: boolean;
  /* Ranking */
  ranking: RankingUser[];
  myPosition: number;
  loadingRanking: boolean;
  refreshRanking: () => Promise<void>;
  /* Activity */
  activities: ActivityItem[];
  loadingActivity: boolean;
  refreshActivity: () => Promise<void>;
  /* Publish activity (used by other contexts) */
  publishActivity: (type: ActivityItem['type'], title: string, detail?: string, icon?: string) => Promise<void>;
}

/* ─── HMR-safe singleton ─────────────────────────────────────────────────── */
const CTX_KEY = '__morix_social_ctx__';
declare global { interface Window { [CTX_KEY]: unknown } }
if (!window[CTX_KEY]) {
  window[CTX_KEY] = createContext<SocialContextType | null>(null);
}
const SocialCtx = window[CTX_KEY] as React.Context<SocialContextType | null>;

/* ─── Provider ───────────────────────────────────────────────────────────── */
export function SocialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  /* ── Chat state ──────────────────────────────────────────────────────── */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(true);

  // Load last 80 messages on mount
  useEffect(() => {
    let cancelled = false;
    async function loadChat() {
      setLoadingChat(true);
      try {
        const { data } = await supabase
          .from('morix_chat_messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(80);
        if (!cancelled && data) setMessages(data as ChatMessage[]);
      } catch { /* silencioso */ }
      if (!cancelled) setLoadingChat(false);
    }
    loadChat();
    return () => { cancelled = true; };
  }, []);

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel('morix_chat_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'morix_chat_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ChatMessage;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              const updated = [...prev, newMsg];
              return updated.length > 200 ? updated.slice(-200) : updated;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as ChatMessage;
            setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendMessage = useCallback(async (content: string, replyTo?: ChatMessage) => {
    if (!user || !content.trim()) return;
    try {
      await supabase.from('morix_chat_messages').insert({
        user_id: user.id,
        user_name: user.name || 'Anónimo',
        avatar_gradient: user.avatarGradient ?? 0,
        avatar_id: user.avatarId ?? `gradient_${user.avatarGradient ?? 0}`,
        content: content.trim().slice(0, 500),
        reply_to_id: replyTo?.id || null,
        reply_to_name: replyTo?.user_name || null,
        reply_to_content: replyTo?.content?.slice(0, 50) || null,
      });
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  }, [user]);

  const deleteChatMessage = useCallback(async (id: string) => {
    try {
      await supabase.from('morix_chat_messages').delete().eq('id', id);
    } catch (err) {
      console.error('Error deleting chat message:', err);
    }
  }, []);

  const toggleLike = useCallback(async (id: string, currentLikes: string[]) => {
    if (!user) return;
    const likesList = currentLikes || [];
    const hasLiked = likesList.includes(user.id);
    const newLikes = hasLiked
      ? likesList.filter((userId) => userId !== user.id)
      : [...likesList, user.id];

    try {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, likes: newLikes } : m)));
      await supabase.from('morix_chat_messages').update({ likes: newLikes }).eq('id', id);
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  }, [user]);

  /* ── Ranking state ───────────────────────────────────────────────────── */
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [myPosition, setMyPosition] = useState(0);
  const [loadingRanking, setLoadingRanking] = useState(true);

  const refreshRanking = useCallback(async () => {
    setLoadingRanking(true);
    try {
      // Get top 50 users by XP
      const { data: progressData } = await supabase
        .from('morix_progress')
        .select('user_id, total_xp, streak')
        .order('total_xp', { ascending: false })
        .limit(50);

      if (!progressData) { setLoadingRanking(false); return; }

      // Get user names
      const userIds = progressData.map((p) => p.user_id);
      const { data: usersData } = await supabase
        .from('morix_users')
        .select('id, name, avatar_gradient, avatar_id')
        .in('id', userIds);

      const userMap = new Map<string, { name: string; avatar_gradient: number; avatar_id?: string }>();
      usersData?.forEach((u) => userMap.set(u.id, { name: u.name || 'Anónimo', avatar_gradient: u.avatar_gradient, avatar_id: u.avatar_id }));

      const ranked: RankingUser[] = progressData.map((p, i) => ({
        id: p.user_id,
        name: userMap.get(p.user_id)?.name || 'Anónimo',
        avatar_gradient: userMap.get(p.user_id)?.avatar_gradient ?? 0,
        avatar_id: userMap.get(p.user_id)?.avatar_id,
        total_xp: p.total_xp,
        streak: p.streak,
        position: i + 1,
      }));

      setRanking(ranked);

      // Find my position
      if (user) {
        const myIdx = ranked.findIndex((r) => r.id === user.id);
        setMyPosition(myIdx >= 0 ? myIdx + 1 : ranked.length + 1);
      }
    } catch { /* silencioso */ }
    setLoadingRanking(false);
  }, [user]);

  useEffect(() => { refreshRanking(); }, [refreshRanking]);

  /* ── Activity feed state ─────────────────────────────────────────────── */
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const refreshActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const { data } = await supabase
        .from('morix_activity_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setActivities(data as ActivityItem[]);
    } catch { /* silencioso */ }
    setLoadingActivity(false);
  }, []);

  useEffect(() => { refreshActivity(); }, [refreshActivity]);

  // Realtime for activity
  useEffect(() => {
    const channel = supabase
      .channel('morix_activity_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'morix_activity_feed' },
        (payload) => {
          const newItem = payload.new as ActivityItem;
          setActivities((prev) => {
            if (prev.some((a) => a.id === newItem.id)) return prev;
            return [newItem, ...prev].slice(0, 100);
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const publishActivity = useCallback(async (
    type: ActivityItem['type'],
    title: string,
    detail = '',
    icon = '🎯',
  ) => {
    if (!user) return;
    try {
      await supabase.from('morix_activity_feed').insert({
        user_id: user.id,
        user_name: user.name || 'Anónimo',
        avatar_gradient: user.avatarGradient ?? 0,
        avatar_id: user.avatarId ?? `gradient_${user.avatarGradient ?? 0}`,
        type,
        title,
        detail,
        icon,
      });
    } catch { /* silencioso */ }
  }, [user]);

  return (
    <SocialCtx.Provider value={{
      messages, sendMessage, deleteChatMessage, toggleLike, loadingChat,
      ranking, myPosition, loadingRanking, refreshRanking,
      activities, loadingActivity, refreshActivity,
      publishActivity,
    }}>
      {children}
    </SocialCtx.Provider>
  );
}

export function useSocial() {
  const ctx = useContext(SocialCtx);
  if (!ctx) throw new Error('useSocial must be used inside SocialProvider');
  return ctx;
}
