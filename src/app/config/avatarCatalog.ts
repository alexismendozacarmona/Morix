// ─── Avatar Catalog — Morix ─────────────────────────────────────────────────
// Central definition of all avatars available in the app.
// Each avatar has a unique ID, emoji/icon, display label, category, required
// user level, and background gradient.
// ────────────────────────────────────────────────────────────────────────────

export type AvatarCategory = 'colores' | 'morix' | 'paisajes' | 'mascotas' | 'emojis' | 'exclusivos';

export interface AvatarDef {
  id: string;
  emoji: string;             // emoji or unicode symbol rendered on top
  label: string;             // display name for the avatar
  category: AvatarCategory;
  requiredLevel: number;     // 0 = free from the start
  bg: { from: string; to: string }; // gradient background
  showInitials?: boolean;    // if true, show user initials instead of emoji
}

export interface AvatarCategoryMeta {
  key: AvatarCategory;
  label: string;
  icon: string;
}

// ─── Category metadata ──────────────────────────────────────────────────────
export const AVATAR_CATEGORIES: AvatarCategoryMeta[] = [
  { key: 'colores',    label: 'Colores',    icon: '🎨' },
  { key: 'morix',      label: 'Morix',      icon: '🔥' },
  { key: 'paisajes',   label: 'Paisajes',   icon: '🌄' },
  { key: 'mascotas',   label: 'Mascotas',   icon: '🐾' },
  { key: 'emojis',     label: 'Emojis',     icon: '😎' },
  { key: 'exclusivos', label: 'Exclusivos', icon: '⭐' },
];

// ─── Gradients (backward-compatible with existing system) ───────────────────
export const GRADIENTS = [
  { from: '#8b5cf6', to: '#4f46e5' },
  { from: '#3b82f6', to: '#0ea5e9' },
  { from: '#f59e0b', to: '#ef4444' },
  { from: '#10b981', to: '#059669' },
  { from: '#f43f5e', to: '#e11d48' },
  { from: '#06b6d4', to: '#8b5cf6' },
  { from: '#f97316', to: '#f59e0b' },
  { from: '#6366f1', to: '#a855f7' },
];

// ─── Full avatar catalog ────────────────────────────────────────────────────
export const AVATAR_CATALOG: AvatarDef[] = [
  // ══════════════════════════════════════════════════════════════════════════
  //  🎨 COLORES — Degradados con iniciales (nivel 0)
  // ══════════════════════════════════════════════════════════════════════════
  ...GRADIENTS.map((g, i) => ({
    id: `gradient_${i}`,
    emoji: '',
    label: `Degradado ${i + 1}`,
    category: 'colores' as AvatarCategory,
    requiredLevel: 0,
    bg: g,
    showInitials: true,
  })),

  // ══════════════════════════════════════════════════════════════════════════
  //  🔥 MORIX — Temáticos de la marca
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'morix_flame',    emoji: '🔥', label: 'Llama Morix',    category: 'morix', requiredLevel: 0,  bg: { from: '#f97316', to: '#ef4444' } },
  { id: 'morix_bolt',     emoji: '⚡', label: 'Rayo Morix',     category: 'morix', requiredLevel: 0,  bg: { from: '#f59e0b', to: '#d97706' } },
  { id: 'morix_brain',    emoji: '🧠', label: 'Cerebro Morix',  category: 'morix', requiredLevel: 2,  bg: { from: '#ec4899', to: '#8b5cf6' } },
  { id: 'morix_rocket',   emoji: '🚀', label: 'Cohete Morix',   category: 'morix', requiredLevel: 3,  bg: { from: '#6366f1', to: '#3b82f6' } },
  { id: 'morix_star',     emoji: '⭐', label: 'Estrella Morix', category: 'morix', requiredLevel: 4,  bg: { from: '#f59e0b', to: '#f97316' } },
  { id: 'morix_crown',    emoji: '👑', label: 'Corona Morix',   category: 'morix', requiredLevel: 5,  bg: { from: '#d97706', to: '#b45309' } },
  { id: 'morix_gem',      emoji: '💎', label: 'Gema Morix',     category: 'morix', requiredLevel: 6,  bg: { from: '#06b6d4', to: '#0284c7' } },
  { id: 'morix_eye',      emoji: '👁️', label: 'Visión Morix',   category: 'morix', requiredLevel: 7,  bg: { from: '#8b5cf6', to: '#7c3aed' } },
  { id: 'morix_infinity', emoji: '♾️',  label: 'Infinito Morix', category: 'morix', requiredLevel: 10, bg: { from: '#a855f7', to: '#6366f1' } },
  { id: 'morix_dna',      emoji: '🧬', label: 'ADN Morix',      category: 'morix', requiredLevel: 12, bg: { from: '#22d3ee', to: '#8b5cf6' } },

  // ══════════════════════════════════════════════════════════════════════════
  //  🌄 PAISAJES — Naturaleza y vibes
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'land_mountain',  emoji: '🏔️', label: 'Montaña',      category: 'paisajes', requiredLevel: 0,  bg: { from: '#1e3a5f', to: '#0f766e' } },
  { id: 'land_sunset',    emoji: '🌅', label: 'Atardecer',    category: 'paisajes', requiredLevel: 0,  bg: { from: '#f97316', to: '#db2777' } },
  { id: 'land_ocean',     emoji: '🌊', label: 'Océano',       category: 'paisajes', requiredLevel: 2,  bg: { from: '#0ea5e9', to: '#0369a1' } },
  { id: 'land_forest',    emoji: '🌲', label: 'Bosque',       category: 'paisajes', requiredLevel: 3,  bg: { from: '#16a34a', to: '#15803d' } },
  { id: 'land_aurora',    emoji: '🌌', label: 'Aurora',       category: 'paisajes', requiredLevel: 4,  bg: { from: '#6366f1', to: '#22d3ee' } },
  { id: 'land_volcano',   emoji: '🌋', label: 'Volcán',       category: 'paisajes', requiredLevel: 5,  bg: { from: '#dc2626', to: '#f97316' } },
  { id: 'land_moon',      emoji: '🌙', label: 'Luna',         category: 'paisajes', requiredLevel: 6,  bg: { from: '#1e1b4b', to: '#312e81' } },
  { id: 'land_rainbow',   emoji: '🌈', label: 'Arcoíris',     category: 'paisajes', requiredLevel: 7,  bg: { from: '#ec4899', to: '#f59e0b' } },
  { id: 'land_galaxy',    emoji: '🪐', label: 'Galaxia',      category: 'paisajes', requiredLevel: 9,  bg: { from: '#0f172a', to: '#581c87' } },
  { id: 'land_comet',     emoji: '☄️',  label: 'Cometa',       category: 'paisajes', requiredLevel: 11, bg: { from: '#1e1b4b', to: '#f59e0b' } },

  // ══════════════════════════════════════════════════════════════════════════
  //  🐾 MASCOTAS — Animales y criaturas
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'pet_cat',     emoji: '🐱', label: 'Gato',       category: 'mascotas', requiredLevel: 0,  bg: { from: '#f59e0b', to: '#d97706' } },
  { id: 'pet_dog',     emoji: '🐶', label: 'Perro',      category: 'mascotas', requiredLevel: 0,  bg: { from: '#92400e', to: '#b45309' } },
  { id: 'pet_wolf',    emoji: '🐺', label: 'Lobo',       category: 'mascotas', requiredLevel: 2,  bg: { from: '#475569', to: '#1e293b' } },
  { id: 'pet_fox',     emoji: '🦊', label: 'Zorro',      category: 'mascotas', requiredLevel: 3,  bg: { from: '#ea580c', to: '#c2410c' } },
  { id: 'pet_lion',    emoji: '🦁', label: 'León',       category: 'mascotas', requiredLevel: 4,  bg: { from: '#d97706', to: '#92400e' } },
  { id: 'pet_eagle',   emoji: '🦅', label: 'Águila',     category: 'mascotas', requiredLevel: 5,  bg: { from: '#78350f', to: '#451a03' } },
  { id: 'pet_tiger',   emoji: '🐯', label: 'Tigre',      category: 'mascotas', requiredLevel: 6,  bg: { from: '#f97316', to: '#000000' } },
  { id: 'pet_dragon',  emoji: '🐉', label: 'Dragón',     category: 'mascotas', requiredLevel: 8,  bg: { from: '#dc2626', to: '#7f1d1d' } },
  { id: 'pet_phoenix', emoji: '🦚', label: 'Pavo Real',  category: 'mascotas', requiredLevel: 9,  bg: { from: '#059669', to: '#0d9488' } },
  { id: 'pet_unicorn', emoji: '🦄', label: 'Unicornio',  category: 'mascotas', requiredLevel: 10, bg: { from: '#ec4899', to: '#a855f7' } },

  // ══════════════════════════════════════════════════════════════════════════
  //  😎 EMOJIS — Expresivos y divertidos
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'emoji_cool',     emoji: '😎', label: 'Cool',         category: 'emojis', requiredLevel: 0,  bg: { from: '#f59e0b', to: '#ef4444' } },
  { id: 'emoji_nerd',     emoji: '🤓', label: 'Nerd',         category: 'emojis', requiredLevel: 0,  bg: { from: '#3b82f6', to: '#6366f1' } },
  { id: 'emoji_fire',     emoji: '🥵', label: 'Fuego',        category: 'emojis', requiredLevel: 0,  bg: { from: '#ef4444', to: '#dc2626' } },
  { id: 'emoji_think',    emoji: '🤔', label: 'Pensador',     category: 'emojis', requiredLevel: 2,  bg: { from: '#8b5cf6', to: '#6366f1' } },
  { id: 'emoji_zen',      emoji: '🧘', label: 'Zen',          category: 'emojis', requiredLevel: 2,  bg: { from: '#10b981', to: '#059669' } },
  { id: 'emoji_alien',    emoji: '👽', label: 'Alien',        category: 'emojis', requiredLevel: 3,  bg: { from: '#22d3ee', to: '#0891b2' } },
  { id: 'emoji_wizard',   emoji: '🧙', label: 'Mago',         category: 'emojis', requiredLevel: 4,  bg: { from: '#7c3aed', to: '#4c1d95' } },
  { id: 'emoji_ghost',    emoji: '👻', label: 'Fantasma',     category: 'emojis', requiredLevel: 5,  bg: { from: '#a78bfa', to: '#c4b5fd' } },
  { id: 'emoji_robot',    emoji: '🤖', label: 'Robot',        category: 'emojis', requiredLevel: 6,  bg: { from: '#64748b', to: '#334155' } },
  { id: 'emoji_skull',    emoji: '💀', label: 'Calavera',     category: 'emojis', requiredLevel: 7,  bg: { from: '#000000', to: '#1e293b' } },

  // ══════════════════════════════════════════════════════════════════════════
  //  ⭐ EXCLUSIVOS — Nivel alto, premium
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'exc_diamond',  emoji: '💠', label: 'Diamante',     category: 'exclusivos', requiredLevel: 8,  bg: { from: '#06b6d4', to: '#0e7490' } },
  { id: 'exc_ninja',    emoji: '🥷', label: 'Ninja',        category: 'exclusivos', requiredLevel: 9,  bg: { from: '#0f172a', to: '#1e293b' } },
  { id: 'exc_samurai',  emoji: '⚔️',  label: 'Samurái',     category: 'exclusivos', requiredLevel: 10, bg: { from: '#b91c1c', to: '#450a0a' } },
  { id: 'exc_astronaut',emoji: '🧑‍🚀', label: 'Astronauta',  category: 'exclusivos', requiredLevel: 10, bg: { from: '#0c0a09', to: '#1c1917' } },
  { id: 'exc_cyborg',   emoji: '🦾', label: 'Cyborg',       category: 'exclusivos', requiredLevel: 12, bg: { from: '#334155', to: '#0f172a' } },
  { id: 'exc_legend',   emoji: '🏆', label: 'Leyenda',      category: 'exclusivos', requiredLevel: 13, bg: { from: '#f59e0b', to: '#78350f' } },
  { id: 'exc_mythic',   emoji: '🔱', label: 'Mítico',       category: 'exclusivos', requiredLevel: 14, bg: { from: '#7c3aed', to: '#f59e0b' } },
  { id: 'exc_apex',     emoji: '👁️‍🗨️', label: 'Apex',       category: 'exclusivos', requiredLevel: 15, bg: { from: '#000000', to: '#8b5cf6' } },
];

// ─── Lookup helpers ─────────────────────────────────────────────────────────
const avatarMap = new Map(AVATAR_CATALOG.map((a) => [a.id, a]));

/** Get avatar definition by id. Falls back to gradient_0 if not found. */
export function getAvatarById(id: string | undefined | null): AvatarDef {
  if (!id) return avatarMap.get('gradient_0')!;
  return avatarMap.get(id) ?? avatarMap.get('gradient_0')!;
}

/** Return all avatars unlocked at or below the given level. */
export function getAvailableAvatars(level: number): AvatarDef[] {
  return AVATAR_CATALOG.filter((a) => a.requiredLevel <= level);
}

/** Return avatars that are still locked for the given level. */
export function getLockedAvatars(level: number): AvatarDef[] {
  return AVATAR_CATALOG.filter((a) => a.requiredLevel > level);
}

/** Return the next avatar that will be unlocked. */
export function getNextUnlock(level: number): AvatarDef | null {
  const locked = getLockedAvatars(level).sort((a, b) => a.requiredLevel - b.requiredLevel);
  return locked.length > 0 ? locked[0] : null;
}

/** Convert old avatarGradient number to new avatarId. */
export function gradientIndexToAvatarId(gradientIndex: number): string {
  return `gradient_${Math.min(gradientIndex, GRADIENTS.length - 1)}`;
}

/** Check if an avatar ID corresponds to a gradient (shows initials). */
export function isGradientAvatar(id: string): boolean {
  return id.startsWith('gradient_');
}
