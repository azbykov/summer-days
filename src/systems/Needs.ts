import needs from '../content/needs.json';

export type Need = 'hunger' | 'thirst' | 'sleep';
/** The body as saved: plain numbers. */
export type NeedsSave = { hunger: number; thirst: number; sleep: number; stamina: number; exhausted: boolean };

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

  save(): NeedsSave {
    const { hunger, thirst, sleep, stamina, exhausted } = this;
    return { hunger, thirst, sleep, stamina, exhausted };
  }

  /** Back from a saved game; the clock picks up from the next update. */
  restore(saved: NeedsSave): void {
    Object.assign(this, saved);
    this.lastMinutes = null;
  }

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

  /** Not tired enough to fall asleep in the daytime. */
  get wideAwake(): boolean {
    return this.sleep >= needs.nap.notSleepyAbove;
  }

  /**
   * How long a nap takes to sleep it off: sleep comes back at
   * `restoresPerGameHour` up to `restoresTo`, rounded up to a quarter hour.
   */
  minutesToRest(): number {
    const { restoresPerGameHour, restoresTo } = needs.nap;
    const hours = Math.max(0, restoresTo - this.sleep) / restoresPerGameHour;
    return Math.ceil((hours * 60) / 15) * 15;
  }

  /**
   * Woke up after `minutes` of sleep, once `update` has already run the
   * clock over them: the sleep lost meanwhile is given back on top of what
   * the nap restores, so `restoresPerGameHour` is the net gain.
   */
  wakeUp(minutes: number): void {
    const { restoresPerGameHour, restoresTo } = needs.nap;
    const hours = minutes / 60;
    const restored = this.sleep + (needs.lossPerGameHour.sleep + restoresPerGameHour) * hours;
    this.sleep = Math.min(restored, restoresTo);
    this.stamina = MAX;
    this.exhausted = false;
  }

  /**
   * A night in bed: rested, and grandma's breakfast puts some food and water
   * back. The clock starts again in the morning, so needs pick up from there.
   */
  newDay(): void {
    const { night } = needs;
    this.sleep = night.sleep;
    this.hunger = clamp(this.hunger + night.hunger);
    this.thirst = clamp(this.thirst + night.thirst);
    this.stamina = MAX;
    this.exhausted = false;
    this.lastMinutes = null;
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
