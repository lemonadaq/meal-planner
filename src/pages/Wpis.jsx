// Wpis.jsx
// Publiczna strona jednego wpisu. Przepis bierze się z migawki zapisanej
// we wpisie (`przepis`), a nie z tabeli `dania` — niezalogowany nie ma do niej
// dostępu i mieć nie musi.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { pobierzWpis, formatujDate } from '../blog'
import { zliczOdwiedziny } from '../komentarze'
import Komentarze from '../components/Komentarze'
import NaglowekBloga from '../components/NaglowekBloga'
import { t, fonts } from '../theme'

// Lekki render treści: akapity, nagłówki i listy. Świadomie NIE wstawiamy
// tu HTML-a z bazy (żadnego dangerouslySetInnerHTML) — treść wpisu jest
// tekstem, więc nie ma jak wstrzyknąć skryptu.
function Tresc({ tekst }) {
  const bloki = String(tekst || '').split(/\n{2,}/).filter(b => b.trim())

  return (
    <div style={s.tresc}>
      {bloki.map((blok, i) => {
        const linie = blok.split('\n')

        if (blok.startsWith('## ')) {
          return <h2 key={i} style={s.h2}>{blok.slice(3)}</h2>
        }
        if (blok.startsWith('# ')) {
          return <h2 key={i} style={s.h2}>{blok.slice(2)}</h2>
        }
        if (linie.every(l => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={i} style={s.ul}>
              {linie.map((l, j) => <li key={j} style={s.li}>{l.replace(/^\s*[-*]\s+/, '')}</li>)}
            </ul>
          )
        }
        return <p key={i} style={s.p}>{blok}</p>
      })}
    </div>
  )
}

function Przepis({ przepis }) {
  if (!przepis) return null

  const kroki = String(przepis.kroki || '')
    .split('\n')
    .map(k => k.replace(/^\s*\d+\.\s*/, '').trim())
    .filter(Boolean)

  return (
    <section style={s.przepis}>
      <h2 style={s.przepisTytul}>{przepis.danie}</h2>

      <div style={s.meta}>
        {przepis.czas_minuty ? <span style={s.metaPoz}>⏱️ {przepis.czas_minuty} min</span> : null}
        {przepis.kcal ? <span style={s.metaPoz}>🔥 {przepis.kcal} kcal / porcja</span> : null}
        {przepis.porcje_bazowe ? <span style={s.metaPoz}>🍽️ {przepis.porcje_bazowe} porcje</span> : null}
      </div>

      {przepis.skladniki?.length > 0 && (
        <>
          <h3 style={s.h3}>Składniki</h3>
          <ul style={s.skladniki}>
            {przepis.skladniki.map((sk, i) => (
              <li key={i} style={s.skladnik}>
                <span>{sk.nazwa}</span>
                <span style={s.skladnikIlosc}>
                  {[sk.ilosc, sk.jednostka].filter(Boolean).join(' ')}
                </span>
              </li>
            ))}
          </ul>
          <div style={s.przypis}>Ilości na 1 porcję.</div>
        </>
      )}

      {kroki.length > 0 && (
        <>
          <h3 style={s.h3}>Przygotowanie</h3>
          <ol style={s.kroki}>
            {kroki.map((k, i) => <li key={i} style={s.krok}>{k}</li>)}
          </ol>
        </>
      )}
    </section>
  )
}

export default function Wpis() {
  const { slug } = useParams()

  // Jeden stan razem ze slugiem, którego dotyczy. Dzięki temu „ładowanie" jest
  // WYLICZANE (dane są z innego adresu niż oglądany), a nie ustawiane osobnym
  // setState w efekcie — przy wejściu z wpisu na wpis nie ma przebłysku
  // poprzedniej treści.
  const [dane, setDane] = useState({ slug: null, wpis: null, blad: null })
  const ladowanie = dane.slug !== slug
  const wpis = ladowanie ? null : dane.wpis
  const blad = ladowanie ? null : dane.blad

  useEffect(() => {
    let anulowane = false
    pobierzWpis(slug).then(({ wpis: pobrany, blad: b }) => {
      if (!anulowane) setDane({ slug, wpis: pobrany, blad: b })
    })
    return () => { anulowane = true }
  }, [slug])

  // Odwiedziny liczymy dopiero, gdy wpis faktycznie się wczytał — inaczej
  // 404 i literówki w adresie nabijałyby licznik.
  useEffect(() => {
    if (wpis?.slug) zliczOdwiedziny(wpis.slug)
  }, [wpis?.slug])

  // Tytuł karty przeglądarki — SPA nie zrobi tego samo, a to on trafia
  // do zakładek i do podglądu linku.
  useEffect(() => {
    if (wpis?.tytul) document.title = `${wpis.tytul} — Menu planer`
    return () => { document.title = 'Menu planer' }
  }, [wpis])

  return (
    <div style={s.outer}>
      <div style={s.container}>
        <NaglowekBloga wariant="podstrona" />

        {ladowanie && <div style={s.info}>Ładowanie…</div>}

        {blad && (
          <div style={s.blad}>
            <strong>Nie udało się pobrać wpisu.</strong>
            <div style={s.bladTresc}>{blad}</div>
          </div>
        )}

        {!ladowanie && !wpis && !blad && (
          <div style={s.pusto}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🔍</div>
            <div style={s.pustoTytul}>Nie ma takiego wpisu</div>
            <Link to="/blog" style={s.stopkaLink}>Wróć na bloga</Link>
          </div>
        )}

        {wpis && (
          <article>
            {wpis.opublikowano_at && (
              <div style={s.data}>{formatujDate(wpis.opublikowano_at)}</div>
            )}
            <h1 style={s.tytul}>{wpis.tytul}</h1>
            {wpis.lead && <p style={s.lead}>{wpis.lead}</p>}

            {wpis.zdjecie_glowne && (
              <img src={wpis.zdjecie_glowne} alt="" style={s.fotoGlowne} />
            )}

            <Tresc tekst={wpis.tresc} />

            {wpis.zdjecia?.length > 0 && (
              <div style={s.galeria}>
                {wpis.zdjecia.map((url, i) => (
                  <img key={i} src={url} alt="" style={s.galeriaFoto} loading="lazy" />
                ))}
              </div>
            )}

            <Przepis przepis={wpis.przepis} />

            <Komentarze
              wpisId={wpis.id}
              komentarzeWlaczoneWpis={wpis.komentarze_wlaczone !== false}
            />
          </article>
        )}

        <footer style={s.stopka}>
          <Link to="/blog" style={s.stopkaLink}>← Wszystkie wpisy</Link>
        </footer>
      </div>
    </div>
  )
}

const s = {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans },
  container: { padding: '18px 18px 40px', maxWidth: 680, margin: '0 auto', boxSizing: 'border-box' },

  naglowek: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, marginBottom: 20,
  },
  wroc: { fontSize: 13.5, color: t.accent, textDecoration: 'none', fontWeight: 600 },
  btnLogin: {
    background: t.accent, color: '#fff', textDecoration: 'none',
    borderRadius: 12, padding: '8px 14px', fontSize: 13, fontWeight: 600,
    whiteSpace: 'nowrap',
  },

  data: { fontSize: 12, color: t.muteLight, marginBottom: 6 },
  tytul: {
    fontFamily: fonts.serif, fontSize: 32, lineHeight: 1.1, fontWeight: 700,
    color: t.text, margin: '0 0 10px',
  },
  lead: { fontSize: 16, color: t.mute, lineHeight: 1.6, margin: '0 0 18px' },
  fotoGlowne: {
    width: '100%', maxWidth: '100%', borderRadius: 16, display: 'block',
    marginBottom: 20, aspectRatio: '16 / 9', objectFit: 'cover',
  },

  tresc: { fontSize: 15.5, lineHeight: 1.7, color: t.text },
  p: { margin: '0 0 16px' },
  h2: {
    fontFamily: fonts.serif, fontSize: 22, lineHeight: 1.2, fontWeight: 700,
    color: t.text, margin: '26px 0 10px',
  },
  ul: { margin: '0 0 16px', paddingLeft: 20 },
  li: { marginBottom: 6 },

  galeria: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 10, margin: '20px 0',
  },
  galeriaFoto: { width: '100%', maxWidth: '100%', borderRadius: 12, display: 'block', objectFit: 'cover' },

  przepis: {
    background: t.surface, border: `1px solid ${t.border}`, borderRadius: 18,
    padding: '18px 18px 20px', marginTop: 28,
  },
  przepisTytul: {
    fontFamily: fonts.serif, fontSize: 24, fontWeight: 700, color: t.text,
    margin: '0 0 10px', lineHeight: 1.2,
  },
  meta: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 6 },
  metaPoz: { fontSize: 12.5, color: t.mute },
  h3: { fontSize: 14, fontWeight: 700, color: t.text, margin: '20px 0 8px' },
  skladniki: { listStyle: 'none', padding: 0, margin: 0 },
  skladnik: {
    display: 'flex', justifyContent: 'space-between', gap: 12,
    padding: '7px 0', borderBottom: `1px solid ${t.border}`,
    fontSize: 14, color: t.text,
  },
  skladnikIlosc: { color: t.mute, whiteSpace: 'nowrap' },
  przypis: { fontSize: 11.5, color: t.muteLight, marginTop: 8 },
  kroki: { paddingLeft: 20, margin: 0, fontSize: 14.5, lineHeight: 1.65, color: t.text },
  krok: { marginBottom: 10 },

  info: { color: t.mute, fontSize: 14, padding: '20px 0' },
  blad: {
    background: t.surface, border: `1px solid ${t.accent}`, borderRadius: 14,
    padding: '14px 16px', fontSize: 13.5, color: t.text,
  },
  bladTresc: { fontSize: 12, color: t.mute, marginTop: 6, wordBreak: 'break-word' },

  pusto: { textAlign: 'center', padding: '50px 20px', color: t.mute },
  pustoTytul: { fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 10 },

  stopka: { marginTop: 30, paddingTop: 18, borderTop: `1px solid ${t.border}`, textAlign: 'center' },
  stopkaLink: { fontSize: 13, color: t.accent, textDecoration: 'none', fontWeight: 600 },
}
