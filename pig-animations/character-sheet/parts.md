# Parts — upright pig, 3/4 view

The rig's parts, in layer order (back → front). The visual version is `pig_34_cuts.png`: each colour is one part, red dashed lines are the cuts, dotted outlines are the hidden shapes to draw underneath, and the letters are the pivots. It's drawn over `references/pig_34.svg` (an auto-trace — a template to redraw over, not the final parts). `character-sheet.svg` is the earlier v0 on the old `pig_serving` drawing, kept for history.

In the 3/4 view the pig faces the viewer's left, so his **front** limbs are on the viewer's right (they overlap the body and sit lower) and his **back** limbs on the viewer's left.

The master file is **`pig_master.svg`**. Ids below are its layer names, exactly.

| Layer | Group / shape | Contains | Pivot | Moves in idles |
|---|---|---|---|---|
| 1 | `tail` | curl (single path) | tail base | wiggle, lags the body |
| 2 | `legback` | `legbackbody`, `anklebandback` | E — hip | rarely — feet planted |
| 3 | `armback` | `upperarmback` + `hoofback` group (`hoofshapeback`, `wristbandback`) | A — shoulder, cap centre; C — wristband centre for `hoofback` | swings, raises |
| 4 | `body` | head and body bean (single path) | L — on the ground between the feet | breathing, squash and stretch, lean |
| 5 | `earback`, `earfront` | `ear…fill`, `ear…outline`, `earcrease…` | I, J — ear base | flop after the face moves |
| 6 | `face` | `headband`; `eyefront` and `eyeback` (eyeball + `clippedpupil…` with the pupil, clipped to the eyeball); `snoot` (`snootbody`, `snootcavity1`, `snootcavity2`) | K — under the snout | small tilt and nudge, ±5°; blinks (squash an eye group), glances (move a pupil) |
| 7 | `armfront` | `upperarmfrontfill`, `upperarmfrontoutline` + `hooffront` group (`hoofshapefront`, `wristbandfront`) | B — shoulder, cap centre; D — wristband centre for `hooffront` | swings, raises |
| 8 | `legfront` | `legfrontfill`, `legfrontoutline`, `anklebandfront` | F — hip | rarely — feet planted |
| 9 | `racket`, `ball` | props (later) | grip / centre | — |

Every group also holds its own black outline shape. The hand groups sit inside their arm groups, so a hand follows its arm and can still tilt on its own at the wrist.

**Limb roots (the dotted ellipses on the cut map):** not separate shapes. Each limb's own shape continues past the cut into its ellipse and ends in a rounded cap centred on its pivot — same colour as the limb. The back leg and back arm sit behind the body, so their roots are hidden. The front arm, front leg and ears sit in front: each is a fill shape with no outline plus an outline-only path on top (open where the part meets the body), so the join blends into the body in the same pink. Both live in the part's group and move together. The back arm also needs the rounded cap, because it comes in front of the body in level 1.

## Measured pivots (pig_master.svg)

Artboard coordinates, checked with a rotation test from −15° to +95°:

| Pivot | Part | Point |
|---|---|---|
| A | back arm (`armback`) | ≈ `(450, 650)` — centre of the cap |
| B | front arm (`armfront`) | ≈ `(740, 655)` — centre of the cap |

The rest are still to measure.

## Drawing spec

Every file — the master pig, swaps (trainer legs, alternate faces), props and effects — is drawn on the same artboard, so all parts share one coordinate space.

| | |
|---|---|
| **Artboard** | `1200 × 1200` px, square — viewBox always `0 0 1200 1200` |
| **Ground line** | `y = 1100` — feet stand on it, the shadow sits on it |
| **Centre line** | `x = 600` — the pig stands centred on it |
| **Pig size** | about `750` px tall, top of the ears to the ground |
| **Headroom** | ~300 px above the pig and room at the sides, for the racket overhead, the ball toss, the phone held out |
| **Outlines** | drawn as filled black shapes (not strokes), `7` px thick. **One outline per part**, grouped with that part's fills — never a shared outline across parts |
| **Props and swaps** | drawn in place on the same artboard, where they sit in the master pose (racket in the front hoof, trainer legs exactly over the hoofed legs) |

Square because the card art is a plain image at 90% of the card's width, so the image ratio sets the card's height — one ratio for all ten levels keeps every card the same height.

**Exporting from Affinity:** export the whole artboard (not the selection); flatten transforms, so paths are in artboard coordinates with no `matrix(…)` wrappers; check that layer names come through as ids.

**Squash and stretch** thins a shape outline slightly on one axis. Invisible at the 2–5% squashes the briefs use; keep any bigger squash short.

## Rules for the redraw

- Every part is a closed shape with a pink fill and its own black outline shape, grouped together — no shared outline across parts
- The body bean is complete under every cut: shoulders rounded off, bottom closed under the legs
- The back leg and back arm are layered behind the body; the front arm, front leg and ears are in front, with open outlines where they meet the body
- Pupils are their own black shapes (in the trace they're part of the outline shape)
- No tail shows in this view: add a small curl peeking out behind the body
- Layer names exactly as in the table — they become the SVG ids VS Code uses

## Why no neck cut

The head and body are one bean. Instead of a head piece, the bean leans and squashes and the face group tilts slightly on top, which reads as head movement. A real head turn isn't possible with this rig.

## Arms and legs

No elbows, no knees (character rule 4). Arms are one stiff wedge from the shoulder, with the hand at the wristband — rotating the hand there also covers a slight bend when an action needs one. Legs are one piece each, from hip to hoof.

Hands and feet are hooves (rule 6): rounded split toes, never fingers. A hoof holds the racket by clamping it.

## Palette

From the 3/4 trace: body `#eebabc`, snout `#cb7372`, bands `#92c7f3`, outline `#0b0b0a`, nostril shading `#934943`. Not yet confirmed against the app's older pig colours.
