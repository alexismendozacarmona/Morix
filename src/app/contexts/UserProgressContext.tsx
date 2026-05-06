import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { ACHIEVEMENTS, buildAchievementProgress } from '../utils/achievementsConfig';

/* ───── Infinite Level Formula ─────
   XP needed to go from level N to N+1 = 120 + N * 40
──────────────────────────────────── */
export function xpNeededForLevel(level: number): number {
  return 120 + level * 40;
}

export function getLevelInfo(totalXP: number) {
  let level = 0;
  let accumulated = 0;
  while (true) {
    const needed = xpNeededForLevel(level);
    if (accumulated + needed > totalXP) {
      return {
        level,
        currentLevelXP: totalXP - accumulated,
        nextLevelXP: needed,
        pct: (totalXP - accumulated) / needed,
      };
    }
    accumulated += needed;
    level++;
  }
}

export interface XPReward {
  xp: number;
  baseXP: number;
  bonusXP: number;
  bonusReasons: string[];
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  streakUpdated: boolean;
  newStreak: number;
  videoTitle: string;
  dailyCompleted: number;
  dailyTarget: number;
  xpToNextLevel: number;
  totalMinutesToday: number;
  unlockedAchievements: typeof ACHIEVEMENTS;
}

/* ─── Watch history entry ─────────────────────────────────────────────────── */
export interface WatchEntry {
  videoId: string;
  title: string;
  category: string;
  minutes: number;
  date: string; // ISO date string "YYYY-MM-DD"
  ts: number;   // timestamp for ordering
}

/* ─── Persistent state (what gets saved to localStorage) ─────────────────── */
interface PersistedState {
  totalXP: number;
  streak: number;
  bestStreak: number;
  lastWatchDate: string | null;
  watchedVideos: string[];             // unique video ids completed
  savedVideos: string[];
  videoProgresses: Record<string, number>;
  totalMinutes: number;
  daysActive: string[];                // serialized Set<string>
  dailyStats: { date: string; completed: number; minutes: number };
  watchHistory: WatchEntry[];          // full log of completions
  categoryStats: Record<string, { count: number; minutes: number }>;
}

interface UserProgressState extends Omit<PersistedState, 'daysActive'> {
  daysActive: Set<string>;
}

import type { NoRewardType } from '../../components/NoRewardModal';

interface UserProgressContextType extends UserProgressState {
  totalVideosWatched: number;          // derived: watchedVideos.length
  completeVideo: (videoId: string, title: string, durationMinutes: number, category: string, nextVideo?: Contenido | null) => XPReward;
  triggerNoReward: (type: NoRewardType, videoTitle: string, nextVideo?: Contenido | null) => void;
  pendingReward: (XPReward & { nextVideo?: Contenido | null }) | null;
  pendingNoReward: { type: NoRewardType; videoTitle: string; nextVideo?: Contenido | null } | null;
  clearReward: () => void;
  clearNoReward: () => void;
  toggleSave: (videoId: string) => void;
  isSaved: (videoId: string) => boolean;
  updateVideoProgress: (videoId: string, pct: number) => void;
  getVideoProgress: (videoId: string) => number;
  levelInfo: ReturnType<typeof getLevelInfo>;
  clearWatchHistory: () => void;
}

/* ─── localStorage helpers — namespaced per user ─────────────────────────── */
function getStorageKey(userId: string | null | undefined): string {
  return userId ? `morix_progress_v2_${userId}` : 'morix_progress_v2_guest';
}

function loadPersistedState(userId?: string | null): PersistedState {
  const key = getStorageKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return makePersistedDefault();
    const p = JSON.parse(raw) as Partial<PersistedState>;
    return {
      totalXP:         p.totalXP         ?? 0,
      streak:          p.streak          ?? 0,
      bestStreak:      p.bestStreak      ?? 0,
      lastWatchDate:   p.lastWatchDate   ?? null,
      watchedVideos:   p.watchedVideos   ?? [],
      savedVideos:     p.savedVideos     ?? [],
      videoProgresses: p.videoProgresses ?? {},
      totalMinutes:    p.totalMinutes    ?? 0,
      daysActive:      p.daysActive      ?? [],
      dailyStats:      p.dailyStats      ?? { date: todayStr(), completed: 0, minutes: 0 },
      watchHistory:    p.watchHistory    ?? [],
      categoryStats:   p.categoryStats   ?? {},
    };
  } catch {
    return makePersistedDefault();
  }
}

function savePersistedState(s: UserProgressState, userId?: string | null): void {
  const key = getStorageKey(userId);
  try {
    const persisted: PersistedState = { ...s, daysActive: Array.from(s.daysActive) };
    localStorage.setItem(key, JSON.stringify(persisted));
  } catch { /* quota exceeded – silently ignore */ }
}

function makePersistedDefault(): PersistedState {
  return {
    totalXP: 0,
    streak: 0,
    bestStreak: 0,
    lastWatchDate: null,
    watchedVideos: [],
    savedVideos: [],
    videoProgresses: {},
    totalMinutes: 0,
    daysActive: [],
    dailyStats: { date: todayStr(), completed: 0, minutes: 0 },
    watchHistory: [],
    categoryStats: {},
  };
}

function persistedToState(p: PersistedState): UserProgressState {
  return { ...p, daysActive: new Set(p.daysActive) };
}

/* ─── HMR-safe singleton context ─────────────────────────────────────────── */
const CTX_KEY = '__morix_user_progress_ctx__';
declare global { interface Window { [CTX_KEY]: unknown } }
if (!window[CTX_KEY]) {
  window[CTX_KEY] = createContext<UserProgressContextType | null>(null);
}
const UserProgressContext = window[CTX_KEY] as React.Context<UserProgressContextType | null>;

const todayStr = () => new Date().toISOString().split('T')[0];

/* ─── Provider ───────────────────────────────────────────────────────────── */
export function UserProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { privacySettings } = useSettings();
  const privacyRef = useRef(privacySettings);
  useEffect(() => { privacyRef.current = privacySettings; }, [privacySettings]);

  // Track userId in a ref so save effects can access it synchronously
  const userIdRef = useRef<string | null>(user?.id ?? null);
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user?.id]);

  const [pendingReward, setPendingReward] = useState<(XPReward & { nextVideo?: Contenido | null }) | null>(null);
  const [pendingNoReward, setPendingNoReward] = useState<{ type: NoRewardType; videoTitle: string; nextVideo?: Contenido | null } | null>(null);

  const [state, setState] = useState<UserProgressState>(() => {
    // Read user ID synchronously from localStorage session cache for initial load
    const sessionId = localStorage.getItem('morix_session_v1');
    return persistedToState(loadPersistedState(sessionId));
  });

  // Mirror to ref for sync reads inside callbacks
  const stateRef = useRef<UserProgressState>(state);
  stateRef.current = state;

  // Debounce timer ref for Supabase sync
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── When user changes (login / logout / switch) — reload from their key ── */
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    // Skip if userId hasn't actually changed
    if (prevUserIdRef.current === (user?.id ?? null)) return;
    prevUserIdRef.current = user?.id ?? null;

    const loaded = persistedToState(loadPersistedState(user?.id));
    setState(loaded);
    stateRef.current = loaded;
  }, [user?.id]);

  /* ── Persist to user-specific localStorage key whenever state changes ───── */
  useEffect(() => {
    savePersistedState(state, userIdRef.current);
  }, [state]);

  /* ── Fetch progress from Supabase when user changes ──────────────────── */
  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from('morix_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return;

        // Merge: usar el estado con más XP (el más actualizado)
        const remoteXP = (data.total_xp as number) ?? 0;
        const localXP  = stateRef.current.totalXP;

        if (remoteXP >= localXP) {
          // Supabase tiene datos más recientes o iguales — usar Supabase
          const remoteState: PersistedState = {
            totalXP:         data.total_xp         ?? 0,
            streak:          data.streak            ?? 0,
            bestStreak:      data.best_streak       ?? 0,
            lastWatchDate:   data.last_watch_date   ?? null,
            watchedVideos:   (data.watched_videos   as string[]) ?? [],
            savedVideos:     (data.saved_videos     as string[]) ?? [],
            videoProgresses: (data.video_progresses as Record<string,number>) ?? {},
            totalMinutes:    data.total_minutes     ?? 0,
            daysActive:      (data.days_active      as string[]) ?? [],
            dailyStats:      (data.daily_stats      as PersistedState['dailyStats']) ?? { date: todayStr(), completed: 0, minutes: 0 },
            watchHistory:    (data.watch_history    as WatchEntry[]) ?? [],
            categoryStats:   (data.category_stats   as PersistedState['categoryStats']) ?? {},
          };
          const newState = persistedToState(remoteState);
          setState(newState);
          stateRef.current = newState;
          savePersistedState(newState, user.id);
        }
        // Si local tiene más XP, la próxima escritura sincronizará Supabase
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* ── Sync to Supabase debounced (2s después de cada cambio) ───────────── */
  const syncToSupabase = useCallback((s: UserProgressState) => {
    if (!user?.id) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const payload = {
        user_id:          user.id,
        total_xp:         s.totalXP,
        streak:           s.streak,
        best_streak:      s.bestStreak,
        last_watch_date:  s.lastWatchDate,
        watched_videos:   s.watchedVideos,
        saved_videos:     s.savedVideos,
        video_progresses: s.videoProgresses,
        total_minutes:    s.totalMinutes,
        days_active:      Array.from(s.daysActive),
        daily_stats:      s.dailyStats,
        watch_history:    s.watchHistory,
        category_stats:   s.categoryStats,
        updated_at:       new Date().toISOString(),
      };

      supabase
        .from('morix_progress')
        .upsert(payload, { onConflict: 'user_id' })
        .then(({ error }) => {
          if (error) console.warn('Supabase progress sync error:', error);
        });
    }, 2000);
  }, [user?.id]);

  /* ── completeVideo ─────────────────────────────────────────────────────── */
  const completeVideo = useCallback((
    videoId: string,
    title: string,
    durationMinutes: number,
    category: string,
    nextVideo?: Contenido | null,
  ): XPReward => {
    // Round to avoid floating point issues in daily stats
    durationMinutes = Math.round(durationMinutes);
    const prev = stateRef.current;
    const today = todayStr();

    const infoBefore = getLevelInfo(prev.totalXP);
    const levelBefore = infoBefore.level;

    const baseXP = Math.max(15, Math.floor(durationMinutes * 4));
    const bonusReasons: string[] = [];
    let bonusXP = 0;

    const isFirstWatch = !prev.watchedVideos.includes(videoId);
    if (!isFirstWatch) {
      // Si ya lo vio, no gana nada de XP
      return {
        xp: 0,
        bonusReasons: [],
        levelBefore,
        levelAfter: levelBefore,
        leveledUp: false,
        totalXP: prev.totalXP,
        xpToNextLevel: infoBefore.nextLevelXP - prev.totalXP,
        totalMinutesToday: prev.dailyStats.minutes,
        unlockedAchievements: [],
      };
    }

    if (isFirstWatch) {
      bonusXP += 20;
      bonusReasons.push('+20 XP primera vez');
    }
    if (prev.streak > 0) {
      const streakBonus = Math.floor(baseXP * 0.25);
      bonusXP += streakBonus;
      bonusReasons.push(`+${streakBonus} XP bono racha`);
    }
    if (durationMinutes >= 30) {
      bonusXP += 10;
      bonusReasons.push('+10 XP video largo');
    }
    if (category === 'Enseñanzas') {
      bonusXP += 5;
      bonusReasons.push('+5 XP categoría especial');
    }

    const totalGained = baseXP + bonusXP;
    const newTotalXP = prev.totalXP + totalGained;
    const infoAfter = getLevelInfo(newTotalXP);
    const levelAfter = infoAfter.level;

    let newStreak = prev.streak;
    let streakUpdated = false;
    if (prev.lastWatchDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (prev.lastWatchDate === yesterdayStr || prev.lastWatchDate === null) {
        newStreak = prev.streak + 1;
      } else {
        newStreak = 1;
      }
      streakUpdated = true;
    }
    const newBestStreak = Math.max(prev.bestStreak, newStreak);

    const isSameDay = prev.dailyStats.date === today;
    const newDailyCompleted = (isSameDay ? prev.dailyStats.completed : 0) + 1;
    const newDailyMinutes = (isSameDay ? prev.dailyStats.minutes : 0) + durationMinutes;
    const dailyTarget = 3;

    const newDaysActive = new Set(prev.daysActive);
    newDaysActive.add(today);

    const newWatchedVideos = isFirstWatch
      ? [...prev.watchedVideos, videoId]
      : prev.watchedVideos;

    const newEntry: WatchEntry = {
      videoId, title, category,
      minutes: durationMinutes,
      date: today,
      ts: Date.now(),
    };
    const newWatchHistory = privacyRef.current.historialActivo
      ? [...prev.watchHistory, newEntry]
      : prev.watchHistory;

    const prevCat = prev.categoryStats[category] ?? { count: 0, minutes: 0 };
    const newCategoryStats = {
      ...prev.categoryStats,
      [category]: {
        count: prevCat.count + 1,
        minutes: prevCat.minutes + durationMinutes,
      },
    };

    const newState: UserProgressState = {
      ...prev,
      totalXP: newTotalXP,
      streak: newStreak,
      bestStreak: newBestStreak,
      lastWatchDate: today,
      watchedVideos: newWatchedVideos,
      totalMinutes: prev.totalMinutes + durationMinutes,
      daysActive: newDaysActive,
      videoProgresses: { ...prev.videoProgresses, [videoId]: 100 },
      dailyStats: { date: today, completed: newDailyCompleted, minutes: newDailyMinutes },
      watchHistory: newWatchHistory,
      categoryStats: newCategoryStats,
    };

    // Calcular logros desbloqueados JUSTO AHORA
    const progressBefore = buildAchievementProgress({
      totalVideosWatched: prev.watchedVideos.length,
      totalMinutes: prev.totalMinutes,
      bestStreak: prev.bestStreak,
      categoryStats: prev.categoryStats,
      levelInfo: getLevelInfo(prev.totalXP),
      totalXP: prev.totalXP,
      savedVideos: prev.savedVideos,
      watchHistory: prev.watchHistory,
      daysActive: prev.daysActive,
      dailyStats: prev.dailyStats,
    });
    
    const progressAfter = buildAchievementProgress({
      totalVideosWatched: newState.watchedVideos.length,
      totalMinutes: newState.totalMinutes,
      bestStreak: newState.bestStreak,
      categoryStats: newState.categoryStats,
      levelInfo: getLevelInfo(newState.totalXP),
      totalXP: newState.totalXP,
      savedVideos: newState.savedVideos,
      watchHistory: newState.watchHistory,
      daysActive: newState.daysActive,
      dailyStats: newState.dailyStats,
    });

    const newlyUnlockedAchievements = ACHIEVEMENTS.filter(a => !a.check(progressBefore) && a.check(progressAfter));

    const reward: XPReward = {
      xp: totalGained, baseXP, bonusXP, bonusReasons,
      levelBefore, levelAfter,
      leveledUp: levelAfter > levelBefore,
      streakUpdated, newStreak,
      videoTitle: title,
      dailyCompleted: newDailyCompleted, dailyTarget,
      xpToNextLevel: infoAfter.nextLevelXP - infoAfter.currentLevelXP,
      totalMinutesToday: newDailyMinutes,
      unlockedAchievements: newlyUnlockedAchievements,
    };

    setPendingReward({ ...reward, nextVideo });
    setState(newState);
    stateRef.current = newState;
    syncToSupabase(newState);
    return reward;
  }, [syncToSupabase]);

  /* ── triggerNoReward ────────────────────────────────────────────────────── */
  const triggerNoReward = useCallback((type: NoRewardType, videoTitle: string, nextVideo?: Contenido | null) => {
    setPendingNoReward({ type, videoTitle, nextVideo });
  }, []);

  const clearReward = useCallback(() => setPendingReward(null), []);
  const clearNoReward = useCallback(() => setPendingNoReward(null), []);

  /* ── toggleSave ────────────────────────────────────────────────────────── */
  const toggleSave = useCallback((videoId: string) => {
    setState((prev) => {
      const newState = {
        ...prev,
        savedVideos: prev.savedVideos.includes(videoId)
          ? prev.savedVideos.filter((id) => id !== videoId)
          : [...prev.savedVideos, videoId],
      };
      syncToSupabase(newState);
      return newState;
    });
  }, [syncToSupabase]);

  const isSaved = useCallback((videoId: string) => {
    return stateRef.current.savedVideos.includes(videoId);
  }, []);

  /* ── video progress ────────────────────────────────────────────────────── */
  const updateVideoProgress = useCallback((videoId: string, pct: number) => {
    setState((prev) => {
      const newState = {
        ...prev,
        videoProgresses: { ...prev.videoProgresses, [videoId]: pct },
      };
      syncToSupabase(newState);
      return newState;
    });
  }, [syncToSupabase]);

  const getVideoProgress = useCallback((videoId: string) => {
    return stateRef.current.videoProgresses[videoId] ?? 0;
  }, []);

  /* ── clearWatchHistory ──────────────────────────────────────────────────── */
  const clearWatchHistory = useCallback(() => {
    setState((prev) => {
      const newState = { ...prev, watchHistory: [] };
      stateRef.current = newState;
      syncToSupabase(newState);
      return newState;
    });
  }, [syncToSupabase]);

  const levelInfo = getLevelInfo(state.totalXP);

  return (
    <UserProgressContext.Provider value={{
      ...state,
      totalVideosWatched: state.watchedVideos.length,
      completeVideo,
      triggerNoReward,
      pendingReward,
      pendingNoReward,
      clearReward,
      clearNoReward,
      toggleSave,
      isSaved,
      updateVideoProgress,
      getVideoProgress,
      levelInfo,
      clearWatchHistory,
    }}>
      {children}
    </UserProgressContext.Provider>
  );
}

export function useUserProgress() {
  const ctx = useContext(UserProgressContext);
  if (!ctx) throw new Error('useUserProgress must be used inside UserProgressProvider');
  return ctx;
}