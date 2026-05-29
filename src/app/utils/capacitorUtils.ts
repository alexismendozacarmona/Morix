/**
 * capacitorUtils — Detección y bridges para Capacitor Android.
 *
 * En Capacitor WebView:
 *  - window.Notification NO existe → hay que usar plugins nativos
 *  - window.Capacitor existe y expone los plugins instalados
 *  - Para notificaciones se usa @capacitor/local-notifications
 *  - Para abrir Settings del sistema se usa el plugin App o un deep link
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// ── Helpers de entorno ─────────────────────────────────────────────────────

/** ¿Estamos corriendo dentro de Capacitor (APK nativa)? */
export function isCapacitorNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** ¿Es Android nativo? */
export function isAndroid(): boolean {
  if (isCapacitorNative()) return Capacitor.getPlatform() === 'android';
  return /android/i.test(navigator.userAgent);
}

// ── Notificaciones ─────────────────────────────────────────────────────────

export type NativePermStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

/**
 * Verifica el estado actual del permiso de notificaciones.
 * Soporta: Capacitor nativo, Web API estándar.
 */
export async function checkNotificationPermission(): Promise<NativePermStatus> {
  // ① Capacitor nativo → usar LocalNotifications plugin
  if (isCapacitorNative()) {
    try {
      const { display } = await LocalNotifications.checkPermissions();
      if (display === 'granted') return 'granted';
      if (display === 'denied')  return 'denied';
      return 'prompt';
    } catch {
      // Si el plugin falla (ej. no registrado), intentar Web API
    }
  }

  // ② Web Notification API (browser / PWA)
  if (!('Notification' in window)) return 'unsupported';
  const p = Notification.permission;
  if (p === 'granted') return 'granted';
  if (p === 'denied')  return 'denied';
  return 'prompt';
}

/**
 * Solicita el permiso de notificaciones al usuario.
 * En Android muestra el diálogo nativo del sistema.
 */
export async function requestNotificationPermission(): Promise<NativePermStatus> {
  // ① Capacitor nativo → usar LocalNotifications plugin
  if (isCapacitorNative()) {
    try {
      const { display } = await LocalNotifications.requestPermissions();
      if (display === 'granted') return 'granted';
      if (display === 'denied')  return 'denied';
      return 'prompt';
    } catch {
      // Si falla, intentar abrir Settings como último recurso
      await openAppNotificationSettings();
      return 'prompt';
    }
  }

  // ② Web Notification API
  if ('Notification' in window) {
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') return 'granted';
      if (result === 'denied')  return 'denied';
      return 'prompt';
    } catch {
      return 'unsupported';
    }
  }

  return 'unsupported';
}

/**
 * Abre la pantalla de notificaciones de la app en los Ajustes del sistema Android.
 * Equivalente a: Ajustes → Apps → Morix → Notificaciones
 */
export async function openAppNotificationSettings(): Promise<void> {
  try {
    // Android intent estándar para abrir ajustes de notificaciones de la app
    window.location.href = 'app-settings:';
  } catch { /* ignore */ }
}

// ── Disparar notificaciones del sistema ────────────────────────────────────

/** ID del canal de notificaciones de Morix en Android */
const morix_CHANNEL_ID = 'morix_main';

/**
 * Crea el canal de notificaciones principal de Morix.
 * Android 8+ (API 26+) REQUIERE un canal para mostrar notificaciones.
 * Llamar una sola vez al iniciar la app (idempotente si ya existe).
 */
export async function initNotificationChannel(): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    await LocalNotifications.createChannel({
      id:          morix_CHANNEL_ID,
      name:        'Morix',
      description: 'Notificaciones de logros, niveles y contenido nuevo',
      importance:  4,          // IMPORTANCE_HIGH → muestra heads-up banner
      visibility:  1,          // VISIBILITY_PUBLIC
      sound:       'default',
      vibration:   true,
      lights:      true,
      lightColor:  '#8b5cf6',  // color violeta de Morix
    });
  } catch (e) {
    console.warn('[Morix] createChannel falló:', e);
  }
}

/** Contador incremental para IDs numéricos de Capacitor LocalNotifications */
let _sysNotifCounter = Math.floor(Math.random() * 10_000);

/**
 * Dispara una notificación real en el sistema operativo (pull-down shade).
 *
 * Prioridad de canal:
 *  1. @capacitor/local-notifications  → notificación nativa Android (recomendado)
 *  2. Web Notification API             → notificación del navegador / PWA
 *
 * Solo dispara si el permiso ya está concedido (no solicita permiso aquí).
 * Devuelve true si pudo disparar, false en caso contrario.
 */
export async function fireSystemNotification(
  title: string,
  body: string,
  options?: { smallIcon?: string },
): Promise<boolean> {
  const notifId = (++_sysNotifCounter) % 2_147_483_647; // Java int max

  // ① Capacitor LocalNotifications (nativo Android)
  if (isCapacitorNative()) {
    try {
      const { display } = await LocalNotifications.checkPermissions();
      if (display !== 'granted') return false;

      await LocalNotifications.schedule({
        notifications: [{
          id:          notifId,
          title,
          body,
          channelId:   morix_CHANNEL_ID, // ← canal creado en initNotificationChannel()
          smallIcon:   options?.smallIcon ?? 'ic_stat_morix', // ← drawable monocromo en res/drawable/ic_stat_morix.xml
          schedule:    { at: new Date(Date.now() + 50) }, // casi inmediato
          sound:       undefined,
          actionTypeId: '',
          extra:       null,
        }],
      });
      return true;
    } catch (e) {
      console.warn('[Morix] LocalNotifications.schedule falló:', e);
      return false;
    }
  }

  // ② Web Notification API (browser / PWA)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: window.location.origin + '/icon.png',
        silent: false,
      });
      return true;
    } catch { /* ignore */ }
  }

  return false;
}