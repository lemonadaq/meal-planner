# Lista dań — Menu Planer

Stan bazy `dania` na 2026-07-07 (275 dań) — nazwa, rodzaj, czas przyrządzania, kcal na 1 porcję.
Do przeglądu przy wymyślaniu nowych dań (unikanie dubli) i jako punkt odniesienia.

Odświeżenie listy (Supabase SQL Editor):

```sql
select "Danie" as danie, max(rodzaj) as rodzaj, max(czas_minuty) as czas_min, max(kcal) as kcal
from dania
group by "Danie"
order by "Danie";
```

| danie                                                 | rodzaj    | czas_min | kcal |
| ----------------------------------------------------- | --------- | -------- | ---- |
| Bagietka                                              | dodatek   | 5        | 160  |
| Bagietka z masłem czosnkowym                          | przekaska | 20       | 670  |
| Bakłażan w panko                                      | przekaska | 30       | 700  |
| Banany smażone z miodem i cynamonem                   | deser     | 15       | 340  |
| Banany w cieście naleśnikowym                         | przekaska | 20       | 520  |
| Barszcz czerwony                                      | zupa      | 90       | 150  |
| Batat pieczony                                        | dodatek   | 45       | 110  |
| Bigos                                                 | obiad     | 180      | 560  |
| Bitki wołowe w sosie własnym                          | obiad     | 90       | 300  |
| Breakfast Burrito                                     | sniadanie | 20       | 800  |
| Brownie czekoladowe                                   | deser     | 45       | 480  |
| Brownie z patelni                                     | deser     | 25       | 650  |
| Bruschetta z pomidorami i bazylią                     | przekaska | 15       | 470  |
| Budyń czekoladowy                                     | deser     | 15       | 410  |
| Budyń waniliowy z owocami                             | deser     | 20       | 380  |
| Bułeczki jak z Maka                                   | obiad     | 10       | 350  |
| Bułka                                                 | dodatek   | 5        | 160  |
| Bułka grahamka                                        | dodatek   | 5        | 150  |
| Buraczki                                              | surowka   | 60       | 40   |
| Burger wołowy                                         | obiad     | 30       | 480  |
| Burrito z mieloną wołowiną                            | obiad     | 40       | 610  |
| Butter Chicken                                        | obiad     | 40       | 700  |
| Camembert pieczony z żurawiną                         | przekaska | 25       | 550  |
| Carpaccio z buraka na grzankach                       | przekaska | 25       | 590  |
| Cebulowa (po francusku)                               | zupa      | 60       | 450  |
| Chia pudding z mango                                  | deser     | 240      | 660  |
| Chilli con carne                                      | obiad     | 60       | 860  |
| Chipsy z jarmużu                                      | przekaska | 25       | 150  |
| Chipsy z tortilli z dipem jogurtowym                  | przekaska | 20       | 600  |
| Chleb                                                 | dodatek   | 5        | 150  |
| Chleb w jajku                                         | sniadanie | 10       | 350  |
| Chleb w jajku z serem                                 | kolacja   | 15       | 430  |
| Chłodnik litewski                                     | zupa      | 20       | 370  |
| Chrupiąca ciecierzyca z piekarnika                    | przekaska | 40       | 240  |
| Chrupiące kąski z kurczaka                            | przekaska | 30       | 600  |
| Ciasto francuskie z jabłkiem i cynamonem              | deser     | 35       | 640  |
| Ciasto marchewkowe                                    | deser     | 75       | 520  |
| Colesław                                              | surowka   | 15       | 100  |
| Croque Monsieur/Madame                                | sniadanie | 20       | 750  |
| Cukinia w panierce                                    | przekaska | 25       | 420  |
| Daktyle z masłem orzechowym                           | przekaska | 10       | 460  |
| Deser z mascarpone, herbatnikami i owocami            | deser     | 20       | 600  |
| Deska serów i wędlin                                  | przekaska | 20       | 650  |
| Domowe hot dogi z prażoną cebulką                     | kolacja   | 25       | 640  |
| Dorsz panierowany                                     | obiad     | 35       | 450  |
| Dorsz z piekarnika                                    | obiad     | 35       | 280  |
| Fasolka po bretońsku                                  | obiad     | 120      | 950  |
| Faszerowana pierś kurczaka                            | obiad     | 45       | 320  |
| Flaki                                                 | zupa      | 180      | 300  |
| Frytki                                                | dodatek   | 30       | 300  |
| Frytki z batatów                                      | przekaska | 40       | 320  |
| Galaretka z owocami                                   | deser     | 15       | 220  |
| Gazpacho                                              | zupa      | 20       | 230  |
| Gnocchi z masłem, czosnkiem i parmezanem              | kolacja   | 20       | 740  |
| Gofrowe kąski                                         | przekaska | 25       | 530  |
| Gofry z owocami i bitą śmietaną                       | deser     | 30       | 620  |
| Grochówka                                             | zupa      | 120      | 550  |
| Grzanki czosnkowe z serem                             | przekaska | 15       | 650  |
| Grzanki z awokado, jajkiem i pomidorem                | kolacja   | 15       | 450  |
| Guacamole                                             | przekaska | 15       | 290  |
| Gulasz domowy (sos mięsny)                            | obiad     | 120      | 480  |
| Gulaszowa                                             | zupa      | 75       | 500  |
| Gyros domowy z sosem czosnkowym                       | obiad     | 60       | 480  |
| Huevos Rancheros                                      | sniadanie | 25       | 700  |
| Jabłka pieczone z cynamonem                           | deser     | 40       | 290  |
| Jabłka w cieście                                      | przekaska | 30       | 700  |
| Jabłka w cieście naleśnikowym                         | deser     | 25       | 540  |
| Jajecznica                                            | sniadanie | 10       | 340  |
| Jajecznica z boczkiem i szczypiorkiem                 | kolacja   | 15       | 530  |
| Jajka faszerowane                                     | przekaska | 25       | 260  |
| Jajka na miękko                                       | sniadanie | 7        | 150  |
| Jajka na twardo z majonezem                           | sniadanie | 15       | 250  |
| Jajka po turecku*                                     | sniadanie | 15       | 590  |
| Jajka sadzone z boczkiem                              | sniadanie | 10       | 450  |
| Jajka sadzone z ziemniakami z patelni i mizerią       | kolacja   | 30       | 690  |
| Jajka w majonezie ze szczypiorkiem                    | przekaska | 15       | 360  |
| Jajka z papryką                                       | obiad     | 15       | 350  |
| Jarzynowa                                             | zupa      | 45       | 260  |
| Jogurt grecki z miodem i orzechami                    | deser     | 5        | 580  |
| Kalafiorowa                                           | zupa      | 40       | 370  |
| Kanapki jak ze szkoły                                 | przekaska | 10       | 460  |
| Kanapki na ciepło z mozzarellą, pomidorem i szynką    | kolacja   | 15       | 470  |
| Kanapki z jajkiem                                     | sniadanie | 15       | 480  |
| Kanapki z łososiem i twarożkiem                       | kolacja   | 10       | 370  |
| Kanapki z serem i wędliną                             | sniadanie | 10       | 430  |
| Kanapki z twarogiem i miodem                          | sniadanie | 5        | 440  |
| Kapsalon                                              | obiad     | 45       | 410  |
| Kapuśniak                                             | zupa      | 90       | 420  |
| Kasza bulgur                                          | dodatek   | 20       | 280  |
| Kasza bulgur z kurczakiem, papryką i sosem jogurtowym | kolacja   | 30       | 620  |
| Kasza gryczana                                        | dodatek   | 20       | 280  |
| Kasza jaglana                                         | dodatek   | 20       | 280  |
| Kasza jęczmienna                                      | dodatek   | 20       | 280  |
| Kasza manna z sokiem malinowym                        | deser     | 15       | 360  |
| Kisiel owocowy                                        | deser     | 20       | 260  |
| Kluski z serem i skwarkami                            | obiad     | 25       | 540  |
| Koktajl bananowo-truskawkowy                          | deser     | 10       | 380  |
| Koktajl owocowy z jogurtem                            | deser     | 10       | 370  |
| Kopytka z cebulką                                     | obiad     | 60       | 700  |
| Koreczki                                              | przekaska | 15       | 250  |
| Kotlet schabowy                                       | obiad     | 45       | 500  |
| Kotlety mielone                                       | obiad     | 40       | 550  |
| Krakersy z serkiem i ogórkiem                         | przekaska | 10       | 210  |
| Krążki cebulowe                                       | przekaska | 30       | 580  |
| Krem budyniowy z bananami                             | deser     | 20       | 460  |
| Krem z mascarpone i kajmaku                           | deser     | 15       | 550  |
| Krokiety z kapustą kiszoną i grzybami                 | obiad     | 90       | 450  |
| Krupnik                                               | zupa      | 60       | 480  |
| Kulki kokosowe                                        | przekaska | 20       | 400  |
| Kulki mocy z płatków owsianych                        | przekaska | 20       | 480  |
| Kulki owsiane z masłem orzechowym i miodem            | deser     | 20       | 360  |
| Kulki serowe w panierce                               | przekaska | 30       | 700  |
| Kurczak curry z ryżem                                 | kolacja   | 35       | 740  |
| Kurczak po chińsku                                    | obiad     | 50       | 380  |
| Kurczak w panko                                       | przekaska | 30       | 650  |
| Kuskus                                                | dodatek   | 10       | 300  |
| Kuskus z kurczakiem i warzywami                       | kolacja   | 30       | 700  |
| Lasagne Bolognese                                     | obiad     | 90       | 750  |
| Leczo                                                 | obiad     | 40       | 250  |
| Lody domowe waniliowe                                 | deser     | 240      | 490  |
| Lody z jogurtu i owoców                               | deser     | 240      | 340  |
| Makaron penne                                         | dodatek   | 15       | 360  |
| Makaron spaghetti                                     | dodatek   | 15       | 360  |
| Makaron świderki                                      | dodatek   | 15       | 360  |
| Makaron z kiełbasą, cebulą i passatą                  | kolacja   | 25       | 900  |
| Makaron z kiełbaską i sosem pieczarkowym              | obiad     | 25       | 780  |
| Makaron z kurczakiem w sosie pomidorowym              | obiad     | 30       | 490  |
| Makaron z kurczakiem, brokułem i sosem śmietanowym    | kolacja   | 25       | 850  |
| Makaron z pesto i oliwkami                            | obiad     | 20       | 570  |
| Makaron z pesto, kurczakiem i pomidorkami             | kolacja   | 25       | 800  |
| Makaron z pomidorami, czosnkiem i parmezanem          | kolacja   | 20       | 680  |
| Makaron z serem, boczkiem i cebulką                   | kolacja   | 25       | 800  |
| Makaron z warzywami w sosie serowym                   | obiad     | 30       | 470  |
| Makowiec rolowany                                     | deser     | 120      | 450  |
| Marry me chicken gnocchi                              | obiad     | 40       | 520  |
| Migdały prażone z papryką                             | przekaska | 15       | 670  |
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
| Mozzarella sticks                                     | przekaska | 30       | 600  |
| Mug cake czekoladowy z mikrofali                      | deser     | 5        | 690  |
| Mus czekoladowy z banana i kakao                      | deser     | 10       | 170  |
| Nachosy z sosem serowym                               | przekaska | 15       | 700  |
| Naleśniki crêpes Suzette (pomarańczowe)*              | sniadanie | 30       | 760  |
| Naleśniki wytrawne z serem i szynką                   | kolacja   | 30       | 750  |
| Naleśniki z boczkiem                                  | sniadanie | 25       | 750  |
| Naleśniki z dżemem                                    | sniadanie | 25       | 580  |
| Naleśniki z dżemem i bitą śmietaną                    | deser     | 30       | 650  |
| Nuggetsy domowe                                       | przekaska | 30       | 550  |
| Ogórkowa                                              | zupa      | 60       | 400  |
| Omlet                                                 | sniadanie | 10       | 350  |
| Omlet z serem, szynką i warzywami                     | kolacja   | 15       | 490  |
| Orzeszki w miodzie i chili                            | przekaska | 20       | 640  |
| Owocowa sałatka z miętą                               | deser     | 15       | 210  |
| Owsianka                                              | sniadanie | 10       | 540  |
| Owsianka kakaowa z bananem                            | deser     | 10       | 500  |
| Owsianka nocna                                        | sniadanie | 480      | 450  |
| Paluszki z ciasta francuskiego z szynką               | przekaska | 25       | 620  |
| Panierowana pierś kurczaka                            | obiad     | 40       | 400  |
| Panini z kurczakiem, serem i sosem BBQ                | kolacja   | 20       | 720  |
| Panna cotta z owocami                                 | deser     | 240      | 610  |
| Parówki                                               | sniadanie | 10       | 500  |
| Parówki w cieście francuskim                          | przekaska | 25       | 660  |
| Pasta jajeczna                                        | sniadanie | 15       | 340  |
| Pasta jajeczna na krakersach                          | przekaska | 15       | 330  |
| Pasta z awokado i jajka                               | sniadanie | 10       | 310  |
| Pasta z makreli wędzonej                              | sniadanie | 10       | 530  |
| Pieczarkowa                                           | zupa      | 40       | 380  |
| Pieczona owsianka                                     | sniadanie | 45       | 650  |
| Pieczone pieczarki z serem                            | przekaska | 30       | 320  |
| Pieczone udka kurczaka                                | obiad     | 70       | 350  |
| Pieczone ziemniaczki z dipem                          | przekaska | 45       | 630  |
| Pierogi ruskie                                        | obiad     | 90       | 640  |
| Pierogi z mięsem                                      | obiad     | 120      | 640  |
| Pizza domowa                                          | obiad     | 120      | 760  |
| Pizza na tortilli                                     | kolacja   | 20       | 540  |
| Pizzerinki                                            | przekaska | 25       | 700  |
| Placki bananowe z „chrupką”                           | sniadanie | 20       | 590  |
| Placki bananowe z jogurtem i owocami                  | deser     | 20       | 550  |
| Placki ziemniaczane mini                              | przekaska | 30       | 380  |
| Placki ziemniaczane z sosem czosnkowym                | kolacja   | 40       | 730  |
| Placki ziemniaczane ze śmietaną                       | obiad     | 45       | 460  |
| Placuszki twarogowe                                   | deser     | 25       | 530  |
| Płatki z mlekiem                                      | sniadanie | 3        | 310  |
| Polędwiczka wieprzowa z kurkami                       | obiad     | 50       | 440  |
| Pomidorówka                                           | zupa      | 40       | 380  |
| Popcorn karmelowy                                     | przekaska | 20       | 730  |
| Prażona kukurydza z masłem                            | przekaska | 10       | 420  |
| Pstrąg pieczony z masłem czosnkowym                   | obiad     | 40       | 400  |
| Pulpety w sosie koperkowym                            | obiad     | 60       | 450  |
| Puree ziemniaczane                                    | dodatek   | 25       | 200  |
| Pyzy/kluski śląskie                                   | obiad     | 90       | 560  |
| Quesadilla z serem i fasolą                           | kolacja   | 15       | 900  |
| Quesadilla z serem i kurczakiem                       | przekaska | 20       | 750  |
| Quesadilla z serem, kurczakiem i papryką              | kolacja   | 20       | 790  |
| Quesadilla z szarpaną wieprzowiną                     | obiad     | 180      | 710  |
| Quinoa                                                | dodatek   | 20       | 300  |
| Racuchy jabłkowe mini                                 | przekaska | 25       | 570  |
| Racuchy z jabłkami                                    | deser     | 30       | 650  |
| Risotto z warzywami                                   | obiad     | 40       | 350  |
| Roladki z cukinii z serkiem                           | przekaska | 30       | 330  |
| Roladki z szynki i serka                              | przekaska | 15       | 280  |
| Rosół                                                 | zupa      | 150      | 430  |
| Ryba po grecku                                        | obiad     | 60       | 350  |
| Ryż biały                                             | dodatek   | 20       | 350  |
| Ryż brązowy                                           | dodatek   | 35       | 350  |
| Ryż na mleku z cynamonem i jabłkiem                   | deser     | 30       | 490  |
| Ryż smażony z jajkiem, kurczakiem i warzywami         | kolacja   | 25       | 620  |
| Ryż z warzywami stir-fry                              | kolacja   | 25       | 520  |
| Sałatka caprese                                       | kolacja   | 10       | 530  |
| Sałatka caprese w kubeczku                            | przekaska | 15       | 280  |
| Sałatka cezar z kurczakiem                            | kolacja   | 25       | 620  |
| Sałatka grecka z fetą                                 | kolacja   | 15       | 510  |
| Sałatka gyros                                         | przekaska | 30       | 500  |
| Sałatka makaronowa z kurczakiem i kukurydzą           | kolacja   | 25       | 730  |
| Sałatka z jajkiem, bekonem i grzankami                | kolacja   | 20       | 740  |
| Sałatka z kurczakiem, fetą i grzankami                | kolacja   | 25       | 640  |
| Sałatka z tuńczykiem i jajkiem                        | kolacja   | 15       | 370  |
| Sałatka zielona                                       | surowka   | 10       | 30   |
| Ser halloumi z patelni                                | przekaska | 10       | 430  |
| Serek waniliowy z owocami i granolą                   | deser     | 10       | 480  |
| Serniczek na zimno w pucharku                         | deser     | 20       | 600  |
| Sernik na zimno                                       | deser     | 30       | 550  |
| Shakshuka z jajkami i pomidorami                      | kolacja   | 25       | 470  |
| Skrzydełka BBQ                                        | przekaska | 50       | 620  |
| Słupki warzywne z hummusem                            | przekaska | 15       | 330  |
| Smoothie bowl z owocami i granolą                     | deser     | 10       | 550  |
| Sorbet truskawkowy                                    | deser     | 240      | 270  |
| Spaghetti Aglio e Olio                                | obiad     | 20       | 380  |
| Spaghetti bolognese                                   | obiad     | 90       | 600  |
| Spaghetti carbonara                                   | obiad     | 30       | 450  |
| Spring rolls (sajgonki)                               | przekaska | 45       | 340  |
| Stek wołowy                                           | obiad     | 25       | 520  |
| Stek z kalafiora                                      | obiad     | 35       | 200  |
| Stir-fry z wołowiną                                   | obiad     | 40       | 350  |
| Surówka z kapusty                                     | surowka   | 15       | 30   |
| Surówka z kiszonej kapusty                            | surowka   | 15       | 60   |
| Surówka z marchewki                                   | surowka   | 10       | 40   |
| Sushi bez zawijania                                   | obiad     | 40       | 450  |
| Szarlotka                                             | deser     | 75       | 550  |
| Szybkie leczo z kiełbasą i papryką                    | kolacja   | 30       | 650  |
| Tacos z mięsem mielonym i warzywami                   | kolacja   | 30       | 850  |
| Tagliatelle z boczniakami                             | obiad     | 30       | 450  |
| Tagliatelle z polędwicą wołową                        | obiad     | 35       | 550  |
| Tarta warzywna                                        | kolacja   | 60       | 880  |
| Tiramisu                                              | deser     | 30       | 600  |
| Tortilla kebab                                        | obiad     | 30       | 600  |
| Tortilla pizza z serem, salami i pieczarkami          | kolacja   | 20       | 560  |
| Tortilla z kurczakiem, warzywami i sosem czosnkowym   | kolacja   | 25       | 660  |
| Tortilla z serem, jajkiem i szynką                    | kolacja   | 10       | 390  |
| Tosty francuskie na słodko                            | deser     | 15       | 460  |
| Tosty francuskie na słono                             | przekaska | 15       | 470  |
| Tosty francuskie na słono z serem i szynką            | kolacja   | 15       | 500  |
| Tosty z serem i szynką                                | sniadanie | 10       | 530  |
| Tosty z serem, szynką i ogórkiem kiszonym             | kolacja   | 15       | 380  |
| Twarożek                                              | sniadanie | 10       | 270  |
| Wrap z jajkiem, bekonem i sałatą                      | kolacja   | 15       | 660  |
| Wrap z kurczakiem i warzywami                         | kolacja   | 20       | 580  |
| Wrap z mięsem mielonym, serem i warzywami             | kolacja   | 25       | 900  |
| Zapiekane bagietki z serem, pieczarkami i szynką      | kolacja   | 25       | 700  |
| Zapiekanki                                            | obiad     | 30       | 600  |
| Żeberka pieczone w miodzie i musztardzie              | obiad     | 120      | 660  |
| Ziemniaki gotowane                                    | dodatek   | 25       | 150  |
| Ziemniaki pieczone                                    | dodatek   | 50       | 170  |
| Zupa krem z batatów                                   | kolacja   | 40       | 600  |
| Zupa krem z brokułem i cukinią                        | zupa      | 30       | 330  |
| Zupa krem z pomidorów z grzankami                     | kolacja   | 30       | 430  |
| Zupa miso z tofu                                      | kolacja   | 20       | 170  |
| Żur                                                   | zupa      | 60       | 450  |
