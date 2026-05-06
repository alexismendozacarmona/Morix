/**
 * Cloudflare R2 upload — 100% browser nativo.
 * Web Crypto API (AWS Signature V4) + XMLHttpRequest (progreso real).
 * Soporta cualquier carpeta y tipo de archivo.
 * Cero dependencias de Node.js.
 */
import {
  R2_ENDPOINT,
  R2_BUCKET,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_BASE,
  R2_PUBLIC_DEV_URL,
  type R2Folder,
} from '../config/r2Config';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UploadProgress {
  loaded:  number;
  total:   number;
  percent: number;
}

export interface UploadResult {
  /** Ruta completa en R2 (ej. "video clips/elon-musk.mp4") */
  key: string;
  /** URL pública accesible (S3 endpoint – usar presigned para reproducción) */
  url: string;
  /** Solo el nombre de archivo sin extensión (ej. "elon-musk") */
  filename: string;
}

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// ─── Presigned GET URL (para reproducción sin acceso público) ─────────────────
/**
 * Genera una URL pre-firmada para descarga/reproducción desde R2.
 * Funciona aunque el bucket NO tenga acceso público habilitado.
 *
 * @param folder         Nombre REAL de la carpeta en R2 (ej. "video clips", "audios")
 * @param filename       Nombre del archivo con extensión (ej. "mi-audio.mp3")
 * @param expiresSeconds Tiempo de validez en segundos (máx. 604800 = 7 días)
 */
export async function getPresignedGetUrl(
  folder: string,
  filename: string,
  expiresSeconds = 43200, // 12 horas por defecto
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: `${folder}/${filename}`,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn: expiresSeconds });
}

// ─── Upload principal ─────────────────────────────────────────────────────────
export async function uploadToR2(
  file:        File,
  folder:      R2Folder,
  filename:    string,
  onProgress:  (p: UploadProgress) => void,
  onAbortRef?: (abort: () => void) => void,
): Promise<UploadResult> {
  const key         = `${folder}/${filename}`;
  const contentType = file.type || guessMime(filename);

  return new Promise(async (resolve, reject) => {
    try {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: R2_BUCKET,
          Key: key,
          Body: file,
          ContentType: contentType,
        },
      });

      if (onAbortRef) {
        onAbortRef(() => upload.abort());
      }

      upload.on('httpUploadProgress', (progress) => {
        if (progress.total) {
          onProgress({
            loaded: progress.loaded || 0,
            total: progress.total,
            percent: Math.round(((progress.loaded || 0) / progress.total) * 100),
          });
        }
      });

      await upload.done();

      resolve({
        key,
        url: `${R2_PUBLIC_BASE}/${key}`,
        filename: filename.replace(/\.[^.]+$/, ''),
      });
    } catch (error: any) {
      console.error("R2 Upload Error:", error);
      reject(new Error(error.name === 'NoSuchBucket' 
        ? 'El bucket no existe. Verifica su nombre.'
        : `Error al subir: ${error.message || 'Desconocido'}. Verifica credenciales/CORS.`
      ));
    }
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function guessMime(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
  };
  return map[ext ?? ''] ?? 'application/octet-stream';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${s[i]}`;
}