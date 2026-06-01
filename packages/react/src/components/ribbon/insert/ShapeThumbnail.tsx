import React from 'react';
import { getShapePath, getShapePathKind } from '../../../shapes/shapePaths';

interface ShapeThumbnailProps {
  shapeId: string;
  size?: number;
}

export const ShapeThumbnail: React.FC<ShapeThumbnailProps> = ({ shapeId, size = 24 }) => {
  const pad = 2;
  const w = size - pad * 2;
  const h = size - pad * 2;
  const path = getShapePath(shapeId, w, h);
  const kind = getShapePathKind(shapeId);
  const isStroke = kind === 'stroke';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <g transform={`translate(${pad}, ${pad})`}>
        {isStroke ? (
          <path
            d={path}
            fill="none"
            stroke="#595959"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path d={path} fill="#B4B4B4" stroke="#595959" strokeWidth={0.75} />
        )}
      </g>
    </svg>
  );
};
