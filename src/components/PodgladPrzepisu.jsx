// Podgląd przepisu w wyskakującym okienku — żeby z listy na ekranie Tydzień
// dało się zobaczyć, co to za danie, BEZ opuszczania ekranu i tracenia
// przewinięcia oraz wpisanej szukajki.
//
// Celowo nie jest to `DanieDetail` w modalu: tamten komponent ma tryb edycji,
// upload zdjęcia i własne pobieranie — tutaj potrzebny jest sam odczyt.
// Do pełnego widoku (z edycją) prowadzi przycisk na dole.

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'
import { chipyPodgladu, krokiPrzepisu, grupujSkladniki, iloscTekst } from '../podgladPrzepisu'

export default function PodgladPrzepisu({ nazwa, onZamknij, onPelnyPrzepis, wPuli, onPrzelacz }) {
  // Wynik trzymamy RAZEM z nazwą, dla której go pobrano. Dzięki temu zmiana
  // dania od razu znaczy „jeszcze nie mam", bez czyszczenia stanu w efekcie
  // (a czyszczenie w ciele efektu to kaskada renderów).
  const [pobrane, setPobrane] = useState(null)

  useEffect(() => {
    if (!nazwa) return
    let anulowane = false

    async function pobierz() {
      const { data, error } = await supabase
        .from('dania').select('*')
        .eq('Danie', nazwa).order('Kategoria')
      if (anulowane) return
      setPobrane({
        nazwa,
        wiersze: data || [],
        blad: error ? 'Nie udało się wczytać przepisu.' : null,
      })
    }
    pobierz()
    return () => { anulowane = true }
  }, [nazwa])

  // Escape zamyka — na telefonie bez znaczenia, ale na klawiaturze to odruch.
  useEffect(() => {
    function naKlawisz(e) { if (e.key === 'Escape') onZamknij?.() }
    window.addEventListener('keydown', naKlawisz)
    return () => window.removeEventListener('keydown', naKlawisz)
  }, [onZamknij])

  if (!nazwa) return null

  // Dane z POPRZEDNIEGO dania nie mają prawa mignąć pod nową nazwą.
  const aktualne = pobrane?.nazwa === nazwa ? pobrane : null
  const wiersze = aktualne?.wiersze ?? null
  const blad = aktualne?.blad ?? null

  const pierwszy = wiersze?.[0]
  const zdjecie = wiersze?.find(w => w.zdjecie)?.zdjecie
  const chipy = chipyPodgladu(pierwszy)
  const kroki = krokiPrzepisu(wiersze?.find(w => w['Przepis'])?.['Przepis'])
  const grupy = grupujSkladniki(wiersze)

  return (
    <div style={s.overlay} onClick={onZamknij} role="presentation">
      <div style={s.okno} onClick={e => e.stopPropagation()} role="dialog" aria-label={`Przepis: ${nazwa}`}>
        <div style={s.uchwyt} />

        <div style={s.naglowek}>
          <div style={{ minWidth: 0 }}>
            <div style={s.eyebrow}>PRZEPIS</div>
            <div style={s.tytul}>{nazwa}</div>
          </div>
          <button style={s.zamknij} onClick={onZamknij} aria-label="Zamknij">✕</button>
        </div>

        <div style={s.tresc}>
          {zdjecie && <img src={zdjecie} alt="" style={s.zdjecie} loading="lazy" />}

          {chipy.length > 0 && (
            <div style={s.chipy}>
              {chipy.map((c, i) => <span key={i} style={s.chip}>{c}</span>)}
            </div>
          )}

          {wiersze === null && <div style={s.info}>Wczytuję przepis…</div>}
          {blad && <div style={s.info}>{blad}</div>}

          {wiersze !== null && !blad && grupy.length === 0 && kroki.length === 0 && (
            <div style={s.info}>To danie nie ma jeszcze przepisu ani składników.</div>
          )}

          {grupy.length > 0 && (
            <section style={s.sekcja}>
              <h3 style={s.sekcjaTytul}>Składniki <span style={s.licznik}>na 1 porcję</span></h3>
              {grupy.map(([kat, pozycje]) => (
                <div key={kat} style={s.grupa}>
                  <div style={s.grupaNazwa}>{kat}</div>
                  {pozycje.map((w, i) => (
                    <div key={i} style={s.skladnik}>
                      <span style={s.skladnikNazwa}>{w['Składnik']}</span>
                      <span style={s.skladnikIlosc}>{iloscTekst(w)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          )}

          {kroki.length > 0 && (
            <section style={s.sekcja}>
              <h3 style={s.sekcjaTytul}>Przygotowanie</h3>
              <ol style={s.kroki}>
                {kroki.map((k, i) => (
                  <li key={i} style={s.krok}>
                    <span style={s.krokNumer}>{i + 1}</span>
                    <span style={s.krokTekst}>{k}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <div style={s.stopka}>
          {onPrzelacz && (
            <button
              style={{ ...s.btnGlowny, ...(wPuli ? s.btnGlownyUsun : {}) }}
              onClick={() => { onPrzelacz(nazwa); onZamknij?.() }}
            >
              {wPuli ? 'Usuń z tygodnia' : 'Dodaj do tygodnia'}
            </button>
          )}
          {onPelnyPrzepis && (
            <button style={s.btnPoboczny} onClick={() => onPelnyPrzepis(nazwa)}>
              Pełny widok
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1200,
    background: 'rgba(20,15,10,.45)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  okno: {
    background: t.surface,
    borderRadius: '22px 22px 0 0',
    width: '100%', maxWidth: 540, maxHeight: '88vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 -12px 40px rgba(20,15,10,.25)',
    fontFamily: fonts.sans,
  },
  uchwyt: {
    width: 38, height: 4, borderRadius: 999, background: t.border,
    margin: '9px auto 0', flexShrink: 0,
  },
  naglowek: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 10, padding: '12px 20px 10px', flexShrink: 0,
  },
  eyebrow: { ...ui.eyebrow, marginBottom: 3 },
  tytul: {
    fontFamily: fonts.serif, fontSize: 21, color: t.text,
    letterSpacing: -0.2, lineHeight: 1.15,
  },
  zamknij: {
    flexShrink: 0, background: t.surfaceAlt, border: 'none', borderRadius: 999,
    width: 32, height: 32, fontSize: 14, color: t.mute, cursor: 'pointer',
  },
  // Przewija się TYLKO środek — nagłówek z nazwą i przyciski na dole
  // zostają widoczne przy długim przepisie.
  tresc: { overflowY: 'auto', padding: '0 20px 16px', WebkitOverflowScrolling: 'touch' },
  zdjecie: {
    width: '100%', height: 170, objectFit: 'cover',
    borderRadius: 14, display: 'block', marginBottom: 12,
  },
  chipy: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: {
    padding: '4px 10px', borderRadius: 999, background: t.surfaceAlt,
    fontSize: 12, color: t.mute, whiteSpace: 'nowrap',
  },
  info: {
    padding: '18px 0', textAlign: 'center',
    fontSize: 13.5, color: t.mute, lineHeight: 1.5,
  },
  sekcja: { marginTop: 4, marginBottom: 16 },
  sekcjaTytul: {
    fontFamily: fonts.serif, fontSize: 16, color: t.text,
    margin: '0 0 8px', fontWeight: 400,
  },
  licznik: { fontFamily: fonts.sans, fontSize: 11.5, color: t.muteLight, marginLeft: 6 },
  grupa: { marginBottom: 10 },
  grupaNazwa: {
    fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
    color: t.muteLight, marginBottom: 4,
  },
  skladnik: {
    display: 'flex', justifyContent: 'space-between', gap: 12,
    padding: '5px 0', borderBottom: `0.5px solid ${t.border}`,
  },
  skladnikNazwa: { fontSize: 13.5, color: t.text, minWidth: 0 },
  skladnikIlosc: { fontSize: 13, color: t.mute, whiteSpace: 'nowrap', flexShrink: 0 },
  kroki: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 },
  krok: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  krokNumer: {
    flexShrink: 0, width: 21, height: 21, borderRadius: 999,
    background: t.accentSoft, color: t.accentDark,
    fontSize: 11, fontWeight: 700,
    display: 'grid', placeItems: 'center', marginTop: 1,
  },
  krokTekst: { fontSize: 13.5, color: t.text, lineHeight: 1.5 },
  stopka: {
    display: 'flex', gap: 8, padding: '12px 20px 22px',
    borderTop: `0.5px solid ${t.border}`, flexShrink: 0,
  },
  btnGlowny: { ...ui.btnPrimary, flex: 1, padding: '13px' },
  btnGlownyUsun: { background: t.surfaceAlt, color: t.text },
  btnPoboczny: { ...ui.btnGhost, flexShrink: 0, padding: '13px 16px' },
}
