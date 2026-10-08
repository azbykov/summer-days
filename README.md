# Summer Days

Top-down prototype of a game about one summer in a Russian village.

Working title only. See `docs/VISION.md`.

## Design documents

Read before changing gameplay:

1. `docs/VISION.md`
2. `docs/GAME_DESIGN.md`
3. `docs/WORLD.md`
4. `docs/MAP.md`
5. `docs/MVP.md`
6. `docs/AGENTS.md`

## Stack

TypeScript + Phaser 3 + Vite, running in the browser.

## Running

```
npm install
npm run dev
```

Then open http://localhost:5173

Other scripts:

```
npm run typecheck
npm run build
```

## Controls

Arrow keys or WASD to walk or ride.

E next to the bicycle gets on it; E again gets off and leaves the bike where you
stopped. The bicycle starts the day in grandma's back yard.

E next to a person talks; E advances the conversation. When someone asks a
question, E is yes and Q is no; when there are several things to do, 1–5 picks
one and Q steps away. E at grandma's front door goes inside — from 19:00 on,
that ends the day.

### Development starts

Skip the morning and the ride:

- http://localhost:5173/?start=garage — by grandpa's garage at 12:00, bike next
  to you;
- http://localhost:5173/?start=herd — at the bus stop at 18:50, just before the
  herd.

## Structure

```
src/main.ts              game bootstrap
src/scenes/              Phaser scenes
src/world/               map layout, people and the day's events
src/ui/                  dialogue box
src/systems/             world simulation independent of the player
src/content/             configurable gameplay data
docs/                    design documents
tools/map-editor/        local editor for map research (docs/map/)
```

## Current state

The MVP map is laid out on real coordinates: Vysokaya, both roads to Shestovo,
grandpa's yard and garage, and the swimming spot by the reservoir. Buildings are
placeholder boxes; neighbour houses along the streets are generated. Labels over
landmarks are a temporary development aid.

The bicycle works: get on, ride, get off, and it stays where it was left.

The day from `docs/MVP.md` plays out, with placeholder figures:

- grandma in the front garden sends the player to grandpa and asks to be back
  by seven for the cow;
- grandpa in Shestovo, by his house and garage;
- local kids at the school field, 10:00–17:00, offer a game; playing takes an
  hour of game time;
- the herd walks in along the Bralgino road from the map edge, reaches the bus
  stop at 19:00 and waits 15 minutes. Met there, grandma's cow (the ginger one)
  follows the player home; otherwise grandma meets her;
- in the evening grandma reacts to how the day went; going inside ends the day
  with «2 ИЮНЯ».

Times, counts and distances are in `src/content/day.json`; all lines are in
`src/content/dialogue.json`.

Grandpa's garage stands open: the IZH inside, the workbench at the back wall.
The motorcycle has three hidden facts — no fuel, a fouled plug, air fine — that
the player learns only by looking. The spark plug key is on the workbench, the
canister under it. With fuel and a clean plug the engine catches once and dies;
grandpa comments on the first failed kick and on the first start. The IZH does
not become transport in the MVP. Grandma's evening lines mention it if the
player tried.

The layout reads anchors from `src/content/geography.json`. After editing the map
in the editor, regenerate it:

```
python3 tools/map-editor/export.py
```

The on-screen clock is a temporary development readout, not the final way the
player learns the time of day.

`src/content/time.json` holds the time scale. The current value is a guess;
`docs/MVP.md` requires it to be settled by playtesting.
