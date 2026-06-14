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

async function fetchWithFallback(urls, transform) {
  for (const [label, url] of Object.entries(urls)) {
    try {
      const result = await fetch(url);
      return transform(result);
    } catch (e) {
      console.warn(`  ${label} failed: ${e.message}`);
    }
  }
  throw new Error('All sources failed');
}

async function fetchGoldPrice() {
  return fetchWithFallback(
    { 'gold-api.com': 'https://api.gold-api.com/price/XAU' },
    d => ({ price: d.price, updatedAt: d.updatedAt })
  );
}

async function fetchExchangeRates() {
  return fetchWithFallback(
    {
      'cdn.jsdelivr.net': 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
      'open.er-api.com': 'https://open.er-api.com/v6/latest/USD'
    },
    d => {
      if (d.usd) return { USD: 1, CNY: d.usd.cny, EUR: d.usd.eur, GBP: d.usd.gbp, JPY: d.usd.jpy };
      if (d.rates) return { USD: 1, CNY: d.rates.CNY, EUR: d.rates.EUR, GBP: d.rates.GBP, JPY: d.rates.JPY };
      throw new Error('Unknown format');
    }
  );
}

async function updateHistoricalData(newPrice, date) {
  let historical = { metadata: {}, data: [] };
  
  if (fs.existsSync(historicalPath)) {
    historical = JSON.parse(fs.readFileSync(historicalPath, 'utf8'));
  }
  
  const latestDate = historical.data.length > 0 
    ? historical.data[0][0] 
    : null;
  
  if (latestDate !== date) {
    historical.data.unshift([date, newPrice]);
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
    let goldData;
    let exchangeRates;
    try {
      goldData = await fetchGoldPrice();
      console.log('Fetching exchange rates...');
      exchangeRates = await fetchExchangeRates();
    } catch (e) {
      console.error('Failed to fetch live data:', e.message);
      console.log('Using existing data files - frontend will fetch live data directly');
      process.exit(0);
    }

    const today = new Date().toISOString().split('T')[0];

    await updateHistoricalData(goldData.price, today);
    await updateCurrentPrice(goldData.price, goldData.updatedAt, exchangeRates);

    console.log('Data update complete');
    process.exit(0);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    process.exit(0);
  }
}

main();
