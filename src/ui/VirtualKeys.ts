/**
 * On-screen controls press the same keys as the keyboard, so the game has
 * one input path. Events go to `window`, where Phaser listens; `keyCode` is
 * set by hand because Safari ignores it in the event constructor.
 */
const KEYS = {
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  ShiftLeft: 16,
  KeyE: 69,
  KeyQ: 81,
  KeyT: 84,
  KeyP: 80,
} as const;

export type VirtualKey = keyof typeof KEYS;

const held = new Set<VirtualKey>();

export function keyDown(code: VirtualKey): void {
  if (held.has(code)) return;
  held.add(code);
  send('keydown', code);
}

export function keyUp(code: VirtualKey): void {
  if (!held.delete(code)) return;
  send('keyup', code);
}

/** Down now, up a moment later so the game sees a full press. */
export function tapKey(code: VirtualKey): void {
  keyDown(code);
  window.setTimeout(() => keyUp(code), 60);
}

export function releaseAll(): void {
  [...held].forEach(keyUp);
}

function send(type: 'keydown' | 'keyup', code: VirtualKey): void {
  const event = new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'keyCode', { get: () => KEYS[code] });
  Object.defineProperty(event, 'which', { get: () => KEYS[code] });
  window.dispatchEvent(event);
}

/** A tablet or phone: a coarse pointer, or `?touch` to try the controls on a desktop. */
export function isTouchDevice(): boolean {
  return /[?&]touch\b/.test(window.location.search) || window.matchMedia('(pointer: coarse)').matches;
}
