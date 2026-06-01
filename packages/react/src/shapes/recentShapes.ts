import { getShapeDefinition } from './shape-catalog';

const STORAGE_KEY = 'cyber-sheet-recent-shapes';
export const MAX_RECENT_SHAPES = 8;

export function getRecentShapeIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

export function trackShapeUsage(shapeId: string): string[] {
  if (!getShapeDefinition(shapeId)) return getRecentShapeIds();

  const recent = getRecentShapeIds().filter((id) => id !== shapeId);
  recent.unshift(shapeId);
  const trimmed = recent.slice(0, MAX_RECENT_SHAPES);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore quota / private mode errors
  }

  return trimmed;
}
