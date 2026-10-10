// Binary min-heap used as the priority queue for Prim and Dijkstra.
// push and pop are O(log n); peek is O(1).

export class MinHeap {
  constructor(compare = (a, b) => a - b) {
    this.items = [];
    this.compare = compare;
  }

  get size() {
    return this.items.length;
  }

  isEmpty() {
    return this.items.length === 0;
  }

  peek() {
    return this.items[0];
  }

  push(value) {
    this.items.push(value);
    this.#siftUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this.#siftDown(0);
    }
    return top;
  }

  // Heap contents in priority order, for display only (does not modify the heap).
  toSortedArray() {
    return [...this.items].sort(this.compare);
  }

  #siftUp(i) {
    const { items, compare } = this;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (compare(items[i], items[parent]) >= 0) break;
      [items[i], items[parent]] = [items[parent], items[i]];
      i = parent;
    }
  }

  #siftDown(i) {
    const { items, compare } = this;
    const n = items.length;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      if (left < n && compare(items[left], items[smallest]) < 0) smallest = left;
      if (right < n && compare(items[right], items[smallest]) < 0) smallest = right;
      if (smallest === i) break;
      [items[i], items[smallest]] = [items[smallest], items[i]];
      i = smallest;
    }
  }
}
