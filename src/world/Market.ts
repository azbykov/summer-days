import dialogue from '../content/dialogue.json';
import town from '../content/town.json';
import { LAST_DAY, weekdayOf } from '../systems/Calendar';
import { clockTime, type GameClock } from '../systems/GameClock';
import type { Needs } from '../systems/Needs';
import type { DialogueBox, Line, Option } from '../ui/DialogueBox';
import type { TownBackdrop } from '../ui/TownBackdrop';
import type { Inventory } from './Inventory';
import { Shop, rublesWord, type Stock } from './Shop';
import type { Summer } from './Summer';

/**
 * Grandma's Sundays at the market in Chkalovsk (docs/MVP.md, «Рынок»).
 *
 * Every Sunday she leaves at eight and is back at four. On Saturday she asks
 * whether the player wants to come and help, or the player asks her. If they
 * go, she wakes the player herself; the bus and the market pass in a fade, at three
 * she pays the player and lets them go round the shops, and at four they are
 * home. Town is not on the map: it is a screen and a list of shops.
 */
export class Market {
  private shops: { label: string; shop: Shop }[];
  private leaves = clockTime(town.grandmaLeaves);
  private shoppingAt = clockTime(town.shoppingAt);
  private backHomeAt = clockTime(town.backHomeAt);

  constructor(
    private summer: Summer,
    private clock: GameClock,
    private dialogueBox: DialogueBox,
    private inventory: Inventory,
    private needs: Needs,
    private backdrop: TownBackdrop,
    private fade: (then: () => void, holdMs?: number) => void,
    /** Back in grandma's yard after the bus. */
    private arriveHome: () => void,
    /** Straight to the next morning, skipping the rest of today. */
    private sleepUntilMorning: () => void,
  ) {
    this.shops = town.shops.map((stock) => ({
      label: stock.label,
      shop: new Shop(dialogueBox, inventory, stock as unknown as Stock),
    }));
  }

  /**
   * Grandma is in town: Sundays from eight until four, with or without the
   * player, and any day the player asked to go.
   */
  grandmaAway(now: number): boolean {
    return (this.sunday || this.summer.marketDay) && now >= this.leaves && now < this.backHomeAt;
  }

  get sunday(): boolean {
    return weekdayOf(this.summer.day) === town.tripWeekday && !this.summer.lastDay;
  }

  /** Saturday, not agreed yet: grandma's own offer for the morning talk. */
  offerLines(): Line[] {
    return this.canAsk ? lines('marketOffer') : [];
  }

  /**
   * Any day, for trying it out (docs/MVP.md): the player asks to go to the
   * market, then waits for tomorrow or skips straight to the 8:00 bus.
   */
  askOption(): Option[] {
    if (this.summer.marketTomorrow || this.summer.lastDay || this.summer.day + 1 >= LAST_DAY) return [];
    return [
      {
        label: 'поехать с тобой на рынок',
        run: () => {
          this.summer.marketOn = this.summer.day + 1;
          this.dialogueBox.choose(lines('marketAgreed'), [
            { label: 'подождать до завтра', run: () => this.dialogueBox.say(lines('marketWait')) },
            { label: 'сразу утро, 8:00', run: () => this.sleepUntilMorning() },
          ]);
        },
      },
    ];
  }

  /** Saturday evening after saying yes: grandma reminds about the early start. */
  eveningLines(): Line[] {
    return this.summer.marketTomorrow ? lines('marketTomorrow') : [];
  }

  /** Sunday morning without the player: a note on the table instead of grandma. */
  noteLines(): Line[] {
    return lines('marketNote');
  }

  /** Sunday morning, bus time: grandma wakes the player and off they go. */
  go(): void {
    this.dialogueBox.say(lines('marketWakeUp'), () =>
      this.fade(() => {
        this.clock.advance(this.shoppingAt - this.clock.minutes);
        // Grandma fed the player at the market: pies and kvass.
        this.needs.update(this.clock.minutes, 0, 'still');
        this.needs.consume(town.lunch);
        this.inventory.rubles += town.pays;
        // A still of the market: grandma and the player by their stall.
        this.backdrop.showPicture('market');
        const pay = dialogue.marketPay.replace('{rubles}', `${town.pays} ${rublesWord(town.pays)}`);
        this.dialogueBox.say([...lines('marketTrip'), ['Бабушка', pay]], () => this.townMenu());
      }, 800),
    );
  }

  /** The street in town: a shop or back to grandma. Q just looks around again. */
  private townMenu(): void {
    const options: Option[] = this.shops.map(({ label, shop }) => ({
      label,
      run: () => shop.visit([], () => this.townMenu()),
    }));
    options.push({ label: 'к бабушке, на автобус', run: () => this.goHome() });
    this.backdrop.show(town.city);
    const where: Line = ['', `${town.city}. Куда пойти?   (в кармане ${this.inventory.rubles} р.)`];
    this.dialogueBox.choose([where], options, () => this.townMenu());
  }

  private goHome(): void {
    this.dialogueBox.say(lines('marketBus'), () =>
      this.fade(() => {
        this.clock.advance(Math.max(0, this.backHomeAt - this.clock.minutes));
        this.backdrop.hide();
        this.arriveHome();
        this.dialogueBox.say(lines('marketBack'));
      }, 800),
    );
  }

  private get saturday(): boolean {
    return weekdayOf(this.summer.day) === town.askOnWeekday;
  }

  private get canAsk(): boolean {
    return this.saturday && !this.summer.marketTomorrow;
  }
}

function lines(key: keyof typeof dialogue): Line[] {
  return dialogue[key] as Line[];
}
