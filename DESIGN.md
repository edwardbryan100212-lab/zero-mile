# Zero Mile app: design system v2, "Garden LCD" (2026-11-18)

The owner's latest direction (it replaces v1):
- unslop the images
- don't use too many graphics
- make it unique
- don't completely follow the language-learning streak app

Keep the habit loop (streak, XP, seeds, quests, badges, celebrations). It must look **professional**: calm and confident, like a well-made product, still friendly for kids.

The owner also asked for:
- **better colour schemes:** see the palette below, with one green, one warm accent and an LCD green, and nothing else
- **an improved layout:** a clear hierarchy, a 4/8 spacing grid, aligned edges, and no ragged rows

Drop the borrowed look: candy colours, sticker art everywhere, treasure chests, fat 3D buttons on every control.

## The idea

Zero Mile is a real garden with a little virtual pet in it. Two materials only:
1. **Paper and plants:** a calm cream page, ink text and real plant photography. This is where you browse, learn and look at your plants.
2. **Pip's LCD:** a black screen with green pixels. Everything game-like (the streak, XP, seeds, quests, rewards, celebrations) is shown on LCD panels, as if Pip's screen were talking to you.

Any competitor's app can have a mascot and confetti. Only this one turns its rewards into a gardening pet's pixel screen.

## Unslop: what goes

- **AI-made images in the app and on the site.** All AI-rendered "3D sticker" art goes: chests, gems, trophies, suns, scenes and Pip renders in `img/game/`. Real photos (credited, `img/real/`) are the only pictures of plants. The photos people take are the hero.
- **Illustration overload.** No illustration next to every heading, no coloured sticker per badge, quest or stat, and no rainbow of tinted cards. A screen has at most one or two graphic moments; Pip counts as one.
- **Streak chests (the owner: "remove streak chests").** No chests and no packets anywhere: not on Today, Rewards, the celebrations, the milestone path or the quests. A milestone gives a badge and a quiet "+N seeds" line. The daily all-quests bonus is simply seeds added, with no chest.
- **Cartoon candy UI.** No borders with fat bottom lips on every card, no ALL-CAPS button labels everywhere, and no six accent hues.
- **Unchanged rules:** no emoji as icons, and few words; labels are 1–4 words.

## Tokens (in `css/tokens.css`)

| Role | Value |
|---|---|
| Paper (page) | `--paper #f6f3ea`; cards `#fffdf7` with a `#e7e1d2` 1px border, radius 18px, soft shadow `0 1px 0 #e7e1d2` |
| Ink (text) | `--ink #17221a`, secondary `#4d5a50` (never lighter: contrast ≥ 4.5:1) |
| Leaf (primary action) | `--leaf #23774a` (a deep, slightly cool garden green), pressed `#1b5e3a`, tint `#e3f1e8` |
| Terracotta (Pip, pots, the one warm accent) | `--pot #c8673d`, tint `#f7e6dc` |
| Status | success uses the leaf; warning `#b7791f`; error `#b42318`, each only on its own small chip |
| LCD | `--lcd #0c110d` (screen), `--px #62f27e` (pixel green), `--px-dim #1f5a2b` (unlit pixels), `--px-amber #ffcf4a` (rare: a milestone) |
| Type | **Bricolage Grotesque** 600/700 for headings (the brand face), **Nunito** 600/800 for body and UI, **Pixelify Sans** (Google Fonts) ONLY on LCD panels, for numbers and short words |

- **Buttons:**
  - Primary: solid leaf, white text, sentence case, radius 14px, min height 48px, with a 2px darker bottom edge that presses in. This is subtle and tactile, not candy.
  - Secondary: paper with an ink border.
  - On LCD: a green-outlined pixel button.
- **LCD panel (`.lcd`):**
  - Black rounded screen with a 6px dark bezel, a faint pixel grid and a slight inner glow.
  - Content is green pixel type and pixel icons (drawn on a grid as SVG rects).
  - Used for the streak counter, the XP and level readout, quests, reward celebrations and Pip's face.
- **Motion:**
  - Paper UI uses calm easing (`cubic-bezier(.22,1,.36,1)`).
  - LCD UI moves in pixel steps (`steps()`, two-frame wiggles, blinking), which is part of the identity.
  - Reduced motion makes everything instant.

## The mascot: Pip

Pip is a terracotta pot with a sprout and the black LCD face with green pixels. It is the one character and the one illustration that can appear large.
- `mascot(pose, { size, mood })` keeps the same API, drawn as a clean flat SVG, never an AI render.
- Use fewer poses on screen at once: one Pip per screen at most.

## Icons and art (`js/art.js`)

- `art(name, opts)` keeps its API but returns **pixel icons**: a 16×16 grid of rects, single colour (`currentColor`), crisp, for use on LCD panels and small chips. Names keep working: streak-sun, seed-gem (now a seed), xp-bolt, chest and chest-open (kept only so old calls don't break; return a seed icon), can-freeze, quest-*, trophy, heart, star, lock, gift, badge-*.
- Scenes (`scene-*`) return an empty string. Drop them from layouts.
- Paper UI uses simple line icons (1.75px stroke, one family) only where they help a label: the tab bar, settings rows and chips.
- **Badges:** pixel icons on small LCD tiles. When locked they show dim unlit pixels; when unlocked the pixels light up green, and amber for the big ones.

## Owner's notes, round 3 (2026-11-18)

- **"Keep it nice and simple while being complex."** Each screen looks simple at a glance: one clear focus, generous space, few words. The depth sits one tap away, in sheets, scrubbers, expanding rows and detail views. Hide the complexity; don't remove it.
- **"More interactive and genuinely useful features":**
  - real care help (what to do today for each plant)
  - local weather advice
  - a photo time-lapse
  - what to sow this month
  - a plant journal
  The `features` work owns these (`js/care.js`, `js/weather.js`, `js/timelapse.js`, `css/features.css`).
- **"Add ombre backgrounds":**
  - Soft, slow-drifting ombre fields behind pages: two or three large radial colour fields blended on the paper, never a hard banner.
  - Palette fields: mint `#dff0e4`, sage `#e8efe0`, peach `#f8e3d6`, butter `#fbf1d4`, sky `#e2eef5`. Each section or screen gets its own pair: Today mint→peach, Find sage→butter, Impact sky→mint, Rewards butter→peach.
  - They drift very slowly, or not at all with reduced motion. Text contrast stays ≥ 4.5:1.
  - LCD panels sit on top as dark objects.
  - The class is `.ombre` with `data-tone` in `css/tokens.css`.
- **"Take inspo from thenounproject for icons":**
  - In the spirit of the best Noun Project sets: simple, geometric, filled-glyph icons with one consistent visual weight, rounded joins, recognisable at 20px and drawn as one family.
  - Draw our own; don't copy specific Noun Project icons.
  - On paper, `icon(name)` (in `js/art.js`) returns these glyphs with `currentColor`. On LCD, `art()` stays pixel icons.
  - Icons sit at 20–24px in the tab bar, settings rows, chips and fact rows. They never sit in tinted squares.
- **Nothing squished.** Every icon and image keeps its aspect ratio: set `width` and `height` from the viewBox, use `flex: none`, and `object-fit` for photos.

## Owner's notes, round 4 (2026-11-18)

- **"Format the page better."** Today, the home page, gets a clearer structure:
  1. greeting
  2. LCD streak hero
  3. "Care today" (the jobs and weather)
  4. your plants
  5. quests
  6. small links (sow this month, impact)
  Use consistent card widths, aligned edges and an even 16/24px rhythm. On Mac it is a real dashboard grid, not a stack of mismatched cards.
- **"Use coloured icons for the homepage."** On Today (and the sidebar), icons are coloured: the same simple glyph family, filled in the palette (leaf, terracotta, butter `#e8b23a`, sky `#3a8fc4`, berry `#8a4fb8`), at most two colours per icon. `icon(name, { color: true })` returns the coloured version. Other screens stay single-colour.
- **"Symbols of fruits and vegetables, but a 3D model when it's needed."** Every plant and tree gets a flat coloured **produce symbol**: a simple, recognisable fruit or vegetable drawing in the same family (a tomato with its green calyx, a carrot, a strawberry, a leaf for herbs, a tree shape for trees).
  - Module: `js/produce.js`, `produceIcon(id, { size })` returns an inline SVG string, with a group fallback for any id without its own drawing.
  - **Where symbols go:** lists and small spots, such as Today's plant tiles, quests, care jobs, the sidebar, onboarding choices, Impact rows and sow-this-month chips.
  - **Where 3D stays:** where seeing the plant matters, which is the plant page model, the pot on a plant's own view, and growth stages. Real photos stay on Find cards and the plant page photo strip.

## Rewards (`js/rewards.js`, state in `state.rewards`)

- **XP:**
  - photo +10
  - streak bonus +1 per 5 streak days (up to +10)
  - water +2
  - harvest +15
  - add a plant +5
  - plant a tree +20
  - open a plant page (learn) +3, max 5 a day
  - a completed quest gives its own XP
- **Levels:** level n needs `50 * n * (n + 1) / 2` XP in total. Each level has a garden title: Seedling, Sprout, Gardener, Green Thumb, Grower, Harvester, Orchard Keeper, Forest Maker…
- **Seeds:** the currency. Earned from quests, milestones and level-ups. You can spend them in the "Shop":
  - a streak saver (watering can) costs 50 and you can hold 2
  - cosmetic pot colours and hats for Pip cost 100–400
- **Daily quests:** 3 a day, chosen from photo, water, learn 2 plants, harvest, plant a tree and keep the streak. Each gives XP and seeds. Completing all 3 adds a seed bonus (no chest).
- **Streak milestones (badge + seeds; no chests):** 3, 7, 14, 30, 50, 100 and 365 days, each giving a badge and some seeds.
- **Achievements:** `first-photo`, `streak-7`, `streak-30`, `streak-100`, `first-harvest`, `five-plants`, `first-tree`, `ten-trees`, `miles-100`, `miles-1000`, `herb-garden` (3 herbs), `fruit-bowl` (3 fruits), `night-owl`, `early-bird`, `level-5` and `level-10`.
- **API:**
  - `award(kind, opts)` returns `{ xp, seeds, levelUp, quests, unlocked }`. The kinds are photo, water, harvest, plant, tree, learn and quest.
  - `rewards()` returns the full state.
  - `level(xp)`
  - `dailyQuests()`
  - `onReward(cb)`
  - `spend(item)`
  The Today and Photo screens show celebrations from the returned object.

## Screens

- **Top bar (phone):** streak sun with its count, seeds with their count, and the XP level ring. Tap any of them for a sheet.
- **Tab bar:** Today, Find, Photo (the big centre button), Rewards (trophy) and More (Impact, About, Admin). Impact is reachable from Today and More.
- **Celebrations:** full-screen LCD. A black screen with Pip's pixel face, a pixel number that ticks up, pixel sparkles (no confetti rain), one plain "Continue" button, and a short sound. The photo you just took appears once, as a real photo in a paper frame on the LCD.
- **Today:** the hero is a big LCD panel (Pip, the streak in pixel numerals, and the 7-day dots as pixels), then your plants as photo cards on paper, then quests as a compact LCD list. Nothing else competes. No chest path.
- **Layout:**
  - Phone: one column with 16px gutters and 12px between cards.
  - Mac (≥1000px): a 12-column grid, max width 1200px, with the sidebar. Today = hero (8 cols) + quests (4 cols), then plants in a 3-up grid.
  - Cards in a row share height.
  - Section titles: Bricolage 20px. Page titles: 28px phone / 32px Mac.
- **Top bar (phone):** a slim LCD strip with streak, seeds and level in pixel type.

## Sound and haptics (`js/sound.js`)

- All sounds are made in code with WebAudio; there are no audio files. They are short and warm, and each one peaks at 0.12 or less (most are 0.05–0.08).
- **API:** `play(name, { soft })` and `buzz(pattern)`. `fun.js` re-exports both, and its `haptic()` calls `buzz()`.
- **Names:** `tap`, `toggle`, `done`, `xp`, `quest`, `streak` (under 1 s), `shake`, `open`, `badge`, `level`, `buy`, `water` and `error`.
- **Where they play:**
  - Pressing a `.b3` button plays `tap`.
  - A celebration screen plays its `sound`; without one, the tone picks it: leaf `done`, sky or sun `xp`, berry `shake`, tomato `badge`, night `streak`. `sound: false` means none.
  - A sun `floatGain` plays a soft `xp` that gives way to any sound from the last 300 ms. A tomato one plays `error`.
  - `countUp`, `pop` and `confetti` take an optional `sound`.
- **Rules:**
  - The same sound never plays again within its cooldown (about 260 ms; `tap` 70 ms).
  - The AudioContext is made only after the first tap or key press.
  - `state.sound` and `state.haptics` both default to on. They are the Sounds and Vibration switches in About.
  - "Reduce motion" turns off vibration only.
- **Checks:** `node ~/.cache/ecoapp-tools/sound.mjs <port> <dir>` renders every sound offline, prints its peak and length, and writes WAVs.
