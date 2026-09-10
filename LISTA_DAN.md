# Lista dań — Menu Planer

Stan bazy `dania` na 2026-09-10 (439 dań) — nazwa, rodzaj, czas
przyrządzania, kcal na 1 porcję. Do przeglądu przy wymyślaniu nowych dań
(unikanie dubli) i jako punkt odniesienia.

Rozkład: obiad 103, przekaska 75, kolacja 74, deser 60, sniadanie 53, zupa 45, surowka 29.

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
| Babka piaskowa                                        | deser     | 75       | 320  |
| Bajgle z serkiem i ogórkiem                           | sniadanie | 10       | 390  |
| Bakłażan w panko                                      | przekaska | 30       | 700  |
| Banany smażone z miodem i cynamonem                   | deser     | 15       | 340  |
| Banany w cieście naleśnikowym                         | przekaska | 20       | 520  |
| Barszcz biały z białą kiełbasą                        | zupa      | 50       | 520  |
| Barszcz czerwony                                      | zupa      | 90       | 150  |
| Barszcz ukraiński                                     | zupa      | 60       | 280  |
| Beza Pavlova z owocami                                | deser     | 100      | 320  |
| Bibimbap z wołowiną                                   | obiad     | 40       | 650  |
| Bigos                                                 | obiad     | 180      | 560  |
| Bitki wołowe w sosie własnym                          | obiad     | 90       | 300  |
| Boeuf Strogonow                                       | obiad     | 45       | 620  |
| Botwinka z jajkiem                                    | zupa      | 40       | 230  |
| Breakfast Burrito                                     | sniadanie | 20       | 800  |
| Brownie czekoladowe                                   | deser     | 45       | 480  |
| Brownie z patelni                                     | deser     | 25       | 650  |
| Bruschetta z mozzarellą i rukolą                      | kolacja   | 15       | 420  |
| Bruschetta z pieczarkami                              | przekaska | 20       | 320  |
| Bruschetta z pomidorami i bazylią                     | przekaska | 15       | 470  |
| Budyń czekoladowy                                     | deser     | 15       | 410  |
| Budyń waniliowy z owocami                             | deser     | 20       | 380  |
| Bułeczki jak z Maka                                   | obiad     | 10       | 350  |
| Buraczki                                              | surowka   | 60       | 40   |
| Burger wołowy                                         | obiad     | 30       | 950  |
| Burgery z soczewicy                                   | obiad     | 40       | 520  |
| Burrito z mieloną wołowiną                            | obiad     | 40       | 610  |
| Butter Chicken                                        | obiad     | 40       | 700  |
| Camembert pieczony z żurawiną                         | przekaska | 25       | 550  |
| Cannelloni ze szpinakiem i ricottą                    | obiad     | 60       | 620  |
| Carpaccio z buraka na grzankach                       | przekaska | 25       | 590  |
| Cebulowa (po francusku)                               | zupa      | 60       | 450  |
| Chałka z masłem i miodem                              | sniadanie | 10       | 430  |
| Chia pudding z mango                                  | deser     | 240      | 660  |
| Chilli con carne                                      | obiad     | 60       | 860  |
| Chipsy z buraka                                       | przekaska | 40       | 150  |
| Chipsy z jarmużu                                      | przekaska | 25       | 150  |
| Chipsy z tortilli z dipem jogurtowym                  | przekaska | 20       | 600  |
| Chleb w jajku                                         | sniadanie | 10       | 350  |
| Chłodnik litewski                                     | zupa      | 20       | 370  |
| Chłodnik ogórkowy z koperkiem                         | zupa      | 15       | 180  |
| Chrupiąca ciecierzyca z piekarnika                    | przekaska | 40       | 240  |
| Chrupiące kąski z kurczaka                            | przekaska | 30       | 600  |
| Ciasto czekoladowe z wiśniami                         | deser     | 60       | 420  |
| Ciasto drożdżowe z kruszonką                          | deser     | 120      | 390  |
| Ciasto francuskie z jabłkiem i cynamonem              | deser     | 35       | 640  |
| Ciasto marchewkowe                                    | deser     | 75       | 520  |
| Ciasto ucierane z owocami                             | deser     | 60       | 320  |
| Colesław                                              | surowka   | 15       | 100  |
| Crème brûlée                                          | deser     | 70       | 420  |
| Croque Monsieur/Madame                                | sniadanie | 20       | 750  |
| Cukinia w panierce                                    | przekaska | 25       | 420  |
| Curry z ciecierzycy i szpinaku                        | obiad     | 30       | 520  |
| Daktyle z masłem orzechowym                           | przekaska | 10       | 460  |
| Deser lodowy z gorącymi malinami                      | deser     | 15       | 420  |
| Deser z mascarpone, herbatnikami i owocami            | deser     | 20       | 600  |
| Deska serów i wędlin                                  | przekaska | 20       | 650  |
| Domowe hot dogi z prażoną cebulką                     | kolacja   | 25       | 640  |
| Dorsz panierowany                                     | obiad     | 35       | 450  |
| Dorsz w sosie cytrynowym                              | obiad     | 30       | 420  |
| Dorsz z piekarnika                                    | obiad     | 35       | 280  |
| Duszona wołowina z warzywami korzeniowymi             | obiad     | 120      | 520  |
| Falafel z sosem tahini                                | kolacja   | 40       | 580  |
| Fasolka po bretońsku                                  | obiad     | 120      | 950  |
| Faszerowana pierś kurczaka                            | obiad     | 45       | 320  |
| Faszerowane papryczki serkiem                         | przekaska | 20       | 230  |
| Faworki                                               | deser     | 60       | 420  |
| Filet z indyka w sosie grzybowym                      | obiad     | 40       | 420  |
| Flaki                                                 | zupa      | 180      | 300  |
| Frittata z ziemniakami i cebulą                       | sniadanie | 30       | 450  |
| Frytki z batatów                                      | przekaska | 40       | 320  |
| Galaretka z owocami                                   | deser     | 15       | 220  |
| Gazpacho                                              | zupa      | 20       | 230  |
| Gnocchi z masłem, czosnkiem i parmezanem              | kolacja   | 20       | 740  |
| Gnocchi z sosem pomidorowym i mozzarellą              | kolacja   | 25       | 610  |
| Gofrowe kąski                                         | przekaska | 25       | 530  |
| Gofry na słono z serem i szynką                       | sniadanie | 25       | 580  |
| Gofry z owocami i bitą śmietaną                       | deser     | 30       | 620  |
| Golonka pieczona w piwie                              | obiad     | 180      | 880  |
| Gołąbki w sosie pomidorowym                           | obiad     | 90       | 520  |
| Grissini z szynką parmeńską                           | przekaska | 45       | 320  |
| Grochówka                                             | zupa      | 120      | 550  |
| Grzanki czosnkowe z serem                             | przekaska | 15       | 650  |
| Grzanki z awokado, jajkiem i pomidorem                | kolacja   | 15       | 450  |
| Grzanki z serem żółtym i pomidorem                    | sniadanie | 15       | 420  |
| Guacamole                                             | przekaska | 15       | 290  |
| Gulasz domowy (sos mięsny)                            | obiad     | 120      | 480  |
| Gulasz wieprzowy z kluskami                           | obiad     | 90       | 720  |
| Gulasz z indyka z papryką                             | obiad     | 45       | 420  |
| Gulaszowa                                             | zupa      | 75       | 500  |
| Gyros domowy z sosem czosnkowym                       | obiad     | 60       | 480  |
| Huevos Rancheros                                      | sniadanie | 25       | 700  |
| Hummus z pieczonym burakiem                           | przekaska | 50       | 270  |
| Indyk pieczony z warzywami                            | obiad     | 75       | 480  |
| Jabłecznik z kruszonką                                | deser     | 90       | 380  |
| Jabłka pieczone z cynamonem                           | deser     | 40       | 290  |
| Jabłka w cieście                                      | przekaska | 30       | 700  |
| Jaglanka z jabłkiem i cynamonem                       | sniadanie | 25       | 420  |
| Jajecznica                                            | sniadanie | 10       | 340  |
| Jajecznica z boczkiem i szczypiorkiem                 | kolacja   | 15       | 530  |
| Jajka faszerowane                                     | przekaska | 25       | 260  |
| Jajka na miękko                                       | sniadanie | 7        | 150  |
| Jajka na twardo z majonezem                           | sniadanie | 15       | 250  |
| Jajka po benedyktyńsku                                | sniadanie | 30       | 620  |
| Jajka po turecku*                                     | sniadanie | 15       | 590  |
| Jajka przepiórcze w panierce                          | przekaska | 30       | 320  |
| Jajka sadzone z boczkiem                              | sniadanie | 10       | 450  |
| Jajka sadzone z ziemniakami z patelni i mizerią       | kolacja   | 30       | 690  |
| Jajka w koszulce na grzance                           | sniadanie | 15       | 390  |
| Jajka w majonezie ze szczypiorkiem                    | przekaska | 15       | 360  |
| Jajka z papryką                                       | obiad     | 15       | 350  |
| Jajka zapiekane w awokado                             | sniadanie | 25       | 390  |
| Jarzynowa                                             | zupa      | 45       | 260  |
| Jogurt grecki z miodem i orzechami                    | deser     | 5        | 580  |
| Kaczka pieczona z jabłkami                            | obiad     | 150      | 720  |
| Kalafiorowa                                           | zupa      | 40       | 370  |
| Kanapki na ciepło z mozzarellą, pomidorem i szynką    | kolacja   | 15       | 470  |
| Kanapki z jajkiem                                     | sniadanie | 15       | 480  |
| Kanapki z łososiem i twarożkiem                       | kolacja   | 10       | 370  |
| Kanapki z pastą z ciecierzycy                         | kolacja   | 15       | 420  |
| Kanapki z pastą z pieczonej papryki                   | sniadanie | 20       | 420  |
| Kanapki z pastą z tuńczyka                            | sniadanie | 10       | 420  |
| Kanapki z pasztetem i ogórkiem kiszonym               | sniadanie | 10       | 420  |
| Kanapki z serem i wędliną                             | sniadanie | 10       | 430  |
| Kanapki z twarogiem i miodem                          | sniadanie | 5        | 440  |
| Kanapki zapiekane z pieczarkami                       | kolacja   | 25       | 480  |
| Kapsalon                                              | obiad     | 45       | 410  |
| Kapuśniak                                             | zupa      | 90       | 420  |
| Karkówka pieczona w piekarniku                        | obiad     | 110      | 520  |
| Karpatka                                              | deser     | 90       | 430  |
| Kasza bulgur z kurczakiem, papryką i sosem jogurtowym | kolacja   | 30       | 620  |
| Kasza manna na mleku                                  | sniadanie | 12       | 320  |
| Kasza manna z sokiem malinowym                        | deser     | 15       | 360  |
| Kaszka kukurydziana z owocami                         | sniadanie | 15       | 380  |
| Kisiel owocowy                                        | deser     | 20       | 260  |
| Klopsiki szwedzkie w sosie śmietanowym                | obiad     | 45       | 680  |
| Klopsiki w sosie pomidorowym                          | obiad     | 45       | 520  |
| Kluski lane na mleku                                  | sniadanie | 15       | 420  |
| Kluski z serem i skwarkami                            | obiad     | 25       | 540  |
| Koktajl bananowo-truskawkowy                          | deser     | 10       | 380  |
| Koktajl owocowy z jogurtem                            | deser     | 10       | 370  |
| Kopytka z cebulką                                     | obiad     | 60       | 700  |
| Koreczki                                              | przekaska | 15       | 250  |
| Kotlet de volaille                                    | obiad     | 40       | 650  |
| Kotlet schabowy                                       | obiad     | 45       | 500  |
| Kotlety mielone                                       | obiad     | 40       | 550  |
| Kotlety z ciecierzycy                                 | obiad     | 30       | 430  |
| Kotlety z kaszy gryczanej                             | obiad     | 40       | 480  |
| Krakersy z serkiem i ogórkiem                         | przekaska | 10       | 210  |
| Krążki cebulowe                                       | przekaska | 30       | 580  |
| Krążki kalmarów smażone                               | przekaska | 25       | 420  |
| Krem budyniowy z bananami                             | deser     | 20       | 460  |
| Krem z kalafiora z migdałami                          | zupa      | 35       | 320  |
| Krem z mascarpone i kajmaku                           | deser     | 15       | 550  |
| Krem z zielonego groszku z miętą                      | zupa      | 25       | 280  |
| Kremówka                                              | deser     | 60       | 480  |
| Krewetki smażone z czosnkiem                          | przekaska | 15       | 260  |
| Krewetki w sosie czosnkowym z makaronem               | obiad     | 25       | 610  |
| Krokiety z kapustą kiszoną i grzybami                 | obiad     | 90       | 450  |
| Krokiety z mięsem                                     | obiad     | 60       | 620  |
| Krokiety z pieczarkami                                | kolacja   | 60       | 520  |
| Krupnik                                               | zupa      | 60       | 480  |
| Kulki kokosowe                                        | przekaska | 20       | 400  |
| Kulki mocy z płatków owsianych                        | przekaska | 20       | 480  |
| Kulki owsiane z masłem orzechowym i miodem            | deser     | 20       | 360  |
| Kulki serowe w panierce                               | przekaska | 30       | 700  |
| Kurczak curry z ryżem                                 | kolacja   | 35       | 740  |
| Kurczak pieczony w całości                            | obiad     | 100      | 620  |
| Kurczak po chińsku                                    | obiad     | 50       | 380  |
| Kurczak tikka masala                                  | obiad     | 45       | 610  |
| Kurczak w panko                                       | przekaska | 30       | 650  |
| Kurczak w sosie słodko-kwaśnym                        | obiad     | 35       | 540  |
| Kuskus z kurczakiem i warzywami                       | kolacja   | 30       | 700  |
| Kwaśnica                                              | zupa      | 90       | 420  |
| Lasagne Bolognese                                     | obiad     | 90       | 750  |
| Lasagne warzywna                                      | obiad     | 70       | 540  |
| Leczo                                                 | obiad     | 40       | 250  |
| Lody domowe waniliowe                                 | deser     | 240      | 490  |
| Lody z jogurtu i owoców                               | deser     | 240      | 340  |
| Łosoś pieczony z koperkiem                            | obiad     | 30       | 520  |
| Makaron z brokułami i czosnkiem                       | kolacja   | 25       | 520  |
| Makaron z kiełbasą, cebulą i passatą                  | kolacja   | 25       | 900  |
| Makaron z kiełbaską i sosem pieczarkowym              | obiad     | 25       | 780  |
| Makaron z kurczakiem w sosie pomidorowym              | obiad     | 30       | 490  |
| Makaron z kurczakiem, brokułem i sosem śmietanowym    | kolacja   | 25       | 850  |
| Makaron z łososiem i szpinakiem                       | obiad     | 25       | 680  |
| Makaron z pesto i oliwkami                            | obiad     | 20       | 570  |
| Makaron z pesto, kurczakiem i pomidorkami             | kolacja   | 25       | 800  |
| Makaron z pomidorami, czosnkiem i parmezanem          | kolacja   | 20       | 680  |
| Makaron z serem, boczkiem i cebulką                   | kolacja   | 25       | 800  |
| Makaron z tuńczykiem i kaparami                       | obiad     | 25       | 620  |
| Makaron z warzywami w sosie serowym                   | obiad     | 30       | 470  |
| Makaron zapiekany z czterema serami                   | obiad     | 40       | 780  |
| Makowiec rolowany                                     | deser     | 120      | 450  |
| Marry me chicken gnocchi                              | obiad     | 40       | 520  |
| Mazurek z masą krówkową                               | deser     | 90       | 420  |
| Migdały prażone z papryką                             | przekaska | 15       | 670  |
| Minestrone                                            | zupa      | 45       | 320  |
| Mini burgery                                          | przekaska | 40       | 800  |
| Mini hot dogi                                         | przekaska | 25       | 550  |
| Mini muffinki bananowe                                | przekaska | 30       | 460  |
| Mini muffinki wytrawne                                | przekaska | 35       | 620  |
| Mini pancakes z owocami                               | przekaska | 25       | 550  |
| Mini rogaliki z ciasta francuskiego i czekolady       | deser     | 25       | 540  |
| Mini szaszłyki z kurczaka                             | przekaska | 35       | 260  |
| Mini tortille                                         | przekaska | 20       | 470  |
| Mini zapiekanki z pieczarkami                         | przekaska | 25       | 590  |
| Mizeria                                               | surowka   | 15       | 70   |
| Moussaka z bakłażanem                                 | obiad     | 80       | 620  |
| Mozzarella sticks                                     | przekaska | 30       | 600  |
| Mug cake czekoladowy z mikrofali                      | deser     | 5        | 690  |
| Mus czekoladowy z banana i kakao                      | deser     | 10       | 170  |
| Musli z jogurtem i owocami                            | sniadanie | 10       | 420  |
| Nachos z guacamole i salsą                            | przekaska | 20       | 520  |
| Nachosy z sosem serowym                               | przekaska | 15       | 700  |
| Naleśniki crêpes Suzette (pomarańczowe)*              | sniadanie | 30       | 760  |
| Naleśniki gryczane z twarogiem                        | sniadanie | 30       | 480  |
| Naleśniki wytrawne z serem i szynką                   | kolacja   | 30       | 750  |
| Naleśniki z boczkiem                                  | sniadanie | 25       | 720  |
| Naleśniki z dżemem                                    | sniadanie | 25       | 580  |
| Naleśniki z dżemem i bitą śmietaną                    | deser     | 30       | 650  |
| Naleśniki z mięsem zapiekane                          | obiad     | 60       | 650  |
| Naleśniki z pieczarkami i serem                       | kolacja   | 40       | 560  |
| Naleśniki ze szpinakiem i fetą                        | kolacja   | 30       | 520  |
| Nuggetsy domowe                                       | przekaska | 30       | 550  |
| Ogórkowa                                              | zupa      | 60       | 400  |
| Omlet                                                 | sniadanie | 10       | 350  |
| Omlet biszkoptowy z dżemem                            | sniadanie | 15       | 390  |
| Omlet z pieczarkami i cebulą                          | sniadanie | 15       | 390  |
| Omlet z serem, szynką i warzywami                     | kolacja   | 15       | 490  |
| Omlet ze szpinakiem i fetą                            | sniadanie | 15       | 420  |
| Orzeszki w miodzie i chili                            | przekaska | 20       | 640  |
| Owocowa sałatka z miętą                               | deser     | 15       | 210  |
| Owsianka                                              | sniadanie | 10       | 540  |
| Owsianka kakaowa z bananem                            | deser     | 10       | 500  |
| Owsianka nocna                                        | sniadanie | 480      | 450  |
| Owsianka z jabłkiem i orzechami                       | sniadanie | 15       | 420  |
| Pad thai z kurczakiem                                 | obiad     | 30       | 620  |
| Paluszki serowe z sezamem                             | przekaska | 35       | 330  |
| Paluszki z ciasta francuskiego z szynką               | przekaska | 25       | 620  |
| Pancakes amerykańskie z syropem klonowym              | sniadanie | 25       | 540  |
| Panierowana pierś kurczaka                            | obiad     | 40       | 400  |
| Panini z kurczakiem, serem i sosem BBQ                | kolacja   | 20       | 720  |
| Panna cotta z owocami                                 | deser     | 240      | 610  |
| Parówki                                               | sniadanie | 8        | 420  |
| Parówki w cieście francuskim                          | przekaska | 25       | 660  |
| Pasta jajeczna                                        | sniadanie | 15       | 340  |
| Pasta z awokado i jajka                               | sniadanie | 10       | 310  |
| Pasta z makreli wędzonej                              | sniadanie | 10       | 530  |
| Pasta z pieczonego bakłażana                          | przekaska | 50       | 210  |
| Pączki domowe                                         | deser     | 150      | 320  |
| Pieczarkowa                                           | zupa      | 40       | 380  |
| Pieczeń rzymska                                       | obiad     | 75       | 520  |
| Pieczona owsianka                                     | sniadanie | 45       | 650  |
| Pieczone bataty z dipem                               | przekaska | 40       | 390  |
| Pieczone pieczarki z serem                            | przekaska | 30       | 320  |
| Pieczone udka kurczaka                                | obiad     | 70       | 350  |
| Pieczone ziemniaczki z dipem                          | przekaska | 45       | 630  |
| Pierniki miodowe                                      | deser     | 60       | 320  |
| Pierogi leniwe                                        | obiad     | 30       | 520  |
| Pierogi ruskie                                        | obiad     | 90       | 640  |
| Pierogi z kapustą i grzybami                          | obiad     | 90       | 520  |
| Pierogi z mięsem                                      | obiad     | 120      | 640  |
| Pizza domowa                                          | obiad     | 120      | 760  |
| Pizza na tortilli                                     | kolacja   | 20       | 540  |
| Pizzerinki                                            | przekaska | 25       | 700  |
| Placek po węgiersku                                   | obiad     | 60       | 780  |
| Placek z rabarbarem i bezą                            | deser     | 75       | 390  |
| Placki bananowe z „chrupką”                           | sniadanie | 20       | 590  |
| Placki bananowe z jogurtem i owocami                  | deser     | 20       | 550  |
| Placki owsiane z jogurtem                             | sniadanie | 20       | 420  |
| Placki z cukinii z sosem jogurtowym                   | kolacja   | 30       | 380  |
| Placki z kaszy jaglanej                               | kolacja   | 35       | 420  |
| Placki ziemniaczane mini                              | przekaska | 30       | 380  |
| Placki ziemniaczane z sosem czosnkowym                | kolacja   | 40       | 730  |
| Placki ziemniaczane ze śmietaną                       | obiad     | 45       | 460  |
| Placuszki twarogowe                                   | deser     | 25       | 530  |
| Płatki z mlekiem                                      | sniadanie | 3        | 310  |
| Podudzia w marynacie ziołowej                         | obiad     | 70       | 520  |
| Polędwiczka wieprzowa z kurkami                       | obiad     | 50       | 440  |
| Pomidorówka                                           | zupa      | 40       | 380  |
| Popcorn karmelowy                                     | przekaska | 20       | 730  |
| Prażona kukurydza z masłem                            | przekaska | 10       | 420  |
| Prażone pestki dyni z solą                            | przekaska | 15       | 250  |
| Pstrąg pieczony z masłem czosnkowym                   | obiad     | 40       | 400  |
| Ptasie mleczko domowe                                 | deser     | 40       | 320  |
| Pulpety w sosie koperkowym                            | obiad     | 60       | 450  |
| Pyzy/kluski śląskie                                   | obiad     | 90       | 560  |
| Quesadilla z serem i fasolą                           | kolacja   | 15       | 900  |
| Quesadilla z serem i kurczakiem                       | przekaska | 20       | 750  |
| Quesadilla z szarpaną wieprzowiną                     | obiad     | 180      | 710  |
| Racuchy z jabłkami                                    | deser     | 30       | 650  |
| Risotto z grzybami leśnymi                            | obiad     | 40       | 540  |
| Risotto z warzywami                                   | obiad     | 40       | 350  |
| Rogaliki z marmoladą                                  | deser     | 90       | 380  |
| Rolada biszkoptowa z dżemem                           | deser     | 40       | 290  |
| Roladki drobiowe ze szpinakiem                        | obiad     | 40       | 420  |
| Roladki z bakłażana z ricottą                         | przekaska | 35       | 320  |
| Roladki z cukinii z serkiem                           | przekaska | 30       | 330  |
| Roladki z szynki i serka                              | przekaska | 15       | 280  |
| Roladki z tortilli ze szpinakiem                      | przekaska | 20       | 320  |
| Rosół                                                 | zupa      | 150      | 430  |
| Ryba po grecku                                        | obiad     | 60       | 350  |
| Ryba w sosie musztardowym                             | obiad     | 30       | 420  |
| Ryż na mleku z cynamonem i jabłkiem                   | deser     | 30       | 490  |
| Ryż smażony z jajkiem, kurczakiem i warzywami         | kolacja   | 25       | 620  |
| Ryż smażony z krewetkami                              | obiad     | 25       | 520  |
| Ryż z warzywami stir-fry                              | kolacja   | 25       | 520  |
| Ryż z warzywami w sosie curry                         | kolacja   | 30       | 520  |
| Sałatka caprese                                       | kolacja   | 10       | 530  |
| Sałatka cezar z kurczakiem                            | kolacja   | 25       | 620  |
| Sałatka grecka z fetą                                 | kolacja   | 15       | 510  |
| Sałatka gyros                                         | przekaska | 30       | 500  |
| Sałatka jarzynowa                                     | kolacja   | 50       | 320  |
| Sałatka makaronowa z kurczakiem i kukurydzą           | kolacja   | 25       | 730  |
| Sałatka nicejska                                      | kolacja   | 25       | 480  |
| Sałatka z arbuzem i fetą                              | kolacja   | 15       | 330  |
| Sałatka z awokado i pomidorkami                       | surowka   | 10       | 320  |
| Sałatka z burakiem, kozim serem i orzechami           | kolacja   | 15       | 420  |
| Sałatka z fasolą i tuńczykiem                         | kolacja   | 15       | 420  |
| Sałatka z jajkiem, bekonem i grzankami                | kolacja   | 20       | 740  |
| Sałatka z kapusty pekińskiej i kukurydzy              | surowka   | 15       | 210  |
| Sałatka z kaszą gryczaną i pieczonymi warzywami       | kolacja   | 40       | 480  |
| Sałatka z komosą ryżową i warzywami                   | kolacja   | 25       | 420  |
| Sałatka z kukurydzy, papryki i fasoli                 | surowka   | 15       | 260  |
| Sałatka z kurczakiem curry                            | kolacja   | 25       | 430  |
| Sałatka z kurczakiem, fetą i grzankami                | kolacja   | 25       | 640  |
| Sałatka z ogórka i pomidora ze śmietaną               | surowka   | 10       | 140  |
| Sałatka z papryki i cebuli marynowanej                | surowka   | 20       | 120  |
| Sałatka z pieczoną dynią i fetą                       | kolacja   | 40       | 420  |
| Sałatka z pieczonym kurczakiem i awokado              | kolacja   | 30       | 520  |
| Sałatka z pomidorów i cebuli                          | surowka   | 10       | 120  |
| Sałatka z roszponki i gruszki                         | surowka   | 15       | 320  |
| Sałatka z rukoli, pomidorków i parmezanu              | surowka   | 10       | 240  |
| Sałatka z selera naciowego i orzechów włoskich        | surowka   | 15       | 290  |
| Sałatka z soczewicą i pieczonym batatem               | kolacja   | 40       | 480  |
| Sałatka z tortellini i pesto                          | kolacja   | 20       | 520  |
| Sałatka z tuńczykiem i jajkiem                        | kolacja   | 15       | 370  |
| Sałatka zielona                                       | surowka   | 10       | 30   |
| Schab ze śliwką                                       | obiad     | 75       | 480  |
| Ser halloumi z patelni                                | przekaska | 10       | 430  |
| Serek waniliowy z owocami i granolą                   | deser     | 10       | 480  |
| Serek wiejski z pomidorem i bazylią                   | sniadanie | 7        | 230  |
| Sernik na zimno                                       | deser     | 30       | 550  |
| Sernik pieczony z rodzynkami                          | deser     | 90       | 420  |
| Shakshuka z jajkami i pomidorami                      | kolacja   | 25       | 470  |
| Skrzydełka BBQ                                        | przekaska | 50       | 620  |
| Słupki warzywne z hummusem                            | przekaska | 15       | 330  |
| Smoothie bowl z owocami i granolą                     | deser     | 10       | 550  |
| Smoothie zielone ze szpinakiem i bananem              | sniadanie | 7        | 290  |
| Sorbet truskawkowy                                    | deser     | 240      | 270  |
| Spaghetti Aglio e Olio                                | obiad     | 20       | 380  |
| Spaghetti bolognese                                   | obiad     | 90       | 600  |
| Spaghetti carbonara                                   | obiad     | 30       | 450  |
| Spring rolls (sajgonki)                               | przekaska | 45       | 340  |
| Stek wołowy                                           | obiad     | 25       | 520  |
| Stek z kalafiora                                      | obiad     | 35       | 200  |
| Stir-fry z wołowiną                                   | obiad     | 40       | 350  |
| Surówka z białej kapusty i ananasa                    | surowka   | 15       | 150  |
| Surówka z brokułów z rodzynkami                       | surowka   | 15       | 230  |
| Surówka z buraka i chrzanu                            | surowka   | 15       | 110  |
| Surówka z cukinii i marchewki                         | surowka   | 15       | 110  |
| Surówka z czerwonej kapusty                           | surowka   | 15       | 150  |
| Surówka z dyni i jabłka                               | surowka   | 15       | 150  |
| Surówka z fenkuła i pomarańczy                        | surowka   | 15       | 180  |
| Surówka z jarmużu i jabłka                            | surowka   | 15       | 180  |
| Surówka z kalafiora na surowo                         | surowka   | 15       | 150  |
| Surówka z kalarepy                                    | surowka   | 15       | 140  |
| Surówka z kiszonej kapusty                            | surowka   | 15       | 60   |
| Surówka z ogórka kiszonego i cebuli                   | surowka   | 10       | 95   |
| Surówka z pora i jabłka                               | surowka   | 15       | 180  |
| Surówka z rzepy i marchewki                           | surowka   | 15       | 120  |
| Surówka z rzodkiewki i szczypiorku                    | surowka   | 10       | 95   |
| Surówka z selera i jabłka                             | surowka   | 15       | 180  |
| Sushi bez zawijania                                   | obiad     | 40       | 450  |
| Szarlotka                                             | deser     | 75       | 550  |
| Szaszłyki caprese na patyczkach                       | przekaska | 15       | 230  |
| Szaszłyki z kurczaka i warzyw                         | obiad     | 45       | 410  |
| Szczawiowa z jajkiem                                  | zupa      | 40       | 320  |
| Sznycel wiedeński                                     | obiad     | 30       | 650  |
| Szybkie leczo z kiełbasą i papryką                    | kolacja   | 30       | 650  |
| Śliwki w boczku                                       | przekaska | 30       | 280  |
| Tacos z mięsem mielonym i warzywami                   | kolacja   | 30       | 850  |
| Tagliatelle z boczniakami                             | obiad     | 30       | 450  |
| Tagliatelle z polędwicą wołową                        | obiad     | 35       | 550  |
| Tapenada z oliwek                                     | przekaska | 10       | 210  |
| Tarta warzywna                                        | kolacja   | 60       | 880  |
| Tartinki z serkiem i łososiem                         | przekaska | 10       | 320  |
| Tiramisu                                              | deser     | 30       | 600  |
| Tofu w sosie teriyaki                                 | obiad     | 30       | 520  |
| Tom kha z kurczakiem                                  | zupa      | 35       | 480  |
| Tortilla kebab                                        | obiad     | 30       | 600  |
| Tortilla śniadaniowa z jajecznicą                     | sniadanie | 15       | 520  |
| Tortilla z kurczakiem, warzywami i sosem czosnkowym   | kolacja   | 25       | 660  |
| Tortilla z serem, jajkiem i szynką                    | kolacja   | 10       | 390  |
| Tortilla zapiekana z tuńczykiem                       | kolacja   | 25       | 540  |
| Tosty francuskie na słodko                            | deser     | 15       | 460  |
| Tosty francuskie na słono                             | przekaska | 15       | 470  |
| Tosty z serem i szynką                                | sniadanie | 10       | 530  |
| Twarożek z rzodkiewką i szczypiorkiem                 | sniadanie | 10       | 290  |
| Wątróbka drobiowa z cebulą                            | obiad     | 30       | 420  |
| Wrap z falafelem i hummusem                           | kolacja   | 25       | 610  |
| Wrap z jajkiem, bekonem i sałatą                      | kolacja   | 15       | 660  |
| Wrap z kurczakiem i warzywami                         | kolacja   | 20       | 580  |
| Wrap z mięsem mielonym, serem i warzywami             | kolacja   | 25       | 900  |
| Zalewajka                                             | zupa      | 45       | 380  |
| Zapiekane bagietki z serem, pieczarkami i szynką      | kolacja   | 25       | 700  |
| Zapiekane jajka z warzywami                           | kolacja   | 30       | 380  |
| Zapiekane ziemniaki z serem pleśniowym                | kolacja   | 50       | 620  |
| Zapiekanka makaronowa z kurczakiem                    | obiad     | 50       | 680  |
| Zapiekanka z bakłażana z serem                        | kolacja   | 50       | 430  |
| Zapiekanka z brokułami i kurczakiem                   | kolacja   | 45       | 520  |
| Zapiekanka z kalafiora                                | kolacja   | 50       | 430  |
| Zapiekanka ziemniaczana z mięsem mielonym             | obiad     | 70       | 650  |
| Zapiekanki                                            | obiad     | 30       | 600  |
| Zrazy wołowe zawijane                                 | obiad     | 110      | 580  |
| Zupa cukiniowa z serkiem topionym                     | zupa      | 30       | 240  |
| Zupa cytrynowa                                        | zupa      | 40       | 330  |
| Zupa dyniowa z imbirem                                | zupa      | 40       | 260  |
| Zupa fasolowa                                         | zupa      | 60       | 420  |
| Zupa grzybowa                                         | zupa      | 45       | 280  |
| Zupa kalarepowa                                       | zupa      | 40       | 260  |
| Zupa koperkowa                                        | zupa      | 35       | 280  |
| Zupa krem z batatów                                   | kolacja   | 40       | 600  |
| Zupa krem z brokułem i cukinią                        | zupa      | 30       | 330  |
| Zupa krem z pomidorów z grzankami                     | kolacja   | 30       | 430  |
| Zupa marchewkowo-imbirowa                             | zupa      | 35       | 210  |
| Zupa miso z tofu                                      | kolacja   | 20       | 170  |
| Zupa neapolitańska                                    | zupa      | 40       | 320  |
| Zupa owocowa z makaronem                              | zupa      | 25       | 290  |
| Zupa porowa z ziemniakami                             | zupa      | 35       | 320  |
| Zupa ramen z kurczakiem                               | zupa      | 40       | 620  |
| Zupa rybna                                            | zupa      | 45       | 320  |
| Zupa selerowa z grzankami                             | zupa      | 40       | 320  |
| Zupa z ciecierzycy i pomidorów                        | zupa      | 35       | 390  |
| Zupa z soczewicy czerwonej                            | zupa      | 35       | 390  |
| Zupa ziemniaczana z boczkiem                          | zupa      | 40       | 420  |
| Żeberka pieczone w miodzie i musztardzie              | obiad     | 120      | 660  |
| Żur                                                   | zupa      | 60       | 450  |
