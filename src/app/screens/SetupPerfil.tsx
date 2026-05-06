import { useT } from '../i18n/useT';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { User, Check } from 'lucide-react';
import { AuroraBackground } from '../components/AuroraBackground';
import { AvatarDisplay } from '../components/AvatarDisplay';
import { useAuth } from '../contexts/AuthContext';
import {
  AVATAR_CATALOG, AVATAR_CATEGORIES, getAvatarById,
  GRADIENTS, type AvatarCategory,
} from '../config/avatarCatalog';

export { GRADIENTS };

// Only show level-0 avatars during setup
const SETUP_AVATARS = AVATAR_CATALOG.filter((a) => a.requiredLevel === 0);

export default function SetupPerfil() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  const [name, setName]           = useState('');
  const [bio, setBio]             = useState('');
  const [avatarId, setAvatarId]   = useState('gradient_0');
  const [touched, setTouched]     = useState(false);
  const [activeCat, setActiveCat] = useState<AvatarCategory>('colores');

  const canSubmit = name.trim().length >= 2;
  const selectedAvatar = getAvatarById(avatarId);

  // Categories that have level-0 avatars
  const availableCats = AVATAR_CATEGORIES.filter((cat) =>
    SETUP_AVATARS.some((a) => a.category === cat.key)
  );
  const currentCatAvatars = SETUP_AVATARS.filter((a) => a.category === activeCat);

  const handleSubmit = () => {
    setTouched(true);
    if (!canSubmit) return;

    const gradIdx = avatarId.startsWith('gradient_')
      ? parseInt(avatarId.replace('gradient_', ''), 10)
      : 0;

    updateProfile({
      name: name.trim(),
      bio: bio.trim() || 'Aprendiendo cada día ✨',
      avatarGradient: gradIdx,
      avatarId,
    });

    navigate('/intereses', { replace: true });
  };

  const t = useT();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-y-auto no-scrollbar relative"
      style={{ background: '#030309' }}
    >
      <AuroraBackground intensity="medium" />

      <div className="relative z-10 px-6 pt-14 pb-10">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div key={s} className="h-1 rounded-full transition-all"
                style={{
                  width: s === 1 ? '20px' : '8px',
                  background: s === 1 ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                  boxShadow: s === 1 ? '0 0 8px rgba(139,92,246,0.6)' : 'none',
                }} />
            ))}
          </div>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Paso 1 de 3</span>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-black mb-1.5" style={{
            fontSize: '26px',
            background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Personaliza tu perfil
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Así te verán en la comunidad Morix
          </p>
        </motion.div>

        {/* Avatar preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 14, delay: 0.1 }}
          className="flex flex-col items-center gap-2 mb-7"
        >
          <AvatarDisplay avatarId={avatarId} userName={name} size={96} />
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {selectedAvatar.label}
          </p>
        </motion.div>

        {/* Category tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-3"
        >
          <p className="text-xs font-bold mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>ELIGE TU AVATAR</p>
          <div className="flex flex-nowrap gap-1.5 overflow-x-auto no-scrollbar pb-2" style={{ touchAction: 'pan-x' }}>
            {availableCats.map((cat) => {
              const active = activeCat === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCat(cat.key)}
                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] text-[9px] font-bold transition-all active:scale-95"
                  style={{
                    background: active ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                    border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    color: active ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Avatar grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mb-6"
        >
          <div className="grid grid-cols-4 gap-2">
            {currentCatAvatars.map((avatar) => {
              const isSelected = avatarId === avatar.id;
              return (
                <button
                  key={avatar.id}
                  onClick={() => setAvatarId(avatar.id)}
                  className="relative flex flex-col items-center gap-1 py-2 rounded-[14px] transition-all active:scale-90"
                  style={{
                    background: isSelected ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
                    border: isSelected ? '2px solid rgba(139,92,246,0.5)' : '2px solid transparent',
                    boxShadow: isSelected ? `0 0 14px ${avatar.bg.from}50` : 'none',
                  }}
                >
                  <AvatarDisplay avatarId={avatar.id} userName={name} size={40} showGlow={false} />
                  <span className="text-[7px] font-bold text-center leading-tight px-0.5"
                    style={{ color: isSelected ? '#c4b5fd' : 'rgba(255,255,255,0.35)' }}>
                    {avatar.label}
                  </span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #4f46e5)' }}
                    >
                      <Check size={9} className="text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Name field */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <label className="text-xs font-bold mb-2 block" style={{ color: 'rgba(255,255,255,0.5)' }}>
            NOMBRE *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="¿Cómo te llamamos?"
            maxLength={40}
            autoComplete="name"
            className="w-full py-3.5 px-4 rounded-[16px] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: touched && !canSubmit
                ? '1.5px solid rgba(239,68,68,0.5)'
                : name.trim().length >= 2
                ? '1.5px solid rgba(34,197,94,0.4)'
                : '1.5px solid rgba(255,255,255,0.08)',
            }}
          />
          {touched && !canSubmit && (
            <p className="text-[11px] mt-1.5" style={{ color: '#ef4444' }}>
              El nombre debe tener al menos 2 caracteres
            </p>
          )}
        </motion.div>

        {/* Bio field */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <label className="text-xs font-bold mb-2 block" style={{ color: 'rgba(255,255,255,0.5)' }}>
            BIO (opcional)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Cuéntanos algo sobre ti…"
            rows={2}
            maxLength={80}
            className="w-full py-3 px-4 rounded-[16px] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] outline-none resize-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid rgba(255,255,255,0.08)',
            }}
          />
          <p className="text-right text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {bio.length}/80
          </p>
        </motion.div>

        {/* User email display */}
        {user?.email && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 px-4 py-3 rounded-[14px] mb-8"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.2)' }}>
              <span style={{ fontSize: '10px' }}>@</span>
            </div>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{user.email}</p>
          </motion.div>
        )}

        {/* CTA */}
        <motion.button
          onClick={handleSubmit}
          whileTap={{ scale: canSubmit ? 0.97 : 1 }}
          className="relative w-full py-4 rounded-[20px] font-black text-sm tracking-wide overflow-hidden transition-all"
          style={{
            background: canSubmit
              ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)'
              : 'rgba(255,255,255,0.07)',
            color: canSubmit ? 'white' : 'rgba(255,255,255,0.3)',
            boxShadow: canSubmit ? '0 0 28px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
          }}
        >
          {t.setup.continuar}
        </motion.button>
      </div>
    </motion.div>
  );
}