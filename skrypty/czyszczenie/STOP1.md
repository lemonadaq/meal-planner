# STOP 1 — czyszczenie bazy dań (2026-11-14)

Nic nie zostało zapisane do bazy. Wszystko poniżej to propozycja do przeglądu.

## Pliki
| plik | co zawiera |
|---|---|
| `mapowanie_skladnikow.csv` | 1473 pary (stara nazwa, stara jednostka) → nowa nazwa, kategoria, jednostka, mnożnik, uwagi, liczba wierszy |
| `dania_meta.csv` | 883 dania: nowa nazwa, kuchnia, poziom, uzasadnienie |
| `skladniki_meta_nowe.csv` | 518 wierszy: 517 składników + 1 stary wiersz bez przepisu (ryż brązowy) |
| `raport_kcal.csv` | kcal do zapisu, kcal z przepisu, kcal dziś, waga porcji, top 3 składniki, uwagi |

Źródła prawdy: `kanon.py` (reguły nazw), `produkty.py` (kategoria, jednostka, kcal, waga sztuki), `faza2_dania.py` (nazwy, kuchnie, poziomy). CSV-ki da się z nich odtworzyć poleceniem `python3 faza1_mapowanie.py && python3 faza3_meta.py && python3 faza2_dania.py && node faza3_kcal.mjs`.

## Liczby
- **Składniki:** 1161 nazw (908 bez rozróżniania wielkości liter) → **517**.
- **Jednostki po zmianie:** g, ml, szt, łyżka, łyżeczka, szczypta, do smaku. Znika szt., łyżki, kg, l, ząbki, Filety, pęczek, opak., szklanka. Mnożnik ≠ 1 dostaje 283 wiersze.
- **„sól i pieprz":** 47 wierszy rozbitych na dwa składniki.
- **Operacje na `dania`:** 5832 aktualizacje, 47 nowych wierszy, 5 usuniętych (scalone duble w jednym daniu). Liczba dań bez zmian: 883.
- **Przemianowane dania:** 230.
- **Kuchnie:** polska 256, włoska 174, międzynarodowa 111, koreańska 56, francuska 56, amerykańska 45, chińska 36, meksykańska 26, grecka 19, bliskowschodnia 17, japońska 15, indyjska 12, hiszpańska 12, tajska 11, turecka 7, wschodnioeuropejska 5, węgierska 5, niemiecka 4, wietnamska 4, marokańska 4, portugalska 3, brytyjska 3, brazylijska 2.
- **Poziomy:** łatwe 485 (54%), średnie 295 (33%), trudne 103 (12%). W bazie były już wypełnione; zmieniłem 33 tam, gdzie łamały reguły z zadania.
- **kcal:** do 400 kcal 180 dań, 400–700 kcal 398, powyżej 700 kcal 305; mediana 590.

## Wątpliwości
1. **Ilości na cały przepis, nie na porcję: 56 dań.** To głównie najstarsze dania (Bigos, Kotlet schabowy, Spaghetti carbonara, Pierogi ruskie…). Wynik z przepisu wyszedł 2,5× lub więcej powyżej dzisiejszego kcal i dokładnie ~4× przy `porcje_bazowe=4`. Do zapisu proponuję wynik / 4 (kolumna `kcal`), surowy wynik jest w `kcal_z_przepisu`. **Lista zakupów liczy te dania dziś też ×4.** Naprawa ilości w przepisach jest poza tym zadaniem.
2. **Powyżej 1500 kcal: 3 dania.** Burger wołowy 1780 (400 g mięsa na porcję), Golonka 1600, Duszone żeberka wołowe 1550.
3. **Poniżej 80 kcal:** Buraczki 60, Sałatka zielona 40, Surówka z kiszonej kapusty 70. Są po podzieleniu z punktu 1 i to realne wartości surówek.
4. **„Jajka z papryką":** w przepisie są same jajka, papryki brak.
5. **„wykałaczki"** (przekąska) i **„kawa lub herbata do popicia"** to nie składniki. Zostawiłem je z 0 kcal. Usunąć?
6. **Bagietka „szt":** w 8 daniach (bruschetta, crostini, grzanki…) „3 szt" znaczy trzy kromki, a nie trzy bagietki. Liczę kromkę = 1/8 bagietki (`BAGIETKA_W_KROMKACH` w `przeksztalc.mjs`).
7. **Sałata / sałata lodowa „2 szt" = 2 liście**, ale w Burgerze i Sałatce zielonej „0,5 szt." to pół główki. Zostawiłem bez przeliczeń.
8. **Ryż ugotowany** (5 wierszy) przeliczony na suchy: ×0,4.
9. **Łyżki obok gramów:** przy maśle, cukrze, mące, miodzie i oleju łyżka/łyżeczka zostaje obok g/ml. Na liście zakupów da się to zsumować, a „1 łyżka masła" czyta się lepiej niż „14 g". Przeliczam tylko to, czego nie da się zsumować (szt ↔ g, opak., kg).
10. **Zioła świeże i przyprawy:** bez przeliczeń (`=` w `produkty.py`), tylko poprawiona pisownia.
11. **Plain „boczek" → „boczek wędzony"** (polskie dania: skwarki, carbonara). Wyjątek: „boczek lub łopatka/wieprzowina" w daniach koreańskich i chińskich → „boczek surowy".
12. **Opakowania:** makaron 500 g, rukola 100 g, oliwki 150 g, serek śmietankowy 150 g.

## Decyzje dla Filipa
- **A. Poziom i kuchnia w bazie bez ogonków (`latwe`, `wloska`).** Na kolumnie `poziom` jest CHECK, a `src/etykiety.js` dokłada ogonki i flagi. W CSV zostają ogonki, `zastosuj.mjs` tłumaczy je przy zapisie. Rekomendacja: zostawić bez ogonków.
- **B. 56 dań „na całość":** zapisać kcal/4 (propozycja) czy przy okazji podzielić też ilości składników przez 4?
- **C. `scripts/` jest w `.gitignore`:** te pliki nie trafią do gita. Przenieść je do `skrypty/czyszczenie/`?

Zatwierdzone przez Filipa 2026-11-14 („OK"): A — bez ogonków, B — kcal/4 bez ruszania ilości, C — przeniesione do `skrypty/czyszczenie/` (zrzuty `dane/` poza gitem).

---

# STOP 2 — uruchomienie (Filip)

Pliki: `00_backup.sql`, `zastosuj_proba.sql`, `zastosuj.sql` (wygenerowane przez `DRY_RUN=false node skrypty/czyszczenie/zastosuj.mjs` ze świeżego stanu bazy).
Każdy plik to jedna transakcja: jeśli któreś sprawdzenie nie przejdzie, wszystko wraca do stanu sprzed uruchomienia.

**Z telefonu: Actions → „Poprawki danych → produkcja" → Run workflow.** Wybierz gałąź z tymi plikami, a w polu `plik` wpisz po kolei:
1. `skrypty/czyszczenie/00_backup.sql` — tworzy tabele `*_backup_20261114`
2. `skrypty/czyszczenie/zastosuj_proba.sql` — **ma się zakończyć czerwonym przebiegiem z komunikatem „PRÓBA OK — nic nie zapisano"** i liczbami. Każdy inny błąd oznacza stop.
3. `skrypty/czyszczenie/zastosuj.sql` — właściwy zapis. Na końcu powinien pokazać: 883 dania, 7763 wiersze, 517 składników, 23 kuchnie.

Alternatywnie SQL Editor, ale pliki 2–3 mają po ~1 MB, więc nie dla telefonu.

Bezpieczniki:
- jeśli ktoś zmieni `dania` między wygenerowaniem pliku a jego uruchomieniem, plik odmówi zapisu („Tabela dania zmieniła się…"); wtedy trzeba wygenerować pliki od nowa
- drugie uruchomienie `zastosuj.sql` też odmówi, z tego samego powodu
- liczba dań przed = po, brak pustych kcal/kuchni/poziomu, 517 składników, w kalendarzu i planie nie przybywa dań bez odpowiednika w `dania` (9 i 2 takie wpisy są już dziś)

Sprawdzone lokalnie (Postgres 16 na kopii danych): backup → próba (PRÓBA OK) → zapis → drugie uruchomienie odrzucone.

**Wycofanie:** dane sprzed zmian są w `*_backup_20261114`. Wystarczy np. `truncate dania; insert into dania select * from dania_backup_20261114;`, analogicznie dla pozostałych tabel.

**Po wdrożeniu sprawdź w apce:**
- listę dań
- 3–4 przemianowane dania, np. „Makaron z bakłażanem i ricottą (pasta alla norma)", „Kurczak w czerwonym winie (coq au vin)", „Bigos"
- Kalendarz z bieżącym tygodniem
- listę zakupów

Potem: odświeżyć `LISTA_DAN.md` (Actions → „Generuj dania" → tryb `lista`, zaznacz `zapisz_liste`), bo `sprawdz-nazwy` porównuje nowe dania z tą listą.

**Do czasu Fazy 5** dania z nowymi kuchniami (portugalska, brytyjska, wschodnioeuropejska, brazylijska, marokańska — 17 dań) nie mają jeszcze chipa w filtrze, bo `src/etykiety.js` ich nie zna. Reszta apki działa bez zmian.
