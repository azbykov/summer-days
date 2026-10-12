import Phaser from 'phaser';
import type { VillageScene } from './VillageScene';

/**
 * Drawn over the paused village: the clock, the herd and everyone else wait.
 * P goes back to the game, Esc saves and leaves for the menu.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('pause');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0, 0);
    this.add
      .text(width / 2, height / 2 - 30, 'ПАУЗА', { fontFamily: 'monospace', fontSize: '36px', color: '#e8e2cf' })
      .setOrigin(0.5);
    // Tappable too, for tablets.
    this.item(height / 2 + 24, 'P — продолжить', () => this.backToGame());
    this.item(height / 2 + 64, 'Esc — выйти в меню', () => this.toMenu());

    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-P', () => this.backToGame());
    keyboard.on('keydown-ESC', () => this.toMenu());
  }

  private item(y: number, label: string, run: () => void): void {
    const text = this.add
      .text(this.scale.width / 2, y, label, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#a8a48c',
        backgroundColor: '#14160fcc',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    text.on('pointerover', () => text.setColor('#f0c860')).on('pointerout', () => text.setColor('#a8a48c')).on('pointerup', run);
  }

  private backToGame(): void {
    this.scene.resume('village');
    this.scene.stop();
  }

  private toMenu(): void {
    this.input.keyboard!.removeAllListeners();
    this.input.enabled = false;
    void (this.scene.get('village') as VillageScene).saveNow().then(() => {
      this.scene.stop('village');
      this.scene.start('menu');
    });
  }
}
