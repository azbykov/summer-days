import Phaser from 'phaser';
import type { Needs } from '../systems/Needs';

const BAR_WIDTH = 70;
const BAR_HEIGHT = 7;
const ROW = 13;

const BARS = [
  { key: 'hunger', label: 'еда', color: 0xd08a3a },
  { key: 'thirst', label: 'вода', color: 0x4a8ad0 },
  { key: 'sleep', label: 'сон', color: 0x8a6ac0 },
  // Yellow, like the stamina bar in Diablo 2.
  { key: 'stamina', label: 'силы', color: 0xe0c040 },
] as const;

/** Small bars next to the clock: hunger, thirst, sleep and stamina. */
export class NeedsBars {
  private fills: Phaser.GameObjects.Rectangle[] = [];

  constructor(
    scene: Phaser.Scene,
    private needs: Needs,
    x: number,
    y: number,
  ) {
    BARS.forEach((bar, i) => {
      const top = y + i * ROW;
      scene.add
        .text(x, top - 3, bar.label, { fontFamily: 'monospace', fontSize: '11px', color: '#c8c4b0' })
        .setScrollFactor(0)
        .setDepth(10);
      const left = x + 34;
      scene.add
        .rectangle(left, top, BAR_WIDTH, BAR_HEIGHT, 0x14160f, 0.8)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x55584a)
        .setScrollFactor(0)
        .setDepth(10);
      this.fills.push(
        scene.add.rectangle(left, top, BAR_WIDTH, BAR_HEIGHT, bar.color).setOrigin(0, 0).setScrollFactor(0).setDepth(11),
      );
    });
  }

  refresh(): void {
    BARS.forEach((bar, i) => {
      this.fills[i].width = (BAR_WIDTH * this.needs[bar.key]) / 100;
    });
  }
}
