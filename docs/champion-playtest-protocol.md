# Champion and Court-Player Playtest Protocol

## Purpose

The game should be judged by people whose eyes, feet, and hands already understand one-wall handball. Footage and published coaching can generate strong control ideas, but only hands-on sessions can tell us whether those ideas feel like the real sport.

No champion has tested or endorsed the current build yet. This document defines how to earn that feedback, preserve disagreements, and turn it into reproducible design decisions.

## Recruitment panel

Recruit through USHA, WPH, ICHA, tournament organizers, and direct introductions. The ideal first round is six to eight people:

- two currently active elite singles players with different styles;
- one elite doubles player who can evaluate blocks, access lanes, and future partner play;
- one women’s open player;
- one veteran champion or coach who can compare generations of one-wall technique;
- one referee or tournament organizer;
- one intermediate park regular;
- one newer player who can reveal where authentic controls become unreadable.

Possible outreach targets—not commitments—include 2026 U.S. Open finalists Tavo Ruiz and Kadeem Bush, 11-time USHA National One-Wall champion Tyree Bastidas, former national champion Timbo Gonzalez, and 2022 Women’s Pro champion Danielle Daskalakis. The panel should not become an all-male or all-elite echo chamber; junior, women’s, doubles, and everyday park-player perspectives are distinct evidence.

## Build and equipment

Every session records:

- build URL and commit;
- keyboard or controller model;
- camera mode and zoom;
- complete Rhythm Lab playtest code;
- dominant hand and preferred one-wall ball;
- years playing, main format, and self-described style;
- prior experience with tennis or sports video games.

Use the same laptop/display for the first comparison round where possible. A standard controller is preferred after a short keyboard sample because analog footwork and aiming are part of the target experience.

## 35-minute session

### 1. Cold read — 3 minutes

Give only: “Serve with `R`, move with the left stick, aim with the right stick, and hold/release a face button to hit.” Do not explain timing meters or shot profiles yet.

Observe:

- whether the player reads wall, floor, and ball height;
- the first missed-return reason;
- whether movement resembles court recovery or ball chasing;
- what the player expects each button to do.

### 2. Rhythm calibration — 6 minutes

Play the same feed in `Slow Study`, `Real Court`, and `Tournament`. Ask the player to adjust master tempo, ball clock, and footwork clock until the rally feels plausible. Copy the resulting code.

Do not ask “Is it realistic?” Ask:

- At what moment did you know where the rebound would go?
- Did your feet arrive too soon, too late, or at the right moment?
- Which motion felt wrong: flight to wall, wall-to-floor, floor rebound, or opponent recovery?
- Does the player cover too much court for the apparent body motion?

### 3. Camera comparison — 4 minutes

Play identical feeds in `Broadcast`, `Player`, `Follow`, and `Courtside`, using the same Rhythm Lab settings.

Capture separate 1–5 ratings for:

- judging wall height;
- reading the first bounce;
- seeing both players and interference;
- feeling contact power;
- comfort over a full match.

### 4. Contact lab — 8 minutes

Run controlled feeds for palm, slice, fist, backhand, lob, kill, and roller. Each contact gets one safe target and one aggressive target.

Ask the player to narrate:

- intended hand and body position;
- intended wall spot;
- expected post-wall and post-floor behavior;
- what the game produced differently.

The goal is not seven equal “special moves.” It is to learn which dimensions—hand, height, timing, spin, pace, stance, or target—expert players actually think about as separate intentions.

### 5. Control experiments — 5 minutes

Test the two film-study hypotheses independently:

1. **Read stance:** hold `Q` or `R3` for stronger tracking and a wider contact window at the cost of foot speed.
2. **Step-in transfer:** controlled forward movement at contact improves pace and accuracy; lateral sprinting and jammed contact do not.

For each, ask:

- Does this represent a real decision or feel like a video-game buff?
- What physical cue should trigger it?
- Should it be held, timed, flicked, or inferred from movement?
- What exploit would a strong player discover?

Then invite one new control idea. Require the player to describe the real body action first and the button/stick mapping second.

### 6. Competitive set — 6 minutes

Play a short first-to-five match against the appropriate AI tier. Do not interrupt. Record:

- rally length;
- first-bounce and second-bounce misses;
- pure, jammed, reach, fly, and short-hop contacts;
- shot mix and repeated habits;
- whether losses are understood without explanation;
- any case where the AI appears to cheat rather than anticipate.

### 7. Interview — 3 minutes

End with:

1. What is the one thing real players do that this game still does not understand?
2. Which return felt closest to your hand?
3. Which return looked right but felt wrong?
4. Which control would you remove?
5. What would make you ask for one more game?

## Decision rules

- One expert reaction is a lead, not a mandate.
- Change a physics default after at least three players reproduce the same mismatch under the same playtest code.
- Segment feedback by skill and style before averaging it.
- Preserve raw notes and exact player language, but obtain permission before publishing any quote or name.
- Prefer controls that express a real physical decision and remain legible to a new player.
- Reject an “authentic” mechanic if it creates invisible rules, arbitrary execution, or an obvious competitive exploit.
- Retest every accepted change with at least one expert and one non-expert.

## Novel-control backlog to validate

- right-stick pre-contact hand/shoulder preparation rather than wall aiming alone;
- a short right-stick flick at contact for side english direction and amount;
- analog trigger pressure for open-palm touch versus committed fist pace;
- a split-step timing input that improves the first movement but punishes guessing;
- left/right hand selection determined by body-ball relationship, with manual override;
- serve concealment through a common toss/preparation animation and late target choice;
- “watch the hips” visual cue on advanced opponents instead of a trajectory marker;
- doubles communication pings for `mine`, `switch`, `hold`, and `clear`.

These remain experiments until the panel tests them.

## Outreach brief

The first message should be short and honest:

> We are building a one-wall handball game around regulation geometry and NYC court culture. The current browser build is playable, but no champion has approved its feel. We would like 35 minutes of blunt, hands-on feedback on ball rhythm, footwork, camera, and control ideas. We will record settings and notes, not use your name or quotes publicly without separate permission, and compensate your time.

Do not ask for a vague endorsement. Ask for criticism, schedule a playable session, offer compensation, and make it easy to decline.

## Sources that shaped the first hypotheses

- [USHA One-Wall Rulebook](https://www.ushandball.org/learn-handball/one-wall-rulebook/)
- [USHA: 21 Tips to Help You Reach 21 First](https://www.ushandball.org/21-tips-to-help-you-reach-21-first/)
- [USHA: 1-Wall Servers Must Learn How to Handle the Angles](https://www.ushandball.org/1-wall-servers-must-learn-how-to-handle-the-angles/)
- [2025 USHA National One-Wall Championships](https://www.ushandball.org/64th-usha-national-one-wall-championships/)
- [2026 WPH U.S. Open final report](https://wphlive.tv/tavo-dominates-the-2026-u-s-open-1-wall-handball-championships/)

