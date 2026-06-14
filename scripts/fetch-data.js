import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'public', 'data');
const historicalPath = path.join(dataDir, 'historical-data.json');
const currentPath = path.join(dataDir, 'current-price.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function fetch(url, redirects = 3) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        const redirectUrl = new URL(res.headers.location, url).toString();
        resolve(fetch(redirectUrl, redirects - 1));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function fetchGoldPrice() {
  const result = await fetch('https://api.gold-api.com/price/XAU');
  return {
    price: result.price,
    updatedAt: result.updatedAt
  };
}

async function fetchExchangeRates() {
  const result = await fetch('https://api.frankfurter.app/latest?from=USD&to=CNY,EUR,GBP,JPY');
  return {
    USD: 1.0,
    CNY: result.rates.CNY,
    EUR: result.rates.EUR,
    GBP: result.rates.GBP,
    JPY: result.rates.JPY
  };
}

async function updateHistoricalData(newPrice, date) {
  let historical = { metadata: {}, data: [] };
  
  if (fs.existsSync(historicalPath)) {
    historical = JSON.parse(fs.readFileSync(historicalPath, 'utf8'));
  }
  
  const lastDate = historical.data.length > 0 
    ? historical.data[historical.data.length - 1][0] 
    : null;
  
  if (lastDate !== date) {
    historical.data.push([date, newPrice]);
    historical.metadata.lastUpdated = date;
    fs.writeFileSync(historicalPath, JSON.stringify(historical, null, 2));
    console.log(`Added new record: ${date} = $${newPrice}`);
  } else {
    console.log(`Record for ${date} already exists, skipping`);
  }
}

async function updateCurrentPrice(price, updatedAt, exchangeRates) {
  const current = {
    price: price,
    updatedAt: updatedAt,
    exchangeRates: exchangeRates
  };
  
  fs.writeFileSync(currentPath, JSON.stringify(current, null, 2));
  console.log(`Updated current price: $${price}`);
}

async function main() {
  try {
    ensureDataDir();
    
    console.log('Fetching gold price...');
    const goldData = await fetchGoldPrice();
    
    console.log('Fetching exchange rates...');
    const exchangeRates = await fetchExchangeRates();
    
    const today = new Date().toISOString().split('T')[0];
    
    await updateHistoricalData(goldData.price, today);
    await updateCurrentPrice(goldData.price, goldData.updatedAt, exchangeRates);
    
    console.log('Data update complete');
    process.exit(0);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    process.exit(1);
  }
}

main();
