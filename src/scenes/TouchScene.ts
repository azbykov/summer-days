import Phaser from 'phaser';
import { isTouchDevice, keyDown, keyUp, releaseAll, tapKey, type VirtualKey } from '../ui/VirtualKeys';
import type { VillageScene } from './VillageScene';

const STICK_RADIUS = 60;
/** Under this share of the radius the stick does nothing. */
const DEAD_ZONE = 0.25;
/** Pushed this far, the player runs (holds Shift). */
const RUN_FROM = 0.9;
/** sin 22.5°: past it a component counts, giving eight directions. */
const AXIS = 0.38;
/** Leaves the inventory row at the top free for taps. */
const STICK_TOP = 170;

type Button = { root: Phaser.GameObjects.Container; key: VirtualKey };

/**
 * Controls for tablets, drawn over the village: a stick that appears where
 * the left thumb lands, E / Q / T buttons on the right and a pause button.
 * They press the keyboard's keys (VirtualKeys). Hidden whenever the village
 * is not taking steps — in talks, fades, the menu and the pause screen —
 * since talks and menus are tapped directly.
 */
export class TouchScene extends Phaser.Scene {
  private zone!: Phaser.GameObjects.Zone;
  private base!: Phaser.GameObjects.Arc;
  private knob!: Phaser.GameObjects.Arc;
  private stickPointer: number | null = null;
  private stickOrigin = new Phaser.Math.Vector2();
  private buttons: Button[] = [];
  private pauseButton!: Button;
  private shown = true;

  constructor() {
    // Starts on its own with the game, on touch devices only.
    super({ key: 'touch', active: isTouchDevice() });
  }

  create(): void {
    const { width, height } = this.scale;
    this.zone = this.add
      .zone(0, STICK_TOP, width * 0.45, height - STICK_TOP)
      .setOrigin(0, 0)
      .setInteractive()
      .on('pointerdown', (p: Phaser.Input.Pointer) => this.grabStick(p));
    this.base = this.add.circle(0, 0, STICK_RADIUS, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.35).setVisible(false);
    this.knob = this.add.circle(0, 0, 26, 0xffffff, 0.35).setVisible(false);
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => p.id === this.stickPointer && this.moveStick(p));
    const release = (p: Phaser.Input.Pointer) => p.id === this.stickPointer && this.dropStick();
    this.input.on('pointerup', release);
    // Let go off the canvas: past the letterbox bars, or with a mouse.
    this.input.on('pointerupoutside', release);

    this.buttons = [
      this.button(width - 80, height - 90, 46, 'E', 'действие', 'KeyE'),
      this.button(width - 190, height - 60, 34, 'Q', 'сумка', 'KeyQ'),
      this.button(width - 70, height - 210, 30, 'T', 'ждать', 'KeyT'),
    ];
    this.pauseButton = this.button(width - 36, 36, 24, 'II', '', 'KeyP');
    this.game.events.on(Phaser.Core.Events.BLUR, () => this.dropStick());
  }

  update(): void {
    const village = this.scene.get('village') as VillageScene;
    const playing = this.scene.isActive('village');
    this.pauseButton.root.setVisible(playing);
    setEnabled(this.pauseButton.root, playing);
    this.show(playing && village.takesSteps);
  }

  private show(shown: boolean): void {
    if (shown === this.shown) return;
    this.shown = shown;
    if (!shown) this.dropStick();
    setEnabled(this.zone, shown);
    for (const { root } of this.buttons) {
      root.setVisible(shown);
      setEnabled(root, shown);
    }
  }

  private button(x: number, y: number, radius: number, letter: string, caption: string, key: VirtualKey): Button {
    const circle = this.add.circle(0, 0, radius, 0x14160f, 0.55).setStrokeStyle(2, 0xe8e2cf, 0.6);
    const label = this.add
      .text(0, caption ? -6 : 0, letter, { fontFamily: 'monospace', fontSize: `${Math.round(radius * 0.7)}px`, color: '#f4efe0' })
      .setOrigin(0.5);
    const parts: Phaser.GameObjects.GameObject[] = [circle, label];
    if (caption) {
      parts.push(
        this.add
          .text(0, radius * 0.45, caption, { fontFamily: 'monospace', fontSize: '11px', color: '#c8c4b0' })
          .setOrigin(0.5),
      );
    }
    const root = this.add.container(x, y, parts).setSize(radius * 2.4, radius * 2.4);
    root
      // Hit areas are measured from the container's top-left corner.
      .setInteractive(new Phaser.Geom.Circle(radius * 1.2, radius * 1.2, radius * 1.2), Phaser.Geom.Circle.Contains)
      .on('pointerdown', () => {
        circle.setFillStyle(0xe8e2cf, 0.35);
        tapKey(key);
      })
      .on('pointerup', () => circle.setFillStyle(0x14160f, 0.55))
      .on('pointerout', () => circle.setFillStyle(0x14160f, 0.55));
    return { root, key };
  }

  private grabStick(pointer: Phaser.Input.Pointer): void {
    if (this.stickPointer !== null) return;
    this.stickPointer = pointer.id;
    this.stickOrigin.set(pointer.x, pointer.y);
    this.base.setPosition(pointer.x, pointer.y).setVisible(true);
    this.knob.setPosition(pointer.x, pointer.y).setVisible(true);
  }

  private moveStick(pointer: Phaser.Input.Pointer): void {
    const offset = new Phaser.Math.Vector2(pointer.x - this.stickOrigin.x, pointer.y - this.stickOrigin.y);
    if (offset.length() > STICK_RADIUS) offset.setLength(STICK_RADIUS);
    this.knob.setPosition(this.stickOrigin.x + offset.x, this.stickOrigin.y + offset.y);
    const push = offset.length() / STICK_RADIUS;
    const dir = offset.normalize();
    const moving = push > DEAD_ZONE;
    hold('ArrowLeft', moving && dir.x < -AXIS);
    hold('ArrowRight', moving && dir.x > AXIS);
    hold('ArrowUp', moving && dir.y < -AXIS);
    hold('ArrowDown', moving && dir.y > AXIS);
    hold('ShiftLeft', moving && push >= RUN_FROM);
  }

  private dropStick(): void {
    this.stickPointer = null;
    this.base?.setVisible(false);
    this.knob?.setVisible(false);
    releaseAll();
  }
}

function hold(key: VirtualKey, down: boolean): void {
  if (down) keyDown(key);
  else keyUp(key);
}

function setEnabled(object: Phaser.GameObjects.GameObject, enabled: boolean): void {
  if (object.input) object.input.enabled = enabled;
}
