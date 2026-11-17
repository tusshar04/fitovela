#!/bin/bash
# Renders every ad in this folder to PNG, in both sizes, into ./out.
#   feed  1080 x 1350 (4:5)   reel  1080 x 1920 (9:16)
# Needs Google Chrome. Run from anywhere: ads/static/render.sh
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
mkdir -p out
PROFILE="$(mktemp -d)"   # a throwaway profile, so a Chrome that is already open is left alone
trap 'rm -rf "$PROFILE"' EXIT
for f in ad*.html; do
  name="${f%.html}"
  for fmt in feed reel; do
    h=1350; [ "$fmt" = reel ] && h=1920
    rm -f "out/$name-$fmt.png"
    "$CHROME" --headless=new --user-data-dir="$PROFILE" --no-first-run --disable-gpu --hide-scrollbars \
      --force-device-scale-factor=1 --window-size=1080,$h --virtual-time-budget=3000 \
      --screenshot="$PWD/out/$name-$fmt.png" "file://$PWD/$f?fmt=$fmt" >/dev/null 2>&1 || true
    [ -s "out/$name-$fmt.png" ] && echo "out/$name-$fmt.png" || { echo "FAILED: $name-$fmt" >&2; exit 1; }
  done
done
