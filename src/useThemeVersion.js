import { useState, useEffect } from 'react'
import { onThemeChange } from './theme'

export function useThemeVersion() {
  const [v, setV] = useState(0)
  useEffect(() => onThemeChange(() => setV(n => n + 1)), [])
  return v
}
