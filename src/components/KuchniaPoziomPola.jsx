// Pola „Kuchnia" (select) i „Poziom" (3 przyciski) — wspólne dla dodawania
// (DodajDanie.jsx) i edycji dania (DanieDetail.jsx). Oba pola są opcjonalne:
// puste = null w bazie, danie po prostu nie łapie się na filtr.
//
// Wartości techniczne (`wloska`, `latwe`) i etykiety z flagami: src/etykiety.js.

import { t, fonts } from '../theme'
import { KUCHNIE, KUCHNIA_LABEL, POZIOMY, POZIOM_LABEL } from '../etykiety'

export default function KuchniaPoziomPola({ kuchnia, setKuchnia, poziom, setPoziom, selectStyle }) {
  const s = makeS()
  return (
    <div style={s.wrap}>
      <select
        aria-label="Kuchnia"
        style={{ ...s.select, ...selectStyle }}
        value={kuchnia || ''}
        onChange={e => setKuchnia(e.target.value)}>
        <option value="">— kuchnia —</option>
        {KUCHNIE.map(k => <option key={k} value={k}>{KUCHNIA_LABEL[k]}</option>)}
      </select>
      <div style={s.segRow} role="group" aria-label="Poziom trudności">
        {POZIOMY.map(p => (
          <button key={p} type="button"
            aria-pressed={poziom === p}
            style={{ ...s.segBtn, ...(poziom === p ? s.segBtnOn : {}) }}
            // drugie stuknięcie odznacza — poziom jest opcjonalny
            onClick={() => setPoziom(poziom === p ? '' : p)}>
            {POZIOM_LABEL[p]}
          </button>
        ))}
      </div>
    </div>
  )
}

const makeS = () => ({
  wrap: { display: 'flex', flexDirection: 'column', gap: 8 },
  select: {
    width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '10px 12px',
    border: `1px solid ${t.border}`, borderRadius: 12, background: t.surface,
    color: t.text, fontFamily: fonts.sans, fontSize: 15,
  },
  segRow: { display: 'flex', gap: 4, padding: 3, background: t.surfaceAlt, borderRadius: 12 },
  segBtn: {
    flex: 1, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px 6px', border: 'none', borderRadius: 9, background: 'transparent',
    color: t.mute, fontFamily: fonts.sans, fontSize: 13, cursor: 'pointer',
  },
  segBtnOn: {
    background: t.surface, color: t.text, fontWeight: 600,
    boxShadow: '0 1px 2px rgba(74,55,40,.08)',
  },
})
