#!/usr/bin/env bash
# wypchnij-zmiany.sh — commit + push z awaryjnym PR-em.
#
# Po co: `main` ma regułę „Changes must be made through a pull request", więc
# push bota leci w GH013 i kładzie przebieg, mimo że praca jest gotowa
# (run 40282972301: paczka napisana, walidacja i brama dubli zielone, push
# odrzucony). Zamiast wyłączać regułę, workflow otwiera PR-a.
#
#   skrypty/wypchnij-zmiany.sh "Tytuł commita" sciezka [sciezka...]
#
# ENV:
#   OPIS           — treść commita i opis PR-a (opcjonalnie)
#   GALAZ_PREFIX   — przedrostek gałęzi awaryjnej (domyślnie `auto`)
#   GH_TOKEN       — potrzebny tylko do otwarcia PR-a
set -euo pipefail

TYTUL="${1:?Podaj tytuł commita}"
shift
if [ "$#" -eq 0 ]; then
  echo "Podaj co najmniej jedną ścieżkę do zacommitowania." >&2
  exit 1
fi

OPIS="${OPIS:-}"
GALAZ_PREFIX="${GALAZ_PREFIX:-auto}"
GALAZ_DOCELOWA="$(git rev-parse --abbrev-ref HEAD)"

git config user.name  "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -- "$@"

if git diff --cached --quiet; then
  echo "Nic do zacommitowania w: $*"
  exit 0
fi

git commit -q -m "$TYTUL" ${OPIS:+-m "$OPIS"}

if git push origin "HEAD:$GALAZ_DOCELOWA" 2>/tmp/push.err; then
  echo "Wypchnięte prosto na $GALAZ_DOCELOWA."
  exit 0
fi

cat /tmp/push.err >&2
if ! grep -qE "GH013|GH006|protected branch|pull request" /tmp/push.err; then
  echo "::error::Push padł z innego powodu niż ochrona gałęzi — nie otwieram PR-a." >&2
  exit 1
fi

GALAZ="${GALAZ_PREFIX}/${GITHUB_RUN_ID:-$(date -u +%Y%m%d-%H%M%S)}"
echo "::notice::$GALAZ_DOCELOWA wymaga pull requesta — zakładam gałąź $GALAZ."
git switch -q -c "$GALAZ"
git push -q -u origin "$GALAZ"

if ! command -v gh >/dev/null 2>&1 || [ -z "${GH_TOKEN:-}" ]; then
  echo "::warning::Zmiany są na gałęzi $GALAZ, ale nie mam czym otworzyć PR-a (brak gh albo GH_TOKEN)."
  exit 0
fi

URL=$(gh pr create --base "$GALAZ_DOCELOWA" --head "$GALAZ" \
  --title "$TYTUL" \
  --body "${OPIS:-Zmiany od workflow.}

---
Otwarte automatycznie: \`$GALAZ_DOCELOWA\` wymaga pull requesta, więc workflow
nie mógł wypchnąć zmian prosto na nią. Przebieg: ${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}")
echo "::notice::PR otwarty: $URL"
echo "$URL"
