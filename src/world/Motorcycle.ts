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
export class Motorcycle {
  /** The player has tried the kickstarter at least once. */
  tried = false;
  started = false;
  /** Ridden at least once. */
  ridden = false;
  running = false;

  private fuel = false;
  private spark = false;
  private readonly air = true;
  private canisterTaken = false;

  constructor(
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
    const tank: Option = this.fuel
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
    const fixed = this.fuel && this.spark && this.air;
    if (fixed && !this.started) {
      // The first time it only catches and dies: "О. Живой ещё."
      this.say('izhKickFirstStart');
      this.started = true;
      this.tried = true;
      return;
    }
    if (fixed) {
      this.running = true;
      const firstRun = !this.ridden ? lines('grandpaFirstRun') : [];
      this.dialogueBox.choose([...lines('izhKickRuns'), ...firstRun], [this.rideOption(), this.stallOption()]);
      return;
    }
    const attempt = !this.fuel && !this.spark ? 'izhKickNothing' : this.fuel ? 'izhKickNoSpark' : 'izhKickNoFuel';
    // Grandpa hears it from the yard the first time.
    this.dialogueBox.say([...lines(attempt), ...(this.tried ? [] : lines('grandpaFirstFailedKick'))]);
    this.tried = true;
  }

  private rideOption(): Option {
    return {
      label: 'сесть и поехать',
      run: () => {
        this.ridden = true;
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
    this.fuel = true;
    // Emptied into the tank, the canister stays in the garage.
    this.inventory.take('canister');
    this.say('izhTankFilled');
  }

  private checkPlug(): void {
    if (!this.inventory.has('plugKey')) return this.say('izhPlugNoKey');
    if (this.spark) return this.say('izhPlugClean');
    this.dialogueBox.choose(lines('izhPlugDirty'), [
      {
        label: 'почистить',
        run: () => {
          this.spark = true;
          this.say('izhPlugCleaned');
        },
      },
    ]);
  }

  private lookUnderWorkbench(): void {
    if (this.canisterTaken) return this.say('workbenchUnderEmpty');
    if (!this.inventory.add('canister')) return this.say('pocketsFull');
    this.canisterTaken = true;
    this.say('workbenchUnder');
  }

  private say(key: keyof typeof dialogue): void {
    this.dialogueBox.say(lines(key));
  }
}

function lines(key: keyof typeof dialogue): Line[] {
  return dialogue[key] as Line[];
}
