import { useState } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'

// Pokazywana po zalogowaniu, gdy user nie ma jeszcze imienia
// (np. rejestracja mailem bez imienia / starsze konta).
// Zapisuje imię w user_metadata.full_name — Ustawienia czytają je tak samo.
export default function ImieGate({ user, onZapisano }) {
  const [imie, setImie] = useState('')
  const [blad, setBlad] = useState('')
  const [laduje, setLaduje] = useState(false)

  const s = makeS()

  async function zapisz() {
    setBlad('')
    if (!imie.trim()) {
      setBlad('Wpisz swoje imię.')
      return
    }
    setLaduje(true)
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: imie.trim() },
      })
      if (error) {
        setBlad('Nie udało się zapisać. Spróbuj ponownie.')
      } else {
        onZapisano?.(data.user)
      }
    } finally {
      setLaduje(false)
    }
  }

  function onKey(ev) {
    if (ev.key === 'Enter' && !laduje) zapisz()
  }

  async function wyloguj() {
    await supabase.auth.signOut()
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.eyebrow}>WITAJ W MENU PLANER</div>
        <h1 style={s.title}>
          Jak masz <em style={s.italic}>na imię?</em>
        </h1>
        <p style={s.sub}>
          Użyjemy go w aplikacji i przy planowaniu z rodziną.
        </p>

        <input
          style={s.input}
          type="text"
          placeholder="Twoje imię"
          value={imie}
          onChange={e => setImie(e.target.value)}
          onKeyDown={onKey}
          autoComplete="given-name"
          autoFocus
        />

        {blad && <div style={s.blad}>{blad}</div>}

        <button style={s.btn} onClick={zapisz} disabled={laduje}>
          {laduje ? 'Zapisuję...' : 'Gotowe'}
        </button>

        <button style={s.wyloguj} onClick={wyloguj}>
          Wyloguj się
        </button>
      </div>
    </div>
  )
}

function makeS() {
  return {
    container: {
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(circle at 30% 0%, ${t.warmSoft} 0%, ${t.bg} 45%, ${t.bg} 100%)`,
      padding: '24px 16px',
      fontFamily: fonts.sans,
    },
    card: {
      ...ui.card,
      padding: '40px 32px 28px',
      maxWidth: 380, width: '100%',
      textAlign: 'center',
    },
    eyebrow: { ...ui.eyebrow, marginBottom: 16 },
    title: { ...ui.h1, fontSize: 32, marginBottom: 12, textAlign: 'center' },
    italic: { color: t.warm, fontStyle: 'italic', fontFamily: fonts.serif },
    sub: {
      fontFamily: fonts.sans, fontSize: 14.5, lineHeight: 1.5,
      color: t.mute, margin: '0 0 24px',
    },
    input: { ...ui.input, textAlign: 'left', marginBottom: 10 },
    blad: {
      fontFamily: fonts.sans, fontSize: 12.5, color: t.danger,
      textAlign: 'left', lineHeight: 1.4, margin: '0 2px 10px',
    },
    btn: {
      ...ui.btnPrimary, width: '100%', padding: '14px 18px', fontSize: 15,
    },
    wyloguj: {
      ...ui.btnText, width: '100%', marginTop: 12, color: t.mute,
    },
  }
}
