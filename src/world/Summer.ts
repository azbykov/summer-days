import { LAST_DAY } from '../systems/Calendar';
import { Needs, type NeedsSave } from '../systems/Needs';
import { Inventory, type Slot } from './Inventory';
import { newMotorcycleFacts, type MotorcycleFacts } from './Motorcycle';

/** Where a vehicle was left, in pixels. */
export type Parked = { x: number; y: number; rotation: number };

/** A `Summer` as plain data, for the saved game. */
export type SummerSave = {
  day: number;
  slots: Slot[];
  rubles: number;
  needs: NeedsSave;
  motorcycle: MotorcycleFacts;
  metGrandpa: boolean;
  marketOn: number | null;
  bike: Parked | null;
  izh: Parked | null;
};

/**
 * What carries over from one day to the next: the date, what the player has
 * on them, how they feel, the IZH and where the vehicles were left. Every
 * thing else — people, the herd, football, errands — starts afresh each
 * morning with the scene.
 */
export class Summer {
  day = 1;
  readonly inventory = new Inventory();
  readonly needs = new Needs();
  readonly motorcycle: MotorcycleFacts = newMotorcycleFacts();
  /** Grandpa has been visited on some day: the first visit is grandma's errand. */
  metGrandpa = false;
  /** The day the player goes to the market with grandma, once agreed. */
  marketOn: number | null = null;
  bike: Parked | null = null;
  izh: Parked | null = null;

  static fromSave(saved: SummerSave): Summer {
    const summer = new Summer();
    summer.day = saved.day;
    summer.inventory.restore(saved.slots, saved.rubles);
    summer.needs.restore(saved.needs);
    Object.assign(summer.motorcycle, saved.motorcycle);
    summer.metGrandpa = saved.metGrandpa;
    summer.marketOn = saved.marketOn;
    summer.bike = saved.bike;
    summer.izh = saved.izh;
    return summer;
  }

  save(): SummerSave {
    return {
      day: this.day,
      slots: this.inventory.contents.map((s) => ({ ...s })),
      rubles: this.inventory.rubles,
      needs: this.needs.save(),
      motorcycle: { ...this.motorcycle },
      metGrandpa: this.metGrandpa,
      marketOn: this.marketOn,
      bike: this.bike,
      izh: this.izh,
    };
  }

  /** With grandma in town today: the day starts with the bus and away from the map. */
  get marketDay(): boolean {
    return this.marketOn === this.day && !this.lastDay;
  }

  /** Already agreed to go with grandma tomorrow. */
  get marketTomorrow(): boolean {
    return this.marketOn === this.day + 1;
  }

  /** The day the parents come and take the player home. */
  get lastDay(): boolean {
    return this.day >= LAST_DAY;
  }
}
