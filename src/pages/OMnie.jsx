// OMnie.jsx
// Strona „O mnie". Tekst jest Filipa — leży tu jako stała, a nie w bazie,
// bo to jedna strona, która zmienia się raz na rok, a nie treść do zarządzania
// z panelu. Zmiana = edycja tego pliku.

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import NaglowekBloga from '../components/NaglowekBloga'
import { t, fonts } from '../theme'

const TRESC = [
  { typ: 'p', tekst: 'Cześć, jestem Filip. Mąż, tata i inżynier, choć to ostatnie słychać głównie wtedy, gdy zaczynam optymalizować kolejność krojenia warzyw. W domu gotuję dla całej rodziny i to właśnie kuchnia jest miejscem, w którym najchętniej spędzam wolny czas.' },

  { typ: 'h2', tekst: 'Gotowanie jako proces (i trochę jako chaos)' },
  { typ: 'p', tekst: 'Nie jestem kucharzem z wykształcenia. Gotuję, bo lubię. Lubię też to, że w kuchni dobry wynik zależy od szczegółów: temperatury, czasu i proporcji. Inżynier we mnie widzi tu kolejny proces do dopracowania. Kucharz we mnie zwykle i tak dosypuje chili na oko.' },
  { typ: 'p', tekst: 'Mam kilka rzeczy, do których ciągle wracam:' },

  { typ: 'punkt', tytul: 'Pizza', tekst: 'Ciasto robię sam, na mące typu 00. To świetny poligon doświadczalny, bo przy tych samych czterech składnikach nawodnienie, czas wyrastania i temperatura pieca dają zupełnie różne efekty.' },
  { typ: 'punkt', tytul: 'Stek', tekst: 'Antrykot, czyli ribeye, z frytkami. Klasyka, która nie potrzebuje wiele, poza dobrym mięsem i cierpliwością przy odpoczywaniu po smażeniu.' },
  { typ: 'punkt', tytul: 'Ostre jedzenie', tekst: 'Jeśli danie może być pikantniejsze, to zwykle takie będzie. Chyba że gotuję dla najmłodszego domownika, wtedy chili czeka na swoją kolej na talerzu dorosłych.' },
  { typ: 'punkt', tytul: 'Kawa', tekst: 'Bez niej nie rusza ani kuchnia, ani poranek z małym dzieckiem.' },

  { typ: 'h2', tekst: 'Eksperymenty, które nie zawsze wychodzą' },
  { typ: 'p', tekst: 'Nie wszystko wychodzi za pierwszym razem i uważam, że to najlepsza część tego hobby. Rogaliki drożdżowe z dżemem nauczyły mnie pokory: dżem wypływał, a ciasto rosło tak, jakby chciało uciec z blachy. Ostatnio robię konfiturę z brzoskwiń i szukam wersji bez cukru, którą da się bezpiecznie zawekować na zimę. Coraz bardziej ciągnie mnie też w stronę kuchni afrykańskiej, bo to dla mnie wciąż prawie nieodkryty świat smaków.' },

  { typ: 'h2', tekst: 'Kuchnia na co dzień' },
  { typ: 'p', tekst: 'Gotowanie dla rodziny to nie tylko weekendowe popisy z pizzą i stekiem. To przede wszystkim zwykły wtorek, kiedy wszyscy są głodni, czasu jest mało, a w lodówce zostało pół cukinii. Dlatego najbardziej cenię przepisy, które są proste, powtarzalne i smakują tak, że nikt przy stole nie narzeka. Takie dania też tu znajdziesz, obok moich bardziej szalonych eksperymentów.' },

  { typ: 'h2', tekst: 'Co tu znajdziesz' },
  { typ: 'p', tekst: 'Na tym blogu dzielę się tym, co gotuję, co mi wyszło i co mi kompletnie nie wyszło (a wtedy piszę też dlaczego). Pojawią się przepisy, eksperymenty i trochę inżynierskiego spojrzenia na to, jak ugotować coś lepiej i mniejszym wysiłkiem. Wszystko to z perspektywy kogoś, kto gotuje dla rodziny, a nie dla jury.' },
]

export default function OMnie() {
  useEffect(() => {
    document.title = 'O mnie — Menu planer'
    return () => { document.title = 'Menu planer' }
  }, [])

  return (
    <div style={s.outer}>
      <div style={s.container}>
        <NaglowekBloga wariant="podstrona" />

        <h1 style={s.tytul}>O mnie</h1>

        <div style={s.tresc}>
          {TRESC.map((blok, i) => {
            if (blok.typ === 'h2') return <h2 key={i} style={s.h2}>{blok.tekst}</h2>
            if (blok.typ === 'punkt') {
              return (
                <div key={i} style={s.punkt}>
                  <div style={s.punktTytul}>{blok.tytul}</div>
                  <div style={s.punktTekst}>{blok.tekst}</div>
                </div>
              )
            }
            return <p key={i} style={s.p}>{blok.tekst}</p>
          })}
        </div>

        <div style={s.zakonczenie}>
          Rozgość się. Kawa już się parzy.
        </div>

        <footer style={s.stopka}>
          <Link to="/" style={s.stopkaLink}>← Wszystkie wpisy</Link>
        </footer>
      </div>
    </div>
  )
}

const s = {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans },
  container: { padding: '18px 18px 40px', maxWidth: 680, margin: '0 auto', boxSizing: 'border-box' },

  tytul: {
    fontFamily: fonts.serif, fontSize: 34, lineHeight: 1.1, fontWeight: 700,
    color: t.text, margin: '0 0 20px',
  },
  tresc: { fontSize: 15.5, lineHeight: 1.7, color: t.text },
  p: { margin: '0 0 16px' },
  h2: {
    fontFamily: fonts.serif, fontSize: 23, lineHeight: 1.2, fontWeight: 700,
    color: t.text, margin: '30px 0 12px',
  },

  punkt: {
    background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
    padding: '13px 15px', marginBottom: 10,
  },
  punktTytul: { fontSize: 14.5, fontWeight: 700, color: t.accent, marginBottom: 4 },
  punktTekst: { fontSize: 14.5, lineHeight: 1.6, color: t.text },

  zakonczenie: {
    fontFamily: fonts.serif, fontSize: 20, color: t.text,
    textAlign: 'center', margin: '34px 0 10px', lineHeight: 1.4,
  },

  stopka: { marginTop: 24, paddingTop: 18, borderTop: `1px solid ${t.border}`, textAlign: 'center' },
  stopkaLink: { fontSize: 13, color: t.accent, textDecoration: 'none', fontWeight: 600 },
}
