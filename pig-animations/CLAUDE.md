# Pig Animations

Knowledge for the pig's short idle animations. Separate from the app's root `CLAUDE.md` on purpose: this folder holds the animation plan — briefs, character sheet, pipeline — never app code.

## Who does what

- **This folder** holds the animation plan: briefs, the character sheet, references, the pipeline, plus the video generation (`video/`) and the finished web files (`exports/`). Written and maintained from the Claude app (Cowork)
- **The app code** — the production rig, the player, wiring into pages — is built from VS Code, following these specs. Nothing in this folder is loaded by the app, and the app's files are never edited from here

## Goal

Short idle animations of the pig, roster / character-select style: one consistent character, one action per animation, standing in the same spot, 2–3 s each, looping. They play live on the website.

## Trading cards

The animations live in the trading card on the player's progress view, one per XP level (1–10), plus one for the visitor's locked card. They tell a progression: complete clueless at level 1, confident pro at level 10.

- **Progression shows in the motion, not only the action:** low levels are clumsy (off-balance, fumbles, wrong grips); high levels are crisp (clean timing, confident holds, a bit of showing off). Same rig and character rules throughout
- **Name, flavour text and animation are designed together**, so each card tells one joke. The names and flavour texts live in the app (`XP_LEVEL_INFO`, `XP_VISITOR_INFO` in `js/profile.js`); this folder only proposes them, the app side writes them
- **Same framing on every card:** fixed scale and position, so levels compare side by side and props never crop differently
- **Calm enough to loop forever** on the profile; under reduced motion, the level's base pose stands still
- **The pig is "he"** in every doc and brief
- **Tone:** the app's PT-PT voice — cheeky, colloquial, gently teasing, never mocking

## Character rules

Set by Matheus — every drawing, brief and motion follows them.

1. **Very basic shapes**
2. **As little anthropomorphic as possible** — a pig standing up, not a person in a pig suit
3. **Movement is stiff, short and silly** — snappy rigid moves, no fluid human acting
4. **Almost no elbows, knees or neck** — limbs are stiff pieces, nothing bends in the middle
5. **Always a chubby bean-shaped body**
6. **Toes like pig or horse hooves** — never human fingers (one exception: level 1 wears trainers, see `character-arc.md`)
7. **Always wearing the headband and wristbands**

## Animation structure

Every action follows the same structure, taken from the reference videos in `references/`. The videos show the structure to follow, not actions to copy: the pig's actions are his own, within the character rules.

- **One base pose:** every action leaves from it and returns to it, so loops are seamless and actions can be chained
- **Short loop, about 3 s:** mostly holds, with quick bursts of movement in between. The contrast is what makes an action read
- **Feet planted:** the pig never leaves his spot. Even a hop lands exactly where it took off, and the shadow stays on the ground (it shrinks while the pig is in the air)
- **One clear action per loop:** readable at a glance, roster style
- **Secondary motion during the holds:** tail, ears and blinks keep the pig alive while the body is still
- **The same rig for everything:** no redrawing between actions

## Decided

- **Format:** live in the browser — not GIF, not PNG frame sequences, not video
- **Approach:** cut-out rig. The pig is split once into layered parts (head, ears, body, arms, legs…), each with a pivot point; an animation only moves, rotates and scales those parts. Same artwork in every animation, so the character can't drift
- **Upright pig:** the rig is the two-legged pig (`pig_reaching`, `pig_serving`), not the four-legged one (`pig`, `pig_sitting`) — arms free for gestures and the racket
- **Source art:** the existing pig SVGs in `images/` are references only — each is a frozen action with no separate parts. The rig needs a new **neutral master drawing**, in parts (see `character-sheet/parts.md`)
- **Motion stays within the app's animation rule:** looping animations only change `transform` and `opacity`
- **Limits of a rig:** it moves the drawing, it doesn't redraw it. Breathing, weight shifts, gestures, a head tilt, a racket spin all work. Turning to a new facing or a big change of expression needs extra drawn pieces swapped in (an alternate hand, alternate faces)

## Open

- **Rive or SVG + code?** The root todo already plans Rive for the pig. Briefs work for both; the character sheet differs slightly (Rive bones vs SVG groups with `transform-origin`)
- **Which actions** make the first set
- **Where exported parts and motion data live** in the app — decided by the code side, not here

## Folder

- `character-arc.md` — the ten trading-card characters: name, flavour text, animation seed, progression bands
- `claude-communication.md` — requests from the animation side to VS Code for anything that touches app code or config. The animation side never edits app files itself

- `pipeline.md` — the steps from pig SVG to animation on the page
- `character-sheet/` — parts breakdown, pivots, layer order, hidden overlaps
- `briefs/` — one `.md` per action (key poses, timing, loop point)
- `video/` — AI video generation: `generate.sh` (run in Matheus's Terminal with his fal key), `prompts/<level>.json`, `start-frames/<level>.png` (his drawn first and last frame), `takes/` (new raw takes land here). Videos are git-ignored
- `exports/<level>/` — the finished web files per level: `<level>.webm` (transparent, Chrome/Firefox/Android), `<level>_safari.mov` (transparent HEVC, made on the Mac with `make-safari.sh`), `<level>_poster.webp` (still frame), `_source/` (`<level>_take.mp4` the raw AI take + `<level>_take_prompt.json` the prompt that made it, `<level>_choppy.mp4` the choppy edit on green, `<level>_alpha_prores.mov` the transparent master)
- `references/` — small reference images only. Heavy files (PSD, video) stay out of git; link them instead

## Rules for briefs

- One action per brief, one brief per file (`briefs/<action>.md`)
- Timing in seconds and frames at 30 fps
- The last pose equals the first, so the loop is seamless
- Feet stay planted — the pig never slides off his spot
- Every moving part named by its character-sheet name
