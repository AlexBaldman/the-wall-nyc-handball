# The Wall — NYC One-Wall Handball

This is the extracted standalone version of the American handball concept that had been living in the old `Jeopardish` orbit.

[Play the current GitHub Pages test build](https://alexbaldman.github.io/the-wall-nyc-handball/)

## What it is

A court-first browser game focused on the first thing that matters for this idea: does the rally loop feel alive? The current visual direction is a stylized sunset run at a fenced Lower East Side park, with arcade readability layered over one-wall rules.

Current build includes:

- official one-wall proportions: a 20-foot-wide wall, 34-foot long line, 16-foot short line, 25-foot service markers, and 16-foot wall height
- `Broadcast`, `Follow`, and angled `Courtside` cameras with user zoom
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

- `WASD` or arrow keys: move
- tap `Space` for a lower-pace control touch, or hold and release in the shot-specific green window for clean power
- `1`–`7`: select palm, slice, fist, backhand, kill, roller, or lob
- hold and release `J` / `K` / `L` / `U`: palm, slice, fist, or backhand
- hold and release `I` / `O` / `P`: kill, roller, or lob
- `Z` / `X`: left or right english while swinging
- `Shift`: extra pace
- hold `E` after your shot: set a legal stationary position while the opponent owns the touch
- `R`: serve
- `T`: open Wall School
- `C`: cycle Broadcast, Follow, and Courtside cameras
- `-` / `+`: zoom the active camera out or in
- `Backspace`: reset match

On touch devices, use the on-screen move pad, spin holds, and hold/release the `Slap` button. Camera controls stay on the court. Tap the court name in the header to rotate through West 4th, Coney Island, and Venice Beach. `My Player` opens the character creator; saved looks remain on that device.

### Gamepad

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
- View / Share: cycle camera

Supported controllers receive contact, wall-impact, and point-result rumble where the browser exposes a vibration actuator.

## Local development

This project is static HTML/CSS/JS, so any simple local server works.

```bash
npm run serve
```

Then open `http://127.0.0.1:4173`.

Run the dependency-free validation suite before publishing:

```bash
npm run check
```

The smoke test checks JavaScript syntax, unique HTML IDs, every DOM binding, local assets, shot wiring, reduced-motion coverage, and the presence of the core physics and officiating systems.

## Test deployment

GitHub Actions validates the game, stages only the playable static assets, and deploys them to GitHub Pages. Pushes to `main` and `agent/**` produce a test deployment; the workflow can also be run manually.

## Project layout

- `index.html`: page structure and HUD
- `style.css`: standalone visual design
- `app.js`: game loop, controls, ball physics, rules, and rendering
- `package.json`: dependency-free local validation and serving commands
- `scripts/smoke.mjs`: structural smoke test
- `.github/workflows/pages.yml`: GitHub Pages validation and deployment
- `CHANGELOG.md`: shipped gameplay and presentation milestones
- `docs/american-handball-game-plan.md`: longer-term roadmap carried over into the new project
- `docs/fun-game-roadmap.md`: prioritized game-feel and presentation work
- `docs/court-geometry-and-camera-study.md`: official geometry mapping, venue references, and match-camera findings
- `docs/control-and-training-design.md`: tennis-game inspiration, handball mappings, controller layout, and drill design
- `docs/avatar-creator-design.md`: inclusive character-creator scope, option taxonomy, presets, and multiplayer-safe data model
