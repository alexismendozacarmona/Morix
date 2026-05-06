import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface PiPItem {
  videoId:     string;
  title:       string;
  thumbnail:   string;
  progressPct: number;
  progressSecs: number;    // posición actual en segundos
  durationSecs: number;    // duración total en segundos
  categoria:   string;
  /** URL pre-firmada del audio (modo audio+loop: Meditación, Libros…) */
  audioSrc:    string | null;
  /** URL pre-firmada del video (modo video completo) */
  videoSrc:    string | null;
}

interface PiPContextType {
  pip:          PiPItem | null;
  pipPlaying:   boolean;
  startPiP:     (item: PiPItem, autoPlay?: boolean) => void;
  stopPiP:      () => void;
  togglePiPPlay: () => void;
  setPiPProgress: (pct: number, secs?: number) => void;
}

// ─── HMR-safe singleton context ──────────────────────────────────────────────
const CTX_KEY = '__morix_pip_ctx__';
declare global { interface Window { [CTX_KEY]: unknown } }
if (!window[CTX_KEY]) {
  window[CTX_KEY] = createContext<PiPContextType | null>(null);
}
const PiPContext = window[CTX_KEY] as React.Context<PiPContextType | null>;
// ─────────────────────────────────────────────────────────────────────────────

export function PiPProvider({ children }: { children: ReactNode }) {
  const [pip, setPip] = useState<PiPItem | null>(null);
  const [pipPlaying, setPipPlaying] = useState(false);

  const startPiP = useCallback((item: PiPItem, autoPlay = true) => {
    setPip(item);
    setPipPlaying(autoPlay);
  }, []);

  const stopPiP = useCallback(() => {
    setPip(null);
    setPipPlaying(false);
  }, []);

  const togglePiPPlay = useCallback(() => {
    setPipPlaying((v) => !v);
  }, []);

  const setPiPProgress = useCallback((pct: number, secs?: number) => {
    setPip((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        progressPct:  pct,
        progressSecs: secs ?? prev.progressSecs,
      };
    });
  }, []);

  return (
    <PiPContext.Provider value={{ pip, pipPlaying, startPiP, stopPiP, togglePiPPlay, setPiPProgress }}>
      {children}
    </PiPContext.Provider>
  );
}

export function usePiP() {
  const ctx = useContext(PiPContext);
  if (!ctx) throw new Error('usePiP must be used inside PiPProvider');
  return ctx;
}
