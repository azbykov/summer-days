import dialogue from '../content/dialogue.json';
import shop from '../content/shop.json';
import { clockTime } from '../systems/GameClock';
import type { DialogueBox, Line, Option } from '../ui/DialogueBox';
import { itemName, type Inventory, type ItemId } from './Inventory';

type Goods = { id: ItemId; price: number };

/**
 * The kiosk-container by the bus stop.
 *
 * Deliberately small: a handful of goods at late-90s prices, money the
 * player is given rather than earns, no economy beyond that
 * (docs/MVP.md, «Поручение: хлеб»).
 */
export class Shop {
  private opens = clockTime(shop.opens);
  private closes = clockTime(shop.closes);
  private goods = shop.items as Goods[];

  constructor(
    private dialogueBox: DialogueBox,
    private inventory: Inventory,
    private now: () => number,
  ) {}

  /** `remark`: anything the seller says first, e.g. about the player's looks. */
  visit(remark: Line[] = []): void {
    const now = this.now() % (24 * 60);
    if (now < this.opens || now >= this.closes) {
      this.dialogueBox.say(lines('shopClosed'));
      return;
    }
    this.counter([...remark, ...lines('shopWelcome')]);
  }

  private counter(before: Line[]): void {
    const options: Option[] = this.goods.map((item) => ({
      label: `${itemName(item.id)}, ${item.price} р.`,
      run: () => this.buy(item),
    }));
    // The last line carries what is left in the pocket, so one press opens the counter.
    const [speaker, text] = before[before.length - 1];
    const last: Line = [speaker, `${text}   (в кармане ${this.inventory.rubles} р.)`];
    this.dialogueBox.choose([...before.slice(0, -1), last], options);
  }

  private buy(item: Goods): void {
    if (item.price > this.inventory.rubles) {
      this.counter(lines('shopNotEnough'));
      return;
    }
    if (!this.inventory.add(item.id)) {
      this.counter(lines('shopHandsFull'));
      return;
    }
    this.inventory.rubles -= item.price;
    this.counter([['Продавщица', `${capitalize(itemName(item.id))}. ${item.price} ${rublesWord(item.price)}.`]]);
  }
}

function rublesWord(n: number): string {
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
