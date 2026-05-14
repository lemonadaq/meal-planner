import { t, fonts } from '../theme'

// Same prop signature as your original NavBar: `aktywny` is the active tab id,
// `onChange(id)` fires when the user taps another tab. The id strings match
// what Home / Kalendarz / etc. already pass to `onTabChange`.

export default function NavBar({ aktywny, onChange }) {
  const tabs = [
    { id: 'home',     label: 'Home',     Icon: HomeIcon },
    { id: 'planer',   label: 'Planer',   Icon: CalIcon  },
    { id: 'przepisy', label: 'Przepisy', Icon: BookIcon },
    { id: 'zakupy',   label: 'Zakupy',   Icon: CartIcon },
  ]

  return (
    <>
      {/* Spacer so content above doesn't get covered by the fixed nav. Render
          this anywhere in your tree — it just provides bottom padding. */}
      <div style={s.spacer} aria-hidden />

      <nav style={s.nav} aria-label="Nawigacja główna">
        {tabs.map(tab => {
          const on = aktywny === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={on ? 'page' : undefined}
              style={{ ...s.tab, color: on ? t.accent : t.muteLight }}
            >
              <span style={s.ikona}>
                <tab.Icon active={on} />
              </span>
              <span style={{ ...s.label, fontWeight: on ? 600 : 500 }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}

// ── Line-art icons (filled-stroke variants when active) ─────────────────────
const HomeIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={active ? 2 : 1.6}
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-3v-7H10v7H6a2 2 0 0 1-2-2v-8z"/>
  </svg>
)
const CalIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={active ? 2 : 1.6}
    strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="2"/>
    <path d="M3 10h18M8 3v4M16 3v4"/>
  </svg>
)
const BookIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={active ? 2 : 1.6}
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h7a3 3 0 0 1 3 3v14H7a3 3 0 0 1-3-3V4z"/>
    <path d="M20 4h-3a3 3 0 0 0-3 3v14h3a3 3 0 0 0 3-3V4z"/>
  </svg>
)
const CartIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={active ? 2 : 1.6}
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4h2l2.5 12.5a2 2 0 0 0 2 1.5h7.5a2 2 0 0 0 2-1.6L21 8H6"/>
    <circle cx="9" cy="21" r="1.2"/>
    <circle cx="18" cy="21" r="1.2"/>
  </svg>
)

const s = {
  // Pushes page content above the nav so the last items aren't hidden.
  // Height = nav padding-top + content + safe-area bottom padding.
  spacer: { height: 84 },

  nav: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: t.surface,
    borderTop: `0.5px solid ${t.border}`,
    boxShadow: '0 -4px 24px rgba(74,55,40,.04)',
    display: 'flex',
    padding: '8px 0 calc(20px + env(safe-area-inset-bottom, 0px))',
    zIndex: 100,
  },
  tab: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    padding: '6px 4px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: fonts.sans,
    transition: 'color .15s ease',
  },
  ikona: { display: 'grid', placeItems: 'center' },
  label: {
    fontFamily: fonts.sans, fontSize: 10.5, letterSpacing: 0.1,
    lineHeight: 1, color: 'inherit',
  },
}
