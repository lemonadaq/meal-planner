import { useState, useEffect } from 'react'
import { t, fonts, ui } from '../theme'

// Przycisk + modal generowania planu tygodnia.
// Props:
//   maZaplanowane: bool — czy w tym tygodniu coś już jest
//   onGeneruj: (tryb, opcje) => Promise  — tryb: 'puste' | 'wszystko'
//   dniDostepne: [{ dataStr, label }] — przyszłe dni bieżącego tygodnia
export default function GeneratorPlanu({ maZaplanowane, onGeneruj, dniDostepne = [] }) {
  const [modal, setModal] = useState(false)
  const [ladowanie, setLadowanie] = useState(false)
  const [wybranyDni, setWybranyDni] = useState(() => new Set(dniDostepne.map(d => d.dataStr)))
  const [powtarzaj2dni, setPowtarzaj2dni] = useState(false)
  const s = makeS()

  useEffect(() => {
    setWybranyDni(new Set(dniDostepne.map(d => d.dataStr)))
  }, [dniDostepne])

  function toggleDzien(dataStr) {
    setWybranyDni(prev => {
      const next = new Set(prev)
      if (next.has(dataStr)) next.delete(dataStr)
      else next.add(dataStr)
      return next
    })
  }

  async function odpal(tryb) {
    setLadowanie(true)
    const pomijajDaty = dniDostepne.filter(d => !wybranyDni.has(d.dataStr)).map(d => d.dataStr)
    try {
      await onGeneruj(tryb, { pomijajDaty, powtarzaj2dni })
    } finally {
      setLadowanie(false)
      setModal(false)
    }
  }

  return (
    <>
      <button style={s.btn} onClick={() => setModal(true)} disabled={ladowanie}>
        ✨ {ladowanie ? 'Układam plan…' : 'Ułóż plan na tydzień'}
      </button>

      {modal && (
        <div style={s.overlay} onClick={() => setModal(false)}>
          <div style={s.sheet} onClick={e => e.stopPropagation()}>

            {/* Wybór dni */}
            {dniDostepne.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <div style={s.sekcjaTytul}>Które dni</div>
                <div style={s.dniRow}>
                  {dniDostepne.map(d => (
                    <button
                      key={d.dataStr}
                      style={{ ...s.dzienPill, ...(wybranyDni.has(d.dataStr) ? s.dzienPillOn : {}) }}
                      onClick={() => toggleDzien(d.dataStr)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Toggle: dwa dni z rzędu */}
            <button
              style={{ ...s.toggleRow, ...(powtarzaj2dni ? s.toggleRowOn : {}) }}
              onClick={() => setPowtarzaj2dni(v => !v)}
            >
              <div style={{ flex: 1 }}>
                <div style={s.toggleTytul}>Dwa dni z rzędu</div>
                <div style={s.toggleSub}>Pon+Wt, Śr+Czw, Pt+Sob — to samo danie</div>
              </div>
              <div style={{ ...s.toggleDot, ...(powtarzaj2dni ? s.toggleDotOn : {}) }} />
            </button>

            {/* Akcja */}
            {maZaplanowane ? (
              <>
                <div style={s.sheetTytul}>Co zrobić z tym tygodniem?</div>
                <button style={s.opcja} onClick={() => odpal('puste')} disabled={ladowanie}>
                  <span style={s.opcjaTytul}>Uzupełnij tylko puste</span>
                  <span style={s.opcjaSub}>Zostawia to co już wybrałeś</span>
                </button>
                <button style={{ ...s.opcja, ...s.opcjaMocna }} onClick={() => odpal('wszystko')} disabled={ladowanie}>
                  <span style={s.opcjaTytul}>Ułóż wszystko od nowa</span>
                  <span style={s.opcjaSub}>Nadpisuje cały tydzień</span>
                </button>
              </>
            ) : (
              <button style={{ ...s.opcja, ...s.opcjaMocna }} onClick={() => odpal('wszystko')} disabled={ladowanie}>
                <span style={s.opcjaTytul}>{ladowanie ? 'Układam…' : '✨ Ułóż plan'}</span>
              </button>
            )}

            <button style={s.anuluj} onClick={() => setModal(false)}>Anuluj</button>
          </div>
        </div>
      )}
    </>
  )
}

function makeS() {
  return {
    btn: {
      ...ui.btnPrimary, width: '100%',
    },

    overlay: {
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(20,15,10,.5)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    },
    sheet: {
      background: t.surface, borderRadius: '22px 22px 0 0',
      padding: '24px 20px 32px', width: '100%', maxWidth: 540,
      fontFamily: fonts.sans,
    },
    sheetTytul: { fontFamily: fonts.serif, fontSize: 18, color: t.text, marginBottom: 12, marginTop: 4 },

    sekcjaTytul: { fontSize: 12, fontWeight: 600, color: t.mute, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 },

    dniRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
    dzienPill: {
      padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${t.border}`,
      background: t.surfaceAlt, color: t.mute, fontSize: 13, fontWeight: 600,
      cursor: 'pointer',
    },
    dzienPillOn: {
      background: t.secondary, borderColor: t.secondary, color: '#fff',
    },

    toggleRow: {
      display: 'flex', alignItems: 'center', gap: 12,
      background: t.surfaceAlt, border: `1.5px solid ${t.border}`,
      borderRadius: 14, padding: '12px 14px', marginBottom: 16,
      cursor: 'pointer', width: '100%', textAlign: 'left',
    },
    toggleRowOn: { borderColor: t.secondary },
    toggleTytul: { fontSize: 14, fontWeight: 600, color: t.text },
    toggleSub: { fontSize: 12, color: t.mute, marginTop: 2 },
    toggleDot: {
      width: 36, height: 20, borderRadius: 10, background: t.border,
      flex: '0 0 auto', transition: 'background .15s', position: 'relative',
    },
    toggleDotOn: { background: t.secondary },

    opcja: {
      display: 'flex', flexDirection: 'column', gap: 2, width: '100%',
      background: t.surfaceAlt, border: `1px solid ${t.border}`,
      borderRadius: 14, padding: '14px 16px', marginBottom: 10,
      cursor: 'pointer', textAlign: 'left',
    },
    opcjaMocna: { borderColor: t.accent },
    opcjaTytul: { fontFamily: fonts.sans, fontSize: 15, fontWeight: 600, color: t.text },
    opcjaSub: { fontFamily: fonts.sans, fontSize: 12.5, color: t.mute },

    anuluj: {
      ...ui.btnText, width: '100%', textAlign: 'center', marginTop: 4,
    },
  }
}
