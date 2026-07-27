# American Handball Video Game Plan (NYC Style)

This plan is for building a realistic video game inspired by one-wall American handball culture in New York City and Long Island.

## Current Status — July 2026

The first browser-game vertical slice is playable. It has moved well beyond the original three-shot rally prototype and now includes:

- A regulation-proportioned one-wall court with front-wall, floor, crack, and out-of-bounds behavior
- A deterministic 120 Hz physics simulation with drag, bounce, spin, charge timing, contact quality, and seven distinct shots
- A complete player-versus-computer match loop with serves, faults, rallies, scoring, block/hinder calls, difficulty levels, and adaptive tendencies
- Keyboard, touch, and gamepad controls with analog movement and aiming
- Four camera presets, multiple NYC-inspired venues, a player creator, and Wall School training drills
- Match presentation, post-match statistics, accessibility support, smoke tests, and an automated GitHub Pages test deployment

The immediate job is no longer proving that handball can be fun in the browser. It is turning this strong vertical slice into a measured, replayable single-player game.

## Vision

Build a game that starts simple (retro top-down prototype) and grows into a realistic 3D competitive experience with:

- Authentic one-wall rules and ball physics
- Street and school-court atmosphere
- A progression from local courts to elite borough competition

## Core Experience Pillars

1. **Real handball feel**
   - Ball speed, bounce angle, spin, and wall interaction must feel believable.
2. **Court authenticity**
   - One-wall dimensions, line markings, and surface materials matter.
3. **Culture and progression**
   - Start at school/local runs and climb into borough-level tournaments.
4. **Accessible but deep controls**
   - Easy to pick up, with enough nuance for shot-making mastery.

## Suggested Development Phases

### Phase 0: Design + Research — Complete

- Lock scope for the first playable build.
- Document baseline one-wall rules:
  - Serve, short line/fault behavior, legal returns, and scoring format.
- Collect references for:
  - Typical NYC court dimensions and textures
  - Gameplay pacing (reaction windows, rally length)
- Define a small glossary of shot types:
  - Straight, cross-court, kill shot, lob, and ceiling-style defensive shots (where applicable to level design)

### Phase 1: Browser Prototype — Complete

The current angled 2.5D canvas game validates the core feel before a larger 3D investment.

**Features**

- Multiple court looks and single-player drills
- Beginner through elite adaptive AI
- Complete match scoring
- Per-shot charge and contact feedback
- Ball physics with velocity, drag, bounce, seams, and two-axis spin

**Success criteria**

- Rallies feel fun for 5+ minutes
- Players can intentionally hit seven distinct shot types
- AI can sustain beginner/intermediate rallies

### Phase 2: Single-Player Game

Turn the vertical slice into a game players want to finish and replay.

**Features**

- A park-to-park opponent ladder with distinct archetypes and personalities
- First-session onboarding that flows naturally into Wall School
- Between-point presentation, match introductions, victory moments, and progression rewards
- Playtest telemetry for rally length, shot choice, contact quality, misses, and difficulty
- More animation poses and character silhouettes without sacrificing input responsiveness
- Local-versus architecture that keeps doubles and online play possible later

**Success criteria**

- A new player can serve, rally, and understand a lost point without outside instructions
- Each AI tier creates a recognizable tactical problem instead of merely moving faster
- Players can complete a 20–30 minute ladder session and want another run
- Physics tuning is backed by real playtest data rather than intuition alone

### Phase 3: 3D Production Exploration

Create one high-quality court with third-person gameplay and polished mechanics.

**Features**

- Third-person camera with lock-on assist
- Full body animation set (ready stance, sprint, forehand/backhand palm strike)
- Directional aiming cone + power control
- Ball physics v2:
  - Spin affecting post-wall trajectory
  - Material-based bounce differences (asphalt/concrete variants)
- Local 1v1 multiplayer

**Success criteria**

- Competitive rallies feel readable and fair
- Input latency feels responsive on controller/keyboard
- Two players can complete full matches without major exploits

### Phase 4: Competitive Loop + Worldbuilding

Expand content and progression.

**Features**

- Multiple courts inspired by:
  - High school grounds
  - Neighborhood park walls
  - Borough championship venue
- Career mode ladder:
  - Park runs -> neighborhood bracket -> borough finals
- Opponent archetypes:
  - Power hitter, placement specialist, defensive retriever
- Player growth system:
  - Stamina, footwork, control, and power (balanced so skill still dominates)

### Phase 5: Online + Live Meta (optional)

- Ranked/quickplay matchmaking
- Seasonal leaderboards by borough
- Replay and ghost system for shot analysis
- Anti-cheat and rollback netcode tuning

## Gameplay Systems to Prioritize Early

- **Contact timing and spacing:** reward proper position and punish late reaches.
- **Shot intent model:** direction + power + spin from one unified control scheme.
- **Readable defense:** players should anticipate return options from opponent body setup.
- **Stamina pressure:** long rallies should create tactical openings without feeling arcade-random.

## Technical Recommendations

- **Engine:** Unity or Unreal.
  - Unity for faster iteration and indie tooling ecosystem.
  - Unreal if animation fidelity and advanced physics/visuals are top priority.
- **Physics approach:** custom ball controller layered on engine physics for determinism and tunable feel.
- **Animation:** start with a minimal set and expand once timing windows are stable.
- **Networking (if online):** design for rollback early if high-level competitive play is a target.

## Control Scheme (Starting Point)

- Left Stick / WASD: movement
- Right Stick / Mouse: shot direction bias
- Strike button: hit ball
- Modifier 1: finesse/placement mode
- Modifier 2: power mode

Combine button timing + directional input + modifier to generate shot variety without overwhelming players.

## Milestone Checklist

1. First playable rally loop
2. Playable match with serving + scoring
3. AI opponent that can adapt to repeated patterns
4. Third-person 3D court vertical slice
5. Career mode with at least 3 locations
6. Local multiplayer release candidate
7. Online beta (optional)

## Practical Next Step

Run structured playtests of the deployed browser build and tune the single-player foundation:

- Record rally length, shot selection, pure-contact rate, player miss reason, and AI tier
- Test keyboard and controller separately with new and experienced players
- Tune movement acceleration, recovery timing, shot risk, and AI anticipation from those results
- Build the first three-opponent park ladder once the physics targets are stable

That gives the next content pass a trustworthy foundation while preserving room for local multiplayer, doubles, and eventual rollback-ready online play.
