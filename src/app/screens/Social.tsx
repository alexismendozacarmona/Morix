import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Trophy, Activity, Send, Crown, Flame, Zap, Eye, Star, ChevronUp, Trash2, Heart, X, Reply } from 'lucide-react';
import { AuroraBackground } from '../components/AuroraBackground';
import { AvatarDisplay } from '../components/AvatarDisplay';
import { useSocial, type ChatMessage } from '../contexts/SocialContext';
import { useAuth } from '../contexts/AuthContext';
import { isAdminEmail } from '../config/adminConfig';

/* ─── Gradients kept only as fallback for old data ─────────────────────── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CHAT TAB                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
function ChatTab() {
  const { messages, sendMessage, deleteChatMessage, toggleLike, loadingChat } = useSocial();
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await sendMessage(text, replyingTo ?? undefined);
    setText('');
    setReplyingTo(null);
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3 pb-8 space-y-3">
        {loadingChat ? (
          <div className="flex items-center justify-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
              className="w-6 h-6 rounded-full border-2 border-transparent"
              style={{ borderTopColor: '#a78bfa', borderRightColor: '#a78bfa' }}
            />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div
              className="w-16 h-16 rounded-[22px] flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
            >
              <MessageCircle size={28} style={{ color: '#8b5cf6' }} />
            </div>
            <p className="text-[12px] text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
              ¡Sé el primero en escribir algo! 💬
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === user?.id;
            const hasLiked = user ? msg.likes?.includes(user.id) : false;
            const likesCount = msg.likes?.length || 0;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <AvatarDisplay avatarId={msg.avatar_id} avatarGradient={msg.avatar_gradient} userName={msg.user_name} size={30} showGlow={false} />
                <div className={`max-w-[76%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  <div className="flex items-center gap-1.5 pr-1">
                    <span className="text-[9px] font-bold" style={{ color: isMe ? '#a78bfa' : 'rgba(255,255,255,0.45)' }}>
                      {isMe ? 'Tú' : msg.user_name}
                    </span>
                    <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {timeAgo(msg.created_at)}
                    </span>
                  </div>
                  
                  <div
                    className="px-3.5 py-2.5 rounded-[16px] relative"
                    style={{
                      background: isMe
                        ? 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.18))'
                        : 'rgba(255,255,255,0.05)',
                      border: isMe
                        ? '1px solid rgba(139,92,246,0.3)'
                        : '1px solid rgba(255,255,255,0.07)',
                      borderTopLeftRadius: isMe ? 16 : 4,
                      borderTopRightRadius: isMe ? 4 : 16,
                    }}
                  >
                    {/* Cita / Mensaje Respondido */}
                    {msg.reply_to_id && (
                      <div className="px-2 py-1.5 mb-1.5 rounded-[6px] border-l-2" style={{ background: 'rgba(0,0,0,0.25)', borderColor: isMe ? '#a78bfa' : '#64748b' }}>
                        <p className="text-[9px] font-bold" style={{ color: isMe ? '#c4b5fd' : '#94a3b8' }}>{msg.reply_to_name}</p>
                        <p className="text-[10px] truncate" style={{ maxWidth: '180px', color: 'rgba(255,255,255,0.5)' }}>{msg.reply_to_content}</p>
                      </div>
                    )}

                    <p className="text-[12.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.92)' }}>
                      {msg.content}
                    </p>

                    {/* Insignia de Likes (Count) sobre la burbuja */}
                    {likesCount > 0 && (
                      <div 
                        className={`absolute -bottom-2 ${isMe ? '-left-2' : '-right-2'} bg-[#0a0a0f] border rounded-full flex items-center gap-0.5 z-10`} 
                        style={{ padding: '3px 5px', borderColor: 'rgba(244,63,94,0.3)' }}
                      >
                         <Heart size={8} fill="#f43f5e" color="#f43f5e" />
                         <span className="text-[9px] font-bold text-white/90">{likesCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Acciones debajo de la burbuja (Mobile-friendly) */}
                  <div className={`flex items-center gap-3 mt-1 ${isMe ? 'justify-end' : 'justify-start'} w-full px-1`}>
                     <button
                       onClick={() => toggleLike(msg.id, msg.likes || [])}
                       className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                     >
                       <Heart size={10} fill={hasLiked ? "#f43f5e" : "transparent"} color={hasLiked ? "#f43f5e" : "rgba(255,255,255,0.5)"} />
                       <span className="text-[10px]" style={{ color: hasLiked ? '#f43f5e' : 'rgba(255,255,255,0.5)' }}>Me gusta</span>
                     </button>
                     <span className="w-[3px] h-[3px] rounded-full bg-white/10" />
                     <button onClick={() => setReplyingTo(msg)} className="text-[10px] opacity-60 hover:opacity-100 text-white transition-opacity">
                       Responder
                     </button>
                     {(isAdmin || isMe) && (
                        <>
                           <span className="w-[3px] h-[3px] rounded-full bg-white/10" />
                           <button onClick={() => deleteChatMessage(msg.id)} className="text-[10px] text-red-500 opacity-60 hover:opacity-100 transition-opacity">
                             Borrar
                           </button>
                        </>
                     )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input bar Wrapper */}
      <div className="flex-shrink-0 flex flex-col" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(3,3,9,0.8)', backdropFilter: 'blur(20px)' }}>
        {/* Reply preview */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pt-3 overflow-hidden"
            >
               <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] relative" style={{ background: 'rgba(139,92,246,0.1)', borderLeft: '3px solid #8b5cf6' }}>
                  <div className="flex-1 min-w-0">
                     <p className="text-[10px] font-bold text-[#c4b5fd]">Respondiendo a {replyingTo.user_name}</p>
                     <p className="text-[11px] text-white/60 truncate">{replyingTo.content}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full bg-white/5 hover:bg-white/10">
                     <X size={12} color="white" />
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2.5 px-4 py-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe un mensaje..."
            maxLength={500}
            className="flex-1 py-2.5 px-4 rounded-[18px] text-[13px] text-white outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              caretColor: '#a78bfa',
            }}
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
            style={{
              background: text.trim()
                ? 'linear-gradient(135deg, #8b5cf6, #4f46e5)'
                : 'rgba(255,255,255,0.06)',
              boxShadow: text.trim() ? '0 0 16px rgba(139,92,246,0.5)' : 'none',
              opacity: text.trim() ? 1 : 0.4,
            }}
          >
            <Send size={16} className="text-white" style={{ marginLeft: 1 }} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  RANKING TAB                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
function RankingTab() {
  const { ranking, myPosition, loadingRanking, refreshRanking } = useSocial();
  const { user } = useAuth();
  const medals = ['🥇', '🥈', '🥉'];

  if (loadingRanking) {
    return (
      <div className="flex items-center justify-center py-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          className="w-6 h-6 rounded-full border-2 border-transparent"
          style={{ borderTopColor: '#f59e0b', borderRightColor: '#f59e0b' }}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-4 pt-3 pb-20 space-y-3">
      {/* My position card */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-[22px] p-4 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(139,92,246,0.12))',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          <div className="absolute top-0 right-0 w-28 h-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.1), transparent)' }} />
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-[16px] flex items-center justify-center font-black text-lg"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 0 20px rgba(245,158,11,0.5)',
                color: 'white',
              }}
            >
              #{myPosition}
            </div>
            <div className="flex-1">
              <p className="text-white font-black text-[14px]">Tu Posición Global</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {myPosition <= 3 ? '¡Estás en el top! 🔥' : myPosition <= 10 ? '¡Casi en el top 10!' : '¡Sigue sumando XP!'}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={refreshRanking}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <ChevronUp size={14} style={{ color: '#f59e0b' }} />
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Ranking list */}
      <div
        className="rounded-[22px] overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {ranking.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Trophy size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No hay datos aún</p>
          </div>
        ) : (
          ranking.map((r, i) => {
            const isMe = r.id === user?.id;
            const isTop3 = i < 3;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{
                  borderBottom: i < ranking.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  background: isMe ? 'rgba(139,92,246,0.08)' : 'transparent',
                }}
              >
                <div className="w-8 text-center flex-shrink-0">
                  {isTop3 ? <span className="text-lg">{medals[i]}</span> : <span className="text-[12px] font-black" style={{ color: 'rgba(255,255,255,0.35)' }}>{r.position}</span>}
                </div>
                <AvatarDisplay avatarId={r.avatar_id} avatarGradient={r.avatar_gradient} userName={r.name} size={36} showGlow={false} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-[13px] font-bold truncate`} style={{ color: isMe ? '#c4b5fd' : 'white' }}>{isMe ? `${r.name} (tú)` : r.name}</p>
                    {isTop3 && <Crown size={11} style={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#d97706' }} />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}><Zap size={9} style={{ color: '#a78bfa' }} />{r.total_xp.toLocaleString()} XP</span>
                    {r.streak > 0 && <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}><Flame size={9} style={{ color: '#f59e0b' }} />{r.streak}</span>}
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-full" style={{ background: isTop3 ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)', border: isTop3 ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-[10px] font-bold" style={{ color: isTop3 ? '#f59e0b' : 'rgba(255,255,255,0.4)' }}>{r.total_xp.toLocaleString()}</span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ACTIVITY TAB                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
function ActivityTab() {
  const { activities, loadingActivity } = useSocial();
  const typeLabels: Record<string, { verb: string; color: string }> = {
    video_watched: { verb: 'vio', color: '#3b82f6' },
    achievement:   { verb: 'desbloqueó', color: '#f59e0b' },
    level_up:      { verb: 'subió a', color: '#8b5cf6' },
    streak:        { verb: 'alcanzó', color: '#ef4444' },
  };

  if (loadingActivity) {
    return (
      <div className="flex items-center justify-center py-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          className="w-6 h-6 rounded-full border-2 border-transparent"
          style={{ borderTopColor: '#3b82f6', borderRightColor: '#3b82f6' }}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-4 pt-3 pb-20">
      <div className="relative">
        <div className="absolute left-[18px] top-4 bottom-4 w-px" style={{ background: 'linear-gradient(to bottom, rgba(139,92,246,0.3), rgba(59,130,246,0.1), transparent)' }} />
        <div className="space-y-1">
          {activities.map((act, i) => {
            const meta = typeLabels[act.type] ?? { verb: 'hizo', color: '#8b5cf6' };
            return (
              <motion.div key={act.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex gap-3 py-2.5 pl-1">
                <div className="relative flex-shrink-0 flex items-start pt-1">
                  <div className="w-[10px] h-[10px] rounded-full z-10" style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}60`, marginLeft: '13px' }} />
                </div>
                <div className="flex-1 rounded-[16px] p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-1">
                     <AvatarDisplay avatarId={act.avatar_id} avatarGradient={act.avatar_gradient} userName={act.user_name} size={22} showGlow={false} />
                    <span className="text-[11px] font-bold text-white">{act.user_name}</span>
                    <span className="text-[11px]" style={{ color: meta.color }}>{meta.verb}</span>
                    <span className="text-[8px] ml-auto" style={{ color: 'rgba(255,255,255,0.2)' }}>{timeAgo(act.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{act.icon}</span>
                    <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.65)' }}>{act.title}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN SOCIAL SCREEN                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */
type SocialTab = 'chat' | 'ranking' | 'actividad';

const TAB_CONFIG: { key: SocialTab; label: string; icon: typeof MessageCircle; color: string }[] = [
  { key: 'chat',      label: 'Chat',      icon: MessageCircle, color: '#8b5cf6' },
  { key: 'ranking',   label: 'Ranking',   icon: Trophy,        color: '#f59e0b' },
  { key: 'actividad', label: 'Actividad', icon: Activity,      color: '#3b82f6' },
];

export default function Social() {
  const [tab, setTab] = useState<SocialTab>('chat');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative bg-[#030309] h-full flex flex-col overflow-hidden">
      <AuroraBackground intensity="low" />

      {/* Header - Fixed Height Area */}
      <div className="relative z-10 px-5 pt-14 pb-4 flex-shrink-0">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>COMUNIDAD</p>
        <h1 className="text-white font-black text-2xl mb-4">Social</h1>
        <div className="flex gap-2">
          {TAB_CONFIG.map((t) => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <motion.button
                key={t.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTab(t.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[16px] transition-all"
                style={{
                  background: active ? `${t.color}20` : 'rgba(255,255,255,0.04)',
                  border: active ? `1.5px solid ${t.color}50` : '1.5px solid rgba(255,255,255,0.06)',
                }}
              >
                <Icon size={13} style={{ color: active ? t.color : 'rgba(255,255,255,0.3)' }} />
                <span className="text-[11px] font-bold" style={{ color: active ? t.color : 'rgba(255,255,255,0.35)' }}>{t.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tab content — fill remaining space and scroll internally */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {tab === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.15 }} className="h-full">
              <ChatTab />
            </motion.div>
          )}
          {tab === 'ranking' && (
            <motion.div key="ranking" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.15 }} className="h-full">
              <RankingTab />
            </motion.div>
          )}
          {tab === 'actividad' && (
            <motion.div key="actividad" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.15 }} className="h-full">
              <ActivityTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
