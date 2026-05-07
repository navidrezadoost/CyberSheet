import * as React from 'react';

export interface OrientationWidgetProps {
  degrees: number; // -90 to 90
  onChange: (degrees: number) => void;
}

const OrientationWidget: React.FC<OrientationWidgetProps> = ({ degrees, onChange }) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const widgetRef = React.useRef(null);
  
  const centerX = 75; // Center of the circular widget
  const centerY = 75;
  const radius = 60;
  
  // Calculate line end point based on degrees
  const getLineEndPoint = (deg: number) => {
    const radians = (deg - 90) * (Math.PI / 180); // -90 offset because 0° should be vertical
    const x = centerX + radius * Math.cos(radians);
    const y = centerY + radius * Math.sin(radians);
    return { x, y };
  };
  
  // Calculate degrees from mouse position
  const calculateDegrees = (clientX: number, clientY: number) => {
    if (!widgetRef.current) return degrees;
    
    const rect = widgetRef.current.getBoundingClientRect();
    const x = clientX - rect.left - centerX;
    const y = clientY - rect.top - centerY;
    
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    
    // Normalize to -90 to 90 range
    if (angle > 180) angle -= 360;
    if (angle > 90) angle = 90;
    if (angle < -90) angle = -90;
    
    return Math.round(angle);
  };
  
  const handleMouseDown = (e: any) => {
    setIsDragging(true);
    const newDegrees = calculateDegrees(e.clientX, e.clientY);
    onChange(newDegrees);
  };
  
  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newDegrees = calculateDegrees(e.clientX, e.clientY);
    onChange(newDegrees);
  }, [isDragging, onChange]);
  
  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);
  
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  const endPoint = getLineEndPoint(degrees);
  
  return (
    <div
      ref={widgetRef}
      onMouseDown={handleMouseDown}
      style={{
        width: '150px',
        height: '150px',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
    >
      <svg width="150" height="150" style={{ overflow: 'visible' }}>
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth="1"
        />
        
        {/* Tick marks at 0, 45, -45, 90, -90 */}
        {[0, 45, -45, 90, -90].map((deg) => {
          const tickStart = getLineEndPoint(deg);
          const tickRadians = (deg - 90) * (Math.PI / 180);
          const tickEndX = centerX + (radius - 8) * Math.cos(tickRadians);
          const tickEndY = centerY + (radius - 8) * Math.sin(tickRadians);
          
          return (
            <line
              key={deg}
              x1={tickStart.x}
              y1={tickStart.y}
              x2={tickEndX}
              y2={tickEndY}
              stroke="#999"
              strokeWidth="1"
            />
          );
        })}
        
        {/* Orientation line */}
        <line
          x1={centerX}
          y1={centerY}
          x2={endPoint.x}
          y2={endPoint.y}
          stroke="#0078d4"
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Draggable handle */}
        <circle
          cx={endPoint.x}
          cy={endPoint.y}
          r="8"
          fill="#0078d4"
          stroke="#fff"
          strokeWidth="2"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />
        
        {/* "Text" label at center */}
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fill="#333"
          pointerEvents="none"
        >
          Text
        </text>
      </svg>
      
      {/* Degree display below */}
      <div
        style={{
          position: 'absolute',
          bottom: '-24px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '12px',
          color: '#666',
          fontWeight: 500
        }}
      >
        {degrees}°
      </div>
    </div>
  );
};

export default OrientationWidget;
