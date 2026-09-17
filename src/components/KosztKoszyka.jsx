// KosztKoszyka.jsx
// Zakładka „Koszty" w liście zakupów — ile mniej więcej kosztuje ten koszyk
// w każdym sklepie. Dane z `ceny_bazowe_view` (migracja_ceny_bazowe.sql),
// wycena w src/cenyBazowe.js.

import { formatujZl } from '../cenyBazowe'
import { t } from '../theme'
import { StoreDot } from './Promocje'

const karta = {
  background: t.card ?? t.secondarySoft,
  border: `1px solid ${t.border}`,
  borderRadius: 16,
  padding: '14px 15px',
  marginBottom: 12,
}

// Widoku nie ma w bazie albo historia jeszcze nic nie uzbierała.
function BrakDanych() {
  return (
    <div style={{ ...karta, textAlign: 'center' }}>
      <div style={{ fontSize: 30, marginBottom: 8 }}>🧾</div>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: t.text, marginBottom: 6 }}>
        Brak cen bazowych
      </div>
      <div style={{ fontSize: 13, color: t.mute, lineHeight: 1.5 }}>
        Odpal <strong>migracja_ceny_bazowe.sql</strong> w Supabase (SQL Editor).
        Ceny liczą się z historii gazetek — produkt musi być widziany
        w co najmniej dwóch różnych cenach, żeby dało się odróżnić półkę
        od promocji.
      </div>
    </div>
  )
}

function Pasek({ udzial, najtanszy }) {
  return (
    <div style={{ height: 6, background: t.border, borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
      <div style={{
        width: `${Math.max(4, Math.round(udzial * 100))}%`,
        height: '100%',
        background: najtanszy ? t.accent : t.muteLight,
        borderRadius: 3,
      }} />
    </div>
  )
}

function WierszSklepu({ dane, najdrozszy, najtanszy, wspolnych }) {
  const { sklep, koszt, kosztBazowy, kosztCalosci, wycenionych, wPromocji } = dane
  const oszczednosc = kosztBazowy - koszt

  return (
    <div style={{ ...karta, marginBottom: 10, borderColor: najtanszy ? t.accent : t.border }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <StoreDot store={sklep} size={9} />
        <span style={{ fontSize: 14.5, fontWeight: 700, color: t.text }}>{sklep}</span>
        {najtanszy && wspolnych > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: t.accent,
            background: t.accentSoft, borderRadius: 6, padding: '2px 6px',
          }}>
            najtaniej
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 700, color: t.text }}>
          {wspolnych > 0 ? formatujZl(koszt) : '—'}
        </span>
      </div>

      {wspolnych > 0 && (
        <Pasek udzial={najdrozszy > 0 ? koszt / najdrozszy : 0} najtanszy={najtanszy} />
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8, fontSize: 12, color: t.mute }}>
        <span>wycenionych: <strong style={{ color: t.text }}>{wycenionych}</strong></span>
        {wPromocji > 0 && <span>🏷️ w promocji: <strong style={{ color: t.text }}>{wPromocji}</strong></span>}
        {oszczednosc > 0.005 && (
          <span>promocje zbijają <strong style={{ color: t.accent }}>{formatujZl(oszczednosc)}</strong></span>
        )}
      </div>

      <div style={{ marginTop: 4, fontSize: 11.5, color: t.muteLight }}>
        cały koszyk, na ile da się wycenić: {formatujZl(kosztCalosci)}
      </div>
    </div>
  )
}

export default function KosztKoszyka({ wycena, ladowanie }) {
  if (ladowanie) {
    return <div style={{ ...karta, textAlign: 'center', color: t.mute, fontSize: 13 }}>Liczę koszyk…</div>
  }

  if (!wycena?.sklepy?.length) return <BrakDanych />

  const { sklepy, wspolnych, bezCeny, pozycje } = wycena
  const najdrozszy = Math.max(...sklepy.map(s => s.koszt))

  return (
    <div>
      <div style={{ ...karta, background: t.accentSoft, borderColor: t.accent }}>
        <div style={{ fontSize: 12.5, color: t.text, lineHeight: 1.55 }}>
          Ceny bazowe to <strong>najwyższe ceny widziane w gazetkach</strong>, więc
          są zaniżone względem półki — traktuj to jako porównanie sklepów,
          nie jako paragon.
        </div>
      </div>

      {wspolnych > 0 ? (
        <div style={{ fontSize: 12, color: t.mute, margin: '0 2px 10px' }}>
          Ranking po <strong style={{ color: t.text }}>{wspolnych}</strong> {
            wspolnych === 1 ? 'pozycji, którą zna' : 'pozycjach, które zna'
          } każdy sklep — inaczej wygrywałby ten z najgorszym pokryciem.
        </div>
      ) : (
        <div style={{ fontSize: 12, color: t.mute, margin: '0 2px 10px' }}>
          Żadnej pozycji nie znają wszystkie sklepy naraz, więc rankingu nie ma —
          poniżej same wyceny cząstkowe.
        </div>
      )}

      {sklepy.map((s, i) => (
        <WierszSklepu
          key={s.sklep}
          dane={s}
          najdrozszy={najdrozszy}
          najtanszy={i === 0 && wspolnych > 0}
          wspolnych={wspolnych}
        />
      ))}

      {bezCeny > 0 && (
        <div style={{ ...karta, marginTop: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 6 }}>
            Bez ceny: {bezCeny} z {pozycje.length}
          </div>
          <div style={{ fontSize: 12, color: t.mute, lineHeight: 1.5 }}>
            {pozycje.filter(p => p.wSklepach.size === 0).slice(0, 12).map(p => p.skladnik).join(', ')}
            {bezCeny > 12 ? '…' : ''}
          </div>
          <div style={{ fontSize: 11.5, color: t.muteLight, marginTop: 6 }}>
            Te produkty nie trafiły jeszcze do żadnej gazetki. Dojdą same,
            jak się pojawią.
          </div>
        </div>
      )}
    </div>
  )
}
