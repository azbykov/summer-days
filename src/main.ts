import Phaser from 'phaser';
import { IntroScene } from './scenes/IntroScene';
import { MenuScene } from './scenes/MenuScene';
import { PauseScene } from './scenes/PauseScene';
import { TouchScene } from './scenes/TouchScene';
import { DEV_START, VillageScene } from './scenes/VillageScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  pixelArt: true,
  // The stick and a button at once on a tablet.
  input: { activePointers: 3 },
  backgroundColor: '#14160f',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Dev starts go straight into the village; otherwise the menu comes first.
  scene: DEV_START ? [VillageScene, MenuScene, IntroScene, PauseScene, TouchScene] : [MenuScene, IntroScene, VillageScene, PauseScene, TouchScene],
});

// Dev-only handle for inspecting the running game from the browser console.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
