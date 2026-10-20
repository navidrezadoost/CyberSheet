#!/usr/bin/env node
/**
 * Build a deterministic, TypeScript-symbol-aware review overlay for the
 * CS-002D4-R0 text candidate inventory. This is audit tooling, not a test or
 * production module. It records static evidence and deliberately preserves
 * unresolved ownership cases instead of guessing their runtime owner.
 *
 * Run with the repository-pinned Node runtime from the repository root:
 *   node docs/engineering/CS-002D4-R0.1-semantic-reconciler.mjs
 *   node docs/engineering/CS-002D4-R0.1-semantic-reconciler.mjs --check
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const INPUT = path.join(__dirname, 'CS-002D4-R0-callsite-inventory.tsv');
const OUTPUT = path.join(__dirname, 'CS-002D4-R0.1-semantic-review.tsv');
const FLOW_OUTPUT = path.join(__dirname, 'CS-002D4-R0.1-flow-review.tsv');
const KNOWN_WORKSHEET_MUTATORS = new Set([
  'setCellValue', 'setCellFormula', 'clearCellContent', 'clearCellFormula',
  'setCellStyle', 'setRowStyle', 'setColumnStyle', 'mergeCells', 'cancelMerge',
  'setHyperlink', 'removeHyperlink', 'deleteCell', 'setColumnFilter',
  'clearColumnFilter', 'clearAllFilters', 'hideRow', 'showRow', 'hideCol',
  'showCol', 'insertRows', 'insertColumns', 'reorderRows', 'reorderColumns',
  'sortRange', 'setDataValidation', 'removeDataValidation', 'setIcon',
  'setCellComponent', 'clearCellComponent', 'addComment', 'updateComment',
  'deleteComment', 'applySnapshot', 'setRowHeight', 'setRowHeights',
  'setColumnWidth', 'protectSheet', 'unprotectSheet', 'setFreezePanes',
  'clearFreezePanes', 'setHeaderFooter', 'addConditionalFormattingRule',
  'clearConditionalFormatting', 'setConditionalFormattingRules',
  'setAutoFilterRange', 'clearAutoFilterRange', 'addSheet', 'deleteSheet',
  'renameSheet', 'setPivotAnchor', 'setSlicer', 'clearSlicer', 'createPivot',
  'deletePivot', 'registerPivotDependency', 'unregisterPivotDependency',
]);
const RELEVANT_WORKBOOK_MEMBERS = new Set([
  'getSheet', 'activeSheet', 'activeSheetName', 'addSheet', 'deleteSheet',
  'renameSheet',
]);
const KNOWN_ESCAPE_MEMBERS = new Set([
  'getStyleCache', 'getPivotRegistry', 'getPivotSnapshotStore',
  'getPivotDependencyIndex', 'getPivotInvalidationEngine',
  'getPivotRecomputeEngine', 'getDrawingLayer', 'getHiddenRows', 'getHiddenCols',
  'forEachNonEmptyCell', 'eventBus',
]);
const KNOWN_WORKSHEET_READS = new Set([
  'getCell', 'getCellValue', 'getUsedRange', 'getContiguousRange', 'getCellStyle',
  'getDirectCellStyle', 'getEffectiveCellStyle', 'getRowStyle', 'getColumnStyle',
  'getMergedRangeForCell', 'getMergedRanges', 'getFreezePanes', 'getSheetProtection',
  'getHeaderFooter', 'getColumnFilter', 'getAllFilters', 'getAutoFilterRange',
  'getComments', 'getAllComments', 'getIcon', 'getCellComponent', 'getImages',
  'getHiddenRows', 'getHiddenCols', 'getFormulaAddresses', 'getPrecedents',
  'getDependents', 'getSpecialCells', 'getValidationCells',
  'getConditionalFormattingRules', 'getDistinctValues', 'getVisibleRowIndices',
  'getVisibleColumnIndices', 'isRowHidden', 'isColHidden', 'isCellHidden',
  'isSheetProtected', 'isProgressiveLoading', 'isRowLoaded', 'find', 'findAll',
  'forEachNonEmptyCell',
]);

function parseTsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === '\t') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...data] = rows;
  return data.filter((r) => r.length > 1).map((values) =>
    Object.fromEntries(header.map((key, i) => [key, values[i] ?? '']))
  );
}

function tsvCell(value) {
  const text = String(value ?? '');
  return /[\t\r\n"]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function serializeTsv(rows, headers) {
  return [headers.join('\t'), ...rows.map((row) =>
    headers.map((header) => tsvCell(row[header])).join('\t')
  )].join('\n') + '\n';
}

function fileOwner(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (rel.startsWith('packages/core/src/')) {
    const area = rel.split('/')[3] || 'core';
    return area === 'worksheet.ts' || rel.endsWith('/worksheet.ts')
      ? 'Core worksheet API owner'
      : area === 'workbook.ts'
        ? 'Core workbook owner'
        : `Core ${area.replace(/\.[^.]+$/, '')} owner`;
  }
  if (rel.startsWith('packages/core/')) return 'Core test or tooling owner';
  if (rel.startsWith('packages/react/')) return 'React adapter owner';
  if (rel.startsWith('packages/renderer-canvas/')) return 'Canvas renderer owner';
  if (rel.startsWith('packages/io-xlsx/')) return 'XLSX adapter owner';
  if (rel.startsWith('packages/vue/')) return 'Vue adapter owner';
  if (rel.startsWith('packages/angular/')) return 'Angular adapter owner';
  if (rel.startsWith('packages/svelte/')) return 'Svelte adapter owner';
  if (rel.startsWith('packages/')) return `${rel.split('/')[1]} package owner`;
  if (rel.startsWith('examples/') || rel.startsWith('test-projects/')) {
    return 'Example and compatibility sample owner';
  }
  return 'Repository integration owner';
}

function isTestPath(rel) {
  return /(^|\/)(__tests__|test|tests)(\/|\.)|\.(test|spec)\./.test(rel);
}

function typeText(checker, node) {
  if (!node) return 'unresolved';
  try {
    return checker.typeToString(
      checker.getTypeAtLocation(node),
      node,
      ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
    ).replace(/\s+/g, ' ').trim();
  } catch {
    return 'unresolved';
  }
}

function clip(value, limit) {
  const text = String(value ?? '');
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function methodOwner(checker, receiver, member) {
  if (!receiver || !member) return 'unresolved';
  try {
    const type = checker.getTypeAtLocation(receiver);
    const property = checker.getPropertyOfType(type, member);
    const declaration = property?.getDeclarations()?.[0];
    if (!declaration) return 'unresolved';
    const owner = declaration.parent;
    if (ts.isClassDeclaration(owner) || ts.isInterfaceDeclaration(owner) || ts.isTypeLiteralNode(owner)) {
      return owner.name?.text || (ts.isTypeLiteralNode(owner) ? 'type literal' : 'anonymous owner');
    }
    return ts.SyntaxKind[owner.kind] || 'unresolved';
  } catch {
    return 'unresolved';
  }
}

function declaredKind(declaration) {
  if (ts.isParameter(declaration)) return 'parameter';
  if (ts.isPropertyDeclaration(declaration) || ts.isPropertySignature(declaration)) return 'property';
  if (ts.isVariableDeclaration(declaration)) return 'local variable';
  if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)) return 'function result';
  if (ts.isImportSpecifier(declaration) || ts.isImportClause(declaration)) return 'import';
  return ts.SyntaxKind[declaration.kind] || 'binding';
}

function traceOrigin(checker, expression, depth = 0, seen = new Set()) {
  if (!expression || depth > 5) return { kind: 'origin not resolved', detail: '' };
  if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isNonNullExpression(expression)) {
    return traceOrigin(checker, expression.expression, depth + 1, seen);
  }
  if (ts.isNewExpression(expression)) {
    const name = expression.expression.getText();
    if (name.endsWith('Worksheet')) {
      const args = expression.arguments || [];
      if (args.length && /workbook|owner|transaction/i.test(args[0].getText())) {
        return { kind: 'Worksheet construction with owner argument', detail: expression.getText() };
      }
      return { kind: 'standalone Worksheet construction candidate', detail: expression.getText() };
    }
    return { kind: `constructed ${name}`, detail: expression.getText() };
  }
  if (ts.isCallExpression(expression)) {
    const callee = expression.expression;
    const member = ts.isPropertyAccessExpression(callee) ? callee.name.text : '';
    if (member === 'getSheet' || member === 'addSheet' || member === 'activeSheet') {
      return { kind: `workbook ${member} result`, detail: expression.getText() };
    }
    if (member === 'createWorksheet') {
      return { kind: 'workbook createWorksheet result', detail: expression.getText() };
    }
    if (member) return { kind: `${member} call result`, detail: expression.getText() };
    return { kind: 'function call result', detail: expression.getText() };
  }
  if (ts.isIdentifier(expression) || ts.isPropertyAccessExpression(expression)) {
    let symbol;
    try { symbol = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(expression) ? expression.name : expression); } catch {}
    if (symbol && !seen.has(symbol)) {
      seen.add(symbol);
      const declarations = symbol.getDeclarations() || [];
      for (const declaration of declarations) {
        if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
          const nested = traceOrigin(checker, declaration.initializer, depth + 1, seen);
          return {
            kind: `${nested.kind} via ${declaredKind(declaration)}`,
            detail: `${expression.getText()} <- ${declaration.initializer.getText()}`,
          };
        }
        if (ts.isBindingElement(declaration)) {
          const binding = declaration.parent;
          const variable = ts.isArrayBindingPattern(binding) || ts.isObjectBindingPattern(binding)
            ? binding.parent : null;
          if (variable && ts.isVariableDeclaration(variable) && variable.initializer) {
            const nested = traceOrigin(checker, variable.initializer, depth + 1, seen);
            return {
              kind: `${nested.kind} via destructured local value`,
              detail: `${expression.getText()} <- ${variable.initializer.getText()}`,
            };
          }
        }
        if (ts.isPropertyDeclaration(declaration) && declaration.initializer) {
          return traceOrigin(checker, declaration.initializer, depth + 1, seen);
        }
        if (ts.isParameter(declaration)) {
          return { kind: `injected ${declaredKind(declaration)}`, detail: declaration.getText() };
        }
        if (ts.isPropertyDeclaration(declaration) || ts.isPropertySignature(declaration)) {
          return { kind: `owner property ${declaration.name?.getText() || ''}`, detail: declaration.getText() };
        }
      }
    }
    return { kind: 'symbol origin not resolved', detail: expression.getText() };
  }
  if (ts.isThis(expression)) {
    return { kind: `instance receiver (${typeText(checker, expression)})`, detail: expression.getText() };
  }
  return { kind: 'expression origin not resolved', detail: expression.getText() };
}

function findNodeForRow(sourceFile, row) {
  const targetLine = Number(row.line) - 1;
  const starts = sourceFile.getLineStarts();
  const start = starts[targetLine];
  const end = starts[targetLine + 1] ?? sourceFile.end;
  if (start === undefined) return null;
  const candidates = [];
  function visit(node) {
    if (node.getStart(sourceFile) < start || node.getStart(sourceFile) >= end) {
      if (node.pos >= end || node.end <= start) return;
    }
    if (row.family === 'raw_type') {
      if (ts.isIdentifier(node) && node.text === 'Worksheet') candidates.push(node);
    } else if (row.family === 'escape' && row.symbol === 'eventBus') {
      if (ts.isIdentifier(node) && node.text === 'eventBus') candidates.push(node);
      if (ts.isPropertyAccessExpression(node) && node.name.text === 'eventBus') candidates.push(node);
    } else if (ts.isCallExpression(node)) {
      if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === row.symbol) {
        candidates.push(node);
      } else if (ts.isElementAccessExpression(node.expression) && node.expression.argumentExpression?.getText().replaceAll(/["']/g, '') === row.symbol) {
        candidates.push(node);
      }
    } else if (ts.isPropertyAccessExpression(node) && node.name.text === row.symbol) {
      if (row.family === 'workbook' || row.family === 'escape') candidates.push(node);
    } else if (ts.isElementAccessExpression(node) && node.argumentExpression?.getText().replaceAll(/["']/g, '') === row.symbol) {
      candidates.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  if (!candidates.length) return null;
  // Prefer the exact, smallest expression associated with the candidate API.
  return candidates.sort((a, b) => (a.end - a.getStart(sourceFile)) - (b.end - b.getStart(sourceFile)))[0];
}

function classifyRow(row, node, checker, sourceFile, occurrenceOrdinal) {
  const rel = row.path;
  const owner = fileOwner(path.resolve(ROOT, rel));
  const test = isTestPath(rel);
  let receiver = null;
  let receiverExpression = '';
  let memberOwner = 'unresolved';
  let receiverType = 'unresolved';
  let origin = { kind: 'not applicable', detail: '' };
  let syntacticForm = 'direct source candidate';
  if (row.family === 'raw_type') {
    receiverType = node ? typeText(checker, node) : 'Worksheet textual reference; syntax not resolved';
    syntacticForm = node ? (ts.isTypeReferenceNode(node.parent) ? 'type reference' : ts.SyntaxKind[node.parent.kind]) : 'template or unresolved syntax';
    const symbol = node ? checker.getSymbolAtLocation(node) : null;
    const declarationFile = symbol?.declarations?.[0]?.getSourceFile()?.fileName || '';
    memberOwner = declarationFile ? path.relative(ROOT, declarationFile).split(path.sep).join('/') : 'unresolved';
    if (node) {
      let declaration = node;
      while (declaration.parent && !ts.isVariableDeclaration(declaration.parent) && !ts.isParameter(declaration.parent) && !ts.isPropertyDeclaration(declaration.parent) && !ts.isImportSpecifier(declaration.parent)) {
        declaration = declaration.parent;
      }
      if (declaration.parent && ts.isVariableDeclaration(declaration.parent) && declaration.parent.initializer) {
        origin = traceOrigin(checker, declaration.parent.initializer, 0);
      } else if (declaration.parent && ts.isParameter(declaration.parent)) {
        origin = { kind: 'injected Worksheet parameter', detail: declaration.parent.getText() };
      } else if (declaration.parent && ts.isPropertyDeclaration(declaration.parent) && declaration.parent.initializer) {
        origin = traceOrigin(checker, declaration.parent.initializer, 0);
      } else if (declaration.parent && ts.isImportSpecifier(declaration.parent)) {
        origin = { kind: 'imported Worksheet API type', detail: declaration.parent.getText() };
      }
    }
  } else if (row.family === 'workbook' || row.family === 'read' || row.family === 'mutator' || row.family === 'escape') {
    if (row.family === 'escape' && row.symbol === 'eventBus' && node && ts.isIdentifier(node)) {
      receiver = node;
      syntacticForm = 'event bus reference';
    } else if (node && ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isPropertyAccessExpression(callee)) receiver = callee.expression;
      else if (ts.isElementAccessExpression(callee)) receiver = callee.expression;
      syntacticForm = ts.isElementAccessExpression(callee) ? 'computed member call' : 'direct member call';
    } else if (node && ts.isPropertyAccessExpression(node)) {
      receiver = node.expression;
      syntacticForm = 'member/property access';
    }
    receiverExpression = receiver?.getText() || '';
    receiverType = typeText(checker, receiver || node);
    const member = row.family === 'escape' && row.symbol === 'eventBus' ? 'eventBus' : row.symbol;
    memberOwner = row.family === 'escape' && row.symbol === 'eventBus'
      ? receiverType
      : methodOwner(checker, receiver, member);
    origin = traceOrigin(checker, receiver || node, 0);
  }

  const combined = `${receiverType} ${memberOwner}`;
  const hasWorksheet = /\bWorksheet\b|\bIWorksheet\b/.test(combined) ||
    /workbook (?:getSheet|addSheet|createWorksheet) result/.test(origin.kind);
  const hasWorkbook = /\bWorkbook\b|WorkbookCalculation/.test(combined) ||
    /owner property workbook|constructed Workbook/.test(origin.kind);
  const unresolvedType = /\bany\b|unresolved|unknown/.test(combined);
  const workbookLikeName = /(?:^|\.)(?:workbook|wb|currentWorkbook|activeWorkbook)$/i.test(receiverExpression);
  const worksheetLikeName = /(?:^|\.)(?:worksheet|worksheetRef|sheet|currentSheet|activeSheet|activeSheetRef|sheetReadonly|anySheet|ws)$/i.test(receiverExpression);
  let relevance = 'conditional';
  let disposition = 'owner-aware migration required; preserve standalone Worksheet behavior';
  let justification = 'Static type identifies a source/API dependency, but the runtime workbook owner is not encoded in the type.';
  let reviewStatus = 'ownership-dependent';

  const genericFindShape = ['find', 'findAll'].includes(row.symbol) &&
    (receiverExpression === 'wrapper' || /\.find(?:All)?\s*\(/.test(row.source_line) &&
      /\(\s*['"`][^)]*['"`]/.test(row.source_line) ||
      /\.find(?:All)?\s*\([^)]*=>/.test(row.source_line) ||
      row.source_line.includes('=>') ||
      node && ts.isCallExpression(node) && node.arguments.length > 0 &&
        (ts.isArrowFunction(node.arguments[0]) || ts.isFunctionExpression(node.arguments[0])));
  const historicalSnippet = /(?:before|after)\s*:\s*['"`]/.test(row.source_line) &&
    /\bworksheet\.(?:getCell|setCellValue)\b/.test(row.source_line);
  const templateOwner = !node && /\.(html|vue|svelte)$/.test(rel) &&
    /\b(?:new\s+Workbook\s*\(|Workbook\s*\()/.test(
      fs.readFileSync(path.resolve(ROOT, rel), 'utf8'),
    );
  if (!receiverExpression && !node && row.family !== 'raw_type') {
    const escapedSymbol = row.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const receiverMatch = row.source_line.match(new RegExp(`([\\w$.[\\]()]+)\\s*\\??\\.\\s*${escapedSymbol}\\b`));
    if (receiverMatch) receiverExpression = receiverMatch[1];
  }
  const knownSfcOwner = /(?:CyberSheet\.svelte|useCyberSheet\.ts)$/.test(rel) &&
    /^(?:state\.worksheet|worksheet\.value)$/.test(receiverExpression);
  const knownSdkEscape = /\._ws$/.test(receiverExpression) && test;
  if (historicalSnippet) {
    relevance = 'not-relevant';
    disposition = 'no runtime migration; retain the quoted before/after examples as migration documentation';
    justification = 'This match is a string literal in a migration guide, not an executable Worksheet receiver.';
    reviewStatus = 'resolved-static-syntax';
  }
  if (!historicalSnippet && row.family === 'read' && ['find', 'findAll'].includes(row.symbol) && (!hasWorksheet || genericFindShape)) {
    relevance = unresolvedType && !genericFindShape ? 'manual-review' : 'not-relevant';
    disposition = unresolvedType && !genericFindShape ? 'manual receiver review' : 'no workbook migration; unrelated receiver query';
    justification = unresolvedType && !genericFindShape
      ? 'Generic query name has no resolved Worksheet receiver; confirm the receiver type before excluding.'
      : `Receiver ${receiverExpression || '<template expression>'} uses generic query syntax (${receiverType}/${memberOwner}); this is not a Worksheet query API call.`;
    reviewStatus = unresolvedType && !genericFindShape ? 'open' : 'resolved-static-type';
  } else if (historicalSnippet) {
    // The quoted migration example is intentionally excluded from API migration.
  } else if (templateOwner && row.family !== 'raw_type') {
    relevance = 'relevant';
    disposition = row.family === 'workbook'
      ? 'migrate template workbook lookup/lifecycle operations to owner-backed views and TransactionWorkbook'
      : row.family === 'mutator'
        ? 'migrate template writes to TransactionSheet; template workbook ownership is explicit in its Workbook setup'
        : 'migrate template reads to owner-backed WorkbookSheetView and detached values';
    justification = `The HTML/SFC script is an executable sample with a local Workbook construction; ${row.symbol} is a workbook-owned API use.`;
    reviewStatus = 'resolved-source-context';
  } else if (row.family === 'workbook') {
    if (['addSheet', 'deleteSheet', 'renameSheet'].includes(row.symbol) ||
        (row.symbol === 'activeSheetName' && /activeSheetName\s*=/.test(row.source_line))) {
      relevance = 'relevant';
      disposition = 'route workbook directory/identity mutation through TransactionWorkbook';
      justification = 'Workbook lifecycle/active-sheet state participates in the atomic workbook owner and stable sheet identity.';
    } else if (hasWorkbook || /Workbook/.test(receiverType) || workbookLikeName) {
      relevance = 'relevant';
      disposition = 'read through owner-backed WorkbookSheetView or acquire TransactionSheet inside transact';
      justification = 'This access acquires or selects a workbook-owned sheet; consumers must not retain a mutable Worksheet.';
    } else {
      relevance = unresolvedType ? 'manual-review' : 'conditional';
      disposition = 'resolve receiver ownership; use owner-backed view/transaction capability for workbook-owned values';
      justification = 'The textual workbook API candidate does not itself prove the receiver is the workbook owner.';
      reviewStatus = 'open';
    }
    if (reviewStatus !== 'open') reviewStatus = 'resolved-contract';
  } else if (row.family === 'mutator') {
    const declaredMutator = KNOWN_WORKSHEET_MUTATORS.has(row.symbol);
    const knownWorksheetOrigin = /workbook (?:getSheet|addSheet|createWorksheet) result|standalone Worksheet construction/.test(origin.kind);
    const knownTemplateOwner = templateOwner && /^(?:wb|workbook|sheet|activeSheet)$/.test(receiverExpression);
    const knownSfcOwner = /(?:CyberSheet\.svelte|useCyberSheet\.ts)$/.test(rel) &&
      /^(?:state\.worksheet|worksheet\.value)$/.test(receiverExpression);
    const knownSdkEscape = /\._ws$/.test(receiverExpression) && test;
    const knownCanvasSheet = rel.endsWith('packages/renderer-canvas/src/CanvasRenderer.ts') && /this\.sheet/.test(receiverExpression);
    if ((memberOwner === 'unresolved' || unresolvedType) && !knownWorksheetOrigin && !worksheetLikeName && !workbookLikeName && !knownTemplateOwner && !knownSfcOwner && !knownSdkEscape && !knownCanvasSheet) {
      relevance = 'manual-review';
      disposition = 'resolve receiver declaration and ownership before implementation';
      justification = 'The candidate receiver is any/unresolved or has no statically resolved member declaration.';
      reviewStatus = 'open';
    } else if (/Patch|Recorder|Builder|Operation|Command/.test(memberOwner) && !hasWorksheet) {
      relevance = 'not-relevant';
      disposition = 'keep as patch/command representation; ensure application routes through the journal';
      justification = `Resolved method owner ${memberOwner} represents patch/command data rather than a Worksheet mutation receiver.`;
      reviewStatus = 'resolved-static-type';
    } else if (hasWorksheet || hasWorkbook || worksheetLikeName || workbookLikeName || knownSfcOwner || knownSdkEscape || knownCanvasSheet || /SpreadsheetSDK|WorkerEngineProxy|WorkerHost|Renderer/.test(combined)) {
      relevance = 'relevant';
      disposition = declaredMutator
        ? 'use TransactionSheet for eligible operations; reject unsupported workbook mutations before write'
        : 'adapt API operation to the authoritative workbook transaction journal';
      justification = `Resolved receiver/member owner ${receiverType}/${memberOwner} is a Worksheet or a workbook mutation adapter.`;
      reviewStatus = 'resolved-contract';
    } else {
      relevance = 'not-relevant';
      disposition = 'no workbook migration; preserve the unrelated receiver API';
      justification = `Resolved receiver/member owner ${receiverType}/${memberOwner} is outside the workbook mutation surface.`;
      reviewStatus = 'resolved-static-type';
    }
  } else if (row.family === 'read') {
    const knownWorksheetOrigin = /workbook (?:getSheet|addSheet|createWorksheet) result|standalone Worksheet construction/.test(origin.kind);
    const knownCanvasSheet = rel.endsWith('packages/renderer-canvas/src/CanvasRenderer.ts') && /this\.sheet/.test(receiverExpression);
    if (unresolvedType && !knownWorksheetOrigin && !worksheetLikeName && !knownSfcOwner && !knownSdkEscape && !knownCanvasSheet) {
      relevance = 'manual-review';
      disposition = 'resolve receiver type; if workbook-owned, return immutable/detached data through WorkbookSheetView';
      justification = 'The receiver type is any/unresolved, so mutability and workbook ownership cannot be established statically.';
      reviewStatus = 'open';
    } else if (hasWorksheet || hasWorkbook || worksheetLikeName || workbookLikeName || knownSfcOwner || knownCanvasSheet || /SpreadsheetSDK|WorkerEngineProxy|WorkerHost/.test(combined)) {
      relevance = 'relevant';
      disposition = 'return owner-resolved read data; detach or freeze nested values and iterators';
      justification = `Resolved receiver/member owner ${receiverType}/${memberOwner} lies on a workbook/worksheet read boundary.`;
      reviewStatus = 'resolved-contract';
    } else {
      relevance = 'not-relevant';
      disposition = 'no workbook migration; preserve the unrelated query API';
      justification = `Resolved receiver/member owner ${receiverType}/${memberOwner} is outside the Worksheet read boundary.`;
      reviewStatus = 'resolved-static-type';
    }
  } else if (row.family === 'escape') {
    if (row.symbol === 'eventBus' && /\b(private|readonly)?\s*eventBus\??\s*[:=]/.test(row.source_line)) {
      relevance = 'conditional';
      disposition = 'keep internal event plumbing private; a workbook-owned event facade may subscribe but cannot emit or register bridges';
      justification = 'This line declares an injected or private EventBus reference; it is not itself a returned mutable workbook handle.';
      reviewStatus = 'resolved-contract';
    } else if (unresolvedType && !(hasWorkbook || hasWorksheet || workbookLikeName || worksheetLikeName ||
        ['getPivotRegistry', 'getPivotSnapshotStore', 'getPivotRecomputeEngine', 'getStyleCache', 'getDrawingLayer'].includes(row.symbol))) {
      relevance = 'manual-review';
      disposition = 'resolve owner and returned-object mutability before implementation';
      justification = 'Static resolution cannot establish which owner/service is exposed.';
      reviewStatus = 'open';
    } else if (row.symbol === 'eventBus') {
      relevance = hasWorkbook || /Workbook/.test(receiverType) ? 'relevant' : 'conditional';
      disposition = 'expose a read-only subscription facade; keep emit/bridge registration owner-private';
      justification = 'EventBus can publish or alter event bridges and must not bypass the workbook commit ordering.';
      reviewStatus = hasWorkbook ? 'resolved-contract' : 'ownership-dependent';
    } else if (hasWorksheet || hasWorkbook || workbookLikeName || worksheetLikeName ||
        ['getPivotRegistry', 'getPivotSnapshotStore', 'getPivotRecomputeEngine', 'getStyleCache', 'getDrawingLayer'].includes(row.symbol)) {
      relevance = 'relevant';
      disposition = 'replace with immutable/detached snapshot or owner-private capability';
      justification = `Resolved service getter ${row.symbol} exposes state or an object whose mutation can bypass the owner journal.`;
      reviewStatus = 'resolved-contract';
    } else {
      relevance = 'not-relevant';
      disposition = 'no workbook escape; preserve service behavior outside the workbook owner';
      justification = `Resolved receiver/member owner ${receiverType}/${memberOwner} is outside the workbook escape surface.`;
      reviewStatus = 'resolved-static-type';
    }
  } else if (row.family === 'raw_type') {
    if (!node && /Worksheet textual reference/.test(receiverType) && /\.(vue|svelte|html)$/.test(rel)) {
      relevance = 'relevant';
      disposition = 'replace workbook-owned component props with WorkbookSheetView or TransactionSheet; retain standalone-only props only where explicitly documented';
      justification = 'Template/framework source declares or imports the raw Worksheet type at an adapter boundary; its owner must be explicit in the replacement prop contract.';
      reviewStatus = 'resolved-contract';
    } else if (rel === 'scripts/refactor-formula-engine.js') {
      relevance = 'not-relevant';
      disposition = 'no runtime API migration; preserve the source transformation tool and verify its output separately when implementation is authorized';
      justification = 'This is a refactoring script’s textual type annotation candidate, not a compiled consumer or runtime worksheet owner.';
      reviewStatus = 'resolved-static-type';
    } else if (unresolvedType || !node) {
      relevance = 'manual-review';
      disposition = 'inspect import/template or unresolved type use; retain only explicit standalone API dependencies';
      justification = 'The textual type candidate could not be resolved to a TypeScript symbol.';
      reviewStatus = 'open';
    } else if (test && /standalone Worksheet construction candidate/.test(origin.kind)) {
      relevance = 'not-relevant';
      disposition = 'retain as standalone Worksheet test/type use';
      justification = 'The type use is in a test and its local instance is constructed without workbook ownership.';
      reviewStatus = 'resolved-static-origin';
    } else if (/Worksheet textual reference/.test(receiverType) && /\.(vue|svelte|html)$/.test(rel)) {
      relevance = 'relevant';
      disposition = 'replace workbook-owned component props with WorkbookSheetView or TransactionSheet; retain standalone-only props only where explicitly documented';
      justification = 'Template/framework source declares or imports the raw Worksheet type at an adapter boundary; its owner must be explicit in the replacement prop contract.';
      reviewStatus = 'resolved-contract';
    } else if (hasWorksheet || /Worksheet/.test(receiverType)) {
      relevance = 'conditional';
      disposition = 'split the consumer boundary into standalone Worksheet and workbook view/transaction types';
      justification = `Raw Worksheet type is resolved from ${memberOwner}; type alone does not distinguish adopted from standalone ownership.`;
      reviewStatus = 'ownership-dependent';
    } else {
      relevance = 'not-relevant';
      disposition = 'no Worksheet API migration; retain the unrelated identifier/type use';
      justification = `Resolved identifier is not a Worksheet type declaration/reference (${receiverType}).`;
      reviewStatus = 'resolved-static-type';
    }
  }

  if (test && relevance === 'relevant' && !/standalone/.test(origin.kind) && !/workbook/.test(origin.kind)) {
    reviewStatus = 'ownership-dependent';
    relevance = 'conditional';
    justification += ' Test fixtures require fixture-level owner confirmation; test paths are not automatically migrated.';
  }
  if (row.family === 'mutator' && historicalSnippet) {
    relevance = 'not-relevant';
    disposition = 'no runtime mutation; preserve the quoted API migration examples';
    justification = 'The regex hit is inside a string-valued before/after field, not an executed mutation call.';
    reviewStatus = 'resolved-static-syntax';
  }
  if (row.family === 'read' && genericFindShape) {
    relevance = 'not-relevant';
    disposition = 'no workbook migration; query belongs to a collection or test-wrapper receiver';
    justification = `The source uses generic predicate/selector syntax on ${receiverExpression || 'a template receiver'}, rather than Worksheet SearchOptions.`;
    reviewStatus = 'resolved-static-syntax';
  }
  if (row.family === 'escape' && /getPivotRegistry|getPivotSnapshotStore|getPivotRecomputeEngine|getStyleCache|getDrawingLayer/.test(row.symbol) &&
      /^(?:workbook|this\.workbook)$/.test(receiverExpression)) {
    relevance = 'relevant';
    disposition = 'keep service private to workbook-owned formula/engine code; expose no mutable getter to external consumers';
    justification = 'The service getter is invoked on the formula context’s Workbook owner and must remain behind the owner boundary.';
    reviewStatus = 'resolved-source-context';
  }

  const finalReviewStatus = reviewStatus === 'ownership-dependent'
    ? 'resolved-owner-polymorphic'
    : reviewStatus;
  const reviewBasis = {
    'resolved-owner-polymorphic': 'explicit standalone/workbook dual-path contract',
    'resolved-contract': 'resolved receiver plus accepted ownership contract',
    'resolved-source-context': 'source setup and receiver context',
    'resolved-static-origin': 'resolved local initializer/origin',
    'resolved-static-syntax': 'source syntax distinguishes API use from text/query false positive',
    'resolved-static-type': 'TypeScript receiver and member declaration',
    open: 'unresolved receiver or ownership; review required',
  }[finalReviewStatus] || 'review rule';

  return {
    candidate_key: crypto.createHash('sha256').update([
      row.family, row.path, row.symbol, row.source_line.replace(/\s+/g, ' ').trim(), occurrenceOrdinal,
    ].join('\0')).digest('hex').slice(0, 20),
    occurrence_ordinal: occurrenceOrdinal,
    family: row.family,
    path: row.path,
    line: row.line,
    symbol: row.symbol,
    reviewed_relevance: relevance,
    receiver_expression: receiverExpression,
    receiver_static_type: clip(receiverType, 320),
    member_owner_or_declaration: memberOwner,
    ownership_evidence: origin.kind,
    ownership_detail: clip(origin.detail, 320),
    syntactic_form: syntacticForm,
    migration_disposition: disposition,
    responsible_component: owner,
    justification,
    review_basis: reviewBasis,
    review_status: finalReviewStatus,
  };
}

function compactType(checker, node) {
  return typeText(checker, node).replace(/\s+/g, ' ').slice(0, 240);
}

function ownerType(type) {
  return /^(?:Readonly\s*<\s*)?(?:(?:import\([^)]*\)\.)?(?:Worksheet|IWorksheet|Workbook|WorkbookSheetView|TransactionSheet))(?:\s*>|\s*(?:\||&|$))/.test(type.trim());
}

function worksheetCollectionType(type) {
  const text = type.trim();
  const owner = '(?:import\\([^)]*\\)\\.)?\\b(?:Worksheet|IWorksheet|WorkbookSheetView|TransactionSheet)\\b';
  return new RegExp(`^(?:(?:Readonly)?(?:Array|Map|Set|ReadonlyMap|ReadonlySet|Iterable|Iterator)<[^>]*${owner}[^>]*>|${owner}\\[\\])(?:\\s*(?:\\||&|$))`).test(text);
}

function rootReturnedGetter(expression) {
  let node = expression;
  while (node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const member = node.expression.name.text;
      if (['getCell', 'getDrawingLayer', 'getStyleCache', 'getPivotRegistry',
        'getPivotSnapshotStore', 'getHiddenRows', 'getHiddenCols', 'getComments',
        'getImages', 'getCellComponent', 'getIcon'].includes(member)) {
        return { call: node, member, owner: node.expression.expression };
      }
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      node = node.expression;
    } else if (ts.isCallExpression(node)) {
      node = node.expression;
    } else {
      break;
    }
  }
  return null;
}

function returnedGetterThroughAlias(checker, expression, seen = new Set(), depth = 0) {
  if (!expression || depth > 5) return null;
  const direct = rootReturnedGetter(expression);
  if (direct) return direct;
  if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
    const nested = returnedGetterThroughAlias(checker, expression.expression, seen, depth + 1);
    if (nested) return nested;
  }
  if (!ts.isIdentifier(expression) && !ts.isPropertyAccessExpression(expression)) return null;
  let symbol;
  try {
    symbol = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(expression) ? expression.name : expression);
  } catch {}
  if (!symbol || seen.has(symbol)) return null;
  seen.add(symbol);
  for (const declaration of symbol.getDeclarations() || []) {
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      return returnedGetterThroughAlias(checker, declaration.initializer, seen, depth + 1);
    }
  }
  return null;
}

function buildFlowRows(sourceFiles, checker) {
  const flows = new Map();
  const targetRoot = /^(packages|examples|scripts|test-projects)\//;
  const sourceExtensions = /\.(ts|tsx|js|jsx)$/;
  const add = (kind, sourceFile, node, expression, detail = '') => {
    const rel = path.relative(ROOT, sourceFile.fileName).split(path.sep).join('/');
    if (!targetRoot.test(rel) || !sourceExtensions.test(rel)) return;
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const sourceLine = sourceFile.text.split(/\r?\n/)[line] || '';
    const staticType = compactType(checker, expression || node);
    const ownerKnown = ownerType(staticType);
    const origin = traceOrigin(checker, expression || node, 0);
    const unresolved = /\bany\b|unresolved|unknown/.test(staticType) && !ownerKnown &&
      kind !== 'callback-captures-mutation';
    const rationale = {
      'workbook-or-sheet-handle': 'Preserve owner identity through aliases; reads use owner-backed views and writes require a live transaction capability.',
      'destructured-api-method': 'Do not expose a detached mutator function; bind it to a live capability and recheck transaction identity on every call.',
      'computed-api-access': 'Resolve only explicit allowlisted members; reject unknown or dynamic mutation keys before any state write.',
      'private-workbook-store-access': 'Directly indexing the workbook sheet store bypasses owner-backed lookup and can expose its mutable Map.',
      'owner-private-sheet-store-access': 'Workbook internals may use the private sheet store, but public return paths must not expose raw Worksheet instances or the mutable collection.',
      'worksheet-collection-flow': 'A collection containing raw Worksheet objects can preserve mutable aliases across owner boundaries even when each element is not directly returned at the current site.',
      'worksheet-passed-to-call': 'Pass an owner-backed view or scoped TransactionSheet; track the boundary and revoke transaction capabilities on completion.',
      'callback-captures-mutation': 'A callback capturing a transaction capability must fail after commit/abort; asynchronous continuation rejection must be observed.',
      'indirect-returned-object-write': 'Returned cell/service objects must be immutable or detached; route changes through explicit journaled mutators.',
      'returned-service-chain-mutation': 'A mutable service returned from a worksheet call cannot escape the owner; use a private capability or detached snapshot.',
    }[kind];
    const disposition = {
      'workbook-or-sheet-handle': 'classify as workbook-owned, standalone, or owner-polymorphic at the API boundary; never retain a raw owned Worksheet',
      'destructured-api-method': 'replace detached method extraction with a capability-bound facade; preserve standalone-only methods explicitly',
      'computed-api-access': 'migrate to named typed methods; dynamic owner mutations reject unless the key is a recognized transaction operation',
      'private-workbook-store-access': 'replace direct store indexing with WorkbookSheetView lookup; keep the mutable sheet directory private to WorkbookOwner',
      'owner-private-sheet-store-access': 'keep storage private to WorkbookOwner; public lookup methods return owner-backed views and transaction handles only',
      'worksheet-collection-flow': 'keep raw Worksheet collections private to owner internals; return owner-backed views or transaction-scoped collections across public boundaries',
      'worksheet-passed-to-call': 'migrate receiving API to WorkbookSheetView/TransactionSheet or a documented standalone Worksheet adapter',
      'callback-captures-mutation': 'require transaction-bound capability validation at callback invocation and revoke after transaction terminal state',
      'indirect-returned-object-write': 'freeze/detach query results and use the corresponding explicit mutation operation',
      'returned-service-chain-mutation': 'replace mutable returned service with an owner-private service or immutable query surface',
    }[kind];
    const owner = fileOwner(path.resolve(ROOT, rel));
    const key = crypto.createHash('sha256').update([
      kind, rel, String(line + 1), node.getText(sourceFile).replace(/\s+/g, ' ').trim(),
    ].join('\0')).digest('hex').slice(0, 20);
    flows.set(key, {
      flow_key: key,
      flow_kind: kind,
      path: rel,
      line: line + 1,
      expression: clip(expression?.getText(sourceFile) || '', 200),
      static_type: staticType,
      ownership_evidence: origin.kind,
      detail: clip(detail, 300),
      migration_disposition: disposition,
      responsible_component: owner,
      rationale,
      review_status: unresolved ? 'manual-review-required' : 'resolved-contract-disposition',
      source_excerpt: clip(sourceLine.trim(), 300),
      excerpt_truncated: sourceLine.trim().length > 300,
    });
  };

  for (const sourceFile of sourceFiles) {
    const rel = path.relative(ROOT, sourceFile.fileName).split(path.sep).join('/');
    if (!targetRoot.test(rel) || !sourceExtensions.test(rel)) continue;
    function visit(node) {
      if (ts.isVariableDeclaration(node) && node.initializer) {
        const valueType = compactType(checker, node.initializer);
        if (ownerType(valueType)) {
          const kind = ts.isCallExpression(node.initializer) && ts.isPropertyAccessExpression(node.initializer.expression) &&
            ['getSheet', 'addSheet', 'activeSheet', 'createWorksheet'].includes(node.initializer.expression.name.text)
            ? 'workbook-or-sheet-handle'
            : 'workbook-or-sheet-handle';
          add(kind, sourceFile, node, node.initializer, `binding=${node.name.getText(sourceFile)}`);
        }
        if (worksheetCollectionType(valueType)) {
          add('worksheet-collection-flow', sourceFile, node, node.initializer,
            `binding=${node.name.getText(sourceFile)}; collection-type=${valueType}`);
        }
        if (ts.isObjectBindingPattern(node.name) && ownerType(valueType)) {
          for (const binding of node.name.elements) {
            const name = (binding.propertyName || binding.name).getText(sourceFile);
            if (KNOWN_WORKSHEET_MUTATORS.has(name) || KNOWN_WORKSHEET_READS.has(name) ||
                RELEVANT_WORKBOOK_MEMBERS.has(name) || KNOWN_ESCAPE_MEMBERS.has(name)) {
              add('destructured-api-method', sourceFile, binding, node.initializer, `member=${name}`);
            }
          }
        }
      }

      if (ts.isElementAccessExpression(node)) {
        const receiverType = compactType(checker, node.expression);
        const argument = node.argumentExpression;
        const key = argument?.getText(sourceFile).replaceAll(/["'`]/g, '') || '';
        const literalKey = argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument));
        if (ownerType(receiverType) && (!literalKey || KNOWN_WORKSHEET_MUTATORS.has(key) ||
            KNOWN_WORKSHEET_READS.has(key) || RELEVANT_WORKBOOK_MEMBERS.has(key) || KNOWN_ESCAPE_MEMBERS.has(key))) {
          add('computed-api-access', sourceFile, node, node.expression, `member=${key || '<dynamic>'}`);
        } else if (worksheetCollectionType(receiverType) &&
            ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'sheets') {
          const ownerInternal = ts.isThis(node.expression.expression) && rel === 'packages/core/src/workbook.ts';
          add(ownerInternal ? 'owner-private-sheet-store-access' : 'private-workbook-store-access', sourceFile, node, node.expression,
            `direct sheet-store indexing with key=${key || '<dynamic>'}`);
        }
      }

      if (ts.isPropertyAccessExpression(node) && node.name.text === 'sheets' &&
          worksheetCollectionType(compactType(checker, node)) &&
          !(ts.isElementAccessExpression(node.parent) && node.parent.expression === node)) {
        const ownerInternal = ts.isThis(node.expression) && rel === 'packages/core/src/workbook.ts';
        add(ownerInternal ? 'owner-private-sheet-store-access' : 'private-workbook-store-access', sourceFile, node, node,
          'direct access to workbook sheet collection');
      }

      if (ts.isCallExpression(node)) {
        for (const argument of node.arguments) {
          const argumentType = compactType(checker, argument);
          if (ownerType(argumentType)) {
            add('worksheet-passed-to-call', sourceFile, argument, argument, `callee=${node.expression.getText(sourceFile)}`);
          }
          if (worksheetCollectionType(argumentType) && !ts.isArrayLiteralExpression(argument)) {
            add('worksheet-collection-flow', sourceFile, argument, argument,
              `collection passed to=${node.expression.getText(sourceFile)}; type=${argumentType}`);
          }
          if (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) {
            let hasWorksheetMutation = false;
            function inspectCallback(child) {
              if (ts.isCallExpression(child) && ts.isPropertyAccessExpression(child.expression) &&
                  KNOWN_WORKSHEET_MUTATORS.has(child.expression.name.text) &&
                  ownerType(compactType(checker, child.expression.expression))) {
                hasWorksheetMutation = true;
              }
              ts.forEachChild(child, inspectCallback);
            }
            inspectCallback(argument.body);
            if (hasWorksheetMutation) {
              add('callback-captures-mutation', sourceFile, argument, argument, `registered-by=${node.expression.getText(sourceFile)}`);
            }
          }
          const returned = rootReturnedGetter(argument);
          const assertionOrLog = /^(?:expect|console\.log|console\.warn|console\.error)$/.test(node.expression.getText(sourceFile));
          const scalarResult = /^(?:string|number|boolean|null|undefined|void)\b/.test(argumentType);
          if (returned && ownerType(compactType(checker, returned.owner)) && !scalarResult && !assertionOrLog) {
            add('returned-service-chain-mutation', sourceFile, argument, returned.owner, `getter=${returned.member}; passed-to=${node.expression.getText(sourceFile)}`);
          }
        }
        if (ts.isPropertyAccessExpression(node.expression) && ts.isCallExpression(node.expression.expression)) {
          const returned = rootReturnedGetter(node.expression.expression);
          if (returned && returned.member !== 'getCell' && ownerType(compactType(checker, returned.owner))) {
            add('returned-service-chain-mutation', sourceFile, node, returned.owner, `getter=${returned.member}; method=${node.expression.name.text}`);
          }
        } else if (ts.isPropertyAccessExpression(node.expression)) {
          const returned = returnedGetterThroughAlias(checker, node.expression.expression);
          if (returned && returned.member !== 'getCell' && ownerType(compactType(checker, returned.owner))) {
            add('returned-service-chain-mutation', sourceFile, node, returned.owner, `getter=${returned.member}; method=${node.expression.name.text}; via local alias`);
          }
        }
      }

      if (ts.isBinaryExpression(node) && (ts.isPropertyAccessExpression(node.left) || ts.isElementAccessExpression(node.left)) &&
          node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
          node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
        const returned = rootReturnedGetter(node.left) || returnedGetterThroughAlias(checker, node.left);
        if (returned && ownerType(compactType(checker, returned.owner))) {
          add('indirect-returned-object-write', sourceFile, node, returned.owner, `getter=${returned.member}; target=${node.left.getText(sourceFile)}`);
        }
      }
      if (ts.isReturnStatement(node)) {
        const returned = returnedGetterThroughAlias(checker, node.expression);
        const resultType = compactType(checker, node.expression);
        const scalarResult = /^(?:string|number|boolean|null|undefined|void)\b/.test(resultType);
        if (returned && ownerType(compactType(checker, returned.owner)) && !scalarResult) {
          add('returned-service-chain-mutation', sourceFile, node, returned.owner, `getter=${returned.member}; object returned from containing function`);
        }
        if (worksheetCollectionType(resultType)) {
          add('worksheet-collection-flow', sourceFile, node, node.expression,
            `collection returned from containing function; type=${resultType}`);
        }
      }
      if ((ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) && node.type) {
        const resultType = compactType(checker, node.type);
        if (worksheetCollectionType(resultType)) {
          add('worksheet-collection-flow', sourceFile, node, node,
            `function returns worksheet collection; type=${resultType}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }
  return [...flows.values()].sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.flow_kind.localeCompare(b.flow_kind));
}

function collectTypeScriptInputs() {
  const suffixes = new Set(['.ts', '.tsx', '.js', '.jsx']);
  const ignored = new Set(['node_modules', 'dist', 'coverage', '.git']);
  const files = [];
  for (const root of ['packages', 'examples', 'scripts', 'test-projects']) {
    const absoluteRoot = path.join(ROOT, root);
    if (!fs.existsSync(absoluteRoot)) continue;
    function walk(directory) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.isDirectory() && ignored.has(entry.name)) continue;
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(absolute);
        else if (entry.isFile() && suffixes.has(path.extname(entry.name))) files.push(absolute);
      }
    }
    walk(absoluteRoot);
  }
  return files;
}

function collectTemplateInputs() {
  const suffixes = new Set(['.html', '.vue', '.svelte']);
  const ignored = new Set(['node_modules', 'dist', 'coverage', '.git']);
  const files = [];
  for (const root of ['packages', 'examples', 'scripts', 'test-projects']) {
    const absoluteRoot = path.join(ROOT, root);
    if (!fs.existsSync(absoluteRoot)) continue;
    function walk(directory) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.isDirectory() && ignored.has(entry.name)) continue;
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(absolute);
        else if (entry.isFile() && suffixes.has(path.extname(entry.name))) files.push(absolute);
      }
    }
    walk(absoluteRoot);
  }
  return files;
}

function buildTemplateFlowRows() {
  const rows = new Map();
  const apiNames = [
    ...KNOWN_WORKSHEET_MUTATORS, ...KNOWN_WORKSHEET_READS,
    ...RELEVANT_WORKBOOK_MEMBERS, ...KNOWN_ESCAPE_MEMBERS,
  ];
  const apiPattern = apiNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const methodPattern = new RegExp(`\\b(${apiPattern})\\b`);
  const mutatorPattern = new RegExp(`\\b(${[...KNOWN_WORKSHEET_MUTATORS].map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`);
  const files = collectTemplateInputs();
  for (const file of files) {
    const relative = path.relative(ROOT, file).split(path.sep).join('/');
    const text = fs.readFileSync(file, 'utf8');
    const workbookEvidence = /\bnew\s+Workbook\s*\(|\bWorkbook\s*\(/.test(text);
    const scripts = [];
    const scriptPattern = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
    let match;
    while ((match = scriptPattern.exec(text))) {
      const start = text.slice(0, match.index + match[0].indexOf(match[1])).split(/\r?\n/).length;
      for (const [index, line] of match[1].split(/\r?\n/).entries()) scripts.push({ line: start + index, source: line });
    }
    for (const { line, source } of scripts) {
      const candidates = [];
      const add = (kind, expression, detail, rationale, disposition) => candidates.push({
        kind, expression, detail, rationale, disposition,
      });
      if (/\b(?:const|let|var)\s+\{[^}]+\}\s*=/.test(source) && methodPattern.test(source)) {
        add('destructured-api-method', source.match(/\b(?:const|let|var)\s+\{([^}]+)\}/)?.[1] || '',
          'destructured method/service candidate',
          'A detached method loses the receiver owner and transaction capability.',
          'Bind the method to a live view/capability or call the named method through its owner.');
      }
      const computed = source.match(/\b([\w$.]+)\s*\[\s*([^\]]+)\s*\]/);
      if (computed && /(?:^|\.)(?:sheet|worksheet|workbook|activeSheet|wb)$/i.test(computed[1])) {
        add('computed-api-access', computed[1], `member=${computed[2]}`,
          'Computed access can bypass an explicit mutation allowlist.',
          'Use named typed operations; reject unrecognized dynamic mutation keys before writing.');
      }
      const alias = source.match(/\b(?:const|let|var)\s+([\w$]+)\s*=\s*([^;]+)/);
      if (alias && /(?:\.getSheet|\.addSheet|\.createWorksheet|\.activeSheet|new\s+Workbook)/.test(alias[2])) {
        add('workbook-or-sheet-handle', alias[1], `initializer=${alias[2].trim()}`,
          'A local alias preserves the underlying owner identity and lifetime requirements.',
          'Keep the value owner-backed; use a transaction handle for writes and a read view for retained access.');
      }
      const indirectWrite = source.match(/(?:\b([\w$.]+)\.(?:getCell|getDrawingLayer|getStyleCache)\s*\([^)]*\)|\b(?:cell|drawingLayer|style)\w*)\s*\.\s*(?:value|formula|style|add\w+|set\w+)\s*=/);
      if (indirectWrite) {
        add('indirect-returned-object-write', indirectWrite[1] || indirectWrite[0], 'nested object write candidate',
          'A writable object returned from a worksheet/service query bypasses explicit journaled mutation.',
          'Return immutable/detached values and expose explicit transaction-scoped mutators.');
      }
      if (source.includes('=>') && mutatorPattern.test(source) && /\b(?:sheet|worksheet|workbook|activeSheet)\s*\./i.test(source)) {
        add('callback-captures-mutation', source.match(/\b(?:sheet|worksheet|workbook|activeSheet)\b/i)?.[0] || '',
          'callback containing workbook/worksheet API candidate',
          'A delayed callback can outlive a transaction capability unless every call revalidates its lifetime.',
          'Pass a scoped capability, revoke it on completion, and observe late callback failures.');
      }
      for (const candidate of candidates) {
        const sourceLine = source.trim();
        const key = crypto.createHash('sha256').update([
          candidate.kind, relative, line, sourceLine, candidate.expression,
        ].join('\0')).digest('hex').slice(0, 20);
        const ownerKnown = workbookEvidence || /\b(?:sheet|worksheet|workbook|activeSheet|wb)\b/i.test(candidate.expression);
        rows.set(key, {
          flow_key: key,
          flow_kind: candidate.kind,
          path: relative,
          line,
          expression: clip(candidate.expression, 200),
          static_type: 'template script syntax; no TypeScript binding resolution',
          ownership_evidence: ownerKnown ? 'source-context receiver/Workbook construction' : 'source context not conclusive',
          detail: clip(candidate.detail, 300),
          migration_disposition: candidate.disposition,
          responsible_component: fileOwner(file),
          rationale: candidate.rationale,
          review_status: ownerKnown ? 'resolved-source-context' : 'manual-review-required',
          source_excerpt: clip(sourceLine, 300),
          excerpt_truncated: sourceLine.length > 300,
        });
      }
    }
  }
  return [...rows.values()].sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.flow_kind.localeCompare(b.flow_kind));
}

function main() {
  const check = process.argv.includes('--check');
  const rows = parseTsv(fs.readFileSync(INPUT, 'utf8'));
  const rootNames = collectTypeScriptInputs();
  const options = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    checkJs: false,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
    baseUrl: ROOT,
    paths: {
      '@cyber-sheet/core': ['packages/core/src'],
      '@cyber-sheet/renderer-canvas': ['packages/renderer-canvas/src'],
      '@cyber-sheet/io-xlsx': ['packages/io-xlsx/src'],
    },
  };
  const program = ts.createProgram(rootNames, options);
  const checker = program.getTypeChecker();
  const sourceFiles = new Map(program.getSourceFiles().map((source) => [path.resolve(source.fileName), source]));
  const occurrenceCounts = new Map();
  const outputRows = rows.map((row) => {
    const occurrenceBase = [row.family, row.path, row.symbol, row.source_line.replace(/\s+/g, ' ').trim()].join('\0');
    const occurrenceOrdinal = (occurrenceCounts.get(occurrenceBase) || 0) + 1;
    occurrenceCounts.set(occurrenceBase, occurrenceOrdinal);
    const absolute = path.resolve(ROOT, row.path);
    const sourceFile = sourceFiles.get(absolute);
    if (!sourceFile) {
      return classifyRow(row, null, checker, null, occurrenceOrdinal);
    }
    const node = findNodeForRow(sourceFile, row);
    return classifyRow(row, node, checker, sourceFile, occurrenceOrdinal);
  });
  const flowRows = [...buildFlowRows([...sourceFiles.values()], checker), ...buildTemplateFlowRows()]
    .sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.flow_kind.localeCompare(b.flow_kind));
  const candidateDuplicates = outputRows.length - new Set(outputRows.map((row) => row.candidate_key)).size;
  const flowDuplicates = flowRows.length - new Set(flowRows.map((row) => row.flow_key)).size;
  const unresolvedCandidates = outputRows.filter((row) => row.review_status === 'open').length;
  const unresolvedFlows = flowRows.filter((row) => row.review_status === 'manual-review-required').length;
  if (candidateDuplicates || flowDuplicates) {
    process.stderr.write(`Semantic review key collision: candidates=${candidateDuplicates}, flows=${flowDuplicates}\n`);
    process.exitCode = 1;
    return;
  }
  const headers = [
    'candidate_key', 'occurrence_ordinal', 'family', 'path', 'line', 'symbol', 'reviewed_relevance',
    'receiver_expression', 'receiver_static_type', 'member_owner_or_declaration', 'ownership_evidence',
    'ownership_detail', 'syntactic_form', 'migration_disposition',
    'responsible_component', 'justification', 'review_basis', 'review_status',
  ];
  const contents = serializeTsv(outputRows, headers);
  const flowHeaders = [
    'flow_key', 'flow_kind', 'path', 'line', 'expression', 'static_type',
    'ownership_evidence', 'detail', 'migration_disposition',
    'responsible_component', 'rationale', 'review_status', 'source_excerpt', 'excerpt_truncated',
  ];
  const flowContents = serializeTsv(flowRows, flowHeaders);
  if (check) {
    if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== contents ||
        !fs.existsSync(FLOW_OUTPUT) || fs.readFileSync(FLOW_OUTPUT, 'utf8') !== flowContents) {
      process.stderr.write('Semantic review artifacts are stale; regenerate and review the diff.\n');
      process.exitCode = 1;
      return;
    }
    if (unresolvedCandidates || unresolvedFlows) {
      process.stderr.write(`Semantic review gate open: candidates=${unresolvedCandidates}, flows=${unresolvedFlows}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`Semantic review artifacts are deterministic and current: ${outputRows.length} callsite rows, ${flowRows.length} flow rows\n`);
  } else {
    fs.writeFileSync(OUTPUT, contents, 'utf8');
    fs.writeFileSync(FLOW_OUTPUT, flowContents, 'utf8');
    process.stdout.write(`Wrote ${outputRows.length} semantic review rows to ${path.relative(ROOT, OUTPUT)}\n`);
    process.stdout.write(`Wrote ${flowRows.length} flow review rows to ${path.relative(ROOT, FLOW_OUTPUT)}\n`);
  }
  const count = (key) => outputRows.filter((row) => row[key] === 'open').length;
  const byStatus = new Map();
  const byRelevance = new Map();
  for (const row of outputRows) {
    byStatus.set(row.review_status, (byStatus.get(row.review_status) || 0) + 1);
    byRelevance.set(row.reviewed_relevance, (byRelevance.get(row.reviewed_relevance) || 0) + 1);
  }
  for (const [key, value] of [...byStatus].sort()) process.stdout.write(`review_status ${key}: ${value}\n`);
  for (const [key, value] of [...byRelevance].sort()) process.stdout.write(`relevance ${key}: ${value}\n`);
  process.stdout.write(`Semantic review gate: unresolved candidates=${unresolvedCandidates}; unresolved flows=${unresolvedFlows}; duplicate keys=${candidateDuplicates + flowDuplicates}\n`);
  process.stdout.write(`TypeScript diagnostics observed: ${ts.getPreEmitDiagnostics(program).length}; unresolved callsite rows: ${count('review_status')}\n`);
}

main();
