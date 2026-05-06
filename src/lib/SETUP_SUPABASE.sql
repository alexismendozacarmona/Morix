-- ============================================================
-- MENTEX — SETUP DE BASE DE DATOS EN SUPABASE
-- Copia y pega esto en: https://dbhvdihfutilyismfdfd.supabase.co
-- Dashboard → SQL Editor → New query → Pega y ejecuta
-- ============================================================

-- Tabla de usuarios de Mentex
create table if not exists public.mentex_users (
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

-- Tabla de progreso/XP de cada usuario
create table if not exists public.mentex_progress (
  user_id          text primary key references public.mentex_users(id) on delete cascade,
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

-- Deshabilitar RLS para prototipo
alter table public.mentex_users    disable row level security;
alter table public.mentex_progress disable row level security;

-- ============================================================
-- ✅ Listo. Ejecuta solo hasta aquí.
-- ============================================================