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
 * Everything can be tapped or clicked as well: the panel goes on, an option
 * or «да» / «нет» picks, the hint in the corner does what it says.
 */
export class DialogueBox {
  private panel: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private portrait: Phaser.GameObjects.Image;
  private lines: Line[] = [];
  private choice: Choice | null = null;
  private options: Option[] = [];
  private onLeave: (() => void) | null = null;
  private onDone: (() => void) | null = null;
  /** The things to pick at the end of a talk, as buttons under the line. */
  private buttons: Phaser.GameObjects.Text[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    this.panel = scene.add
      .rectangle(width / 2, height - MARGIN, width - MARGIN * 2, PANEL_HEIGHT, 0x14160f, 0.88)
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0x6a6a5a)
      .setScrollFactor(0)
      .setDepth(20)
      .setInteractive()
      .on('pointerdown', () => this.tapPanel());
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
      .setDepth(21)
      .setPadding(8, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.press(this.lines.length === 0 && (this.options.length > 0 || this.choice) ? 'no' : 'use'));
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
    this.onLeave = null;
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

  /** Lines followed by numbered things to do; `onLeave` runs when Q steps away. */
  choose(lines: Line[], options: Option[], onLeave?: () => void): void {
    this.say(lines);
    this.options = options;
    this.onLeave = onLeave ?? null;
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
        const leave = this.onLeave;
        this.close();
        if (picked) picked.run();
        else leave?.();
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

  /**
   * A tap on the panel itself only moves past a plain line, never answers.
   * Taps act on pointerdown: the release of the tap that opened a talk must
   * not skip its first line.
   */
  private tapPanel(): void {
    if (this.lines.length > 0 || (this.options.length === 0 && !this.choice)) this.press('use');
  }

  private updateHint(): void {
    const last = this.lines.length === 0;
    if (last && this.options.length > 0) {
      this.showButtons(this.options.map((o, i) => [`${i + 1} — ${o.label}`, i + 1]));
      this.hint.setText('Q — отойти');
    } else if (last && this.choice) {
      this.showButtons([['E — да', 'use'], ['Q — нет', 'no']]);
      this.hint.setText('');
    } else {
      this.showButtons([]);
      this.hint.setText('E — дальше');
    }
  }

  /** Options flow left to right under the line, wrapping inside the panel. */
  private showButtons(items: [label: string, key: 'use' | 'no' | number][]): void {
    this.buttons.forEach((b) => b.destroy());
    const left = this.text.x;
    const right = this.scene.scale.width - MARGIN - PADDING;
    let x = left;
    let y = this.text.y + this.text.height + 8;
    this.buttons = items.map(([label, key]) => {
      const button = this.scene.add
        .text(x, y, label, { fontFamily: 'monospace', fontSize: '17px', color: '#f4efe0', backgroundColor: '#2e3026', padding: { x: 10, y: 7 } })
        .setScrollFactor(0)
        .setDepth(22)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => button.setColor('#f0c860'))
        .on('pointerout', () => button.setColor('#f4efe0'))
        .on('pointerdown', () => this.press(key));
      if (x > left && x + button.width > right) {
        x = left;
        y += button.height + 6;
        button.setPosition(x, y);
      }
      x += button.width + 10;
      return button;
    });
  }

  private close(): void {
    this.choice = null;
    this.options = [];
    this.onLeave = null;
    this.onDone = null;
    this.showButtons([]);
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
