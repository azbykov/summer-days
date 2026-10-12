import Phaser from 'phaser';
import arrival from '../content/arrival.json';
import type { DialogueBox, Line } from '../ui/DialogueBox';
import type { Inventory, ItemId } from './Inventory';
import type { Layout, Point } from './layout';

/** What the scene does for the cutscene: where the player and grandma go. */
export type ArrivalHooks = {
  /** The player steps out of the car here. */
  getOut: (at: Point) => void;
  /** Grandma comes out to the street to meet the car. */
  grandmaComes: (to: Point) => void;
  /** The car has gone: grandma's own welcome, pies and errands. */
  welcome: () => void;
};

/**
 * The first day opens with uncle Yura's white «копейка» (VAZ 2101): in along
 * the Bralgino road past the club and down Vysokaya street to grandma's.
 * He talks on the way — the club and its library, the new shop, Лёха,
 * grandpa, grandma — and the car stands still while he speaks, going on once
 * the line is read. At grandma's he hands over a «Мото» magazine; grandma
 * comes out, asks him in for tea, he drives off and she takes over.
 */
export class Arrival {
  private car: Phaser.GameObjects.Image;
  private curve: Phaser.Curves.Spline;

  constructor(
    private scene: Phaser.Scene,
    private dialogueBox: DialogueBox,
    private inventory: Inventory,
    private px: number,
    private route: Layout['arrival'],
  ) {
    this.curve = this.spline(route.route);
    const start = route.route[0];
    this.car = scene.add.image(start.x * px, start.y * px, 'kopeyka').setDepth(3);
    this.carAt(this.curve, 0);
  }

  /** Where the player waits, unseen, while the car is on its way. */
  get hiddenAt(): Point {
    return this.route.route[0];
  }

  play(hooks: ArrivalHooks): void {
    this.scene.cameras.main.startFollow(this.car, true, 0.12, 0.12);
    this.ride(0, 0, hooks);
  }

  /** From `from` along the route to the next stop for words, then the next. */
  private ride(from: number, index: number, hooks: ArrivalHooks): void {
    const stop = arrival.ride[index];
    const to = stop ? stop.at : 1;
    // The last stretch: grandma has heard the car and comes out.
    if (!stop) hooks.grandmaComes(this.meetingPoint(-1.6, -1.2));
    this.drive(this.curve, from, to, () => {
      if (!stop) {
        this.talkAtHome(hooks);
        return;
      }
      this.dialogueBox.say(stop.lines as Line[], () => this.ride(to, index + 1, hooks));
    });
  }

  private talkAtHome(hooks: ArrivalHooks): void {
    hooks.getOut(this.meetingPoint(0, 0));
    this.dialogueBox.say(arrival.atHome as Line[], () => {
      this.inventory.add(arrival.gift as ItemId);
      this.dialogueBox.say([...(arrival.afterGift as Line[]), ...(arrival.farewell as Line[])], () => {
        const out = this.spline(this.route.out);
        this.drive(out, 0, 1, () => this.car.destroy(), arrival.leaveSeconds * 1000, 'Sine.easeIn');
        hooks.welcome();
      });
    });
  }

  /** Beside the car's passenger door, towards grandma's when facing down the street; plus an offset. */
  private meetingPoint(dx: number, dy: number): Point {
    const stop = this.route.route[this.route.route.length - 1];
    return { x: stop.x - 2.2 + dx, y: stop.y + dy };
  }

  /**
   * Along `curve` from `from` to `to` (0–1 of its length) at the car's speed,
   * slowing into each stop and pulling away from it.
   */
  private drive(curve: Phaser.Curves.Spline, from: number, to: number, then: () => void, ms?: number, ease = 'Sine.easeInOut'): void {
    const meters = (curve.getLength() / this.px) * (to - from);
    const duration = ms ?? Math.max(600, (meters / arrival.speedMetersPerSecond) * 1000 * 1.4);
    this.scene.tweens.addCounter({
      from,
      to,
      duration,
      ease,
      onUpdate: (tween) => this.carAt(curve, tween.getValue() ?? to),
      onComplete: then,
    });
  }

  private carAt(curve: Phaser.Curves.Spline, t: number): void {
    const at = curve.getPointAt(t);
    const dir = curve.getTangentAt(t);
    this.car.setPosition(at.x, at.y).setRotation(Math.atan2(dir.y, dir.x) + Math.PI / 2);
  }

  private spline(points: Point[]): Phaser.Curves.Spline {
    return new Phaser.Curves.Spline(points.map((p) => new Phaser.Math.Vector2(p.x * this.px, p.y * this.px)));
  }
}
