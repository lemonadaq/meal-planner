import { supabase } from '../supabase'

export default function Login() {
  async function loginGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.icon}>🍽️</div>
        <h1 style={s.title}>Meal Planner</h1>
        <p style={s.sub}>Planuj posiłki i zakupy z rodziną</p>
        <button style={s.btn} onClick={loginGoogle}>
          <img
            src="https://www.google.com/favicon.ico"
            width={18} height={18}
            style={{ marginRight: 10, verticalAlign: 'middle' }}
          />
          Zaloguj się przez Google
        </button>
      </div>
    </div>
  )
}

const s = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  card: {
    background: 'white',
    borderRadius: 20,
    padding: '48px 40px',
    textAlign: 'center',
    boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
    maxWidth: 360,
    width: '90%',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a1a',
    margin: '0 0 8px',
  },
  sub: {
    fontSize: 15,
    color: '#666',
    margin: '0 0 32px',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '14px 20px',
    background: '#4a86e8',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 500,
    cursor: 'pointer',
  },
}