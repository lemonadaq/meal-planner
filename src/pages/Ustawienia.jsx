import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui, avatarBg, DOMYSLNY_MOTYW, GORA_TRESCI } from '../theme'

export default function Ustawienia({ user, ustawienia, onZapisz, onBack, onAdmin, onBlog, onRodzina, onSloty, onKalendarz, onHome, jestAdmin }) {
  const pelneImie = user?.user_metadata?.full_name || ''
  const imie = pelneImie.split(' ')[0] || user?.email?.split('@')[0] || ''
  const [porcje, setPorcje] = useState(ustawienia?.domyslne_porcje ?? 1)
  // Trzyma aktualną wartość poza cyklem renderowania — przy szybkich, kolejnych
  // kliknięciach +/- (np. podwójny tap) `porcje` w domknięciu onClick bywa jeszcze
  // sprzed poprzedniego kliknięcia, więc drugie kliknięcie liczyłoby od tej samej
  // starej wartości i jedna zmiana by "przepadała".
  const porcjeRef = useRef(porcje)
  const [zapisano, setZapisano] = useState(false)
  const [imieEdyt, setImieEdyt] = useState(pelneImie)
  const [imieStan, setImieStan] = useState('idle') // 'idle' | 'saving' | 'done'
  const [imieBlad, setImieBlad] = useState(null)
  const motyw = ustawienia?.motyw ?? DOMYSLNY_MOTYW
  // Gdy zapis imienia kończy się, `pelneImie` odświeża się z sesji i ten efekt
  // normalnie nadpisałby pole — również wtedy, gdy user w międzyczasie zdążył
  // wpisać kolejną zmianę. edytujeRef pilnuje, żeby nie kasować świeżej edycji.
  const edytujeRef = useRef(false)

  useEffect(() => {
    const nowe = ustawienia?.domyslne_porcje ?? 1
    setPorcje(nowe)
    porcjeRef.current = nowe
  }, [ustawienia?.domyslne_porcje])

  useEffect(() => {
    if (!edytujeRef.current) setImieEdyt(pelneImie)
  }, [pelneImie])

  async function zapiszImie() {
    const nowe = imieEdyt.trim()
    if (!nowe || nowe === pelneImie) return
    setImieStan('saving')
    setImieBlad(null)
    const { error } = await supabase.auth.updateUser({ data: { full_name: nowe } })
    if (error) {
      setImieStan('idle')
      setImieBlad('Nie udało się zapisać imienia. Spróbuj ponownie.')
      return
    }
    setImieStan('done')
    setTimeout(() => setImieStan('idle'), 1400)
  }

  function zmienPorcje(delta) {
    const nowe = Math.max(0.5, Math.min(20, +(porcjeRef.current + delta).toFixed(1)))
    porcjeRef.current = nowe
    setPorcje(nowe)
    onZapisz({ domyslne_porcje: nowe })
    setZapisano(true)
    setTimeout(() => setZapisano(false), 1200)
  }

  function zmienMotyw(nowy) {
    onZapisz({ motyw: nowy })
  }

  async function wyloguj() {
    await supabase.auth.signOut()
  }

  // Pole „Imię” (w przeciwieństwie do Motywu i Porcji) wymaga osobnego Zapisz —
  // bez tego guarda każdy inny przycisk na ekranie cicho kasował wpisaną,
  // niezapisaną zmianę (ten sam wzorzec błędu co PR #116 w DodajDanie.jsx).
  function maNiezapisanaZmianeImienia() {
    const nowe = imieEdyt.trim()
    return !!nowe && nowe !== pelneImie
  }
  function zWyjsciem(fn) {
    return (...args) => {
      if (maNiezapisanaZmianeImienia() && !confirm('Porzucić niezapisaną zmianę imienia?')) return
      fn?.(...args)
    }
  }

  // Jak w ImieGate.jsx — Enter zapisuje, tak samo jak kliknięcie „Zapisz”.
  function onImieKeyDown(e) {
    if (e.key === 'Enter' && imieStan !== 'saving') zapiszImie()
  }

  // s liczymy w ciele komponentu — odświeżą się po zmianie motywu
  const s = makeS()

  const TRYBY = [
    { id: 'light',  label: '☀️ Jasny'    },
    { id: 'system', label: '⚙️ System'   },
    { id: 'dark',   label: '🌙 Ciemny'   },
  ]

  return (
    <div style={s.outer}>
      <div style={s.container}>
        <button style={s.back} onClick={zWyjsciem(onBack)}>← Wróć</button>

        <header style={s.header}>
          <div style={s.avatar} title={imie}>{imie[0]?.toUpperCase()}</div>
          <div style={s.headerTekst}>
            <div style={s.eyebrow}>USTAWIENIA</div>
            <h1 style={s.title}>{imie}</h1>
            <div style={s.email}>{user?.email}</div>
          </div>
        </header>

        {/* Imię */}
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>Imię</h2>
            {imieStan === 'done' && <span style={s.zapisanoChip}>Zapisano</span>}
          </div>
          <p style={s.sectionSub}>Tak nazywamy Cię w aplikacji i przy planowaniu z rodziną.</p>
          <div style={s.imieRow}>
            <input
              style={s.imieInput}
              type="text"
              value={imieEdyt}
              onChange={e => { setImieEdyt(e.target.value); setImieBlad(null) }}
              onFocus={() => { edytujeRef.current = true }}
              onBlur={() => { edytujeRef.current = false }}
              onKeyDown={onImieKeyDown}
              placeholder="Twoje imię"
              autoComplete="given-name"
            />
            <button
              style={{
                ...s.imieBtn,
                ...((!imieEdyt.trim() || imieEdyt.trim() === pelneImie || imieStan === 'saving') ? s.imieBtnOff : {}),
              }}
              onClick={zapiszImie}
              disabled={!imieEdyt.trim() || imieEdyt.trim() === pelneImie || imieStan === 'saving'}
            >
              {imieStan === 'saving' ? '...' : 'Zapisz'}
            </button>
          </div>
          {imieBlad && <p style={s.imieBlad}>{imieBlad}</p>}
        </section>

        {/* Motyw */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Motyw</h2>
          <p style={s.sectionSub}>Jasny, ciemny lub zgodny z ustawieniami telefonu.</p>
          <div style={s.segRow}>
            {TRYBY.map(tr => (
              <button
                key={tr.id}
                style={{ ...s.segBtn, ...(motyw === tr.id ? s.segBtnActive : {}) }}
                onClick={() => zmienMotyw(tr.id)}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </section>

        {/* Domyślne porcje */}
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>Domyślne porcje</h2>
            {zapisano && <span style={s.zapisanoChip}>Zapisano</span>}
          </div>
          <p style={s.sectionSub}>
            Ile osób zwykle jada? Tyle porcji będzie domyślnie ustawione przy każdym posiłku.
            W kalendarzu zawsze można to zmienić dla konkretnego dnia.
          </p>
          <div style={s.porcjeRow}>
            <button style={s.porcjeBtn} onClick={() => zmienPorcje(-0.5)} disabled={porcje <= 0.5}>−</button>
            <div style={s.porcjeWart}>
              <span style={s.porcjeNum}>{String(porcje).replace('.', ',')}</span>
              <span style={s.porcjeUnit}>{!Number.isInteger(porcje) ? 'porcji' : porcje === 1 ? 'porcja' : porcje < 5 ? 'porcje' : 'porcji'}</span>
            </div>
            <button style={s.porcjeBtn} onClick={() => zmienPorcje(0.5)} disabled={porcje >= 20}>+</button>
          </div>
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Konfiguracja tygodnia</h2>
          <p style={s.sectionSub}>
            Każdy dzień może mieć inne posiłki — dodaj zupę w niedzielę,
            deser w weekend, drugie śniadanie w soboty. Co tylko chcesz.
          </p>
          <button style={s.btnRodzina} onClick={zWyjsciem(onSloty)}>
            🍽 Edytuj posiłki dnia
          </button>
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Planowanie po dniach</h2>
          <p style={s.sectionSub}>
            Klasyczny planer z kalendarzem i slotami posiłków. Apka domyślnie
            używa prostszego trybu „Tydzień" — tu wracasz do starego widoku.
          </p>
          <button style={s.btnRodzina} onClick={zWyjsciem(onKalendarz)}>
            🗓 Planer kalendarza
          </button>
          <button style={{ ...s.btnRodzina, marginTop: 8 }} onClick={zWyjsciem(onHome)}>
            🏠 Stary ekran startowy
          </button>
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Rodzina</h2>
          <p style={s.sectionSub}>
            Planuj kalendarz i listę zakupów wspólnie z bliskimi.
            Zaproś do 4 osób (rodzina, partner, współlokatorzy).
          </p>
          <button style={s.btnRodzina} onClick={zWyjsciem(onRodzina)}>
            👨‍👩‍👧 Zarządzaj rodziną
          </button>
        </section>

        {jestAdmin && (
          <section style={s.section}>
            <h2 style={s.sectionTitle}>Admin</h2>
            <p style={s.sectionSub}>Panel analityki — dostępny tylko dla Ciebie.</p>
            <button style={s.btnAdmin} onClick={zWyjsciem(onAdmin)}>
              📊 Otwórz panel admina
            </button>
            <button style={{ ...s.btnAdmin, marginTop: 10 }} onClick={zWyjsciem(onBlog)}>
              📝 Blog — wpisy i publikacja
            </button>
          </section>
        )}

        <section style={s.section}>
          <button style={s.btnWyloguj} onClick={zWyjsciem(wyloguj)}>
            Wyloguj się
          </button>
        </section>
      </div>
    </div>
  )
}

function makeS() {
  return {
    outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans },
    container: {
      padding: '20px 20px 32px',
      paddingTop: GORA_TRESCI,
      maxWidth: 600, margin: '0 auto', boxSizing: 'border-box',
    },
    back: {
      ...ui.btnText, padding: '0 0 14px',
      display: 'inline-flex', alignItems: 'center', minHeight: 40,
    },

    header: {
      display: 'flex', alignItems: 'center', gap: 16,
      marginBottom: 28,
    },
    avatar: {
      width: 64, height: 64, borderRadius: '50%',
      background: avatarBg('avatar:ust'),
      color: '#fff',
      display: 'grid', placeItems: 'center',
      fontFamily: fonts.serif, fontSize: 26, fontWeight: 500,
      flexShrink: 0,
      boxShadow: '0 4px 12px rgba(74,55,40,.12)',
    },
    headerTekst: { minWidth: 0 },
    eyebrow: { ...ui.eyebrow, marginBottom: 4 },
    title: { ...ui.h1, fontSize: 26, lineHeight: 1.1, overflowWrap: 'anywhere' },
    email: { fontFamily: fonts.sans, fontSize: 13, color: t.mute, marginTop: 4, overflowWrap: 'anywhere' },

    section: { ...ui.card, padding: 20, marginBottom: 14 },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    sectionTitle: { ...ui.h2, fontSize: 18 },
    sectionSub: {
      fontFamily: fonts.sans, fontSize: 13, color: t.mute,
      lineHeight: 1.5, margin: '0 0 16px',
    },

    zapisanoChip: {
      fontFamily: fonts.sans, fontSize: 10.5, fontWeight: 700,
      letterSpacing: 1, textTransform: 'uppercase', color: t.accent,
      background: t.accentSoft, padding: '3px 8px', borderRadius: 999,
    },

    imieRow: { display: 'flex', gap: 8, alignItems: 'center' },
    imieInput: { ...ui.input, flex: 1 },
    imieBtn: {
      ...ui.btnPrimary, padding: '12px 18px', fontSize: 14,
      flexShrink: 0, whiteSpace: 'nowrap',
    },
    imieBtnOff: { opacity: 0.45, cursor: 'default' },
    imieBlad: { fontFamily: fonts.sans, fontSize: 12.5, color: t.danger, margin: '8px 0 0' },

    // Segmentowany przełącznik motywu
    segRow: {
      display: 'flex', gap: 8,
    },
    segBtn: {
      flex: 1, minHeight: 44,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: fonts.sans, fontSize: 13, fontWeight: 500,
      padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
      border: `1px solid ${t.border}`,
      background: t.surfaceAlt, color: t.mute,
      transition: 'all .15s',
    },
    segBtnActive: {
      background: t.accentSoft,
      border: `1px solid ${t.accent}`,
      color: t.accent,
      fontWeight: 700,
    },

    porcjeRow: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12,
    },
    porcjeBtn: {
      width: 48, height: 48, borderRadius: '50%',
      background: t.surface, border: `0.5px solid ${t.border}`,
      color: t.text, fontSize: 22, fontFamily: fonts.serif, cursor: 'pointer',
      display: 'grid', placeItems: 'center',
      transition: 'transform .1s',
    },
    porcjeWart: {
      flex: 1, textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    },
    porcjeNum: {
      fontFamily: fonts.serif, fontSize: 42, color: t.text,
      lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontStyle: 'italic',
    },
    porcjeUnit: {
      fontFamily: fonts.sans, fontSize: 11, fontWeight: 600,
      letterSpacing: 1, textTransform: 'uppercase', color: t.mute,
    },

    btnAdmin: {
      ...ui.btnPrimary, width: '100%', padding: '12px 16px', fontSize: 14,
    },
    btnRodzina: {
      background: t.surface, border: `1px solid ${t.borderStrong}`,
      color: t.text, borderRadius: 12, padding: '12px 16px',
      fontFamily: fonts.sans, fontSize: 14, fontWeight: 600,
      cursor: 'pointer', width: '100%',
    },
    btnWyloguj: {
      background: 'none', border: `1px solid ${t.border}`,
      color: t.danger, borderRadius: 12, padding: '12px 16px',
      fontFamily: fonts.sans, fontSize: 14, fontWeight: 500,
      cursor: 'pointer', width: '100%',
    },
  }
}
