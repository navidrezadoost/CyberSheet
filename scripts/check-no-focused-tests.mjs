import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const testRoots = ['packages'];
const testSuffix = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const errors = [];
const testApiNames = /^(?:test|it|describe|suite|specify)$/;

function isTestApiChain(expression) {
  let current = expression;
  while (true) {
    if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
      current = current.expression;
    } else if (ts.isCallExpression(current)) {
      current = current.expression;
    } else {
      break;
    }
  }
  return ts.isIdentifier(current) && testApiNames.test(current.text);
}

async function visit(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(file);
      continue;
    }
    if (!entry.isFile() || !testSuffix.test(entry.name)) continue;

    const sourceText = await readFile(file, 'utf8');
    const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
    function inspect(node) {
      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        if (ts.isPropertyAccessExpression(expression)
          && expression.name.text === 'only'
          && isTestApiChain(expression.expression)) {
          const { line, character } = source.getLineAndCharacterOfPosition(expression.getStart(source));
          errors.push(`${file}:${line + 1}:${character + 1}: focused test API ${expression.getText(source)}`);
        }
        if (ts.isIdentifier(expression) && /^(?:fit|fdescribe|fsuite|fspecify)$/.test(expression.text)) {
          const { line, character } = source.getLineAndCharacterOfPosition(expression.getStart(source));
          errors.push(`${file}:${line + 1}:${character + 1}: focused test API ${expression.text}`);
        }
      }
      ts.forEachChild(node, inspect);
    }
    inspect(source);
  }
}

for (const root of testRoots) await visit(root);

if (errors.length) {
  console.error(`Found ${errors.length} focused test marker(s):\n${errors.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('No focused test markers found.');
}
