# Brief 01 · Raquete emprestada

**Level 1 · Clueless band.** Template for every brief — same sections, same units.

> Aparece para jogar com a raquete do primo e sapatilhas da Vans. Ainda tá a descobrir se é destro ou canhoto.

**The joke in one line:** he doesn't know which hoof the racket goes in, so he tries both and still isn't sure.

**Attitude:** clumsy, unsure, slightly off-balance. Holds are a beat too long, as if he's thinking. Nothing is graceful.

## Specs

| | |
|---|---|
| Duration | 3.0 s · 90 frames at 30 fps |
| Loop | frame 90 = frame 0 (base pose, racket head resting on the floor in front of him) |
| Parts that move | `armfront`, `hooffront`, `armback`, `hoofback`, `body`, `face`, `earback`, `earfront`, `tail` |
| Parts that never move | `legback`, `legfront` — feet planted |
| Props | `racket` — **oversized** (the cousin's racket, too big for him): about 550 px long on the 1200 artboard, head ~235 × 330 |
| Layering | the back arm **never** comes in front of the body. The racket passes in front of the belly, and the back hoof grabs it by the frame where it sticks out past his far side (playground: the racket is drawn under the back arm and again over the body, clipped to it) |
| Effects | none |

**Units:** angles in degrees from the master pose (positive = clockwise on screen). Racket angle is its angle on screen: 0° head up, 180° head down, 270° head pointing left. Pivots as in `character-sheet/parts.md`.

## Beats

| Frames | Time | Beat | What moves | Easing |
|---|---|---|---|---|
| 0–10 | 0.00–0.33 | **Hold** — the racket is too big: he holds the handle, its head rests on the floor in front of his feet | — | — |
| 10–16 | 0.33–0.53 | **Lift** — raises it level across the belly; the head sticks out past his far side | `armfront` +60°; racket 228° → 270° | fast out, hard stop |
| 16–30 | 0.53–1.00 | **Confused stare** | `face` −4°, pupils left and down at the racket head; ears flop | — |
| 30–38 | 1.00–1.27 | **Reach** — the back hoof grabs it by the frame, right where it sticks out | `armback` +12° (stays behind the body), `hoofback` −10° to clamp the frame | fast out |
| 38–42 | 1.27–1.40 | **Hand-off** — the front hoof lets go | `armfront` back to 0°; `body` squashes 2% | snap |
| 40–50 | 1.33–1.67 | **Swing** — held by the wrong end, it swings upside down: head up in the hoof, handle dangling to the floor | racket 270° → 362° → 352° → 360° (overshoot and settle); `armback` dips +18° and back to +12° | fast out, small overshoot |
| 46–52 | 1.53–1.73 | **Second stare** — at the upside-down racket | `face` +4°, pupils up; blink at frame 50 | fast, then hold |
| 52–60 | 1.73–2.00 | **Shrug** | `body` stretches up 4% and drops; `armfront` lifts 20° away and drops; tail wiggles | quick up, quick down |
| 60–64 | 2.00–2.13 | **Swings it back level** — and takes it by the handle | racket 360° → 270°; `armfront` +60° to the handle | fast out |
| 64–70 | 2.13–2.33 | **Back hoof lets go** | `armback` and `hoofback` back to 0° | settle |
| 72–80 | 2.40–2.67 | **Lower** — head back on the floor | `armfront` 60° → 0°; racket 270° → 228°; `body` squashes 2% | ease in-out |
| 80–90 | 2.67–3.00 | **Hold** — base pose | `face` back to 0° by frame 84 | ease out |

## Secondary motion

- **Ears** flop 2–3 frames after every `face` tilt and every squash
- **Tail** wiggles on the shrug, lagging 2 frames behind the `body`
- **Blink** once (frame 50). Not at the loop point — a blink across frames 88–2 would read as a glitch
- **Breathing:** none — the action fills the loop

## Readability on the card

- The racket head always sits beside or below the body, never over the face
- The joke reads in two steps: he can't even hold it the right way round (the upside-down swing), then shrugs it off
- The back hoof only ever grabs what sticks out past the body's edge — that's why the racket is oversized

## Don'ts

- No smooth, floaty motion — transitions are fast, holds are long (character rule 3)
- No bending: arms rotate stiffly from the shoulder; the hoof can tilt at the wristband by 10° at most
- Feet never move

## Reduced motion

Frame 0 held still: base pose, racket hanging low from `front-hand`.

## Costume

He wears trainers instead of hooves — the borrowed-gear joke (level 1 only, the one exception to character rule 6). Two swap pieces, `back-leg-trainers` and `front-leg-trainers`, replace `back-leg` and `front-leg`: same pivots, same ankle bands, a trainer where the hoof was. Generic trainers — no logo or signature pattern, since those belong to the brand.
