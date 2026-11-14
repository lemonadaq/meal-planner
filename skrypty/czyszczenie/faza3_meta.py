# Faza 3a — generuje skladniki_meta_nowe.csv: jeden wiersz na składnik kanoniczny.
# Tylko czyta dane z dysku. Wymaga mapowanie_skladnikow.csv (Faza 1).
#
# Skąd co:
#   nazwa, kcal_100g, waga_sztuki_g — produkty.py (nazwa kanoniczna z Fazy 1)
#   aliasy — znormalizowane stare warianty nazwy z dania + aliasy scalonych wierszy meta
#   jednostka_bazowa, rozmiar_opakowania, jednostka_opakowania, zaokraglaj — ze starego
#       wiersza skladniki_meta, jeśli jakiś pasuje (przy kilku: uzupełniony, potem nowszy)
# Stare wiersze meta bez odpowiednika w przepisach zostają bez zmian (zrodlo=stary),
# bo z meta korzystają też ręczne pozycje listy zakupów.
import csv, json, re, sys, unicodedata
from pathlib import Path

TU = Path(__file__).parent
sys.path.insert(0, str(TU))
from produkty import wczytaj


def norm(s):
    """1:1 z normalizujNazweMeta() w src/jednostki.js."""
    s = unicodedata.normalize('NFD', (s or '').lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').replace('ł', 'l')
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def main():
    prod = wczytaj()
    meta = json.load(open(TU / 'dane' / 'skladniki_meta.json'))
    mapa = list(csv.DictReader(open(TU / 'mapowanie_skladnikow.csv')))

    warianty = {n: set() for n in prod}
    for w in mapa:
        warianty[w['nazwa_nowa']].add(norm(w['nazwa_stara']))
    uzyte = {w['nazwa_nowa'] for w in mapa}
    norm_kanon = {norm(n): n for n in prod if n in uzyte}

    # Stary wiersz meta → kanon: najpierw po nazwie, potem po aliasach.
    RECZNIE = {'quinoa': 'komosa ryżowa'}

    def kanon_dla_meta(m):
        n = m['nazwa_norm'] or norm(m['nazwa'])
        if n in RECZNIE: return RECZNIE[n]
        if n in norm_kanon: return norm_kanon[n]
        for k, war in warianty.items():
            if k in uzyte and n in war: return k
        for a in m['aliasy'] or []:
            if a in norm_kanon: return norm_kanon[a]
        return None

    przypisane = {}
    stare_bez = []
    for m in meta:
        k = kanon_dla_meta(m)
        if k: przypisane.setdefault(k, []).append(m)
        else: stare_bez.append(m)

    def lepszy(ms):
        return sorted(ms, key=lambda m: (m['rozmiar_opakowania'] is not None,
                                         m['updated_at'] or ''), reverse=True)[0]

    # Alias z przepisów należy do składnika, na który mapuje go Faza 1; aliasy
    # odziedziczone ze starych wierszy meta odpadają, jeśli wskazują gdzie indziej.
    wlasciciel = {}
    for k in uzyte:
        for a in warianty[k]:
            wlasciciel.setdefault(a, set()).add(k)

    wiersze = []
    for k in sorted(uzyte):
        p = prod[k]
        ms = przypisane.get(k, [])
        baza = lepszy(ms) if ms else None
        aliasy = set(warianty[k])
        for m in ms:
            aliasy |= set(m['aliasy'] or []) | {m['nazwa_norm'] or norm(m['nazwa'])}
        nk = norm(k)
        # alias nie może być nazwą INNEGO składnika — dopasujMeta wybrałoby zły wiersz
        aliasy = sorted(a for a in aliasy if a and a != nk and a not in norm_kanon
                        and wlasciciel.get(a, {k}) == {k})
        jedn = p['jednostka'] if p['jednostka'] in ('g', 'ml', 'szt') else 'g'
        zrodlo = ('scalony z: ' + ', '.join(m['nazwa'] for m in ms)) if ms else 'nowy'
        wiersze.append({
            'nazwa': k, 'nazwa_norm': nk, 'aliasy': '|'.join(aliasy),
            'jednostka_bazowa': (baza['jednostka_bazowa'] if baza else jedn),
            'rozmiar_opakowania': (baza['rozmiar_opakowania'] if baza else ''),
            'jednostka_opakowania': (baza['jednostka_opakowania'] if baza else ''),
            'zaokraglaj': str(bool(baza['zaokraglaj'])).lower() if baza else 'false',
            'waga_sztuki_g': f"{p['waga_sztuki_g']:g}" if p['waga_sztuki_g'] else '',
            'kcal_100g': f"{p['kcal_100g']:g}" if p['kcal_100g'] is not None else '',
            'zrodlo': zrodlo,
        })
    for m in stare_bez:
        wiersze.append({
            'nazwa': m['nazwa'], 'nazwa_norm': m['nazwa_norm'], 'aliasy': '|'.join(m['aliasy'] or []),
            'jednostka_bazowa': m['jednostka_bazowa'], 'rozmiar_opakowania': m['rozmiar_opakowania'] or '',
            'jednostka_opakowania': m['jednostka_opakowania'] or '',
            'zaokraglaj': str(bool(m['zaokraglaj'])).lower(),
            'waga_sztuki_g': m['waga_sztuki_g'] or '',
            'kcal_100g': m['kcal_100g'] or {'ryz brazowy': 350}.get(m['nazwa_norm'], ''),
            'zrodlo': 'stary — brak w przepisach, bez zmian',
        })

    kol = ['nazwa', 'nazwa_norm', 'aliasy', 'jednostka_bazowa', 'rozmiar_opakowania',
           'jednostka_opakowania', 'zaokraglaj', 'waga_sztuki_g', 'kcal_100g', 'zrodlo']
    with open(TU / 'skladniki_meta_nowe.csv', 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=kol)
        w.writeheader()
        w.writerows(wiersze)

    # kontrola: nazwa_norm unikalne, żaden alias nie wskazuje na dwa wiersze
    nn = [w['nazwa_norm'] for w in wiersze]
    dup = {n for n in nn if nn.count(n) > 1}
    alias_do = {}
    for w in wiersze:
        for a in filter(None, w['aliasy'].split('|')):
            alias_do.setdefault(a, []).append(w['nazwa'])
    kolizje = {a: v for a, v in alias_do.items() if len(v) > 1 or a in nn}
    print(f'wierszy: {len(wiersze)} (kanonicznych: {len(uzyte)}, scalonych ze starych: '
          f'{sum(1 for w in wiersze if w["zrodlo"].startswith("scalony"))}, starych bez zmian: {len(stare_bez)})')
    print('stare bez odpowiednika:', [m['nazwa'] for m in stare_bez])
    print('bez kcal:', [w['nazwa'] for w in wiersze if not w['kcal_100g']])
    if dup: print('BŁĄD dubel nazwa_norm:', dup)
    if kolizje: print('BŁĄD kolizje aliasów:', kolizje)


if __name__ == '__main__':
    main()
