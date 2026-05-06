/**
 * Morix Category Utilities
 *
 * Videos are stored with Spanish category names (canonical form).
 * This module provides bidirectional translation so the UI always
 * shows the category in the current language, while filtering always
 * uses the canonical Spanish form for comparison.
 *
 * Adding a new category: just add entries to CATEGORY_MAP_ES_TO_EN
 * and CATEGORY_MAP_EN_TO_ES (mirrored).
 */

import type { Lang } from '../i18n/index';

/** Spanish → English category name */
export const CATEGORY_MAP_ES_TO_EN: Record<string, string> = {
  'Meditación & Sonidos':    'Meditation & Sounds',
  'Libros & Resúmenes':      'Books & Summaries',
  'Terror & Misterios':      'Horror & Mysteries',
  'Datos & Verdades':        'Facts & Truths',
};

/** English → Spanish category name (canonical stored form) */
export const CATEGORY_MAP_EN_TO_ES: Record<string, string> = {
  'Meditation & Sounds':       'Meditación & Sonidos',
  'Books & Summaries':         'Libros & Resúmenes',
  'Horror & Mysteries':        'Terror & Misterios',
  'Facts & Truths':            'Datos & Verdades',
};

/**
 * Given a category stored in the DB (Spanish canonical),
 * return the display name in the requested language.
 */
export function translateCategory(stored: string, lang: Lang): string {
  if (lang === 'en') {
    return CATEGORY_MAP_ES_TO_EN[stored] ?? stored;
  }
  return stored;
}

/**
 * Given a category string that could be in ANY language,
 * return the canonical Spanish form used in the DB.
 * This is used for filtering/matching.
 */
export function toCanonicalCategory(anyLang: string): string {
  if (!anyLang) return 'Meditación & Sonidos';
  
  // Aliases and common variations
  const lower = anyLang.trim().toLowerCase();
  if (lower === 'meditación' || lower === 'meditacion' || lower === 'meditaciones') {
    return 'Meditación & Sonidos';
  }

  // If it's an English name, convert to Spanish
  if (CATEGORY_MAP_EN_TO_ES[anyLang]) return CATEGORY_MAP_EN_TO_ES[anyLang];
  
  // Otherwise assume it's already Spanish (canonical)
  return anyLang;
}


/**
 * Match check: does a video's stored category match the filter?
 * Works regardless of which language the filter was entered in.
 */
export function categoryMatches(storedCategory: string, filterCategory: string): boolean {
  const canonicalFilter = toCanonicalCategory(filterCategory);
  const canonicalStored = toCanonicalCategory(storedCategory);
  return canonicalStored.toLowerCase() === canonicalFilter.toLowerCase();
}

/**
 * Get all possible names for a category (for search purposes).
 * Returns [stored, translated] so search works in any language.
 */
export function getCategoryNames(stored: string): string[] {
  const names = [stored.toLowerCase()];
  const translated = CATEGORY_MAP_ES_TO_EN[stored];
  if (translated) names.push(translated.toLowerCase());
  return names;
}