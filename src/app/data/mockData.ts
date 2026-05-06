export interface Contenido {
  id: string;
  titulo: string;
  categoria: string;
  duracion: string;
  imagen: string;
  imagenLandscape?: string;
  descripcion?: string;
  progreso?: number;
  autor?: string;
  nuevo?: boolean;
  estreno?: boolean;
  match?: number;
  rating?: string;
  año?: string;
  tags?: string[];
  premium?: boolean;
  /**
   * MODO DE REPRODUCCIÓN EXPLÍCITO
   * 'video_completo' → Reproduce el archivo en videoFile.
   * 'audio_loop'     → Reproduce audioFile + loopFile.
   * Si no se especifica, se intenta detectar por archivos o categoría.
   */
  player_mode?: 'video_completo' | 'audio_loop';
  /**
   * esFree: true → usuarios del plan Free pueden ver este video.
   * esFree: false (default) → solo usuarios con plan de pago o admin.
   */
  esFree?: boolean;
  /** Filename in R2 bucket (without .mp4 extension). Falls back to `id` if omitted. */
  videoFile?: string;
  /**
   * MODO AUDIO + LOOP (para Resúmenes de libros, Meditaciones, Música)
   * audioFile → nombre del archivo en R2/audios/ (sin extensión, ej. "el-poder-del-habito")
   * loopFile  → nombre del video corto en R2/loops/ que hace loop como fondo visual
   * Si estos dos existen, el player ignora videoFile y usa audio+loop.
   */
  audioFile?: string;
  loopFile?:  string;
  /**
   * AUDIO DE FONDO para videos largos
   * Archivo de audio extraído del video (solo pista de audio) en R2/audios/
   * Se usa para reproducción en segundo plano sin decodificar el video pesado.
   */
  bgAudioFile?: string;
}

export const IMGS = {
  meditacion:   'https://images.unsplash.com/photo-1769133755091-945858d2073b?w=800&q=80',
  lectura:      'https://images.unsplash.com/photo-1761956339632-cc71d080635f?w=800&q=80',
  emprendedor:  'https://images.unsplash.com/photo-1738566061505-556830f8b8f5?w=800&q=80',
  naturaleza:   'https://images.unsplash.com/photo-1717964134799-a98f497172a5?w=800&q=80',
  filosofia:    'https://images.unsplash.com/photo-1739323146459-b132ad6ffbf4?w=800&q=80',
  productividad:'https://images.unsplash.com/photo-1770299373695-dc86ce6966f0?w=800&q=80',
  galaxia:      'https://images.unsplash.com/photo-1677357623576-7c8aab08da22?w=1200&q=80',
  mujer:        'https://images.unsplash.com/photo-1758518727888-ffa196002e59?w=800&q=80',
  descanso:     'https://images.unsplash.com/photo-1758273239813-cecda76c6c19?w=800&q=80',
  amanecer:     'https://images.unsplash.com/photo-1653873739478-6fdcb7b6f13d?w=800&q=80',
};

// ── Contenido de ejemplo eliminado — todo el contenido viene del panel Admin ──

export const heroItems:       Contenido[] = [];
export const continuarViendo: Contenido[] = [];
export const recomendados:    Contenido[] = [];
export const meditaciones:    Contenido[] = [];
export const libros:          Contenido[] = [];
export const nuevosEnMorix:   Contenido[] = [];
export const masVistos:       Contenido[] = [];

export const ALL_CONTENT: Contenido[] = [];

export const USUARIO = {
  nombre: 'Alejandro Torres',
  avatar: 'A',
  plan: 'Free',
  nivel: 7,
  xp: 340,
  xpSiguienteNivel: 500,
  racha: 12,
  videosVistos: 47,
  minutosAprendidos: 830,
  diasAprendiendo: 28,
};

export const LOGROS = [
  { id: '1', titulo: 'Primera meditación',    descripcion: 'Completaste tu primera sesión',    emoji: '🧘', obtenido: true },
  { id: '2', titulo: '5 videos completados',  descripcion: 'Viste 5 videos completos',          emoji: '🎯', obtenido: true },
  { id: '3', titulo: '1 hora de aprendizaje', descripcion: 'Acumulaste 60 minutos',             emoji: '⏱️', obtenido: true },
  { id: '4', titulo: 'Racha de 7 días',       descripcion: 'Aprendiste 7 días seguidos',        emoji: '🔥', obtenido: true },
  { id: '5', titulo: 'Explorador',            descripcion: 'Visitaste todas las categorías',    emoji: '🧭', obtenido: false },
  { id: '6', titulo: 'Maestro del silencio',  descripcion: 'Completa 10 meditaciones',          emoji: '🌙', obtenido: false },
  { id: '7', titulo: 'Lector voraz',          descripcion: 'Lee 10 resúmenes de libros',        emoji: '📚', obtenido: false },
  { id: '8', titulo: 'Mes de oro',            descripcion: 'Aprende 30 días seguidos',          emoji: '🏆', obtenido: false },
];