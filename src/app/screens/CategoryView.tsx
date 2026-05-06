import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Search, X, Tag } from 'lucide-react';
import { useAdminContent } from '../contexts/AdminContentContext';
import { usePreview, PreviewProvider } from '../contexts/PreviewContext';
import { ContentCard } from '../components/ContentCard';
import { ContentPreviewSheet } from '../components/ContentPreviewSheet';
import { AuroraBackground } from '../components/AuroraBackground';
import type { Contenido } from '../data/mockData';
import { useT } from '../i18n/useT';
import { toCanonicalCategory, translateCategory, getCategoryNames } from '../utils/categoryUtils';

// Colores por letra del tag
function tagColor(tag: string): { from: string; to: string; glow: string } {
  const palette = [
    { from: '#8b5cf6', to: '#6366f1', glow: 'rgba(139,92,246,0.5)' },
    { from: '#0891b2', to: '#3b82f6', glow: 'rgba(8,145,178,0.5)' },
    { from: '#059669', to: '#10b981', glow: 'rgba(5,150,105,0.5)' },
    { from: '#d97706', to: '#f59e0b', glow: 'rgba(217,119,6,0.5)' },
    { from: '#db2777', to: '#ec4899', glow: 'rgba(219,39,119,0.5)' },
    { from: '#0d9488', to: '#14b8a6', glow: 'rgba(13,148,136,0.5)' },
    { from: '#7c3aed', to: '#a855f7', glow: 'rgba(124,58,237,0.5)' },
    { from: '#1d4ed8', to: '#3b82f6', glow: 'rgba(29,78,216,0.5)' },
  ];
  const idx = tag.charCodeAt(0) % palette.length;
  return palette[idx];
}

export default function CategoryView() {
  return (
    <PreviewProvider>
      <CategoryViewInner />
    </PreviewProvider>
  );
}

function CategoryViewInner() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { videos } = useAdminContent();
  const { previewItem, setPreviewItem } = usePreview();
  const [search, setSearch] = useState('');

  const decodedTag = tag ? decodeURIComponent(tag) : '';
  const colors = tagColor(decodedTag);

  // Si venimos de un tag del PreviewSheet, sabemos la ruta de origen para volver
  const locationState = (location.state as { heroTitle?: string; previewOrigin?: string } | null) ?? {};
  const previewOrigin: string | undefined = locationState.previewOrigin;

  // Título personalizado si viene desde "porque viste"
  const heroTitle: string = locationState.heroTitle ?? decodedTag;

  // Filtrar videos: incluye los que tienen el tag O los de esa categoría principal
  const tagged = videos.filter((v) => {
    const inTags = (Array.isArray(v.tags) ? v.tags : []).some(
      (t) => t.toLowerCase() === decodedTag.toLowerCase()
    );
    // Also match by category in any language
    const catNames = getCategoryNames(v.categoria);
    const inCat = catNames.some(name => name === decodedTag.toLowerCase()) ||
      toCanonicalCategory(v.categoria).toLowerCase() === toCanonicalCategory(decodedTag).toLowerCase();
    return inTags || inCat;
  });

  const filtered = search.trim()
    ? tagged.filter((v) =>
        v.titulo.toLowerCase().includes(search.toLowerCase()) ||
        (v.descripcion ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : tagged;

  // Tags relacionados: todos los tags que aparecen en estos videos (excepto el actual)
  const relatedTags = [...new Set(
    tagged.flatMap((v) => v.tags ?? []).filter((t) => t.toLowerCase() !== decodedTag.toLowerCase())
  )].slice(0, 8);

  const t = useT();

  return (
    <div className="relative h-full flex flex-col bg-[#030309]">
      <AuroraBackground intensity="low" />

      {/* Preview sheet */}
      <ContentPreviewSheet item={previewItem} onClose={() => setPreviewItem(null)} />

      {/* Header */}
      <div
        className="relative z-20 flex-shrink-0 px-4 pt-12 pb-4"
        style={{ background: 'linear-gradient(to bottom, rgba(3,3,9,0.95) 0%, rgba(3,3,9,0.6) 100%)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => previewOrigin ? navigate(previewOrigin) : navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <ArrowLeft size={17} className="text-white" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`, boxShadow: `0 0 10px ${colors.glow}` }}
              >
                <Tag size={12} className="text-white" />
              </div>
              <h1
                className="text-white font-black truncate"
                style={{ fontSize: '18px' }}
              >
                {heroTitle}
              </h1>
            </div>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
              {tagged.length} {tagged.length === 1 ? 'video' : 'videos'}
            </p>
          </div>
        </div>

        {/* Top accent */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: `linear-gradient(to right, transparent, ${colors.from}, ${colors.to}, transparent)`,
            boxShadow: `0 0 12px ${colors.glow}`,
          }}
        />

        {/* Search bar */}
        <div
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[16px]"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Search size={14} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar en ${decodedTag}…`}
            className="flex-1 bg-transparent text-white text-xs outline-none placeholder:opacity-40"
          />
          {search && (
            <button onClick={() => setSearch('')} className="active:scale-90 transition-transform">
              <X size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 pb-8">

        {/* Related tags */}
        {relatedTags.length > 0 && (
          <div className="px-4 mb-4">
            <p className="text-[10px] font-bold mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>CATEGORÍAS RELACIONADAS</p>
            <div className="flex flex-wrap gap-2">
              {relatedTags.map((rt) => {
                const rc = tagColor(rt);
                return (
                  <button
                    key={rt}
                    onClick={() => navigate(
                      `/categoria/${encodeURIComponent(rt)}`,
                      // replace=true para no apilar historial, y propagamos el origen
                      { replace: true, state: { previewOrigin } }
                    )}
                    className="text-[10px] font-semibold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                    style={{
                      background: `${rc.from}14`,
                      border: `1px solid ${rc.from}30`,
                      color: rc.from,
                    }}
                  >
                    {rt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div
              className="w-20 h-20 rounded-[28px] flex items-center justify-center mb-5"
              style={{
                background: `linear-gradient(135deg, ${colors.from}20, ${colors.to}10)`,
                border: `1px solid ${colors.from}25`,
              }}
            >
              <Tag size={36} style={{ color: colors.from, opacity: 0.7 }} />
            </div>
            <p className="text-white font-bold mb-2">
              {search ? t.category.sin_resultados : t.category.sin_videos}
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {search
                ? 'Intenta con otro término de búsqueda.'
                : 'Pronto habrá contenido aquí.'}
            </p>
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 && (
          <div className="px-4">
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                >
                  <ContentCard contenido={item as Contenido} />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}