import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const distRoot = resolve(packageRoot, 'dist');
const filesToCopy = [
  ['src/assets.d.ts', 'assets.d.ts'],
  ['src/components/excel-app.css', 'components/excel-app.css'],
  ['src/components/ribbon/ribbon.css', 'components/ribbon/ribbon.css'],
];

for (const [sourceRelative, destinationRelative] of filesToCopy) {
  const source = resolve(packageRoot, sourceRelative);
  if (!existsSync(source)) {
    throw new Error(`React package asset is missing: ${sourceRelative}`);
  }
}

for (const requiredOutput of ['index.js', 'index.d.ts']) {
  if (!existsSync(resolve(distRoot, requiredOutput))) {
    throw new Error(`Expected TypeScript build output is missing: dist/${requiredOutput}`);
  }
}

for (const [sourceRelative, destinationRelative] of filesToCopy) {
  const source = resolve(packageRoot, sourceRelative);
  const destination = resolve(distRoot, destinationRelative);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
  if (!readFileSync(source).equals(readFileSync(destination))) {
    throw new Error(`React package asset copy did not match: ${destinationRelative}`);
  }
}

const declarationPath = resolve(distRoot, 'index.d.ts');
const reference = '/// <reference path="./assets.d.ts" />';
const declaration = readFileSync(declarationPath, 'utf8');
const declarationWithoutExistingReferences = declaration
  .split(/\r?\n/)
  .filter((line) => line.trim() !== reference)
  .join('\n');
const packagedDeclaration = `${reference}\n${declarationWithoutExistingReferences}`;
writeFileSync(declarationPath, packagedDeclaration);

const referenceCount = packagedDeclaration
  .split(/\r?\n/)
  .filter((line) => line.trim() === reference)
  .length;
if (referenceCount !== 1 || !packagedDeclaration.startsWith(`${reference}\n`)) {
  throw new Error('React root declaration must contain exactly one leading CSS asset reference.');
}

console.log('Packaged React CSS declaration and assets.');
