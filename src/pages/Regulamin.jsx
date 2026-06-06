import { t, fonts } from '../theme'

export default function Regulamin({ onClose }) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div style={s.tytul}>Regulamin</div>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>
        <div style={s.tresc}>
          <p style={s.meta}>Obowiązuje od: 1 czerwca 2026 r.<br />Usługa: <strong>menuplaner.pl</strong></p>

          <h2 style={s.h2}>§1. Postanowienia ogólne</h2>
          <p>Serwis menuplaner.pl (dalej: „Aplikacja") jest narzędziem do planowania posiłków dla rodzin i gospodarstw domowych, dostępnym pod adresem menuplaner.pl. Administratorem serwisu jest Filip (kontakt: kontakt@menuplaner.pl).</p>

          <h2 style={s.h2}>§2. Konto i logowanie</h2>
          <p>Dostęp do Aplikacji wymaga rejestracji. Użytkownik może zalogować się za pomocą:</p>
          <ul style={s.lista}>
            <li>konta Google (OAuth 2.0),</li>
            <li>adresu e-mail i hasła — hasła są hashowane i przechowywane przez Supabase Auth.</li>
          </ul>
          <p>Podczas rejestracji przez e-mail konieczne jest potwierdzenie adresu kliknięciem w link wysłany na podany e-mail (wiadomość dostarczana przez serwis Resend). Użytkownik zobowiązany jest do podania prawdziwych danych i ochrony swoich danych logowania.</p>

          <h2 style={s.h2}>§3. Zakres usługi</h2>
          <p>Aplikacja umożliwia planowanie tygodniowego jadłospisu, zarządzanie przepisami i generowanie listy zakupów w ramach gospodarstwa domowego (household). Dane planu są widoczne dla wszystkich członków tego samego gospodarstwa.</p>

          <h2 style={s.h2}>§4. Obowiązki użytkownika</h2>
          <p>Użytkownik zobowiązuje się korzystać z Aplikacji zgodnie z prawem i nie udostępniać swoich danych dostępowych osobom trzecim. Treści dodawane przez użytkownika (przepisy, nazwy dań) nie mogą naruszać praw osób trzecich.</p>

          <h2 style={s.h2}>§5. Dostępność i odpowiedzialność</h2>
          <p>Administrator dąży do zapewnienia ciągłości działania, jednak nie gwarantuje 100% dostępności. Aplikacja jest dostarczana „tak jak jest" — administrator nie ponosi odpowiedzialności za przerwy techniczne ani utratę danych wynikającą z przyczyn niezależnych.</p>

          <h2 style={s.h2}>§6. Zmiany regulaminu</h2>
          <p>Administrator zastrzega prawo do zmiany regulaminu. O istotnych zmianach użytkownicy będą informowani drogą e-mail lub komunikatem w Aplikacji. Dalsze korzystanie z Aplikacji po powiadomieniu oznacza akceptację nowego regulaminu.</p>

          <h2 style={s.h2}>§7. Kontakt</h2>
          <p>W sprawach dotyczących regulaminu lub konta prosimy o kontakt: <strong>kontakt@menuplaner.pl</strong></p>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(20,15,10,.55)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  sheet: {
    background: '#fff', borderRadius: '22px 22px 0 0',
    padding: '22px 22px 48px', width: '100%', maxWidth: 560,
    maxHeight: '85vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 -12px 40px rgba(20,15,10,.2)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, flexShrink: 0,
  },
  tytul: {
    fontFamily: fonts.serif, fontSize: 22, color: t.text, letterSpacing: -0.3,
  },
  close: {
    background: t.surfaceAlt, border: 'none', borderRadius: 999,
    width: 32, height: 32, fontSize: 14, color: t.mute, cursor: 'pointer',
  },
  tresc: {
    overflowY: 'auto', fontFamily: fonts.sans, fontSize: 13.5,
    color: t.text, lineHeight: 1.6,
  },
  meta: { color: t.mute, fontSize: 12.5, marginBottom: 18 },
  h2: {
    fontFamily: fonts.sans, fontSize: 14, fontWeight: 700,
    color: t.text, margin: '20px 0 6px',
  },
  lista: { paddingLeft: 20, margin: '6px 0' },
}
