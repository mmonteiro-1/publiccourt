#!/bin/bash
# GENERATES VIDEO TAKES FOR ONE LEVEL WITH FAL.AI, USING ONLY WHAT EVERY MAC ALREADY HAS (bash, curl, base64, osascript).
# RUN IT IN YOUR OWN TERMINAL. THE KEY IS READ FROM FAL_KEY AND NEVER WRITTEN TO A FILE.
#
#   cd ~/Documents/GitHub/publiccourt/pig-animations/video
#   export FAL_KEY="your-key"
#   bash generate.sh l1        # ONE TAKE
#   bash generate.sh l1 2      # TWO TAKES
#
# TAKES LAND IN takes/<level>/ AS MP4 (KEPT OUT OF GIT), EACH WITH A COPY OF THE PROMPT FILE USED.
set -euo pipefail
cd "$(dirname "$0")"
LEVEL="${1:?usage: bash generate.sh <level> [takes]   e.g. bash generate.sh l1 2}"
TAKES="${2:-1}"
[ -n "${FAL_KEY:-}" ] || { echo 'Set the key first:  export FAL_KEY="your-key"'; exit 1; }
SPEC="prompts/$LEVEL.json"
[ -f "$SPEC" ] || { echo "No $SPEC"; exit 1; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# JSON HELPERS IN JAVASCRIPT FOR AUTOMATION (BUILT INTO macOS), SO NO PYTHON OR jq IS NEEDED
cat > "$TMP/get.js" <<'JS'
ObjC.import('Foundation');
function run(a) {
  var v = JSON.parse($.NSString.stringWithContentsOfFileEncodingError(a[0], 4, null).js);
  var keys = a[1].split('.');
  for (var i = 0; i < keys.length; i++) { if (v == null) return ''; v = v[keys[i]]; }
  return v == null ? '' : String(v);
}
JS
cat > "$TMP/body.js" <<'JS'
ObjC.import('Foundation');
function run(a) {
  var rd = function (p) { return $.NSString.stringWithContentsOfFileEncodingError(p, 4, null).js; };
  var spec = JSON.parse(rd(a[0]));
  var b = {
    image_url: 'data:image/png;base64,' + rd(a[1]).replace(/\s/g, ''),
    prompt: spec.prompt,
    negative_prompt: spec.negative_prompt || '',
    duration: spec.duration || '5',
    cfg_scale: spec.cfg_scale !== undefined ? spec.cfg_scale : 0.5,
    generate_audio: false
  };
  if (a[2]) b.end_image_url = 'data:image/png;base64,' + rd(a[2]).replace(/\s/g, '');
  $(JSON.stringify(b)).writeToFileAtomicallyEncodingError(a[3], true, 4, null);
  return 'ok';
}
JS
get() { osascript -l JavaScript "$TMP/get.js" "$1" "$2"; }

MODEL="$(get "$SPEC" model)"
START="$(get "$SPEC" start_frame)"
END="$(get "$SPEC" end_frame)"
base64 -i "$START" -o "$TMP/start.b64"
ENDB64=""
if [ -n "$END" ]; then base64 -i "$END" -o "$TMP/end.b64"; ENDB64="$TMP/end.b64"; fi
osascript -l JavaScript "$TMP/body.js" "$SPEC" "$TMP/start.b64" "$ENDB64" "$TMP/body.json" >/dev/null
mkdir -p "takes/$LEVEL"
AUTH="Authorization: Key $FAL_KEY"

for n in $(seq 1 "$TAKES"); do
  echo "[$n/$TAKES] submitting $LEVEL to $MODEL …"
  curl -sS -X POST "https://queue.fal.run/$MODEL" -H "$AUTH" -H "Content-Type: application/json" \
       --data-binary @"$TMP/body.json" -o "$TMP/job.json"
  STATUS_URL="$(get "$TMP/job.json" status_url)"
  RESULT_URL="$(get "$TMP/job.json" response_url)"
  if [ -z "$STATUS_URL" ]; then echo "fal refused the request:"; cat "$TMP/job.json"; echo; exit 1; fi
  while true; do
    sleep 8
    curl -sS "$STATUS_URL" -H "$AUTH" -o "$TMP/status.json"
    S="$(get "$TMP/status.json" status)"
    echo "    $S"
    [ "$S" = "COMPLETED" ] && break
    if [ "$S" = "FAILED" ] || [ "$S" = "ERROR" ]; then cat "$TMP/status.json"; echo; exit 1; fi
  done
  curl -sS "$RESULT_URL" -H "$AUTH" -o "$TMP/result.json"
  URL="$(get "$TMP/result.json" video.url)"
  if [ -z "$URL" ]; then echo "No video in the result:"; cat "$TMP/result.json"; echo; exit 1; fi
  NAME="${LEVEL}_$(date +%Y%m%d-%H%M%S)"
  curl -sS -L "$URL" -o "takes/$LEVEL/$NAME.mp4"
  cp "$SPEC" "takes/$LEVEL/$NAME.json"
  echo "    saved takes/$LEVEL/$NAME.mp4"
done
