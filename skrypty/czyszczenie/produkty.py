# Tabela produktów kanonicznych — JEDNO źródło dla Fazy 1 (kategoria, jednostka)
# i Fazy 3 (kcal_100g, waga_sztuki_g).
#
# Kolumny: nazwa | kat | jednostka | kcal_100g | waga_sztuki_g | g_na_lyzke
#
# kat        — cyfra kategorii 1–8 (1_Warzywa i owoce … 8_Inne)
# jednostka  — jednostka docelowa: g / ml / szt. Łyżka, łyżeczka, szczypta
#              i „do smaku" ZOSTAJĄ obok niej (da się je zsumować na liście
#              zakupów, a „1 łyżka masła" czyta się lepiej niż „14 g").
#              `łyżka` = produkt dozowany wyłącznie łyżkami.
#              `=` = bez przeliczeń (zioła świeże, przyprawy) — tylko pisownia.
# kcal_100g  — na 100 g (dla płynów na 100 ml). Źródło: tabele IŻŻ/USDA, ±10%.
# waga_sztuki_g — ile waży 1 szt (ząbek czosnku, kromka chleba, plaster sera…).
# g_na_lyzke — gramy w 1 łyżce (15 ml). Puste = domyślna dla grupy (src/kcal.js).

TABELA = """
amaretto|8|ml|300||
ananas z puszki|6|g|60||
anchois|6|szt|210|4|
anyż gwiazdkowy|7|=|340|0.5|
arbuz|1|g|30||
aromat waniliowy|5|=|0||
awokado|1|szt|160|150|
bagietka|4|szt|270|250|
bajgiel|4|szt|260|90|
bakłażan|1|szt|25|300|
banan|1|szt|90|120|
batat|1|g|86|250|
bazylia suszona|7|=|250||
bazylia świeża|1|=|25|0.5|3
bekon|2|g|450|10|
biała kiełbasa|2|g|280|100|
białko jajka|3|szt|50|33|
biszkopty|5|szt|390|8|
boczek surowy|2|g|500||
boczek wędzony|2|g|500|15|
boczniaki|1|g|35||
bok choy|1|g|13|150|
borówki|1|g|57||
botwinka|1|szt|25|500|
brokuł|1|g|34|400|
brzoskwinia|1|szt|40|150|
budyń waniliowy|5|g|370|40|
bulgur|5|g|340||
bulion drobiowy|8|ml|10||
bulion warzywny|8|ml|7||
bulion wołowy|8|ml|10||
burak|1|szt|43|150|
burak gotowany|1|g|44|150|
bułka|4|szt|280|60|
bułka do burgera|4|szt|280|70|
bułka do hot doga|4|szt|280|60|
bułka tarta|5|g|370||7
bób|1|g|70||
camembert|3|g|300|120|
cebula|1|szt|40|150|
cebula czerwona|1|szt|40|150|
chałka|4|g|300||
chałwa|5|g|520||
cheddar|3|g|400|20|
chili w proszku|7|=|300||
chleb na zakwasie|4|szt|240|40|
chleb pełnoziarnisty|4|szt|230|35|
chleb pszenny|4|szt|250|30|
chleb tostowy|4|szt|270|25|
chleb żytni|4|szt|230|35|
chorizo|2|g|450||
chrzan|6|łyżka|100||15
ciabatta|4|szt|270|90|
ciasto drożdżowe|4|g|290||
ciasto filo|4|g|300||
ciasto francuskie|4|g|390||
ciasto na pierogi (krążki)|4|szt|290|10|
ciasto na wontony|4|szt|290|8|
ciecierzyca suszona|5|g|360||
ciecierzyca z puszki|6|g|120||
cielęcina|2|g|110||
croissant|4|szt|410|60|
cukier|5|g|400||13
cukier perlisty|5|łyżka|400||13
cukier puder|5|g|400||8
cukier trzcinowy|5|g|390||13
cukier waniliowy|5|=|400||12
cukinia|1|g|17|300|
curry|7|=|320||
cynamon|7|=|250||
cytryna|1|szt|30|120|
czekolada deserowa|8|g|520||
czekolada gorzka|8|g|550||
czereśnie|1|g|60||
czosnek|1|szt|145|5|
czosnek granulowany|7|=|330||
daktyle suszone|1|szt|280|8|
dashi|8|ml|3||
dorsz|2|g|80||
drożdże instant|5|g|330|7|
drożdże świeże|5|g|100||
dymka|1|szt|30|20|4
dynia|1|g|26||
dżem malinowy|6|łyżka|240||20
dżem morelowy|6|g|240||20
dżem truskawkowy|6|łyżka|240||20
ekstrakt migdałowy|7|=|290||
ekstrakt waniliowy|7|=|290||
endywia|1|szt|17|200|
fasola biała suszona|5|g|330||
fasola biała z puszki|6|g|100||
fasola czarna z puszki|6|g|100||
fasola czerwona z puszki|6|g|100|400|
fasolka szparagowa|1|g|31||
fasolka w sosie pomidorowym|6|g|90||
fenkuł|1|g|31|250|
feta|3|g|265||
filet z indyka|2|g|105||
filet z soli|2|g|90||
flaki wołowe|2|g|90||
frytki|6|g|150||
galaretka truskawkowa w proszku|5|szt|380|75|
garam masala|7|=|380||
gałka muszkatołowa|7|=|525||
gicz wołowa|2|g|150||
gnocchi|5|g|160||
gochugaru|7|=|300||
golonka wieprzowa|2|g|260||
gorgonzola|3|g|350||
gouda|3|g|360||
goździki|7|=|270|0.1|
granat|1|szt|83|250|
granola|5|g|450||
groch łuskany|5|g|340||
groszek konserwowy|6|g|70||
groszek zielony|1|g|80||
gruszka|1|szt|57|180|
gruyère|3|g|410||
grzanki|4|g|400||
grzyby leśne|1|g|30||
grzyby mun|5|g|280||
grzyby suszone|5|g|280||
guanciale|2|g|650||
halloumi|3|g|320||
herbatniki|5|g|450|8|
hummus|6|g|250||15
imbir|1|g|80|20|6
imbir mielony|7|=|335||
jabłko|1|szt|52|180|
jagody|1|g|57||
jajko|3|szt|143|55|
jajko przepiórcze|3|szt|158|10|
jarmuż|1|g|50||
jogurt grecki|3|g|100||15
jogurt naturalny|3|g|61||15
jujuba suszona|8|szt|290|4|
kaczka|2|g|340||
kakao|5|łyżka|380||6
kalafior|1|g|25|800|
kalarepa|1|g|27|250|
kalmary|2|g|90||
kapary|6|łyżka|25||10
kapusta biała|1|g|30|1500|
kapusta czerwona|1|g|31|1200|
kapusta kiszona|6|g|20||
kapusta pekińska|1|g|16|800|
karczek wołowy|2|g|200||
karczochy marynowane|6|g|90||
karkówka|2|g|260||
karp|2|g|130||
kasza gryczana|5|g|340||
kasza jaglana|5|g|350||
kasza jęczmienna|5|g|340||
kasza manna|5|g|350||10
kasza orkiszowa|5|g|340||
kaszanka|2|g|300||
kawa|8|ml|2||
kawa espresso|8|ml|2||
kefir|3|ml|50||
ketchup|6|łyżka|100||17
kiełbasa|2|g|300|80|
kiełbasa wiejska|2|g|320||
kiełbasa włoska|2|g|300||
kiełbasa śląska|2|g|300|100|
kiełki fasoli mung|1|g|30||
kimchi|6|g|20||
kiwi|1|szt|60|75|
kminek|7|=|375||
kolendra świeża|1|=|25|0.3|3
komosa ryżowa|5|g|370||
koncentrat pomidorowy|6|łyżka|90||17
konfitura różana|6|łyżka|250||20
koperek|1|=|40||3
korzeń żeń-szenia|8|szt|100|10|
krakersy|4|g|450|5|
krem balsamiczny|8|łyżka|180||20
krem budyniowy|8|g|130||
krewetki|2|g|85||
kukurydza do popcornu|5|g|370||
kukurydza konserwowa|6|g|90|340|
kumin|7|=|375||
kurczak cały|2|g|215||
kurki|1|g|30||
kurkuma|7|=|310||
kuskus|5|g|360||
laska wanilii|7|=|300|3|
likier kawowy|8|ml|320||
likier pomarańczowy|8|ml|320||
limonka|1|szt|30|70|
liść laurowy|7|=|310|0.15|
lody waniliowe|3|g|200|60|
majeranek|7|=|270||
majonez|6|łyżka|700||14
mak|5|g|520||
makaron|5|g|360||
makaron bucatini|5|g|360||
makaron chiński jajeczny|5|g|380||
makaron chiński pszenny|5|g|360||
makaron ditalini|5|g|360||
makaron farfalle|5|g|360||
makaron fettuccine|5|g|360||
makaron lasagne|5|g|360||
makaron muszelki|5|g|360|500|
makaron naengmyeon|5|g|350||
makaron nitki|5|g|370||
makaron orecchiette|5|g|360||
makaron pappardelle|5|g|360||
makaron penne|5|g|360||
makaron ramen|5|g|370||
makaron ramen instant|5|szt|450|120|
makaron rigatoni|5|g|360||
makaron ryżowy|5|g|360||
makaron sojowy|5|g|350||
makaron somen|5|g|350||
makaron spaghetti|5|g|360|500|
makaron tagliatelle|5|g|360|500|
makaron trofie|5|g|360||
makaron udon|5|g|350||
makaron ze skrobi batatów|5|g|350||
makaron łazanki|5|g|360||
makaron świderki|5|g|360|500|
makrela wędzona|2|g|220||
maliny|1|g|52||
mango|1|szt|60|350|
marchew|1|szt|35|80|
marmolada wieloowocowa|6|g|250||
marynowana rzodkiew danmuji|6|szt|25|30|
masa krówkowa|6|g|320||
mascarpone|3|g|430||
masło|3|g|735||14
masło klarowane|3|g|880||13
masło orzechowe|8|łyżka|600||16
małże|2|g|85||
maślanka|3|ml|40||
melon kantalupa|1|g|34||
mielonka konserwowa|6|g|300||
mieszanka owoców morza|2|g|80||
mieszanka sałat|1|g|15||
migdały|5|g|580|1.2|
migdały mielone|5|g|600||
migdały w płatkach|5|g|580||6
mini parówki|2|szt|260|15|
miód|8|g|320||21
mięso mielone jagnięce|2|g|280||
mięso mielone wieprzowe|2|g|260||
mięso mielone wieprzowo-wołowe|2|g|250||
mięso mielone wołowe|2|g|220||
mięta świeża|1|=|45|0.2|2
mleko|3|ml|55||
mleko kokosowe|6|ml|180||
mleko skondensowane słodzone|6|ml|320||19
mleko w proszku|5|g|500||
morele|1|szt|48|40|
mortadela|2|g|310||
mostek wołowy|2|g|250||
mozzarella|3|g|250|125|
mozzarella mini|3|g|250||
musli|5|g|370||
musztarda|6|łyżka|130||15
musztarda Dijon|6|łyżka|150||15
musztarda sarepska|6|łyżka|130||15
mąka gryczana|5|g|340||10
mąka kukurydziana|5|g|360||10
mąka pszenna|5|g|345||10
mąka pszenna typ 00|5|g|345||10
mąka ryżowa|5|g|360||10
mąka z ciecierzycy|5|g|380||10
mąka ziemniaczana|5|g|340||10
nachosy|5|g|500||
nasiona chia|5|g|490||12
nasiona kopru włoskiego|7|=|345||
natka pietruszki|1|=|40||3
nori|8|szt|350|3|
ocet balsamiczny|8|łyżka|90||15
ocet ryżowy|8|ml|20||15
ocet spirytusowy|8|łyżka|20||15
ocet winny biały|8|ml|20||15
ocet winny czerwony|8|łyżka|20||15
odżywka białkowa|8|g|380||
ogórek|1|szt|15|200|
ogórek gruntowy|1|g|15|100|
ogórek kiszony|6|szt|12|80|
ogórek konserwowy|6|szt|20|50|
olej chili|8|łyżka|880||14
olej kokosowy|8|łyżka|860||14
olej rzepakowy|8|ml|884||14
olej sezamowy|8|łyżka|884||14
oliwa z oliwek|8|ml|884||14
oliwki czarne|6|g|150|4|
oliwki zielone|6|g|145|5|
oregano|7|=|270||
orzechy laskowe|5|g|630||
orzechy nerkowca|5|g|570||
orzechy włoskie|5|g|650||8
orzeszki piniowe|5|g|670|0.2|9
orzeszki ziemne|5|g|570||9
owoce sezonowe|1|g|50||
paneer|3|g|320||
panko|5|g|370||5
papaja zielona|1|g|40||
papier ryżowy|5|szt|340|9|
papryczka chili|1|szt|40|10|
papryczka chili suszona|7|=|300|0.5|
papryczka chipotle|6|szt|60|15|
papryczka jalapeño|1|szt|30|15|
papryczki mini słodkie|1|szt|30|30|
papryka czerwona|1|szt|31|200|
papryka ostra|7|=|290||
papryka pieczona ze słoika|6|g|35||
papryka słodka|7|=|290||
papryka wędzona|7|=|290||
papryka żółta|1|szt|27|200|
parmezan|3|g|400||6
parówki|2|szt|260|40|
passata pomidorowa|6|ml|30||
pasta anko|6|g|240||
pasta chunjang|6|łyżka|200||18
pasta curry massaman|6|łyżka|200||17
pasta curry zielona|6|łyżka|150||17
pasta doenjang|6|łyżka|180||18
pasta doubanjiang|6|łyżka|130||18
pasta gochujang|6|łyżka|230||18
pasta miso|6|łyżka|200||18
pasta pistacjowa|8|g|570||
pasztet drobiowy|6|g|280||
pecorino|3|g|390||6
pestki dyni|5|g|560||9
pesto bazyliowe|6|g|450|190|15
pieczarki|1|g|22|20|
pieprz biały|7|=|300||
pieprz czarny|7|=|250||
pieprz czarny ziarnisty|7|=|250|0.05|
pieprz syczuański|7|=|300||
piernik|4|g|350||
pierś z kaczki|2|g|200||
pierś z kurczaka|2|g|110|200|
pietruszka (korzeń)|1|g|40|80|
pistacje|5|g|570||9
pita|4|szt|275|60|
piwo|8|ml|43||
piwo ciemne|8|ml|50||
placki mandaryńskie|4|szt|280|15|
polenta|5|g|360||
polędwica sopocka|2|g|120||
polędwica wołowa|2|g|120||
polędwiczka wieprzowa|2|g|110||
pomarańcza|1|szt|47|200|
pomidor|1|szt|18|150|
pomidorki koktajlowe|1|g|20|15|
pomidory suszone|6|g|210||
pomidory z puszki|6|g|22|400|
por|1|szt|60|200|
porchetta|2|g|300||
proszek do pieczenia|5|=|100||
przyprawa do mięsa mielonego|7|=|250||
przyprawa do tacos|7|=|250||
przyprawa gyros|7|=|250||
przyprawa kebab|7|=|250||
przyprawa korzenna do piernika|7|=|280||
przyprawa pięć smaków|7|=|300||
pstrąg|2|g|120|300|
pszenica na pastierę|6|g|110||
pyłek pszczeli|5|g|300||
pędy bambusa|6|g|20||
płatki chili|7|=|300||
płatki kukurydziane|5|g|380||
płatki owsiane|5|g|370||6
rabarbar|1|g|21||
radicchio|1|g|23||
ricotta|3|g|170||
rodzynki|5|g|300||10
rostbef|2|g|200||
roszponka|1|g|21||
rozbratel wołowy|2|g|200||
rozmaryn suszony|7|=|330||
rozmaryn świeży|7|=|130|1|
rukola|1|g|25||
rurki cannelloni|5|szt|360|12|
ryż|5|g|350||
ryż arborio|5|g|350||
ryż basmati|5|g|350||
ryż do sushi|5|g|350||
ryż jaśminowy|5|g|350||
ryż krótkoziarnisty|5|g|350||
rzepa|1|szt|28|150|
rzodkiew biała|1|g|18||
rzodkiewka|1|szt|16|15|
salami|2|g|400||
sardynki|2|g|200||
sałata|1|=|15|20|
sałata lodowa|1|=|14|20|
sałata masłowa|1|g|13||
sałata rzymska|1|g|17||
schab|2|g|200||
seler korzeniowy|1|g|25||
seler naciowy|1|szt|15|40|
ser kozi|3|g|360||
ser żółty|3|g|380|20|
serek topiony|3|g|300||
serek waniliowy|3|g|130||
serek wiejski|3|g|100||
serek śmietankowy|3|g|250|150|15
sezam|5|=|570||9
siemię lniane|5|=|530||
skrobia kukurydziana|5|=|350||
skrzydełka z kurczaka|2|g|200||
skyr|3|g|65||
skórka pomarańczowa kandyzowana|8|g|300||
skórka z cytryny|1|=|50||
skórka z pomarańczy|1|=|100||
smalec|8|g|900||13
smalec gęsi|8|g|900||13
soczewica czerwona|5|g|350||
soczewica zielona|5|g|350||
soda oczyszczona|5|=|0||
sok malinowy|6|łyżka|250||15
sok z ananasa|6|ml|50||
sok z cytryny|1|=|22||
sok z limonki|1|=|25||
sos BBQ|6|łyżka|170||17
sos Worcestershire|6|=|80||
sos burgerowy|6|łyżka|350||15
sos cezar|6|łyżka|450||15
sos czosnkowy|6|łyżka|350||15
sos hoisin|6|łyżka|220||18
sos ostrygowy|6|łyżka|50||18
sos pieczarkowy|6|g|80|400|
sos pomidorowy|6|ml|60||
sos rybny|6|łyżka|35||17
sos sojowy|6|ml|55||16
sos sojowy ciemny|6|łyżka|80||17
sos sojowy jasny|6|łyżka|55||16
sos słodkie chili|6|łyżka|220||18
sos słodko-kwaśny|6|łyżka|150||17
spirytus|8|=|0||
stracchino|3|g|300||
sucharki fette biscottate|4|szt|410|10|
sumak|7|=|240||
syrop klonowy|8|łyżka|260||20
szafran|7|=|0||
szalotka|1|szt|72|30|
szałwia świeża|1|=|120|0.3|
szczaw świeży|1|g|20||
szczypiorek|1|=|30||3
szparagi zielone|1|g|20||
szpinak|1|g|23||
szpinak baby|1|g|23||
szpinak mrożony|1|g|25||
szponder wołowy|2|g|250||
szynka|2|g|130|15|
szynka dojrzewająca|2|g|250|10|
sól|7|=|0||
sól morska|7|=|0||
słonecznik|5|g|580||9
słonina|2|g|750||
słód jęczmienny mielony|5|g|360||
tahini|6|łyżka|600||15
tapioka perełki|5|g|350||
tofu|3|g|120||
tofu jedwabiste|3|g|55||
tortellini|5|g|300||
tortellini z mięsem|5|g|300||
tortellini z serem|5|g|300||
tortilla pszenna|4|szt|300|60|
trawa cytrynowa|1|szt|100|20|
truskawki|1|g|32||
tteok|5|g|230||
tuńczyk w oleju|6|g|190||
tuńczyk w sosie własnym|6|g|110|120|
twaróg|3|g|130||
twaróg sernikowy|3|g|160||
tymianek|7|=|280||
udko z kaczki|2|szt|200|250|
udko z kurczaka|2|g|160|200|
udko z kurczaka bez kości|2|g|160||
udziec wołowy|2|g|150||
wakame|8|g|45||
wino Marsala|8|ml|160||
wino białe wytrawne|8|ml|80||
wino czerwone wytrawne|8|ml|85||
winogrona|1|g|70||
wiórki kokosowe|5|g|660||5
wiśnie|1|g|50||
wiśnie z kompotu|6|g|70||
woda|8|=|0||
woda gazowana|8|ml|0||
wołowina gulaszowa|2|g|200||
wołowina peklowana|2|g|250||
wykałaczki|8|szt|0||
wódka|8|=|230||
wątróbka drobiowa|2|g|120||
włoszczyzna|1|g|35||
zakwas na żur|6|ml|30||
ziele angielskie|7|=|260|0.05|
ziemniak|1|g|77|150|
ziemniak młody|1|g|70||
zioła prowansalskie|7|=|260||
zrazowa wołowa|2|g|180||
łopatka cielęca|2|g|150||
łopatka jagnięca|2|g|230||
łopatka wieprzowa|2|g|250||
łopatka wołowa|2|g|200||
łosoś|2|g|200|150|
łosoś wędzony|2|g|180||
śledź matias|2|g|250||
śliwki|1|szt|46|40|
śliwki suszone|1|szt|240|8|
śmietana 18%|3|ml|185||15
śmietanka 30%|3|ml|290||15
śmietanka 36%|3|ml|340||15
żeberka wieprzowe|2|g|280||
żeberka wieprzowe wędzone|2|g|300||
żeberka wołowe|2|g|290||
żelatyna|5|g|340||
żurawina (konfitura)|6|łyżka|250||20
żurawina suszona|1|g|330||
żółtko|3|szt|320|18|
"""

KATEGORIE = {
    '1': '1_Warzywa i owoce', '2': '2_Mięso i ryby', '3': '3_Nabiał', '4': '4_Pieczywo',
    '5': '5_Produkty sypkie', '6': '6_Konserwy i słoiki', '7': '7_Przyprawy', '8': '8_Inne',
}


def wczytaj():
    out = {}
    for linia in TABELA.strip().splitlines():
        n, kat, j, kcal, waga, glyz = linia.split('|')
        assert n not in out, n
        out[n] = {
            'kategoria': KATEGORIE[kat], 'jednostka': j,
            'kcal_100g': float(kcal) if kcal else None,
            'waga_sztuki_g': float(waga) if waga else None,
            'g_na_lyzke': float(glyz) if glyz else None,
        }
    return out
