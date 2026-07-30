# Changelog

## 0.5.1 — Own the contact

### Feel pass

- added a playable 3D Wall School with Clean Three, Loaded Pace, and Spin Shape drills that score the same deterministic contact outcomes used by matches
- added drill-specific physical feeds and live streak/progress coaching directly beside the court
- strengthened contact presentation by scaling impact flash, audio layers, and controller rumble with actual pace, spin, and contact quality

### Architecture and verification

- extracted pure Wall School state and scoring into a renderer-free module, preparing the same drill definitions for career progression and future online challenge validation
- added deterministic drill scoring coverage and smoke coverage for the new simulation module

## 0.5.0 — Take the wall

### 3D street match

- promoted the Accuracy Lab into a focused West 4th Street singles match while preserving its collapsible calibration tools
- standardized the player-facing match on race-to-11 side-out scoring
- added Rookie, Regular, and Champion Wall Ghost profiles with explicit perception delay, observation noise, foot speed, recovery depth, aim error, and aggression
- added a court-entry flow, progressive move/prepare/release coaching, live opponent scouting, and post-match contact statistics
- added emergent kill, roller, lob, hook, cut, and knuckle descriptions derived after physical contact
- promoted contact outcomes into deterministic replay metadata with pace, spin, hand speed, spacing, preparation, and contact-quality grades
- added a serializable off-ball Set modifier with keyboard and right-stick-click controls
- improved strike readability with preparation/torso motion, court-positioned impact flashes, and layered impact noise
- moved geometry, coefficient tuning, drop testing, and replay export behind an optional accuracy-tools drawer

### Architecture and verification

- extracted pure Wall Ghost profiles and decision helpers from the Three.js coordinator
- extracted the contact-outcome model from the Three.js coordinator so training, replay, AI, and future netcode share one result
- extended versioned player commands with the off-ball Set intent
- included authoritative score, service possession, expected hitter, faults, rally length, and winner state in simulation snapshots
- added profile, command-boundary, race-to-11, court-entry, difficulty-selection, and responsive browser coverage

### Maintenance

- upgraded the GitHub Pages workflow to current Node 24-based official actions
- changed validation to run on pull requests and isolated workflow concurrency by branch
- limited Pages write and identity permissions to the deployment job
- made dependency installation and static-site staging reproducible in CI
- added automatic first-party syntax discovery and exact vendored Three.js integrity checks
- updated Playwright to `1.62.0` and classified Three.js as a pinned build-time dependency
- stopped routine browser QA from rewriting committed visual reference captures
- removed development-only Accuracy Lab reference captures from the production artifact
- documented and ignored local QA output directories

## 0.4.1 — Consolidate the spine

### Architecture

- moved the preserved 2.5D coordinator under `src/game` and kept a thin stable root entrypoint
- separated static match/avatar content and environment tuning from the live coordinator
- centralized Gamepad discovery, analog deadzones, and optional rumble in one browser adapter shared by both playable experiences
- derived the 2.5D short line, service markers, and six-inch marker length from the official SI-unit court source
- added shared semantic visual tokens as the implementation seam for the brighter Day / floodlit Night pass
- documented runtime ownership, command/snapshot flow, branch state, testing layers, and safe future split points

### Delivery and verification

- added architecture tests for browser adapters, bounded rumble, malformed axes, preferred-controller selection, and official court projection
- reset the simulation tick, time, and frame accumulator with the seed so repeated Wall Ghost serves reproduce exactly
- changed feature branches to validate without automatically replacing the single shared GitHub Pages playtest
- retained an explicit manual feature-branch deployment path for intentional playtest updates

## 0.4.0 — Make the contact

### True-scale 3D lab

- added a separate Three.js Accuracy Lab without replacing the playable 2.5D match
- encoded the official one-wall court and ball in meters, kilograms, and seconds
- added Tactical, Player, and Courtside perspective cameras with optical zoom
- added a physical-size ball with a render-only readability halo, regulation line labels, a human-scale graybox player, chain-link surrounds, and comic/graffiti court art

### Physics and control

- added a custom 240 Hz BallisticsCore with quadratic drag, Magnus force, swept floor/wall collision, friction, spin exchange, and crack-seam response
- calibrated the floor response to a 49.8-inch rebound from the official 70-inch free fall
- added a swept moving-hand collider with bounded, recorded hand-tracking assistance and a directional striking face that suppresses spherical edge-launch artifacts
- added hold-to-prepare/release-to-swing controls with open palm, topspin, backspin, and fist techniques
- added left/right English, lift, and drive modifiers whose impulses combine at contact instead of choosing canned trajectories
- added accurate down feedback when a return touches the floor before reaching the front wall
- added a 55–110% court-tempo control that time-dilates presentation without changing physical dimensions or collision coefficients

### First complete 3D point

- added a first-to-5 Wall Ghost match with server-only scoring, side outs, two service attempts, short/long/outside faults, second-bounce winners, and service rotation
- added separate player and opponent actors, hands, movement, preparation, contact, and replayable controller commands
- added opponent perception sampled at 20 Hz with seeded measurement noise and roughly 100 ms of delay
- added a small opponent-side physics forecast that anticipates floor and wall response using only delivered observations
- added a continuous preparation-to-contact-to-follow-through hand path for low pickups and serves
- added a match ribbon, service possession, rally length, turn guidance, opponent-read telemetry, and match-aware camera centering

### Architecture and instrumentation

- added versioned, serializable command, ball, contact, snapshot, and replay records
- replaced competitive `Math.random()` calls in the preserved match with a resettable seeded source
- added replay JSON export plus an in-lab contact replay viewer
- pinned and vendored Three.js `0.185.1` for static GitHub Pages deployment

### Verification

- added golden tests for official dimensions, drop rebound, wall response, tunneling, spin direction, moving-hand contact, server-only scoring, side outs, two serves, seeded randomness, and replay serialization
- added browser QA for WebGL startup, drop-test interaction, player contact, Ghost contact and legal serve, delayed observations, AI replay commands, tempo/camera/coefficient controls, preserved-match loading, and mobile overflow
- added desktop and phone reference captures for the Accuracy Lab

## 0.3.0 — Rhythm and depth

### Playability

- slowed the default visible ball arrival to roughly 74% of the previous prototype while preserving spatial trajectory and rule outcomes
- added four bounded Rhythm Lab presets plus custom, device-saved tuning for master tempo, ball, footwork, read window, and camera depth
- added reproducible playtest codes so players can share an exact feel configuration
- added a receiving Read stance with a foot-speed tradeoff and a controlled step-in weight-transfer reward

### Presentation

- added a deeper Player camera and made it the default
- enlarged the desktop court presentation, strengthened foreground sprite/ball scaling, and added perspective floor guides
- layered scanline texture and harder 16-bit/comic UI treatments into the court and tuning lab

### Research and planning

- added a champion and court-player recruitment, interview, and instrumented playtest protocol
- documented the boundary between footage-derived hypotheses, actual player evidence, and any future public endorsement
- preserved the single-player-first, multiplayer-ready, doubles-ready, and regulated-stakes product boundaries

## 0.2.0 — Gameplay vertical slice

### Court and rules

- mapped the court to official USHA one-wall proportions
- implemented server-only scoring, side outs, two service attempts, and front-wall / bounce validation
- added legal Set positioning and movement-created avoidable block calls
- added post-match rally, contact, crack, and block statistics

### Feel and physics

- moved ball integration to a deterministic 120 Hz fixed step
- added time-based drag, lateral english, vertical spin, floor response, crack-seam behavior, and seeded fist-ball knuckle flutter
- added live bounce prediction plus difficulty-scaled landing reads
- implemented contact quality from preparation, spacing, footwork balance, and fly / bounce / short-hop interception
- added shot-specific preparation windows and a real control-versus-power tradeoff
- preserved true analog movement magnitude with momentum-aware direction changes

### Players and opponents

- expanded the roster to Rookie Rae, Wall Ghost, and King Shade with distinct movement, tactics, shot selection, and visual identities
- added match-memory responses to repeated player patterns
- added a device-saved My Player creator with modular bodies, faces, hair, clothing, colorways, emblems, footwear, accessories, eyewear, and body art

### Presentation and access

- added Broadcast, Follow, and Courtside cameras with zoom
- added West 4th Street, Coney Island, and Venice Beach atmosphere presets
- layered pixel sprites, comic ink, wall targeting, impact typography, particles, hit-stop, synthesized audio, and gamepad rumble
- added keyboard, touch, and standard Gamepad API controls
- added Wall School drills, help content, live status messaging, and reduced-motion behavior

### Delivery

- added dependency-free structural smoke tests
- added an automated GitHub Pages test deployment
