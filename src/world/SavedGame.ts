import { clearSave, loadSave, writeSave } from '../systems/SaveStore';
import type { DaySave } from './DayEvents';
import type { Point } from './layout';
import type { SummerSave } from './Summer';

const VERSION = 1;

/**
 * The saved summer. Without `today` it was saved at night and picks up with
 * the next morning; with it, in the middle of a day, where the player stood.
 */
export type SavedGame = {
  version: number;
  summer: SummerSave;
  today: TodaySave | null;
};

export type TodaySave = {
  /** Game minutes since midnight. */
  minutes: number;
  /** In meters. */
  player: Point;
  day: DaySave;
};

export function savedGame(summer: SummerSave, today: TodaySave | null = null): SavedGame {
  return { version: VERSION, summer, today };
}

/** A save from an older build is dropped rather than half-read. */
export async function loadGame(): Promise<SavedGame | null> {
  const saved = await loadSave<SavedGame>();
  return saved?.version === VERSION ? saved : null;
}

export const saveGame = (game: SavedGame): Promise<void> => writeSave(game);

export const forgetGame = (): Promise<void> => clearSave();
