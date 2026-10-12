import items from '../content/items.json';

export type ItemId = keyof typeof items.items;

export type Slot = { id: ItemId; count: number };

/**
 * What the player carries: a few hands' worth of things and the money in
 * the pocket. Same things stack in one slot; there are only so many slots.
 */
export class Inventory {
  readonly size = items.slots;
  rubles = 0;
  private slots: Slot[] = [];

  get contents(): readonly Slot[] {
    return this.slots;
  }

  has(id: ItemId): boolean {
    return this.slots.some((s) => s.id === id);
  }

  /** False when every slot is taken by something else. */
  add(id: ItemId): boolean {
    const slot = this.slots.find((s) => s.id === id);
    if (slot) {
      slot.count += 1;
      return true;
    }
    if (this.slots.length >= this.size) return false;
    this.slots.push({ id, count: 1 });
    return true;
  }

  /** Swaps in what a saved game had in the pocket. */
  restore(slots: readonly Slot[], rubles: number): void {
    this.slots = slots.map((s) => ({ ...s }));
    this.rubles = rubles;
  }

  take(id: ItemId): void {
    const slot = this.slots.find((s) => s.id === id);
    if (!slot) return;
    slot.count -= 1;
    if (slot.count === 0) this.slots.splice(this.slots.indexOf(slot), 1);
  }
}

export function itemName(id: ItemId): string {
  return items.items[id].name;
}
