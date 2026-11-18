# Zero Mile app: design system (2026-11-18)

The goal is a playful, game-like daily habit app for all ages, especially children, where the streak earns rewards. Think of how a language-learning streak app feels:
- bold colour
- chunky pressable buttons
- a mascot with feelings
- XP, a currency, quests and treasure chests
- full-screen celebrations

It has its own identity. Do not copy any other app's mascot, colours, font, names or screens.

## Unslop: what goes

- **Frosted-glass cards.** Thin grey text in white cards. Tiny monochrome icons. Paragraphs.
- **Generic glyphs.** Generic "AI dashboard" stat tiles, and emoji used as icons.
- **Fluted glass everywhere.** The green fluted glass may stay only as the backdrop of the streak hero on Today; nowhere else in the app.
- **Long text.** Every screen reads in seconds. Labels are 1–4 words. Explanations go behind a "?" sheet.

## Tokens (in `css/tokens.css`, loaded first)

| Role | Value |
|---|---|
| Font | Nunito 700/800/900 (Google Fonts), for the whole app |
| Leaf (primary) | `--leaf #3fae49`, shade `--leaf-d #2b8a34` |
| Deep (text) | `--ink #1d3b24` |
| Sun (streak, XP) | `--sun #ffc531`, shade `--sun-d #e0a200` |
| Tomato (hearts, alerts) | `--tomato #ff5a4e`, shade `--tomato-d #d93b30` |
| Sky (water) | `--sky #36b4f0`, shade `--sky-d #1a8fcc` |
| Berry (seeds currency, rare) | `--berry #a560e8`, shade `--berry-d #7f3fc4` |
| Soil / pot | `--pot #e8865b`, shade `--pot-d #c4653d` |
| Ground | `--bg #ffffff`, cards on white with `--line #e5ebe2` 2px borders |

- **Chunky 3D:** buttons and cards have a 2px border plus a 4px bottom "lip" in the shade colour. On press they move down 4px and the lip disappears. The classes are `.b3`, `.b3-leaf`, `.b3-sun`, `.b3-sky`, `.b3-berry`, `.b3-white` and `.c3` (card).
- **Radius:** 16px for buttons and 20px for cards.
- **Progress bars:** chunky, 16px tall, rounded, with a light shine stripe (`.bar3`).
- **Easing:** `cubic-bezier(.22,1,.36,1)`, plus a springy `cubic-bezier(.34,1.56,.64,1)` used ONLY for pops: rewards, badges, mascot.
- **Motion:** transforms and opacity only. `prefers-reduced-motion` makes it instant.

## The mascot: Pip

Pip is the terracotta pot with a sprout and a face, the same character as the 3D pot (`js/face.js`). Pip appears everywhere: cheering on celebrations, sad when the streak is at risk, sleepy at night, and pointing at the next task.

- **Pip's face (owner's request):** it looks like a virtual-pet LCD toy. The face sits on a BLACK screen, and its features are GREEN pixels (`#5dff7a`-ish, with a faint glow and a soft pixel grid). Make it chunky pixel-matrix eyes, mouth and extras: z's, tears, hearts, sparkles and little pixel animations such as blinking, bouncing and a two-frame idle wiggle. The same face is used in 2D (`drawFace` in `js/face.js`, the art in `mascot()`) and on the 3D pot screen (`js/pot3d.js`). The pot body around it stays terracotta and friendly.
- **API:** `mascot(pose, { size, mood })` in `js/art.js` returns an inline SVG string. Poses are `wave`, `cheer`, `proud`, `sad`, `sleepy`, `point`, `water`, `think`, `party` and `wow`.

## Illustrations (`js/art.js`)

- **API:** `art(name, { size, cls })` returns an inline SVG string. They are rich and layered, with highlights and shading, not flat line icons.
- **Names:**
  - currency and XP: `streak-sun` (the streak "flame" is a sun), `seed-gem`, `xp-bolt`
  - chests: `chest`, `chest-open`
  - streak saver: `can-freeze`
  - quests: `quest-photo`, `quest-water`, `quest-learn`, `quest-harvest`
  - garden: `trophy`, `heart`, `basket`, `lorry`, `plane`, `ship`, `tree`, `cloud-co2`, `camera`, `map-pin`, `calendar`, `lock`, `gift`, `star`
  - achievements: `badge-<id>`; see the Rewards section for the ids
  - empty states and backdrops: `scene-garden`, `scene-night`, `scene-harvest`, `scene-forest`
- Unknown names return a neutral placeholder, never throw.

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
- **Seeds:** the currency. Earned from chests, quests and level-ups. You can spend them in the "Shop":
  - a streak saver (watering can) costs 50 and you can hold 2
  - cosmetic pot colours and hats for Pip cost 100–400
- **Daily quests:** 3 a day, chosen from photo, water, learn 2 plants, harvest, plant a tree and keep the streak. Each gives XP and seeds. Completing all 3 opens a daily chest.
- **Streak milestones:** 3, 7, 14, 30, 50, 100 and 365 days, each with a chest of seeds and a badge.
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
- **Celebrations:** full-screen, with Pip, a big number, a chunky "Continue" button, confetti, and a short sound (see Sound and haptics).

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
