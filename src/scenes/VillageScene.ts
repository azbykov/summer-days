import Phaser from 'phaser';
import worldConfig from '../content/world.json';
import { GameClock } from '../systems/GameClock';
import { DialogueBox } from '../ui/DialogueBox';
import { DayEvents } from '../world/DayEvents';
import { buildLayout, type Block, type BlockKind, type Layout, type Road } from '../world/layout';

const PX = worldConfig.pxPerMeter;
const WALK_SPEED = worldConfig.walkSpeedMetersPerSecond * PX;
const BIKE_SPEED = worldConfig.bikeSpeedMetersPerSecond * PX;
const BIKE_REACH = worldConfig.bikeReachMeters * PX;

const COLOR_GRASS = 0x4f6b3a;
const COLOR_PLAYER = 0xf0e0bd;
const COLOR_BIKE_FRAME = 0x8fa3a0;
const COLOR_BIKE_TYRE = 0x1e1e1c;
const COLOR_GRANDMA = 0x8a5a9a;
const COLOR_GRANDPA = 0x5a6a8a;
const COLOR_COW = 0x4a3a30;
const COLOR_COW_OURS = 0xb86a30;

const ROAD_COLORS: Record<Road['kind'], number> = {
  sand: 0xb8a27a,
  asphalt: 0x56585a,
  path: 0x9c8a63,
};

const BLOCK_COLORS: Record<BlockKind, number> = {
  grandmaHouse: 0xc89a4a,
  barn: 0x5b4a3a,
  house: 0x6b5440,
  club: 0xe8e4d8,
  memorial: 0x9a9a92,
  busStop: 0x6f9aa8,
  kiosk: 0x5d7380,
  shop: 0x8a6a50,
  grandpaHouse: 0x7a5a40,
  garage: 0x6a6a64,
  garageFloor: 0x8a8a80,
  workbench: 0x7a5a38,
  motorcycle: 0x7a2a22,
  field: 0x6a8f48,
  square: 0x6a7448,
  treeBelt: 0x2f4a26,
  water: 0x3c6e8f,
  beach: 0xcdb98a,
  forest: 0x2c4424,
};

/**
 * One scene for the whole MVP map: Vysokaya, both roads and Shestovo.
 * Layout is placeholder geometry on real coordinates (src/world/layout.ts).
 */
export class VillageScene extends Phaser.Scene {
  private clock = new GameClock();
  private player!: Phaser.Physics.Arcade.Sprite;
  /** The bicycle stays wherever it was left; hidden while ridden. */
  private bike!: Phaser.GameObjects.Image;
  private riding = false;
  /** One prompt for whatever the player can do right here. */
  private hint!: Phaser.GameObjects.Text;
  private useKey!: Phaser.Input.Keyboard.Key;
  private noKey!: Phaser.Input.Keyboard.Key;
  private numberKeys!: Phaser.Input.Keyboard.Key[];
  private dialogue!: DialogueBox;
  private day!: DayEvents;
  private overlay!: Phaser.GameObjects.Rectangle;
  private dayOver = false;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private clockText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('village');
  }

  create(): void {
    this.createTextures();
    const layout = buildLayout();
    const { minX, minY, maxX, maxY } = layout.bounds;
    const width = (maxX - minX) * PX;
    const height = (maxY - minY) * PX;
    const left = minX * PX;
    const top = minY * PX;

    this.physics.world.setBounds(left, top, width, height);
    this.add.rectangle(left, top, width, height, COLOR_GRASS).setOrigin(0, 0);

    this.obstacles = this.physics.add.staticGroup();
    const ground = layout.blocks.filter((b) => !b.solid);
    const solid = layout.blocks.filter((b) => b.solid);
    ground.forEach((b) => this.addBlock(b));
    layout.roads.forEach((r) => this.addRoad(r));
    solid.forEach((b) => this.addBlock(b));
    layout.blocks.filter((b) => b.label).forEach((b) => this.addLabel(b));

    this.bike = this.add.image(layout.bikeStart.x * PX, layout.bikeStart.y * PX, 'bike').setDepth(1);
    this.hint = this.add
      .text(0, 0, '', { fontFamily: 'monospace', fontSize: '12px', color: '#f4efe0', backgroundColor: '#00000088', padding: { x: 3, y: 1 } })
      .setOrigin(0.5, 1)
      .setDepth(6)
      .setVisible(false);

    this.player = this.physics.add.sprite(layout.playerStart.x * PX, layout.playerStart.y * PX, 'player');
    this.player.setCollideWorldBounds(true).setDepth(2);
    this.physics.add.collider(this.player, this.obstacles);

    this.cameras.main.setBounds(left, top, width, height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.useKey = this.input.keyboard!.addKey('E');
    this.noKey = this.input.keyboard!.addKey('Q');
    this.numberKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].map((k) => this.input.keyboard!.addKey(k));

    this.clockText = this.add
      .text(12, 10, '', { fontFamily: 'monospace', fontSize: '18px', color: '#e8e2cf' })
      .setScrollFactor(0)
      .setDepth(10);

    this.overlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(30)
      .setAlpha(0);
    this.dialogue = new DialogueBox(this);
    this.day = new DayEvents(
      this,
      layout,
      this.clock,
      this.dialogue,
      PX,
      (then, holdMs) => this.fadeThrough(then, holdMs),
      (title) => this.endDay(title),
    );
    if (!this.devStart(layout)) this.day.start();
  }

  /**
   * Development shortcut: ?start=garage puts the player by grandpa's garage at
   * noon, ?start=herd at the bus stop just before the herd. Skips the morning.
   */
  private devStart(layout: Layout): boolean {
    const start = new URLSearchParams(window.location.search).get('start');
    const { spots } = layout;
    const at = start === 'garage' ? spots.garageFront : start === 'herd' ? { x: spots.herdMeeting.x + 4, y: spots.herdMeeting.y } : null;
    if (!at) return false;
    this.clock.advance((start === 'garage' ? 12 * 60 : 18 * 60 + 50) - this.clock.minutes);
    this.player.body!.reset(at.x * PX, at.y * PX);
    this.bike.setPosition((at.x + 3) * PX, (at.y + 1) * PX);
    this.cameras.main.centerOn(at.x * PX, at.y * PX);
    return true;
  }

  update(_time: number, delta: number): void {
    if (this.dayOver) return;
    this.clock.update(delta);
    this.clockText.setText(this.clock.format());
    const here = { x: this.player.x / PX, y: this.player.y / PX };
    // The world keeps going during conversations: the herd does not wait.
    this.day.update(here, delta / 1000);

    if (this.dialogue.open || this.overlay.alpha > 0) {
      if (Phaser.Input.Keyboard.JustDown(this.useKey)) this.dialogue.press('use');
      if (Phaser.Input.Keyboard.JustDown(this.noKey)) this.dialogue.press('no');
      this.numberKeys.forEach((k, i) => Phaser.Input.Keyboard.JustDown(k) && this.dialogue.press(i + 1));
      this.player.setVelocity(0, 0);
      this.hint.setVisible(false);
      return;
    }

    const direction = new Phaser.Math.Vector2(0, 0);
    if (this.cursors.left.isDown || this.keys.A.isDown) direction.x -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) direction.x += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) direction.y -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) direction.y += 1;

    // People and the door come first; the bike otherwise.
    const action = this.day.interactionAt(here);
    if (Phaser.Input.Keyboard.JustDown(this.useKey)) {
      if (action) {
        this.player.setVelocity(0, 0);
        action.run();
        return;
      }
      if (this.riding) this.dismount();
      else if (this.nearBike()) this.mount();
    }
    if (action) {
      this.hint.setText(action.hint).setPosition(action.at.x * PX, action.at.y * PX - 16).setVisible(true);
    } else {
      this.hint.setText('E — сесть').setPosition(this.bike.x, this.bike.y - 14).setVisible(!this.riding && this.nearBike());
    }

    if (!this.riding) {
      direction.normalize().scale(WALK_SPEED);
      this.player.setVelocity(direction.x, direction.y);
      return;
    }

    // The bike gathers speed and coasts instead of stopping dead.
    const pedalling = direction.lengthSq() > 0;
    const target = direction.normalize().scale(BIKE_SPEED);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const seconds = pedalling ? worldConfig.bikeSecondsToFullSpeed : worldConfig.bikeCoastSecondsToStop;
    const maxChange = (BIKE_SPEED / seconds) * (delta / 1000);
    const change = target.subtract(body.velocity);
    if (change.length() > maxChange) change.setLength(maxChange);
    body.velocity.add(change);
    if (body.velocity.length() > 20) {
      this.player.setRotation(Math.atan2(body.velocity.y, body.velocity.x) + Math.PI / 2);
    }
  }

  /** Black out, let something happen off-screen, come back. */
  private fadeThrough(then: () => void, holdMs = 400): void {
    this.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: 500,
      onComplete: () =>
        this.time.delayedCall(holdMs, () => {
          then();
          this.tweens.add({ targets: this.overlay, alpha: 0, duration: 500 });
        }),
    });
  }

  private endDay(title: string): void {
    this.dayOver = true;
    this.player.setVelocity(0, 0);
    this.hint.setVisible(false);
    const text = this.add
      .text(this.scale.width / 2, this.scale.height / 2, title, { fontFamily: 'monospace', fontSize: '32px', color: '#e8e2cf' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(31)
      .setAlpha(0);
    this.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: 1500,
      onComplete: () => this.tweens.add({ targets: text, alpha: 1, duration: 1200 }),
    });
  }

  private nearBike(): boolean {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bike.x, this.bike.y) < BIKE_REACH;
  }

  private mount(): void {
    this.riding = true;
    this.bike.setVisible(false);
    this.player.setPosition(this.bike.x, this.bike.y).setTexture('rider').setRotation(this.bike.rotation);
  }

  /** Leave the bike exactly where the player stopped. */
  private dismount(): void {
    this.riding = false;
    this.bike.setPosition(this.player.x, this.player.y).setRotation(this.player.rotation).setVisible(true);
    // Step off to the right of the bike so it stays visible.
    const side = this.player.rotation;
    this.player.body!.reset(this.player.x + Math.cos(side) * PX * 1.2, this.player.y + Math.sin(side) * PX * 1.2);
    this.player.setTexture('player').setRotation(0);
  }

  private createTextures(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);

    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 1, 1);
    graphics.generateTexture('block', 1, 1);

    graphics.clear();
    graphics.fillStyle(COLOR_PLAYER, 1);
    graphics.fillRect(0, 0, 14, 22);
    graphics.generateTexture('player', 14, 22);

    // Top-down bicycle pointing up: ~0.6 x 1.8 m.
    graphics.clear();
    this.drawBike(graphics);
    graphics.generateTexture('bike', 14, 24);

    graphics.clear();
    this.drawBike(graphics);
    graphics.fillStyle(COLOR_PLAYER, 1);
    graphics.fillRect(2, 8, 10, 9);
    graphics.generateTexture('rider', 14, 24);

    for (const [key, color] of [['grandma', COLOR_GRANDMA], ['grandpa', COLOR_GRANDPA], ['kid', 0xffffff]] as const) {
      graphics.clear();
      graphics.fillStyle(color, 1);
      graphics.fillRect(0, 0, 14, key === 'kid' ? 18 : 22);
      graphics.generateTexture(key, 14, key === 'kid' ? 18 : 22);
    }

    // Top-down cow pointing up: ~1 x 2.2 m, head first.
    for (const [key, color] of [['cow', COLOR_COW], ['cowOurs', COLOR_COW_OURS]] as const) {
      graphics.clear();
      graphics.fillStyle(color, 1);
      graphics.fillRect(1, 6, 12, 22);
      graphics.fillRect(3, 0, 8, 7);
      graphics.generateTexture(key, 14, 28);
    }

    graphics.clear();
    graphics.fillStyle(0xf0f0e8, 1);
    graphics.fillCircle(3, 3, 3);
    graphics.generateTexture('ball', 6, 6);

    graphics.destroy();
  }

  private drawBike(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(COLOR_BIKE_TYRE, 1);
    graphics.fillRect(6, 0, 2, 7);
    graphics.fillRect(6, 17, 2, 7);
    graphics.fillStyle(COLOR_BIKE_FRAME, 1);
    graphics.fillRect(6, 6, 2, 12);
    // Handlebar.
    graphics.fillRect(2, 4, 10, 2);
  }

  private addRoad(road: Road): void {
    const graphics = this.add.graphics();
    const width = road.width * PX;
    const color = ROAD_COLORS[road.kind];
    graphics.lineStyle(width, color, 1);
    graphics.fillStyle(color, 1);
    const points = road.points.map((p) => new Phaser.Math.Vector2(p.x * PX, p.y * PX));
    graphics.strokePoints(points);
    // Round joints so bends do not show gaps.
    points.forEach((p) => graphics.fillCircle(p.x, p.y, width / 2));
  }

  private addBlock(block: Block): void {
    const color = BLOCK_COLORS[block.kind];
    if (!block.solid) {
      this.add.rectangle(block.x * PX, block.y * PX, block.w * PX, block.h * PX, color);
      return;
    }
    const obstacle = this.obstacles
      .create(block.x * PX, block.y * PX, 'block')
      .setTint(color)
      .setDisplaySize(block.w * PX, block.h * PX) as Phaser.Physics.Arcade.Image;
    obstacle.refreshBody();
  }

  /** Temporary development labels, like the clock readout. */
  private addLabel(block: Block): void {
    this.add
      .text(block.x * PX, (block.y - block.h / 2) * PX - 4, block.label!, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#f4efe0',
        backgroundColor: '#00000088',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(5);
  }
}
