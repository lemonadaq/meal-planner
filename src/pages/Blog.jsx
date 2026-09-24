// Blog.jsx
// Publiczna strona główna — lista opublikowanych wpisów. Bez logowania.
// Logowanie siedzi w rogu i prowadzi do planera.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { pobierzWpisy, zajawka, formatujDate, KATEGORIE_BLOGA, etykietaKategorii } from '../blog'
import NaglowekBloga from '../components/NaglowekBloga'
import { t, fonts } from '../theme'

function KartaWpisu({ wpis }) {
  return (
    <Link to={`/blog/${wpis.slug}`} style={s.karta}>
      {wpis.zdjecie_glowne && (
        <div style={s.kartaFotoWrap}>
          <img src={wpis.zdjecie_glowne} alt="" style={s.kartaFoto} loading="lazy" />
        </div>
      )}
      <div style={s.kartaTresc}>
        {wpis.opublikowano_at && (
          <div style={s.kartaData}>{formatujDate(wpis.opublikowano_at)}</div>
        )}
        <h2 style={s.kartaTytul}>{wpis.tytul}</h2>
        <p style={s.kartaLead}>{zajawka(wpis)}</p>
        <div style={s.kartaTagi}>
          {wpis.kategoria && (
            <span style={s.kartaKategoria}>{etykietaKategorii(wpis.kategoria)}</span>
          )}
          {wpis.danie && <span style={s.kartaTag}>🍽️ {wpis.danie}</span>}
        </div>
      </div>
    </Link>
  )
}

export default function Blog() {
  const [wpisy, setWpisy] = useState(null)
  const [blad, setBlad] = useState(null)
  const [kategoria, setKategoria] = useState(null)

  useEffect(() => {
    let anulowane = false
    pobierzWpisy().then(({ wpisy: dane, blad: b }) => {
      if (anulowane) return
      setWpisy(dane)
      setBlad(b)
    })
    return () => { anulowane = true }
  }, [])

  // Chipy pokazują wyłącznie kategorie, które naprawdę mają wpisy — pusta
  // zakładka na blogu z trzema wpisami wygląda gorzej niż jej brak.
  const obecneKategorie = KATEGORIE_BLOGA.filter(
    k => wpisy?.some(w => w.kategoria === k.id),
  )
  const widoczne = kategoria ? wpisy?.filter(w => w.kategoria === kategoria) : wpisy

  return (
    <div style={s.outer}>
      <div style={s.container}>
        <NaglowekBloga wariant="glowna" />

        {obecneKategorie.length > 1 && (
          <div style={s.chipsRow}>
            <button
              style={{ ...s.chip, ...(kategoria === null ? s.chipOn : null) }}
              onClick={() => setKategoria(null)}
            >
              Wszystko
            </button>
            {obecneKategorie.map(k => (
              <button
                key={k.id}
                style={{ ...s.chip, ...(kategoria === k.id ? s.chipOn : null) }}
                onClick={() => setKategoria(k.id)}
              >
                {k.label}
              </button>
            ))}
          </div>
        )}

        {wpisy === null && <div style={s.info}>Ładowanie…</div>}

        {blad && (
          <div style={s.blad}>
            <strong>Nie udało się pobrać wpisów.</strong>
            <div style={s.bladTresc}>{blad}</div>
            <div style={s.bladPod}>
              Jeśli to świeża instalacja — odpal <code>migracja_blog.sql</code> w Supabase.
            </div>
          </div>
        )}

        {wpisy?.length === 0 && !blad && (
          <div style={s.pusto}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>📝</div>
            <div style={s.pustoTytul}>Jeszcze nic tu nie ma</div>
            <div style={s.pustoPod}>Pierwszy wpis pojawi się niedługo.</div>
          </div>
        )}

        {widoczne?.map(w => <KartaWpisu key={w.id} wpis={w} />)}

        {wpisy?.length > 0 && widoczne?.length === 0 && (
          <div style={s.pusto}>Brak wpisów w tej kategorii.</div>
        )}

        <footer style={s.stopka}>
          <Link to="/planer" style={s.stopkaLink}>Masz konto? Przejdź do planera →</Link>
        </footer>
      </div>
    </div>
  )
}

const s = {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans },
  container: { padding: '18px 18px 40px', maxWidth: 720, margin: '0 auto', boxSizing: 'border-box' },

  naglowek: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, flexWrap: 'wrap', marginBottom: 22,
  },
  marka: { textDecoration: 'none', display: 'block' },
  markaTytul: {
    display: 'block', fontFamily: fonts.serif || fonts.sans,
    fontSize: 26, fontWeight: 700, color: t.text, lineHeight: 1.15,
  },
  markaPod: { display: 'block', fontSize: 12.5, color: t.mute, marginTop: 2 },
  btnLogin: {
    background: t.accent, color: '#fff', textDecoration: 'none',
    borderRadius: 12, padding: '9px 16px', fontSize: 13.5, fontWeight: 600,
    whiteSpace: 'nowrap',
  },

  chipsRow: {
    display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18,
  },
  chip: {
    background: t.surface, border: `1px solid ${t.border}`, borderRadius: 999,
    padding: '7px 14px', fontFamily: fonts.sans, fontSize: 13,
    fontWeight: 600, color: t.mute, cursor: 'pointer',
  },
  chipOn: { background: t.accent, color: '#fff', borderColor: t.accent },

  kartaTagi: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  kartaKategoria: {
    fontSize: 11, fontWeight: 700, color: t.accent, background: t.accentSoft,
    borderRadius: 6, padding: '3px 8px',
  },

  karta: {
    display: 'block', textDecoration: 'none',
    background: t.surface, border: `1px solid ${t.border}`, borderRadius: 18,
    overflow: 'hidden', marginBottom: 16,
  },
  kartaFotoWrap: { aspectRatio: '16 / 9', maxWidth: '100%', overflow: 'hidden', background: t.surfaceAlt },
  kartaFoto: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  kartaTresc: { padding: '14px 16px 16px' },
  kartaData: { fontSize: 11.5, color: t.muteLight, marginBottom: 4 },
  kartaTytul: {
    fontFamily: fonts.serif || fonts.sans, fontSize: 20, fontWeight: 700,
    color: t.text, margin: '0 0 6px', lineHeight: 1.25,
  },
  kartaLead: { fontSize: 14, color: t.mute, lineHeight: 1.55, margin: '0 0 10px' },
  kartaTag: { fontSize: 12, color: t.accent, fontWeight: 600 },

  info: { color: t.mute, fontSize: 14, padding: '20px 0' },
  blad: {
    background: t.surface, border: `1px solid ${t.accent}`, borderRadius: 14,
    padding: '14px 16px', marginBottom: 16, fontSize: 13.5, color: t.text,
  },
  bladTresc: { fontSize: 12, color: t.mute, marginTop: 6, wordBreak: 'break-word' },
  bladPod: { fontSize: 12, color: t.muteLight, marginTop: 8 },

  pusto: { textAlign: 'center', padding: '50px 20px', color: t.mute },
  pustoTytul: { fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 6 },
  pustoPod: { fontSize: 13.5 },

  stopka: { marginTop: 30, paddingTop: 18, borderTop: `1px solid ${t.border}`, textAlign: 'center' },
  stopkaLink: { fontSize: 13, color: t.accent, textDecoration: 'none', fontWeight: 600 },
}
