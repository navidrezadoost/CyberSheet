const fs = require('fs');
const path = require('path');

// Scan directory recursively
function scanDirectory(dir, pattern) {
  const files = [];
  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (!['node_modules', 'dist', 'build', '.git', 'coverage', 'playwright-report', 'test-results'].includes(entry)) {
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

// Extract formats
function extractFormats(content) {
  const formats = new Set();
  const patterns = [
    /numberFormat:\s*['"]([^'"]+)['"]/g,
    /TEXT\([^,]+,\s*['"]([^'"]+)['"]/g,
    /formatValue\([^,]+,\s*['"]([^'"]+)['"]/g,
    /\{\s*numberFormat:\s*['"]([^'"]+)['"]/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const fmt = match[1];
      if (fmt && fmt !== 'General' && fmt !== '') {
        formats.add(fmt);
      }
    }
  }
  return Array.from(formats);
}

const rootDir = process.cwd();
const dirsToScan = [
  path.join(rootDir, 'packages/core'),
  path.join(rootDir, 'packages/renderer-canvas'),
  path.join(rootDir, 'examples')
];

const formatCounts = new Map();

for (const dir of dirsToScan) {
  if (!fs.existsSync(dir)) continue;
  const files = scanDirectory(dir, /\.(ts|tsx|js)$/);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const formats = extractFormats(content);
    
    for (const format of formats) {
      formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
    }
  }
}

// Sort by frequency
const sorted = Array.from(formatCounts.entries())
  .sort((a, b) => b[1] - a[1]);

console.log('\n=== NUMBER FORMAT AUDIT RESULTS ===\n');
console.log(`Total unique formats found: ${sorted.length}\n`);
console.log('Top 50 Most Common Formats:\n');

sorted.slice(0, 50).forEach(([fmt, count], i) => {
  console.log(`${(i+1).toString().padStart(2)}. [${count.toString().padStart(3)}x] ${fmt}`);
});

console.log('\n--- Feature Analysis ---\n');

const features = {
  'Grouped (,)': sorted.filter(([f]) => /#,##0/.test(f)).length,
  'Decimal (.)': sorted.filter(([f]) => /\./.test(f)).length,
  'Percent (%)': sorted.filter(([f]) => /%/.test(f)).length,
  'Currency ($)': sorted.filter(([f]) => /[$€£¥]/.test(f)).length,
  'Scientific (E+)': sorted.filter(([f]) => /E\+/.test(f)).length,
  'Sections (;)': sorted.filter(([f]) => /;/.test(f)).length,
  'Conditions ([>])': sorted.filter(([f]) => /\[.*[><=].*\]/.test(f)).length,
  'Colors ([Red])': sorted.filter(([f]) => /\[(Red|Blue|Green|Yellow)\]/i.test(f)).length,
  'Date/Time (m/d)': sorted.filter(([f]) => /[mdy]/i.test(f) && !/[#0]/.test(f)).length,
  'Fractions (?/?)': sorted.filter(([f]) => /\?\/\?/.test(f)).length,
  'Elapsed [h]:': sorted.filter(([f]) => /\[h\]/.test(f)).length,
  'Locale ($-)': sorted.filter(([f]) => /\$-/.test(f)).length
};

Object.entries(features).forEach(([name, count]) => {
  console.log(`${name.padEnd(20)} ${count} formats`);
});

console.log('\n=== DONE ===\n');
