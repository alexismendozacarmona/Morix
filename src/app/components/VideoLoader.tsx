import { motion } from 'motion/react';

// 1x1 transparent GIF — usado como poster en <video> para suprimir el ícono gris nativo
export const TRANSPARENT_POSTER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Morix-branded video buffering loader.
 * Three glowing dots that bounce with staggered timing.
 * Includes a solid black background to cubrir completamente el poster nativo del navegador.
 */
export function VideoLoader({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ zIndex: 20, background: '#000' }}
    >
      {/* Three dots */}
      <div className="relative flex items-center gap-[10px]">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background:
                i === 0
                  ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                  : i === 1
                  ? 'linear-gradient(135deg, #60a5fa, #8b5cf6)'
                  : 'linear-gradient(135deg, #c084fc, #60a5fa)',
              boxShadow:
                i === 0
                  ? '0 0 10px rgba(139,92,246,0.85)'
                  : i === 1
                  ? '0 0 10px rgba(96,165,250,0.85)'
                  : '0 0 10px rgba(192,132,252,0.85)',
              display: 'block',
            }}
            animate={{
              y: [0, -10, 0],
              opacity: [0.7, 1, 0.7],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.18,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}