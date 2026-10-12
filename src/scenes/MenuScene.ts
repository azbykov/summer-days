import Phaser from 'phaser';
import { formatDate } from '../systems/Calendar';
import { isTouchDevice } from '../ui/VirtualKeys';
import { forgetGame, loadGame, type SavedGame } from '../world/SavedGame';
import { Summer } from '../world/Summer';

type Item = { label: string; run: () => void };

const COLOR = '#e8e2cf';
const DIM = '#8a8672';
const PICKED = '#f0c860';

/**
 * The title screen: carry on with the saved summer or start it over. Arrows
 * or W/S move, E or Enter picks; the mouse works too.
 */
export class MenuScene extends Phaser.Scene {
  private items: Item[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private picked = 0;
  private saved: SavedGame | null = null;
  /** «Начать сначала?» is up: a new game would wipe the save. */
  private confirming = false;

  constructor() {
    super('menu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.texts = [];
    this.confirming = false;
    this.add
      .text(width / 2, 110, 'SUMMER DAYS', { fontFamily: 'monospace', fontSize: '44px', color: COLOR })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 160, 'Высокая · лето 1999', { fontFamily: 'monospace', fontSize: '16px', color: DIM })
      .setOrigin(0.5);
    this.add
      .text(
        width / 2,
        height - 40,
        isTouchDevice()
          ? 'палец слева — идти, до упора — бегом   E — действие   Q — сумка, «нет»\nT — подождать   II — пауза   в разговоре — нажимать на реплики'
          : 'стрелки/WASD — идти   Shift — бегом   E — действие   Q — карманы, «нет»\nT — подождать   P — пауза   Esc — пауза и меню',
        { fontFamily: 'monospace', fontSize: '12px', color: DIM, align: 'center', lineSpacing: 4 },
      )
      .setOrigin(0.5, 1);

    const { ENTER_FULLSCREEN, LEAVE_FULLSCREEN } = Phaser.Scale.Events;
    this.scale.on(ENTER_FULLSCREEN, this.fullscreenChanged, this);
    this.scale.on(LEAVE_FULLSCREEN, this.fullscreenChanged, this);
    this.events.once('shutdown', () => {
      this.scale.off(ENTER_FULLSCREEN, this.fullscreenChanged, this);
      this.scale.off(LEAVE_FULLSCREEN, this.fullscreenChanged, this);
    });

    const keyboard = this.input.keyboard!;
    keyboard.on('keydown', (event: KeyboardEvent) => this.key(event.code));

    void loadGame().then((saved) => {
      this.saved = saved;
      this.showMain();
    });
  }

  private showMain(): void {
    this.confirming = false;
    const saved = this.saved;
    const items: Item[] = [];
    if (saved) items.push({ label: `Продолжить — ${describe(saved)}`, run: () => this.continueGame(saved) });
    items.push({ label: 'Новая игра', run: () => (saved ? this.showConfirm() : this.newGame()) });
    // Tablet browsers keep their address bar otherwise.
    if (this.scale.fullscreen.available) {
      items.push({ label: this.scale.isFullscreen ? 'Обычный экран' : 'Во весь экран', run: () => this.toggleFullscreen() });
    }
    this.showItems(items);
  }

  private showConfirm(): void {
    this.showItems([
      { label: 'Начать лето сначала', run: () => this.newGame() },
      { label: 'Назад', run: () => this.showMain() },
    ]);
    this.confirming = true;
    this.texts.push(
      this.add
        .text(this.scale.width / 2, 240, 'Сохранённое лето пропадёт.', { fontFamily: 'monospace', fontSize: '16px', color: DIM })
        .setOrigin(0.5),
    );
  }

  private showItems(items: Item[]): void {
    this.texts.forEach((t) => t.destroy());
    this.items = items;
    this.picked = 0;
    this.texts = items.map((item, i) =>
      this.add
        .text(this.scale.width / 2, 290 + i * 40, item.label, { fontFamily: 'monospace', fontSize: '22px', color: COLOR })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.pick(i))
        .on('pointerup', () => item.run()),
    );
    this.pick(0);
  }

  private pick(index: number): void {
    this.picked = (index + this.items.length) % this.items.length;
    this.texts.forEach((t, i) => {
      if (i >= this.items.length) return;
      t.setColor(i === this.picked ? PICKED : COLOR).setText((i === this.picked ? '> ' : '  ') + this.items[i].label + '  ');
    });
  }

  private key(code: string): void {
    if (this.items.length === 0) return;
    if (code === 'ArrowUp' || code === 'KeyW') this.pick(this.picked - 1);
    if (code === 'ArrowDown' || code === 'KeyS') this.pick(this.picked + 1);
    if (code === 'Enter' || code === 'KeyE' || code === 'Space') this.items[this.picked].run();
    if ((code === 'Escape' || code === 'KeyQ') && this.confirming) this.showMain();
  }

  private toggleFullscreen(): void {
    this.scale.toggleFullscreen();
  }

  /** The fullscreen label follows the browser, however it was switched. */
  private fullscreenChanged(): void {
    if (this.items.length > 0 && !this.confirming) this.showMain();
  }

  private continueGame(saved: SavedGame): void {
    this.leave();
    this.scene.start('village', { summer: Summer.fromSave(saved.summer), today: saved.today });
  }

  private newGame(): void {
    this.leave();
    // A new summer opens with the story of how the player got here.
    void forgetGame().then(() => this.scene.start('intro'));
  }

  private leave(): void {
    this.items = [];
    this.input.keyboard!.removeAllListeners();
  }
}

/** «14 июня, 15:20», or «утро, 14 июня» for a save made at night. */
function describe(saved: SavedGame): string {
  const date = formatDate(saved.summer.day);
  if (!saved.today) return `утро, ${date}`;
  const minutes = Math.floor(saved.today.minutes);
  const time = `${Math.floor(minutes / 60) % 24}:${(minutes % 60).toString().padStart(2, '0')}`;
  return `${date}, ${time}`;
}
