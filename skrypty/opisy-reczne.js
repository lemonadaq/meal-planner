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

  // ── Krokiety: naleśnik zwinięty z farszem, nie kotlecik z ciasta ──
  // Wspólny kształt dla wszystkich trzech, różni je tylko farsz.
  'Krokiety z kapustą kiszoną i grzybami':
    'Golden breadcrumbed croquettes made from thin pancakes: each is a crêpe rolled around ' +
    'the filling, so a cut across one shows alternating layers of thin pale pancake and ' +
    'filling of sauerkraut and mushrooms. The outside is crisp, deep golden and evenly ' +
    'breaded, the shape a flattened cylinder. One is cut open so the rolled pancake layers ' +
    'and the filling between them are clearly visible. Never a ball or patty of dough with ' +
    'filling buried inside, never a potato croquette.',

  'Krokiety z pieczarkami':
    'Golden breadcrumbed croquettes made from thin pancakes: each is a crêpe rolled around ' +
    'the filling, so a cut across one shows alternating layers of thin pale pancake and ' +
    'a filling of chopped fried mushrooms and onion. The outside is crisp, deep golden and ' +
    'evenly breaded, the shape a flattened cylinder. One is cut open so the rolled pancake ' +
    'layers and the filling between them are clearly visible. Never a ball or patty of ' +
    'dough with filling buried inside, never a potato croquette.',

  'Krokiety z mięsem':
    'Golden breadcrumbed croquettes made from thin pancakes: each is a crêpe rolled around ' +
    'the filling, so a cut across one shows alternating layers of thin pale pancake and ' +
    'a filling of seasoned minced meat. The outside is crisp, deep golden and evenly ' +
    'breaded, the shape a flattened cylinder. One is cut open so the rolled pancake layers ' +
    'and the filling between them are clearly visible. Never a ball or patty of dough with ' +
    'filling buried inside, never a potato croquette.',

  'Jajecznica z boczkiem i szczypiorkiem':
    'Soft scrambled eggs with crisp pieces of bacon cooked right into them — the bacon is ' +
    'coated in egg and folded through the curds, browned and crisp at the edges but partly ' +
    'buried in the egg rather than sitting on the surface. Chopped chives are scattered ' +
    'over the top. The bacon was fried in the pan and the eggs poured onto it; it is never ' +
    'sprinkled over finished eggs like separate crunchy bits on top.',

  'Ryż smażony z jajkiem, kurczakiem i warzywami':
    'Stir-fried rice where beaten egg was poured straight into the hot pan and tossed ' +
    'through, so the grains are coated in a thin film of set egg and the whole dish is pale ' +
    'yellow throughout, with only small ragged shreds of egg here and there. Pieces of ' +
    'chicken and diced vegetables are mixed evenly into the rice. There is no separate ' +
    'omelette, no scrambled egg sitting on top and no fried egg laid over the rice.',

  'Racuchy z jabłkami':
    'Thick Polish yeast fritters fried in a deep layer of oil: irregular rounds with uneven, ' +
    'ragged golden-brown edges, puffed and slightly misshapen, no two alike. Pieces of apple ' +
    'show through the batter and at the torn edges. Dusted with icing sugar and piled loosely ' +
    'on a plate. These are racuchy — never neat flat even American pancakes and never a tidy ' +
    'stack of identical discs.',

  'Racuchy jabłkowe mini':
    'Small thick Polish yeast fritters fried in a deep layer of oil: irregular little rounds ' +
    'with uneven ragged golden-brown edges, puffed and slightly misshapen, no two alike. ' +
    'Pieces of apple show through the batter. Dusted with icing sugar and piled loosely. ' +
    'These are racuchy — never neat flat even American pancakes, never uniform discs.',

  'Spring rolls (sajgonki)':
    'Fresh rice-paper rolls cut in half and standing cut-side up. In each roll the pink ' +
    'prawns lie in a neat row pressed flat against the translucent rice paper on the outer ' +
    'curve, so they show clearly through the wrapper from the outside, with noodles, herbs ' +
    'and shredded vegetables rolled up behind them. The prawns face outward against the ' +
    'wrapper — never buried in the middle of the roll and never turned away from the ' +
    'visible side.',

  'Wrap z falafelem i hummusem':
    'A large flour tortilla wrapped tightly around the filling exactly like a döner kebab: ' +
    'rolled into a dense cylinder, folded closed at the bottom, held in a paper wrapper and ' +
    'cut across so the packed filling shows at the cut face. Inside are whole browned ' +
    'falafel balls, shredded cabbage and lettuce, tomato, red onion and drizzles of hummus ' +
    'and garlic sauce, pressed tight together. It is a kebab with falafel instead of meat — ' +
    'never a flat open wrap, never a salad loosely laid on a tortilla, never an unrolled ' +
    'burrito.',

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
