# Court Geometry and Camera Study

## Official one-wall geometry

Source of truth: [USHA One-Wall Rulebook](https://www.ushandball.org/learn-handball/one-wall-rulebook/), current published rules as of January 26, 2025.

| Feature | Official measure | Game mapping |
| --- | ---: | --- |
| Front wall | 20 ft wide × 16 ft high | Side edges and top edge are live-boundary checks |
| Floor / long line | 20 ft wide × 34 ft from wall | Normalized playable rectangle |
| Short line | 16 ft from wall | `16 / 34` of wall-to-long-line depth |
| Service markers | Midway between short and long lines | 25 ft from wall; six-inch end markers |
| Service zone | Between short line, service markers, and sidelines | Server start and pre-serve movement clamp |
| Receiving position | Behind the service line before the serve passes the short line | Receiver starts 42 projected pixels behind the marker |
| Ball rebound test | 48–52 in after a 70 in free fall | Floor restitution set near the square-root energy ratio |

The canvas uses an elevated broadcast projection, so visual X and Y pixels are intentionally not a literal architectural scale. All rule positions are derived from the official feet-based ratios before projection. The full service line is not painted: only the required six-inch markers appear at the sidelines.

## Real-court references

- [NYC Parks handball directory](https://www.nycgovparks.org/facilities/handball) lists three courts at West 4th Street and many courts across the five boroughs. West 4th informs the tight city, chain-link, spectators-on-top-of-play atmosphere.
- [One Wall Kings of Coney Island](https://vimeo.com/325014201) documents more than 50 years of the National One Wall Championship at Coney Island's Seaside Courts. Coney informs the open sky, seaside light, tournament crowd, and legacy tone.
- [Los Angeles Recreation and Parks](https://www2.laparks.org/reccenter/venice-beach) lists outdoor handball courts at Venice Beach Recreation Center. Venice informs the coastal color, palms, and boardwalk atmosphere.
- [Miami-Dade Park Finder](https://www.miamidade.gov/global/recreation/park-finder.page) confirms county parks with handball/racquetball courts. A specific Miami venue should be selected only after a dedicated visual-reference pass.

Venue presets never change the competition geometry or ball physics.

## Match-camera findings

Reference footage:

- [Timbo vs Tywan — Impact Pro $10K US Open Singles Final](https://www.youtube.com/watch?v=E28Q5rB2S0k)
- [2022 USHA National One-Wall Championships](https://www.ushandball.org/61st-usha-national-one-wall-championships/)
- [One Wall Kings of Coney Island](https://vimeo.com/325014201)

The dependable rally view is centered behind the receiver and slightly elevated. It holds the wall width, both players, service/short lines, and narrow spectator strips at the sides. That spatial continuity matters more than cinematic cutting during live play.

Documentary and highlight footage can move closer: hands, shoulders, faces, and low ball contact sell speed and personality. Those shots are most useful between points or as optional player-follow views, not as the only competitive camera.

Implemented camera vocabulary:

- `Broadcast`: stable, centered, full-court tactical view.
- `Follow`: tighter crop weighted between the player, live ball, and front wall.
- `Courtside`: closer crop with slight horizontal shear and vertical compression for a low sideline/comic-panel feel.
- User zoom: 80–150% on every preset.

The art direction uses pixel-snapped actor geometry for retro readability, then adds modern comic ink, flat color blocks, speed lines, square particles, halftone/noise texture, and impact typography.
