// WpisyAdmin.jsx
// Panel bloga: lista wpisów, edytor, wgrywanie zdjęć, publikacja.
// Dostęp pilnuje RLS w bazie (tylko admin), nie ten komponent.
//
// Przepis wchodzi do wpisu jako MIGAWKA — pobierana jednym przyciskiem
// z tabeli `dania`. Dzięki temu opublikowany wpis nie zmienia się sam,
// gdy przepis w bazie zostanie poprawiony albo przegenerowany.

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import {
  pobierzWszystkieWpisy, zapiszWpis, usunWpis,
  pobierzPrzepisDoWpisu, wgrajZdjecieWpisu, zrobSlug, formatujDate,
} from '../blog'
import KomentarzeAdmin from '../components/KomentarzeAdmin'
import { pobierzOdwiedziny } from '../komentarze'
import { t, fonts, ui } from '../theme'

const PUSTY = {
  id: null, slug: '', tytul: '', lead: '', tresc: '',
  danie: '', przepis: null, zdjecie_glowne: '', zdjecia: [],
  opublikowany: false, opublikowano_at: null,
}

function Pole({ etykieta, children, podpowiedz }) {
  return (
    <label style={s.pole}>
      <span style={s.etykieta}>{etykieta}</span>
      {children}
      {podpowiedz && <span style={s.podpowiedz}>{podpowiedz}</span>}
    </label>
  )
}

export default function WpisyAdmin({ user, onZamknij }) {
  const [wpisy, setWpisy] = useState([])
  const [edytowany, setEdytowany] = useState(null)
  const [nazwyDan, setNazwyDan] = useState([])
  const [status, setStatus] = useState(null)
  const [zajety, setZajety] = useState(false)
  const [sekcja, setSekcja] = useState('wpisy')
  const [odwiedziny, setOdwiedziny] = useState({})

  const odswiez = useCallback(async () => {
    const { wpisy: dane, blad } = await pobierzWszystkieWpisy()
    if (blad) setStatus({ typ: 'blad', tekst: blad })
    setWpisy(dane)
  }, [])

  useEffect(() => {
    let anulowane = false
    pobierzWszystkieWpisy().then(({ wpisy: dane, blad }) => {
      if (anulowane) return
      if (blad) setStatus({ typ: 'blad', tekst: blad })
      setWpisy(dane)
    })
    return () => { anulowane = true }
  }, [])

  useEffect(() => {
    let anulowane = false
    pobierzOdwiedziny().then(({ odwiedziny: dane }) => {
      if (!anulowane) setOdwiedziny(dane)
    })
    return () => { anulowane = true }
  }, [])

  // Nazwy dań do podpowiedzi przy wiązaniu wpisu z przepisem.
  useEffect(() => {
    let anulowane = false
    supabase.from('dania').select('"Danie"').then(({ data }) => {
      if (anulowane) return
      setNazwyDan([...new Set((data || []).map(r => r['Danie']).filter(Boolean))].sort())
    })
    return () => { anulowane = true }
  }, [])

  const zmien = (pole, wartosc) => setEdytowany(w => ({ ...w, [pole]: wartosc }))

  // Slug podąża za tytułem dopóki wpis nie jest opublikowany — po publikacji
  // adres jest już w świecie i zmiana zepsułaby wysłane linki.
  function zmienTytul(tytul) {
    setEdytowany(w => ({
      ...w,
      tytul,
      slug: w.opublikowano_at ? w.slug : zrobSlug(tytul),
    }))
  }

  async function wczytajPrzepis() {
    if (!edytowany.danie) return
    setZajety(true)
    const { przepis, blad } = await pobierzPrzepisDoWpisu(edytowany.danie)
    setZajety(false)

    if (blad || !przepis) {
      setStatus({ typ: 'blad', tekst: blad || 'Nie znalazłem takiego dania w bazie.' })
      return
    }
    zmien('przepis', przepis)
    setStatus({ typ: 'ok', tekst: `Wczytano przepis: ${przepis.skladniki.length} składników.` })
  }

  async function wgrajZdjecie(event, glowne) {
    const plik = event.target.files?.[0]
    if (!plik) return

    setZajety(true)
    const { url, blad } = await wgrajZdjecieWpisu(plik, edytowany.slug || zrobSlug(edytowany.tytul))
    setZajety(false)
    event.target.value = ''

    if (blad) { setStatus({ typ: 'blad', tekst: blad }); return }

    if (glowne) zmien('zdjecie_glowne', url)
    else setEdytowany(w => ({ ...w, zdjecia: [...(w.zdjecia || []), url] }))
  }

  async function zapisz(opublikuj) {
    if (!edytowany.tytul.trim()) {
      setStatus({ typ: 'blad', tekst: 'Wpis musi mieć tytuł.' })
      return
    }

    const doZapisu = {
      ...edytowany,
      slug: edytowany.slug || zrobSlug(edytowany.tytul),
      opublikowany: opublikuj ?? edytowany.opublikowany,
      autor_email: edytowany.autor_email || user?.email || null,
    }

    setZajety(true)
    const { wpis, blad } = await zapiszWpis(doZapisu)
    setZajety(false)

    if (blad) { setStatus({ typ: 'blad', tekst: blad }); return }

    setEdytowany(wpis)
    setStatus({ typ: 'ok', tekst: wpis.opublikowany ? 'Opublikowane.' : 'Zapisane jako szkic.' })
    odswiez()
  }

  async function skasuj(wpis) {
    if (!window.confirm(`Skasować „${wpis.tytul}"? Tego nie da się cofnąć.`)) return
    const { blad } = await usunWpis(wpis.id)
    if (blad) { setStatus({ typ: 'blad', tekst: blad }); return }
    if (edytowany?.id === wpis.id) setEdytowany(null)
    odswiez()
  }

  // ── Edytor ──
  if (edytowany) {
    const adres = `menuplaner.pl/wpis/${edytowany.slug || zrobSlug(edytowany.tytul) || '…'}`

    return (
      <div style={s.outer}>
        <div style={s.container}>
          <button style={s.back} onClick={() => { setEdytowany(null); setStatus(null) }}>
            ← Lista wpisów
          </button>

          <h1 style={s.h1}>{edytowany.id ? 'Edycja wpisu' : 'Nowy wpis'}</h1>

          {status && (
            <div style={status.typ === 'blad' ? s.komunikatBlad : s.komunikatOk}>
              {status.tekst}
            </div>
          )}

          <Pole etykieta="Tytuł">
            <input
              style={s.input}
              value={edytowany.tytul}
              onChange={e => zmienTytul(e.target.value)}
              placeholder="np. Tteokbokki, czyli jak oswoiłem gochujang"
            />
          </Pole>

          <Pole
            etykieta="Adres"
            podpowiedz={edytowany.opublikowano_at
              ? 'Wpis jest opublikowany — adres zostaje, żeby wysłane linki nie przestały działać.'
              : 'Tworzy się z tytułu. Możesz nadpisać.'}
          >
            <input
              style={s.input}
              value={edytowany.slug}
              onChange={e => zmien('slug', zrobSlug(e.target.value))}
            />
            <span style={s.adres}>{adres}</span>
          </Pole>

          <Pole etykieta="Zajawka" podpowiedz="Widoczna na liście wpisów. Pusta = początek treści.">
            <textarea
              style={{ ...s.input, minHeight: 60 }}
              value={edytowany.lead || ''}
              onChange={e => zmien('lead', e.target.value)}
            />
          </Pole>

          <Pole
            etykieta="Treść"
            podpowiedz="Pusta linia robi akapit. „## ” to nagłówek, „- ” to lista."
          >
            <textarea
              style={{ ...s.input, minHeight: 240, fontFamily: fonts.sans, lineHeight: 1.6 }}
              value={edytowany.tresc}
              onChange={e => zmien('tresc', e.target.value)}
            />
          </Pole>

          <Pole etykieta="Zdjęcie główne">
            {edytowany.zdjecie_glowne && (
              <img src={edytowany.zdjecie_glowne} alt="" style={s.podglad} />
            )}
            <input type="file" accept="image/*" style={s.plik}
              onChange={e => wgrajZdjecie(e, true)} />
            {edytowany.zdjecie_glowne && (
              <button style={s.btnMaly} onClick={() => zmien('zdjecie_glowne', '')}>
                Usuń zdjęcie główne
              </button>
            )}
          </Pole>

          <Pole etykieta={`Zdjęcia w treści (${edytowany.zdjecia?.length || 0})`}>
            {edytowany.zdjecia?.length > 0 && (
              <div style={s.galeria}>
                {edytowany.zdjecia.map((url, i) => (
                  <div key={i} style={s.galeriaPoz}>
                    <img src={url} alt="" style={s.galeriaFoto} />
                    <button
                      style={s.btnUsunFoto}
                      onClick={() => setEdytowany(w => ({
                        ...w, zdjecia: w.zdjecia.filter((_, j) => j !== i),
                      }))}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <input type="file" accept="image/*" style={s.plik}
              onChange={e => wgrajZdjecie(e, false)} />
          </Pole>

          <Pole
            etykieta="Przepis"
            podpowiedz="Przepis zapisuje się we wpisie jako kopia. Poprawki w bazie nie zmienią opublikowanego wpisu — żeby je wciągnąć, wczytaj przepis ponownie."
          >
            <input
              style={s.input}
              list="lista-dan"
              value={edytowany.danie || ''}
              onChange={e => zmien('danie', e.target.value)}
              placeholder="zacznij pisać nazwę dania"
            />
            <datalist id="lista-dan">
              {nazwyDan.map(n => <option key={n} value={n} />)}
            </datalist>

            <div style={s.rzad}>
              <button style={s.btnMaly} onClick={wczytajPrzepis} disabled={!edytowany.danie || zajety}>
                {edytowany.przepis ? 'Wczytaj ponownie' : 'Wczytaj przepis'}
              </button>
              {edytowany.przepis && (
                <button style={s.btnMaly} onClick={() => zmien('przepis', null)}>
                  Odepnij przepis
                </button>
              )}
            </div>

            {edytowany.przepis && (
              <div style={s.przepisInfo}>
                <strong>{edytowany.przepis.danie}</strong>
                {' · '}{edytowany.przepis.skladniki?.length || 0} składników
                {edytowany.przepis.czas_minuty ? ` · ${edytowany.przepis.czas_minuty} min` : ''}
                {edytowany.przepis.kcal ? ` · ${edytowany.przepis.kcal} kcal` : ''}
              </div>
            )}
          </Pole>

          <div style={s.akcje}>
            <button style={s.btnDrugi} onClick={() => zapisz(false)} disabled={zajety}>
              Zapisz szkic
            </button>
            <button style={s.btnGlowny} onClick={() => zapisz(true)} disabled={zajety}>
              {edytowany.opublikowany ? 'Zapisz zmiany' : 'Opublikuj'}
            </button>
          </div>

          {edytowany.opublikowany && (
            <button style={s.btnCofnij} onClick={() => zapisz(false)} disabled={zajety}>
              Cofnij publikację (wróci do szkiców)
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Lista ──
  return (
    <div style={s.outer}>
      <div style={s.container}>
        <button style={s.back} onClick={onZamknij}>← Wróć</button>
        <h1 style={s.h1}>Blog</h1>

        <div style={s.zakladki}>
          {[['wpisy', '📝 Wpisy'], ['komentarze', '💬 Komentarze']].map(([id, etykieta]) => (
            <button
              key={id}
              style={{ ...s.zakladka, ...(sekcja === id ? s.zakladkaAktywna : null) }}
              onClick={() => setSekcja(id)}
            >
              {etykieta}
            </button>
          ))}
        </div>

        {status && (
          <div style={status.typ === 'blad' ? s.komunikatBlad : s.komunikatOk}>{status.tekst}</div>
        )}

        {sekcja === 'komentarze' ? (
          <KomentarzeAdmin onBlad={tekst => setStatus({ typ: 'blad', tekst })} />
        ) : (
        <>
        <button style={s.btnGlowny} onClick={() => { setEdytowany({ ...PUSTY }); setStatus(null) }}>
          + Nowy wpis
        </button>

        {!wpisy.length && (
          <div style={s.pusto}>
            Nie ma jeszcze żadnego wpisu.
            <div style={s.pustoPod}>
              Jeśli widzisz tu błąd o tabeli — odpal <code>migracja_blog.sql</code> w Supabase.
            </div>
          </div>
        )}

        {wpisy.map(w => (
          <div key={w.id} style={s.wiersz}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.wierszTytul}>{w.tytul}</div>
              <div style={s.wierszMeta}>
                <span style={w.opublikowany ? s.znacznikOpub : s.znacznikSzkic}>
                  {w.opublikowany ? 'opublikowany' : 'szkic'}
                </span>
                {w.opublikowano_at ? ` · ${formatujDate(w.opublikowano_at)}` : ''}
                {w.danie ? ` · ${w.danie}` : ''}
                {odwiedziny[w.id] ? ` · 👁️ ${odwiedziny[w.id]}` : ''}
              </div>
            </div>
            <button style={s.btnMaly} onClick={() => { setEdytowany(w); setStatus(null) }}>
              Edytuj
            </button>
            <button style={s.btnKasuj} onClick={() => skasuj(w)}>Usuń</button>
          </div>
        ))}
        </>
        )}
      </div>
    </div>
  )
}

const s = {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans },
  container: { padding: '20px 18px 40px', maxWidth: 680, margin: '0 auto', boxSizing: 'border-box' },
  back: { ...ui.btnText, padding: '0 0 14px', display: 'block' },
  h1: { fontFamily: fonts.serif, fontSize: 28, fontWeight: 700, color: t.text, margin: '0 0 16px' },

  pole: { display: 'block', marginBottom: 18 },
  etykieta: {
    display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: 0.6,
    textTransform: 'uppercase', color: t.accent, marginBottom: 6,
  },
  podpowiedz: { display: 'block', fontSize: 11.5, color: t.muteLight, marginTop: 5, lineHeight: 1.45 },
  input: {
    width: '100%', boxSizing: 'border-box', background: t.surface,
    border: `1px solid ${t.border}`, borderRadius: 12, padding: '11px 13px',
    fontFamily: fonts.sans, fontSize: 14.5, color: t.text,
  },
  adres: { display: 'block', fontSize: 11.5, color: t.mute, marginTop: 5, wordBreak: 'break-all' },
  plik: { display: 'block', marginTop: 8, fontSize: 13, color: t.text },

  podglad: {
    width: '100%', maxWidth: '100%', borderRadius: 12, display: 'block',
    marginBottom: 8, aspectRatio: '16 / 9', objectFit: 'cover',
  },
  galeria: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 8 },
  galeriaPoz: { position: 'relative' },
  galeriaFoto: { width: '100%', maxWidth: '100%', borderRadius: 10, display: 'block' },
  btnUsunFoto: {
    position: 'absolute', top: 4, right: 4, width: 24, height: 24,
    borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)',
    color: '#fff', fontSize: 15, cursor: 'pointer', lineHeight: 1,
  },

  rzad: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  przepisInfo: {
    marginTop: 8, padding: '9px 11px', background: t.secondarySoft,
    borderRadius: 10, fontSize: 12.5, color: t.text,
  },

  akcje: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 },
  btnGlowny: {
    flex: 1, minWidth: 140, background: t.accent, color: '#fff', border: 'none',
    borderRadius: 12, padding: '14px 18px', fontFamily: fonts.sans,
    fontSize: 14.5, fontWeight: 600, cursor: 'pointer', marginBottom: 14,
  },
  btnDrugi: {
    flex: 1, minWidth: 140, background: t.surface, color: t.text,
    border: `1px solid ${t.border}`, borderRadius: 12, padding: '14px 18px',
    fontFamily: fonts.sans, fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
  },
  btnMaly: {
    background: t.surfaceAlt, color: t.text, border: `1px solid ${t.border}`,
    borderRadius: 10, padding: '8px 12px', fontFamily: fonts.sans,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnKasuj: {
    background: 'transparent', color: t.accent, border: `1px solid ${t.border}`,
    borderRadius: 10, padding: '8px 12px', fontFamily: fonts.sans,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnCofnij: {
    width: '100%', background: 'transparent', color: t.mute,
    border: `1px solid ${t.border}`, borderRadius: 12, padding: '11px',
    fontFamily: fonts.sans, fontSize: 13, cursor: 'pointer', marginTop: 10,
  },

  wiersz: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
    padding: '12px 13px', marginBottom: 10,
  },
  wierszTytul: {
    fontSize: 14.5, fontWeight: 600, color: t.text,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  wierszMeta: { fontSize: 11.5, color: t.mute, marginTop: 3 },
  znacznikOpub: { color: t.accent, fontWeight: 700 },
  znacznikSzkic: { color: t.muteLight, fontWeight: 700 },

  komunikatOk: {
    background: t.secondarySoft, border: `1px solid ${t.border}`, borderRadius: 12,
    padding: '10px 12px', fontSize: 13, color: t.text, marginBottom: 14,
  },
  komunikatBlad: {
    background: t.accentSoft, border: `1px solid ${t.accent}`, borderRadius: 12,
    padding: '10px 12px', fontSize: 13, color: t.text, marginBottom: 14,
    wordBreak: 'break-word',
  },

  zakladki: {
    display: 'flex', gap: 4, background: t.surface,
    border: `1px solid ${t.border}`, borderRadius: 14, padding: 4, marginBottom: 16,
  },
  zakladka: {
    flex: 1, background: 'transparent', border: 'none', borderRadius: 10,
    padding: '9px 10px', fontFamily: fonts.sans, fontSize: 13,
    fontWeight: 600, color: t.mute, cursor: 'pointer',
  },
  zakladkaAktywna: { background: t.accent, color: '#fff' },

  pusto: { color: t.mute, fontSize: 14, padding: '24px 0', textAlign: 'center' },
  pustoPod: { fontSize: 12, color: t.muteLight, marginTop: 8 },
}
