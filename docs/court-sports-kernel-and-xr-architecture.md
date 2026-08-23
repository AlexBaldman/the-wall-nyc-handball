# Court Sports Kernel and XR Architecture

## Purpose

The Wall is the first proving ground for a reusable court-sports simulation kernel. Pickleball is the intended second consumer. Future consumers may include racquetball, squash, table tennis, tennis, jai alai, training tools, physics visualizations, VR games, AR coaching, and other physical-world simulations.

The priority remains simple: make handball feel excellent. Reuse is valuable only when it preserves or improves that experience.

This document defines the long-term boundaries that let one physical simulation support multiple sports and multiple embodiments without prematurely extracting a giant universal engine.

## Core rule

The competitive simulation should not care whether a human expressed an intention through:

- keyboard and mouse;
- gamepad;
- touch;
- tracked VR controllers;
- optical hand tracking;
- AR spatial interaction;
- AI;
- replay;
- network commands.

Devices translate input into semantic commands and intents. The simulation consumes those contracts and produces deterministic state and events.

```text
input device / AI / replay
          ↓
semantic command + strike intent
          ↓
sport-specific embodiment / strike model
          ↓
physical striker state
          ↓
court-sports simulation kernel
          ↓
physics events
          ↓
sport rules + outcome interpretation
          ↓
simulation snapshot
          ↓
2D / 3D / VR / AR / replay / spectator / analytics
```

## XR-ready by default

XR readiness is a boundary discipline, not a requirement to implement headset features immediately.

New simulation work should preserve these properties:

1. **Canonical SI units and 3D world coordinates.** Physical dimensions remain meaningful outside one renderer.
2. **Headless deterministic truth.** Rendering, headset state, UI, audio, and input hardware do not decide competitive outcomes.
3. **Semantic commands.** Devices express movement, aim, preparation, strike, grab, release, and other intentions through stable contracts.
4. **Portable actors and objects.** Identity and world state are independent from sprites, meshes, tracked bodies, or AR overlays.
5. **Observer separation.** Desktop cameras, spectator cameras, VR head pose, AR viewpoints, and replay cameras observe the same world rather than owning it.
6. **Physical environment data.** Floors, walls, nets, seams, targets, and boundaries are world geometry and surface definitions, not renderer conditionals.
7. **Prediction and telemetry as reusable services.** Trajectories, intercept windows, forces, spin, and collision data can feed gameplay, AI, coaching, AR overlays, education, and replay.
8. **Platform-specific XR code stays at the edge.** WebXR, OpenXR, visionOS/RealityKit, or future platform adapters should translate to shared simulation contracts rather than infecting sport rules.

## Embodiment

Treat embodiment as a first-class adapter around an actor rather than as the actor's identity.

Conceptually:

```text
Actor
  identity
  physical body
  capabilities
  locomotion state
  effectors / strikers
  semantic state

Embodiment
  desktop avatar
  touch avatar
  gamepad avatar
  VR tracked body
  AR real person
  AI controller
  replay ghost
```

The same actor can therefore have different visual and input embodiments without changing the sport's canonical rules or ball physics.

## Court Sports Kernel

The shared kernel should own only genuinely reusable physical and deterministic primitives:

- vector and geometry math;
- ball integration;
- aerodynamic models;
- swept collision queries;
- surface response;
- moving striker/object contact;
- deterministic event records;
- trajectory prediction;
- seeded randomness where competitive randomness is required;
- serializable command/contact/snapshot/replay contracts.

The kernel should not own:

- handball scoring;
- pickleball kitchen rules;
- named handball shots;
- named pickleball shots;
- sport-specific controller labels;
- renderer state;
- platform APIs;
- avatar art;
- career progression.

## Sport packs

Each sport supplies explicit profiles and interpretation around the shared kernel.

```text
SportPack
  id
  ball profile(s)
  world / court profile(s)
  surface profile(s)
  strike model(s)
  movement policy / sport locomotion semantics
  rules
  outcome classifier
  training definitions
```

The Wall becomes the first explicit sport pack:

```text
american-handball-one-wall
  USHA ball profile
  regulation one-wall world
  concrete / wall / crack surfaces
  hand strike model
  handball rules
  handball contact classifier
```

Pickleball becomes the second real consumer rather than a speculative abstraction test:

```text
pickleball
  indoor / outdoor ball profiles
  regulation court + net
  court / net surface profiles
  paddle strike model
  pickleball rules
  pickleball outcome classifier
```

## Ball profiles

Ball physical properties must be data supplied to the simulator rather than global assumptions.

A ball profile may include:

```text
identity
mass
radius / diameter
inertia model
aerodynamic model
  drag
  lift / Magnus behavior
  angular drag
validation fixtures
  official drop test
  measured trajectory cases
```

Handball and pickleball should use the same integration machinery while supplying meaningfully different physical profiles.

## Surface profiles

Collision geometry identifies a surface. The surface supplies material response.

A surface profile may include:

```text
restitution
friction
spin / grip response
special response model when justified by measurements
```

The handball wall/floor crack should be represented as a physical seam or special court surface, not as a hardcoded assumption inside generic ballistics. The same mechanism can later represent net tape, seams, glass, curbs, or unusual street-court features.

## Strikers and contact

Promote the current moving-hand collision into a generalized moving-striker concept without weakening the handball model.

A striker can carry:

```text
pose
previous pose
linear velocity
angular velocity
collision geometry
surface/material response
contact orientation
effector identity
```

Sport-specific strike models create physical striker motion from semantic player intent.

Examples:

- `HandStrikeModel`
- `PaddleStrikeModel`
- future racquet, table-tennis paddle, bat, club, or cesta models

The ball simulator receives physical contact. It does not need to know which button, controller, or tracked hand produced it.

## Intent before outcome

Player controls describe what the player attempts.

For The Wall, the existing principle remains canonical:

```text
move into position
prepare a contact family
express wall intention
optionally modify spin / lift / drive
release into a physical swing
```

Named outcomes such as kill, roller, hook, lob, or knuckle drive are derived after contact whenever possible. They remain useful for coaching, statistics, AI, commentary, and training without becoming guaranteed scripted trajectories.

This same pattern should guide pickleball: the player expresses stroke and placement intent; physical contact and context determine the resulting drive, dink, drop, lob, volley, or error.

## Contact metrics and sport interpretation

Separate universal measurements from sport vocabulary.

```text
ContactRecord
      ↓
deriveContactMetrics
      ↓
pace / spin / spacing / preparation / contact height / body relation
      ↓
SportOutcomeClassifier
```

The same physical metrics may therefore be interpreted differently by handball, pickleball, training tools, or biomechanical visualizations.

## World events and rules

The kernel emits neutral events such as:

```text
surface-contact
striker-contact
boundary-crossing
object-state-change
```

Sport rules decide what those events mean.

Handball may interpret a floor contact before the front wall as a down. Pickleball may interpret court contacts through serve, two-bounce, and rally rules. Physics should not contain either judgment.

## Actors, teams, and snapshots

The current single-player/single-opponent snapshot is a useful first contract. Future schema versions should be capable of representing collections of actors and effectors so doubles, local multiplayer, networking, XR bodies, spectators, and replay ghosts do not require a second world model.

Migrate through explicit schema versioning. Existing replay compatibility is an asset, not debris.

## Shared prediction

Trajectory prediction and reachable-intercept prediction are strategic shared primitives.

Potential consumers include:

- human assist and accessibility;
- AI perception and planning;
- animation selection;
- footwork coaching;
- VR/AR target visualization;
- replay analysis;
- physics education;
- spectator graphics.

Prediction must consume the same physical models as the live simulation whenever practical so assistance does not teach a fictional version of the sport.

## Sports Physics Lab

The existing 3D Ball Lab / Street Match should evolve into the shared calibration and comparison environment rather than be replaced.

Long-term selectable dimensions can include:

```text
sport
ball profile
court/world profile
surface profile
striker profile
solver coefficients
camera / embodiment
calibration scenario
```

It should support drop tests, feeds, serves, controlled impacts, slow motion, replay, trajectory traces, vectors, contact diagnostics, and sport-specific validation fixtures.

The first multi-sport proof should be deliberately tiny: use the same kernel to produce a recognizable handball rally and a recognizable pickleball rally before building pickleball product features.

## Extraction sequence

1. Freeze current handball behavior with golden physics, replay, contact, and rule tests.
2. Split handball ball/court/material definitions from generic simulation code.
3. Inject ball, environment, and surface profiles into the BallisticsCore.
4. Replace hardcoded floor/wall material branching with surface-driven response.
5. Represent the handball crack through world geometry/surface semantics.
6. Generalize moving hand contact into a striker contract while keeping `HandStrikeModel` behavior unchanged.
7. Split universal contact metrics from handball outcome classification.
8. Move handball scoring/serve rules into the handball sport module.
9. Make The Wall run as the first explicit `SportPack` with zero intentional gameplay change.
10. Add a minimal pickleball physics spike as consumer number two.
11. Extract a separately versioned shared package only after real duplication or reuse justifies it.

## Anti-overengineering guardrails

- Handball remains the product priority.
- No abstraction is valuable merely because it has a generic name.
- Prefer adapters and data profiles over inheritance hierarchies.
- Do not move a concept into shared infrastructure until its ownership is clear.
- A second real consumer is stronger evidence than a hypothetical future diagram.
- Preserve deterministic tests before structural refactors.
- XR readiness means clean contracts, not immediate headset scope.
- Rendering technology must remain replaceable.
- Sport-specific physical truth must not be flattened into lowest-common-denominator physics.

## Long-term opportunity

The shared sports work can grow beyond games into a reusable physical-world simulation platform supporting entertainment, training, education, replay analysis, coaching, visualization, AR overlays, VR embodiment, mixed reality, and future interaction hardware.

The Wall should help us discover that platform by becoming an excellent handball game first.
