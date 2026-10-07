import timeConfig from '../content/time.json';

/**
 * Game time advances on its own and never waits for the player.
 * Scheduled world events must read this clock instead of player progress.
 */
export class GameClock {
  private elapsedMinutes: number;

  constructor() {
    this.elapsedMinutes = timeConfig.startHour * 60 + timeConfig.startMinute;
  }

  update(deltaMs: number): void {
    this.elapsedMinutes += (deltaMs / 1000) * timeConfig.gameMinutesPerRealSecond;
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

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
