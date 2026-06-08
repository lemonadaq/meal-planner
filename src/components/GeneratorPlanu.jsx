import { useState } from 'react'
import { t, fonts, ui } from '../theme'

// Przycisk + modal generowania planu tygodnia.
// Props:
//   maZaplanowane: bool — czy w tym tygodniu coś już jest (decyduje czy pytać)
//   onGeneruj: (tryb) => Promise  — tryb: 'puste' | 'wszystko'
//   wariant: 'duzy' | 'kompakt'  — duży na pusty kalendarz, kompakt jako akcja
export default function GeneratorPlanu({ maZaplanowane, onGeneruj, wariant = 'duzy' }) {
  const [modal, setModal] = useState(false)
  const [ladowanie, setLadowanie] = useState(false)
  const s = makeS()

  async function klik() {
    if (maZaplanowane) {
      setModal(true) // zapytaj o tryb
    } else {
      await odpal('wszystko') // pusty tydzień — od razu generuj
    }
  }

  async function odpal(tryb) {
    setLadowanie(true)
    try {
      await onGeneruj(tryb)
    } finally {
      setLadowanie(false)
      setModal(false)
    }
  }

  return (
    <>
      {wariant === 'duzy' ? (
        <button style={s.btnDuzy} onClick={klik} disabled={ladowanie}>
          <span style={s.btnDuzyIkona}>✨</span>
          <span>
            <span style={s.btnDuzyTytul}>{ladowanie ? 'Układam plan…' : 'Ułóż plan na tydzień'}</span>
            <span style={s.btnDuzySub}>Gotowe propozycje — wymienisz co chcesz</span>
          </span>
        </button>
      ) : (
        <button style={s.btnKompakt} onClick={klik} disabled={ladowanie}>
          ✨ {ladowanie ? 'Układam…' : 'Ułóż plan na tydzień'}
        </button>
      )}

      {modal && (
        <div style={s.overlay} onClick={() => setModal(false)}>
          <div style={s.sheet} onClick={e => e.stopPropagation()}>
            <div style={s.sheetTytul}>Masz już zaplanowane dni</div>
            <div style={s.sheetSub}>Co zrobić z tym tygodniem?</div>

            <button style={s.opcja} onClick={() => odpal('puste')} disabled={ladowanie}>
              <span style={s.opcjaTytul}>Uzupełnij tylko puste</span>
              <span style={s.opcjaSub}>Zostawia to co już wybrałeś</span>
            </button>

            <button style={{ ...s.opcja, ...s.opcjaMocna }} onClick={() => odpal('wszystko')} disabled={ladowanie}>
              <span style={s.opcjaTytul}>Ułóż wszystko od nowa</span>
              <span style={s.opcjaSub}>Nadpisuje cały tydzień</span>
            </button>

            <button style={s.anuluj} onClick={() => setModal(false)}>Anuluj</button>
          </div>
        </div>
      )}
    </>
  )
}

function makeS() {
  return {
    btnDuzy: {
      display: 'flex', alignItems: 'center', gap: 14, width: '100%',
      background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentDark} 100%)`,
      color: '#fff', border: 'none', borderRadius: 18,
      padding: '18px 20px', cursor: 'pointer', textAlign: 'left',
      boxShadow: '0 8px 24px rgba(192,78,44,.25)',
    },
    btnDuzyIkona: { fontSize: 26, flexShrink: 0 },
    btnDuzyTytul: { display: 'block', fontFamily: fonts.serif, fontSize: 19, fontWeight: 500, marginBottom: 2 },
    btnDuzySub: { display: 'block', fontFamily: fonts.sans, fontSize: 12.5, opacity: 0.9 },

    btnKompakt: {
      ...ui.btnPrimary, flex: 1, fontSize: 14, padding: '10px 16px',
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
    sheetTytul: { fontFamily: fonts.serif, fontSize: 20, color: t.text, marginBottom: 4 },
    sheetSub: { fontFamily: fonts.sans, fontSize: 13, color: t.mute, marginBottom: 18 },

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
