#!/usr/bin/env bash
# Checks that the live site and its API answer: the page and every file it loads, the API docs
# and their OpenAPI file, then a new game, its status and a first move. Exits non-zero at the
# first failed check.
#
# Usage: scripts/live-check.sh [--files-only] [host], connect-four.issoufi.fr by default. The host
# may also be a URL with its scheme, such as http://localhost:8787 for a local server.
# Without --files-only, each run starts one game, which counts against the start rate limit:
# never run it in a loop. With --files-only, it starts no game and checks instead that an unknown
# game answers its JSON 404.
set -euo pipefail

readonly DEFAULT_HOST='connect-four.issoufi.fr'
readonly PAGE_TITLE='<title>Puissance 4</title>'
readonly FIRST_MOVE='{"playerId":"red","column":4}'
readonly UNKNOWN_GAME_ID='00000000-0000-0000-0000-000000000000'
readonly GAME_NOT_FOUND_CODE='game_not_found'

files_only=false
if [[ ${1:-} == '--files-only' ]]; then
  files_only=true
  shift
fi
host=${1:-$DEFAULT_HOST}
if [[ $host == *'://'* ]]; then
  base_url=${host%/}
else
  base_url="https://$host"
fi
# No --fail: request checks the status itself, so that it can expect a 404.
curl_options=(--silent --show-error --retry 2 --max-time 20)

# Requests a URL with curl and checks its status code; prints the body.
# Usage: request <expected status> <curl arguments...>
request() {
  local expected_status=$1
  shift
  local response status
  # A command substitution does not inherit `set -e`: stop on a failed request here.
  response=$(curl "${curl_options[@]}" --write-out '\n%{http_code}' "$@") || return 1
  status=${response##*$'\n'}
  if [[ $status != "$expected_status" ]]; then
    echo "Expected the status $expected_status, got $status." >&2
    return 1
  fi
  printf '%s\n' "${response%$'\n'*}"
}

# Resolves a relative reference against the path of the file that holds it, both without a
# leading slash; prints nothing for a reference to another site, a data:, mailto: or tel: URL or
# a fragment.
# Usage: resolve <path of the referring file> <reference>
resolve() {
  local referrer=$1 reference=$2
  case $reference in
    *://* | //* | data:* | mailto:* | tel:* | '#'* | '') return 0 ;;
    /*) printf '%s\n' "${reference#/}" ; return 0 ;;
  esac
  local directory=''
  [[ $referrer == */* ]] && directory=${referrer%/*}
  reference=${reference#./}
  while [[ $reference == ../* ]]; do
    reference=${reference#../}
    if [[ $directory == */* ]]; then directory=${directory%/*}; else directory=''; fi
  done
  printf '%s\n' "${directory:+$directory/}$reference"
}

echo "GET $base_url/ answers 200 and holds $PAGE_TITLE"
page=$(request 200 "$base_url/")
if [[ $page != *"$PAGE_TITLE"* ]]; then
  echo "The page does not hold $PAGE_TITLE." >&2
  exit 1
fi

# The files that the page loads: its src and href attributes, then the modules that each script
# imports, read from the served files so that the list follows the deployment.
pending=()
while IFS= read -r reference; do
  file=$(resolve '' "$reference")
  [[ -n $file ]] && pending+=("$file")
done < <(grep --only-matching --extended-regexp '(src|href)="[^"]*"' <<< "$page" \
  | sed -E 's/^(src|href)="(.*)"$/\2/')
if (( ${#pending[@]} == 0 )); then
  echo "The page loads no file of this site." >&2
  exit 1
fi

checked=' '
while (( ${#pending[@]} > 0 )); do
  file=${pending[0]}
  pending=("${pending[@]:1}")
  [[ -z $file ]] && continue
  [[ $checked == *" $file "* ]] && continue
  checked+="$file "
  echo "GET $base_url/$file answers 200"
  body=$(request 200 "$base_url/$file")
  [[ $file == *.js ]] || continue
  while IFS= read -r specifier; do
    pending+=("$(resolve "$file" "$specifier")")
  done < <(grep --only-matching --extended-regexp "(from|import)[[:space:]]*['\"][^'\"]+['\"]" \
    <<< "$body" | sed -E "s/^(from|import)[[:space:]]*['\"](.*)['\"]$/\2/")
done

echo "GET $base_url/api/v1/ answers 200"
request 200 "$base_url/api/v1/" > /dev/null

echo "GET $base_url/api/v1/openapi.yaml answers 200"
request 200 "$base_url/api/v1/openapi.yaml" > /dev/null

if [[ $files_only == true ]]; then
  echo "GET $base_url/game/$UNKNOWN_GAME_ID/status answers 404 with the code $GAME_NOT_FOUND_CODE"
  error=$(request 404 "$base_url/game/$UNKNOWN_GAME_ID/status")
  jq --exit-status --arg code "$GAME_NOT_FOUND_CODE" '.code == $code' <<< "$error" > /dev/null || {
    echo "The answer has not the code $GAME_NOT_FOUND_CODE: $error" >&2
    exit 1
  }
  echo "The live site and its files answer."
  exit 0
fi

echo "POST $base_url/game answers 201 with an id"
game=$(request 201 --request POST "$base_url/game")
game_id=$(jq --exit-status --raw-output '.id | strings' <<< "$game") || {
  echo "The new game has no id: $game" >&2
  exit 1
}
echo "The new game is $game_id."

echo "GET $base_url/game/$game_id/status answers 200"
request 200 "$base_url/game/$game_id/status" > /dev/null

echo "POST $base_url/game/$game_id/play with $FIRST_MOVE answers 200"
request 200 --request POST --header 'Content-Type: application/json' \
  --data "$FIRST_MOVE" "$base_url/game/$game_id/play" > /dev/null

echo "The live site and its API answer."
