let historicalData = [];
let currentPriceData = null;
let currentCurrency = 'USD';
let currentUnit = 'ozt';
let currentRange = 'all';
let currentAggregatedData = [];
let currentNavigatorSelection = null;
let pricePending = false;

async function fetchWithSignal(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, timeoutMs) {
  const res = await fetchWithSignal(url, timeoutMs);
  return res.json();
}

async function fetchText(url, timeoutMs) {
  const res = await fetchWithSignal(url, timeoutMs);
  return res.text();
}

async function tryFetch(fetchers) {
  for (const [label, fn] of Object.entries(fetchers)) {
    try {
      const result = await fn();
      if (result != null) return result;
    } catch (e) {
      console.warn(`${label} failed:`, e.message);
    }
  }
  return null;
}

async function fetchRealTimeData() {
  const goldPrice = await tryFetch({
    'gold-api.com': async () => {
      const d = await fetchJson('https://api.gold-api.com/price/XAU');
      return { price: d.price, updatedAt: d.updatedAt };
    },
    'qt.gtimg.cn (Tencent)': async () => {
      const text = await fetchText('https://qt.gtimg.cn/q=hf_XAU');
      const m = text.match(/"([^"]+)"/);
      if (!m) throw new Error('unexpected format');
      const parts = m[1].split(',');
      return { price: parseFloat(parts[0]), updatedAt: parts[11] + 'T00:00:00Z' };
    }
  });

  const exchangeRates = await tryFetch({
    'currency-api (jsdelivr)': async () => {
      const d = await fetchJson('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
      return { USD: 1, CNY: d.usd.cny, EUR: d.usd.eur, GBP: d.usd.gbp, JPY: d.usd.jpy };
    },
    'open.er-api.com': async () => {
      const d = await fetchJson('https://open.er-api.com/v6/latest/USD');
      return { USD: 1, CNY: d.rates.CNY, EUR: d.rates.EUR, GBP: d.rates.GBP, JPY: d.rates.JPY };
    }
  });

  if (goldPrice && exchangeRates) {
    return { ...goldPrice, exchangeRates };
  }
  return null;
}

function updateStructuredData() {
  const script = document.getElementById('ld-price');
  if (!script || !currentPriceData) return;
  try {
    const data = JSON.parse(script.textContent);
    data.offers.price = currentPriceData.price;
    data.offers.priceValidUntil = currentPriceData.updatedAt;
    script.textContent = JSON.stringify(data, null, 2);
  } catch (e) {}
}

async function loadData() {
  try {
    const [historicalRes, currentRes] = await Promise.all([
      fetch('data/historical-data.json'),
      fetch('data/current-price.json')
    ]);

    const historical = await historicalRes.json();
    const localCurrent = await currentRes.json();
    historicalData = historical.data;
    currentPriceData = localCurrent;
    pricePending = true;

    updateStructuredData();

    fetchRealTimeData().then(realTime => {
      pricePending = false;
      if (realTime) {
        currentPriceData = realTime;
      }
      updatePriceDisplay();
      updateChartOnly();
      updateStructuredData();
    });

    return true;
  } catch (e) {
    console.error('Failed to load data:', e);
    return false;
  }
}

function updatePriceDisplay() {
  if (!currentPriceData) return;
  
  const priceEl = document.getElementById('priceValue');
  const dateEl = document.getElementById('priceDate');
  
  if (!pricePending) {
    const price = window.utils.convertPrice(
      currentPriceData.price,
      currentCurrency,
      currentUnit,
      currentPriceData.exchangeRates
    );
    const symbol = window.utils.CURRENCY_SYMBOLS[currentCurrency] || currentCurrency;
    const unitLabel = window.utils.UNIT_LABELS[currentUnit]?.[window.i18n.getCurrentLocale()] || currentUnit;
    
    let formatted;
    if (price >= 10000) {
      formatted = price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else if (price >= 100) {
      formatted = price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      formatted = price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    
    if (priceEl) {
      priceEl.innerHTML = `<span class="price-symbol">${symbol}</span> ${formatted} <span class="price-unit">/ ${unitLabel}</span>`;
    }
  }
  
  if (dateEl) {
    const d = new Date(currentPriceData.updatedAt);
    const locale = (window.i18n && window.i18n.getCurrentLocale()) || undefined;
    dateEl.textContent = d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

function updateAll() {
  if (!currentPriceData) return;
  
  updatePriceDisplay();
  
  currentAggregatedData = window.utils.aggregateData(historicalData, currentRange);
  currentNavigatorSelection = null;
  
  if (window.navigatorModule) {
    window.navigatorModule.setNavigatorData(currentAggregatedData);
  }
  
  window.chartModule.updateChart(
    currentAggregatedData,
    currentCurrency,
    currentUnit,
    currentPriceData.exchangeRates,
    currentRange
  );
  
  window.tableModule.updateTableData(
    currentCurrency,
    currentUnit,
    currentPriceData.exchangeRates
  );
}

function updateChartOnly() {
  if (!currentPriceData) return;

  updatePriceDisplay();
  
  const dataToShow = currentNavigatorSelection || currentAggregatedData;
  
  window.chartModule.updateChart(
    dataToShow,
    currentCurrency,
    currentUnit,
    currentPriceData.exchangeRates,
    currentRange
  );
  
  window.tableModule.updateTableData(
    currentCurrency,
    currentUnit,
    currentPriceData.exchangeRates
  );
}

function onNavigatorRangeChange(selectedData) {
  if (!currentPriceData) return;
  
  currentNavigatorSelection = selectedData;
  
  window.chartModule.updateChart(
    selectedData,
    currentCurrency,
    currentUnit,
    currentPriceData.exchangeRates,
    currentRange
  );
}

function initTheme() {
  const saved = localStorage.getItem('ohmygold-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('ohmygold-theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('ohmygold-theme', 'dark');
      }
      window.chartModule.updateChartTheme();
      if (window.navigatorModule) {
        window.navigatorModule.updateNavigatorTheme();
      }
    });
  }
}

function initControls() {
  const langSelect = document.getElementById('langSelect');
  const currencySelect = document.getElementById('currencySelect');
  const unitSelect = document.getElementById('unitSelect');
  
  if (langSelect) {
    langSelect.value = window.i18n.getCurrentLocale();
    langSelect.addEventListener('change', async (e) => {
      await window.i18n.setLocale(e.target.value);
      updatePriceDisplay();
      updateChartOnly();
    });
  }
  
  if (currencySelect) {
    const savedCurrency = localStorage.getItem('ohmygold-currency');
    if (savedCurrency) {
      currencySelect.value = savedCurrency;
      currentCurrency = savedCurrency;
    }
    currencySelect.addEventListener('change', (e) => {
      currentCurrency = e.target.value;
      localStorage.setItem('ohmygold-currency', currentCurrency);
      updateChartOnly();
    });
  }
  
  if (unitSelect) {
    const savedUnit = localStorage.getItem('ohmygold-unit');
    if (savedUnit) {
      unitSelect.value = savedUnit;
      currentUnit = savedUnit;
    }
    unitSelect.addEventListener('change', (e) => {
      currentUnit = e.target.value;
      localStorage.setItem('ohmygold-unit', currentUnit);
      updateChartOnly();
    });
  }
  
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentRange = e.target.getAttribute('data-range');
      updateAll();
    });
  });
  
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  if (prevBtn) prevBtn.addEventListener('click', () => window.tableModule.prevPage());
  if (nextBtn) nextBtn.addEventListener('click', () => window.tableModule.nextPage());

  const pageInput = document.getElementById('pageInput');
  if (pageInput) {
    pageInput.addEventListener('change', () => {
      window.tableModule.goToPage(pageInput.value);
    });
  }
}

async function init() {
  if (window.__securityCheck && !window.__securityCheck()) return;
  
  const locale = window.i18n.detectLocale();
  await window.i18n.loadLocale(locale);
  
  initTheme();

  const savedCurrency = localStorage.getItem('ohmygold-currency');
  if (savedCurrency) currentCurrency = savedCurrency;
  const savedUnit = localStorage.getItem('ohmygold-unit');
  if (savedUnit) currentUnit = savedUnit;

  const loaded = await loadData();
  if (!loaded) return;
  
  window.chartModule.createChart('priceChart');
  
  if (window.navigatorModule) {
    window.navigatorModule.initNavigator('navigatorChart', onNavigatorRangeChange);
  }
  
  window.tableModule.initTable(
    historicalData,
    currentCurrency,
    currentUnit,
    currentPriceData.exchangeRates
  );
  
  try { updateAll(); } catch (e) { console.error('updateAll error:', e); }
  initControls();

  const langSelect = document.getElementById('langSelect');
  if (langSelect) langSelect.value = locale;
}

init();
