# Agent przepisów — Menu Planer (tryb automatyczny w CI)

Działasz w GitHub Actions bez człowieka. Nikt nie odpowie na pytania, więc
decyzje podejmujesz sam, w granicach tej instrukcji.

Z CLAUDE.md obowiązuje: stack, konwencje i lista „nie ruszaj". NIE obowiązują
sekcje „Workflow z Filipem" i „Pierwsze co zrób w sesji".

**Nie commitujesz, nie pushujesz, nie tworzysz PR.** Zrobi to workflow.
Twoim wynikiem jest JEDEN plik: `skrypty/dania/paczka-NN.json`.

## Zadanie

Napisz `ILE` przepisów na dania, których w bazie JESZCZE NIE MA, i zapisz je
w nowej paczce. Workflow wrzuci je potem do bazy i dorobi zdjęcia.

Liczba dań i ewentualne wytyczne (kuchnie, rodzaje) są w prompcie, którym
zostałeś wywołany. Bez wytycznych: trzymaj proporcje jak w `propozycje.js`
(polska 30, włoska 18, francuska 14, dalej popularne kierunki; obiady, kolacje,
śniadania, desery i surówki).

**`przekaska` NIE wchodzi do paczki** — to ustalenie Filipa.

## Kolejność pracy

1. `cat skrypty/README.md` — sekcje „Tryb `import`", „Słownik składników"
   i „Jednostki: czemu cebula bywa w gramach". Format pliku jest tam opisany.
2. Zobacz jedną istniejącą paczkę (`skrypty/dania/paczka-01.json`) — pisz
   dokładnie w tym formacie.
3. Wymyśl KANDYDATÓW na nazwy, z zapasem (dwa razy więcej, niż masz napisać).
4. Sprawdź je: `NAZWY="Jedna; Druga; Trzecia" node skrypty/sprawdz-nazwy.mjs`.
   Skrypt porównuje z bazą (`LISTA_DAN.md`, odświeżony przez workflow) i z
   paczkami czekającymi na import.
5. **Przejrzyj „czyste" oczami.** Miara porównuje NAPISY, nie dania —
   „Pollo alla cacciatora" i „Kurczak alla cacciatora" przechodzą jej przez
   sito, a to jedno danie. Tak samo „Żur" i „Żurek", „Szarlotka" i „Szarlotka
   na kruchym spodzie". Takie pary WYRZUĆ sam.
6. Napisz przepisy do `skrypty/dania/paczka-NN.json`, gdzie NN to pierwszy
   wolny numer w katalogu.
7. Sprawdź plik: `npx vitest run src/test/importDan.test.js`. Test waliduje
   każdą paczkę z katalogu i pilnuje, żeby dania się nie powtarzały.
   Czerwony test = popraw plik, nie test.

## Czego pilnować w przepisach

- **Ilości są NA JEDNĄ PORCJĘ**, nie na całość (`porcje_bazowe` to 4).
  Ułamki podawaj tekstem: `1/2`, `1 1/2`.
- **Jednostka taka, w jakiej produkt się KUPUJE**: `szt` dla cebuli, jajka,
  papryki, ziemniaka, puszki; `g` dla mięsa, kasz, mąki, sera; `ml` dla płynów;
  `łyżka`/`łyżeczka` dla dodatków; `szczypta` dla przypraw. Nic poza tą piątką.
- **Nazwa składnika = nazwa produktu ze sklepu**, w mianowniku, bez nawiasów,
  bez alternatyw („boczek wędzony", nie „boczek lub podgardle"), bez ilości
  w nazwie. Jeśli ten produkt jest już w innych paczkach — użyj tej samej
  pisowni (`grep -h '"nazwa"' skrypty/dania/*.json | sort | uniq -c | sort -rn`).
- **Kategoria** z zamkniętej listy (`KATEGORIE` w `skrypty/wspolne.js`) —
  od niej zależy kolejność na liście zakupów.
- **Kroki**: 4-6, konkretne, po polsku, bez numeracji w treści. Pisz to, co
  naprawdę robi różnicę („odciśnij szpinak, inaczej rozmoczy ciasto"), a nie
  „wymieszaj składniki".
- **`opis_wizualny` PO ANGIELSKU**, 2-3 zdania: jak danie wygląda NA TALERZU.
  Z tego powstaje prompt zdjęcia. Opisuj kształt, kolor, fakturę, gdzie jest
  sos — nie styl zdjęcia, światło ani naczynie. Danie o utrwalonej postaci
  (carbonara, schabowy) opisz tak, jak wygląda naprawdę, bez ulepszania.
- **Przepis ma być realny do ugotowania w domu po pracy.** Żadnych
  restauracyjnych udziwnień i składników z półki, której nie ma w Biedronce.

## Na koniec

Napisz do `agent-out/wynik.md`:

```
STATUS: OK
TYTUL: Paczka NN: <ile> dań (<kuchnie w skrócie>)
```

a pod tym listę dań (`Nazwa|rodzaj`) i jedno zdanie o tym, co wyrzuciłeś na
ręcznym przejrzeniu i dlaczego. Bez pliku `wynik.md` workflow uzna task za
przerwany.
