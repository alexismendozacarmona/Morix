import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  X, Bell, BellOff, CheckCheck, Trash2,
  Play, Flame, Star, Trophy, ArrowUp, Clock, Zap,
} from 'lucide-react';
import { useNotifications, type AppNotification, type NotifType } from '../contexts/NotificationsContext';
import { useT } from '../i18n/useT';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Inicio del día (00:00:00.000) en hora local del dispositivo */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Inicio de la semana ISO (lunes) en hora local.
 * getDay(): 0=Dom, 1=Lun … 6=Sáb → offset para llegar al lunes anterior.
 */
function startOfWeek(d: Date): Date {
  const day = d.getDay();                  // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day;  // cuántos días retroceder hasta el lunes
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

function relativeTime(ms: number, tn: ReturnType<typeof useT>['notificaciones']): string {
  const diff = Date.now() - ms;
  const min  = Math.floor(diff / 60_000);
  const h    = Math.floor(diff / 3_600_000);

  if (min < 1)  return tn.ahora;
  if (min < 60) return tn.hace_min.replace('{n}', String(min));
  if (h  < 24)  return tn.hace_h.replace('{n}', String(h));

  // Para +24h mostramos la fecha real del dispositivo
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function groupByDate(
  notifs: AppNotification[],
  tn: ReturnType<typeof useT>['notificaciones'],
): { label: string; items: AppNotification[] }[] {
  const now            = new Date();
  const todayStart     = startOfDay(now).getTime();
  const yesterdayStart = todayStart - 86_400_000;

  // Semana actual: desde el lunes de esta semana (hora local)
  const thisWeekStart  = startOfWeek(now).getTime();
  // Semana pasada: desde el lunes anterior
  const lastWeekStart  = thisWeekStart - 7 * 86_400_000;

  const groups: { label: string; items: AppNotification[] }[] = [
    { label: tn.hoy,                                                          items: [] },
    { label: tn.ayer,                                                         items: [] },
    { label: tn.esta_semana,                                                  items: [] },
    { label: (tn as Record<string, string>).semana_pasada ?? 'Semana pasada', items: [] },
    { label: tn.anteriores,                                                   items: [] },
  ];

  notifs.forEach((n) => {
    const notifDayStart = startOfDay(new Date(n.timestamp)).getTime();

    if (notifDayStart >= todayStart) {
      groups[0].items.push(n);       // HOY
    } else if (notifDayStart >= yesterdayStart) {
      groups[1].items.push(n);       // AYER
    } else if (notifDayStart >= thisWeekStart) {
      groups[2].items.push(n);       // ESTA SEMANA
    } else if (notifDayStart >= lastWeekStart) {
      groups[3].items.push(n);       // SEMANA PASADA
    } else {
      groups[4].items.push(n);       // ANTERIORES
    }
  });

  return groups.filter((g) => g.items.length > 0);
}

const TYPE_ICON: Record<NotifType, React.ElementType> = {
  completion:  Zap,
  reminder:    Clock,
  new_content: Star,
  streak:      Flame,
  achievement: Trophy,
  level_up:    ArrowUp,
};

const TYPE_COLOR: Record<NotifType, string> = {
  completion:  '#22c55e',
  reminder:    '#3b82f6',
  new_content: '#8b5cf6',
  streak:      '#f97316',
  achievement: '#f59e0b',
  level_up:    '#a78bfa',
};

// ─── Single notification card ─────────────────────────────────────────────────
function NotifCard({
  notif,
  onMarkRead,
  onDismiss,
  onAction,
  tn,
}: {
  notif: AppNotification;
  onMarkRead: () => void;
  onDismiss: () => void;
  onAction: () => void;
  tn: ReturnType<typeof useT>['notificaciones'];
}) {
  const Icon = TYPE_ICON[notif.type];
  const color = notif.accentColor;

  // Translated type label
  const typeLabel: Record<NotifType, string> = {
    completion:  tn.type_completion,
    reminder:    tn.type_reminder,
    new_content: tn.type_new_content,
    streak:      tn.type_streak,
    achievement: tn.type_achievement,
    level_up:    tn.type_level_up,
  };

  // Translated action label
  const actionLabel =
    notif.type === 'reminder'    ? tn.action_reminder    :
    notif.type === 'completion'  ? tn.action_completion  :
    notif.type === 'new_content' ? tn.action_new_content : null;

  const canNavigate = !!notif.videoId;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32, height: 0, marginBottom: 0, padding: 0 }}
      transition={{ duration: 0.22 }}
      className="relative flex items-start gap-3 px-4 py-3.5"
      style={{
        background: notif.read ? 'transparent' : `${color}08`,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
      onPointerDown={() => { if (!notif.read) onMarkRead(); }}
    >
      {/* Unread indicator */}
      {!notif.read && (
        <div
          className="absolute left-1.5 top-1/2 w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: color, transform: 'translateY(-50%)', boxShadow: `0 0 6px ${color}` }}
        />
      )}

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 text-lg"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        {notif.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[12px] leading-snug mb-0.5"
          style={{ color: notif.read ? 'rgba(255,255,255,0.7)' : 'white', fontWeight: notif.read ? 500 : 700 }}
        >
          {notif.title}
        </p>
        <p className="text-[10px] leading-relaxed mb-1.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
          {notif.body}
        </p>

        <div className="flex items-center gap-2">
          {/* Type badge */}
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${color}18`, color, border: `1px solid ${color}28` }}
          >
            {typeLabel[notif.type]}
          </span>
          {/* Time */}
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {relativeTime(notif.timestamp, tn)}
          </span>
          {/* Action */}
          {actionLabel && canNavigate && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={(e) => { e.stopPropagation(); onAction(); }}
              className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold"
              style={{ background: `${color}22`, color, border: `1px solid ${color}35` }}
            >
              <Play size={8} fill={color} strokeWidth={0} />
              {actionLabel}
            </motion.button>
          )}
        </div>
      </div>

      {/* Dismiss */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <X size={10} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </motion.button>
    </motion.div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const { notifications, unreadCount, markRead, markAllRead, dismiss, clearAll } = useNotifications();
  const navigate = useNavigate();
  const t = useT();
  const tn = t.notificaciones;
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const frameEl = document.getElementById('phone-frame');

  const filtered = tab === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  const grouped = groupByDate(filtered, tn);

  const handleAction = (notif: AppNotification) => {
    markRead(notif.id);
    if (notif.videoId) {
      onClose();
      setTimeout(() => navigate(`/video/${notif.videoId}`), 200);
    }
  };

  if (!frameEl) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 200 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="absolute top-0 left-0 right-0 flex flex-col"
            style={{
              maxHeight: '88%',
              background: 'linear-gradient(180deg, #0a0a1e 0%, #0d0d24 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              borderBottomLeftRadius: '28px',
              borderBottomRightRadius: '28px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
              zIndex: 201,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-5 pt-12 pb-3">
              <div
                className="w-9 h-9 rounded-[14px] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #8b5cf622, #6366f122)', border: '1px solid rgba(139,92,246,0.25)' }}
              >
                <Bell size={16} style={{ color: '#a78bfa' }} strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <h2 className="text-white font-black text-[15px] leading-none">{tn.titulo}</h2>
                {unreadCount > 0 && (
                  <p className="text-[10px] mt-0.5" style={{ color: '#a78bfa' }}>
                    {unreadCount} {tn.sin_leer}
                  </p>
                )}
              </div>
              {/* Mark all read */}
              {unreadCount > 0 && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
                >
                  <CheckCheck size={11} style={{ color: '#4ade80' }} />
                  <span className="text-[10px] font-bold" style={{ color: '#4ade80' }}>{tn.leidas}</span>
                </motion.button>
              )}
              {/* Close */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <X size={14} className="text-white" />
              </motion.button>
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-center gap-2 px-5 pb-3">
              {(['all', 'unread'] as const).map((tabKey) => (
                <button
                  key={tabKey}
                  onClick={() => setTab(tabKey)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold transition-all"
                  style={{
                    background: tab === tabKey ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'rgba(255,255,255,0.06)',
                    color: tab === tabKey ? 'white' : 'rgba(255,255,255,0.4)',
                    boxShadow: tab === tabKey ? '0 0 16px rgba(139,92,246,0.4)' : 'none',
                    border: tab === tabKey ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {tabKey === 'all' ? tn.todas : tn.tab_sin_leer}
                  {tabKey === 'unread' && unreadCount > 0 && (
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                      style={{ background: tab === 'unread' ? 'rgba(255,255,255,0.25)' : '#ef4444' }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              ))}

              {/* Clear all */}
              {notifications.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowClearConfirm(true)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <Trash2 size={10} style={{ color: '#f87171' }} />
                  <span className="text-[10px] font-bold" style={{ color: '#f87171' }}>{tn.limpiar}</span>
                </motion.button>
              )}
            </div>

            {/* ── Confirm clear ── */}
            <AnimatePresence>
              {showClearConfirm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mx-4 mb-3"
                >
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-[16px]"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <p className="flex-1 text-[11px] text-white/90 font-medium">{tn.confirm_body}</p>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); clearAll(); setShowClearConfirm(false); }}
                      className="px-4 py-2 rounded-full text-[10px] font-bold shadow-lg"
                      style={{ background: '#ef4444', color: 'white', cursor: 'pointer', zIndex: 10 }}
                    >
                      {tn.confirm_si}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowClearConfirm(false); }}
                      className="px-4 py-2 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', zIndex: 10 }}
                    >
                      {tn.confirm_no}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Divider ── */}
            <div className="h-px mx-4" style={{ background: 'rgba(255,255,255,0.06)' }} />

            {/* ── Notifications list ── */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16 gap-4"
                  >
                    <div
                      className="w-16 h-16 rounded-[22px] flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <BellOff size={26} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </div>
                    <p className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {tab === 'unread' ? tn.al_dia : tn.sin_notif}
                    </p>
                  </motion.div>
                ) : (
                  grouped.map((group) => (
                    <div key={group.label}>
                      {/* Group label */}
                      <div
                        className="px-5 py-2 sticky top-0"
                        style={{ background: 'rgba(10,10,30,0.96)', backdropFilter: 'blur(12px)', zIndex: 10 }}
                      >
                        <span
                          className="text-[9px] font-black tracking-widest uppercase"
                          style={{ color: 'rgba(255,255,255,0.32)' }}
                        >
                          {group.label}
                        </span>
                      </div>

                      <AnimatePresence>
                        {group.items.map((notif) => (
                          <NotifCard
                            key={notif.id}
                            notif={notif}
                            onMarkRead={() => markRead(notif.id)}
                            onDismiss={() => dismiss(notif.id)}
                            onAction={() => handleAction(notif)}
                            tn={tn}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  ))
                )}
              </AnimatePresence>

              {/* Bottom padding */}
              <div className="h-6" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    frameEl,
  );
}