import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fromPreset, randomGraph, createGraph } from '../public/js/graph.js';
import { kruskal, prim, dijkstra, shortestPath } from '../public/js/algorithms.js';
import { MinHeap } from '../public/js/heap.js';
import { DisjointSet } from '../public/js/dsu.js';

// Reference all-pairs distances to check Dijkstra against.
function floydWarshall(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const d = new Map(ids.map((a) => [a, new Map(ids.map((b) => [b, a === b ? 0 : Infinity]))]));
  for (const e of graph.edges) {
    d.get(e.u).set(e.v, Math.min(d.get(e.u).get(e.v), e.w));
    d.get(e.v).set(e.u, Math.min(d.get(e.v).get(e.u), e.w));
  }
  for (const k of ids)
    for (const i of ids)
      for (const j of ids) {
        const via = d.get(i).get(k) + d.get(k).get(j);
        if (via < d.get(i).get(j)) d.get(i).set(j, via);
      }
  return d;
}

test('min-heap pops in sorted order', () => {
  const h = new MinHeap();
  [5, 3, 9, 1, 7, 1, 4].forEach((x) => h.push(x));
  const out = [];
  while (!h.isEmpty()) out.push(h.pop());
  assert.deepEqual(out, [1, 1, 3, 4, 5, 7, 9]);
  assert.equal(h.pop(), undefined);
});

test('disjoint set merges and detects same component', () => {
  const s = new DisjointSet(['a', 'b', 'c', 'd']);
  assert.equal(s.union('a', 'b'), true);
  assert.equal(s.union('c', 'd'), true);
  assert.equal(s.union('b', 'a'), false);
  assert.equal(s.union('a', 'd'), true);
  assert.equal(s.find('b'), s.find('c'));
  assert.deepEqual(s.groups(), [['a', 'b', 'c', 'd']]);
});

test('textbook graph MST weight is 37 for both Kruskal and Prim', () => {
  const g = fromPreset('textbook');
  assert.equal(kruskal(g).total, 37);
  for (const start of g.nodes.map((n) => n.id)) assert.equal(prim(g, start).total, 37);
  assert.equal(kruskal(g).treeEdges.length, g.nodes.length - 1);
});

test('Kruskal and Prim agree on random graphs', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const g = randomGraph(6 + (seed % 6), seed);
    const k = kruskal(g);
    const p = prim(g, g.nodes[seed % g.nodes.length].id);
    assert.equal(k.total, p.total, `seed ${seed}`);
    assert.equal(k.treeEdges.length, g.nodes.length - 1, `seed ${seed} not connected`);
  }
});

test('Dijkstra matches Floyd–Warshall on presets and random graphs', () => {
  const graphs = [fromPreset('textbook'), fromPreset('campus')];
  for (let seed = 1; seed <= 100; seed++) graphs.push(randomGraph(7 + (seed % 4), seed * 7919));

  for (const g of graphs) {
    const ref = floydWarshall(g);
    for (const { id: src } of g.nodes) {
      const r = dijkstra(g, src);
      for (const { id: t } of g.nodes) {
        assert.equal(r.dist[t], ref.get(src).get(t), `${g.label} ${src}->${t}`);
        const path = shortestPath(r, t);
        const cost = path.edges.reduce((sum, id) => sum + g.edges[id].w, 0);
        assert.equal(cost, r.dist[t]);
        assert.equal(path.nodes[0], src);
        assert.equal(path.nodes.at(-1), t);
      }
    }
  }
});

test('disconnected graph yields a spanning forest and unreachable nodes', () => {
  const g = createGraph({
    label: 'split',
    nodes: [['A', 0, 0], ['B', 1, 0], ['C', 2, 0], ['D', 3, 0]],
    edges: [['A', 'B', 3], ['C', 'D', 5]],
  });
  assert.equal(kruskal(g).total, 8);
  assert.equal(prim(g, 'A').total, 3);
  const r = dijkstra(g, 'A');
  assert.equal(r.dist.C, Infinity);
  assert.equal(shortestPath(r, 'C'), null);
});

test('every run starts and ends with a recorded step', () => {
  const g = fromPreset('campus');
  for (const run of [kruskal(g), prim(g, 'S'), dijkstra(g, 'S')]) {
    assert.ok(run.steps.length > 3);
    assert.equal(run.steps.at(-1).final, true);
    for (const s of run.steps) assert.ok(s.message.length > 0 && s.ds.rows);
  }
});
