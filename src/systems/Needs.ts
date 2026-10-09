import needs from '../content/needs.json';

export type Need = 'hunger' | 'thirst' | 'sleep';
export type Pace = 'still' | 'walk' | 'run' | 'ride';

const MAX = 100;

/**
 * The body: hunger, thirst and sleep run down with game time; stamina works
 * like Diablo 2 — running drains it, it refills on its own standing still or
 * riding, and at zero the player can only walk until enough has come back.
 * Walking wears it down too, very slowly. Eating or drinking anything
 * refills stamina at once.
 *
 * Values are 0–100, where 100 is fed, not thirsty, rested, fresh.
 */
export class Needs {
  hunger = needs.start.hunger;
  thirst = needs.start.thirst;
  sleep = needs.start.sleep;
  stamina = needs.start.stamina;
  /** Ran dry: no running until stamina is back to `runAgainAt`. */
  private exhausted = false;
  private lastMinutes: number | null = null;

  get canRun(): boolean {
    return !this.exhausted && this.stamina > 0;
  }

  /**
   * `now` on the game clock, `seconds` of real time spent at `pace`. Needs
   * run down by however much the clock moved since the last call, jumps
   * included.
   */
  update(now: number, seconds: number, pace: Pace): void {
    const hours = this.lastMinutes === null ? 0 : (now - this.lastMinutes) / 60;
    this.lastMinutes = now;
    this.hunger = clamp(this.hunger - needs.lossPerGameHour.hunger * hours);
    this.thirst = clamp(this.thirst - needs.lossPerGameHour.thirst * hours);
    this.sleep = clamp(this.sleep - needs.lossPerGameHour.sleep * hours);

    const { stamina } = needs;
    const change = {
      run: -stamina.drainPerSecondRunning,
      walk: -stamina.drainPerSecondWalking,
      still: stamina.regenPerSecondStanding,
      ride: stamina.regenPerSecondRiding,
    }[pace];
    this.stamina = clamp(this.stamina + change * seconds);
    if (this.stamina === 0) this.exhausted = true;
    if (this.stamina >= stamina.runAgainAt) this.exhausted = false;
  }

  get sleepy(): boolean {
    return this.sleep < needs.sleepyBelow;
  }

  /**
   * How long a nap at home would last: the more tired, the longer — from half
   * an hour when just a bit sleepy to six hours when dead on one's feet.
   * 0 when the player is not sleepy enough to fall asleep.
   */
  napMinutes(): number {
    const { minGameMinutes, maxGameMinutes, notSleepyAbove } = needs.nap;
    if (this.sleep >= notSleepyAbove) return 0;
    const tiredness = (notSleepyAbove - this.sleep) / notSleepyAbove;
    return Math.round(minGameMinutes + (maxGameMinutes - minGameMinutes) * tiredness);
  }

  /** After the nap's hours have been accounted for. */
  wakeUp(): void {
    this.sleep = needs.nap.restoresTo;
    this.stamina = MAX;
    this.exhausted = false;
  }

  /** Something eaten or drunk: its own need goes up, stamina is full again. */
  consume(restores: Partial<Record<Need, number>>): void {
    for (const [need, amount] of Object.entries(restores) as [Need, number][]) {
      this[need] = clamp(this[need] + amount);
    }
    this.stamina = MAX;
    this.exhausted = false;
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(MAX, value));
}
