import dialogue from '../content/dialogue.json';
import type { DialogueBox, Line, Option } from '../ui/DialogueBox';
import type { Point } from './layout';

/**
 * Grandpa's IZH in the garage (docs/MVP.md, «Motorcycle MVP simulation»).
 *
 * Three hidden facts — fuel, spark, air — that the player never sees as a
 * table. They learn them by looking: an empty tank, a black plug, a filter
 * that turns out not to matter. Fixing both lets the engine catch once and
 * die; the bike does not become transport in the MVP.
 */
export class Motorcycle {
  /** The player has tried the kickstarter at least once. */
  tried = false;
  started = false;

  private fuel = false;
  private spark = false;
  private readonly air = true;
  private hasCanister = false;
  private hasPlugKey = false;
  private canisterTaken = false;

  constructor(
    private dialogueBox: DialogueBox,
    readonly at: Point,
    readonly workbench: Point,
  ) {}

  inspect(): void {
    const tank: Option = this.fuel
      ? { label: 'бак', run: () => this.say('izhTankFull') }
      : this.hasCanister
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
      {
        label: this.hasPlugKey ? 'ключи' : 'взять свечной ключ',
        run: () => {
          this.hasPlugKey = true;
          this.say('workbenchTakeKey');
        },
      },
      { label: 'заглянуть под верстак', run: () => this.lookUnderWorkbench() },
    ]);
  }

  private kick(): void {
    const runs = this.fuel && this.spark && this.air;
    if (runs) {
      this.say(this.started ? 'izhKickStarted' : 'izhKickFirstStart');
      this.started = true;
      this.tried = true;
      return;
    }
    const attempt = !this.fuel && !this.spark ? 'izhKickNothing' : this.fuel ? 'izhKickNoSpark' : 'izhKickNoFuel';
    // Grandpa hears it from the yard the first time.
    this.dialogueBox.say([...lines(attempt), ...(this.tried ? [] : lines('grandpaFirstFailedKick'))]);
    this.tried = true;
  }

  private fillTank(): void {
    this.fuel = true;
    this.hasCanister = false;
    this.say('izhTankFilled');
  }

  private checkPlug(): void {
    if (!this.hasPlugKey) return this.say('izhPlugNoKey');
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
    this.canisterTaken = true;
    this.hasCanister = true;
    this.say('workbenchUnder');
  }

  private say(key: keyof typeof dialogue): void {
    this.dialogueBox.say(lines(key));
  }
}

function lines(key: keyof typeof dialogue): Line[] {
  return dialogue[key] as Line[];
}
