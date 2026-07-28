# The Wall — NYC One-Wall Handball

This is the extracted standalone version of the American handball concept that had been living in the old `Jeopardish` orbit.

[Play the current GitHub Pages test build](https://alexbaldman.github.io/the-wall-nyc-handball/)

[Play the true-scale 3D Street Match](https://alexbaldman.github.io/the-wall-nyc-handball/lab.html)

## What it is

A court-first browser game focused on the first thing that matters for this idea: does the rally loop feel alive? The current visual direction is a stylized sunset run at a fenced Lower East Side park, with arcade readability layered over one-wall rules.

Version `0.5.0` promotes the true-scale 3D work from an instrumented lab into a player-facing West 4th Street singles match while preserving the content-rich 2.5D game as the classic comparison build. The 3D match currently includes:

- true SI-unit court geometry: 20′ × 16′ wall, 16′ short line, 25′ service markers, and 34′ long line
- the physical 1⅞″, 61 g one-wall ball plus a visible halo that never enlarges its collision shape
- a custom 240 Hz BallisticsCore with quadratic drag, Magnus force, swept floor/wall collision, friction, spin exchange, and physical crack-seam response
- an interactive USHA drop test that reproduces a 49.8″ rebound from a 70″ free fall
- a swept hand collider with a directional striking face: the ball only leaves when the hand and ball paths physically intersect, while palm orientation prevents billiard-ball edge launches
- hold-to-prepare and release-to-swing controls with a broad power plateau instead of a one-frame timing meter
- open palm, topspin, backspin, and fist contact families plus left/right English, lift, and drive modifiers
- bounded automatic hand tracking whose exact contribution is recorded with the contact
- mouse wall intention, keyboard control, and standard two-stick/face-button gamepad input
- Tactical, Player, and Courtside perspective cameras with optical zoom
- an adjustable 55–110% court-tempo clock; 100% is physical real time and lower settings slow presentation without changing geometry or material coefficients
- a complete race-to-11 street match with server-only scoring, side outs, two serves, legal service-box checks, floor-before-wall downs, and second-bounce winners
- a same-physics opponent that moves and contacts through its own actor and swept hand instead of teleporting the ball
- Rookie, Regular, and Champion opponents whose explicit perception delay, noise, foot speed, recovery depth, and aggression profiles increase difficulty without changing the ball
- a focused court-entry flow, progressive three-step contact tutorial, off-ball Set stance, live opponent scouting, and post-match contact statistics
- emergent kill, roller, lob, hook, cut, and knuckle labels assigned after physical contact instead of selected as canned trajectories
- perception-limited opponent reads sampled at profile-specific rates, perturbed with seeded noise, and projected forward through the same ballistics model
- live contact explanations for clean spacing, jams, reaches, air swings, floor-before-wall downs, wall height, and first bounce
- versioned `PlayerCommand`, `BallState`, `ContactRecord`, and `SimulationSnapshot` data—including score, server, expected hitter, and point state—plus replay JSON export
- deterministic competitive randomness in both the new lab and the preserved match baseline
- automated geometry, drop, spin, tunneling, swept-hand, service/scoring, serialization, player/Ghost serve, delayed-perception, WebGL, interaction, and responsive-layout checks

The 3D match is now the accuracy-first MVP path, while the shipped 2.5D game remains the richer content baseline. The next gate is repeated human tuning of movement, contact forgiveness, rally rhythm, and opponent difficulty before migrating the rival ladder, avatar, and training content.

The next presentation pass is now specified in the [visual system and Day / Night art direction](docs/visual-day-night-art-direction.md): a brighter, cooler Day court and a purpose-built floodlit Night court, both driven by shared semantic color roles and held to the same competitive-readability and deterministic-simulation contract.

Current build includes:

- official one-wall proportions: a 20-foot-wide wall, 34-foot long line, 16-foot short line, 25-foot service markers, and 16-foot wall height
- `Broadcast`, deeper `Player`, `Follow`, and angled `Courtside` cameras with user zoom
- a device-saved Rhythm Lab that independently tunes master tempo, ball clock, footwork clock, read window, and camera depth
- West 4th Street, Coney Island, and Venice Beach atmosphere presets on identical competition geometry
- `Serve` and `Reset Match` controls
- quick race-to-11 flow with server-only scoring, side outs, and two service attempts
- keyboard, touch, and standard Gamepad API input with analog movement, aim, wall height, and side english
- portrait-friendly touch movement, spin, and slap controls
- seven distinct hand contacts: palm/topspin, slice/backspin, fist/knuckle, backhand, kill, roller, and lob
- unique pace, aim margin, wall height, lateral spin, floor rebound, and risk profile for every contact
- serve validation with short, long, and outside faults
- front-wall validation and rally-ending down / out logic
- three progressively harder computer rivals: Rookie Rae, Wall Ghost, and King Shade
- shot-specific preparation windows with accurate control touches, loaded replies, clean power, late commits, and overcooked swings
- a three-part contact model combining preparation timing, body balance, and fly / bounce / short-hop interception
- planted-foot power contacts, jammed and on-the-run accuracy penalties, 200 ms swing buffering, and brief impact hit-stop
- true analog movement magnitude, momentum-aware direction changes, recoverable footwork balance, sneaker squeaks, and controller feedback
- an off-ball `Set` stance that instantly arrests momentum and protects against movement-created avoidable block calls
- a receiving `Read` stance that trades some foot speed for clearer bounce tracking and modest contact forgiveness
- a controlled step-in reward that converts balanced forward weight transfer into a small pace and accuracy benefit
- access-lane officiating that penalizes a moving player who crowds the receiver’s body, ball, or swing path
- a live wall-target preview whose spray window reacts to spacing, preparation, shot risk, and ambitious angles
- 120 Hz fixed-step ball simulation with frame-rate-independent air drag, spin curve, and live first-bounce prediction
- deterministic fist-ball knuckle flutter included in both the live simulation and trajectory forecast
- difficulty-scaled bounce-read markers plus rivals whose anticipation increasingly trusts the same trajectory model
- match-memory opponents who progressively counter repeated palms, lobs, kills, and rollers
- true crack-seam physics for well-prepared kills and rollers, with a nearly dead rebound and dedicated audio, rumble, and comic callout
- shot-specific anticipation and follow-through poses, including reverse-hand backhands and low roller finishes
- tactical rival identities: Rookie Rae floats safely, Wall Ghost counterpunches into open court, and King Shade hunts low cracks
- rival-specific aiming, movement response, recovery depth, situational shot selection, and visual identity
- elastic floor/wall response, english, fly-ball sidelines, impact trails, particles, point calls, screen shake, and synthesized court audio
- pixel-snapped sprites with heavy comic ink, animated footwork, motion lines, and impact bursts
- a device-saved `My Player` creator with eight skin tones, four body builds, five faces, five facial-hair choices, eight hairstyles, urban/sports clothing, headwear, footwear, accessories, tattoos, and six style presets
- animated Locker previews for idle, palm, backhand, roller, and victory poses
- six outfit colorways and seven chest-emblem treatments rendered on the live court sprite
- comic-style rival entrances plus persistent match-win and defeat poses
- a post-match card with final score, rally count, longest rally, pure contacts, cracks, and block calls
- four functional Wall School drills for accuracy, called spin, low kills/rollers, and solo-rally rhythm
- a graffiti, street-poster, hip-hop-mixtape, comic-book, and pixel-art presentation layer
- live status messaging, help dialog, and reduced-motion support

## Controls

### 3D Street Match

- `WASD`: move
- mouse: point at the wall
- hold/release `Space`, `J`, `K`, or `L`: open palm, topspin, backspin, or fist
- `Z` / `X`: left or right English
- `Q` / `E`: lift or drive modifier
- `Shift`: hold a planted Set position while the opponent owns the touch
- `R`: start the street match or next point
- `F`: interrupt with a solo practice feed
- `C`: cycle Tactical, Player, and Courtside cameras
- `Backspace`: reset the match
- `Court tempo`: 78% by default for readability; 100% runs the physical simulation at street-real time

For the 3D match on a standard controller:

- left stick: physical court movement
- right stick: continuous wall placement and height
- hold/release `A / Cross`, `X / Square`, `B / Circle`, or `Y / Triangle`: open palm, topspin, backspin, or fist
- `LB / RB`: left or right English
- `LT / RT`: lift or drive through the ball
- hold `R3`: plant in the off-ball Set stance

On phones, the court supplies a physical movement pad and keeps the four
hold/release contact families docked at the bottom of the screen. Tap the wall
to move the target before releasing a contact.

### Preserved 2.5D match

- `WASD` or arrow keys: move
- tap `Space` for a lower-pace control touch, or hold and release in the shot-specific green window for clean power
- `1`–`7`: select palm, slice, fist, backhand, kill, roller, or lob
- hold and release `J` / `K` / `L` / `U`: palm, slice, fist, or backhand
- hold and release `I` / `O` / `P`: kill, roller, or lob
- `Z` / `X`: left or right english while swinging
- `Shift`: extra pace
- hold `E` after your shot: set a legal stationary position while the opponent owns the touch
- hold `Q` while receiving: track the ball with a wider read window but slower feet
- `R`: serve
- `T`: open Wall School
- `C`: cycle Broadcast, Player, Follow, and Courtside cameras
- `-` / `+`: zoom the active camera out or in
- `Backspace`: reset match

On touch devices, use the on-screen move pad, spin holds, and hold/release the `Slap` button. Camera controls stay on the court. Tap the court name in the header to rotate through West 4th, Coney Island, and Venice Beach. `My Player` opens the character creator; saved looks remain on that device.

### 2.5D gamepad

The first connected standard Xbox, PlayStation, or compatible controller is detected automatically:

- left stick: true analog movement; feather the stick for balanced adjustment steps
- right stick: wall placement, height, and english
- hold/release `A / Cross`: palm topspin
- hold/release `X / Square`: slice backspin
- hold/release `B / Circle`: fist knuckle ball
- hold/release `Y / Triangle`: backhand
- left bumper: lob
- right bumper: kill
- left trigger: power modifier
- right trigger: roller
- left-stick click / `L3`: hold a stationary Set position off-ball
- right-stick click / `R3`: hold Read stance while receiving
- View / Share: cycle camera

Supported controllers receive contact, wall-impact, and point-result rumble where the browser exposes a vibration actuator.

## Local development

Install the pinned development dependencies, then start the static server:

```bash
npm ci
```

```bash
npm run serve
```

Then open `http://127.0.0.1:4173`.

Run the deterministic validation suite before publishing:

```bash
npm test
```

`npm test` covers JavaScript syntax, shared platform behavior, the official 2.5D court projection, exact vendored Three.js assets, 3D geometry, official drop response, high-speed tunneling, spin direction, directional hand collision, official serve/scoring rules, replay serialization, unique HTML IDs, DOM bindings, local assets, reduced motion, shot wiring, and the existing officiating systems.

With the local server running, the optional browser suite verifies WebGL, the official drop interaction, player and Ghost hand contacts, a regulation AI serve, delayed perception, replayable AI commands, tempo/camera/coefficient controls, the preserved match page, and desktop/mobile layouts:

```bash
npm run test:lab-runtime
```

Browser-test screenshots go to the operating system’s temporary directory by
default. Refresh the committed desktop and mobile reference captures only when
the visual change is intentional:

```bash
UPDATE_SCREENSHOTS=1 npm run test:lab-runtime
```

## Test deployment

GitHub Actions validates every pull request and stages the exact static artifact used by production. Only `main` deploys to the shared GitHub Pages URL automatically. Any branch can replace that shared playtest intentionally through a manual workflow run with `deploy_pages` enabled.

## Project layout

- `index.html`: page structure and HUD
- `style.css`: standalone visual design
- `app.js`: thin browser entrypoint for the preserved match
- `src/game/match-app.js`: preserved 2.5D match coordinator, controls, AI, Canvas rendering, and content systems
- `src/game/match-content.js`: static shots, opponents, drills, avatars, and timing profiles
- `src/game/match-environment.js`: 2.5D court projection, physics tuning, cameras, rhythm presets, and venue palettes
- `lab.html` / `lab.css`: true-scale 3D Street Match and collapsible calibration tools
- `src/game/wall-ghost.js`: explicit Rookie, Regular, and Champion perception/movement profiles
- `src/platform/`: shared optional browser capability adapters such as Gamepad input and rumble
- `src/presentation/`: projections from official game measurements into renderer coordinates
- `src/sim/`: serializable contracts, official measurements, seeded randomness, replay records, and BallisticsCore
- `src/styles/tokens.css`: semantic visual foundation shared by both playable experiences
- `src/labs/ball-lab.js`: Three.js match coordinator, physical actors/hands, cameras, onboarding, presentation, and telemetry
- `vendor/`: pinned browser runtime for Three.js plus its MIT license
- `package.json`: pinned dependencies, validation, browser QA, and serving commands
- `scripts/syntax.test.mjs`: automatic syntax discovery for every first-party JavaScript module
- `scripts/physics.test.mjs`: golden geometry, ballistics, contact, and replay tests
- `scripts/architecture.test.mjs`: shared platform and official projection contract tests
- `scripts/vendor.test.mjs`: exact-match check for the deployed Three.js files and license
- `scripts/stage-site.mjs`: single source of truth for the GitHub Pages artifact
- `scripts/lab-runtime.mjs`: WebGL, interaction, preserved-page, and responsive browser QA
- `scripts/smoke.mjs`: structural smoke test
- `.github/workflows/pages.yml`: GitHub Pages validation and deployment
- `CHANGELOG.md`: shipped gameplay and presentation milestones
- `docs/american-handball-game-plan.md`: longer-term roadmap carried over into the new project
- `docs/fun-game-roadmap.md`: prioritized game-feel and presentation work
- `docs/court-geometry-and-camera-study.md`: official geometry mapping, venue references, and match-camera findings
- `docs/control-and-training-design.md`: tennis-game inspiration, handball mappings, controller layout, and drill design
- `docs/accuracy-first-3d-gameplay-plan.md`: accuracy-first 3D simulation, minimal-input controls, engine bake-off, playtest gates, and staged implementation
- `docs/architecture.md`: branch inventory, runtime ownership, command/snapshot seams, testing pyramid, and deployment guardrails
- `docs/visual-day-night-art-direction.md`: SetScope-informed visual tokens, brighter Day color script, floodlit Night rig, readability gates, and implementation order
- `docs/avatar-creator-design.md`: inclusive character-creator scope, option taxonomy, presets, and multiplayer-safe data model
- `docs/champion-playtest-protocol.md`: expert recruitment, interview script, instrumented session, and evidence rules
