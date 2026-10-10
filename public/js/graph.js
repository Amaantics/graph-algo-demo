// Graph model shared by the renderer and the algorithms.
// Nodes carry their own layout coordinates inside an 800 x 500 viewBox.

export const VIEW_W = 800;
export const VIEW_H = 500;

export const PRESETS = {
  textbook: {
    label: 'Textbook (9 nodes)',
    nodes: [
      ['A', 70, 250], ['B', 200, 110], ['C', 400, 110], ['D', 600, 110], ['E', 730, 250],
      ['F', 600, 390], ['G', 400, 390], ['H', 200, 390], ['I', 300, 250],
    ],
    edges: [
      ['A', 'B', 4], ['A', 'H', 8], ['B', 'H', 11], ['B', 'C', 8], ['C', 'I', 2],
      ['C', 'F', 4], ['C', 'D', 7], ['D', 'F', 14], ['D', 'E', 9], ['E', 'F', 10],
      ['F', 'G', 2], ['G', 'I', 6], ['G', 'H', 1], ['H', 'I', 7],
    ],
  },
  campus: {
    label: 'Campus (7 nodes)',
    nodes: [
      ['S', 90, 250], ['A', 260, 110], ['B', 260, 390], ['C', 450, 250],
      ['D', 620, 110], ['E', 620, 390], ['T', 740, 250],
    ],
    edges: [
      ['S', 'A', 7], ['S', 'B', 3], ['A', 'B', 2], ['A', 'C', 4], ['B', 'C', 9],
      ['A', 'D', 12], ['C', 'D', 3], ['C', 'E', 5], ['B', 'E', 14], ['D', 'T', 6],
      ['E', 'T', 4], ['D', 'E', 8],
    ],
  },
};

export function createGraph(spec) {
  return {
    label: spec.label,
    nodes: spec.nodes.map(([id, x, y]) => ({ id, x, y })),
    edges: spec.edges.map(([u, v, w], i) => ({ id: i, u, v, w })),
  };
}

export function fromPreset(name) {
  return createGraph(PRESETS[name]);
}

// Adjacency list built on demand: node id -> [{ edge, to }].
export function adjacency(graph) {
  const adj = new Map(graph.nodes.map((n) => [n.id, []]));
  for (const edge of graph.edges) {
    adj.get(edge.u).push({ edge, to: edge.v });
    adj.get(edge.v).push({ edge, to: edge.u });
  }
  return adj;
}

// Small deterministic PRNG so a seed always reproduces the same graph.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Random connected planar-looking graph: nodes on a jittered grid,
// a nearest-neighbour spanning tree for connectivity, then extra short edges
// that don't cross anything already drawn.
export function randomGraph(n = 8, seed = Date.now()) {
  const rand = mulberry32(seed);
  const cols = Math.ceil(Math.sqrt(n * 1.6));
  const rows = Math.ceil(n / cols);
  const margin = 60;
  const cellW = (VIEW_W - 2 * margin) / cols;
  const cellH = (VIEW_H - 2 * margin) / rows;

  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([r, c]);
  shuffle(cells, rand);

  const nodes = cells.slice(0, n).map(([r, c], i) => ({
    id: String.fromCharCode(65 + i),
    x: Math.round(margin + (c + 0.5) * cellW + (rand() - 0.5) * cellW * 0.5),
    y: Math.round(margin + (r + 0.5) * cellH + (rand() - 0.5) * cellH * 0.5),
  }));

  const segments = [];
  const has = new Set();
  const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const edges = [];
  const addEdge = (a, b) => {
    has.add(key(a.id, b.id));
    segments.push([a, b]);
    edges.push([a.id, b.id, 1 + Math.floor(rand() * 20)]);
  };
  // An edge is unusable if it crosses another edge or passes too close to a third node.
  const crossesExisting = (a, b) =>
    segments.some(([p, q]) => segmentsCross(a, b, p, q)) ||
    nodes.some((c) => c !== a && c !== b && distToSegment(c, a, b) < 34);

  for (let i = 1; i < n; i++) {
    const byDistance = nodes.slice(0, i).sort((p, q) => dist(nodes[i], p) - dist(nodes[i], q));
    const target = byDistance.find((p) => !crossesExisting(nodes[i], p)) ?? byDistance[0];
    addEdge(nodes[i], target);
  }

  for (const a of nodes) {
    const nearest = nodes
      .filter((b) => b !== a)
      .sort((p, q) => dist(a, p) - dist(a, q))
      .slice(0, 3);
    for (const b of nearest) {
      if (has.has(key(a.id, b.id)) || crossesExisting(a, b)) continue;
      if (rand() < 0.75) addEdge(a, b);
    }
  }

  return createGraph({
    label: `Random (${n} nodes)`,
    nodes: nodes.map((p) => [p.id, p.x, p.y]),
    edges,
  });
}

function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// True when segments ab and cd properly intersect (sharing an endpoint doesn't count).
function segmentsCross(a, b, c, d) {
  if (a === c || a === d || b === c || b === d) return false;
  const orient = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
}
