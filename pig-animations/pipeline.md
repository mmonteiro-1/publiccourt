# Pipeline

From the pig SVG to a looping idle on the page. Steps 1–4 happen here (planning); 5–6 in VS Code (code).

1. **Character sheet** — split the pig into named parts, set a pivot for each, fix the layer order, and paint what hides behind overlapping joints (e.g. under the shoulder) so no gap shows when a part rotates
2. **Action list** — pick the actions for the first set (2–3 s each, standing in place)
3. **Briefs** — one per action: key poses, timing, easing, follow-through, loop point (see the rules in `CLAUDE.md`)
4. **Prototype review** — check each motion visually before it reaches the app: feet planted, loop seamless, nothing drifting
5. **Rig + player** *(VS Code)* — build the rig from the character sheet and the motion from the briefs
6. **Integrate** *(VS Code)* — place the animations on the site

## Status

- [x] Approach decided: cut-out rig, live in the browser
- [ ] Rive or SVG + code
- [x] Upright pig chosen
- [x] Character sheet v0 — parts, pivots, overlaps (`character-sheet/`)
- [x] Cut map on the 3/4 trace (`character-sheet/pig_34_cuts.png`)
- [x] Drawing spec locked — artboard, ground line, outlines (`character-sheet/parts.md`)
- [ ] Neutral master drawing, in parts (+ level 1 trainer legs)
- [x] Character arc locked (`character-arc.md`)
- [ ] Briefs — 01 written as the template, 02–10 to do
