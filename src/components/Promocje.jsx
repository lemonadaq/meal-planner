// Promocje.jsx
// Model danych: item.promos = [ {store, old, now, off, until}, ... ] posortowane od najtańszego
//               item.promo  = item.promos[0] (najtańszy — dla wstecznej zgodności)

import { useState } from 'react'
import { t } from '../theme'

export const zl = (v) => v.toFixed(2).replace('.', ',') + ' zł'

export const STORE_DOT = { Biedronka:'#C9A33B', Lidl:'#4A7FB5', Kaufland:'#B5564A', Auchan:'#8A6B43' }

export function StoreDot({ store, size = 8 }) {
  return <span style={{ width:size, height:size, borderRadius:'50%',
    background: STORE_DOT[store] || t.mute, display:'inline-block', flex:'0 0 auto' }} />
}

// ── Zwijana karta nad listą — N okazji, podział na sklepy ──
export function PromoBanner({ items }) {
  const [open, setOpen] = useState(false)
  const zPromo = items.filter(i => i.promos?.length)
  if (!zPromo.length) return null

  // Grupuj po sklepach — każdy item może być w wielu sklepach
  const perSklep = {}
  for (const item of zPromo) {
    for (const p of item.promos) {
      if (!perSklep[p.store]) perSklep[p.store] = []
      perSklep[p.store].push({ skladnik: item.skladnik, klucz: item.klucz, promo: p })
    }
  }
  const sklepy = Object.entries(perSklep).sort((a, b) => b[1].length - a[1].length)
  const lacznieOkazji = sklepy.reduce((s, [, v]) => s + v.length, 0)

  return (
    <div onClick={() => setOpen(o => !o)} style={{
      background: t.secondarySoft, borderRadius: 16, padding: '13px 14px',
      marginBottom: 12, cursor: 'pointer', border: `1px solid ${t.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🏷️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text }}>{lacznieOkazji} okazji na Twojej liście</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
            {sklepy.map(([sklep, rows]) => (
              <span key={sklep} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: t.mute }}>
                <StoreDot store={sklep} size={7} />
                <span style={{ fontWeight: 600 }}>{sklep}</span>
                <span>{rows.length}</span>
              </span>
            ))}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.secondary} strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
      {open && (
        <div style={{ marginTop: 11, display: 'flex', flexDirection: 'column', gap: 14, animation: 'expandIn .18s ease-out' }}>
          {sklepy.map(([sklep, rows]) => (
            <div key={sklep}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <StoreDot store={sklep} size={8} />
                <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{sklep}</span>
                <span style={{ fontSize: 11.5, color: t.mute }}>({rows.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rows.map(row => (
                  <div key={row.klucz + sklep} style={{ display: 'flex', alignItems: 'center', gap: 9,
                    background: t.surface, borderRadius: 11, padding: '8px 11px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>{row.skladnik}</span>
                      <span style={{ fontSize: 11.5, color: t.mute }}> · {row.promo.until}</span>
                    </div>
                    <div style={{ fontSize: 12, flex: '0 0 auto' }}>
                      {row.promo.old != null && <s style={{ color: t.muteLight }}>{zl(row.promo.old)}</s>}
                      {' '}<b style={{ color: t.secondary }}>{zl(row.promo.now)}</b>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Chip ceny po prawej stronie wiersza — kropki wszystkich sklepów + najtańsza cena ──
export function PromoChip({ promos, open }) {
  if (!promos?.length) return null
  const tani = promos[0]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto' }}>
      <span style={{ background: t.secondarySoft, borderRadius: 8, padding: '4px 8px',
        display: 'flex', alignItems: 'center', gap: 5 }}>
        {promos.map(p => <StoreDot key={p.store} store={p.store} size={6} />)}
        <span style={{ fontSize: 12, fontWeight: 700, color: t.secondary }}>{zl(tani.now)}</span>
      </span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.muteLight} strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </div>
  )
}

// ── Rozwijany szczegół pod wierszem — lista wszystkich sklepów ──
export function PromoDetail({ promos }) {
  if (!promos?.length) return null
  return (
    <div style={{
      margin: '0 0 11px 35px', padding: '10px 12px', borderRadius: 11,
      background: t.surfaceWash, border: `1px solid ${t.border}`,
      animation: 'expandIn .18s ease-out', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {promos.map(promo => (
        <div key={promo.store} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StoreDot store={promo.store} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>{promo.store}</span>
            <span style={{ fontSize: 11.5, color: t.mute }}> · {promo.until}</span>
          </div>
          <div style={{ fontSize: 12, flex: '0 0 auto' }}>
            {promo.old != null && <><s style={{ color: t.muteLight }}>{zl(promo.old)}</s>{' '}</>}
            <b style={{ color: t.secondary }}>{zl(promo.now)}</b>
          </div>
        </div>
      ))}
    </div>
  )
}
