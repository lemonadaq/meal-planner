// opisy-reczne.js
// Ręczne opisy wyglądu dla dań, przy których model uparcie pudłuje.
//
// PO CO: dla większości dań opis wizualny generuje Claude ze składników
// i przepisu. Czasem jednak wychodzi coś, czego nikt nigdy nie jadł —
// grillowane parówki, pasta jajeczna z połówkami jajek, niezawinięte
// burrito. Wtedy wpisujemy opis tutaj i on WYGRYWA z tym, co wymyśli model.
//
// JAK DOPISAĆ NOWE:
//   1. klucz = dokładna nazwa dania z bazy (wielkość liter ma znaczenie)
//   2. wartość = opis po ANGIELSKU, 2-4 zdania, sam wygląd gotowego dania
//   3. napisz też, czego ma NIE być — modele obrazu reagują na to mocniej
//      niż na samo "ma być inaczej" (patrz parówki i pasta jajeczna niżej)
//   4. nie opisuj tu światła, tła ani naczynia — to ustawia styl
//
// Po dopisaniu: Actions → Generuj dania → tryb `obrazy`, w polu `dania`
// nazwy tych dań, `overwrite` zaznaczone.

export const OPISY_RECZNE = {
  'Breakfast Burrito':
    'A large flour tortilla rolled into one tight closed cylinder with the ends tucked in, ' +
    'cut in half on the diagonal so the filling of scrambled egg, beans, cheese and tomato ' +
    'shows only at the two cut ends. The outside is smooth, pale and lightly griddled, ' +
    'wrapped completely with nothing spilling out. It is a properly rolled burrito — ' +
    'not open tacos, not a folded shell, not a wrap left unrolled.',

  'Frittata z ziemniakami i cebulą':
    'A thick round baked egg frittata, deep yellow and set firm, packed with thin round ' +
    'slices of boiled potato and soft translucent onion clearly visible in the cut face. ' +
    'The potato slices are starchy, matte and pale cream-yellow, unmistakably potato — ' +
    'not apple, not any fruit. One wedge is cut out and the top is lightly browned.',

  'Grzanki z serem żółtym i pomidorem':
    'Two separate slices of toasted bread lying flat and clearly apart from one another, ' +
    'each slice whole and rectangular with crisp browned crust edges. Each carries a layer ' +
    'of melted yellow cheese over tomato slices, the cheese browned in patches. The two ' +
    'slices do not overlap, touch, merge or fade into each other — two distinct, separate ' +
    'pieces of bread with clear edges all the way round.',

  'Naleśniki z boczkiem':
    'Exactly two thin crêpes, each rolled into a tight cylinder, lying side by side on a ' +
    'plate. Bright red raspberry jam is visible at the open ends of both rolls. Lying ON TOP ' +
    'of the rolled crêpes are strips of crisp fried bacon, drizzled with maple syrup that ' +
    'runs down onto the pancakes. The crêpes are thin, smooth and pale golden — French-style ' +
    'crêpes, never thick fluffy American pancakes, always rolled, never folded flat, and the ' +
    'bacon sits on top of them rather than scattered around the plate.',

  'Parówki':
    'Plain pale pink boiled hot dog sausages, smooth and matte, lying on a plate beside ' +
    'thick slices of fresh white bread. A squeeze of ketchup and a squeeze of mustard sit ' +
    'next to them. Completely ordinary everyday food. The sausages are boiled — no char, ' +
    'no grill marks, no scoring, no browning, nothing grilled or barbecued.',

  'Pasta jajeczna':
    'A uniform pale yellow egg spread: hard-boiled eggs chopped fine and mashed together ' +
    'with mayonnaise into a soft, slightly lumpy paste flecked with green chives. Served ' +
    'as a mound in a small bowl or spread thickly on bread. Every egg is mixed into the ' +
    'paste — there are no whole eggs, no halved eggs and no egg wedges anywhere in frame.',

  'Pasta z awokado i jajka':
    'A uniform pale green spread — the same chopped-egg-and-mayonnaise paste as ordinary ' +
    'egg spread, with mashed avocado blended all the way through it, flecked with green ' +
    'chives. Soft, thick and evenly mixed, served as a mound in a bowl or spread on bread. ' +
    'No halved eggs, no sliced egg and no separate chunks of avocado — it is all one paste.',

  'Pasta z makreli wędzonej':
    'A soft beige-pink spread of smoked mackerel flaked fine and mashed until it holds ' +
    'together, bound with a little mayonnaise and flecked with chives. The texture is even ' +
    'and fine throughout, served as a mound in a small bowl beside slices of bread. ' +
    'No large chunks, no visible fillet pieces, no whole flakes of fish sitting on top.',
}

export function opisReczny(nazwa) {
  return OPISY_RECZNE[nazwa] || null
}

// ── Wskazówki do PRZEPISU ─────────────────────────────────────────
// Doklejane do promptu generującego przepis. Używane tylko wtedy, gdy
// przepis jest (prze)generowany — czyli przy nowym daniu albo przy
// NADPISZ=1. Tu piszemy po polsku, bo to trafia do polskiego promptu.
export const WSKAZOWKI_PRZEPISU = {
  'Naleśniki z boczkiem':
    'To danie na słodko-słono: DWA cienkie naleśniki (nie pankejki, nie placki) ' +
    'zwinięte w rulony z dżemem malinowym w środku, a na wierzchu podsmażony na ' +
    'chrupko boczek polany syropem klonowym. Dżem malinowy i syrop klonowy MUSZĄ ' +
    'być na liście składników. Bez szczypiorku i bez ziół.',

  'Parówki':
    'Najprostsze możliwe śniadanie: parówki gotowane w wodzie, podane z pieczywem, ' +
    'ketchupem i musztardą. Bez szczypiorku, bez ziół, bez grillowania i bez ' +
    'dodatkowych udziwnień — tak, jak robi się to w domu w pięć minut.',
}

export function wskazowkaPrzepisu(nazwa) {
  return WSKAZOWKI_PRZEPISU[nazwa] || null
}
