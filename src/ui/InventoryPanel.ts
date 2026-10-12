import Phaser from 'phaser';
import items from '../content/items.json';
import { itemName, type Inventory, type ItemId } from '../world/Inventory';

const SLOT = 56;
const GAP = 8;
const ICON_SIZE = items.items.blackBread.icon.length * items.scale;

/**
 * What the player carries, opened and closed with Q: one row of slots with
 * pixel icons, counts and the money in the pocket. A number, a tap or a
 * click picks a slot.
 * The game does not pause.
 */
export class InventoryPanel {
  private root: Phaser.GameObjects.Container;
  private icons: Phaser.GameObjects.Image[] = [];
  private counts: Phaser.GameObjects.Text[] = [];
  private names: Phaser.GameObjects.Text[] = [];
  private money: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private inventory: Inventory,
    /** A slot tapped or clicked: the same as its number key. */
    onPick: (slot: number) => void,
  ) {
    InventoryPanel.createIcons(scene);
    const width = inventory.size * SLOT + (inventory.size - 1) * GAP;
    const left = (scene.scale.width - width) / 2;
    const top = 16;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(25).setVisible(false);
    this.root.add(
      scene.add
        .rectangle(left - 12, top - 10, width + 24, SLOT + 62, 0x14160f, 0.88)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x6a6a5a),
    );
    for (let i = 0; i < inventory.size; i++) {
      const x = left + i * (SLOT + GAP);
      this.root.add(
        scene.add
          .rectangle(x, top, SLOT, SLOT, 0x2a2c24)
          .setOrigin(0, 0)
          .setStrokeStyle(1, 0x55584a)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.open && onPick(i)),
      );
      // Slot number: with the inventory open, that key picks the slot.
      this.root.add(
        scene.add.text(x + 3, top + 2, `${i + 1}`, { fontFamily: 'monospace', fontSize: '10px', color: '#7a7a6a' }),
      );
      const icon = scene.add.image(x + SLOT / 2, top + SLOT / 2, '__DEFAULT').setVisible(false);
      const count = scene.add
        .text(x + SLOT - 4, top + SLOT - 2, '', { fontFamily: 'monospace', fontSize: '13px', color: '#f4efe0' })
        .setOrigin(1, 1);
      const name = scene.add
        .text(x + SLOT / 2, top + SLOT + 4, '', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#c8c4b0',
          align: 'center',
          wordWrap: { width: SLOT },
        })
        .setOrigin(0.5, 0);
      this.icons.push(icon);
      this.counts.push(count);
      this.names.push(name);
      this.root.add([icon, count, name]);
    }
    this.money = scene.add
      .text(left + width / 2, top + SLOT + 34, '', { fontFamily: 'monospace', fontSize: '13px', color: '#e8e2cf' })
      .setOrigin(0.5, 0);
    this.root.add(this.money);
    // Children too, or taps on the slots would be measured against the scrolled map.
    for (const child of this.root.list) (child as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
  }

  get open(): boolean {
    return this.root.visible;
  }

  toggle(): void {
    this.root.setVisible(!this.root.visible);
  }

  /** Redraw from the inventory; cheap enough to call every frame while open. */
  refresh(): void {
    if (!this.open) return;
    const slots = this.inventory.contents;
    for (let i = 0; i < this.icons.length; i++) {
      const slot = slots[i];
      this.icons[i].setVisible(!!slot);
      if (slot) this.icons[i].setTexture(iconKey(slot.id));
      this.counts[i].setText(slot && slot.count > 1 ? `×${slot.count}` : '');
      this.names[i].setText(slot ? itemName(slot.id) : '');
    }
    this.money.setText(`В кармане: ${this.inventory.rubles} р.`);
  }

  /** Draw every item icon from content/items.json once, pixel by pixel. */
  private static createIcons(scene: Phaser.Scene): void {
    const { scale, palette } = items;
    for (const [id, item] of Object.entries(items.items)) {
      const key = iconKey(id as ItemId);
      if (scene.textures.exists(key)) continue;
      const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
      item.icon.forEach((row, y) =>
        [...row].forEach((pixel, x) => {
          const color = palette[pixel as keyof typeof palette];
          if (!color) return;
          graphics.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
          graphics.fillRect(x * scale, y * scale, scale, scale);
        }),
      );
      graphics.generateTexture(key, ICON_SIZE, ICON_SIZE);
      graphics.destroy();
    }
  }
}

function iconKey(id: ItemId): string {
  return `item:${id}`;
}
