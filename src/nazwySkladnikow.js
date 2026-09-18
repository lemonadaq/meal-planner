// nazwySkladnikow.js
// Zamienia nazwę składnika z PRZEPISU na nazwę produktu, który kupuje się
// w sklepie. Używane WYŁĄCZNIE przy budowaniu listy zakupów.
//
// Przepis i lista zakupów potrzebują różnych rzeczy i to jest tu sedno:
// w przepisie „białko jajka" i „ryż z wczoraj" niosą istotną informację
// kulinarną i mają tam zostać. Na liście zakupów są bezużyteczne — nie da się
// ich kupić i nie dopasują się do `skladniki_meta` (rozmiar opakowania)
// ani do promocji.
//
// Dlatego NIC nie zmieniamy w tabeli `dania`. Przekształcenie dzieje się
// w locie, przy generowaniu listy — przepis zostaje nietknięty.
//
// Efekt uboczny i pożądany: „białko jajka" z jednego przepisu i „jajka"
// z drugiego schodzą się w jedną pozycję na liście, zamiast dwóch osobnych.

// Słowa opisujące, co masz z produktem ZROBIĆ. Lecą z nazwy, bo to instrukcja.
// Świadomie NIE ma tu „wędzony", „mielony", „suszony", „kiszony", „konserwowy",
// „marynowany" — te akurat mówią, który produkt wziąć z półki, więc zostają
// (ta sama zasada co TRANSFORM_WORDS w src/promocjeMatch.js).
const OPISY_PRZYGOTOWANIA = [
  'ugotowany', 'ugotowana', 'ugotowane', 'ugotowany wcześniej',
  'upieczony', 'upieczona', 'upieczone',
  'usmażony', 'usmażona', 'usmażone', 'podsmażony', 'podsmażona', 'podsmażone',
  'pokrojony', 'pokrojona', 'pokrojone', 'posiekany', 'posiekana', 'posiekane',
  'starty', 'starta', 'starte', 'rozdrobniony', 'rozdrobniona', 'rozdrobnione',
  'roztopiony', 'roztopiona', 'roztopione', 'rozpuszczony', 'rozpuszczona', 'rozpuszczone',
  'schłodzony', 'schłodzona', 'schłodzone', 'ostudzony', 'ostudzona', 'ostudzone',
  'wystudzony', 'wystudzona', 'wystudzone',
  'namoczony', 'namoczona', 'namoczone', 'odsączony', 'odsączona', 'odsączone',
  'odcedzony', 'odcedzona', 'odcedzone', 'obrany', 'obrana', 'obrane',
  'umyty', 'umyta', 'umyte', 'świeżo mielony', 'świeżo starty',
]

const ALTERNATYWY = /\s+(?:lub|albo|ewentualnie|bądź|badz)\s+.*$/i

// Frazy przygotowania BEZ imiesłowu — „cebula w kostkę" zamiast „cebula
// pokrojona w kostkę". Lista z OPISY_PRZYGOTOWANIA ich nie łapie, bo nie ma
// tu słowa, od którego można ciąć.
//
// Rozróżnienie jest gramatyczne i dlatego bezpieczne: INSTRUKCJA stoi
// w bierniku („w kostkę", „w plastry", „na drobno" — jak pokroić), a PRODUKT
// w miejscowniku („w oleju", „w puszce", „w proszku", „w plasterkach" —
// w czym jest). Dlatego „w plastry" leci, a „w plasterkach" zostaje.
const FRAZY_PRZYGOTOWANIA = [
  'w kostkę', 'w kostke', 'w plastry', 'w plasterki', 'w paski', 'w słupki',
  'w slupki', 'w piórka', 'w piorka', 'w talarki', 'w ćwiartki', 'w cwiartki',
  'w krążki', 'w krazki', 'w połówki', 'w polowki', 'w cząstki', 'w czastki',
  'na drobno', 'na grubo', 'na tarce', 'na kawałki', 'na kawalki', 'na plastry',
  'na cienkie plastry', 'na pół', 'na pol',
  'do smaku', 'do podania', 'do dekoracji', 'do smażenia', 'do smazenia',
  'do posypania', 'do polania', 'do oprószenia', 'do oproszenia',
  'do garnirowania', 'do przybrania', 'do skropienia', 'do serwowania',
  'do podsmażenia', 'do podsmazenia', 'do zagęszczenia', 'do zageszczenia',
  'na koniec', 'na wierzch', 'na spód', 'na spod',
  // „ryż z wczoraj" — czas, nie produkt.
  'z wczoraj', 'z wczorajszego', 'z dnia poprzedniego', 'z poprzedniego dnia',
  'sprzed dnia', 'najlepiej z', 'z resztek',
]

// Składnik nazwany częścią produktu, którego i tak kupuje się w całości.
// „białko jajka" nie stoi na półce — kupuje się jajka, a rozdzielenie to krok
// przepisu. Mapa jest krótka i celowo taka zostaje: to wyjątki, nie reguła.
const CZESC_NA_PRODUKT = [
  [/^(?:białk[oa]|bialk[oa]|żółtk[oa]|zoltk[oa])\s+(?:z\s+)?jaj\w*$/i, 'jajka'],
  [/^(?:sok|skórka|skorka|otarta\s+skórka)\s+(?:z\s+|ze\s+)?(cytryny|limonki|pomarańczy|pomaranczy)$/i, null],
]

// Gramatura w nazwie — pola `ilosc` i `jednostka` są od tego osobno, a „pasta
// gochujang 2 łyżki" nie dopasuje się do niczego na liście zakupów.
const GRAMATURA_W_NAZWIE = /\s+\d+(?:[,.]\d+)?\s*(?:g|kg|ml|l|dag|szt\.?|sztuki?|łyżki?|łyżek|łyżeczki?|łyżeczek|szklanki?|szklanek|opak\.?|puszki?|plastry?|plasterki?)\b.*$/i

/**
 * Sprowadza nazwę składnika do nazwy produktu ze sklepu.
 *
 *   „dymka (zielona cebulka)"                      → „dymka"
 *   „boczek wędzony lub podgardle"                 → „boczek wędzony"
 *   „ryż ugotowany (najlepiej z dnia poprzedniego)" → „ryż"
 *
 * Zostawia cechy rozróżniające produkt w sklepie („boczek wędzony",
 * „mięso mielone"), bo bez nich trafiłoby się w zupełnie inny towar.
 */
export function uproscNazweSkladnika(nazwa) {
  let wynik = String(nazwa ?? '')

  // Nawiasy w całości — siedzą w nich wyjaśnienia i synonimy.
  wynik = wynik.replace(/\s*[([{][^)\]}]*[)\]}]/g, ' ')

  // „X lub Y" → „X". Zawsze pierwszy wariant, bo jest tym głównym.
  wynik = wynik.replace(ALTERNATYWY, '')

  // Stan przygotowania ucinamy RAZEM z resztą frazy, bo za nim zwykle idzie
  // jeszcze sposób („pokrojona w kostkę", „starty na tarce"). Usunięcie samego
  // słowa zostawiało „cebula w kostkę".
  //
  // Gdy takie słowo stoi na początku („ugotowany ryż"), cięcie zabrałoby całą
  // nazwę — wtedy znika samo słowo, a produkt zostaje.
  for (const opis of OPISY_PRZYGOTOWANIA) {
    const odPoczatku = new RegExp(`^${opis}\\s+`, 'i')
    if (odPoczatku.test(wynik)) {
      wynik = wynik.replace(odPoczatku, '')
      continue
    }
    wynik = wynik.replace(new RegExp(`\\s+${opis}(?:\\s|$).*$`, 'i'), '')
  }

  // Frazy przygotowania bez imiesłowu — ucinamy od frazy do końca.
  for (const fraza of FRAZY_PRZYGOTOWANIA) {
    wynik = wynik.replace(new RegExp(`\\s+${fraza}(?:\\s|$).*$`, 'i'), '')
  }

  // Gramatura doklejona do nazwy.
  wynik = wynik.replace(GRAMATURA_W_NAZWIE, '')

  // Ogon po myślniku-separatorze: „prażone orzechy laskowe - siekane".
  // Myślnik musi mieć spacje po obu stronach, żeby nie ruszać nazw w rodzaju
  // „ser pleśniowy blue-cheese" ani „coca-cola".
  wynik = wynik.replace(/\s+[-–—]\s+.*$/, '')

  // Ogon po przecinku („cebula, drobno posiekana"). Przecinek MUSI mieć po
  // sobie spację — inaczej regułą leciał przecinek dziesiętny i „mleko 3,2%"
  // robiło się „mleko 3".
  wynik = wynik.replace(/\s*,\s+.*$/, '')

  // Część produktu → produkt, który realnie się kupuje.
  for (const [wzorzec, produkt] of CZESC_NA_PRODUKT) {
    if (produkt && wzorzec.test(wynik.trim())) { wynik = produkt; break }
  }
  wynik = wynik.replace(/\s+/g, ' ').replace(/^[\s\-–—]+|[\s\-–—.:;]+$/g, '').trim()

  // Gdyby czyszczenie zjadło wszystko, lepiej oddać oryginał niż pustkę.
  return wynik || String(nazwa ?? '').trim()
}

