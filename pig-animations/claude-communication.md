# Claude communication

Requests from the animation side (Claude app) to the code side (VS Code). The animation side never edits app files; anything that needs a code or config change is written here instead.

**For VS Code Claude:** work through the open requests, following the root `CLAUDE.md` rules (todo first, confirm with Matheus before each step and before committing). When one is done, tick it and add a short note under it: what changed and where. Don't delete requests — closed ones stay as a record.

---

## Open

### 1. Keep `pig-animations/` off the Vercel deployment

- **Why:** `pig-animations/` is planning material (briefs, character sheet, prototype pages). It lives in the repo so both sides can read it, but it shouldn't be served on the live site or the branch previews
- **Request:** exclude the whole `pig-animations/` folder from Vercel deployments (e.g. a `.vercelignore` at the repo root)
- **Done when:** a deploy no longer serves `/pig-animations/...`, and nothing else on the site changes
- [ ] Done

### 2. New trading-card characters (levels 1–10) and visitors at level 1

- **Why:** the character arc for the trading cards is locked (`pig-animations/character-arc.md`). Each level gets its own character, and the animations will be built around them
- **Request:**
  - Replace `XP_LEVEL_INFO` in `js/profile.js` with these ten entries, in order (titles and descriptions exactly as written):

| Level | title | description |
|---|---|---|
| 1 | Raquete emprestada | Aparece para jogar com a raquete do primo e sapatilhas da Vans. Ainda tá a descobrir se é destro ou canhoto. |
| 2 | Pega de frigideira | Segura a raquete como quem vai estrelar um ovo. Acerta na bola uma vez em cada cinco, e às vezes é com a cabeça. |
| 3 | Influenciador de campo | Se não há post, não há ténis. Os followers acreditam que tem patrocínio da Lacoste. |
| 4 | O Aquecedor | Faz quarenta minutos de aquecimento e joga dez. Diz que o segredo está na preparação. |
| 5 | Pavio curto | Acha que devia jogar como na televisão. Cada bola na rede é uma ofensa pessoal. |
| 6 | Juiz de linha | Nenhuma bola do adversário cai dentro. Tem vista de águia, mas só para um dos lados. |
| 7 | Cortador de fiambre | Desde que aprendeu o slice não bate outra coisa. Era perfeito para cortar jamón no Mercadona. |
| 8 | Servidor público | Serve tão rápido que ninguém lhe devolve uma bola. Perde os jogos todos por duplas faltas. |
| 9 | Supersticioso | Ajeita a fita, limpa os punhos e bate a bola sete vezes antes de cada serviço. Em equipa que ganha não se mexe. |
| 10 | Roger Manel Federer | Joga de olhos fechados e ainda dá conselhos a quem não pediu. Diz a lenda que já lhe pediram um autógrafo. |

  - ~~Visitors are level 1: the visitor's locked card shows the level 1 character instead of `XP_VISITOR_INFO`, which can go once nothing uses it~~ — **changed by Matheus:** the visitor keeps a character of their own, a "visitor" level below level 1, so the first login is already an upgrade. `XP_VISITOR_INFO` stays. A new visitor character (name, flavour text, animation) is coming soon — animation side: update `character-arc.md` ("Visitors are level 1" under Decided) and propose it here
  - `XP_LEVEL_IMAGES` stays as it is for now — the animations will replace it later
- **Hold before shipping:** levels 1, 3, 7 and 10 mention real brands or a real person (Vans, Lacoste, Mercadona, Roger Federer). Matheus is checking whether that's OK — confirm with him before pushing these to production
- **Done when:** every level shows its own name and flavour text on the trading card (the visitor card is unchanged until its new character arrives)
- [ ] Done

### 3. Level 1 trading-card animation (transparent looping video)

- **Why:** the level 1 pig ("Raquete emprestada") is animated. It's the first of ten, and the card the visitors see, so this sets the pattern for the other nine
- **Files** (in `pig-animations/exports/l1/`; `pig-animations/.gitignore` ignores `*.webm`/`*.mov`, so copy them into the app's own static assets, not link to them here — the folder is kept off Vercel, see request #1):
  - `l1.webm` — VP9 with transparency, 600×598, 24 fps, 4.2 s, silent, about 150 KB. For Chrome, Edge, Firefox and Android
  - `l1_safari.mov` — HEVC with transparency, for Safari and iPhone (Safari ignores WebM transparency and shows a black box). **Not there yet:** Matheus makes it by running `bash pig-animations/exports/l1/make-safari.sh` in his own Terminal (it uses macOS's built-in `avconvert`). Check with him before wiring it up
  - `l1_poster.webp` — the first frame, transparent. Doubles as the still image
  - `_source/` — the master file. Not for the site
- **Request:** show the animation on the level 1 trading card in the progress view, in place of the level 1 image:
  - A `<video>` with `autoplay muted loop playsinline`, `preload="metadata"`, `poster="l1_poster.webp"`, no controls, and the same `alt`-style text the image had (`aria-label`)
  - **Pick the file per browser:** Safari gets `l1_safari.mov`, everything else gets `l1.webm`. Don't rely on `<source>` order alone: Safari can play WebM (without the transparency), and some Chrome builds can play HEVC (also without it). Detect Safari/WebKit and choose the file
  - Play only while the card is on screen, pause when it scrolls away (IntersectionObserver)
  - When the user has `prefers-reduced-motion: reduce` set, show only the poster image and don't load the video
  - The background is transparent, so the card's own background shows through. Keep the pig the same size and position the static level 1 image had
  - The other nine levels keep their images for now. When their animations exist they'll come with the same three files (`lN.webm`, `lN_safari.mov`, `lN_poster.webp`), so a small "level → files" lookup will save work later
- **Done when:** the level 1 card loops the animation with a transparent background in Chrome and in Safari (Mac and iPhone), stops when it's off screen, shows the still image for reduced motion, and nothing else on the page changes
- [ ] Done

## Closed

_None yet._
