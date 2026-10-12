import { LAST_DAY } from '../systems/Calendar';
import { Needs } from '../systems/Needs';
import { Inventory } from './Inventory';
import { newMotorcycleFacts, type MotorcycleFacts } from './Motorcycle';

/** Where a vehicle was left, in pixels. */
export type Parked = { x: number; y: number; rotation: number };

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
