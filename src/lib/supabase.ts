import { createClient } from '@supabase/supabase-js';

/* ─── Credenciales ───────────────────────────────────────────────────────────
   Proyecto: rwjspvxtjxmssjpjuhur (cuenta externa - solo para Morix)
   La anon key es pública por diseño de Supabase (igual que Firebase apiKey).
──────────────────────────────────────────────────────────────────────────── */
const SUPABASE_URL      = 'https://rwjspvxtjxmssjpjuhur.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3anNwdnh0anhtc3NqcGp1aHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTQ1NzQsImV4cCI6MjA5MTA3MDU3NH0.f2lawu-k2HAnnxhtJhhSUjVtfBeWvhy9MPA5CUQBnD0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ─── Tipos de base de datos ─────────────────────────────────────────────────
   Ejecuta este SQL una sola vez en el SQL Editor de tu Supabase dashboard:
   https://dbhvdihfutilyismfdfd.supabase.co → SQL Editor

-- ============================================================
-- Morix VIDEO VIEWS (para analytics)
-- Ejecutar en Supabase SQL Editor si no existe aún
-- ============================================================
create table if not exists public.morix_video_views (
  id         uuid default gen_random_uuid() primary key,
  video_id   text not null,
  user_id    text not null,
  viewed_at  timestamptz default now()
);
alter table public.morix_video_views disable row level security;
create index if not exists idx_morix_views_video_id on public.morix_video_views(video_id);
create index if not exists idx_morix_views_user_id  on public.morix_video_views(user_id);
create index if not exists idx_morix_views_date     on public.morix_video_views(viewed_at);

-- ============================================================
-- Morix DATABASE SETUP
-- Ejecutar una sola vez en Supabase SQL Editor
-- ============================================================

create table if not exists public.morix_users (
  id              text primary key,
  email           text unique not null,
  password        text not null,
  name            text default '',
  bio             text default '',
  avatar_gradient int  default 0,
  plan            text default 'free',
  trial_start     text,
  interests       text[] default '{}',
  setup_complete  boolean default false,
  created_at      text not null
);

create table if not exists public.morix_progress (
  user_id          text primary key references public.morix_users(id) on delete cascade,
  total_xp         int     default 0,
  streak           int     default 0,
  best_streak      int     default 0,
  last_watch_date  text,
  watched_videos   text[]  default '{}',
  saved_videos     text[]  default '{}',
  video_progresses jsonb   default '{}',
  total_minutes    int     default 0,
  days_active      text[]  default '{}',
  daily_stats      jsonb   default '{"date":"","completed":0,"minutes":0}',
  watch_history    jsonb   default '[]',
  category_stats   jsonb   default '{}',
  updated_at       text    default ''
);

-- Deshabilitar RLS para prototipo (la anon key puede leer/escribir)
alter table public.morix_users    disable row level security;
alter table public.morix_progress disable row level security;

-- Tabla de configuración por usuario
create table if not exists public.morix_user_settings (
  user_id          text primary key references public.morix_users(id) on delete cascade,
  app_settings     jsonb not null default '{}',
  privacy_settings jsonb not null default '{}',
  updated_at       text  default ''
);
alter table public.morix_user_settings disable row level security;

-- Likes de videos
create table if not exists public.morix_video_likes (
  id         uuid default gen_random_uuid() primary key,
  video_id   text not null,
  user_id    text not null,
  created_at timestamptz default now(),
  unique(video_id, user_id)
);
alter table public.morix_video_likes disable row level security;

-- Comentarios de videos (con soporte de replies y likes por arreglo)
create table if not exists public.morix_video_comments (
  id         uuid default gen_random_uuid() primary key,
  video_id   text not null,
  user_id    text not null,
  user_name  text not null,
  content    text not null,
  parent_id  uuid references public.morix_video_comments(id) on delete cascade,
  likes      text[] default '{}',
  edited     boolean default false,
  created_at timestamptz default now()
);
alter table public.morix_video_comments disable row level security;

-- Índice para acelerar queries por video
create index if not exists idx_morix_comments_video_id on public.morix_video_comments(video_id);
create index if not exists idx_morix_likes_video_id    on public.morix_video_likes(video_id);

-- Si la tabla ya existía sin la columna 'edited', agrégala:
alter table public.morix_video_comments add column if not exists edited boolean default false;

-- Contenido del admin (videos y shorts, sincronizados desde la app)
create table if not exists public.morix_admin_content (
  id         text primary key,   -- 'videos' | 'shorts'
  data       jsonb not null default '[]',
  updated_at timestamptz default now()
);
alter table public.morix_admin_content disable row level security;

-- Playlists por usuario
create table if not exists public.morix_playlists (
  user_id    text primary key references public.morix_users(id) on delete cascade,
  playlists  jsonb not null default '[]',
  updated_at text default ''
);
alter table public.morix_playlists disable row level security;

-- ============================================================
-- NUEVAS TABLAS — Notificaciones persistentes
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Broadcasts del admin (globales, visibles para todos los usuarios)
create table if not exists public.morix_broadcast_notifications (
  id           text primary key,
  type         text not null default 'info',
  title        text not null,
  body         text not null,
  icon         text not null default '🔔',
  accent_color text not null default '#8b5cf6',
  sent_at      bigint not null,
  sent_by      text not null
);
alter table public.morix_broadcast_notifications disable row level security;

-- Estado de notificaciones por usuario (leído / descartado)
-- Aplica tanto a broadcasts como a notificaciones personales
create table if not exists public.morix_notification_reads (
  user_id         text not null,
  notification_id text not null,
  is_read         boolean not null default false,
  dismissed       boolean not null default false,
  updated_at      bigint not null,
  primary key (user_id, notification_id)
);
alter table public.morix_notification_reads disable row level security;

-- ============================================================
-- NOTIFICACIONES PERSONALES — Ejecutar en Supabase SQL Editor
-- ============================================================

-- Notificaciones personales por usuario (logros, nivel, completaciones, etc.)
create table if not exists public.morix_personal_notifications (
  id           text    not null,
  user_id      text    not null references public.morix_users(id) on delete cascade,
  type         text    not null,
  title        text    not null,
  body         text    not null,
  video_id     text,
  timestamp    bigint  not null,
  read         boolean not null default false,
  icon         text    not null,
  accent_color text    not null,
  created_at   timestamptz default now(),
  primary key (id, user_id)
);
alter table public.morix_personal_notifications disable row level security;
create index if not exists idx_morix_pnotifs_user_id  on public.morix_personal_notifications(user_id);
create index if not exists idx_morix_pnotifs_timestamp on public.morix_personal_notifications(timestamp desc);

-- ============================================================
-- SUSCRIPCIONES WOMPI — Ejecutar en Supabase SQL Editor
-- ============================================================
-- Almacena el token de tarjeta y el estado de la suscripción por usuario.
-- El cargo real se realiza desde un Supabase Edge Function con la clave privada.

create table if not exists public.morix_subscriptions (
  id              text primary key default gen_random_uuid()::text,
  user_id         text not null references public.morix_users(id) on delete cascade,
  plan_type       text not null,               -- 'mensual' | 'anual'
  status          text not null default 'trial', -- 'trial' | 'active' | 'cancelled' | 'expired'
  card_token      text,                         -- Token Wompi (expira en ~10 min, solo para primer cobro)
  card_last_four  text,
  card_brand      text,
  amount_cents    int,                          -- USD cents: 499 mensual / 4990 anual
  currency        text default 'USD',
  trial_start     timestamptz default now(),
  trial_end       timestamptz,                  -- trial_start + 7 días
  next_billing    timestamptz,
  wompi_tx_id     text,                         -- ID de transacción Wompi al cobrar
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id)
);
alter table public.morix_subscriptions disable row level security;
create index if not exists idx_morix_subs_user_id on public.morix_subscriptions(user_id);
create index if not exists idx_morix_subs_status  on public.morix_subscriptions(status);

-- ============================================================
──────────────────────────────────────────────────────────────────────────── */

export type DbUser = {
  id:              string;
  email:           string;
  password:        string;
  name:            string;
  bio:             string;
  avatar_gradient: number;
  avatar_id:       string;
  plan:            'free' | 'trial' | 'premium';
  trial_start:     string | null;
  interests:       string[];
  setup_complete:  boolean;
  created_at:      string;
};

export type DbProgress = {
  user_id:          string;
  total_xp:         number;
  streak:           number;
  best_streak:      number;
  last_watch_date:  string | null;
  watched_videos:   string[];
  saved_videos:     string[];
  video_progresses: Record<string, number>;
  total_minutes:    number;
  days_active:      string[];
  daily_stats:      { date: string; completed: number; minutes: number };
  watch_history:    unknown[];
  category_stats:   Record<string, { count: number; minutes: number }>;
  updated_at:       string;
};

export type DbUserSettings = {
  user_id:          string;
  app_settings:     Record<string, unknown>;
  privacy_settings: Record<string, unknown>;
  updated_at:       string;
};

export type DbPersonalNotification = {
  id:           string;
  user_id:      string;
  type:         string;
  title:        string;
  body:         string;
  video_id:     string | null;
  timestamp:    number;
  read:         boolean;
  icon:         string;
  accent_color: string;
};