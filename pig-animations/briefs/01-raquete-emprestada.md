# Brief 01 · Raquete emprestada

**Level 1 · Clueless band.** Template for every brief — same sections, same units.

> Aparece para jogar com a raquete do primo e sapatilhas da Vans. Ainda tá a descobrir se é destro ou canhoto.

**The joke in one line:** he doesn't know which hoof the racket goes in, so he tries both and still isn't sure.

**Attitude:** clumsy, unsure, slightly off-balance. Holds are a beat too long, as if he's thinking. Nothing is graceful.

## Specs

| | |
|---|---|
| Duration | 3.0 s · 90 frames at 30 fps |
| Loop | frame 90 = frame 0 (base pose, racket low in `front-hand`) |
| Parts that move | `front-arm`, `front-hand`, `back-arm`, `back-hand`, `body`, `face`, `ear-left`, `ear-right`, `tail` |
| Parts that never move | `back-leg`, `front-leg` — feet planted |
| Props | `racket` — in `front-hand`, handed to `back-hand` in the middle, handed back |
| Draw order change | `back-arm` and `back-hand` move **in front of the body** for the hand-off (frames 30–68), then back behind it |
| Effects | none |

**Units:** angles in degrees from the master pose, direction in words (raise / lower, towards / away from the body). Distances in % of the pig's height (top of the head to the ground). Pivots as in `character-sheet/parts.md`.

## Beats

| Frames | Time | Beat | What moves | Easing |
|---|---|---|---|---|
| 0–10 | 0.00–0.33 | **Hold** — base pose, racket hanging low from `front-hand` | — | — |
| 10–16 | 0.33–0.53 | **Lift** — brings the racket up in front of the chest to look at it | `front-arm` raises 60° towards the body; `racket` upright; `face` tilts 4° towards it; pupils on the racket | fast out, hard stop |
| 16–30 | 0.53–1.00 | **Confused stare** | still; ears flop once after the `face` tilt | — |
| 30–38 | 1.00–1.27 | **Reach** — the other hoof comes to take it | `back-arm` and `back-hand` jump in front of the body (draw order), `back-arm` swings forward and up to the racket | fast out |
| 38–40 | 1.27–1.33 | **Hand-off** | `racket` attaches to `back-hand`; `front-arm` drops to rest | snap |
| 40–52 | 1.33–1.73 | **Second stare** — looks at it in the other hoof | `face` tilts 4° the other way; pupils on the racket; blink at frame 46 | fast, then hold |
| 52–60 | 1.73–2.00 | **Shrug** — still not convinced | `body` stretches up 4% and drops back; `front-arm` lifts 20° away from the body and drops; ears flop | quick up, quick down |
| 60–66 | 2.00–2.20 | **Takes it back** | `front-arm` raises 60° to the racket; `racket` attaches to `front-hand` at frame 66 | fast |
| 66–72 | 2.20–2.40 | **Other hoof goes home** | `back-arm` swings back to rest; at frame 68 `back-arm` and `back-hand` return behind the body | fast, settle |
| 72–80 | 2.40–2.67 | **Lower** | `front-arm` lowers to rest, racket hanging low; `body` squashes 2% and recovers | settle |
| 80–90 | 2.67–3.00 | **Hold** — base pose | `face` returns 4° to centre by frame 84 | ease out |

## Secondary motion

- **Ears** flop 2–3 frames after every `face` tilt and every squash
- **Tail** wiggles on the shrug, lagging 2 frames behind the `body`
- **Blink** once (frame 46). Not at the loop point — a blink across frames 88–2 would read as a glitch
- **Breathing:** none — the action fills the loop

## Readability on the card

- The hand-off happens in front of the chest, below the face — the racket never covers the eyes or snout
- The `back-arm` normally sits behind the body; it comes in front only for the hand-off. Its root (hidden under the body in the master drawing) must look fine when it's in front — a rounded shoulder end, not a cut edge

## Don'ts

- No smooth, floaty motion — transitions are fast, holds are long (character rule 3)
- No bending: arms rotate stiffly from the shoulder; the hoof can tilt at the wristband by 10° at most
- Feet never move

## Reduced motion

Frame 0 held still: base pose, racket hanging low from `front-hand`.

## Costume

He wears trainers instead of hooves — the borrowed-gear joke (level 1 only, the one exception to character rule 6). Two swap pieces, `back-leg-trainers` and `front-leg-trainers`, replace `back-leg` and `front-leg`: same pivots, same ankle bands, a trainer where the hoof was. Generic trainers — no logo or signature pattern, since those belong to the brand.
