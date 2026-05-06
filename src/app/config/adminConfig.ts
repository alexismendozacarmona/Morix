/**
 * ─── MORIX ADMIN CONFIG ──────────────────────────────────────────────────
 * Agrega aquí los correos que quieres que tengan acceso al panel de Admin.
 */
export const ADMIN_EMAILS = [
  'alexismendozacarmona@gmail.com',
  // 'mendozacarmona16@gmail.com', 
];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  return ADMIN_EMAILS.some(adm => adm.toLowerCase().trim() === cleanEmail);
}

// ─── Categorías de videos ─────────────────────────────────────────────────────
export const CATEGORIAS_VIDEO = [
  'Meditación & Sonidos',
  'Libros & Resúmenes',
  'Terror & Misterios',
  'Datos & Verdades',
] as const;

export const CATEGORIAS_SHORT = [
  'Meditación & Sonidos',
  'Libros & Resúmenes',
  'Terror & Misterios',
  'Datos & Verdades',
] as const;

export const SHORT_TAGS = [
  'MEDITACIÓN & SONIDOS',
  'LIBROS & RESÚMENES',
  'TERROR & MISTERIOS',
  'DATOS & VERDADES',
] as const;

import type { Contenido } from '../data/mockData';

// ─── Modo de reproducción ────────────────────────────────────────────────────
/**
 * Detecta si un video usa el modo audio + loop.
 * Es universal: si tiene los archivos de audio y loop, se usa ese modo.
 */
export function usaAudioLoop(video: Contenido): boolean {
  return !!(video.audioFile && video.loopFile);
}

/**
 * Devuelve el modo de reproducción legible
 */
export function getModoReproduccion(video: Contenido): 'audio_loop' | 'video_completo' {
  return usaAudioLoop(video) ? 'audio_loop' : 'video_completo';
}

// ─── Configuración de Shorts públicos ────────────────────────────────────────
const LS_PUBLIC_SHORTS = 'morix_allow_public_shorts';

export function isPublicShortsEnabled(): boolean {
  try { return localStorage.getItem(LS_PUBLIC_SHORTS) === 'true'; }
  catch { return false; }
}