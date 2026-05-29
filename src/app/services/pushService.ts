/**
 * pushService — Registro de notificaciones push (FCM) para Android.
 * ─────────────────────────────────────────────────────────────────────────────
 * Flujo:
 *  • Al iniciar sesión: registerPushForUser(userId) pide permiso, registra el
 *    dispositivo en FCM y guarda el token en la tabla morix_device_tokens.
 *  • Al cerrar sesión: unregisterPushForCurrentDevice() borra el token de ESTE
 *    dispositivo (sin tocar los tokens de otros dispositivos del mismo usuario).
 *
 * Solo actúa en plataforma nativa (Capacitor). En web/PWA es no-op: el push web
 * (FCM Web) se podría añadir en una etapa futura si hiciera falta.
 *
 * iOS queda fuera por ahora; se usa Capacitor.getPlatform() en la columna
 * 'platform' para poder extender a iOS sin refactor al publicar en App Store.
 */
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../../lib/supabase';

let _listenersReady = false;
let _currentUserId: string | null = null;
let _lastToken: string | null = null;

async function saveToken(token: string, userId: string): Promise<void> {
  try {
    await supabase.from('morix_device_tokens').upsert(
      {
        token,
        user_id:    userId,
        platform:   Capacitor.getPlatform(), // 'android' | 'ios' (futuro)
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );
  } catch (e) {
    console.warn('[push] no se pudo guardar el token:', e);
  }
}

/**
 * Registra el dispositivo en FCM y asocia su token al usuario.
 * No-op fuera de plataforma nativa. Idempotente: los listeners se montan
 * una sola vez por sesión de app.
 */
export async function registerPushForUser(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return; // solo nativo (Android por ahora)
  _currentUserId = userId;

  // Permiso. En Android 13+ es POST_NOTIFICATIONS; si ya se concedió para las
  // notificaciones locales, el sistema no lo vuelve a pedir.
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') return;

  // Listeners una sola vez (sobreviven a cambios de usuario en la misma sesión).
  if (!_listenersReady) {
    _listenersReady = true;

    PushNotifications.addListener('registration', (token) => {
      _lastToken = token.value;
      if (_currentUserId) void saveToken(token.value, _currentUserId);
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push] registrationError:', err);
    });
  }

  // Si ya teníamos un token (re-login del mismo dispositivo), re-asociarlo ya.
  if (_lastToken) await saveToken(_lastToken, userId);

  await PushNotifications.register();
}

/**
 * Borra el token de ESTE dispositivo al cerrar sesión, para que deje de recibir
 * push de esa cuenta. No afecta a otros dispositivos del mismo usuario.
 */
export async function unregisterPushForCurrentDevice(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  _currentUserId = null;
  if (!_lastToken) return;
  try {
    await supabase.from('morix_device_tokens').delete().eq('token', _lastToken);
  } catch (e) {
    console.warn('[push] no se pudo borrar el token:', e);
  }
}
