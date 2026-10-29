#!/usr/bin/env bash
# Checks that the live site and its API answer: the page and the API docs, every file of this
# site that they load and the OpenAPI file, then a new game, its status and a first move. Exits
# non-zero at the first failed check.
#
# Usage: scripts/live-check.sh [--files-only] [host], connect-four.issoufi.fr by default. The host
# may also be a URL with its scheme, such as http://localhost:8787 for a local server.
# Without --files-only, each run starts one game, which counts against the start rate limit:
# never run it in a loop. With --files-only, it starts no game and checks instead that a real
# Durable Object answers the JSON 404 of a game that does not exist.
set -euo pipefail

readonly DEFAULT_HOST='connect-four.issoufi.fr'
readonly PAGE_TITLE='<title>Puissance 4</title>'
readonly FIRST_MOVE='{"playerId":"red","column":4}'
# GAME_STORE_CHECK_ID of worker/constants.js: the Worker asks its status of a real Durable Object,
# whose empty storage answers the 404, so that a broken game backend fails the check.
# scripts/live-check.test.js keeps the two equal.
readonly STORE_CHECK_GAME_ID='0000000000000000000000000000000000000000000000000000000000000000'
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
# No --fail: send_request checks the status itself, so that it can expect a 404.
curl_options=(--silent --show-error --max-time 20)
# curl retries a timeout or a 408, 429 or 5xx whatever the method: only the GET requests may be
# sent again, since a POST may have created its game or played its move before it failed.
readonly GET_RETRIES=2
readonly POST_RETRIES=0

# Requests a URL with curl and checks its status code; prints the body.
# Usage: request <expected status> <curl arguments...>
request() {
  send_request "$GET_RETRIES" "$@"
}

# Sends a POST request once, without retry, and checks its status code; prints the body.
# Usage: post_once <expected status> <curl arguments...>
post_once() {
  send_request "$POST_RETRIES" "$@" --request POST
}

# Sends a request with the given curl retries and checks its status code; prints the body.
# Usage: send_request <retries> <expected status> <curl arguments...>
send_request() {
  local retries=$1 expected_status=$2
  shift 2
  local response status
  # A command substitution does not inherit `set -e`: stop on a failed request here.
  response=$(curl "${curl_options[@]}" --retry "$retries" --write-out '\n%{http_code}' "$@") \
    || return 1
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

# The files left to request, from the src and href attributes of the pages, then from the
# modules that each script imports, read from the served files so that the list follows the
# deployment.
pending=()

# Adds to pending the files of this site that a page loads, and fails when it loads none.
# Usage: queue_page_files <path of the page, without a leading slash> <body of the page>
queue_page_files() {
  local page_path=$1 page_body=$2 reference file found=false
  while IFS= read -r reference; do
    file=$(resolve "$page_path" "$reference")
    if [[ -n $file ]]; then
      pending+=("$file")
      found=true
    fi
  done < <(grep --only-matching --extended-regexp '(src|href)="[^"]*"' <<< "$page_body" \
    | sed -E 's/^(src|href)="(.*)"$/\2/')
  if [[ $found != true ]]; then
    echo "The page /$page_path loads no file of this site." >&2
    return 1
  fi
}

echo "GET $base_url/ answers 200 and holds $PAGE_TITLE"
page=$(request 200 "$base_url/")
if [[ $page != *"$PAGE_TITLE"* ]]; then
  echo "The page does not hold $PAGE_TITLE." >&2
  exit 1
fi
queue_page_files '' "$page"

echo "GET $base_url/api/v1/ answers 200"
docs_page=$(request 200 "$base_url/api/v1/")
queue_page_files 'api/v1/' "$docs_page"

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

echo "GET $base_url/api/v1/openapi.yaml answers 200"
request 200 "$base_url/api/v1/openapi.yaml" > /dev/null

if [[ $files_only == true ]]; then
  store_check_url="$base_url/game/$STORE_CHECK_GAME_ID/status"
  echo "GET $store_check_url answers 404 with the code $GAME_NOT_FOUND_CODE"
  error=$(request 404 "$store_check_url")
  jq --exit-status --arg code "$GAME_NOT_FOUND_CODE" '.code == $code' <<< "$error" > /dev/null || {
    echo "The answer has not the code $GAME_NOT_FOUND_CODE: $error" >&2
    exit 1
  }
  echo "The live site and its files answer."
  exit 0
fi

echo "POST $base_url/game answers 201 with an id"
game=$(post_once 201 "$base_url/game")
game_id=$(jq --exit-status --raw-output '.id | strings' <<< "$game") || {
  echo "The new game has no id: $game" >&2
  exit 1
}
echo "The new game is $game_id."

echo "GET $base_url/game/$game_id/status answers 200"
request 200 "$base_url/game/$game_id/status" > /dev/null

echo "POST $base_url/game/$game_id/play with $FIRST_MOVE answers 200"
post_once 200 --header 'Content-Type: application/json' \
  --data "$FIRST_MOVE" "$base_url/game/$game_id/play" > /dev/null

echo "The live site and its API answer."
