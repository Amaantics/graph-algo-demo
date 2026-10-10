import { PRESETS, fromPreset, randomGraph } from './graph.js';
import { kruskal, prim, dijkstra, shortestPath } from './algorithms.js';
import { renderGraph, renderTable } from './render.js';

const SPEEDS = [1600, 1100, 750, 450, 250]; // ms per step, slider 1..5

const $ = (sel) => document.querySelector(sel);
const ui = {
  canvas: $('#canvas'),
  algoButtons: [...document.querySelectorAll('[data-algo]')],
  preset: $('#preset'),
  shuffle: $('#shuffle'),
  start: $('#start'),
  startWrap: $('#start-wrap'),
  reset: $('#reset'),
  back: $('#back'),
  play: $('#play'),
  forward: $('#forward'),
  end: $('#end'),
  scrub: $('#scrub'),
  speed: $('#speed'),
  counter: $('#counter'),
  message: $('#message'),
  ds: $('#ds'),
  mstKruskal: $('#mst-kruskal'),
  mstPrim: $('#mst-prim'),
  spt: $('#spt'),
  sptSource: $('#spt-source'),
};

const state = {
  graph: fromPreset('textbook'),
  algo: 'kruskal',
  start: 'A',
  run: null,
  index: 0,
  timer: null,
  path: null,
};

// ------------------------------------------------------------------ setup

for (const [key, preset] of Object.entries(PRESETS)) {
  ui.preset.add(new Option(preset.label, key));
}
ui.preset.add(new Option('Random', 'random'));

ui.algoButtons.forEach((btn) =>
  btn.addEventListener('click', () => {
    state.algo = btn.dataset.algo;
    rebuild();
  }),
);

ui.preset.addEventListener('change', () => {
  loadGraph(ui.preset.value === 'random' ? randomGraph(8 + Math.floor(Math.random() * 3)) : fromPreset(ui.preset.value));
});

ui.shuffle.addEventListener('click', () => {
  ui.preset.value = 'random';
  loadGraph(randomGraph(8 + Math.floor(Math.random() * 3)));
});

ui.start.addEventListener('change', () => {
  state.start = ui.start.value;
  rebuild();
});

ui.reset.addEventListener('click', () => goTo(0));
ui.back.addEventListener('click', () => goTo(state.index - 1));
ui.forward.addEventListener('click', () => goTo(state.index + 1));
ui.end.addEventListener('click', () => goTo(state.run.steps.length - 1));
ui.play.addEventListener('click', togglePlay);
ui.scrub.addEventListener('input', () => goTo(Number(ui.scrub.value)));
ui.speed.addEventListener('input', () => {
  if (state.timer) {
    stop();
    play();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  if (e.key === 'ArrowRight') goTo(state.index + 1);
  else if (e.key === 'ArrowLeft') goTo(state.index - 1);
  else if (e.key === ' ') togglePlay();
  else if (e.key.toLowerCase() === 'r') goTo(0);
  else return;
  e.preventDefault();
});

enableDragging();
loadGraph(state.graph);

// ------------------------------------------------------------------ state

function loadGraph(graph) {
  state.graph = graph;
  const ids = graph.nodes.map((n) => n.id);
  if (!ids.includes(state.start)) state.start = ids[0];
  ui.start.replaceChildren(...ids.map((id) => new Option(id, id)));
  ui.start.value = state.start;
  rebuild();
}

function runAlgorithm(algo) {
  if (algo === 'kruskal') return kruskal(state.graph);
  if (algo === 'prim') return prim(state.graph, state.start);
  return dijkstra(state.graph, state.start);
}

function rebuild() {
  stop();
  state.path = null;
  state.run = runAlgorithm(state.algo);
  state.index = 0;
  ui.scrub.max = state.run.steps.length - 1;
  ui.algoButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.algo === state.algo)));
  ui.startWrap.hidden = state.algo === 'kruskal';
  updateComparison();
  draw();
}

function goTo(i) {
  const last = state.run.steps.length - 1;
  state.index = Math.max(0, Math.min(last, i));
  state.path = null;
  if (state.index === last) stop();
  draw();
}

function play() {
  if (state.index === state.run.steps.length - 1) goTo(0);
  state.timer = setInterval(() => {
    if (state.index >= state.run.steps.length - 1) stop();
    else goTo(state.index + 1);
  }, SPEEDS[Number(ui.speed.value) - 1]);
  ui.play.textContent = 'Pause';
}

function stop() {
  clearInterval(state.timer);
  state.timer = null;
  ui.play.textContent = 'Play';
}

function togglePlay() {
  if (state.timer) stop();
  else play();
}

// --------------------------------------------------------------- drawing

function draw() {
  const steps = state.run.steps;
  const step = steps[state.index];
  const start = state.algo === 'kruskal' ? null : state.start;

  renderGraph(ui.canvas, state.graph, step, { start, path: state.path });
  renderTable(ui.ds, step.ds);

  ui.message.textContent = state.path
    ? `Shortest path ${state.path.nodes.join(' → ')}, total cost ${state.path.cost}.`
    : step.message;
  ui.counter.textContent = `Step ${state.index + 1} / ${steps.length}`;
  ui.scrub.value = state.index;
  ui.back.disabled = ui.reset.disabled = state.index === 0;
  ui.forward.disabled = ui.end.disabled = state.index === steps.length - 1;
}

// Totals for all three algorithms on the current graph, so the difference
// between "cheapest tree overall" and "cheapest routes from one node" is concrete.
function updateComparison() {
  ui.mstKruskal.textContent = kruskal(state.graph).total;
  ui.mstPrim.textContent = prim(state.graph, state.start).total;
  ui.spt.textContent = dijkstra(state.graph, state.start).treeWeight;
  ui.sptSource.textContent = state.start;
}

// ------------------------------------------------------- node interaction

// Drag nodes to rearrange the layout. A press without movement counts as a click:
// on a finished Dijkstra run it traces the path to that node; otherwise it sets
// the start node for Prim and Dijkstra.
function enableDragging() {
  let drag = null;

  const toSvg = (evt) => {
    const pt = new DOMPoint(evt.clientX, evt.clientY).matrixTransform(ui.canvas.getScreenCTM().inverse());
    return { x: Math.max(24, Math.min(776, pt.x)), y: Math.max(24, Math.min(476, pt.y)) };
  };

  ui.canvas.addEventListener('pointerdown', (evt) => {
    const g = evt.target.closest('.node');
    if (!g) return;
    drag = { id: g.dataset.id, moved: false, x: evt.clientX, y: evt.clientY };
    ui.canvas.setPointerCapture(evt.pointerId);
  });

  ui.canvas.addEventListener('pointermove', (evt) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(evt.clientX - drag.x, evt.clientY - drag.y) < 4) return;
    drag.moved = true;
    const node = state.graph.nodes.find((n) => n.id === drag.id);
    Object.assign(node, toSvg(evt));
    draw();
  });

  ui.canvas.addEventListener('pointerup', () => {
    if (drag && !drag.moved) handleNodeClick(drag.id);
    drag = null;
  });
}

function handleNodeClick(id) {
  const finished = state.index === state.run.steps.length - 1;
  if (state.algo === 'dijkstra' && finished) {
    state.path = shortestPath(state.run, id);
    if (!state.path) ui.message.textContent = `${id} is not reachable from ${state.start}.`;
    else draw();
    return;
  }
  if (state.algo !== 'kruskal' && id !== state.start) {
    state.start = id;
    ui.start.value = id;
    rebuild();
  }
}
