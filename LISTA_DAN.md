# Lista dań — Menu Planer

Stan bazy `dania` na 2026-10-25 (830 dań) — nazwa, rodzaj, czas
przyrządzania, kcal na 1 porcję. Do przeglądu przy wymyślaniu nowych dań
(unikanie dubli) i jako punkt odniesienia.

Rozkład: obiad 237, kolacja 128, deser 119, przekaska 104, zupa 82, sniadanie 80, surowka 58, dodatek 22.

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
| Affogato al caffè                                     | deser     | 5        | 230  |
| Amaretti                                              | deser     | 40       | 260  |
| Apfelstrudel                                          | deser     | 70       | 360  |
| Arancini z ryżu                                       | przekaska | 45       | 520  |
| Babka marmurkowa                                      | deser     | 75       | 350  |
| Babka piaskowa                                        | deser     | 75       | 320  |
| Bajgle z serkiem i ogórkiem                           | sniadanie | 10       | 390  |
| Baklava                                               | deser     | 90       | 420  |
| Bakłażan duszony w gochujangu                         | obiad     | 30       | 420  |
| Bakłażan faszerowany mięsem                           | obiad     | 70       | 450  |
| Bakłażan w panko                                      | przekaska | 30       | 700  |
| Bakłażan w sosie yuxiang                              | obiad     | 35       | 420  |
| Banana bread                                          | deser     | 70       | 320  |
| Banany smażone z miodem i cynamonem                   | deser     | 15       | 340  |
| Banany w cieście naleśnikowym                         | przekaska | 20       | 520  |
| Barszcz biały z białą kiełbasą                        | zupa      | 50       | 520  |
| Barszcz czerwony                                      | zupa      | 90       | 150  |
| Barszcz ukraiński                                     | zupa      | 60       | 280  |
| Barszcz z uszkami                                     | zupa      | 120      | 280  |
| Beza Pavlova z owocami                                | deser     | 100      | 320  |
| Bibimbap z tofu                                       | obiad     | 35       | 620  |
| Bibimbap z wołowiną                                   | obiad     | 40       | 650  |
| Bigos                                                 | obiad     | 180      | 560  |
| Bistecca alla pizzaiola                               | obiad     | 40       | 420  |
| Bitki wołowe w sosie własnym                          | obiad     | 90       | 300  |
| Blanquette de veau                                    | obiad     | 120      | 540  |
| Bocconcini w oliwie z ziołami                         | przekaska | 10       | 320  |
| Boeuf bourguignon                                     | obiad     | 180      | 580  |
| Boeuf Strogonow                                       | obiad     | 45       | 620  |
| Bomboloni                                             | deser     | 40       | 420  |
| Botwinka z jajkiem                                    | zupa      | 40       | 230  |
| Bouillabaisse                                         | zupa      | 90       | 420  |
| Brandade de morue                                     | obiad     | 60       | 450  |
| Breakfast Burrito                                     | sniadanie | 20       | 800  |
| Brokuł z masłem i bułką tartą                         | dodatek   | 20       | 180  |
| Brownie czekoladowe                                   | deser     | 45       | 480  |
| Brownie z patelni                                     | deser     | 25       | 650  |
| Bruschetta z mozzarellą i rukolą                      | kolacja   | 15       | 420  |
| Bruschetta z pieczarkami                              | przekaska | 20       | 320  |
| Bruschetta z pomidorami i bazylią                     | przekaska | 15       | 470  |
| Budae jjigae z parówkami i tofu                       | kolacja   | 30       | 620  |
| Budyń chałwowy                                        | deser     | 20       | 280  |
| Budyń czekoladowy                                     | deser     | 15       | 410  |
| Budyń mango z tapioką                                 | deser     | 25       | 320  |
| Budyń waniliowy z owocami                             | deser     | 20       | 380  |
| Bulgogi wieprzowe w gochujangu                        | obiad     | 35       | 620  |
| Bulgogi wołowe                                        | obiad     | 40       | 620  |
| Bułeczki bao z nadzieniem wieprzowym                  | przekaska | 150      | 540  |
| Bułeczki cynamonowe                                   | deser     | 150      | 390  |
| Bułeczki jak z Maka                                   | obiad     | 10       | 350  |
| Bułki śniadaniowe z dyni                              | sniadanie | 120      | 290  |
| Bungeoppang z pastą z czerwonej fasoli                | deser     | 40       | 320  |
| Buraczki                                              | surowka   | 60       | 40   |
| Burger wołowy                                         | obiad     | 30       | 950  |
| Burgery z soczewicy                                   | obiad     | 40       | 520  |
| Burrito z mieloną wołowiną                            | obiad     | 40       | 610  |
| Butter Chicken                                        | obiad     | 40       | 700  |
| Calzone z szynką i ricottą                            | obiad     | 45       | 720  |
| Camembert pieczony z żurawiną                         | przekaska | 25       | 550  |
| Cannelloni ze szpinakiem i ricottą                    | obiad     | 60       | 620  |
| Cannoli siciliane                                     | deser     | 60       | 520  |
| Cantuccini z migdałami                                | deser     | 60       | 320  |
| Caponata z bakłażana                                  | przekaska | 45       | 260  |
| Carpaccio wołowe z rukolą                             | kolacja   | 20       | 330  |
| Carpaccio z buraka na grzankach                       | przekaska | 25       | 590  |
| Cebulowa (po francusku)                               | zupa      | 60       | 450  |
| Chałka drożdżowa                                      | deser     | 130      | 280  |
| Chałka z masłem i miodem                              | sniadanie | 10       | 430  |
| Chia pudding z mango                                  | deser     | 240      | 660  |
| Chilaquiles z jajkiem                                 | sniadanie | 25       | 480  |
| Chilli con carne                                      | obiad     | 60       | 860  |
| Chińska zupa pikantno kwaśna                          | zupa      | 30       | 280  |
| Chipsy z buraka                                       | przekaska | 40       | 150  |
| Chipsy z jarmużu                                      | przekaska | 25       | 150  |
| Chipsy z tortilli z dipem jogurtowym                  | przekaska | 20       | 600  |
| Chleb pita z jajkiem i hummusem                       | sniadanie | 20       | 420  |
| Chleb w jajku                                         | sniadanie | 10       | 350  |
| Chłodnik litewski                                     | zupa      | 20       | 370  |
| Chłodnik ogórkowy z koperkiem                         | zupa      | 15       | 180  |
| Chłodnik z arbuza i fety                              | zupa      | 20       | 220  |
| Chow fun z wołowiną                                   | obiad     | 30       | 650  |
| Chow mein z kurczakiem                                | obiad     | 30       | 620  |
| Chrupiąca ciecierzyca z piekarnika                    | przekaska | 40       | 240  |
| Chrupiące chili w oleju                               | dodatek   | 30       | 180  |
| Chrupiące kąski z kurczaka                            | przekaska | 30       | 600  |
| Chrupiące wontony smażone                             | przekaska | 40       | 420  |
| Churros z czekoladą                                   | deser     | 45       | 450  |
| Ciambellone                                           | deser     | 60       | 390  |
| Ciasteczka owsiane z rodzynkami                       | deser     | 35       | 240  |
| Ciasteczka z wróżbą                                   | deser     | 40       | 180  |
| Ciasto czekoladowe z wiśniami                         | deser     | 60       | 420  |
| Ciasto drożdżowe z kruszonką                          | deser     | 120      | 390  |
| Ciasto francuskie z jabłkiem i cynamonem              | deser     | 35       | 640  |
| Ciasto marchewkowe                                    | deser     | 75       | 520  |
| Ciasto ucierane z owocami                             | deser     | 60       | 320  |
| Ciasto z morelami i migdałami                         | deser     | 70       | 340  |
| Clafoutis z czereśniami                               | deser     | 50       | 290  |
| Clam chowder                                          | zupa      | 45       | 420  |
| Cobb salad                                            | kolacja   | 30       | 480  |
| Colesław                                              | surowka   | 15       | 100  |
| Confit de canard                                      | obiad     | 180      | 620  |
| Coq au vin                                            | obiad     | 110      | 610  |
| Cornbread                                             | dodatek   | 40       | 280  |
| Cornetto z kremem                                     | sniadanie | 35       | 420  |
| Cotoletta alla milanese                               | obiad     | 30       | 720  |
| Crema catalana                                        | deser     | 40       | 300  |
| Crème brûlée                                          | deser     | 70       | 420  |
| Crespelle zapiekane z szynką i beszamelem             | kolacja   | 50       | 620  |
| Croissanty z szynką i serem                           | sniadanie | 20       | 450  |
| Croque Monsieur/Madame                                | sniadanie | 20       | 750  |
| Crostata z dżemem morelowym                           | deser     | 75       | 390  |
| Crostini z wątróbką drobiową                          | kolacja   | 25       | 420  |
| Cukinia w panierce                                    | przekaska | 25       | 420  |
| Curry z ciecierzycy i szpinaku                        | obiad     | 30       | 520  |
| Czebureki z mięsem                                    | obiad     | 60       | 560  |
| Ćwikła z chrzanem                                     | surowka   | 60       | 70   |
| Daktyle z masłem orzechowym                           | przekaska | 10       | 460  |
| Deser lodowy z gorącymi malinami                      | deser     | 15       | 420  |
| Deser z mascarpone, herbatnikami i owocami            | deser     | 20       | 600  |
| Deska serów i wędlin                                  | przekaska | 20       | 650  |
| Domowe hot dogi z prażoną cebulką                     | kolacja   | 25       | 640  |
| Dorsz panierowany                                     | obiad     | 35       | 450  |
| Dorsz w sosie cytrynowym                              | obiad     | 30       | 420  |
| Dorsz z piekarnika                                    | obiad     | 35       | 280  |
| Drożdżówki z budyniem                                 | deser     | 120      | 340  |
| Duszona wołowina z warzywami korzeniowymi             | obiad     | 120      | 520  |
| Duszone żeberka wołowe po koreańsku                   | obiad     | 150      | 720  |
| Eklerki z kremem                                      | deser     | 90       | 340  |
| Enchiladas z kurczakiem                               | obiad     | 60       | 580  |
| Endywia zapiekana z szynką                            | obiad     | 50       | 420  |
| English breakfast                                     | sniadanie | 30       | 720  |
| Fajitas z kurczakiem                                  | obiad     | 35       | 520  |
| Falafel z sosem tahini                                | kolacja   | 40       | 580  |
| Far breton                                            | deser     | 60       | 300  |
| Farfalle z łososiem i groszkiem                       | obiad     | 25       | 610  |
| Farinata z ciecierzycy                                | kolacja   | 50       | 420  |
| Fasolada                                              | zupa      | 70       | 330  |
| Fasolka po bretońsku                                  | obiad     | 120      | 950  |
| Fasolka szparagowa z bułką tartą                      | dodatek   | 20       | 170  |
| Faszerowana pierś kurczaka                            | obiad     | 45       | 320  |
| Faszerowane papryczki serkiem                         | przekaska | 20       | 230  |
| Fattoush                                              | surowka   | 25       | 260  |
| Faworki                                               | deser     | 60       | 420  |
| Fette biscottate z dżemem i masłem                    | sniadanie | 5        | 330  |
| Fettuccine Alfredo                                    | obiad     | 20       | 780  |
| Filet z indyka w sosie grzybowym                      | obiad     | 40       | 420  |
| Flaki                                                 | zupa      | 180      | 300  |
| Flammekueche z boczkiem                               | kolacja   | 50       | 520  |
| Flan karmelowy                                        | deser     | 80       | 300  |
| Focaccia z pomidorkami i oliwkami                     | kolacja   | 110      | 420  |
| Focaccia z rozmarynem i solą morską                   | przekaska | 110      | 320  |
| Frittata z cukinią i parmezanem                       | kolacja   | 25       | 410  |
| Frittata z ziemniakami i cebulą                       | sniadanie | 30       | 450  |
| Fritto misto z owoców morza                           | przekaska | 30       | 540  |
| Frytki z batatów                                      | przekaska | 40       | 320  |
| Frytki z majonezem gochujang                          | przekaska | 30       | 610  |
| Galaretka z owocami                                   | deser     | 15       | 220  |
| Galette bretonne z jajkiem                            | kolacja   | 40       | 440  |
| Gazpacho                                              | zupa      | 20       | 230  |
| Gelato pistacjowe                                     | deser     | 40       | 390  |
| Giouvetsi z wołowiną                                  | obiad     | 120      | 590  |
| Gnocchi alla romana                                   | obiad     | 70       | 480  |
| Gnocchi alla sorrentina                               | obiad     | 30       | 610  |
| Gnocchi z gorgonzolą i orzechami                      | obiad     | 25       | 580  |
| Gnocchi z masłem, czosnkiem i parmezanem              | kolacja   | 20       | 740  |
| Gnocchi z sosem pomidorowym i mozzarellą              | kolacja   | 25       | 610  |
| Gochujang jjigae z cukinią                            | zupa      | 25       | 320  |
| Gofrowe kąski                                         | przekaska | 25       | 530  |
| Gofry na słono z serem i szynką                       | sniadanie | 25       | 580  |
| Gofry z owocami i bitą śmietaną                       | deser     | 30       | 620  |
| Gofry z twarogiem                                     | sniadanie | 25       | 400  |
| Golonka pieczona w piwie                              | obiad     | 180      | 880  |
| Gołąbki w sosie pomidorowym                           | obiad     | 90       | 520  |
| Granita cytrynowa                                     | deser     | 20       | 150  |
| Granola domowa z orzechami                            | sniadanie | 35       | 380  |
| Gratin dauphinois                                     | obiad     | 80       | 430  |
| Grissini z szynką parmeńską                           | przekaska | 45       | 320  |
| Grochówka                                             | zupa      | 120      | 550  |
| Grzanki czosnkowe z serem                             | przekaska | 15       | 650  |
| Grzanki z awokado, jajkiem i pomidorem                | kolacja   | 15       | 450  |
| Grzanki z serem żółtym i pomidorem                    | sniadanie | 15       | 420  |
| Guacamole                                             | przekaska | 15       | 290  |
| Gulasz domowy (sos mięsny)                            | obiad     | 120      | 480  |
| Gulasz wieprzowy z kluskami                           | obiad     | 90       | 720  |
| Gulasz z dyni i ciecierzycy                           | obiad     | 45       | 400  |
| Gulasz z indyka z papryką                             | obiad     | 45       | 420  |
| Gulasz z soczewicy                                    | obiad     | 45       | 380  |
| Gulaszowa                                             | zupa      | 75       | 500  |
| Gyros domowy z sosem czosnkowym                       | obiad     | 60       | 480  |
| Hachis parmentier                                     | obiad     | 75       | 520  |
| Hotteok z cynamonem                                   | deser     | 90       | 320  |
| Huevos Rancheros                                      | sniadanie | 25       | 700  |
| Hummus z pieczonym burakiem                           | przekaska | 50       | 270  |
| Imam bayildi                                          | obiad     | 80       | 320  |
| Indyk pieczony z warzywami                            | obiad     | 75       | 480  |
| Indyk w sosie żurawinowym                             | obiad     | 40       | 420  |
| Insalata di farro                                     | surowka   | 35       | 290  |
| Insalata tricolore                                    | surowka   | 10       | 320  |
| Involtini cielęce w sosie pomidorowym                 | obiad     | 60       | 520  |
| Jabłecznik z kruszonką                                | deser     | 90       | 380  |
| Jabłka pieczone z cynamonem                           | deser     | 40       | 290  |
| Jabłka w cieście                                      | przekaska | 30       | 700  |
| Jaglanka z jabłkiem i cynamonem                       | sniadanie | 25       | 420  |
| Jagodzianki z kruszonką                               | deser     | 150      | 340  |
| Jajecznica                                            | sniadanie | 10       | 340  |
| Jajecznica z boczkiem i szczypiorkiem                 | kolacja   | 15       | 530  |
| Jajka faszerowane                                     | przekaska | 25       | 260  |
| Jajka na miękko                                       | sniadanie | 7        | 150  |
| Jajka na twardo z majonezem                           | sniadanie | 15       | 250  |
| Jajka po benedyktyńsku                                | sniadanie | 30       | 620  |
| Jajka po florencku                                    | sniadanie | 30       | 420  |
| Jajka po turecku*                                     | sniadanie | 15       | 590  |
| Jajka przepiórcze w panierce                          | przekaska | 30       | 320  |
| Jajka sadzone na szpinaku                             | sniadanie | 20       | 340  |
| Jajka sadzone z boczkiem                              | sniadanie | 10       | 450  |
| Jajka sadzone z ziemniakami z patelni i mizerią       | kolacja   | 30       | 690  |
| Jajka smażone z pomidorami po chińsku                 | kolacja   | 15       | 390  |
| Jajka w chmurce                                       | sniadanie | 20       | 260  |
| Jajka w koszulce na grzance                           | sniadanie | 15       | 390  |
| Jajka w majonezie ze szczypiorkiem                    | przekaska | 15       | 360  |
| Jajka w sosie chrzanowym                              | sniadanie | 25       | 330  |
| Jajka z papryką                                       | obiad     | 15       | 350  |
| Jajka zapiekane w awokado                             | sniadanie | 25       | 390  |
| Jambalaya z kiełbasą                                  | obiad     | 50       | 560  |
| Japchae z wołowiną                                    | obiad     | 35       | 620  |
| Jarzynowa                                             | zupa      | 45       | 260  |
| Jogurt grecki z miodem i orzechami                    | deser     | 5        | 580  |
| Kaczka pieczona z jabłkami                            | obiad     | 150      | 720  |
| Kaczka po pekińsku                                    | obiad     | 150      | 720  |
| Kalafior marynowany z oliwkami                        | surowka   | 20       | 180  |
| Kalafior pieczony w całości                           | dodatek   | 70       | 250  |
| Kalafiorowa                                           | zupa      | 40       | 370  |
| Kalmary w sosie gochujang                             | obiad     | 25       | 430  |
| Kanapki na ciepło z mozzarellą, pomidorem i szynką    | kolacja   | 15       | 470  |
| Kanapki z jajkiem                                     | sniadanie | 15       | 480  |
| Kanapki z łososiem i twarożkiem                       | kolacja   | 10       | 370  |
| Kanapki z pastą z ciecierzycy                         | kolacja   | 15       | 420  |
| Kanapki z pastą z pieczonej papryki                   | sniadanie | 20       | 420  |
| Kanapki z pastą z tuńczyka                            | sniadanie | 10       | 420  |
| Kanapki z pasztetem i ogórkiem kiszonym               | sniadanie | 10       | 420  |
| Kanapki z serem i wędliną                             | sniadanie | 10       | 430  |
| Kanapki z serem pleśniowym i gruszką                  | kolacja   | 15       | 380  |
| Kanapki z twarogiem i miodem                          | sniadanie | 5        | 440  |
| Kanapki zapiekane z pieczarkami                       | kolacja   | 25       | 480  |
| Kapsalon                                              | obiad     | 45       | 410  |
| Kapusta zasmażana                                     | dodatek   | 40       | 180  |
| Kapuśniak                                             | zupa      | 90       | 420  |
| Karczochy smażone                                     | przekaska | 20       | 230  |
| Karkówka pieczona w piekarniku                        | obiad     | 110      | 520  |
| Karp pieczony w śmietanie                             | obiad     | 70       | 480  |
| Karpatka                                              | deser     | 90       | 430  |
| Käsespätzle z cebulką                                 | obiad     | 50       | 620  |
| Kasza bulgur z kurczakiem, papryką i sosem jogurtowym | kolacja   | 30       | 620  |
| Kasza gryczana z grzybami                             | obiad     | 40       | 390  |
| Kasza manna na mleku                                  | sniadanie | 12       | 320  |
| Kasza manna z sokiem malinowym                        | deser     | 15       | 360  |
| Kaszka kukurydziana z owocami                         | sniadanie | 15       | 380  |
| Kiełki sojowe z sezamem                               | surowka   | 15       | 180  |
| Kimbap warzywny                                       | przekaska | 35       | 420  |
| Kimbap z tuńczykiem                                   | przekaska | 30       | 480  |
| Kimchi jjigae z wieprzowiną                           | zupa      | 35       | 520  |
| Kisiel owocowy                                        | deser     | 20       | 260  |
| Klopsiki szwedzkie w sosie śmietanowym                | obiad     | 45       | 680  |
| Klopsiki w sosie pomidorowym                          | obiad     | 45       | 520  |
| Kluski kładzione                                      | dodatek   | 25       | 230  |
| Kluski lane na mleku                                  | sniadanie | 15       | 420  |
| Kluski z serem i skwarkami                            | obiad     | 25       | 540  |
| Knedle ze śliwkami                                    | deser     | 60       | 380  |
| Köfte z jogurtem                                      | obiad     | 40       | 480  |
| Koktajl bananowo-truskawkowy                          | deser     | 10       | 380  |
| Koktajl owocowy z jogurtem                            | deser     | 10       | 370  |
| Kołaczki z serem                                      | deser     | 100      | 290  |
| Kopytka z cebulką                                     | obiad     | 60       | 700  |
| Kopytka z sosem grzybowym                             | obiad     | 60       | 470  |
| Koreańska owsianka ryżowa z kurczakiem                | sniadanie | 50       | 420  |
| Koreańska zupa z wodorostów                           | zupa      | 25       | 180  |
| Koreański gulasz z kurczaka i ziemniaków              | obiad     | 50       | 620  |
| Koreański omlet parowany                              | sniadanie | 20       | 210  |
| Koreańskie kluski sujebi w bulionie                   | zupa      | 40       | 430  |
| Koreczki                                              | przekaska | 15       | 250  |
| Kotlet de volaille                                    | obiad     | 40       | 650  |
| Kotlet schabowy                                       | obiad     | 45       | 500  |
| Kotlet z indyka z serem                               | obiad     | 35       | 450  |
| Kotlety jajeczne                                      | obiad     | 35       | 380  |
| Kotlety mielone                                       | obiad     | 40       | 550  |
| Kotlety z ciecierzycy                                 | obiad     | 30       | 430  |
| Kotlety z kaszy gryczanej                             | obiad     | 40       | 480  |
| Kotlety z kaszy jaglanej                              | obiad     | 45       | 340  |
| Krakersy z serkiem i ogórkiem                         | przekaska | 10       | 210  |
| Krążki cebulowe                                       | przekaska | 30       | 580  |
| Krążki kalmarów smażone                               | przekaska | 25       | 420  |
| Krem budyniowy z bananami                             | deser     | 20       | 460  |
| Krem z cukinii z miętą                                | zupa      | 30       | 220  |
| Krem z kalafiora z migdałami                          | zupa      | 35       | 320  |
| Krem z karczochów                                     | zupa      | 30       | 290  |
| Krem z mascarpone i kajmaku                           | deser     | 15       | 550  |
| Krem z pieczonej papryki                              | zupa      | 50       | 240  |
| Krem z selera z chipsami z boczku                     | zupa      | 45       | 320  |
| Krem z zielonego groszku z miętą                      | zupa      | 25       | 280  |
| Krem ze szparagów                                     | zupa      | 30       | 260  |
| Kremówka                                              | deser     | 60       | 480  |
| Krewetki smażone z czosnkiem                          | przekaska | 15       | 260  |
| Krewetki w sosie chili po chińsku                     | obiad     | 25       | 410  |
| Krewetki w sosie czosnkowym z makaronem               | obiad     | 25       | 610  |
| Krokiety z kapustą kiszoną i grzybami                 | obiad     | 90       | 450  |
| Krokiety z mięsem                                     | obiad     | 60       | 620  |
| Krokiety z pieczarkami                                | kolacja   | 60       | 520  |
| Krokiety ze szpinakiem i serem                        | kolacja   | 60       | 450  |
| Krokiety ziemniaczane z serem                         | kolacja   | 50       | 440  |
| Krupnik                                               | zupa      | 60       | 480  |
| Kulki kokosowe                                        | przekaska | 20       | 400  |
| Kulki mocy z płatków owsianych                        | przekaska | 20       | 480  |
| Kulki mozzarelli w szynce parmeńskiej                 | przekaska | 15       | 290  |
| Kulki owsiane z masłem orzechowym i miodem            | deser     | 20       | 360  |
| Kulki serowe w panierce                               | przekaska | 30       | 700  |
| Kurczak curry z ryżem                                 | kolacja   | 35       | 740  |
| Kurczak dakgalbi z warzywami                          | obiad     | 35       | 540  |
| Kurczak generała Tso                                  | obiad     | 40       | 620  |
| Kurczak gong bao z orzeszkami                         | obiad     | 30       | 620  |
| Kurczak pieczony w całości                            | obiad     | 100      | 620  |
| Kurczak pieczony z cytryną i czosnkiem                | obiad     | 70       | 480  |
| Kurczak po chińsku                                    | obiad     | 50       | 380  |
| Kurczak tikka masala                                  | obiad     | 45       | 610  |
| Kurczak w panko                                       | przekaska | 30       | 650  |
| Kurczak w sosie koperkowym                            | obiad     | 40       | 420  |
| Kurczak w sosie orzechowym                            | obiad     | 35       | 560  |
| Kurczak w sosie słodko-kwaśnym                        | obiad     | 35       | 540  |
| Kurczak w sosie sojowo czosnkowym po koreańsku        | obiad     | 30       | 610  |
| Kurczak z imbirem i dymką                             | obiad     | 25       | 470  |
| Kuskus z kurczakiem i warzywami                       | kolacja   | 30       | 700  |
| Kwaśnica                                              | zupa      | 90       | 420  |
| Lahmacun                                              | obiad     | 90       | 460  |
| Lasagne Bolognese                                     | obiad     | 90       | 750  |
| Lasagne warzywna                                      | obiad     | 70       | 540  |
| Lasagne ze szpinakiem i ricottą                       | obiad     | 80       | 560  |
| Leczo                                                 | obiad     | 40       | 250  |
| Lo mein z wołowiną                                    | obiad     | 30       | 620  |
| Lody domowe waniliowe                                 | deser     | 240      | 490  |
| Lody z jogurtu i owoców                               | deser     | 240      | 340  |
| Łosoś pieczony z koperkiem                            | obiad     | 30       | 520  |
| Łosoś w sosie teriyaki                                | obiad     | 30       | 480  |
| Mac and cheese                                        | obiad     | 40       | 620  |
| Madeleinki                                            | deser     | 45       | 230  |
| Makaron dan dan z mielonym mięsem                     | obiad     | 30       | 720  |
| Makaron jajangmyeon w sosie z czarnej fasoli          | obiad     | 35       | 720  |
| Makaron na zimno z pomidorkami i mozzarellą           | kolacja   | 20       | 520  |
| Makaron ramyeon z gochujangiem                        | kolacja   | 15       | 610  |
| Makaron z brokułami i czosnkiem                       | kolacja   | 25       | 520  |
| Makaron z dynią i szałwią                             | obiad     | 40       | 480  |
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
| Mapo tofu z mielonym mięsem                           | obiad     | 30       | 560  |
| Marchewka z groszkiem                                 | dodatek   | 25       | 150  |
| Marchewka z sezamem po koreańsku                      | surowka   | 15       | 180  |
| Maritozzo                                             | deser     | 150      | 480  |
| Marry me chicken gnocchi                              | obiad     | 40       | 520  |
| Marynata gochujang do wieprzowiny                     | dodatek   | 10       | 95   |
| Marynowana kapusta pekińska po chińsku                | surowka   | 20       | 95   |
| Marynowana rzodkiew do kimbapu                        | dodatek   | 15       | 45   |
| Marynowane grzyby po włosku                           | surowka   | 25       | 180  |
| Mazurek z masą krówkową                               | deser     | 90       | 420  |
| Menemen                                               | sniadanie | 25       | 340  |
| Migdały prażone z papryką                             | przekaska | 15       | 670  |
| Millefeuille                                          | deser     | 90       | 420  |
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
| Miodowe ciasteczka yakgwa                             | deser     | 60       | 330  |
| Mizeria                                               | surowka   | 15       | 70   |
| Modra kapusta na ciepło                               | dodatek   | 45       | 160  |
| Moules marinière                                      | obiad     | 30       | 320  |
| Moussaka z bakłażanem                                 | obiad     | 80       | 620  |
| Mousse au chocolat                                    | deser     | 30       | 340  |
| Mozzarella sticks                                     | przekaska | 30       | 600  |
| Muffinki jagodowe                                     | deser     | 40       | 290  |
| Mug cake czekoladowy z mikrofali                      | deser     | 5        | 690  |
| Mujaddara                                             | obiad     | 55       | 420  |
| Mus czekoladowy z banana i kakao                      | deser     | 10       | 170  |
| Mus jabłkowy z cynamonem                              | deser     | 30       | 160  |
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
| Naleśniki z serem na słodko                           | deser     | 40       | 420  |
| Naleśniki ze szpinakiem i fetą                        | kolacja   | 30       | 520  |
| Napój ryżowy sikhye                                   | deser     | 300      | 180  |
| Navarin jagnięcy                                      | obiad     | 130      | 560  |
| Nuggetsy domowe                                       | przekaska | 30       | 550  |
| Ogórkowa                                              | zupa      | 60       | 400  |
| Oliwki nadziewane mięsem w panierce                   | przekaska | 40       | 330  |
| Omlet                                                 | sniadanie | 10       | 350  |
| Omlet biszkoptowy z dżemem                            | sniadanie | 15       | 390  |
| Omlet z cukinią i miętą                               | sniadanie | 20       | 320  |
| Omlet z pieczarkami i cebulą                          | sniadanie | 15       | 390  |
| Omlet z pomidorami i serem feta                       | sniadanie | 20       | 370  |
| Omlet z serem, szynką i warzywami                     | kolacja   | 15       | 490  |
| Omlet ze szpinakiem i fetą                            | sniadanie | 15       | 420  |
| Orecchiette z brokułami i anchois                     | obiad     | 25       | 580  |
| Orzeszki w miodzie i chili                            | przekaska | 20       | 640  |
| Ossobuco z gremolatą                                  | obiad     | 150      | 620  |
| Owocowa sałatka z miętą                               | deser     | 15       | 210  |
| Owsianka                                              | sniadanie | 10       | 540  |
| Owsianka kakaowa z bananem                            | deser     | 10       | 500  |
| Owsianka nocna                                        | sniadanie | 480      | 450  |
| Owsianka z jabłkiem i orzechami                       | sniadanie | 15       | 420  |
| Pad thai z kurczakiem                                 | obiad     | 30       | 620  |
| Paella z kurczakiem i owocami morza                   | obiad     | 60       | 580  |
| Pain au chocolat                                      | sniadanie | 30       | 390  |
| Pajeon z dymką                                        | przekaska | 25       | 420  |
| Paluszki serowe z sezamem                             | przekaska | 35       | 330  |
| Paluszki z ciasta francuskiego z szynką               | przekaska | 25       | 620  |
| Pancakes amerykańskie z syropem klonowym              | sniadanie | 25       | 540  |
| Panettone                                             | deser     | 180      | 390  |
| Panierowana pierś kurczaka                            | obiad     | 40       | 400  |
| Panini z kurczakiem, serem i sosem BBQ                | kolacja   | 20       | 720  |
| Panini z mozzarellą i pomidorem                       | kolacja   | 15       | 520  |
| Panino z porchettą                                    | kolacja   | 15       | 720  |
| Panna cotta kawowa                                    | deser     | 30       | 320  |
| Panna cotta z owocami                                 | deser     | 240      | 610  |
| Panzanella                                            | kolacja   | 20       | 420  |
| Panzerotti smażone                                    | przekaska | 90       | 620  |
| Panzerotto pieczone z mozzarellą                      | kolacja   | 90       | 520  |
| Pappardelle z ragù wołowym                            | obiad     | 150      | 720  |
| Paprykarz z kurczaka po węgiersku                     | obiad     | 55       | 490  |
| Parmezan z miodem i orzechami                         | przekaska | 10       | 320  |
| Parmigiana z bakłażana                                | obiad     | 75       | 520  |
| Parówki                                               | sniadanie | 8        | 420  |
| Parówki w cieście francuskim                          | przekaska | 25       | 660  |
| Passatelli w bulionie                                 | zupa      | 30       | 390  |
| Pasta al forno z bakłażanem                           | obiad     | 60       | 620  |
| Pasta all'amatriciana                                 | obiad     | 30       | 640  |
| Pasta alla boscaiola                                  | obiad     | 35       | 580  |
| Pasta alla gricia                                     | obiad     | 25       | 680  |
| Pasta alla norma                                      | obiad     | 40       | 620  |
| Pasta e ceci                                          | zupa      | 40       | 420  |
| Pasta e fagioli                                       | zupa      | 40       | 420  |
| Pasta jajeczna                                        | sniadanie | 15       | 340  |
| Pasta z awokado i jajka                               | sniadanie | 10       | 310  |
| Pasta z makreli wędzonej                              | sniadanie | 10       | 530  |
| Pasta z pieczonego bakłażana                          | przekaska | 50       | 210  |
| Pastiera napoletana                                   | deser     | 120      | 420  |
| Pastitsio                                             | obiad     | 95       | 620  |
| Pasztet drobiowy pieczony                             | kolacja   | 110      | 340  |
| Patatas bravas                                        | dodatek   | 45       | 320  |
| Patbingsu z kruszonym lodem                           | deser     | 20       | 420  |
| Pączki domowe                                         | deser     | 150      | 320  |
| Penne all'arrabbiata                                  | obiad     | 25       | 540  |
| Peperonata                                            | dodatek   | 45       | 180  |
| Philly cheesesteak                                    | kolacja   | 30       | 650  |
| Piadina roll z mortadelą                              | przekaska | 15       | 520  |
| Piadina z szynką i rukolą                             | kolacja   | 25       | 560  |
| Piccata z kurczaka z cytryną                          | obiad     | 30       | 520  |
| Pieczarki faszerowane kaszą                           | kolacja   | 45       | 310  |
| Pieczarkowa                                           | zupa      | 40       | 380  |
| Pieczeń rzymska                                       | obiad     | 75       | 520  |
| Pieczeń wieprzowa w sosie własnym                     | obiad     | 120      | 520  |
| Pieczona owsianka                                     | sniadanie | 45       | 650  |
| Pieczone bataty z dipem                               | przekaska | 40       | 390  |
| Pieczone jajka z chorizo                              | sniadanie | 30       | 450  |
| Pieczone pieczarki z serem                            | przekaska | 30       | 320  |
| Pieczone udka kurczaka                                | obiad     | 70       | 350  |
| Pieczone warzywa z fetą i ziołami                     | dodatek   | 50       | 280  |
| Pieczone ziemniaczki z dipem                          | przekaska | 45       | 630  |
| Pieczony pstrąg z ziołami                             | obiad     | 40       | 380  |
| Pierniki miodowe                                      | deser     | 60       | 320  |
| Pierogi leniwe                                        | obiad     | 30       | 520  |
| Pierogi ruskie                                        | obiad     | 90       | 640  |
| Pierogi z kapustą i grzybami                          | obiad     | 90       | 520  |
| Pierogi z mięsem                                      | obiad     | 120      | 640  |
| Pierogi z soczewicą i szpinakiem                      | obiad     | 80       | 420  |
| Pierogi z truskawkami                                 | deser     | 70       | 340  |
| Pierożki dim sum na parze                             | przekaska | 60       | 380  |
| Pierożki jiaozi z wieprzowiną                         | przekaska | 70       | 480  |
| Pierożki mandu z warzywami                            | przekaska | 45       | 320  |
| Pierś kaczki z sosem wiśniowym                        | obiad     | 50       | 560  |
| Pilaw z marchewką                                     | dodatek   | 35       | 290  |
| Pissaladière                                          | kolacja   | 90       | 430  |
| Pizza bianca z rozmarynem                             | kolacja   | 90       | 620  |
| Pizza domowa                                          | obiad     | 120      | 760  |
| Pizza margherita                                      | obiad     | 90       | 780  |
| Pizza na tortilli                                     | kolacja   | 20       | 540  |
| Pizza quattro formaggi                                | obiad     | 100      | 660  |
| Pizza z salami i oliwkami                             | obiad     | 100      | 640  |
| Pizzerinki                                            | przekaska | 25       | 700  |
| Placek drożdżowy ze śliwkami                          | deser     | 120      | 330  |
| Placek po węgiersku                                   | obiad     | 60       | 780  |
| Placek z rabarbarem i bezą                            | deser     | 75       | 390  |
| Placki bananowe z „chrupką”                           | sniadanie | 20       | 590  |
| Placki bananowe z jogurtem i owocami                  | deser     | 20       | 550  |
| Placki jaglane z jabłkiem                             | sniadanie | 35       | 340  |
| Placki owsiane z jogurtem                             | sniadanie | 20       | 420  |
| Placki z cukinii po koreańsku                         | przekaska | 25       | 320  |
| Placki z cukinii z sosem jogurtowym                   | kolacja   | 30       | 380  |
| Placki z dymką po chińsku                             | kolacja   | 35       | 420  |
| Placki z kalafiora                                    | kolacja   | 35       | 290  |
| Placki z kaszy gryczanej i cukinii                    | kolacja   | 40       | 320  |
| Placki z kaszy jaglanej                               | kolacja   | 35       | 420  |
| Placki z ricottą                                      | sniadanie | 25       | 390  |
| Placki ziemniaczane mini                              | przekaska | 30       | 380  |
| Placki ziemniaczane z sosem czosnkowym                | kolacja   | 40       | 730  |
| Placki ziemniaczane ze śmietaną                       | obiad     | 45       | 460  |
| Placuszki twarogowe                                   | deser     | 25       | 530  |
| Placuszki z cukinii po włosku                         | przekaska | 30       | 320  |
| Płatki z mlekiem                                      | sniadanie | 3        | 310  |
| Podudzia w marynacie ziołowej                         | obiad     | 70       | 520  |
| Polenta z gorgonzolą                                  | kolacja   | 25       | 540  |
| Polędwiczka wieprzowa z kurkami                       | obiad     | 50       | 440  |
| Pollo al ajillo                                       | obiad     | 40       | 450  |
| Pollo alla cacciatora                                 | obiad     | 60       | 540  |
| Pollo alla diavola                                    | obiad     | 50       | 460  |
| Pomidorki faszerowane ricottą                         | przekaska | 20       | 210  |
| Pomidorówka                                           | zupa      | 40       | 380  |
| Popcorn karmelowy                                     | przekaska | 20       | 730  |
| Pot-au-feu                                            | zupa      | 180      | 420  |
| Potrawka z kurczaka                                   | obiad     | 60       | 420  |
| Poulet basquaise                                      | obiad     | 65       | 480  |
| Prażona kukurydza z masłem                            | przekaska | 10       | 420  |
| Prażone pestki dyni z solą                            | przekaska | 15       | 250  |
| Prosciutto z melonem                                  | przekaska | 10       | 210  |
| Pstrąg pieczony z masłem czosnkowym                   | obiad     | 40       | 400  |
| Ptasie mleczko domowe                                 | deser     | 40       | 320  |
| Pulpety w sosie koperkowym                            | obiad     | 60       | 450  |
| Pyzy z mięsem                                         | obiad     | 90       | 520  |
| Pyzy/kluski śląskie                                   | obiad     | 90       | 560  |
| Quesadilla z serem i fasolą                           | kolacja   | 15       | 900  |
| Quesadilla z serem i kurczakiem                       | przekaska | 20       | 750  |
| Quesadilla z szarpaną wieprzowiną                     | obiad     | 180      | 710  |
| Quiche lorraine                                       | obiad     | 70       | 520  |
| Racuchy z jabłkami                                    | deser     | 30       | 650  |
| Ratatouille                                           | obiad     | 55       | 220  |
| Ravioli z ricottą i szpinakiem                        | obiad     | 60       | 620  |
| Reuben sandwich                                       | kolacja   | 20       | 590  |
| Ribollita                                             | zupa      | 70       | 390  |
| Ricotta z miodem i orzechami na grzance               | sniadanie | 10       | 420  |
| Rigatoni alla genovese                                | obiad     | 180      | 720  |
| Risotto alla milanese                                 | obiad     | 35       | 540  |
| Risotto z cytryną i parmezanem                        | obiad     | 40       | 480  |
| Risotto z dynią i szałwią                             | obiad     | 40       | 560  |
| Risotto z groszkiem i miętą                           | obiad     | 40       | 460  |
| Risotto z grzybami leśnymi                            | obiad     | 40       | 540  |
| Risotto z owocami morza                               | obiad     | 35       | 560  |
| Risotto z warzywami                                   | obiad     | 40       | 350  |
| Rogaliki z marmoladą                                  | deser     | 90       | 380  |
| Rolada biszkoptowa z dżemem                           | deser     | 40       | 290  |
| Rolada z kurczaka ze szpinakiem                       | obiad     | 60       | 420  |
| Roladki drobiowe ze szpinakiem                        | obiad     | 40       | 420  |
| Roladki z bakłażana z ricottą                         | przekaska | 35       | 320  |
| Roladki z cukinii z serkiem                           | przekaska | 30       | 330  |
| Roladki z szynki i serka                              | przekaska | 15       | 280  |
| Roladki z tortilli ze szpinakiem                      | przekaska | 20       | 320  |
| Rolowany omlet koreański z warzywami                  | sniadanie | 20       | 290  |
| Rosół                                                 | zupa      | 150      | 430  |
| Rosół samgyetang z kurczakiem i żeń-szeniem           | zupa      | 90       | 620  |
| Ryba po grecku                                        | obiad     | 60       | 350  |
| Ryba w sosie musztardowym                             | obiad     | 30       | 420  |
| Ryż jaśminowy na parze                                | dodatek   | 25       | 230  |
| Ryż na mleku z cynamonem i jabłkiem                   | deser     | 30       | 490  |
| Ryż smażony po kantońsku                              | kolacja   | 20       | 540  |
| Ryż smażony z jajkiem, kurczakiem i warzywami         | kolacja   | 25       | 620  |
| Ryż smażony z krewetkami                              | obiad     | 25       | 520  |
| Ryż z jajkiem i masłem po koreańsku                   | sniadanie | 15       | 610  |
| Ryż z warzywami stir-fry                              | kolacja   | 25       | 520  |
| Ryż z warzywami w sosie curry                         | kolacja   | 30       | 520  |
| Salade de chèvre chaud                                | kolacja   | 20       | 420  |
| Salade lyonnaise                                      | kolacja   | 25       | 390  |
| Salmorejo                                             | zupa      | 20       | 290  |
| Saltimbocca alla romana                               | obiad     | 25       | 480  |
| Sałatka caprese                                       | kolacja   | 10       | 530  |
| Sałatka cezar z kurczakiem                            | kolacja   | 25       | 620  |
| Sałatka grecka z fetą                                 | kolacja   | 15       | 510  |
| Sałatka gyros                                         | przekaska | 30       | 500  |
| Sałatka jarzynowa                                     | kolacja   | 50       | 320  |
| Sałatka makaronowa z kurczakiem i kukurydzą           | kolacja   | 25       | 730  |
| Sałatka nicejska                                      | kolacja   | 25       | 480  |
| Sałatka ryżowa po włosku                              | kolacja   | 25       | 480  |
| Sałatka z arbuzem i fetą                              | kolacja   | 15       | 330  |
| Sałatka z awokado i pomidorkami                       | surowka   | 10       | 320  |
| Sałatka z bobem, pecorino i miętą                     | kolacja   | 25       | 390  |
| Sałatka z brokułem i jajkiem                          | surowka   | 25       | 240  |
| Sałatka z buraka i jabłka                             | surowka   | 60       | 140  |
| Sałatka z burakiem, kozim serem i orzechami           | kolacja   | 15       | 420  |
| Sałatka z ciecierzycy i kolendry                      | surowka   | 20       | 270  |
| Sałatka z cukinii grillowanej z miętą                 | surowka   | 20       | 150  |
| Sałatka z fasolą i tuńczykiem                         | kolacja   | 15       | 420  |
| Sałatka z fasolki szparagowej                         | surowka   | 25       | 160  |
| Sałatka z gruszką, gorgonzolą i orzechami             | kolacja   | 15       | 420  |
| Sałatka z jajkiem, bekonem i grzankami                | kolacja   | 20       | 740  |
| Sałatka z kapusty pekińskiej i kukurydzy              | surowka   | 15       | 210  |
| Sałatka z karczochami marynowanymi                    | surowka   | 15       | 260  |
| Sałatka z kaszą gryczaną i pieczonymi warzywami       | kolacja   | 40       | 480  |
| Sałatka z komosą i granatem                           | surowka   | 30       | 300  |
| Sałatka z komosą ryżową i warzywami                   | kolacja   | 25       | 420  |
| Sałatka z kopru włoskiego z oliwą                     | surowka   | 15       | 190  |
| Sałatka z kukurydzy, papryki i fasoli                 | surowka   | 15       | 260  |
| Sałatka z kurczakiem curry                            | kolacja   | 25       | 430  |
| Sałatka z kurczakiem i ananasem                       | kolacja   | 30       | 420  |
| Sałatka z kurczakiem, fetą i grzankami                | kolacja   | 25       | 640  |
| Sałatka z makaronem szklanym                          | surowka   | 25       | 320  |
| Sałatka z ogórka i pomidora ze śmietaną               | surowka   | 10       | 140  |
| Sałatka z ogórka po syczuańsku                        | surowka   | 15       | 110  |
| Sałatka z ogórka w sosie gochujang                    | surowka   | 15       | 110  |
| Sałatka z papryki i cebuli marynowanej                | surowka   | 20       | 120  |
| Sałatka z pieczoną dynią i fetą                       | kolacja   | 40       | 420  |
| Sałatka z pieczonym kurczakiem i awokado              | kolacja   | 30       | 520  |
| Sałatka z pomarańczami i oliwkami                     | surowka   | 15       | 170  |
| Sałatka z pomidorami suszonymi i kaparami             | surowka   | 15       | 290  |
| Sałatka z pomidorów i cebuli                          | surowka   | 10       | 120  |
| Sałatka z radicchio i orzechami                       | surowka   | 15       | 320  |
| Sałatka z roszponki i gruszki                         | surowka   | 15       | 320  |
| Sałatka z rukoli, pomidorków i parmezanu              | surowka   | 10       | 240  |
| Sałatka z selera naciowego i orzechów włoskich        | surowka   | 15       | 290  |
| Sałatka z soczewicą i pieczonym batatem               | kolacja   | 40       | 480  |
| Sałatka z tortellini i pesto                          | kolacja   | 20       | 520  |
| Sałatka z tuńczykiem i jajkiem                        | kolacja   | 15       | 370  |
| Sałatka zielona                                       | surowka   | 10       | 30   |
| Sałatka ziemniaczana z ogórkiem kiszonym              | surowka   | 40       | 230  |
| Sauerbraten                                           | obiad     | 180      | 560  |
| Scaloppine z pieczarkami                              | obiad     | 30       | 480  |
| Schab faszerowany pieczarkami                         | obiad     | 80       | 480  |
| Schab ze śliwką                                       | obiad     | 75       | 480  |
| Semifreddo pistacjowe                                 | deser     | 25       | 420  |
| Ser halloumi z patelni                                | przekaska | 10       | 430  |
| Serek waniliowy z owocami i granolą                   | deser     | 10       | 480  |
| Serek wiejski z pomidorem i bazylią                   | sniadanie | 7        | 230  |
| Sernik krakowski                                      | deser     | 120      | 420  |
| Sernik na zimno                                       | deser     | 30       | 550  |
| Sernik pieczony z rodzynkami                          | deser     | 90       | 420  |
| Sernik z rabarbarem                                   | deser     | 110      | 390  |
| Shakshuka z jajkami i pomidorami                      | kolacja   | 25       | 470  |
| Shawarma z kurczaka                                   | obiad     | 45       | 540  |
| Skrzydełka BBQ                                        | przekaska | 50       | 620  |
| Skrzydełka w glazurze gochujang                       | przekaska | 50       | 540  |
| Skrzydełka w sosie sojowo miodowym                    | przekaska | 55       | 520  |
| Sloppy Joe                                            | kolacja   | 30       | 520  |
| Słupki warzywne z hummusem                            | przekaska | 15       | 330  |
| Smalec ze skwarkami                                   | dodatek   | 60       | 240  |
| Smażone banany w cieście                              | deser     | 20       | 420  |
| Smażony ryż z kimchi i gochujangiem                   | obiad     | 20       | 560  |
| Smoothie bowl z owocami i granolą                     | deser     | 10       | 550  |
| Smoothie zielone ze szpinakiem i bananem              | sniadanie | 7        | 290  |
| Sole meunière                                         | obiad     | 25       | 420  |
| Sopa de tortilla                                      | zupa      | 40       | 350  |
| Sorbet truskawkowy                                    | deser     | 240      | 270  |
| Sorbet z cytryny i bazylii                            | deser     | 25       | 150  |
| Sos słodko kwaśny domowy                              | dodatek   | 15       | 110  |
| Sos ssamjang do mięsa                                 | dodatek   | 10       | 95   |
| Soupe au pistou                                       | zupa      | 50       | 320  |
| Souvlaki z kurczaka                                   | obiad     | 45       | 470  |
| Spaghetti Aglio e Olio                                | obiad     | 20       | 380  |
| Spaghetti alla Nerano                                 | obiad     | 40       | 520  |
| Spaghetti alla puttanesca                             | obiad     | 25       | 580  |
| Spaghetti alle vongole                                | obiad     | 35       | 480  |
| Spaghetti bolognese                                   | obiad     | 90       | 600  |
| Spaghetti cacio e pepe                                | obiad     | 20       | 610  |
| Spaghetti carbonara                                   | obiad     | 30       | 450  |
| Spaghetti z klopsikami                                | obiad     | 50       | 620  |
| Spanakopita                                           | kolacja   | 60       | 430  |
| Spring rolls (sajgonki)                               | przekaska | 45       | 340  |
| Stek wołowy                                           | obiad     | 25       | 520  |
| Stek z kalafiora                                      | obiad     | 35       | 200  |
| Stir-fry z wołowiną                                   | obiad     | 40       | 350  |
| Stracciatella alla romana                             | zupa      | 15       | 230  |
| Sundubu jjigae z miękkim tofu                         | zupa      | 30       | 420  |
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
| Surówka z kapusty pekińskiej i rzodkiewki             | surowka   | 15       | 110  |
| Surówka z kiszonej kapusty                            | surowka   | 15       | 60   |
| Surówka z marchewki i jabłka                          | surowka   | 15       | 120  |
| Surówka z ogórka kiszonego i cebuli                   | surowka   | 10       | 95   |
| Surówka z pora i jabłka                               | surowka   | 15       | 180  |
| Surówka z rzepy i marchewki                           | surowka   | 15       | 120  |
| Surówka z rzodkiewki i szczypiorku                    | surowka   | 10       | 95   |
| Surówka z selera i jabłka                             | surowka   | 15       | 180  |
| Surówka z selera i rodzynek                           | surowka   | 15       | 170  |
| Sushi bez zawijania                                   | obiad     | 40       | 450  |
| Szarlotka                                             | deser     | 75       | 550  |
| Szaszłyki caprese na patyczkach                       | przekaska | 15       | 230  |
| Szaszłyki z kurczaka i warzyw                         | obiad     | 45       | 410  |
| Szczawiowa z jajkiem                                  | zupa      | 40       | 320  |
| Sznycel wiedeński                                     | obiad     | 30       | 650  |
| Szpinak z sezamem po koreańsku                        | surowka   | 15       | 110  |
| Szybkie leczo z kiełbasą i papryką                    | kolacja   | 30       | 650  |
| Śledź w śmietanie z jabłkiem                          | kolacja   | 20       | 380  |
| Śliwki w boczku                                       | przekaska | 30       | 280  |
| Tabbouleh                                             | surowka   | 30       | 210  |
| Tacos z mięsem mielonym i warzywami                   | kolacja   | 30       | 850  |
| Tagliatelle z boczniakami                             | obiad     | 30       | 450  |
| Tagliatelle z polędwicą wołową                        | obiad     | 35       | 550  |
| Tapenada z oliwek                                     | przekaska | 10       | 210  |
| Taralli                                               | przekaska | 60       | 320  |
| Tarta cebulowa z tymiankiem                           | kolacja   | 70       | 460  |
| Tarta cytrynowa                                       | deser     | 80       | 370  |
| Tarta warzywna                                        | kolacja   | 60       | 880  |
| Tarta z pomidorkami i ricottą                         | kolacja   | 50       | 450  |
| Tarta ze szparagami i jajkiem                         | kolacja   | 55       | 460  |
| Tarta ze szpinakiem i ricottą                         | kolacja   | 60       | 480  |
| Tarte tatin                                           | deser     | 70       | 420  |
| Tartiflette                                           | obiad     | 60       | 650  |
| Tartinki z serkiem i łososiem                         | przekaska | 10       | 320  |
| Tinga de pollo                                        | obiad     | 45       | 420  |
| Tiramisu                                              | deser     | 30       | 600  |
| Tofu duszone w sosie sojowym po koreańsku             | obiad     | 25       | 390  |
| Tofu smażone w sosie gochujang                        | przekaska | 20       | 330  |
| Tofu smażone z warzywami po chińsku                   | kolacja   | 25       | 420  |
| Tofu w sosie teriyaki                                 | obiad     | 30       | 520  |
| Tom kha z kurczakiem                                  | zupa      | 35       | 480  |
| Torta caprese                                         | deser     | 60       | 480  |
| Torta della nonna                                     | deser     | 90       | 460  |
| Torta di mele                                         | deser     | 65       | 310  |
| Tortellini panna e prosciutto                         | obiad     | 20       | 560  |
| Tortellini w bulionie                                 | zupa      | 25       | 390  |
| Tortilla española                                     | kolacja   | 45       | 420  |
| Tortilla kebab                                        | obiad     | 30       | 600  |
| Tortilla śniadaniowa z jajecznicą                     | sniadanie | 15       | 520  |
| Tortilla z kurczakiem i mango                         | kolacja   | 30       | 480  |
| Tortilla z kurczakiem, warzywami i sosem czosnkowym   | kolacja   | 25       | 660  |
| Tortilla z serem, jajkiem i szynką                    | kolacja   | 10       | 390  |
| Tortilla zapiekana z tuńczykiem                       | kolacja   | 25       | 540  |
| Tosty francuskie na słodko                            | deser     | 15       | 460  |
| Tosty francuskie na słono                             | przekaska | 15       | 470  |
| Tosty koreańskie z jajkiem i kapustą                  | kolacja   | 20       | 560  |
| Tosty z masłem orzechowym i bananem                   | sniadanie | 10       | 420  |
| Tosty z serem i szynką                                | sniadanie | 10       | 530  |
| Tosty z tuńczykiem i serem                            | kolacja   | 15       | 420  |
| Tramezzini z tuńczykiem                               | kolacja   | 15       | 430  |
| Trofie z pesto i ziemniakami                          | obiad     | 30       | 610  |
| Tteokbokki z owocami morza                            | obiad     | 25       | 540  |
| Tteokbokki z serem                                    | obiad     | 25       | 620  |
| Twarożek z rzodkiewką i szczypiorkiem                 | sniadanie | 10       | 290  |
| Tzatziki                                              | dodatek   | 15       | 110  |
| Udka w sosie BBQ                                      | obiad     | 60       | 540  |
| Uszka z grzybami                                      | dodatek   | 80       | 260  |
| Vichyssoise                                           | zupa      | 45       | 280  |
| Vitello tonnato                                       | kolacja   | 40       | 480  |
| Wareniki z twarogiem                                  | obiad     | 70       | 450  |
| Wątróbka drobiowa z cebulą                            | obiad     | 30       | 420  |
| Wieprzowina gu lao rou                                | obiad     | 45       | 620  |
| Wieprzowina w sosie gochujang                         | obiad     | 30       | 620  |
| Włoski omlet z pomidorami i bazylią                   | sniadanie | 15       | 390  |
| Wołowina w sosie ostrygowym                           | obiad     | 30       | 520  |
| Wołowina z brokułami po chińsku                       | obiad     | 30       | 480  |
| Wrap z falafelem i hummusem                           | kolacja   | 25       | 610  |
| Wrap z jajkiem, bekonem i sałatą                      | kolacja   | 15       | 660  |
| Wrap z kurczakiem i warzywami                         | kolacja   | 20       | 580  |
| Wrap z mięsem mielonym, serem i warzywami             | kolacja   | 25       | 900  |
| Zabaglione                                            | deser     | 15       | 260  |
| Zalewajka                                             | zupa      | 45       | 380  |
| Zapiekane bagietki z serem, pieczarkami i szynką      | kolacja   | 25       | 700  |
| Zapiekane bataty z fetą                               | kolacja   | 55       | 420  |
| Zapiekane jajka z warzywami                           | kolacja   | 30       | 380  |
| Zapiekane papryki z ryżem i ziołami                   | kolacja   | 55       | 420  |
| Zapiekane ziemniaki z serem pleśniowym                | kolacja   | 50       | 620  |
| Zapiekanka makaronowa z kurczakiem                    | obiad     | 50       | 680  |
| Zapiekanka z bakłażana z serem                        | kolacja   | 50       | 430  |
| Zapiekanka z brokułami i kurczakiem                   | kolacja   | 45       | 520  |
| Zapiekanka z kalafiora                                | kolacja   | 50       | 430  |
| Zapiekanka ziemniaczana z mięsem mielonym             | obiad     | 70       | 650  |
| Zapiekanki                                            | obiad     | 30       | 600  |
| Zeppole z kremem                                      | deser     | 80       | 390  |
| Ziemniaki duszone w sosie sojowym                     | dodatek   | 30       | 230  |
| Zimny makaron bibim guksu                             | obiad     | 20       | 520  |
| Zimny makaron naengmyeon w bulionie                   | obiad     | 30       | 480  |
| Zrazy wołowe zawijane                                 | obiad     | 110      | 580  |
| Zupa chrzanowa                                        | zupa      | 45       | 290  |
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
| Zupa kukurydziana z kurczakiem                        | zupa      | 35       | 420  |
| Zupa marchewkowo-imbirowa                             | zupa      | 35       | 210  |
| Zupa miso z tofu                                      | kolacja   | 20       | 170  |
| Zupa neapolitańska                                    | zupa      | 40       | 320  |
| Zupa owocowa z makaronem                              | zupa      | 25       | 290  |
| Zupa porowa z ziemniakami                             | zupa      | 35       | 320  |
| Zupa ramen z kurczakiem                               | zupa      | 40       | 620  |
| Zupa rybna                                            | zupa      | 45       | 320  |
| Zupa selerowa z grzankami                             | zupa      | 40       | 320  |
| Zupa tteokguk z plackami ryżowymi                     | zupa      | 35       | 480  |
| Zupa wonton z pierożkami                              | zupa      | 50       | 420  |
| Zupa z ciecierzycy i pomidorów                        | zupa      | 35       | 390  |
| Zupa z kiełków sojowych po koreańsku                  | zupa      | 25       | 180  |
| Zupa z makaronem i wołowiną po chińsku                | zupa      | 35       | 520  |
| Zupa z orkiszem i warzywami                           | zupa      | 45       | 320  |
| Zupa z pieczonego kalafiora                           | zupa      | 55       | 260  |
| Zupa z soczewicy czerwonej                            | zupa      | 35       | 390  |
| Zupa ziemniaczana z boczkiem                          | zupa      | 40       | 420  |
| Zuppa toscana z jarmużem i kiełbasą                   | zupa      | 40       | 520  |
| Żeberka duszone w kapuście                            | obiad     | 120      | 620  |
| Żeberka pieczone w miodzie i musztardzie              | obiad     | 120      | 660  |
| Żeberka w sosie hoisin                                | przekaska | 110      | 620  |
| Żur                                                   | zupa      | 60       | 450  |
