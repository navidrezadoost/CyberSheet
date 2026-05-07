import * as React from 'react';

export type BorderEdge = 'top' | 'bottom' | 'left' | 'right' | 
                         'diagonalUp' | 'diagonalDown' |
                         'horizontal' | 'vertical';

export interface BorderState {
  top?: { style: string; color: string };
  bottom?: { style: string; color: string };
  left?: { style: string; color: string };
  right?: { style: string; color: string };
  diagonalUp?: { style: string; color: string };
  diagonalDown?: { style: string; color: string };
  horizontal?: { style: string; color: string };
  vertical?: { style: string; color: string };
}

export interface BorderPreviewWidgetProps {
  borders: BorderState;
  onToggleEdge: (edge: BorderEdge) => void;
  currentStyle: string;
  currentColor: string;
}

const BorderPreviewWidget: React.FC<BorderPreviewWidgetProps> = ({
  borders,
  onToggleEdge,
  currentStyle,
  currentColor
}) => {
  const [hoverEdge, setHoverEdge] = React.useState<BorderEdge | null>(null);
  
  const getStrokeStyle = (edge: BorderEdge): React.CSSProperties => {
    const borderInfo = borders[edge];
    const isHovered = hoverEdge === edge;
    
    if (borderInfo) {
      return {
        stroke: borderInfo.color,
        strokeWidth: borderInfo.style === 'thick' ? 3 : borderInfo.style === 'double' ? 2 : 2,
        strokeDasharray: borderInfo.style === 'dashed' ? '5,5' : borderInfo.style === 'dotted' ? '2,2' : 'none',
        opacity: isHovered ? 0.7 : 1
      };
    }
    
    return {
      stroke: isHovered ? currentColor : '#ccc',
      strokeWidth: 1,
      strokeDasharray: 'none',
      opacity: isHovered ? 0.5 : 0.3
    };
  };
  
  const handleEdgeClick = (edge: BorderEdge) => {
    onToggleEdge(edge);
  };
  
  const handleMouseEnter = (edge: BorderEdge) => {
    setHoverEdge(edge);
  };
  
  const handleMouseLeave = () => {
    setHoverEdge(null);
  };
  
  return (
    <div style={{ width: '200px', height: '200px', position: 'relative' }}>
      <svg width="200" height="200">
        {/* Outer rectangle (cell preview) */}
        <rect
          x="40"
          y="40"
          width="120"
          height="120"
          fill="none"
          stroke="#e0e0e0"
          strokeWidth="1"
        />
        
        {/* Top edge */}
        <line
          x1="40"
          y1="40"
          x2="160"
          y2="40"
          {...getStrokeStyle('top')}
          style={{ cursor: 'pointer' }}
          onClick={() => handleEdgeClick('top')}
          onMouseEnter={() => handleMouseEnter('top')}
          onMouseLeave={handleMouseLeave}
        />
        
        {/* Bottom edge */}
        <line
          x1="40"
          y1="160"
          x2="160"
          y2="160"
          {...getStrokeStyle('bottom')}
          style={{ cursor: 'pointer' }}
          onClick={() => handleEdgeClick('bottom')}
          onMouseEnter={() => handleMouseEnter('bottom')}
          onMouseLeave={handleMouseLeave}
        />
        
        {/* Left edge */}
        <line
          x1="40"
          y1="40"
          x2="40"
          y2="160"
          {...getStrokeStyle('left')}
          style={{ cursor: 'pointer' }}
          onClick={() => handleEdgeClick('left')}
          onMouseEnter={() => handleMouseEnter('left')}
          onMouseLeave={handleMouseLeave}
        />
        
        {/* Right edge */}
        <line
          x1="160"
          y1="40"
          x2="160"
          y2="160"
          {...getStrokeStyle('right')}
          style={{ cursor: 'pointer' }}
          onClick={() => handleEdgeClick('right')}
          onMouseEnter={() => handleMouseEnter('right')}
          onMouseLeave={handleMouseLeave}
        />
        
        {/* Horizontal middle (for inside borders) */}
        <line
          x1="40"
          y1="100"
          x2="160"
          y2="100"
          {...getStrokeStyle('horizontal')}
          style={{ cursor: 'pointer' }}
          onClick={() => handleEdgeClick('horizontal')}
          onMouseEnter={() => handleMouseEnter('horizontal')}
          onMouseLeave={handleMouseLeave}
        />
        
        {/* Vertical middle (for inside borders) */}
        <line
          x1="100"
          y1="40"
          x2="100"
          y2="160"
          {...getStrokeStyle('vertical')}
          style={{ cursor: 'pointer' }}
          onClick={() => handleEdgeClick('vertical')}
          onMouseEnter={() => handleMouseEnter('vertical')}
          onMouseLeave={handleMouseLeave}
        />
        
        {/* Diagonal Up */}
        <line
          x1="40"
          y1="160"
          x2="160"
          y2="40"
          {...getStrokeStyle('diagonalUp')}
          style={{ cursor: 'pointer' }}
          onClick={() => handleEdgeClick('diagonalUp')}
          onMouseEnter={() => handleMouseEnter('diagonalUp')}
          onMouseLeave={handleMouseLeave}
        />
        
        {/* Diagonal Down */}
        <line
          x1="40"
          y1="40"
          x2="160"
          y2="160"
          {...getStrokeStyle('diagonalDown')}
          style={{ cursor: 'pointer' }}
          onClick={() => handleEdgeClick('diagonalDown')}
          onMouseEnter={() => handleMouseEnter('diagonalDown')}
          onMouseLeave={handleMouseLeave}
        />
      </svg>
      
      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '11px',
          color: '#666',
          textAlign: 'center'
        }}
      >
        Click edges to toggle borders
      </div>
    </div>
  );
};

export default BorderPreviewWidget;
