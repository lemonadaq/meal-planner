import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui, avatarBg } from '../theme'

/**
 * Sprawdza czy zalogowany user ma jakieś pending zaproszenia na swój email.
 * Jeśli tak — pokazuje modal z opcją Dołącz / Odrzuć.
 *
 * Wywoływane raz po zalogowaniu (i przy zmianie usera).
 */
export default function ZaproszenieModal({ user, onZaakceptowano }) {
  const [zaproszenia, setZaproszenia] = useState([])
  const [loading, setLoading] = useState(true)
  const [przetwarzam, setPrzetwarzam] = useState(false)
  const [aktualne, setAktualne] = useState(0)
  const [blad, setBlad] = useState(null)

  useEffect(() => {
    if (!user?.email) return
    let anulowane = false

    async function pobierz() {
      // Widok moje_zaproszenia_view jest filtrowany SQL-em po moim emailu,
      // więc nie potrzebujemy żadnych dodatkowych joinów ani filtrów.
      const { data } = await supabase
        .from('moje_zaproszenia_view')
        .select('*')
        .order('created_at', { ascending: false })

      if (anulowane) return
      setZaproszenia(data || [])
      setLoading(false)
    }

    pobierz()
    return () => { anulowane = true }
  }, [user?.email])

  if (loading || zaproszenia.length === 0) return null
  if (aktualne >= zaproszenia.length) return null

  const z = zaproszenia[aktualne]
  const nazwaRodziny = z.household_nazwa || 'Rodzina'
  const ktoZaprasza = z.invited_by_email || 'Ktoś'

  async function akceptuj() {
    setPrzetwarzam(true)
    setBlad(null)
    const { error } = await supabase.rpc('zaakceptuj_zaproszenie', { p_invite_id: z.id })
    setPrzetwarzam(false)
    if (error) {
      setBlad(error.message)
      return
    }
    onZaakceptowano?.()
    nastepne()
  }

  async function odrzuc() {
    setPrzetwarzam(true)
    setBlad(null)
    const { error } = await supabase.rpc('odrzuc_zaproszenie', { p_invite_id: z.id })
    setPrzetwarzam(false)
    if (error) {
      setBlad(error.message)
      return
    }
    nastepne()
  }

  function nastepne() {
    setAktualne(a => a + 1)
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.avatarBig}>
          {ktoZaprasza[0]?.toUpperCase()}
        </div>

        <div style={s.eyebrow}>ZAPROSZENIE DO RODZINY</div>
        <h2 style={s.title}>
          <span style={{ fontStyle: 'italic' }}>{ktoZaprasza}</span> zaprasza Cię
        </h2>
        <p style={s.sub}>
          Dołącz do rodziny <strong>{nazwaRodziny}</strong>, żeby planować kalendarz
          i listę zakupów wspólnie. Twój dotychczasowy plan zostanie zastąpiony wspólnym.
        </p>

        {blad && <div style={s.blad}>{blad}</div>}

        <div style={s.btnRow}>
          <button style={s.btnGhost} onClick={odrzuc} disabled={przetwarzam}>
            Odrzuć
          </button>
          <button style={s.btnPrim} onClick={akceptuj} disabled={przetwarzam}>
            {przetwarzam ? 'Dołączam…' : 'Dołącz'}
          </button>
        </div>

        {zaproszenia.length > 1 && (
          <div style={s.licznik}>
            {aktualne + 1} z {zaproszenia.length} zaproszeń
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 5000,
    background: 'rgba(20,15,10,.55)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  modal: {
    background: t.surface, borderRadius: 22,
    padding: '28px 24px 24px', width: '100%', maxWidth: 440,
    boxShadow: '0 20px 60px rgba(20,15,10,.3)',
    fontFamily: fonts.sans, textAlign: 'center',
  },
  avatarBig: {
    width: 72, height: 72, borderRadius: '50%',
    background: avatarBg('invite'), color: '#fff',
    display: 'grid', placeItems: 'center', margin: '0 auto 16px',
    fontFamily: fonts.serif, fontSize: 28, fontWeight: 500,
    boxShadow: '0 6px 18px rgba(74,55,40,.15)',
  },
  eyebrow: { ...ui.eyebrow, marginBottom: 8 },
  title: {
    fontFamily: fonts.serif, fontSize: 24, color: t.text,
    letterSpacing: -0.2, lineHeight: 1.2, margin: 0,
  },
  sub: {
    fontFamily: fonts.sans, fontSize: 13.5, color: t.mute,
    lineHeight: 1.6, margin: '12px 0 0',
  },
  blad: {
    background: t.warmSoft, color: t.danger,
    padding: '10px 14px', borderRadius: 10,
    fontSize: 12.5, marginTop: 14, textAlign: 'left',
  },
  btnRow: { display: 'flex', gap: 10, marginTop: 22 },
  btnGhost: { ...ui.btnGhost, flex: 1, padding: '14px 16px', fontSize: 14 },
  btnPrim: { ...ui.btnPrimary, flex: 1, padding: '14px 16px', fontSize: 14 },
  licznik: {
    fontFamily: fonts.sans, fontSize: 11, color: t.mute, marginTop: 14,
    letterSpacing: 0.5,
  },
}
