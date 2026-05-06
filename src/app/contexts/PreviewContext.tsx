import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Contenido } from '../data/mockData';

interface PreviewContextType {
  previewItem: Contenido | null;
  setPreviewItem: (item: Contenido | null) => void;
}

// ─── HMR-safe singleton context ──────────────────────────────────────────────
const CTX_KEY = '__morix_preview_ctx__';
declare global { interface Window { [CTX_KEY]: unknown } }
if (!window[CTX_KEY]) {
  window[CTX_KEY] = createContext<PreviewContextType>({
    previewItem: null,
    setPreviewItem: () => {},
  });
}
const PreviewContext = window[CTX_KEY] as React.Context<PreviewContextType>;
// ─────────────────────────────────────────────────────────────────────────────

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [previewItem, setPreviewItem] = useState<Contenido | null>(null);
  return (
    <PreviewContext.Provider value={{ previewItem, setPreviewItem }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  return useContext(PreviewContext);
}
