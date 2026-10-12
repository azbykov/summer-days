import dialogue from '../content/dialogue.json';
import shop from '../content/shop.json';
import { clockTime } from '../systems/GameClock';
import type { DialogueBox, Line, Option } from '../ui/DialogueBox';
import { itemName, type Inventory, type ItemId } from './Inventory';

type Goods = { id: ItemId; price: number };

/** What one counter sells and what its seller says. */
export type Stock = {
  seller: string;
  goods: Goods[];
  welcome: Line[];
  notEnough: Line[];
  handsFull: Line[];
};

/** The kiosk-container by the bus stop, as a `Stock`. */
export const KIOSK: Stock = {
  seller: 'Продавщица',
  goods: shop.items as Goods[],
  welcome: dialogue.shopWelcome as Line[],
  notEnough: dialogue.shopNotEnough as Line[],
  handsFull: dialogue.shopHandsFull as Line[],
};

/**
 * A shop counter: the kiosk by the bus stop, or a shop in town on market
 * day.
 *
 * Deliberately small: a handful of goods at late-90s prices, money the
 * player is given rather than earns, no economy beyond that
 * (docs/MVP.md, «Поручение: хлеб»).
 */
export class Shop {
  private opens = clockTime(shop.opens);
  private closes = clockTime(shop.closes);

  constructor(
    private dialogueBox: DialogueBox,
    private inventory: Inventory,
    private stock: Stock,
    /** Opening hours apply to the kiosk only; town shops are open when the player is there. */
    private now?: () => number,
  ) {}

  /**
   * `remark`: anything the seller says first, e.g. about the player's looks.
   * `onLeave`: where Q takes the player, if anywhere.
   */
  visit(remark: Line[] = [], onLeave?: () => void): void {
    if (this.now) {
      const now = this.now() % (24 * 60);
      if (now < this.opens || now >= this.closes) {
        this.dialogueBox.say(lines('shopClosed'));
        return;
      }
    }
    this.counter([...remark, ...this.stock.welcome], onLeave);
  }

  private counter(before: Line[], onLeave?: () => void): void {
    const options: Option[] = this.stock.goods.map((item) => ({
      label: `${itemName(item.id)}, ${item.price} р.`,
      run: () => this.buy(item, onLeave),
    }));
    // The last line carries what is left in the pocket, so one press opens the counter.
    const [speaker, text] = before[before.length - 1];
    const last: Line = [speaker, `${text}   (в кармане ${this.inventory.rubles} р.)`];
    this.dialogueBox.choose([...before.slice(0, -1), last], options, onLeave);
  }

  private buy(item: Goods, onLeave?: () => void): void {
    if (item.price > this.inventory.rubles) {
      this.counter(this.stock.notEnough, onLeave);
      return;
    }
    if (!this.inventory.add(item.id)) {
      this.counter(this.stock.handsFull, onLeave);
      return;
    }
    this.inventory.rubles -= item.price;
    this.counter([[this.stock.seller, `${capitalize(itemName(item.id))}. ${item.price} ${rublesWord(item.price)}.`]], onLeave);
  }
}

export function rublesWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'рубль';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'рубля';
  return 'рублей';
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function lines(key: keyof typeof dialogue): Line[] {
  return dialogue[key] as Line[];
}
