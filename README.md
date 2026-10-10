# Graph Algorithms Visual Demo

**Live demo:** [graph-algo-demo.onrender.com](https://graph-algo-demo.onrender.com)

An interactive browser page that steps through **Kruskal's** and **Prim's** minimum spanning tree algorithms and **Dijkstra's** shortest-path algorithm on the *same* weighted graph, so the greedy choice made at every step is visible.

Built for the DSA TA-1 assignment. Plain HTML, CSS and JavaScript (ES modules), with no frameworks and no build step.

## Features

- **Three algorithms on one graph.** Switch between Kruskal, Prim and Dijkstra without changing the graph and compare what each one optimises.
- **Step-by-step playback.** Step forward and back, play or pause, scrub to any step, and set the speed. Every step is a full snapshot, so going backwards is exact.
- **Explanations at each step.** Each decision is explained in plain words, e.g. *"No. G and H are already connected, so H–I would close a cycle. Skip it."*
- **Live data-structure panel.**
  - Kruskal: the sorted edge list and the current union-find components
  - Prim: the min-heap of edges crossing the cut
  - Dijkstra: the distance table, predecessor (`via`) column and priority queue
- **Comparison card.** Shows the MST weight from Kruskal and from Prim (always equal) next to the weight of Dijkstra's shortest-path tree (usually heavier).
- **Path tracing.** After Dijkstra finishes, click any node to highlight its shortest path from the source.
- **Editable layout.** Drag nodes around, click a node to make it the start for Prim/Dijkstra, or generate a random connected graph.
- Keyboard shortcuts (`←` `→` step, `Space` play, `R` reset), plus light and dark themes.

## How each algorithm is visualised

| Algorithm | Greedy choice shown | Data structure | Time |
|---|---|---|---|
| Kruskal | Lightest remaining edge that joins two different components | Sorted edge list + disjoint-set union (union by rank, path compression) | O(E log E) |
| Prim | Lightest edge leaving the current tree | Binary min-heap (lazy deletion of stale entries) | O(E log V) |
| Dijkstra | Unsettled node with the smallest tentative distance | Binary min-heap + distance table | O((V + E) log V) |

Edge colours: **amber** = being examined, **blue dashed** = in the queue / tentative, **green** = chosen, **red dotted** = rejected.

## Run locally

Any static file server works. ES modules don't load from `file://`, so opening the HTML file directly won't work.

```bash
npm start            # python3 -m http.server 8000 --directory public
```

Then open <http://localhost:8000>.

## Tests

The algorithms are checked with Node's built-in test runner (Node 18+, no dependencies):

```bash
npm test
```

The tests check that:

- the textbook graph's MST weight is 37 from every start node
- Kruskal and Prim agree on 200 random graphs
- Dijkstra matches Floyd–Warshall for every source/target pair on 100+ graphs
- disconnected graphs produce a spanning forest and unreachable nodes are reported
- the heap and union-find behave correctly

## Deploy (Render)

`render.yaml` defines a Render static site that runs the tests and then publishes the `public/` folder.

1. In the Render dashboard choose **New → Blueprint** and select this repository.
2. Render reads `render.yaml` and deploys automatically on every push to `main`.

## Project structure

```
public/
  index.html          page layout
  css/style.css       styles (light + dark)
  js/graph.js         graph model, presets, seeded random graph generator
  js/heap.js          binary min-heap
  js/dsu.js           disjoint-set union
  js/algorithms.js    Kruskal / Prim / Dijkstra with step recording
  js/render.js        SVG drawing + data-structure table
  js/app.js           UI state, playback, node dragging
tests/
  algorithms.test.js
```

## References

- Cormen, Leiserson, Rivest, Stein: *Introduction to Algorithms*, chapters 21–24 (the 9-node preset is the classic MST example graph)
- [VisuAlgo](https://visualgo.net/en/mst), used as a reference for the step-by-step animations

## License

MIT
