/** Session registry for files picked via the hyperlink Browse dialog (browser has no real path). */
const pickedFiles = new Map<string, File>();

export function registerHyperlinkPickedFile(file: File): string {
  const objectUrl = URL.createObjectURL(file);
  pickedFiles.set(objectUrl, file);
  return objectUrl;
}

export function getHyperlinkPickedFile(target: string): File | undefined {
  return pickedFiles.get(target);
}

export function resolveHyperlinkFileName(target: string): string | null {
  const file = pickedFiles.get(target);
  if (file) return file.name;
  const bare = extractBareFileName(target);
  return bare;
}

function extractBareFileName(value: string): string | null {
  const trimmed = value.trim();
  if (/^blob:/i.test(trimmed)) {
    const file = pickedFiles.get(trimmed);
    return file?.name ?? null;
  }
  const withoutProtocol = trimmed.replace(/^file:\/*/i, '');
  const name = withoutProtocol.split(/[/\\]/).pop();
  if (name && /\.[a-z0-9]{2,5}$/i.test(name)) return name;
  if (/^[^/\\]+\.[a-z0-9]{2,5}$/i.test(trimmed)) return trimmed;
  return null;
}

export function openPickedOrLocalFile(target: string): boolean {
  const trimmed = target.trim();

  if (/^blob:/i.test(trimmed)) {
    const file = pickedFiles.get(trimmed);
    if (file) {
      const url = URL.createObjectURL(file);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return true;
    }
    window.open(trimmed, '_blank', 'noopener,noreferrer');
    return true;
  }

  if (pickedFiles.has(trimmed)) {
    window.open(trimmed, '_blank', 'noopener,noreferrer');
    return true;
  }

  if (/^[a-z]:[/\\]/i.test(trimmed) || trimmed.startsWith('\\\\') || (trimmed.startsWith('/') && !trimmed.startsWith('//'))) {
    const href = `file:///${trimmed.replace(/\\/g, '/').replace(/^\/+/, '')}`;
    window.open(href, '_blank', 'noopener,noreferrer');
    return true;
  }

  const bareName = extractBareFileName(trimmed);
  if (bareName) {
    for (const [url, file] of pickedFiles) {
      if (file.name === bareName) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return true;
      }
    }
    return false;
  }

  return false;
}

/** Recover filename from mistaken https://filename.ext links saved before the fix. */
export function recoverFileTargetFromBadUrl(target: string): string | null {
  const match = target.trim().match(/^https?:\/\/([^/?#]+)\/?(?:[?#].*)?$/i);
  if (!match) return null;
  const host = match[1];
  if (/^[^/\\]+\.[a-z0-9]{2,5}$/i.test(host) && !host.includes('@')) {
    return host;
  }
  return null;
}

export const KNOWN_FILE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico',
  'pdf', 'xlsx', 'xls', 'xlsm', 'csv', 'tsv', 'doc', 'docx', 'ppt', 'pptx',
  'txt', 'md', 'html', 'htm', 'xml', 'json', 'zip', 'rar', '7z',
  'mp3', 'mp4', 'wav', 'avi', 'mov', 'wmv',
]);

export function getFileExtension(name: string): string | null {
  const m = name.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return m ? m[1] : null;
}

export function isBareFileName(value: string): boolean {
  const trimmed = value.trim();
  if (!/^[^/\\?#]+\.[a-z0-9]{2,5}$/i.test(trimmed)) return false;
  const ext = getFileExtension(trimmed);
  return ext != null && KNOWN_FILE_EXTENSIONS.has(ext);
}

export function isFilePath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^file:/i.test(trimmed) || /^blob:/i.test(trimmed)) return true;
  if (/^[a-z]:[/\\]/i.test(trimmed) || trimmed.startsWith('\\\\')) return true;
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    const base = trimmed.split(/[/\\]/).pop() ?? '';
    const ext = getFileExtension(base);
    return ext != null && KNOWN_FILE_EXTENSIONS.has(ext);
  }
  return isBareFileName(trimmed);
}

const COMMON_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'io', 'co', 'uk', 'de', 'fr', 'au', 'ca', 'jp', 'cn', 'ru', 'info', 'biz',
]);

export function looksLikeWebHost(value: string): boolean {
  const trimmed = value.trim().replace(/^https?:\/\//i, '').split('/')[0];
  if (!trimmed || trimmed.includes('\\') || /^[a-z]:$/i.test(trimmed.slice(0, 2))) return false;
  if (trimmed.includes('@')) return false;

  const parts = trimmed.split('.');
  if (parts.length < 2) return false;

  const tld = parts[parts.length - 1].toLowerCase();
  if (!COMMON_TLDS.has(tld)) return false;

  const ext = getFileExtension(trimmed);
  if (ext && KNOWN_FILE_EXTENSIONS.has(ext) && parts.length === 2) {
    return false;
  }

  return true;
}

export function normalizeHyperlinkAddress(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return trimmed;
  if (/^(https?:|mailto:|file:|blob:)/i.test(trimmed)) return trimmed;
  if (isFilePath(trimmed)) return trimmed;
  if (looksLikeWebHost(trimmed)) {
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  if (trimmed.includes('.') && !isBareFileName(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}
