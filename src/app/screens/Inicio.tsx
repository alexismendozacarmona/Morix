import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Search, Bell, Zap, BookOpen, Sparkles } from 'lucide-react';
import type { Contenido } from '../data/mockData';
import { HeroCarousel } from '../components/HeroCarousel';
import { ContentRow } from '../components/ContentCard';
import { AuroraBackground } from '../components/AuroraBackground';
import { useUserProgress } from '../contexts/UserProgressContext';
import { usePreview } from '../contexts/PreviewContext';
import { HScrollRow } from '../components/HScrollRow';
import { useNotifications } from '../contexts/NotificationsContext';
import { NotificationsPanel } from '../components/NotificationsPanel';
import { ShortsRow } from '../components/ShortsRow';
import { useAdminContent } from '../contexts/AdminContentContext';
import { useTrending } from '../contexts/TrendingContext';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../i18n/useT';
import { AvatarDisplay } from '../components/AvatarDisplay';
import { toCanonicalCategory } from '../utils/categoryUtils';
import { MorixLogo } from '../components/MorixLogo';

function filterContent(content: Contenido[], categories: string[] | null): Contenido[] {
  if (!categories) return content;
  return content.filter((c) => categories.includes(c.categoria));
}

/**
 * Ordena el contenido priorizando las categorías de los intereses del usuario.
 * Si no hay intereses, devuelve el contenido tal cual.
 */
function sortByInterests(content: Contenido[], interests: string[]): Contenido[] {
  if (interests.length === 0) return content;
  const interestSet = new Set(interests.map((i) => i.toLowerCase()));
  return [...content].sort((a, b) => {
    const aMatch = interestSet.has(a.categoria.toLowerCase()) ? 1 : 0;
    const bMatch = interestSet.has(b.categoria.toLowerCase()) ? 1 : 0;
    return bMatch - aMatch; // primero los que coinciden
  });
}

export default function Inicio() {
  const navigate = useNavigate();
  const t = useT();
  const { user } = useAuth();
  const { streak, levelInfo, getVideoProgress, watchedVideos } = useUserProgress();
  const { setPreviewItem } = usePreview();
  const { unreadCount } = useNotifications();
  const { videos, loading: contentLoading } = useAdminContent();
  const { top10Videos } = useTrending();
  const [activeFilter, setActiveFilter] = useState('para_ti');
  const [showNotif, setShowNotif] = useState(false);

  // Intereses guardados del usuario (nombres de categoría reales)
  const userInterests: string[] = Array.isArray(user?.interests) ? user!.interests : [];
  const hasInterests = userInterests.length > 0;

  // ── Filtros dinámicos ────────────────────────────────────────────────────────
  // Primero "Para Ti", luego las categorías del usuario que tengan contenido,
  // luego el resto de categorías disponibles en el catálogo.
  const availableCategories = useMemo(() => {
    return [...new Set(videos.map((v) => v.categoria))];
  }, [videos]);

  const filterCats = useMemo(() => {
    const base: { key: string; categories: string[] | null; isInterest: boolean }[] = [
      { key: 'para_ti', categories: null, isInterest: false },
    ];

    if (hasInterests) {
      // Primero los intereses del usuario que tengan contenido disponible
      for (const interest of userInterests) {
        if (availableCategories.includes(interest)) {
          base.push({ key: interest, categories: [interest], isInterest: true });
        }
      }
      // Luego el resto de categorías disponibles que no sean ya intereses
      for (const cat of availableCategories) {
        if (!userInterests.includes(cat)) {
          base.push({ key: cat, categories: [cat], isInterest: false });
        }
      }
    } else {
      // Sin intereses: mostrar todas las categorías disponibles
      for (const cat of availableCategories) {
        base.push({ key: cat, categories: [cat], isInterest: false });
      }
    }

    return base;
  }, [hasInterests, userInterests, availableCategories]);

  const activeFilterDef = filterCats.find((f) => f.key === activeFilter) ?? filterCats[0];
  const cats = activeFilterDef?.categories ?? null;

  // Contenido filtrado por el tab activo
  const filtered = filterContent(videos, cats);

  // Hero: primero estrenos, luego el resto (máx 5)
  // Si el usuario tiene intereses, los videos de sus categorías van primero en el hero
  const heroContent = useMemo(() => {
    const estrenos = videos.filter((v) => v.estreno);
    const resto = videos.filter((v) => !v.estreno);
    const combined = [...estrenos, ...sortByInterests(resto, userInterests)];
    return combined.slice(0, 5);
  }, [videos, userInterests]);

  // Continuar viendo: videos con progreso > 0 y < 100
  const contContinuar = filtered.filter((v) => {
    const p = getVideoProgress(v.id);
    return p !== undefined && p > 0 && p < 100;
  });

  // Nuevos: marcados como nuevo
  const contNuevos = filtered.filter((v) => v.nuevo).slice(0, 8);

  // "Para Ti" ordenado por intereses del usuario
  const paraTi = useMemo(() => sortByInterests(videos, userInterests), [videos, userInterests]);

  // Contenido recomendado (de las categorías de intereses que no hayan sido vistos)
  const recomendadosParaTi = useMemo(() => {
    if (!hasInterests) return [];
    const safeWatched = new Set(Array.isArray(watchedVideos) ? watchedVideos : []);
    return videos
      .filter((v) => userInterests.includes(v.categoria) && !safeWatched.has(v.id))
      .slice(0, 8);
  }, [videos, userInterests, watchedVideos, hasInterests]);

  // Filas por categoría en "Para Ti" (agrupadas por interés del usuario primero)
  const categoriaOrdenadas = useMemo(() => {
    if (cats !== null) return []; // solo aplica en tab "para_ti"
    const interestCats = userInterests.filter((i) => availableCategories.includes(i));
    const otherCats = availableCategories.filter((c) => !userInterests.includes(c));
    return [...interestCats, ...otherCats];
  }, [cats, userInterests, availableCategories]);

  const contentByCat: Record<string, Contenido[]> = useMemo(() => {
    const map: Record<string, Contenido[]> = {};
    categoriaOrdenadas.forEach((cat) => {
      map[cat] = videos.filter((v) => v.categoria === cat);
    });
    return map;
  }, [videos, categoriaOrdenadas]);

  const isEmpty = videos.length === 0;

  // ── "Porque viste X…" rows ───────────────────────────────────────────────────
  const safeWatched = Array.isArray(watchedVideos) ? watchedVideos : [];
  const porqueVisteRows: { tag: string; triggerTitle: string; items: Contenido[] }[] = (() => {
    if (safeWatched.length === 0) return [];
    const recentIds = safeWatched.slice(-3).reverse();
    const seen = new Set<string>();
    const rows: { tag: string; triggerTitle: string; items: Contenido[] }[] = [];
    for (const wId of recentIds) {
      const wVideo = videos.find((v) => v.id === wId);
      if (!wVideo) continue;
      const wTags = Array.isArray(wVideo.tags) ? wVideo.tags : [];
      for (const tag of wTags) {
        if (seen.has(tag.toLowerCase())) continue;
        seen.add(tag.toLowerCase());
        const tagVideos = videos.filter(
          (v) => v.id !== wId &&
            (Array.isArray(v.tags) ? v.tags.some((tt) => tt.toLowerCase() === tag.toLowerCase()) : false) ||
            v.categoria.toLowerCase() === tag.toLowerCase()
        ).slice(0, 8);
        if (tagVideos.length >= 2) {
          rows.push({ tag, triggerTitle: wVideo.titulo, items: tagVideos });
          if (rows.length >= 2) break;
        }
      }
      if (rows.length >= 2) break;
    }
    return rows;
  })();

  // Label para un filtro
  const filterLabel = (key: string) => {
    if (key === 'para_ti') return t.inicio.filtro_para_ti;
    return (t.categorias as Record<string, string>)[toCanonicalCategory(key)] ?? key;
  };

  // Avatar del usuario
  const userInitials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'M';

  return (
    <div className="relative bg-[#030309] min-h-full">
      <AuroraBackground intensity="low" />

      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 pt-12 pb-4"
        style={{ background: 'linear-gradient(to bottom, rgba(3,3,9,0.88) 0%, transparent 100%)' }}
      >
        <button onClick={() => navigate('/perfil')} className="relative active:scale-90 transition-transform">
          <AvatarDisplay
            avatarId={user?.avatarId}
            avatarGradient={user?.avatarGradient}
            userName={user?.name || ''}
            size={36}
            showGlow={false}
          />
          <div
            className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              boxShadow: '0 0 6px rgba(245,158,11,0.7)',
            }}
          >
            <span className="text-[7px] font-black text-white leading-none">{levelInfo.level}</span>
          </div>
        </button>

        <MorixLogo height={22} glowIntensity={0.7} />

        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/explorar')} className="active:scale-90 transition-transform">
            <Search size={19} style={{ color: 'rgba(255,255,255,0.7)' }} strokeWidth={1.8} />
          </button>
          <button onClick={() => setShowNotif(true)} className="relative active:scale-90 transition-transform">
            <Bell size={19} style={{ color: 'rgba(255,255,255,0.7)' }} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <div
                className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  boxShadow: '0 0 6px rgba(239,68,68,0.7)',
                }}
              >
                <span className="text-white font-black leading-none" style={{ fontSize: '7px' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Notification panel */}
      <NotificationsPanel open={showNotif} onClose={() => setShowNotif(false)} />

      {/* ── LOADING ── */}
      {contentLoading ? (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-full px-8 text-center pt-32 pb-32">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 rounded-full border-2 border-transparent mb-6"
            style={{ borderTopColor: '#8b5cf6', borderRightColor: 'rgba(139,92,246,0.3)' }}
          />
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {t.inicio.cargando}
          </p>
        </div>

      ) : isEmpty ? (
        /* ── EMPTY STATE ── */
        <div className="relative z-10 flex flex-col items-center justify-center min-h-full px-8 text-center pt-32 pb-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-24 h-24 rounded-[32px] flex items-center justify-center mb-6"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.1))', border: '1px solid rgba(139,92,246,0.25)' }}
          >
            <BookOpen size={40} style={{ color: '#a78bfa' }} strokeWidth={1.5} />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="text-white font-black mb-3" style={{ fontSize: '22px' }}
          >
            {t.inicio.pronto_titulo}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {t.inicio.pronto_desc}
          </motion.p>
        </div>

      ) : (
        <>
          {/* HERO */}
          <HeroCarousel items={heroContent} onPreview={setPreviewItem} />

          {/* STREAK RIBBON */}
          <div className="px-5 mt-4 mb-1">
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-[18px]"
              style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.14), rgba(239,68,68,0.08))', border: '1px solid rgba(249,115,22,0.22)' }}
            >
              <div
                className="w-8 h-8 rounded-[12px] flex items-center justify-center text-sm"
                style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 0 12px rgba(249,115,22,0.55)' }}
              >
                🔥
              </div>
              <div className="flex-1">
                <p className="text-white text-xs font-bold">{streak} {t.inicio.dias_racha}</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {t.progreso.nivel_label} {levelInfo.level} · {levelInfo.currentLevelXP}/{levelInfo.nextLevelXP} XP
                </p>
              </div>
              <button
                onClick={() => navigate('/progreso')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full active:scale-95 transition-transform"
                style={{ background: 'rgba(249,115,22,0.18)', border: '1px solid rgba(249,115,22,0.3)' }}
              >
                <Zap size={11} style={{ color: '#fb923c' }} />
                <span className="text-[10px] font-bold" style={{ color: '#fb923c' }}>{t.inicio.ver}</span>
              </button>
            </motion.div>
          </div>

          {/* CATEGORY FILTER — dinámico según intereses del usuario */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-4 mb-2">
            <HScrollRow gap={8} paddingX={20} style={{ paddingBottom: '4px' }}>
              {filterCats.map((f) => {
                const isActive = activeFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-250 active:scale-95 flex items-center gap-1.5"
                    style={{
                      background: isActive
                        ? f.isInterest
                          ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                          : 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                        : 'rgba(255,255,255,0.06)',
                      border: isActive
                        ? 'none'
                        : f.isInterest
                          ? '1px solid rgba(245,158,11,0.25)'
                          : '1px solid rgba(255,255,255,0.08)',
                      color: isActive ? 'white' : f.isInterest ? 'rgba(245,158,11,0.8)' : 'rgba(255,255,255,0.5)',
                      boxShadow: isActive
                        ? f.isInterest
                          ? '0 0 16px rgba(245,158,11,0.35)'
                          : '0 0 16px rgba(139,92,246,0.4)'
                        : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {/* Punto dorado para intereses del usuario */}
                    {f.isInterest && !isActive && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#f59e0b' }} />
                    )}
                    {filterLabel(f.key)}
                  </button>
                );
              })}
            </HScrollRow>
          </motion.div>

          {/* CONTINUAR VIENDO */}
          {contContinuar.length > 0 && (
            <ContentRow titulo={t.inicio.continuar} contenido={contContinuar} variant="landscape" onVerTodo={() => navigate('/biblioteca')} verTodoLabel={t.inicio.ver_todo} />
          )}

          {/* TOP 10 */}
          {top10Videos.length > 0 && (
            <ContentRow
              titulo={t.inicio.top10}
              contenido={top10Videos}
              variant="top10"
              onVerTodo={() => navigate('/explorar')}
              verTodoLabel={t.inicio.ver_todo}
            />
          )}

          {/* SHORTS ROW */}
          <ShortsRow />

          {/* FILAS DINÁMICAS POR CATEGORÍA (en "para_ti" tab) */}
          {cats === null
            ? categoriaOrdenadas.map((cat, index) => {
                const items = contentByCat[cat];
                if (!items || items.length === 0) return null;
                const isInterestCat = userInterests.includes(cat);
                const catLabel = (t.categorias as Record<string, string>)[toCanonicalCategory(cat)] ?? cat;
                return (
                  <div key={cat}>
                    <ContentRow
                      titulo={isInterestCat ? `⭐ ${catLabel}` : catLabel}
                      contenido={items}
                      onVerTodo={() => navigate('/explorar', { state: { category: cat } })}
                      verTodoLabel={t.inicio.ver_todo}
                    />

                    {/* Insertar Recomendados después de 2 categorías */}
                    {index === 1 && recomendadosParaTi.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 12 }} 
                        whileInView={{ opacity: 1, y: 0 }} 
                        viewport={{ once: true }}
                        className="py-2"
                      >
                        <ContentRow
                          titulo="✨ Recomendado para ti"
                          subtitulo={`Basado en: ${userInterests.slice(0, 3).join(', ')}${userInterests.length > 3 ? '…' : ''}`}
                          contenido={recomendadosParaTi}
                          onVerTodo={() => navigate('/explorar')}
                          verTodoLabel={t.inicio.ver_todo}
                        />
                      </motion.div>
                    )}
                  </div>
                );
              })
            : filtered.length > 0 && (
                <ContentRow titulo={filterLabel(activeFilter)} contenido={filtered} onVerTodo={() => navigate('/explorar')} verTodoLabel={t.inicio.ver_todo} />
              )
          }

          {/* PORQUE VISTE */}
          {cats === null && porqueVisteRows.map(({ tag, triggerTitle, items }) => (
            <div key={tag}>
              <ContentRow
                titulo={`${t.inicio.mas_sobre} ${tag}`}
                subtitulo={`${t.inicio.porque_viste} "${triggerTitle.length > 28 ? triggerTitle.slice(0, 28) + '…' : triggerTitle}"`}
                contenido={items}
                onVerTodo={() => navigate(`/categoria/${encodeURIComponent(tag)}`, { state: { heroTitle: `${t.inicio.mas_sobre} ${tag}` } })}
                verTodoLabel={t.inicio.ver_todo}
              />
            </div>
          ))}

          {/* NUEVOS */}
          {contNuevos.length > 0 && (
            <ContentRow titulo={t.inicio.nuevos} contenido={contNuevos} badge="NUEVO" onVerTodo={() => navigate('/explorar')} verTodoLabel={t.inicio.ver_todo} />
          )}

          {/* Filtro vacío */}
          {filtered.length === 0 && cats !== null && (
            <div className="flex flex-col items-center py-16 px-5 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-white font-bold mb-2">{t.inicio.sin_contenido}</p>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.inicio.sin_cont_sub}</p>
              <button
                onClick={() => setActiveFilter('para_ti')}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
                style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}
              >
                <Sparkles size={12} />
                Ver todo el catálogo
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}