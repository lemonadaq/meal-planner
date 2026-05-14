import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'

export default function ListaZakupow({ user, onBack, domyslnePorcje = 1, sledz }) {
  const [lista, setLista] = useState([])
  const [odznaczone, setOdznaczone] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [historiaIds, setHistoriaIds] = useState({})

  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  function pokazToast(msg, onUndo) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, onUndo })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

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
      setLista([]); setOdznaczone(new Set()); setHistoriaIds({}); setLoading(false); return
    }

    // Mapy: nazwa_dania -> suma porcji (z uwzględnieniem mnożników z kalendarza)
    const porcjeDan = {}
    const porcjeDodatkow = {}
    const porcjeSurowek = {}
    // Wszystkie podmiany z tygodnia (oryginał -> zamiennik). Jeśli różne wpisy
    // mają różne podmiany, ostatnia wygrywa — bo i tak agregujemy po nazwie.
    const globalnePodmiany = {}

    planData.forEach(p => {
      const porcje = p.porcje != null ? +p.porcje : +domyslnePorcje
      if (p.danie)   porcjeDan[p.danie]       = (porcjeDan[p.danie]       || 0) + porcje
      if (p.dodatek) porcjeDodatkow[p.dodatek] = (porcjeDodatkow[p.dodatek] || 0) + porcje
      if (p.surowka) porcjeSurowek[p.surowka]  = (porcjeSurowek[p.surowka]  || 0) + porcje

      const pod = p.podmiany || {}
      Object.entries(pod).forEach(([k, v]) => { if (v) globalnePodmiany[k] = v })
    })

    const skladnikiMap = {}

    function dodaj(skladnik, ilosc, jednostka, kategoria, mnoznik) {
      if (!skladnik) return
      const finalny = globalnePodmiany[skladnik] || skladnik
      const iloscNum = parseFloat(ilosc?.toString().replace(',', '.'))
      const klucz = `${finalny}||${jednostka || ''}`

      if (!iloscNum || isNaN(iloscNum)) {
        // składnik "do smaku" / "garść"
        if (!skladnikiMap[klucz]) {
          skladnikiMap[klucz] = {
            skladnik: finalny, ilosc: null,
            iloscOryginalna: ilosc,
            jednostka, kategoria: kategoria || '8_Inne', klucz,
            podmieniono: !!globalnePodmiany[skladnik],
          }
        }
        return
      }

      const realnaIlosc = iloscNum * (mnoznik || 1)
      if (skladnikiMap[klucz]) {
        if (skladnikiMap[klucz].ilosc != null) skladnikiMap[klucz].ilosc += realnaIlosc
        else skladnikiMap[klucz].ilosc = realnaIlosc
      } else {
        skladnikiMap[klucz] = {
          skladnik: finalny, ilosc: realnaIlosc,
          jednostka, kategoria: kategoria || '8_Inne', klucz,
          podmieniono: !!globalnePodmiany[skladnik],
        }
      }
    }

    // Dania
    const nazwyDan = Object.keys(porcjeDan)
    if (nazwyDan.length > 0) {
      const { data: daniaData } = await supabase.from('dania').select('*').in('"Danie"', nazwyDan)
      ;(daniaData || []).forEach(r => {
        const mnoznik = porcjeDan[r['Danie']] || 1
        dodaj(r['Składnik'], r['Ilość na 1 porcję'], r['Jednostka'], r['Kategoria'], mnoznik)
      })
    }
    // Dodatki
    const nazwyDodatkow = Object.keys(porcjeDodatkow)
    if (nazwyDodatkow.length > 0) {
      const { data: dodatkiData } = await supabase.from('dodatki').select('*').in('"Dodatek"', nazwyDodatkow)
      ;(dodatkiData || []).forEach(r => {
        const mnoznik = porcjeDodatkow[r['Dodatek']] || 1
        dodaj(r['Składnik'], r['Ilość na porcję'], r['Jednostka'], r['Kategoria'], mnoznik)
      })
    }
    // Surówki
    const nazwySurowek = Object.keys(porcjeSurowek)
    if (nazwySurowek.length > 0) {
      const { data: surowkiData } = await supabase.from('surowki').select('*').in('"Surówka"', nazwySurowek)
      ;(surowkiData || []).forEach(r => {
        const mnoznik = porcjeSurowek[r['Surówka']] || 1
        dodaj(r['Składnik'], r['Ilość na porcję'], r['Jednostka'], r['Kategoria'], mnoznik)
      })
    }

    // Zaokrąglij sumy do 2 miejsc po przecinku, żeby nie pokazywać 1.0000001
    Object.values(skladnikiMap).forEach(item => {
      if (item.ilosc != null) item.ilosc = Math.round(item.ilosc * 100) / 100
    })

    const posortowane = Object.values(skladnikiMap).sort((a, b) =>
      a.kategoria.localeCompare(b.kategoria) || a.skladnik.localeCompare(b.skladnik)
    )
    setLista(posortowane)
    setOdznaczone(new Set())
    setHistoriaIds({})
    setLoading(false)
  }, [user.id, domyslnePorcje])

  useEffect(() => { generuj() }, [generuj])

  async function toggle(item) {
    const klucz = item.klucz
    const byloOdznaczone = odznaczone.has(klucz)

    setOdznaczone(prev => {
      const n = new Set(prev)
      if (byloOdznaczone) n.delete(klucz); else n.add(klucz)
      return n
    })

    if (byloOdznaczone) {
      const histId = historiaIds[klucz]
      if (histId) {
        await supabase.from('zakupy_historia').delete().eq('id', histId)
        setHistoriaIds(prev => { const n = { ...prev }; delete n[klucz]; return n })
      }
    } else {
      const { data } = await supabase
        .from('zakupy_historia')
        .insert({
          user_id: user.id,
          skladnik: item.skladnik,
          ilosc: item.ilosc,
          jednostka: item.jednostka,
          kategoria: item.kategoria,
        })
        .select()
        .single()
      if (data) {
        setHistoriaIds(prev => ({ ...prev, [klucz]: data.id }))
        sledz?.('kupione', { skladnik: item.skladnik })
      }

      pokazToast(`Kupione: ${item.skladnik}`, async () => {
        setOdznaczone(prev => { const n = new Set(prev); n.delete(klucz); return n })
        if (data?.id) {
          await supabase.from('zakupy_historia').delete().eq('id', data.id)
          setHistoriaIds(prev => { const n = { ...prev }; delete n[klucz]; return n })
        }
        setToast(null)
      })
    }
  }

  async function zacznijOdNowa() {
    const snapshot = { odznaczone: new Set(odznaczone), historiaIds: { ...historiaIds } }
    if (snapshot.odznaczone.size === 0) return

    setOdznaczone(new Set())
    const ids = Object.values(snapshot.historiaIds)
    if (ids.length > 0) {
      await supabase.from('zakupy_historia').delete().in('id', ids)
    }
    setHistoriaIds({})

    pokazToast(`Wyczyszczono ${snapshot.odznaczone.size} z koszyka`, async () => {
      setOdznaczone(snapshot.odznaczone)
      const itemsDoOdtworzenia = lista.filter(i => snapshot.odznaczone.has(i.klucz))
      if (itemsDoOdtworzenia.length > 0) {
        const { data } = await supabase
          .from('zakupy_historia')
          .insert(itemsDoOdtworzenia.map(i => ({
            user_id: user.id,
            skladnik: i.skladnik, ilosc: i.ilosc,
            jednostka: i.jednostka, kategoria: i.kategoria,
          })))
          .select()
        const nowaMapa = {}
        ;(data || []).forEach((row, idx) => { nowaMapa[itemsDoOdtworzenia[idx].klucz] = row.id })
        setHistoriaIds(nowaMapa)
      }
      setToast(null)
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

  if (loading) return <div style={s.loading}>Generuję listę zakupów…</div>

  return (
    <div style={s.outer}>
      <div style={s.container}>
        <button style={s.back} onClick={onBack}>← Wróć</button>

        <header style={s.headerCard}>
          <div style={s.headerTop}>
            <div>
              <div style={s.headerEyebrow}>LISTA NA TEN TYDZIEŃ</div>
              <h1 style={s.title}>Zakupy</h1>
            </div>
            <div style={s.progressRing}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="3" />
                <circle cx="28" cy="28" r="24" fill="none" stroke="#fff" strokeWidth="3"
                  strokeLinecap="round" strokeDasharray={`${(procent / 100) * 150.8} 200`}
                  transform="rotate(-90 28 28)" />
              </svg>
              <div style={s.progressTxt}>{procent}%</div>
            </div>
          </div>
          <div style={s.headerSub}>
            {kupione.length} z {lista.length} produktów w koszyku
          </div>
        </header>

        {lista.length === 0 ? (
          <div style={s.empty}>
            <h3 style={s.emptyTytul}>Brak zaplanowanych dań</h3>
            <p style={s.emptySub}>Wypełnij kalendarz na ten tydzień — lista ułoży się sama z przepisów.</p>
          </div>
        ) : (
          <>
            {Object.entries(kategorie).map(([kat, items]) => (
              <section key={kat} style={s.katSekcja}>
                <h3 style={s.katHeader}>{kat}</h3>
                <div style={s.katLista}>
                  {items.map(item => (
                    <button key={item.klucz} style={s.item} onClick={() => toggle(item)}>
                      <div style={s.checkbox} />
                      <div style={s.itemInfo}>
                        <div style={s.itemNazwa}>
                          {item.skladnik}
                          {item.podmieniono && <span style={s.podmianaIcon} title="Składnik podmieniony">↻</span>}
                        </div>
                        <div style={s.itemIlosc}>
                          {item.ilosc != null
                            ? `${item.ilosc} ${item.jednostka || ''}`
                            : (item.iloscOryginalna || item.jednostka || '—')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}

            {kupione.length > 0 && (
              <section style={{ ...s.katSekcja, marginTop: 24 }}>
                <h3 style={s.katHeaderDone}>W koszyku ({kupione.length})</h3>
                <div style={s.katLista}>
                  {kupione.map(item => (
                    <button key={item.klucz} style={{ ...s.item, ...s.itemDone }} onClick={() => toggle(item)}>
                      <div style={{ ...s.checkbox, ...s.checkboxDone }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
                      </div>
                      <div style={s.itemInfo}>
                        <div style={{ ...s.itemNazwa, textDecoration: 'line-through', color: t.muteLight }}>{item.skladnik}</div>
                        <div style={{ ...s.itemIlosc, color: t.muteLight }}>
                          {item.ilosc != null
                            ? `${item.ilosc} ${item.jednostka || ''}`
                            : (item.iloscOryginalna || item.jednostka || '—')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div style={s.btnRow}>
              <button style={s.btnGhost} onClick={zacznijOdNowa}>
                Zacznij od nowa
              </button>
              <button style={s.btnGhost} onClick={generuj}>
                Odśwież listę
              </button>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div style={s.toast}>
          <span style={s.toastMsg}>{toast.msg}</span>
          <button style={s.toastBtn} onClick={toast.onUndo}>Cofnij</button>
        </div>
      )}
    </div>
  )
}

const s = {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans, position: 'relative' },
  container: {
    padding: '20px 20px 32px',
    maxWidth: 620, margin: '0 auto', boxSizing: 'border-box',
  },
  back: { ...ui.btnText, padding: '0 0 14px', display: 'block' },

  headerCard: {
    background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentDark} 100%)`,
    color: '#fff', borderRadius: 22, padding: '20px 20px 18px',
    marginBottom: 20, position: 'relative', overflow: 'hidden',
  },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerEyebrow: {
    fontFamily: fonts.sans, fontSize: 10.5, fontWeight: 600,
    letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.75,
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.serif, fontSize: 32, lineHeight: 1, color: '#fff',
    letterSpacing: -0.4, margin: 0, fontWeight: 400,
  },
  headerSub: { fontFamily: fonts.sans, fontSize: 13, opacity: 0.85, marginTop: 14 },
  progressRing: { position: 'relative', width: 56, height: 56 },
  progressTxt: {
    position: 'absolute', inset: 0,
    display: 'grid', placeItems: 'center',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },

  empty: { ...ui.card, padding: '30px 24px', textAlign: 'center' },
  emptyTytul: { ...ui.h3, marginBottom: 6 },
  emptySub: { fontFamily: fonts.sans, fontSize: 13.5, color: t.mute, margin: 0, lineHeight: 1.5 },

  katSekcja: { marginBottom: 18 },
  katHeader: {
    fontFamily: fonts.sans, fontSize: 11, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase', color: t.accent,
    margin: '0 0 8px', padding: '0 4px',
  },
  katHeaderDone: {
    fontFamily: fonts.sans, fontSize: 11, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase', color: t.muteLight,
    margin: '0 0 8px', padding: '0 4px',
  },
  katLista: { ...ui.card, padding: 0, overflow: 'hidden' },
  item: {
    width: '100%', textAlign: 'left',
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '12px 16px', background: 'transparent', border: 'none',
    borderBottom: `0.5px solid ${t.border}`,
    cursor: 'pointer', fontFamily: fonts.sans,
  },
  itemDone: { opacity: 0.7 },
  checkbox: {
    width: 22, height: 22, borderRadius: '50%',
    border: `1.5px solid ${t.borderStrong}`, flexShrink: 0,
    display: 'grid', placeItems: 'center',
    background: t.surface, transition: 'all .15s',
  },
  checkboxDone: { background: t.accent, borderColor: t.accent },
  itemInfo: { flex: 1, minWidth: 0 },
  itemNazwa: { fontSize: 14, fontWeight: 500, color: t.text, lineHeight: 1.2 },
  itemIlosc: { fontSize: 12, color: t.mute, marginTop: 3, fontVariantNumeric: 'tabular-nums' },
  podmianaIcon: {
    fontSize: 11, color: t.warm, marginLeft: 6, fontWeight: 700,
  },

  btnRow: { display: 'flex', gap: 8, marginTop: 18 },
  btnGhost: { ...ui.btnGhost, flex: 1, padding: '12px 14px' },

  toast: {
    position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
    background: t.text, color: '#fff',
    borderRadius: 12, padding: '10px 14px',
    display: 'flex', alignItems: 'center', gap: 14,
    boxShadow: '0 8px 24px rgba(0,0,0,.2)',
    zIndex: 200, fontFamily: fonts.sans, fontSize: 13,
    maxWidth: 'calc(100vw - 32px)',
  },
  toastMsg: { color: '#fff', flex: 1 },
  toastBtn: {
    background: 'none', border: 'none', color: t.accentSoft,
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', padding: '4px 6px',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  loading: {
    textAlign: 'center', padding: 80,
    fontFamily: fonts.sans, fontSize: 15, color: t.mute,
    background: t.bg, minHeight: '100vh',
  },
}
