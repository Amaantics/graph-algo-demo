// Draws one step of an algorithm run into the SVG canvas.
// The whole picture is rebuilt each time; graphs here are small enough that
// this is simpler than diffing and still instant.

import { VIEW_W, VIEW_H } from './graph.js';

const NS = 'http://www.w3.org/2000/svg';
const R = 20;

function el(tag, attrs = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderGraph(svg, graph, step, { start, path } = {}) {
  svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
  svg.replaceChildren();

  const pos = new Map(graph.nodes.map((n) => [n.id, n]));
  const pathEdges = new Set(path?.edges ?? []);
  const pathNodes = new Set(path?.nodes ?? []);

  const edgeLayer = el('g', { class: 'edges' });
  const labelLayer = el('g', { class: 'weights' });

  for (const e of graph.edges) {
    const a = pos.get(e.u);
    const b = pos.get(e.v);
    const state = step?.edges[e.id] ?? 'idle';
    const cls = ['edge', `edge--${state}`];
    if (path) cls.push(pathEdges.has(e.id) ? 'edge--path' : 'edge--dim');

    edgeLayer.append(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: cls.join(' ') }));

    // Weight label sits at the midpoint, nudged off the line along its normal.
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const g = el('g', {
      class: `weight weight--${state}`,
      transform: `translate(${mx + nx * 12} ${my + ny * 12})`,
    });
    const width = 10 + String(e.w).length * 8;
    g.append(el('rect', { x: -width / 2, y: -10, width, height: 20, rx: 6 }));
    g.append(el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, e.w));
    labelLayer.append(g);
  }

  const nodeLayer = el('g', { class: 'nodes' });
  for (const n of graph.nodes) {
    const state = step?.nodes[n.id] ?? 'idle';
    const cls = ['node', `node--${state}`];
    if (n.id === start) cls.push('node--start');
    if (path && pathNodes.has(n.id)) cls.push('node--path');

    const g = el('g', { class: cls.join(' '), 'data-id': n.id, transform: `translate(${n.x} ${n.y})` });
    g.append(el('circle', { r: R }));
    g.append(el('text', { class: 'node-id', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, n.id));

    const label = step?.labels[n.id];
    if (label !== undefined) {
      const above = n.y > 60;
      g.append(el('text', { class: 'node-dist', 'text-anchor': 'middle', y: above ? -R - 9 : R + 18 }, label));
    }
    nodeLayer.append(g);
  }

  svg.append(edgeLayer, labelLayer, nodeLayer);
}

export function renderTable(container, ds) {
  container.replaceChildren();
  if (!ds) return;

  const title = document.createElement('h3');
  title.textContent = ds.title;

  const table = document.createElement('table');
  const head = table.createTHead().insertRow();
  for (const c of ds.columns) {
    const th = document.createElement('th');
    th.textContent = c;
    head.append(th);
  }
  const body = table.createTBody();
  if (ds.rows.length === 0) {
    const cell = body.insertRow().insertCell();
    cell.colSpan = ds.columns.length;
    cell.className = 'empty';
    cell.textContent = 'empty';
  }
  ds.rows.forEach((row, i) => {
    const tr = body.insertRow();
    if (i === ds.active) tr.className = 'active';
    for (const value of row) {
      const td = tr.insertCell();
      td.textContent = value;
      if (['taken', 'settled'].includes(value)) td.className = 'ok';
      if (value === 'cycle') td.className = 'bad';
    }
  });

  const footer = document.createElement('p');
  footer.className = 'ds-footer';
  footer.textContent = ds.footer ?? '';

  const scroller = document.createElement('div');
  scroller.className = 'table-scroll';
  scroller.append(table);
  container.append(title, scroller, footer);

  // Keep the active row in view without scrolling the whole page.
  const active = scroller.querySelector('tr.active');
  if (active) scroller.scrollTop = active.offsetTop - scroller.clientHeight / 2;
}
