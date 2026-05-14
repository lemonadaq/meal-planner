import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'

export default function Login() {
  async function loginGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.eyebrow}>SMAKUJE · BETA</div>
        <h1 style={s.title}>
          Jak <em style={s.italic}>smakuje</em> Twój tydzień?
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

        <button style={s.btn} onClick={loginGoogle}>
          <img
            src="https://www.google.com/favicon.ico"
            width={18} height={18}
            style={{ marginRight: 10, verticalAlign: 'middle', borderRadius: 4 }}
            alt=""
          />
          Zaloguj się przez Google
        </button>

        <p style={s.terms}>
          Logując się akceptujesz <span style={s.link}>regulamin</span> i <span style={s.link}>politykę prywatności</span>.
        </p>
      </div>
    </div>
  )
}

const s = {
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
  title: {
    ...ui.h1,
    fontSize: 34, marginBottom: 14, textAlign: 'center',
  },
  italic: {
    color: t.warm, fontStyle: 'italic', fontFamily: fonts.serif,
  },
  sub: {
    fontFamily: fonts.sans, fontSize: 14.5, lineHeight: 1.5,
    color: t.mute, margin: '0 0 28px',
  },
  strip: {
    display: 'flex', justifyContent: 'space-between',
    gap: 4, marginBottom: 28,
    padding: '10px 6px', borderRadius: 14,
    background: t.surfaceAlt,
  },
  stripDay: {
    flex: 1, padding: '6px 0', borderRadius: 10,
    fontFamily: fonts.sans, fontSize: 11, fontWeight: 600,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  btn: {
    ...ui.btnPrimary,
    width: '100%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    padding: '14px 18px', fontSize: 15,
  },
  terms: {
    fontFamily: fonts.sans, fontSize: 11.5,
    color: t.muteLight, margin: '20px 0 0', lineHeight: 1.5,
  },
  link: { color: t.text, textDecoration: 'underline' },
}
