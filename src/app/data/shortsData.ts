export interface Short {
  id:          string;
  titulo:      string;
  autor:       string;
  descripcion: string;
  thumbnail:   string;
  duracionSeg: number;
  categoria:   string;
  audio:       string;
  tag:         string;
  /** Nombre del archivo en R2/shorts/ (sin extensión) */
  videoFile?:  string;
  /** URL presignada del video (se enriquece en runtime, no se persiste) */
  videoUrl?:   string;
}

/**
 * Array vacío — los Shorts los gestiona el admin desde el panel.
 * Se muestran en tiempo real desde AdminContentContext → Supabase.
 */
export const SHORTS: Short[] = [];