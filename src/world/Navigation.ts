import type { Point, Road } from './layout';

/** Road ends closer than this are treated as one junction. */
const JOIN_DISTANCE = 16;
/** A dead end this close to another road meets it there (a T-junction). */
const T_JUNCTION_DISTANCE = 25;

/**
 * Walking routes for people: the street network as a graph, so villagers go
 * along the roads instead of through houses. Places off the road connect to
 * the nearest point of the nearest road.
 */
export class Navigation {
  private nodes: Point[] = [];
  private edges: Map<number, Set<number>> = new Map();

  constructor(roads: Road[]) {
    for (const road of roads) {
      let previous = -1;
      for (const p of road.points) {
        const node = this.nodeAt(p);
        if (previous >= 0 && previous !== node) this.link(previous, node);
        previous = node;
      }
    }
    // Paths often join a street partway along it, not at a vertex.
    for (const [node, neighbours] of [...this.edges]) {
      if (neighbours.size !== 1) continue;
      const nearest = this.nearestSegment(this.nodes[node], (a, b) => a !== node && b !== node && !neighbours.has(a) && !neighbours.has(b));
      if (nearest && nearest.distance < T_JUNCTION_DISTANCE) this.link(node, this.splice(nearest));
    }
  }

  /** Waypoints from `from` to `to`, both included, along the roads. */
  route(from: Point, to: Point): Point[] {
    const start = this.attach(from);
    const end = this.attach(to);
    const path = this.shortest(start, end);
    if (!path) return [from, to];
    return [from, ...path.map((i) => this.nodes[i]), to];
  }

  private nodeAt(p: Point): number {
    const near = this.nodes.findIndex((n) => distance(n, p) < JOIN_DISTANCE);
    if (near >= 0) return near;
    this.nodes.push(p);
    return this.nodes.length - 1;
  }

  private link(a: number, b: number): void {
    if (!this.edges.has(a)) this.edges.set(a, new Set());
    if (!this.edges.has(b)) this.edges.set(b, new Set());
    this.edges.get(a)!.add(b);
    this.edges.get(b)!.add(a);
  }

  /** Splice a point onto the nearest road segment; returns the road-side node. */
  private attach(p: Point): number {
    const nearest = this.nearestSegment(p, () => true);
    return nearest ? this.splice(nearest) : this.nodeAt(p);
  }

  private nearestSegment(p: Point, allowed: (a: number, b: number) => boolean) {
    let best: { distance: number; a: number; b: number; point: Point } | null = null;
    for (const [a, neighbours] of this.edges) {
      for (const b of neighbours) {
        if (b < a || !allowed(a, b)) continue;
        const point = closestOnSegment(p, this.nodes[a], this.nodes[b]);
        const d = distance(p, point);
        if (!best || d < best.distance) best = { distance: d, a, b, point };
      }
    }
    return best;
  }

  /** Split segment a–b with a fresh node, not merged with a nearby junction. */
  private splice(at: { a: number; b: number; point: Point }): number {
    this.nodes.push(at.point);
    const node = this.nodes.length - 1;
    this.edges.get(at.a)!.delete(at.b);
    this.edges.get(at.b)!.delete(at.a);
    this.link(node, at.a);
    this.link(node, at.b);
    return node;
  }

  private shortest(start: number, end: number): number[] | null {
    const cost = new Map<number, number>([[start, 0]]);
    const previous = new Map<number, number>();
    const open = new Set([start]);
    while (open.size > 0) {
      let current = -1;
      for (const n of open) if (current < 0 || cost.get(n)! < cost.get(current)!) current = n;
      open.delete(current);
      if (current === end) break;
      for (const next of this.edges.get(current) ?? []) {
        const c = cost.get(current)! + distance(this.nodes[current], this.nodes[next]);
        if (c < (cost.get(next) ?? Infinity)) {
          cost.set(next, c);
          previous.set(next, current);
          open.add(next);
        }
      }
    }
    if (!cost.has(end)) return null;
    const path = [end];
    while (path[0] !== start) path.unshift(previous.get(path[0])!);
    return path;
  }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function closestOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return { x: a.x + t * dx, y: a.y + t * dy };
}
