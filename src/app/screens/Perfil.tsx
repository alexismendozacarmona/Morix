import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp, Heart, Crown, Bell, ChevronRight, Zap, ListMusic,
  Edit3, Shield, Settings, LogOut, Check, X, User, Lock, Eye, EyeOff,
  ShieldAlert, LifeBuoy
} from 'lucide-react';
import { AuroraBackground } from '../components/AuroraBackground';
import { AvatarDisplay } from '../components/AvatarDisplay';
import { useUserProgress } from '../contexts/UserProgressContext';
import { useAuth } from '../contexts/AuthContext';
import { isAdminEmail } from '../config/adminConfig';
import { ConfiguracionModal } from '../components/ConfiguracionModal';
import { NotificationsPanel } from '../components/NotificationsPanel';
import { PrivacidadModal } from '../components/PrivacidadModal';
import { SoporteModal } from '../components/SoporteModal';
import { useNotifications } from '../contexts/NotificationsContext';
import { useT } from '../i18n/useT';
import {
  AVATAR_CATALOG, AVATAR_CATEGORIES, getAvatarById, getAvailableAvatars,
  GRADIENTS, type AvatarCategory,
} from '../config/avatarCatalog';

// ─── Persistence ────────────────────────────────────────────────────────────
const STORAGE_KEY = 'morix_profile_v2';

interface ProfileData {
  name: string;
  bio: string;
  avatarId: string;
  avatarGradient: number; // kept for backward compat
}

const DEFAULT_PROFILE: ProfileData = {
  name: '',
  bio: 'Aprendiendo cada día ✨',
  avatarId: 'gradient_0',
  avatarGradient: 0,
};

export { GRADIENTS };

function loadProfile(): ProfileData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
      // Migrate old profiles that don't have avatarId
      if (!parsed.avatarId && parsed.avatarGradient !== undefined) {
        parsed.avatarId = `gradient_${parsed.avatarGradient}`;
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_PROFILE };
}

function saveProfile(data: ProfileData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save profile:', e);
  }
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditProfileModal({
  profile, onSave, onClose, userLevel,
}: {
  profile: ProfileData;
  onSave: (p: ProfileData) => void;
  onClose: () => void;
  userLevel: number;
}) {
  const [draft, setDraft] = useState<ProfileData>({ ...profile });
  const [tab, setTab] = useState<'info' | 'avatar' | 'password'>('info');
  const [avatarCat, setAvatarCat] = useState<AvatarCategory>('colores');
  const t = useT();
  const tx = t.perfil_extra;
  const { changePassword } = useAuth();

  // Password tab state
  const [currentPw,   setCurrentPw]   = useState('');
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading,   setPwLoading]   = useState(false);
  const [pwError,     setPwError]     = useState('');
  const [pwSuccess,   setPwSuccess]   = useState(false);

  function calcStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8)           score++;
    if (/[A-Z]/.test(pw))        score++;
    if (/[0-9]/.test(pw))        score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: 'Débil',  color: '#f43f5e' };
    if (score === 2) return { level: 2, label: 'Media',  color: '#f59e0b' };
    return                { level: 3, label: 'Fuerte', color: '#22c55e' };
  }
  const strength = calcStrength(newPw);

  const handleSavePassword = async () => {
    setPwError('');
    if (!currentPw)          { setPwError('Ingresa tu contraseña actual.'); return; }
    if (strength.level < 2)  { setPwError('La contraseña nueva es muy débil.'); return; }
    if (newPw !== confirmPw) { setPwError('Las contraseñas nuevas no coinciden.'); return; }
    if (newPw === currentPw) { setPwError('La nueva contraseña debe ser diferente.'); return; }
    setPwLoading(true);
    const result = await changePassword(currentPw, newPw);
    setPwLoading(false);
    if (!result.ok) { setPwError(result.error); return; }
    setPwSuccess(true);
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setTimeout(() => setPwSuccess(false), 3000);
  };

  const handleSave = () => {
    if (!draft.name.trim()) return;
    onSave(draft);
    onClose();
  };

  // Avatar helpers
  const available = getAvailableAvatars(userLevel);
  const availableIds = new Set(available.map((a) => a.id));
  const categoryAvatars = AVATAR_CATALOG.filter((a) => a.category === avatarCat);

  const phoneFrame = document.getElementById('phone-frame');
  if (!phoneFrame) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-end justify-end"
      style={{ background: 'rgba(3,3,9,0.78)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', zIndex: 200 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        className="w-full rounded-t-[32px] flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #0e0e22 0%, #080817 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderBottom: 'none',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <X size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />
          </button>
          <h3 className="text-white font-black text-[15px]">{tx.editar_titulo}</h3>
          {tab !== 'password' ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full"
              style={{
                background: draft.name.trim() ? 'linear-gradient(135deg, #8b5cf6, #4f46e5)' : 'rgba(255,255,255,0.07)',
                boxShadow: draft.name.trim() ? '0 0 16px rgba(139,92,246,0.5)' : 'none',
                opacity: draft.name.trim() ? 1 : 0.4,
              }}
            >
              <Check size={13} className="text-white" />
              <span className="text-white text-[11px] font-black">{tx.guardar}</span>
            </motion.button>
          ) : (
            <div className="w-[62px]" />
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 pt-4 pb-2 flex-shrink-0">
          {(['info', 'avatar', 'password'] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => { setTab(tabKey); setPwError(''); setPwSuccess(false); }}
              className="flex-1 py-2 rounded-[14px] text-[10px] font-bold transition-all active:scale-95"
              style={{
                background: tab === tabKey ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.04)',
                border: tab === tabKey ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.06)',
                color: tab === tabKey ? '#c4b5fd' : 'rgba(255,255,255,0.35)',
              }}
            >
              {tabKey === 'info' ? tx.tab_info : tabKey === 'avatar' ? tx.tab_avatar : 'Clave'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-10">
          <AnimatePresence mode="wait">

            {/* ── INFO TAB ── */}
            {tab === 'info' && (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 14 }}
                transition={{ duration: 0.16 }}
                className="flex flex-col gap-5 pt-3"
              >
                {/* Avatar preview + change */}
                <div className="flex flex-col items-center gap-3">
                  <AvatarDisplay avatarId={draft.avatarId} userName={draft.name} size={80} />
                  <button
                    onClick={() => setTab('avatar')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold active:scale-90 transition-transform"
                    style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.28)', color: '#a78bfa' }}
                  >
                    <Edit3 size={11} />
                    {tx.cambiar_avatar}
                  </button>
                </div>

                {/* Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {tx.nombre_label}
                  </label>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    maxLength={40}
                    placeholder={tx.nombre_ph}
                    className="w-full px-4 py-3.5 rounded-[16px] text-white text-[14px] font-semibold outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: draft.name.trim() ? '1.5px solid rgba(139,92,246,0.45)' : '1.5px solid rgba(244,63,94,0.45)',
                      caretColor: '#a78bfa',
                    }}
                  />
                  {!draft.name.trim() && (
                    <p className="text-[10px]" style={{ color: '#f43f5e' }}>{tx.nombre_error}</p>
                  )}
                </div>

                {/* Bio */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {tx.bio_label}
                  </label>
                  <textarea
                    value={draft.bio}
                    onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                    maxLength={80}
                    rows={3}
                    placeholder={tx.bio_ph}
                    className="w-full px-4 py-3 rounded-[16px] text-[13px] outline-none resize-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1.5px solid rgba(255,255,255,0.09)',
                      caretColor: '#a78bfa',
                      color: 'rgba(255,255,255,0.85)',
                    }}
                  />
                  <p className="text-[10px] text-right" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {draft.bio.length}/80
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── AVATAR TAB ── */}
            {tab === 'avatar' && (
              <motion.div
                key="avatar"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.16 }}
                className="flex flex-col gap-4 pt-3"
              >
                {/* Preview */}
                <div className="flex flex-col items-center gap-2">
                  <AvatarDisplay avatarId={draft.avatarId} userName={draft.name} size={90} />
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {getAvatarById(draft.avatarId).label}
                  </p>
                </div>

                {/* Category tabs (horizontal scroll) */}
                <div className="flex flex-nowrap gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1" style={{ touchAction: 'pan-x' }}>
                  {AVATAR_CATEGORIES.map((cat) => {
                    const active = avatarCat === cat.key;
                    const catAvatars = AVATAR_CATALOG.filter((a) => a.category === cat.key);
                    const unlockedCount = catAvatars.filter((a) => availableIds.has(a.id)).length;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setAvatarCat(cat.key)}
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-[12px] text-[9px] font-bold transition-all active:scale-95"
                        style={{
                          background: active ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                          border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.06)',
                          color: active ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                        <span
                          className="px-1 py-0.5 rounded-full text-[7px] font-black"
                          style={{
                            background: active ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)',
                            color: active ? '#e9d5ff' : 'rgba(255,255,255,0.25)',
                          }}
                        >
                          {unlockedCount}/{catAvatars.length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Avatar grid */}
                <div className="grid grid-cols-4 gap-2.5">
                  {categoryAvatars.map((avatar) => {
                    const isUnlocked = availableIds.has(avatar.id);
                    const isSelected = draft.avatarId === avatar.id;

                    return (
                      <motion.button
                        key={avatar.id}
                        whileTap={isUnlocked ? { scale: 0.9 } : undefined}
                        onClick={() => {
                          if (!isUnlocked) return;
                          const gradIdx = avatar.id.startsWith('gradient_')
                            ? parseInt(avatar.id.replace('gradient_', ''), 10)
                            : draft.avatarGradient;
                          setDraft((d) => ({ ...d, avatarId: avatar.id, avatarGradient: gradIdx }));
                        }}
                        className="flex flex-col items-center gap-1 py-2 rounded-[16px] transition-all"
                        style={{
                          background: isSelected
                            ? 'rgba(139,92,246,0.15)'
                            : 'rgba(255,255,255,0.02)',
                          border: isSelected
                            ? '2px solid rgba(139,92,246,0.5)'
                            : '2px solid rgba(255,255,255,0.04)',
                          boxShadow: isSelected
                            ? `0 0 16px ${avatar.bg.from}50`
                            : 'none',
                          opacity: isUnlocked ? 1 : 0.6,
                          cursor: isUnlocked ? 'pointer' : 'default',
                        }}
                      >
                        <AvatarDisplay
                          avatarId={avatar.id}
                          userName={draft.name}
                          size={44}
                          locked={!isUnlocked}
                          requiredLevel={avatar.requiredLevel}
                          showGlow={false}
                        />
                        <span
                          className="text-[8px] font-bold text-center leading-tight px-0.5"
                          style={{
                            color: isSelected ? '#c4b5fd' : isUnlocked ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
                          }}
                        >
                          {avatar.label}
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #8b5cf6, #4f46e5)' }}
                          >
                            <Check size={9} className="text-white" strokeWidth={3} />
                          </motion.div>
                        )}
                        {!isUnlocked && (
                          <span className="text-[7px] font-black" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            🔒 Nv.{avatar.requiredLevel}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Level hint */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[14px]"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  <span className="text-sm">💡</span>
                  <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Tu nivel actual: <strong className="text-white">Nv. {userLevel}</strong> · Sube de nivel para desbloquear más avatares exclusivos
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── PASSWORD TAB ── */}
            {tab === 'password' && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.16 }}
                className="flex flex-col gap-5 pt-4"
              >
                {/* Icon header */}
                <div className="flex flex-col items-center gap-2 pb-1">
                  <div
                    className="w-14 h-14 rounded-[20px] flex items-center justify-center"
                    style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', boxShadow: '0 0 24px rgba(139,92,246,0.15)' }}
                  >
                    <Lock size={24} style={{ color: '#a78bfa' }} />
                  </div>
                  <p className="text-[10px] text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Tu contraseña se actualizará en Supabase de forma inmediata.
                  </p>
                </div>

                {/* Success banner */}
                <AnimatePresence>
                  {pwSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-[16px]"
                      style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}
                    >
                      <Check size={15} style={{ color: '#22c55e' }} />
                      <span className="text-[12px] font-bold" style={{ color: '#22c55e' }}>
                        ¡Contraseña actualizada con éxito!
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Contraseña actual */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Contraseña actual
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPw}
                      onChange={(e) => { setCurrentPw(e.target.value); setPwError(''); }}
                      placeholder="••••••••"
                      className="w-full px-4 py-3.5 pr-11 rounded-[16px] text-white text-[14px] outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1.5px solid rgba(255,255,255,0.09)',
                        caretColor: '#a78bfa',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 active:scale-90 transition-transform"
                    >
                      {showCurrent
                        ? <EyeOff size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
                        : <Eye    size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                    </button>
                  </div>
                </div>

                {/* Nueva contraseña */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPw}
                      onChange={(e) => { setNewPw(e.target.value); setPwError(''); }}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full px-4 py-3.5 pr-11 rounded-[16px] text-white text-[14px] outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: `1.5px solid ${newPw ? strength.color + '60' : 'rgba(255,255,255,0.09)'}`,
                        caretColor: '#a78bfa',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 active:scale-90 transition-transform"
                    >
                      {showNew
                        ? <EyeOff size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
                        : <Eye    size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {newPw.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((lvl) => (
                          <div
                            key={lvl}
                            className="flex-1 h-1 rounded-full transition-all duration-300"
                            style={{ background: strength.level >= lvl ? strength.color : 'rgba(255,255,255,0.1)' }}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] font-bold" style={{ color: strength.color }}>
                        {strength.label}
                        {strength.level < 2 && ' · Usa mayúsculas, números o símbolos'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirmar contraseña */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPw}
                      onChange={(e) => { setConfirmPw(e.target.value); setPwError(''); }}
                      placeholder="Repite la nueva contraseña"
                      className="w-full px-4 py-3.5 pr-11 rounded-[16px] text-white text-[14px] outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: confirmPw
                          ? `1.5px solid ${confirmPw === newPw ? 'rgba(34,197,94,0.5)' : 'rgba(244,63,94,0.5)'}`
                          : '1.5px solid rgba(255,255,255,0.09)',
                        caretColor: '#a78bfa',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 active:scale-90 transition-transform"
                    >
                      {showConfirm
                        ? <EyeOff size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
                        : <Eye    size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                    </button>
                  </div>
                  {confirmPw && confirmPw !== newPw && (
                    <p className="text-[10px]" style={{ color: '#f43f5e' }}>Las contraseñas no coinciden</p>
                  )}
                  {confirmPw && confirmPw === newPw && (
                    <p className="text-[10px]" style={{ color: '#22c55e' }}>Las contraseñas coinciden ✓</p>
                  )}
                </div>

                {/* Error */}
                <AnimatePresence>
                  {pwError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 px-4 py-3 rounded-[14px]"
                      style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)' }}
                    >
                      <X size={13} style={{ color: '#f43f5e' }} />
                      <p className="text-[11px] font-semibold" style={{ color: '#f43f5e' }}>{pwError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Botón guardar */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSavePassword}
                  disabled={pwLoading || !currentPw || strength.level < 2 || newPw !== confirmPw}
                  className="w-full py-4 rounded-[20px] flex items-center justify-center gap-2.5 transition-all"
                  style={{
                    background: (!currentPw || strength.level < 2 || newPw !== confirmPw)
                      ? 'rgba(255,255,255,0.06)'
                      : 'linear-gradient(135deg, #8b5cf6, #4f46e5)',
                    opacity: (!currentPw || strength.level < 2 || newPw !== confirmPw) ? 0.5 : 1,
                    boxShadow: (!currentPw || strength.level < 2 || newPw !== confirmPw)
                      ? 'none'
                      : '0 0 24px rgba(139,92,246,0.45)',
                  }}
                >
                  {pwLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                      className="w-5 h-5 rounded-full border-2 border-transparent"
                      style={{ borderTopColor: '#fff', borderRightColor: '#fff' }}
                    />
                  ) : (
                    <>
                      <Lock size={15} className="text-white" />
                      <span className="text-white text-[13px] font-black">Actualizar contraseña</span>
                    </>
                  )}
                </motion.button>

                <p className="text-center text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Tu contraseña se guarda de forma segura y se actualiza en tu cuenta de Morix al instante.
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>,
    phoneFrame
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function Perfil() {
  const navigate = useNavigate();
  const { levelInfo, streak, totalXP, totalVideosWatched, daysActive, savedVideos } = useUserProgress();
  const { user, logout, updateProfile } = useAuth();
  const t = useT();
  const tp = t.perfil;
  const tx = t.perfil_extra;

  const [profile, setProfile] = useState<ProfileData>(() => {
    const stored = loadProfile();
    if (stored.name === DEFAULT_PROFILE.name && user?.name) {
      return {
        ...stored,
        name: user.name,
        bio: user.bio || stored.bio,
        avatarGradient: user.avatarGradient,
        avatarId: user.avatarId || `gradient_${user.avatarGradient}`,
      };
    }
    return stored;
  });
  const [editOpen,        setEditOpen]        = useState(false);
  const [showConfig,      setShowConfig]      = useState(false);
  const [showPrivacidad,  setShowPrivacidad]  = useState(false);
  const [showNotifs,      setShowNotifs]      = useState(false);
  const [showSoporte,     setShowSoporte]     = useState(false);

  const { unreadCount } = useNotifications();

  const handleSave = (updated: ProfileData) => {
    setProfile(updated);
    saveProfile(updated);
    // Sync name, bio, avatarGradient, avatarId to AuthContext → Supabase
    updateProfile({
      name:           updated.name,
      bio:            updated.bio,
      avatarGradient: updated.avatarGradient,
      avatarId:       updated.avatarId,
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const currentAvatar = getAvatarById(profile.avatarId);
  const g = currentAvatar.bg;

  const planLabel = user?.plan === 'trial'
    ? tp.premium_trial
    : user?.plan === 'premium'
    ? tp.premium
    : tp.plan_free;

  const planColor = user?.plan === 'free' || !user
    ? { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' }
    : { color: '#a78bfa', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)' };

  const menuItems = [
    { icon: TrendingUp, label: tp.mi_progreso,    sub: tx.sub_prog.replace('{n}', String(levelInfo.level)).replace('{xp}', totalXP.toLocaleString()), path: '/progreso',    color: '#8b5cf6', action: null },
    { icon: Heart,      label: tp.favoritos,      sub: tx.sub_fav.replace('{n}', String(savedVideos.length)),                path: '/biblioteca',  color: '#f43f5e', action: null },
    { icon: ListMusic,  label: 'Mis Playlists',   sub: 'Tu colección de listas',                                            path: '/playlists',   color: '#06b6d4', action: null },
    { icon: Crown,      label: tp.suscripcion,    sub: `${planLabel} · ${user?.plan === 'free' || !user ? tp.mejorar : tp.gestionar}`, path: '/suscripcion', color: '#f59e0b', action: null },
    { icon: Bell,       label: tp.notificaciones, sub: tx.sub_notif.replace('{n}', String(unreadCount)),                                      path: null,           color: '#3b82f6', action: () => setShowNotifs(true) },
    { icon: LifeBuoy,   label: 'Soporte y Ayuda', sub: 'Preguntas frecuentes y contacto',                               path: null,           color: '#0ea5e9', action: () => setShowSoporte(true) },
    { icon: Shield,     label: tp.privacidad,     sub: tx.sub_priv,                                                           path: null,           color: '#10b981', action: () => setShowPrivacidad(true) },
    { icon: Settings,   label: tp.configuracion,  sub: tx.sub_config,                                                         path: null,           color: '#64748b', action: () => setShowConfig(true) },
  ];

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative bg-[#030309] min-h-full">
        <AuroraBackground intensity="medium" />

        {/* HERO */}
        <div className="relative overflow-hidden pt-14 pb-7">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-44 pointer-events-none"
            style={{ background: `radial-gradient(circle, ${g.from}45, transparent 70%)`, filter: 'blur(30px)' }}
          />
          <div className="relative z-10 flex flex-col items-center px-5">

            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 14, stiffness: 200 }}
              className="relative mb-4"
            >
              <AvatarDisplay avatarId={profile.avatarId} userName={profile.name} size={88} />
              <div
                className="absolute -bottom-1 -right-1 flex items-center gap-1 px-2 py-1 rounded-full"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 14px rgba(245,158,11,0.6)' }}
              >
                <Crown size={9} className="text-white" />
                <span className="text-[9px] font-black text-white">{levelInfo.level}</span>
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: 'rgba(139,92,246,0.9)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.2)', boxShadow: '0 0 12px rgba(139,92,246,0.7)' }}
              >
                <Edit3 size={11} className="text-white" />
              </button>
            </motion.div>

            {/* Name + bio */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-center"
            >
              <div className="flex items-center gap-2 justify-center mb-1">
                <h2 className="text-white font-black text-xl">{profile.name || user?.name || 'Sin nombre'}</h2>
                <button onClick={() => setEditOpen(true)} className="active:scale-90 transition-transform">
                  <Edit3 size={13} style={{ color: 'rgba(255,255,255,0.22)' }} />
                </button>
              </div>
              {profile.bio && (
                <p className="text-[11px] mb-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {profile.bio}
                </p>
              )}
              {user?.email && (
                <p className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {user.email}
                </p>
              )}
              <div
                className="inline-flex items-center gap-1.5 justify-center mb-5 px-3 py-1 rounded-full"
                style={{ background: planColor.bg, border: `1px solid ${planColor.border}` }}
              >
                <Crown size={11} style={{ color: planColor.color }} />
                <span className="text-[11px] font-bold" style={{ color: planColor.color }}>{planLabel}</span>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-8 mb-5 w-full justify-center"
            >
              {[
                { label: tx.videos,     value: totalVideosWatched },
                { label: tx.dias_activo, value: daysActive.size },
                { label: tx.racha,       value: `${streak}🔥` },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.07 }} className="flex flex-col items-center gap-0.5">
                  <span className="text-white font-black text-lg leading-none">{s.value}</span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* XP bar */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full rounded-[20px] p-3.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Zap size={12} style={{ color: '#a78bfa' }} />
                  <span className="text-[11px] font-bold text-white">{levelInfo.currentLevelXP} XP</span>
                </div>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Nv. {levelInfo.level + 1} → {levelInfo.nextLevelXP} XP
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo.pct * 100}%` }}
                  transition={{ duration: 1.1, ease: 'easeOut', delay: 0.4 }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(to right, ${g.from}, #60a5fa)`, boxShadow: `0 0 10px ${g.from}b0` }}
                />
              </div>
            </motion.div>
          </div>
        </div>

        <div className="relative z-10 px-5 pb-4">
          {/* Premium CTA */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            onClick={() => navigate('/suscripcion')}
            className="relative w-full py-4 px-5 rounded-[22px] flex items-center gap-3 overflow-hidden active:scale-[0.97] transition-transform mb-4"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(139,92,246,0.13))', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 0 30px rgba(245,158,11,0.08)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12), transparent)' }} />
            <div className="w-9 h-9 rounded-[14px] flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 16px rgba(245,158,11,0.5)' }}>
              <Crown size={17} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white text-xs font-bold">{tx.actualizar}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{tx.acceso_ilimitado}</p>
            </div>
            <ChevronRight size={16} style={{ color: '#f59e0b' }} />
          </motion.button>

          {/* Menu items */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-[24px] overflow-hidden mb-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}
          >
            {menuItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.action) { item.action(); return; }
                    if (item.path) navigate(item.path);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-4 active:opacity-60 transition-opacity"
                  style={{ borderBottom: i < menuItems.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                >
                  <div className="w-9 h-9 rounded-[13px] flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}14` }}>
                    <Icon size={16} style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white text-xs font-semibold">{item.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.sub}</p>
                  </div>
                  <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                </button>
              );
            })}
          </motion.div>

          {/* Edit profile button */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            onClick={() => setEditOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-[22px] active:scale-[0.97] transition-transform mb-3"
            style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)' }}
          >
            <div className="w-9 h-9 rounded-[13px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
              <User size={16} style={{ color: '#a78bfa' }} />
            </div>
            <span className="flex-1 text-left text-xs font-semibold" style={{ color: '#a78bfa' }}>{tx.editar_perfil}</span>
            <ChevronRight size={14} style={{ color: 'rgba(139,92,246,0.4)' }} />
          </motion.button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-[22px] active:opacity-60 transition-opacity mb-4"
            style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.15)' }}
          >
            <div className="w-9 h-9 rounded-[13px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(244,63,94,0.15)' }}>
              <LogOut size={16} style={{ color: '#f43f5e' }} />
            </div>
            <span className="flex-1 text-left text-xs font-semibold" style={{ color: '#f43f5e' }}>{tx.cerrar_sesion}</span>
            <ChevronRight size={14} style={{ color: 'rgba(244,63,94,0.4)' }} />
          </button>

          {/* Admin panel */}
          {user && isAdminEmail(user.email) && (
            <motion.button
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-[22px] active:scale-98 transition-all mb-4"
              style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}
            >
              <div className="w-9 h-9 rounded-[13px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(99,102,241,0.2))', border: '1px solid rgba(139,92,246,0.3)' }}>
                <Shield size={16} style={{ color: '#a78bfa' }} />
              </div>
              <div className="flex-1 text-left">
                <span className="block text-xs font-black" style={{ color: '#a78bfa' }}>{tx.panel_admin}</span>
                <span className="block text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{tx.gestionar_cont}</span>
              </div>
              <div className="px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}>
                <span className="text-[9px] font-black" style={{ color: '#a78bfa' }}>ADMIN</span>
              </div>
            </motion.button>
          )}


        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {editOpen && (
          <EditProfileModal
            key="edit"
            profile={profile}
            onSave={handleSave}
            onClose={() => setEditOpen(false)}
            userLevel={levelInfo.level}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showConfig && (
          <ConfiguracionModal key="config" onClose={() => setShowConfig(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPrivacidad && (
          <PrivacidadModal
            key="privacidad"
            onClose={() => setShowPrivacidad(false)}
            onDeleteAccount={() => { logout(); navigate('/', { replace: true }); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSoporte && (
          <SoporteModal key="soporte" onClose={() => setShowSoporte(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showNotifs && (
          <NotificationsPanel key="notifs" open={showNotifs} onClose={() => setShowNotifs(false)} />
        )}
      </AnimatePresence>
    </>
  );
}