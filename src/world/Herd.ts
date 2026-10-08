import Phaser from 'phaser';
import day from '../content/day.json';
import { clockTime, gameMinutes } from '../systems/GameClock';
import type { Point } from './layout';

const COW_SPACING = 4;
const FOLLOW_GAP = 3;
const FOLLOW_SPEED = 6;
const GIVE_UP_DISTANCE = 60;
const HOME_REACH = 12;
const OUR_COW = 3;

type CowState = 'coming' | 'waiting' | 'dispersing' | 'following' | 'goingHome' | 'gone';

type Cow = {
  image: Phaser.GameObjects.Image;
  back: number;
  lateral: number;
  state: CowState;
  target: Point[];
};

/**
 * The village herd. It walks in from the pasture beyond the map edge,
 * reaches the meeting point at 19:00 and waits a little. Whether the player
 * is there or not, the herd comes; grandma's cow goes home either way
 * (docs/MVP.md, «Корова»).
 *
 * All positions are in meters; the caller converts to pixels via `px`.
 */
export class Herd {
  /** Who brought grandma's cow home: decided once the herd has arrived. */
  cowMetBy: 'player' | 'grandma' | null = null;

  private cows: Cow[] = [];
  private pathLength: number;
  private departure: number;
  private arrival = clockTime(day.herd.arrival);
  private release = this.arrival + day.herd.waitMinutes;
  private trail: Point[] = [];

  constructor(
    scene: Phaser.Scene,
    private path: Point[],
    private homePath: Point[],
    private barnDoor: Point,
    private px: number,
  ) {
    this.pathLength = polylineLength(path);
    this.departure = this.arrival - gameMinutes(this.pathLength / day.herd.walkSpeedMetersPerSecond);

    for (let i = 0; i < day.herd.cows; i++) {
      const image = scene.add.image(0, 0, i === OUR_COW ? 'cowOurs' : 'cow').setDepth(1).setVisible(false);
      this.cows.push({ image, back: i * COW_SPACING, lateral: ((i * 7) % 5) - 2, state: 'coming', target: [] });
    }
  }

  get ourCow(): Phaser.GameObjects.Image {
    return this.cows[OUR_COW].image;
  }

  /** `now` in game minutes, `player` in meters, `dt` in seconds. */
  update(now: number, player: Point, dt: number): void {
    this.recordTrail(player);
    for (const [i, cow] of this.cows.entries()) {
      switch (cow.state) {
        case 'coming':
          this.walkIn(cow, now);
          if (now >= this.release) this.leave(cow, i);
          break;
        case 'waiting':
          if (now >= this.release) this.leave(cow, i);
          break;
        case 'following':
          this.follow(cow, player, dt);
          break;
        case 'dispersing':
        case 'goingHome':
          if (this.walkAlong(cow, dt, day.herd.walkSpeedMetersPerSecond * 1.5)) cow.state = 'gone';
          break;
      }
      cow.image.setVisible(cow.state !== 'gone' && (cow.state !== 'coming' || this.distanceIn(cow, now) > 0));
    }

    const ours = this.cows[OUR_COW];
    const meeting = this.path[this.path.length - 1];
    const herdThere = ours.state === 'waiting';
    if (herdThere && this.cowMetBy === null && distance(player, meeting) < day.herd.meetRadiusMeters) {
      this.cowMetBy = 'player';
      ours.state = 'following';
      this.trail = [player];
    }
  }

  private distanceIn(cow: Cow, now: number): number {
    const realSeconds = (now - this.departure) / gameMinutes(1);
    return realSeconds * day.herd.walkSpeedMetersPerSecond - cow.back;
  }

  private walkIn(cow: Cow, now: number): void {
    // Cows walk in single file and queue up behind the lead once it stops.
    const travelled = this.distanceIn(cow, now);
    const stop = this.pathLength - cow.back;
    const { point, dir } = pointAlong(this.path, Phaser.Math.Clamp(travelled, 0, stop));
    const side = cow.lateral * 0.5;
    this.place(cow, { x: point.x - dir.y * side, y: point.y + dir.x * side }, dir);
    if (travelled >= stop) cow.state = 'waiting';
  }

  private leave(cow: Cow, index: number): void {
    if (index === OUR_COW) {
      if (this.cowMetBy === null) this.cowMetBy = 'grandma';
      this.goHome(cow);
      return;
    }
    // The rest of the herd drifts off down the street into other yards.
    const from = this.position(cow);
    const along = 20 + ((index * 37) % 200);
    cow.target = [{ x: this.homePath[0].x + cow.lateral, y: from.y + along }];
    cow.state = 'dispersing';
  }

  private goHome(cow: Cow): void {
    cow.target = [...this.homePath.slice(1), this.barnDoor];
    cow.state = 'goingHome';
  }

  private follow(cow: Cow, player: Point, dt: number): void {
    const here = this.position(cow);
    if (distance(here, this.barnDoor) < HOME_REACH) {
      // Close to home she goes into the barn by herself.
      cow.target = [this.barnDoor];
      cow.state = 'goingHome';
      return;
    }
    if (distance(here, player) > GIVE_UP_DISTANCE) {
      // Lost sight of the player; she knows the way home.
      this.goHome(cow);
      return;
    }
    // Walk the player's own path, so she goes round the same corners.
    while (this.trail.length > 0 && distance(here, this.trail[0]) < 0.6) this.trail.shift();
    if (distance(here, player) <= FOLLOW_GAP) return;
    this.stepTowards(cow, this.trail[0] ?? player, FOLLOW_SPEED * dt);
  }

  private recordTrail(player: Point): void {
    const last = this.trail[this.trail.length - 1];
    if (!last || distance(last, player) > 0.5) this.trail.push({ ...player });
    if (this.trail.length > 400) this.trail.shift();
  }

  /** Returns true once the last target is reached. */
  private walkAlong(cow: Cow, dt: number, speed: number): boolean {
    const goal = cow.target[0];
    if (!goal) return true;
    if (this.stepTowards(cow, goal, speed * dt)) cow.target.shift();
    return cow.target.length === 0;
  }

  private stepTowards(cow: Cow, goal: Point, step: number): boolean {
    const here = this.position(cow);
    const d = distance(here, goal);
    if (d <= step) {
      this.place(cow, goal, { x: (goal.x - here.x) / (d || 1), y: (goal.y - here.y) / (d || 1) });
      return true;
    }
    const dir = { x: (goal.x - here.x) / d, y: (goal.y - here.y) / d };
    this.place(cow, { x: here.x + dir.x * step, y: here.y + dir.y * step }, dir);
    return false;
  }

  private position(cow: Cow): Point {
    return { x: cow.image.x / this.px, y: cow.image.y / this.px };
  }

  private place(cow: Cow, p: Point, dir: Point): void {
    cow.image.setPosition(p.x * this.px, p.y * this.px);
    if (dir.x !== 0 || dir.y !== 0) cow.image.setRotation(Math.atan2(dir.y, dir.x) + Math.PI / 2);
  }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function polylineLength(points: Point[]): number {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) length += distance(points[i], points[i + 1]);
  return length;
}

function pointAlong(points: Point[], meters: number): { point: Point; dir: Point } {
  let left = Math.max(0, meters);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const length = distance(a, b);
    const dir = { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
    if (left <= length || i === points.length - 2) {
      const t = Math.min(left, length);
      return { point: { x: a.x + dir.x * t, y: a.y + dir.y * t }, dir };
    }
    left -= length;
  }
  return { point: points[0], dir: { x: 0, y: 1 } };
}
