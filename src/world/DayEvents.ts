import Phaser from 'phaser';
import day from '../content/day.json';
import dialogue from '../content/dialogue.json';
import items from '../content/items.json';
import shopConfig from '../content/shop.json';
import { clockTime, type GameClock } from '../systems/GameClock';
import type { DialogueBox, Line, Option } from '../ui/DialogueBox';
import { Herd } from './Herd';
import { Motorcycle } from './Motorcycle';
import { Inventory, itemName, type ItemId } from './Inventory';
import { Shop } from './Shop';
import type { Layout, Point } from './layout';

const KID_SPEED = 3;

type Interaction = { at: Point; hint: string; run: () => void };

/**
 * The people and events of the one MVP day (docs/MVP.md): grandma's errands,
 * grandpa in Shestovo, football with the local kids, the herd at 19:00 and
 * going to bed. Nothing here is a quest: no markers, no log, no failure.
 */
export class DayEvents {
  readonly herd: Herd;
  readonly motorcycle: Motorcycle;
  readonly shop: Shop;
  readonly inventory = new Inventory();

  private grandma: Phaser.GameObjects.Image;
  private grandpa: Phaser.GameObjects.Image;
  private breadDelivered = false;
  private kids: { image: Phaser.GameObjects.Image; goal: Point }[] = [];
  private ball: Phaser.GameObjects.Image;

  private visitedGrandpa = false;
  private football: 'notAsked' | 'played' | 'declined' = 'notAsked';
  private footballOffered = false;
  private eveningTalkDone = false;
  private footballFrom = clockTime(day.football.from);
  private footballTo = clockTime(day.football.to);
  private doorOpensAt = clockTime(day.home.doorOpensAt);

  constructor(
    private scene: Phaser.Scene,
    private layout: Layout,
    private clock: GameClock,
    private dialogueBox: DialogueBox,
    private px: number,
    private fade: (then: () => void, holdMs?: number) => void,
    private endDay: (title: string) => void,
    izh: { position: () => Point; ride: () => void },
  ) {
    const { spots } = layout;
    this.grandma = this.person(spots.grandma, 'grandma');
    this.grandpa = this.person(spots.grandpa, 'grandpa');
    this.person(spots.seller, 'seller');
    for (let i = 0; i < day.football.players; i++) {
      const start = this.randomOnField(i);
      this.kids.push({ image: this.person(start, 'kid').setTint(KID_TINTS[i % KID_TINTS.length]), goal: start });
    }
    this.ball = scene.add.image(0, 0, 'ball').setDepth(2);
    this.herd = new Herd(scene, layout.herdPath, layout.herdHomePath, spots.barnDoor, px);
    this.motorcycle = new Motorcycle(dialogueBox, izh.position, spots.workbench, izh.ride, this.inventory);
    this.shop = new Shop(dialogueBox, this.inventory, () => clock.minutes);
  }

  /** Grandma is in the yard when the day starts and tells what today is about. */
  start(): void {
    this.skipMorning();
    this.dialogueBox.choose(lines('grandmaMorning'), [this.askWhereGrandpaLives()]);
  }

  /**
   * The player picked a slot in the open inventory. Some things can be eaten
   * or drunk; that is all they do — no stats, nothing gained.
   */
  useSlot(index: number): void {
    const slot = this.inventory.contents[index];
    if (!slot) return;
    const item: { name: string; use?: { verb: string; text: string } } = items.items[slot.id];
    const name = itemName(slot.id);
    const title = name.charAt(0).toUpperCase() + name.slice(1);
    if (!item.use) {
      this.dialogueBox.say([['', `${title}. Пусть пока полежит.`]]);
      return;
    }
    const use = item.use;
    this.dialogueBox.choose([['', title]], [
      {
        label: use.verb,
        run: () => {
          this.inventory.take(slot.id);
          this.dialogueBox.say([['', use.text]]);
        },
      },
    ]);
  }

  /** What the morning talk leaves the player with, for starts that skip it. */
  skipMorning(): void {
    this.inventory.rubles += shopConfig.grandmaGivesRubles;
  }

  /** The player can always ask grandma the way; she tells it like people do. */
  private askWhereGrandpaLives(): Option {
    return { label: 'спросить, где дом деда', run: () => this.dialogueBox.say(lines('grandmaWhereGrandpa')) };
  }

  update(player: Point, dt: number): void {
    const now = this.clock.minutes;
    this.herd.update(now, player, dt);
    this.updateFootball(player, now, dt);
  }

  /** The closest thing the player can do right here, if any. */
  interactionAt(player: Point): Interaction | null {
    const reach = day.talkRadiusMeters;
    const { spots } = this.layout;
    const talk = 'E — говорить';
    const candidates: (Interaction & { reach: number })[] = [
      { at: this.at(this.grandma), hint: talk, reach, run: () => this.talkToGrandma() },
      { at: this.at(this.grandpa), hint: talk, reach, run: () => this.talkToGrandpa() },
      { at: spots.door, hint: 'E — в дом', reach, run: () => this.goInside() },
      { at: spots.counter, hint: 'E — магазин', reach, run: () => this.shop.visit() },
      { at: this.motorcycle.position(), hint: 'E — ИЖ', reach: 2.5, run: () => this.motorcycle.inspect() },
      { at: spots.workbench, hint: 'E — верстак', reach: 2, run: () => this.motorcycle.inspectWorkbench() },
    ];
    if (this.kidsPresent()) {
      for (const kid of this.kids) {
        candidates.push({ at: this.at(kid.image), hint: talk, reach: reach * 2, run: () => this.talkToKids() });
      }
    }
    let best: Interaction | null = null;
    let bestDistance = Infinity;
    for (const c of candidates) {
      const d = Math.hypot(player.x - c.at.x, player.y - c.at.y);
      if (d < c.reach && d < bestDistance) {
        best = c;
        bestDistance = d;
      }
    }
    return best;
  }

  private talkToGrandma(): void {
    if (this.herd.cowMetBy !== null) {
      this.dialogueBox.say(this.eveningLines(), () => (this.eveningTalkDone = true));
      return;
    }
    const bread = this.handOverBread();
    if (this.visitedGrandpa) {
      this.dialogueBox.say([...bread, ...lines('grandmaDayAfterGrandpa')]);
      return;
    }
    this.dialogueBox.choose([...bread, ...lines('grandmaDayBeforeGrandpa')], [this.askWhereGrandpaLives()]);
  }

  /** Bread in the pocket goes to grandma; without it she reminds once per talk. */
  private handOverBread(): Line[] {
    if (this.breadDelivered) return [];
    const bread = shopConfig.errandItem as ItemId;
    if (!this.inventory.has(bread)) return lines('grandmaBreadReminder');
    this.inventory.take(bread);
    this.breadDelivered = true;
    return lines('grandmaBreadBrought');
  }

  private eveningLines(): Line[] {
    const cow = this.herd.cowMetBy;
    const bread = this.handOverBread();
    return [
      ...(this.breadDelivered ? bread : lines('grandmaEveningNoBread')),
      ...lines(this.visitedGrandpa ? 'grandmaEveningGrandpaVisited' : 'grandmaEveningGrandpaMissed'),
      ...(cow === 'player' ? lines('grandmaEveningCowByPlayer') : []),
      ...(cow === 'grandma' ? lines('grandmaEveningCowByGrandma') : []),
      ...(this.motorcycle.ridden
        ? lines('grandmaEveningMotorcycleRidden')
        : this.motorcycle.started
        ? lines('grandmaEveningMotorcycleStarted')
        : this.motorcycle.tried
          ? lines('grandmaEveningMotorcycleTried')
          : []),
      ...lines('grandmaEveningEnd'),
    ];
  }

  private talkToGrandpa(): void {
    if (this.visitedGrandpa) {
      this.dialogueBox.say(lines('grandpaAgain'));
      return;
    }
    this.visitedGrandpa = true;
    this.dialogueBox.say(lines('grandpaFirst'));
  }

  private talkToKids(): void {
    if (this.football === 'played') {
      this.dialogueBox.say(lines('footballAfter'));
      return;
    }
    this.offerFootball();
  }

  private offerFootball(): void {
    this.footballOffered = true;
    this.dialogueBox.ask(
      lines('footballOffer'),
      () =>
        this.fade(() => {
          this.clock.advance(day.football.matchMinutes);
          this.football = 'played';
          this.dialogueBox.say(lines('footballPlayed'));
        }, 600),
      () => {
        this.football = 'declined';
        this.dialogueBox.say(lines('footballDeclined'));
      },
    );
  }

  private goInside(): void {
    if (this.clock.minutes < this.doorOpensAt) {
      this.dialogueBox.say(lines('doorTooEarly'));
      return;
    }
    // Grandma has her say before bed, even if the player walks straight in.
    if (!this.eveningTalkDone) {
      this.eveningTalkDone = true;
      this.dialogueBox.say(this.eveningLines(), () => this.endDay(dialogue.dayEnd));
      return;
    }
    this.endDay(dialogue.dayEnd);
  }

  private kidsPresent(): boolean {
    const now = this.clock.minutes;
    return now >= this.footballFrom && now < this.footballTo;
  }

  private updateFootball(player: Point, now: number, dt: number): void {
    const present = this.kidsPresent();
    this.kids.forEach((k) => k.image.setVisible(present));
    this.ball.setVisible(present);
    if (!present) return;

    for (const [i, kid] of this.kids.entries()) {
      const here = this.at(kid.image);
      if (near(here, kid.goal, 0.5)) kid.goal = this.randomOnField(i + Math.floor(now));
      const d = Math.hypot(kid.goal.x - here.x, kid.goal.y - here.y);
      const step = Math.min(d, KID_SPEED * dt);
      kid.image.setPosition((here.x + ((kid.goal.x - here.x) / d) * step) * this.px, (here.y + ((kid.goal.y - here.y) / d) * step) * this.px);
    }
    const withBall = this.kids[Math.floor(now / 3) % this.kids.length].image;
    this.ball.setPosition(withBall.x + 8, withBall.y + 10);

    // The kids call out once when the player comes close; after that the player can ask them.
    const field = this.layout.spots.football;
    if (!this.footballOffered && !this.dialogueBox.open && near(player, field, day.football.offerRadiusMeters + field.w / 2)) {
      this.offerFootball();
    }
  }

  private randomOnField(seed: number): Point {
    const field = this.layout.spots.football;
    const r1 = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
    const r2 = Math.abs(Math.sin(seed * 78.233) * 12345.6789) % 1;
    return { x: field.x + (r1 - 0.5) * (field.w - 4), y: field.y + (r2 - 0.5) * (field.h - 4) };
  }

  private person(p: Point, texture: string): Phaser.GameObjects.Image {
    return this.scene.add.image(p.x * this.px, p.y * this.px, texture).setDepth(2);
  }

  private at(image: Phaser.GameObjects.Image): Point {
    return { x: image.x / this.px, y: image.y / this.px };
  }
}

const KID_TINTS = [0xe05a4a, 0x4a7ae0, 0xe0c04a, 0x5ac06a, 0xd0d0d0];

function lines(key: keyof typeof dialogue): Line[] {
  return dialogue[key] as Line[];
}

function near(a: Point, b: Point, meters: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < meters;
}
