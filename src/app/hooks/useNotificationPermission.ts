/**
 * useNotificationPermission — versión Capacitor-aware.
 *
 * Funciona en:
 *  - Capacitor Android WebView (con o sin @capacitor/local-notifications)
 *  - Chrome / browsers estándar
 *  - SSR
 */

import { useState, useEffect, useCallback } from 'react';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  isCapacitorNative,
  type NativePermStatus,
} from '../utils/capacitorUtils';

export type PermissionStatus = NativePermStatus;

const LS_KEY = 'morix_permission_asked';

export function useNotificationPermission() {
  const [status,       setStatus]       = useState<PermissionStatus>('prompt');
  const [alreadyAsked, setAlreadyAsked] = useState(false);
  const [loading,      setLoading]      = useState(true);

  // ── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    const asked = localStorage.getItem(LS_KEY) === '1';
    setAlreadyAsked(asked);

    checkNotificationPermission().then((s) => {
      setStatus(s);
      setLoading(false);
    });
  }, []);

  // ── Solicitar permiso ────────────────────────────────────────────────────
  const requestPermission = useCallback(async (): Promise<PermissionStatus> => {
    localStorage.setItem(LS_KEY, '1');
    setAlreadyAsked(true);

    const result = await requestNotificationPermission();
    setStatus(result);
    return result;
  }, []);

  // ── Saltar / "Ahora no" ──────────────────────────────────────────────────
  const skipPermission = useCallback(() => {
    localStorage.setItem(LS_KEY, '1');
    setAlreadyAsked(true);
  }, []);

  // ── Re-chequear después de que el usuario vuelve de Settings ────────────
  // Cuando el usuario fue a Settings del sistema y volvió, recheckeamos el permiso
  useEffect(() => {
    const onVisible = async () => {
      if (!document.hidden) {
        const s = await checkNotificationPermission();
        setStatus(s);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const needsToAsk =
    !loading &&
    !alreadyAsked &&
    status !== 'granted';

  const isNative = isCapacitorNative();

  return {
    status,
    alreadyAsked,
    needsToAsk,
    loading,
    isNative,
    requestPermission,
    skipPermission,
  };
}
