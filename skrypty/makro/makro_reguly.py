# Reguły: pierwszy pasujący wzorzec (regex na nazwie znormalizowanej) → B, T, W na 100 g
import re
R = [
 # tłuszcze
 (r'^(olej|oliwa|smalec|slonina)', (0,100,0)),
 (r'maslo orzechowe', (25,50,16)), (r'pasta tahini', (17,54,21)),
 (r'^maslo', (0.7,82,0.7)),
 (r'majonez', (1,75,2)),
 (r'sos (burgerowy|czosnkowy|cezar)', (2,35,8)), (r'^pesto', (5,45,6)),
 # nabiał
 (r'mascarpone', (5,43,3)), (r'(smietana|smietanka) ?(30|kremowka)|kremowka', (2.5,30,3)),
 (r'^smietana', (2.5,18,3.6)),
 (r'serek (alette|smietankowy|kremowy)', (6,24,3)), (r'serek topiony', (12,24,5)),
 (r'serek waniliowy', (11,4,15)),
 (r'parmezan', (33,29,0)), (r'(mozzarella|mozarella)', (18,19,2)),
 (r'feta', (14,21,1)), (r'halloumi', (22,25,2)), (r'ser kozi', (20,28,1)),
 (r'camembert', (20,24,0)), (r'gorgonzola|plesniowy', (19,31,0)), (r'paneer', (18,20,3)),
 (r'ricotta', (11,10,3)),
 (r'twarog sernikowy|twarogowy na sernik', (16,9,3)), (r'(twarog|twarozek)', (18,5,3.5)),
 (r'(cheddar|gouda|gruyere|ser zolty)', (25,28,0)),
 (r'skyr', (11,0.2,4)), (r'jogurt grecki', (5,10,4)), (r'jogurt', (4,3,6)),
 (r'(kefir|maslanka)', (3.4,1.5,4.5)),
 (r'mleko kokosowe', (2,18,3)), (r'mleko skondensowane', (8,8,55)), (r'mleko w proszku', (26,26,38)),
 (r'^mleko', (3.3,2,4.8)),
 (r'(zoltk)', (16,27,3.6)), (r'bialko jajka', (11,0,0.7)), (r'^jaj', (12.5,9.7,0.7)),
 # drób
 (r'(piers|filet).*(kurczaka|indyka)|filet z indyka', (23,1.5,0)),
 (r'(udk|udek|udka).*kurczak|kurczaka udka|skrzydelka', (18,11,0)),
 (r'kaczk', (18,20,0)), (r'watrobka', (17,5,1)),
 # wołowina / cielęcina / jagnięcina
 (r'mielon.*wolowo wieprz|mieso mielone wolowo', (17,21,0)),
 (r'mielon.*wolow|wolowina na burgery|mielona wolowina', (18,18,0)),
 (r'mielon.*wieprz', (16,22,0)), (r'mielon.*jagni', (17,23,0)),
 (r'(antrykot|karczek wolowy|szponder|rozbratel|zeberka)', (18,18,0)),
 (r'peklowana', (20,10,0)), (r'flaki', (13,4,0)),
 (r'(udziec|poledwica wolowa|ligawa|zrazowa|rostbef|lopatka wolowa|wolowina)', (21,6,0)),
 (r'lopatka cielec', (20,6,0)), (r'lopatka jagniec', (18,15,0)),
 # wieprzowina
 (r'(schab|poledwiczka)', (21,6,0)),
 (r'(lopatka wieprz|karkowka|wieprzowina)', (17,18,0)),
 (r'(boczek|bekon)', (12,45,0)),
 # wędliny
 (r'szynka (parmenska|dojrzewajaca)', (25,18,0)), (r'szynka', (19,3,1.5)),
 (r'poledwica sopocka', (20,4,1)), (r'salami', (22,35,1)), (r'chorizo', (24,38,2)),
 (r'kaszanka', (11,20,15)), (r'parowk', (12,22,2)), (r'kielbas', (13,27,1)),
 # ryby i owoce morza
 (r'losos wedzony', (22,9,0)), (r'losos', (20,13,0)), (r'makrela', (21,15,0)),
 (r'(dorsz|sol\b|soli$)', (18,0.7,0)), (r'pstrag', (20,5,0)), (r'karp', (18,6,0)),
 (r'sledz', (16,18,0)), (r'tunczyk w oleju', (26,8,0)), (r'tunczyk', (24,1,0)),
 (r'krewetki', (18,1,1)), (r'malze', (12,2,4)), (r'anchois', (25,10,0)),
 (r'tofu', (12,7,2)),
 # zboża
 (r'(skrobia|maka ziemniaczana)', (0.5,0,85)),
 (r'(papier ryzowy)', (4,0.5,80)),
 (r'gnocchi', (4,0.5,33)), (r'tortellini', (11,6,45)),
 (r'(quinoa|komosa)', (14,6,64)), (r'platki owsiane', (13,7,60)),
 (r'platki kukurydziane', (7,1,84)), (r'granola', (10,17,63)),
 (r'(kukurydza do prazenia|ziarna kukurydzy)', (11,4,74)),
 (r'(panko|bulka tarta)', (12,5,72)),
 (r'^ryz', (7,1,78)), (r'(kasza|kuskus|pszenica)', (12,2.5,70)),
 (r'^makaron|spaghetti', (12.5,1.5,72)), (r'^maka', (10,1.5,72)),
 # pieczywo i ciasta
 (r'chleb zytni|pelnoziarnist', (7,1.5,44)), (r'(tortill|wrap)', (8.5,7,50)),
 (r'chalka', (8,7,55)), (r'croissant', (8,21,45)),
 (r'(herbatniki|krakersy)', (7,15,70)), (r'biszkopty', (8,4,80)),
 (r'ciasto francuskie', (5.5,25,40)), (r'ciasto filo', (8,4,57)), (r'ciasto drozdzowe', (8,8,50)),
 (r'piernik', (5,5,75)), (r'grzanki', (11,10,68)), (r'nachosy|chipsy tortilla', (7,24,63)),
 (r'(chleb|bulk|bagietk|pieczywo|pita|ciabatta)', (8,2,50)),
 # strączki
 (r'ciecierzyca', (7,2.5,17)), (r'fasolka w sosie', (5,0.5,15)),
 (r'fasola.*puszk|fasola w puszce', (7,0.5,15)),
 (r'(fasola biala$|groch|soczewica)', (23,1.5,58)), (r'hummus', (8,17,14)),
 # orzechy i nasiona
 (r'migdal', (21,50,20)), (r'orzechy wloskie', (15,65,14)), (r'nerkowca', (18,44,30)),
 (r'orzechy laskowe', (15,61,17)), (r'orzeszki ziemne', (26,49,16)), (r'sezam', (18,50,23)),
 (r'pestki dyni', (30,49,11)), (r'slonecznik', (21,51,20)), (r'chia', (17,31,42)),
 (r'siemie', (18,42,29)), (r'wiorki kokosowe', (7,64,24)), (r'^mak$', (18,42,28)),
 (r'chalwa', (12,30,55)),
 # słodkie
 (r'czekolada gorzka|gorzka czekolada', (8,43,46)), (r'czekolada', (6,32,58)),
 (r'kakao', (20,11,58)), (r'kajmak', (7,9,55)),
 (r'(cukier|miod|syrop|dzem|konfitura|galaretka|budyn|amaretto|likier)', (0.3,0,80)),
 (r'(rodzynki|daktyle|suszone sliwki|morele)', (2.5,0.5,68)),
 # sosy, przetwory
 (r'chrzan', (1.5,0.5,10)), (r'kapary', (2,1,5)), (r'banan', (1.1,0.3,23)),
 (r'(czosnek|zabek czosnku)', (6,0.5,33)), (r'^imbir$', (1.8,0.8,18)),
 (r'ketchup', (1.5,0.2,24)), (r'sos sojowy', (8,0.5,5)), (r'sos bbq', (1,0.5,36)),
 (r'sweet chilli', (0.5,0.5,53)), (r'musztarda', (6,7,7)), (r'pasta miso', (12,6,26)),
 (r'pasta curry', (3,10,12)), (r'sos (rybny|ostrygowy)', (5,0.2,10)),
 (r'worcestershire', (0,0,20)), (r'krem balsamiczny', (0.5,0,35)),
 (r'koncentrat', (4,0.5,15)), (r'pomidory suszone', (5,15,25)),
 (r'(passata|pomidory.*puszk|pomidory w puszce|sos pomidorowy)', (1.2,0.2,4.5)),
 (r'sos pieczarkowy', (2,6,5)),
 (r'oliwki', (1,15,4)), (r'awokado', (2,15,9)),
 (r'grzyby suszone', (22,3,40)),
 # warzywa skrobiowe
 (r'frytki', (3.4,15,41)), (r'ziemniak', (2,0.1,17)), (r'batat', (1.6,0.1,20)),
 (r'groszek', (5,0.4,14)), (r'kukurydza', (3,1,16)),
 # napoje, buliony
 (r'^(wino( |$)|piwo|wodka)', (0.3,0,3)), (r'(bulion|dashi|woda|kawa)', (0.5,0.2,0.3)),
 (r'(sok malinowy)', (0,0,12)),
]
WARZYWA = r'(baklazan|brokul|buraki|burak|cebula|cukinia|dymka|fasolka szparagowa|jarmuz|kalafior|kapusta|kielki|marchew|ogorek|ogorki|papryka (czerwona|zolta)$|^papryka$|papryczka|pieczarki|boczniaki|kurki|pomidor|por$|rukola|rzodkiew|rzepa|salat|seler|szczypiorek|szpinak|szparagi|szalotka|dynia|fenkul|endywia|papaja|wloszczyzna|botwinka|natka|koperek|kolendra|bazylia|mieta|listki|czosnek|imbir$|zabek|zakwas|wakame|nori|rabarbar|pietruszka)'
OWOCE = r'(banan|borowki|brzoskwinia|cytryn|limonk|jablk|kiwi|mango|maliny|truskawki|pomarancz|winogrona|owoce|arbuz|czeresnie|granat|gruszka|jagody|sliwki|wisnie|zurawina|ananas|skorka)'
PRZYPRAWY = r'^(sol( morska)?|szczypta soli|sol i pieprz|swiezo mielony pieprz|pieprz( \w+)*|cynamon( mielony)?|curry( w proszku)?|chili w proszku|chilli|galka muszkatolowa|garam masala|kmin( rzymski)?( mielony)?|kumin( mielony)?|kminek|lisc laurowy|majeranek|oregano( suszone)?|papryka (slodka|ostra|wedzona)( \w+)?( \w+)?|platki chili|rozmaryn( swiezy)?|tymianek|ziele angielskie|ziola( \w+)*|przyprawa( \w+)*|kurkuma|szafran|szalwia|anyz gwiazdzisty|gozdziki|sumak|laska wanilii|ekstrakt waniliowy|drozdze( \w+)?|proszek do pieczenia|soda|zelatyna|ocet( \w+)*|wykalaczki|czosnek (granulowany|w proszku)|imbir mielony|bazylia suszona)$'

def makro(n, kcal=None):
    # przyprawy pierwsze — „czosnek granulowany", „papryka słodka"
    if re.search(PRZYPRAWY, n):
        return (10, 5, 40), 'przyprawa'
    for wz, v in R:
        if re.search(wz, n):
            return v, 'regula'
    if re.search(OWOCE, n):
        return (0.8, 0.3, 11), 'owoc'
    if re.search(WARZYWA, n):
        return (1.8, 0.3, 5), 'warzywo'
    return None, 'brak'
