# Architecture

## Product boundary

The repository intentionally contains two playable experiences:

- the **2.5D match** is the content-rich baseline: rivals, training, avatar
  creator, venue identity, presentation, touch controls, and the existing career
  direction
- the **3D Street Match** is the accuracy-first MVP path: regulation units,
  physical contacts, race-to-11 play, deterministic commands and snapshots,
  perception-limited difficulty profiles, replay, onboarding, and calibration

They are not competing implementations that should silently drift forever. The
2.5D match proves product ideas; the 3D simulation proves physical behavior.
Features migrate into the 3D path only after their rules and input contracts are
explicit. The first convergence pass now makes the 3D path a complete player-facing
match; the 2.5D path remains the comparison build for content not yet migrated.

## Repository topology — July 28, 2026

The gameplay, Rhythm Lab, 3D Street Match, and architecture consolidation share
one release line. Short-lived feature branches may contain the next release
until review; there are no parallel product branches whose simulation behavior
should drift independently.

New work should use a short-lived branch and pull request. Pull requests validate
the complete deterministic suite and build the static artifact without changing
the public playtest. A merge to `main` is the normal production release trigger.

## Runtime layers

```text
index.html                         lab.html
    │                                 │
app.js                           src/labs/ball-lab.js
    │                                 │
src/game/match-app.js  ───────────────┤
    │                                 │
    ├── src/platform/gamepad.js       │  browser/device boundary
    ├── src/presentation/             │  visual projection boundary
    └── src/sim/  ◀───────────────────┘  deterministic game truth
```

### `src/sim`

Owns competitive truth:

- official court, ball, material, and solver measurements
- deterministic ball integration and contact resolution
- deterministic contact outcomes: emergent shot identity, pace, spin, hand
  speed, spacing, preparation, and quality
- match/serve/scoring rules
- seeded randomness
- versioned commands, contacts, snapshots, and replay records

Rules for this layer:

- no DOM, Canvas, Three.js, Audio, Gamepad, `localStorage`, or network access
- inputs and outputs remain serializable
- tests use exact seeds and SI units
- renderers may read snapshots but never decide the score

### `src/platform`

Owns browser capability adapters:

- Gamepad discovery
- analog deadzone normalization
- optional controller vibration

Platform adapters detect missing browser features and return safe values. Game
and rule code must not duplicate browser-specific probing.

### `src/presentation`

Owns mappings from game truth into a visual coordinate system. The 2.5D court
projection now derives its short line, service markers, and marker length from
`src/sim/court.js`; official measurements are not retyped as unrelated pixel
constants.

Future camera transforms, visual themes, and replay interpolation belong here
when they can remain independent from rules.

### `src/game/match-app.js`

Coordinates the preserved 2.5D match. It currently owns the match state,
training, avatar presentation, 2.5D physics, AI, Canvas renderer, audio, input
bindings, and DOM updates.

It is behind a one-line root entrypoint, consumes shared platform and geometry
seams, and keeps static match/avatar content in `match-content.js` plus physical
and venue tuning in `match-environment.js`. Split the remaining coordinator only
along state ownership:

1. avatar persistence and editor behavior
2. input-to-command adapter
3. 2.5D match reducer/rules
4. Canvas renderer and effects
5. DOM shell

Do not split by arbitrary line count or create classes that still mutate the
same global state from every direction.

### `src/labs/ball-lab.js`

Coordinates the 3D experiment. It owns Three.js scene construction, physical
actors/hands, AI observation delivery, input bindings, instrumentation, and lab
controls while delegating competitive truth to `src/sim`.

`src/game/wall-ghost.js` now owns the pure Rookie/Regular/Champion perception,
movement, aim, and decision profiles. The next safe split is a pure
`WallGhostController` that consumes delayed observations plus one of those
profiles and emits `PlayerCommand` records. Keep the Three.js coordinator
responsible only for delivering observations and applying the resulting command.

`src/sim/contact-outcome.js` owns the post-collision interpretation shared by
the coach, replay stream, match statistics, and future drills. The coordinator
attaches that serializable outcome to the hand `ContactRecord`; UI code reads it
but does not independently classify the shot.

### `src/styles/tokens.css`

Defines shared foundation and semantic visual tokens for both experiences:

- neutral surfaces and text
- action, data, success, danger, and special signals
- focus, type, touch size, radius, and motion primitives

`style.css` and `lab.css` may compose those tokens into different layouts. The
Day/Night pass should change semantic token values and 3D light rigs without
changing simulation state or interaction geometry.

## Commands, not renderer mutations

The long-term input contract is:

```text
keyboard / touch / gamepad
            ↓
     semantic input adapter
            ↓
 versioned PlayerCommand stream
            ↓
 deterministic simulation + rules
            ↓
     SimulationSnapshot stream
            ↓
 canvas / Three.js / replay / network spectator
```

The 3D Street Match already records this shape. The preserved match should migrate
to it incrementally instead of being rewritten all at once.

## Testing pyramid

- `npm run test:syntax` discovers and parses every first-party JavaScript module
- `npm run test:architecture` protects shared platform behavior and official
  2.5D projection
- `npm run test:vendor` proves the deployed Three.js files and license exactly
  match the pinned package
- `npm run test:physics` protects SI geometry, ballistics, hand contacts,
  emergent contact outcomes, rules, seeded randomness, and replay serialization
- `npm run test:smoke` protects page/module wiring, assets, DOM bindings, core
  systems, and reduced-motion styles
- `npm run test:lab-runtime` protects the real WebGL/browser flow, physical
  contacts, AI serve/perception, the preserved match page, and responsive layout
- `npm test` is the required deterministic gate and combines every non-browser
  layer
- `npm run site:stage` creates the exact artifact consumed by GitHub Pages

New pure logic goes into the lowest practical layer. A screenshot or browser
test does not replace a deterministic unit test.

## Branch and deployment rules

- `main` is the production source branch
- pull requests validate without deploying
- only `main` deploys to the shared Pages URL automatically
- any branch may deploy there only through an intentional manual workflow
  run with `deploy_pages` enabled
- never force-push `main`
- delete a feature branch only after its PR is landed and the Pages build from
  `main` is verified

GitHub Pages provides one shared site, not isolated branch previews. Automatic
deployment from review branches would let the last push replace the public
playtest and is therefore intentionally disabled.

## Architecture guardrails

1. One official measurement source: `src/sim/court.js`.
2. One seeded-random implementation: `src/sim/random.js`.
3. One Gamepad capability adapter: `src/platform/gamepad.js`.
4. Competitive decisions stay DOM- and renderer-free.
5. Appearance may never change a replay hash or point result.
6. Missing optional browser capabilities degrade safely.
7. A new abstraction must remove duplicated ownership, not merely rename it.
8. Singles, doubles, AI, local play, and future networking consume the same
   command/snapshot boundary.
