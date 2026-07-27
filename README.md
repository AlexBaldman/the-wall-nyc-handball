# NYC One-Wall Handball Prototype

This is the extracted standalone version of the American handball concept that had been living in the old `Jeopardish` orbit.

## What it is

A browser-based prototype focused on the first thing that matters for this idea: does the rally loop feel alive?

Current build includes:

- a dedicated one-wall court canvas
- `Serve` and `Reset Match` controls
- race-to-11 match flow with between-point resets
- keyboard movement, swing, pace, and english/spin input
- selectable `flat`, `lob`, and `kill` shots
- serve validation with short and long faults
- front-wall validation and rally-ending down / out logic
- a simple practice opponent
- rally scoring HUD and live status messaging

## Controls

- `WASD` or arrow keys: move
- `Space`: swing
- `1` / `2` / `3`: flat, lob, or kill shot selection
- `Z` / `X`: left or right english while swinging
- `Shift`: extra pace
- `R`: serve
- `Backspace`: reset match

## Run it

This project is static HTML/CSS/JS, so any simple local server works.

Example:

```bash
cd american-handball
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## Project layout

- `index.html`: page structure and HUD
- `style.css`: standalone visual design
- `app.js`: game loop, controls, ball physics, rules, and rendering
- `docs/american-handball-game-plan.md`: longer-term roadmap carried over into the new project
