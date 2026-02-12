/**
 * generate-metadata-export.ts
 * 
 * Generates metadata.json export from ALL_METADATA for:
 * - External tooling (VS Code extensions, linters, documentation generators)
 * - Static analysis tools
 * - Third-party integrations
 * 
 * Run: npx ts-node scripts/generate-metadata-export.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { ALL_METADATA, getMetadataStats } from '../packages/core/src/metadata-api';

const OUTPUT_DIR = path.join(__dirname, '../dist');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'metadata.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate metadata export
const metadataExport = {
  version: '1.0.0',
  generated: new Date().toISOString(),
  stats: getMetadataStats(),
  functions: ALL_METADATA.map(meta => ({
    name: meta.name,
    category: meta.category,
    minArgs: meta.minArgs,
    maxArgs: meta.maxArgs,
    complexityClass: meta.complexityClass,
    precisionClass: meta.precisionClass,
    errorStrategy: meta.errorStrategy,
    volatile: meta.volatile,
    iterationPolicy: meta.iterationPolicy,
    needsContext: meta.needsContext,
    isSpecial: meta.isSpecial,
  })),
};

// Write to file
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metadataExport, null, 2));

console.log(`✅ Metadata export generated: ${OUTPUT_FILE}`);
console.log(`   Total functions: ${metadataExport.stats.totalFunctions}`);
console.log(`   Volatile: ${metadataExport.stats.volatileCount}`);
console.log(`   Iterative: ${metadataExport.stats.iterativeCount}`);
console.log(`   Context-aware: ${metadataExport.stats.contextAwareCount}`);
console.log(`   Special: ${metadataExport.stats.specialCount}`);
