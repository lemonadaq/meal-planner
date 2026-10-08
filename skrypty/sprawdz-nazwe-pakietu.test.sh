#!/usr/bin/env bash
# Test `sprawdz-nazwe-pakietu.sh` na atrapie aapt2.
#
# PO CO OSOBNY TEST: pierwsza wersja tego sprawdzania wywaliła wydanie
# 2026-10-08. Wzorzec `.*name='` był zachłanny i łapał OSTATNIE wystąpienie
# `name='` w linii `dump badging` — czyli `compileSdkVersionCodename='16'`.
# Zamiast nazwy pakietu wychodziło „16". Wariant `android16` poniżej odtwarza
# tamto wyjście jeden do jednego.
#
# Odpalenie: bash skrypty/sprawdz-nazwe-pakietu.test.sh

set -uo pipefail
KATALOG="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPRAWDZACZ="$KATALOG/sprawdz-nazwe-pakietu.sh"
ROBOCZY="$(mktemp -d)"
trap 'rm -rf "$ROBOCZY"' EXIT

cat > "$ROBOCZY/aapt2" <<'STUB'
#!/usr/bin/env bash
# Atrapa aapt2. $1=dump, $2=podkomenda. WARIANT wybiera kształt wyjścia.
case "$2" in
  packagename)
    # Podkomendy nie ma w starszych build-tools — wtedy aapt2 kończy błędem.
    case "$WARIANT" in
      nowy) echo "pl.menuplaner" ;;
      *)    echo "unknown command 'packagename'" >&2; exit 1 ;;
    esac ;;
  badging)
    case "$WARIANT" in
      android16)
        echo "package: name='pl.menuplaner' versionCode='16' versionName='1.0.0' platformBuildVersionName='16' platformBuildVersionCode='36' compileSdkVersion='36' compileSdkVersionCodename='16'" ;;
      android15)
        echo "package: name='pl.menuplaner' versionCode='3' versionName='1.0.1' platformBuildVersionName='15' platformBuildVersionCode='35' compileSdkVersion='35' compileSdkVersionCodename='15'" ;;
      stary)
        echo "package: name='pl.menuplaner' versionCode='1' versionName='1.0'" ;;
      zla_nazwa)
        echo "package: name='com.menuplaner.app' versionCode='16' versionName='1.0.0' compileSdkVersionCodename='16'" ;;
      smieci)
        echo "package: name='16' versionCode='16'" ;;
      pusto) : ;;
    esac
    # Dalsze linie badging — sprawdzacz ma brać TYLKO pierwszą.
    echo "sdkVersion:'23'"
    echo "application-label:'Menu Planer'"
    echo "launchable-activity: name='com.menuplaner.app.MainActivity'  label='Menu Planer'" ;;
esac
STUB
chmod +x "$ROBOCZY/aapt2"
touch "$ROBOCZY/fake.apk"

OK=0; ZLE=0
sprawdz() { # opis, wariant, oczekiwany_exit, oczekiwany_fragment
  local wynik kod
  wynik=$(WARIANT="$2" AAPT2="$ROBOCZY/aapt2" bash "$SPRAWDZACZ" "$ROBOCZY/fake.apk" pl.menuplaner 2>&1)
  kod=$?
  if [ "$kod" = "$3" ] && printf '%s' "$wynik" | grep -q "$4"; then
    echo "  OK   $1"
    OK=$((OK+1))
  else
    echo "  BŁĄD $1 — exit $kod (oczekiwano $3), wyjście:"
    printf '%s\n' "$wynik" | sed 's/^/        /'
    ZLE=$((ZLE+1))
  fi
}

echo "Test sprawdzania nazwy pakietu:"
sprawdz "Android 16/API 36 — regres, który wywalił wydanie" android16 0 "ZGODNA"
sprawdz "Android 15/API 35"                                 android15 0 "ZGODNA"
sprawdz "stary aapt2, bez pól compileSdk*"                  stary     0 "ZGODNA"
sprawdz "nowe build-tools: dump packagename"                nowy      0 "ZGODNA"
sprawdz "APK ma INNĄ nazwę pakietu niż oczekiwana"          zla_nazwa 1 "NIEZGODNA"
sprawdz "wyciąganie zwróciło śmieci zamiast nazwy"          smieci    1 "nie wygląda na nazwę pakietu"
sprawdz "aapt2 nie zwrócił nic"                             pusto     1 "nie zwrócił nazwy pakietu"

echo "Razem: $OK przeszło, $ZLE nie przeszło."
[ "$ZLE" -eq 0 ]
