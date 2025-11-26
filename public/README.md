# Place Excel Files Here

To load your Excel file in the viewer:

1. Copy your `.xlsx` file to this `public/` directory
2. Update the URL in `examples/react-canvas-viewer.tsx`:

```typescript
const DEFAULT_URL = '/your-file-name.xlsx';
```

3. Reload the page

Example:
```bash
cp ~/Downloads/myfile.xlsx public/
```

Then change the URL to:
```typescript
const DEFAULT_URL = '/myfile.xlsx';
```
