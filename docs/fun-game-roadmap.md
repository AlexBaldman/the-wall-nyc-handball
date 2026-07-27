# Fun Game Roadmap

This is the sharper "make it really fun" roadmap for the standalone handball project after the first working prototype.

## North Star

Build a one-wall handball game that feels:

- quick to pick up in the first 30 seconds
- expressive enough that good shot choices feel stylish
- grounded in NYC court energy instead of generic sports-game polish
- sticky enough that "one more match" happens by itself

## Shipped vertical-slice baseline

The current browser build now covers the original immediate priorities:

- deterministic ball integration, spin, skid, knuckle flutter, crack response, and bounce prediction
- analog footwork, body balance, shot-specific preparation, control-versus-power risk, and buffered contacts
- palm, slice, fist, backhand, lob, kill, and roller identities
- readable foul, block, contact, crack, and winner calls with hit-stop, sound, particles, and rumble
- three named rivals with different feet, reads, recovery, shot choices, and match-memory adaptation
- official court geometry, server-only scoring, side outs, faults, and movement-created avoidable blocks
- Broadcast, Follow, and Courtside cameras across three atmosphere presets
- a default Player camera, independent camera-depth tuning, and a larger court presentation
- four Wall School drills, My Player customization, match intros, poses, and post-match statistics
- keyboard, touch, and standard gamepad support
- a device-saved Rhythm Lab with independent master, ball, footwork, read-window, and camera-depth clocks
- an optional Read stance plus a controlled step-in reward based on real one-wall preparation cues

## Immediate priorities

### 1. Tune from real play sessions

- capture rally length, contact type, miss reason, shot selection, and difficulty outcomes in a local opt-in playtest log
- tune movement traction, reach, timing windows, and AI error bands from recorded sessions rather than intuition alone
- establish target rally distributions for rookie, intermediate, and expert opponents

### 2. Build the single-player ladder

- connect the implemented rivals and courts through a neighborhood progression
- give every rival a preferred serve, recovery tell, exploitable weakness, intro, and reward
- unlock the next court by beating its regular
- preserve a one-input rematch path
- expand Wall School into tiered lessons that teach the same systems used in matches

### 3. Deepen point presentation

- add a short replay snapshot for exceptional crack, fly, and long-rally winners
- add selectable entrances, celebrations, and respectful court emotes
- layer location-specific crowd and park ambience beneath the synthesized impact audio

### 4. Prepare local competition

- extract input commands and simulation snapshots from the renderer
- add local singles before networking
- reuse the same actor/team model for later doubles
- validate block, partner-hit, and shared-access rules before online work

## Next Feature Pass

### Gameplay

- optional win-by-two mode
- stamina or pressure meter only if playtests show long-rally decisions need another readable layer
- deeper opponent-specific serves and return patterns

### Juice

- crowd / park ambience
- location-specific sneaker and wall material variations
- optional replay freeze on elite winners

### Presentation

- career map and neighborhood challenge cards
- unlockable venue-specific My Player drops
- accessibility settings for assist visibility, shake, flash, audio layers, and input remapping

## Good Short-Term Build Order

1. Add opt-in local playtest telemetry around the shipped Rhythm Lab and tuning readout.
2. Add the first three-match neighborhood ladder.
3. Expand Wall School into beginner and advanced tiers.
4. Add local versus on the shared deterministic rules core.
5. Add optional win-by-two and longer match formats.
6. Begin the online-ready input/state architecture for singles and doubles.

## Dream Version

Once the prototype really sings, the bigger version should aim for:

- local versus
- career ladder through neighborhood courts
- unlockable court atmospheres and opponents
- replay moments and highlight clips
- a bold, stylish arcade-sim identity instead of sterile realism

## Multiplayer-Compatible Architecture

Do not add online complexity until the solo rally is excellent, but keep these seams clean now:

- simulation state owns court, ball, rules, teams, server, and score
- input produces small timestamped commands instead of mutating the renderer
- actors carry a `teamId`, `controllerId`, and court position independently
- the renderer reads snapshots and never decides who won a rally
- a future authoritative server validates serves, contacts, bounces, score, and reconnects
- singles is one actor per team; doubles is two actors per team using the same rally state
- start online with private friend rooms, then add matchmaking and spectator/replay support

## Stakes and Street-Pot Track

Prototype the social ritual before real money:

- selectable play-money pots such as `5`, `20`, and `50` street tokens
- winner screen, rematch/double-or-nothing language, and match history
- no purchase, cash value, redemption, or transfer in the prototype

Purchasable or redeemable stakes are a separate regulated product gate. It would require a jurisdiction-by-jurisdiction legal model, age and identity checks, geolocation, payments and custody design, anti-fraud controls, responsible-gaming tools, tax/reporting analysis, and platform-policy review before implementation.

## Research and expert-feedback discipline

- Footage and published instruction create hypotheses; they do not count as player endorsement.
- Champion names, quotes, or approval language never enter marketing or the game without explicit permission.
- Every expert test records the build version, controller, camera, Rhythm Lab code, experience level, and exact scenario.
- Conflicting feedback is preserved by cohort rather than averaged into one vague “more realistic” request.
- The [champion playtest protocol](champion-playtest-protocol.md) is the operating plan for recruitment, interviews, instrumented sessions, and design decisions.
