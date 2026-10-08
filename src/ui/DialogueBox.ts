import Phaser from 'phaser';

export type Line = [speaker: string, text: string];

type Choice = { onYes: () => void; onNo: () => void };

export type Option = { label: string; run: () => void };

/**
 * Plain speech at the bottom of the screen. No portraits, no quest log:
 * people just say things (docs/GAME_DESIGN.md, «Минимум quest markers»).
 *
 * E advances. A conversation can end in a yes/no question: E — yes, Q — no,
 * or in a short list of things to do: 1–5 picks one, Q leaves.
 */
export class DialogueBox {
  private panel: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private lines: Line[] = [];
  private choice: Choice | null = null;
  private options: Option[] = [];
  private onDone: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    this.panel = scene.add
      .rectangle(width / 2, height - 12, width - 24, 92, 0x14160f, 0.88)
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0x6a6a5a)
      .setScrollFactor(0)
      .setDepth(20);
    this.text = scene.add
      .text(28, height - 96, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#f4efe0',
        wordWrap: { width: width - 56 },
      })
      .setScrollFactor(0)
      .setDepth(21);
    this.hint = scene.add
      .text(width - 28, height - 22, '', { fontFamily: 'monospace', fontSize: '13px', color: '#a8a48c' })
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
    // An empty speaker is narration: what the player sees or hears.
    this.text.setText(speaker ? `${speaker}: ${text}` : text);
    this.updateHint();
  }

  private updateHint(): void {
    const last = this.lines.length === 0;
    if (last && this.options.length > 0) {
      const list = this.options.map((o, i) => `${i + 1} — ${o.label}`).join('   ');
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
  }
}
