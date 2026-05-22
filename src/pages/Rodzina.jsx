import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui, avatarBg } from '../theme'

const LIMIT_OSOB = 5

export default function Rodzina({ user, householdId, onBack, onZmianaHousehold }) {
  const [czlonkowie, setCzlonkowie] = useState([])
  const [wyslane, setWyslane] = useState([]) // zaproszenia wysłane z mojego household
  const [loading, setLoading] = useState(true)

  // Modal zapraszania
  const [pokazZapros, setPokazZapros] = useState(false)
  const [emailZapr, setEmailZapr] = useState('')
  const [zapraszam, setZapraszam] = useState(false)
  const [bladZapr, setBladZapr] = useState(null)

  // Modal potwierdzenia opuszczenia
  const [pokazOpusc, setPokazOpusc] = useState(false)
  const [opuszczam, setOpuszczam] = useState(false)

  // Modal potwierdzenia usunięcia członka
  const [usuwany, setUsuwany] = useState(null) // { user_id, email, nazwa }

  const [toast, setToast] = useState(null)

  function pokazToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const pobierz = useCallback(async () => {
    if (!householdId) return
    setLoading(true)

    const [czRes, zRes] = await Promise.all([
      supabase.from('household_members_view')
        .select('*')
        .eq('household_id', householdId)
        .order('joined_at'),
      supabase.from('household_invites')
        .select('*')
        .eq('household_id', householdId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ])

    setCzlonkowie(czRes.data || [])
    setWyslane(zRes.data || [])
    setLoading(false)
  }, [householdId])

  useEffect(() => { pobierz() }, [pobierz])

  const totalZajetych = czlonkowie.length + wyslane.length
  const zostaloMiejsc = LIMIT_OSOB - totalZajetych

  async function wyslijZaproszenie() {
    const email = emailZapr.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setBladZapr('Wpisz poprawny email')
      return
    }
    if (czlonkowie.some(c => c.email?.toLowerCase() === email)) {
      setBladZapr('Ta osoba już jest w rodzinie')
      return
    }
    if (wyslane.some(z => z.invited_email?.toLowerCase() === email)) {
      setBladZapr('Już wysłano zaproszenie na ten email')
      return
    }
    if (zostaloMiejsc <= 0) {
      setBladZapr(`Rodzina jest pełna (limit ${LIMIT_OSOB} osób)`)
      return
    }

    setZapraszam(true)
    setBladZapr(null)

    const { error } = await supabase.rpc('zapros_do_household', { p_email: email })

    setZapraszam(false)

    if (error) {
      setBladZapr(error.message)
      return
    }

    setEmailZapr('')
    setPokazZapros(false)
    pokazToast('Zaproszenie wysłane')
    pobierz()
  }

  async function anulujZaproszenie(inviteId) {
    const { error } = await supabase.rpc('anuluj_zaproszenie', { p_invite_id: inviteId })
    if (error) {
      pokazToast('Błąd: ' + error.message)
      return
    }
    pobierz()
    pokazToast('Zaproszenie anulowane')
  }

  async function opuscRodzine() {
    setOpuszczam(true)
    const { error } = await supabase.rpc('opusc_household')
    setOpuszczam(false)
    if (error) {
      pokazToast('Błąd: ' + error.message)
      return
    }
    setPokazOpusc(false)
    pokazToast('Opuściłeś rodzinę')
    onZmianaHousehold?.()
  }

  async function usunCzlonka() {
    if (!usuwany) return
    const { error } = await supabase.rpc('usun_z_household', { p_user_id: usuwany.user_id })
    if (error) {
      pokazToast('Błąd: ' + error.message)
      return
    }
    setUsuwany(null)
    pokazToast('Usunięto z rodziny')
    pobierz()
  }

  function nazwaCzlonka(c) {
    return c.full_name || c.email?.split('@')[0] || 'Bez nazwy'
  }

  const samNaSwoim = czlonkowie.length === 1 && czlonkowie[0]?.user_id === user.id

  if (loading) {
    return (
      <div style={s.outer}>
        <div style={s.container}>
          <button style={s.back} onClick={onBack}>← Wróć</button>
          <div style={s.loading}>Ładuję rodzinę…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.outer}>
      <div style={s.container}>
        <button style={s.back} onClick={onBack}>← Wróć</button>

        <header style={s.header}>
          <div style={s.eyebrow}>RODZINA</div>
          <h1 style={s.title}>Wspólne gotowanie</h1>
          <p style={s.sub}>
            {samNaSwoim
              ? 'Zaproś bliskich, żeby planowali kalendarz i listę zakupów razem z Tobą.'
              : `${czlonkowie.length} ${czlonkowie.length === 1 ? 'osoba' : czlonkowie.length < 5 ? 'osoby' : 'osób'} • kalendarz i lista zakupów są wspólne dla wszystkich.`}
          </p>
        </header>

        {/* Członkowie */}
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>Członkowie</h2>
            <span style={s.licznik}>{czlonkowie.length}/{LIMIT_OSOB}</span>
          </div>

          {czlonkowie.map(c => {
            const toJa = c.user_id === user.id
            const nazwa = nazwaCzlonka(c)
            return (
              <div key={c.user_id} style={s.rzad}>
                <div style={{ ...s.avatar, background: avatarBg('m:' + c.user_id) }}>
                  {nazwa[0]?.toUpperCase()}
                </div>
                <div style={s.rzadInfo}>
                  <div style={s.rzadNazwa}>
                    {nazwa} {toJa && <span style={s.chipJa}>Ty</span>}
                  </div>
                  <div style={s.rzadEmail}>{c.email}</div>
                </div>
                {!toJa && (
                  <button
                    style={s.usunBtn}
                    onClick={() => setUsuwany({ user_id: c.user_id, email: c.email, nazwa })}
                    aria-label={`Usuń ${nazwa}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </section>

        {/* Oczekujące zaproszenia */}
        {wyslane.length > 0 && (
          <section style={s.section}>
            <h2 style={s.sectionTitle}>Oczekujące zaproszenia</h2>
            {wyslane.map(z => (
              <div key={z.id} style={s.rzad}>
                <div style={{ ...s.avatar, background: t.surfaceAlt, color: t.mute, fontSize: 20 }}>
                  ✉
                </div>
                <div style={s.rzadInfo}>
                  <div style={s.rzadNazwa}>{z.invited_email}</div>
                  <div style={s.rzadEmail}>Czeka na akceptację</div>
                </div>
                <button style={s.usunBtn} onClick={() => anulujZaproszenie(z.id)} aria-label="Anuluj">
                  ✕
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Przycisk zaproś */}
        {zostaloMiejsc > 0 && (
          <button style={s.btnZapros} onClick={() => { setEmailZapr(''); setBladZapr(null); setPokazZapros(true) }}>
            + Zaproś osobę
          </button>
        )}
        {zostaloMiejsc <= 0 && (
          <div style={s.info}>
            Rodzina jest pełna ({LIMIT_OSOB} osób).
          </div>
        )}

        {/* Opuszczenie rodziny */}
        {!samNaSwoim && (
          <section style={s.sectionDanger}>
            <h2 style={{ ...s.sectionTitle, color: t.danger }}>Opuść rodzinę</h2>
            <p style={s.sectionSub}>
              Twój kalendarz i lista zakupów zostaną zresetowane.
              Stwórzysz nowy, prywatny kalendarz tylko dla siebie.
            </p>
            <button style={s.btnDanger} onClick={() => setPokazOpusc(true)}>
              Opuść rodzinę
            </button>
          </section>
        )}
      </div>

      {/* ── Modal zapraszania ─────────────────────────────────── */}
      {pokazZapros && (
        <div style={modS.overlay} onClick={() => setPokazZapros(false)}>
          <div style={modS.modal} onClick={e => e.stopPropagation()}>
            <div style={modS.eyebrow}>NOWE ZAPROSZENIE</div>
            <h2 style={modS.title}>Zaproś do rodziny</h2>
            <p style={modS.sub}>
              Wpisz email osoby, która ma konto w aplikacji.
              Dostanie zaproszenie przy następnym otwarciu apki.
            </p>
            <input
              type="email"
              value={emailZapr}
              onChange={e => { setEmailZapr(e.target.value); setBladZapr(null) }}
              placeholder="email@example.com"
              autoFocus
              style={{ ...ui.input, marginTop: 14 }}
            />
            {bladZapr && <div style={modS.blad}>{bladZapr}</div>}
            <div style={modS.btnRow}>
              <button style={modS.btnGhost} onClick={() => setPokazZapros(false)}>
                Anuluj
              </button>
              <button style={modS.btnPrim} onClick={wyslijZaproszenie} disabled={zapraszam}>
                {zapraszam ? 'Wysyłam…' : 'Wyślij zaproszenie'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal opuszczania ─────────────────────────────────── */}
      {pokazOpusc && (
        <div style={modS.overlay} onClick={() => !opuszczam && setPokazOpusc(false)}>
          <div style={modS.modal} onClick={e => e.stopPropagation()}>
            <div style={modS.eyebrow}>POTWIERDZENIE</div>
            <h2 style={modS.title}>Opuścić rodzinę?</h2>
            <p style={modS.sub}>
              Stracisz dostęp do wspólnego kalendarza i listy zakupów.
              Dostaniesz nowy, pusty kalendarz tylko dla siebie.
              Pozostali członkowie zachowają wszystko.
            </p>
            <div style={modS.btnRow}>
              <button style={modS.btnGhost} onClick={() => setPokazOpusc(false)} disabled={opuszczam}>
                Anuluj
              </button>
              <button style={{ ...modS.btnPrim, background: t.danger }} onClick={opuscRodzine} disabled={opuszczam}>
                {opuszczam ? 'Opuszczam…' : 'Tak, opuść'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal usuwania członka ────────────────────────────── */}
      {usuwany && (
        <div style={modS.overlay} onClick={() => setUsuwany(null)}>
          <div style={modS.modal} onClick={e => e.stopPropagation()}>
            <div style={modS.eyebrow}>POTWIERDZENIE</div>
            <h2 style={modS.title}>Usunąć {usuwany.nazwa}?</h2>
            <p style={modS.sub}>
              {usuwany.nazwa} straci dostęp do wspólnego kalendarza i listy zakupów
              i dostanie własny, pusty kalendarz.
            </p>
            <div style={modS.btnRow}>
              <button style={modS.btnGhost} onClick={() => setUsuwany(null)}>
                Anuluj
              </button>
              <button style={{ ...modS.btnPrim, background: t.danger }} onClick={usunCzlonka}>
                Tak, usuń
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  )
}

const s = {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans },
  container: { padding: '20px 20px 32px', maxWidth: 600, margin: '0 auto', boxSizing: 'border-box' },
  back: { ...ui.btnText, padding: '0 0 14px', display: 'block' },

  header: { marginBottom: 22 },
  eyebrow: { ...ui.eyebrow, marginBottom: 6 },
  title: { ...ui.h1, fontSize: 28, lineHeight: 1.1, marginBottom: 10 },
  sub: { fontFamily: fonts.sans, fontSize: 14, color: t.mute, lineHeight: 1.55, margin: 0 },

  section: { ...ui.card, padding: 18, marginBottom: 14 },
  sectionDanger: { ...ui.card, padding: 18, marginTop: 18, border: `0.5px solid ${t.warmSoft}` },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { ...ui.h2, fontSize: 16 },
  sectionSub: { fontFamily: fonts.sans, fontSize: 13, color: t.mute, lineHeight: 1.55, margin: '0 0 14px' },
  licznik: { ...ui.eyebrow, fontSize: 11, color: t.mute, fontVariantNumeric: 'tabular-nums' },

  rzad: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 0', borderTop: `0.5px solid ${t.border}`,
  },
  avatar: {
    width: 40, height: 40, borderRadius: '50%',
    color: '#fff', display: 'grid', placeItems: 'center',
    fontFamily: fonts.serif, fontSize: 18, fontWeight: 500,
    flexShrink: 0, background: avatarBg('default'),
  },
  rzadInfo: { flex: 1, minWidth: 0 },
  rzadNazwa: {
    fontFamily: fonts.sans, fontSize: 14.5, fontWeight: 600, color: t.text,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  rzadEmail: {
    fontFamily: fonts.sans, fontSize: 12, color: t.mute, marginTop: 2,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  chipJa: {
    ...ui.eyebrow, fontSize: 9, color: t.accent, background: t.accentSoft,
    padding: '2px 7px', borderRadius: 999, letterSpacing: 0.8,
  },
  usunBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    width: 32, height: 32, borderRadius: 999,
    color: t.muteLight, fontSize: 18, padding: 0,
    display: 'grid', placeItems: 'center', flexShrink: 0,
  },

  btnZapros: {
    ...ui.btnPrimary, width: '100%', padding: '14px 16px', fontSize: 15,
    marginBottom: 8,
  },
  info: {
    textAlign: 'center', fontFamily: fonts.sans, fontSize: 13,
    color: t.mute, padding: '14px 12px', background: t.surfaceAlt,
    borderRadius: 12, marginBottom: 8,
  },
  btnDanger: {
    background: 'transparent', border: `1px solid ${t.warmSoft}`,
    color: t.danger, borderRadius: 12, padding: '12px 16px',
    fontFamily: fonts.sans, fontSize: 14, fontWeight: 500,
    cursor: 'pointer', width: '100%',
  },

  loading: { textAlign: 'center', padding: 80, color: t.mute, fontSize: 14 },
  toast: {
    position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
    background: t.text, color: '#fff', borderRadius: 12, padding: '10px 16px',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 500,
    boxShadow: '0 8px 24px rgba(0,0,0,.2)', zIndex: 200,
  },
}

const modS = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(20,15,10,.45)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  modal: {
    background: t.surface, borderRadius: 22,
    padding: '22px 22px 24px', width: '100%', maxWidth: 440,
    boxShadow: '0 12px 40px rgba(20,15,10,.2)',
    fontFamily: fonts.sans,
  },
  eyebrow: { ...ui.eyebrow, marginBottom: 6 },
  title: { fontFamily: fonts.serif, fontSize: 22, color: t.text, letterSpacing: -0.2, lineHeight: 1.15, margin: 0 },
  sub: { fontFamily: fonts.sans, fontSize: 13.5, color: t.mute, lineHeight: 1.55, margin: '10px 0 0' },
  blad: { fontFamily: fonts.sans, fontSize: 12.5, color: t.danger, marginTop: 8 },
  btnRow: { display: 'flex', gap: 10, marginTop: 22 },
  btnGhost: { ...ui.btnGhost, flex: 1, padding: '12px 16px', fontSize: 14 },
  btnPrim: { ...ui.btnPrimary, flex: 1, padding: '12px 16px', fontSize: 14 },
}
