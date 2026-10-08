import Phaser from 'phaser';
import { VillageScene } from './scenes/VillageScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  pixelArt: true,
  backgroundColor: '#14160f',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [VillageScene],
});

// Dev-only handle for inspecting the running game from the browser console.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
