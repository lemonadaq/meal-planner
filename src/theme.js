// theme.js
// Single source of truth — light + dark.
//
// Podejście: mutowalny singleton.
// `t` i `ui` to obiekty stałe referencyjnie — wszystkie komponenty importują
// je raz statycznie i za każdym razem czytają bieżące pola. Funkcja applyTheme()
// robi Object.assign na tych samych obiektach, więc po force-rerender cały UI
// automatycznie pobiera nowe kolory bez dotykania żadnego komponentu.

// ─── palety ────────────────────────────────────────────────────────────────

const tLight = {
  bg:           '#FAF6F0',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F2EBE0',
  surfaceWash:  '#FBF8F3',

  text:         '#2A1F17',
  textSoft:     '#4A3D32',
  mute:         '#7A6B5C',
  muteLight:    '#A89A8B',

  border:       '#E8DFD3',
  borderStrong: '#D4C5B0',

  // primary — terrakota (CTA, aktywny nav, eyebrow)
  accent:       '#C04E2C',
  accentDark:   '#A0401F',
  accentSoft:   '#F4D9CC',

    warm: '#C04E2C',
  warmSoft: '#F4D9CC',

  // secondary — zieleń szałwiowa ("zaplanowane")
  secondary:    '#4D7C4D',
  secondarySoft:'#DCE5D2',

  ok:           '#3A6037',
  danger:       '#B0432B',
}

const tDark = {
  bg:           '#221D21',
  surface:      '#2C272B',
  surfaceAlt:   '#353035',
  surfaceWash:  '#262125',

  text:         '#E7DFDC',
  textSoft:     '#BBB0AB',
  mute:         '#8B807B',
  muteLight:    '#665D5A',

  border:       '#383236',
  borderStrong: '#4A4348',

  accent:       '#D86A4C',
  accentDark:   '#BC543A',
  accentSoft:   '#352529',

    warm: '#D86A4C',
  warmSoft: '#352529',

  secondary:    '#7BA877',
  secondarySoft:'#26302A',

  ok:           '#7BA877',
  danger:       '#CF6149',
}

// ─── mutowalny singleton t ─────────────────────────────────────────────────
export const t = { ...tLight }

// ─── czcionki ──────────────────────────────────────────────────────────────
export const fonts = {
  serif: '"Instrument Serif", "Cormorant Garamond", Georgia, serif',
  sans:  '"Geist", "Manrope", -apple-system, BlinkMacSystemFont, sans-serif',
}

// ─── ui snippety ───────────────────────────────────────────────────────────
function makeUi(isDark) {
  return {
    btnPrimary: {
      background: t.accent, color: '#fff',
      border: 'none', borderRadius: 12, padding: '14px 18px',
      fontFamily: fonts.sans, fontSize: 15, fontWeight: 600,
      cursor: 'pointer', letterSpacing: 0.1,
    },
    btnSecondary: {
      background: t.secondary, color: '#fff',
      border: 'none', borderRadius: 12, padding: '14px 18px',
      fontFamily: fonts.sans, fontSize: 15, fontWeight: 600,
      cursor: 'pointer',
    },
    btnGhost: {
      background: t.surface, color: t.text,
      border: `1px solid ${t.border}`, borderRadius: 12, padding: '12px 16px',
      fontFamily: fonts.sans, fontSize: 14, fontWeight: 500,
      cursor: 'pointer',
    },
    btnText: {
      background: 'none', border: 'none', padding: '6px 8px',
      fontFamily: fonts.sans, fontSize: 14, fontWeight: 500,
      color: t.accent, cursor: 'pointer',
    },
    card: {
      background: t.surface, borderRadius: 18,
      border: `0.5px solid ${t.border}`,
      boxShadow: isDark
        ? '0 1px 2px rgba(0,0,0,.25), 0 8px 24px rgba(0,0,0,.35)'
        : '0 1px 2px rgba(74,55,40,.04), 0 8px 24px rgba(74,55,40,.05)',
    },
    input: {
      width: '100%', padding: '12px 14px',
      fontFamily: fonts.sans, fontSize: 15, color: t.text,
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: 12, outline: 'none', boxSizing: 'border-box',
    },
    h1: {
      fontFamily: fonts.serif, fontSize: 32, lineHeight: 1.05,
      color: t.text, letterSpacing: -0.5, fontWeight: 400, margin: 0,
    },
    h2: {
      fontFamily: fonts.serif, fontSize: 22, lineHeight: 1.1,
      color: t.text, letterSpacing: -0.2, fontWeight: 400, margin: 0,
    },
    h3: {
      fontFamily: fonts.serif, fontSize: 18, lineHeight: 1.15,
      color: t.text, letterSpacing: -0.1, fontWeight: 400, margin: 0,
    },
    eyebrow: {
      fontFamily: fonts.sans, fontSize: 11, fontWeight: 600,
      letterSpacing: 1.4, textTransform: 'uppercase', color: t.mute,
    },
    slotLabel: {
      fontFamily: fonts.sans, fontSize: 10, fontWeight: 700,
      letterSpacing: 1.4, textTransform: 'uppercase', color: t.accent,
    },
    body: {
      fontFamily: fonts.sans, fontSize: 14, color: t.text, lineHeight: 1.5,
    },
  }
}

export const ui = makeUi(false)

// ─── applyTheme ────────────────────────────────────────────────────────────
export let currentTheme = 'light'

// Proste pub/sub — komponenty mogą subskrybować zmiany motywu
// żeby wymusić re-render (używane w useThemeVersion())
const listeners = new Set()
export function onThemeChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function applyTheme(mode) {
  // mode: 'light' | 'dark'
  if (currentTheme === mode) return   // bez zmian — nie rób re-renderu
  currentTheme = mode
  const src = mode === 'dark' ? tDark : tLight
  Object.assign(t, src)
  Object.assign(ui, makeUi(mode === 'dark'))
  // pasek statusu / overscroll zgodny z motywem
  try {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', t.bg)
  } catch (e) { /* SSR / brak DOM */ }
  listeners.forEach(fn => fn(mode))
}

// Hook pomocniczy — daje numer wersji motywu, rośnie przy każdej zmianie.
// Wstaw w App.jsx: const _v = useThemeVersion()  → wymusi re-render drzewa.
import { useState, useEffect } from 'react'
export function useThemeVersion() {
  const [v, setV] = useState(0)
  useEffect(() => onThemeChange(() => setV(n => n + 1)), [])
  return v
}

// ─── helper avatarów ───────────────────────────────────────────────────────
export function avatarBg(seed = '') {
  const palette = [
    `linear-gradient(135deg, ${t.accentSoft}, ${t.accent})`,
    `linear-gradient(135deg, ${t.secondarySoft}, ${t.secondary})`,
    'linear-gradient(135deg, #EADBC8, #8A6B43)',
    'linear-gradient(135deg, #F0DDC9, #C58A2B)',
  ]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

// ─── synchroniczna inicjalizacja motywu ─────────────────────────────────────
// Uruchamia się przy imporcie modułu, ZANIM React wyrenderuje cokolwiek.
// Czyta zapisany wybór z localStorage (ustawiany w useUstawienia) i rozwiązuje
// 'system' przez matchMedia — dzięki temu pierwszy render jest już w dobrym
// motywie i nie ma migotania jasny→ciemny.
try {
  const zapisany = localStorage.getItem('motyw') || 'system'
  const ciemny =
    zapisany === 'dark' ||
    (zapisany !== 'light' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (ciemny) applyTheme('dark')
} catch (e) { /* brak localStorage / SSR — zostaje light */ }
