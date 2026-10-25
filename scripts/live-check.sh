#!/usr/bin/env bash
# Checks that the live site and its API answer: the page, its script and the API docs, then a
# new game, its status and a first move. Exits non-zero at the first failed check.
#
# Usage: scripts/live-check.sh [host], connect-four.issoufi.fr by default.
# Each run starts one game, which counts against the start rate limit: never run it in a loop.
set -euo pipefail

readonly DEFAULT_HOST='connect-four.issoufi.fr'
readonly PAGE_TITLE='<title>Puissance 4</title>'
readonly FIRST_MOVE='{"playerId":"red","column":4}'

base_url="https://${1:-$DEFAULT_HOST}"
curl_options=(--fail --silent --show-error --retry 2 --max-time 20)

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

echo "GET $base_url/ answers 200 and holds $PAGE_TITLE"
page=$(request 200 "$base_url/")
if [[ $page != *"$PAGE_TITLE"* ]]; then
  echo "The page does not hold $PAGE_TITLE." >&2
  exit 1
fi

echo "GET $base_url/main.js answers 200"
request 200 "$base_url/main.js" > /dev/null

echo "GET $base_url/api/v1/ answers 200"
request 200 "$base_url/api/v1/" > /dev/null

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
