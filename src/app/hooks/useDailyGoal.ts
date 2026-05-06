/**
 * useDailyGoal
 * Lee/escribe la meta diaria de minutos del usuario desde localStorage.
 * Clave namespaceada por userId para aislar usuarios.
 */
import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_GOAL = 15; // minutos

function goalKey(userId: string): string {
  return `morix_daily_goal_${userId}`;
}

export function useDailyGoal() {
  const { user } = useAuth();

  const dailyGoalMinutes: number = (() => {
    if (!user?.id) return DEFAULT_GOAL;
    try {
      const raw = localStorage.getItem(goalKey(user.id));
      const parsed = raw ? parseInt(raw, 10) : NaN;
      return isNaN(parsed) ? DEFAULT_GOAL : parsed;
    } catch {
      return DEFAULT_GOAL;
    }
  })();

  const setDailyGoal = useCallback((minutes: number) => {
    if (!user?.id) return;
    try {
      localStorage.setItem(goalKey(user.id), String(minutes));
    } catch { /* ignore */ }
  }, [user?.id]);

  return { dailyGoalMinutes, setDailyGoal };
}
