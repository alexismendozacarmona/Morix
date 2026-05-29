// Supabase Edge Function: send-push
// (Desplegada en Supabase con el slug 'dynamic-service' — nombre por defecto
//  que asignó el editor del dashboard. La app la invoca como 'dynamic-service'.)
// ─────────────────────────────────────────────────────────────────────────────
// Envía una notificación push (FCM HTTP v1) a TODOS los dispositivos
// registrados en morix_device_tokens, respetando el toggle de notificaciones
// de cada usuario (app_settings.notificaciones). Solo administradores pueden
// invocarla (se valida el JWT del emisor contra ADMIN_EMAILS).
//
// Secrets requeridos (Supabase → Edge Functions → Secrets):
//   • FCM_SERVICE_ACCOUNT  → JSON completo del service account de Firebase.
//   • ADMIN_EMAILS         → (opcional) lista separada por comas. Por defecto:
//                            alexismendozacarmona@gmail.com
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY los inyecta la plataforma.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

// ─── Helpers JWT / base64url (para OAuth2 del service account) ───────────────
function base64urlFromBytes(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlFromString(s: string): string {
  return base64urlFromBytes(new TextEncoder().encode(s));
}
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '')   // por si llega doblemente escapado
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// Intercambia el service account por un access token OAuth2 de FCM.
async function getAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64urlFromString(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64urlFromString(JSON.stringify({
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }));
  const unsigned = `${header}.${claim}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${base64urlFromBytes(new Uint8Array(sig))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OAuth token error: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    // ── 1. Gate de admin: validar el JWT del emisor ──────────────────────────
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
    if (!jwt) return json({ error: 'No autorizado (sin token)' }, 401);

    const { data: { user }, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !user?.email) return json({ error: 'No autorizado' }, 401);

    const adminEmails = (Deno.env.get('ADMIN_EMAILS') ?? 'alexismendozacarmona@gmail.com')
      .split(',').map((e) => e.trim().toLowerCase());
    if (!adminEmails.includes(user.email.toLowerCase())) {
      return json({ error: 'Solo administradores pueden enviar push' }, 403);
    }

    // ── 2. Payload ───────────────────────────────────────────────────────────
    const { title, body, data, excludeUserId } = await req.json();
    if (!title || !body) return json({ error: 'Faltan title/body' }, 400);

    // ── 3. Service account ───────────────────────────────────────────────────
    const saRaw = Deno.env.get('FCM_SERVICE_ACCOUNT');
    if (!saRaw) return json({ error: 'Falta el secret FCM_SERVICE_ACCOUNT' }, 500);
    const sa = JSON.parse(saRaw);
    const projectId = sa.project_id;

    // ── 4. Destinatarios: todos los tokens, menos los que apagaron el toggle ──
    const { data: tokenRows, error: tokErr } = await admin
      .from('morix_device_tokens')
      .select('token, user_id');
    if (tokErr) return json({ error: tokErr.message }, 500);

    const { data: settingsRows } = await admin
      .from('morix_user_settings')
      .select('user_id, app_settings');

    const optedOut = new Set<string>();
    (settingsRows ?? []).forEach((r: any) => {
      // Solo se excluye a quien explícitamente lo apagó (default = ON).
      if (r.app_settings && r.app_settings.notificaciones === false) optedOut.add(r.user_id);
    });

    let targets = (tokenRows ?? []).filter((t: any) => !optedOut.has(t.user_id));
    if (excludeUserId) targets = targets.filter((t: any) => t.user_id !== excludeUserId);

    if (targets.length === 0) {
      return json({ success: true, sent: 0, failed: 0, removed: 0, note: 'sin destinatarios' }, 200);
    }

    // ── 5. Enviar vía FCM HTTP v1 (lotes de 100 en paralelo) ─────────────────
    const accessToken = await getAccessToken(sa);
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    let sent = 0, failed = 0;
    const deadTokens: string[] = [];

    for (let i = 0; i < targets.length; i += 100) {
      const batch = targets.slice(i, i + 100);
      await Promise.all(batch.map(async (t: any) => {
        const message = {
          message: {
            token: t.token,
            notification: { title, body },
            data: data ?? {},
            android: {
              priority: 'HIGH',
              notification: { channel_id: 'morix_main', default_sound: true },
            },
          },
        };
        const res = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify(message),
        });
        if (res.ok) {
          sent++;
        } else {
          failed++;
          const errJson = await res.json().catch(() => ({}));
          const errorCode = errJson?.error?.details?.find((d: any) => d.errorCode)?.errorCode;
          // Solo borramos el token ante una señal CLARA de que está muerto
          // (UNREGISTERED / 404). NUNCA ante INVALID_ARGUMENT, que también
          // ocurre por un mensaje mal formado y borraría tokens válidos.
          if (res.status === 404 || errorCode === 'UNREGISTERED') {
            deadTokens.push(t.token);
          }
        }
      }));
    }

    // ── 6. Limpiar tokens muertos ────────────────────────────────────────────
    let removed = 0;
    if (deadTokens.length > 0) {
      const { error: delErr } = await admin
        .from('morix_device_tokens')
        .delete()
        .in('token', deadTokens);
      if (!delErr) removed = deadTokens.length;
    }

    return json({ success: true, sent, failed, removed }, 200);

  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }
});
