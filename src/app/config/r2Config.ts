/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║               CLOUDFLARE R2 — CONFIGURACIÓN                     ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  CORS Policy recomendada (R2 → Morix → Settings → CORS):       ║
 * ║  [{"AllowedOrigins":["*"],"AllowedMethods":["GET","PUT","HEAD"], ║
 * ║    "AllowedHeaders":["*"],"ExposeHeaders":["ETag"],             ║
 * ║    "MaxAgeSeconds":3600}]                                        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ─── Account & bucket ────────────────────────────────────────────────────────
export const R2_ACCOUNT_ID = 'bc99cb11ca264ac95246b58e894eeac7';
export const R2_BUCKET = 'morix';
export const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

/**
 * URL base del bucket (S3 endpoint).
 * Para reproducción/visualización usa getPresignedGetUrl() de r2Upload.ts
 * ya que el bucket no tiene acceso público habilitado para requests S3 nativos.
 */
export const R2_PUBLIC_BASE = `${R2_ENDPOINT}/${R2_BUCKET}`;

/**
 * URL Pública de desarrollo (R2.dev) o Dominio Personalizado
 * Habilitada en Cloudflare para cargar imágenes de forma rápida y permanente sin firmar.
 */
export const R2_PUBLIC_DEV_URL = 'https://cdn.morixoficial.com';

// ─── Credenciales API ────────────────────────────────────────────────────────
export const R2_ACCESS_KEY_ID = '3309c00cf68933db6a425ae211641444';
export const R2_SECRET_ACCESS_KEY = '0c73e0886ac3eed60a5b57355a88285825087dbce0206522a5ad9ad0c7f70f57';

export const R2_CREDENTIALS_SET =
  (R2_ACCESS_KEY_ID as string) !== 'YOUR_R2_ACCESS_KEY_ID' &&
  (R2_SECRET_ACCESS_KEY as string) !== 'YOUR_R2_SECRET_ACCESS_KEY';

// ─── Estructura de carpetas del bucket Morix ─────────────────────────────────
/**
 * Carpetas que EXISTEN en el bucket R2 de Morix.
 * Deben coincidir exactamente con los prefijos en Cloudflare.
 *
 *  Morix/
 *    videos/   ← videos completos (Biografías, Filosofía, Negocios…)
 *    loops/    ← clips cortos sin audio que se repiten como fondo visual
 *    covers/   ← portadas cuadradas y landscape
 *    audios/   ← narraciones, meditaciones guiadas, música
 *    shorts/   ← clips verticales estilo Reels
 */
export const R2_FOLDERS = {
  videos: 'videos',
  loops: 'loops',
  shorts: 'shorts',
  audios: 'audios',
  covers: 'covers',
} as const;

export type R2FolderKey = keyof typeof R2_FOLDERS;
export type R2Folder = R2FolderKey;

// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Construye la URL pública (S3) de un archivo en R2.
 * ⚠️  Esta URL requiere autenticación — para playback usa getPresignedGetUrl().
 */
export function getR2Url(folderKey: R2FolderKey, filename: string): string {
  const folder = R2_FOLDERS[folderKey];
  return `${R2_PUBLIC_BASE}/${folder}/${filename}`;
}

/**
 * URL S3 del video completo.
 * Para playback en el reproductor, usa presigned URL en su lugar.
 */
export function getVideoUrl(videoFile?: string, videoId?: string): string {
  const name = videoFile ?? videoId ?? 'unknown';
  const filename = name.includes('.') ? name : `${name}.mp4`;
  return getR2Url('videos', filename);
}

/**
 * URL S3 del audio.
 * Para playback en el reproductor, usa presigned URL en su lugar.
 */
export function getAudioUrl(audioFile: string, ext = 'mp3'): string {
  const filename = audioFile.includes('.') ? audioFile : `${audioFile}.${ext}`;
  return getR2Url('audios', filename);
}

/**
 * URL S3 del loop visual.
 * Para playback en el reproductor, usa presigned URL en su lugar.
 */
export function getLoopUrl(loopFile: string): string {
  const filename = loopFile.includes('.') ? loopFile : `${loopFile}.mp4`;
  return getR2Url('loops', filename);
}