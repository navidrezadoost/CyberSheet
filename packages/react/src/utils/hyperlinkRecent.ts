const RECENT_URLS_KEY = 'cybersheet:recent-hyperlink-urls';
const RECENT_EMAILS_KEY = 'cybersheet:recent-hyperlink-emails';
const MAX_RECENT = 10;

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(key: string, items: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

export function getRecentHyperlinkUrls(): string[] {
  return readList(RECENT_URLS_KEY);
}

export function getRecentHyperlinkEmails(): string[] {
  return readList(RECENT_EMAILS_KEY);
}

export function addRecentHyperlinkUrl(url: string): void {
  const trimmed = url.trim();
  if (!trimmed) return;
  const next = [trimmed, ...getRecentHyperlinkUrls().filter((v) => v !== trimmed)];
  writeList(RECENT_URLS_KEY, next);
}

export function addRecentHyperlinkEmail(email: string): void {
  const trimmed = email.trim().replace(/^mailto:/i, '').split('?')[0];
  if (!trimmed || !trimmed.includes('@')) return;
  const next = [trimmed, ...getRecentHyperlinkEmails().filter((v) => v !== trimmed)];
  writeList(RECENT_EMAILS_KEY, next);
}
