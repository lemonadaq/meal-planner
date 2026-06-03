import { useState } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'

export default function Login() {
  const [tryb, setTryb] = useState('login') // 'login' | 'rejestracja' | 'reset'
  const [imie, setImie] = useState('')
  const [email, setEmail] = useState('')
  const [haslo, setHaslo] = useState('')
  const [haslo2, setHaslo2] = useState('')
  const [blad, setBlad] = useState('')
  const [info, setInfo] = useState('')
  const [laduje, setLaduje] = useState(false)

  const s = makeS()

  async function loginGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  function tlumaczBlad(msg = '') {
    const m = msg.toLowerCase()
    if (m.includes('invalid login')) return 'Nieprawidłowy email lub hasło.'
    if (m.includes('already registered') || m.includes('already exists'))
      return 'Konto z tym adresem już istnieje. Zaloguj się.'
    if (m.includes('email not confirmed'))
      return 'Najpierw potwierdź adres e-mail — sprawdź skrzynkę.'
    if (m.includes('password')) return 'Hasło musi mieć min. 6 znaków.'
    if (m.includes('valid email') || m.includes('invalid email'))
      return 'Podaj poprawny adres e-mail.'
    if (m.includes('rate limit')) return 'Za dużo prób. Spróbuj za chwilę.'
    return 'Coś poszło nie tak. Spróbuj ponownie.'
  }

  async function wyslij() {
    setBlad('')
    setInfo('')

    const e = email.trim()

    // Tryb resetu hasła — tylko e-mail
    if (tryb === 'reset') {
      if (!e) { setBlad('Podaj adres e-mail.'); return }
      setLaduje(true)
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(e, {
          redirectTo: window.location.origin,
        })
        if (error) setBlad(tlumaczBlad(error.message))
        else setInfo('Wysłaliśmy link do zmiany hasła. Sprawdź skrzynkę.')
      } finally {
        setLaduje(false)
      }
      return
    }

    if (!e || !haslo) {
      setBlad('Uzupełnij e-mail i hasło.')
      return
    }
    if (haslo.length < 6) {
      setBlad('Hasło musi mieć min. 6 znaków.')
      return
    }
    if (tryb === 'rejestracja' && !imie.trim()) {
      setBlad('Podaj swoje imię.')
      return
    }
    if (tryb === 'rejestracja' && haslo !== haslo2) {
      setBlad('Hasła nie są takie same.')
      return
    }

    setLaduje(true)
    try {
      if (tryb === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: e,
          password: haslo,
        })
        if (error) setBlad(tlumaczBlad(error.message))
        // sukces → onAuthStateChange w App przejmie sesję
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: e,
          password: haslo,
          options: {
            data: { full_name: imie.trim() },
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) {
          setBlad(tlumaczBlad(error.message))
        } else if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          // Supabase maskuje istniejące konta: zwraca "usera" z pustą tablicą
          // identities i NIE wysyła maila. To dlatego potwierdzenie nie przyszło.
          setBlad('To konto już istnieje. Zaloguj się poniżej — a jeśli zakładałeś je przez Google, użyj „Kontynuuj z Google" na górze.')
        } else if (!data.session) {
          // Włączone potwierdzanie e-mail w Supabase → brak sesji od razu
          setInfo('Wysłaliśmy link potwierdzający na Twój e-mail. Kliknij go, żeby dokończyć.')
        }
        // jeśli data.session istnieje → user zalogowany od razu (onAuthStateChange)
      }
    } finally {
      setLaduje(false)
    }
  }

  function przelacz(nowy) {
    setTryb(nowy)
    setBlad('')
    setInfo('')
  }

  function onKey(ev) {
    if (ev.key === 'Enter' && !laduje) wyslij()
  }

  const tytulBtn = laduje
    ? 'Chwila...'
    : tryb === 'login' ? 'Zaloguj się'
    : tryb === 'rejestracja' ? 'Załóż konto'
    : 'Wyślij link'

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.eyebrow}>MENU PLANER · BETA</div>
        <h1 style={s.title}>
          Co dziś na <em style={s.italic}>obiad?</em>
        </h1>
        <p style={s.sub}>
          Planuj posiłki, zapisuj przepisy i rób zakupy razem z bliskimi.
        </p>

        {/* Decorative ingredient strip */}
        <div style={s.strip}>
          {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'].map((d, i) => (
            <span key={d} style={{
              ...s.stripDay,
              color: i === 2 ? '#fff' : t.text,
              background: i === 2 ? t.accent : 'transparent',
            }}>{d}</span>
          ))}
        </div>

        <button style={s.btnGoogle} onClick={loginGoogle} disabled={laduje}>
          <img
            src="https://www.google.com/favicon.ico"
            width={18} height={18}
            style={{ marginRight: 10, verticalAlign: 'middle', borderRadius: 4 }}
            alt=""
          />
          Kontynuuj z Google
        </button>

        <div style={s.dzielnik}>
          <span style={s.dzielnikLinia} />
          <span style={s.dzielnikText}>albo e-mailem</span>
          <span style={s.dzielnikLinia} />
        </div>

        {/* Zakładki login / rejestracja (ukryte w trybie resetu) */}
        {tryb !== 'reset' && (
          <div style={s.taby}>
            <button
              style={{ ...s.tab, ...(tryb === 'login' ? s.tabActive : {}) }}
              onClick={() => przelacz('login')}
            >
              Logowanie
            </button>
            <button
              style={{ ...s.tab, ...(tryb === 'rejestracja' ? s.tabActive : {}) }}
              onClick={() => przelacz('rejestracja')}
            >
              Nowe konto
            </button>
          </div>
        )}

        {tryb === 'reset' && (
          <div style={s.resetNag}>
            <button style={s.backLink} onClick={() => przelacz('login')}>← Wróć</button>
            <p style={s.resetText}>Podaj e-mail konta — wyślemy link do ustawienia nowego hasła.</p>
          </div>
        )}

        <div style={s.form}>
          {tryb === 'rejestracja' && (
            <input
              style={s.input}
              type="text"
              placeholder="Imię"
              value={imie}
              onChange={e => setImie(e.target.value)}
              onKeyDown={onKey}
              autoComplete="given-name"
            />
          )}
          <input
            style={s.input}
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={onKey}
            autoComplete="email"
            inputMode="email"
          />
          {tryb !== 'reset' && (
            <input
              style={s.input}
              type="password"
              placeholder="Hasło (min. 6 znaków)"
              value={haslo}
              onChange={e => setHaslo(e.target.value)}
              onKeyDown={onKey}
              autoComplete={tryb === 'login' ? 'current-password' : 'new-password'}
            />
          )}
          {tryb === 'rejestracja' && (
            <input
              style={s.input}
              type="password"
              placeholder="Powtórz hasło"
              value={haslo2}
              onChange={e => setHaslo2(e.target.value)}
              onKeyDown={onKey}
              autoComplete="new-password"
            />
          )}

          {blad && <div style={s.blad}>{blad}</div>}
          {info && <div style={s.info}>{info}</div>}

          <button style={s.btn} onClick={wyslij} disabled={laduje}>
            {tytulBtn}
          </button>

          {tryb === 'login' && (
            <button style={s.zapomnialem} onClick={() => przelacz('reset')}>
              Nie pamiętam hasła
            </button>
          )}
        </div>

        <p style={s.terms}>
          Logując się akceptujesz <span style={s.link}>regulamin</span> i <span style={s.link}>politykę prywatności</span>.
        </p>
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
    eyebrow: { ...ui.eyebrow, marginBottom: 18 },
    title: { ...ui.h1, fontSize: 34, marginBottom: 14, textAlign: 'center' },
    italic: { color: t.warm, fontStyle: 'italic', fontFamily: fonts.serif },
    sub: {
      fontFamily: fonts.sans, fontSize: 14.5, lineHeight: 1.5,
      color: t.mute, margin: '0 0 28px',
    },
    strip: {
      display: 'flex', justifyContent: 'space-between',
      gap: 4, marginBottom: 24,
      padding: '10px 6px', borderRadius: 14,
      background: t.surfaceAlt,
    },
    stripDay: {
      flex: 1, padding: '6px 0', borderRadius: 10,
      fontFamily: fonts.sans, fontSize: 11, fontWeight: 600,
      letterSpacing: 0.6, textTransform: 'uppercase',
    },
    btnGoogle: {
      ...ui.btnGhost,
      width: '100%', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: '13px 18px', fontSize: 15, fontWeight: 600,
    },

    dzielnik: { display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 18px' },
    dzielnikLinia: { flex: 1, height: 1, background: t.border },
    dzielnikText: { fontFamily: fonts.sans, fontSize: 11.5, color: t.muteLight, fontWeight: 500 },

    taby: {
      display: 'flex', gap: 6, marginBottom: 14,
      background: t.surfaceAlt, padding: 4, borderRadius: 12,
    },
    tab: {
      flex: 1, padding: '9px 8px', borderRadius: 9, cursor: 'pointer',
      border: 'none', background: 'transparent',
      fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 600, color: t.mute,
      transition: 'all .15s',
    },
    tabActive: { background: t.surface, color: t.text, boxShadow: '0 1px 3px rgba(0,0,0,.08)' },

    resetNag: { textAlign: 'left', marginBottom: 14 },
    backLink: { ...ui.btnText, padding: '0 0 8px', display: 'block' },
    resetText: { fontFamily: fonts.sans, fontSize: 13, color: t.mute, lineHeight: 1.5, margin: 0 },

    form: { display: 'flex', flexDirection: 'column', gap: 10 },
    input: { ...ui.input, textAlign: 'left' },

    blad: {
      fontFamily: fonts.sans, fontSize: 12.5, color: t.danger,
      textAlign: 'left', lineHeight: 1.4, margin: '2px 2px',
    },
    info: {
      fontFamily: fonts.sans, fontSize: 12.5, color: t.secondary,
      textAlign: 'left', lineHeight: 1.45, margin: '2px 2px',
    },

    btn: { ...ui.btnPrimary, width: '100%', padding: '14px 18px', fontSize: 15, marginTop: 2 },
    zapomnialem: { ...ui.btnText, color: t.mute, fontSize: 13, marginTop: 2 },

    terms: {
      fontFamily: fonts.sans, fontSize: 11.5,
      color: t.muteLight, margin: '20px 0 0', lineHeight: 1.5,
    },
    link: { color: t.text, textDecoration: 'underline' },
  }
}
