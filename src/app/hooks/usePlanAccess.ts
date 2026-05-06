/**
 * usePlanAccess — hook central del sistema de acceso por plan.
 *
 * Reglas:
 *  - Admin (isAdminEmail)       → acceso total a todo
 *  - plan: 'premium' | 'trial'  → acceso total a todo
 *  - plan: 'free'               → solo videos con esFree === true
 *  - sin sesión / nulo          → mismo tratamiento que 'free'
 *
 * Este hook es la fuente de verdad. Cuando se integren pagos reales,
 * basta con actualizar `user.plan` en Supabase y el acceso se refleja
 * automáticamente en toda la app.
 */
import { useAuth } from '../contexts/AuthContext';
import { isAdminEmail } from '../config/adminConfig';
import type { Contenido } from '../data/mockData';

export interface PlanAccessResult {
  /** El usuario tiene acceso irrestricto (admin o plan pago). */
  isUnlocked:  boolean;
  /** El plan actual del usuario ('free' | 'trial' | 'premium' | null). */
  plan:        'free' | 'trial' | 'premium' | null;
  /** Es admin. */
  isAdmin:     boolean;
  /**
   * Retorna true si el usuario puede reproducir este video.
   * Si el usuario es libre, el video debe tener esFree === true.
   */
  canWatch:    (video: Partial<Pick<Contenido, 'esFree'>>) => boolean;
}

export function usePlanAccess(): PlanAccessResult {
  const { user } = useAuth();

  const isAdmin  = isAdminEmail(user?.email);
  const plan     = user?.plan ?? null;

  // Acceso completo: admin o plan de pago
  const isUnlocked = isAdmin || plan === 'premium' || plan === 'trial';

  function canWatch(video: Partial<Pick<Contenido, 'esFree'>>): boolean {
    if (isUnlocked) return true;
    // Usuario free: solo puede ver si el video está marcado como gratuito
    return video.esFree === true;
  }

  return { isUnlocked, plan, isAdmin, canWatch };
}
