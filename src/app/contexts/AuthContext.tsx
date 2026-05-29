import { createContext, useContext, useState, useCallback, useEffect, type ReactNode, useRef } from 'react';
import { supabase, type DbUser } from '../../lib/supabase';
import { BillingService } from '../services/billingService';
import { registerPushForUser, unregisterPushForCurrentDevice } from '../services/pushService';

/* ─── User model (app-level) ─────────────────────────────────────────────── */
export interface MorixUser {
  id:             string;
  email:          string;
  password:       string;
  name:           string;
  bio:            string;
  avatarGradient: number;
  avatarId:       string;
  plan:           'free' | 'trial' | 'premium';
  trialStart:     string | null;
  interests:      string[];
  createdAt:      string;
  setupComplete:  boolean;
}

/* ─── Mappers DB ↔ App ───────────────────────────────────────────────────── */
function dbToApp(u: DbUser): MorixUser {
  return {
    id:             u.id,
    email:          u.email,
    password:       u.password,
    name:           u.name,
    bio:            u.bio,
    avatarGradient: u.avatar_gradient,
    avatarId:       u.avatar_id ?? `gradient_${u.avatar_gradient}`,
    plan:           u.plan,
    trialStart:     u.trial_start,
    interests:      u.interests,
    createdAt:      u.created_at,
    setupComplete:  u.setup_complete,
  };
}

function appToDb(u: MorixUser): DbUser {
  return {
    id:              u.id,
    email:           u.email,
    password:        u.password,
    name:            u.name,
    bio:             u.bio,
    avatar_gradient: u.avatarGradient,
    avatar_id:       u.avatarId,
    plan:            u.plan,
    trial_start:     u.trialStart,
    interests:       u.interests,
    setup_complete:  u.setupComplete,
    created_at:      u.createdAt,
  };
}

/* ─── Context type ───────────────────────────────────────────────────────── */
export type RegisterResult = { ok: true; needsEmailVerification?: boolean } | { ok: false; error: string };
export type LoginResult    = { ok: true } | { ok: false; error: string };

interface AuthContextType {
  user:            MorixUser | null;
  isAuthenticated: boolean;
  authLoading:     boolean;
  register:        (email: string, password: string, plan: MorixUser['plan']) => Promise<RegisterResult>;
  login:           (email: string, password: string) => Promise<LoginResult>;
  logout:          () => void;
  deleteAccount:   () => Promise<{ ok: true } | { ok: false; error: string }>;
  updateProfile:   (data: Partial<Pick<MorixUser, 'name' | 'bio' | 'avatarGradient' | 'avatarId'>>) => Promise<void>;
  updateInterests: (interests: string[]) => Promise<void>;
  updatePlan:      (plan: MorixUser['plan'], trialStart?: string | null) => Promise<void>;
  completeSetup:   () => Promise<void>;
  changePassword:  (currentPassword: string, newPassword: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

/* ─── localStorage session (solo guarda el user_id) ─────────────────────── */
const LS_SESSION  = 'morix_session_v1';
const LS_CACHE    = 'morix_user_cache_v1'; // cache del user para carga inmediata

function loadSessionId(): string | null {
  try { return localStorage.getItem(LS_SESSION); } catch { return null; }
}
function saveSessionId(id: string | null) {
  try {
    if (id) localStorage.setItem(LS_SESSION, id);
    else    localStorage.removeItem(LS_SESSION);
  } catch { /* ignore */ }
}
function loadUserCache(): MorixUser | null {
  try {
    const raw = localStorage.getItem(LS_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveUserCache(u: MorixUser | null) {
  try {
    if (u) localStorage.setItem(LS_CACHE, JSON.stringify(u));
    else   localStorage.removeItem(LS_CACHE);
  } catch { /* ignore */ }
}

function genId(): string {
  return `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ─── HMR-safe singleton ─────────────────────────────────────────────────── */
const CTX_KEY = '__morix_auth_ctx__';
declare global { interface Window { [CTX_KEY]: unknown } }
if (!window[CTX_KEY]) {
  window[CTX_KEY] = createContext<AuthContextType | null>(null);
}
const AuthCtx = window[CTX_KEY] as React.Context<AuthContextType | null>;

/* ─── Provider ───────────────────────────────────────────────────────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Carga inmediata desde cache local, luego sincroniza con Supabase
  const [user, setUser]           = useState<MorixUser | null>(() => loadUserCache());
  const [authLoading, setLoading] = useState<boolean>(!!loadSessionId());
  const userRef = useRef<MorixUser | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);

  /* ── Al montar: refrescar usuario desde Supabase si hay sesión ─────────── */
  useEffect(() => {
    let mounted = true;

    async function hydrate(sessionUser: any) {
      if (!sessionUser) {
        if (mounted) setLoading(false);
        return;
      }

      // Persistir el id de sesión real apenas sabemos que hay sesión activa.
      // Varios contextos leen morix_session_v1 de forma síncrona (Notifications
      // lo usa como fuente de verdad en cada mutación; UserProgress y Playlist
      // para el primer paint). Sin esta línea, tras un login limpio las
      // notificaciones no se guardaban/marcaban/descartaban (early-return if !uid).
      saveSessionId(sessionUser.id);

      const { data, error } = await supabase
        .from('morix_users')
        .select('*')
        .eq('id', sessionUser.id)
        .single();
        
      if (!error && data && mounted) {
        const appUser = dbToApp(data as DbUser);
        setUser(appUser);
        saveUserCache(appUser);
      }
      if (mounted) setLoading(false);
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      hydrate(session?.user);
    });

    // Listen to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        hydrate(session?.user);
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          saveUserCache(null);
          saveSessionId(null);
          setUser(null);
        }
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  /* ── Efecto: Sincronizar con RevenueCat y Watchdog de Trial ─────────────── */
  useEffect(() => {
    if (user?.id) {
      BillingService.init(user.id);

      // Registrar el dispositivo para push (FCM). No-op en web; idempotente.
      registerPushForUser(user.id);

      // 1. Sincronización silenciosa con la tienda (iOS/Android)
      BillingService.getStatus().then(({ type }) => {
        // Sincronizamos SIEMPRE que el plan en la base de datos sea distinto al de la tienda
        // (Esto activa el premium al pagar y lo quita al cancelar)
        if (user.plan !== type) {
          console.log('[AuthContext] Syncing plan from Native Store to DB:', type);
          updatePlan(type);
        }
      });

      // 2. Watchdog de Trial (7 días)
      if (user.plan === 'trial' && user.trialStart) {
        const start = new Date(user.trialStart).getTime();
        const now   = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        if (now - start > sevenDays) {
          console.log('[AuthContext] Trial expired. Reverting to free plan.');
          updatePlan('free');
        }
      }
    }
  }, [user?.id, user?.plan]);

  /* ── register ────────────────────────────────────────────────────────── */
  const register = useCallback(async (
    email: string,
    password: string,
    plan: MorixUser['plan'],
  ): Promise<RegisterResult> => {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Registro nativo en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return { ok: false, error: 'Este correo ya está registrado.' };
      }
      return { ok: false, error: authError.message };
    }

    if (!authData.user) {
      return { ok: false, error: 'Error desconocido al registrar.' };
    }

    const newUser: MorixUser = {
      id:             authData.user.id,
      email:          trimmedEmail,
      password:       'supa_auth', // Ya no guardamos la password real
      name:           '',
      bio:            '',
      avatarGradient: 0,
      avatarId:       'gradient_0',
      plan,
      trialStart:     plan === 'trial' ? new Date().toISOString() : null,
      interests:      [],
      createdAt:      new Date().toISOString(),
      setupComplete:  false,
    };

    // 2. Insertar perfil (upsert para manejar casos de re-registro con email ya existente)
    const { error: dbError } = await supabase
      .from('morix_users')
      .upsert(appToDb(newUser), { onConflict: 'email', ignoreDuplicates: false });
    
    if (dbError) {
      console.error('[AuthContext] Error upserting user into morix_users:', dbError);
      // No bloqueamos el flujo — el usuario ya fue creado en Supabase Auth
      // El perfil se puede recuperar/crear luego en setup
    }

    // 3. Progreso vacío
    await supabase.from('morix_progress').insert({
      user_id:         newUser.id,
      total_xp:        0,
      streak:          0,
      best_streak:     0,
      watched_videos:  [],
      saved_videos:    [],
      video_progresses:{},
      total_minutes:   0,
      days_active:     [],
      daily_stats:     { date: '', completed: 0, minutes: 0 },
      watch_history:   [],
      category_stats:  {},
      updated_at:      new Date().toISOString(),
    });

    // Nota: Si la confirmación de correo está activa, authData.session será null
    // y el usuario tendrá que ir a su correo para completar.
    const needsEmailVerification = authData.session === null;
    
    return { ok: true, needsEmailVerification };
  }, []);

  /* ── login ───────────────────────────────────────────────────────────── */
  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    // Intento de Login Nativo
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        return { ok: false, error: 'Correo o contraseña incorrectos.' };
      }
      if (authError.message.includes('Email not confirmed')) {
        return { ok: false, error: 'Por favor confirma tu correo electrónico primero.' };
      }
      return { ok: false, error: authError.message };
    }

    // El onAuthStateChange detectará el SIGNED_IN y cargará el user.
    return { ok: true };
  }, []);

  /* ── logout ──────────────────────────────────────────────────────────── */
  const logout = useCallback(async () => {
    // Borrar el token push de ESTE dispositivo antes de cerrar sesión.
    await unregisterPushForCurrentDevice();
    await supabase.auth.signOut();
    saveSessionId(null);
    saveUserCache(null);
    setUser(null);
  }, []);

  /* ── deleteAccount — borra todo en Supabase Auth + Tablas + localStorage ── */
  const deleteAccount = useCallback(async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    const uid = userRef.current?.id;
    if (!uid) return { ok: false, error: 'No hay sesión activa.' };

    try {
      // 1. Borrar usuario de Supabase Auth vía RPC (la función que creamos)
      // Esto debería borrar el registro en auth.users y permitir re-registro inmediato.
      const { error: rpcError } = await supabase.rpc('delete_user_completely');
      if (rpcError) {
        console.warn('[deleteAccount] RPC error (may need to run SQL script):', rpcError);
      }

      // 2. Borrar todas las tablas públicas de Morix (por si el cascade falla o no existe)
      const tables: Array<{ table: string; col: string }> = [
        { table: 'morix_users',                 col: 'id'      },
        { table: 'morix_progress',              col: 'user_id' },
        { table: 'morix_video_likes',           col: 'user_id' },
        { table: 'morix_video_comments',        col: 'user_id' },
        { table: 'morix_user_settings',         col: 'user_id' },
        { table: 'morix_personal_notifications',col: 'user_id' },
        { table: 'morix_notification_reads',    col: 'user_id' },
        { table: 'morix_playlists',             col: 'user_id' },
      ];

      await Promise.allSettled(
        tables.map(({ table, col }) => supabase.from(table).delete().eq(col, uid))
      );

      // 3. Limpiar TODO el localStorage relacionado con este usuario
      const keysToRemove = [
        'morix_session_v1',
        'morix_user_cache_v1',
        'morix_app_settings_v1',
        'morix_privacy_settings_v1',
        'morix_pwa_banner_dismissed',
        'morix_broadcast_notifs_v1',
        `morix_progress_v2_${uid}`,
        `morix_playlists_v1_${uid}`,
        `morix_notifications_v1_${uid}`,
        `morix_notifs_seeded_v1_${uid}`,
        `morix_notifs_reminded_v1_${uid}`,
        `morix_notifs_completed_v1_${uid}`,
        `morix_notifs_level_v1_${uid}`,
        `morix_notifs_achievements_v1_${uid}`,
        `morix_notifs_new_content_ids_v1_${uid}`,
        `morix_notifs_deleted_v1_${uid}`,
        `morix_bc_dismissed_v2_${uid}`,
        `morix_bc_read_v2_${uid}`,
        `morix_daily_goal_${uid}`,
        `morix_watch_history_v1_${uid}`,
      ];
      keysToRemove.forEach((k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } });

      // 4. Resetear estado local y sesión
      await supabase.auth.signOut();
      saveSessionId(null);
      saveUserCache(null);
      setUser(null);

      return { ok: true };
    } catch (err: any) {
      console.error('[deleteAccount] Critical error:', err);
      return { ok: false, error: err.message };
    }
  }, []);

  /* ── updatePlan ──────────────────────────────────────────────────────────── */
  const updatePlan = useCallback(async (plan: MorixUser['plan'], trialStart?: string | null) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        plan,
        trialStart: trialStart !== undefined ? trialStart : prev.trialStart,
      };
      saveUserCache(updated);
      supabase.from('morix_users')
        .update({ plan, trial_start: updated.trialStart })
        .eq('id', prev.id)
        .then(({ error }) => { if (error) console.warn('Supabase updatePlan:', error); });
      return updated;
    });
  }, []);

  /* ── updateProfile ───────────────────────────────────────────────────── */
  const updateProfile = useCallback(async (
    data: Partial<Pick<MorixUser, 'name' | 'bio' | 'avatarGradient' | 'avatarId'>>
  ) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      saveUserCache(updated);

      // Sync to Supabase
      supabase.from('morix_users').update({
        name:            updated.name,
        bio:             updated.bio,
        avatar_gradient: updated.avatarGradient,
        avatar_id:       updated.avatarId,
      }).eq('id', prev.id).then(({ error }) => {
        if (error) console.warn('Supabase updateProfile error:', error);
      });

      return updated;
    });
  }, []);

  /* ── updateInterests ────────────────────────────────────────────────── */
  const updateInterests = useCallback(async (interests: string[]) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, interests };
      saveUserCache(updated);

      supabase.from('morix_users')
        .update({ interests })
        .eq('id', prev.id)
        .then(({ error }) => { if (error) console.warn('Supabase updateInterests:', error); });

      return updated;
    });
  }, []);

  /* ── completeSetup ───────────────────────────────────────────────────── */
  const completeSetup = useCallback(async () => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, setupComplete: true };
      saveUserCache(updated);

      supabase.from('morix_users')
        .update({ setup_complete: true })
        .eq('id', prev.id)
        .then(({ error }) => { if (error) console.warn('Supabase completeSetup:', error); });

      return updated;
    });
  }, []);

  /* ── changePassword ───────────────────────────────────────────────────── */
  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }> => {
    const currentUser = userRef.current;
    if (!currentUser) return { ok: false, error: 'No hay sesión activa.' };

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };

    const updatedUser = { ...currentUser, password: 'supa_auth' };
    saveUserCache(updatedUser);
    setUser(updatedUser);
    return { ok: true };
  }, []);

  return (
    <AuthCtx.Provider value={{
      user, isAuthenticated: !!user, authLoading,
      register, login, logout, deleteAccount,
      updateProfile, updateInterests, updatePlan, completeSetup,
      changePassword,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}