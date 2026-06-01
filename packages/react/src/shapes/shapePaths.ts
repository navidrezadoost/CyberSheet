/** Path generators for shape rendering (canvas + gallery thumbnails). */

export type ShapePathKind = 'fill' | 'stroke';

export interface ShapePathMeta {
  kind: ShapePathKind;
}

const pathMeta: Record<string, ShapePathMeta> = {
  line: { kind: 'stroke' },
  lineArrow: { kind: 'stroke' },
  lineArrowDouble: { kind: 'stroke' },
  connectorElbow: { kind: 'stroke' },
  connectorElbowArrow: { kind: 'stroke' },
  connectorElbowDoubleArrow: { kind: 'stroke' },
  connectorCurved: { kind: 'stroke' },
  connectorCurvedArrow: { kind: 'stroke' },
  connectorCurvedDoubleArrow: { kind: 'stroke' },
  curve: { kind: 'stroke' },
  freeform: { kind: 'stroke' },
  divide: { kind: 'stroke' },
  equal: { kind: 'stroke' },
  notEqual: { kind: 'stroke' },
  bracketPair: { kind: 'stroke' },
  doubleBracket: { kind: 'stroke' },
  bracePair: { kind: 'stroke' },
  predefinedProcess: { kind: 'stroke' },
  internalStorage: { kind: 'stroke' },
  summingJunction: { kind: 'stroke' },
  or: { kind: 'stroke' },
  magneticDisk: { kind: 'stroke' },
  directAccess: { kind: 'stroke' },
};

export function getShapePathKind(shapeId: string): ShapePathKind {
  return pathMeta[shapeId]?.kind ?? 'fill';
}

function regularPolygon(sides: number, w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2;
  let path = '';
  for (let i = 0; i < sides; i++) {
    const angle = ((i * 360) / sides - 90) * (Math.PI / 180);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    path += i === 0 ? `M${x},${y}` : `L${x},${y}`;
  }
  return `${path} Z`;
}

function starPath(points: number, w: number, h: number, innerRatio = 0.42): string {
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(w, h) / 2;
  const innerR = outerR * innerRatio;
  let path = '';
  for (let i = 0; i < points * 2; i++) {
    const angle = ((i * 180) / points - 90) * (Math.PI / 180);
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    path += i === 0 ? `M${x},${y}` : `L${x},${y}`;
  }
  return `${path} Z`;
}

const SHAPE_PATHS: Record<string, (w: number, h: number) => string> = {
  // Lines
  line: (_w, h) => `M0,${h} L${_w},0`,
  lineArrow: (w, h) => `M0,${h} L${w * 0.85},${h * 0.15} M${w * 0.65},${h * 0.15} L${w},${h * 0.15} L${w * 0.85},${h * 0.35}`,
  lineArrowDouble: (w, h) =>
    `M0,${h} L${w},0 M${w * 0.15},${h * 0.85} L0,${h} L${w * 0.15},${h * 0.65} M${w * 0.85},${h * 0.15} L${w},0 L${w * 0.85},${h * 0.35}`,
  connectorElbow: (w, h) => `M0,${h} L0,${h * 0.4} L${w},${h * 0.4}`,
  connectorElbowArrow: (w, h) =>
    `M0,${h} L0,${h * 0.4} L${w * 0.75},${h * 0.4} M${w * 0.55},${h * 0.25} L${w},${h * 0.4} L${w * 0.55},${h * 0.55}`,
  connectorElbowDoubleArrow: (w, h) =>
    `M0,${h} L0,${h * 0.4} L${w},${h * 0.4} M${w * 0.15},${h * 0.25} L0,${h * 0.4} L${w * 0.15},${h * 0.55} M${w * 0.85},${h * 0.25} L${w},${h * 0.4} L${w * 0.85},${h * 0.55}`,
  connectorCurved: (w, h) => `M0,${h} Q${w * 0.5},${h * 0.2} ${w},${h * 0.4}`,
  connectorCurvedArrow: (w, h) =>
    `M0,${h} Q${w * 0.5},${h * 0.2} ${w * 0.7},${h * 0.35} M${w * 0.55},${h * 0.2} L${w * 0.85},${h * 0.35} L${w * 0.65},${h * 0.5}`,
  connectorCurvedDoubleArrow: (w, h) =>
    `M0,${h} Q${w * 0.5},${h * 0.15} ${w},${h * 0.35} M${w * 0.12},${h * 0.78} L0,${h} L${w * 0.2},${h * 0.62} M${w * 0.88},${h * 0.22} L${w},${h * 0.35} L${w * 0.8},${h * 0.42}`,
  curve: (w, h) => `M0,${h} Q${w * 0.35},${h * 0.1} ${w},${h * 0.55}`,
  freeform: (w, h) => `M${w * 0.1},${h * 0.8} L${w * 0.3},${h * 0.2} L${w * 0.55},${h * 0.65} L${w * 0.8},${h * 0.15} L${w * 0.9},${h * 0.7}`,
  scribble: (w, h) =>
    `M${w * 0.15},${h * 0.5} Q${w * 0.3},${h * 0.1} ${w * 0.45},${h * 0.55} T${w * 0.75},${h * 0.35} T${w * 0.9},${h * 0.6}`,

  // Rectangles
  rectangle: (w, h) => `M0,0 L${w},0 L${w},${h} L0,${h} Z`,
  roundedRectangle: (w, h) => {
    const r = Math.min(w, h) * 0.15;
    return `M${r},0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h - r} Q${w},${h} ${w - r},${h} L${r},${h} Q0,${h} 0,${h - r} L0,${r} Q0,0 ${r},0 Z`;
  },
  roundedSingleCorner: (w, h) => {
    const r = Math.min(w, h) * 0.25;
    return `M0,0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h} L0,${h} Z`;
  },
  roundedTopCorners: (w, h) => {
    const r = Math.min(w, h) * 0.2;
    return `M${r},0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h} L0,${h} L0,${r} Q0,0 ${r},0 Z`;
  },
  snipSingle: (w, h) => {
    const s = Math.min(w, h) * 0.2;
    return `M0,0 L${w - s},0 L${w},${s} L${w},${h} L0,${h} Z`;
  },
  snipSameCorner: (w, h) => {
    const s = Math.min(w, h) * 0.18;
    return `M0,0 L${w - s},0 L${w},${s} L${w},${h} L0,${h} L0,${s} L${s},0 Z`;
  },
  snipDiagonal: (w, h) => {
    const s = Math.min(w, h) * 0.18;
    return `M${s},0 L${w},0 L${w},${h - s} L${w - s},${h} L0,${h} L0,${s} Z`;
  },

  // Basic shapes
  textBox: (w, h) => {
    const r = Math.min(w, h) * 0.08;
    return `M${r},0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h - r} Q${w},${h} ${w - r},${h} L${r},${h} Q0,${h} 0,${h - r} L0,${r} Q0,0 ${r},0 Z`;
  },
  oval: (w, h) => {
    const rx = w / 2;
    const ry = h / 2;
    const cx = w / 2;
    const cy = h / 2;
    return `M${cx - rx},${cy} A${rx},${ry} 0 1,1 ${cx + rx},${cy} A${rx},${ry} 0 1,1 ${cx - rx},${cy} Z`;
  },
  triangle: (w, h) => `M${w / 2},0 L${w},${h} L0,${h} Z`,
  rightTriangle: (w, h) => `M0,0 L${w},${h} L0,${h} Z`,
  parallelogram: (w, h) => `M${w * 0.22},0 L${w},0 L${w * 0.78},${h} L0,${h} Z`,
  trapezoid: (w, h) => `M${w * 0.18},0 L${w * 0.82},0 L${w},${h} L0,${h} Z`,
  diamond: (w, h) => `M${w / 2},0 L${w},${h / 2} L${w / 2},${h} L0,${h / 2} Z`,
  pentagon: (w, h) => regularPolygon(5, w, h),
  hexagon: (w, h) => regularPolygon(6, w, h),
  heptagon: (w, h) => regularPolygon(7, w, h),
  octagon: (w, h) => regularPolygon(8, w, h),
  decagon: (w, h) => regularPolygon(10, w, h),
  dodecagon: (w, h) => regularPolygon(12, w, h),
  cross: (w, h) => {
    const t = Math.min(w, h) * 0.28;
    return `M${(w - t) / 2},0 L${(w + t) / 2},0 L${(w + t) / 2},${(h - t) / 2} L${w},${(h - t) / 2} L${w},${(h + t) / 2} L${(w + t) / 2},${(h + t) / 2} L${(w + t) / 2},${h} L${(w - t) / 2},${h} L${(w - t) / 2},${(h + t) / 2} L0,${(h + t) / 2} L0,${(h - t) / 2} L${(w - t) / 2},${(h - t) / 2} Z`;
  },
  plaque: (w, h) => {
    const r = Math.min(w, h) * 0.12;
    return `M${r},0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h - r} Q${w},${h} ${w - r},${h} L${r},${h} Q0,${h} 0,${h - r} L0,${r} Q0,0 ${r},0 Z`;
  },
  heart: (w, h) =>
    `M${w / 2},${h * 0.88} C${w * 0.05},${h * 0.55} ${w * 0.05},${h * 0.15} ${w * 0.28},${h * 0.15} C${w * 0.38},${h * 0.05} ${w / 2},${h * 0.22} ${w / 2},${h * 0.32} C${w / 2},${h * 0.22} ${w * 0.62},${h * 0.05} ${w * 0.72},${h * 0.15} C${w * 0.95},${h * 0.15} ${w * 0.95},${h * 0.55} ${w / 2},${h * 0.88} Z`,
  lightning: (w, h) =>
    `M${w * 0.55},0 L${w * 0.2},${h * 0.45} L${w * 0.42},${h * 0.42} L${w * 0.15},${h} L${w * 0.72},${h * 0.48} L${w * 0.48},${h * 0.5} L${w * 0.65},0 Z`,
  moon: (w, h) =>
    `M${w * 0.65},0 A${w * 0.35},${h * 0.5} 0 1,0 ${w * 0.65},${h} A${w * 0.45},${h * 0.5} 0 1,1 ${w * 0.65},0 Z`,
  sun: (w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.22;
    let rays = '';
    for (let i = 0; i < 8; i++) {
      const a = (i * 45 * Math.PI) / 180;
      const x1 = cx + Math.cos(a) * r * 1.2;
      const y1 = cy + Math.sin(a) * r * 1.2;
      const x2 = cx + Math.cos(a) * r * 2.1;
      const y2 = cy + Math.sin(a) * r * 2.1;
      rays += `M${x1},${y1} L${x2},${y2} `;
    }
    return `${rays}M${cx},${cy} m-${r},0 a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0 Z`;
  },
  cloud: (w, h) =>
    `M${w * 0.2},${h * 0.72} A${w * 0.18},${h * 0.18} 0 1,1 ${w * 0.38},${h * 0.55} A${w * 0.22},${h * 0.22} 0 1,1 ${w * 0.62},${h * 0.52} A${w * 0.2},${h * 0.2} 0 1,1 ${w * 0.82},${h * 0.68} A${w * 0.16},${h * 0.16} 0 1,1 ${w * 0.2},${h * 0.72} Z`,
  bracketPair: (w, h) =>
    `M${w * 0.25},0 L${w * 0.25},${h * 0.15} L${w * 0.1},${h * 0.15} L${w * 0.1},${h * 0.85} L${w * 0.25},${h * 0.85} L${w * 0.25},${h} M${w * 0.75},0 L${w * 0.75},${h * 0.15} L${w * 0.9},${h * 0.15} L${w * 0.9},${h * 0.85} L${w * 0.75},${h * 0.85} L${w * 0.75},${h}`,
  doubleBracket: (w, h) =>
    `M${w * 0.2},0 L${w * 0.2},${h * 0.12} L${w * 0.08},${h * 0.12} L${w * 0.08},${h * 0.88} L${w * 0.2},${h * 0.88} L${w * 0.2},${h} M${w * 0.32},0 L${w * 0.32},${h * 0.12} L${w * 0.22},${h * 0.12} L${w * 0.22},${h * 0.88} L${w * 0.32},${h * 0.88} L${w * 0.32},${h} M${w * 0.68},0 L${w * 0.68},${h * 0.12} L${w * 0.78},${h * 0.12} L${w * 0.78},${h * 0.88} L${w * 0.68},${h * 0.88} L${w * 0.68},${h} M${w * 0.8},0 L${w * 0.8},${h * 0.12} L${w * 0.92},${h * 0.12} L${w * 0.92},${h * 0.88} L${w * 0.8},${h * 0.88} L${w * 0.8},${h}`,
  bracePair: (w, h) =>
    `M${w * 0.72},0 Q${w * 0.45},${h * 0.25} ${w * 0.72},${h * 0.5} Q${w * 0.45},${h * 0.75} ${w * 0.72},${h} M${w * 0.28},0 Q${w * 0.55},${h * 0.25} ${w * 0.28},${h * 0.5} Q${w * 0.55},${h * 0.75} ${w * 0.28},${h}`,
  cube: (w, h) =>
    `M${w * 0.15},${h * 0.35} L${w * 0.45},${h * 0.15} L${w * 0.85},${h * 0.15} L${w * 0.85},${h * 0.65} L${w * 0.55},${h * 0.85} L${w * 0.15},${h * 0.85} Z M${w * 0.15},${h * 0.35} L${w * 0.55},${h * 0.35} L${w * 0.85},${h * 0.15} M${w * 0.55},${h * 0.35} L${w * 0.55},${h * 0.85}`,
  cylinder: (w, h) =>
    `M${w * 0.15},${h * 0.25} A${w * 0.35},${h * 0.12} 0 1,0 ${w * 0.85},${h * 0.25} L${w * 0.85},${h * 0.75} A${w * 0.35},${h * 0.12} 0 1,1 ${w * 0.15},${h * 0.75} Z M${w * 0.15},${h * 0.25} A${w * 0.35},${h * 0.12} 0 1,1 ${w * 0.85},${h * 0.25}`,
  smileyFace: (w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2;
    return `M${cx},${cy} m-${r},0 a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0 Z M${w * 0.35},${h * 0.4} m-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0 Z M${w * 0.65},${h * 0.4} m-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0 Z M${w * 0.32},${h * 0.58} Q${w / 2},${h * 0.72} ${w * 0.68},${h * 0.58}`;
  },

  // Block arrows
  arrowRight: (w, h) => {
    const head = Math.min(w * 0.4, h);
    return `M0,${h * 0.3} L${w - head},${h * 0.3} L${w - head},0 L${w},${h / 2} L${w - head},${h} L${w - head},${h * 0.7} L0,${h * 0.7} Z`;
  },
  arrowLeft: (w, h) => {
    const head = Math.min(w * 0.4, h);
    return `M${w},${h * 0.3} L${head},${h * 0.3} L${head},0 L0,${h / 2} L${head},${h} L${head},${h * 0.7} L${w},${h * 0.7} Z`;
  },
  arrowUp: (w, h) => {
    const head = Math.min(h * 0.4, w);
    return `M${w * 0.3},${h} L${w * 0.3},${head} L0,${head} L${w / 2},0 L${w},${head} L${w * 0.7},${head} L${w * 0.7},${h} Z`;
  },
  arrowDown: (w, h) => {
    const head = Math.min(h * 0.4, w);
    return `M${w * 0.3},0 L${w * 0.3},${h - head} L0,${h - head} L${w / 2},${h} L${w},${h - head} L${w * 0.7},${h - head} L${w * 0.7},0 Z`;
  },
  leftRight: (w, h) => {
    const head = Math.min(w * 0.22, h * 0.45);
    return `M${head},${h * 0.35} L${w * 0.35},${h * 0.35} L${w * 0.35},${h * 0.15} L${w * 0.5},${h / 2} L${w * 0.35},${h * 0.85} L${w * 0.35},${h * 0.65} L${head},${h * 0.65} L0,${h / 2} Z M${w - head},${h * 0.35} L${w * 0.65},${h * 0.35} L${w * 0.65},${h * 0.15} L${w},${h / 2} L${w * 0.65},${h * 0.85} L${w * 0.65},${h * 0.65} L${w - head},${h * 0.65} L${w * 0.5},${h / 2} Z`;
  },
  upDown: (w, h) => {
    const head = Math.min(h * 0.22, w * 0.45);
    return `M${w * 0.35},${head} L${w * 0.35},${h * 0.35} L${w * 0.15},${h * 0.35} L${w / 2},0 L${w * 0.85},${h * 0.35} L${w * 0.65},${h * 0.35} L${w * 0.65},${head} L${w / 2},${head * 0.5} Z M${w * 0.35},${h - head} L${w * 0.35},${h * 0.65} L${w * 0.15},${h * 0.65} L${w / 2},${h} L${w * 0.85},${h * 0.65} L${w * 0.65},${h * 0.65} L${w * 0.65},${h - head} L${w / 2},${h - head * 0.5} Z`;
  },
  quadArrow: (w, h) =>
    `M${w / 2},${h * 0.28} L${w * 0.72},${h * 0.28} L${w * 0.72},${h * 0.12} L${w},${h / 2} L${w * 0.72},${h * 0.88} L${w * 0.72},${h * 0.72} L${w / 2},${h * 0.72} L${w / 2},${h * 0.88} L${w * 0.28},${h * 0.88} L0,${h / 2} L${w * 0.28},${h * 0.12} L${w * 0.28},${h * 0.28} Z`,
  stripedArrow: (w, h) => {
    const head = Math.min(w * 0.35, h);
    return `M0,${h * 0.3} L${w - head},${h * 0.3} L${w - head},0 L${w},${h / 2} L${w - head},${h} L${w - head},${h * 0.7} L0,${h * 0.7} Z M${w * 0.15},${h * 0.38} L${w * 0.55},${h * 0.38} M${w * 0.15},${h * 0.5} L${w * 0.55},${h * 0.5} M${w * 0.15},${h * 0.62} L${w * 0.55},${h * 0.62}`;
  },
  notchedArrow: (w, h) => {
    const head = Math.min(w * 0.38, h);
    return `M0,${h * 0.3} L${w - head},${h * 0.3} L${w - head * 0.7},${h * 0.15} L${w - head},0 L${w},${h / 2} L${w - head},${h} L${w - head * 0.7},${h * 0.85} L${w - head},${h * 0.7} L0,${h * 0.7} Z`;
  },
  chevron: (w, h) => `M0,0 L${w * 0.65},0 L${w},${h / 2} L${w * 0.65},${h} L0,${h} L${w * 0.35},${h / 2} Z`,
  bentArrow: (w, h) =>
    `M0,${h * 0.75} L0,${h * 0.35} L${w * 0.55},${h * 0.35} L${w * 0.55},${h * 0.15} L${w},${h * 0.45} L${w * 0.55},${h * 0.75} Z`,
  uTurnArrow: (w, h) =>
    `M${w * 0.15},${h * 0.75} L${w * 0.15},${h * 0.35} Q${w * 0.15},${h * 0.1} ${w * 0.45},${h * 0.1} L${w * 0.75},${h * 0.1} L${w * 0.75},${h * 0.35} M${w * 0.6},${h * 0.22} L${w * 0.75},${h * 0.35} L${w * 0.9},${h * 0.22}`,
  circularArrow: (w, h) =>
    `M${w * 0.55},${h * 0.15} A${w * 0.35},${h * 0.35} 0 1,1 ${w * 0.25},${h * 0.55} L${w * 0.1},${h * 0.45} L${w * 0.25},${h * 0.72} L${w * 0.42},${h * 0.55} A${w * 0.25},${h * 0.25} 0 1,0 ${w * 0.55},${h * 0.25} Z`,

  // Flowchart
  process: (w, h) => `M0,0 L${w},0 L${w},${h} L0,${h} Z`,
  decision: (w, h) => `M${w / 2},0 L${w},${h / 2} L${w / 2},${h} L0,${h / 2} Z`,
  data: (w, h) => `M${w * 0.12},0 L${w},0 L${w * 0.88},${h} L0,${h} Z`,
  predefinedProcess: (w, h) =>
    `M${w * 0.12},0 L${w * 0.88},0 L${w * 0.88},${h} L${w * 0.12},${h} Z M${w * 0.06},0 L${w * 0.06},${h} M${w * 0.94},0 L${w * 0.94},${h}`,
  internalStorage: (w, h) =>
    `M0,0 L${w},0 L${w},${h} L0,${h} Z M0,${h * 0.2} L${w},${h * 0.2} M${w * 0.2},0 L${w * 0.2},${h}`,
  document: (w, h) =>
    `M0,0 L${w},0 L${w},${h * 0.82} Q${w / 2},${h * 1.05} 0,${h * 0.82} Z`,
  multiDocument: (w, h) =>
    `M${w * 0.08},${h * 0.08} L${w},${h * 0.08} L${w},${h * 0.88} Q${w * 0.54},${h * 1.05} ${w * 0.08},${h * 0.88} Z M0,0 L${w * 0.92},0 L${w * 0.92},${h * 0.8} Q${w * 0.46},${h * 0.97} 0,${h * 0.8} Z`,
  terminator: (w, h) => {
    const r = h / 2;
    return `M${r},0 L${w - r},0 A${r},${r} 0 0,1 ${w - r},${h} L${r},${h} A${r},${r} 0 0,1 ${r},0 Z`;
  },
  preparation: (w, h) => `M${w * 0.2},0 L${w * 0.8},0 L${w},${h / 2} L${w * 0.8},${h} L${w * 0.2},${h} L0,${h / 2} Z`,
  manualInput: (w, h) => `M0,${h * 0.18} L${w},0 L${w},${h} L0,${h} Z`,
  manualOperation: (w, h) => `M${w * 0.15},0 L${w},0 L${w * 0.85},${h} L0,${h} Z`,
  connector: (w, h) => {
    const r = Math.min(w, h) / 2;
    const cx = w / 2;
    const cy = h / 2;
    return `M${cx},${cy} m-${r},0 a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0 Z`;
  },
  offPageConnector: (w, h) =>
    `M0,0 L${w},0 L${w},${h * 0.72} L${w / 2},${h} L0,${h * 0.72} Z`,
  card: (w, h) => `M${w * 0.08},0 L${w},0 L${w * 0.92},${h} L0,${h} Z`,
  punchedTape: (w, h) => {
    const r = h * 0.08;
    return `M0,${r} A${r},${r} 0 0,1 ${r},0 L${w - r},0 A${r},${r} 0 0,1 ${w},${r} L${w},${h - r} A${r},${r} 0 0,1 ${w - r},${h} L${r},${h} A${r},${r} 0 0,1 0,${h - r} Z`;
  },
  summingJunction: (w, h) => {
    const r = Math.min(w, h) / 2;
    const cx = w / 2;
    const cy = h / 2;
    return `M${cx},${cy} m-${r},0 a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0 Z M${cx - r * 0.55},${cy - r * 0.55} L${cx + r * 0.55},${cy + r * 0.55} M${cx + r * 0.55},${cy - r * 0.55} L${cx - r * 0.55},${cy + r * 0.55}`;
  },
  or: (w, h) => {
    const r = Math.min(w, h) / 2;
    const cx = w / 2;
    const cy = h / 2;
    return `M${cx},${cy} m-${r},0 a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0 Z M${cx},${cy - r} L${cx},${cy + r} M${cx - r},${cy} L${cx + r},${cy}`;
  },
  merge: (w, h) => `M0,0 L${w},0 L${w / 2},${h} Z`,
  extract: (w, h) => `M${w / 2},0 L${w},${h} L0,${h} Z`,
  sort: (w, h) => `M${w / 2},0 L${w},${h * 0.45} L${w * 0.65},${h * 0.45} L${w * 0.65},${h} L${w * 0.35},${h} L${w * 0.35},${h * 0.45} L0,${h * 0.45} Z`,
  collate: (w, h) =>
    `M0,0 L${w * 0.55},0 L${w * 0.55},${h * 0.45} L${w},${h * 0.45} L${w / 2},${h} L0,${h * 0.45} L${w * 0.45},${h * 0.45} L${w * 0.45},0 Z`,
  delay: (w, h) => {
    const r = h / 2;
    return `M0,0 L${w - r},0 A${r},${r} 0 0,1 ${w - r},${h} L0,${h} Z`;
  },
  storedData: (w, h) => {
    const r = h / 2;
    return `M${r},0 L${w},0 L${w},${h} L0,${h} L0,${r} A${r},${r} 0 0,1 ${r},0 Z`;
  },
  sequentialAccess: (w, h) =>
    `M${w * 0.15},0 A${w * 0.35},${h / 2} 0 0,1 ${w * 0.15},${h} L${w * 0.85},${h} L${w * 0.85},0 Z`,
  magneticDisk: (w, h) => {
    const r = Math.min(w, h) / 2;
    const cx = w / 2;
    const cy = h / 2;
    return `M${cx},${cy} m-${r},0 a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0 Z M${cx},${cy} m-${r * 0.35},0 a${r * 0.35},${r * 0.35} 0 1,0 ${r * 0.7},0 a${r * 0.35},${r * 0.35} 0 1,0 -${r * 0.7},0 Z`;
  },
  directAccess: (w, h) => {
    const r = Math.min(w, h) / 2;
    const cx = w / 2;
    const cy = h / 2;
    return `M${cx},${cy} m-${r},0 a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0 Z M${cx},${cy - r} L${cx},${cy + r}`;
  },
  display: (w, h) =>
    `M0,${h * 0.15} L${w},${h * 0.15} L${w * 0.92},${h} L${w * 0.08},${h} Z`,

  // Stars and banners
  star4: (w, h) => starPath(4, w, h, 0.35),
  star5: (w, h) => starPath(5, w, h),
  star6: (w, h) => starPath(6, w, h),
  star7: (w, h) => starPath(7, w, h),
  star8: (w, h) => starPath(8, w, h),
  star10: (w, h) => starPath(10, w, h),
  star12: (w, h) => starPath(12, w, h),
  star16: (w, h) => starPath(16, w, h, 0.38),
  star24: (w, h) => starPath(12, w, h, 0.55),
  star32: (w, h) => starPath(16, w, h, 0.55),
  explosion1: (w, h) => starPath(8, w, h, 0.25),
  explosion2: (w, h) => starPath(12, w, h, 0.22),
  scroll: (w, h) =>
    `M${w * 0.15},${h * 0.2} Q${w * 0.05},${h * 0.35} ${w * 0.15},${h * 0.5} Q${w * 0.05},${h * 0.65} ${w * 0.15},${h * 0.8} L${w * 0.85},${h * 0.8} Q${w * 0.95},${h * 0.65} ${w * 0.85},${h * 0.5} Q${w * 0.95},${h * 0.35} ${w * 0.85},${h * 0.2} Z`,
  upRibbon: (w, h) =>
    `M0,${h * 0.55} Q${w / 2},${h * 0.05} ${w},${h * 0.55} L${w * 0.85},${h * 0.55} L${w * 0.85},${h} L${w * 0.15},${h} L${w * 0.15},${h * 0.55} Z`,
  downRibbon: (w, h) =>
    `M0,${h * 0.45} Q${w / 2},${h * 0.95} ${w},${h * 0.45} L${w * 0.85},${h * 0.45} L${w * 0.85},0 L${w * 0.15},0 L${w * 0.15},${h * 0.45} Z`,
  wave: (w, h) =>
    `M0,${h * 0.55} Q${w * 0.25},${h * 0.15} ${w * 0.5},${h * 0.55} T${w},${h * 0.55} L${w},${h} L0,${h} Z`,
  doubleWave: (w, h) =>
    `M0,${h * 0.5} Q${w * 0.12},${h * 0.2} ${w * 0.25},${h * 0.5} T${w * 0.5},${h * 0.5} T${w * 0.75},${h * 0.5} T${w},${h * 0.5} L${w},${h} L0,${h} Z`,

  // Callouts
  rectangularCallout: (w, h) => `M0,0 L${w},0 L${w},${h * 0.72} L0,${h * 0.72} Z M${w * 0.15},${h * 0.72} L${w * 0.05},${h} L${w * 0.28},${h * 0.72}`,
  roundedCallout: (w, h) => {
    const r = Math.min(w, h) * 0.12;
    return `M${r},0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h * 0.68 - r} Q${w},${h * 0.68} ${w - r},${h * 0.68} L${w * 0.28},${h * 0.68} L${w * 0.05},${h} L${w * 0.15},${h * 0.68} L${r},${h * 0.68} Q0,${h * 0.68} 0,${h * 0.68 - r} L0,${r} Q0,0 ${r},0 Z`;
  },
  ovalCallout: (w, h) => {
    const rx = w / 2;
    const ry = h * 0.34;
    const cx = w / 2;
    const cy = h * 0.34;
    return `M${cx - rx},${cy} A${rx},${ry} 0 1,1 ${cx + rx},${cy} A${rx},${ry} 0 1,1 ${cx - rx},${cy} M${w * 0.22},${h * 0.62} L${w * 0.08},${h} L${w * 0.35},${h * 0.62}`;
  },
  cloudCallout: (w, h) =>
    `M${w * 0.18},${h * 0.55} A${w * 0.15},${h * 0.15} 0 1,1 ${w * 0.35},${h * 0.4} A${w * 0.18},${h * 0.18} 0 1,1 ${w * 0.58},${h * 0.38} A${w * 0.16},${h * 0.16} 0 1,1 ${w * 0.78},${h * 0.52} A${w * 0.14},${h * 0.14} 0 1,1 ${w * 0.18},${h * 0.55} M${w * 0.25},${h * 0.62} L${w * 0.1},${h * 0.95} L${w * 0.38},${h * 0.62}`,
  lineCallout: (w, h) =>
    `M0,0 L${w},0 L${w},${h * 0.65} L0,${h * 0.65} Z M${w * 0.2},${h * 0.65} L${w * 0.08},${h} L${w * 0.32},${h * 0.65}`,
  accentCallout: (w, h) =>
    `M0,0 L${w},0 L${w},${h * 0.12} L0,${h * 0.12} Z M0,${h * 0.12} L${w},${h * 0.12} L${w},${h * 0.72} L0,${h * 0.72} Z M${w * 0.18},${h * 0.72} L${w * 0.05},${h} L${w * 0.3},${h * 0.72}`,
  lineNoBorderCallout: (w, h) =>
    `M${w * 0.05},${h * 0.05} L${w * 0.95},${h * 0.05} L${w * 0.95},${h * 0.6} L${w * 0.05},${h * 0.6} Z M${w * 0.2},${h * 0.6} L${w * 0.08},${h * 0.95} L${w * 0.32},${h * 0.6}`,
  borderAccentCallout: (w, h) =>
    `M0,0 L${w},0 L${w},${h * 0.72} L0,${h * 0.72} Z M0,0 L${w},0 L${w},${h * 0.1} L0,${h * 0.1} Z M${w * 0.15},${h * 0.72} L${w * 0.02},${h} L${w * 0.28},${h * 0.72}`,
  thoughtRectangular: (w, h) =>
    `M0,0 L${w},0 L${w},${h * 0.65} L0,${h * 0.65} Z M${w * 0.12},${h * 0.72} a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 M${w * 0.05},${h * 0.85} a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0`,
  thoughtRounded: (w, h) => {
    const r = Math.min(w, h) * 0.1;
    return `M${r},0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h * 0.6 - r} Q${w},${h * 0.6} ${w - r},${h * 0.6} L${r},${h * 0.6} Q0,${h * 0.6} 0,${h * 0.6 - r} L0,${r} Q0,0 ${r},0 Z M${w * 0.12},${h * 0.68} a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 M${w * 0.05},${h * 0.82} a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0`;
  },
  thoughtOval: (w, h) => {
    const rx = w / 2;
    const ry = h * 0.32;
    const cx = w / 2;
    const cy = h * 0.32;
    return `M${cx - rx},${cy} A${rx},${ry} 0 1,1 ${cx + rx},${cy} A${rx},${ry} 0 1,1 ${cx - rx},${cy} M${w * 0.15},${h * 0.68} a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 M${w * 0.08},${h * 0.82} a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0`;
  },
  thoughtCloud: (w, h) =>
    `M${w * 0.2},${h * 0.52} A${w * 0.14},${h * 0.14} 0 1,1 ${w * 0.38},${h * 0.38} A${w * 0.16},${h * 0.16} 0 1,1 ${w * 0.62},${h * 0.36} A${w * 0.14},${h * 0.14} 0 1,1 ${w * 0.78},${h * 0.5} A${w * 0.12},${h * 0.12} 0 1,1 ${w * 0.2},${h * 0.52} M${w * 0.14},${h * 0.65} a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0 M${w * 0.08},${h * 0.78} a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0`,

  // Equation shapes
  plus: (w, h) => {
    const t = Math.min(w, h) * 0.22;
    return `M${(w - t) / 2},0 L${(w + t) / 2},0 L${(w + t) / 2},${(h - t) / 2} L${w},${(h - t) / 2} L${w},${(h + t) / 2} L${(w + t) / 2},${(h + t) / 2} L${(w + t) / 2},${h} L${(w - t) / 2},${h} L${(w - t) / 2},${(h + t) / 2} L0,${(h + t) / 2} L0,${(h - t) / 2} L${(w - t) / 2},${(h - t) / 2} Z`;
  },
  minus: (w, h) => {
    const t = Math.min(w, h) * 0.22;
    return `M0,${(h - t) / 2} L${w},${(h - t) / 2} L${w},${(h + t) / 2} L0,${(h + t) / 2} Z`;
  },
  multiply: (w, h) =>
    `M${w * 0.15},${h * 0.15} L${w * 0.35},${h * 0.15} L${w / 2},${h * 0.32} L${w * 0.65},${h * 0.15} L${w * 0.85},${h * 0.15} L${w * 0.62},${h * 0.38} L${w * 0.85},${h * 0.62} L${w * 0.65},${h * 0.85} L${w / 2},${h * 0.68} L${w * 0.35},${h * 0.85} L${w * 0.15},${h * 0.62} L${w * 0.38},${h * 0.38} Z`,
  divide: (w, h) => {
    const r = Math.min(w, h) * 0.1;
    const cx = w / 2;
    return `M0,${h / 2} L${w},${h / 2} M${cx},${h * 0.2} m-${r},0 a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0 M${cx},${h * 0.8} m-${r},0 a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0`;
  },
  equal: (w, h) => {
    const t = Math.min(w, h) * 0.14;
    return `M0,${h * 0.32} L${w},${h * 0.32} L${w},${h * 0.32 + t} L0,${h * 0.32 + t} Z M0,${h * 0.58} L${w},${h * 0.58} L${w},${h * 0.58 + t} L0,${h * 0.58 + t} Z`;
  },
  notEqual: (w, h) => {
    const t = Math.min(w, h) * 0.14;
    return `M0,${h * 0.32} L${w},${h * 0.32} L${w},${h * 0.32 + t} L0,${h * 0.32 + t} Z M0,${h * 0.58} L${w},${h * 0.58} L${w},${h * 0.58 + t} L0,${h * 0.58 + t} Z M${w * 0.72},${h * 0.08} L${w * 0.88},${h * 0.92} M${w * 0.62},${h * 0.08} L${w * 0.78},${h * 0.92}`;
  },
};

// Legacy aliases (registered after base paths to avoid self-reference during init)
const legacyAliases: Record<string, keyof typeof SHAPE_PATHS> = {
  rightArrow: 'arrowRight',
  leftArrow: 'arrowLeft',
  upArrow: 'arrowUp',
  downArrow: 'arrowDown',
  star: 'star5',
  flowchartProcess: 'process',
  flowchartDecision: 'decision',
  flowchartData: 'data',
  elbowConnector: 'connectorElbow',
  snipSingleCorner: 'snipSingle',
  roundedRectangularCallout: 'roundedCallout',
  doubleCallout: 'thoughtRectangular',
  tripleCallout: 'thoughtCloud',
  pentagonArrow: 'chevron',
  banner: 'upRibbon',
  callout: 'rectangularCallout',
};

for (const [alias, target] of Object.entries(legacyAliases)) {
  SHAPE_PATHS[alias] = SHAPE_PATHS[target];
}

const PATH_ALIASES: Record<string, string> = {
  rightArrow: 'arrowRight',
  leftArrow: 'arrowLeft',
  upArrow: 'arrowUp',
  downArrow: 'arrowDown',
  process: 'process',
  decision: 'decision',
  data: 'data',
  star: 'star5',
};

export function getShapePath(shapeId: string, w: number, h: number): string {
  const key = PATH_ALIASES[shapeId] ?? shapeId;
  const fn = SHAPE_PATHS[key];
  if (fn) return fn(w, h);
  return SHAPE_PATHS.rectangle(w, h);
}

export function hasShapePath(shapeId: string): boolean {
  const key = PATH_ALIASES[shapeId] ?? shapeId;
  return key in SHAPE_PATHS;
}
