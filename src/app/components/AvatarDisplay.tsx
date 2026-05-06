/**
 * AvatarDisplay — Shared avatar renderer for the entire Morix app.
 * Renders either:
 *   - A gradient circle with user initials (for gradient_* avatars)
 *   - An emoji on a gradient circle (for all other avatars)
 * 
 * Has optional "locked" overlay and "exclusive" glow for high-level avatars.
 */
import { motion } from 'motion/react';
import { getAvatarById, gradientIndexToAvatarId, type AvatarDef } from '../config/avatarCatalog';
import { Lock } from 'lucide-react';

interface AvatarDisplayProps {
  /** Avatar ID from the catalog (e.g. 'morix_flame', 'gradient_2') */
  avatarId?: string | null;
  /** Fallback: old-style gradient index (converted automatically) */
  avatarGradient?: number;
  /** User's display name (used for initials on gradient avatars) */
  userName?: string;
  /** Size in pixels */
  size?: number;
  /** If true, show a locked overlay */
  locked?: boolean;
  /** Required level to unlock (shown on locked overlay) */
  requiredLevel?: number;
  /** Whether to show the exclusive glow effect (for level 8+ avatars) */
  showGlow?: boolean;
}

export function AvatarDisplay({
  avatarId,
  avatarGradient,
  userName = '',
  size = 40,
  locked = false,
  requiredLevel,
  showGlow = true,
}: AvatarDisplayProps) {
  // Resolve avatar: prefer avatarId, fallback to gradientIndex, fallback to gradient_0
  const resolvedId = avatarId || (avatarGradient !== undefined ? gradientIndexToAvatarId(avatarGradient) : 'gradient_0');
  const avatar: AvatarDef = getAvatarById(resolvedId);

  const initials = userName
    .trim()
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const isExclusive = avatar.requiredLevel >= 8;
  const emojiSize = size * 0.42;
  const initialsSize = size * 0.32;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Optional exclusive glow */}
      {showGlow && isExclusive && !locked && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${avatar.bg.from}60, transparent 70%)`,
            filter: 'blur(6px)',
            transform: 'scale(1.35)',
          }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Main circle */}
      <div
        className="rounded-full overflow-hidden flex items-center justify-center font-black text-white w-full h-full"
        style={{
          background: `linear-gradient(135deg, ${avatar.bg.from}, ${avatar.bg.to})`,
          boxShadow: locked
            ? 'none'
            : `0 0 ${Math.max(10, size * 0.25)}px ${avatar.bg.from}70`,
          border: isExclusive && !locked
            ? `2px solid ${avatar.bg.from}90`
            : '2px solid rgba(255,255,255,0.12)',
          fontSize: initialsSize,
          opacity: locked ? 0.45 : 1,
          filter: locked ? 'grayscale(0.6)' : 'none',
        }}
      >
        {avatar.showInitials ? (
          <span style={{ fontSize: initialsSize, lineHeight: 1 }}>{initials}</span>
        ) : (
          <span style={{ fontSize: emojiSize, lineHeight: 1 }} role="img">{avatar.emoji}</span>
        )}
      </div>

      {/* Locked overlay */}
      {locked && (
        <div
          className="absolute inset-0 rounded-full flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }}
        >
          <Lock size={Math.max(10, size * 0.22)} className="text-white" style={{ opacity: 0.8 }} />
          {requiredLevel !== undefined && size >= 36 && (
            <span
              className="text-white font-black mt-0.5"
              style={{ fontSize: Math.max(7, size * 0.12), opacity: 0.7 }}
            >
              Nv.{requiredLevel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
