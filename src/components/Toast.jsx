import { useEffect, useRef, useState } from 'react'
import { t, fonts, currentTheme, useThemeVersion } from '../theme'

// Toast z opcjonalnym „Cofnij". Sam się chowa po `duration`.
// Props:
//   toast: { id, label } | null
//   duration: ms
//   onUndo: () => void | undefined   — jeśli podane, pokazuje przycisk Cofnij
//   onDismiss: () => void
export default function Toast({ toast, duration = 4500, onUndo, onDismiss }) {
  useThemeVersion() // re-render przy zmianie motywu (jasny/ciemny)
  const [leaving, setLeaving] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (!toast) return
    setLeaving(false)
    timer.current = setTimeout(() => {
      setLeaving(true)
      setTimeout(onDismiss, 280)
    }, duration)
    return () => clearTimeout(timer.current)
  }, [toast?.id])

  if (!toast) return null

  const maUndo = typeof onUndo === 'function'
  const ciemny = currentTheme === 'dark'

  const close = (cb) => {
    clearTimeout(timer.current)
    setLeaving(true)
    setTimeout(cb, 260)
  }

  return (
    <div style={{
      position: 'fixed', left: 14, right: 14, bottom: 84, zIndex: 300,
      maxWidth: 540, margin: '0 auto',
      animation: leaving
        ? 'toastOut .26s cubic-bezier(.4,0,1,1) forwards'
        : 'toastIn .42s cubic-bezier(.16,1,.3,1)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: t.surface, border: `0.5px solid ${t.borderStrong}`,
        borderRadius: 14, padding: '13px 8px 13px 16px',
        boxShadow: ciemny
          ? '0 12px 34px rgba(0,0,0,.45)'
          : '0 12px 30px rgba(74,55,40,.16)',
        position: 'relative', overflow: 'hidden',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: t.accent,
          flex: '0 0 auto', boxShadow: `0 0 0 4px ${t.accentSoft}`,
        }} />
        <span style={{ flex: 1, fontFamily: fonts.sans, fontSize: 14.5, fontWeight: 500, color: t.text }}>
          {toast.label}
        </span>

        {maUndo && (
          <>
            <button onClick={() => close(onUndo)} style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: fonts.sans, fontSize: 14.5, fontWeight: 700,
              color: t.accent, padding: '6px 4px', flex: '0 0 auto',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 14L4 9l5-5" /><path d="M4 9h11a6 6 0 0 1 0 12h-3" />
              </svg>
              Cofnij
            </button>
            <span style={{ width: 1, height: 20, background: t.border, flex: '0 0 auto' }} />
          </>
        )}

        <button onClick={() => close(onDismiss)} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: t.mute,
          padding: '6px 8px', display: 'flex', flex: '0 0 auto',
        }} aria-label="Zamknij">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div key={toast.id} style={{
          position: 'absolute', left: 0, bottom: 0, height: 2.5, background: t.accent,
          width: '100%', transformOrigin: 'left',
          animation: `toastShrink ${duration}ms linear forwards`,
        }} />
      </div>
    </div>
  )
}
