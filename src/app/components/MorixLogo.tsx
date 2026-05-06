/**
 * MorixLogo — logo PNG con efecto shimmer de luz deslizante + glow exterior.
 *
 * Optimizaciones GPU (Android WebView):
 *  - will-change: transform eleva el contenedor a su propia capa compuesta
 *  - translateZ(0) fuerza aceleración hardware desde el primer frame
 *  - El shimmer usa CSS @keyframes (más eficiente que Web Animation API en Android)
 */

const LOGO_URL =
  'https://clasicosdelreggaeton.com/sitepad-data/uploads/2026/03/MorixLogoNuevoTranspa.png';

interface MorixLogoProps {
  /** Altura del logo en px (el ancho se ajusta automáticamente) */
  height?: number;
  /** Intensidad del glow exterior (0–1) */
  glowIntensity?: number;
  /** Clase adicional para el contenedor */
  className?: string;
  /** Si true, añade la línea decorativa debajo (onboarding) */
  showLine?: boolean;
}

export function MorixLogo({
  height = 36,
  glowIntensity = 0.9,
  className = '',
  showLine = false,
}: MorixLogoProps) {
  const g = glowIntensity;

  return (
    <div className={`flex flex-col items-center gap-0 ${className}`} style={{ userSelect: 'none' }}>
      {/* ── Wrapper con glow + shimmer overlay ── */}
      <div
        className="relative"
        style={{
          height,
          maxWidth: height * 5,
          /* Capa GPU dedicada — evita repaint del drop-shadow en Android */
          willChange: 'transform',
          transform: 'translateZ(0)',
          filter: `drop-shadow(0 0 ${Math.round(height * 0.35)}px rgba(139,92,246,${g * 0.8})) drop-shadow(0 0 ${Math.round(height * 0.7)}px rgba(99,102,241,${g * 0.45}))`,
        }}
      >
        {/* Imagen base */}
        <img
          src={LOGO_URL}
          alt="Morix"
          style={{
            height: '100%',
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
            transform: 'scale(2.8) translateZ(0)',
            transformOrigin: 'center',
          }}
          draggable={false}
        />

        {/* Shimmer overlay — CSS keyframe para no bloquear el hilo JS principal */}
        <div
          aria-hidden
          className="morix-shimmer"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 4,
            background:
              'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.65) 50%, transparent 75%)',
            backgroundSize: '200% 100%',
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Línea decorativa (solo onboarding) */}
      {showLine && (
        <div
          className="rounded-full glow-pulse mt-2"
          style={{
            width: Math.round(height * 3.3),
            height: 2,
            background:
              'linear-gradient(to right, transparent, #8b5cf6, #3b82f6, transparent)',
            boxShadow: '0 0 12px rgba(139,92,246,0.8)',
          }}
        />
      )}
    </div>
  );
}
