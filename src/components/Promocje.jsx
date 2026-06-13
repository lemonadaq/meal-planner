// Promocje.jsx
// Komponenty UI promocji sklepowych na liście zakupów (design zatwierdzony —
// patrz Zadanie-promocje.md). Wszystkie kolory przez tokeny `t` (light/dark).
//
// Model danych: item.promo = null | {
//   store: 'Lidl',             // nazwa sklepu
//   old: 8.49, now: 5.99,      // ceny w zł (number); old może być null
//   off: '-29%',               // etykieta rabatu (string — może być „2 za 7 zł")
//   until: 'do niedzieli',     // do kiedy, krótki human-readable
// }

import { useState } from 'react'
import { t } from '../theme'

export const zl = (v) => v.toFixed(2).replace('.', ',') + ' zł'

// kolory-kropki sklepów (neutralne, nie loga) — celowo stałe w obu motywach
export const STORE_DOT = { Biedronka:'#C9A33B', Lidl:'#4A7FB5', Kaufland:'#B5564A', Auchan:'#8A6B43' }
const SKLEPY = ['Lidl', 'Biedronka', 'Kaufland', 'Auchan']

export function StoreDot({ store, size = 8 }) {
  return <span style={{ width:size, height:size, borderRadius:'50%',
    background: STORE_DOT[store] || t.mute, display:'inline-block', flex:'0 0 auto' }} />
}

// ── Chipsy wyboru sklepu ──
export function StoreChips({ preferowany, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
      {SKLEPY.map(sklep => {
        const aktywny = preferowany === sklep
        return (
          <button key={sklep} onClick={() => onChange(aktywny ? null : sklep)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', borderRadius: 20,
            border: `1.5px solid ${aktywny ? STORE_DOT[sklep] : t.border}`,
            background: aktywny ? STORE_DOT[sklep] + '22' : t.surface,
            color: aktywny ? STORE_DOT[sklep] : t.mute,
            fontSize: 13, fontWeight: aktywny ? 700 : 500,
            cursor: 'pointer',
          }}>
            <StoreDot store={sklep} size={7} />
            {sklep}
          </button>
        )
      })}
    </div>
  )
}

// ── Zwijana karta nad listą: „N okazji na Twojej liście" ──
export function PromoBanner({ items }) {
  const [open, setOpen] = useState(false)
  const promos = items.filter(i => i.promo)
  if (!promos.length) return null
  const saved = promos.reduce((s, i) => s + ((i.promo.old ?? 0) - i.promo.now), 0)
  return (
    <div onClick={() => setOpen(o => !o)} style={{
      background: t.secondarySoft, borderRadius: 16, padding: '13px 14px',
      marginBottom: 12, cursor: 'pointer', border: `1px solid ${t.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🏷️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text }}>{promos.length} okazji na Twojej liście</div>
          {saved > 0 && <div style={{ fontSize: 12, color: t.secondary, fontWeight: 600, marginTop: 1 }}>oszczędzasz ~{zl(saved)}</div>}
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.secondary} strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
      {open && (
        <div style={{ marginTop: 11, display: 'flex', flexDirection: 'column', gap: 8, animation: 'expandIn .18s ease-out' }}>
          {promos.map(item => (
            <div key={item.klucz} style={{ display: 'flex', alignItems: 'center', gap: 9, background: t.surface, borderRadius: 11, padding: '9px 11px' }}>
              <StoreDot store={item.promo.store} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>{item.skladnik}</span>
                <span style={{ fontSize: 11.5, color: t.mute }}> · {item.promo.store}, {item.promo.until}</span>
              </div>
              <div style={{ fontSize: 12, flex: '0 0 auto' }}>
                {item.promo.old != null && <s style={{ color: t.muteLight }}>{zl(item.promo.old)}</s>}
                {' '}<b style={{ color: t.secondary }}>{zl(item.promo.now)}</b>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Chip ceny po prawej stronie wiersza ──
export function PromoChip({ promo, open }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto' }}>
      <span style={{ background: t.secondarySoft, borderRadius: 8, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.secondary }}>{zl(promo.now)}</span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: t.secondary, opacity: .75 }}>{promo.off}</span>
      </span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.muteLight} strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </div>
  )
}

// ── Rozwijany szczegół pod wierszem ──
export function PromoDetail({ promo }) {
  return (
    <div style={{
      margin: '0 0 11px 35px', padding: '10px 12px', borderRadius: 11,
      background: t.surfaceWash, border: `1px solid ${t.border}`,
      animation: 'expandIn .18s ease-out', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <StoreDot store={promo.store} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>{promo.store} · {promo.until}</div>
        <div style={{ fontSize: 11.5, color: t.mute, marginTop: 1 }}>
          {promo.old != null && <><s style={{ opacity: .7 }}>{zl(promo.old)}</s>{' → '}</>}
          <b style={{ color: t.secondary }}>{zl(promo.now)}</b>
          {promo.old != null && <>{'  ·  taniej o '}<b style={{ color: t.secondary }}>{zl(promo.old - promo.now)}</b></>}
        </div>
      </div>
    </div>
  )
}
