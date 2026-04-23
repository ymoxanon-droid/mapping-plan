import dagre from "dagre";
import { Position, type Edge, type Node } from "reactflow";

const NODE_W = 240;
const NODE_H = 78;
const TRIGGER_W = 220;
const TRIGGER_H = 70;

export function layoutFlow(
  nodes: Node[],
  edges: Edge[],
  opts: {
    direction?: "LR" | "TB";
    nodesep?: number;
    ranksep?: number;
    layoutOnlyEdges?: Edge[];
  } = {}
): { nodes: Node[]; edges: Edge[] } {
  const direction = opts.direction ?? "LR";
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: opts.nodesep ?? 36,
    ranksep: opts.ranksep ?? 70,
    marginx: 20,
    marginy: 20
  });

  nodes.forEach((n) => {
    const w = n.type === "trigger" ? TRIGGER_W : NODE_W;
    const h = n.type === "trigger" ? TRIGGER_H : NODE_H;
    g.setNode(n.id, { width: w, height: h });
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));
  // Invisible edges — ikut menentukan layout tapi tidak masuk ke React Flow render.
  (opts.layoutOnlyEdges ?? []).forEach((e) =>
    g.setEdge(e.source, e.target, { weight: 10, minlen: 1 })
  );

  dagre.layout(g);

  return {
    nodes: nodes.map((n) => {
      const gn = g.node(n.id);
      return {
        ...n,
        position: { x: gn.x - gn.width / 2, y: gn.y - gn.height / 2 },
        targetPosition: direction === "LR" ? Position.Left : Position.Top,
        sourcePosition: direction === "LR" ? Position.Right : Position.Bottom
      };
    }),
    edges
  };
}
