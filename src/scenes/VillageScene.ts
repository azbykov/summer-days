import Phaser from 'phaser';
import { GameClock } from '../systems/GameClock';

const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1600;
const WALK_SPEED = 110;

const COLOR_GRASS = 0x4f6b3a;
const COLOR_ROAD = 0x8a7753;
const COLOR_BUILDING = 0x6b5440;
const COLOR_FENCE = 0x7d6b4f;
const COLOR_PLAYER = 0xf0e0bd;

/**
 * Placeholder top-down space used to validate movement, camera and game time.
 * The real Vysokaya / road / Shestovo layout is not authored yet.
 */
export class VillageScene extends Phaser.Scene {
  private clock = new GameClock();
  private player!: Phaser.Physics.Arcade.Sprite;
  private clockText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('village');
  }

  create(): void {
    this.createTextures();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, COLOR_GRASS).setOrigin(0, 0);
    this.add.rectangle(0, 700, WORLD_WIDTH, 120, COLOR_ROAD).setOrigin(0, 0);

    this.player = this.physics.add.sprite(420, 900, 'player');
    this.player.setCollideWorldBounds(true);

    this.addObstacle(380, 520, 260, 180, COLOR_BUILDING);
    this.addObstacle(700, 560, 120, 100, COLOR_BUILDING);
    this.addObstacle(1300, 480, 300, 200, COLOR_BUILDING);
    this.addObstacle(560, 1180, 420, 20, COLOR_FENCE);
    this.addObstacle(560, 1180, 20, 300, COLOR_FENCE);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    this.clockText = this.add
      .text(12, 10, '', { fontFamily: 'monospace', fontSize: '18px', color: '#e8e2cf' })
      .setScrollFactor(0);
  }

  update(_time: number, delta: number): void {
    this.clock.update(delta);
    this.clockText.setText(this.clock.format());

    const direction = new Phaser.Math.Vector2(0, 0);
    if (this.cursors.left.isDown || this.keys.A.isDown) direction.x -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) direction.x += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) direction.y -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) direction.y += 1;

    direction.normalize().scale(WALK_SPEED);
    this.player.setVelocity(direction.x, direction.y);
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

    graphics.destroy();
  }

  private addObstacle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
  ): void {
    const obstacle = this.physics.add
      .staticImage(x, y, 'block')
      .setTint(color)
      .setDisplaySize(width, height)
      .refreshBody();

    this.physics.add.collider(this.player, obstacle);
  }
}
