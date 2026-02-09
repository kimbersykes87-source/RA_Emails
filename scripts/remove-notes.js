/**
 * Remove Notes column data from import-ready.tsv
 */

const fs = require('fs');
const path = require('path');

// Read the TSV file
const tsvPath = path.join(__dirname, '../assets/import-ready.tsv');
const content = fs.readFileSync(tsvPath, 'utf-8');
const lines = content.split('\n');

// Process each line
const cleanedLines = lines.map((line, index) => {
  if (!line.trim()) return line; // Skip empty lines
  
  const columns = line.split('\t');
  
  // Column 20 is "Notes" (0-indexed = 19)
  if (columns.length > 19) {
    columns[19] = ''; // Clear Notes column
  }
  
  return columns.join('\t');
});

// Write back
const outputPath = path.join(__dirname, '../assets/import-ready-no-notes.tsv');
fs.writeFileSync(outputPath, cleanedLines.join('\n'));

console.log('✓ Removed Notes column data');
console.log(`✓ Saved to: ${outputPath}`);
console.log(`✓ Total lines: ${cleanedLines.length}`);

