import Phaser from 'phaser';
import config from '../content/friends.json';
import { clockTime } from '../systems/GameClock';
import type { DialogueBox, Line } from '../ui/DialogueBox';
import type { Hangout, Point } from './layout';
import type { Navigation } from './Navigation';

type InviteKind = keyof typeof config.invites;

type Friend = {
  name: string;
  image: Phaser.GameObjects.Image;
  hangouts: Hangout[];
  invites: InviteKind[];
  /** Waypoints still to walk, in meters. */
  route: Point[];
  /** Game minute until which the friend stays put. */
  staysUntil: number;
  /** Where the friend is or is heading. */
  at: Hangout;
  /** An accepted invite: the friend waits at its place until it ends. */
  plan: InviteKind | null;
  asked: Set<InviteKind>;
  smallTalk: number;
};

/**
 * The player's friends. On their own they drift between hangouts — the pump,
 * the club, the fields, grandma's bench — along the streets. When something
 * is on (football, swimming) they call the player along once; agreeing sends
 * them ahead to wait there. Nobody waits forever and nobody minds a "no".
 *
 * Out of the player's sight they walk faster, so the village keeps up with
 * the compressed clock without anyone visibly sprinting.
 */
export class Friends {
  private friends: Friend[] = [];
  private seed = 7;
  /** Game minutes, as of the last update. */
  private now = 0;

  constructor(
    scene: Phaser.Scene,
    private hangouts: Record<Hangout, Point>,
    private navigation: Navigation,
    private dialogueBox: DialogueBox,
    private px: number,
    private swim: (withFriend: string | null) => void,
    /** Whatever a friend says first, e.g. that the player looks half asleep. */
    private remark: (friend: string) => Line[],
  ) {
    for (const f of config.friends) {
      const start = hangouts[f.start as Hangout];
      const image = scene.add
        .image(start.x * px, start.y * px, 'friend')
        .setTint(Phaser.Display.Color.HexStringToColor(f.color).color)
        .setDepth(2);
      this.friends.push({
        name: f.name,
        image,
        hangouts: f.hangouts as Hangout[],
        invites: f.invites as InviteKind[],
        route: [],
        staysUntil: 0,
        at: f.start as Hangout,
        plan: null,
        asked: new Set(),
        smallTalk: 0,
      });
    }
  }

  update(now: number, player: Point, dt: number): void {
    this.now = now;
    for (const friend of this.friends) {
      const here = this.position(friend);
      if (friend.route.length > 0) {
        const unseen = distance(here, player) > config.unseenDistanceMeters;
        const speed = config.walkSpeedMetersPerSecond * (unseen ? config.unseenSpeedMultiplier : 1);
        this.walk(friend, here, speed * dt);
        continue;
      }
      if (friend.plan && now >= clockTime(config.invites[friend.plan].to)) friend.plan = null;
      if (!friend.plan && now >= friend.staysUntil) this.wander(friend);
    }
    this.callOut(now, player);
  }

  /** The friend within reach, if any, for the "E — говорить" prompt. */
  near(player: Point, reach: number): { at: Point; talk: () => void } | null {
    const friend = this.friends.find((f) => distance(this.position(f), player) < reach);
    if (!friend) return null;
    return { at: this.position(friend), talk: () => this.talk(friend) };
  }

  /** Someone waiting on the beach to swim with the player. */
  swimmerAtBeach(): string | null {
    const friend = this.friends.find((f) => f.plan === 'swim' && f.at === 'beach' && f.route.length === 0);
    return friend?.name ?? null;
  }

  /** After swimming together the friend heads off again. */
  doneSwimming(name: string): void {
    const friend = this.friends.find((f) => f.name === name);
    if (friend) friend.plan = null;
  }

  private talk(friend: Friend): void {
    if (friend.plan === 'swim' && friend.at === 'beach' && friend.route.length === 0) {
      this.dialogueBox.ask(
        [[friend.name, config.atBeach]],
        () => this.swim(friend.name),
        () => this.dialogueBox.say([[friend.name, config.swim.decline]]),
      );
      return;
    }
    const invite = this.openInvite(friend, this.now);
    if (invite) {
      this.invite(friend, invite);
      return;
    }
    const line = config.smallTalk[(friend.smallTalk + this.friends.indexOf(friend) * 2) % config.smallTalk.length];
    friend.smallTalk += 1;
    this.dialogueBox.say([...this.remark(friend.name), [friend.name, line]]);
  }

  /** A friend with something on calls out once when the player passes by. */
  private callOut(now: number, player: Point): void {
    if (this.dialogueBox.open) return;
    for (const friend of this.friends) {
      if (distance(this.position(friend), player) > config.callRadiusMeters) continue;
      const invite = this.openInvite(friend, now);
      if (invite) {
        this.invite(friend, invite);
        return;
      }
    }
  }

  private openInvite(friend: Friend, now: number): InviteKind | null {
    if (friend.plan) return null;
    return (
      friend.invites.find((kind) => {
        const { from, to } = config.invites[kind];
        return !friend.asked.has(kind) && now >= clockTime(from) && now < clockTime(to);
      }) ?? null
    );
  }

  private invite(friend: Friend, kind: InviteKind): void {
    friend.asked.add(kind);
    const invite = config.invites[kind];
    this.dialogueBox.ask(
      [...this.remark(friend.name), [friend.name, invite.ask]],
      () => {
        friend.plan = kind;
        this.goTo(friend, invite.place as Hangout);
        this.dialogueBox.say([[friend.name, invite.yes]] as Line[]);
      },
      () => this.dialogueBox.say([[friend.name, invite.no]] as Line[]),
    );
  }

  private wander(friend: Friend): void {
    const options = friend.hangouts.filter((h) => h !== friend.at);
    this.goTo(friend, options[this.random(options.length)]);
  }

  private goTo(friend: Friend, hangout: Hangout): void {
    friend.at = hangout;
    friend.route = this.navigation.route(this.position(friend), this.hangouts[hangout]).slice(1);
  }

  private walk(friend: Friend, here: Point, step: number): void {
    const goal = friend.route[0];
    const d = distance(here, goal);
    if (d <= step) {
      friend.route.shift();
      friend.image.setPosition(goal.x * this.px, goal.y * this.px);
      if (friend.route.length === 0) {
        // Arrived: hang around for a while before moving on.
        const [min, max] = config.stayGameMinutes;
        friend.staysUntil = this.now + min + this.random(max - min + 1);
      }
      return;
    }
    friend.image.setPosition((here.x + ((goal.x - here.x) / d) * step) * this.px, (here.y + ((goal.y - here.y) / d) * step) * this.px);
  }

  private position(friend: Friend): Point {
    return { x: friend.image.x / this.px, y: friend.image.y / this.px };
  }

  private random(n: number): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed % n;
  }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
