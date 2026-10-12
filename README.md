# Summer Days

Top-down prototype of a game about one summer in a Russian village.

Working title only. See `docs/VISION.md`.

## Design documents

Start with `docs/STATUS.md` — current state, decisions and how to work here.

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

Arrow keys or WASD to walk or ride. Hold Shift to run on foot: faster, but it
uses up stamina.

E next to the bicycle gets on it; E again gets off and leaves the bike where you
stopped. The bicycle starts the day in grandma's back yard.

E next to a person talks; E advances the conversation. When someone asks a
question, E is yes and Q is no; when there are several things to do, a number
picks one and Q steps away.

Q outside a conversation opens and closes what you carry: five slots with
items, and the money in the pocket. Same things stack; a sixth kind of thing
does not fit. With it open, 1–5 picks a slot: ice cream can be eaten,
«Буратино» drunk, gum chewed. It does nothing else, on purpose.

E at grandma's front door goes inside: 1 naps — pick half an hour, an hour,
two hours or until rested (sleep comes back at 20 per game hour, not at all when
wide awake); with bread in the pocket, «поесть хлеба» fills food up (the loaf
goes first, the black bread is for grandma); from 19:00 on, «лечь спать до
утра» ends the day. At midnight grandma calls the player in anyway.

The summer runs from 1 June to 30 August. After a night the next date comes up
and the morning starts again at grandma's: sleep full, food and water +40, the
pocket, money and the IZH as they were, vehicles where they were left. People,
the herd, football and errands start afresh; grandma gives 10 rubles for bread
every morning and keeps asking about grandpa until he is visited. On the
morning of 30 August the parents come and the game ends. The summer is 1999:
1 June is a Tuesday. Every morning opens on black with the date, the day of the
week and the time the day starts; date and weekday are also under the clock.

Every Sunday grandma leaves for the market in Chkalovsk at 8:00 and is back at
16:00. On Saturday she asks in the morning whether the player wants to come and
help. For trying it out, any talk with her on any day has «поехать с тобой на
рынок»: then «подождать до завтра» (the trip is tomorrow, whatever the weekday)
or «сразу утро, 8:00» (straight to the next morning and onto the bus). Agreed,
Sunday grandma wakes the player for the 8:00 bus: an hour on the bus, the market in a fade (grandma feeds
the player pies and kvass), and at 15:00 — over a pixel still of the two of
them by their stall — she pays 30 rubles and lets the player go round the shops — a grocery, car parts for the IZH (a new spark plug
fixes the spark like cleaning does) and a newspaper kiosk with magazines that
can be read from the inventory and are kept. «к бабушке, на автобус» brings
both back to the yard at 16:00. Not agreed, there is a note on the table and
grandma is away until 16:00.

T on foot, anywhere, sits down to let time pass: 15 minutes, half an hour or an
hour. Needs run on meanwhile; the legs get rested.

### Development starts

Skip the morning and the ride:

- http://localhost:5173/?start=garage — by grandpa's garage at 12:00, bike next
  to you;
- http://localhost:5173/?start=herd — at the bus stop at 18:50, just before the
  herd;
- http://localhost:5173/?date=08-29 — start the summer on another day (works
  with `start` too); `?date=06-05` is a Saturday, to agree on the market.

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
grandpa's yard and garage (moved behind the club for the MVP), and the swimming spot by the reservoir. Buildings are
placeholder boxes; neighbour houses along the streets are generated. Labels over
landmarks are a temporary development aid.

The bicycle works: get on, ride, get off, and it stays where it was left.

Next to the clock are four bars: food, water, sleep and stamina. The first
three run down with game time; stamina drains while running, a little while
walking, and refills standing still or riding, Diablo 2 style. Anything eaten or drunk refills stamina at once.
Water: «Буратино» or the pump on Vysokaya street, halfway to the kiosk. Numbers are in
`src/content/needs.json`. Sleep comes back with a nap at home; when it runs low, people remark on it.
Empty food and water bars have no effect yet.

The day from `docs/MVP.md` plays out, with placeholder figures:

- grandma in the front garden sends the player to grandpa and asks to be back
  by seven for the cow;
- grandma also gives 10 rubles for a loaf of black bread from the kiosk by the
  bus stop (open 9:00–21:00); the change is the player's to spend there;
- grandpa by his house and garage behind the club; grandma tells the way if
  asked;
- local kids at the school field, 10:00–17:00, offer a game; playing takes an
  hour of game time;
- three friends wander between hangouts — the pump, the club, the fields,
  grandma's bench, the kiosk — along the streets; passing by, they call the
  player to football or swimming, once each; swimming at the beach works
  alone too;
- the herd walks in along the Bralgino road from the map edge, reaches the bus
  stop at 19:00 and waits 15 minutes. Met there, grandma's cow (the ginger one)
  follows the player home; otherwise grandma meets her;
- in the evening grandma reacts to how the day went; going to bed shows the next
  date and starts the next morning, up to 30 August.

Goods and prices are in `src/content/shop.json`; item names and their 12×12
pixel icons in `src/content/items.json`. Times, counts and distances are
in `src/content/day.json`; all lines are in
`src/content/dialogue.json`. Whoever speaks shows a 32×32 pixel face on the
left of the dialogue box; the faces are drawn as character grids in
`src/content/portraits.json`, one letter per pixel, colours in its palette.

Grandpa's garage stands open: the IZH inside, the workbench at the back wall.
The motorcycle has three hidden facts — no fuel, a fouled plug, air fine — that
the player learns only by looking. The spark plug key is on the workbench, the
canister under it. With fuel and a clean plug the engine first catches once and
dies, and grandpa says «О. Живой ещё». After that it starts and the IZH can be
ridden — faster than the bike. Getting off stalls it where it stands; the next
ride needs the kickstarter again. Grandma's evening lines mention the IZH if the
player tried it.

The layout reads anchors from `src/content/geography.json`. After editing the map
in the editor, regenerate it:

```
python3 tools/map-editor/export.py
```

The on-screen clock is a temporary development readout, not the final way the
player learns the time of day.

`src/content/time.json` holds the time scale. The current value is a guess;
`docs/MVP.md` requires it to be settled by playtesting.
