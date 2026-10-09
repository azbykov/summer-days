import geography from '../content/geography.json';

/**
 * MVP map layout in meters, origin at grandma's house.
 *
 * The map is rotated so Vysokaya street runs straight up from grandma's house
 * to the centre: screen "up" is roughly north-north-east, not north
 * (geography.json, upBearingDegrees).
 *
 * Anchors come from docs/map/places.json via tools/map-editor/export.py.
 * Everything here is placement on top of those anchors; see docs/MAP.md for
 * the reasoning behind each piece.
 */

export type Point = { x: number; y: number };

export type Road = {
  kind: 'sand' | 'asphalt' | 'path';
  width: number;
  points: Point[];
};

export type Block = {
  kind: BlockKind;
  x: number;
  y: number;
  w: number;
  h: number;
  solid: boolean;
  label?: string;
};

export type BlockKind =
  | 'grandmaHouse'
  | 'barn'
  | 'house'
  | 'club'
  | 'memorial'
  | 'busStop'
  | 'kiosk'
  | 'pump'
  | 'shop'
  | 'grandpaHouse'
  | 'garage'
  | 'garageFloor'
  | 'workbench'
  | 'field'
  | 'square'
  | 'treeBelt'
  | 'water'
  | 'beach'
  | 'forest';

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export type Layout = {
  bounds: Bounds;
  roads: Road[];
  blocks: Block[];
  playerStart: Point;
  bikeStart: Point;
  /** Where people stand and where things happen during the day. */
  spots: {
    grandma: Point;
    grandpa: Point;
    /** Front door of grandma's house, on the street side. */
    door: Point;
    /** Where the cow goes in: the barn, also opening to the street side. */
    barnDoor: Point;
    herdMeeting: Point;
    football: Block;
    /** The kiosk-container by the bus stop: the seller sits in the middle. */
    seller: Point;
    /** From the middle of the kiosk, how far the player can stand and still be served. */
    counterReach: number;
    /** Drinking-water pump by Vysokaya street, halfway from grandma's to the kiosk. */
    pump: Point;
    beach: Point;
    /** Where the IZH stands at the start of the day. */
    motorcycle: Point;
    workbench: Point;
    /** Just outside the open garage, for starting the game there while developing. */
    garageFront: Point;
  };
  /** The herd walks in from the edge of the map along the Bralgino road to the meeting point. */
  herdPath: Point[];
  /** Cows go home down Vysokaya street. */
  herdHomePath: Point[];
  /** Places villagers drift between when they have nothing better to do. */
  hangouts: Record<Hangout, Point>;
};

export type Hangout = 'pump' | 'club' | 'schoolField' | 'ourField' | 'grandmaBench' | 'kiosk' | 'beach';

/** Marked places that lie outside the MVP scene (docs/MAP.md, «Структура сцены»). */
const OUTSIDE_SCENE = new Set(['9dzft3o', 'doaycwk', 'jmvr7k5', 'vqd2yr0']);
const SCENE_MARGIN = 150;
const STREET_WIDTH = 6;
const PATH_WIDTH = 2;

function place(id: string): Point[] {
  const found = geography.places.find((p) => p.id === id);
  if (!found) throw new Error(`Place ${id} missing from geography.json`);
  return found.points.map(([x, y]) => ({ x, y }));
}

const at = (id: string): Point => place(id)[0];

export function buildLayout(): Layout {
  const mainRoute = place('nb819wu');
  const kindergartenRoute = place('wqdz7sd');
  const [center, turn] = [mainRoute[1], mainRoute[2]];
  // Where the marked grandpa's house really is: the end of both roads, in Shestovo.
  const shestovo = at('s36bcyl');
  const swim = at('s5nmj0h');
  const merge = mainRoute[mainRoute.length - 2];

  const scenePoints = geography.places
    .filter((p) => !OUTSIDE_SCENE.has(p.id))
    .flatMap((p) => p.points.map(([x, y]) => ({ x, y })));
  const bounds: Bounds = {
    minX: Math.min(...scenePoints.map((p) => p.x)) - SCENE_MARGIN,
    maxX: Math.max(...scenePoints.map((p) => p.x)) + SCENE_MARGIN,
    minY: Math.min(...scenePoints.map((p) => p.y)) - SCENE_MARGIN,
    maxY: Math.max(...scenePoints.map((p) => p.y)) + SCENE_MARGIN,
  };
  // The reservoir: everything beyond the swimming spot.
  const shoreY = swim.y - 10;

  const ourFieldAnchor = at('qh8gjbr');
  const roads: Road[] = [
    // Vysokaya street: from beyond grandma's house up to the bus stop.
    { kind: 'sand', width: STREET_WIDTH, points: [extend(center, mainRoute[0], 150), center] },
    // The only asphalt: the road from Bralgino, entering to the stop.
    { kind: 'asphalt', width: 7, points: [center, turn, extend(center, turn, 200)] },
    { kind: 'sand', width: STREET_WIDTH, points: mainRoute.slice(2) },
    { kind: 'sand', width: STREET_WIDTH, points: kindergartenRoute.slice(1) },
    // Trodden path from the street round the back of grandma's house to «наше поле».
    {
      kind: 'path',
      width: PATH_WIDTH,
      points: [{ x: mainRoute[0].x, y: 18 }, { x: -18, y: 18 }, { x: ourFieldAnchor.x - 4, y: ourFieldAnchor.y + 4 }],
    },
    {
      kind: 'path',
      width: PATH_WIDTH,
      points: [offset(shestovo, -15, 2), { x: (shestovo.x + swim.x) / 2 + 20, y: (shestovo.y + swim.y) / 2 }, { x: swim.x, y: shoreY + 5 }],
    },
  ];

  const club = at('t9ptb8v');
  const memorial = at('ubbgtfr');
  const stop = at('e018xvx');
  const kiosk = at('6c1vztu');
  const herdMeeting = at('cghc9un');
  const schoolField = at('wxooeqp');
  const ourField = at('qh8gjbr');

  const schoolFieldBlock: Block = { kind: 'field', x: schoolField.x, y: schoolField.y, w: 40, h: 25, solid: false, label: 'школьное поле' };
  // Moved for the MVP: grandpa lives in Vysokaya, right behind the club, so the
  // visit is a short walk from the centre (docs/MAP.md, «Дом деда»).
  const grandpa = { x: club.x + 10, y: club.y - 40 };

  // Grandpa's garage stands open towards the yard: walls on three sides, the IZH
  // inside and the workbench along the back wall, canister underneath.
  const garageBox = { x: grandpa.x - 10, y: grandpa.y - 10, w: 7, h: 8 };
  const wall = 0.4;
  const motorcycle = { x: garageBox.x - 1, y: garageBox.y + 0.5 };
  const workbench = { x: garageBox.x + 1.5, y: garageBox.y - garageBox.h / 2 + wall + 0.5 };
  const garage: Block[] = [
    { kind: 'garageFloor', ...garageBox, solid: false, label: 'гараж' },
    { kind: 'garage', x: garageBox.x, y: garageBox.y - garageBox.h / 2 + wall / 2, w: garageBox.w, h: wall, solid: true },
    { kind: 'garage', x: garageBox.x - garageBox.w / 2 + wall / 2, y: garageBox.y, w: wall, h: garageBox.h, solid: true },
    { kind: 'garage', x: garageBox.x + garageBox.w / 2 - wall / 2, y: garageBox.y, w: wall, h: garageBox.h, solid: true },
    { kind: 'workbench', x: workbench.x, y: workbench.y, w: 3, h: 0.8, solid: true },
  ];
  const kioskBox = { x: kiosk.x + 4, y: kiosk.y + 2, w: 6, h: 2.5 };
  // Halfway between grandma's house and the kiosk, at the edge of Vysokaya street.
  const pump = { x: mainRoute[0].x + STREET_WIDTH / 2 + 1.5, y: kiosk.y / 2 };
  const grandmaHouse: Block = { kind: 'grandmaHouse', x: 0, y: 0, w: 10, h: 8, solid: true, label: 'дом бабушки' };
  const clubBlock: Block = { kind: 'club', x: club.x + 6, y: club.y - 4, w: 30, h: 20, solid: true, label: 'клуб' };

  const landmarks: Block[] = [
    grandmaHouse,
    // The barn shares a roof with the house, on the side the map marks it.
    { kind: 'barn', x: 0, y: grandmaHouse.h / 2 + 4, w: 10, h: 8, solid: true },
    { kind: 'field', x: ourField.x - 8, y: ourField.y, w: 26, h: 22, solid: false, label: 'наше поле' },
    // Open centre: stop, kiosk, herd meeting point, memorial and club, no houses in between.
    { kind: 'square', ...boxAround([stop, kiosk, herdMeeting, memorial, club], 15), solid: false },
    { kind: 'busStop', x: stop.x, y: stop.y + 2, w: 6, h: 2.5, solid: true, label: 'остановка' },
    { kind: 'kiosk', ...kioskBox, solid: true, label: 'контейнер' },
    { kind: 'pump', ...pump, w: 0.8, h: 0.8, solid: true, label: 'колонка' },
    { kind: 'shop', ...offset(at('m5fb8fg'), 6, 0), w: 10, h: 8, solid: true, label: 'хозмаг' },
    clubBlock,
    { kind: 'memorial', x: memorial.x, y: memorial.y, w: 3, h: 3, solid: true, label: 'стела' },
    // Marked right next to the club; placed beside it.
    { kind: 'shop', x: clubBlock.x - clubBlock.w / 2 - 10, y: clubBlock.y, w: 10, h: 8, solid: true, label: 'магазин' },
    schoolFieldBlock,
    // Tree belt: the threshold between Vysokaya and Shestovo, just past where the roads meet.
    { kind: 'treeBelt', x: merge.x + 25, y: merge.y - 100, w: 28, h: 330, solid: false },
    { kind: 'grandpaHouse', x: grandpa.x + 4, y: grandpa.y - 9, w: 10, h: 8, solid: true, label: 'дом деда' },
    ...garage,
    { kind: 'beach', x: swim.x, y: shoreY + 8, w: 30, h: 16, solid: false, label: 'купание' },
    {
      kind: 'water',
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + shoreY) / 2,
      w: bounds.maxX - bounds.minX,
      h: shoreY - bounds.minY,
      solid: true,
    },
    ...edgeForest(bounds, shoreY),
  ];

  const houses = generateHouses(roads, landmarks, bounds, shoreY);

  return {
    bounds,
    roads,
    blocks: [...landmarks, ...houses],
    // Front garden, between the house and the street.
    playerStart: { x: 11, y: 2 },
    // Back yard by the shed, on the far side of the house from the street (photo 13).
    bikeStart: { x: -10, y: 2 },
    spots: {
      grandma: { x: 12, y: -4 },
      grandpa: { x: grandpa.x + 2, y: grandpa.y },
      door: { x: grandmaHouse.w / 2 + 1.5, y: 0 },
      barnDoor: { x: grandmaHouse.w / 2 + 1.5, y: grandmaHouse.h / 2 + 4 },
      herdMeeting,
      football: schoolFieldBlock,
      seller: { x: kioskBox.x, y: kioskBox.y },
      // Served from any side of the container: half its length plus a step.
      counterReach: kioskBox.w / 2 + 2,
      pump: { x: pump.x - 1.2, y: pump.y },
      beach: { x: swim.x, y: shoreY + 8 },
      motorcycle,
      workbench,
      garageFront: { x: garageBox.x, y: garageBox.y + garageBox.h / 2 + 2 },
    },
    herdPath: [extend(center, turn, 200), turn, center, herdMeeting],
    hangouts: {
      pump: { x: pump.x - 1.5, y: pump.y + 1.5 },
      club: { x: clubBlock.x, y: clubBlock.y + clubBlock.h / 2 + 3 },
      schoolField: schoolField,
      ourField: { x: ourField.x - 4, y: ourField.y + 4 },
      // The bench under the birch by the fence, on the street side of the front garden.
      grandmaBench: { x: mainRoute[0].x - 4, y: -8 },
      kiosk: { x: kioskBox.x + 4, y: kioskBox.y - kioskBox.h / 2 - 2 },
      beach: { x: swim.x + 6, y: shoreY + 10 },
    },
    herdHomePath: [herdMeeting, { x: mainRoute[0].x, y: grandmaHouse.h / 2 + 4 }],
  };
}

/** Natural edges instead of invisible walls in the open (docs/MAP.md, «Края мира»). */
function edgeForest(bounds: Bounds, shoreY: number): Block[] {
  const { minX, maxX, maxY } = bounds;
  const depth = 30;
  const height = maxY - shoreY;
  const midY = (shoreY + maxY) / 2;
  return [
    { kind: 'forest', x: minX + depth / 2, y: midY, w: depth, h: height, solid: true },
    { kind: 'forest', x: maxX - depth / 2, y: midY, w: depth, h: height, solid: true },
    { kind: 'forest', x: (minX + maxX) / 2, y: maxY - depth / 2, w: maxX - minX, h: depth, solid: true },
  ];
}

/**
 * Placeholder neighbours along both sides of every street, so the village
 * reads as a village. Real houses replace these as photos come in.
 */
function generateHouses(roads: Road[], landmarks: Block[], bounds: Bounds, shoreY: number): Block[] {
  const houses: Block[] = [];
  const spacing = 26;
  const setback = STREET_WIDTH / 2 + 9;
  let seed = 1;

  // Houses line the streets; footpaths only need to stay clear.
  for (const road of roads.filter((r) => r.kind !== 'path')) {
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i];
      const b = road.points[i + 1];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const nx = -(b.y - a.y) / length;
      const ny = (b.x - a.x) / length;

      for (let d = spacing / 2; d < length; d += spacing) {
        const px = a.x + ((b.x - a.x) * d) / length;
        const py = a.y + ((b.y - a.y) * d) / length;
        for (const side of [-1, 1]) {
          seed = (seed * 16807) % 2147483647;
          const size = 8 + (seed % 4);
          const house: Block = {
            kind: 'house',
            x: px + nx * side * setback,
            y: py + ny * side * setback,
            w: size,
            h: size - 1,
            solid: true,
          };
          if (fits(house, roads, landmarks, houses, bounds, shoreY)) houses.push(house);
        }
      }
    }
  }
  return houses;
}

function fits(house: Block, roads: Road[], landmarks: Block[], houses: Block[], bounds: Bounds, shoreY: number): boolean {
  const { minX, maxX, maxY } = bounds;
  if (house.x < minX + 40 || house.x > maxX - 40 || house.y > maxY - 40 || house.y < shoreY + 30) return false;
  if (landmarks.some((l) => l.kind !== 'forest' && overlaps(house, l, 8))) return false;
  if (houses.some((h) => overlaps(house, h, 6))) return false;
  const clearance = Math.hypot(house.w, house.h) / 2 + STREET_WIDTH / 2 + 1;
  return roads.every((r) => distanceToPolyline(house, r.points) > clearance);
}

function overlaps(a: Block, b: Block, margin: number): boolean {
  return (
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 + margin && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + margin
  );
}

function distanceToPolyline(p: Point, points: Point[]): number {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}

/** Point `meters` beyond `to`, continuing the direction from `from`. */
function extend(from: Point, to: Point, meters: number): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  return {
    x: to.x + ((to.x - from.x) * meters) / length,
    y: to.y + ((to.y - from.y) * meters) / length,
  };
}

function offset(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy };
}

function boxAround(points: Point[], margin: number): { x: number; y: number; w: number; h: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    w: maxX - minX + margin * 2,
    h: maxY - minY + margin * 2,
  };
}
