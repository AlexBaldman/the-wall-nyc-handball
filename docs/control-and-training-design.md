# Control and Training Design

## What the strongest tennis games teach

[TopSpin 2K25's official manual](https://cdn.2k.com/topspin/topspin-2k25/manuals/ps5/TopSpin2K25_Online_Manual_%28English%29_PS5_%28For_SG.HK%29.pdf) separates shot selection, directional aiming, timing, and power. A tap favors control; committed power increases pressure and unforced-error risk. Flat, topspin, and slice are separate inputs instead of cosmetic ball trails.

[Tennis Elbow 4's official documentation](https://www.managames.com/tennis/doc/Tennis_Elbow-Tennis_Game.html) makes positioning a first-class accuracy variable. Aggressive contacts become unreliable when the player is late or poorly aligned.

The [Virtua Tennis 3 manual](https://www.gamesdatabase.org/Media/SYSTEM/Sony_PSP/manual/Formated/Virtua_Tennis_3_-_Sega.pdf) combines an academy with playful skill games. Bulls Eye teaches aim, Pin Crusher teaches serve power and moderation, Avalanche teaches footwork, and Alien Attack teaches accurate power returns. The lesson is not to copy tennis props; it is to make isolated skills playful, legible, and progressively harder.

## Handball contact vocabulary

| Contact | Primary behavior | Match purpose |
| --- | --- | --- |
| Palm / topspin | Stable aim, dip at wall, high floor rebound | Default pressure and margin |
| Slice / backspin | More side english, float to wall, low carrying skid | Change timing and pull a rival wide |
| Fist / knuckle | Highest raw pace, almost no spin, larger aim error | Jam the body or overpower a weak return |
| Backhand | Fast preparation, strong reverse angle | Redirect when the ball crosses the body |
| Kill | Low wall target, fast first bounce, reduced rebound | Attack a short or early ball |
| Roller | Crack-level target, extremely low rebound, severe miss risk | Clean-contact winner |
| Lob | High wall target, slower pace, high rebound | Recover court position |

Contact quality still matters. A reach, early contact, or late contact changes pace, height, and aim error before the selected profile is applied.

## Contact is a three-part read

The tennis references point toward a useful foundation, but one-wall handball needs a different center of gravity. The implemented contact model combines three simultaneous skills:

1. **Preparation** — tap for a lower-pace control touch or hold and release in the clean-power window. Each hand contact now has its own preparation rhythm: backhands come together quickly, rollers demand the narrowest late load, and lobs have a forgiving lift window.
2. **Body balance** — speed, lateral spacing, and whether the ball jams the body change both placement error and transferred pace. Backhands have their own ideal contact side.
3. **Interception** — taking the ball on the fly, at the apex, off a short hop, or late after the bounce produces meaningfully different speed, height, and risk.

That makes the green timing window an ingredient instead of an automatic winner. A perfectly charged swing from bad spacing is still compromised; balanced feet and a good read can turn a difficult short hop into an attacking contact.

The HUD exposes this without stopping play: the load meter reports body balance and current intercept type, while a trajectory marker forecasts the live bounce. A second wall-space reticle previews intended height and placement; its spray window expands with bad spacing, late preparation, risky shot profiles, and extreme angles. The bounce marker is strongest in Wall School and on Easy, then fades as opponent difficulty rises.

## Handball-specific physics layer

- Ball integration runs at a fixed 120 Hz, keeping wall, floor, spin, and drag behavior stable across display refresh rates.
- Air resistance is time-based rather than frame-based; lateral english applies continuous curve before losing energy at the wall.
- Fist contacts receive a seeded knuckle flutter. The wobble remains deterministic after contact and is mirrored by the predictor instead of being random noise added every frame.
- A lightweight forward simulation predicts the first live bounce. The renderer uses it for court-reading assistance, and computer rivals blend it into their movement according to skill.
- A clean, loaded kill or roller that reaches the bottom 13 simulation units of the wall can catch the crack. The rebound loses forward and vertical energy instead of behaving like an ordinary low wall hit.
- Fly and short-hop contacts are not alternate animations: they feed different pace, height, and placement modifiers into the same shot profiles and rules engine.

## Unified input command

Keyboard, touch, and gamepad ultimately select the same shot key and invoke the same swing buffer. This keeps the simulation independent from the controller and leaves a clean route toward deterministic online input messages.

### Standard gamepad

- Left stick: variable player movement.
- Right stick X: wall placement and side english.
- Right stick Y: wall contact height.
- Face buttons: palm, slice, fist, and backhand.
- Left bumper: lob.
- Right bumper: kill.
- Left trigger: power modifier.
- Right trigger: roller.
- View/Share: camera cycle.

The browser Gamepad API is polled once per animation frame. Pressing a contact button begins preparation and releasing it commits the swing. The clean-power window changes by contact: a backhand prepares faster than a fist, while a roller needs a later, narrower load. Early release is the accurate control option; clean power adds pace, and wide aiming compounds risk as commitment rises. Stick values use a deadzone and now preserve analog magnitude through the movement system instead of being normalized back to full speed. Hard reversals temporarily reduce footwork balance and can trigger synthesized sneaker squeak plus subtle rumble. Rumble is optional and feature-detected.

## Rival match memory

Computer opponents track the player’s non-serve contact mix during the current match. The behavior is intentionally readable rather than omniscient:

- repeated kills and rollers invite more defensive lobs and safe palms;
- repeated lobs invite more fist pressure and kill attempts;
- palm-heavy patterns invite slice and reverse-angle backhand counters.

Rookie Rae barely adapts, Wall Ghost makes meaningful adjustments, and King Shade responds aggressively. Memory resets with the match so difficulty remains a court personality rather than permanent hidden punishment.

## Legal position and block calls

The [official USHA one-wall rules](https://www.ushandball.org/learn-handball/one-wall-rulebook/) distinguish a player who remains perfectly still from one who creates interference by moving into the returning player. The game now exposes that distinction as an intentional off-ball control:

- hold `E`, touch `Set · Hold`, or click `L3` after playing the ball;
- the player’s remaining momentum is immediately arrested and a `SET` plate appears above the sprite;
- a stationary Set player cannot receive the game’s movement-created avoidable block call;
- continuing to move through the receiver’s body, ball, or short access lane at contact can award the rally to the receiver;
- computer opponents automatically establish a Set position when they are close to the player’s imminent stroke lane.

This first implementation models the movement-created blocking principle from Rules 4.7.B.1 and 4.8.B. Broader referee judgment—failure to clear from the player farther from the wall, unavoidable body contact, safety holdups, replayed hinders, and doubles-specific access—remains a separate officiating layer.

## Wall School

The current four functional drills are:

1. **Tag the Boroughs** — alternate glowing left/right wall targets to practice controlled placement.
2. **Spin Doctor** — match a changing sequence of palm, slice, fist, and backhand calls.
3. **Crack Hunter** — land kills and rollers inside the low-wall window.
4. **Stay Alive** — complete ten legal solo wall returns before using three misses.

Future tiers should change target size, feed speed, called sequences, required contact quality, and movement demands rather than simply shortening a timer.
