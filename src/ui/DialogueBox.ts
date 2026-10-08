import Phaser from 'phaser';
import portraits from '../content/portraits.json';

export type Line = [speaker: string, text: string];

type Choice = { onYes: () => void; onNo: () => void };

export type Option = { label: string; run: () => void };

const PORTRAIT_SIZE = Object.values(portraits.faces)[0].length * portraits.scale;
const PANEL_HEIGHT = PORTRAIT_SIZE + 16;
const MARGIN = 12;
const PADDING = 16;

/**
 * Plain speech at the bottom of the screen, with a pixel face of whoever is
 * speaking on the left. No quest log: people just say things
 * (docs/GAME_DESIGN.md, «Минимум quest markers»).
 *
 * E advances. A conversation can end in a yes/no question: E — yes, Q — no,
 * or in a short list of things to do: a number picks one, Q leaves.
 */
export class DialogueBox {
  private panel: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private portrait: Phaser.GameObjects.Image;
  private lines: Line[] = [];
  private choice: Choice | null = null;
  private options: Option[] = [];
  private onDone: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    this.panel = scene.add
      .rectangle(width / 2, height - MARGIN, width - MARGIN * 2, PANEL_HEIGHT, 0x14160f, 0.88)
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0x6a6a5a)
      .setScrollFactor(0)
      .setDepth(20);
    this.text = scene.add
      .text(0, height - MARGIN - PANEL_HEIGHT + 12, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#f4efe0',
        wordWrap: { width: width },
      })
      .setScrollFactor(0)
      .setDepth(21);
    DialogueBox.createPortraits(scene);
    this.portrait = scene.add
      .image(MARGIN + 8 + PORTRAIT_SIZE / 2, height - MARGIN - PANEL_HEIGHT / 2, '__DEFAULT')
      .setScrollFactor(0)
      .setDepth(21);
    this.hint = scene.add
      .text(width - MARGIN - PADDING, height - MARGIN - 10, '', { fontFamily: 'monospace', fontSize: '13px', color: '#a8a48c' })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(21);
    this.setVisible(false);
  }

  get open(): boolean {
    return this.panel.visible;
  }

  /** Show lines one by one; `onDone` runs after the last one is dismissed. */
  say(lines: Line[], onDone?: () => void): void {
    this.lines = [...lines];
    this.choice = null;
    this.options = [];
    this.onDone = onDone ?? null;
    this.setVisible(true);
    this.showNext();
  }

  /** Lines followed by a yes/no question on the last one. */
  ask(lines: Line[], onYes: () => void, onNo: () => void): void {
    this.say(lines);
    this.choice = { onYes, onNo };
    this.updateHint();
  }

  /** Lines followed by numbered things to do. */
  choose(lines: Line[], options: Option[]): void {
    this.say(lines);
    this.options = options;
    this.updateHint();
  }

  /** Feed key presses while the box is open; numbers pick an option. */
  press(key: 'use' | 'no' | number): void {
    if (!this.open) return;
    if (this.lines.length > 0) {
      if (key === 'use') this.showNext();
      return;
    }
    if (this.options.length > 0) {
      const picked = typeof key === 'number' ? this.options[key - 1] : undefined;
      if (picked || key === 'no') {
        this.close();
        picked?.run();
      }
      return;
    }
    if (this.choice) {
      const { onYes, onNo } = this.choice;
      this.close();
      (key === 'use' ? onYes : onNo)();
      return;
    }
    if (key === 'use') {
      const done = this.onDone;
      this.close();
      done?.();
    }
  }

  private showNext(): void {
    const [speaker, text] = this.lines.shift()!;
    // Narration (no speaker) and people without a face show no portrait.
    const key = portraitKey(speaker);
    const face = this.portrait.scene.textures.exists(key);
    this.portrait.setVisible(face);
    if (face) this.portrait.setTexture(key);
    // Text starts right of the face, or at the panel edge for narration.
    const left = MARGIN + PADDING + (face ? PORTRAIT_SIZE + PADDING / 2 : 0);
    this.text.setX(left).setWordWrapWidth(this.portrait.scene.scale.width - left - MARGIN - PADDING);
    // An empty speaker is narration: what the player sees or hears.
    this.text.setText(speaker ? `${speaker}: ${text}` : text);
    this.updateHint();
  }

  private updateHint(): void {
    const last = this.lines.length === 0;
    if (last && this.options.length > 0) {
      // Non-breaking spaces keep each option whole when the line wraps.
      const list = this.options.map((o, i) => `${i + 1} — ${o.label}`.replace(/ /g, '\u00a0')).join('   ');
      this.text.setText(`${this.text.text.split('\n')[0]}\n${list}`);
      this.hint.setText('Q — отойти');
    } else {
      this.hint.setText(last && this.choice ? 'E — да    Q — нет' : 'E — дальше');
    }
  }

  private close(): void {
    this.choice = null;
    this.options = [];
    this.onDone = null;
    this.setVisible(false);
  }

  private setVisible(visible: boolean): void {
    this.panel.setVisible(visible);
    this.text.setVisible(visible);
    this.hint.setVisible(visible);
    if (!visible) this.portrait.setVisible(false);
  }

  /** Draw every face from content/portraits.json once, pixel by pixel. */
  private static createPortraits(scene: Phaser.Scene): void {
    const { scale, palette, faces } = portraits;
    for (const [speaker, rows] of Object.entries(faces)) {
      const key = portraitKey(speaker);
      if (scene.textures.exists(key)) continue;
      const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
      rows.forEach((row, y) =>
        [...row].forEach((pixel, x) => {
          const color = palette[pixel as keyof typeof palette];
          if (!color) return;
          graphics.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
          graphics.fillRect(x * scale, y * scale, scale, scale);
        }),
      );
      graphics.generateTexture(key, PORTRAIT_SIZE, PORTRAIT_SIZE);
      graphics.destroy();
    }
  }
}

function portraitKey(speaker: string): string {
  return `portrait:${speaker}`;
}
