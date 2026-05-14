// styled/theme.js
// Single source of truth for colors, fonts and reusable inline-style snippets.
// Import in any component:  import { t, fonts } from './theme'
// Then merge into your `s` blocks:  background: t.bg

export const t = {
  // Warm cream surface
  bg:           '#FAF6F0',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F2EBE0',
  surfaceWash:  '#FBF8F3',

  // Type
  text:         '#2A1F17',     // warm dark brown
  textSoft:     '#4A3D32',
  mute:         '#7A6B5C',
  muteLight:    '#A89A8B',

  // Lines
  border:       '#E8DFD3',
  borderStrong: '#D4C5B0',

  // Primary — sage (everything "do this" or "I'm planned")
  accent:       '#4D7C4D',
  accentDark:   '#3A6037',
  accentSoft:   '#DCE5D2',

  // Secondary — warm terracotta (calendar/important CTAs)
  warm:         '#C04E2C',
  warmSoft:     '#F4D9CC',

  // Status
  ok:           '#3A6037',
  danger:       '#B0432B',
}

export const fonts = {
  serif: '"Instrument Serif", "Cormorant Garamond", Georgia, serif',
  sans:  '"Geist", "Manrope", -apple-system, BlinkMacSystemFont, sans-serif',
}

// Reusable inline-style snippets — spread into your own `s.xxx` blocks
// so component-level styles stay self-contained.
export const ui = {
  // CTAs
  btnPrimary: {
    background: t.accent, color: '#fff',
    border: 'none', borderRadius: 12, padding: '14px 18px',
    fontFamily: fonts.sans, fontSize: 15, fontWeight: 600,
    cursor: 'pointer', letterSpacing: 0.1,
  },
  btnWarm: {
    background: t.warm, color: '#fff',
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
  // Cards
  card: {
    background: t.surface, borderRadius: 18,
    border: `0.5px solid ${t.border}`,
    boxShadow: '0 1px 2px rgba(74,55,40,.04), 0 8px 24px rgba(74,55,40,.05)',
  },
  // Form controls
  input: {
    width: '100%', padding: '12px 14px',
    fontFamily: fonts.sans, fontSize: 15, color: t.text,
    background: t.surface, border: `1px solid ${t.border}`,
    borderRadius: 12, outline: 'none', boxSizing: 'border-box',
  },
  // Typography
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
  // Eyebrow — small uppercase label above headings
  eyebrow: {
    fontFamily: fonts.sans, fontSize: 11, fontWeight: 600,
    letterSpacing: 1.4, textTransform: 'uppercase', color: t.mute,
  },
  // Section label (left of meal name etc)
  slotLabel: {
    fontFamily: fonts.sans, fontSize: 10, fontWeight: 600,
    letterSpacing: 1.2, textTransform: 'uppercase', color: t.accent,
  },
  // Body
  body: {
    fontFamily: fonts.sans, fontSize: 14, color: t.text, lineHeight: 1.5,
  },
}

// Helper that builds an avatar background gradient from a string seed.
// Used for user/initials chips so two avatars never collide on the same hue.
export function avatarBg(seed = '') {
  const palette = [
    'linear-gradient(135deg, #DCE5D2, #4D7C4D)',
    'linear-gradient(135deg, #F4D9CC, #C04E2C)',
    'linear-gradient(135deg, #EADBC8, #8A6B43)',
    'linear-gradient(135deg, #D8DCC6, #6B7A3A)',
  ]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}
