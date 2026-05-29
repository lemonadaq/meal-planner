import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { t, fonts, ui, avatarBg } from './theme'

export default function Ustawienia({ user, ustawienia, onZapisz, onBack, onAdmin, onRodzina, onSloty, jestAdmin }) {
  const imie = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''
  const [porcje, setPorcje] = useState(ustawienia?.domyslne_porcje ?? 1)
  const [zapisano, setZapisano] = useState(false)
  const motyw = ustawienia?.motyw ?? 'system'

  useEffect(() => {
    setPorcje(ustawienia?.domyslne_porcje ?? 1)
  }, [ustawienia?.domyslne_porcje])

  function zmienPorcje(delta) {
    const nowe = Math.max(0.5, Math.min(20, +(porcje + delta).toFixed(1)))
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
        <button style={s.back} onClick={onBack}>← Wróć</button>

        <header style={s.header}>
          <div style={s.avatar} title={imie}>{imie[0]?.toUpperCase()}</div>
          <div>
            <div style={s.eyebrow}>USTAWIENIA</div>
            <h1 style={s.title}>{imie}</h1>
            <div style={s.email}>{user?.email}</div>
          </div>
        </header>

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
              <span style={s.porcjeNum}>{porcje}</span>
              <span style={s.porcjeUnit}>{porcje === 1 ? 'porcja' : porcje < 5 ? 'porcje' : 'porcji'}</span>
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
          <button style={s.btnRodzina} onClick={onSloty}>
            🍽 Edytuj posiłki dnia
          </button>
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Rodzina</h2>
          <p style={s.sectionSub}>
            Planuj kalendarz i listę zakupów wspólnie z bliskimi.
            Zaproś do 4 osób (rodzina, partner, współlokatorzy).
          </p>
          <button style={s.btnRodzina} onClick={onRodzina}>
            👨‍👩‍👧 Zarządzaj rodziną
          </button>
        </section>

        {jestAdmin && (
          <section style={s.section}>
            <h2 style={s.sectionTitle}>Admin</h2>
            <p style={s.sectionSub}>Panel analityki — dostępny tylko dla Ciebie.</p>
            <button style={s.btnAdmin} onClick={onAdmin}>
              📊 Otwórz panel admina
            </button>
          </section>
        )}

        <section style={s.section}>
          <button style={s.btnWyloguj} onClick={wyloguj}>
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
      maxWidth: 600, margin: '0 auto', boxSizing: 'border-box',
    },
    back: { ...ui.btnText, padding: '0 0 14px', display: 'block' },

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
    eyebrow: { ...ui.eyebrow, marginBottom: 4 },
    title: { ...ui.h1, fontSize: 26, lineHeight: 1.1 },
    email: { fontFamily: fonts.sans, fontSize: 13, color: t.mute, marginTop: 4 },

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

    // Segmentowany przełącznik motywu
    segRow: {
      display: 'flex', gap: 8,
    },
    segBtn: {
      flex: 1,
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
