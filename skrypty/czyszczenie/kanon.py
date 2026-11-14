# Faza 1 — reguły nazw składników: stara nazwa → nazwa kanoniczna.
#
# Kolejność: czysc() robi mechaniczne porządki (wielkość liter, białe znaki,
# dopiski sposobu użycia, „X lub Y" → X), a potem SYN scala synonimy i warianty
# zapisu. Czego nie ma w SYN, zostaje pod nazwą po czyszczeniu.
#
# Granica jak w src/nazwySkladnikow.js: ujednolicamy pisownię i opis, NIE
# podmieniamy towaru (boczek wędzony ≠ boczek surowy, cukier ≠ cukier puder).

import re

# Dopiski, które nie zmieniają produktu na półce. Ucinane z końca nazwy.
DOPISKI = [
    'do posypania', 'do smażenia', 'do posmarowania', 'do obtoczenia',
    'do karmelizacji', 'do kremu', 'na spód', 'do podania', 'do popicia',
    'na kruszonkę', 'do wody', 'do dekoracji', 'do wersji madame',
    'świeżo zaparzona', 'posiekane', 'posiekana', 'posiekany',
    'w plastrach', 'w plastrze', 'opcjonalnie', 'odsączona', 'odsączone',
    'drobno starty', 'cienko pokrojona', 'oczyszczone',
]

# Nawiasy, które są tylko objaśnieniem — wycinane w całości.
NAWIASY_OBJASNIENIA = re.compile(
    r'\s*\((?:opcjonalnie|do posmarowania|do wersji madame|świeżo zaparzona|'
    r'mogą być mrożone|może być mrożon\w*|sok|kromki|miąższ[^)]*|np\.[^)]*|'
    r'najlepiej[^)]*|drobno starty|zielona część|pęczek z liśćmi i buraczkami|'
    r'moczona przez noc|świeży lub mrożony|świeży lub suszony|suszone|suszona|'
    r'sucha|dojrzałe, kwaśne|tuby, mrożone|tuby, oczyszczone|ugotowany[^)]*|'
    r'kulki|ciliegine|cienkie płaty|plastry|plasterki|świeże|puszka|'
    r'masa krówkowa|kajmak|marchew, pietruszka, seler, por|filet|ćwiartka|'
    r'słodzona|miękkie|serca|quinoa|polenta[^)]*|savoiardi|danmuji|wakame|'
    r'japchae|gryczany|instant|bez przyprawy|grube nitki|ditalini|'
    r'pasta chili|płatki chili|płatki lub pokrojony arkusz|udka|'
    r'ligawa/udziec|łopatka|rostbef|mostek lub rostbef|rostbef lub antrykot|'
    r'zrazowa lub udziec|gotowe krążki mandu|pieczony boczek/schab w rolce, w plastrach|'
    r'koper włoski|fenkuł|cebula wiosenna|cebula zielona|zielona cebulka|szczypiorek|'
    r'fasoli mung|pęczak orkiszowy|prosciutto|gouda|np\. gouda|gorgonzola|'
    r'gorgonzola lub lazur|cointreau lub grand marnier|borowiki|ossobuco|'
    r'schab/łopatka|spam|mrożona|bocconcini|małe kulki mozzarelli|z kompotu|'
    r'bez pestek|z dnia poprzedniego|ugotowany, gorący|ugotowany, wystudzony)\)',
    re.I)

# „X (lub Y)" → X; uwaga trafia do CSV.
LUB_NAWIAS = re.compile(r'\s*\(lub [^)]*\)', re.I)


def czysc(nazwa):
    """Mechaniczne porządki. Zwraca (nazwa_po_czyszczeniu, lista_uwag)."""
    uwagi = []
    n = re.sub(r'\s+', ' ', (nazwa or '').strip()).rstrip('*').strip()
    if LUB_NAWIAS.search(n):
        uwagi.append(f'było „{n}"')
        n = LUB_NAWIAS.sub('', n)
    n = NAWIASY_OBJASNIENIA.sub('', n)
    n = n.lower()
    n = re.sub(r',\s*(odsączona|odsączone|surowe|siekane|łuskane|cienko pokrojona)$', '', n)
    # „X lub Y" / „X / Y" → X
    for sep in (' lub ', ' / '):
        if sep in n:
            uwagi.append(f'było „{nazwa.strip()}"')
            n = n.split(sep)[0]
    zmiana = True
    while zmiana:
        zmiana = False
        for d in DOPISKI:
            if n.endswith(' ' + d):
                n = n[: -len(d) - 1].rstrip(' ,')
                zmiana = True
    return n.strip(), uwagi


# Synonimy i warianty → nazwa kanoniczna. Klucze po czysc() (małe litery).
SYN = {
    # ── warzywa ──
    'algi nori': 'nori', 'glony nori': 'nori',
    'anyż gwiaździsty': 'anyż gwiazdkowy',
    'bataty': 'batat',
    'świeża bazylia': 'bazylia świeża', 'bazylia': 'bazylia świeża',
    'botwinka z burakami': 'botwinka',
    'burak surowy': 'burak', 'buraki': 'burak',
    'burak ugotowany': 'burak gotowany', 'buraki gotowane': 'burak gotowany',
    'cebula dymka': 'dymka', 'szczypiorek dymka': 'dymka',
    'czerwona cebula': 'cebula czerwona',
    'czosnek świeży': 'czosnek', 'ząbek czosnku': 'czosnek',
    'dynia hokkaido': 'dynia',
    'fasolka szparagowa zielona': 'fasolka szparagowa',
    'koper włoski': 'fenkuł',
    'groszek mrożony': 'groszek zielony', 'groszek zielony mrożony': 'groszek zielony',
    'imbir świeży': 'imbir', 'świeży imbir': 'imbir', 'imbir świeży starty': 'imbir',
    'jabłka': 'jabłko', 'jabłka kwaśne': 'jabłko',
    'kapusta kwaszona': 'kapusta kiszona',
    'kiełki fasoli mung': 'kiełki fasoli mung', 'kiełki sojowe': 'kiełki fasoli mung',
    'kolendra': 'kolendra świeża',
    'koperek świeży': 'koperek', 'świeży koperek': 'koperek',
    'listki mięty': 'mięta świeża', 'mięta': 'mięta świeża', 'świeża mięta': 'mięta świeża',
    'liście sałaty': 'sałata', 'mix salat': 'mieszanka sałat', 'mix sałat': 'mieszanka sałat',
    'mix sałat (rukola, roszponka)': 'mieszanka sałat',
    'liście świeżej szałwii': 'szałwia świeża', 'świeża szałwia': 'szałwia świeża', 'szałwia': 'szałwia świeża',
    'marchewka': 'marchew',
    'mrożone maliny': 'maliny', 'mrożone truskawki': 'truskawki',
    'natka pietruszki': 'natka pietruszki', 'pietruszka natka': 'natka pietruszki',
    'świeża natka pietruszki': 'natka pietruszki',
    'ogórek świeży': 'ogórek', 'ogórek gruntowy': 'ogórek gruntowy',
    'ogórki kiszone': 'ogórek kiszony',
    'papryka': 'papryka czerwona',
    'papryczka chili': 'papryczka chili', 'papryczka jalapeño': 'papryczka jalapeño',
    'pietruszka korzeń': 'pietruszka korzeń',
    'pomidory': 'pomidor', 'pomidory dojrzałe': 'pomidor',
    'pomidory koktajlowe': 'pomidorki koktajlowe',
    'pieczarki małe': 'pieczarki',
    'rzodkiewki': 'rzodkiewka', 'rzodkiew daikon': 'rzodkiew biała',
    'rozmaryn': 'rozmaryn świeży', 'świeży rozmaryn': 'rozmaryn świeży',
    'szczypiorek': 'szczypiorek',
    'szparagi': 'szparagi zielone',
    'szpinak świeży': 'szpinak', 'szpinak baby': 'szpinak baby',
    'truskawki': 'truskawki',
    'wiśnie bez pestek': 'wiśnie',
    'włoszczyzna': 'włoszczyzna',
    'ziemniaki': 'ziemniak', 'ziemniaki młode': 'ziemniak młody',
    'cytryny': 'cytryna',
    'suszona żurawina': 'żurawina suszona', 'żurawina': 'żurawina suszona',
    'daktyle suszone bez pestek': 'daktyle suszone',
    'daktyle jujuba': 'jujuba suszona', 'jujuba suszona': 'jujuba suszona',
    'śliwki suszone bez pestek': 'śliwki suszone', 'suszone śliwki': 'śliwki suszone',
    'udko z kaczki': 'udko z kaczki', 'udziec z kaczki': 'udko z kaczki',
    'grzyby suszone': 'grzyby suszone', 'suszone grzyby': 'grzyby suszone',
    'suszone grzyby (borowiki)': 'grzyby suszone',
    'świeże pieczarki': 'pieczarki',
    'owoce sezonowe': 'owoce sezonowe',
    'sok imbirowy': 'imbir',
    'seler': 'seler korzeniowy', 'gnocchi ziemniaczane': 'gnocchi',
    'pistacje niesolone': 'pistacje', 'mięso mielone (wołowo-wieprzowe)': 'mięso mielone wieprzowo-wołowe',
    'grzyby leśne (podgrzybki, borowiki)': 'grzyby leśne', 'mały kurczak (poussin)': 'udko z kurczaka',

    # ── mięso i ryby ──
    'bekon': 'bekon',
    'biała kiełbasa surowa': 'biała kiełbasa',
    'boczek': 'boczek wędzony',
    'filet anchois': 'anchois', 'filety anchois': 'anchois', 'filety anchois z zalewy': 'anchois',
    'filet z dorsza': 'dorsz',
    'filet z piersi indyka': 'filet z indyka',
    'filet z kurczaka': 'pierś z kurczaka', 'filet z piersi kurczaka': 'pierś z kurczaka',
    'filet z udźca kurczaka': 'udko z kurczaka bez kości',
    'udka z kurczaka bez kości': 'udko z kurczaka bez kości',
    'udziec z kurczaka bez kości': 'udko z kurczaka bez kości',
    'udka kurczaka': 'udko z kurczaka', 'mięso z kurczaka': 'udko z kurczaka',
    'podudzia z kurczaka': 'udko z kurczaka',
    'mały kurczak': 'udko z kurczaka',
    'filet z łososia': 'łosoś', 'filet z łososia ze skórą': 'łosoś', 'łosoś świeży': 'łosoś',
    'karkówka wieprzowa': 'karkówka',
    'krewetki obrane': 'krewetki', 'krewetki surowe obrane': 'krewetki',
    'krążki kalmara': 'kalmary', 'kalmary': 'kalmary',
    'mieszanka owoców morza': 'mieszanka owoców morza',
    'mrożona mieszanka owoców morza': 'mieszanka owoców morza',
    'mielona wołowina': 'mięso mielone wołowe', 'wołowina na burgery': 'mięso mielone wołowe',
    'mięso mielone wołowo-wieprzowe': 'mięso mielone wieprzowo-wołowe',
    'mięso mielone': 'mięso mielone wieprzowo-wołowe',
    'mięso mielone jagnięce': 'mięso mielone jagnięce',
    'kiełbaski': 'kiełbasa', 'kiełbasa biała': 'biała kiełbasa', 'kiełbasa włoska': 'kiełbasa włoska',
    'parówki cielęce': 'parówki',
    'polędwica': 'polędwica wołowa',
    'polędwiczka wieprzowa': 'polędwiczka wieprzowa',
    'rostbef wołowy': 'rostbef', 'gotowana wołowina': 'rostbef',
    'schab wieprzowy bez kości': 'schab', 'sznycel cielęcy': 'cielęcina',
    'sznycle cielęce': 'cielęcina', 'sznycle z cielęciny': 'cielęcina',
    'kotlet cielęcy z kostką': 'cielęcina',
    'skrzydełka kurczaka': 'skrzydełka z kurczaka',
    'szynka dojrzewająca': 'szynka dojrzewająca', 'szynka parmeńska': 'szynka dojrzewająca',
    'szynka prosciutto crudo': 'szynka dojrzewająca',
    'szynka gotowana': 'szynka', 'szynka w kostce': 'szynka', 'szynka wieprzowa': 'szynka',
    'wieprzowina': 'łopatka wieprzowa',
    'wołowina': 'wołowina gulaszowa',
    'zrazówka wołowa': 'zrazowa wołowa',
    'żeberka wędzone': 'żeberka wieprzowe wędzone',
    'małe rybki': 'sardynki',
    'łopatka wołowa': 'łopatka wołowa',
    'mostek wołowy': 'mostek wołowy',
    'gicz wołowa w plastrze': 'gicz wołowa', 'gicz wołowa': 'gicz wołowa',
    'kaczka': 'kaczka',

    # ── nabiał ──
    'białko jaja': 'białko jajka',
    'jajka': 'jajko', 'jajko kurze': 'jajko',
    'jajko ugotowane na twardo': 'jajko',
    'jajka przepiórcze': 'jajko przepiórcze',
    'żółtka': 'żółtko', 'żółtka jaj': 'żółtko', 'żółtko jajka': 'żółtko',
    'masło roztopione': 'masło', 'masło zimne': 'masło',
    'mozarella': 'mozzarella', 'ser mozarella': 'mozzarella', 'ser mozzarella': 'mozzarella',
    'ser mozzarella starty': 'mozzarella', 'mozzarella starta': 'mozzarella', 'mozzarella tarta': 'mozzarella',
    'bocconcini': 'mozzarella mini', 'mini kulki mozzarelli': 'mozzarella mini',
    'parmezan starty': 'parmezan', 'ser parmezan': 'parmezan', 'ser parmezan tarty': 'parmezan',
    'ser pecorino romano': 'pecorino', 'ser pecorino': 'pecorino', 'ser pecorino romano starty': 'pecorino',
    'ser cheddar': 'cheddar', 'ser cheddar starty': 'cheddar', 'ser cheddar tarty': 'cheddar',
    'cheddar': 'cheddar', 'ser cheddar w plastrach': 'cheddar',
    'ser feta': 'feta', 'ser ricotta': 'ricotta', 'ser ricotta salata': 'ricotta',
    'ser gorgonzola': 'gorgonzola', 'ser pleśniowy': 'gorgonzola', 'ser pleśniowy gorgonzola': 'gorgonzola',
    'ser gouda': 'gouda', 'ser gruyère': 'gruyère', 'ser halloumi': 'halloumi',
    'ser kozi': 'ser kozi', 'ser mascarpone': 'mascarpone', 'serek mascarpone': 'mascarpone',
    'ser camembert': 'camembert', 'ser paneer': 'paneer', 'ser stracchino': 'stracchino',
    'ser żółty starty': 'ser żółty', 'ser żółty tarty': 'ser żółty', 'ser żółty gouda': 'ser żółty',
    'ser twarogowy na sernik': 'twaróg sernikowy', 'twaróg sernikowy mielony': 'twaróg sernikowy',
    'ser twaróg': 'twaróg', 'twarożek': 'twaróg',
    'twaróg półtłusty': 'twaróg',
    'serek śmietankowy': 'serek śmietankowy', 'serek alette śmietankowy': 'serek śmietankowy',
    'serek kremowy': 'serek śmietankowy',
    'serek topiony śmietankowy': 'serek topiony',
    'śmietana': 'śmietana 18%', 'śmietanka 18%': 'śmietana 18%',
    'śmietana 30%': 'śmietanka 30%', 'śmietana kremówka 30%': 'śmietanka 30%',
    'śmietanka kremówka 30%': 'śmietanka 30%', 'śmietanka kremówka 36%': 'śmietanka 36%',
    'mleko 2%': 'mleko', 'mleczko kokosowe': 'mleko kokosowe',
    'mleko skondensowane': 'mleko skondensowane słodzone',
    'lody waniliowe': 'lody waniliowe',
    'tofu naturalne': 'tofu', 'tofu twarde': 'tofu', 'tofu jedwabiste': 'tofu jedwabiste',
    'skyr naturalny': 'skyr',

    # ── pieczywo ──
    'bułki do burgerów': 'bułka do burgera', 'mini bułki do burgerów': 'bułka do burgera',
    'mini bułki do hot dogów': 'bułka do hot doga',
    'bułka panini': 'ciabatta',
    'chleb pszenny czerstwy': 'chleb pszenny', 'czerstwy chleb pszenny': 'chleb pszenny',
    'czerstwy chleb na zakwasie': 'chleb na zakwasie',
    'chleb': 'chleb pszenny', 'pieczywo': 'chleb pszenny', 'pieczywo pełnoziarniste': 'chleb pełnoziarnisty',
    'pieczywo tostowe': 'chleb tostowy', 'chleb tostowy bez skórki': 'chleb tostowy',
    'pieczywo żytnie': 'chleb żytni',
    'tortilla pszenna': 'tortilla pszenna', 'tortilla': 'tortilla pszenna',
    'tortilla pszenna duża': 'tortilla pszenna', 'tortille pszenne': 'tortilla pszenna',
    'tortille pszenne małe': 'tortilla pszenna', 'placek piadina': 'tortilla pszenna',
    'muffinka angielska': 'bułka',
    'naleśniki mandaryńskie': 'placki mandaryńskie',
    'chipsy tortilla': 'nachosy', 'chipsy nachos kukurydziane': 'nachosy',
    'nachosy kukurydziane': 'nachosy',
    'ciasto francuskie': 'ciasto francuskie',

    # ── sypkie ──
    'biszkopty podłużne': 'biszkopty',
    'budyń waniliowy w proszku': 'budyń waniliowy',
    'ciecierzyca suszona': 'ciecierzyca suszona',
    'cukier drobny': 'cukier', 'cukier trzcinowy': 'cukier trzcinowy', 'cukier brązowy': 'cukier trzcinowy',
    'cukier wanilinowy': 'cukier waniliowy',
    'drożdże': 'drożdże świeże', 'drożdże suche': 'drożdże instant', 'drożdże suszone': 'drożdże instant',
    'fasola biała': 'fasola biała suszona',
    'kasza bulgur': 'bulgur', 'kasza kuskus': 'kuskus',
    'kasza kukurydziana': 'polenta', 'kaszka kukurydziana': 'polenta',
    'semolina': 'kasza manna',
    'komosa ryżowa': 'komosa ryżowa',
    'kukurydza do prażenia': 'kukurydza do popcornu', 'ziarna kukurydzy do popcornu': 'kukurydza do popcornu',
    'makaron': 'makaron', 'spaghetti': 'makaron spaghetti', 'rigatoni': 'makaron rigatoni',
    'pappardelle': 'makaron pappardelle', 'makaron bucatini': 'makaron bucatini',
    'makaron ramen': 'makaron ramen', 'makaron ramyeon': 'makaron ramen instant',
    'makaron instant': 'makaron ramen instant',
    'makaron pszenny somen': 'makaron somen', 'makaron trofie': 'makaron trofie',
    'makaron pszenny': 'makaron chiński pszenny', 'makaron pszenny chiński': 'makaron chiński pszenny',
    'makaron ryżowy wstążki': 'makaron ryżowy',
    'makaron z batatów': 'makaron ze skrobi batatów',
    'makaron szklany': 'makaron sojowy',
    'makaron drobny': 'makaron ditalini',
    'mąka': 'mąka pszenna', 'mąka 00': 'mąka pszenna typ 00', 'mąka pszenna typ 00': 'mąka pszenna typ 00',
    'mąka pszenna typ 550': 'mąka pszenna',
    'mąka ryżowa': 'mąka ryżowa',
    'skrobia ziemniaczana': 'mąka ziemniaczana',
    'skrobia kukurydziana': 'skrobia kukurydziana',
    'mielone migdały': 'migdały mielone', 'migdały blanszowane': 'migdały', 'migdały całe': 'migdały',
    'płatki migdałowe': 'migdały w płatkach',
    'orzechy laskowe prażone, siekane': 'orzechy laskowe', 'orzechy laskowe prażone': 'orzechy laskowe',
    'orzechy włoskie posiekane': 'orzechy włoskie',
    'orzeszki ziemne niesolone': 'orzeszki ziemne', 'orzeszki ziemne prażone': 'orzeszki ziemne',
    'pistacje niesolone, łuskane': 'pistacje', 'pistacje łuskane': 'pistacje',
    'pestki dyni': 'pestki dyni', 'prażone słonecznik': 'słonecznik',
    'nasiona sezamu': 'sezam', 'sezam prażony': 'sezam',
    'płatki musli': 'musli',
    'ryż biały': 'ryż', 'ryż ugotowany': 'ryż', 'ryż długoziarnisty': 'ryż',
    'ryż krótkoziarnisty ugotowany': 'ryż krótkoziarnisty',
    'ryż do risotto': 'ryż arborio', 'ryż kleisty': 'ryż do sushi',
    'soczewica czerwona': 'soczewica czerwona',
    'soda': 'soda oczyszczona',
    'wiórki kokosowe': 'wiórki kokosowe',
    'herbatniki': 'herbatniki',
    'placki ryżowe tteok': 'tteok', 'kluski ryżowe tteok': 'tteok',
    'groch łuskany połówki': 'groch łuskany',
    'grzyby mun suszone': 'grzyby mun',

    # ── przyprawy ──
    'chilli': 'papryczka chili suszona', 'chili w płatkach': 'płatki chili',
    'papryczka chili płatki': 'płatki chili', 'papryczki chili suszone': 'papryczka chili suszona',
    'płatki chili gochugaru': 'gochugaru', 'gochugaru': 'gochugaru',
    'chili w proszku': 'chili w proszku',
    'curry w proszku': 'curry',
    'cynamon mielony': 'cynamon',
    'czosnek w proszku': 'czosnek granulowany',
    'imbir mielony': 'imbir mielony',
    'kmin rzymski': 'kumin', 'kumin mielony': 'kumin',
    'majeranek suszony': 'majeranek',
    'oregano suszone': 'oregano',
    'tymianek suszony': 'tymianek',
    'bazylia suszona': 'bazylia suszona',
    'rozmaryn suszony': 'rozmaryn suszony',
    'papryka słodka mielona': 'papryka słodka', 'papryka słodka w proszku': 'papryka słodka',
    'papryka słodka wędzona': 'papryka wędzona',
    'papryka ostra mielona': 'papryka ostra', 'papryka ostra w proszku': 'papryka ostra',
    'pieprz': 'pieprz czarny', 'pieprz czarny mielony': 'pieprz czarny',
    'pieprz czarny grubo mielony': 'pieprz czarny', 'pieprz czarny świeżo mielony': 'pieprz czarny',
    'świeżo mielony pieprz': 'pieprz czarny', 'pieprz ziarnisty': 'pieprz czarny ziarnisty',
    'pieprz czarny ziarnisty': 'pieprz czarny ziarnisty',
    'szczypta soli': 'sól', 'sól morska gruba': 'sól morska',
    'zioła provence': 'zioła prowansalskie',
    'pięć smaków': 'przyprawa pięć smaków',
    'laska wanilii': 'laska wanilii',
    'nasiona kopru włoskiego': 'nasiona kopru włoskiego',
    'liść laurowy': 'liść laurowy',
    'ziele angielskie': 'ziele angielskie',

    # ── konserwy, słoiki, sosy ──
    'ananas z puszki': 'ananas z puszki',
    'chrzan tarty': 'chrzan', 'chrzan tarty ze słoika': 'chrzan',
    'ciecierzyca z puszki': 'ciecierzyca z puszki',
    'fasola w puszce': 'fasola czerwona z puszki',
    'fasolka w sosie pomidorowym': 'fasolka w sosie pomidorowym',
    'gochujang': 'pasta gochujang',
    'karczochy marynowane z słoika': 'karczochy marynowane', 'karczochy z zalewy': 'karczochy marynowane',
    'kajmak': 'masa krówkowa',
    'kimchi': 'kimchi',
    'kukurydza w puszce': 'kukurydza konserwowa', 'kukurydza z puszki': 'kukurydza konserwowa',
    'groszek konserwowy': 'groszek konserwowy',
    'oliwki czarne bez pestek': 'oliwki czarne',
    'duże oliwki zielone drylowane': 'oliwki zielone',
    'pasta sojowa doenjang': 'pasta doenjang',
    'pasta sezamowa tahini': 'tahini', 'pasta tahini': 'tahini',
    'pasta z czarnej fasoli chunjang': 'pasta chunjang',
    'pasta z czerwonej fasoli anko': 'pasta anko',
    'czerwona fasola adzuki z puszki': 'pasta anko',
    'pesto zielone': 'pesto bazyliowe',
    'pomidory w puszce': 'pomidory z puszki', 'pomidory krojone z puszki': 'pomidory z puszki',
    'pomidory pelati z puszki': 'pomidory z puszki',
    'pomidory z puszki (passata)': 'passata pomidorowa',
    'pomidory suszone w oleju': 'pomidory suszone',
    'papryka pieczona z słoika': 'papryka pieczona ze słoika',
    'sos sweet chilli': 'sos słodkie chili', 'sos chili słodki': 'sos słodkie chili',
    'sos bbq': 'sos BBQ', 'sos worcestershire': 'sos Worcestershire',
    'musztarda dijon': 'musztarda Dijon',
    'tuńczyk w oleju z puszki': 'tuńczyk w oleju',
    'ogórek konserwowy': 'ogórek konserwowy',
    'wiśnie z kompotu': 'wiśnie z kompotu',
    'zakwas na żurek': 'zakwas na żur', 'zakwas z żytniej mąki': 'zakwas na żur',
    'marynowana żółta rzodkiew': 'marynowana rzodkiew danmuji',
    'żurawina (konfitura)': 'konfitura żurawinowa',
    'dżem morelowy': 'dżem morelowy',
    'masa krówkowa': 'masa krówkowa',
    'pędy bambusa z puszki': 'pędy bambusa',

    # ── inne ──
    'białe wino': 'wino białe wytrawne', 'białe wino wytrawne': 'wino białe wytrawne',
    'białe wytrawne wino': 'wino białe wytrawne', 'wino białe': 'wino białe wytrawne',
    'czerwone wino': 'wino czerwone wytrawne',
    'wino marsala': 'wino Marsala',
    'bulion': 'bulion warzywny',
    'bulion dashi': 'dashi',
    'czekolada deserowa': 'czekolada deserowa', 'gorzka czekolada': 'czekolada gorzka',
    'kawa espresso': 'kawa espresso', 'kawa': 'kawa espresso',
    'likier pomarańczowy': 'likier pomarańczowy',
    'likier kawowy': 'likier kawowy',
    'masło orzechowe': 'masło orzechowe',
    'mleko skondensowane słodzone': 'mleko skondensowane słodzone',
    'olej': 'olej rzepakowy', 'olej roślinny': 'olej rzepakowy', 'smalec': 'smalec',
    'oliwa': 'oliwa z oliwek',
    'ocet': 'ocet spirytusowy', 'spirytus': 'spirytus',
    'ocet winny': 'ocet winny biały', 'ocet winny biały': 'ocet winny biały',
    'wódka ryżowa': 'wódka',
    'piwo ciemne': 'piwo ciemne',
    'woda bardzo zimna': 'woda', 'woda ciepła': 'woda', 'woda letnia': 'woda',
    'wrząca woda': 'woda',
    'woda gazowana': 'woda gazowana',
    'wodorosty wakame': 'wakame', 'suszone wodorosty miyeok': 'wakame',
    'papier ryżowy': 'papier ryżowy',
    'krem budyniowy': 'krem budyniowy',
    'skórka pomarańczowa kandyzowana': 'skórka pomarańczowa kandyzowana',
}


# Pary, które celowo NIE są scalane mimo podobnej nazwy — trafiają do uwag.
NIE_SCALAJ = {
    'boczek surowy': '≠ boczek wędzony (inny produkt)',
    'bekon': 'zostaje osobno od boczku wędzonego (inna półka)',
    'cheddar': '≠ ser żółty',
    'passata pomidorowa': '≠ pomidory z puszki',
    'cukier puder': '≠ cukier',
    'mleko kokosowe': '≠ mleko',
    'imbir mielony': '≠ imbir (świeży)',
    'bazylia suszona': '≠ bazylia świeża',
    'burak gotowany': '≠ burak (gotowane buraki to osobny produkt w sklepie)',
    'chleb tostowy': '≠ chleb pszenny',
    'ogórek kiszony': '≠ ogórek konserwowy ≠ ogórek',
    'szpinak baby': '≠ szpinak (inne opakowanie, do sałatek)',
    'mozzarella mini': '≠ mozzarella (kulki)',
    'twaróg sernikowy': '≠ twaróg',
    'śmietanka 36%': '≠ śmietanka 30%',
    'dymka': '≠ szczypiorek',
    'tofu jedwabiste': '≠ tofu',
    'ryż do sushi': 'ryż kleisty scalony z ryżem do sushi',
    'kalmary': 'krążki kalmara scalone z tubami kalmarów',
}


# Nadpisania na SUROWEJ nazwie (małe litery, przed czyszczeniem) — tam, gdzie
# nawias albo „lub" niesie informację, której mechaniczne czyszczenie by nie
# zachowało. Wartość: (nazwa_kanoniczna, mnoznik_ilosci albo None, uwaga).
RAW = {
    'wołowina (ligawa/udziec)': ('udziec wołowy', None, ''),
    'wołowina (mostek lub rostbef)': ('mostek wołowy', None, 'było „wołowina (mostek lub rostbef)"'),
    'wołowina (rostbef lub antrykot), cienko pokrojona': ('rostbef', None, 'było „wołowina (rostbef lub antrykot)"'),
    'wołowina (rostbef)': ('rostbef', None, ''),
    'wołowina (łopatka)': ('łopatka wołowa', None, ''),
    'wołowina': ('wołowina gulaszowa', None, 'chilli con carne — kawałki do duszenia'),
    'wieprzowina (schab/łopatka)': ('schab', None, 'było „schab/łopatka" — wzięty pierwszy wariant'),
    'boczek lub mielona wieprzowina': ('boczek surowy', None, 'kuchnia koreańska: surowy boczek (samgyeopsal)'),
    'boczek lub wieprzowina': ('boczek surowy', None, 'kuchnia koreańska: surowy boczek'),
    'boczek lub łopatka wieprzowa': ('boczek surowy', None, 'kuchnia koreańska/chińska: surowy boczek'),
    'limonka (sok)': ('sok z limonki', None, ''),
    'kawa lub herbata do popicia': ('kawa', None, 'napój do podania, nie składnik'),
    'papier ryżowy / ciasto na pierogi (gotowe krążki mandu)': ('ciasto na pierogi', None, 'mandu: gotowe krążki ciasta'),
    'makaron pszenny (grube nitki)': ('makaron udon', None, 'jajangmyeon — grube pszenne nitki'),
    'ryż biały (ugotowany, gorący)': ('ryż', 0.4, 'ryż UGOTOWANY → suchy ×0,4'),
    'ryż długoziarnisty (ugotowany, wystudzony)': ('ryż', 0.4, 'ryż UGOTOWANY → suchy ×0,4'),
    'ryż krótkoziarnisty ugotowany': ('ryż krótkoziarnisty', 0.4, 'ryż UGOTOWANY → suchy ×0,4'),
    'ryż ugotowany': ('ryż', 0.4, 'ryż UGOTOWANY → suchy ×0,4'),
    'ryż ugotowany (najlepiej z dnia poprzedniego)': ('ryż', 0.4, 'ryż UGOTOWANY → suchy ×0,4'),
    'szczypiorek / dymka': ('dymka', None, 'było „szczypiorek / dymka" — w sztukach, więc dymka'),
    'wykałaczki': ('wykałaczki', None, 'NIE SKŁADNIK — do usunięcia z przepisu?'),
}
