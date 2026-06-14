const TROY_OUNCE_GRAMS = 31.1035;

const CURRENCY_SYMBOLS = {
  USD: '$',
  CNY: '¥',
  EUR: '€',
  GBP: '£',
  JPY: '¥'
};

const UNIT_LABELS = {
  ozt: { en: 'oz t', zh: '盎司', ja: 'オンス', ko: '온스', es: 'oz t', fr: 'once t', de: 'oz t', pt: 'oz t', ru: 'унц', ar: 'أونصة', hi: 'ट्रॉय औंस' },
  g: { en: 'g', zh: '克', ja: 'グラム', ko: '그램', es: 'g', fr: 'g', de: 'g', pt: 'g', ru: 'г', ar: 'غ', hi: 'ग्राम' },
  kg: { en: 'kg', zh: '千克', ja: 'キログラム', ko: '킬로그램', es: 'kg', fr: 'kg', de: 'kg', pt: 'kg', ru: 'кг', ar: 'كغ', hi: 'किलोग्राम' }
};

function convertPrice(priceUSDPerOzt, currency, unit, exchangeRates) {
  let price = priceUSDPerOzt;
  
  if (currency !== 'USD' && exchangeRates[currency]) {
    price = price * exchangeRates[currency];
  }
  
  if (unit === 'g') {
    price = price / TROY_OUNCE_GRAMS;
  } else if (unit === 'kg') {
    price = price / TROY_OUNCE_GRAMS * 1000;
  }
  
  return price;
}

function formatPrice(price, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || '';
  
  if (price >= 10000) {
    return symbol + price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } else if (price >= 100) {
    return symbol + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    return symbol + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function aggregateData(data, range) {
  const now = new Date();
  let startDate;
  
  switch (range) {
    case '1m':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case '3m':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case '6m':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case '1y':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case '5y':
      startDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      break;
    default:
      return data;
  }
  
  const startStr = startDate.toISOString().split('T')[0];
  const filtered = data.filter(([date]) => date >= startStr);
  
  if (filtered.length === 0) return data;
  
  const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
  
  if (monthsDiff <= 3) {
    return filtered;
  } else if (monthsDiff <= 12) {
    return aggregateWeekly(filtered);
  } else {
    return aggregateMonthly(filtered);
  }
}

function aggregateWeekly(data) {
  const weeks = {};
  
  data.forEach(([date, price]) => {
    const d = new Date(date + 'T00:00:00');
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split('T')[0];
    weeks[key] = price;
  });
  
  return Object.entries(weeks).map(([date, price]) => [date, price]);
}

function aggregateMonthly(data) {
  const months = {};
  
  data.forEach(([date, price]) => {
    const key = date.substring(0, 7);
    months[key] = price;
  });
  
  return Object.entries(months).map(([month, price]) => [month + '-01', price]);
}

window.utils = { convertPrice, formatPrice, formatDate, aggregateData, CURRENCY_SYMBOLS, UNIT_LABELS };
