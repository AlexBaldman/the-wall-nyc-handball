# Accuracy-First 3D Gameplay Plan

## Implementation status — July 27, 2026

The first foundation slice is now playable at `lab.html`:

- Stage 0 contracts exist for `PlayerCommand`, `BallState`, `ContactRecord`, and `SimulationSnapshot`;
- competitive randomness in the preserved match uses a resettable seed;
- the 3D lab is a separate entry, so the existing match remains the comparison baseline;
- official court and ball measurements are encoded in SI units;
- the custom BallisticsCore runs the ball at 240 Hz with swept wall, floor, and moving-hand collision;
- the official drop check currently produces a 49.8-inch rebound;
- open palm, topspin, backspin, fist, English, lift, and drive combine through hold/release contact;
- Tactical, Player, and Courtside perspective cameras plus optical zoom are live;
- the first complete 3D point is live with server-only scoring, side outs, two serves, regulation serve bounces, downs, and second-bounce winners;
- Wall Ghost owns a separate actor and swept hand, sees delayed/noisy samples, predicts from those samples through the same ballistics model, and records its decisions as controller commands;
- a presentation-tempo control now makes 78% the readable default while keeping 100% physical real time available;
- contact explanations, replay records, JSON export, coefficient tuning, and browser/physics tests are live.

This completes Stage 0, the custom-solver/geometry portion of Stage 1, and the first Stage 3 sparring slice. The Rapier comparison, full coefficient bake-off, deeper trajectory calibration, multiple opponent skill profiles, block/hinder logic, and expert validation remain open.

## Decision

The next gameplay generation will not ask the player to select a canned outcome such as `kill` or `roller` before swinging. It will use familiar tennis-style contact buttons to express how the player intends to meet the ball.

The player will:

1. move into position;
2. hold a contact button to prepare and build pace;
3. indicate a place on the wall;
4. optionally add side english, lift, or attack intent with a shoulder modifier;
5. release the contact button to swing.

Everything else should emerge from the body-ball relationship and the resulting contact:

- forehand or backhand comes from which hand can reach the ball and which side of the body receives it;
- the contact button chooses an open-palm, topspin, backspin, or fist technique, but not a guaranteed trajectory;
- pass, kill, or lob comes from the modifier, contact height, wall intention, swing plane, pace, and body transfer;
- the amount of topspin, backspin, and side english still comes from tangential hand motion at contact;
- a roller is an exceptional low-wall result, not a super-move button;
- a miss is a real miss, with a visible physical cause.

This is the gameplay constitution. Buttons choose technique and intent. Physics chooses the result. Named outcomes remain useful as coaching labels, statistics, AI intentions, and post-contact commentary.

## Why the current prototype has reached its architectural ceiling

The browser vertical slice proved that one-wall handball can be readable and fun. It also contains several systems worth preserving:

- official court ratios and rule state;
- a fixed-step update loop;
- analog movement and aim sampling;
- body balance, preparation, fly, apex, bounce, and short-hop concepts;
- camera and tempo experiments;
- match, serve, fault, side-out, hinder, training, AI, and presentation loops;
- controller, keyboard, touch, sound, rumble, and accessibility support.

The central ball-contact path is still a 2.5D target generator:

- the selected shot profile supplies a preferred speed, wall height, spin scale, rebound behavior, and risk;
- the strike code chooses a wall target and solves the velocity needed to reach it;
- `kill` and `roller` unlock special crack behavior because of their labels;
- placement errors include random spread;
- the camera applies affine scale and shear to a flat canvas rather than projecting a real 3D court.

That is a good prototype abstraction, but it cannot become an accuracy-first simulation by adding more shot profiles. The production path needs a new simulation seam while the existing game remains playable as the reference build.

## The target experience

### First 30 seconds

A new player should understand:

- left stick moves;
- right stick points to a place on the wall;
- hold and release `A / Cross` for the safest open-palm return.

Centering the stick should produce the safest available return. The game should help the player face the wall and choose a viable hand, but it should not teleport the player or the ball.

The interface teaches this in play:

- the first ready stance displays `MOVE → POINT → HOLD A → RELEASE` beside the player, not in a detached help panel;
- pressing a contact button immediately changes the hand shape, color accent, and preparation pose;
- a small wall reticle moves with the right stick;
- bumper input wraps a left or right spin arrow around the hand;
- lift tilts an intention ribbon upward and attack tilts it downward;
- release removes the hints and lets the ball's real path teach the result.

Each hint fades after the player demonstrates the action twice and can be restored from training or accessibility settings.

### First 10 minutes

The player should discover without opening a move list:

- early preparation creates a longer, calmer swing;
- arriving balanced makes the intended wall target more accurate;
- stepping through contact adds useful pace;
- the four contact buttons change hand surface and swing path;
- holding any contact button longer builds preparation and pace up to an ideal plateau;
- the left trigger adds lift while a high target creates a lob attempt;
- the right trigger adds attack intent while a low target creates a kill attempt;
- the bumpers add left or right side english;
- aiming low from a good setup attacks;
- reaching, getting jammed, or swinging on the run changes the result.

### Long-term mastery

An expert should be able to read and manipulate:

- exact interception time;
- contact side and height;
- open-hand versus fist contact;
- swing-plane direction and speed;
- weight transfer;
- wall target and safety margin;
- three-axis ball spin;
- opponent preparation, knee bend, front foot, and recovery position.

The game should have few controls and many consequences.

## Evidence behind the design

### One-wall handball

The [USHA One-Wall Rulebook](https://www.ushandball.org/learn-handball/one-wall-rulebook/) gives us physical calibration points, not just rules:

- the standard ball is `1 7/8 in` in diameter and the Red label ball is `61 g ± 3 g`;
- its rebound from a `70 in` free fall onto hardwood at `68°F` is `48–52 in`;
- the wall is `20 × 16 ft`, the long line is `34 ft` from the wall, and the short line is `16 ft` from the wall;
- a legal return may be taken on the fly or after one bounce and must reach the wall before the floor;
- either the front or back of one hand may strike the ball, and the fist is legal.

[USHA's 21 instructional tips](https://www.ushandball.org/21-tips-to-help-you-reach-21-first/) connect accuracy to physical actions:

- watch the ball into the hand;
- move toward the target during the stroke;
- read the opponent's front leg and knee bend;
- recover deeper than geometric center so the player can step forward;
- set up a step or two deeper than the predicted contact point;
- get low and set before attempting a kill.

The [USHA one-wall angles article](https://www.ushandball.org/1-wall-servers-must-learn-how-to-handle-the-angles/) treats the sport as a serve-and-shoot game of angles. It describes lead-foot position, wrist action, cross-court geometry, disguise, and recovery as connected parts of one motion. That supports an input model based on movement, preparation, target, and hand path instead of a menu of outcomes.

### Tennis games

The [Virtua Tennis 3 manual](https://www.gamesdatabase.org/Media/SYSTEM/Sony_PSP/manual/Formated/Virtua_Tennis_3_-_Sega.pdf) makes three ideas easy to understand:

- get to the ball;
- begin the swing early;
- set direction during preparation.

Power comes from anticipation and preparation time. Poor anticipation produces a weak or missed return. The game also allows automatic contextual volleys, smashes, and running shots rather than requiring a separate button for every animation.

[Tennis Elbow 4's documentation](https://www.managames.com/tennis/doc/Tennis_Elbow-Tennis_Game.html) goes further on centered contact. Bad spacing changes accuracy, depth, and power. Preparation gradually shrinks the target zone, and its Arcade, Simulation, and Elite modes change forgiveness without changing the sport's underlying logic.

The developer-maintained [Full Ace FAQ](https://steamcommunity.com/app/779430/discussions/0/1698293255128732330/) similarly emphasizes preparing as soon as the trajectory is read, stepping inside only for an attackable ball, and keeping margin from the lines. It also provides optional automatic preparation when the controls become overwhelming.

These games are references, not templates. Tennis uses a racket, a net, and distinct stroke conventions. One-wall handball needs a shorter contact, two usable hands, body traffic, a front wall, and legal fly/short-hop decisions.

### Gamer signals

Community comments are anecdotes, not design truth, but they identify hypotheses worth testing:

- a [May 2026 TopSpin discussion](https://www.reddit.com/r/TopSpin2K/comments/1tbhsj1/how_are_you_supposed_to_play_this_game/) shows how a meter on every contact can make players understand the meter while still not understanding why the ball went out;
- tennis-game discussions repeatedly describe confusion when one stick silently changes from locomotion to aiming;
- simulation players value positioning and preparation, while arcade players value immediate legibility and a safe default return.

The response is not to remove timing or depth. It is to put timing in the motion and show the physical reason for an error after contact.

## Canonical tennis-style controller

### Always-on controls

| Input | Meaning | Rule |
| --- | --- | --- |
| Left stick | Footwork | Always moves the player; it never becomes an aiming stick |
| Right stick | Wall intention | Horizontal selects wall side; vertical selects wall height |
| `A / Cross` | Open palm / control | Safest neutral contact; small natural spin may still emerge |
| `X / Square` | Topspin brush | Hand path tries to roll over the ball |
| `B / Circle` | Backspin slice | Hand path tries to cut under the ball |
| `Y / Triangle` | Fist / hard contact | Closed-hand collider favors pace and low spin at greater control risk |
| `LB / L1` | Left side english | Adds leftward tangential intent to any open-hand technique |
| `RB / R1` | Right side english | Adds rightward tangential intent to any open-hand technique |
| `LT / L2` | Lift / lob modifier | Raises the swing plane; it does not guarantee a legal lob |
| `RT / R2` | Drive / kill modifier | Lowers and commits the swing plane; it does not guarantee a kill |

Camera, pause, celebration, and menu controls do not count as the rally vocabulary.

Holding any face button prepares that technique and builds available hand speed. Releasing it starts the swing. The hold-to-power curve rises into a broad useful plateau and then stops adding power. It should not reward charging forever or require the player to stare at a meter.

The system is layered:

- a beginner can play with left stick, right stick, and `A / Cross`;
- an intermediate player adds the topspin, backspin, and fist buttons;
- an advanced player chords a bumper or trigger modifier with the same contacts;
- combinations describe physical intent rather than invoking a scripted move.

Examples:

- `X + LB` asks for topspin with left side english;
- `B + RB` asks for a heavy rightward cut;
- `A + LT` asks for a controlled lift;
- `Y + RT` asks for the hardest direct attack;
- `B + RT` asks for a low, heavily cut attack that may become a crack or roller only from excellent contact.

### Legal Set behavior

The player should automatically become legally still when:

- their team has just hit;
- the left stick is neutral;
- their residual locomotion has settled for a short, visible threshold.

Left-stick click can remain an explicit accessibility shortcut for stopping immediately. It should not be required on every shot. A `SET` indicator may appear in training or referee-assist modes, but expert presentation can rely on stance and shoe movement.

### Read behavior

`Read` should stop being a separate power-up button. Its useful pieces become physical:

- slowing the left stick stabilizes the player;
- preparing early turns the torso and raises the hand;
- watching the opponent exposes foot, knee, and hand cues;
- assist level controls how clearly the predicted contact region is visualized.

The player still decides whether to plant, move, or commit early.

### Keyboard and mouse

| Controller | Keyboard and mouse |
| --- | --- |
| Left stick | `WASD` |
| Right stick target | mouse position projected onto the wall |
| `A / Cross` open palm | hold/release primary mouse button or Space |
| `X / Square` topspin | hold/release `J` |
| `B / Circle` backspin | hold/release `K` |
| `Y / Triangle` fist | hold/release `L` |
| Left/right english | `Q` / `E` |
| Lift/attack modifier | Shift / secondary mouse button |

Keyboard-only aiming remains supported with a slowly accelerating wall cursor, but controller and mouse are the accuracy-first inputs.

### Touch

Touch should not constrain the first 3D physics slice. The eventual mapping is:

- left thumb movement zone;
- right thumb wall target;
- a compact four-contact cluster near the right thumb;
- optional modifier swipes or a second-finger hold for advanced intent.

It must be tested separately because screen occlusion and the absence of physical centering create different accuracy problems.

## How aim, technique, power, and modifiers combine

The controls have stable responsibilities:

1. **Right stick:** intended wall point.
2. **Face button:** intended contact surface and vertical brush family.
3. **Hold duration:** preparation and available hand speed.
4. **Bumper:** optional left or right tangential intent.
5. **Trigger:** optional lift or attack swing-plane intent.
6. **Feet and body:** the position from which all those intentions must actually be executed.

No input changes meaning during the swing. Neutral right stick aims at a conservative center target. No modifier requests a normal return. Conflicting chords such as lift plus attack cancel to neutral in the first prototype rather than producing a secret move.

The contact solver turns these intentions into a kinematic hand path. Actual hand-ball collision determines how much of the requested pace and spin transfers. A late, jammed `B + RB` input should not magically create a perfect cut. It should create the best physically available version of that intent, which may be a weak skid, a hand error, or a miss.

## Control teaching and interface language

The control system is only elegant if the player can read it without memorizing a manual.

### Four layers of explanation

1. **Body response:** the avatar's hand, shoulder, torso, knees, and feet visibly respond as soon as an input begins.
2. **In-world intent:** a restrained wall reticle and hand-side glyph show what the player is asking for.
3. **Contact feedback:** sound, rumble, ball rotation, and follow-through show what actually transferred.
4. **One-cause review:** a short physical explanation appears only when the intention and result diverge.

### Controller hint

```text
                 L1  ← english       english →  R1
                 L2  lift / lob      drive / kill R2

          [X] topspin                         [Y] fist
          [A] palm                            [B] backspin

       LEFT STICK: FEET                 RIGHT STICK: WALL
                    HOLD CONTACT → AIM → RELEASE
```

The exact face-button positions use the detected controller's native glyphs. Xbox labels must not be shown to a PlayStation player, and a keyboard player should never see trigger instructions.

### Progressive disclosure

- **First rally:** show movement, wall target, and open palm only.
- **First controlled return:** reveal hold time and a short “more preparation, more available pace” cue.
- **First high or low target:** reveal lift and attack modifiers.
- **First opponent displaced wide:** reveal left/right english.
- **First jammed or reached miss:** teach spacing using a frozen body-ball silhouette.
- **Wall School:** expose the full controller map and exact diagnostics.
- **Expert mode:** remove all prediction, text, and intent ribbons while keeping physical pose, sound, and haptics.

The game never dumps eight bindings onto the first serve.

### Intention is not prediction

The wall reticle represents what the player is asking for, not where the ball is guaranteed to go. Its shape communicates feasibility:

- compact and solid when the body can execute the intention;
- stretched when the player is moving or reaching;
- split by the body when the requested hand path is jammed;
- faded when the ball cannot be legally reached.

It must not draw a complete future trajectory during standard matches. Wall School and accessibility assists may show a bounded contact region or first-bounce estimate.

### Hold-to-power presentation

Do not use a giant timing bar in normal play. Show preparation through:

- the size of the backswing;
- shoulder and hip coil;
- foot plant;
- hand glow or ink weight;
- rising but bounded controller-rumble tension where supported.

Training may display the numeric curve beside the player. The ideal region is a broad plateau, not a one-frame green test.

### Remapping and clarity tests

- every rally action is remappable;
- no chord requires two controls that are physically inaccessible together on a standard pad;
- color is never the only difference between contact families;
- glyph, pose, arrow direction, audio, and text agree;
- reduced-motion mode replaces animation-heavy hints with stable shapes;
- the tutorial records which prompt the player needed rather than assuming completion means comprehension.

## Preparation and contact

### Preparation

Holding a face button begins preparation:

- the nearest viable hand draws back;
- the selected technique establishes hand shape and a physically plausible swing plane;
- locomotion remains available but sharp reversals reduce stability;
- early preparation expands reach and stabilizes aim up to a bounded plateau;
- holding forever does not keep adding power.

Preparation should be communicated through pose, breathing, foot plant, controller tension if available, and a quiet audio cue. The timing meter is training-only and off by default.

### Release

Releasing the face button starts a kinematic hand path. It does not immediately assign the ball a solved trajectory.

The return succeeds only if the swept hand collider intersects the swept ball sphere during the legal window. A small assist can adjust the hand path inside a bounded cone, but the assist cannot:

- move the player's feet;
- reverse the chosen swing side;
- reach through the body;
- hit a ball outside anatomical reach;
- change the intended wall side;
- rescue a ball after the second bounce.

USHA rules allow another attempt after a swing-and-miss until the second bounce. The simulation must preserve that instead of applying a generic swing cooldown that ends the attempt.

### Contact impulse

The ball leaves from an impulse computed from:

- incoming ball velocity;
- velocity of the hand contact point;
- open-hand or fist surface normal;
- tangential hand velocity;
- effective hand/arm mass;
- contact offset from the ball center;
- glove/ball friction;
- torso and step-in transfer;
- balance and anatomical reach.

Bad positioning should not add invisible dice-roll spread. It should change the reachable hand path, contact normal, hand speed, and stability. Small deterministic motor noise may represent character skill, but it must be seeded, bounded, visible in replays, and never substitute for physics.

## Shot identity becomes an output

After contact, a classifier describes what happened:

| Label | Derived from |
| --- | --- |
| Palm | an open-hand contact button produced palm-surface contact |
| Fist | `Y / Triangle` produced contact with the closed-hand collider |
| Backhand | the back of a hand or a cross-body reverse path made contact |
| Topspin / backspin | the requested technique and actual tangential impulse produced the measured spin vector |
| Left / right english | bumper intent transferred enough lateral angular velocity |
| Lob / lift | lift modifier, high wall intention, and upward outgoing angle combined successfully |
| Kill | attack modifier, low wall contact, low post-wall trajectory, and attackable body position combined successfully |
| Roller | ball reaches the wall-floor seam with the required velocity and spin and leaves with an exceptionally low rebound |
| Slice / hook | spin vector and curved or skidding flight exceed readable thresholds |
| Fly / short hop | actual interception occurred before the bounce or immediately after it |

The classifier drives commentary, stats, training objectives, AI learning, and highlight presentation. It does not alter the already-produced trajectory.

## True 3D ball simulation

### Physical units

The simulation uses SI units:

- court width: `6.096 m`;
- wall height: `4.8768 m`;
- wall-to-long-line depth: `10.3632 m`;
- short line: `4.8768 m`;
- standard ball radius: `0.0238125 m`;
- Red label ball mass: `0.061 kg`.

Rendering scale never changes these values.

## Court-scale and perspective validation

### The current “short line feels far” issue

The 2.5D prototype's world coordinates place the short line at essentially the correct official ratio:

```text
wall → short line = 16 ft
wall → service markers = 25 ft
wall → long line = 34 ft

short-line ratio   = 16 / 34 = 47.06%
service-line ratio = 25 / 34 = 73.53%
```

The apparent excess distance comes from affine vertical compression, the elevated camera, oversized screen-space actors/ball, and the absence of real perspective cues. The fix is not to move the regulation line.

### Authoritative 3D court

Use one coordinate system:

```text
X: left/right
Y: height
Z: distance from front wall

front wall plane: Z = 0
short line:       Z = 4.8768 m
service markers:  Z = 7.6200 m
long line:        Z = 10.3632 m
wall edges:       X = ±3.0480 m
wall top:         Y = 4.8768 m
```

The visible environment also needs the official playing room beyond the painted rectangle:

- sidelines continue at least `10 ft` beyond the long line;
- open run-off exists beside both sidelines and behind the long line;
- fence, spectators, and scenery sit outside the live geometry;
- a realistic adult body is modeled in meters so the wall and court read at human scale.

### Readability without changing physics

- keep the ball's collision radius physical;
- add a subtle outline, contrast halo, or motion streak instead of enlarging the collision sphere;
- keep shoe contact on the actual floor plane;
- keep actor reach anatomical rather than compensating for camera problems;
- use floor wear, line width, fence posts, shadows, and human spectators as stable depth cues;
- let camera settings change perspective only.

### Geometry lab

Add a developer calibration view that can display:

- meter and foot grid;
- wall, short, service, and long-line labels;
- player height and reach;
- physical versus rendered ball size;
- camera position, pitch, field of view, and focal length;
- projected pixel distances for each official line.

Automated tests assert the SI positions. Screenshot tests compare Tactical, Player, and Courtside projections at fixed camera presets. Handball playtests ask separate questions about measured correctness and perceived scale; the latter tunes the camera, not the court.

### Ball state

```text
BallState
├── position: Vec3          meters
├── linearVelocity: Vec3    meters / second
├── angularVelocity: Vec3   radians / second
├── radius: number
├── mass: number
├── materialId: string
├── lastContact: ContactRecord
└── deterministicSeed: uint32
```

### Free flight

The ball solver models:

- gravity;
- speed-dependent aerodynamic drag;
- Magnus force from the full angular-velocity vector;
- bounded seam/knuckle perturbation derived from a deterministic seed;
- no hidden per-shot gravity or clock multipliers.

The existing Rhythm Lab remains useful for research, but the production `Real Court` mode runs at one real-time physics rate. Slow Study becomes an explicit training replay or slow-motion tool.

### Surface contact

Floor and wall contacts use:

- swept-sphere time of impact so the ball cannot tunnel through a plane;
- speed-dependent normal restitution;
- tangential friction that exchanges linear and angular momentum;
- material profiles calibrated from repeatable tests;
- deterministic collision ordering when wall, floor, line, or player contacts are nearly simultaneous.

The wall-floor crack is modeled as geometry or a measured narrow material transition. The engine never asks whether the input was called `roller`.

### Fixed stepping

The first lab should run:

- player, rules, and input commands at `120 Hz`;
- the ball/contact solver at `240 Hz` or with exact swept time of impact;
- rendering at display rate using interpolation between immutable simulation snapshots.

The final rate is chosen from tunneling, accuracy, and performance measurements. It is not chosen because `120` or `240` sounds realistic.

## Engine decision

### Recommendation

Use:

- [Three.js](https://threejs.org/) for real perspective rendering, cameras, lighting, glTF characters, and animation playback;
- a small custom `BallisticsCore` for the one ball, wall, floor, crack, hand impulse, drag, and Magnus response;
- [Rapier](https://rapier.rs/docs/) only if its collision queries or character/world colliders save measurable work.

Rapier's JavaScript/WASM build documents cross-platform determinism, continuous collision detection for fast objects, and contact modification. It is the right general-purpose engine to benchmark. It should not automatically own the ball just because it is available.

The core one-wall problem is one sphere interacting with a few planes and a kinematic hand. A focused analytical solver gives us:

- exact sport-specific telemetry;
- direct control over spin transfer and material calibration;
- a small deterministic state for replays and networking;
- no rigid-body solver fighting the authored swing;
- easier golden-trajectory tests.

### One-week engine bake-off

Build the same headless physics lab twice:

| Trial | Responsibility |
| --- | --- |
| Custom BallisticsCore | analytical free flight, swept planes, restitution, friction, spin |
| Rapier ball | dynamic sphere, CCD, wall/floor colliders, contact hooks |

Use identical initial states and compare:

- USHA drop-test rebound;
- direct wall rebound;
- low wall-floor seam contact;
- high-speed tunneling;
- top, back, and side spin;
- repeatability over `10,000` steps;
- Chrome, Firefox, and Safari behavior;
- CPU time and bundle cost;
- ease of explaining every output quantity.

If Rapier matches the calibration targets and requires less custom correction, use it. If both need custom post-contact overrides, keep the custom solver and use Rapier only for characters and environment queries.

### Why not choose a full engine yet

[Godot 4](https://docs.godotengine.org/en/stable/tutorials/physics/using_jolt_physics.html) now uses Jolt as the default 3D physics engine and has strong animation/editor tooling. It remains a serious native-production option. Moving the project now would also move the rendering, UI, deployment, input, test, and contributor workflow at once. Godot's web path uses WebAssembly and its current documentation still lists web-platform constraints.

The control and ball experiments are the risky product work. Run them in the existing shareable browser project first. Re-evaluate Three.js versus Godot only after the graybox produces an expert-approved rally. The deterministic simulation contract should be portable to either renderer.

Direct Jolt WASM, Unity, Unreal, and a custom full-body physics engine are not part of the first slice.

## Architecture

```text
Raw device sample
      │
      ▼
Input mapper ────────────── accessibility / assist profile
      │
      ▼
timestamped PlayerCommand
      │
      ▼
┌────────────────── deterministic simulation boundary ──────────────────┐
│                                                                       │
│  Actor motor → preparation state → kinematic hand path                │
│       │                  │                    │                        │
│       └──────────┬───────┴──────────┬─────────┘                        │
│                  ▼                  ▼                                  │
│             contact solver ←── BallisticsCore                          │
│                  │                  │                                  │
│                  └──────────┬───────┘                                  │
│                             ▼                                          │
│                     rules / score / hinder                             │
│                             │                                          │
│                             ▼                                          │
│                 immutable SimulationSnapshot                           │
└─────────────────────────────┬─────────────────────────────────────────┘
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
          Three.js render   audio/haptics   replay/telemetry
```

The renderer never decides contact, bounce, fault, hinder, or point results.

### Proposed module boundary

```text
src/
├── sim/
│   ├── court
│   ├── ballistics
│   ├── contact
│   ├── actor-motor
│   ├── rules
│   ├── ai
│   ├── replay
│   └── types
├── input/
│   ├── commands
│   ├── gamepad
│   ├── keyboard-mouse
│   └── assists
├── render/
│   ├── scene
│   ├── actors
│   ├── animation
│   ├── cameras
│   └── feedback
├── labs/
│   ├── ball
│   ├── contact
│   └── controls
└── app/
    ├── match
    ├── training
    └── ui
```

Do not split every item into a class. Start with explicit functions and serializable data. The boundary matters more than the file count.

## Character motion and animation

The simulation owns the feet and contact. Animation represents that state.

### First graybox rig

Use:

- locomotion blend tree for forward, backward, lateral, and plant;
- one preparation layer per viable side;
- open-hand and fist contact poses;
- procedural torso aim;
- inverse kinematics for the striking hand and planted feet;
- bounded reach and body-avoidance constraints;
- follow-through chosen from the actual outgoing impulse.

The ball never snaps to an animation event. The animation event opens the hand collider, while actual swept collision decides whether contact occurs.

### Later capture

Record experienced players performing:

- neutral palm returns at several heights;
- cross-body and back-of-hand returns;
- low kills;
- lifts and deep passes;
- fist contacts;
- fly and short-hop contacts;
- step-in and emergency running returns;
- legal clear/Set behavior after contact.

Motion capture improves authenticity after the control timings are stable. It should not be used to hide an unresponsive simulation.

## Camera

The main competitive camera is a real perspective camera behind and above the receiver:

- the entire live wall stays visible;
- the first bounce and both bodies stay readable;
- focal length and height are fixed during a rally;
- small lateral tracking preserves the player's striking hand;
- camera collision and occlusion prevent fences, spectators, or players from hiding the ball.

Allow:

- `Tactical`: wider, higher, stable;
- `Player`: default tennis-style depth;
- `Courtside`: optional lower view for skilled players and highlights.

Zoom changes focal length or camera distance within tested bounds. It never changes simulation speed, reach, or aim sensitivity. Dramatic close-ups belong between points and in replays.

## AI that plays rather than cheats

Computer opponents use the same command and contact pipeline as the player.

They receive a perception snapshot, not private future truth:

- visible ball state with reaction delay and skill-based observation error;
- opponent body orientation, hand preparation, foot plant, and knee bend;
- remembered tendencies;
- bounded trajectory prediction based on their skill;
- the same reach, plant, hand path, and collision rules.

Difficulty changes:

- how early the AI recognizes the trajectory;
- how accurately it predicts the first bounce;
- how well it chooses recovery position;
- how much safety margin it uses;
- how quickly it recognizes repeated patterns;
- how consistently it executes a chosen hand path.

Difficulty never changes gravity, wall restitution, player input latency, or the meaning of a contact.

## Feedback without turning the game into a meter

### During normal play

Use:

- hand and foot animation;
- a subtle wall target that can be disabled;
- ball trail that communicates spin without drawing a predicted path;
- distinct open-hand, fist, wall, floor, and crack sound layers;
- short asymmetric rumble at hand contact and wall impact;
- readable opponent preparation.

### After a miss

Show one cause, not five grades:

- `JAMMED`;
- `LATE HAND`;
- `REACHED`;
- `OPENED EARLY`;
- `MISSED WALL`;
- `TOO MUCH BRUSH`;
- `SECOND BOUNCE`.

A replay inspector may expose exact quantities:

- hand-ball separation at closest approach;
- contact point and normal;
- wall target error;
- linear and angular ball velocity;
- step direction and balance;
- input-to-contact timeline.

This tool is for training and tuning, not the default match HUD.

## Collaboration and playtest program

No current control has champion approval. Published instruction and community comments generate hypotheses only.

### Three cohorts

Recruit:

1. **Handball cohort, 8 people**
   - active elite singles;
   - doubles specialist;
   - women's open player;
   - veteran/coach;
   - referee;
   - intermediate park regular;
   - newer player.
2. **Sports-game cohort, 8 people**
   - players familiar with Virtua Tennis, Top Spin, Tennis Elbow, Full Ace, fighting games, and analog sports controls;
   - a mix of competitive and casual players.
3. **Crossover cohort, 4–6 people**
   - people who play one-wall handball and serious sports games.

The crossover group is valuable but does not overrule the others. A handball expert can identify an impossible stroke; a game expert can identify an unreadable control; only repeated evidence tells us whether the solution works.

### Co-design session

Before testing polished art, run a 60-minute workshop around physical actions:

- ask handball players to demonstrate how they change wall height, angle, pace, spin, and hand surface;
- ask gamers to map each physical distinction onto the smallest possible input set;
- prototype mappings with a paper controller diagram;
- force-rank which distinctions must be manual, contextual, or inferred;
- document disagreements without averaging them away.

### A/B control lab

Every participant tries:

- two face-button layouts for palm, topspin, backspin, and fist;
- two bumper/trigger layouts for side english, lift, and attack;
- broad versus narrow hold-to-power plateaus;
- single-button beginner play before advanced chords are explained;
- automatic hand selection with and without a manual override;
- three assist levels using the same physics.

Order is counterbalanced so the first mapping does not gain an unfair familiarity advantage.

The interface is part of every experiment. Each mapping is tested with:

- first-use in-world hints;
- controller-map overlay only;
- no hints after training.

This separates a bad control from a good control that was explained badly.

### Session structure

1. **Cold start, 3 minutes:** only “move, point, hold `A`, release.”
2. **Target ladder, 8 minutes:** center, left, right, high, low, then alternating.
3. **Contact ladder, 8 minutes:** set, moving, jammed, fly, bounce, short hop.
4. **Spin exploration, 6 minutes:** no move list; ask what the player thinks the stick is doing.
5. **Short match, 8 minutes:** one AI tier matched to experience.
6. **Replay interview, 7 minutes:** compare intended result with recorded physical cause.

Use the existing [champion playtest protocol](champion-playtest-protocol.md) for recruitment ethics, names, quotes, compensation, and evidence discipline.

## Measurements and decision gates

### Control comprehension

- at least `80%` of new players produce a legal serve and three-return rally within `90 seconds`;
- at least `70%` intentionally alternate left and right wall thirds within `10 minutes`;
- at least `70%` can explain one way to hit higher, lower, and with more side spin without reading a move list;
- fewer than `15%` report that the left stick's meaning changed unexpectedly.
- at least `80%` correctly identify the four contact glyphs after playing, without reopening the controller map;
- at least `75%` can distinguish what the wall reticle requested from what the physical contact produced.

### Accuracy and agency

- record intended wall point before contact and actual wall point after contact;
- report median and 90th-percentile wall error in centimeters;
- separate aim error, contact error, and physics variance;
- identical command streams and seeds reproduce the same rally within the selected determinism tolerance;
- no unseeded randomness changes a competitive result.

### Handball authenticity

Experienced players rate separately:

- flight to wall;
- wall rebound;
- floor rebound;
- spin/skid;
- contact height;
- body spacing;
- step-in transfer;
- emergency reach;
- fly and short-hop timing;
- camera readability.

Change a default only after at least three experienced players reproduce the same mismatch from the same calibration build.

### Game quality

- players can identify why they missed before the replay explanation at least `75%` of the time;
- the safe neutral return remains useful but attackable;
- aggressive low attempts fail because of setup or execution, not arbitrary chance;
- higher AI tiers feel earlier and smarter, not faster than the laws of the game;
- at least half of participants voluntarily choose an immediate rematch after the first full match.

Thresholds are starting hypotheses. The first two rounds may revise them, but revisions must be documented before looking at the next result set.

## Automated test strategy

### Ballistics unit tests

- official drop-test rebound across allowed input ranges;
- energy never increases without a hand impulse;
- direct wall impact reflects the correct normal component;
- spin changes the correct tangential component and rebound direction;
- high-speed ball cannot tunnel through wall or floor;
- wall-floor seam outcomes remain bounded;
- zero spin produces no Magnus force;
- seeded knuckle paths reproduce;
- simultaneous-contact ordering reproduces;
- frame/render rate does not change a trajectory.

### Contact tests

- no overlap means no hit;
- swept hand-ball intersection hits even when neither end-frame overlaps;
- open hand and fist produce different, calibrated responses;
- off-center contact produces the expected spin sign;
- step toward target contributes more useful impulse than a lateral reach;
- body penetration and impossible cross-body reach are rejected;
- a swing-and-miss may be followed by another legal attempt before bounce two.

### Rules integration tests

- serve receiving-plane restrictions;
- fly, one-bounce, and second-bounce cases;
- floor-before-wall down;
- side and top wall outs;
- side-out and server-only scoring;
- still versus moving hinder;
- future doubles partner contact and shared access.

### Replay tests

- serialize initial state, command stream, seed, and version;
- replay produces the expected event sequence and final score;
- incompatible physics versions fail visibly rather than silently drifting;
- a replay can render without influencing simulation decisions.

### Browser and performance tests

- Chrome, Firefox, and Safari controller sampling;
- 30, 60, 120, and variable render rates;
- suspend/resume, lost focus, disconnected controller, and input remap;
- simulation budget below `2 ms` at p95 on the agreed midrange test device;
- stable `60 fps` presentation at the standard visual preset;
- contact-to-sound and contact-to-rumble feedback in the same rendered frame where supported.

## Failure modes

| Failure | What the player feels | Prevention |
| --- | --- | --- |
| Physics engine owns the feel | technically plausible but dead or uncontrollable rebounds | calibrated trajectory suite and custom contact layer |
| Too much aim assistance | every return feels magnetized | bounded assist cone, expert off mode, replayed assist contribution |
| Too little assistance | player fights anatomy instead of making decisions | automatic facing/hand choice inside strict reach limits |
| Modifier chord is unclear | the player remembers buttons but cannot predict their combination | stable responsibilities, detected glyphs, in-world pose and arrow feedback |
| Timing meter becomes the game | eyes leave the ball | pose/audio/haptics first; meter only in training |
| Animation hits without collision | input feels canned | swept hand collider is authoritative |
| Collision happens without matching pose | game feels cheap or unfair | inverse kinematics and snapshot-synchronized animation |
| Spin adds energy | impossible accelerating bounces | energy/property tests and bounded contact impulses |
| AI knows the future | harder rivals feel dishonest | delayed noisy perception and same command pipeline |
| Tuning fragments by mode | no shared definition of realistic | one production physics profile; assists change information and tolerance |
| Engine migration stalls the game | months of tooling work before one better rally | browser graybox first; engine gate after expert-approved contact |

## Staged build

### Stage 0: Preserve and instrument

- tag the current 2.5D build as the comparison baseline;
- extract replayable `PlayerCommand` and `SimulationSnapshot` shapes;
- add a seeded random source and remove competitive uses of `Math.random`;
- record current rhythm, target, contact, and result data;
- create the 3D lab behind a separate route or build entry.

**Exit:** the existing game still works and one recorded rally can be inspected as commands plus events.

### Stage 1: Headless Ball Lab

- implement SI-unit court and ball state;
- build custom and Rapier trials;
- add drop, wall, floor, spin, seam, and tunneling tests;
- provide sliders only for physical coefficients;
- add the official-dimension geometry lab and fixed camera calibration markers;
- choose the ball solver from measurements.

**Exit:** tests reproduce the official court and drop measurements, trajectories replay, camera presets preserve the correct geometry, and no high-speed test tunnels.

### Stage 2: Hand and Control Lab

- add one player capsule, two kinematic hands, and graybox animation;
- implement move, wall intention, prepare/release, fist, automatic hand choice, and bounded assist;
- classify shots after contact;
- implement detected-controller glyphs, in-world intent hints, progressive disclosure, and one-cause miss feedback;
- implement input and contact replay visualization;
- run the A/B control study.

**Exit:** control-comprehension and intentional-target gates pass with gray boxes.

### Stage 3: One Real Rally

- add receiver AI using perception snapshots;
- port serve, rally, bounce, score, and basic hinder rules;
- add Tactical and Player cameras;
- add honest miss callouts, sound, haptics, and one training feed;
- run the first handball/gamer/crossover sessions.

**Exit:** at least four experienced one-wall players complete the same build and the repeated physics mismatches are documented.

### Stage 4: Animation and Court Character

- replace graybox motion with the first authored or captured handball set;
- add hand and foot inverse kinematics;
- render one regulation West 4th-inspired court;
- restore the comic/pixel-art identity through textures, shaders, UI, and impact frames rather than flattening the simulation;
- tune occlusion, lighting, ball readability, and camera comfort.

**Exit:** animation and physics agree at contact, the ball stays readable, and the visual pass does not change replay results.

### Stage 5: Single-Player Proof

- add three perception-based opponents;
- build a short Wall School path for movement, wall intention, preparation, contact families, and modifiers;
- add opt-in telemetry and automatic replay capture for disputed results;
- run two tuning rounds with all three cohorts.

**Exit:** first-match comprehension, rematch, authenticity, and AI-fairness gates pass.

Only then should the project resume the neighborhood ladder, additional courts, deeper character content, local multiplayer, doubles, and online work.

## Parallel work

After Stage 0 establishes interfaces:

```text
Lane A: ball calibration → contact solver → replay golden tests
Lane B: Three.js court → camera → ball readability
Lane C: controller sampler → command mapper → input diagnostics
Lane D: recruitment → session materials → calibration footage

Merge A + C for the Control Lab.
Merge B after simulation snapshots are stable.
Begin animation production only after the first control mapping wins.
```

The ball/contact and input lanes must share versioned command types. Visual work must never write into simulation state.

## Not in the first 3D slice

- career economy or neighborhood progression;
- additional venues;
- final avatar creator in 3D;
- doubles;
- online multiplayer or rollback implementation;
- purchasable or redeemable stakes;
- motion controls;
- a large motion-capture library;
- material differences between venues;
- full mobile/touch parity;
- engine migration to Godot, Unity, or Unreal.

These remain valid product goals. None should delay proving that tennis-style contact buttons, two sticks, and real collision can make one rally feel like handball.

## Immediate implementation tasks

1. Write serializable `PlayerCommand`, `BallState`, `ContactRecord`, and `SimulationSnapshot` contracts.
2. Replace unseeded competitive randomness in the current prototype so baseline replays are trustworthy.
3. Add a separate Three.js Ball Lab entry without replacing the shipped game.
4. Encode the official ball and court measurements in SI units.
5. Implement the custom swept-sphere solver and its golden tests.
6. Implement the matching Rapier trial and run the bake-off.
7. Build the graybox hand collider and shared hold-to-prepare/release-to-swing path.
8. Prototype the contact-button and bumper/trigger layouts behind experiment flags.
9. Build the progressive in-world control hint and detected-glyph system.
10. Add the intention-versus-result replay inspector.
11. Recruit the three playtest cohorts and run the first counterbalanced control session.

The first playable milestone is not “seven scripted 3D shots.” It is a family of honest returns whose paths can be explained from the player's feet, chosen technique, hold time, modifiers, hand collision, and the ball's physical state.
