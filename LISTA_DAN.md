# Lista dań — Menu Planer

Stan bazy `dania` na 2026-11-14 (883 dań) — nazwa, rodzaj, czas
przyrządzania, kcal na 1 porcję. Do przeglądu przy wymyślaniu nowych dań
(unikanie dubli) i jako punkt odniesienia.

Rozkład: obiad 260, kolacja 135, deser 124, przekaska 104, zupa 87, sniadanie 85, surowka 62, dodatek 26.

Odświeżenie listy: **Actions → „Generuj dania" → tryb `lista`, zaznacz
`zapisz_liste`**. Workflow przepisze ten plik i zacommituje zmianę.
Lokalnie: `ZAPISZ_LISTE=1 npm run lista`.

Ręcznie (Supabase SQL Editor):

```sql
select "Danie" as danie, max(rodzaj) as rodzaj, max(czas_minuty) as czas_min, max(kcal) as kcal
from dania
group by "Danie"
order by "Danie";
```

| danie                                                 | rodzaj    | czas_min | kcal |
| ----------------------------------------------------- | --------- | -------- | ---- |
| Alzacki placek z boczkiem i cebulą (flammekueche)     | kolacja   | 50       | 890  |
| Angielskie śniadanie (English breakfast)              | sniadanie | 30       | 1050 |
| Babka marmurkowa                                      | deser     | 75       | 800  |
| Babka piaskowa                                        | deser     | 75       | 590  |
| Bajgle z serkiem i ogórkiem                           | sniadanie | 10       | 410  |
| Baklava                                               | deser     | 90       | 270  |
| Bakłażan duszony w gochujangu                         | obiad     | 30       | 720  |
| Bakłażan faszerowany mięsem                           | obiad     | 70       | 460  |
| Bakłażan w panko                                      | przekaska | 30       | 550  |
| Bakłażan w pikantnym sosie czosnkowym (yuxiang)       | obiad     | 35       | 930  |
| Banany smażone z miodem i cynamonem                   | deser     | 15       | 350  |
| Banany w cieście naleśnikowym                         | przekaska | 20       | 700  |
| Barszcz biały z białą kiełbasą                        | zupa      | 50       | 710  |
| Barszcz czerwony                                      | zupa      | 90       | 180  |
| Barszcz ukraiński                                     | zupa      | 60       | 370  |
| Barszcz z uszkami                                     | zupa      | 120      | 340  |
| Beza Pavlova z owocami                                | deser     | 100      | 580  |
| Bibimbap z tofu                                       | obiad     | 35       | 660  |
| Bibimbap z wołowiną                                   | obiad     | 40       | 770  |
| Bigos                                                 | obiad     | 180      | 560  |
| Bitki wołowe w sosie własnym                          | obiad     | 90       | 290  |
| Boczek pieczony z ziemniakami                         | obiad     | 130      | 1300 |
| Botwinka z jajkiem                                    | zupa      | 40       | 370  |
| Bretoński placek ze śliwkami (far breton)             | deser     | 60       | 550  |
| Brokuł z masłem i bułką tartą                         | dodatek   | 20       | 320  |
| Brownie czekoladowe                                   | deser     | 45       | 930  |
| Brownie z patelni                                     | deser     | 25       | 980  |
| Bruschetta z mozzarellą i rukolą                      | kolacja   | 15       | 580  |
| Bruschetta z pieczarkami                              | przekaska | 20       | 590  |
| Bruschetta z pomidorami i bazylią                     | przekaska | 15       | 530  |
| Budyń chałwowy                                        | deser     | 20       | 450  |
| Budyń czekoladowy                                     | deser     | 15       | 420  |
| Budyń mango z tapioką                                 | deser     | 25       | 490  |
| Budyń waniliowy z owocami                             | deser     | 20       | 400  |
| Bułeczki bao z nadzieniem wieprzowym                  | przekaska | 150      | 950  |
| Bułeczki cynamonowe                                   | deser     | 150      | 820  |
| Bułeczki jak z Maka                                   | obiad     | 10       | 290  |
| Bułka z sosem mięsnym (sloppy joe)                    | kolacja   | 30       | 520  |
| Bułki śniadaniowe z dyni                              | sniadanie | 120      | 540  |
| Buraczki                                              | surowka   | 60       | 60   |
| Burger wołowy                                         | obiad     | 30       | 1780 |
| Burgery z soczewicy                                   | obiad     | 40       | 910  |
| Burrito śniadaniowe                                   | sniadanie | 20       | 840  |
| Burrito z mieloną wołowiną                            | obiad     | 40       | 650  |
| Calzone z szynką i ricottą                            | obiad     | 45       | 1040 |
| Camembert pieczony z żurawiną                         | przekaska | 25       | 1040 |
| Cannelloni ze szpinakiem i ricottą                    | obiad     | 60       | 810  |
| Carpaccio wołowe z rukolą                             | kolacja   | 20       | 310  |
| Carpaccio z buraka na grzankach                       | przekaska | 25       | 760  |
| Chałka drożdżowa                                      | deser     | 130      | 620  |
| Chałka z masłem i miodem                              | sniadanie | 10       | 530  |
| Chili bez mięsa (chili sin carne)                     | obiad     | 45       | 450  |
| Chilli con carne                                      | obiad     | 60       | 870  |
| Chińska zupa pikantno-kwaśna                          | zupa      | 30       | 290  |
| Chiński makaron z wołowiną (lo mein)                  | obiad     | 30       | 1060 |
| Chipsy z buraka                                       | przekaska | 40       | 210  |
| Chipsy z jarmużu                                      | przekaska | 25       | 200  |
| Chipsy z tortilli w sosie z jajkiem (chilaquiles)     | sniadanie | 25       | 520  |
| Chipsy z tortilli z dipem jogurtowym                  | przekaska | 20       | 640  |
| Chleb pita z jajkiem i hummusem                       | sniadanie | 20       | 410  |
| Chleb w jajku                                         | sniadanie | 10       | 350  |
| Chlebek bananowy (banana bread)                       | deser     | 70       | 730  |
| Chlebek kukurydziany (cornbread)                      | dodatek   | 40       | 560  |
| Chłodnik litewski                                     | zupa      | 20       | 390  |
| Chłodnik ogórkowy z koperkiem                         | zupa      | 15       | 270  |
| Chłodnik z arbuza i fety                              | zupa      | 20       | 240  |
| Chrupiąca ciecierzyca z piekarnika                    | przekaska | 40       | 270  |
| Chrupiące chili w oleju                               | dodatek   | 30       | 420  |
| Chrupiące kąski z kurczaka                            | przekaska | 30       | 540  |
| Churros z czekoladą                                   | deser     | 45       | 690  |
| Ciasteczka owsiane z rodzynkami                       | deser     | 35       | 170  |
| Ciasteczka z wróżbą                                   | deser     | 40       | 360  |
| Ciasto czekoladowe z kubka w mikrofali (mug cake)     | deser     | 5        | 770  |
| Ciasto czekoladowe z wiśniami                         | deser     | 60       | 750  |
| Ciasto czekoladowo-migdałowe (torta caprese)          | deser     | 60       | 860  |
| Ciasto drożdżowe z kruszonką                          | deser     | 120      | 690  |
| Ciasto francuskie z jabłkiem i cynamonem              | deser     | 35       | 660  |
| Ciasto marchewkowe                                    | deser     | 75       | 1050 |
| Ciasto ucierane z owocami                             | deser     | 60       | 620  |
| Ciasto z morelami i migdałami                         | deser     | 70       | 220  |
| Cielęcina w białym sosie (blanquette de veau)         | obiad     | 120      | 650  |
| Cielęcina w sosie tuńczykowym (vitello tonnato)       | kolacja   | 40       | 420  |
| Cielęcina z szynką i szałwią (saltimbocca)            | obiad     | 25       | 580  |
| Coleslaw                                              | surowka   | 15       | 110  |
| Crème brûlée                                          | deser     | 70       | 530  |
| Croissanty z szynką i serem                           | sniadanie | 20       | 450  |
| Cukinia w panierce                                    | przekaska | 25       | 700  |
| Curry z ciecierzycy i szpinaku                        | obiad     | 30       | 1040 |
| Cytrynowy lód kruszony (granita)                      | deser     | 20       | 180  |
| Czebureki z mięsem                                    | obiad     | 60       | 660  |
| Ćwikła z chrzanem                                     | surowka   | 60       | 100  |
| Daktyle z masłem orzechowym                           | przekaska | 10       | 470  |
| Deser lodowy z gorącymi malinami                      | deser     | 15       | 570  |
| Deser z mascarpone, herbatnikami i owocami            | deser     | 20       | 1060 |
| Deska serów i wędlin                                  | przekaska | 20       | 920  |
| Domowe hot dogi z prażoną cebulką                     | kolacja   | 25       | 780  |
| Dorsz marynowany w limonce (ceviche)                  | kolacja   | 30       | 280  |
| Dorsz panierowany                                     | obiad     | 35       | 460  |
| Dorsz w mleku kokosowym po brazylijsku (moqueca)      | obiad     | 40       | 590  |
| Dorsz w sosie cytrynowym                              | obiad     | 30       | 650  |
| Dorsz z piekarnika                                    | obiad     | 35       | 200  |
| Dorsz z ziemniakami i jajkiem (bacalhau à Brás)       | obiad     | 50       | 980  |
| Drożdżówki z budyniem                                 | deser     | 120      | 640  |
| Duszona gicz wołowa z gremolatą (ossobuco)            | obiad     | 150      | 1010 |
| Duszona jagnięcina z warzywami (navarin)              | obiad     | 130      | 710  |
| Duszona papryka po włosku (peperonata)                | dodatek   | 45       | 380  |
| Duszona wołowina z warzywami korzeniowymi             | obiad     | 120      | 630  |
| Duszone żeberka wołowe po koreańsku                   | obiad     | 150      | 1550 |
| Duszony bakłażan po sycylijsku (caponata)             | przekaska | 45       | 400  |
| Duszony kurczak z cytryną po marokańsku (tagine)      | obiad     | 80       | 530  |
| Eklerki z kremem                                      | deser     | 90       | 780  |
| Endywia zapiekana z szynką                            | obiad     | 50       | 580  |
| Eskalopki z pieczarkami (scaloppine)                  | obiad     | 30       | 650  |
| Falafel z sosem tahini                                | kolacja   | 40       | 1000 |
| Farfalle z łososiem i groszkiem                       | obiad     | 25       | 980  |
| Fasolka po bretońsku                                  | obiad     | 120      | 970  |
| Fasolka szparagowa z bułką tartą                      | dodatek   | 20       | 270  |
| Faszerowana pierś kurczaka                            | obiad     | 45       | 310  |
| Faszerowane papryczki serkiem                         | przekaska | 20       | 360  |
| Faszerowany bakłażan po turecku (imam bayıldı)        | obiad     | 80       | 550  |
| Faworki                                               | deser     | 60       | 460  |
| Filet z indyka w sosie grzybowym                      | obiad     | 40       | 490  |
| Flaki                                                 | zupa      | 180      | 360  |
| Focaccia z pomidorkami i oliwkami                     | kolacja   | 110      | 720  |
| Focaccia z rozmarynem i solą morską                   | przekaska | 110      | 510  |
| Francuska kremówka (millefeuille)                     | deser     | 90       | 630  |
| Francuskie babeczki (madeleinki)                      | deser     | 45       | 520  |
| Francuskie bułeczki z czekoladą (pain au chocolat)    | sniadanie | 30       | 510  |
| Frytki z batatów                                      | przekaska | 40       | 350  |
| Frytki z kurczakiem, serem i warzywami (kapsalon)     | obiad     | 45       | 420  |
| Frytki z majonezem gochujang                          | przekaska | 30       | 820  |
| Galaretka z owocami                                   | deser     | 15       | 220  |
| Gazpacho                                              | zupa      | 20       | 290  |
| Gnocchi z gorgonzolą i orzechami                      | obiad     | 25       | 760  |
| Gnocchi z kurczakiem w kremowym sosie (marry me)      | obiad     | 40       | 520  |
| Gnocchi z masłem, czosnkiem i parmezanem              | kolacja   | 20       | 760  |
| Gnocchi z sosem pomidorowym i mozzarellą              | kolacja   | 25       | 820  |
| Gnocchi zapiekane z pomidorami (alla sorrentina)      | obiad     | 30       | 800  |
| Gofrowe kąski                                         | przekaska | 25       | 530  |
| Gofry na słono z serem i szynką                       | sniadanie | 25       | 780  |
| Gofry z owocami i bitą śmietaną                       | deser     | 30       | 890  |
| Gofry z twarogiem                                     | sniadanie | 25       | 550  |
| Golonka pieczona w piwie                              | obiad     | 180      | 1600 |
| Gołąbki w sosie pomidorowym                           | obiad     | 90       | 870  |
| Granola domowa z orzechami                            | sniadanie | 35       | 600  |
| Grecka zapiekanka makaronowa z mięsem (pastitsio)     | obiad     | 95       | 940  |
| Grecka zupa fasolowa (fasolada)                       | zupa      | 70       | 480  |
| Grecki placek ze szpinakiem i fetą (spanakopita)      | kolacja   | 60       | 640  |
| Greckie szaszłyki z kurczaka (souvlaki)               | obiad     | 45       | 500  |
| Grochówka                                             | zupa      | 120      | 910  |
| Gruzińska łódka z serem i jajkiem (chaczapuri)        | kolacja   | 100      | 820  |
| Gryczany naleśnik z jajkiem (galette bretonne)        | kolacja   | 40       | 490  |
| Grzanki czosnkowe z serem                             | przekaska | 15       | 850  |
| Grzanki z awokado, jajkiem i pomidorem                | kolacja   | 15       | 510  |
| Grzanki z pastą z wątróbki (crostini)                 | kolacja   | 25       | 750  |
| Grzanki z serem żółtym i pomidorem                    | sniadanie | 15       | 440  |
| Guacamole                                             | przekaska | 15       | 330  |
| Gulasz domowy (sos mięsny)                            | obiad     | 120      | 460  |
| Gulasz wieprzowy z kluskami                           | obiad     | 90       | 1110 |
| Gulasz z czarnej fasoli i mięsa (feijoada)            | obiad     | 120      | 1190 |
| Gulasz z dyni i ciecierzycy                           | obiad     | 45       | 370  |
| Gulasz z indyka z papryką                             | obiad     | 45       | 480  |
| Gulasz z soczewicy                                    | obiad     | 45       | 490  |
| Gulaszowa                                             | zupa      | 75       | 720  |
| Gyros domowy z sosem czosnkowym                       | obiad     | 60       | 470  |
| Hiszpański chłodnik pomidorowy (salmorejo)            | zupa      | 20       | 560  |
| Hiszpański omlet z ziemniakami (tortilla española)    | kolacja   | 45       | 780  |
| Hummus z pieczonym burakiem                           | przekaska | 50       | 400  |
| Indyjska potrawka z czerwonej soczewicy (dal)         | obiad     | 40       | 480  |
| Indyjski chlebek czosnkowy (naan)                     | dodatek   | 90       | 430  |
| Indyjski sos jogurtowy z ogórkiem (raita)             | dodatek   | 15       | 90   |
| Indyk pieczony z warzywami                            | obiad     | 75       | 700  |
| Indyk w sosie żurawinowym                             | obiad     | 40       | 440  |
| Jabłecznik z kruszonką                                | deser     | 90       | 730  |
| Jabłka pieczone z cynamonem                           | deser     | 40       | 290  |
| Jabłka w cieście                                      | przekaska | 30       | 590  |
| Jaglanka z jabłkiem i cynamonem                       | sniadanie | 25       | 620  |
| Jagodzianki z kruszonką                               | deser     | 150      | 630  |
| Jajecznica                                            | sniadanie | 10       | 340  |
| Jajecznica z boczkiem i szczypiorkiem                 | kolacja   | 15       | 520  |
| Jajka faszerowane                                     | przekaska | 25       | 270  |
| Jajka na miękko                                       | sniadanie | 7        | 160  |
| Jajka na twardo z majonezem                           | sniadanie | 15       | 260  |
| Jajka po benedyktyńsku                                | sniadanie | 30       | 990  |
| Jajka po florencku                                    | sniadanie | 30       | 520  |
| Jajka po meksykańsku (huevos rancheros)               | sniadanie | 25       | 860  |
| Jajka po turecku                                      | sniadanie | 15       | 620  |
| Jajka przepiórcze w panierce                          | przekaska | 30       | 540  |
| Jajka sadzone na szpinaku                             | sniadanie | 20       | 400  |
| Jajka sadzone z boczkiem                              | sniadanie | 10       | 440  |
| Jajka sadzone z ziemniakami z patelni i mizerią       | kolacja   | 30       | 870  |
| Jajka smażone z pomidorami po chińsku                 | kolacja   | 15       | 550  |
| Jajka w chmurce                                       | sniadanie | 20       | 310  |
| Jajka w koszulce na grzance                           | sniadanie | 15       | 460  |
| Jajka w majonezie ze szczypiorkiem                    | przekaska | 15       | 380  |
| Jajka w sosie chrzanowym                              | sniadanie | 25       | 430  |
| Jajka z papryką                                       | obiad     | 15       | 160  |
| Jajka zapiekane w awokado                             | sniadanie | 25       | 480  |
| Japoński kotlet schabowy (tonkatsu)                   | obiad     | 35       | 650  |
| Japoński placek z kapustą (okonomiyaki)               | kolacja   | 35       | 640  |
| Japoński zwijany omlet (tamagoyaki)                   | sniadanie | 15       | 210  |
| Jarzynowa                                             | zupa      | 45       | 290  |
| Jogurt grecki z miodem i orzechami                    | deser     | 5        | 520  |
| Jogurt z pieczoną gruszką i orzechami                 | sniadanie | 35       | 490  |
| Kaczka pieczona z jabłkami                            | obiad     | 150      | 1400 |
| Kaczka po pekińsku                                    | obiad     | 150      | 850  |
| Kalafior marynowany z oliwkami                        | surowka   | 20       | 230  |
| Kalafior pieczony w całości                           | dodatek   | 70       | 390  |
| Kalafiorowa                                           | zupa      | 40       | 400  |
| Kalmary w sosie gochujang                             | obiad     | 25       | 760  |
| Kanapka z peklowaną wołowiną (Reuben sandwich)        | kolacja   | 20       | 710  |
| Kanapka z pieczoną wieprzowiną (panino con porchetta) | kolacja   | 15       | 860  |
| Kanapka z wołowiną i serem (Philly cheesesteak)       | kolacja   | 30       | 720  |
| Kanapki na ciepło z mozzarellą, pomidorem i szynką    | kolacja   | 15       | 610  |
| Kanapki z jajkiem                                     | sniadanie | 15       | 510  |
| Kanapki z łososiem i twarożkiem                       | kolacja   | 10       | 410  |
| Kanapki z pastą z ciecierzycy                         | kolacja   | 15       | 540  |
| Kanapki z pastą z pieczonej papryki                   | sniadanie | 20       | 480  |
| Kanapki z pastą z tuńczyka                            | sniadanie | 10       | 400  |
| Kanapki z pasztetem i ogórkiem kiszonym               | sniadanie | 10       | 560  |
| Kanapki z serem i wędliną                             | sniadanie | 10       | 440  |
| Kanapki z serem pleśniowym i gruszką                  | kolacja   | 15       | 480  |
| Kanapki z twarogiem i miodem                          | sniadanie | 5        | 430  |
| Kanapki zapiekane z pieczarkami                       | kolacja   | 25       | 450  |
| Kapusta zasmażana                                     | dodatek   | 40       | 240  |
| Kapuśniak                                             | zupa      | 90       | 530  |
| Karczochy smażone                                     | przekaska | 20       | 190  |
| Karkówka pieczona w piekarniku                        | obiad     | 110      | 700  |
| Karp pieczony w śmietanie                             | obiad     | 70       | 660  |
| Karpatka                                              | deser     | 90       | 810  |
| Kasza bulgur z kurczakiem, papryką i sosem jogurtowym | kolacja   | 30       | 710  |
| Kasza gryczana z grzybami                             | obiad     | 40       | 510  |
| Kasza manna na mleku                                  | sniadanie | 12       | 350  |
| Kasza manna z sokiem malinowym                        | deser     | 15       | 440  |
| Kaszanka pieczona z jabłkami                          | obiad     | 45       | 1050 |
| Kaszka kukurydziana z owocami                         | sniadanie | 15       | 510  |
| Kataloński krem z karmelem (crema catalana)           | deser     | 40       | 280  |
| Kiełki sojowe z sezamem                               | surowka   | 15       | 160  |
| Kisiel owocowy                                        | deser     | 20       | 210  |
| Klopsiki szwedzkie w sosie śmietanowym                | obiad     | 45       | 950  |
| Klopsiki w sosie pomidorowym                          | obiad     | 45       | 720  |
| Kluski kładzione                                      | dodatek   | 25       | 340  |
| Kluski lane na mleku                                  | sniadanie | 15       | 460  |
| Kluski śląskie                                        | obiad     | 90       | 410  |
| Kluski z makiem                                       | deser     | 30       | 840  |
| Kluski z parmezanem w bulionie (passatelli)           | zupa      | 30       | 430  |
| Kluski z serem i cebulką (Käsespätzle)                | obiad     | 50       | 810  |
| Kluski z serem i skwarkami                            | obiad     | 25       | 530  |
| Knedle ze śliwkami                                    | deser     | 60       | 720  |
| Koktajl bananowo-truskawkowy                          | deser     | 10       | 390  |
| Koktajl owocowy z jogurtem                            | deser     | 10       | 380  |
| Kołaczki z serem                                      | deser     | 100      | 600  |
| Konfitowane udka kacze (confit de canard)             | obiad     | 180      | 840  |
| Kopytka z cebulką                                     | obiad     | 60       | 550  |
| Kopytka z sosem grzybowym                             | obiad     | 60       | 800  |
| Koreańska ostra zupa z cukinią (gochujang jjigae)     | zupa      | 25       | 600  |
| Koreańska ostra zupa z miękkim tofu (sundubu)         | zupa      | 30       | 640  |
| Koreańska owsianka ryżowa z kurczakiem                | sniadanie | 50       | 440  |
| Koreańska zupa z wodorostów                           | zupa      | 25       | 230  |
| Koreański deser z kruszonym lodem (patbingsu)         | deser     | 20       | 610  |
| Koreański gulasz z kurczaka i ziemniaków              | obiad     | 50       | 640  |
| Koreański gulasz z parówkami i tofu (budae jjigae)    | kolacja   | 30       | 1020 |
| Koreański makaron sojowy z wołowiną (japchae)         | obiad     | 35       | 760  |
| Koreański omlet parowany                              | sniadanie | 20       | 190  |
| Koreański ostry makaron instant (ramyeon)             | kolacja   | 15       | 750  |
| Koreański placek z dymką (pajeon)                     | przekaska | 25       | 660  |
| Koreański rosół z żeń-szeniem (samgyetang)            | zupa      | 90       | 1050 |
| Koreański słodki napój ryżowy (sikhye)                | deser     | 300      | 350  |
| Koreański sos do mięsa (ssamjang)                     | dodatek   | 10       | 130  |
| Koreańskie ciasteczka miodowe (yakgwa)                | deser     | 60       | 650  |
| Koreańskie kluski ryżowe z owocami morza (tteokbokki) | obiad     | 25       | 630  |
| Koreańskie kluski ryżowe z serem (tteokbokki)         | obiad     | 25       | 760  |
| Koreańskie kluski sujebi w bulionie                   | zupa      | 40       | 530  |
| Koreańskie placki z cynamonem (hotteok)               | deser     | 90       | 730  |
| Koreańskie roladki ryżowe z tuńczykiem (kimbap)       | przekaska | 30       | 730  |
| Koreańskie roladki ryżowe z warzywami (kimbap)        | przekaska | 35       | 560  |
| Koreańskie wafle z pastą z fasoli (bungeoppang)       | deser     | 40       | 520  |
| Koreczki                                              | przekaska | 15       | 290  |
| Kotlet cielęcy po mediolańsku (cotoletta)             | obiad     | 30       | 1020 |
| Kotlet de volaille                                    | obiad     | 40       | 710  |
| Kotlet schabowy                                       | obiad     | 45       | 530  |
| Kotlet z indyka z serem                               | obiad     | 35       | 690  |
| Kotlety jajeczne                                      | obiad     | 35       | 550  |
| Kotlety mielone                                       | obiad     | 40       | 500  |
| Kotlety z ciecierzycy                                 | obiad     | 30       | 700  |
| Kotlety z kaszy gryczanej                             | obiad     | 40       | 810  |
| Kotlety z kaszy jaglanej                              | obiad     | 45       | 560  |
| Krakersy z serkiem i ogórkiem                         | przekaska | 10       | 280  |
| Krążki cebulowe                                       | przekaska | 30       | 710  |
| Krążki kalmarów smażone                               | przekaska | 25       | 710  |
| Krem budyniowy z bananami                             | deser     | 20       | 480  |
| Krem karmelowy (flan)                                 | deser     | 80       | 440  |
| Krem z cukinii z miętą                                | zupa      | 30       | 400  |
| Krem z kalafiora z migdałami                          | zupa      | 35       | 590  |
| Krem z karczochów                                     | zupa      | 30       | 570  |
| Krem z mascarpone i kajmaku                           | deser     | 15       | 1010 |
| Krem z pieczonej papryki                              | zupa      | 50       | 390  |
| Krem z pietruszki                                     | zupa      | 40       | 490  |
| Krem z pora i ziemniaków (vichyssoise)                | zupa      | 45       | 620  |
| Krem z selera z chipsami z boczku                     | zupa      | 45       | 640  |
| Krem z zielonego groszku z miętą                      | zupa      | 25       | 570  |
| Krem z żółtek i wina (zabaglione)                     | deser     | 15       | 380  |
| Krem ze szparagów                                     | zupa      | 30       | 370  |
| Kremówka                                              | deser     | 60       | 790  |
| Krewetki smażone z czosnkiem                          | przekaska | 15       | 380  |
| Krewetki w sosie chili po chińsku                     | obiad     | 25       | 640  |
| Krewetki w sosie czosnkowym z makaronem               | obiad     | 25       | 890  |
| Krokiety z kapustą kiszoną i grzybami                 | obiad     | 90       | 380  |
| Krokiety z mięsem                                     | obiad     | 60       | 1150 |
| Krokiety z pieczarkami                                | kolacja   | 60       | 900  |
| Krokiety ze szpinakiem i serem                        | kolacja   | 60       | 790  |
| Krokiety ziemniaczane z serem                         | kolacja   | 50       | 1060 |
| Kruche ciasto z dżemem morelowym (crostata)           | deser     | 75       | 590  |
| Krupnik                                               | zupa      | 60       | 600  |
| Kulki kokosowe                                        | przekaska | 20       | 810  |
| Kulki mocy z płatków owsianych                        | przekaska | 20       | 470  |
| Kulki mozzarelli w szynce parmeńskiej                 | przekaska | 15       | 400  |
| Kulki owsiane z masłem orzechowym i miodem            | deser     | 20       | 360  |
| Kulki serowe w panierce                               | przekaska | 30       | 890  |
| Kurczak curry z ryżem                                 | kolacja   | 35       | 810  |
| Kurczak generała Tso                                  | obiad     | 40       | 930  |
| Kurczak pieczony w całości                            | obiad     | 100      | 1270 |
| Kurczak pieczony z cytryną i czosnkiem                | obiad     | 70       | 1170 |
| Kurczak po baskijsku (poulet basquaise)               | obiad     | 65       | 620  |
| Kurczak po chińsku                                    | obiad     | 50       | 400  |
| Kurczak po koreańsku                                  | obiad     | -        | 1090 |
| Kurczak po myśliwsku (pollo alla cacciatora)          | obiad     | 60       | 720  |
| Kurczak tikka masala                                  | obiad     | 45       | 740  |
| Kurczak w czerwonym winie (coq au vin)                | obiad     | 110      | 720  |
| Kurczak w maślanym sosie (butter chicken)             | obiad     | 40       | 1340 |
| Kurczak w panko                                       | przekaska | 30       | 590  |
| Kurczak w panko z sosem curry (katsu curry)           | obiad     | 50       | 1130 |
| Kurczak w sosie cytrynowym (piccata)                  | obiad     | 30       | 570  |
| Kurczak w sosie koperkowym                            | obiad     | 40       | 410  |
| Kurczak w sosie orzechowym                            | obiad     | 35       | 760  |
| Kurczak w sosie słodko-kwaśnym                        | obiad     | 35       | 730  |
| Kurczak w sosie sojowo-czosnkowym po koreańsku        | obiad     | 30       | 1130 |
| Kurczak z czosnkiem po hiszpańsku (pollo al ajillo)   | obiad     | 40       | 640  |
| Kurczak z imbirem i dymką                             | obiad     | 25       | 680  |
| Kurczak z orzeszkami po syczuańsku (gong bao)         | obiad     | 30       | 1010 |
| Kuskus z kurczakiem i warzywami                       | kolacja   | 30       | 800  |
| Kwaśnica                                              | zupa      | 90       | 640  |
| Lasagne Bolognese                                     | obiad     | 90       | 1130 |
| Lasagne warzywna                                      | obiad     | 70       | 840  |
| Lasagne ze szpinakiem i ricottą                       | obiad     | 80       | 790  |
| Leczo                                                 | obiad     | 40       | 510  |
| Lody domowe waniliowe                                 | deser     | 240      | 500  |
| Lody pistacjowe (gelato)                              | deser     | 40       | 670  |
| Lody z jogurtu i owoców                               | deser     | 240      | 310  |
| Lody zalane espresso (affogato)                       | deser     | 5        | 310  |
| Łazanki z kapustą i boczkiem                          | obiad     | 45       | 850  |
| Łosoś pieczony z koperkiem                            | obiad     | 30       | 720  |
| Łosoś w sosie teriyaki                                | obiad     | 30       | 660  |
| Makaron na zimno z pomidorkami i mozzarellą           | kolacja   | 20       | 680  |
| Makaron w sosie serowo-maślanym (fettuccine Alfredo)  | obiad     | 20       | 1140 |
| Makaron w sosie z czarnej fasoli (jajangmyeon)        | obiad     | 35       | 1380 |
| Makaron z bakłażanem i ricottą (pasta alla norma)     | obiad     | 40       | 860  |
| Makaron z boczkiem i pecorino (alla gricia)           | obiad     | 25       | 980  |
| Makaron z boczkiem i pomidorami (all'amatriciana)     | obiad     | 30       | 930  |
| Makaron z brokułami i czosnkiem                       | kolacja   | 25       | 760  |
| Makaron z dynią i szałwią                             | obiad     | 40       | 730  |
| Makaron z grzybami po leśnemu (alla boscaiola)        | obiad     | 35       | 810  |
| Makaron z kiełbasą, cebulą i passatą                  | kolacja   | 25       | 970  |
| Makaron z kiełbaską i sosem pieczarkowym              | obiad     | 25       | 870  |
| Makaron z kurczakiem w sosie pomidorowym              | obiad     | 30       | 500  |
| Makaron z kurczakiem, brokułem i sosem śmietanowym    | kolacja   | 25       | 1080 |
| Makaron z łososiem i szpinakiem                       | obiad     | 25       | 1020 |
| Makaron z pesto i oliwkami                            | obiad     | 20       | 600  |
| Makaron z pesto, kurczakiem i pomidorkami             | kolacja   | 25       | 840  |
| Makaron z pomidorami, czosnkiem i parmezanem          | kolacja   | 20       | 760  |
| Makaron z serem (mac and cheese)                      | obiad     | 40       | 940  |
| Makaron z serem, boczkiem i cebulką                   | kolacja   | 25       | 980  |
| Makaron z truskawkami                                 | deser     | 20       | 570  |
| Makaron z tuńczykiem i kaparami                       | obiad     | 25       | 550  |
| Makaron z warzywami w sosie serowym                   | obiad     | 30       | 500  |
| Makaron zapiekany z czterema serami                   | obiad     | 40       | 1110 |
| Makowiec rolowany                                     | deser     | 120      | 940  |
| Marchewka z groszkiem                                 | dodatek   | 25       | 240  |
| Marchewka z sezamem po koreańsku                      | surowka   | 15       | 130  |
| Marokańska sałatka z bakłażana (zaalouk)              | surowka   | 45       | 400  |
| Marokańska zupa z soczewicy i ciecierzycy (harira)    | zupa      | 60       | 430  |
| Marynata gochujang do wieprzowiny                     | dodatek   | 10       | 130  |
| Marynowana kapusta pekińska po chińsku                | surowka   | 20       | 150  |
| Marynowana pieczeń wołowa (Sauerbraten)               | obiad     | 180      | 420  |
| Marynowana rzodkiew do kimbapu                        | dodatek   | 15       | 80   |
| Marynowana wołowina po koreańsku (bulgogi)            | obiad     | 40       | 830  |
| Marynowane grzyby po włosku                           | surowka   | 25       | 310  |
| Mazurek z masą krówkową                               | deser     | 90       | 650  |
| Meksykańska zupa z tortillą (sopa de tortilla)        | zupa      | 40       | 620  |
| Migdałowe ciasteczka (amaretti)                       | deser     | 40       | 500  |
| Migdały prażone z papryką                             | przekaska | 15       | 710  |
| Minestrone                                            | zupa      | 45       | 500  |
| Mini burgery                                          | przekaska | 40       | 1430 |
| Mini hot dogi                                         | przekaska | 25       | 350  |
| Mini mozzarella w oliwie z ziołami (bocconcini)       | przekaska | 10       | 690  |
| Mini muffinki bananowe                                | przekaska | 30       | 460  |
| Mini muffinki wytrawne                                | przekaska | 35       | 710  |
| Mini placuszki z owocami (pancakes)                   | przekaska | 25       | 550  |
| Mini rogaliki z ciasta francuskiego i czekolady       | deser     | 25       | 530  |
| Mini szaszłyki z kurczaka                             | przekaska | 35       | 310  |
| Mini tortille                                         | przekaska | 20       | 690  |
| Mini zapiekanki z pieczarkami                         | przekaska | 25       | 700  |
| Mizeria                                               | surowka   | 15       | 90   |
| Modra kapusta na ciepło                               | dodatek   | 45       | 250  |
| Moussaka z bakłażanem                                 | obiad     | 80       | 1160 |
| Muffinki jagodowe                                     | deser     | 40       | 640  |
| Mule w białym winie (moules marinière)                | obiad     | 30       | 550  |
| Mus czekoladowy (mousse au chocolat)                  | deser     | 30       | 470  |
| Mus czekoladowy z banana i kakao                      | deser     | 10       | 170  |
| Mus jabłkowy z cynamonem                              | deser     | 30       | 320  |
| Musli z jogurtem i owocami                            | sniadanie | 10       | 510  |
| Nachos z guacamole i salsą                            | przekaska | 20       | 950  |
| Nachosy z sosem serowym                               | przekaska | 15       | 1010 |
| Naleśniki gryczane z twarogiem                        | sniadanie | 30       | 730  |
| Naleśniki w sosie pomarańczowym (crêpes Suzette)      | sniadanie | 30       | 800  |
| Naleśniki wytrawne z serem i szynką                   | kolacja   | 30       | 820  |
| Naleśniki z boczkiem                                  | sniadanie | 25       | 870  |
| Naleśniki z dżemem                                    | sniadanie | 25       | 640  |
| Naleśniki z dżemem i bitą śmietaną                    | deser     | 30       | 860  |
| Naleśniki z mięsem zapiekane                          | obiad     | 60       | 1190 |
| Naleśniki z pieczarkami i serem                       | kolacja   | 40       | 830  |
| Naleśniki z serem na słodko                           | deser     | 40       | 530  |
| Naleśniki zapiekane z szynką i beszamelem (crespelle) | kolacja   | 50       | 870  |
| Naleśniki ze szpinakiem i fetą                        | kolacja   | 30       | 690  |
| Neapolitańskie ciasto wielkanocne (pastiera)          | deser     | 120      | 870  |
| Nuggetsy domowe                                       | przekaska | 30       | 490  |
| Odwrócona tarta z jabłkami (tarte tatin)              | deser     | 70       | 760  |
| Ogórkowa                                              | zupa      | 60       | 470  |
| Oliwki nadziewane mięsem w panierce                   | przekaska | 40       | 670  |
| Omlet                                                 | sniadanie | 10       | 360  |
| Omlet biszkoptowy z dżemem                            | sniadanie | 15       | 390  |
| Omlet z cukinią i miętą                               | sniadanie | 20       | 380  |
| Omlet z pieczarkami i cebulą                          | sniadanie | 15       | 400  |
| Omlet z pomidorami i serem feta                       | sniadanie | 20       | 410  |
| Omlet z serem, szynką i warzywami                     | kolacja   | 15       | 530  |
| Omlet ze szpinakiem i fetą                            | sniadanie | 15       | 500  |
| Orecchiette z brokułami i anchois                     | obiad     | 25       | 800  |
| Orzeszki w miodzie i chili                            | przekaska | 20       | 670  |
| Ostry kurczak z pieca (pollo alla diavola)            | obiad     | 50       | 580  |
| Ostry kurczak z warzywami po koreańsku (dakgalbi)     | obiad     | 35       | 730  |
| Owocowa sałatka z miętą                               | deser     | 15       | 220  |
| Owsianka                                              | sniadanie | 10       | 560  |
| Owsianka kakaowa z bananem                            | deser     | 10       | 520  |
| Owsianka nocna                                        | sniadanie | 480      | 450  |
| Owsianka nocna z malinami i kokosem                   | sniadanie | 15       | 450  |
| Owsianka z jabłkiem i orzechami                       | sniadanie | 15       | 570  |
| Pad thai z kurczakiem                                 | obiad     | 30       | 780  |
| Paella z kurczakiem i owocami morza                   | obiad     | 60       | 680  |
| Paluszki chlebowe z szynką parmeńską (grissini)       | przekaska | 45       | 520  |
| Paluszki serowe z sezamem                             | przekaska | 35       | 520  |
| Paluszki z ciasta francuskiego z szynką               | przekaska | 25       | 630  |
| Paluszki z mozzarelli w panierce (mozzarella sticks)  | przekaska | 30       | 790  |
| Panettone                                             | deser     | 180      | 650  |
| Panierowana pierś kurczaka                            | obiad     | 40       | 250  |
| Panini z kurczakiem, serem i sosem BBQ                | kolacja   | 20       | 770  |
| Panini z mozzarellą i pomidorem                       | kolacja   | 15       | 640  |
| Panna cotta kawowa                                    | deser     | 30       | 520  |
| Panna cotta z owocami                                 | deser     | 240      | 640  |
| Pappardelle z ragù wołowym                            | obiad     | 150      | 1020 |
| Paprykarz z kurczaka po węgiersku                     | obiad     | 55       | 680  |
| Parmezan z miodem i orzechami                         | przekaska | 10       | 490  |
| Parówki                                               | sniadanie | 8        | 410  |
| Parówki w cieście francuskim                          | przekaska | 25       | 570  |
| Pasta jajeczna                                        | sniadanie | 15       | 360  |
| Pasta z awokado i jajka                               | sniadanie | 10       | 310  |
| Pasta z dorsza i ziemniaków (brandade de morue)       | obiad     | 60       | 660  |
| Pasta z makreli wędzonej                              | sniadanie | 10       | 520  |
| Pasta z pieczonego bakłażana                          | przekaska | 50       | 240  |
| Pasztet drobiowy pieczony                             | kolacja   | 110      | 580  |
| Pączki domowe                                         | deser     | 150      | 520  |
| Penne w ostrym sosie pomidorowym (all'arrabbiata)     | obiad     | 25       | 720  |
| Pho bo                                                | zupa      | 150      | 730  |
| Pieczarki faszerowane kaszą                           | kolacja   | 45       | 420  |
| Pieczarkowa                                           | zupa      | 40       | 420  |
| Pieczeń rzymska                                       | obiad     | 75       | 880  |
| Pieczeń wieprzowa w sosie własnym                     | obiad     | 120      | 640  |
| Pieczona owsianka                                     | sniadanie | 45       | 660  |
| Pieczone bataty z dipem                               | przekaska | 40       | 450  |
| Pieczone bataty z guacamole                           | kolacja   | 50       | 490  |
| Pieczone jajka z chorizo                              | sniadanie | 30       | 520  |
| Pieczone pieczarki z serem                            | przekaska | 30       | 370  |
| Pieczone pierożki z mięsem (empanadas)                | kolacja   | 70       | 910  |
| Pieczone udka kurczaka                                | obiad     | 70       | 420  |
| Pieczone warzywa z fetą i ziołami                     | dodatek   | 50       | 490  |
| Pieczone ziemniaczki z dipem                          | przekaska | 45       | 690  |
| Pieczony pieróg z mozzarellą (panzerotto)             | kolacja   | 90       | 640  |
| Pieczony pstrąg z ziołami                             | obiad     | 40       | 380  |
| Pierniki miodowe                                      | deser     | 60       | 510  |
| Pierogi leniwe                                        | obiad     | 30       | 740  |
| Pierogi ruskie                                        | obiad     | 90       | 640  |
| Pierogi z kapustą i grzybami                          | obiad     | 90       | 750  |
| Pierogi z kaszą gryczaną i twarogiem                  | obiad     | 80       | 870  |
| Pierogi z mięsem                                      | obiad     | 120      | 590  |
| Pierogi z soczewicą i szpinakiem                      | obiad     | 80       | 630  |
| Pierogi z truskawkami                                 | deser     | 70       | 460  |
| Pierożki dim sum na parze                             | przekaska | 60       | 670  |
| Pierożki jiaozi z wieprzowiną                         | przekaska | 70       | 920  |
| Pierożki mandu z warzywami                            | przekaska | 45       | 510  |
| Pierś kaczki z sosem wiśniowym                        | obiad     | 50       | 530  |
| Pikantna wieprzowina po koreańsku (bulgogi)           | obiad     | 35       | 950  |
| Pilaw z marchewką                                     | dodatek   | 35       | 480  |
| Pistacjowy deser lodowy (semifreddo)                  | deser     | 25       | 660  |
| Pizza bianca z rozmarynem                             | kolacja   | 90       | 1100 |
| Pizza domowa                                          | obiad     | 120      | 790  |
| Pizza margherita                                      | obiad     | 90       | 1030 |
| Pizza na tortilli                                     | kolacja   | 20       | 530  |
| Pizza quattro formaggi                                | obiad     | 100      | 800  |
| Pizza z salami i oliwkami                             | obiad     | 100      | 810  |
| Pizzerinki                                            | przekaska | 25       | 780  |
| Placek drożdżowy ze śliwkami                          | deser     | 120      | 670  |
| Placek po węgiersku                                   | obiad     | 60       | 1320 |
| Placek z mąki z ciecierzycy (farinata)                | kolacja   | 50       | 530  |
| Placek z rabarbarem i bezą                            | deser     | 75       | 630  |
| Placki bananowe z „chrupką”                           | sniadanie | 20       | 590  |
| Placki bananowe z jogurtem i owocami                  | deser     | 20       | 570  |
| Placki jaglane z jabłkiem                             | sniadanie | 35       | 450  |
| Placki owsiane z jogurtem                             | sniadanie | 20       | 560  |
| Placki z batata                                       | sniadanie | 30       | 630  |
| Placki z cukinii po koreańsku                         | przekaska | 25       | 590  |
| Placki z cukinii z sosem jogurtowym                   | kolacja   | 30       | 530  |
| Placki z dymką po chińsku                             | kolacja   | 35       | 800  |
| Placki z kalafiora                                    | kolacja   | 35       | 570  |
| Placki z kaszy gryczanej i cukinii                    | kolacja   | 40       | 610  |
| Placki z kaszy jaglanej                               | kolacja   | 35       | 720  |
| Placki z ricottą                                      | sniadanie | 25       | 580  |
| Placki ziemniaczane mini                              | przekaska | 30       | 660  |
| Placki ziemniaczane z sosem czosnkowym                | kolacja   | 40       | 1020 |
| Placki ziemniaczane ze śmietaną                       | obiad     | 45       | 1040 |
| Placuszki amerykańskie z syropem (pancakes)           | sniadanie | 25       | 780  |
| Placuszki twarogowe                                   | deser     | 25       | 530  |
| Placuszki z cukinii po włosku                         | przekaska | 30       | 560  |
| Płatki z mlekiem                                      | sniadanie | 3        | 320  |
| Podudzia w marynacie ziołowej                         | obiad     | 70       | 940  |
| Polenta z gorgonzolą                                  | kolacja   | 25       | 680  |
| Polędwiczka wieprzowa z kurkami                       | obiad     | 50       | 410  |
| Pomidorki faszerowane ricottą                         | przekaska | 20       | 230  |
| Pomidorówka                                           | zupa      | 40       | 380  |
| Popcorn karmelowy                                     | przekaska | 20       | 760  |
| Portugalskie babeczki budyniowe (pastéis de nata)     | deser     | 70       | 680  |
| Potrawka z kurczaka                                   | obiad     | 60       | 480  |
| Prażona kukurydza z masłem                            | przekaska | 10       | 450  |
| Prażone pestki dyni z solą                            | przekaska | 15       | 280  |
| Prowansalska zupa rybna (bouillabaisse)               | zupa      | 90       | 450  |
| Prowansalska zupa warzywna z pesto (pistou)           | zupa      | 50       | 680  |
| Prowansalski placek z cebulą i anchois (pissaladière) | kolacja   | 90       | 720  |
| Pstrąg pieczony z masłem czosnkowym                   | obiad     | 40       | 900  |
| Ptasie mleczko domowe                                 | deser     | 40       | 480  |
| Pudding z nasion chia z mango                         | deser     | 240      | 720  |
| Pulpety w sosie koperkowym                            | obiad     | 60       | 400  |
| Pyzy z mięsem                                         | obiad     | 90       | 920  |
| Quesadilla z serem i fasolą                           | kolacja   | 15       | 1010 |
| Quesadilla z serem i kurczakiem                       | przekaska | 20       | 1000 |
| Quesadilla z szarpaną wieprzowiną                     | obiad     | 180      | 820  |
| Racuchy z jabłkami                                    | deser     | 30       | 810  |
| Ramen tonkotsu z boczkiem                             | zupa      | 90       | 900  |
| Ratatouille                                           | obiad     | 55       | 400  |
| Ravioli z ricottą i szpinakiem                        | obiad     | 60       | 780  |
| Ricotta z miodem i orzechami na grzance               | sniadanie | 10       | 560  |
| Rigatoni z wołowiną duszoną z cebulą (alla genovese)  | obiad     | 180      | 1070 |
| Risotto z cytryną i parmezanem                        | obiad     | 40       | 640  |
| Risotto z dynią i szałwią                             | obiad     | 40       | 750  |
| Risotto z groszkiem i miętą                           | obiad     | 40       | 620  |
| Risotto z grzybami leśnymi                            | obiad     | 40       | 790  |
| Risotto z owocami morza                               | obiad     | 35       | 800  |
| Risotto z szafranem (alla milanese)                   | obiad     | 35       | 790  |
| Risotto z warzywami                                   | obiad     | 40       | 340  |
| Rogale świętomarcińskie                               | deser     | 180      | 1110 |
| Rogaliki z marmoladą                                  | deser     | 90       | 730  |
| Rolada biszkoptowa z dżemem                           | deser     | 40       | 370  |
| Rolada z kurczaka ze szpinakiem                       | obiad     | 60       | 580  |
| Roladki cielęce w sosie pomidorowym (involtini)       | obiad     | 60       | 510  |
| Roladki drobiowe ze szpinakiem                        | obiad     | 40       | 510  |
| Roladki z bakłażana z ricottą                         | przekaska | 35       | 380  |
| Roladki z cukinii z serkiem                           | przekaska | 30       | 380  |
| Roladki z szynki i serka                              | przekaska | 15       | 300  |
| Roladki z tortilli ze szpinakiem                      | przekaska | 20       | 580  |
| Roladki z włoskiego placka z mortadelą (piadina)      | przekaska | 15       | 740  |
| Rolowany omlet koreański z warzywami                  | sniadanie | 20       | 390  |
| Rosół                                                 | zupa      | 150      | 590  |
| Ryba po grecku                                        | obiad     | 60       | 240  |
| Ryba w sosie musztardowym                             | obiad     | 30       | 570  |
| Ryba z frytkami (fish and chips)                      | obiad     | 50       | 980  |
| Ryż do sushi                                          | dodatek   | -        | 180  |
| Ryż jaśminowy na parze                                | dodatek   | 25       | 230  |
| Ryż na mleku z cynamonem i jabłkiem                   | deser     | 30       | 510  |
| Ryż smażony po kantońsku                              | kolacja   | 20       | 730  |
| Ryż smażony z jajkiem, kurczakiem i warzywami         | kolacja   | 25       | 670  |
| Ryż smażony z krewetkami                              | obiad     | 25       | 630  |
| Ryż z jajkiem i masłem po koreańsku                   | sniadanie | 15       | 700  |
| Ryż z kiełbasą po kreolsku (jambalaya)                | obiad     | 50       | 680  |
| Ryż z kurczakiem i jajkiem po japońsku (oyakodon)     | obiad     | 25       | 720  |
| Ryż z kurczakiem po indyjsku (biryani)                | obiad     | 80       | 900  |
| Ryż z warzywami stir-fry                              | kolacja   | 25       | 570  |
| Ryż z warzywami w sosie curry                         | kolacja   | 30       | 740  |
| Rzymska bułeczka z bitą śmietaną (maritozzo)          | deser     | 150      | 910  |
| Rzymska zupa z jajkiem i parmezanem (stracciatella)   | zupa      | 15       | 210  |
| Sajgonki (spring rolls)                               | przekaska | 45       | 330  |
| Sałatka caprese                                       | kolacja   | 10       | 610  |
| Sałatka cezar z kurczakiem                            | kolacja   | 25       | 710  |
| Sałatka Cobb                                          | kolacja   | 30       | 670  |
| Sałatka grecka z fetą                                 | kolacja   | 15       | 610  |
| Sałatka gyros                                         | przekaska | 30       | 590  |
| Sałatka jarzynowa                                     | kolacja   | 50       | 440  |
| Sałatka lyońska z boczkiem i jajkiem                  | kolacja   | 25       | 630  |
| Sałatka makaronowa z kurczakiem i kukurydzą           | kolacja   | 25       | 770  |
| Sałatka nicejska                                      | kolacja   | 25       | 420  |
| Sałatka ryżowa po włosku                              | kolacja   | 25       | 710  |
| Sałatka z arbuzem i fetą                              | kolacja   | 15       | 420  |
| Sałatka z awokado i pomidorkami                       | surowka   | 10       | 410  |
| Sałatka z bobem, pecorino i miętą                     | kolacja   | 25       | 430  |
| Sałatka z brokułem i jajkiem                          | surowka   | 25       | 250  |
| Sałatka z bulguru i natki pietruszki (tabbouleh)      | surowka   | 30       | 300  |
| Sałatka z buraka i jabłka                             | surowka   | 60       | 90   |
| Sałatka z burakiem, kozim serem i orzechami           | kolacja   | 15       | 560  |
| Sałatka z chrupiącą pitą (fattoush)                   | surowka   | 25       | 270  |
| Sałatka z ciecierzycy i kolendry                      | surowka   | 20       | 350  |
| Sałatka z ciepłym kozim serem (chèvre chaud)          | kolacja   | 20       | 600  |
| Sałatka z cukinii grillowanej z miętą                 | surowka   | 20       | 240  |
| Sałatka z fasolą i tuńczykiem                         | kolacja   | 15       | 510  |
| Sałatka z fasolki szparagowej                         | surowka   | 25       | 280  |
| Sałatka z gruszką, gorgonzolą i orzechami             | kolacja   | 15       | 470  |
| Sałatka z jajkiem, bekonem i grzankami                | kolacja   | 20       | 730  |
| Sałatka z kapusty pekińskiej i kukurydzy              | surowka   | 15       | 260  |
| Sałatka z karczochami marynowanymi                    | surowka   | 15       | 380  |
| Sałatka z kaszą gryczaną i pieczonymi warzywami       | kolacja   | 40       | 650  |
| Sałatka z komosą i granatem                           | surowka   | 30       | 470  |
| Sałatka z komosą ryżową i warzywami                   | kolacja   | 25       | 570  |
| Sałatka z kopru włoskiego z oliwą                     | surowka   | 15       | 220  |
| Sałatka z kukurydzy, papryki i fasoli                 | surowka   | 15       | 360  |
| Sałatka z kurczakiem curry                            | kolacja   | 25       | 490  |
| Sałatka z kurczakiem i ananasem                       | kolacja   | 30       | 390  |
| Sałatka z kurczakiem, fetą i grzankami                | kolacja   | 25       | 740  |
| Sałatka z makaronem szklanym                          | surowka   | 25       | 450  |
| Sałatka z ogórka i pomidora ze śmietaną               | surowka   | 10       | 170  |
| Sałatka z ogórka po syczuańsku                        | surowka   | 15       | 160  |
| Sałatka z ogórka w sosie gochujang                    | surowka   | 15       | 150  |
| Sałatka z orkiszem (insalata di farro)                | surowka   | 35       | 460  |
| Sałatka z papryki i cebuli marynowanej                | surowka   | 20       | 230  |
| Sałatka z pieczoną dynią i fetą                       | kolacja   | 40       | 540  |
| Sałatka z pieczonym kurczakiem i awokado              | kolacja   | 30       | 460  |
| Sałatka z pomarańczami i oliwkami                     | surowka   | 15       | 280  |
| Sałatka z pomidorami suszonymi i kaparami             | surowka   | 15       | 380  |
| Sałatka z pomidorów i cebuli                          | surowka   | 10       | 190  |
| Sałatka z pomidorów, mozzarelli i bazylii (tricolore) | surowka   | 10       | 400  |
| Sałatka z radicchio i orzechami                       | surowka   | 15       | 450  |
| Sałatka z roszponki i gruszki                         | surowka   | 15       | 520  |
| Sałatka z rukoli, pomidorków i parmezanu              | surowka   | 10       | 340  |
| Sałatka z selera naciowego i orzechów włoskich        | surowka   | 15       | 320  |
| Sałatka z selera naciowego i winogron                 | surowka   | 15       | 330  |
| Sałatka z soczewicą i pieczonym batatem               | kolacja   | 40       | 830  |
| Sałatka z tortellini i pesto                          | kolacja   | 20       | 860  |
| Sałatka z tuńczykiem i jajkiem                        | kolacja   | 15       | 420  |
| Sałatka z zielonej papai (som tam)                    | surowka   | 20       | 210  |
| Sałatka zielona                                       | surowka   | 10       | 40   |
| Sałatka ziemniaczana z ogórkiem kiszonym              | surowka   | 40       | 380  |
| Schab faszerowany pieczarkami                         | obiad     | 80       | 580  |
| Schab ze śliwką                                       | obiad     | 75       | 660  |
| Ser halloumi z patelni                                | przekaska | 10       | 470  |
| Serek waniliowy z owocami i granolą                   | deser     | 10       | 480  |
| Serek wiejski z pomidorem i bazylią                   | sniadanie | 7        | 350  |
| Sernik krakowski                                      | deser     | 120      | 910  |
| Sernik na zimno                                       | deser     | 30       | 1170 |
| Sernik pieczony z rodzynkami                          | deser     | 90       | 860  |
| Sernik z rabarbarem                                   | deser     | 110      | 850  |
| Shakshuka z jajkami i pomidorami                      | kolacja   | 25       | 560  |
| Shawarma z kurczaka                                   | obiad     | 45       | 560  |
| Skrzydełka BBQ                                        | przekaska | 50       | 890  |
| Skrzydełka w glazurze gochujang                       | przekaska | 50       | 690  |
| Skrzydełka w sosie sojowo-miodowym                    | przekaska | 55       | 840  |
| Słupki warzywne z hummusem                            | przekaska | 15       | 370  |
| Smalec ze skwarkami                                   | dodatek   | 60       | 290  |
| Smażone banany w cieście                              | deser     | 20       | 740  |
| Smażone chińskie pierożki (wontony)                   | przekaska | 40       | 920  |
| Smażone kulki ryżowe (arancini)                       | przekaska | 45       | 920  |
| Smażone owoce morza (fritto misto)                    | przekaska | 30       | 690  |
| Smażone pierożki z mozzarellą (panzerotti)            | przekaska | 90       | 820  |
| Smażony makaron ryżowy z wołowiną (pad see ew)        | obiad     | 30       | 980  |
| Smażony makaron z kurczakiem (chow mein)              | obiad     | 30       | 930  |
| Smażony ryż z kimchi i gochujangiem                   | obiad     | 20       | 760  |
| Smoothie bowl z owocami i granolą                     | deser     | 10       | 550  |
| Smoothie zielone ze szpinakiem i bananem              | sniadanie | 7        | 330  |
| Soczewica z ryżem i smażoną cebulą (mujaddara)        | obiad     | 55       | 930  |
| Sola smażona w maśle (sole meunière)                  | obiad     | 25       | 430  |
| Sorbet truskawkowy                                    | deser     | 240      | 270  |
| Sorbet z cytryny i bazylii                            | deser     | 25       | 180  |
| Sos słodko-kwaśny domowy                              | dodatek   | 15       | 140  |
| Spaghetti bolognese                                   | obiad     | 90       | 450  |
| Spaghetti carbonara                                   | obiad     | 30       | 470  |
| Spaghetti z cukinią i serem (alla Nerano)             | obiad     | 40       | 700  |
| Spaghetti z czosnkiem i oliwą (aglio e olio)          | obiad     | 20       | 290  |
| Spaghetti z klopsikami                                | obiad     | 50       | 870  |
| Spaghetti z małżami (alle vongole)                    | obiad     | 35       | 840  |
| Spaghetti z oliwkami i kaparami (puttanesca)          | obiad     | 25       | 750  |
| Spaghetti z serem i pieprzem (cacio e pepe)           | obiad     | 20       | 560  |
| Stek w sosie pomidorowym (alla pizzaiola)             | obiad     | 40       | 460  |
| Stek wołowy                                           | obiad     | 25       | 890  |
| Stek z kalafiora                                      | obiad     | 35       | 150  |
| Stir-fry z wołowiną                                   | obiad     | 40       | 410  |
| Strogonow wołowy                                      | obiad     | 45       | 540  |
| Strudel jabłkowy (Apfelstrudel)                       | deser     | 70       | 700  |
| Surówka z białej kapusty i ananasa                    | surowka   | 15       | 250  |
| Surówka z brokułów z rodzynkami                       | surowka   | 15       | 310  |
| Surówka z buraka i chrzanu                            | surowka   | 15       | 130  |
| Surówka z cukinii i marchewki                         | surowka   | 15       | 100  |
| Surówka z czerwonej kapusty                           | surowka   | 15       | 240  |
| Surówka z dyni i jabłka                               | surowka   | 15       | 210  |
| Surówka z fenkuła i pomarańczy                        | surowka   | 15       | 340  |
| Surówka z jarmużu i jabłka                            | surowka   | 15       | 300  |
| Surówka z kalafiora na surowo                         | surowka   | 15       | 220  |
| Surówka z kalarepy                                    | surowka   | 15       | 230  |
| Surówka z kapusty pekińskiej i rzodkiewki             | surowka   | 15       | 80   |
| Surówka z kiszonej kapusty                            | surowka   | 15       | 70   |
| Surówka z marchewki i jabłka                          | surowka   | 15       | 120  |
| Surówka z ogórka kiszonego i cebuli                   | surowka   | 10       | 170  |
| Surówka z pora i jabłka                               | surowka   | 15       | 260  |
| Surówka z rzepy i marchewki                           | surowka   | 15       | 170  |
| Surówka z rzodkiewki i ogórka                         | surowka   | 15       | 90   |
| Surówka z rzodkiewki i szczypiorku                    | surowka   | 10       | 80   |
| Surówka z selera i jabłka                             | surowka   | 15       | 200  |
| Surówka z selera i rodzynek                           | surowka   | 15       | 280  |
| Sushi bez zawijania                                   | obiad     | 40       | 870  |
| Sycylijskie rurki z ricottą (cannoli)                 | deser     | 60       | 850  |
| Syczuański makaron z mielonym mięsem (dan dan)        | obiad     | 30       | 980  |
| Szarlotka                                             | deser     | 75       | 540  |
| Szarpany kurczak w sosie chipotle (tinga de pollo)    | obiad     | 45       | 740  |
| Szaszłyki caprese na patyczkach                       | przekaska | 15       | 350  |
| Szaszłyki z kurczaka i warzyw                         | obiad     | 45       | 440  |
| Szczawiowa z jajkiem                                  | zupa      | 40       | 360  |
| Szeroki makaron ryżowy z wołowiną (chow fun)          | obiad     | 30       | 1370 |
| Sznycel wiedeński                                     | obiad     | 30       | 860  |
| Szpinak z indyjskim serem (palak paneer)              | obiad     | 45       | 620  |
| Szpinak z sezamem po koreańsku                        | surowka   | 15       | 110  |
| Szybkie leczo z kiełbasą i papryką                    | kolacja   | 30       | 780  |
| Szynka parmeńska z melonem (prosciutto e melone)      | przekaska | 10       | 250  |
| Śledź w oleju z cebulą                                | kolacja   | 20       | 790  |
| Śledź w śmietanie z jabłkiem                          | kolacja   | 20       | 430  |
| Śliwki w boczku                                       | przekaska | 30       | 630  |
| Tacos z mięsem mielonym i warzywami                   | kolacja   | 30       | 1340 |
| Tagliatelle z boczniakami                             | obiad     | 30       | 470  |
| Tagliatelle z polędwicą wołową                        | obiad     | 35       | 560  |
| Tajska zupa kokosowa z kurczakiem (tom kha)           | zupa      | 35       | 600  |
| Tajskie curry massaman z wołowiną                     | obiad     | 110      | 980  |
| Tapenada z oliwek                                     | przekaska | 10       | 420  |
| Tarta babci z kremem (torta della nonna)              | deser     | 90       | 790  |
| Tarta cebulowa z tymiankiem                           | kolacja   | 70       | 800  |
| Tarta cytrynowa                                       | deser     | 80       | 780  |
| Tarta warzywna                                        | kolacja   | 60       | 940  |
| Tarta z boczkiem i serem (quiche lorraine)            | obiad     | 70       | 1040 |
| Tarta z pomidorkami i ricottą                         | kolacja   | 50       | 660  |
| Tarta z truskawkami                                   | deser     | 80       | 780  |
| Tarta ze szparagami i jajkiem                         | kolacja   | 55       | 680  |
| Tarta ze szpinakiem i ricottą                         | kolacja   | 60       | 640  |
| Tartinki z serkiem i łososiem                         | przekaska | 10       | 360  |
| Tiramisu                                              | deser     | 30       | 1040 |
| Tofu duszone w sosie sojowym po koreańsku             | obiad     | 25       | 720  |
| Tofu smażone w sosie gochujang                        | przekaska | 20       | 540  |
| Tofu smażone z warzywami po chińsku                   | kolacja   | 25       | 670  |
| Tofu w ostrym sosie z mięsem (mapo tofu)              | obiad     | 30       | 960  |
| Tofu w sosie teriyaki                                 | obiad     | 30       | 740  |
| Tortellini w bulionie                                 | zupa      | 25       | 460  |
| Tortellini z szynką w sosie śmietanowym               | obiad     | 20       | 770  |
| Tortilla kebab                                        | obiad     | 30       | 1210 |
| Tortilla śniadaniowa z jajecznicą                     | sniadanie | 15       | 550  |
| Tortilla z kurczakiem i mango                         | kolacja   | 30       | 630  |
| Tortilla z kurczakiem, warzywami i sosem czosnkowym   | kolacja   | 25       | 890  |
| Tortilla z serem, jajkiem i szynką                    | kolacja   | 10       | 450  |
| Tortilla zapiekana z tuńczykiem                       | kolacja   | 25       | 900  |
| Tortille z kurczakiem i papryką (fajitas)             | obiad     | 35       | 730  |
| Toskańska sałatka z chlebem i pomidorami (panzanella) | kolacja   | 20       | 510  |
| Toskańska zupa z fasolą i chlebem (ribollita)         | zupa      | 70       | 630  |
| Toskańska zupa z jarmużem i kiełbasą                  | zupa      | 40       | 770  |
| Tost z szynką i beszamelem (croque monsieur)          | sniadanie | 20       | 760  |
| Tosty francuskie na słodko                            | deser     | 15       | 460  |
| Tosty francuskie na słono                             | przekaska | 15       | 500  |
| Tosty koreańskie z jajkiem i kapustą                  | kolacja   | 20       | 650  |
| Tosty z masłem orzechowym i bananem                   | sniadanie | 10       | 520  |
| Tosty z serem i szynką                                | sniadanie | 10       | 510  |
| Tosty z tuńczykiem i serem                            | kolacja   | 15       | 410  |
| Trofie z pesto i ziemniakami                          | obiad     | 30       | 990  |
| Turecka pizza z mięsem (lahmacun)                     | obiad     | 90       | 530  |
| Tureckie jajka z pomidorami i papryką (menemen)       | sniadanie | 25       | 490  |
| Tureckie kotleciki z jogurtem (köfte)                 | obiad     | 40       | 430  |
| Twarde ciasteczka migdałowe (cantuccini)              | deser     | 60       | 540  |
| Twarożek z rzodkiewką i szczypiorkiem                 | sniadanie | 10       | 420  |
| Tzatziki                                              | dodatek   | 15       | 240  |
| Udka w sosie BBQ                                      | obiad     | 60       | 770  |
| Udon z wołowiną i warzywami                           | obiad     | 30       | 940  |
| Uszka z grzybami                                      | dodatek   | 80       | 390  |
| Wareniki z twarogiem                                  | obiad     | 70       | 760  |
| Wątróbka drobiowa z cebulą                            | obiad     | 30       | 610  |
| Wieprzowina w sosie gochujang                         | obiad     | 30       | 1040 |
| Wieprzowina w sosie słodko-kwaśnym (gu lao rou)       | obiad     | 45       | 1190 |
| Wietnamska bagietka z kurczakiem (bánh mì)            | kolacja   | 40       | 610  |
| Wietnamski makaron z grillowaną wieprzowiną (bún chả) | obiad     | 50       | 730  |
| Włoska babka (ciambellone)                            | deser     | 60       | 650  |
| Włoski omlet z cukinią i parmezanem (frittata)        | kolacja   | 25       | 600  |
| Włoski omlet z pomidorami i bazylią                   | sniadanie | 15       | 440  |
| Włoski omlet z ziemniakami i cebulą (frittata)        | sniadanie | 30       | 770  |
| Włoski placek z szynką i rukolą (piadina)             | kolacja   | 25       | 830  |
| Włoski rogalik z kremem (cornetto)                    | sniadanie | 35       | 570  |
| Włoskie ciasto z jabłkami (torta di mele)             | deser     | 65       | 580  |
| Włoskie kanapki z tuńczykiem (tramezzini)             | kolacja   | 15       | 620  |
| Włoskie obwarzanki (taralli)                          | przekaska | 60       | 620  |
| Włoskie pączki parzone z kremem (zeppole)             | deser     | 80       | 640  |
| Włoskie pączki z kremem (bomboloni)                   | deser     | 40       | 700  |
| Włoskie sucharki z dżemem i masłem (fette biscottate) | sniadanie | 5        | 290  |
| Wołowina gotowana z warzywami (pot-au-feu)            | zupa      | 180      | 630  |
| Wołowina po burgundzku (bœuf bourguignon)             | obiad     | 180      | 660  |
| Wołowina w sosie ostrygowym                           | obiad     | 30       | 920  |
| Wołowina z brokułami po chińsku                       | obiad     | 30       | 950  |
| Wołowina zapiekana z makaronem orzo (giouvetsi)       | obiad     | 120      | 780  |
| Wrap z falafelem i hummusem                           | kolacja   | 25       | 830  |
| Wrap z jajkiem, bekonem i sałatą                      | kolacja   | 15       | 690  |
| Wrap z kurczakiem i warzywami                         | kolacja   | 20       | 710  |
| Wrap z mięsem mielonym, serem i warzywami             | kolacja   | 25       | 1250 |
| Zacierki na mleku                                     | sniadanie | 20       | 450  |
| Zalewajka                                             | zupa      | 45       | 670  |
| Zapiekane bagietki z serem, pieczarkami i szynką      | kolacja   | 25       | 740  |
| Zapiekane bataty z fetą                               | kolacja   | 55       | 500  |
| Zapiekane jajka z warzywami                           | kolacja   | 30       | 510  |
| Zapiekane kluski z kaszy manny (gnocchi alla romana)  | obiad     | 70       | 530  |
| Zapiekane papryki z ryżem i ziołami                   | kolacja   | 55       | 680  |
| Zapiekane tortille z kurczakiem (enchiladas)          | obiad     | 60       | 830  |
| Zapiekane ziemniaki z serem pleśniowym                | kolacja   | 50       | 810  |
| Zapiekanka makaronowa z kurczakiem                    | obiad     | 50       | 1020 |
| Zapiekanka pasterska (shepherd's pie)                 | obiad     | 75       | 970  |
| Zapiekanka z bakłażana i parmezanu (parmigiana)       | obiad     | 75       | 690  |
| Zapiekanka z bakłażana z serem                        | kolacja   | 50       | 690  |
| Zapiekanka z brokułami i kurczakiem                   | kolacja   | 45       | 680  |
| Zapiekanka z kalafiora                                | kolacja   | 50       | 630  |
| Zapiekanka z mięsa i puree (hachis parmentier)        | obiad     | 75       | 880  |
| Zapiekanka ziemniaczana z mięsem mielonym             | obiad     | 70       | 1040 |
| Zapiekanka ziemniaczana ze śmietaną (gratin)          | obiad     | 80       | 830  |
| Zapiekanki                                            | obiad     | 30       | 640  |
| Zapiekany deser z czereśniami (clafoutis)             | deser     | 50       | 450  |
| Zapiekany makaron z bakłażanem (pasta al forno)       | obiad     | 60       | 970  |
| Zielone curry z kurczakiem                            | obiad     | 35       | 760  |
| Ziemniaki duszone w sosie sojowym                     | dodatek   | 30       | 370  |
| Ziemniaki w pikantnym sosie (patatas bravas)          | dodatek   | 45       | 720  |
| Ziemniaki z kalafiorem po indyjsku (aloo gobi)        | dodatek   | 40       | 570  |
| Ziemniaki zapiekane z serem i boczkiem (tartiflette)  | obiad     | 60       | 1020 |
| Zimny makaron gryczany w bulionie (naengmyeon)        | obiad     | 30       | 610  |
| Zimny makaron w ostrym sosie (bibim guksu)            | obiad     | 20       | 610  |
| Zrazy wołowe zawijane                                 | obiad     | 110      | 730  |
| Zupa cebulowa po francusku                            | zupa      | 60       | 740  |
| Zupa chrzanowa                                        | zupa      | 45       | 470  |
| Zupa cukiniowa z serkiem topionym                     | zupa      | 30       | 480  |
| Zupa cytrynowa                                        | zupa      | 40       | 350  |
| Zupa dyniowa z imbirem                                | zupa      | 40       | 450  |
| Zupa fasolowa                                         | zupa      | 60       | 650  |
| Zupa grzybowa                                         | zupa      | 45       | 360  |
| Zupa kalarepowa                                       | zupa      | 40       | 340  |
| Zupa koperkowa                                        | zupa      | 35       | 290  |
| Zupa krem z batatów                                   | kolacja   | 40       | 650  |
| Zupa krem z brokułem i cukinią                        | zupa      | 30       | 420  |
| Zupa krem z pomidorów z grzankami                     | kolacja   | 30       | 500  |
| Zupa kukurydziana z kurczakiem                        | zupa      | 35       | 700  |
| Zupa marchewkowo-imbirowa                             | zupa      | 35       | 500  |
| Zupa miso z tofu                                      | kolacja   | 20       | 150  |
| Zupa neapolitańska                                    | zupa      | 40       | 500  |
| Zupa owocowa z makaronem                              | zupa      | 25       | 340  |
| Zupa porowa z ziemniakami                             | zupa      | 35       | 480  |
| Zupa ramen z kurczakiem                               | zupa      | 40       | 680  |
| Zupa rybna                                            | zupa      | 45       | 440  |
| Zupa selerowa z grzankami                             | zupa      | 40       | 630  |
| Zupa z chińskimi pierożkami (wonton)                  | zupa      | 50       | 610  |
| Zupa z ciecierzycy i pomidorów                        | zupa      | 35       | 440  |
| Zupa z jarmużem i kiełbasą (caldo verde)              | zupa      | 45       | 890  |
| Zupa z kiełków sojowych po koreańsku                  | zupa      | 25       | 240  |
| Zupa z kimchi i wieprzowiną (kimchi jjigae)           | zupa      | 35       | 1090 |
| Zupa z makaronem i ciecierzycą (pasta e ceci)         | zupa      | 40       | 520  |
| Zupa z makaronem i fasolą (pasta e fagioli)           | zupa      | 40       | 590  |
| Zupa z makaronem i wołowiną po chińsku                | zupa      | 35       | 670  |
| Zupa z małżami (clam chowder)                         | zupa      | 45       | 780  |
| Zupa z orkiszem i warzywami                           | zupa      | 45       | 430  |
| Zupa z pieczonego kalafiora                           | zupa      | 55       | 530  |
| Zupa z plackami ryżowymi (tteokguk)                   | zupa      | 35       | 740  |
| Zupa z soczewicy czerwonej                            | zupa      | 35       | 610  |
| Zupa ziemniaczana z boczkiem                          | zupa      | 40       | 580  |
| Żeberka duszone w kapuście                            | obiad     | 120      | 970  |
| Żeberka pieczone w miodzie i musztardzie              | obiad     | 120      | 1260 |
| Żeberka w sosie hoisin                                | przekaska | 110      | 1020 |
| Żur                                                   | zupa      | 60       | 650  |
