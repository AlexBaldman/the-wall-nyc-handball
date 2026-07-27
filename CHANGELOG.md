# Changelog

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
