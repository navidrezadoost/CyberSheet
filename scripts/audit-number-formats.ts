#!/usr/bin/env tsx
/**
 * Number Format Audit Script
 * 
 * Extracts and analyzes number format strings from:
 * - Test files (numberFormat values)
 * - Formula files (TEXT() function calls)
 * - Example files
 * 
 * Outputs:
 * - audit-raw-data.json: All format strings with sources
 * - audit-results.json: Analyzed data with frequency/complexity
 * - audit-report.md: Human-readable summary
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface FormatRecord {
  formatString: string;
  hash: string;
  occurrences: number;
  sources: string[];
  categories: string[];
  complexity: {
    tokenCount: number;
    sectionCount: number;
    hasConditions: boolean;
    hasColors: boolean;
    hasLocale: boolean;
    hasFractions: boolean;
    hasElapsedTime: boolean;
    complexityScore: number;
  };
}

// Scan directory recursively for TypeScript files
function scanDirectory(dir: string, pattern: RegExp): string[] {
  const files: string[] = [];
  
  function scan(currentDir: string) {
    const entries = readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, dist, build
        if (!['node_modules', 'dist', 'build', '.git'].includes(entry)) {
          scan(fullPath);
        }
      } else if (stat.isFile() && pattern.test(entry)) {
        files.push(fullPath);
      }
    }
  }
  
  scan(dir);
  return files;
}

// Extract format strings from file content
function extractFormats(filePath: string, content: string): Array<{ format: string; line: number }> {
  const formats: Array<{ format: string; line: number }> = [];
  
  // Pattern 1: numberFormat: "format"
  const pattern1 = /numberFormat:\s*['"](.*?)['"]/g;
  
  // Pattern 2: TEXT(value, "format")
  const pattern2 = /TEXT\([^,]+,\s*['"](.*?)['"]/g;
  
  // Pattern 3: formatValue(value, "format")
  const pattern3 = /formatValue\([^,]+,\s*['"](.*?)['"]/g;
  
  // Pattern 4: { numberFormat: "format" }
  const pattern4 = /\{\s*numberFormat:\s*['"](.*?)['"]/g;
  
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Check all patterns
    for (const pattern of [pattern1, pattern2, pattern3, pattern4]) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const format = match[1];
        if (format && format !== 'General' && format !== '') {
          formats.push({ format, line: lineNum });
        }
      }
    }
  }
  
  return formats;
}

// Calculate complexity score
function calculateComplexity(format: string): FormatRecord['complexity'] {
  let score = 0;
  
  // Base complexity
  score += format.length * 0.1;
  
  // Count tokens (rough estimate)
  const tokenCount = format.split(/[\s;,]/).length;
  
  // Sections (;-separated)
  const sections = format.split(';');
  const sectionCount = sections.length;
  score += sectionCount * 5;
  
  // Bracket expressions
  const bracketMatches = format.match(/\[.*?\]/g) || [];
  score += bracketMatches.length * 10;
  
  // Feature detection
  const hasConditions = /[><=]/.test(format);
  const hasColors = /\[(Red|Blue|Green|Yellow|Cyan|Magenta|White|Black|Color\d+)\]/i.test(format);
  const hasLocale = /\$-\d+/.test(format);
  const hasFractions = /\?\/\?/.test(format);
  const hasElapsedTime = /\[h\]|\[m\]|\[s\]/.test(format);
  
  if (hasFractions) score += 20;
  if (hasElapsedTime) score += 15;
  if (hasLocale) score += 25;
  if (hasConditions) score += 15;
  if (/E\+/.test(format)) score += 10;
  
  return {
    tokenCount,
    sectionCount,
    hasConditions,
    hasColors,
    hasLocale,
    hasFractions,
    hasElapsedTime,
    complexityScore: Math.min(Math.round(score), 100),
  };
}

// Categorize format
function categorizeFormat(format: string): string[] {
  const categories: string[] = [];
  
  // Numeric
  if (/^[0#?.,]+$/.test(format)) {
    categories.push('numeric-basic');
  }
  if (/#,##0/.test(format)) {
    categories.push('numeric-grouped');
  }
  if (/#,##0,/.test(format)) {
    categories.push('numeric-scaled');
  }
  
  // Special numeric
  if (/%/.test(format)) {
    categories.push('percent');
  }
  if (/E\+/.test(format)) {
    categories.push('scientific');
  }
  if (/\?\/\?/.test(format)) {
    categories.push('fraction');
  }
  
  // Currency
  if (/[$€£¥]/.test(format)) {
    if (/_\(/.test(format)) {
      categories.push('currency-accounting');
    } else {
      categories.push('currency-simple');
    }
  }
  
  // Date/Time
  if (/[mdyhs]/i.test(format) && !/[#0]/.test(format)) {
    if (/\[h\]/.test(format)) {
      categories.push('time-elapsed');
    } else if (/[hs]/.test(format)) {
      if (/[mdy]/i.test(format)) {
        categories.push('datetime');
      } else {
        categories.push('time-simple');
      }
    } else {
      if (format.length > 10) {
        categories.push('date-long');
      } else {
        categories.push('date-short');
      }
    }
  }
  
  // Text
  if (/"[^"]*"/.test(format)) {
    categories.push('text-literal');
  }
  if (/@/.test(format)) {
    categories.push('text-placeholder');
  }
  
  // Conditional
  if (/;/.test(format)) {
    if (/\[.*[><=].*\]/.test(format)) {
      categories.push('conditional-complex');
    } else {
      categories.push('conditional-simple');
    }
  }
  
  // Color
  if (/\[(Red|Blue|Green|Yellow|Cyan|Magenta|White|Black)\]/i.test(format)) {
    categories.push('color-tag');
  }
  if (/\[Color\d+\]/.test(format)) {
    categories.push('color-indexed');
  }
  
  // Locale
  if (/\$-\d+/.test(format)) {
    categories.push('locale-aware');
  }
  
  return categories.length > 0 ? categories : ['unknown'];
}

// Generate hash for deduplication
function hashFormat(format: string): string {
  // Simple hash - just use the format string itself for now
  // Could use a proper hash function if needed
  return format;
}

// Main audit function
async function auditFormats() {
  console.log('🔍 Starting Number Format Audit...\n');
  
  const rootDir = join(__dirname, '..');
  const formatMap = new Map<string, FormatRecord>();
  
  // Scan directories
  const dirsToScan = [
    join(rootDir, 'packages/core'),
    join(rootDir, 'packages/renderer-canvas'),
    join(rootDir, 'examples'),
  ];
  
  let totalFiles = 0;
  let totalFormats = 0;
  
  for (const dir of dirsToScan) {
    console.log(`📁 Scanning ${relative(rootDir, dir)}...`);
    
    const files = scanDirectory(dir, /\.(ts|tsx|js)$/);
    totalFiles += files.length;
    
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const formats = extractFormats(file, content);
      
      for (const { format, line } of formats) {
        totalFormats++;
        
        const hash = hashFormat(format);
        
        if (formatMap.has(hash)) {
          const record = formatMap.get(hash)!;
          record.occurrences++;
          record.sources.push(`${relative(rootDir, file)}:${line}`);
        } else {
          const complexity = calculateComplexity(format);
          const categories = categorizeFormat(format);
          
          formatMap.set(hash, {
            formatString: format,
            hash,
            occurrences: 1,
            sources: [`${relative(rootDir, file)}:${line}`],
            categories,
            complexity,
          });
        }
      }
    }
  }
  
  console.log(`\n✅ Scanned ${totalFiles} files`);
  console.log(`✅ Found ${totalFormats} format occurrences`);
  console.log(`✅ Unique formats: ${formatMap.size}\n`);
  
  // Convert to sorted array
  const records = Array.from(formatMap.values())
    .sort((a, b) => b.occurrences - a.occurrences);
  
  // Write raw data
  const rawDataPath = join(rootDir, 'docs/audit-raw-data.json');
  writeFileSync(rawDataPath, JSON.stringify(records, null, 2));
  console.log(`📊 Raw data written to ${relative(rootDir, rawDataPath)}`);
  
  // Generate analysis
  generateAnalysis(records, rootDir);
  
  console.log('\n✅ Audit complete!');
}

function generateAnalysis(records: FormatRecord[], rootDir: string) {
  const total = records.reduce((sum, r) => sum + r.occurrences, 0);
  
  // Top 50 formats
  const top50 = records.slice(0, 50);
  const top50Coverage = top50.reduce((sum, r) => sum + r.occurrences, 0) / total;
  
  // Complexity histogram
  const complexityBuckets = {
    simple: records.filter(r => r.complexity.complexityScore <= 20),
    moderate: records.filter(r => r.complexity.complexityScore > 20 && r.complexity.complexityScore <= 40),
    complex: records.filter(r => r.complexity.complexityScore > 40 && r.complexity.complexityScore <= 60),
    advanced: records.filter(r => r.complexity.complexityScore > 60 && r.complexity.complexityScore <= 80),
    rare: records.filter(r => r.complexity.complexityScore > 80),
  };
  
  // Category distribution
  const categoryMap = new Map<string, number>();
  for (const record of records) {
    for (const category of record.categories) {
      categoryMap.set(category, (categoryMap.get(category) || 0) + record.occurrences);
    }
  }
  const categoryRanking = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1]);
  
  // Generate report
  const report = `# Number Format Audit Results
**Generated:** ${new Date().toISOString()}  
**Total Files Scanned:** ${records.length}  
**Total Format Occurrences:** ${total}  
**Unique Format Strings:** ${records.length}

---

## Executive Summary

- **Top 50 Coverage:** ${(top50Coverage * 100).toFixed(1)}% of all usages
- **Simple Formats (score ≤ 20):** ${complexityBuckets.simple.length} (${(complexityBuckets.simple.length / records.length * 100).toFixed(1)}%)
- **Moderate Formats (21-40):** ${complexityBuckets.moderate.length} (${(complexityBuckets.moderate.length / records.length * 100).toFixed(1)}%)
- **Complex Formats (41-60):** ${complexityBuckets.complex.length} (${(complexityBuckets.complex.length / records.length * 100).toFixed(1)}%)
- **Advanced Formats (61-80):** ${complexityBuckets.advanced.length} (${(complexityBuckets.advanced.length / records.length * 100).toFixed(1)}%)
- **Rare Formats (81-100):** ${complexityBuckets.rare.length} (${(complexityBuckets.rare.length / records.length * 100).toFixed(1)}%)

---

## Top 50 Most Common Formats

| Rank | Format | Occurrences | % of Total | Complexity | Categories |
|------|--------|-------------|------------|------------|------------|
${top50.map((r, i) => {
  const pct = (r.occurrences / total * 100).toFixed(1);
  const cats = r.categories.slice(0, 2).join(', ');
  return `| ${i + 1} | \`${r.formatString}\` | ${r.occurrences} | ${pct}% | ${r.complexity.complexityScore} | ${cats} |`;
}).join('\n')}

---

## Category Distribution

| Category | Occurrences | % of Total |
|----------|-------------|------------|
${categoryRanking.map(([cat, count]) => {
  const pct = (count / total * 100).toFixed(1);
  return `| ${cat} | ${count} | ${pct}% |`;
}).join('\n')}

---

## Complexity Histogram

\`\`\`
Simple (0-20):    ${complexityBuckets.simple.length.toString().padStart(4)} formats  ${'█'.repeat(Math.round(complexityBuckets.simple.length / records.length * 50))}
Moderate (21-40): ${complexityBuckets.moderate.length.toString().padStart(4)} formats  ${'█'.repeat(Math.round(complexityBuckets.moderate.length / records.length * 50))}
Complex (41-60):  ${complexityBuckets.complex.length.toString().padStart(4)} formats  ${'█'.repeat(Math.round(complexityBuckets.complex.length / records.length * 50))}
Advanced (61-80): ${complexityBuckets.advanced.length.toString().padStart(4)} formats  ${'█'.repeat(Math.round(complexityBuckets.advanced.length / records.length * 50))}
Rare (81-100):    ${complexityBuckets.rare.length.toString().padStart(4)} formats  ${'█'.repeat(Math.round(complexityBuckets.rare.length / records.length * 50))}
\`\`\`

---

## Feature Prevalence

| Feature | Count | % of Formats |
|---------|-------|--------------|
| Multiple Sections | ${records.filter(r => r.complexity.sectionCount > 1).length} | ${(records.filter(r => r.complexity.sectionCount > 1).length / records.length * 100).toFixed(1)}% |
| Conditions | ${records.filter(r => r.complexity.hasConditions).length} | ${(records.filter(r => r.complexity.hasConditions).length / records.length * 100).toFixed(1)}% |
| Colors | ${records.filter(r => r.complexity.hasColors).length} | ${(records.filter(r => r.complexity.hasColors).length / records.length * 100).toFixed(1)}% |
| Fractions | ${records.filter(r => r.complexity.hasFractions).length} | ${(records.filter(r => r.complexity.hasFractions).length / records.length * 100).toFixed(1)}% |
| Elapsed Time | ${records.filter(r => r.complexity.hasElapsedTime).length} | ${(records.filter(r => r.complexity.hasElapsedTime).length / records.length * 100).toFixed(1)}% |
| Locale Tokens | ${records.filter(r => r.complexity.hasLocale).length} | ${(records.filter(r => r.complexity.hasLocale).length / records.length * 100).toFixed(1)}% |

---

## Recommendations

### v1.0 Boundary Proposal

**Include (covers ${(top50Coverage * 100).toFixed(0)}% of usage):**
${top50.slice(0, 20).map(r => `- \`${r.formatString}\` (${r.occurrences} uses)`).join('\n')}

**Defer to v1.1+:**
- Fractions (${records.filter(r => r.complexity.hasFractions).length} formats, ${(records.filter(r => r.complexity.hasFractions).reduce((s, r) => s + r.occurrences, 0) / total * 100).toFixed(1)}% usage)
- Elapsed Time (${records.filter(r => r.complexity.hasElapsedTime).length} formats, ${(records.filter(r => r.complexity.hasElapsedTime).reduce((s, r) => s + r.occurrences, 0) / total * 100).toFixed(1)}% usage)
- Locale Tokens (${records.filter(r => r.complexity.hasLocale).length} formats, ${(records.filter(r => r.complexity.hasLocale).reduce((s, r) => s + r.occurrences, 0) / total * 100).toFixed(1)}% usage)

---

## Next Steps

1. Review top 50 formats for v1.0 inclusion
2. Define formal grammar spec based on included features
3. Create test oracle with examples from this audit
4. Set performance budget: < 1µs per format execution
`;

  const reportPath = join(rootDir, 'docs/NUMBER_FORMAT_AUDIT_RESULTS.md');
  writeFileSync(reportPath, report);
  console.log(`📄 Report written to ${relative(rootDir, reportPath)}`);
}

// Run audit
auditFormats().catch(console.error);
