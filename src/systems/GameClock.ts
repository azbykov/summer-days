import timeConfig from '../content/time.json';

/**
 * Game time advances on its own and never waits for the player.
 * Scheduled world events must read this clock instead of player progress.
 */
export class GameClock {
  private elapsedMinutes: number;

  /** `startMinutes` since midnight; by default the usual 08:00 wake-up. */
  constructor(startMinutes = timeConfig.startHour * 60 + timeConfig.startMinute) {
    this.elapsedMinutes = startMinutes;
  }

  update(deltaMs: number): void {
    this.elapsedMinutes += (deltaMs / 1000) * timeConfig.gameMinutesPerRealSecond;
  }

  /** Time passes in a jump, e.g. while the player plays a football match. */
  advance(minutes: number): void {
    this.elapsedMinutes += minutes;
  }

  /** Minutes since midnight of the first day. */
  get minutes(): number {
    return this.elapsedMinutes;
  }

  get hour(): number {
    return Math.floor(this.elapsedMinutes / 60) % 24;
  }

  get minute(): number {
    return Math.floor(this.elapsedMinutes % 60);
  }

  format(): string {
    return `${pad(this.hour)}:${pad(this.minute)}`;
  }
}

/** "19:00" -> minutes since midnight. */
export function clockTime(text: string): number {
  const [hours, minutes] = text.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Real seconds -> game minutes at the current time scale. */
export function gameMinutes(realSeconds: number): number {
  return realSeconds * timeConfig.gameMinutesPerRealSecond;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
