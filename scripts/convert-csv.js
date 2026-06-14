import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, '..', 'data', 'gold_price_history_20y.csv');
const outputPath = path.join(__dirname, '..', 'public', 'data', 'historical-data.json');

const csv = fs.readFileSync(csvPath, 'utf8');
const lines = csv.trim().split('\n');
const header = lines[0].split(',');

const dateIdx = header.indexOf('date');
const closeIdx = header.indexOf('close');

const data = [];
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  const date = cols[dateIdx];
  const close = parseFloat(cols[closeIdx]);
  if (date && !isNaN(close)) {
    data.push([date, close]);
  }
}

const output = {
  metadata: {
    lastUpdated: data[data.length - 1][0],
    source: 'Yahoo Finance COMEX Gold Futures (GC=F)',
    unit: 'USD/oz t',
    totalRecords: data.length
  },
  data: data
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Converted ${data.length} records`);
console.log(`Date range: ${data[0][0]} to ${data[data.length - 1][0]}`);
console.log(`Output: ${outputPath}`);
