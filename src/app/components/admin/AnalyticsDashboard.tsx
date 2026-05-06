import { useState, useEffect, useCallback, useId, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  PieChart, Pie, Cell, Tooltip,
} from 'recharts';
import {
  Users, Eye, Heart, MessageCircle, Clock,
  TrendingUp, TrendingDown, BarChart2, RefreshCw,
  Star, Crown, Trophy, Flame, Award, Activity,
  Clapperboard, Sparkles,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface KPI {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
  color: string;
  glow: string;
  trend?: number; // % change
}

interface DayActivity {
  day: string;
  vistas: number;
  likes: number;
  comentarios: number;
}

interface CategoryStat {
  name: string;
  minutos: number;
  reproducciones: number;
}

interface TopContent {
  id: string;
  titulo: string;
  tipo: 'video' | 'short';
  vistas: number;
  likes: number;
  comentarios: number;
  engagement: number;
}

interface TopUser {
  name: string;
  xp: number;
  minutos: number;
  streak: number;
  plan: string;
}

interface PlanDist {
  name: string;
  value: number;
  color: string;
}

interface AnalyticsData {
  kpis: KPI[];
  activity: DayActivity[];
  categories: CategoryStat[];
  topVideos: TopContent[];
  topShorts: TopContent[];
  topUsers: TopUser[];
  planDist: PlanDist[];
  engagementRate: number;
  avgSessionMin: number;
  retentionRate: number;
  lastUpdated: Date;
}

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const C = {
  purple: '#a78bfa',
  pink:   '#f472b6',
  blue:   '#60a5fa',
  gold:   '#fbbf24',
  green:  '#34d399',
  orange: '#fb923c',
};

const PLAN_COLORS = {
  free:    '#60a5fa',
  trial:   '#fbbf24',
  premium: '#a78bfa',
};

/* ─── Fetch helpers ────────────────────────────────────────────────────────── */
async function fetchAnalytics(): Promise<AnalyticsData> {
  // ── 1. Users ──────────────────────────────────────────────────────────────
  const { data: users = [] } = await supabase
    .from('morix_users')
    .select('id, name, plan, created_at');

  const totalUsers = users?.length ?? 0;
  const planDist: PlanDist[] = [
    { name: 'Free',    value: users?.filter(u => u.plan === 'free').length    ?? 0, color: PLAN_COLORS.free    },
    { name: 'Trial',   value: users?.filter(u => u.plan === 'trial').length   ?? 0, color: PLAN_COLORS.trial   },
    { name: 'Premium', value: users?.filter(u => u.plan === 'premium').length ?? 0, color: PLAN_COLORS.premium },
  ];

  // ── 2. Progress ───────────────────────────────────────────────────────────
  const { data: progresses = [] } = await supabase
    .from('morix_progress')
    .select('user_id, total_xp, total_minutes, streak, category_stats, watched_videos, days_active');

  const totalMinutes = progresses?.reduce((s, p) => s + (p.total_minutes || 0), 0) ?? 0;
  const maxStreak    = progresses?.reduce((s, p) => Math.max(s, p.streak || 0), 0) ?? 0;
  const usersWithStreak = progresses?.filter(p => (p.streak || 0) > 0).length ?? 0;
  const retentionRate = totalUsers > 0 ? Math.round((usersWithStreak / totalUsers) * 100) : 0;
  const avgSessionMin = progresses?.length
    ? Math.round(totalMinutes / progresses.length)
    : 0;

  // Aggregate category stats across all users
  const catMap: Record<string, CategoryStat> = {};
  for (const p of (progresses ?? [])) {
    const cs = p.category_stats as Record<string, { count: number; minutes: number }> | null;
    if (!cs) continue;
    for (const [cat, data] of Object.entries(cs)) {
      if (!catMap[cat]) catMap[cat] = { name: cat, minutos: 0, reproducciones: 0 };
      catMap[cat].minutos        += data.minutes || 0;
      catMap[cat].reproducciones += data.count   || 0;
    }
  }
  const categories = Object.values(catMap)
    .sort((a, b) => b.reproducciones - a.reproducciones)
    .slice(0, 8);

  // Top users by XP
  const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]));
  const topUsers: TopUser[] = (progresses ?? [])
    .sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0))
    .slice(0, 5)
    .map(p => ({
      name:   userMap[p.user_id]?.name || 'Usuario',
      xp:     p.total_xp     || 0,
      minutos: p.total_minutes || 0,
      streak: p.streak       || 0,
      plan:   userMap[p.user_id]?.plan || 'free',
    }));

  // ── 3. Likes ──────────────────────────────────────────────────────────────
  const { data: likes = [] } = await supabase
    .from('morix_video_likes')
    .select('video_id, user_id, created_at');

  const totalLikes = likes?.length ?? 0;

  // ── 4. Comments ───────────────────────────────────────────────────────────
  const { data: comments = [] } = await supabase
    .from('morix_video_comments')
    .select('video_id, user_id, created_at');

  const totalComments = comments?.length ?? 0;

  // ── 5. Views (morix_video_views) ─────────────────────────────────────────
  let views: Array<{ video_id: string; user_id: string; viewed_at: string }> = [];
  // Also fetch aggregated view counts from the views counter table
  let viewCountsMap: Record<string, number> = {};
  try {
    const { data: v } = await supabase
      .from('morix_video_views')
      .select('video_id, user_id, viewed_at');
    views = v ?? [];
  } catch { /* table might not exist yet */ }

  // Try the counter-style table (video_id, view_count)
  try {
    const { data: vc } = await supabase
      .from('morix_video_views')
      .select('video_id, view_count');
    if (vc && vc.length > 0 && 'view_count' in (vc[0] ?? {})) {
      (vc as Array<{ video_id: string; view_count: number }>).forEach(r => {
        viewCountsMap[r.video_id] = r.view_count ?? 0;
      });
    }
  } catch { /* ignore */ }

  const totalViews = views.length > 0
    ? views.length
    : Object.values(viewCountsMap).reduce((s, v) => s + v, 0) ||
      (progresses ?? []).reduce((s, p) => s + ((p.watched_videos as string[])?.length || 0), 0);

  // ── 6. Admin content ──────────────────────────────────────────────────────
  const { data: adminContent = [] } = await supabase
    .from('morix_admin_content')
    .select('id, data');

  const videosRaw: Array<{ id: string; titulo: string; categoria?: string }> =
    (adminContent?.find(c => c.id === 'videos')?.data as Array<{ id: string; titulo: string; categoria?: string }>) ?? [];
  const shortsRaw: Array<{ id: string; titulo: string }> =
    (adminContent?.find(c => c.id === 'shorts')?.data as Array<{ id: string; titulo: string }>) ?? [];

  // ── 7. Activity last 30 days ──────────────────────────────────────────────
  const activity: DayActivity[] = buildActivityChart(views, likes ?? [], comments ?? []);

  // ── 8. Build content maps (videos and shorts separately) ─────────────────
  const videoMap: Record<string, TopContent> = {};
  const shortMap: Record<string, TopContent> = {};

  const ensureVideo = (id: string) => {
    if (!videoMap[id]) {
      const meta = videosRaw.find(v => v.id === id);
      videoMap[id] = {
        id, tipo: 'video',
        titulo: meta?.titulo || `Video ${id.slice(0, 6)}`,
        vistas: 0, likes: 0, comentarios: 0, engagement: 0,
      };
    }
  };
  const ensureShort = (id: string) => {
    if (!shortMap[id]) {
      const meta = shortsRaw.find(s => s.id === id);
      shortMap[id] = {
        id, tipo: 'short',
        titulo: meta?.titulo || `Short ${id.slice(0, 6)}`,
        vistas: 0, likes: 0, comentarios: 0, engagement: 0,
      };
    }
  };

  const isShort = (id: string) => !!shortsRaw.find(s => s.id === id);

  // Count views
  for (const v of views) {
    if (isShort(v.video_id)) { ensureShort(v.video_id); shortMap[v.video_id].vistas++; }
    else { ensureVideo(v.video_id); videoMap[v.video_id].vistas++; }
  }
  // Use counter table if row-per-view table is empty
  if (views.length === 0) {
    for (const [vid, count] of Object.entries(viewCountsMap)) {
      if (isShort(vid)) { ensureShort(vid); shortMap[vid].vistas += count; }
      else { ensureVideo(vid); videoMap[vid].vistas += count; }
    }
    // Fallback: watched_videos from progress
    if (Object.keys(viewCountsMap).length === 0) {
      for (const p of (progresses ?? [])) {
        for (const vid of ((p.watched_videos as string[]) ?? [])) {
          if (isShort(vid)) { ensureShort(vid); shortMap[vid].vistas++; }
          else { ensureVideo(vid); videoMap[vid].vistas++; }
        }
      }
    }
  }

  // Count likes
  for (const l of (likes ?? [])) {
    if (isShort(l.video_id)) { ensureShort(l.video_id); shortMap[l.video_id].likes++; }
    else { ensureVideo(l.video_id); videoMap[l.video_id].likes++; }
  }

  // Count comments
  for (const c of (comments ?? [])) {
    if (isShort(c.video_id)) { ensureShort(c.video_id); shortMap[c.video_id].comentarios++; }
    else { ensureVideo(c.video_id); videoMap[c.video_id].comentarios++; }
  }

  // Ensure all admin videos/shorts appear even with 0 interactions
  for (const v of videosRaw) ensureVideo(v.id);
  for (const s of shortsRaw) ensureShort(s.id);

  // Compute engagement
  const computeEngagement = (items: TopContent[]) => {
    for (const item of items) {
      item.engagement = item.vistas > 0
        ? Math.round(((item.likes + item.comentarios) / item.vistas) * 100)
        : 0;
    }
  };

  const topVideos = Object.values(videoMap)
    .sort((a, b) => (b.vistas * 1 + b.likes * 3 + b.comentarios * 2) - (a.vistas * 1 + a.likes * 3 + a.comentarios * 2));
  computeEngagement(topVideos);

  const topShorts = Object.values(shortMap)
    .sort((a, b) => (b.vistas * 1 + b.likes * 3 + b.comentarios * 2) - (a.vistas * 1 + a.likes * 3 + a.comentarios * 2));
  computeEngagement(topShorts);

  const engagementRate = totalViews > 0
    ? Math.round(((totalLikes + totalComments) / totalViews) * 100)
    : 0;

  // ── 9. KPIs (solo métricas globales, sin XP ni Minutos) ──────────────────
  const kpis: KPI[] = [
    {
      label: 'Usuarios',
      value: fmt(totalUsers),
      sub: `${planDist[2].value} premium`,
      icon: <Users size={18} />,
      color: C.blue,
      glow: 'rgba(96,165,250,0.35)',
    },
    {
      label: 'Reproducciones',
      value: fmt(totalViews),
      sub: `${avgSessionMin} min promedio`,
      icon: <Eye size={18} />,
      color: C.purple,
      glow: 'rgba(167,139,250,0.35)',
    },
    {
      label: 'Likes',
      value: fmt(totalLikes),
      sub: `${engagementRate}% eng. rate`,
      icon: <Heart size={18} />,
      color: C.pink,
      glow: 'rgba(244,114,182,0.35)',
    },
    {
      label: 'Comentarios',
      value: fmt(totalComments),
      sub: `${topVideos[0]?.comentarios ?? 0} en top video`,
      icon: <MessageCircle size={18} />,
      color: C.green,
      glow: 'rgba(52,211,153,0.35)',
    },
  ];

  return {
    kpis, activity, categories, topVideos, topShorts, topUsers, planDist,
    engagementRate, avgSessionMin, retentionRate,
    lastUpdated: new Date(),
  };
}

function buildActivityChart(
  views: Array<{ viewed_at?: string }>,
  likes: Array<{ created_at: string }>,
  comments: Array<{ created_at: string }>,
): DayActivity[] {
  const days: DayActivity[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      day: `${d.getDate()}/${d.getMonth() + 1}`,
      vistas:      views.filter(v => v.viewed_at?.slice(0, 10) === key).length,
      likes:       likes.filter(l => l.created_at?.slice(0, 10) === key).length,
      comentarios: comments.filter(c => c.created_at?.slice(0, 10) === key).length,
    });
  }
  return days;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function fmtMin(min: number): string {
  if (min >= 60) return `${Math.round(min / 60)}h`;
  return `${min}m`;
}

/* ─── Custom SVG Area Chart ────────────────────────────────────────────────── */
interface AreaSeries { dataKey: string; name: string; color: string; opacity?: number }
interface AreaChartProps {
  data: Record<string, number | string>[];
  xKey: string;
  series: AreaSeries[];
  height?: number;
  xInterval?: number;
}
function CustomAreaChart({ data, xKey, series, height = 140, xInterval = 4 }: AreaChartProps) {
  const W = 320; const H = height; const PAD = { t: 8, r: 4, b: 24, l: 28 };
  const cW = W - PAD.l - PAD.r; const cH = H - PAD.t - PAD.b;

  const allVals = data.flatMap(d => series.map(s => Number(d[s.dataKey]) || 0));
  const maxVal  = Math.max(...allVals, 1);

  const xPos = (i: number) => PAD.l + (i / Math.max(data.length - 1, 1)) * cW;
  const yPos = (v: number) => PAD.t + cH - (v / maxVal) * cH;

  // Y-axis ticks
  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  // X-axis ticks (filtered by interval)
  const xTicks = data.filter((_, i) => i % (xInterval + 1) === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {yTicks.map(v => (
        <line key={`gy-${v}`} x1={PAD.l} x2={W - PAD.r} y1={yPos(v)} y2={yPos(v)}
          stroke="rgba(255,255,250,0.04)" strokeDasharray="3 3" />
      ))}
      {/* Y-axis labels */}
      {yTicks.map(v => (
        <text key={`yt-${v}`} x={PAD.l - 4} y={yPos(v) + 3} textAnchor="end"
          fill="rgba(255,255,255,0.25)" fontSize={8}>{v > 999 ? `${(v/1000).toFixed(1)}k` : v}</text>
      ))}
      {/* X-axis labels */}
      {xTicks.map((d, i) => {
        const origIdx = data.indexOf(d);
        return (
          <text key={`xt-${i}`} x={xPos(origIdx)} y={H - 4} textAnchor="middle"
            fill="rgba(255,255,255,0.3)" fontSize={8}>{String(d[xKey])}</text>
        );
      })}
      {/* Series */}
      {series.map(s => {
        const pts = data.map((d, i) => ({ x: xPos(i), y: yPos(Number(d[s.dataKey]) || 0) }));
        const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const areaPath = `${linePath} L${pts[pts.length-1].x.toFixed(1)},${yPos(0).toFixed(1)} L${pts[0].x.toFixed(1)},${yPos(0).toFixed(1)} Z`;
        const gradId = `ag-${s.dataKey}`;
        return (
          <g key={`series-${s.dataKey}`}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={s.opacity ?? 0.35} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path d={linePath} fill="none" stroke={s.color} strokeWidth={1.5} />
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Custom SVG Horizontal Bar Chart ────────────────────────────────────── */
interface HBarItem { name: string; value: number; color: string }
function CustomHBarChart({ data, height = 180 }: { data: HBarItem[]; height?: number }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const rowH   = Math.floor(height / data.length);
  const barH   = Math.max(rowH - 10, 8);
  const labelW = 72;
  const valW   = 32;
  const W = 320; const chartW = W - labelW - valW - 8;

  return (
    <svg viewBox={`0 0 ${W} ${data.length * rowH}`} width="100%">
      {data.map((d, i) => {
        const barW = (d.value / maxVal) * chartW;
        const y    = i * rowH + (rowH - barH) / 2;
        return (
          <g key={`hbar-${d.name}`}>
            <text x={labelW - 4} y={y + barH / 2 + 3} textAnchor="end"
              fill="rgba(255,255,255,0.5)" fontSize={9}>{d.name}</text>
            <rect x={labelW} y={y} width={chartW} height={barH} rx={4}
              fill="rgba(255,255,255,0.04)" />
            <rect x={labelW} y={y} width={Math.max(barW, 2)} height={barH} rx={4}
              fill={d.color} fillOpacity={0.8} />
            <text x={labelW + chartW + 4} y={y + barH / 2 + 3} textAnchor="start"
              fill={d.color} fontSize={9} fontWeight="bold">
              {d.value > 999 ? `${(d.value/1000).toFixed(1)}k` : d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl animate-pulse ${className}`}
      style={{ background: 'rgba(255,255,255,0.06)' }} />
  );
}

function KPICard({ kpi, index }: { kpi: KPI; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-[16px] p-3.5 flex flex-col gap-2"
      style={{
        background: `linear-gradient(135deg, ${kpi.color}12, ${kpi.color}06)`,
        border: `1px solid ${kpi.color}30`,
        boxShadow: `0 4px 20px ${kpi.glow}`,
      }}>
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
          style={{ background: `${kpi.color}20`, color: kpi.color }}>
          {kpi.icon}
        </div>
      </div>
      <div>
        <p className="text-white font-black text-xl leading-none">{kpi.value}</p>
        <p className="text-[10px] font-bold mt-0.5" style={{ color: kpi.color }}>{kpi.label}</p>
        <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{kpi.sub}</p>
      </div>
    </motion.div>
  );
}

const CUSTOM_TOOLTIP_STYLE = {
  background: 'rgba(10,10,20,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 11,
  color: '#fff',
  padding: '6px 10px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
};

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={CUSTOM_TOOLTIP_STYLE}>
      <p className="font-bold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

function SectionTitle({ icon, label, color }: { icon: ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-[8px] flex items-center justify-center"
        style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <span className="font-black text-[12px] tracking-wider" style={{ color }}>{label}</span>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const color = PLAN_COLORS[plan as keyof typeof PLAN_COLORS] ?? '#fff';
  const label = plan === 'premium' ? 'PRO' : plan === 'trial' ? 'TRIAL' : 'FREE';
  return (
    <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black"
      style={{ background: `${color}25`, color, border: `1px solid ${color}40` }}>
      {label}
    </span>
  );
}

/* ─── TopContentSection ────────────────────────────────────────────────────── */
interface TopContentSectionProps {
  icon: ReactNode;
  label: string;
  accentColor: string;
  emptyIcon: ReactNode;
  emptyText: string;
  items: TopContent[];
  tab: 'vistas' | 'likes' | 'engagement';
  setTab: (t: 'vistas' | 'likes' | 'engagement') => void;
  footNote?: string;
}

function TopContentSection({
  icon, label, accentColor, emptyIcon, emptyText,
  items, tab, setTab, footNote,
}: TopContentSectionProps) {
  const sorted = [...items].sort((a, b) =>
    tab === 'vistas' ? b.vistas - a.vistas :
    tab === 'likes'  ? b.likes  - a.likes  :
                       b.engagement - a.engagement,
  );
  const topN = sorted.slice(0, 10);

  const barColor = tab === 'vistas' ? C.purple : tab === 'likes' ? C.pink : C.green;
  const firstVal = topN[0]
    ? (tab === 'vistas' ? topN[0].vistas : tab === 'likes' ? topN[0].likes : topN[0].engagement)
    : 1;

  return (
    <div className="rounded-[18px] p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <SectionTitle icon={icon} label={label} color={accentColor} />

      {/* Tab selector */}
      <div className="flex gap-1.5 mb-3">
        {(['vistas', 'likes', 'engagement'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-1 rounded-full text-[9px] font-bold transition-all"
            style={{
              background: tab === t ? `${accentColor}20` : 'rgba(255,255,255,0.05)',
              border: tab === t ? `1px solid ${accentColor}40` : '1px solid transparent',
              color: tab === t ? accentColor : 'rgba(255,255,255,0.3)',
            }}>
            {t === 'engagement' ? 'Eng. %' : t === 'vistas' ? 'Vistas' : 'Likes'}
          </button>
        ))}
      </div>

      {topN.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2">
          {emptyIcon}
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{emptyText}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {topN.map((item, i) => {
            const val = tab === 'vistas' ? item.vistas : tab === 'likes' ? item.likes : item.engagement;
            const pct = firstVal > 0 ? (val / firstVal) * 100 : 0;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

            return (
              <div key={item.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {/* Rank */}
                  <div className="w-6 flex-shrink-0 flex items-center justify-center">
                    {medal
                      ? <span className="text-[13px]">{medal}</span>
                      : <span className="text-[10px] font-black" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                    }
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[11px] font-bold truncate leading-snug">{item.titulo}</p>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      <span className="text-[9px]" style={{ color: C.purple }}>
                        👁 {fmt(item.vistas)}
                      </span>
                      <span className="text-[9px]" style={{ color: C.pink }}>
                        ❤️ {item.likes}
                      </span>
                      <span className="text-[9px]" style={{ color: C.green }}>
                        💬 {item.comentarios}
                      </span>
                      {item.engagement > 0 && (
                        <span className="text-[9px]" style={{ color: C.gold }}>
                          📈 {item.engagement}%
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Main value */}
                  <span className="text-[11px] font-black flex-shrink-0" style={{ color: barColor }}>
                    {tab === 'engagement' ? `${val}%` : fmt(val)}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="ml-8 h-1 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.04 }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${barColor}, ${barColor}60)` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      {footNote && (
        <p className="text-[9px] mt-3 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {footNote}
        </p>
      )}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export function AnalyticsDashboard() {
  const uid = useId().replace(/:/g, '');
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [range, setRange]       = useState<7 | 14 | 30>(30);
  const [videoTab, setVideoTab] = useState<'vistas' | 'likes' | 'engagement'>('vistas');
  const [shortTab, setShortTab] = useState<'vistas' | 'likes' | 'engagement'>('vistas');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnalytics();
      setData(result);
    } catch (e) {
      setError('Error al cargar estadísticas. Verifica la conexión con Supabase.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSkeleton />;
  if (error)   return <ErrorState message={error} onRetry={load} />;
  if (!data)   return null;

  const activitySlice = data.activity.slice(30 - range);

  return (
    <div className="flex flex-col gap-5 pb-4">

      {/* ── Timestamp + Refresh ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Actualizado: {data.lastUpdated.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full active:scale-90 transition-transform"
          style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', color: C.purple }}>
          <RefreshCw size={11} />
          <span className="text-[10px] font-bold">Actualizar</span>
        </button>
      </div>

      {/* ── KPI Grid ────────────────────────────────────────────────────── */}
      <div>
        <SectionTitle icon={<BarChart2 size={13} />} label="MÉTRICAS CLAVE" color={C.purple} />
        <div className="grid grid-cols-2 gap-2.5">
          {data.kpis.map((kpi, i) => <KPICard key={kpi.label} kpi={kpi} index={i} />)}
        </div>
      </div>

      {/* ── Salud de la plataforma ──────────────────────────────────────── */}
      <div className="rounded-[18px] p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <SectionTitle icon={<Activity size={13} />} label="SALUD DE LA PLATAFORMA" color={C.green} />
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Eng. Rate',  value: `${data.engagementRate}%`,  icon: <TrendingUp size={14} />,  color: C.green,  sub: 'likes+comts/vistas' },
            { label: 'Retención',  value: `${data.retentionRate}%`,   icon: <Flame size={14} />,       color: C.orange, sub: 'usuarios activos' },
            { label: 'Avg. Sesión', value: fmtMin(data.avgSessionMin), icon: <Clock size={14} />,       color: C.blue,   sub: 'por usuario' },
          ].map(m => (
            <div key={m.label} className="rounded-[12px] p-3 flex flex-col items-center gap-1.5 text-center"
              style={{ background: `${m.color}10`, border: `1px solid ${m.color}25` }}>
              <div style={{ color: m.color }}>{m.icon}</div>
              <p className="text-white font-black text-base leading-none">{m.value}</p>
              <p className="font-bold text-[9px]" style={{ color: m.color }}>{m.label}</p>
              <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Actividad ──────────────────────────────────────────────────── */}
      <div className="rounded-[18px] p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <SectionTitle icon={<TrendingUp size={13} />} label="ACTIVIDAD EN EL TIEMPO" color={C.blue} />

        {/* Range selector */}
        <div className="flex gap-1.5 mb-3">
          {([7, 14, 30] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
              style={{
                background: range === r ? `${C.blue}25` : 'rgba(255,255,255,0.05)',
                border: range === r ? `1px solid ${C.blue}50` : '1px solid transparent',
                color: range === r ? C.blue : 'rgba(255,255,255,0.35)',
              }}>
              {r}d
            </button>
          ))}
        </div>

        <CustomAreaChart
          data={activitySlice}
          xKey="day"
          xInterval={range === 7 ? 0 : range === 14 ? 1 : 4}
          height={140}
          series={[
            { dataKey: 'vistas',      name: 'Vistas',      color: C.purple, opacity: 0.4  },
            { dataKey: 'likes',       name: 'Likes',       color: C.pink,   opacity: 0.35 },
            { dataKey: 'comentarios', name: 'Comentarios', color: C.green,  opacity: 0.3  },
          ]}
        />

        {/* Legend */}
        <div className="flex gap-3 mt-2 justify-center">
          {[['Vistas', C.purple], ['Likes', C.pink], ['Comentarios', C.green]].map(([l, c]) => (
            <div key={l} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: c }} />
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOP VIDEOS ──────────────────────────────────────────────────── */}
      <TopContentSection
        icon={<Clapperboard size={13} />}
        label="TOP VIDEOS"
        accentColor={C.gold}
        emptyIcon={<Clapperboard size={28} style={{ color: 'rgba(255,255,255,0.1)' }} />}
        emptyText="Sin videos con reproducciones aún"
        items={data.topVideos}
        tab={videoTab}
        setTab={setVideoTab}
        footNote={`📊 El ranking alimenta automáticamente el Top 10 del inicio`}
      />

      {/* ── TOP SHORTS ──────────────────────────────────────────────────── */}
      <TopContentSection
        icon={<Sparkles size={13} />}
        label="TOP SHORTS"
        accentColor={C.pink}
        emptyIcon={<Sparkles size={28} style={{ color: 'rgba(255,255,255,0.1)' }} />}
        emptyText="Sin shorts con reproducciones aún"
        items={data.topShorts}
        tab={shortTab}
        setTab={setShortTab}
        footNote={`⚡ ${data.topShorts.length} short${data.topShorts.length !== 1 ? 's' : ''} publicado${data.topShorts.length !== 1 ? 's' : ''} en la plataforma`}
      />

      {/* ── Distribución de planes ──────────────────────────────────────── */}
      <div className="rounded-[18px] p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <SectionTitle icon={<Crown size={13} />} label="DISTRIBUCIÓN DE PLANES" color={C.gold} />
        <div className="flex items-center gap-4">
          <PieChart width={120} height={120}>
            <Pie data={data.planDist} cx="50%" cy="50%" innerRadius={32} outerRadius={52}
              dataKey="value" paddingAngle={3}>
              {data.planDist.map((entry) => (
                <Cell key={`plan-${entry.name}`} fill={entry.color}
                  stroke={`${entry.color}40`} strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
          <div className="flex-1 flex flex-col gap-2">
            {data.planDist.map(p => {
              const total = data.planDist.reduce((s, x) => s + x.value, 0);
              const pct = total > 0 ? Math.round((p.value / total) * 100) : 0;
              return (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <span className="text-[11px] flex-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{p.name}</span>
                  <span className="font-black text-[11px] text-white">{p.value}</span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{pct}%</span>
                </div>
              );
            })}
            <div className="pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Total: <span className="text-white font-bold">{data.planDist.reduce((s, p) => s + p.value, 0)}</span> usuarios
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Categorías más populares ─────────────────────────────────────── */}
      {data.categories.length > 0 && (
        <div className="rounded-[18px] p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <SectionTitle icon={<Star size={13} />} label="CATEGORÍAS MÁS CONSUMIDAS" color={C.orange} />
          <CustomHBarChart
            height={Math.max(data.categories.length * 28, 100)}
            data={data.categories.map((cat, i) => {
              const colors = [C.purple, C.pink, C.blue, C.green, C.gold, C.orange, C.purple, C.pink];
              return { name: cat.name, value: cat.reproducciones, color: colors[i % colors.length] };
            })}
          />

          {/* Top category highlight */}
          {data.categories[0] && (
            <div className="mt-2 rounded-[10px] px-3 py-2 flex items-center gap-2"
              style={{ background: `${C.orange}10`, border: `1px solid ${C.orange}20` }}>
              <Trophy size={14} style={{ color: C.gold }} />
              <div className="flex-1">
                <p className="text-[11px] font-bold text-white">
                  🏆 {data.categories[0].name} lidera con {data.categories[0].reproducciones} reproducciones
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {fmtMin(data.categories[0].minutos)} consumidos en total
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Top Usuarios ────────────────────────────────────────────────── */}
      <div className="rounded-[18px] p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <SectionTitle icon={<Award size={13} />} label="USUARIOS MÁS ACTIVOS" color={C.purple} />
        {data.topUsers.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2">
            <Users size={28} style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin datos de usuarios aún</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data.topUsers.map((u, i) => {
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
              const gradient = i === 0
                ? 'linear-gradient(135deg,rgba(251,191,36,0.15),rgba(251,191,36,0.05))'
                : i === 1
                ? 'linear-gradient(135deg,rgba(167,139,250,0.1),rgba(167,139,250,0.03))'
                : 'rgba(255,255,255,0.03)';
              return (
                <div key={i} className="rounded-[12px] p-2.5 flex items-center gap-3"
                  style={{ background: gradient, border: `1px solid rgba(255,255,255,${i === 0 ? '0.12' : '0.06'})` }}>
                  <div className="flex items-center justify-center w-7 flex-shrink-0">
                    {medal
                      ? <span className="text-base">{medal}</span>
                      : <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-white text-[12px] font-bold truncate">{u.name || 'Usuario anónimo'}</p>
                      <PlanBadge plan={u.plan} />
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-[9px]" style={{ color: C.gold }}>⚡ {fmt(u.xp)} XP</span>
                      <span className="text-[9px]" style={{ color: C.blue }}>⏱ {fmtMin(u.minutos)}</span>
                      {u.streak > 0 && <span className="text-[9px]" style={{ color: C.orange }}>🔥 {u.streak}d racha</span>}
                    </div>
                  </div>
                  {/* XP bar */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-black" style={{ color: C.gold }}>{fmt(u.xp)}</span>
                    <div className="w-16 h-1 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: data.topUsers[0].xp > 0 ? `${(u.xp / data.topUsers[0].xp) * 100}%` : '0%' }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${C.gold}, ${C.orange})` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Insight rápido ──────────────────────────────────────────────── */}
      <div className="rounded-[18px] p-4"
        style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(99,102,241,0.05))', border: '1px solid rgba(139,92,246,0.2)' }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'rgba(139,92,246,0.2)' }}>
            <TrendingUp size={15} style={{ color: C.purple }} />
          </div>
          <div className="flex-1">
            <p className="text-white font-black text-[12px]">Insight de Morix</p>
            <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {data.topVideos[0]
                ? `🎬 "${data.topVideos[0].titulo}" es el video más popular con ${fmt(data.topVideos[0].vistas)} vistas, ${data.topVideos[0].likes} likes y ${data.topVideos[0].comentarios} comentarios.`
                : `💡 Agrega videos y los usuarios comenzarán a generar estadísticas reales.`
              }
              {data.topShorts[0]
                ? ` ⚡ En shorts, "${data.topShorts[0].titulo}" lidera con ${fmt(data.topShorts[0].vistas)} vistas.`
                : ''
              }
              {data.engagementRate > 10
                ? ` 🔥 Engagement: ${data.engagementRate}% — excelente.`
                : data.engagementRate > 0
                ? ` Eng. rate global: ${data.engagementRate}%.`
                : ''
              }
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ─── Loading skeleton ─────────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-52" />
      <Skeleton className="h-48" />
    </div>
  );
}

/* ─── Error state ──────────────────────────────────────────────────────────── */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center py-12 gap-4 text-center">
      <div className="w-14 h-14 rounded-[18px] flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <TrendingDown size={24} style={{ color: '#f87171' }} />
      </div>
      <div>
        <p className="text-white font-bold mb-1">Error de datos</p>
        <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{message}</p>
      </div>
      <button onClick={onRetry}
        className="px-5 py-2.5 rounded-full font-bold text-[12px] text-white"
        style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
        Reintentar
      </button>
    </div>
  );
}