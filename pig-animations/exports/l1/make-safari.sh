#!/bin/bash
# MAKES THE SAFARI / IPHONE VERSION (HEVC WITH TRANSPARENCY) FROM THE PRORES MASTER.
# SAFARI CAN'T SHOW TRANSPARENT WEBM, AND APPLE'S HEVC-WITH-ALPHA ENCODER ONLY EXISTS ON A MAC,
# SO THIS STEP RUNS IN YOUR OWN TERMINAL. NO INSTALLS NEEDED: avconvert COMES WITH macOS.
#
#   bash ~/Documents/GitHub/publiccourt/pig-animations/exports/l1/make-safari.sh
set -euo pipefail
cd "$(dirname "$0")"
avconvert --preset PresetHEVCHighestQualityWithAlpha \
  --source _source/l1_alpha_prores.mov \
  --output l1_safari.mov --replace
ls -lh l1_safari.mov
