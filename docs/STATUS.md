# Status — handoff for the next agent

Snapshot of where the prototype stands, what was decided with the author and
how to work in this repo. Read this after `AGENTS.md`; the design documents
(`VISION.md`, `GAME_DESIGN.md`, `WORLD.md`, `MAP.md`, `MVP.md`) still hold the
reasoning. Last updated: 2026-10-09, `main` at `5319c8b`.

## Working with the author

- Talk to the author in **Russian**. Code, comments and commit messages in
  English, matching the existing style.
- The author decides scope. `AGENTS.md` and `MVP.md` say "do not expand", but
  the author has explicitly asked for several things beyond the original MVP
  (rideable IZH, shop, inventory, needs, friends). When a request goes against
  a design document, say so in one line, do it, and record the decision in the
  relevant document.
- Record every decision in the matching doc (`MAP.md` for places, `MVP.md` for
  the day and mechanics, `README.md` for controls and current state).
- **Git:** never push and never act on GitHub. When asked to commit: create a
  branch, commit there, report; when asked to merge, `git merge --ff-only` into
  `main`. End commit messages with the `Co-Authored-By` line from the harness.
- Research photos in `docs/map/photos/` are **local only** (gitignored): family
  photos with recognisable people, and one copyrighted reference.
- Many lines of dialogue, friend names (Димка, Серый, Лёха), the cow's name
  (Зорька), prices and the pump's location were invented or assumed. The author
  may replace them; ask rather than invent more personal details.

## What the game is now

Top-down Phaser 3 + TypeScript + Vite. One scene with the whole MVP map of
Высокая on real coordinates; the summer from 1 June to 30 August: each day 08:00 to bed (grandma calls
the player in at midnight), the next date, a new morning; on 30 August the
parents come and the game ends («ЛЕТО КОНЧИЛОСЬ»). `Summer`
(`src/world/Summer.ts`) carries the date, pockets, needs, IZH facts, parked
vehicles and whether grandpa was visited; the scene restarts every morning.
  The summer is 1999 (1 June a Tuesday); each morning opens with a card
  «2 ИЮНЯ / СРЕДА». **Market:** on Saturday the player agrees with grandma
  (her morning offer, or — for testing, any day — an option in any talk with
  «подождать до завтра» / «сразу утро, 8:00»); Sunday then starts with the 8:00 bus,
  the trip passes in a fade, at 15:00 grandma pays 30 rubles and town is a
  screen with three shops (`town.json`), home at 16:00. Without the player
  she is away 8:00–16:00 and leaves a note.

- **Map.** Real geography from the author's marks (`docs/map/places.json`),
  converted to meters by `tools/map-editor/export.py` into
  `src/content/geography.json`, rotated so Vysokaya street runs straight up.
  1 m = 12 px. Buildings are placeholder boxes; ~130 neighbour houses are
  generated along streets. Grandpa's house and garage were moved behind the
  club for the MVP (really in Шестово). Water (the reservoir) along the top edge
  with a swimming spot; forest on the other edges.
- **Movement.** Walk 4.6 m/s, Shift runs ×1.5. Bicycle (13.5 m/s) and IZH
  (17 m/s) share one riding model: arrow/WASD direction, acceleration and
  coasting; vehicles stay where left. A car-like steering scheme was tried and
  reverted at the author's request — keep the current one.
- **Grandma** in the front garden: morning errands (visit grandpa, buy bread
  with 10 rubles, meet the cow at 19:00), tells the way to grandpa if asked,
  reacts in the evening to how the day went.
- **Grandpa** behind the club; the **IZH** in his open garage. Hidden fuel /
  spark / air; spark plug key on the workbench, canister under it. First good
  kick catches and dies («О. Живой ещё»), later kicks start it and it can be
  ridden; getting off stalls it.
- **Kiosk** by the bus stop (09:00–21:00), served from any side: six goods at
  late-90s prices. **Inventory** on Q: 5 slots, stacking, money; 1–5 picks a
  slot to eat/drink (ice cream, «Буратино», gum, батон).
- **Needs** next to the clock: food, water, sleep, stamina (Diablo 2 style).
  Eating/drinking refills stamina. **Nap** at grandma's door: the player picks
  30 min / 1 h / 2 h / until rested (+20 sleep per game hour); people remark
  when sleep is low. **T** anywhere on foot waits 15 / 30 / 60 min. Empty food/water have no effect
  yet.
- **Pump** by Vysokaya street halfway to the kiosk (drink to full).
- **Herd** walks in along the Bralgino road, reaches the bus stop at 19:00,
  waits 15 min; met there, grandma's cow follows the player home, otherwise
  grandma meets her.
- **Kids** play at the school field 10:00–17:00 and offer a match (one game
  hour). **Friends** wander between hangouts along a road graph, call the
  player to football or swimming once each; **swimming** at the beach (alone or
  with a friend) takes ~45 min.
- **Dialogue** box with 32×32 colour pixel portraits on the left; yes/no and
  numbered choices.
- Dev starts: `?start=garage` (12:00 by the garage), `?start=herd` (18:50 at
  the bus stop).

## Code map

```
src/scenes/VillageScene.ts   input, player, vehicles, rendering, HUD wiring
src/world/layout.ts          places, roads, blocks, spots, hangouts (meters)
src/world/DayEvents.ts       grandma, grandpa, kids, door/nap, pump, swim, glue
src/world/Herd.ts            the herd and grandma's cow
src/world/Friends.ts         friends' wandering and invites
src/world/Navigation.ts      road graph for walking routes
src/world/Motorcycle.ts      IZH diagnosis, repair and riding hook
src/world/Shop.ts            a shop counter: the kiosk and the town shops
src/world/Inventory.ts       5-slot inventory and money
src/systems/GameClock.ts     game time (one day; restarts each morning)
src/systems/Calendar.ts      day of the summer <-> «2 июня»
src/world/Summer.ts          what carries over between days
src/world/Market.ts          Saturday agreement, Sunday trip and town shops
src/ui/TownBackdrop.ts       the screen standing in for Chkalovsk: caption or picture
src/systems/Needs.ts         hunger, thirst, sleep, stamina, naps
src/ui/                      DialogueBox, InventoryPanel, NeedsBars
src/content/*.json           every number, line, portrait and icon
tools/map-editor/            local map/photo editor + export to geography.json
```

Content is data: lines in `dialogue.json` / `friends.json`, portraits, icons
and pictures as character grids in `portraits.json` / `items.json` /
`scenes.json` (one letter per pixel; the market picture is 100×56 at ×6).

## How to check work

- `npm run typecheck`, `npm run build`; dev server `npm run dev` (port 5173,
  `.claude/launch.json` entry `game`).
- In dev the game is `window.game`. The preview pane is often in the
  background at ~1 fps; drive it by `game.loop.sleep()` + `game.step(t, 16.67)`
  and synthetic `KeyboardEvent`s. Tweens (fades) need real time to pass.
- In such test loops, close dialogue lines with E — Q does nothing on a plain
  line and an unbounded loop will freeze the page.
- `import('/src/world/layout.ts')` in the page gives the layout for geometry
  checks (nothing solid on roads, reachability, routes not crossing blocks).
- Map editor: `python3 tools/map-editor/server.py`, then
  http://127.0.0.1:8765/ (never via file://). After map edits, re-run
  `python3 tools/map-editor/export.py`.

## Open questions for the author

- Real names: friends, the cow; real lines for grandma and grandpa.
- What empty food / water should do (proposed: people notice, no penalties).
- Where water was really drawn; whether the kiosk should open at 08:00 since
  grandma sends for bread at 8.
- Cards (bench by grandma's by day, by the club in the evening) and fishing
  (where, and whose rod) — offered, not built.
- Reproduce family houses literally or not.
- Real lines for later mornings, for the parents on 30 August and for the
  market; what grandma really sold and how they got to Chkalovsk.

## Suggested next steps

In the author's interest order as last discussed:

1. **Days that differ** — the summer runs to 30 August now, but every day is
   the same; weekly or one-off events would make "what do you want to do
   tomorrow" matter.
2. **Evening and night** lighting.
3. **Recognisable art** for the key places, from `MAP.md` descriptions.
4. Saving the summer between browser sessions (now a reload starts over).
5. Sounds; people noticing hunger/thirst; grandpa teaching about the IZH.
