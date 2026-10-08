#!/usr/bin/env bash
# Sprawdza, czy nazwa pakietu w zbudowanym APK zgadza się z tą, pod którą
# aplikacja jest założona w Play Console.
#
# PO CO: Play odrzuca AAB z niezgodnym `applicationId`, a komunikat konsoli
# jest po polsku mylący — mówi o „pliku", więc wygląda, jakby chodziło
# o nazwę pliku .aab. Nie chodzi. Lepiej czerwony przebieg niż odbicie
# z konsoli po wgraniu.
#
# Czytamy z APK, nie z AAB: `aapt2 dump` radzi sobie z APK w każdej wersji
# build-tools, a oba artefakty wychodzą z tego samego wariantu Gradle, więc
# mają tę samą nazwę pakietu.
#
# Użycie:  sprawdz-nazwe-pakietu.sh <plik.apk> <oczekiwana.nazwa>
# Opcjonalnie: AAPT2=/ścieżka/do/aapt2 (domyślnie szukany w build-tools SDK)
#
# Osobny plik, a nie wklejka w YAML-u, żeby dało się go odpalić z atrapą
# aapt2 i sprawdzić NAPRAWDĘ ten kod, który idzie na CI.

set -euo pipefail

APK="${1:-}"
OCZEKIWANA="${2:-}"

if [ -z "$APK" ] || [ -z "$OCZEKIWANA" ]; then
  echo "Użycie: $0 <plik.apk> <oczekiwana.nazwa.pakietu>" >&2
  exit 2
fi
if [ ! -f "$APK" ]; then
  echo "::error::Nie ma pliku APK: $APK" >&2
  exit 1
fi

# aapt2 wskazany z zewnątrz (testy) albo wyszukany w SDK.
if [ -z "${AAPT2:-}" ]; then
  SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
  if [ -n "$SDK" ]; then
    AAPT2=$(find "$SDK/build-tools" -name aapt2 2>/dev/null | sort -V | tail -1)
  fi
fi
if [ -z "${AAPT2:-}" ] || [ ! -x "$AAPT2" ]; then
  echo "::error::Nie znalazłem aapt2 — nie odczytam nazwy pakietu." >&2
  exit 1
fi

# Droga pierwsza: `dump packagename` wypisuje samą nazwę i nic więcej.
# Nie ma go w starszych build-tools, więc błąd jest tu dopuszczalny.
PAKIET=$("$AAPT2" dump packagename "$APK" 2>/dev/null | head -1 | tr -d '[:space:]' || true)

# Droga druga: pierwsza linia `dump badging`.
#
# Wzorzec jest ZAKOTWICZONY na `^package: name='`. Bez kotwicy zachłanne
# `.*name='` łapie OSTATNIE wystąpienie `name='` w linii, a ta kończy się
# polem `compileSdkVersionCodename='16'` — i zamiast nazwy pakietu wychodzi
# numer wersji Androida. Dokładnie to wywaliło przebieg 2026-10-08.
if [ -z "$PAKIET" ]; then
  PAKIET=$("$AAPT2" dump badging "$APK" 2>/dev/null \
           | sed -n "s/^package: name='\([^']*\)'.*/\1/p" \
           | head -1 || true)
fi

if [ -z "$PAKIET" ]; then
  echo "::error::aapt2 nie zwrócił nazwy pakietu z $APK." >&2
  exit 1
fi

# Bezpiecznik na wypadek, gdyby wyciąganie znowu złapało nie to, co trzeba:
# nazwa pakietu Androida to człony [A-Za-z0-9_] rozdzielone kropkami,
# pierwszy znak członu nie może być cyfrą. „16" tego nie przejdzie.
if ! printf '%s' "$PAKIET" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)+$'; then
  echo "::error::To nie wygląda na nazwę pakietu: „$PAKIET”." >&2
  echo "::error::Najpewniej zepsuło się wyciąganie jej z aapt2, nie sam build." >&2
  exit 1
fi

# UWAGA przy czytaniu loga: jeśli któryś sekret Actions ma tę samą wartość
# co człon nazwy (np. ANDROID_KEY_ALIAS), GitHub zamaskuje go gwiazdkami
# i w logu zobaczysz „pl.***". Porównanie i tak leci na pełnych wartościach —
# wiążący jest werdykt poniżej, nie to, co widać.
echo "Nazwa pakietu w artefakcie: $PAKIET"
echo "Play Console oczekuje:      $OCZEKIWANA"

if [ "$PAKIET" != "$OCZEKIWANA" ]; then
  echo "::error::NIEZGODNA nazwa pakietu — Play Console odrzuci to wgranie."
  echo "::error::Popraw applicationId w android/app/build.gradle."
  exit 1
fi

echo "::notice::Nazwa pakietu ZGODNA."
