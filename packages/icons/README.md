# Icon Components

This directory contains SVG icon components generated for all framework adapters supported by cyber-sheet-excel.

## Structure

```
packages/icons/
├── svg/          # Source SVG files (extracted from inline components)
├── react/        # React/TSX icon components
├── vue/          # Vue icon components
├── svelte/       # Svelte icon components
└── angular/      # Angular icon components
```

## Generation

The source directory contains SVG fragments. Eight recovered React icons previously contained JSX expressions that referenced variables unavailable to their exported icon components. Those sources are now static SVGs and are regenerated through the checked-in deterministic wrapper generator:

```bash
npm run generate:react-icons
```

The generator rejects non-static JSX in these inputs and writes only the eight affected React components. Other framework outputs remain managed by the upstream `svger-cli` workflow below. Do not run that external generator on these eight sources; it does not preserve or interpret React expressions.

For the other framework adapters, the original upstream commands remain:

```bash
svger-cli build packages/icons/svg packages/icons/react
svger-cli config --set framework=vue && svger-cli build packages/icons/svg packages/icons/vue
svger-cli config --set framework=svelte && svger-cli build packages/icons/svg packages/icons/svelte
svger-cli config --set framework=angular && svger-cli build packages/icons/svg packages/icons/angular
```

## Usage

### React

```tsx
import { TitleBarIcon1, StatusBarIcon1 } from '@cyber-sheet/icons/react';

function MyComponent() {
  return (
    <div>
      <TitleBarIcon1 size={24} />
      <StatusBarIcon1 size={16} fill="currentColor" />
    </div>
  );
}
```

### Vue

```vue
<template>
  <div>
    <TitleBarIcon1 :size="24" />
    <StatusBarIcon1 :size="16" fill="currentColor" />
  </div>
</template>

<script setup>
import { TitleBarIcon1, StatusBarIcon1 } from '@cyber-sheet/icons/vue';
</script>
```

### Svelte

```svelte
<script>
  import { TitleBarIcon1, StatusBarIcon1 } from '@cyber-sheet/icons/svelte';
</script>

<div>
  <TitleBarIcon1 size={24} />
  <StatusBarIcon1 size={16} fill="currentColor" />
</div>
```

### Angular

```typescript
import { TitleBarIcon1Component, StatusBarIcon1Component } from '@cyber-sheet/icons/angular';

@Component({
  selector: 'my-component',
  standalone: true,
  imports: [TitleBarIcon1Component, StatusBarIcon1Component],
  template: `
    <div>
      <app-title-bar-icon1 size="24"></app-title-bar-icon1>
      <app-status-bar-icon1 size="16" fill="currentColor"></app-status-bar-icon1>
    </div>
  `
})
export class MyComponent {}
```

## Icon Naming

Icons are named based on the component they were extracted from:
- `TitleBarIcon1.tsx` - First icon from TitleBar component
- `StatusBarIcon2.tsx` - Second icon from StatusBar component
- `WindowGroupIcon3.tsx` - Third icon from WindowGroup component

## Regenerating Icons

To regenerate icons after adding or modifying SVGs:

1. Add new SVG files to `packages/icons/svg/`
2. Run the generation commands above for each framework
3. Import paths will automatically resolve via TypeScript path mapping

## Configuration

The icons package is configured in `packages/icons/tsconfig.json` and referenced in dependent packages via TypeScript path mappings:

```json
{
  "paths": {
    "@cyber-sheet/icons/*": ["../icons/*"]
  }
}
```
