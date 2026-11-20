# paczka-10-masa.py
# Źródło paczki `skrypty/dania/paczka-10.json` — dania „na masę" (dieta: masa).
#
# Po co skrypt, a nie ręczny JSON: makro (białko/tłuszcz/węgle) i kcal
# liczą się tu ze składników i tabeli wartości na 100 g, więc zmiana
# gramatury od razu przelicza liczby. Ilości są NA JEDNĄ PORCJĘ.
#
# Dania są dobrane pod wspólny koszyk: te same mięsa (pierś i udko
# z kurczaka, mielona wołowina), ryż basmati, makaron, jajka, twaróg, skyr,
# ser żółty, tortille, banany i masło orzechowe wracają w kilku daniach,
# żeby lista zakupów na tydzień była krótka.
#
#   python3 skrypty/dania/zrodla/paczka-10-masa.py   → nadpisuje paczka-10.json

import json, os

# kcal, białko, tłuszcz, węgle — na 100 g produktu (surowego / z puszki odsączonego)
W = {
    'jajka': (140, 12.5, 9.7, 0.7), 'pierś z kurczaka': (110, 23, 1.5, 0),
    'udko z kurczaka': (160, 18, 9.5, 0), 'mięso mielone wołowe': (250, 18, 20, 0),
    'antrykot wołowy': (220, 19, 16, 0), 'filet z łososia': (200, 20, 13, 0),
    'tuńczyk w sosie własnym': (100, 23, 1, 0), 'szynka': (110, 19, 3, 1.5),
    'ser żółty': (350, 26, 27, 0), 'mozzarella': (250, 18, 19, 2),
    'parmezan': (400, 33, 29, 0), 'twaróg': (130, 18, 4.7, 3.5),
    'skyr naturalny': (63, 11, 0.2, 4), 'jogurt naturalny': (60, 4, 3, 6),
    'jogurt grecki': (130, 4, 10, 4), 'mleko': (50, 3.3, 2, 4.8),
    'masło': (740, 0.7, 82, 0.7), 'oliwa z oliwek': (884, 0, 100, 0),
    'olej': (884, 0, 100, 0), 'ryż basmati': (355, 8, 1, 78),
    'spaghetti': (360, 12.5, 1.5, 72), 'makaron': (360, 12.5, 1.5, 72),
    'kasza bulgur': (342, 12, 1.3, 76), 'mąka pszenna': (345, 10, 1.2, 72),
    'płatki owsiane': (370, 13, 7, 60), 'chleb żytni': (230, 6, 1.5, 45),
    'tortilla': (300, 8.5, 7, 50), 'chałka': (320, 8, 7, 55),
    'bułka': (270, 9, 4, 50), 'ziemniaki': (77, 2, 0.1, 17),
    'fasola czerwona z puszki': (100, 7, 0.5, 15), 'kukurydza z puszki': (80, 2.5, 1, 15),
    'pomidory z puszki': (22, 1.2, 0.2, 4), 'koncentrat pomidorowy': (80, 4, 0.5, 15),
    'cebula': (40, 1.1, 0.1, 9), 'czosnek': (150, 6, 0.5, 33),
    'papryka': (30, 1, 0.3, 6), 'pomidory': (18, 0.9, 0.2, 3.9),
    'ogórek': (15, 0.7, 0.1, 3), 'brokuł': (34, 2.8, 0.4, 7),
    'szpinak': (23, 2.9, 0.4, 3.6), 'awokado': (160, 2, 15, 9),
    'banany': (89, 1.1, 0.3, 23), 'jagody': (57, 0.7, 0.3, 14),
    'masło orzechowe': (590, 25, 50, 16), 'miód': (320, 0.3, 0, 82),
    'cukier': (400, 0, 0, 100), 'śmietana 18%': (186, 2.5, 18, 3.6),
    'sos sojowy': (55, 8, 0.5, 5), 'oliwki czarne': (115, 0.8, 11, 6),
    'rzodkiewka': (16, 0.7, 0.1, 3.4), 'sałata': (15, 1.4, 0.2, 2.9),
    'papryczka chili': (40, 2, 0.4, 9), 'dymka': (32, 1.8, 0.2, 7),
    'drożdże świeże': (105, 8.4, 1.9, 18), 'majonez': (700, 1, 75, 2),
    'sok z cytryny': (22, 0.4, 0.2, 7), 'imbir': (80, 1.8, 0.8, 18),
}

# Ile gramów waży jednostka — tylko do przeliczenia makro, w paczce zostaje
# jednostka sklepowa.
SZT = {'jajka': 55, 'cebula': 120, 'czosnek': 5, 'papryka': 150, 'pomidory': 120,
       'banany': 120, 'tortilla': 60, 'chleb żytni': 40, 'awokado': 140,
       'ogórek': 150, 'papryczka chili': 10, 'dymka': 15, 'ziemniaki': 150,
       'bułka': 70, 'rzodkiewka': 10, 'oliwki czarne': 4}
LYZKA = {'olej': 10, 'oliwa z oliwek': 10, 'masło orzechowe': 16, 'miód': 20,
         'jogurt naturalny': 20, 'jogurt grecki': 20, 'koncentrat pomidorowy': 15,
         'sos sojowy': 15, 'śmietana 18%': 15, 'majonez': 12, 'sok z cytryny': 15,
         'mąka pszenna': 10, 'cukier': 12, 'imbir': 10}

KAT = {
    '1': '1_Warzywa i owoce', '2': '2_Mięso i ryby', '3': '3_Nabiał', '4': '4_Pieczywo',
    '5': '5_Produkty sypkie', '6': '6_Konserwy i słoiki', '7': '7_Przyprawy', '8': '8_Inne',
}
KATEGORIA = {
    'jajka': '3', 'pierś z kurczaka': '2', 'udko z kurczaka': '2', 'mięso mielone wołowe': '2',
    'antrykot wołowy': '2', 'filet z łososia': '2', 'tuńczyk w sosie własnym': '6',
    'szynka': '2', 'ser żółty': '3', 'mozzarella': '3', 'parmezan': '3', 'twaróg': '3',
    'skyr naturalny': '3', 'jogurt naturalny': '3', 'jogurt grecki': '3', 'mleko': '3',
    'masło': '3', 'śmietana 18%': '3', 'oliwa z oliwek': '8', 'olej': '8', 'miód': '8',
    'ryż basmati': '5', 'spaghetti': '5', 'makaron': '5', 'kasza bulgur': '5',
    'mąka pszenna': '5', 'płatki owsiane': '5', 'cukier': '5', 'drożdże świeże': '5',
    'chleb żytni': '4', 'tortilla': '4', 'chałka': '4', 'bułka': '4',
    'fasola czerwona z puszki': '6', 'kukurydza z puszki': '6', 'pomidory z puszki': '6',
    'koncentrat pomidorowy': '6', 'masło orzechowe': '6', 'sos sojowy': '6',
    'oliwki czarne': '6', 'majonez': '6',
}
WARZYWA = {'cebula', 'czosnek', 'papryka', 'pomidory', 'ogórek', 'brokuł', 'szpinak',
           'awokado', 'banany', 'jagody', 'rzodkiewka', 'sałata', 'papryczka chili',
           'dymka', 'ziemniaki', 'sok z cytryny', 'imbir', 'szczypiorek',
           'natka pietruszki', 'koperek'}


def sk(nazwa, ilosc, jednostka):
    if nazwa in WARZYWA:
        kat = KAT['1']
    elif nazwa in KATEGORIA:
        kat = KAT[KATEGORIA[nazwa]]
    else:
        kat = KAT['7']
    return {'nazwa': nazwa, 'ilosc': ilosc, 'jednostka': jednostka, 'kategoria': kat}


def liczba(tekst):
    tekst = str(tekst)
    if ' ' in tekst:
        cale, ulamek = tekst.split(' ')
        return float(cale) + liczba(ulamek)
    if '/' in tekst:
        a, b = tekst.split('/')
        return float(a) / float(b)
    return float(tekst)


def gramy(s):
    n, j, il = s['nazwa'], s['jednostka'], liczba(s['ilosc'])
    if j in ('g', 'ml'):
        return il
    if j == 'szt':
        return il * SZT.get(n, 0)
    if j == 'łyżka':
        return il * LYZKA.get(n, 0)
    if j == 'łyżeczka':
        return il * LYZKA.get(n, 0) / 3
    return 0


def makro(skladniki):
    k = b = t = w = 0
    for s in skladniki:
        if s['nazwa'] not in W:
            continue  # przyprawy, zioła — pomijalne
        g = gramy(s)
        kk, bb, tt, ww = W[s['nazwa']]
        k += kk * g / 100; b += bb * g / 100; t += tt * g / 100; w += ww * g / 100
    return round(k / 10) * 10, round(b), round(t), round(w)


D = []


def danie(nazwa, rodzaj, kuchnia, poziom, czas, skladniki, kroki, opis):
    kcal, b, t, w = makro(skladniki)
    D.append({
        'nazwa': nazwa, 'rodzaj': rodzaj, 'kuchnia': kuchnia, 'poziom': poziom,
        'czas_minuty': czas, 'kcal': kcal, 'dieta': 'masa',
        'bialko': b, 'tluszcz': t, 'wegle': w,
        'skladniki': skladniki, 'kroki': kroki, 'opis_wizualny': opis,
    })


# ── ŚNIADANIA ─────────────────────────────────────────────

danie('Jajecznica z 4 jaj z szynką na chlebie żytnim', 'sniadanie', 'polska', 'latwe', 15, [
    sk('jajka', '4', 'szt'), sk('masło', '10', 'g'), sk('szynka', '50', 'g'),
    sk('chleb żytni', '3', 'szt'), sk('pomidory', '1', 'szt'), sk('szczypiorek', '1', 'łyżka'),
    sk('sól', '1', 'szczypta'), sk('pieprz', '1', 'szczypta'),
], [
    'Rozgrzej masło na patelni na średnim ogniu i podsmaż pokrojoną w paski szynkę przez minutę.',
    'Wbij jajka, dopraw solą i pieprzem i mieszaj powoli szpatułką, aż się zetną, ale zostaną wilgotne.',
    'Zdejmij z ognia, posyp szczypiorkiem. Podawaj z chlebem żytnim i pokrojonym pomidorem.',
], 'A generous portion of soft, creamy scrambled eggs with strips of ham and chopped chives on a plate, three slices of dark rye bread on the side and a sliced tomato. Natural morning light, rustic wooden table.')

danie('Burrito śniadaniowe z jajkiem, fasolą i serem', 'sniadanie', 'meksykanska', 'latwe', 20, [
    sk('tortilla', '2', 'szt'), sk('jajka', '3', 'szt'), sk('fasola czerwona z puszki', '80', 'g'),
    sk('ser żółty', '40', 'g'), sk('papryka', '1/2', 'szt'), sk('papryczka chili', '1/2', 'szt'),
    sk('olej', '1', 'łyżeczka'), sk('kumin', '1', 'szczypta'), sk('sól', '1', 'szczypta'),
], [
    'Podsmaż na oleju pokrojoną w kostkę paprykę i chili przez 3 minuty.',
    'Dodaj odsączoną fasolę i kumin, rozgnieć ją lekko widelcem i podgrzej.',
    'Wbij jajka, posól i mieszaj, aż się zetną.',
    'Rozłóż farsz na tortillach, posyp startym serem, zwiń ciasno i opiecz na suchej patelni z obu stron, aż ser się roztopi.',
], 'Two golden toasted breakfast burritos cut in half, showing a filling of scrambled eggs, red beans, diced red pepper and melted cheese. Served on a board with a small bowl of salsa.')

danie('Twarożek z jajkiem na twardo i rzodkiewką na chlebie żytnim', 'sniadanie', 'polska', 'latwe', 15, [
    sk('twaróg', '200', 'g'), sk('skyr naturalny', '100', 'g'), sk('jajka', '2', 'szt'),
    sk('rzodkiewka', '5', 'szt'), sk('szczypiorek', '2', 'łyżka'), sk('chleb żytni', '3', 'szt'),
    sk('masło', '10', 'g'), sk('sól', '1', 'szczypta'), sk('pieprz', '1', 'szczypta'),
], [
    'Ugotuj jajka na twardo (9 minut od zagotowania), ostudź w zimnej wodzie i obierz.',
    'Rozgnieć twaróg widelcem ze skyrem, dodaj pokrojoną rzodkiewkę i szczypiorek, dopraw solą i pieprzem.',
    'Posmaruj chleb cienko masłem, nałóż twarożek, a na wierzch połówki jajek.',
], 'Slices of rye bread topped with a thick layer of white cottage cheese spread with sliced radishes and chives, halved hard-boiled eggs on top. Bright, fresh breakfast scene.')

danie('Pancakes proteinowe ze skyrem i bananem', 'sniadanie', 'amerykanska', 'latwe', 25, [
    sk('jajka', '2', 'szt'), sk('skyr naturalny', '200', 'g'), sk('mąka pszenna', '80', 'g'),
    sk('proszek do pieczenia', '1', 'łyżeczka'), sk('banany', '1', 'szt'),
    sk('masło orzechowe', '1', 'łyżka'), sk('miód', '1', 'łyżka'), sk('olej', '1', 'łyżeczka'),
], [
    'Zmiksuj jajka ze skyrem, dodaj mąkę i proszek do pieczenia i wymieszaj na gładkie, gęste ciasto.',
    'Smaż małe placki na lekko natłuszczonej patelni na średnim ogniu, aż pojawią się bąbelki, potem obróć i smaż jeszcze minutę.',
    'Podawaj z plasterkami banana, masłem orzechowym i miodem.',
], 'A tall stack of thick, fluffy golden pancakes topped with banana slices, a drizzle of peanut butter and honey dripping down the sides. Shot from a low angle.')

danie('Tosty francuskie z chałki z bananem i skyrem', 'sniadanie', 'francuska', 'latwe', 15, [
    sk('chałka', '120', 'g'), sk('jajka', '3', 'szt'), sk('mleko', '60', 'ml'),
    sk('cynamon', '1', 'szczypta'), sk('masło', '10', 'g'), sk('skyr naturalny', '150', 'g'),
    sk('banany', '1', 'szt'), sk('miód', '1', 'łyżka'),
], [
    'Roztrzep jajka z mlekiem i cynamonem w głębokim talerzu.',
    'Pokrój chałkę na grube kromki i namocz każdą z obu stron w masie jajecznej.',
    'Smaż na maśle na średnim ogniu po 2 minuty z każdej strony, aż się zrumienią.',
    'Podawaj ze skyrem, plasterkami banana i miodem.',
], 'Thick slices of golden-brown French toast made from braided challah, topped with a dollop of thick white yogurt, banana slices and honey. Dusting of cinnamon, cosy breakfast light.')

danie('Naleśniki z twarożkiem waniliowym i jagodami', 'sniadanie', 'polska', 'srednie', 30, [
    sk('mąka pszenna', '60', 'g'), sk('mleko', '120', 'ml'), sk('jajka', '1', 'szt'),
    sk('twaróg', '200', 'g'), sk('skyr naturalny', '50', 'g'), sk('cukier waniliowy', '1', 'łyżeczka'),
    sk('miód', '1', 'łyżka'), sk('jagody', '80', 'g'), sk('olej', '1', 'łyżeczka'),
], [
    'Zmiksuj mąkę z mlekiem, jajkiem i szczyptą soli. Odstaw ciasto na 10 minut.',
    'Smaż cienkie naleśniki na lekko natłuszczonej patelni, po około minucie z każdej strony.',
    'Rozgnieć twaróg ze skyrem, cukrem waniliowym i miodem.',
    'Posmaruj naleśniki farszem, złóż w trójkąty i podawaj z jagodami.',
], 'Thin golden crepes folded into triangles, generously filled with sweet vanilla cottage cheese, scattered with fresh blueberries on a white plate.')

danie('Shake bananowy z masłem orzechowym i płatkami', 'sniadanie', 'miedzynarodowa', 'latwe', 5, [
    sk('mleko', '400', 'ml'), sk('banany', '1', 'szt'), sk('płatki owsiane', '50', 'g'),
    sk('masło orzechowe', '2', 'łyżka'), sk('skyr naturalny', '150', 'g'), sk('miód', '1', 'łyżka'),
], [
    'Wrzuć wszystkie składniki do blendera.',
    'Miksuj minutę, aż płatki całkiem się rozdrobnią i shake będzie gładki. Pij od razu albo zabierz w bidonie do pracy.',
], 'A tall glass of thick, creamy beige banana peanut butter smoothie with a straw, a banana and a jar of peanut butter beside it on a kitchen counter.')

# ── OBIADY (na 2 dni — gotuj podwójnie) ───────────────────

danie('Udka z kurczaka tikka z ryżem basmati', 'obiad', 'indyjska', 'srednie', 45, [
    sk('udko z kurczaka', '250', 'g'), sk('jogurt naturalny', '3', 'łyżka'),
    sk('ryż basmati', '120', 'g'), sk('cebula', '1', 'szt'), sk('czosnek', '2', 'szt'),
    sk('imbir', '1', 'łyżeczka'), sk('pomidory z puszki', '200', 'g'),
    sk('śmietana 18%', '3', 'łyżka'), sk('garam masala', '2', 'łyżeczka'),
    sk('kurkuma', '1', 'łyżeczka'), sk('papryczka chili', '1', 'szt'),
    sk('olej', '1', 'łyżka'), sk('sól', '1', 'szczypta'),
], [
    'Pokrój mięso z udek w kostkę i wymieszaj z jogurtem, połową garam masali i solą. Odstaw na 15 minut.',
    'Ugotuj ryż według instrukcji na opakowaniu.',
    'Na oleju zeszklij posiekaną cebulę, dodaj czosnek, imbir, chili, kurkumę i resztę garam masali, smaż minutę.',
    'Dodaj kurczaka i obsmaż go ze wszystkich stron przez 5 minut.',
    'Wlej pomidory i duś pod przykryciem 15 minut. Na koniec wmieszaj śmietanę i podgrzej, nie gotując.',
    'Podawaj z ryżem. Druga porcja dobrze znosi odgrzewanie następnego dnia.',
], 'A bowl of fluffy white basmati rice next to a rich orange-red tikka curry with tender chunks of chicken thigh, swirl of cream on top, sprinkled with fresh coriander.')

danie('Chili con carne z ryżem i kwaśną śmietaną', 'obiad', 'meksykanska', 'srednie', 50, [
    sk('mięso mielone wołowe', '200', 'g'), sk('fasola czerwona z puszki', '120', 'g'),
    sk('kukurydza z puszki', '60', 'g'), sk('pomidory z puszki', '200', 'g'),
    sk('koncentrat pomidorowy', '1', 'łyżka'), sk('cebula', '1', 'szt'), sk('czosnek', '2', 'szt'),
    sk('papryka', '1/2', 'szt'), sk('papryczka chili', '1', 'szt'), sk('kumin', '1', 'łyżeczka'),
    sk('papryka słodka', '1', 'łyżeczka'), sk('ryż basmati', '100', 'g'),
    sk('śmietana 18%', '2', 'łyżka'), sk('olej', '1', 'łyżeczka'), sk('sól', '1', 'szczypta'),
], [
    'Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.',
    'Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.',
    'Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.',
    'W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.',
], 'A deep bowl of thick, dark red chili con carne with ground beef, kidney beans and corn, served over white rice with a dollop of sour cream and sliced red chili on top.')

danie('Spaghetti z wołowym sosem pomidorowym i parmezanem', 'obiad', 'wloska', 'latwe', 40, [
    sk('spaghetti', '125', 'g'), sk('mięso mielone wołowe', '150', 'g'),
    sk('pomidory z puszki', '200', 'g'), sk('koncentrat pomidorowy', '1', 'łyżka'),
    sk('cebula', '1/2', 'szt'), sk('czosnek', '2', 'szt'), sk('marchew', '1/2', 'szt'),
    sk('oregano', '1', 'łyżeczka'), sk('parmezan', '20', 'g'),
    sk('oliwa z oliwek', '1', 'łyżeczka'), sk('sól', '1', 'szczypta'), sk('pieprz', '1', 'szczypta'),
], [
    'Na oliwie podsmaż drobno posiekaną cebulę i startą marchew przez 5 minut, dodaj czosnek.',
    'Dodaj mięso i smaż, aż się zrumieni. Wmieszaj koncentrat, pomidory i oregano, dopraw.',
    'Duś sos na małym ogniu 20 minut.',
    'Ugotuj spaghetti al dente, wymieszaj z sosem i posyp tartym parmezanem.',
], 'A large plate of spaghetti twirled with a thick meaty tomato and beef sauce, generously topped with grated parmesan and a basil leaf, rustic Italian setting.')

danie('Kurczak teriyaki z ryżem i brokułem', 'obiad', 'japonska', 'latwe', 30, [
    sk('pierś z kurczaka', '220', 'g'), sk('ryż basmati', '120', 'g'), sk('brokuł', '150', 'g'),
    sk('sos sojowy', '2', 'łyżka'), sk('miód', '1', 'łyżka'), sk('czosnek', '1', 'szt'),
    sk('imbir', '1', 'łyżeczka'), sk('sezam', '1', 'łyżeczka'), sk('olej', '1', 'łyżka'),
    sk('dymka', '1', 'szt'),
], [
    'Ugotuj ryż. Brokuł podziel na różyczki i gotuj na parze lub w wodzie 4 minuty.',
    'Wymieszaj sos sojowy z miodem, startym czosnkiem i imbirem.',
    'Pokrój kurczaka w kostkę i smaż na oleju na mocnym ogniu 6–7 minut, aż się zrumieni.',
    'Wlej sos i smaż jeszcze 2 minuty, aż zgęstnieje i oblepi mięso.',
    'Podawaj z ryżem i brokułem, posyp sezamem i dymką. Dobrze nadaje się do pudełka na 2 dni.',
], 'A meal-prep style bowl with white rice, glossy teriyaki chicken pieces sprinkled with sesame seeds and spring onion, and bright green steamed broccoli florets.')

danie('Antrykot z pieczonymi ziemniakami i sałatką', 'obiad', 'amerykanska', 'srednie', 50, [
    sk('antrykot wołowy', '250', 'g'), sk('ziemniaki', '2', 'szt'),
    sk('oliwa z oliwek', '1', 'łyżka'), sk('masło', '10', 'g'), sk('czosnek', '2', 'szt'),
    sk('rozmaryn', '1', 'łyżeczka'), sk('sałata', '50', 'g'), sk('pomidory', '1', 'szt'),
    sk('ogórek', '1/2', 'szt'), sk('sól', '1', 'szczypta'), sk('pieprz', '1', 'szczypta'),
], [
    'Wyjmij stek z lodówki 30 minut przed smażeniem. Rozgrzej piekarnik do 210 stopni.',
    'Pokrój ziemniaki w łódeczki, wymieszaj z połową oliwy, rozmarynem i solą. Piecz 35 minut, raz przewracając.',
    'Osusz stek, posól i smaż na bardzo gorącej patelni z resztą oliwy po 3 minuty z każdej strony. Pod koniec dodaj masło i czosnek i polewaj nimi mięso.',
    'Odstaw stek na 5 minut, potem pokrój w poprzek włókien.',
    'Podawaj z ziemniakami i sałatką z sałaty, pomidora i ogórka.',
], 'A sliced medium-rare ribeye steak with a caramelised crust, pink centre, alongside crispy golden roasted potato wedges with rosemary and a fresh green side salad.')

danie('Makaron z kurczakiem i szpinakiem w sosie śmietanowym', 'obiad', 'wloska', 'latwe', 30, [
    sk('makaron', '120', 'g'), sk('pierś z kurczaka', '180', 'g'), sk('szpinak', '80', 'g'),
    sk('śmietana 18%', '4', 'łyżka'), sk('parmezan', '20', 'g'), sk('czosnek', '2', 'szt'),
    sk('oliwa z oliwek', '1', 'łyżeczka'), sk('papryka ostra', '1', 'szczypta'),
    sk('sól', '1', 'szczypta'), sk('pieprz', '1', 'szczypta'),
], [
    'Ugotuj makaron al dente, odlej trochę wody z gotowania.',
    'Pokrój kurczaka w paski, dopraw solą, pieprzem i ostrą papryką i smaż na oliwie 6 minut.',
    'Dodaj czosnek i szpinak, smaż, aż szpinak zwiędnie.',
    'Wlej śmietanę i 3 łyżki wody z makaronu, dodaj parmezan i makaron, wymieszaj, aż sos oblepi makaron.',
], 'Penne pasta in a creamy white sauce with strips of golden pan-fried chicken and wilted spinach, topped with shaved parmesan and black pepper.')

# ── KOLACJE ───────────────────────────────────────────────

danie('Wrapy z kurczakiem gyros i tzatziki', 'kolacja', 'grecka', 'latwe', 25, [
    sk('tortilla', '2', 'szt'), sk('pierś z kurczaka', '180', 'g'),
    sk('przyprawa gyros', '2', 'łyżeczka'), sk('jogurt grecki', '4', 'łyżka'),
    sk('ogórek', '1/2', 'szt'), sk('czosnek', '1', 'szt'), sk('pomidory', '1', 'szt'),
    sk('sałata', '30', 'g'), sk('cebula czerwona', '1/4', 'szt'), sk('olej', '1', 'łyżka'),
], [
    'Pokrój kurczaka w paski, wymieszaj z przyprawą gyros i olejem i smaż 7 minut na mocnym ogniu.',
    'Zetrzyj ogórek, odciśnij wodę i wymieszaj z jogurtem i przeciśniętym czosnkiem.',
    'Podgrzej tortille na suchej patelni. Nałóż sałatę, pomidora, cebulę, kurczaka i tzatziki, zawiń.',
], 'Two wraps cut diagonally, filled with spiced golden gyros chicken strips, lettuce, tomato, red onion and creamy white tzatziki sauce, on a wooden board.')

danie('Penne z tuńczykiem, oliwkami i pomidorami', 'kolacja', 'wloska', 'latwe', 20, [
    sk('makaron', '110', 'g'), sk('tuńczyk w sosie własnym', '120', 'g'),
    sk('pomidory z puszki', '150', 'g'), sk('oliwki czarne', '6', 'szt'),
    sk('czosnek', '2', 'szt'), sk('papryczka chili', '1/2', 'szt'),
    sk('oliwa z oliwek', '1', 'łyżka'), sk('parmezan', '15', 'g'), sk('natka pietruszki', '1', 'łyżka'),
], [
    'Ugotuj makaron al dente.',
    'Na oliwie podsmaż czosnek i chili przez minutę, dodaj pomidory i duś 8 minut.',
    'Dodaj odsączonego tuńczyka i pokrojone oliwki, podgrzej.',
    'Wymieszaj z makaronem, posyp parmezanem i natką.',
], 'A bowl of penne pasta in a chunky tomato sauce with flakes of tuna, sliced black olives and chopped parsley, sprinkled with parmesan.')

danie('Cheeseburger z jajkiem sadzonym', 'kolacja', 'amerykanska', 'latwe', 25, [
    sk('mięso mielone wołowe', '150', 'g'), sk('bułka', '1', 'szt'), sk('ser żółty', '30', 'g'),
    sk('jajka', '1', 'szt'), sk('sałata', '20', 'g'), sk('pomidory', '1/2', 'szt'),
    sk('cebula czerwona', '1/4', 'szt'), sk('ketchup', '1', 'łyżka'),
    sk('olej', '1', 'łyżeczka'), sk('sól', '1', 'szczypta'), sk('pieprz', '1', 'szczypta'),
], [
    'Uformuj z mięsa płaski kotlet, dopraw solą i pieprzem dopiero tuż przed smażeniem.',
    'Smaż na mocno rozgrzanej patelni po 3 minuty z każdej strony. Pod koniec połóż ser i przykryj, żeby się roztopił.',
    'Usmaż jajko sadzone. Podpiecz przekrojoną bułkę.',
    'Złóż burgera: bułka, ketchup, sałata, pomidor, kotlet z serem, cebula, jajko.',
], 'A tall homemade cheeseburger with a juicy beef patty, melted cheese, a fried egg with runny yolk, lettuce, tomato and red onion in a toasted bun.')

danie('Łosoś pieczony z kaszą bulgur i brokułem', 'kolacja', 'miedzynarodowa', 'latwe', 30, [
    sk('filet z łososia', '160', 'g'), sk('kasza bulgur', '80', 'g'), sk('brokuł', '150', 'g'),
    sk('sok z cytryny', '1', 'łyżka'), sk('czosnek', '1', 'szt'), sk('koperek', '1', 'łyżka'),
    sk('oliwa z oliwek', '1', 'łyżeczka'), sk('sól', '1', 'szczypta'), sk('pieprz', '1', 'szczypta'),
], [
    'Rozgrzej piekarnik do 200 stopni. Łososia skrop cytryną i oliwą, dopraw solą, pieprzem i czosnkiem.',
    'Piecz łososia 15 minut.',
    'Ugotuj kaszę bulgur według opakowania, a brokuł na parze przez 4 minuty.',
    'Podawaj łososia na kaszy z brokułem, posyp koperkiem.',
], 'A roasted salmon fillet with a golden top and lemon slice, served on fluffy bulgur wheat with bright green broccoli and fresh dill.')

danie('Pizza z szynką i mozzarellą na cieście 00', 'kolacja', 'wloska', 'srednie', 100, [
    sk('mąka pszenna', '125', 'g'), sk('drożdże świeże', '3', 'g'),
    sk('oliwa z oliwek', '1', 'łyżeczka'), sk('pomidory z puszki', '80', 'g'),
    sk('mozzarella', '80', 'g'), sk('szynka', '60', 'g'), sk('oregano', '1', 'szczypta'),
    sk('sól', '1', 'szczypta'),
], [
    'Rozpuść drożdże w 80 ml letniej wody, dodaj mąkę (najlepiej typu 00), sól i oliwę. Wyrabiaj 8 minut, aż ciasto będzie gładkie.',
    'Odstaw ciasto pod przykryciem na godzinę, aż podwoi objętość.',
    'Rozgrzej piekarnik na maksimum (najlepiej z kamieniem lub blachą w środku).',
    'Rozciągnij ciasto dłońmi, posmaruj zmiksowanymi pomidorami z oregano, połóż mozzarellę i szynkę.',
    'Piecz 7–9 minut, aż brzegi się zrumienią.',
], 'A round homemade Neapolitan-style pizza with a puffy charred crust, tomato sauce, melted mozzarella and slices of ham, on a wooden peel.')

danie('Miska ryżowa z kurczakiem, jajkiem i chili', 'kolacja', 'koreanska', 'latwe', 25, [
    sk('ryż basmati', '90', 'g'), sk('udko z kurczaka', '150', 'g'), sk('jajka', '1', 'szt'),
    sk('papryka', '1/2', 'szt'), sk('ogórek', '1/2', 'szt'), sk('sos sojowy', '1', 'łyżka'),
    sk('miód', '1', 'łyżeczka'), sk('papryczka chili', '1', 'szt'), sk('czosnek', '1', 'szt'),
    sk('sezam', '1', 'łyżeczka'), sk('olej', '1', 'łyżeczka'),
], [
    'Ugotuj ryż.',
    'Pokrój mięso z udek w kostkę i smaż na oleju 7 minut. Dodaj czosnek, chili, sos sojowy i miód i smaż, aż się skarmelizuje.',
    'Usmaż jajko sadzone.',
    'Ułóż w misce ryż, kurczaka, pokrojoną paprykę i ogórek, na wierzch jajko. Posyp sezamem.',
], 'A bowl of white rice topped with sticky caramelised chilli chicken, a fried egg, sliced cucumber and red pepper, sprinkled with sesame seeds.')

danie('Pasta z jaj i twarogu ze szczypiorkiem na żytnim', 'kolacja', 'polska', 'latwe', 15, [
    sk('jajka', '3', 'szt'), sk('twaróg', '100', 'g'), sk('majonez', '1', 'łyżka'),
    sk('szczypiorek', '2', 'łyżka'), sk('chleb żytni', '3', 'szt'), sk('pomidory', '1', 'szt'),
    sk('sól', '1', 'szczypta'), sk('pieprz', '1', 'szczypta'),
], [
    'Ugotuj jajka na twardo, ostudź i obierz.',
    'Posiekaj jajka drobno, wymieszaj z twarogiem, majonezem i szczypiorkiem, dopraw.',
    'Nałóż pastę na chleb i podawaj z pomidorem.',
], 'Open-faced rye bread sandwiches spread thickly with a creamy egg and cottage cheese paste, topped with chopped chives, tomato slices on the side.')

sciezka = os.path.join(os.path.dirname(__file__), '..', 'paczka-10.json')
with open(sciezka, 'w', encoding='utf-8') as f:
    json.dump(D, f, ensure_ascii=False, indent=2)
    f.write('\n')

for d in D:
    print(f"{d['rodzaj']:9} {d['kcal']:5} kcal  B{d['bialko']:4} T{d['tluszcz']:4} W{d['wegle']:4}  {d['nazwa']}")
