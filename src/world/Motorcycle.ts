import dialogue from '../content/dialogue.json';
import type { DialogueBox, Line, Option } from '../ui/DialogueBox';
import type { Inventory } from './Inventory';
import type { Point } from './layout';

/**
 * Grandpa's IZH in the garage (docs/MVP.md, «Motorcycle MVP simulation»).
 *
 * Three hidden facts — fuel, spark, air — that the player never sees as a
 * table. They learn them by looking: an empty tank, a black plug, a filter
 * that turns out not to matter. Fixed, the engine first catches once and
 * dies; after that it starts and the IZH can be ridden. Getting off stalls
 * it, so every ride starts with the kickstarter.
 */
/** What has been done to the IZH so far; it carries over from day to day. */
export type MotorcycleFacts = {
  /** The player has tried the kickstarter at least once. */
  tried: boolean;
  started: boolean;
  /** Ridden at least once. */
  ridden: boolean;
  fuel: boolean;
  spark: boolean;
  canisterTaken: boolean;
};

export function newMotorcycleFacts(): MotorcycleFacts {
  return { tried: false, started: false, ridden: false, fuel: false, spark: false, canisterTaken: false };
}

export class Motorcycle {
  /** The engine dies overnight with everything else. */
  running = false;

  private readonly air = true;

  constructor(
    private facts: MotorcycleFacts,
    private dialogueBox: DialogueBox,
    /** Where the IZH stands now: it stays wherever it was left. */
    readonly position: () => Point,
    readonly workbench: Point,
    private ride: () => void,
    private inventory: Inventory,
  ) {}

  /** The rider got off: the engine dies with them. */
  stopEngine(): void {
    this.running = false;
  }

  inspect(): void {
    if (this.running) {
      this.dialogueBox.choose(lines('izhRunning'), [this.rideOption(), this.stallOption()]);
      return;
    }
    const tank: Option = this.facts.fuel
      ? { label: 'бак', run: () => this.say('izhTankFull') }
      : this.inventory.has('canister')
        ? { label: 'залить бензин', run: () => this.fillTank() }
        : { label: 'открыть бак', run: () => this.say('izhTankEmpty') };
    this.dialogueBox.choose(lines('izhLook'), [
      { label: 'кикстартер', run: () => this.kick() },
      tank,
      { label: 'свеча', run: () => this.checkPlug() },
      { label: 'воздушный фильтр', run: () => this.say('izhAir') },
    ]);
  }

  inspectWorkbench(): void {
    this.dialogueBox.choose(lines('workbenchLook'), [
      this.inventory.has('plugKey')
        ? {
            label: 'положить ключ',
            run: () => {
              this.inventory.take('plugKey');
              this.say('workbenchPutKey');
            },
          }
        : {
            label: 'взять свечной ключ',
            run: () => (this.inventory.add('plugKey') ? this.say('workbenchTakeKey') : this.say('pocketsFull')),
          },
      { label: 'заглянуть под верстак', run: () => this.lookUnderWorkbench() },
    ]);
  }

  private kick(): void {
    const fixed = this.facts.fuel && this.facts.spark && this.air;
    if (fixed && !this.facts.started) {
      // The first time it only catches and dies: "О. Живой ещё."
      this.say('izhKickFirstStart');
      this.facts.started = true;
      this.facts.tried = true;
      return;
    }
    if (fixed) {
      this.running = true;
      const firstRun = !this.facts.ridden ? lines('grandpaFirstRun') : [];
      this.dialogueBox.choose([...lines('izhKickRuns'), ...firstRun], [this.rideOption(), this.stallOption()]);
      return;
    }
    const attempt = !this.facts.fuel && !this.facts.spark ? 'izhKickNothing' : this.facts.fuel ? 'izhKickNoSpark' : 'izhKickNoFuel';
    // Grandpa hears it from the yard the first time.
    this.dialogueBox.say([...lines(attempt), ...(this.facts.tried ? [] : lines('grandpaFirstFailedKick'))]);
    this.facts.tried = true;
  }

  private rideOption(): Option {
    return {
      label: 'сесть и поехать',
      run: () => {
        this.facts.ridden = true;
        this.ride();
      },
    };
  }

  private stallOption(): Option {
    return {
      label: 'заглушить',
      run: () => {
        this.running = false;
        this.say('izhStopped');
      },
    };
  }

  private fillTank(): void {
    this.facts.fuel = true;
    // Emptied into the tank, the canister stays in the garage.
    this.inventory.take('canister');
    this.say('izhTankFilled');
  }

  private checkPlug(): void {
    if (!this.inventory.has('plugKey')) return this.say('izhPlugNoKey');
    if (this.facts.spark) return this.say('izhPlugClean');
    const fresh: Option[] = this.inventory.has('sparkPlug')
      ? [
          {
            label: 'поставить новую свечу',
            run: () => {
              this.inventory.take('sparkPlug');
              this.facts.spark = true;
              this.say('izhPlugNew');
            },
          },
        ]
      : [];
    this.dialogueBox.choose(lines('izhPlugDirty'), [
      {
        label: 'почистить',
        run: () => {
          this.facts.spark = true;
          this.say('izhPlugCleaned');
        },
      },
      ...fresh,
    ]);
  }

  private lookUnderWorkbench(): void {
    if (this.facts.canisterTaken) return this.say('workbenchUnderEmpty');
    if (!this.inventory.add('canister')) return this.say('pocketsFull');
    this.facts.canisterTaken = true;
    this.say('workbenchUnder');
  }

  private say(key: keyof typeof dialogue): void {
    this.dialogueBox.say(lines(key));
  }
}

function lines(key: keyof typeof dialogue): Line[] {
  return dialogue[key] as Line[];
}
