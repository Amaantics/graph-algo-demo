// Disjoint-set union (union-find) for Kruskal's cycle check.
// Union by rank + path compression gives near-constant amortised time per operation.

export class DisjointSet {
  constructor(ids) {
    this.parent = new Map(ids.map((id) => [id, id]));
    this.rank = new Map(ids.map((id) => [id, 0]));
  }

  find(x) {
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root);
    // Path compression: point every node on the way directly at the root.
    while (this.parent.get(x) !== root) {
      const next = this.parent.get(x);
      this.parent.set(x, root);
      x = next;
    }
    return root;
  }

  // Returns false when a and b were already in the same set.
  union(a, b) {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank.get(ra) < this.rank.get(rb)) [ra, rb] = [rb, ra];
    this.parent.set(rb, ra);
    if (this.rank.get(ra) === this.rank.get(rb)) this.rank.set(ra, this.rank.get(ra) + 1);
    return true;
  }

  // Current components as sorted arrays, for display.
  groups() {
    const byRoot = new Map();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      if (!byRoot.has(root)) byRoot.set(root, []);
      byRoot.get(root).push(id);
    }
    return [...byRoot.values()]
      .map((g) => g.sort())
      .sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
  }
}
