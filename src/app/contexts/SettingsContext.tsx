import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode,
} from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthContext';

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface AppSettings {
  calidad:              'auto' | 'alta' | 'media' | 'baja';
  autoplay:             boolean;
  datosMoviles:         boolean;
  notificaciones:       boolean;
  sonidosUI:            boolean;
  idioma:               'es' | 'en';
  subtitulos:           boolean;
  reducirAnimaciones:   boolean;
  modoSinDistracciones: boolean;
}

export interface PrivacySettings {
  historialActivo: boolean;
}

export const APP_DEFAULTS: AppSettings = {
  calidad:              'auto',
  autoplay:             true,
  datosMoviles:         false,
  notificaciones:       true,
  sonidosUI:            true,
  idioma:               'es',
  subtitulos:           false,
  reducirAnimaciones:   false,
  modoSinDistracciones: false,
};

export const PRIVACY_DEFAULTS: PrivacySettings = {
  historialActivo: true,
};

const LS_APP     = 'morix_app_settings_v1';
const LS_PRIVACY = 'morix_privacy_settings_v1';

interface SettingsContextType {
  appSettings:            AppSettings;
  privacySettings:        PrivacySettings;
  updateAppSettings:      (partial: Partial<AppSettings>)     => void;
  updatePrivacySettings:  (partial: Partial<PrivacySettings>) => void;
}

/* ─── HMR-safe singleton ────────────────────────────────────────────────── */
const CTX_KEY = '__morix_settings_ctx__';
declare global { interface Window { [CTX_KEY]: unknown } }
if (!window[CTX_KEY]) {
  window[CTX_KEY] = createContext<SettingsContextType | null>(null);
}
const SettingsCtx = window[CTX_KEY] as React.Context<SettingsContextType | null>;

/* ─── localStorage helpers ──────────────────────────────────────────────── */
function loadLS<T>(key: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch { return { ...defaults }; }
}
function saveLS(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
}

/* ─── Provider ───────────────────────────────────────────────────────────── */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [appSettings,     setAppSettings]     = useState<AppSettings>    (() => loadLS(LS_APP,     APP_DEFAULTS));
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(() => loadLS(LS_PRIVACY, PRIVACY_DEFAULTS));

  // Refs so callbacks never go stale
  const appRef     = useRef(appSettings);
  const privacyRef = useRef(privacySettings);
  useEffect(() => { appRef.current     = appSettings;     }, [appSettings]);
  useEffect(() => { privacyRef.current = privacySettings; }, [privacySettings]);

  const syncTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set to false if Supabase table doesn't exist yet — avoids repeated errors
  const tableExists = useRef<boolean>(true);

  /* ── Load from Supabase on login ──────────────────────────────────────── */
  useEffect(() => {
    if (!user?.id || !tableExists.current) return;
    supabase
      .from('morix_user_settings')
      .select('app_settings, privacy_settings')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          // Table doesn't exist yet — disable sync silently
          if (
            error.message?.includes('schema cache') ||
            error.message?.includes('relation') ||
            error.code === 'PGRST204' ||
            error.code === '42P01'
          ) {
            tableExists.current = false;
          }
          return;
        }
        if (!data) return;
        if (data.app_settings && typeof data.app_settings === 'object') {
          const merged = { ...APP_DEFAULTS, ...(data.app_settings as Partial<AppSettings>) };
          setAppSettings(merged);
          appRef.current = merged;
          saveLS(LS_APP, merged);
        }
        if (data.privacy_settings && typeof data.privacy_settings === 'object') {
          const merged = { ...PRIVACY_DEFAULTS, ...(data.privacy_settings as Partial<PrivacySettings>) };
          setPrivacySettings(merged);
          privacyRef.current = merged;
          saveLS(LS_PRIVACY, merged);
        }
      });
  }, [user?.id]);

  /* ── Debounced Supabase sync ─────────────────────────────────────────── */
  const syncToSupabase = useCallback((app: AppSettings, privacy: PrivacySettings) => {
    if (!user?.id || !tableExists.current) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      supabase
        .from('morix_user_settings')
        .upsert({
          user_id:          user.id,
          app_settings:     app,
          privacy_settings: privacy,
          updated_at:       new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .then(({ error }) => {
          if (error) {
            // Table doesn't exist yet — disable sync silently
            if (
              error.message?.includes('schema cache') ||
              error.message?.includes('relation') ||
              error.code === 'PGRST204' ||
              error.code === '42P01'
            ) {
              tableExists.current = false;
            }
            // No console.warn — settings still work via localStorage
          }
        });
    }, 1500);
  }, [user?.id]);

  /* ── Apply reducirAnimaciones globally ───────────────────────────────── */
  useEffect(() => {
    const frame = document.getElementById('phone-frame');
    if (!frame) return;
    if (appSettings.reducirAnimaciones) {
      frame.setAttribute('data-reduce-motion', 'true');
    } else {
      frame.removeAttribute('data-reduce-motion');
    }
  }, [appSettings.reducirAnimaciones]);

  /* ── Updaters ────────────────────────────────────────────────────────── */
  const updateAppSettings = useCallback((partial: Partial<AppSettings>) => {
    setAppSettings(prev => {
      const next = { ...prev, ...partial };
      appRef.current = next;
      saveLS(LS_APP, next);
      syncToSupabase(next, privacyRef.current);
      return next;
    });
  }, [syncToSupabase]);

  const updatePrivacySettings = useCallback((partial: Partial<PrivacySettings>) => {
    setPrivacySettings(prev => {
      const next = { ...prev, ...partial };
      privacyRef.current = next;
      saveLS(LS_PRIVACY, next);
      syncToSupabase(appRef.current, next);
      return next;
    });
  }, [syncToSupabase]);

  return (
    <SettingsCtx.Provider value={{ appSettings, privacySettings, updateAppSettings, updatePrivacySettings }}>
      {children}
    </SettingsCtx.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider');
  return ctx;
}