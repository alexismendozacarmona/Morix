/**
 * Morix — Sistema de Logros
 * 48 logros organizados por categoría y rareza.
 * Cada logro tiene check function determinista, sin estado externo.
 */

export type AchievementRarity    = 'comun' | 'raro' | 'epico' | 'legendario';
export type AchievementCategory  = 'videos' | 'tiempo' | 'racha' | 'categorias' | 'nivel' | 'xp' | 'especial';

/** Snapshot del progreso que necesitan los checks */
export interface AchievementProgress {
  totalVideosWatched: number;
  totalMinutes:       number;
  bestStreak:         number;
  categoryStats:      Record<string, { count: number; minutes: number }>;
  level:              number;
  totalXP:            number;
  savedVideos:        string[];
  watchHistory:       Array<{ videoId: string; date: string; minutes: number; category: string }>;
  daysActive:         Set<string>;
  dailyStats:         { date: string; completed: number; minutes: number };
}

export interface AchievementDef {
  id:       string;
  emoji:    string;
  titulo:   { es: string; en: string };
  desc:     { es: string; en: string };
  check:    (p: AchievementProgress) => boolean;
  /** Bar de progreso opcional para mostrar en estado bloqueado */
  progress?: (p: AchievementProgress) => { current: number; total: number };
  rarity:   AchievementRarity;
  category: AchievementCategory;
}

/* Helper interno ──────────────────────────────────────────────────────────── */
function maxInOneDay(watchHistory: AchievementProgress['watchHistory']): number {
  const byDate: Record<string, number> = {};
  for (const e of watchHistory) byDate[e.date] = (byDate[e.date] ?? 0) + 1;
  return Math.max(0, ...Object.values(byDate));
}

/* ─── Lista completa de logros ──────────────────────────────────────────────── */
export const ACHIEVEMENTS: AchievementDef[] = [

  // ═══════════════════════════════════════════ VIDEOS ═══
  {
    id: 'primera_sesion', emoji: '🎬',
    titulo: { es: 'Primera sesión',        en: 'First session'      },
    desc:   { es: 'Completaste tu primer video en Morix',           en: 'Completed your first video on Morix'       },
    check:    p => p.totalVideosWatched >= 1,
    progress: p => ({ current: Math.min(p.totalVideosWatched, 1),   total: 1   }),
    rarity: 'comun', category: 'videos',
  },
  {
    id: 'cinco_videos', emoji: '🎯',
    titulo: { es: 'Ganando ritmo',         en: 'Getting into rhythm' },
    desc:   { es: 'Completaste 5 videos completos',                  en: 'Completed 5 full videos'                    },
    check:    p => p.totalVideosWatched >= 5,
    progress: p => ({ current: Math.min(p.totalVideosWatched, 5),   total: 5   }),
    rarity: 'comun', category: 'videos',
  },
  {
    id: 'diez_videos', emoji: '🚀',
    titulo: { es: 'Explorador activo',     en: 'Active explorer'    },
    desc:   { es: 'Completaste 10 videos',                           en: 'Completed 10 videos'                        },
    check:    p => p.totalVideosWatched >= 10,
    progress: p => ({ current: Math.min(p.totalVideosWatched, 10),  total: 10  }),
    rarity: 'comun', category: 'videos',
  },
  {
    id: 'veinticinco_videos', emoji: '⚡',
    titulo: { es: 'Imparable',             en: 'Unstoppable'        },
    desc:   { es: 'Completaste 25 videos',                           en: 'Completed 25 videos'                        },
    check:    p => p.totalVideosWatched >= 25,
    progress: p => ({ current: Math.min(p.totalVideosWatched, 25),  total: 25  }),
    rarity: 'raro', category: 'videos',
  },
  {
    id: 'cincuenta_videos', emoji: '🏅',
    titulo: { es: 'Medio centenar',        en: 'Half hundred'       },
    desc:   { es: 'Completaste 50 videos',                           en: 'Completed 50 videos'                        },
    check:    p => p.totalVideosWatched >= 50,
    progress: p => ({ current: Math.min(p.totalVideosWatched, 50),  total: 50  }),
    rarity: 'raro', category: 'videos',
  },
  {
    id: 'cien_videos', emoji: '💯',
    titulo: { es: 'El centenar',           en: 'The hundred'        },
    desc:   { es: 'Completaste 100 videos',                          en: 'Completed 100 videos'                       },
    check:    p => p.totalVideosWatched >= 100,
    progress: p => ({ current: Math.min(p.totalVideosWatched, 100), total: 100 }),
    rarity: 'epico', category: 'videos',
  },
  {
    id: 'doscientos_videos', emoji: '💎',
    titulo: { es: 'Leyenda viva',          en: 'Living legend'      },
    desc:   { es: 'Completaste 200 videos',                          en: 'Completed 200 videos'                       },
    check:    p => p.totalVideosWatched >= 200,
    progress: p => ({ current: Math.min(p.totalVideosWatched, 200), total: 200 }),
    rarity: 'epico', category: 'videos',
  },
  {
    id: 'quinientos_videos', emoji: '👑',
    titulo: { es: 'Maestro Morix',        en: 'Morix Master'      },
    desc:   { es: 'Completaste 500 videos. Eres una leyenda.',       en: 'Completed 500 videos. You are a legend.'    },
    check:    p => p.totalVideosWatched >= 500,
    progress: p => ({ current: Math.min(p.totalVideosWatched, 500), total: 500 }),
    rarity: 'legendario', category: 'videos',
  },

  // ═══════════════════════════════════════════ TIEMPO ═══
  {
    id: 'primera_hora', emoji: '⏱️',
    titulo: { es: 'Primera hora',          en: 'First hour'         },
    desc:   { es: 'Acumulaste 60 minutos de aprendizaje',           en: 'Accumulated 60 minutes of learning'         },
    check:    p => p.totalMinutes >= 60,
    progress: p => ({ current: Math.min(p.totalMinutes, 60),   total: 60   }),
    rarity: 'comun', category: 'tiempo',
  },
  {
    id: 'cinco_horas', emoji: '🕐',
    titulo: { es: '5 horas de sabiduría',  en: '5 hours of wisdom'  },
    desc:   { es: 'Acumulaste 5 horas de aprendizaje',              en: 'Accumulated 5 hours of learning'            },
    check:    p => p.totalMinutes >= 300,
    progress: p => ({ current: Math.min(p.totalMinutes, 300),  total: 300  }),
    rarity: 'comun', category: 'tiempo',
  },
  {
    id: 'diez_horas', emoji: '🏋️',
    titulo: { es: 'Atleta mental',         en: 'Mental athlete'     },
    desc:   { es: 'Acumulaste 10 horas de aprendizaje',             en: 'Accumulated 10 hours of learning'           },
    check:    p => p.totalMinutes >= 600,
    progress: p => ({ current: Math.min(p.totalMinutes, 600),  total: 600  }),
    rarity: 'raro', category: 'tiempo',
  },
  {
    id: 'veinticinco_horas', emoji: '🧠',
    titulo: { es: 'Cerebro activo',        en: 'Active brain'       },
    desc:   { es: 'Acumulaste 25 horas de aprendizaje',             en: 'Accumulated 25 hours of learning'           },
    check:    p => p.totalMinutes >= 1500,
    progress: p => ({ current: Math.min(p.totalMinutes, 1500), total: 1500 }),
    rarity: 'raro', category: 'tiempo',
  },
  {
    id: 'cincuenta_horas', emoji: '🔋',
    titulo: { es: 'Energía infinita',      en: 'Infinite energy'    },
    desc:   { es: 'Acumulaste 50 horas de aprendizaje',             en: 'Accumulated 50 hours of learning'           },
    check:    p => p.totalMinutes >= 3000,
    progress: p => ({ current: Math.min(p.totalMinutes, 3000), total: 3000 }),
    rarity: 'epico', category: 'tiempo',
  },
  {
    id: 'cien_horas', emoji: '🌙',
    titulo: { es: 'Noctámbulo sabio',      en: 'Wise night owl'     },
    desc:   { es: 'Acumulaste 100 horas de aprendizaje',            en: 'Accumulated 100 hours of learning'          },
    check:    p => p.totalMinutes >= 6000,
    progress: p => ({ current: Math.min(p.totalMinutes, 6000), total: 6000 }),
    rarity: 'legendario', category: 'tiempo',
  },

  // ═══════════════════════════════════════════ RACHA ════
  {
    id: 'racha_3', emoji: '🔥',
    titulo: { es: 'Racha en marcha',        en: 'Streak started'     },
    desc:   { es: 'Aprendiste 3 días seguidos',                      en: 'Learned 3 days in a row'                   },
    check:    p => p.bestStreak >= 3,
    progress: p => ({ current: Math.min(p.bestStreak, 3),   total: 3   }),
    rarity: 'comun', category: 'racha',
  },
  {
    id: 'racha_7', emoji: '🔥',
    titulo: { es: 'Racha de 7 días',        en: '7-day streak'       },
    desc:   { es: 'Aprendiste 7 días seguidos',                      en: 'Learned 7 days in a row'                   },
    check:    p => p.bestStreak >= 7,
    progress: p => ({ current: Math.min(p.bestStreak, 7),   total: 7   }),
    rarity: 'comun', category: 'racha',
  },
  {
    id: 'racha_14', emoji: '🌡️',
    titulo: { es: 'Quincenal imparable',    en: 'Unstoppable biweekly' },
    desc:   { es: 'Aprendiste 14 días seguidos',                     en: 'Learned 14 days in a row'                  },
    check:    p => p.bestStreak >= 14,
    progress: p => ({ current: Math.min(p.bestStreak, 14),  total: 14  }),
    rarity: 'raro', category: 'racha',
  },
  {
    id: 'racha_30', emoji: '🏆',
    titulo: { es: 'Mes de oro',             en: 'Golden month'       },
    desc:   { es: 'Aprendiste 30 días seguidos',                     en: 'Learned 30 days in a row'                  },
    check:    p => p.bestStreak >= 30,
    progress: p => ({ current: Math.min(p.bestStreak, 30),  total: 30  }),
    rarity: 'raro', category: 'racha',
  },
  {
    id: 'racha_60', emoji: '💪',
    titulo: { es: 'Dedicación extrema',     en: 'Extreme dedication' },
    desc:   { es: 'Aprendiste 60 días seguidos',                     en: 'Learned 60 days in a row'                  },
    check:    p => p.bestStreak >= 60,
    progress: p => ({ current: Math.min(p.bestStreak, 60),  total: 60  }),
    rarity: 'epico', category: 'racha',
  },
  {
    id: 'racha_100', emoji: '🦅',
    titulo: { es: 'Cien días de gloria',    en: 'Hundred days of glory' },
    desc:   { es: 'Aprendiste 100 días seguidos',                    en: 'Learned 100 days in a row'                 },
    check:    p => p.bestStreak >= 100,
    progress: p => ({ current: Math.min(p.bestStreak, 100), total: 100 }),
    rarity: 'epico', category: 'racha',
  },
  {
    id: 'racha_365', emoji: '👑',
    titulo: { es: 'Un año imparable',       en: 'Unstoppable year'   },
    desc:   { es: '365 días de racha. Eres una inspiración.',        en: '365-day streak. You are an inspiration.'   },
    check:    p => p.bestStreak >= 365,
    progress: p => ({ current: Math.min(p.bestStreak, 365), total: 365 }),
    rarity: 'legendario', category: 'racha',
  },

  // ═══════════════════════════════════════ CATEGORÍAS ════
  {
    id: 'dos_categorias', emoji: '🧭',
    titulo: { es: 'Curioso por naturaleza', en: 'Naturally curious'  },
    desc:   { es: 'Aprendiste en 2 categorías distintas',            en: 'Learned in 2 different categories'          },
    check:    p => Object.keys(p.categoryStats).length >= 2,
    progress: p => ({ current: Math.min(Object.keys(p.categoryStats).length, 2), total: 2 }),
    rarity: 'comun', category: 'categorias',
  },
  {
    id: 'tres_categorias', emoji: '🌍',
    titulo: { es: 'Multidisciplinario',     en: 'Multidisciplinary'  },
    desc:   { es: 'Aprendiste en 3 categorías distintas',            en: 'Learned in 3 different categories'          },
    check:    p => Object.keys(p.categoryStats).length >= 3,
    progress: p => ({ current: Math.min(Object.keys(p.categoryStats).length, 3), total: 3 }),
    rarity: 'comun', category: 'categorias',
  },
  {
    id: 'cinco_categorias', emoji: '🌈',
    titulo: { es: 'Polifacético',           en: 'Multifaceted'       },
    desc:   { es: 'Aprendiste en 5 categorías distintas',            en: 'Learned in 5 different categories'          },
    check:    p => Object.keys(p.categoryStats).length >= 5,
    progress: p => ({ current: Math.min(Object.keys(p.categoryStats).length, 5), total: 5 }),
    rarity: 'raro', category: 'categorias',
  },
  {
    id: 'todas_categorias', emoji: '✨',
    titulo: { es: 'Renacentista digital',   en: 'Digital Renaissance' },
    desc:   { es: 'Aprendiste en las 4 categorías principales',    en: 'Learned in the 4 main categories'           },
    check:    p => Object.keys(p.categoryStats).length >= 4,
    progress: p => ({ current: Math.min(Object.keys(p.categoryStats).length, 4), total: 4 }),
    rarity: 'epico', category: 'categorias',
  },
  {
    id: 'meditacion_5', emoji: '🧘',
    titulo: { es: 'Maestro del silencio',   en: 'Master of silence'  },
    desc:   { es: 'Completaste 5 meditaciones',                      en: 'Completed 5 meditations'                   },
    check:    p => (p.categoryStats['Meditación & Sonidos']?.count ?? 0) >= 5,
    progress: p => ({ current: Math.min(p.categoryStats['Meditación & Sonidos']?.count ?? 0, 5),  total: 5  }),
    rarity: 'comun', category: 'categorias',
  },
  {
    id: 'meditacion_20', emoji: '☮️',
    titulo: { es: 'Zen total',              en: 'Total zen'          },
    desc:   { es: 'Completaste 20 meditaciones',                     en: 'Completed 20 meditations'                  },
    check:    p => (p.categoryStats['Meditación & Sonidos']?.count ?? 0) >= 20,
    progress: p => ({ current: Math.min(p.categoryStats['Meditación & Sonidos']?.count ?? 0, 20), total: 20 }),
    rarity: 'raro', category: 'categorias',
  },
  {
    id: 'libros_5', emoji: '📚',
    titulo: { es: 'Lector voraz',           en: 'Avid reader'        },
    desc:   { es: 'Completaste 5 resúmenes de libros',               en: 'Completed 5 book summaries'                },
    check:    p => (p.categoryStats['Libros & Resúmenes']?.count ?? 0) >= 5,
    progress: p => ({ current: Math.min(p.categoryStats['Libros & Resúmenes']?.count ?? 0, 5),  total: 5  }),
    rarity: 'comun', category: 'categorias',
  },
  {
    id: 'libros_20', emoji: '📖',
    titulo: { es: 'Biblioteca viva',        en: 'Living library'     },
    desc:   { es: 'Completaste 20 resúmenes de libros',              en: 'Completed 20 book summaries'               },
    check:    p => (p.categoryStats['Libros & Resúmenes']?.count ?? 0) >= 20,
    progress: p => ({ current: Math.min(p.categoryStats['Libros & Resúmenes']?.count ?? 0, 20), total: 20 }),
    rarity: 'raro', category: 'categorias',
  },
  {
    id: 'terror_5', emoji: '👻',
    titulo: { es: 'Buscador de sustos',      en: 'Scare seeker'       },
    desc:   { es: 'Completaste 5 videos de Terror & Misterios',  en: 'Completed 5 videos of Horror & Mysteries' },
    check:    p => (p.categoryStats['Terror & Misterios']?.count ?? 0) >= 5,
    progress: p => ({ current: Math.min(p.categoryStats['Terror & Misterios']?.count ?? 0, 5),  total: 5  }),
    rarity: 'comun', category: 'categorias',
  },
  {
    id: 'datos_5', emoji: '🧐',
    titulo: { es: 'Mente curiosa',           en: 'Curious mind'       },
    desc:   { es: 'Completaste 5 videos de Datos & Verdades',    en: 'Completed 5 videos of Facts & Truths' },
    check:    p => (p.categoryStats['Datos & Verdades']?.count ?? 0) >= 5,
    progress: p => ({ current: Math.min(p.categoryStats['Datos & Verdades']?.count ?? 0, 5),  total: 5  }),
    rarity: 'comun', category: 'categorias',
  },

  // ═══════════════════════════════════════════ NIVEL ════
  {
    id: 'nivel_5', emoji: '⭐',
    titulo: { es: 'Prometedor',             en: 'Promising'          },
    desc:   { es: 'Alcanzaste el nivel 5',                           en: 'Reached level 5'                           },
    check:    p => p.level >= 5,
    progress: p => ({ current: Math.min(p.level, 5),   total: 5   }),
    rarity: 'comun', category: 'nivel',
  },
  {
    id: 'nivel_10', emoji: '🌟',
    titulo: { es: 'Ascendiendo',            en: 'Ascending'          },
    desc:   { es: 'Alcanzaste el nivel 10',                          en: 'Reached level 10'                          },
    check:    p => p.level >= 10,
    progress: p => ({ current: Math.min(p.level, 10),  total: 10  }),
    rarity: 'raro', category: 'nivel',
  },
  {
    id: 'nivel_25', emoji: '💫',
    titulo: { es: 'Experto certificado',    en: 'Certified expert'   },
    desc:   { es: 'Alcanzaste el nivel 25. Eres de élite.',          en: 'Reached level 25. You are elite.'           },
    check:    p => p.level >= 25,
    progress: p => ({ current: Math.min(p.level, 25),  total: 25  }),
    rarity: 'epico', category: 'nivel',
  },
  {
    id: 'nivel_50', emoji: '🏅',
    titulo: { es: 'Gran maestro',           en: 'Grand master'       },
    desc:   { es: 'Nivel 50. Casi nadie llega aquí.',                en: 'Level 50. Almost no one makes it here.'    },
    check:    p => p.level >= 50,
    progress: p => ({ current: Math.min(p.level, 50),  total: 50  }),
    rarity: 'legendario', category: 'nivel',
  },
  {
    id: 'nivel_100', emoji: '👑',
    titulo: { es: 'Trascendencia',          en: 'Transcendence'      },
    desc:   { es: 'Nivel 100. Simplemente inalcanzable.',            en: 'Level 100. Simply unreachable.'             },
    check:    p => p.level >= 100,
    progress: p => ({ current: Math.min(p.level, 100), total: 100 }),
    rarity: 'legendario', category: 'nivel',
  },

  // ════════════════════════════════════════════════ XP ════
  {
    id: 'xp_500', emoji: '⚡',
    titulo: { es: 'Primera chispa',         en: 'First spark'        },
    desc:   { es: 'Acumulaste 500 XP',                               en: 'Accumulated 500 XP'                        },
    check:    p => p.totalXP >= 500,
    progress: p => ({ current: Math.min(p.totalXP, 500),    total: 500    }),
    rarity: 'comun', category: 'xp',
  },
  {
    id: 'xp_2000', emoji: '💡',
    titulo: { es: 'Mente encendida',        en: 'Bright mind'        },
    desc:   { es: 'Acumulaste 2,000 XP',                             en: 'Accumulated 2,000 XP'                      },
    check:    p => p.totalXP >= 2000,
    progress: p => ({ current: Math.min(p.totalXP, 2000),   total: 2000   }),
    rarity: 'raro', category: 'xp',
  },
  {
    id: 'xp_10000', emoji: '🔋',
    titulo: { es: 'Energía pura',           en: 'Pure energy'        },
    desc:   { es: 'Acumulaste 10,000 XP',                            en: 'Accumulated 10,000 XP'                     },
    check:    p => p.totalXP >= 10000,
    progress: p => ({ current: Math.min(p.totalXP, 10000),  total: 10000  }),
    rarity: 'epico', category: 'xp',
  },
  {
    id: 'xp_50000', emoji: '☀️',
    titulo: { es: 'Sol de conocimiento',    en: 'Sun of knowledge'   },
    desc:   { es: 'Acumulaste 50,000 XP',                            en: 'Accumulated 50,000 XP'                     },
    check:    p => p.totalXP >= 50000,
    progress: p => ({ current: Math.min(p.totalXP, 50000),  total: 50000  }),
    rarity: 'legendario', category: 'xp',
  },
  {
    id: 'xp_100000', emoji: '🌌',
    titulo: { es: 'Universo interior',      en: 'Inner universe'     },
    desc:   { es: 'Acumulaste 100,000 XP. Increíble.',               en: 'Accumulated 100,000 XP. Incredible.'       },
    check:    p => p.totalXP >= 100000,
    progress: p => ({ current: Math.min(p.totalXP, 100000), total: 100000 }),
    rarity: 'legendario', category: 'xp',
  },

  // ══════════════════════════════════════ ESPECIALES ════
  {
    id: 'coleccionista', emoji: '📌',
    titulo: { es: 'Coleccionista',          en: 'Collector'          },
    desc:   { es: 'Guardaste 10 videos en tu lista',                 en: 'Saved 10 videos to your list'              },
    check:    p => p.savedVideos.length >= 10,
    progress: p => ({ current: Math.min(p.savedVideos.length, 10), total: 10 }),
    rarity: 'raro', category: 'especial',
  },
  {
    id: 'curador_experto', emoji: '💎',
    titulo: { es: 'Curador experto',        en: 'Expert curator'     },
    desc:   { es: 'Guardaste 50 videos en tu lista',                 en: 'Saved 50 videos to your list'              },
    check:    p => p.savedVideos.length >= 50,
    progress: p => ({ current: Math.min(p.savedVideos.length, 50), total: 50 }),
    rarity: 'epico', category: 'especial',
  },
  {
    id: 'archivo_viviente', emoji: '🏛️',
    titulo: { es: 'El archivo viviente',    en: 'Living archive'     },
    desc:   { es: 'Guardaste 150 videos en tu lista',                en: 'Saved 150 videos to your list'             },
    check:    p => p.savedVideos.length >= 150,
    progress: p => ({ current: Math.min(p.savedVideos.length, 150), total: 150 }),
    rarity: 'legendario', category: 'especial',
  },
  {
    id: 'meta_diaria', emoji: '🎯',
    titulo: { es: 'Meta cumplida',          en: 'Goal achieved'      },
    desc:   { es: 'Completaste 3 videos en un mismo día',            en: 'Completed 3 videos in a single day'        },
    check: p => {
      const byDate: Record<string, number> = {};
      for (const e of p.watchHistory) byDate[e.date] = (byDate[e.date] ?? 0) + 1;
      return Object.values(byDate).some(c => c >= 3) || p.dailyStats.completed >= 3;
    },
    rarity: 'comun', category: 'especial',
  },
  {
    id: 'maraton', emoji: '🏃',
    titulo: { es: 'Maratón mental',         en: 'Mental marathon'    },
    desc:   { es: 'Completaste 5 videos en un solo día',             en: 'Completed 5 videos in a single day'        },
    check: p => maxInOneDay(p.watchHistory) >= 5 || p.dailyStats.completed >= 5,
    rarity: 'raro', category: 'especial',
  },
  {
    id: 'maraton_extrema', emoji: '🤯',
    titulo: { es: 'Devorador de contenido', en: 'Content devourer'   },
    desc:   { es: 'Completaste 15 videos en un solo día',            en: 'Completed 15 videos in a single day'       },
    check: p => maxInOneDay(p.watchHistory) >= 15 || p.dailyStats.completed >= 15,
    rarity: 'legendario', category: 'especial',
  },
  {
    id: 'dias_activos_30', emoji: '📅',
    titulo: { es: 'Presencia constante',    en: 'Constant presence'  },
    desc:   { es: 'Estuviste activo 30 días en total',               en: 'Were active for 30 days total'             },
    check:    p => p.daysActive.size >= 30,
    progress: p => ({ current: Math.min(p.daysActive.size, 30),  total: 30  }),
    rarity: 'raro', category: 'especial',
  },
  {
    id: 'dias_activos_100', emoji: '🗓️',
    titulo: { es: 'Centenario activo',      en: 'Active centennial'  },
    desc:   { es: 'Estuviste activo 100 días en total',              en: 'Were active for 100 days total'            },
    check:    p => p.daysActive.size >= 100,
    progress: p => ({ current: Math.min(p.daysActive.size, 100), total: 100 }),
    rarity: 'epico', category: 'especial',
  },
  {
    id: 'dias_activos_365', emoji: '⛩️',
    titulo: { es: 'El monje de Morix',      en: 'The Morix monk'     },
    desc:   { es: 'Estuviste activo 365 días en total',              en: 'Were active for 365 days total'            },
    check:    p => p.daysActive.size >= 365,
    progress: p => ({ current: Math.min(p.daysActive.size, 365), total: 365 }),
    rarity: 'legendario', category: 'especial',
  },
];

/* ─── Configuración visual de rareza ─────────────────────────────────────── */
export const RARITY_CONFIG: Record<AchievementRarity, {
  label:  { es: string; en: string };
  color:  string;
  glow:   string;
  border: string;
  bg:     string;
}> = {
  comun:      { label: { es: 'Común',      en: 'Common'    }, color: '#94a3b8', glow: 'rgba(148,163,184,0.3)', border: 'rgba(148,163,184,0.18)', bg: 'rgba(148,163,184,0.05)' },
  raro:       { label: { es: 'Raro',       en: 'Rare'      }, color: '#60a5fa', glow: 'rgba(96,165,250,0.35)',  border: 'rgba(96,165,250,0.22)',  bg: 'rgba(59,130,246,0.08)'  },
  epico:      { label: { es: 'Épico',      en: 'Epic'      }, color: '#c084fc', glow: 'rgba(192,132,252,0.4)', border: 'rgba(192,132,252,0.28)', bg: 'rgba(139,92,246,0.1)'  },
  legendario: { label: { es: 'Legendario', en: 'Legendary' }, color: '#fbbf24', glow: 'rgba(251,191,36,0.45)',  border: 'rgba(251,191,36,0.28)',  bg: 'rgba(245,158,11,0.1)'  },
};

/* ─── Configuración visual de categoría ─────────────────────────────────── */
export const CATEGORY_CONFIG: Record<AchievementCategory, {
  label: { es: string; en: string };
  emoji: string;
  color: string;
}> = {
  videos:     { label: { es: 'Videos',     en: 'Videos'      }, emoji: '🎬', color: '#8b5cf6' },
  tiempo:     { label: { es: 'Tiempo',     en: 'Time'        }, emoji: '⏱️', color: '#3b82f6' },
  racha:      { label: { es: 'Rachas',     en: 'Streaks'     }, emoji: '🔥', color: '#f97316' },
  categorias: { label: { es: 'Categorías', en: 'Categories'  }, emoji: '🌍', color: '#10b981' },
  nivel:      { label: { es: 'Nivel',      en: 'Level'       }, emoji: '⭐', color: '#f59e0b' },
  xp:         { label: { es: 'XP',         en: 'XP'          }, emoji: '⚡', color: '#a78bfa' },
  especial:   { label: { es: 'Especiales', en: 'Special'     }, emoji: '✨', color: '#ec4899' },
};

/* ─── Helper: construir AchievementProgress desde UserProgressContext ─────── */
export function buildAchievementProgress(p: {
  totalVideosWatched: number;
  totalMinutes:       number;
  bestStreak:         number;
  categoryStats:      Record<string, { count: number; minutes: number }>;
  levelInfo:          { level: number };
  totalXP:            number;
  savedVideos:        string[];
  watchHistory:       Array<{ videoId: string; date: string; minutes: number; category: string }>;
  daysActive:         Set<string>;
  dailyStats:         { date: string; completed: number; minutes: number };
}): AchievementProgress {
  return {
    totalVideosWatched: p.totalVideosWatched,
    totalMinutes:       p.totalMinutes,
    bestStreak:         p.bestStreak,
    categoryStats:      p.categoryStats,
    level:              p.levelInfo.level,
    totalXP:            p.totalXP,
    savedVideos:        p.savedVideos,
    watchHistory:       p.watchHistory,
    daysActive:         p.daysActive,
    dailyStats:         p.dailyStats,
  };
}