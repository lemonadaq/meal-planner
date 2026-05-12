import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const DNI = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']
const POSILKI = ['Śniadanie', 'Obiad', 'Kolacja']

function getPoniedzialek(offset = 0) {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1 + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatData(date) {
  return date.toISOString().split('T')[0]
}

function formatNaglowek(date) {
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

export default function Kalendarz({ user, onBack }) {
  const [tydzien, setTydzien] = useState(0)
  const [dania, setDania] = useState([])
  const [dodatki, setDodatki] = useState([])
  const [surowki, setSurowki] = useState([])
  const [plan, setPlan] = useState({})
  const [loading, setLoading] = useState(true)
  const [zapisywanie, setZapisywanie] = useState(false)

  const poniedzialek = getPoniedzialek(tydzien)
  const dni = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(poniedzialek)
    d.setDate(d.getDate() + i)
    return d
  })

  useEffect(() => {
    async function pobierzDane() {
      setLoading(true)

      const [{ data: d }, { data: do_ }, { data: s }] = await Promise.all([
        supabase.from('dania').select('"Danie", "TYP"').order('"Danie"'),
        supabase.from('dodatki').select('"Dodatek"').order('"Dodatek"'),
        supabase.from('surowki').select('"Surówka"').order('"Surówka"'),
      ])

      const unikalDania = [...new Map((d || []).map(x => [x.Danie, x])).values()]
      setDania(unikalDania)
      setDodatki([...new Set((do_ || []).map(x => x.Dodatek))])
      setSurowki([...new Set((s || []).map(x => x['Surówka']))])

      // Pobierz plan na ten tydzień
      const od = formatData(dni[0])
      const do2 = formatData(dni[6])
      const { data: planData } = await supabase
        .from('kalendarz')
        .select('*')
        .eq('user_id', user.id)
        .gte('data', od)
        .lte('data', do2)

      const nowyPlan = {}
      ;(planData || []).forEach(p => {
        const klucz = `${p.data}_${p.posilek}`
        nowyPlan[klucz] = p
      })
      setPlan(nowyPlan)
      setLoading(false)
    }
    pobierzDane()
  }, [tydzien])

  async function zapiszWpis(data, posilek, pole, wartosc) {
    const klucz = `${data}_${posilek}`
    const istniejacy = plan[klucz]

    setZapisywanie(true)

    if (istniejacy) {
      const { data: zaktualizowany } = await supabase
        .from('kalendarz')
        .update({ [pole]: wartosc || null })
        .eq('id', istniejacy.id)
        .select()
        .single()
      setPlan(prev => ({ ...prev, [klucz]: zaktualizowany }))
    } else {
      const { data: nowy } = await supabase
        .from('kalendarz')
        .insert({ user_id: user.id, data, posilek, [pole]: wartosc || null })
        .select()
        .single()
      setPlan(prev => ({ ...prev, [klucz]: nowy }))
    }
    setZapisywanie(false)
  }

  function pobierzTypDania(nazwaDania) {
    const d = dania.find(x => x.Danie === nazwaDania)
    return d?.TYP || 'samodzielne'
  }

  if (loading) return <div style={s.loading}>Ładowanie kalendarza...</div>

  return (
    <div style={s.container}>
      <button style={s.back} onClick={onBack}>← Wróć</button>

      <div style={s.header}>
        <button style={s.navBtn} onClick={() => setTydzien(t => t - 1)}>‹</button>
        <h2 style={s.title}>
          {formatNaglowek(dni[0])} — {formatNaglowek(dni[6])}
        </h2>
        <button style={s.navBtn} onClick={() => setTydzien(t => t + 1)}>›</button>
      </div>

      {zapisywanie && <div style={s.saving}>Zapisuję...</div>}

      <div style={s.grid}>
        {dni.map((dzien, di) => {
          const dataStr = formatData(dzien)
          return (
            <div key={dataStr} style={s.dzienKarta}>
              <div style={s.dzienHeader}>
                <span style={s.dzienNazwa}>{DNI[di]}</span>
                <span style={s.dzienData}>{formatNaglowek(dzien)}</span>
              </div>

              {POSILKI.map(posilek => {
                const klucz = `${dataStr}_${posilek}`
                const wpis = plan[klucz]
                const typ = pobierzTypDania(wpis?.danie)
                const pokazDodatki = posilek === 'Obiad' && typ === 'z_dodatkiem'

                return (
                  <div key={posilek} style={s.posilekBlok}>
                    <div style={s.posilekLabel}>{posilek}</div>
                    <select
                      style={s.select}
                      value={wpis?.danie || ''}
                      onChange={e => zapiszWpis(dataStr, posilek, 'danie', e.target.value)}
                    >
                      <option value="">— wybierz —</option>
                      {dania.map(d => (
                        <option key={d.Danie} value={d.Danie}>{d.Danie}</option>
                      ))}
                    </select>

                    {pokazDodatki && (
                      <>
                        <select
                          style={{ ...s.select, ...s.selectMaly }}
                          value={wpis?.dodatek || ''}
                          onChange={e => zapiszWpis(dataStr, posilek, 'dodatek', e.target.value)}
                        >
                          <option value="">🥔 dodatek...</option>
                          {dodatki.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <select
                          style={{ ...s.select, ...s.selectMaly }}
                          value={wpis?.surowka || ''}
                          onChange={e => zapiszWpis(dataStr, posilek, 'surowka', e.target.value)}
                        >
                          <option value="">🥗 surówka...</option>
                          {surowki.map(s2 => (
                            <option key={s2} value={s2}>{s2}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  back: {
    background: 'none', border: 'none',
    fontSize: 16, color: '#4a86e8',
    cursor: 'pointer', padding: '0 0 12px 0',
    display: 'block',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1a1a1a',
    margin: 0,
  },
  navBtn: {
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: 8,
    width: 36, height: 36,
    fontSize: 20, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  saving: {
    textAlign: 'center',
    fontSize: 13,
    color: '#4a86e8',
    marginBottom: 8,
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  dzienKarta: {
    background: 'white',
    borderRadius: 14,
    padding: '14px',
    border: '1px solid #f0f0f0',
  },
  dzienHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: '1px solid #f0f0f0',
  },
  dzienNazwa: {
    fontWeight: 600,
    fontSize: 15,
    color: '#1a1a1a',
  },
  dzienData: {
    fontSize: 13,
    color: '#888',
  },
  posilekBlok: {
    marginBottom: 10,
  },
  posilekLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#4a86e8',
    marginBottom: 4,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #eee',
    borderRadius: 8,
    background: '#fafafa',
    color: '#1a1a1a',
    marginBottom: 4,
    boxSizing: 'border-box',
  },
  selectMaly: {
    fontSize: 13,
    padding: '8px 10px',
    color: '#555',
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    fontSize: 16,
    color: '#666',
    fontFamily: 'sans-serif',
  },
}