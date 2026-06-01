export interface ShapeDefinition {
  id: string;
  name: string;
}

export interface ShapeCategory {
  id: string;
  label: string;
  shapes: ShapeDefinition[];
}

const shape = (id: string, name: string): ShapeDefinition => ({ id, name });

export const STATIC_SHAPE_CATEGORIES: ShapeCategory[] = [
  {
    id: 'lines',
    label: 'Lines',
    shapes: [
      shape('line', 'Line'),
      shape('lineArrow', 'Line Arrow'),
      shape('lineArrowDouble', 'Line Arrow: Double'),
      shape('connectorElbow', 'Connector: Elbow'),
      shape('connectorElbowArrow', 'Connector: Elbow Arrow'),
      shape('connectorElbowDoubleArrow', 'Connector: Elbow Double-Arrow'),
      shape('connectorCurved', 'Connector: Curved'),
      shape('connectorCurvedArrow', 'Connector: Curved Arrow'),
      shape('connectorCurvedDoubleArrow', 'Connector: Curved Double-Arrow'),
      shape('curve', 'Curve'),
      shape('freeform', 'Freeform: Shape'),
      shape('scribble', 'Freeform: Scribble'),
    ],
  },
  {
    id: 'rectangles',
    label: 'Rectangles',
    shapes: [
      shape('rectangle', 'Rectangle'),
      shape('roundedRectangle', 'Rectangle: Rounded Corners'),
      shape('roundedSingleCorner', 'Rectangle: Single Corner Rounded'),
      shape('roundedTopCorners', 'Rectangle: Top Corners Rounded'),
      shape('snipSingle', 'Rectangle: Snip Single Corner'),
      shape('snipSameCorner', 'Rectangle: Snip Same Side Corner'),
      shape('snipDiagonal', 'Rectangle: Snip Diagonal Corner'),
    ],
  },
  {
    id: 'basic-shapes',
    label: 'Basic Shapes',
    shapes: [
      shape('textBox', 'Text Box'),
      shape('oval', 'Oval'),
      shape('triangle', 'Triangle'),
      shape('rightTriangle', 'Right Triangle'),
      shape('parallelogram', 'Parallelogram'),
      shape('trapezoid', 'Trapezoid'),
      shape('diamond', 'Diamond'),
      shape('pentagon', 'Pentagon'),
      shape('hexagon', 'Hexagon'),
      shape('heptagon', 'Heptagon'),
      shape('octagon', 'Octagon'),
      shape('decagon', 'Decagon'),
      shape('dodecagon', 'Dodecagon'),
      shape('cross', 'Cross'),
      shape('plaque', 'Plaque'),
      shape('heart', 'Heart'),
      shape('lightning', 'Lightning Bolt'),
      shape('moon', 'Moon'),
      shape('sun', 'Sun'),
      shape('cloud', 'Cloud'),
      shape('bracketPair', 'Bracket Pair'),
      shape('doubleBracket', 'Double Bracket'),
      shape('bracePair', 'Brace Pair'),
      shape('cube', 'Cube'),
      shape('cylinder', 'Cylinder'),
      shape('smileyFace', 'Smiley Face'),
    ],
  },
  {
    id: 'block-arrows',
    label: 'Block Arrows',
    shapes: [
      shape('arrowRight', 'Right Arrow'),
      shape('arrowLeft', 'Left Arrow'),
      shape('arrowUp', 'Up Arrow'),
      shape('arrowDown', 'Down Arrow'),
      shape('leftRight', 'Left-Right Arrow'),
      shape('upDown', 'Up-Down Arrow'),
      shape('quadArrow', 'Quad Arrow'),
      shape('stripedArrow', 'Striped Right Arrow'),
      shape('notchedArrow', 'Notched Right Arrow'),
      shape('chevron', 'Chevron'),
      shape('bentArrow', 'Bent Arrow'),
      shape('uTurnArrow', 'U-Turn Arrow'),
      shape('circularArrow', 'Circular Arrow'),
    ],
  },
  {
    id: 'flowchart',
    label: 'Flowchart',
    shapes: [
      shape('process', 'Process'),
      shape('decision', 'Decision'),
      shape('data', 'Data'),
      shape('predefinedProcess', 'Predefined Process'),
      shape('internalStorage', 'Internal Storage'),
      shape('document', 'Document'),
      shape('multiDocument', 'Multi-Document'),
      shape('terminator', 'Terminator'),
      shape('preparation', 'Preparation'),
      shape('manualInput', 'Manual Input'),
      shape('manualOperation', 'Manual Operation'),
      shape('connector', 'Connector'),
      shape('offPageConnector', 'Off-Page Connector'),
      shape('card', 'Card'),
      shape('punchedTape', 'Punched Tape'),
      shape('summingJunction', 'Summing Junction'),
      shape('or', 'Or'),
      shape('merge', 'Merge'),
      shape('extract', 'Extract'),
      shape('sort', 'Sort'),
      shape('collate', 'Collate'),
      shape('delay', 'Delay'),
      shape('storedData', 'Stored Data'),
      shape('sequentialAccess', 'Sequential Access Storage'),
      shape('magneticDisk', 'Magnetic Disk'),
      shape('directAccess', 'Direct Access Storage'),
      shape('display', 'Display'),
    ],
  },
  {
    id: 'stars-banners',
    label: 'Stars and Banners',
    shapes: [
      shape('star4', '4-Point Star'),
      shape('star5', '5-Point Star'),
      shape('star6', '6-Point Star'),
      shape('star7', '7-Point Star'),
      shape('star8', '8-Point Star'),
      shape('star10', '10-Point Star'),
      shape('star12', '12-Point Star'),
      shape('star16', '16-Point Star'),
      shape('star24', '24-Point Star'),
      shape('star32', '32-Point Star'),
      shape('explosion1', 'Explosion 1'),
      shape('explosion2', 'Explosion 2'),
      shape('scroll', 'Scroll'),
      shape('upRibbon', 'Curved Up Ribbon'),
      shape('downRibbon', 'Curved Down Ribbon'),
      shape('wave', 'Wave'),
      shape('doubleWave', 'Double Wave'),
    ],
  },
  {
    id: 'callouts',
    label: 'Callouts',
    shapes: [
      shape('rectangularCallout', 'Rectangular Callout'),
      shape('roundedCallout', 'Rounded Rectangular Callout'),
      shape('ovalCallout', 'Oval Callout'),
      shape('cloudCallout', 'Cloud Callout'),
      shape('lineCallout', 'Line Callout'),
      shape('accentCallout', 'Line Callout (Accent Bar)'),
      shape('lineNoBorderCallout', 'Line Callout (No Border)'),
      shape('borderAccentCallout', 'Line Callout (Border and Accent Bar)'),
      shape('thoughtRectangular', 'Thought Bubble: Rectangular'),
      shape('thoughtRounded', 'Thought Bubble: Rounded Rectangular'),
      shape('thoughtOval', 'Thought Bubble: Oval'),
      shape('thoughtCloud', 'Thought Bubble: Cloud'),
    ],
  },
  {
    id: 'equation-shapes',
    label: 'Equation Shapes',
    shapes: [
      shape('plus', 'Plus'),
      shape('minus', 'Minus'),
      shape('multiply', 'Multiplication'),
      shape('divide', 'Division'),
      shape('equal', 'Equal'),
      shape('notEqual', 'Not Equal'),
    ],
  },
];

const shapeLookup = new Map<string, ShapeDefinition>();
for (const category of STATIC_SHAPE_CATEGORIES) {
  for (const s of category.shapes) {
    shapeLookup.set(s.id, s);
  }
}

export function getShapeDefinition(shapeId: string): ShapeDefinition | undefined {
  return shapeLookup.get(shapeId);
}

export function getAllShapeIds(): string[] {
  return Array.from(shapeLookup.keys());
}

export function buildGalleryCategories(recentShapeIds: string[]): ShapeCategory[] {
  const recentShapes = recentShapeIds
    .map((id) => shapeLookup.get(id))
    .filter((s): s is ShapeDefinition => Boolean(s));

  const categories: ShapeCategory[] = [];

  if (recentShapes.length > 0) {
    categories.push({
      id: 'recently-used',
      label: 'Recently Used Shapes',
      shapes: recentShapes,
    });
  }

  categories.push(...STATIC_SHAPE_CATEGORIES);
  return categories;
}
