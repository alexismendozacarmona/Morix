import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Check, History,
  Trash2, AlertTriangle, Shield, FileText,
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import type { PrivacySettings } from '../contexts/SettingsContext';
import { useUserProgress } from '../contexts/UserProgressContext';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../i18n/useT';
import { playToggle, playSave } from '../utils/uiSound';
import { LegalModal } from './LegalModal';

export type { PrivacySettings };

const LS_HISTORY = 'morix_watch_history_v1';

/* ─── SectionLabel ───────────────────────────────────────────────────────── */
function SectionLabel({ label }: { label: string }) {
  return (
    <p
      className="text-[10px] font-black tracking-widest px-1 mb-2 mt-5"
      style={{ color: 'rgba(255,255,255,0.3)' }}
    >
      {label}
    </p>
  );
}

/* ─── SettingRow ─────────────────────────────────────────────────────────── */
function SettingRow({
  icon, label, sub, children, danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] font-semibold leading-tight"
          style={{ color: danger ? '#f87171' : 'white' }}
        >
          {label}
        </p>
        {sub && (
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {sub}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

/* ─── Toggle ─────────────────────────────────────────────────────────────── */
function Toggle({
  value, onChange, color = '#10b981', soundEnabled = true,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
  soundEnabled?: boolean;
}) {
  const handleClick = () => {
    const next = !value;
    if (soundEnabled) playToggle(next);
    onChange(next);
  };

  return (
    <button
      onClick={handleClick}
      className="relative flex-shrink-0"
      style={{ width: 42, height: 24 }}
    >
      <div
        className="absolute inset-0 rounded-full transition-all duration-200"
        style={{
          background: value
            ? `linear-gradient(135deg, ${color}, ${color}cc)`
            : 'rgba(255,255,255,0.1)',
          boxShadow: value ? `0 0 10px ${color}60` : 'none',
        }}
      />
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
      />
    </button>
  );
}

/* ─── ConfirmDialog ──────────────────────────────────────────────────────── */
function ConfirmDialog({
  title, body, confirmLabel, cancelLabel, onConfirm, onCancel, danger = true,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center px-7"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 120 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.88, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[300px] rounded-[24px] p-5"
        style={{
          background: 'rgba(12,9,28,0.99)',
          border: `1px solid ${danger ? 'rgba(239,68,68,0.3)' : 'rgba(139,92,246,0.3)'}`,
        }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(139,92,246,0.12)',
              border:     danger ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(139,92,246,0.3)',
            }}
          >
            <AlertTriangle size={20} style={{ color: danger ? '#ef4444' : '#a78bfa' }} />
          </div>
          <p className="text-white font-black text-[15px]">{title}</p>
          <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {body}
          </p>
          <div className="flex gap-3 w-full mt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-[12px] text-sm font-bold active:scale-95 transition-transform"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-[12px] text-sm font-bold active:scale-95 transition-transform"
              style={{
                background: danger ? 'rgba(239,68,68,0.18)' : 'rgba(139,92,246,0.18)',
                border:     danger ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(139,92,246,0.4)',
                color:      danger ? '#f87171' : '#c4b5fd',
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main modal ─────────────────────────────────────────────────────────── */
interface Props {
  onClose:          () => void;
  onDeleteAccount?: () => void;
}

export function PrivacidadModal({ onClose, onDeleteAccount }: Props) {
  const { privacySettings, updatePrivacySettings, appSettings } = useSettings();
  const { clearWatchHistory, watchHistory, totalXP, streak, totalVideosWatched, savedVideos, categoryStats } = useUserProgress();
  const { user, deleteAccount } = useAuth();
  const t = useT();
  const p = t.privacy;

  const [draft,        setDraft]        = useState<PrivacySettings>({ ...privacySettings });
  const [saved,        setSaved]        = useState(false);
  const [dirty,        setDirty]        = useState(false);
  const [confirm,      setConfirm]      = useState<'history' | 'account' | null>(null);
  const [historyClear, setHistoryClear] = useState(false);
  const [deletingAcct, setDeletingAcct] = useState(false);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);
  const [legalType,    setLegalType]    = useState<'terms' | 'privacy' | null>(null);

  const update = useCallback(<K extends keyof PrivacySettings>(key: K, val: PrivacySettings[K]) => {
    if (appSettings.sonidosUI) playToggle(Boolean(val));
    setDraft((s) => ({ ...s, [key]: val }));
    setDirty(true);
  }, [appSettings.sonidosUI]);

  const handleSave = () => {
    updatePrivacySettings(draft);
    if (appSettings.sonidosUI) playSave();
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const handleClearHistory = () => {
    // Limpiar en memoria + localStorage (namespaced por userId) + Supabase
    clearWatchHistory();
    // También limpiar la clave legacy por si acaso
    try { localStorage.removeItem(LS_HISTORY); } catch { /* ignore */ }
    setHistoryClear(true);
    setConfirm(null);
    setTimeout(() => setHistoryClear(false), 2200);
  };



  const handleDeleteAccount = async () => {
    setConfirm(null);
    setDeletingAcct(true);
    setDeleteError(null);
    try {
      const result = await deleteAccount();
      if (result.ok) {
        onDeleteAccount?.();
        onClose();
      } else {
        setDeleteError(result.error ?? 'Error al eliminar la cuenta.');
      }
    } catch (err) {
      console.error('[PrivacidadModal] deleteAccount error:', err);
      setDeleteError('Error inesperado. Intenta de nuevo.');
    } finally {
      setDeletingAcct(false);
    }
  };

  const portal = document.getElementById('phone-frame');
  if (!portal) return null;

  return createPortal(
    <motion.div
      className="absolute inset-0 flex flex-col"
      style={{
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        zIndex: 110, // ✅ Por encima del BottomNav (z-100)
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="absolute bottom-0 left-0 right-0 flex flex-col rounded-t-[28px] overflow-hidden"
        style={{
          maxHeight: '90%',
          background: 'linear-gradient(180deg, rgba(10,8,25,0.99) 0%, rgba(6,5,18,1) 100%)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderBottom: 'none',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
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
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <Shield size={15} style={{ color: '#10b981' }} />
            </div>
            <p className="text-white font-black text-[15px]">{p.title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            <X size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 overflow-y-auto px-5 pb-4"
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Datos */}
          <SectionLabel label={p.s_datos} />
          <div
            className="rounded-[20px] overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <SettingRow
              icon={<History size={15} style={{ color: '#06b6d4' }} />}
              label={p.historial}
              sub={p.historial_sub}
            >
              <Toggle
                value={draft.historialActivo}
                onChange={(v) => update('historialActivo', v)}
                color="#06b6d4"
                soundEnabled={false}
              />
            </SettingRow>
          </div>

          {/* Acciones */}
          <SectionLabel label={p.s_acciones} />
          <div
            className="rounded-[20px] overflow-hidden mb-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-3">
                <History size={15} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-white">{p.borrar_hist}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {p.borrar_hist_sub}
                  </p>
                </div>
                <AnimatePresence mode="wait">
                  {historyClear ? (
                    <motion.div
                      key="ok"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
                    >
                      <Check size={11} style={{ color: '#10b981' }} />
                      <span className="text-[10px] font-bold" style={{ color: '#10b981' }}>
                        {p.listo}
                      </span>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="btn"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setConfirm('history')}
                      className="px-3 py-1.5 rounded-[10px] text-[11px] font-bold active:scale-95 transition-transform"
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        color: '#f87171',
                      }}
                    >
                      {p.borrar_btn}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* --- Docs --- */}
          <SectionLabel label="DOCUMENTACIÓN LEGAL" />
          <div className="flex flex-col gap-2 mb-4">
            <button
              onClick={() => setLegalType('terms')}
              className="w-full flex justify-between items-center px-4 py-3.5 rounded-[16px] active:scale-[0.98] transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-3">
                <FileText size={15} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-[13px] font-semibold text-white">Términos de Servicio y EULA</span>
              </div>
            </button>
            <button
              onClick={() => setLegalType('privacy')}
              className="w-full flex justify-between items-center px-4 py-3.5 rounded-[16px] active:scale-[0.98] transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-3">
                <Shield size={15} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-[13px] font-semibold text-white">Política de Privacidad</span>
              </div>
            </button>
          </div>

          {/* Danger zone */}
          <SectionLabel label={p.s_peligro} />

          {/* Error al eliminar */}
          <AnimatePresence>
            {deleteError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-[12px] mb-3"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <AlertTriangle size={13} style={{ color: '#f87171' }} />
                <p className="text-[11px] font-semibold" style={{ color: '#f87171' }}>{deleteError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => !deletingAcct && setConfirm('account')}
            disabled={deletingAcct}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-[20px] active:scale-[0.97] transition-transform mb-4"
            style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.2)',
              opacity: deletingAcct ? 0.7 : 1,
            }}
          >
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              {deletingAcct ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 rounded-full border-2 border-transparent"
                  style={{ borderTopColor: '#ef4444' }}
                />
              ) : (
                <Trash2 size={14} style={{ color: '#ef4444' }} />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-semibold" style={{ color: '#f87171' }}>
                {deletingAcct ? 'Eliminando cuenta…' : p.eliminar_cuenta}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {deletingAcct ? 'Borrando datos de Supabase y localStorage…' : p.eliminar_sub}
              </p>
            </div>
          </button>
        </div>

        {/* ── Save bar ── */}
        <div
          className="px-5 pt-3 pb-6 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full py-3.5 rounded-[16px] flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.35)',
                }}
              >
                <Check size={16} style={{ color: '#10b981' }} />
                <span className="font-bold text-sm" style={{ color: '#10b981' }}>
                  {p.toast_saved}
                </span>
              </motion.div>
            ) : (
              <motion.button
                key="save"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleSave}
                className="w-full py-3.5 rounded-[16px] flex items-center justify-center gap-2 font-bold text-sm active:scale-[0.98] transition-all"
                style={{
                  background: dirty
                    ? 'linear-gradient(135deg,#10b981,#059669)'
                    : 'linear-gradient(135deg,#334155,#1e293b)',
                  boxShadow: dirty ? '0 0 20px rgba(16,185,129,0.3)' : 'none',
                  opacity: dirty ? 1 : 0.5,
                }}
              >
                <span className="text-white">
                  {dirty ? p.btn_save : p.btn_no_changes}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Confirm dialogs */}
      <AnimatePresence>
        {confirm === 'history' && (
          <ConfirmDialog
            key="confirm-history"
            title={p.confirm_hist_title}
            body={p.confirm_hist_body}
            confirmLabel={p.confirm_hist_btn}
            cancelLabel={p.cancel}
            onConfirm={handleClearHistory}
            onCancel={() => setConfirm(null)}
          />
        )}
        {confirm === 'account' && (
          <ConfirmDialog
            key="confirm-account"
            title={p.confirm_acct_title}
            body={p.confirm_acct_body}
            confirmLabel={p.confirm_acct_btn}
            cancelLabel={p.cancel}
            onConfirm={handleDeleteAccount}
            onCancel={() => setConfirm(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {legalType && (
          <LegalModal type={legalType} onClose={() => setLegalType(null)} />
        )}
      </AnimatePresence>
    </motion.div>,
    portal,
  );
}