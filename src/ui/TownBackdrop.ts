import Phaser from 'phaser';
import scenes from '../content/scenes.json';

export type PictureName = keyof typeof scenes.pictures;

/**
 * A screen standing in for a place off the map, like town on market day:
 * the village is hidden behind it, and the conversation runs on top. It
 * shows either a caption or a pixel picture from content/scenes.json.
 */
export class TownBackdrop {
  private panel: Phaser.GameObjects.Rectangle;
  private caption: Phaser.GameObjects.Text;
  private picture: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    this.panel = scene.add
      .rectangle(0, 0, width, height, 0x2e3328)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(19)
      .setVisible(false);
    this.caption = scene.add
      .text(width / 2, height / 3, '', { fontFamily: 'monospace', fontSize: '28px', color: '#e8e2cf' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(19)
      .setVisible(false);
    TownBackdrop.createPictures(scene);
    // Centred in the space above the dialogue box.
    this.picture = scene.add
      .image(width / 2, height * 0.38, '__DEFAULT')
      .setScrollFactor(0)
      .setDepth(19)
      .setVisible(false);
  }

  get shown(): boolean {
    return this.panel.visible;
  }

  show(caption: string): void {
    this.caption.setText(caption).setVisible(true);
    this.picture.setVisible(false);
    this.panel.setVisible(true);
  }

  showPicture(name: PictureName): void {
    this.picture.setTexture(pictureKey(name)).setVisible(true);
    this.caption.setVisible(false);
    this.panel.setVisible(true);
  }

  hide(): void {
    this.panel.setVisible(false);
    this.caption.setVisible(false);
    this.picture.setVisible(false);
  }

  /** Draw every picture from content/scenes.json once, pixel by pixel. */
  private static createPictures(scene: Phaser.Scene): void {
    const { scale, palette, pictures } = scenes;
    for (const [name, rows] of Object.entries(pictures)) {
      const key = pictureKey(name as PictureName);
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
      graphics.generateTexture(key, rows[0].length * scale, rows.length * scale);
      graphics.destroy();
    }
  }
}

function pictureKey(name: PictureName): string {
  return `picture:${name}`;
}
