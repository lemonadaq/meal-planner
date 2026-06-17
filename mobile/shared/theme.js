import { useState, useEffect } from 'react'
import { Appearance } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

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
  accent:       '#C04E2C',
  accentDark:   '#A0401F',
  accentSoft:   '#F4D9CC',
  warm:         '#C04E2C',
  warmSoft:     '#F4D9CC',
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
  warm:         '#D86A4C',
  warmSoft:     '#352529',
  secondary:    '#7BA877',
  secondarySoft:'#26302A',
  ok:           '#7BA877',
  danger:       '#CF6149',
}

export const t = { ...tLight }

export const fonts = {
  serif: 'serif',
  sans: 'System',
}

export const ui = {}

export let currentTheme = 'light'

const listeners = new Set()
export function onThemeChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function applyTheme(mode) {
  if (currentTheme === mode) return
  currentTheme = mode
  const src = mode === 'dark' ? tDark : tLight
  Object.assign(t, src)
  listeners.forEach(fn => fn(mode))
}

export function useThemeVersion() {
  const [v, setV] = useState(0)
  useEffect(() => onThemeChange(() => setV(n => n + 1)), [])
  return v
}

// Inicjalizacja motywu — czytaj z AsyncStorage, fallback na system
const systemScheme = Appearance.getColorScheme()
if (systemScheme === 'dark') applyTheme('dark')

AsyncStorage.getItem('motyw').then(saved => {
  if (saved === 'dark') applyTheme('dark')
  else if (saved === 'light') applyTheme('light')
  // 'system' or null → keep current (already set from Appearance)
})
