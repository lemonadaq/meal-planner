// NaglowekBloga.jsx
// Wspólny nagłówek stron publicznych. Wie, czy ktoś jest zalogowany:
// niezalogowany dostaje „Zaloguj się", zalogowany swoje imię i przejście
// do planera. Pokazywanie logowania komuś, kto już jest zalogowany, było
// po prostu mylące.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { t, fonts } from '../theme'

// Imię z profilu, a w razie braku — początek adresu e-mail.
function imieUsera(user) {
  if (!user) return ''
  const pelne = (user.user_metadata?.full_name || '').trim()
  if (pelne) return pelne.split(/\s+/)[0]
  return (user.email || '').split('@')[0]
}

export default function NaglowekBloga({ wariant = 'glowna' }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    let anulowane = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!anulowane) setUser(session?.user ?? null)
    })

    // Wylogowanie w innej karcie ma tu być widoczne bez odświeżania.
    const { data: sub } = supabase.auth.onAuthStateChange((_zdarzenie, session) => {
      if (!anulowane) setUser(session?.user ?? null)
    })

    return () => {
      anulowane = true
      sub?.subscription?.unsubscribe()
    }
  }, [])

  return (
    <header style={s.naglowek}>
      {wariant === 'glowna' ? (
        <Link to="/" style={s.marka}>
          <span style={s.markaTytul}>Menu planer</span>
          <span style={s.markaPod}>przepisy i notatki z kuchni</span>
        </Link>
      ) : (
        <Link to="/" style={s.wroc}>← Wszystkie wpisy</Link>
      )}

      <nav style={s.prawa}>
        <Link to="/o-mnie" style={s.link}>O mnie</Link>

        {user ? (
          <Link to="/planer" style={s.btnUser}>
            <span style={s.awatar}>{(imieUsera(user)[0] || '?').toUpperCase()}</span>
            <span style={s.imie}>{imieUsera(user)}</span>
          </Link>
        ) : (
          <Link to="/planer" style={s.btnLogin}>Zaloguj się</Link>
        )}
      </nav>
    </header>
  )
}

const s = {
  naglowek: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, flexWrap: 'wrap', marginBottom: 22,
  },
  marka: { textDecoration: 'none', display: 'block' },
  markaTytul: {
    display: 'block', fontFamily: fonts.serif,
    fontSize: 26, fontWeight: 700, color: t.text, lineHeight: 1.15,
  },
  markaPod: { display: 'block', fontSize: 12.5, color: t.mute, marginTop: 2 },
  wroc: { fontSize: 13.5, color: t.accent, textDecoration: 'none', fontWeight: 600 },

  prawa: { display: 'flex', alignItems: 'center', gap: 12 },
  link: { fontSize: 13.5, color: t.mute, textDecoration: 'none', fontWeight: 600 },

  btnLogin: {
    background: t.accent, color: '#fff', textDecoration: 'none',
    borderRadius: 12, padding: '9px 16px', fontSize: 13.5, fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  btnUser: {
    display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none',
    background: t.surface, border: `1px solid ${t.border}`,
    borderRadius: 999, padding: '5px 12px 5px 5px', whiteSpace: 'nowrap',
  },
  awatar: {
    width: 26, height: 26, borderRadius: '50%', background: t.accent,
    color: '#fff', fontSize: 12.5, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
  },
  imie: { fontSize: 13.5, fontWeight: 600, color: t.text },
}
