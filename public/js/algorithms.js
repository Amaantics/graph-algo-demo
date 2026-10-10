// Kruskal, Prim and Dijkstra, written to record a snapshot after every decision.
// Each step holds the full visual state (edge colours, node colours, labels),
// a sentence explaining the choice, and a view of the data structure driving it,
// so the UI can move backwards and forwards freely.
//
// Edge states: candidate (being examined), tree (chosen), tentative (in the queue
// or current best path), rejected (discarded). Node states: current, done.

import { MinHeap } from './heap.js';
import { DisjointSet } from './dsu.js';
import { adjacency } from './graph.js';

class Recorder {
  constructor() {
    this.steps = [];
    this.edges = {};
    this.nodes = {};
    this.labels = {};
  }

  edge(id, state) {
    if (state) this.edges[id] = state;
    else delete this.edges[id];
  }

  node(id, state) {
    if (state) this.nodes[id] = state;
    else delete this.nodes[id];
  }

  push(message, ds, extra = {}) {
    this.steps.push({
      edges: { ...this.edges },
      nodes: { ...this.nodes },
      labels: { ...this.labels },
      message,
      ds,
      ...extra,
    });
  }
}

const edgeName = (e) => `${e.u}–${e.v}`;
const fmt = (d) => (d === Infinity ? '∞' : String(d));
const byWeight = (a, b) => a.w - b.w || a.edge.id - b.edge.id;

// ---------------------------------------------------------------- Kruskal

export function kruskal(graph) {
  const rec = new Recorder();
  const target = graph.nodes.length - 1;
  const sorted = [...graph.edges].sort((a, b) => a.w - b.w || a.id - b.id);
  const dsu = new DisjointSet(graph.nodes.map((n) => n.id));
  const status = new Map(sorted.map((e) => [e.id, '']));
  const chosen = [];
  let total = 0;

  const table = (active) => ({
    title: 'Edges sorted by weight',
    columns: ['Edge', 'w', 'Status'],
    rows: sorted.map((e) => [edgeName(e), e.w, status.get(e.id)]),
    active: active ? sorted.indexOf(active) : -1,
    footer: 'Components: ' + dsu.groups().map((g) => `{${g.join(',')}}`).join(' '),
  });

  rec.push(
    `Sort all ${sorted.length} edges by weight. Every node starts as its own component. ` +
      `Kruskal will take the lightest edge that joins two different components.`,
    table(null),
  );

  for (const e of sorted) {
    if (chosen.length === target) break;
    rec.edge(e.id, 'candidate');
    status.set(e.id, 'checking');
    rec.push(
      `Lightest unchecked edge: ${edgeName(e)} (w = ${e.w}). Are ${e.u} and ${e.v} in different components?`,
      table(e),
    );

    if (dsu.union(e.u, e.v)) {
      chosen.push(e);
      total += e.w;
      status.set(e.id, 'taken');
      rec.edge(e.id, 'tree');
      rec.node(e.u, 'done');
      rec.node(e.v, 'done');
      rec.push(
        `Yes. Adding ${edgeName(e)} connects two components without a cycle, so take it. ` +
          `Tree weight is now ${total} (${chosen.length}/${target} edges).`,
        table(e),
      );
    } else {
      status.set(e.id, 'cycle');
      rec.edge(e.id, 'rejected');
      rec.push(
        `No. ${e.u} and ${e.v} are already connected, so ${edgeName(e)} would close a cycle. Skip it.`,
        table(e),
      );
    }
  }

  const spanning = chosen.length === target;
  rec.push(
    spanning
      ? `Done. ${target} edges chosen, so every node is connected. Minimum spanning tree weight = ${total}.`
      : `Every edge checked. The graph is disconnected, so this is a minimum spanning forest of weight ${total}.`,
    table(null),
    { final: true },
  );

  return { steps: rec.steps, total, treeEdges: chosen.map((e) => e.id) };
}

// ------------------------------------------------------------------- Prim

export function prim(graph, start) {
  const rec = new Recorder();
  const adj = adjacency(graph);
  const n = graph.nodes.length;
  const inTree = new Set([start]);
  const heap = new MinHeap(byWeight);
  const chosen = [];
  let total = 0;

  const table = () => ({
    title: 'Priority queue (min-heap of crossing edges)',
    columns: ['Edge', 'w', 'Leads to'],
    rows: heap.toSortedArray().map((it) => [edgeName(it.edge), it.w, it.to]),
    active: heap.isEmpty() ? -1 : 0,
    footer: `In tree: ${[...inTree].join(', ')}`,
  });

  const pushEdgesFrom = (u) => {
    let pushed = 0;
    for (const { edge, to } of adj.get(u)) {
      if (inTree.has(to)) continue;
      heap.push({ w: edge.w, edge, to });
      rec.edge(edge.id, 'tentative');
      pushed++;
    }
    return pushed;
  };

  rec.node(start, 'current');
  const first = pushEdgesFrom(start);
  rec.push(
    `Start the tree at ${start}. Push its ${first} edge${first === 1 ? '' : 's'} onto the min-heap. ` +
      `Prim always grows the tree by its lightest edge to a node outside it.`,
    table(),
  );
  rec.node(start, 'done');

  while (!heap.isEmpty() && inTree.size < n) {
    const { edge, to, w } = heap.pop();
    rec.edge(edge.id, 'candidate');

    if (inTree.has(to)) {
      rec.push(`Pop ${edgeName(edge)} (w = ${w}). ${to} is already in the tree, so this entry is stale.`, table());
      rec.edge(edge.id, 'rejected');
      rec.push(`Discard ${edgeName(edge)}. It would only connect two tree nodes and close a cycle.`, table());
      continue;
    }

    rec.push(`Pop ${edgeName(edge)} (w = ${w}): the lightest edge crossing from the tree to ${to}.`, table());
    inTree.add(to);
    chosen.push(edge);
    total += w;
    rec.edge(edge.id, 'tree');
    rec.node(to, 'current');
    const pushed = pushEdgesFrom(to);
    rec.push(
      `Add ${to} to the tree. Tree weight is now ${total} (${chosen.length}/${n - 1} edges). ` +
        (pushed ? `Push ${pushed} new edge${pushed === 1 ? '' : 's'} leaving ${to}.` : `${to} has no new edges to push.`),
      table(),
    );
    rec.node(to, 'done');
  }

  // Edges still sitting in the heap are no longer interesting once the tree is complete.
  for (const id of Object.keys(rec.edges)) if (rec.edges[id] === 'tentative') rec.edge(id, null);

  const spanning = inTree.size === n;
  rec.push(
    spanning
      ? `Done. All ${n} nodes are in the tree. Minimum spanning tree weight = ${total}.`
      : `The heap is empty but only ${inTree.size}/${n} nodes were reached: the graph is disconnected. Tree weight = ${total}.`,
    table(),
    { final: true },
  );

  return { steps: rec.steps, total, treeEdges: chosen.map((e) => e.id) };
}

// --------------------------------------------------------------- Dijkstra

export function dijkstra(graph, source) {
  const rec = new Recorder();
  const adj = adjacency(graph);
  const dist = new Map(graph.nodes.map((n) => [n.id, Infinity]));
  const prev = new Map(); // node -> edge used to reach it
  const settled = new Set();
  const heap = new MinHeap((a, b) => a.d - b.d || a.node.localeCompare(b.node));

  const label = (id) => (rec.labels[id] = fmt(dist.get(id)));
  const table = () => ({
    title: 'Distances + priority queue',
    columns: ['Node', 'dist', 'via', 'State'],
    rows: graph.nodes.map((n) => [
      n.id,
      fmt(dist.get(n.id)),
      prev.has(n.id) ? (prev.get(n.id).u === n.id ? prev.get(n.id).v : prev.get(n.id).u) : '–',
      settled.has(n.id) ? 'settled' : dist.get(n.id) < Infinity ? 'in queue' : '',
    ]),
    active: -1,
    footer: 'Queue: ' + (heap.isEmpty() ? 'empty' : heap.toSortedArray().map((it) => `${it.node}:${it.d}`).join('  ')),
  });

  dist.set(source, 0);
  graph.nodes.forEach((n) => label(n.id));
  heap.push({ d: 0, node: source });
  rec.push(`Set dist(${source}) = 0 and every other distance to ∞. Put ${source} on the min-heap.`, table());

  while (!heap.isEmpty()) {
    const { d, node: u } = heap.pop();
    if (settled.has(u)) {
      rec.push(`Pop ${u} (${d}): stale entry, since ${u} was already settled at ${dist.get(u)}. Skip it.`, table());
      continue;
    }

    settled.add(u);
    rec.node(u, 'current');
    if (prev.has(u)) rec.edge(prev.get(u).id, 'tree');
    rec.push(
      `Pop ${u} with distance ${d}. It's the closest unsettled node, so dist(${u}) = ${d} is final. ` +
        `Now relax its edges.`,
      table(),
    );

    for (const { edge, to: v } of adj.get(u)) {
      if (settled.has(v)) continue;
      const before = rec.edges[edge.id];
      rec.edge(edge.id, 'candidate');
      const nd = d + edge.w;
      const old = dist.get(v);

      if (nd < old) {
        const replaced = prev.get(v);
        if (replaced) rec.edge(replaced.id, null);
        dist.set(v, nd);
        prev.set(v, edge);
        label(v);
        heap.push({ d: nd, node: v });
        rec.push(
          `Relax ${u}→${v}: ${d} + ${edge.w} = ${nd} < ${fmt(old)}. Update dist(${v}) = ${nd} and push ${v}.`,
          table(),
        );
        rec.edge(edge.id, 'tentative');
      } else {
        rec.push(`Check ${u}→${v}: ${d} + ${edge.w} = ${nd} ≥ ${fmt(old)}. No improvement.`, table());
        rec.edge(edge.id, before ?? null);
      }
    }

    rec.node(u, 'done');
  }

  let treeWeight = 0;
  for (const e of prev.values()) {
    rec.edge(e.id, 'tree');
    treeWeight += e.w;
  }
  const unreachable = graph.nodes.filter((n) => dist.get(n.id) === Infinity).map((n) => n.id);
  rec.push(
    `Done. The highlighted edges form the shortest-path tree from ${source}` +
      (unreachable.length ? ` (unreachable: ${unreachable.join(', ')})` : '') +
      `. Click any node to trace its shortest path.`,
    table(),
    { final: true },
  );

  return {
    steps: rec.steps,
    dist: Object.fromEntries(dist),
    prev,
    source,
    treeWeight,
    treeEdges: [...prev.values()].map((e) => e.id),
  };
}

// Walks prev pointers back from target. Returns null if target is unreachable.
export function shortestPath(result, target) {
  if (result.dist[target] === Infinity) return null;
  const nodes = [target];
  const edges = [];
  let cur = target;
  while (cur !== result.source) {
    const e = result.prev.get(cur);
    edges.push(e.id);
    cur = e.u === cur ? e.v : e.u;
    nodes.push(cur);
  }
  return { nodes: nodes.reverse(), edges, cost: result.dist[target] };
}
