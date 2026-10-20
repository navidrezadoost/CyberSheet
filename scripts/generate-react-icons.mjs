import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const names = [
  'BorderPreviewWidgetIcon1', 'BordersGroupIcon1', 'BordersGroupIcon3',
  'FillColorButtonIcon1', 'LineStyleGridIcon1', 'LineStyleGridIcon2',
  'OrientationWidgetIcon1', 'PatternGridIcon1',
];
for (const name of names) {
  const source = await readFile(path.join(root, 'packages/icons/svg', `${name}.svg`), 'utf8');
  const match = source.match(/^<svg\s+viewBox="([^"]+)"\s*>([\s\S]*)<\/svg>\s*$/);
  if (!match || /\{[^}]*\}/.test(match[2])) throw new Error(`Expected static SVG source for ${name}`);
  const [, viewBox, body] = match;
  const [, , defaultWidth, defaultHeight] = viewBox.split(' ');
  const component = `import React from "react";\nimport type { SVGProps } from "react";\n\nexport interface ${name}Props extends SVGProps<SVGSVGElement> {\n  size?: number | string;\n}\n\nconst ${name} = React.forwardRef<SVGSVGElement, ${name}Props>(\n  ({ size, className, style, ...props }, ref) => (\n    <svg ref={ref} viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" width={size ?? props.width ?? ${defaultWidth}} height={size ?? props.height ?? ${defaultHeight}} fill={props.fill || "currentColor"} className={className} style={style} {...props}>\n      ${body.trim()}\n    </svg>\n  )\n);\n\n${name}.displayName = "${name}";\nexport default ${name};\n`;
  await writeFile(path.join(root, 'packages/icons/react', `${name}.tsx`), component);
}
