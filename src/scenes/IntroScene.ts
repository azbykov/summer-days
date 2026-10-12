import Phaser from 'phaser';
import intro from '../content/intro.json';
import { isTouchDevice } from '../ui/VirtualKeys';
import { Summer } from '../world/Summer';

const FADE_IN = 900;
const FADE_OUT = 600;
/** How long a card stays up: a pause plus time to read it. */
const HOLD_BASE = 1800;
const HOLD_PER_CHAR = 45;

/**
 * Before a new summer: a few quiet cards on black about who the player is
 * and how they got to grandma's (src/content/intro.json). Space, E, Enter or
 * a tap moves to the next card; Esc skips the rest. Then the first morning.
 */
export class IntroScene extends Phaser.Scene {
  private index = -1;
  private text!: Phaser.GameObjects.Text;
  private timer: Phaser.Time.TimerEvent | null = null;
  private leaving = false;

  constructor() {
    super('intro');
  }

  create(): void {
    const { width, height } = this.scale;
    this.index = -1;
    this.leaving = false;
    this.cameras.main.setBackgroundColor('#000000');
    this.text = this.add
      .text(width / 2, height / 2, '', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#e8e2cf',
        // A block in the middle, read like a page: lines start at its left edge.
        align: 'left',
        lineSpacing: 10,
        wordWrap: { width: width - 160 },
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height - 24, isTouchDevice() ? 'тап — дальше' : 'пробел — дальше   Esc — пропустить', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#5a584c',
      })
      .setOrigin(0.5, 1);

    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-SPACE', () => this.next());
    keyboard.on('keydown-E', () => this.next());
    keyboard.on('keydown-ENTER', () => this.next());
    keyboard.on('keydown-ESC', () => this.begin());
    this.input.on('pointerdown', () => this.next());
    this.next();
  }

  private next(): void {
    if (this.leaving) return;
    this.timer?.remove();
    this.tweens.killTweensOf(this.text);
    this.index += 1;
    const card = intro.cards[this.index];
    if (!card) {
      this.begin();
      return;
    }
    const content = card.join('\n');
    this.text.setText(content).setAlpha(0);
    const hold = HOLD_BASE + content.length * HOLD_PER_CHAR;
    this.tweens.add({ targets: this.text, alpha: 1, duration: FADE_IN });
    this.timer = this.time.delayedCall(FADE_IN + hold, () =>
      this.tweens.add({ targets: this.text, alpha: 0, duration: FADE_OUT, onComplete: () => this.next() }),
    );
  }

  /** The first morning of the summer. */
  private begin(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.input.keyboard!.removeAllListeners();
    this.cameras.main.fadeOut(FADE_OUT, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('village', { summer: new Summer() }),
    );
  }
}
