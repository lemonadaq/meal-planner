// KomentarzeAdmin.jsx
// Moderacja komentarzy w panelu bloga.
//
// Komentarze wchodzą bez zatwierdzania, więc tutaj się je czyta i ewentualnie
// ukrywa po fakcie. Wyjątkiem są ZDJĘCIA: wiszą w prywatnym buckecie i nikt
// ich nie widzi, dopóki nie klikniesz „Pokaż". Podgląd idzie przez adres
// podpisany, wygasający po 10 minutach — to jest ta różnica między „admin
// widzi" a „widzi każdy, kto zna link".

import { useEffect, useState, useCallback } from 'react'
import {
  pobierzKomentarzeDoModeracji, ustawUkrycie, usunKomentarz,
  oznaczPrzeczytane, podgladZdjecia, zatwierdzZdjecie, odrzucZdjecie,
  czyKomentarzeWlaczone, ustawKomentarzeGlobalnie, formatujCzas,
} from '../komentarze'
import { t, fonts } from '../theme'

function ZdjecieDoDecyzji({ komentarz, onZmiana, onBlad }) {
  const [podglad, setPodglad] = useState(null)
  const [zajety, setZajety] = useState(false)

  async function pokaz() {
    setZajety(true)
    const { url, blad } = await podgladZdjecia(komentarz.zdjecie_sciezka)
    setZajety(false)
    if (blad) { onBlad(blad); return }
    setPodglad(url)
  }

  async function zatwierdz() {
    setZajety(true)
    const { blad } = await zatwierdzZdjecie(komentarz)
    setZajety(false)
    if (blad) { onBlad(blad); return }
    onZmiana()
  }

  async function odrzuc() {
    if (!window.confirm('Skasować to zdjęcie? Tego nie da się cofnąć.')) return
    setZajety(true)
    const { blad } = await odrzucZdjecie(komentarz)
    setZajety(false)
    if (blad) { onBlad(blad); return }
    onZmiana()
  }

  return (
    <div style={s.zdjecieBox}>
      <div style={s.zdjecieNaglowek}>
        📷 Zdjęcie czeka na decyzję — nikt go jeszcze nie widzi
      </div>

      {podglad
        ? <img src={podglad} alt="" style={s.zdjeciePodglad} />
        : (
          <button style={s.btnMaly} onClick={pokaz} disabled={zajety}>
            {zajety ? 'Otwieram…' : 'Pokaż zdjęcie'}
          </button>
        )}

      <div style={s.rzad}>
        <button style={s.btnZatwierdz} onClick={zatwierdz} disabled={zajety}>
          Opublikuj zdjęcie
        </button>
        <button style={s.btnKasuj} onClick={odrzuc} disabled={zajety}>
          Skasuj zdjęcie
        </button>
      </div>
    </div>
  )
}

export default function KomentarzeAdmin({ onBlad }) {
  const [komentarze, setKomentarze] = useState([])
  const [wlaczone, setWlaczone] = useState(true)
  const [ladowanie, setLadowanie] = useState(true)

  const odswiez = useCallback(async () => {
    const { komentarze: dane, blad } = await pobierzKomentarzeDoModeracji()
    if (blad) onBlad(blad)
    setKomentarze(dane)
  }, [onBlad])

  useEffect(() => {
    let anulowane = false

    Promise.all([pobierzKomentarzeDoModeracji(), czyKomentarzeWlaczone()])
      .then(([{ komentarze: dane, blad }, globalnie]) => {
        if (anulowane) return
        if (blad) onBlad(blad)
        setKomentarze(dane)
        setWlaczone(globalnie)
        setLadowanie(false)

        // Wejście do panelu kasuje licznik „nowe" — od tego on jest.
        const nowe = dane.filter(k => !k.przeczytany).map(k => k.id)
        if (nowe.length) oznaczPrzeczytane(nowe)
      })

    return () => { anulowane = true }
  }, [onBlad])

  async function przelaczGlobalnie() {
    const nowy = !wlaczone
    setWlaczone(nowy)
    const { blad } = await ustawKomentarzeGlobalnie(nowy)
    if (blad) { onBlad(blad); setWlaczone(!nowy) }
  }

  async function przelaczUkrycie(k) {
    const { blad } = await ustawUkrycie(k.id, !k.ukryty)
    if (blad) { onBlad(blad); return }
    odswiez()
  }

  async function skasuj(k) {
    if (!window.confirm('Skasować ten komentarz? Tego nie da się cofnąć.')) return
    const { blad } = await usunKomentarz(k.id)
    if (blad) { onBlad(blad); return }
    odswiez()
  }

  const czekajaceZdjecia = komentarze.filter(k => k.zdjecie_sciezka && !k.zdjecie_zatwierdzone).length

  return (
    <div>
      <div style={s.wylacznik}>
        <div style={{ flex: 1 }}>
          <div style={s.wylacznikTytul}>
            Komentarze {wlaczone ? 'włączone' : 'WYŁĄCZONE'}
          </div>
          <div style={s.wylacznikPod}>
            {wlaczone
              ? 'Każdy może komentować bez logowania. Wyłącz, jeśli wejdą boty.'
              : 'Nikt nie doda nowego komentarza. Już dodane zostają widoczne.'}
          </div>
        </div>
        <button
          style={wlaczone ? s.btnWylacz : s.btnWlacz}
          onClick={przelaczGlobalnie}
        >
          {wlaczone ? 'Wyłącz' : 'Włącz'}
        </button>
      </div>

      {czekajaceZdjecia > 0 && (
        <div style={s.uwaga}>
          📷 Zdjęć czekających na decyzję: <strong>{czekajaceZdjecia}</strong>
        </div>
      )}

      {ladowanie && <div style={s.info}>Ładowanie…</div>}

      {!ladowanie && !komentarze.length && (
        <div style={s.info}>Nie ma jeszcze żadnego komentarza.</div>
      )}

      {komentarze.map(k => (
        <div key={k.id} style={{ ...s.karta, opacity: k.ukryty ? 0.55 : 1 }}>
          <div style={s.gora}>
            <span style={s.pseudonim}>{k.pseudonim || 'Anonim'}</span>
            <span style={s.czas}>{formatujCzas(k.created_at)}</span>
            {!k.przeczytany && <span style={s.nowy}>nowy</span>}
            {k.ukryty && <span style={s.ukryty}>ukryty</span>}
          </div>

          {k.wpisy?.tytul && <div style={s.wpis}>pod: {k.wpisy.tytul}</div>}

          <div style={s.tresc}>{k.tresc}</div>

          {k.zdjecie_zatwierdzone && k.zdjecie_url && (
            <img src={k.zdjecie_url} alt="" style={s.zdjeciePodglad} />
          )}

          {k.zdjecie_sciezka && !k.zdjecie_zatwierdzone && (
            <ZdjecieDoDecyzji komentarz={k} onZmiana={odswiez} onBlad={onBlad} />
          )}

          <div style={s.rzad}>
            <button style={s.btnMaly} onClick={() => przelaczUkrycie(k)}>
              {k.ukryty ? 'Pokaż' : 'Ukryj'}
            </button>
            <button style={s.btnKasuj} onClick={() => skasuj(k)}>Usuń</button>
          </div>
        </div>
      ))}
    </div>
  )
}

const s = {
  wylacznik: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
    padding: '13px 14px', marginBottom: 14,
  },
  wylacznikTytul: { fontSize: 14, fontWeight: 700, color: t.text },
  wylacznikPod: { fontSize: 12, color: t.mute, marginTop: 3, lineHeight: 1.45 },
  btnWylacz: {
    background: 'transparent', color: t.accent, border: `1px solid ${t.accent}`,
    borderRadius: 10, padding: '9px 14px', fontFamily: fonts.sans,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  btnWlacz: {
    background: t.accent, color: '#fff', border: 'none',
    borderRadius: 10, padding: '9px 14px', fontFamily: fonts.sans,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  },

  uwaga: {
    background: t.accentSoft, border: `1px solid ${t.accent}`, borderRadius: 12,
    padding: '10px 12px', fontSize: 13, color: t.text, marginBottom: 14,
  },
  info: { fontSize: 13.5, color: t.mute, padding: '16px 0' },

  karta: {
    background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
    padding: '12px 14px', marginBottom: 10,
  },
  gora: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  pseudonim: { fontSize: 13.5, fontWeight: 700, color: t.text },
  czas: { fontSize: 11.5, color: t.muteLight },
  nowy: {
    fontSize: 10.5, fontWeight: 700, color: '#fff', background: t.accent,
    borderRadius: 6, padding: '2px 6px',
  },
  ukryty: {
    fontSize: 10.5, fontWeight: 700, color: t.mute,
    border: `1px solid ${t.border}`, borderRadius: 6, padding: '2px 6px',
  },
  wpis: { fontSize: 11.5, color: t.mute, marginBottom: 6 },
  tresc: {
    fontSize: 14, lineHeight: 1.55, color: t.text,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 8,
  },

  zdjecieBox: {
    background: t.secondarySoft, border: `1px solid ${t.border}`,
    borderRadius: 12, padding: '10px 12px', marginBottom: 8,
  },
  zdjecieNaglowek: { fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 8 },
  zdjeciePodglad: {
    width: '100%', maxWidth: '100%', borderRadius: 10,
    display: 'block', marginBottom: 8,
  },

  rzad: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btnMaly: {
    background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}`,
    borderRadius: 10, padding: '8px 12px', fontFamily: fonts.sans,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnZatwierdz: {
    background: t.accent, color: '#fff', border: 'none',
    borderRadius: 10, padding: '8px 12px', fontFamily: fonts.sans,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnKasuj: {
    background: 'transparent', color: t.accent, border: `1px solid ${t.border}`,
    borderRadius: 10, padding: '8px 12px', fontFamily: fonts.sans,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
}
