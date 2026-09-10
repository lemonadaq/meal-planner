// style-zdjec.js
// Style prezentacji dań do generowania zdjęć + deterministyczna rotacja.
//
// PO CO TO JEST:
// Stary skrypt miał JEDEN prompt bazowy dla wszystkich dań ("top-down, matte
// ceramic plate, light oak table, fresh herbs garnish, warm palette"). Efekt:
// 275 zdjęć w identycznym kadrze, z tą samą gałązką natki — mózg czyta to
// natychmiast jako AI slop. Rozwiązanie: 4 pełne "przepisy fotograficzne"
// (powierzchnia + naczynie + światło + kadr + paleta + rekwizyty) rotowane
// po nazwie dania, plus osobno losowana niedoskonałość (okruchy, zaciek sosu,
// użyta łyżka) i zakaz plastikowego renderu.
//
// Rotacja jest DETERMINISTYCZNA (hash nazwy dania), nie losowa. Dzięki temu:
//   - to samo danie zawsze dostaje ten sam styl (regeneracja = spójny wynik),
//   - sąsiednie dania na liście dostają różne style (bez serii pod rząd),
//   - nie trzeba nic trzymać w bazie.

// ── Style: każdy to spójny setup fotograficzny, nie zlepek przymiotników ──
// UWAGA: styl NIE opisuje naczynia. Naczynie zależy od rodzaju dania
// (zupa w miseczce, deser na talerzyku) i doklejane jest osobno — inaczej
// styl i rodzaj przeczyłyby sobie w jednym promptcie.
export const STYLE = [
  {
    id: 'rustykalny',
    opis: 'Ciemne drewno, boczne światło okna, kadr 45°',
    prompt:
      'shot on a worn dark walnut kitchen table, ' +
      'hard directional late-afternoon window light raking from the left with visible shadow edges, ' +
      'camera at a 45-degree angle, 50mm lens, moderate depth of field so the background falls off gently, ' +
      'earthy palette of browns, deep greens and amber, a linen cloth bunched to one side and a well-used steel fork',
    naczynieDomyslne: 'served in heavy chipped stoneware',
  },
  {
    id: 'nordycki',
    opis: 'Jasny kamień, miękkie światło, płaski kadr z góry',
    prompt:
      'shot on a pale grey concrete or light marble worktop, ' +
      'soft even diffused daylight from a large north window, gentle shadows, ' +
      'straight top-down 90-degree flat lay, 35mm lens, everything in focus, ' +
      'cool restrained palette of white, grey and muted green, minimal props — one small ceramic dish and a folded grey napkin',
    naczynieDomyslne: 'served on simple matte off-white ceramic',
  },
  {
    id: 'moody',
    opis: 'Ciemne tło, kontra, niski kąt',
    prompt:
      'shot against a dark slate background with deep falloff into shadow, ' +
      'single hard backlight rimming the edges of the food, ' +
      'low camera angle roughly 25 degrees above the table, 85mm lens, shallow depth of field with a soft blurred background, ' +
      'high-contrast palette with rich reds and browns lifted out of near-black, one small bowl of coarse salt in the background',
    naczynieDomyslne: 'served on dark glazed pottery',
  },
  {
    id: 'domowy',
    opis: 'Zwykły blat, ktoś zaraz zje, południowe światło',
    prompt:
      'shot on an ordinary laminate kitchen counter in a real Polish home, ' +
      'plain midday daylight, slightly flat and unglamorous, ' +
      'camera at a 60-degree angle as if someone is about to sit down and eat, 28mm lens, natural perspective, ' +
      'honest everyday palette, a glass of water half out of frame and a crumpled paper napkin',
    naczynieDomyslne: 'served on a mismatched everyday plate',
  },
]

// ── Naczynie zależne od rodzaju dania ──
// Brak wpisu (obiad, kolacja) → naczynie domyślne dla stylu.
const NACZYNIE = {
  zupa: 'served in a deep bowl with a spoon resting against the rim',
  deser: 'served on a small dessert plate or in a glass, portion sized for one',
  przekaska: 'served on a wooden board, finger-food portion',
  dodatek: 'served in a small side dish, clearly a side portion not a main course',
  surowka: 'served in a small shallow bowl as a fresh side salad',
  sniadanie: 'served on a breakfast plate with a mug just entering the frame',
}

// ── Niedoskonałości — rotowane niezależnie od stylu ──
// To jest najtańszy sposób na zabicie wrażenia renderu: prawdziwe jedzenie
// nigdy nie jest ułożone idealnie symetrycznie i zawsze coś kapnie.
//
// Podział na dwie pule, bo para nad sernikiem albo nad surówką wygląda głupio.
//
// Nie ma tu "one bite already taken" — jako jedyna niedoskonałość zmieniała samo
// jedzenie, a nie otoczenie, i wychodziła z tego nadgryziona parówka na zdjęciu
// w katalogu przepisów. Reszta rusza tylko talerza i blatu.
const NIEDOSKONALOSCI_UNIWERSALNE = [
  'a few crumbs scattered on the surface next to the plate',
  'a small drip of sauce running down the side of the plate',
  'the portion slightly off-centre on the plate, plated by hand not by a stylist',
  'a light smudge wiped across the rim',
  'the portion piled a little unevenly, not levelled or smoothed',
]

// Tylko dla dań podawanych na ciepło.
const NIEDOSKONALOSCI_CIEPLE = [
  'faint steam still rising from the food',
  'a little sauce pooling and running to one side of the plate',
  'the surface slightly broken where a spoon has already been in',
]

// Rodzaje, które jemy na zimno — bez pary i bez „gorących" niedoskonałości.
const NA_ZIMNO = new Set(['deser', 'surowka', 'przekaska'])

// ── Stałe: co ma być ZAWSZE i czego ma NIE BYĆ ──
const ZAWSZE =
  'realistic home-cooked Polish food, photographed as documentary food photography, ' +
  'authentic imperfect portion sizes, natural food colours'

// Modele obrazu ignorują "negative prompt" jako osobne pole, więc zakazy
// wpisujemy w treść — to działa lepiej niż lista słów po przecinku.
const NIGDY =
  'Not a 3D render, not CGI, not glossy or plastic-looking, no artificial gloss or wet shine, ' +
  'no text, no watermarks, no logos, no packaging labels, no hands or people in frame, ' +
  'no over-styled restaurant tweezer plating, no symmetrical garnish arrangement'

import { opisReczny } from './opisy-reczne.js'

// ── Deterministyczny hash nazwy (ten sam co getKolor w apce) ──
function hash(tekst) {
  let h = 0
  for (let i = 0; i < tekst.length; i++) h = tekst.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h)
}

// Zwraca styl dla dania — zawsze ten sam dla tej samej nazwy.
export function wybierzStyl(nazwaDania) {
  return STYLE[hash(nazwaDania) % STYLE.length]
}

// Niedoskonałość losowana z INNEGO przesunięcia hasha, żeby dania o tym samym
// stylu nie dostawały automatycznie tej samej niedoskonałości.
function wybierzNiedoskonalosc(nazwaDania, rodzaj) {
  const pula = NA_ZIMNO.has(rodzaj)
    ? NIEDOSKONALOSCI_UNIWERSALNE
    : [...NIEDOSKONALOSCI_UNIWERSALNE, ...NIEDOSKONALOSCI_CIEPLE]
  return pula[hash(nazwaDania + '#') % pula.length]
}

// ── Główna funkcja: składa finalny prompt do modelu obrazu ──
// nazwa        — nazwa dania (steruje rotacją stylu)
// rodzaj       — sniadanie/zupa/obiad/... (steruje naczyniem)
// opisWizualny — 1-2 zdania po angielsku od Claude'a: co widać na talerzu
export function zbudujPromptObrazu(nazwa, rodzaj, opisWizualny) {
  // Ręczny opis wygrywa z tym, co wygenerował model. To jedyne miejsce, przez
  // które przechodzi KAŻDE zdjęcie (i nowe danie, i regeneracja), więc wpięcie
  // nadpisania tutaj działa w obu ścieżkach naraz.
  const opis = opisReczny(nazwa) || opisWizualny

  const styl = wybierzStyl(nazwa)
  const naczynie = NACZYNIE[rodzaj] || styl.naczynieDomyslne
  const niedoskonalosc = wybierzNiedoskonalosc(nazwa, rodzaj)

  // Nazwa dania idzie do promptu jako pierwsza. Modele obrazu znają utrwalone
  // dania (carbonara, gyros, kebab, moussaka) i sama nazwa jest mocniejszą
  // kotwicą niż jakikolwiek opis — bez niej model składał danie z opisu
  // składników i wychodziło coś, czego nikt nigdy nie widział na talerzu.
  const czesci = [
    `Food photograph of ${nazwa}`,
    opis.replace(/\.\s*$/, ''),
    naczynie,
    ZAWSZE,
    styl.prompt,
    niedoskonalosc,
    NIGDY,
  ]

  return czesci.join('. ').replace(/\.{2,}/g, '.')
}
