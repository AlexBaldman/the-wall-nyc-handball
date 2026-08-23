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

The Wall is also the first proving ground for a reusable court-sports simulation
kernel. Reuse must preserve or improve handball rather than flatten it into a
lowest-common-denominator sports abstraction. See
[`court-sports-kernel-and-xr-architecture.md`](court-sports-kernel-and-xr-architecture.md)
for the concrete multi-sport and XR boundary, and
[`world-grammar-and-factory-principles.md`](world-grammar-and-factory-principles.md)
for the broader reusable nouns / verbs / traits / manner / factory doctrine.

## Repository topology — August 23, 2026

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
    ├── src/platform/                 │  browser/device boundary
    ├── src/presentation/             │  visual projection boundary
    ├── src/sports/handball/          │  handball physical/rule semantics
    └── src/sim/  ◀───────────────────┘  deterministic shared simulation truth
```

### `src/sim`

Owns deterministic simulation primitives and serializable competitive truth that
are candidates for reuse across sports:

- ball integration and physical contact resolution
- deterministic contact records
- seeded randomness
- versioned commands, contacts, snapshots, and replay records

The current BallisticsCore accepts an injectable physical profile while retaining
one-wall handball as its compatibility default during the migration. The goal is
to make sport ownership explicit without changing current handball behavior.

Rules for this layer:

- no DOM, Canvas, Three.js, Audio, Gamepad, `localStorage`, or network access
- inputs and outputs remain serializable
- tests use exact seeds and SI units
- renderers may read snapshots but never decide the score
- reusable physics accepts explicit profiles instead of accumulating sport-name conditionals

### `src/sports/handball`

Owns physical and semantic facts that belong specifically to American one-wall
handball.

The first extracted profile contains:

- regulation court measurements
- the physical USHA ball profile and validation values
- material coefficients
- solver/aerodynamic calibration values currently used by The Wall
- the first explicit `ONE_WALL_HANDBALL` sport-pack boundary

During migration, legacy modules may re-export these values to preserve existing
imports. New shared physics work should consume injected profiles so a real
second sport can use the same kernel without pretending its ball, court, or
surfaces are handball-shaped.

Sport-specific scoring, serve logic, contact vocabulary, strike biomechanics,
and training semantics should migrate here when doing so removes ambiguous
ownership. Do not move files merely for cosmetic folder purity.

### `src/platform`

Owns browser and device capability adapters:

- Gamepad discovery
- analog deadzone normalization
- optional controller vibration

Future WebXR, OpenXR bridges, visionOS-specific adapters, tracked-hand input, or
other spatial-computing boundaries belong at platform/embodiment edges rather
than inside sport rules or ball physics.

Platform adapters detect missing capabilities and return safe values. Game and
rule code must not duplicate platform-specific probing.

### `src/presentation`

Owns mappings from game truth into a visual coordinate system. The 2.5D court
projection currently derives its short line, service markers, and marker length
through the compatibility `src/sim/court.js` seam; canonical handball physical
measurements now originate in `src/sports/handball/physics-profile.js`.

Future camera transforms, visual themes, replay interpolation, stereo/spatial
observers, and AR overlays belong here or in dedicated embodiment adapters when
they can remain independent from rules.

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
controls while delegating competitive truth to deterministic modules.

The lab should evolve into the reusable Sports Physics Lab rather than be
replaced. Sport, ball, court, surface, striker, and calibration profiles can
become selectable as real second consumers arrive.

`src/game/wall-ghost.js` owns the pure Rookie/Regular/Champion perception,
movement, aim, and decision profiles. The next safe split is a pure
`WallGhostController` that consumes delayed observations plus one of those
profiles and emits `PlayerCommand` records. Keep the Three.js coordinator
responsible only for delivering observations and applying the resulting command.

`src/sim/contact-outcome.js` currently owns the post-collision interpretation
shared by the coach, replay stream, match statistics, and drills. The next
multi-sport seam is to separate universal contact metrics from handball-specific
shot labels before pickleball introduces its own vocabulary.

`src/game/wall-school.js` owns drill definitions and streak scoring. It consumes
only the same serializable contact outcomes generated in a match, so a training
clear can be replayed, audited, and later validated by an authoritative server.

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
keyboard / touch / gamepad / tracked XR input / AI / replay
                         ↓
                  semantic input adapter
                         ↓
             versioned PlayerCommand / intent
                         ↓
            sport embodiment / strike model
                         ↓
              deterministic simulation + rules
                         ↓
                 SimulationSnapshot stream
                         ↓
 canvas / Three.js / VR / AR / replay / network spectator / analytics
```

The 3D Street Match already records the core command/snapshot shape. The preserved
match should migrate to it incrementally instead of being rewritten all at once.

XR readiness means preserving this separation and real-world coordinate truth;
it does not mean adding headset scope to every current feature.

## Testing pyramid

- `npm run test:syntax` discovers and parses every first-party JavaScript module
- `npm run test:architecture` protects shared platform behavior and official
  2.5D projection
- `npm run test:vendor` proves the deployed Three.js files and license exactly
  match the pinned package
- `npm run test:physics` protects SI geometry, ballistics, hand contacts,
  emergent contact outcomes, rules, seeded randomness, and replay serialization
- `npm run test:profiles` proves BallisticsCore responds to injected ball/court
  profiles while the regulation handball profile preserves current behavior
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

1. One canonical handball physical source: `src/sports/handball/physics-profile.js`.
2. One seeded-random implementation: `src/sim/random.js`.
3. One Gamepad capability adapter: `src/platform/gamepad.js`.
4. Competitive decisions stay DOM- and renderer-free.
5. Appearance may never change a replay hash or point result.
6. Missing optional device capabilities degrade safely.
7. A new abstraction must remove duplicated ownership, enable a real consumer,
   clarify a contract, or become a meaningful reusable tool; a generic name alone earns nothing.
8. Singles, doubles, AI, local play, future networking, and future XR embodiments
   consume the same semantic command/snapshot boundaries.
9. Keep physical truth in SI units and canonical 3D world space wherever practical.
10. Sport-specific physics or rules must not leak into shared code as accumulating
    `if (sport === ...)` branches.
11. Preserve intent-versus-outcome: controls express attempted physical action;
    simulation and context determine the result whenever practical.
12. Promote nouns, verbs, traits, manner modifiers, relationships, and factories
    into reusable primitives only when evidence justifies the extraction.
