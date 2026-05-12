import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

export default function ListaZakupow({ user, onBack }) {
  const [lista, setLista] = useState([])
  const [odznaczone, setOdznaczone] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const generuj = useCallback(async () => {
    setLoading(true)

    const d = new Date()
    const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1)
    d.setHours(0, 0, 0, 0)
    const poniedzialek = d.toISOString().split('T')[0]
    const niedziela = new Date(d)
    niedziela.setDate(niedziela.getDate() + 6)
    const niedzielaStr = niedziela.toISOString().split('T')[0]

    const { data: planData } = await supabase
      .from('kalendarz')
      .select('*')
      .eq('user_id', user.id)
      .gte('data', poniedzialek)
      .lte('data', niedzielaStr)

    if (!planData || planData.length === 0) {
      setLista([])
      setLoading(false)
      return
    }

    const wybraneDania = new Set()
    const wybraneDodatki = new Set()
    const wybraneSurowki = new Set()

    planData.forEach(p => {
      if (p.danie) wybraneDania.add(p.danie)
      if (p.dodatek) wybraneDodatki.add(p.dodatek)
      if (p.surowka) wybraneSurowki.add(p.surowka)
    })

    const skladnikiMap = {}

    function dodaj(skladnik, ilosc, jednostka, kategoria) {
      if (!skladnik) return
      const iloscNum = parseFloat(ilosc?.toString().replace(',', '.'))
      if (!iloscNum || isNaN(iloscNum)) return
      const klucz = `${skladnik}||${jednostka}`
      if (skladnikiMap[klucz]) {
        skladnikiMap[klucz].ilosc += iloscNum
      } else {
        skladnikiMap[klucz] = {
          skladnik, ilosc: iloscNum,
          jednostka, kategoria: kategoria || '8_Inne',
          klucz
        }
      }
    }

    if (wybraneDania.size > 0) {
      const { data: daniaData } = await supabase
        .from('dania')
        .select('*')
        .in('"Danie"', [...wybraneDania])
      ;(daniaData || []).forEach(r => {
        dodaj(r['Składnik'], r['Ilość na 1 porcję'], r['Jednostka'], r['Kategoria'])
      })
    }

    if (wybraneDodatki.size > 0) {
      const { data: dodatkiData } = await supabase
        .from('dodatki')
        .select('*')
        .in('"Dodatek"', [...wybraneDodatki])
      ;(dodatkiData || []).forEach(r => {
        dodaj(r['Składnik'], r['Ilość na porcję'], r['Jednostka'], r['Kategoria'])
      })
    }

    if (wybraneSurowki.size > 0) {
      const { data: surowkiData } = await supabase
        .from('surowki')
        .select('*')
        .in('"Surówka"', [...wybraneSurowki])
      ;(surowkiData || []).forEach(r => {
        dodaj(r['Składnik'], r['Ilość na porcję'], r['Jednostka'], r['Kategoria'])
      })
    }

    const posortowane = Object.values(skladnikiMap).sort((a, b) =>
      a.kategoria.localeCompare(b.kategoria) || a.skladnik.localeCompare(b.skladnik)
    )

    setLista(posortowane)
    setOdznaczone(new Set())
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    generuj()
  }, [generuj])

  function toggle(klucz) {
    setOdznaczone(prev => {
      const nowe = new Set(prev)
      if (nowe.has(klucz)) nowe.delete(klucz)
      else nowe.add(klucz)
      return nowe
    })
  }

  const doKupienia = lista.filter(i => !odznaczone.has(i.klucz))
  const kupione = lista.filter(i => odznaczone.has(i.klucz))
  const procent = lista.length > 0 ? Math.round(kupione.length / lista.length * 100) : 0

  const kategorie = {}
  doKupienia.forEach(item => {
    const kat = item.kategoria.replace(/^\d_/, '')
    if (!kategorie[kat]) kategorie[kat] = []
    kategorie[kat].push(item)
  })

  if (loading) return <div style={s.loading}>Generuję listę zakupów...</div>

  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', overflowX: 'hidden' }}>
      <div style={s.container}>
        <button style={s.back} onClick={onBack}>← Wróć</button>

        <div style={s.headerBox}>
          <h1 style={s.title}>🛒 Lista zakupów</h1>
          <div style={s.subtitle}>{kupione.length} z {lista.length} produktów</div>
          <div style={s.progressBar}>
            <div style={{ ...s.progressFill, width: `${procent}%` }} />
          </div>
        </div>

        {lista.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 48 }}>🛒</div>
            <div style={{ fontSize: 16, marginTop: 12 }}>Brak zaplanowanych dań</div>
            <div style={{ fontSize: 13, color: '#aaa', marginTop: 6 }}>Wypełnij kalendarz na ten tydzień</div>
          </div>
        ) : (
          <>
            {Object.entries(kategorie).map(([kat, items]) => (
              <div key={kat}>
                <div style={s.katHeader}>{kat}</div>
                {items.map(item => (
                  <div key={item.klucz} style={s.item} onClick={() => toggle(item.klucz)}>
                    <div style={s.checkbox} />
                    <div style={s.itemInfo}>
                      <div style={s.itemNazwa}>{item.skladnik}</div>
                      <div style={s.itemIlosc}>{item.ilosc} {item.jednostka}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {kupione.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={s.kupioneHeader}>W koszyku ({kupione.length})</div>
                {kupione.map(item => (
                  <div key={item.klucz} style={{ ...s.item, ...s.itemDone }} onClick={() => toggle(item.klucz)}>
                    <div style={{ ...s.checkbox, ...s.checkboxDone }}>✓</div>
                    <div style={s.itemInfo}>
                      <div style={{ ...s.itemNazwa, textDecoration: 'line-through', color: '#aaa' }}>{item.skladnik}</div>
                      <div style={s.itemIlosc}>{item.ilosc} {item.jednostka}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button style={{ ...s.btnReset, flex: 1 }} onClick={() => setOdznaczone(new Set())}>
                🔄 Zacznij od nowa
              </button>
              <button style={{ ...s.btnReset, flex: 1 }} onClick={generuj}>
                🔃 Odśwież listę
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  container: {
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  back: {
    background: 'none', border: 'none',
    fontSize: 16, color: '#4a86e8',
    cursor: 'pointer', padding: '0 0 12px 0',
    display: 'block',
  },
  headerBox: {
    background: '#4a86e8',
    borderRadius: 16,
    padding: '20px',
    marginBottom: 16,
    color: 'white',
  },
  title: {
    fontSize: 22, fontWeight: 700,
    margin: '0 0 4px', color: 'white',
  },
  subtitle: { fontSize: 14, opacity: 0.85, marginBottom: 12 },
  progressBar: {
    background: 'rgba(255,255,255,0.3)',
    borderRadius: 10, height: 6, overflow: 'hidden',
  },
  progressFill: {
    background: 'white', height: '100%',
    borderRadius: 10, transition: 'width 0.3s ease',
  },
  katHeader: {
    fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.5px',
    color: '#4a86e8', padding: '10px 0 6px',
    borderBottom: '1px solid #eee', marginBottom: 4,
  },
  item: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 12px',
    background: 'white', borderRadius: 12,
    margin: '4px 0', cursor: 'pointer',
    border: '1px solid #f0f0f0',
  },
  itemDone: { background: '#f9f9f9' },
  checkbox: {
    width: 24, height: 24, borderRadius: '50%',
    border: '2px solid #4a86e8', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: {
    background: '#34a853', borderColor: '#34a853',
    color: 'white', fontSize: 13, fontWeight: 700,
  },
  itemInfo: { flex: 1 },
  itemNazwa: { fontSize: 15, color: '#1a1a1a', fontWeight: 500 },
  itemIlosc: { fontSize: 13, color: '#888', marginTop: 2 },
  kupioneHeader: {
    fontSize: 12, fontWeight: 600, color: '#aaa',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    padding: '8px 0',
  },
  btnReset: {
    padding: '14px',
    background: 'white', border: '1px solid #eee',
    borderRadius: 12, fontSize: 15, color: '#666',
    cursor: 'pointer', textAlign: 'center',
  },
  empty: {
    textAlign: 'center', padding: '60px 20px', color: '#888',
  },
  loading: {
    textAlign: 'center', padding: 60,
    fontSize: 16, color: '#666',
    fontFamily: 'sans-serif',
  },
}