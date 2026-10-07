# Summer Days

Top-down prototype of a game about one summer in a Russian village.

Working title only. See `docs/VISION.md`.

## Design documents

Read before changing gameplay:

1. `docs/VISION.md`
2. `docs/GAME_DESIGN.md`
3. `docs/WORLD.md`
4. `docs/MVP.md`
5. `docs/AGENTS.md`

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

Arrow keys or WASD to walk.

## Structure

```
src/main.ts              game bootstrap
src/scenes/              Phaser scenes
src/systems/             world simulation independent of the player
src/content/             configurable gameplay data
docs/                    design documents
```

## Current state

Placeholder geometry, a walking player, a following camera and a running game clock.

No MVP content yet: no bicycle, no NPCs, no Shestovo, no garage, no motorcycle.

The on-screen clock is a temporary development readout, not the final way the
player learns the time of day.

`src/content/time.json` holds the time scale. The current value is a guess;
`docs/MVP.md` requires it to be settled by playtesting.
