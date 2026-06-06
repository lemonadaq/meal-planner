import { t, fonts } from '../theme'

export default function PolitykaPrywatnosci({ onClose }) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div style={s.tytul}>Polityka prywatności</div>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>
        <div style={s.tresc}>
          <p style={s.meta}>Obowiązuje od: 1 czerwca 2026 r.<br />Administrator: menuplaner.pl | kontakt@menuplaner.pl</p>

          <h2 style={s.h2}>1. Administrator danych</h2>
          <p>Administratorem Twoich danych osobowych jest operator serwisu menuplaner.pl (kontakt: kontakt@menuplaner.pl).</p>

          <h2 style={s.h2}>2. Zakres przetwarzanych danych</h2>
          <p>W zależności od sposobu korzystania z Aplikacji przetwarzamy:</p>
          <ul style={s.lista}>
            <li><strong>adres e-mail</strong> — do uwierzytelnienia i kontaktu,</li>
            <li><strong>imię</strong> (pole <em>full_name</em> w metadanych konta) — do personalizacji interfejsu,</li>
            <li><strong>przynależność do gospodarstwa domowego</strong> — do współdzielenia planu posiłków,</li>
            <li><strong>zaplanowane posiłki i przepisy</strong> — jako treść tworzona przez użytkownika,</li>
            <li><strong>sygnały preferencji</strong> (opcjonalnie) — informacje o podmianach i usuwanych daniach w celu przyszłej personalizacji sugestii.</li>
          </ul>

          <h2 style={s.h2}>3. Sposoby logowania</h2>
          <p>Aplikacja obsługuje dwa sposoby logowania:</p>
          <ul style={s.lista}>
            <li><strong>Google OAuth</strong> — dane logowania zarządza Google,</li>
            <li><strong>e-mail i hasło</strong> — hasła są hashowane i przechowywane wyłącznie przez Supabase Auth. Administrator nie ma do nich dostępu.</li>
          </ul>
          <p>Przy rejestracji przez e-mail wysyłamy wiadomość potwierdzającą konto oraz (na życzenie) wiadomość do resetowania hasła. Wiadomości transakcyjne są wysyłane przez serwis <strong>Resend</strong> z adresu domenowego menuplaner.pl.</p>

          <h2 style={s.h2}>4. Podstawa prawna i cel</h2>
          <p>Dane przetwarzamy na podstawie zgody (rejestracja konta) oraz prawnie uzasadnionego interesu (bezpieczeństwo, zapobieganie nadużyciom). Celem przetwarzania jest świadczenie usługi planowania posiłków.</p>

          <h2 style={s.h2}>5. Podmioty przetwarzające (procesorzy)</h2>
          <ul style={s.lista}>
            <li><strong>Supabase</strong> — baza danych, uwierzytelnianie, przechowywanie plików (USA / UE, SCC),</li>
            <li><strong>Vercel</strong> — hosting aplikacji (USA / UE, SCC),</li>
            <li><strong>Resend</strong> — wysyłka e-maili transakcyjnych (USA, SCC),</li>
            <li><strong>Google</strong> — logowanie OAuth (opcjonalne, USA / UE, SCC).</li>
          </ul>

          <h2 style={s.h2}>6. Pamięć lokalna (localStorage)</h2>
          <p>Aplikacja przechowuje w pamięci lokalnej przeglądarki klucz <code>motyw</code> (wybrany motyw kolorystyczny). Dane te nie są wysyłane na serwer i możesz je usunąć, czyszcząc dane strony w ustawieniach przeglądarki.</p>

          <h2 style={s.h2}>7. Twoje prawa</h2>
          <p>Masz prawo do:</p>
          <ul style={s.lista}>
            <li>dostępu do swoich danych,</li>
            <li>sprostowania danych,</li>
            <li>usunięcia konta i danych (wyślij prośbę na kontakt@menuplaner.pl),</li>
            <li>ograniczenia przetwarzania,</li>
            <li>wniesienia skargi do organu nadzorczego (UODO, Polska).</li>
          </ul>

          <h2 style={s.h2}>8. Kontakt</h2>
          <p>W sprawach dotyczących prywatności: <strong>kontakt@menuplaner.pl</strong></p>
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
