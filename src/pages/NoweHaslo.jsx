import { useState } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'

// Pokazywany po kliknięciu w link resetu z maila (event PASSWORD_RECOVERY).
// Ustawia nowe hasło dla aktualnej sesji odzyskiwania.
export default function NoweHaslo({ onGotowe }) {
  const [haslo, setHaslo] = useState('')
  const [haslo2, setHaslo2] = useState('')
  const [blad, setBlad] = useState('')
  const [laduje, setLaduje] = useState(false)

  const s = makeS()

  async function zapisz() {
    setBlad('')
    if (haslo.length < 6) {
      setBlad('Hasło musi mieć min. 6 znaków.')
      return
    }
    if (haslo !== haslo2) {
      setBlad('Hasła nie są takie same.')
      return
    }
    setLaduje(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: haslo })
      if (error) {
        setBlad('Nie udało się ustawić hasła. Link mógł wygasnąć — spróbuj jeszcze raz.')
      } else {
        onGotowe?.()
      }
    } finally {
      setLaduje(false)
    }
  }

  function onKey(ev) {
    if (ev.key === 'Enter' && !laduje) zapisz()
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.eyebrow}>SMAKUJE</div>
        <h1 style={s.title}>Ustaw <em style={s.italic}>nowe hasło</em></h1>
        <p style={s.sub}>Wpisz nowe hasło — od razu zalogujemy Cię do aplikacji.</p>

        <div style={s.form}>
          <input
            style={s.input}
            type="password"
            placeholder="Nowe hasło (min. 6 znaków)"
            value={haslo}
            onChange={e => setHaslo(e.target.value)}
            onKeyDown={onKey}
            autoComplete="new-password"
            autoFocus
          />
          <input
            style={s.input}
            type="password"
            placeholder="Powtórz hasło"
            value={haslo2}
            onChange={e => setHaslo2(e.target.value)}
            onKeyDown={onKey}
            autoComplete="new-password"
          />

          {blad && <div style={s.blad}>{blad}</div>}

          <button style={s.btn} onClick={zapisz} disabled={laduje}>
            {laduje ? 'Zapisuję...' : 'Zapisz hasło'}
          </button>
        </div>
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
      padding: '40px 32px 32px',
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
    form: { display: 'flex', flexDirection: 'column', gap: 10 },
    input: { ...ui.input, textAlign: 'left' },
    blad: {
      fontFamily: fonts.sans, fontSize: 12.5, color: t.danger,
      textAlign: 'left', lineHeight: 1.4, margin: '2px 2px',
    },
    btn: { ...ui.btnPrimary, width: '100%', padding: '14px 18px', fontSize: 15, marginTop: 2 },
  }
}
