// duplikatyZakupow.js
// Rozpoznawanie, że dwie pozycje na liście zakupów to TEN SAM produkt.
//
// Lista zakupów zlewa dwa źródła: pozycje policzone z przepisów i puli
// tygodnia (plan) oraz te dopisane ręcznie (`zakupy_wlasne`,
// `zakupy_cykliczne`). Agregacja z przepisów od dawna scala warianty tej
// samej rzeczy między sobą, ale pozycje ręczne szły obok, bez porównania
// nazw. Efekt: „Cebula 450 g" z przepisu i „Cebula 2 szt" dopisana
// w szybkim dodawaniu dawały DWIE linijki w tej samej kategorii.
//
// Wydzielone z `ListaZakupow.jsx`, bo tamten plik eksportuje komponent —
// trzymanie tu czystych funkcji pozwala je przetestować bez mockowania
// Supabase i nie psuje fast refreshu.

import { uproscNazweSkladnika } from './nazwySkladnikow'
import { normalizujNazweMeta } from './jednostki'

// Scalenia składników: klucz = normalizujNazweMeta(oryginalna nazwa) → wartość = nazwa kanoniczna.
// Pozwala łączyć warianty tej samej rzeczy bez zmian w bazie składniki_meta.
export const SCAL_NAZWY = {
  'ser twarog':          'Twaróg',
  'twarog poltlusty':    'Twaróg',
  'twarog':              'Twaróg',
  'chleb pszenny':       'Chleb',
  'chleb pszenny kromki':'Chleb',
  'pieczywo do podania': 'Chleb',
  'marchewka':           'Marchew',
  'jogurt naturalny':    'Jogurt naturalny',
  // W bazie krążą trzy pisownie tego samego sera („skladniki_meta" ma
  // literówkę w dwóch wpisach, przepisy różnie ją przepisują) — bez tego
  // trafiały na listę jako dwie osobne pozycje.
  'mozarella':           'Mozzarella',
  'ser mozarella':       'Mozzarella',
  'ser mozzarella':      'Mozzarella',
  // „Risotto alla milanese" i „Risotto z owocami morza" nazywają ten sam
  // składnik w innym szyku słów — bez tego dwie takie pozycje nie sumowały
  // się w jedną na liście zakupów.
  'biale wytrawne wino': 'Białe wino wytrawne',
}

// Sufiksy/prefiksy, które nie rozróżniają produktu na liście zakupów.
// "Ogórek" i "Ogórek świeży" trafiają do tej samej pozycji — a przepisy
// piszą ten sam przymiotnik też na początku ("świeża bazylia", "Świeża
// mięta"), więc bez PREFIKS_RGX te dwie pisownie nie schodziły się w jedną.
const SUFIKS_RGX = /\s+(swiezy|swieza|swieze|surowy|surowa|surowe|mrozony|mrozona|mrozone)$/
const PREFIKS_RGX = /^(swiezy|swieza|swieze|surowy|surowa|surowe|mrozony|mrozona|mrozone)\s+/

export function normalizujDlaScalania(normNazwa) {
  return normNazwa.replace(SUFIKS_RGX, '').replace(PREFIKS_RGX, '').trim()
}

/**
 * Klucz, pod którym dwie pisownie tego samego produktu mają się spotkać.
 *
 * Idzie dokładnie tą samą drogą, co agregacja z przepisów w `dodaj()`:
 * uproszczenie nazwy → scalenia → normalizacja → zdjęcie przymiotników,
 * które nie rozróżniają towaru. Dzięki temu „Cebulka" trafia w „Cebulę",
 * a nie obok niej.
 *
 * Normalizacja i tak zjada znaki inne niż litery i cyfry, więc wiodące
 * „- " czy końcowy przecinek nie wymagają tu osobnego sprzątania.
 */
export function kluczProduktu(nazwa) {
  const uproszczona = uproscNazweSkladnika(String(nazwa ?? ''))
  const scalona = SCAL_NAZWY[normalizujNazweMeta(uproszczona)] || uproszczona
  return normalizujDlaScalania(normalizujNazweMeta(scalona))
}

/**
 * Czy ten produkt JUŻ jest na widocznej liście? Zwraca znalezioną pozycję
 * albo null.
 *
 * Świadomie TYLKO do ostrzeżenia, bez scalania. Prawdziwe połączenie
 * wymagałoby zrośnięcia pozycji o dwóch różnych źródłach (plan kontra
 * `zakupy_wlasne`), które mają osobne ścieżki edycji, usuwania i korekt —
 * a 450 g i 2 szt. i tak się nie dodaje do siebie. Decyzja Filipa
 * z 2026-10-06: dwie pozycje zostają, ale toast mówi wprost, że produkt
 * już tam jest (issue #112).
 */
export function znajdzDuplikatNaLiscie(nazwa, itemy = []) {
  const klucz = kluczProduktu(nazwa)
  if (!klucz) return null
  return itemy.find(it => it && kluczProduktu(it.skladnik) === klucz) || null
}

/**
 * Treść toasta po dodaniu jednego produktu.
 *
 * `iloscTekst` to już sformatowana ilość duplikatu („450 g") albo pustka.
 * Składanie tekstu siedzi tutaj razem z rozpoznawaniem duplikatu, żeby dało
 * się przetestować jedno z drugim — ale formatowanie ilości zostaje
 * w `ListaZakupow.jsx`, bo zależy od opakowań i korekt.
 */
export function tekstDuplikatu(nazwa, iloscTekst) {
  if (!iloscTekst) return `Dodano: ${nazwa} — to już jest na liście`
  return `Dodano: ${nazwa} — masz już ${iloscTekst} na liście`
}
