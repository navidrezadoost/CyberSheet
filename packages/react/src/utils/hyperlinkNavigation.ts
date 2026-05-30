import type { Workbook } from '@cyber-sheet/core';
import { markHyperlinkVisited } from '@cyber-sheet/core';
import type { CanvasRenderer } from '@cyber-sheet/renderer-canvas';
import { addRecentHyperlinkEmail, addRecentHyperlinkUrl } from './hyperlinkRecent';
import {
  isFilePath,
  normalizeHyperlinkAddress,
  openPickedOrLocalFile,
  recoverFileTargetFromBadUrl,
} from './hyperlinkFiles';

export type HyperlinkDialogKind = 'url' | 'document' | 'newDocument' | 'email';

export interface HyperlinkDialogFields {
  kind: HyperlinkDialogKind;
  address: string;
  sheetName: string;
  emailSubject: string;
  newDocumentName: string;
  newDocumentPath: string;
  editNewDocumentNow: boolean;
  tooltip: string;
}

function parseCellReference(ref: string): { row: number; col: number } | null {
  const match = ref.trim().replace(/\$/g, '').match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  const letters = match[1].toUpperCase();
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return { row: parseInt(match[2], 10), col };
}

function parseInternalTarget(target: string): { sheetName?: string; cellRef: string } | null {
  const trimmed = target.trim().replace(/^#/, '');
  const withSheet = trimmed.match(/^(?:'([^']+)'|([^!'"]+))!(.+)$/i);
  if (withSheet) {
    return {
      sheetName: withSheet[1] ?? withSheet[2],
      cellRef: withSheet[3].replace(/\$/g, ''),
    };
  }
  if (/^[A-Z]+\d+$/i.test(trimmed)) {
    return { cellRef: trimmed.toUpperCase() };
  }
  return null;
}

function parseMailto(target: string): { email: string; subject?: string } {
  const body = target.replace(/^mailto:/i, '');
  const [email, query = ''] = body.split('?');
  const params = new URLSearchParams(query);
  return {
    email,
    subject: params.get('subject') ?? undefined,
  };
}

function tryOpenFileTarget(target: string): boolean {
  if (/^blob:/i.test(target) || isFilePath(target)) {
    return openPickedOrLocalFile(target);
  }
  const recovered = recoverFileTargetFromBadUrl(target);
  if (recovered) {
    return openPickedOrLocalFile(recovered);
  }
  return false;
}

export function openHyperlinkTarget(
  target: string,
  workbook: Workbook,
  renderer: CanvasRenderer | null,
  onSheetChange?: (sheetName: string) => void,
  onCellNavigate?: (address: { row: number; col: number }) => void
): boolean {
  const trimmed = target.trim();
  if (!trimmed) return false;

  markHyperlinkVisited(trimmed);

  if (/^mailto:/i.test(trimmed)) {
    const { email } = parseMailto(trimmed);
    if (email) addRecentHyperlinkEmail(email);
    window.open(trimmed, '_blank', 'noopener,noreferrer');
    return true;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const recovered = recoverFileTargetFromBadUrl(trimmed);
    if (recovered && tryOpenFileTarget(recovered)) {
      return true;
    }
    addRecentHyperlinkUrl(trimmed);
    window.open(trimmed, '_blank', 'noopener,noreferrer');
    return true;
  }

  if (tryOpenFileTarget(trimmed)) {
    return true;
  }

  const internal = parseInternalTarget(trimmed);
  if (internal) {
    if (internal.sheetName) {
      const names = workbook.getSheetNames();
      const match = names.find((name) => name.toLowerCase() === internal.sheetName!.toLowerCase());
      if (!match) return false;
      workbook.activeSheetName = match;
      onSheetChange?.(match);
    }

    const parsed = parseCellReference(internal.cellRef);
    if (!parsed) return false;

    renderer?.setSelection({ start: parsed, end: parsed });
    renderer?.scrollToCell?.({ row: parsed.row, col: parsed.col });
    renderer?.scheduleRedraw?.();
    onCellNavigate?.(parsed);
    return true;
  }

  const fallback = normalizeHyperlinkAddress(trimmed);
  if (isFilePath(fallback) || /^blob:/i.test(fallback)) {
    return tryOpenFileTarget(fallback);
  }

  addRecentHyperlinkUrl(fallback);
  window.open(fallback, '_blank', 'noopener,noreferrer');
  return true;
}

export function buildHyperlinkTarget(
  kind: HyperlinkDialogKind,
  address: string,
  options?: {
    sheetName?: string;
    emailSubject?: string;
    newDocumentPath?: string;
  }
): string {
  const trimmed = address.trim();
  switch (kind) {
    case 'email': {
      const email = trimmed.replace(/^mailto:/i, '').split('?')[0];
      if (!email.includes('@')) return trimmed;
      const params = new URLSearchParams();
      if (options?.emailSubject?.trim()) {
        params.set('subject', options.emailSubject.trim());
      }
      const query = params.toString();
      return query ? `mailto:${email}?${query}` : `mailto:${email}`;
    }
    case 'document': {
      const cellRef = trimmed.replace(/\$/g, '').toUpperCase();
      const sheetName = options?.sheetName;
      if (sheetName) {
        const escaped = sheetName.includes(' ') ? `'${sheetName}'` : sheetName;
        return `${escaped}!${cellRef}`;
      }
      return cellRef;
    }
    case 'newDocument': {
      const fileName = trimmed;
      const dir = (options?.newDocumentPath ?? '').trim().replace(/[/\\]+$/, '');
      if (!fileName) return '';
      return dir ? `${dir}\\${fileName}` : fileName;
    }
    case 'url':
    default:
      return normalizeHyperlinkAddress(trimmed);
  }
}

export function inferHyperlinkKind(target: string, storedKind?: string): HyperlinkDialogKind {
  if (storedKind === 'newDocument') return 'newDocument';
  if (storedKind === 'document' || storedKind === 'internal') return 'document';
  if (storedKind === 'email') return 'email';
  if (/^mailto:/i.test(target)) return 'email';
  if (parseInternalTarget(target)) return 'document';
  return 'url';
}

export function parseHyperlinkForDialog(
  target: string,
  activeSheetName: string,
  storedKind?: string
): HyperlinkDialogFields {
  const kind = inferHyperlinkKind(target, storedKind);

  if (kind === 'email') {
    const parsed = parseMailto(target.startsWith('mailto:') ? target : `mailto:${target}`);
    return {
      kind,
      address: parsed.email,
      sheetName: activeSheetName,
      emailSubject: parsed.subject ?? '',
      newDocumentName: '',
      newDocumentPath: '',
      editNewDocumentNow: false,
      tooltip: '',
    };
  }

  if (kind === 'document') {
    const internal = parseInternalTarget(target);
    return {
      kind,
      address: internal?.cellRef ?? 'A1',
      sheetName: internal?.sheetName ?? activeSheetName,
      emailSubject: '',
      newDocumentName: '',
      newDocumentPath: '',
      editNewDocumentNow: false,
      tooltip: '',
    };
  }

  if (kind === 'newDocument') {
    const parts = target.replace(/[/\\]+$/, '').split(/[/\\]/);
    const fileName = parts.pop() ?? '';
    const dir = parts.join('\\');
    return {
      kind,
      address: target,
      sheetName: activeSheetName,
      emailSubject: '',
      newDocumentName: fileName,
      newDocumentPath: dir,
      editNewDocumentNow: false,
      tooltip: '',
    };
  }

  let address = target;
  const recovered = recoverFileTargetFromBadUrl(target);
  if (recovered) {
    address = recovered;
  } else if (/^https?:\/\//i.test(target)) {
    address = target.replace(/^https?:\/\//i, '');
  } else if (/^file:\/*/i.test(target)) {
    address = target.replace(/^file:\/*/i, '');
  } else if (/^blob:/i.test(target)) {
    address = target;
  }

  return {
    kind: 'url',
    address,
    sheetName: activeSheetName,
    emailSubject: '',
    newDocumentName: '',
    newDocumentPath: '',
    editNewDocumentNow: false,
    tooltip: '',
  };
}

export function buildHyperlinkFromDialog(
  kind: HyperlinkDialogKind,
  fields: HyperlinkDialogFields
): {
  target: string;
  kind: 'url' | 'internal' | 'file' | 'email' | 'newDocument';
  tooltip?: string;
  emailSubject?: string;
  newDocumentName?: string;
  newDocumentPath?: string;
  subAddress?: string;
} {
  const rawAddress = kind === 'newDocument' ? fields.newDocumentName : fields.address;
  const target = buildHyperlinkTarget(kind, rawAddress, {
    sheetName: fields.sheetName,
    emailSubject: fields.emailSubject,
    newDocumentPath: fields.newDocumentPath,
  });

  let mappedKind: 'url' | 'internal' | 'file' | 'email' | 'newDocument';
  if (kind === 'document') mappedKind = 'internal';
  else if (kind === 'newDocument') mappedKind = 'newDocument';
  else if (kind === 'email') mappedKind = 'email';
  else if (/^blob:/i.test(fields.address) || isFilePath(fields.address)) mappedKind = 'file';
  else mappedKind = 'url';

  return {
    target,
    kind: mappedKind,
    tooltip: fields.tooltip.trim() || undefined,
    emailSubject: fields.emailSubject.trim() || undefined,
    newDocumentName: kind === 'newDocument' ? fields.newDocumentName.trim() || undefined : undefined,
    newDocumentPath: kind === 'newDocument' ? fields.newDocumentPath.trim() || undefined : undefined,
    subAddress: kind === 'document' ? target : undefined,
  };
}

export function downloadBlankWorkbook(fileName: string): void {
  const name = fileName.trim() || 'Document.xlsx';
  const blob = new Blob([], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name.endsWith('.xlsx') ? name : `${name}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export { isFilePath } from './hyperlinkFiles';
