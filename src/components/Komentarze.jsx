// Komentarze.jsx
// Komentarze pod wpisem — bez logowania, z pseudonimem (puste = Anonim).
//
// Tekst pojawia się od razu. Zdjęcie wgrywa się do prywatnego bucketa
// i NIE jest widoczne, dopóki Filip go nie zatwierdzi — dlatego autor
// komentarza dostaje o tym jasną informację, zamiast szukać znikniętego zdjęcia.

import { useEffect, useState } from 'react'
import {
  pobierzKomentarze, dodajKomentarz, wgrajZdjecieKomentarza,
  czyKomentarzeWlaczone, formatujCzas, sprawdzKomentarz,
  DOMYSLNY_PSEUDONIM, MAKS_TRESC,
} from '../komentarze'
import { t, fonts } from '../theme'

function Komentarz({ komentarz }) {
  return (
    <div style={s.komentarz}>
      <div style={s.gora}>
        <span style={s.pseudonim}>{komentarz.pseudonim || DOMYSLNY_PSEUDONIM}</span>
        <span style={s.czas}>{formatujCzas(komentarz.created_at)}</span>
      </div>
      <div style={s.tresc}>{komentarz.tresc}</div>
      {komentarz.zdjecie_zatwierdzone && komentarz.zdjecie_url && (
        <img src={komentarz.zdjecie_url} alt="" style={s.foto} loading="lazy" />
      )}
    </div>
  )
}

export default function Komentarze({ wpisId, komentarzeWlaczoneWpis = true }) {
  const [komentarze, setKomentarze] = useState([])
  const [wlaczone, setWlaczone] = useState(null)
  const [pseudonim, setPseudonim] = useState('')
  const [tresc, setTresc] = useState('')
  const [plik, setPlik] = useState(null)
  const [status, setStatus] = useState(null)
  const [wysylanie, setWysylanie] = useState(false)

  useEffect(() => {
    let anulowane = false
    Promise.all([pobierzKomentarze(wpisId), czyKomentarzeWlaczone()])
      .then(([{ komentarze: dane }, globalnie]) => {
        if (anulowane) return
        setKomentarze(dane)
        setWlaczone(globalnie && komentarzeWlaczoneWpis)
      })
    return () => { anulowane = true }
  }, [wpisId, komentarzeWlaczoneWpis])

  async function wyslij(e) {
    e.preventDefault()

    const bladTresci = sprawdzKomentarz(tresc)
    if (bladTresci) { setStatus({ typ: 'blad', tekst: bladTresci }); return }

    setWysylanie(true)
    let zdjecieSciezka = null

    if (plik) {
      const { sciezka, blad } = await wgrajZdjecieKomentarza(plik, wpisId)
      if (blad) {
        setWysylanie(false)
        setStatus({ typ: 'blad', tekst: `Nie udało się wgrać zdjęcia: ${blad}` })
        return
      }
      zdjecieSciezka = sciezka
    }

    const { komentarz, blad } = await dodajKomentarz({ wpisId, pseudonim, tresc, zdjecieSciezka })
    setWysylanie(false)

    if (blad) { setStatus({ typ: 'blad', tekst: blad }); return }

    setKomentarze(k => [komentarz, ...k])
    setTresc('')
    setPlik(null)
    setStatus({
      typ: 'ok',
      tekst: zdjecieSciezka
        ? 'Dodane. Zdjęcie pojawi się po sprawdzeniu przez autora bloga.'
        : 'Dodane, dzięki!',
    })
  }

  return (
    <section style={s.sekcja}>
      <h2 style={s.h2}>
        Komentarze{komentarze.length > 0 ? ` (${komentarze.length})` : ''}
      </h2>

      {wlaczone === false && (
        <div style={s.wylaczone}>Komentarze pod tym wpisem są chwilowo wyłączone.</div>
      )}

      {wlaczone && (
        <form onSubmit={wyslij} style={s.form}>
          <input
            style={s.input}
            value={pseudonim}
            onChange={e => setPseudonim(e.target.value)}
            placeholder={`Twój pseudonim (puste = ${DOMYSLNY_PSEUDONIM})`}
            maxLength={40}
          />

          <textarea
            style={{ ...s.input, minHeight: 90, lineHeight: 1.55 }}
            value={tresc}
            onChange={e => setTresc(e.target.value)}
            placeholder="Napisz komentarz…"
            maxLength={MAKS_TRESC}
          />

          <div style={s.rzadPliku}>
            <label style={s.btnPlik}>
              📷 {plik ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => setPlik(e.target.files?.[0] || null)}
              />
            </label>
            {plik && (
              <>
                <span style={s.nazwaPliku}>{plik.name}</span>
                <button type="button" style={s.btnUsunPlik} onClick={() => setPlik(null)}>
                  usuń
                </button>
              </>
            )}
          </div>

          {plik && (
            <div style={s.uwagaFoto}>
              Zdjęcia sprawdzamy przed pokazaniem — Twój komentarz pojawi się od razu,
              a zdjęcie chwilę później.
            </div>
          )}

          {status && (
            <div style={status.typ === 'blad' ? s.bladBox : s.okBox}>{status.tekst}</div>
          )}

          <button type="submit" style={s.btnWyslij} disabled={wysylanie}>
            {wysylanie ? 'Wysyłam…' : 'Dodaj komentarz'}
          </button>
        </form>
      )}

      {komentarze.length === 0 && wlaczone && (
        <div style={s.pusto}>Nikt jeszcze nie skomentował. Możesz być pierwszy.</div>
      )}

      {komentarze.map(k => <Komentarz key={k.id} komentarz={k} />)}
    </section>
  )
}

const s = {
  sekcja: { marginTop: 34, paddingTop: 22, borderTop: `1px solid ${t.border}` },
  h2: {
    fontFamily: fonts.serif, fontSize: 22, fontWeight: 700,
    color: t.text, margin: '0 0 16px',
  },

  form: { marginBottom: 24 },
  input: {
    width: '100%', boxSizing: 'border-box', background: t.surface,
    border: `1px solid ${t.border}`, borderRadius: 12, padding: '11px 13px',
    fontFamily: fonts.sans, fontSize: 14.5, color: t.text, marginBottom: 10,
  },

  rzadPliku: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 },
  btnPlik: {
    background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 10,
    padding: '9px 13px', fontSize: 13, fontWeight: 600, color: t.text, cursor: 'pointer',
  },
  nazwaPliku: {
    fontSize: 12, color: t.mute, overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160,
  },
  btnUsunPlik: {
    background: 'transparent', border: 'none', color: t.accent,
    fontSize: 12.5, cursor: 'pointer', padding: 0, textDecoration: 'underline',
  },
  uwagaFoto: {
    fontSize: 12, color: t.mute, lineHeight: 1.5,
    background: t.secondarySoft, borderRadius: 10, padding: '9px 11px', marginBottom: 10,
  },

  btnWyslij: {
    background: t.accent, color: '#fff', border: 'none', borderRadius: 12,
    padding: '12px 20px', fontFamily: fonts.sans, fontSize: 14.5,
    fontWeight: 600, cursor: 'pointer',
  },

  okBox: {
    background: t.secondarySoft, border: `1px solid ${t.border}`, borderRadius: 10,
    padding: '9px 11px', fontSize: 13, color: t.text, marginBottom: 10,
  },
  bladBox: {
    background: t.accentSoft, border: `1px solid ${t.accent}`, borderRadius: 10,
    padding: '9px 11px', fontSize: 13, color: t.text, marginBottom: 10,
  },
  wylaczone: {
    background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12,
    padding: '12px 14px', fontSize: 13.5, color: t.mute, marginBottom: 16,
  },
  pusto: { fontSize: 13.5, color: t.mute, padding: '6px 0 16px' },

  komentarz: {
    background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
    padding: '12px 14px', marginBottom: 10,
  },
  gora: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5, flexWrap: 'wrap' },
  pseudonim: { fontSize: 13.5, fontWeight: 700, color: t.text },
  czas: { fontSize: 11.5, color: t.muteLight },
  tresc: { fontSize: 14.5, lineHeight: 1.6, color: t.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  foto: { width: '100%', maxWidth: '100%', borderRadius: 10, display: 'block', marginTop: 10 },
}
