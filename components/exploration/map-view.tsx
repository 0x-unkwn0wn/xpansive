"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { getCopy, type UiLanguage } from "@/lib/i18n";
import { getActivePathNodes, getChildren, getParentIds, getVisibleChildren } from "@/lib/exploration-tree";
import type { ExplorationNode, ExplorationState } from "@/lib/types";

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 940;
const NODE_DISTANCE = 190;
const MIN_ZOOM = 0.38;
const MAX_ZOOM = 2.25;
const NODE_DRAG_THRESHOLD = 5;

type Position = { x: number; y: number; vx: number; vy: number };
type Point = { x: number; y: number };
type GraphEdge = { id: string; source: string; target: string };
type GraphNode = ExplorationNode & { depth: number; initialX: number; initialY: number };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function shortTitle(title: string, maxLength: number) {
  return title.length > maxLength ? `${title.slice(0, maxLength - 1)}…` : title;
}

function titleLines(title: string, maxLength: number) {
  const words = title.trim().split(/\s+/);
  if (title.length <= maxLength || words.length < 2) return [shortTitle(title, maxLength)];
  const midpoint = Math.ceil(words.length / 2);
  const first = shortTitle(words.slice(0, midpoint).join(" "), maxLength);
  const second = shortTitle(words.slice(midpoint).join(" "), maxLength);
  return [first, second].filter(Boolean);
}

function collectGraph(state: ExplorationState) {
  const reachable = new Set<string>();
  const depthById = new Map<string, number>();
  function collect(nodeId: string, depth: number) {
    if (reachable.has(nodeId)) return;
    reachable.add(nodeId);
    depthById.set(nodeId, depth);
    getVisibleChildren(state, nodeId).forEach((child) => collect(child.id, depth + 1));
  }
  collect(state.rootNodeId, 0);

  const byDepth = new Map<number, string[]>();
  reachable.forEach((nodeId) => {
    const depth = depthById.get(nodeId) ?? 0;
    byDepth.set(depth, [...(byDepth.get(depth) ?? []), nodeId]);
  });

  const graphNodes: GraphNode[] = [];
  for (const [depth, ids] of byDepth) {
    ids.sort((a, b) => a.localeCompare(b));
    const radius = depth === 0 ? 0 : Math.min(315, 155 + depth * 78);
    ids.forEach((nodeId, index) => {
      const node = state.nodes[nodeId];
      if (!node) return;
      const angle = ids.length === 1 ? -Math.PI / 2 : -Math.PI / 2 + (index / ids.length) * Math.PI * 2;
      graphNodes.push({
        ...node,
        depth,
        initialX: WORLD_WIDTH / 2 + Math.cos(angle) * radius,
        initialY: WORLD_HEIGHT / 2 + Math.sin(angle) * radius,
      });
    });
  }

  const nodeIds = new Set(graphNodes.map((node) => node.id));
  const edges: GraphEdge[] = [];
  graphNodes.forEach((node) => {
    getVisibleChildren(state, node.id).forEach((child) => {
      if (nodeIds.has(child.id)) edges.push({ id: `${node.id}:${child.id}`, source: node.id, target: child.id });
    });
  });
  return { nodes: graphNodes, edges };
}

function readSavedLayout(key: string) {
  if (typeof window === "undefined") return { positions: new Map<string, Position>(), fixed: new Set<string>() };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null") as { positions?: Record<string, Point>; fixed?: string[] } | null;
    const positions = new Map<string, Position>(Object.entries(parsed?.positions ?? {}).map(([id, point]) => [id, { x: point.x, y: point.y, vx: 0, vy: 0 }]));
    return { positions, fixed: new Set(parsed?.fixed ?? []) };
  } catch {
    return { positions: new Map<string, Position>(), fixed: new Set<string>() };
  }
}

function MapNodeDetails({ node, status, fixed, copy, onContinue, onRelease }: { node: GraphNode; status: string; fixed: boolean; copy: ReturnType<typeof getCopy>; onContinue?: (nodeId: string) => void; onRelease: (nodeId: string) => void }) {
  return (
    <aside className="map-selection" aria-live="polite">
      <span className="map-selection__eyebrow">{copy.mapNodeSelected}</span>
      <div className="map-selection__title-row">
        <span className="map-selection__dot is-active" aria-hidden="true" />
        <h2>{node.title}</h2>
      </div>
      <p className="map-selection__status">{status}{fixed ? ` · ${copy.mapFixed}` : ""}</p>
      <p className="map-selection__description">{node.description || node.title}</p>
      <div className="map-selection__actions">
        {onContinue && <button type="button" onClick={() => onContinue(node.id)}>{copy.mapContinue}</button>}
        {fixed && <button type="button" className="is-quiet" onClick={() => onRelease(node.id)}>{copy.mapReleaseNode}</button>}
      </div>
    </aside>
  );
}

export function MapView({ state, activeNodeId, uiLanguage, onSelect }: { state: ExplorationState; activeNodeId: string; uiLanguage: UiLanguage; onSelect?: (nodeId: string) => void }) {
  const copy = getCopy(uiLanguage);
  const graph = useMemo(() => collectGraph(state), [state]);
  const graphSignature = useMemo(() => graph.nodes.map((node) => node.id).join("|") + "::" + graph.edges.map((edge) => edge.id).join("|"), [graph]);
  const layoutStorageKey = `xpansive:map-layout:${state.id}`;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const positionsRef = useRef(new Map<string, Position>());
  const fixedRef = useRef(new Set<string>());
  const knownIdsRef = useRef(new Set<string>());
  const rafRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const firstLayoutRef = useRef(true);
  const [renderVersion, setRenderVersion] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState(activeNodeId);
  const [zoom, setZoom] = useState(0.92);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [hasInitialView, setHasInitialView] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pointersRef = useRef(new Map<number, Point>());
  const panGestureRef = useRef<{ pointerId: number; start: Point; pan: Point; moved: boolean } | null>(null);
  const nodeGestureRef = useRef<{ pointerId: number; nodeId: string; start: Point; origin: Point; moved: boolean } | null>(null);
  const pinchRef = useRef<{ ids: [number, number]; distance: number; zoom: number; pan: Point; worldCenter: Point } | null>(null);

  const bumpRender = useCallback(() => setRenderVersion((value) => value + 1), []);
  const getPosition = useCallback((node: GraphNode) => positionsRef.current.get(node.id) ?? { x: node.initialX, y: node.initialY, vx: 0, vy: 0 }, []);
  const distanceBetween = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const centerBetween = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  const tickSimulation = useCallback((alpha: number, focusIds?: Set<string>) => {
    const positions = positionsRef.current;
    const activeIds = focusIds ?? new Set(graph.nodes.map((node) => node.id));
    const forces = new Map<string, Point>(graph.nodes.map((node) => [node.id, { x: 0, y: 0 }]));
    const canMove = (id: string) => activeIds.has(id) && !fixedRef.current.has(id);
    for (let i = 0; i < graph.nodes.length; i += 1) {
      const first = graph.nodes[i];
      const firstPosition = positions.get(first.id);
      if (!firstPosition) continue;
      for (let j = i + 1; j < graph.nodes.length; j += 1) {
        const second = graph.nodes[j];
        const secondPosition = positions.get(second.id);
        if (!secondPosition) continue;
        let dx = firstPosition.x - secondPosition.x;
        let dy = firstPosition.y - secondPosition.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const repulsion = Math.min(10, 7000 / (distance * distance));
        dx /= distance; dy /= distance;
        const overlap = distance < 88 ? (88 - distance) * 0.16 : 0;
        const amount = repulsion + overlap;
        if (canMove(first.id)) { const force = forces.get(first.id)!; force.x += dx * amount; force.y += dy * amount; }
        if (canMove(second.id)) { const force = forces.get(second.id)!; force.x -= dx * amount; force.y -= dy * amount; }
      }
    }
    graph.edges.forEach((edge) => {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) return;
      let dx = target.x - source.x;
      let dy = target.y - source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const attraction = (distance - NODE_DISTANCE) * 0.0026 * alpha;
      dx /= distance; dy /= distance;
      if (canMove(edge.source)) { const force = forces.get(edge.source)!; force.x += dx * attraction; force.y += dy * attraction; }
      if (canMove(edge.target)) { const force = forces.get(edge.target)!; force.x -= dx * attraction; force.y -= dy * attraction; }
    });
    let energy = 0;
    graph.nodes.forEach((node) => {
      const position = positions.get(node.id);
      if (!position || !canMove(node.id)) return;
      const force = forces.get(node.id)!;
      force.x += (WORLD_WIDTH / 2 - position.x) * 0.00018 * alpha;
      force.y += (WORLD_HEIGHT / 2 - position.y) * 0.00018 * alpha;
      position.vx = (position.vx + force.x * 0.84) * 0.84;
      position.vy = (position.vy + force.y * 0.84) * 0.84;
      position.vx = clamp(position.vx, -8, 8);
      position.vy = clamp(position.vy, -8, 8);
      position.x = clamp(position.x + position.vx, 45, WORLD_WIDTH - 45);
      position.y = clamp(position.y + position.vy, 45, WORLD_HEIGHT - 45);
      energy += Math.abs(position.vx) + Math.abs(position.vy);
    });
    bumpRender();
    return energy;
  }, [bumpRender, graph.edges, graph.nodes]);

  const startSimulation = useCallback((initialAlpha = 0.55, focusIds?: Set<string>) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    let alpha = initialAlpha;
    let frames = 0;
    const step = () => {
      const energy = tickSimulation(alpha, focusIds);
      alpha *= 0.93;
      frames += 1;
      if (alpha > 0.006 && (energy ?? 0) > 0.03 && frames < 260) rafRef.current = requestAnimationFrame(step);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(step);
  }, [tickSimulation]);

  const focusFor = useCallback((nodeIds: string[]) => {
    const focus = new Set(nodeIds);
    graph.edges.forEach((edge) => {
      if (focus.has(edge.source) || focus.has(edge.target)) { focus.add(edge.source); focus.add(edge.target); }
    });
    return focus;
  }, [graph.edges]);

  const fitGraph = useCallback(() => {
    if (!graph.nodes.length) return;
    const points = graph.nodes.map((node) => getPosition(node));
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const graphWidth = Math.max(280, maxX - minX + 180);
    const graphHeight = Math.max(220, maxY - minY + 150);
    const nextZoom = clamp(Math.min(WORLD_WIDTH / graphWidth, WORLD_HEIGHT / graphHeight), MIN_ZOOM, 1.25);
    setZoom(nextZoom);
    setPan({ x: WORLD_WIDTH / 2 - ((minX + maxX) / 2) * nextZoom, y: WORLD_HEIGHT / 2 - ((minY + maxY) / 2) * nextZoom });
  }, [getPosition, graph.nodes]);

  useEffect(() => {
    const saved = firstLayoutRef.current ? readSavedLayout(layoutStorageKey) : { positions: new Map<string, Position>(), fixed: new Set<string>() };
    const previousIds = knownIdsRef.current;
    const newIds: string[] = [];
    const graphIds = new Set(graph.nodes.map((node) => node.id));
    graph.nodes.forEach((node) => {
      if (!positionsRef.current.has(node.id)) {
        const parentIds = getParentIds(node);
        const parentPositions = parentIds.map((parentId) => positionsRef.current.get(parentId)).filter((position): position is Position => Boolean(position));
        const parent = parentPositions[0];
        const siblingIds = parentIds[0] ? getChildren(state, parentIds[0]).map((sibling) => sibling.id) : [];
        const siblingIndex = Math.max(0, siblingIds.indexOf(node.id));
        const siblingCount = Math.max(1, siblingIds.length);
        const spread = Math.min(2.7, Math.max(1.5, siblingCount * 0.78));
        const angle = -Math.PI / 2 + (siblingIndex - (siblingCount - 1) / 2) * (spread / Math.max(1, siblingCount - 1));
        const radius = 180 + Math.min(70, node.depth * 14);
        const anchor = parentPositions.length ? parentPositions.reduce((point, item) => ({ x: point.x + item.x / parentPositions.length, y: point.y + item.y / parentPositions.length }), { x: 0, y: 0 }) : null;
        const position = saved.positions.get(node.id) ?? (anchor ? { x: anchor.x + Math.cos(angle) * radius, y: anchor.y + Math.sin(angle) * radius, vx: 0, vy: 0 } : parent ? { x: parent.x + Math.cos(angle) * radius, y: parent.y + Math.sin(angle) * radius, vx: 0, vy: 0 } : { x: node.initialX, y: node.initialY, vx: 0, vy: 0 });
        positionsRef.current.set(node.id, { ...position, vx: 0, vy: 0 });
        if (!previousIds.has(node.id)) newIds.push(node.id);
      }
    });
    positionsRef.current.forEach((_position, nodeId) => { if (!graphIds.has(nodeId)) positionsRef.current.delete(nodeId); });
    if (firstLayoutRef.current) {
      saved.fixed.forEach((nodeId) => { if (graphIds.has(nodeId)) fixedRef.current.add(nodeId); });
      firstLayoutRef.current = false;
    }
    knownIdsRef.current = graphIds;
    if (newIds.length) startSimulation(newIds.length === graph.nodes.length ? 0.72 : 0.36, newIds.length === graph.nodes.length ? undefined : focusFor(newIds));
    if (!hasInitialView && graph.nodes.length) { setHasInitialView(true); requestAnimationFrame(() => fitGraph()); }
    bumpRender();
    // Graph changes are intentionally the only trigger here; force ticks update through their own RAF.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphSignature, layoutStorageKey]);

  useEffect(() => () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); }, []);
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setIsFullscreen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", handleKeyDown); };
  }, [isFullscreen]);
  useEffect(() => { setSelectedNodeId(activeNodeId); }, [activeNodeId]);
  useEffect(() => {
    if (typeof window === "undefined" || firstLayoutRef.current) return;
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const positions = Object.fromEntries([...positionsRef.current].map(([id, position]) => [id, { x: Math.round(position.x), y: Math.round(position.y) }]));
      window.localStorage.setItem(layoutStorageKey, JSON.stringify({ positions, fixed: [...fixedRef.current] }));
      saveTimerRef.current = null;
    }, 180);
    return () => { if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current); };
  }, [layoutStorageKey, renderVersion]);

  const centerActive = useCallback(() => {
    const node = graph.nodes.find((candidate) => candidate.id === activeNodeId);
    if (!node) return;
    const position = getPosition(node);
    setPan({ x: WORLD_WIDTH / 2 - position.x * zoom, y: WORLD_HEIGHT / 2 - position.y * zoom });
  }, [activeNodeId, getPosition, graph.nodes, zoom]);
  const reorganize = useCallback(() => {
    fixedRef.current.clear();
    graph.nodes.forEach((node) => { const position = getPosition(node); position.vx = 0; position.vy = 0; });
    startSimulation(0.9);
    requestAnimationFrame(() => fitGraph());
    bumpRender();
  }, [bumpRender, fitGraph, getPosition, graph.nodes, startSimulation]);
  const releaseNode = useCallback((nodeId: string) => {
    fixedRef.current.delete(nodeId);
    const position = positionsRef.current.get(nodeId);
    if (position) { position.vx = 0; position.vy = 0; }
    startSimulation(0.38, focusFor([nodeId]));
    bumpRender();
  }, [bumpRender, focusFor, startSimulation]);
  const zoomAt = useCallback((nextZoom: number, point: Point) => {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const worldPoint = { x: (point.x - pan.x) / zoom, y: (point.y - pan.y) / zoom };
    setPan({ x: point.x - worldPoint.x * clampedZoom, y: point.y - worldPoint.y * clampedZoom });
    setZoom(clampedZoom);
  }, [pan.x, pan.y, zoom]);

  const startPinch = useCallback(() => {
    const entries = [...pointersRef.current.entries()];
    if (entries.length < 2) return;
    const [first, second] = entries;
    const center = centerBetween(first[1], second[1]);
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerCanvas = { x: ((center.x - rect.left) / rect.width) * WORLD_WIDTH, y: ((center.y - rect.top) / rect.height) * WORLD_HEIGHT };
    pinchRef.current = { ids: [first[0], second[0]], distance: distanceBetween(first[1], second[1]), zoom, pan, worldCenter: { x: (centerCanvas.x - pan.x) / zoom, y: (centerCanvas.y - pan.y) / zoom } };
    panGestureRef.current = null;
    nodeGestureRef.current = null;
  }, [pan, zoom]);
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" && event.button !== 0) return;
    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (pointersRef.current.size >= 2) { startPinch(); return; }
    panGestureRef.current = { pointerId: event.pointerId, start: point, pan, moved: false };
  };
  const handleNodePointerDown = (event: ReactPointerEvent<SVGGElement>, node: GraphNode) => {
    if (event.pointerType !== "touch" && event.button !== 0) return;
    event.stopPropagation();
    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);
    viewportRef.current?.setPointerCapture?.(event.pointerId);
    if (pointersRef.current.size >= 2) { startPinch(); return; }
    nodeGestureRef.current = { pointerId: event.pointerId, nodeId: node.id, start: point, origin: { ...getPosition(node) }, moved: false };
    panGestureRef.current = null;
  };
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);
    if (pinchRef.current) {
      const first = pointersRef.current.get(pinchRef.current.ids[0]);
      const second = pointersRef.current.get(pinchRef.current.ids[1]);
      if (!first || !second) return;
      const center = centerBetween(first, second);
      const distance = Math.max(1, distanceBetween(first, second));
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;
      const centerCanvas = { x: ((center.x - rect.left) / rect.width) * WORLD_WIDTH, y: ((center.y - rect.top) / rect.height) * WORLD_HEIGHT };
      const nextZoom = clamp(pinchRef.current.zoom * distance / pinchRef.current.distance, MIN_ZOOM, MAX_ZOOM);
      setZoom(nextZoom);
      setPan({ x: centerCanvas.x - pinchRef.current.worldCenter.x * nextZoom, y: centerCanvas.y - pinchRef.current.worldCenter.y * nextZoom });
      return;
    }
    const nodeGesture = nodeGestureRef.current;
    if (nodeGesture && nodeGesture.pointerId === event.pointerId) {
      if (!nodeGesture.moved && distanceBetween(nodeGesture.start, point) < NODE_DRAG_THRESHOLD) return;
      nodeGesture.moved = true;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((point.x - nodeGesture.start.x) / rect.width) * WORLD_WIDTH / zoom;
      const dy = ((point.y - nodeGesture.start.y) / rect.height) * WORLD_HEIGHT / zoom;
      const position = positionsRef.current.get(nodeGesture.nodeId);
      if (position) { position.x = clamp(nodeGesture.origin.x + dx, 45, WORLD_WIDTH - 45); position.y = clamp(nodeGesture.origin.y + dy, 45, WORLD_HEIGHT - 45); position.vx = 0; position.vy = 0; bumpRender(); }
      return;
    }
    const panGesture = panGestureRef.current;
    if (panGesture && panGesture.pointerId === event.pointerId) {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((point.x - panGesture.start.x) / rect.width) * WORLD_WIDTH;
      const dy = ((point.y - panGesture.start.y) / rect.height) * WORLD_HEIGHT;
      if (!panGesture.moved && Math.hypot(dx, dy) < NODE_DRAG_THRESHOLD) return;
      panGesture.moved = true;
      setPan({ x: panGesture.pan.x + dx, y: panGesture.pan.y + dy });
    }
  };
  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const nodeGesture = nodeGestureRef.current;
    if (nodeGesture && nodeGesture.pointerId === event.pointerId) {
      if (!nodeGesture.moved) setSelectedNodeId(nodeGesture.nodeId);
      else { fixedRef.current.add(nodeGesture.nodeId); startSimulation(0.12, focusFor([nodeGesture.nodeId])); }
      nodeGestureRef.current = null;
    }
    pointersRef.current.delete(event.pointerId);
    if (pinchRef.current && pointersRef.current.size < 2) pinchRef.current = null;
    if (panGestureRef.current?.pointerId === event.pointerId) panGestureRef.current = null;
    bumpRender();
  };
  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = { x: ((event.clientX - rect.left) / rect.width) * WORLD_WIDTH, y: ((event.clientY - rect.top) / rect.height) * WORLD_HEIGHT };
    zoomAt(zoom * Math.exp(-event.deltaY * 0.0012), point);
  };

  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId) ?? graph.nodes.find((node) => node.id === activeNodeId) ?? graph.nodes[0];
  const activePathIds = useMemo(() => new Set(getActivePathNodes(state, activeNodeId).map((node) => node.id)), [activeNodeId, state]);
  const selectedPathIds = useMemo(() => new Set(selectedNode ? getActivePathNodes(state, selectedNode.id).map((node) => node.id) : []), [selectedNode, state]);
  const selectedNeighbors = useMemo(() => {
    const neighbors = new Set<string>();
    if (!selectedNode) return neighbors;
    getVisibleChildren(state, selectedNode.id).forEach((node) => neighbors.add(node.id));
    getParentIds(selectedNode).forEach((id) => {
      const parent = state.nodes[id];
      if (parent?.mergedInto) getParentIds(parent).forEach((ancestorId) => neighbors.add(ancestorId));
      else neighbors.add(id);
    });
    return neighbors;
  }, [selectedNode, state]);
  const statusFor = (node: GraphNode) => {
    if (node.branchStatus === "discarded" || node.state === "discarded") return copy.mapDiscarded;
    if (node.mergedInto) return copy.mapMerged;
    if (node.id === activeNodeId) return copy.mapCurrent;
    if (node.state === "conclusion") return copy.mapConclusion;
    if (node.origin === "merge") return copy.mapMerged;
    if (node.state === "favorite") return copy.mapFavorite;
    if (node.status === "explored") return copy.mapExplored;
    return copy.mapAvailable;
  };
  const labelLength = zoom < 0.72 ? 13 : zoom < 1.03 ? 21 : 31;

  return (
    <div className={isFullscreen ? "map-fullscreen" : undefined}>
    <section className="exploration-map" aria-label={copy.explorationMap} role={isFullscreen ? "dialog" : undefined} aria-modal={isFullscreen ? true : undefined}>
      <div className="map-toolbar">
        <div><span className="map-toolbar__eyebrow">{copy.mapEyebrow}</span><p>{copy.mapHint}</p></div>
        <div className="map-controls" aria-label={copy.explorationView}>
          <button type="button" onClick={centerActive} aria-label={copy.mapCenterActive}>◎</button>
          <button type="button" onClick={fitGraph} aria-label={copy.mapFit}>⌗</button>
          <button type="button" onClick={reorganize} aria-label={copy.mapReorganize}>↺</button>
          <button type="button" className="map-fullscreen-toggle" onClick={() => setIsFullscreen((value) => !value)} aria-label={isFullscreen ? copy.mapExitFullscreen : copy.mapFullscreen} title={isFullscreen ? copy.mapExitFullscreen : copy.mapFullscreen}>{isFullscreen ? "×" : "⛶"}</button>
          <div className="map-zoom" aria-label={copy.mapZoom}><button type="button" onClick={() => zoomAt(zoom - 0.12, { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 })} aria-label={copy.zoomOut}>−</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => zoomAt(zoom + 0.12, { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 })} aria-label={copy.zoomIn}>+</button></div>
        </div>
      </div>
      <div className="map-content">
        <div className="map-viewport" ref={viewportRef} tabIndex={0} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onWheel={handleWheel}>
          <svg ref={svgRef} viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`} role="img" aria-label={copy.explorationMap}>
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              {graph.edges.map((edge) => {
                const source = graph.nodes.find((node) => node.id === edge.source);
                const target = graph.nodes.find((node) => node.id === edge.target);
                if (!source || !target) return null;
                const sourcePosition = getPosition(source);
                const targetPosition = getPosition(target);
                const onPath = selectedPathIds.has(edge.source) && selectedPathIds.has(edge.target);
                const neighbor = selectedNeighbors.has(edge.source) || selectedNeighbors.has(edge.target);
                const muted = Boolean(selectedNode && !onPath && !neighbor);
                return <line key={edge.id} className={`map-edge${onPath ? " is-on-path" : ""}${neighbor ? " is-neighbor" : ""}${muted ? " is-muted" : ""}`} x1={sourcePosition.x} y1={sourcePosition.y} x2={targetPosition.x} y2={targetPosition.y} />;
              })}
              {graph.nodes.map((node) => {
                const position = getPosition(node);
                const discarded = node.branchStatus === "discarded" || node.state === "discarded";
                const mergedSource = Boolean(node.mergedInto);
                const unavailable = discarded || mergedSource;
                const current = node.id === activeNodeId;
                const selected = node.id === selectedNode?.id;
                const onPath = activePathIds.has(node.id) || selectedPathIds.has(node.id);
                const contextual = selected || selectedNeighbors.has(node.id) || onPath;
                const muted = Boolean(selectedNode && !contextual);
                const showLabel = current || selected || selectedNeighbors.has(node.id) || onPath || zoom >= 0.72;
                const lines = titleLines(node.title, labelLength);
                return <g key={node.id} className={`map-node ${node.depth === 0 ? "is-root" : ""}${discarded ? " is-discarded" : mergedSource ? " is-merged-source" : node.status === "explored" ? " is-explored" : " is-available"}${node.state === "conclusion" ? " is-conclusion" : ""}${node.state === "favorite" ? " is-favorite" : ""}${node.origin === "merge" || mergedSource ? " is-merged" : ""}${current ? " is-current" : ""}${selected ? " is-selected" : ""}${onPath ? " is-on-path" : ""}${fixedRef.current.has(node.id) ? " is-fixed" : ""}${muted ? " is-muted" : ""}`} role="button" tabIndex={0} aria-current={current ? "step" : undefined} aria-disabled={unavailable || undefined} aria-label={`${node.title} — ${statusFor(node)}`} onPointerDown={(event) => handleNodePointerDown(event, node)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedNodeId(node.id); } }}><circle cx={position.x} cy={position.y} r={node.depth === 0 ? 11 : current || selected ? 9 : 7} />{showLabel && <text x={position.x} y={position.y + 25} textAnchor="middle">{lines.map((line, index) => <tspan key={`${node.id}-${index}`} x={position.x} dy={index === 0 ? 0 : 12}>{line}</tspan>)}</text>}<title>{`${node.title} — ${statusFor(node)}`}</title></g>;
              })}
            </g>
          </svg>
          <span className="map-gesture-hint">{copy.mapDragHint}</span>
        </div>
        {selectedNode && <MapNodeDetails node={selectedNode} status={statusFor(selectedNode)} fixed={fixedRef.current.has(selectedNode.id)} copy={copy} onContinue={selectedNode.branchStatus === "discarded" || selectedNode.state === "discarded" || Boolean(selectedNode.mergedInto) ? undefined : onSelect} onRelease={releaseNode} />}
      </div>
      <div className="map-legend"><span><i className="map-legend__dot is-explored" />{copy.mapExplored}</span><span><i className="map-legend__dot is-available" />{copy.mapAvailable}</span><span><i className="map-legend__dot is-discarded" />{copy.mapDiscarded}</span><span><i className="map-legend__dot is-current" />{copy.mapCurrent}</span><span><i className="map-legend__dot is-conclusion" />{copy.mapConclusion}</span><span><i className="map-legend__dot is-merged" />{copy.mapMerged}</span></div>
    </section>
    </div>
  );
}
