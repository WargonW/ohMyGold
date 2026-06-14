import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const outputDir = path.join(__dirname, '..', 'public', 'data');
const outputPath = path.join(outputDir, 'historical-data.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const allCsv = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));
const dailyFile = allCsv.find(f => f.includes('daily'));
const hourlyFile = allCsv.find(f => f.includes('hourly'));

function parseCSV(filename, dateCol, closeCol, isHourly) {
  const csv = fs.readFileSync(path.join(dataDir, filename), 'utf8');
  const lines = csv.trim().split('\n');
  const header = lines[0].split(',');
  const dateIdx = header.indexOf(dateCol);
  const closeIdx = header.indexOf(closeCol);
  const dailyMap = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const date = isHourly ? cols[dateIdx] : cols[dateIdx];
    const close = parseFloat(cols[closeIdx]);
    if (date && !isNaN(close)) {
      const d = isHourly ? date : date;
      dailyMap[d] = close;
    }
  }
  return dailyMap;
}

const dailyData = parseCSV(dailyFile, 'Date', 'Close_USD', false);
const hourlyData = parseCSV(hourlyFile, 'Date', 'Close_USD', true);

const allDates = new Set([...Object.keys(dailyData), ...Object.keys(hourlyData)]);
const merged = [];
for (const date of allDates) {
  const price = hourlyData[date] || dailyData[date];
  if (price) merged.push([date, price]);
}
merged.sort((a, b) => b[0].localeCompare(a[0]));

const output = {
  metadata: {
    lastUpdated: merged[0][0],
    source: 'Yahoo Finance COMEX Gold Futures (GC=F)',
    unit: 'USD/oz t',
    totalRecords: merged.length
  },
  data: merged
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Converted ${merged.length} records`);
console.log(`Date range: ${merged[0][0]} to ${merged[merged.length - 1][0]}`);
