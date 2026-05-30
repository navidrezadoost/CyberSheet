import type { CellHyperlink } from './types';

export const HYPERLINK_COLOR = '#0563C1';
export const HYPERLINK_VISITED_COLOR = '#954F72';

const VISITED_STORAGE_KEY = 'cybersheet:visited-hyperlinks';

export function normalizeHyperlinkTarget(target: string): string {
  return target.trim().toLowerCase();
}

export function markHyperlinkVisited(target: string): void {
  try {
    const key = normalizeHyperlinkTarget(target);
    const raw = sessionStorage.getItem(VISITED_STORAGE_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.add(key);
    sessionStorage.setItem(VISITED_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // ignore storage errors
  }
}

export function isHyperlinkVisited(target: string): boolean {
  try {
    const key = normalizeHyperlinkTarget(target);
    const raw = sessionStorage.getItem(VISITED_STORAGE_KEY);
    if (!raw) return false;
    const set = new Set<string>(JSON.parse(raw));
    return set.has(key);
  } catch {
    return false;
  }
}

export function getDefaultHyperlinkDisplayText(hyperlink: CellHyperlink): string {
  const target = hyperlink.target.trim();
  if (/^mailto:/i.test(target)) {
    const body = target.replace(/^mailto:/i, '');
    const email = body.split('?')[0];
    return email || target;
  }
  const badFileMatch = target.match(/^https?:\/\/([^/?#]+)\/?(?:[?#].*)?$/i);
  if (badFileMatch && /^[^/\\@]+\.[a-z0-9]{2,5}$/i.test(badFileMatch[1])) {
    return badFileMatch[1];
  }
  if (/^https?:\/\//i.test(target)) {
    return target.replace(/^https?:\/\//i, '');
  }
  if (/^file:/i.test(target)) {
    return target.replace(/^file:\/*/i, '').split(/[/\\]/).pop() ?? target;
  }
  if (/^blob:/i.test(target)) {
    return hyperlink.newDocumentName ?? 'Linked file';
  }
  const baseName = target.split(/[/\\]/).pop();
  return baseName ?? target.replace(/^#/, '');
}

export function getDefaultHyperlinkScreenTip(hyperlink: CellHyperlink): string {
  if (hyperlink.tooltip?.trim()) return hyperlink.tooltip.trim();
  return hyperlink.target;
}
