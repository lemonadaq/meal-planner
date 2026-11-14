# Faza 2 — generuje dania_meta.csv: nowa nazwa, kuchnia, poziom, uzasadnienie.
# Tylko czyta dane z dysku. Uruchomienie: python3 skrypty/czyszczenie/faza2_dania.py
#
# Kuchnia i poziom: punkt wyjścia to wartości, które już są w bazie (wypełnione
# 2026-09-24, supabase/fixes/20260924-kuchnie-i-poziomy.sql). Tu są tylko
# przemapowanie na nową listę 23 kuchni i poprawki poziomu tam, gdzie łamie
# reguły z zadania (ciasto drożdżowe od zera, pierogi lepione od zera, beza →
# trudne; panierowanie → co najmniej średnie).
#
# W CSV wartości z ogonkami (tak, jak są w zadaniu). Do bazy idą bez ogonków
# (`łatwe` → `latwe`) — patrz ID_BAZY na dole i zastosuj.mjs.
import csv, json, collections, re
from pathlib import Path

TU = Path(__file__).parent

KUCHNIE = ['polska', 'włoska', 'francuska', 'hiszpańska', 'portugalska', 'grecka', 'turecka',
           'bliskowschodnia', 'indyjska', 'chińska', 'japońska', 'koreańska', 'tajska',
           'wietnamska', 'meksykańska', 'amerykańska', 'brytyjska', 'niemiecka', 'węgierska',
           'wschodnioeuropejska', 'brazylijska', 'marokańska', 'międzynarodowa']
POZIOMY = ['łatwe', 'średnie', 'trudne']

# Stare id w bazie → nowa kuchnia (z ogonkami).
KUCHNIA_ZE_STAREJ = {
    'polska': 'polska', 'wloska': 'włoska', 'francuska': 'francuska', 'hiszpanska': 'hiszpańska',
    'grecka': 'grecka', 'turecka': 'turecka', 'bliskowschodnia': 'bliskowschodnia',
    'indyjska': 'indyjska', 'chinska': 'chińska', 'japonska': 'japońska', 'koreanska': 'koreańska',
    'tajska': 'tajska', 'wietnamska': 'wietnamska', 'meksykanska': 'meksykańska',
    'amerykanska': 'amerykańska', 'niemiecka': 'niemiecka', 'wegierska': 'węgierska',
    'ukrainska': 'wschodnioeuropejska', 'afrykanska': 'marokańska',
    'miedzynarodowa': 'międzynarodowa',
}

# Poprawki kuchni dla konkretnych dań (klucz: nazwa po btrim, PRZED zmianą nazwy).
KUCHNIA_POPRAWKI = {
    'Bacalhau a Bras': 'portugalska', 'Caldo verde': 'portugalska', 'Pasteis de nata': 'portugalska',
    'Feijoada': 'brazylijska', 'Moqueca z dorsza': 'brazylijska',
    'English breakfast': 'brytyjska', 'Fish and chips': 'brytyjska', "Shepherd's pie": 'brytyjska',
    'Boeuf Strogonow': 'wschodnioeuropejska', 'Khachapuri': 'wschodnioeuropejska',
    'Empanadas z mięsem': 'hiszpańska',
    'Placek po węgiersku': 'polska',  # wymyślony w Polsce, nie na Węgrzech
    'Smoothie bowl z owocami i granolą': 'międzynarodowa',
    'Smoothie zielone ze szpinakiem i bananem': 'międzynarodowa',
    'Kurczak po koreańsku': 'koreańska', 'Ryż do sushi': 'japońska',
    'Owsianka nocna z malinami i kokosem': 'międzynarodowa',
}

# Poprawki poziomu: nazwa → (poziom, powód).
POZIOM_POPRAWKI = {
    # ciasto drożdżowe od zera → trudne
    **{n: ('trudne', 'ciasto drożdżowe od zera') for n in [
        'Bułki śniadaniowe z dyni', 'Chałka drożdżowa', 'Drożdżówki z budyniem', 'Khachapuri',
        'Kołaczki z serem', 'Lahmacun', 'Naan z czosnkiem', 'Panzerotto pieczone z mozzarellą',
        'Pizza quattro formaggi', 'Pizza z salami i oliwkami', 'Placek drożdżowy ze śliwkami',
        'Rogaliki z marmoladą', 'Grissini z szynką parmeńską']},
    # pierogi / pierożki lepione z ciasta od zera → trudne
    **{n: ('trudne', 'ciasto od zera i lepienie') for n in [
        'Pierogi z truskawkami', 'Wareniki z twarogiem', 'Czebureki z mięsem', 'Empanadas z mięsem']},
    'Placek z rabarbarem i bezą': ('trudne', 'beza'),
    # z gotowym ciastem albo prostą techniką — trudne było na wyrost
    'Pierożki mandu z warzywami': ('średnie', 'pierożki z gotowych krążków ciasta'),
    'Kremówka': ('średnie', 'gotowe ciasto francuskie + budyń'),
    'Millefeuille': ('średnie', 'gotowe ciasto francuskie + krem'),
    'Rogale świętomarcińskie': ('średnie', 'gotowe ciasto francuskie + masa'),
    'Cornetto z kremem': ('średnie', 'gotowe ciasto francuskie + krem'),
    'Pasteis de nata': ('średnie', 'gotowe ciasto francuskie + krem jajeczny'),
    'Krążki cebulowe': ('średnie', 'panierowanie i smażenie'),
    'Krążki kalmarów smażone': ('średnie', 'panierowanie i smażenie'),
    'Fritto misto z owoców morza': ('średnie', 'panierowanie i smażenie'),
    'Spring rolls (sajgonki)': ('średnie', 'zawijanie gotowego papieru ryżowego i smażenie'),
    'Falafel z sosem tahini': ('średnie', 'formowanie kulek i smażenie'),
    'Naleśniki crêpes Suzette (pomarańczowe)*': ('średnie', 'naleśniki + sos karmelowy'),
    'Bułeczki jak z Maka': ('łatwe', 'składanie kanapki z gotowych bułek'),
    'Tonkatsu': ('średnie', 'panierowanie'),
    'Kotlet z indyka z serem': ('średnie', 'panierowanie'),
}

# Nowe nazwy. Klucz: nazwa po btrim. Czego nie ma, zostaje (z poprawką białych znaków).
NAZWY = {
    # literówki i znaki
    'Colesław': 'Coleslaw',
    'Jajka po turecku*': 'Jajka po turecku',
    'Naleśniki crêpes Suzette (pomarańczowe)*': 'Naleśniki w sosie pomarańczowym (crêpes Suzette)',
    'Chińska zupa pikantno kwaśna': 'Chińska zupa pikantno-kwaśna',
    'Kurczak w sosie sojowo czosnkowym po koreańsku': 'Kurczak w sosie sojowo-czosnkowym po koreańsku',
    'Skrzydełka w sosie sojowo miodowym': 'Skrzydełka w sosie sojowo-miodowym',
    'Sos słodko kwaśny domowy': 'Sos słodko-kwaśny domowy',
    'Croque Monsieur/Madame': 'Tost z szynką i beszamelem (croque monsieur)',
    'Pyzy/kluski śląskie': 'Kluski śląskie',
    'Cebulowa (po francusku)': 'Zupa cebulowa po francusku',
    'Breakfast Burrito': 'Burrito śniadaniowe',
    'Boeuf Strogonow': 'Strogonow wołowy',
    'Cobb salad': 'Sałatka Cobb',
    'Spring rolls (sajgonki)': 'Sajgonki (spring rolls)',
    'Zuppa toscana z jarmużem i kiełbasą': 'Toskańska zupa z jarmużem i kiełbasą',
    'Tortellini panna e prosciutto': 'Tortellini z szynką w sosie śmietanowym',
    'Green curry z kurczakiem': 'Zielone curry z kurczakiem',
    'Massaman z wołowiną': 'Tajskie curry massaman z wołowiną',
    'Chia pudding z mango': 'Pudding z nasion chia z mango',
    'Pancakes amerykańskie z syropem klonowym': 'Placuszki amerykańskie z syropem (pancakes)',
    'Mini pancakes z owocami': 'Mini placuszki z owocami (pancakes)',
    'Chili sin carne': 'Chili bez mięsa (chili sin carne)',
    # przykłady z zadania
    'Pasta alla norma': 'Makaron z bakłażanem i ricottą (pasta alla norma)',
    'Japchae z wołowiną': 'Koreański makaron sojowy z wołowiną (japchae)',
    'Patbingsu z kruszonym lodem': 'Koreański deser z kruszonym lodem (patbingsu)',
    'Bun cha z wieprzowiną': 'Wietnamski makaron z grillowaną wieprzowiną (bún chả)',
    # włoska
    'Affogato al caffè': 'Lody zalane espresso (affogato)',
    'Amaretti': 'Migdałowe ciasteczka (amaretti)',
    'Arancini z ryżu': 'Smażone kulki ryżowe (arancini)',
    'Bistecca alla pizzaiola': 'Stek w sosie pomidorowym (alla pizzaiola)',
    'Bocconcini w oliwie z ziołami': 'Mini mozzarella w oliwie z ziołami (bocconcini)',
    'Bomboloni': 'Włoskie pączki z kremem (bomboloni)',
    'Cannoli siciliane': 'Sycylijskie rurki z ricottą (cannoli)',
    'Cantuccini z migdałami': 'Twarde ciasteczka migdałowe (cantuccini)',
    'Caponata z bakłażana': 'Duszony bakłażan po sycylijsku (caponata)',
    'Ciambellone': 'Włoska babka (ciambellone)',
    'Cornetto z kremem': 'Włoski rogalik z kremem (cornetto)',
    'Cotoletta alla milanese': 'Kotlet cielęcy po mediolańsku (cotoletta)',
    'Crespelle zapiekane z szynką i beszamelem': 'Naleśniki zapiekane z szynką i beszamelem (crespelle)',
    'Crostata z dżemem morelowym': 'Kruche ciasto z dżemem morelowym (crostata)',
    'Crostini z wątróbką drobiową': 'Grzanki z pastą z wątróbki (crostini)',
    'Farinata z ciecierzycy': 'Placek z mąki z ciecierzycy (farinata)',
    'Fette biscottate z dżemem i masłem': 'Włoskie sucharki z dżemem i masłem (fette biscottate)',
    'Fettuccine Alfredo': 'Makaron w sosie serowo-maślanym (fettuccine Alfredo)',
    'Frittata z cukinią i parmezanem': 'Włoski omlet z cukinią i parmezanem (frittata)',
    'Frittata z ziemniakami i cebulą': 'Włoski omlet z ziemniakami i cebulą (frittata)',
    'Fritto misto z owoców morza': 'Smażone owoce morza (fritto misto)',
    'Gelato pistacjowe': 'Lody pistacjowe (gelato)',
    'Gnocchi alla romana': 'Zapiekane kluski z kaszy manny (gnocchi alla romana)',
    'Gnocchi alla sorrentina': 'Gnocchi zapiekane z pomidorami (alla sorrentina)',
    'Granita cytrynowa': 'Cytrynowy lód kruszony (granita)',
    'Grissini z szynką parmeńską': 'Paluszki chlebowe z szynką parmeńską (grissini)',
    'Insalata di farro': 'Sałatka z orkiszem (insalata di farro)',
    'Insalata tricolore': 'Sałatka z pomidorów, mozzarelli i bazylii (tricolore)',
    'Involtini cielęce w sosie pomidorowym': 'Roladki cielęce w sosie pomidorowym (involtini)',
    'Maritozzo': 'Rzymska bułeczka z bitą śmietaną (maritozzo)',
    'Ossobuco z gremolatą': 'Duszona gicz wołowa z gremolatą (ossobuco)',
    'Panino z porchettą': 'Kanapka z pieczoną wieprzowiną (panino con porchetta)',
    'Panzanella': 'Toskańska sałatka z chlebem i pomidorami (panzanella)',
    'Panzerotti smażone': 'Smażone pierożki z mozzarellą (panzerotti)',
    'Panzerotto pieczone z mozzarellą': 'Pieczony pieróg z mozzarellą (panzerotto)',
    'Parmigiana z bakłażana': 'Zapiekanka z bakłażana i parmezanu (parmigiana)',
    'Passatelli w bulionie': 'Kluski z parmezanem w bulionie (passatelli)',
    'Pasta al forno z bakłażanem': 'Zapiekany makaron z bakłażanem (pasta al forno)',
    "Pasta all'amatriciana": "Makaron z boczkiem i pomidorami (all'amatriciana)",
    'Pasta alla boscaiola': 'Makaron z grzybami po leśnemu (alla boscaiola)',
    'Pasta alla gricia': 'Makaron z boczkiem i pecorino (alla gricia)',
    'Pasta e ceci': 'Zupa z makaronem i ciecierzycą (pasta e ceci)',
    'Pasta e fagioli': 'Zupa z makaronem i fasolą (pasta e fagioli)',
    'Pastiera napoletana': 'Neapolitańskie ciasto wielkanocne (pastiera)',
    "Penne all'arrabbiata": "Penne w ostrym sosie pomidorowym (all'arrabbiata)",
    'Peperonata': 'Duszona papryka po włosku (peperonata)',
    'Piadina roll z mortadelą': 'Roladki z włoskiego placka z mortadelą (piadina)',
    'Piadina z szynką i rukolą': 'Włoski placek z szynką i rukolą (piadina)',
    'Piccata z kurczaka z cytryną': 'Kurczak w sosie cytrynowym (piccata)',
    'Pollo alla cacciatora': 'Kurczak po myśliwsku (pollo alla cacciatora)',
    'Pollo alla diavola': 'Ostry kurczak z pieca (pollo alla diavola)',
    'Prosciutto z melonem': 'Szynka parmeńska z melonem (prosciutto e melone)',
    'Ribollita': 'Toskańska zupa z fasolą i chlebem (ribollita)',
    'Rigatoni alla genovese': 'Rigatoni z wołowiną duszoną z cebulą (alla genovese)',
    'Risotto alla milanese': 'Risotto z szafranem (alla milanese)',
    'Saltimbocca alla romana': 'Cielęcina z szynką i szałwią (saltimbocca)',
    'Scaloppine z pieczarkami': 'Eskalopki z pieczarkami (scaloppine)',
    'Semifreddo pistacjowe': 'Pistacjowy deser lodowy (semifreddo)',
    'Spaghetti Aglio e Olio': 'Spaghetti z czosnkiem i oliwą (aglio e olio)',
    'Spaghetti alla Nerano': 'Spaghetti z cukinią i serem (alla Nerano)',
    'Spaghetti alla puttanesca': 'Spaghetti z oliwkami i kaparami (puttanesca)',
    'Spaghetti alle vongole': 'Spaghetti z małżami (alle vongole)',
    'Spaghetti cacio e pepe': 'Spaghetti z serem i pieprzem (cacio e pepe)',
    'Stracciatella alla romana': 'Rzymska zupa z jajkiem i parmezanem (stracciatella)',
    'Taralli': 'Włoskie obwarzanki (taralli)',
    'Torta caprese': 'Ciasto czekoladowo-migdałowe (torta caprese)',
    'Torta della nonna': 'Tarta babci z kremem (torta della nonna)',
    'Torta di mele': 'Włoskie ciasto z jabłkami (torta di mele)',
    'Tramezzini z tuńczykiem': 'Włoskie kanapki z tuńczykiem (tramezzini)',
    'Vitello tonnato': 'Cielęcina w sosie tuńczykowym (vitello tonnato)',
    'Zabaglione': 'Krem z żółtek i wina (zabaglione)',
    'Zeppole z kremem': 'Włoskie pączki parzone z kremem (zeppole)',
    # francuska
    'Blanquette de veau': 'Cielęcina w białym sosie (blanquette de veau)',
    'Boeuf bourguignon': 'Wołowina po burgundzku (bœuf bourguignon)',
    'Bouillabaisse': 'Prowansalska zupa rybna (bouillabaisse)',
    'Brandade de morue': 'Pasta z dorsza i ziemniaków (brandade de morue)',
    'Clafoutis z czereśniami': 'Zapiekany deser z czereśniami (clafoutis)',
    'Confit de canard': 'Konfitowane udka kacze (confit de canard)',
    'Coq au vin': 'Kurczak w czerwonym winie (coq au vin)',
    'Far breton': 'Bretoński placek ze śliwkami (far breton)',
    'Flammekueche z boczkiem': 'Alzacki placek z boczkiem i cebulą (flammekueche)',
    'Galette bretonne z jajkiem': 'Gryczany naleśnik z jajkiem (galette bretonne)',
    'Gratin dauphinois': 'Zapiekanka ziemniaczana ze śmietaną (gratin)',
    'Hachis parmentier': 'Zapiekanka z mięsa i puree (hachis parmentier)',
    'Madeleinki': 'Francuskie babeczki (madeleinki)',
    'Millefeuille': 'Francuska kremówka (millefeuille)',
    'Moules marinière': 'Mule w białym winie (moules marinière)',
    'Mousse au chocolat': 'Mus czekoladowy (mousse au chocolat)',
    'Navarin jagnięcy': 'Duszona jagnięcina z warzywami (navarin)',
    'Pain au chocolat': 'Francuskie bułeczki z czekoladą (pain au chocolat)',
    'Pissaladière': 'Prowansalski placek z cebulą i anchois (pissaladière)',
    'Pot-au-feu': 'Wołowina gotowana z warzywami (pot-au-feu)',
    'Poulet basquaise': 'Kurczak po baskijsku (poulet basquaise)',
    'Quiche lorraine': 'Tarta z boczkiem i serem (quiche lorraine)',
    'Salade de chèvre chaud': 'Sałatka z ciepłym kozim serem (chèvre chaud)',
    'Salade lyonnaise': 'Sałatka lyońska z boczkiem i jajkiem',
    'Sole meunière': 'Sola smażona w maśle (sole meunière)',
    'Soupe au pistou': 'Prowansalska zupa warzywna z pesto (pistou)',
    'Tarte tatin': 'Odwrócona tarta z jabłkami (tarte tatin)',
    'Tartiflette': 'Ziemniaki zapiekane z serem i boczkiem (tartiflette)',
    'Vichyssoise': 'Krem z pora i ziemniaków (vichyssoise)',
    # niemiecka
    'Apfelstrudel': 'Strudel jabłkowy (Apfelstrudel)',
    'Sauerbraten': 'Marynowana pieczeń wołowa (Sauerbraten)',
    'Käsespätzle z cebulką': 'Kluski z serem i cebulką (Käsespätzle)',
    # hiszpańska / portugalska / brazylijska
    'Bacalhau a Bras': 'Dorsz z ziemniakami i jajkiem (bacalhau à Brás)',
    'Caldo verde': 'Zupa z jarmużem i kiełbasą (caldo verde)',
    'Crema catalana': 'Kataloński krem z karmelem (crema catalana)',
    'Empanadas z mięsem': 'Pieczone pierożki z mięsem (empanadas)',
    'Feijoada': 'Gulasz z czarnej fasoli i mięsa (feijoada)',
    'Moqueca z dorsza': 'Dorsz w mleku kokosowym po brazylijsku (moqueca)',
    'Pasteis de nata': 'Portugalskie babeczki budyniowe (pastéis de nata)',
    'Patatas bravas': 'Ziemniaki w pikantnym sosie (patatas bravas)',
    'Pollo al ajillo': 'Kurczak z czosnkiem po hiszpańsku (pollo al ajillo)',
    'Salmorejo': 'Hiszpański chłodnik pomidorowy (salmorejo)',
    'Tortilla española': 'Hiszpański omlet z ziemniakami (tortilla española)',
    # brytyjska / amerykańska
    'English breakfast': 'Angielskie śniadanie (English breakfast)',
    'Fish and chips': 'Ryba z frytkami (fish and chips)',
    "Shepherd's pie": "Zapiekanka pasterska (shepherd's pie)",
    'Banana bread': 'Chlebek bananowy (banana bread)',
    'Cornbread': 'Chlebek kukurydziany (cornbread)',
    'Clam chowder': 'Zupa z małżami (clam chowder)',
    'Mac and cheese': 'Makaron z serem (mac and cheese)',
    'Marry me chicken gnocchi': 'Gnocchi z kurczakiem w kremowym sosie (marry me)',
    'Mozzarella sticks': 'Paluszki z mozzarelli w panierce (mozzarella sticks)',
    'Mug cake czekoladowy z mikrofali': 'Ciasto czekoladowe z kubka w mikrofali (mug cake)',
    'Philly cheesesteak': 'Kanapka z wołowiną i serem (Philly cheesesteak)',
    'Reuben sandwich': 'Kanapka z peklowaną wołowiną (Reuben sandwich)',
    'Sloppy Joe': 'Bułka z sosem mięsnym (sloppy joe)',
    'Jambalaya z kiełbasą': 'Ryż z kiełbasą po kreolsku (jambalaya)',
    'Kapsalon': 'Frytki z kurczakiem, serem i warzywami (kapsalon)',
    # meksykańska
    'Chilaquiles z jajkiem': 'Chipsy z tortilli w sosie z jajkiem (chilaquiles)',
    'Enchiladas z kurczakiem': 'Zapiekane tortille z kurczakiem (enchiladas)',
    'Fajitas z kurczakiem': 'Tortille z kurczakiem i papryką (fajitas)',
    'Flan karmelowy': 'Krem karmelowy (flan)',
    'Huevos Rancheros': 'Jajka po meksykańsku (huevos rancheros)',
    'Sopa de tortilla': 'Meksykańska zupa z tortillą (sopa de tortilla)',
    'Tinga de pollo': 'Szarpany kurczak w sosie chipotle (tinga de pollo)',
    # grecka / turecka / bliskowschodnia / marokańska / wschodnioeuropejska
    'Fasolada': 'Grecka zupa fasolowa (fasolada)',
    'Giouvetsi z wołowiną': 'Wołowina zapiekana z makaronem orzo (giouvetsi)',
    'Pastitsio': 'Grecka zapiekanka makaronowa z mięsem (pastitsio)',
    'Souvlaki z kurczaka': 'Greckie szaszłyki z kurczaka (souvlaki)',
    'Spanakopita': 'Grecki placek ze szpinakiem i fetą (spanakopita)',
    'Imam bayildi': 'Faszerowany bakłażan po turecku (imam bayıldı)',
    'Köfte z jogurtem': 'Tureckie kotleciki z jogurtem (köfte)',
    'Lahmacun': 'Turecka pizza z mięsem (lahmacun)',
    'Menemen': 'Tureckie jajka z pomidorami i papryką (menemen)',
    'Fattoush': 'Sałatka z chrupiącą pitą (fattoush)',
    'Mujaddara': 'Soczewica z ryżem i smażoną cebulą (mujaddara)',
    'Tabbouleh': 'Sałatka z bulguru i natki pietruszki (tabbouleh)',
    'Harira': 'Marokańska zupa z soczewicy i ciecierzycy (harira)',
    'Tagine z kurczakiem i cytryną': 'Duszony kurczak z cytryną po marokańsku (tagine)',
    'Zaalouk': 'Marokańska sałatka z bakłażana (zaalouk)',
    'Khachapuri': 'Gruzińska łódka z serem i jajkiem (chaczapuri)',
    # indyjska
    'Aloo gobi': 'Ziemniaki z kalafiorem po indyjsku (aloo gobi)',
    'Biryani z kurczakiem': 'Ryż z kurczakiem po indyjsku (biryani)',
    'Butter Chicken': 'Kurczak w maślanym sosie (butter chicken)',
    'Dal z czerwonej soczewicy': 'Indyjska potrawka z czerwonej soczewicy (dal)',
    'Naan z czosnkiem': 'Indyjski chlebek czosnkowy (naan)',
    'Palak paneer': 'Szpinak z indyjskim serem (palak paneer)',
    'Raita ogórkowa': 'Indyjski sos jogurtowy z ogórkiem (raita)',
    # chińska
    'Bakłażan w sosie yuxiang': 'Bakłażan w pikantnym sosie czosnkowym (yuxiang)',
    'Chow fun z wołowiną': 'Szeroki makaron ryżowy z wołowiną (chow fun)',
    'Chow mein z kurczakiem': 'Smażony makaron z kurczakiem (chow mein)',
    'Lo mein z wołowiną': 'Chiński makaron z wołowiną (lo mein)',
    'Makaron dan dan z mielonym mięsem': 'Syczuański makaron z mielonym mięsem (dan dan)',
    'Mapo tofu z mielonym mięsem': 'Tofu w ostrym sosie z mięsem (mapo tofu)',
    'Kurczak gong bao z orzeszkami': 'Kurczak z orzeszkami po syczuańsku (gong bao)',
    'Wieprzowina gu lao rou': 'Wieprzowina w sosie słodko-kwaśnym (gu lao rou)',
    'Zupa wonton z pierożkami': 'Zupa z chińskimi pierożkami (wonton)',
    'Chrupiące wontony smażone': 'Smażone chińskie pierożki (wontony)',
    # japońska
    'Katsu curry z kurczakiem': 'Kurczak w panko z sosem curry (katsu curry)',
    'Okonomiyaki': 'Japoński placek z kapustą (okonomiyaki)',
    'Oyakodon': 'Ryż z kurczakiem i jajkiem po japońsku (oyakodon)',
    'Tamagoyaki': 'Japoński zwijany omlet (tamagoyaki)',
    'Tonkatsu': 'Japoński kotlet schabowy (tonkatsu)',
    # koreańska
    'Budae jjigae z parówkami i tofu': 'Koreański gulasz z parówkami i tofu (budae jjigae)',
    'Bulgogi wieprzowe w gochujangu': 'Pikantna wieprzowina po koreańsku (bulgogi)',
    'Bulgogi wołowe': 'Marynowana wołowina po koreańsku (bulgogi)',
    'Bungeoppang z pastą z czerwonej fasoli': 'Koreańskie wafle z pastą z fasoli (bungeoppang)',
    'Gochujang jjigae z cukinią': 'Koreańska ostra zupa z cukinią (gochujang jjigae)',
    'Hotteok z cynamonem': 'Koreańskie placki z cynamonem (hotteok)',
    'Kimbap warzywny': 'Koreańskie roladki ryżowe z warzywami (kimbap)',
    'Kimbap z tuńczykiem': 'Koreańskie roladki ryżowe z tuńczykiem (kimbap)',
    'Kimchi jjigae z wieprzowiną': 'Zupa z kimchi i wieprzowiną (kimchi jjigae)',
    'Kurczak dakgalbi z warzywami': 'Ostry kurczak z warzywami po koreańsku (dakgalbi)',
    'Makaron jajangmyeon w sosie z czarnej fasoli': 'Makaron w sosie z czarnej fasoli (jajangmyeon)',
    'Makaron ramyeon z gochujangiem': 'Koreański ostry makaron instant (ramyeon)',
    'Miodowe ciasteczka yakgwa': 'Koreańskie ciasteczka miodowe (yakgwa)',
    'Napój ryżowy sikhye': 'Koreański słodki napój ryżowy (sikhye)',
    'Pajeon z dymką': 'Koreański placek z dymką (pajeon)',
    'Rosół samgyetang z kurczakiem i żeń-szeniem': 'Koreański rosół z żeń-szeniem (samgyetang)',
    'Sos ssamjang do mięsa': 'Koreański sos do mięsa (ssamjang)',
    'Sundubu jjigae z miękkim tofu': 'Koreańska ostra zupa z miękkim tofu (sundubu)',
    'Tteokbokki z owocami morza': 'Koreańskie kluski ryżowe z owocami morza (tteokbokki)',
    'Tteokbokki z serem': 'Koreańskie kluski ryżowe z serem (tteokbokki)',
    'Zimny makaron bibim guksu': 'Zimny makaron w ostrym sosie (bibim guksu)',
    'Zimny makaron naengmyeon w bulionie': 'Zimny makaron gryczany w bulionie (naengmyeon)',
    'Zupa tteokguk z plackami ryżowymi': 'Zupa z plackami ryżowymi (tteokguk)',
    # tajska / wietnamska
    'Pad see ew z wołowiną': 'Smażony makaron ryżowy z wołowiną (pad see ew)',
    'Som tam': 'Sałatka z zielonej papai (som tam)',
    'Tom kha z kurczakiem': 'Tajska zupa kokosowa z kurczakiem (tom kha)',
    'Banh mi z kurczakiem': 'Wietnamska bagietka z kurczakiem (bánh mì)',
    # międzynarodowa
    'Ceviche z dorsza': 'Dorsz marynowany w limonce (ceviche)',
}

ID_BAZY = {'łatwe': 'latwe', 'średnie': 'srednie', 'trudne': 'trudne'}


def bez_ogonkow(s):
    return s.translate(str.maketrans('ąćęłńóśźżĄĆĘŁŃÓŚŹŻ', 'acelnoszzACELNOSZZ'))


def main():
    dania = json.load(open(TU / 'dane' / 'dania.json'))
    D = collections.OrderedDict()
    for r in dania:
        D.setdefault(r['Danie'], []).append(r)

    wiersze, bledy = [], []
    for stara, rs in sorted(D.items(), key=lambda x: x[0].lower()):
        r = rs[0]
        klucz = stara.strip()
        nowa = NAZWY.get(klucz, re.sub(r'\s+', ' ', klucz).rstrip('*').strip())
        kuchnia = KUCHNIA_POPRAWKI.get(klucz) or KUCHNIA_ZE_STAREJ.get(r['kuchnia'] or '')
        poziom_stary = {'latwe': 'łatwe', 'srednie': 'średnie', 'trudne': 'trudne'}.get(r['poziom'] or '')
        poziom, powod = POZIOM_POPRAWKI.get(klucz, (poziom_stary, None))
        if poziom is None:
            poziom, powod = 'łatwe', 'brak w bazie — proste składanie'
        kroki = len([l for l in (r['Przepis'] or '').split('\n') if l.strip()])
        czas = r['czas_minuty']
        uz = f'{kroki} kroków, {czas or "?"} min'
        if powod:
            uz += f'; {powod}' + (f' (było: {poziom_stary})' if poziom_stary and poziom_stary != poziom else '')
        if kuchnia not in KUCHNIE: bledy.append(f'{stara}: kuchnia {kuchnia!r}')
        if len(nowa) > 55: bledy.append(f'{len(nowa)} znaków: {nowa}')
        wiersze.append([stara, nowa, kuchnia, poziom, uz])

    for k in list(NAZWY) + list(KUCHNIA_POPRAWKI) + list(POZIOM_POPRAWKI):
        if k not in {s.strip() for s in D}: bledy.append(f'klucz nie pasuje do żadnego dania: {k!r}')
    dup = [n for n, c in collections.Counter(w[1].lower() for w in wiersze).items() if c > 1]
    for n in dup: bledy.append(f'DUBEL nowej nazwy: {n}')

    with open(TU / 'dania_meta.csv', 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['danie_stare', 'danie_nowe', 'kuchnia', 'poziom', 'uzasadnienie_poziomu'])
        w.writerows(wiersze)

    zm = sum(1 for w in wiersze if w[0] != w[1])
    print(f'dań: {len(wiersze)}, przemianowanych: {zm} (w tym same białe znaki/literówki: '
          f'{sum(1 for w in wiersze if w[0] != w[1] and w[0].strip() not in NAZWY)})')
    print('kuchnie:', collections.Counter(w[2] for w in wiersze).most_common())
    c = collections.Counter(w[3] for w in wiersze)
    print('poziomy:', {k: f'{v} ({v * 100 // len(wiersze)}%)' for k, v in c.items()})
    for b in bledy: print('BŁĄD', b)


if __name__ == '__main__':
    main()
