# Faza 1 — generuje mapowanie_skladnikow.csv z dane/dania.json.
# Tylko czyta dane z dysku. Uruchomienie: python3 skrypty/czyszczenie/faza1_mapowanie.py
import csv, json, collections, re, sys
from pathlib import Path

TU = Path(__file__).parent
sys.path.insert(0, str(TU))
from kanon import czysc, SYN, RAW, NIE_SCALAJ
from produkty import wczytaj

PROD = wczytaj()
LYZ = {'łyżka', 'łyżeczka', 'szczypta'}

# Jednostki „opakowaniowe" → gramy. Typowa gramatura, zawsze z uwagą w CSV.
OPAK_G = {'makaron': 500, 'rukola': 100, 'oliwki': 150, 'serek śmietankowy': 150}


def gestosc(nazwa):
    """g/ml — tylko tam, gdzie odbiega od wody o więcej niż ~5%."""
    if re.search(r'olej|oliwa', nazwa): return 0.92
    if 'miód' in nazwa: return 1.4
    if 'smalec' in nazwa: return 0.9
    return 1.0


_JUZ_OPISANE = set()


def kanon_nazwy(stara):
    """→ (lista nazw kanonicznych, mnoznik_dodatkowy, uwagi)."""
    raw = re.sub(r'\s+', ' ', (stara or '').strip()).lower()
    if raw in ('sól i pieprz',):
        return ['sól', 'pieprz czarny'], 1, ['ROZBIJ']
    if raw in RAW:
        nowa, mn, uw = RAW[raw]
        return [nowa], mn or 1, [uw] if uw else []
    c, uw = czysc(stara)
    nowa = SYN.get(c, c)
    if nowa in NIE_SCALAJ and nowa not in _JUZ_OPISANE:
        _JUZ_OPISANE.add(nowa)
        uw.append(NIE_SCALAJ[nowa])
    return [nowa], 1, uw


# Pary (nazwa kanoniczna, stara jednostka), gdzie „szt" znaczy co innego niż
# waga sztuki z tabeli produktów.
PARA = {
    ('kapusta biała', 'szt'): ('g', 50, 'gołąbki: „szt" = liść kapusty ≈ 50 g'),
}


def przelicz(nazwa, jedn_stara, p):
    """(jednostka_stara, produkt) → (jednostka_nowa, mnoznik, uwaga)."""
    j = (jedn_stara or '').strip()
    if (nazwa, j) in PARA:
        return PARA[(nazwa, j)]
    cel = p['jednostka']
    waga = p['waga_sztuki_g']
    glyz = p['g_na_lyzke']

    # 1. pisownia i rodzina jednostki
    if j in ('szt.', 'szt'): j, mn, uw = 'szt', 1, ''
    elif j in ('łyżki', 'Łyżki', 'łyżka'): j, mn, uw = 'łyżka', 1, ''
    elif j == 'kg': j, mn, uw = 'g', 1000, ''
    elif j == 'l': j, mn, uw = 'ml', 1000, ''
    elif j == 'ząbki': j, mn, uw = 'szt', 1, 'ząbek = 1 szt'
    elif j == 'Filety': j, mn, uw = 'g', 150, 'filet = 150 g'
    elif j == 'pęczek':
        if nazwa == 'rzodkiewka': j, mn, uw = 'szt', 10, 'pęczek rzodkiewek = 10 szt'
        else: j, mn, uw = 'szt', 1, 'pęczek = 1 szt'
    elif j == 'opak.':
        g = next((v for k, v in OPAK_G.items() if nazwa.startswith(k)), None)
        if g is None: return None, None, f'BRAK gramatury opakowania dla {nazwa}'
        j, mn, uw = 'g', g, f'opak. = {g} g (typowa gramatura)'
    elif j == 'szklanka':
        j, mn, uw = 'g', 200, 'szklanka ryżu = 200 g'
    else: mn, uw = 1, ''

    # 2. do jednostki docelowej
    if cel == '=' or j in ('do smaku', '') or j == cel:
        return j, mn, uw
    if j in LYZ:
        if cel in ('g', 'ml', 'szt', 'łyżka'):
            return j, mn, uw          # łyżki zostają obok (sumowalne)
    if cel == 'łyżka':
        if j == 'g': return 'łyżka', mn / (glyz or 15), f'{glyz or 15:g} g = 1 łyżka'
        if j == 'ml': return 'łyżka', mn / 15, '15 ml = 1 łyżka'
    if cel == 'g':
        if j == 'ml': return 'g', mn * gestosc(nazwa), ''
        if j == 'szt' and waga: return 'g', mn * waga, f'1 szt = {waga:g} g'
    if cel == 'ml':
        if j == 'g': return 'ml', mn / gestosc(nazwa), ''
    if cel == 'szt':
        if j == 'g' and waga: return 'szt', mn / waga, f'1 szt = {waga:g} g'
        if j == 'ml' and waga: return 'szt', mn / waga, f'1 szt = {waga:g} ml'
    return None, None, f'BRAK przelicznika {j} → {cel}'


def main():
    dania = json.load(open(TU / 'dane' / 'dania.json'))
    pary = collections.Counter((r['Składnik'] or '', r['Jednostka'] or '') for r in dania)
    wiersze, bledy = [], []
    for (stara, jedn), ile in sorted(pary.items(), key=lambda x: (x[0][0].lower(), x[0][1])):
        nowe, mn_dod, uwagi = kanon_nazwy(stara)
        for i, nowa in enumerate(nowe):
            p = PROD.get(nowa)
            if not p:
                bledy.append(f'brak w produkty.py: {nowa!r} (z {stara!r})'); continue
            jn, mn, uw = przelicz(nowa, jedn, p)
            if jn is None:
                bledy.append(f'{stara!r} [{jedn}] → {nowa}: {uw}'); continue
            mn = mn * mn_dod
            uw_all = [u for u in uwagi + [uw] if u]
            if len(nowe) > 1 and i > 0: uw_all = ['ROZBIJ (drugi składnik)']
            wiersze.append([stara, jedn, nowa, p['kategoria'], jn,
                            f'{mn:.6g}', '; '.join(dict.fromkeys(uw_all)), ile])
    with open(TU / 'mapowanie_skladnikow.csv', 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['nazwa_stara', 'jednostka_stara', 'nazwa_nowa', 'kategoria_nowa',
                    'jednostka_nowa', 'mnoznik', 'uwagi', 'wiersze'])
        w.writerows(wiersze)
    stare = {(r['Składnik'] or '').strip() for r in dania}
    nowe = {w[2] for w in wiersze}
    print(f'par (nazwa, jednostka): {len(pary)}, wierszy CSV: {len(wiersze)}')
    print(f'nazwy: {len(stare)} → {len(nowe)} (bez wielkości liter przed: {len({s.lower() for s in stare})})')
    nieuzyte = set(PROD) - nowe
    if nieuzyte: print('produkty bez użycia:', sorted(nieuzyte))
    for b in bledy: print('BŁĄD', b)


if __name__ == '__main__':
    main()
