/**
 * AuroraBackground — fondo de manchas difuminadas.
 *
 * Optimizaciones GPU para Android WebView:
 *  - will-change: transform en cada blob → capa compuesta individual
 *  - translateZ(0) fuerza aceleración hardware desde el inicio
 *  - filter: blur() es ESTÁTICO (no se anima). Animar blur en Android
 *    es extremadamente costoso y es la causa principal de jank visual.
 *  - Solo se anima `transform` (translate + scale) que va al compositor.
 */

interface AuroraBackgroundProps {
  intensity?: 'low' | 'medium' | 'high';
}

export function AuroraBackground({ intensity = 'medium' }: AuroraBackgroundProps) {
  const opacities = {
    low:    [0.10, 0.08, 0.06, 0.05],
    medium: [0.18, 0.14, 0.10, 0.08],
    high:   [0.28, 0.22, 0.16, 0.12],
  };
  const [o1, o2, o3, o4] = opacities[intensity];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Purple blob - top left */}
      <div
        className="aurora-1 absolute rounded-full"
        style={{
          width: '420px',
          height: '420px',
          background: 'radial-gradient(circle, #8b5cf6 0%, transparent 65%)',
          top: '-180px',
          left: '-120px',
          /* blur FIJO — no se anima → sin repaint */
          filter: 'blur(70px)',
          opacity: o1,
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      />
      {/* Blue blob - right */}
      <div
        className="aurora-2 absolute rounded-full"
        style={{
          width: '380px',
          height: '380px',
          background: 'radial-gradient(circle, #3b82f6 0%, transparent 65%)',
          top: '20%',
          right: '-120px',
          filter: 'blur(80px)',
          opacity: o2,
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      />
      {/* Cyan blob - bottom center */}
      <div
        className="aurora-3 absolute rounded-full"
        style={{
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, #06b6d4 0%, transparent 65%)',
          bottom: '15%',
          left: '5%',
          filter: 'blur(65px)',
          opacity: o3,
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      />
      {/* Pink blob - bottom right */}
      <div
        className="aurora-4 absolute rounded-full"
        style={{
          width: '260px',
          height: '260px',
          background: 'radial-gradient(circle, #ec4899 0%, transparent 65%)',
          bottom: '5%',
          right: '-60px',
          filter: 'blur(55px)',
          opacity: o4,
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      />
    </div>
  );
}
