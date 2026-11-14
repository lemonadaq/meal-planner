// Faza 4 — wdrożenie zatwierdzonych CSV. TEN SKRYPT NIC NIE ZAPISUJE DO BAZY.
//
// Czyta ŚWIEŻY stan bazy (REST, tylko odczyt), liczy zmiany i:
//   DRY_RUN=true (domyślnie) — wypisuje liczbę zmienianych wierszy na tabelę
//   DRY_RUN=false            — dodatkowo zapisuje dwa pliki SQL obok skryptu:
//       zastosuj_proba.sql — wszystkie zmiany + sprawdzenia, na końcu ROLLBACK
//                            (błąd „PRÓBA OK" z liczbami = wszystko przeszło)
//       zastosuj.sql       — to samo, ale z zapisem
// Oba pliki to JEDNA transakcja (bez BEGIN/COMMIT w środku — psql
// --single-transaction i SQL Editor same obejmują cały plik transakcją).
// Każde nieudane sprawdzenie robi raise exception → ROLLBACK całości.
//
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE=... node skrypty/czyszczenie/zastosuj.mjs
//   ZRODLO=zrzut — zamiast bazy weź dane/*.json (do testów offline)

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { normalizujNazweMeta } from '../../src/jednostki.js'
import {
  TU, czytajCsv, czytajJson, wczytajMapowania, przeksztalcDania, mapaNazwSkladnikow,
} from './przeksztalc.mjs'

const DRY_RUN = process.env.DRY_RUN !== 'false'
const ZRODLO = process.env.ZRODLO || 'baza'

// ── odczyt ──
async function pobierz(tabela, order) {
  if (ZRODLO === 'zrzut') return czytajJson(`dane/${tabela}.json`)
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const klucz = process.env.SUPABASE_SERVICE || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !klucz) { console.error('Brak SUPABASE_URL / SUPABASE_SERVICE (albo ZRODLO=zrzut).'); process.exit(1) }
  const naglowki = klucz.startsWith('eyJ') ? { apikey: klucz, Authorization: `Bearer ${klucz}` } : { apikey: klucz }
  const out = []
  for (let od = 0; ; od += 1000) {
    const r = await fetch(`${url}/rest/v1/${tabela}?select=*${order ? `&order=${order}` : ''}`,
      { headers: { ...naglowki, Range: `${od}-${od + 999}` } })
    if (!r.ok) throw new Error(`${tabela}: HTTP ${r.status} ${await r.text()}`)
    const s = await r.json()
    out.push(...s)
    if (s.length < 1000) break
  }
  return out
}

const dania = await pobierz('dania', 'id')
const kalendarz = await pobierz('kalendarz', 'id')
const plan = await pobierz('plan_tygodnia', 'id')
const sygnaly = await pobierz('preferencje_sygnaly', 'id')
const korekty = await pobierz('korekty_zakupow', 'id')
const historia = await pobierz('zakupy_historia', 'id')
const wDomu = await pobierz('produkty_w_domu', 'id')
const cykliczne = await pobierz('zakupy_cykliczne', 'id')

const zatw = wczytajMapowania()
const { operacje, wynik, bledy } = przeksztalcDania(dania, zatw)
if (bledy.length) {
  console.error('Baza zmieniła się od zrzutu albo CSV nie pasują:\n' + bledy.slice(0, 30).join('\n'))
  process.exit(1)
}
const kcal = new Map(czytajCsv('raport_kcal.csv').map(r => [r.danie, parseInt(r.kcal, 10)]))

// ── mapy nazw ──
const mapaDan = new Map([...zatw.dania].filter(([s, w]) => s !== w.danie_nowe).map(([s, w]) => [s, w.danie_nowe]))
const mapaSkl = mapaNazwSkladnikow(zatw.mapa)
// stare nazwy wierszy skladniki_meta („Koper", „Ser biały") → nowe, bo lista zakupów
// pokazuje i zapisuje nazwę z meta
for (const m of zatw.meta) {
  const z = m.zrodlo.match(/^scalony z: (.*)$/)
  if (z) for (const s of z[1].split(', ')) mapaSkl.set(normalizujNazweMeta(s), m.nazwa)
}
function nowaNazwaSkladnika(nazwa) {
  if (!nazwa) return null
  const n = mapaSkl.get(nazwa) || mapaSkl.get(normalizujNazweMeta(nazwa))
  return n && n !== nazwa ? n : null
}

// ── SQL ──
const lit = v => v == null ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`
const arr = a => a.length ? `array[${a.map(lit).join(',')}]::text[]` : `'{}'::text[]`

// Odcisk danych, na których liczyłem — jeśli baza zmieni się przed uruchomieniem
// SQL, plik odmówi (raise exception) zamiast nadpisać czyjąś edycję.
const odcisk = createHash('md5').update(dania.map(r => [r.id, r.Danie, r['Składnik'], r['Ilość na 1 porcję'], r.Jednostka, r.Kategoria]
  .map(v => v ?? '').join('|')).join('\n'), 'utf8').digest('hex')

const usuwane = new Set(operacje.filter(o => o.typ === 'delete').map(o => o.id))
const wstawiane = operacje.filter(o => o.typ === 'insert').map(o => o.wiersz)
const zmienianeDania = operacje.filter(o => o.typ === 'update').length

// stan końcowy KAŻDEGO zostającego wiersza (prościej i pewniej niż same różnice)
const koncowe = []
for (const [, ws] of wynik) for (const w of ws) if (w.id != null) koncowe.push(w)

const liczby = { dania: { zmienione: zmienianeDania, nowe: wstawiane.length, usuniete: usuwane.size } }
const sql = []
sql.push(`-- Czyszczenie bazy dań — wygenerowane przez skrypty/czyszczenie/zastosuj.mjs ${new Date().toISOString()}
-- Jedna transakcja. Każde nieudane sprawdzenie → raise exception → ROLLBACK całości.
set local statement_timeout = '10min';

do $$ begin
  if (select count(*) from dania) <> ${dania.length}
     or (select md5(string_agg(id::text || '|' || coalesce("Danie",'') || '|' || coalesce("Składnik",'') || '|' ||
              coalesce("Ilość na 1 porcję",'') || '|' || coalesce("Jednostka",'') || '|' || coalesce("Kategoria",''),
              E'\\n' order by id)) from dania) <> '${odcisk}' then
    raise exception 'Tabela dania zmieniła się od wygenerowania tego pliku — odpal zastosuj.mjs ponownie';
  end if;
end $$;

-- sieroty PRZED (dania z planu, których nie ma w dania) — po migracji ma ich nie przybyć
create temp table _sieroty_przed on commit drop as
  select 'kalendarz' t, count(*) n from kalendarz k where k.danie is not null and not exists (select 1 from dania d where d."Danie" = k.danie)
  union all
  select 'plan_tygodnia', count(*) from plan_tygodnia p where not exists (select 1 from dania d where d."Danie" = p.danie);
`)

// 1. dania — składniki, nazwy, kuchnia, poziom
sql.push(`-- ═══ 1. dania ═══
create temp table _dania (id bigint primary key, danie text, skladnik text, ilosc text, jednostka text, kategoria text, kuchnia text, poziom text) on commit drop;
insert into _dania values
${koncowe.map(w => `(${w.id},${lit(w.Danie)},${lit(w['Składnik'])},${lit(w['Ilość na 1 porcję'])},${lit(w.Jednostka)},${lit(w.Kategoria)},${lit(w.kuchnia)},${lit(w.poziom)})`).join(',\n')};

delete from dania where id in (${[...usuwane].join(',') || 'null'});

update dania d set "Danie" = u.danie, "Składnik" = u.skladnik, "Ilość na 1 porcję" = u.ilosc,
  "Jednostka" = u.jednostka, "Kategoria" = u.kategoria, kuchnia = u.kuchnia, poziom = u.poziom
from _dania u where d.id = u.id;
`)
if (wstawiane.length) {
  const kol = Object.keys(wstawiane[0]).filter(k => k !== 'id')
  const q = k => `"${k}"`
  sql.push(`-- nowe wiersze (ROZBIJ „sól i pieprz") — id z sekwencji, jeśli kolumna ją ma
create temp table _dania_nowe on commit drop as select * from dania where false;
insert into _dania_nowe (${kol.map(q).join(', ')}) values
${wstawiane.map(w => `(${kol.map(k => typeof w[k] === 'boolean' ? String(w[k]) : lit(w[k])).join(',')})`).join(',\n')};
do $$ begin
  if pg_get_serial_sequence('public.dania', 'id') is not null then
    insert into dania (${kol.map(q).join(', ')}) select ${kol.map(q).join(', ')} from _dania_nowe;
  else
    insert into dania (id, ${kol.map(q).join(', ')})
      select (select max(id) from dania) + row_number() over (), ${kol.map(q).join(', ')} from _dania_nowe;
  end if;
end $$;
`)
}
sql.push(`update dania d set kcal = k.kcal from (values
${[...kcal].map(([d, k]) => `(${lit(d)},${k})`).join(',\n')}
) k(danie, kcal) where d."Danie" = k.danie;
`)

// 2. skladniki_meta
sql.push(`-- ═══ 2. skladniki_meta — pełna wymiana ═══
delete from skladniki_meta;
insert into skladniki_meta (nazwa, nazwa_norm, aliasy, jednostka_bazowa, rozmiar_opakowania, jednostka_opakowania, zaokraglaj, waga_sztuki_g, kcal_100g) values
${zatw.meta.map(m => `(${lit(m.nazwa)},${lit(m.nazwa_norm)},${arr(m.aliasy)},${lit(m.jednostka_bazowa || null)},${m.rozmiar_opakowania ?? 'null'},${lit(m.jednostka_opakowania || null)},${m.zaokraglaj},${m.waga_sztuki_g ?? 'null'},${m.kcal_100g ?? 'null'})`).join(',\n')};
`)
liczby.skladniki_meta = { usuniete: 'wszystkie', nowe: zatw.meta.length }

// 3. nazwy dań w planach
sql.push(`-- ═══ 3. nazwy dań poza tabelą dania ═══
create temp table _mapa_dan (stara text primary key, nowa text not null) on commit drop;
insert into _mapa_dan values
${[...mapaDan].map(([s, n]) => `(${lit(s)},${lit(n)})`).join(',\n')};
create temp table _mapa_skl (stara text primary key, nowa text not null) on commit drop;
insert into _mapa_skl values
${[...mapaSkl].filter(([s, n]) => s !== n && !s.includes('\u0000')).map(([s, n]) => `(${lit(s)},${lit(n)})`).join(',\n')}
on conflict do nothing;

update kalendarz k set danie = m.nowa from _mapa_dan m where k.danie = m.stara;
update kalendarz k set dodatek = m.nowa from _mapa_dan m where k.dodatek = m.stara;
update kalendarz k set surowka = m.nowa from _mapa_dan m where k.surowka = m.stara;
-- dodatki: [{typ, nazwa}] — nazwa to nazwa dania
update kalendarz k set dodatki = (
  select jsonb_agg(case when m.nowa is not null then jsonb_set(e, '{nazwa}', to_jsonb(m.nowa)) else e end order by o)
  from jsonb_array_elements(k.dodatki) with ordinality t(e, o) left join _mapa_dan m on m.stara = e->>'nazwa')
where jsonb_typeof(k.dodatki) = 'array' and jsonb_array_length(k.dodatki) > 0;
-- podmiany: {nazwa składnika: zamiennik} — klucze to składniki
update kalendarz k set podmiany = (
  select jsonb_object_agg(coalesce(m.nowa, e.key), e.value) from jsonb_each(k.podmiany) e left join _mapa_skl m on m.stara = e.key)
where jsonb_typeof(k.podmiany) = 'object' and k.podmiany <> '{}'::jsonb;
update plan_tygodnia p set danie = m.nowa from _mapa_dan m where p.danie = m.stara;
update preferencje_sygnaly s set danie = m.nowa from _mapa_dan m where s.danie = m.stara;
`)
const ileDan = (rows, ...pola) => rows.filter(r => pola.some(p => mapaDan.has(r[p]))).length
liczby.kalendarz = { zmienione: kalendarz.filter(k => mapaDan.has(k.danie) || mapaDan.has(k.dodatek) || mapaDan.has(k.surowka) ||
  (k.dodatki || []).some(d => mapaDan.has(d?.nazwa)) || Object.keys(k.podmiany || {}).some(s => nowaNazwaSkladnika(s))).length }
liczby.plan_tygodnia = { zmienione: ileDan(plan, 'danie') }
liczby.preferencje_sygnaly = { zmienione: ileDan(sygnaly, 'danie') }

// 4. tabele zakupowe — nazwy składników (per id, bo przy scaleniu decyduje nowszy rekord)
const nowszy = (a, b) => ((a.updated_at || a.created_at || '') >= (b.updated_at || b.created_at || '') ? a : b)
function scalPoKluczu(rows, kluczFn, zmianaFn) {
  // zmianaFn(r) → nowe pola albo null; zwraca {update: [[id, pola]], delete: [id]}
  const zostaje = new Map()
  const upd = [], del = []
  for (const r of rows) {
    const z = zmianaFn(r)
    const po = { ...r, ...(z || {}) }
    const k = kluczFn(po)
    const juz = zostaje.get(k)
    if (!juz) { zostaje.set(k, { r: po, z }); continue }
    const lepszy = nowszy(juz.r, po)
    const gorszy = lepszy === po ? juz : { r: po, z }
    del.push(gorszy.r.id)
    zostaje.set(k, lepszy === po ? { r: po, z } : juz)
  }
  for (const { r, z } of zostaje.values()) if (z) upd.push([r.id, z])
  return { upd, del }
}
function sqlPerId(tabela, { upd, del }) {
  const s = []
  if (del.length) s.push(`delete from ${tabela} where id in (${del.map(lit).join(',')});`)
  for (const [id, pola] of upd) s.push(`update ${tabela} set ${Object.entries(pola).map(([k, v]) => `${k} = ${lit(v)}`).join(', ')} where id = ${lit(id)};`)
  liczby[tabela] = { zmienione: upd.length, usuniete: del.length }
  return s.join('\n')
}

const kor = scalPoKluczu(korekty, r => `${r.household_id}|${r.tydzien}|${r.baza_klucz}`, r => {
  const [n, j = ''] = (r.baza_klucz || '').split('||')
  const nn = nowaNazwaSkladnika(n)
  if (!nn) return null
  const pola = { baza_klucz: `${nn}||${j}` }
  if (r.nazwa === n) pola.nazwa = nn // nazwę wpisaną ręcznie przez usera zostawiamy
  return pola
})
const hist = scalPoKluczu(historia, r => `id${r.id}`, r => {
  const nn = nowaNazwaSkladnika(r.skladnik)
  return nn ? { skladnik: nn } : null
})
const dom = scalPoKluczu(wDomu, r => `${r.household_id}|${r.tydzien}|${r.nazwa_norm}`, r => {
  const nn = nowaNazwaSkladnika(r.nazwa)
  return nn ? { nazwa: nn, nazwa_norm: normalizujNazweMeta(nn) } : null
})
const cyk = scalPoKluczu(cykliczne, r => `id${r.id}`, r => {
  const nn = nowaNazwaSkladnika(r.nazwa)
  return nn ? { nazwa: nn } : null
})
sql.push(`-- ═══ 4. tabele zakupowe ═══
${sqlPerId('korekty_zakupow', kor)}
${sqlPerId('zakupy_historia', hist)}
${sqlPerId('produkty_w_domu', dom)}
${sqlPerId('zakupy_cykliczne', cyk)}
`)

// 5. sprawdzenia
const nazwySkl = new Set(); for (const [, ws] of wynik) for (const w of ws) nazwySkl.add(w['Składnik'])
const podsumowanie = Object.entries(liczby).map(([t, l]) => `${t}: ${Object.entries(l).map(([k, v]) => `${k} ${v}`).join(', ')}`).join('; ')
function zakonczenie(proba) {
  return `-- ═══ 5. sprawdzenia ═══
do $$
declare
  v_dan int; v_skl int; v_puste int; v_kal int; v_plan int;
begin
  select count(distinct "Danie") into v_dan from dania;
  if v_dan <> ${wynik.size} then raise exception 'Liczba dań: % zamiast ${wynik.size}', v_dan; end if;

  select count(*) into v_puste from dania where kcal is null or kuchnia is null or poziom is null;
  if v_puste > 0 then raise exception '% wierszy dania bez kcal/kuchni/poziomu', v_puste; end if;

  select count(distinct "Składnik") into v_skl from dania;
  if v_skl <> ${nazwySkl.size} then raise exception 'Różnych składników: % zamiast ${nazwySkl.size}', v_skl; end if;

  select count(*) into v_kal from kalendarz k where k.danie is not null and not exists (select 1 from dania d where d."Danie" = k.danie);
  if v_kal > (select n from _sieroty_przed where t = 'kalendarz') then
    raise exception 'Nowe sieroty w kalendarzu: % (przed: %)', v_kal, (select n from _sieroty_przed where t = 'kalendarz'); end if;

  select count(*) into v_plan from plan_tygodnia p where not exists (select 1 from dania d where d."Danie" = p.danie);
  if v_plan > (select n from _sieroty_przed where t = 'plan_tygodnia') then
    raise exception 'Nowe sieroty w plan_tygodnia: % (przed: %)', v_plan, (select n from _sieroty_przed where t = 'plan_tygodnia'); end if;
${proba ? `
  raise exception 'PRÓBA OK — nic nie zapisano (ROLLBACK). dań %, składników %, sierot kalendarza %, planu %. ${podsumowanie.replace(/'/g, "''")}',
    v_dan, v_skl, v_kal, v_plan;` : ''}
end $$;

notify pgrst, 'reload schema';
select count(distinct "Danie") as dania, count(*) as wiersze, count(distinct "Składnik") as skladniki,
       count(distinct kuchnia) as kuchnie, min(kcal) as kcal_min, max(kcal) as kcal_max
from dania;
`
}

console.log(DRY_RUN ? '── DRY RUN: nic nie zapisuję, ani do bazy, ani na dysk ──' : '── zapisuję pliki SQL (baza bez zmian) ──')
console.log(`źródło: ${ZRODLO}, dań ${wynik.size}, wierszy dania ${dania.length}, różnych składników po zmianie ${nazwySkl.size}`)
for (const [t, l] of Object.entries(liczby)) console.log(`  ${t.padEnd(20)} ${Object.entries(l).map(([k, v]) => `${k}: ${v}`).join(', ')}`)

if (!DRY_RUN) {
  const tresc = sql.join('\n')
  writeFileSync(join(TU, 'zastosuj_proba.sql'), tresc + zakonczenie(true))
  writeFileSync(join(TU, 'zastosuj.sql'), tresc + zakonczenie(false))
  console.log('→ zastosuj_proba.sql (z ROLLBACK), zastosuj.sql (z zapisem)')
}
