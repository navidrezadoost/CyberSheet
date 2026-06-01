export interface IconDefinition {
  id: string;
  name: string;
  category: string;
  viewBox: string;
  /** Inner SVG markup (paths/groups). Uses currentColor for fill. */
  content: string;
  keywords: string[];
}

export const ICON_CATEGORIES = [
  'People',
  'Business',
  'Communication',
  'Technology',
  'Nature',
  'Objects',
  'Symbols',
] as const;

const icon = (
  id: string,
  name: string,
  category: string,
  content: string,
  keywords: string[] = [],
): IconDefinition => ({
  id,
  name,
  category,
  viewBox: '0 0 24 24',
  content,
  keywords,
});

export const ICON_CATALOG: IconDefinition[] = [
  icon('person', 'Person', 'People', '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/>', ['user', 'profile']),
  icon('people', 'People', 'People', '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6 1.2 0 2.3.3 3.2 1"/><path d="M14 20c0-2.8 2-5.1 4.6-5.7"/>', ['team', 'group']),
  icon('briefcase', 'Briefcase', 'Business', '<rect x="4" y="8" width="16" height="11" rx="1.5"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M4 13h16"/>', ['work', 'job']),
  icon('chart', 'Chart', 'Business', '<rect x="4" y="12" width="3" height="8"/><rect x="10" y="8" width="3" height="12"/><rect x="16" y="5" width="3" height="15"/>', ['graph', 'analytics']),
  icon('calendar', 'Calendar', 'Business', '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 4v4M16 4v4M4 10h16"/>', ['date', 'schedule']),
  icon('mail', 'Mail', 'Communication', '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="m3 8 9 6 9-6"/>', ['email', 'envelope']),
  icon('phone', 'Phone', 'Communication', '<path d="M7 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5L15 12.5 19 14v3a2 2 0 0 1-2 2A15 15 0 0 1 5 6a2 2 0 0 1 2-2"/>', ['call', 'mobile']),
  icon('chat', 'Chat', 'Communication', '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2"/>', ['message', 'comment']),
  icon('laptop', 'Laptop', 'Technology', '<rect x="4" y="6" width="16" height="10" rx="1.5"/><path d="M2 18h20"/>', ['computer', 'device']),
  icon('cloud', 'Cloud', 'Technology', '<path d="M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6-1.5A3.5 3.5 0 0 0 7 18"/>', ['storage', 'online']),
  icon('wifi', 'Wi-Fi', 'Technology', '<path d="M2 8.5 12 17l10-8.5"/><path d="M5.5 11.5 12 16l6.5-4.5"/><circle cx="12" cy="19" r="1"/>', ['network', 'internet']),
  icon('leaf', 'Leaf', 'Nature', '<path d="M6 20c8-1 12-8 12-14a7 7 0 0 0-7 7C5 13 6 20 6 20"/><path d="M6 20s-1-5 4-9"/>', ['plant', 'eco']),
  icon('sun', 'Sun', 'Nature', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>', ['weather', 'day']),
  icon('tree', 'Tree', 'Nature', '<path d="M12 21V11"/><path d="M7 11c0-3 2.2-5 5-5s5 2 5 5"/><path d="M5 11c0-2.5 1.8-4.5 4-4.5"/><path d="M15 11c0-2.5 1.8-4.5 4-4.5"/>', ['forest', 'nature']),
  icon('home', 'Home', 'Objects', '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>', ['house', 'building']),
  icon('folder', 'Folder', 'Objects', '<path d="M4 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/>', ['file', 'directory']),
  icon('camera', 'Camera', 'Objects', '<path d="M4 8h4l2-2h4l2 2h4v10H4Z"/><circle cx="12" cy="13" r="3"/>', ['photo', 'picture']),
  icon('star', 'Star', 'Symbols', '<path d="m12 3 2.3 4.7 5.2.8-3.8 3.6.9 5.2L12 15.8 7.4 17.3l.9-5.2L4.5 8.5l5.2-.8Z"/>', ['favorite', 'rating']),
  icon('heart', 'Heart', 'Symbols', '<path d="M12 20s-6.7-4.4-8.5-8.2C2.2 8.8 3.6 5.5 6.8 5.5c1.7 0 3.2.9 4 2.2.8-1.3 2.3-2.2 4-2.2 3.2 0 4.6 3.3 3.3 6.3C18.7 15.6 12 20 12 20"/>', ['love', 'like']),
  icon('check', 'Check', 'Symbols', '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5L16 9" fill="none" stroke="currentColor" stroke-width="2"/>', ['done', 'complete']),
  icon('warning', 'Warning', 'Symbols', '<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17h.01" fill="none" stroke="currentColor" stroke-width="2"/>', ['alert', 'caution']),
  icon('info', 'Info', 'Symbols', '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01" fill="none" stroke="currentColor" stroke-width="2"/>', ['help', 'about']),
  icon('lock', 'Lock', 'Symbols', '<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', ['security', 'private']),
  icon('settings', 'Settings', 'Symbols', '<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" fill="none" stroke="currentColor" stroke-width="1.5"/>', ['gear', 'config']),
];

const iconLookup = new Map(ICON_CATALOG.map((item) => [item.id, item]));

export function getIconDefinition(iconId: string): IconDefinition | undefined {
  return iconLookup.get(iconId);
}

export function buildIconSvg(def: IconDefinition, color = '#4472C4'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${def.viewBox}" fill="${color}">${def.content}</svg>`;
}

export function iconSvgToDataUri(def: IconDefinition, color = '#4472C4'): string {
  return `data:image/svg+xml,${encodeURIComponent(buildIconSvg(def, color))}`;
}

export function loadIconImage(def: IconDefinition, color = '#4472C4'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = iconSvgToDataUri(def, color);
  });
}

export function searchIcons(query: string): IconDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return ICON_CATALOG;
  return ICON_CATALOG.filter(
    (icon) =>
      icon.name.toLowerCase().includes(q) ||
      icon.category.toLowerCase().includes(q) ||
      icon.keywords.some((kw) => kw.includes(q)),
  );
}

export function groupIconsByCategory(icons: IconDefinition[]): Map<string, IconDefinition[]> {
  const groups = new Map<string, IconDefinition[]>();
  for (const category of ICON_CATEGORIES) {
    const items = icons.filter((icon) => icon.category === category);
    if (items.length > 0) groups.set(category, items);
  }
  return groups;
}
