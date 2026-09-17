// Ceny bazowe z historii promocji.
//
// Blix NIE podaje ceny sprzed obniżki — w JSON-ie gazetki jest jedno pole
// `price`, a `percentDiscount` to zawsze 0 (sprawdzone na 1838 produktach
// w 4 sieciach). Cenę bazową trzeba więc wyliczyć z historii: ten sam produkt
// wraca w kolejnych gazetkach po różnych cenach, a `blix-import-supabase.mjs`
// liczy `source_hash` z ceną w środku, więc każda nowa cena to nowy wiersz.
// Historia zbiera się sama od uruchomienia workflow (12.06.2026).
//
// Cena bazowa = najwyższa cena, jaką widzieliśmy dla tego produktu w tym sklepie.
// To decyzja Filipa: gazetka pokazuje cenę promocyjną, więc najwyższy odczyt jest
// najbliżej ceny półkowej. Odwrotna strona medalu: jeden błąd parsowania zawyża
// pozycję na stałe, więc kolumna `roznych_cen` w raporcie jest do oglądania.
//
// UWAGA: to nadal cena z gazetki, więc jest DOLNYM oszacowaniem ceny półkowej.
// Produkt, który nigdy nie trafił do gazetki, nie ma tu żadnego wiersza.
//
// Skrypt tylko CZYTA i raportuje — niczego nie zapisuje do bazy.
//   node ceny-bazowe.mjs                     # z Supabase (potrzebne .env)
//   node ceny-bazowe.mjs --plik oferty.json  # z lokalnego zrzutu scrapera
//   node ceny-bazowe.mjs --csv ceny.csv      # dorzuć eksport
//   node ceny-bazowe.mjs --min-obserwacji 3  # ile odczytów, żeby ufać cenie

import fs from "node:fs/promises";

const DOMYSLNE_MIN_OBSERWACJI = 2;

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

// Nazwy z Blixa bywają niestabilne między gazetkami ("Awokado odmiana hass"
// vs "...Hass"), więc kluczem jest wersja bez ogonków, znaków i wielkości liter.
function normalizujNazwe(nazwa) {
  return String(nazwa ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function percentyl(posortowane, p) {
  if (!posortowane.length) return null;
  const idx = Math.min(posortowane.length - 1, Math.floor(p * (posortowane.length - 1)));
  return posortowane[idx];
}

function mediana(posortowane) {
  return percentyl(posortowane, 0.5);
}

async function wczytajZPliku(sciezka) {
  const raw = await fs.readFile(sciezka, "utf8");
  const oferty = JSON.parse(raw);

  return oferty.map(o => ({
    sklep: o.store_name || o.store_slug,
    produkt: o.product_name,
    cena: o.price,
    widziano: o.offer_start_at ?? null
  }));
}

async function wczytajZSupabase() {
  const { createClient } = await import("@supabase/supabase-js");
  await import("dotenv/config");

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Brakuje SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
      "Albo uzupełnij .env, albo odpal z --plik promo-output/blix/blix_offers_all.json"
    );
  }

  const supabase = createClient(url, key);

  // Cała historia, nie tylko aktywne oferty — o to w tym całym skrypcie chodzi.
  const STRONA = 1000;
  const wszystkie = [];
  let od = 0;

  while (true) {
    const { data, error } = await supabase
      .from("promo_offers")
      .select("product_name, price, store_name, store_slug, scraped_at")
      .order("id", { ascending: true })
      .range(od, od + STRONA - 1);

    if (error) throw new Error(`Supabase: ${error.message}`);
    if (!data?.length) break;

    wszystkie.push(...data.map(o => ({
      sklep: o.store_name || o.store_slug,
      produkt: o.product_name,
      cena: o.price,
      widziano: o.scraped_at ?? null
    })));

    console.log(`  pobrano ${wszystkie.length}...`);

    if (data.length < STRONA) break;
    od += STRONA;
  }

  return wszystkie;
}

function zbudujCeny(obserwacje, minObserwacji) {
  const grupy = new Map();

  for (const o of obserwacje) {
    const cena = Number(o.cena);
    if (!o.produkt || !o.sklep || !Number.isFinite(cena) || cena <= 0) continue;

    const klucz = JSON.stringify([o.sklep, normalizujNazwe(o.produkt)]);
    let g = grupy.get(klucz);

    if (!g) {
      g = { sklep: o.sklep, produkt: o.produkt, ceny: [], widziano: [] };
      grupy.set(klucz, g);
    }

    g.ceny.push(cena);
    if (o.widziano) g.widziano.push(o.widziano);
  }

  const wiersze = [];

  for (const g of grupy.values()) {
    const posortowane = [...g.ceny].sort((a, b) => a - b);
    const unikalne = new Set(posortowane);
    const bazowa = posortowane[posortowane.length - 1];
    const najnizsza = posortowane[0];

    wiersze.push({
      sklep: g.sklep,
      produkt: g.produkt,
      obserwacji: posortowane.length,
      roznych_cen: unikalne.size,
      cena_bazowa: bazowa,
      cena_min: najnizsza,
      cena_mediana: mediana(posortowane),
      // Ile schodzi z ceny bazowej w najlepszej promocji — to jest ta liczba,
      // której Blix nie podaje.
      obnizka_proc: bazowa > 0 ? Math.round(100 * (1 - najnizsza / bazowa)) : 0,
      pewna: posortowane.length >= minObserwacji && unikalne.size >= 2,
      ostatnio: g.widziano.sort().at(-1) ?? ""
    });
  }

  return wiersze;
}

function raport(wiersze, minObserwacji) {
  const sklepy = [...new Set(wiersze.map(w => w.sklep))].sort();
  const pewne = wiersze.filter(w => w.pewna);

  console.log(`\n${"=".repeat(64)}`);
  console.log("CENY BAZOWE — raport jakości");
  console.log("=".repeat(64));
  console.log(`Par (sklep + produkt):        ${wiersze.length}`);
  console.log(`Z wiarygodną ceną bazową:     ${pewne.length} (${Math.round(100 * pewne.length / (wiersze.length || 1))}%)`);
  console.log(`  min ${minObserwacji} obserwacji ORAZ min 2 różne ceny`);

  console.log(`\nPer sklep:`);
  console.log(`  ${"sklep".padEnd(12)} ${"produktów".padStart(10)} ${"pewnych".padStart(9)} ${"śr. obniżka".padStart(12)}`);
  for (const s of sklepy) {
    const wS = wiersze.filter(w => w.sklep === s);
    const pS = wS.filter(w => w.pewna);
    const srObn = pS.length
      ? Math.round(pS.reduce((a, w) => a + w.obnizka_proc, 0) / pS.length)
      : 0;
    console.log(`  ${s.padEnd(12)} ${String(wS.length).padStart(10)} ${String(pS.length).padStart(9)} ${String(srObn + "%").padStart(12)}`);
  }

  const zObnizka = pewne.filter(w => w.obnizka_proc > 0).sort((a, b) => b.obnizka_proc - a.obnizka_proc);
  console.log(`\nNajwiększe obniżki (cena bazowa -> najniższa widziana):`);
  for (const w of zObnizka.slice(0, 15)) {
    console.log(`  ${w.sklep.padEnd(11)} ${w.produkt.slice(0, 40).padEnd(42)} ${String(w.cena_bazowa).padStart(7)} -> ${String(w.cena_min).padStart(7)}  -${w.obnizka_proc}%  (${w.obserwacji} obs.)`);
  }

  if (!pewne.length) {
    console.log(`\nUWAGA: żadna para nie ma jeszcze 2 różnych cen.`);
    console.log(`  Przy jednym przebiegu to normalne — cena bazowa potrzebuje`);
    console.log(`  kilku tygodni historii. W Supabase zbiera się od 12.06.2026.`);
  }
}

async function saveCsv(sciezka, wiersze) {
  const naglowki = ["sklep", "produkt", "obserwacji", "roznych_cen", "cena_bazowa", "cena_min", "cena_mediana", "obnizka_proc", "pewna", "ostatnio"];
  const esc = v => {
    const t = String(v ?? "");
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };

  const linie = [
    naglowki.join(";"),
    ...wiersze.map(w => naglowki.map(h => esc(w[h])).join(";"))
  ];

  await fs.writeFile(sciezka, linie.join("\n"), "utf8");
  console.log(`\nCSV: ${sciezka} (${wiersze.length} wierszy)`);
}

async function main() {
  const plik = getArg("plik", null);
  const csv = getArg("csv", null);
  const minObserwacji = Number(getArg("min-obserwacji", String(DOMYSLNE_MIN_OBSERWACJI)));

  console.log(plik ? `Czytam z pliku: ${plik}` : "Czytam historię z Supabase (promo_offers)...");

  const obserwacje = plik ? await wczytajZPliku(plik) : await wczytajZSupabase();
  console.log(`Obserwacji cen: ${obserwacje.length}`);

  const wiersze = zbudujCeny(obserwacje, minObserwacji)
    .sort((a, b) => a.sklep.localeCompare(b.sklep, "pl") || a.produkt.localeCompare(b.produkt, "pl"));

  raport(wiersze, minObserwacji);

  if (csv) await saveCsv(csv, wiersze);
}

main().catch(error => {
  console.error(`\nBłąd: ${error.message}`);
  process.exit(1);
});
