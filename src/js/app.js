let historicalData = [];
let currentPriceData = null;
let currentCurrency = 'USD';
let currentUnit = 'ozt';
let currentRange = 'all';

async function loadData() {
  try {
    const [historicalRes, currentRes] = await Promise.all([
      fetch('data/historical-data.json'),
      fetch('data/current-price.json')
    ]);
    
    const historical = await historicalRes.json();
    currentPriceData = await currentRes.json();
    historicalData = historical.data;
    
    return true;
  } catch (e) {
    console.error('Failed to load data:', e);
    return false;
  }
}

function updatePriceDisplay() {
  if (!currentPriceData) return;
  
  const price = window.utils.convertPrice(
    currentPriceData.price,
    currentCurrency,
    currentUnit,
    currentPriceData.exchangeRates
  );
  
  const priceEl = document.getElementById('priceValue');
  const unitEl = document.getElementById('priceUnit');
  const dateEl = document.getElementById('priceDate');
  
  if (priceEl) {
    priceEl.textContent = window.utils.formatPrice(price, currentCurrency);
  }
  
  if (unitEl) {
    const symbol = window.utils.CURRENCY_SYMBOLS[currentCurrency] || currentCurrency;
    const unitLabel = window.utils.UNIT_LABELS[currentUnit]?.[window.i18n.getCurrentLocale()] || currentUnit;
    unitEl.textContent = `${symbol} / ${unitLabel}`;
  }
  
  if (dateEl) {
    const d = new Date(currentPriceData.updatedAt);
    dateEl.textContent = d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

function updateAll() {
  if (!currentPriceData) return;
  
  updatePriceDisplay();
  
  const aggregated = window.utils.aggregateData(historicalData, currentRange);
  window.chartModule.updateChart(
    aggregated,
    currentCurrency,
    currentUnit,
    currentPriceData.exchangeRates
  );
  
  window.tableModule.updateTableData(
    currentCurrency,
    currentUnit,
    currentPriceData.exchangeRates
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
      updateAll();
    });
  }
  
  if (currencySelect) {
    currencySelect.addEventListener('change', (e) => {
      currentCurrency = e.target.value;
      updateAll();
    });
  }
  
  if (unitSelect) {
    unitSelect.addEventListener('change', (e) => {
      currentUnit = e.target.value;
      updateAll();
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
}

async function init() {
  if (window.__securityCheck && !window.__securityCheck()) return;
  
  const locale = window.i18n.detectLocale();
  await window.i18n.loadLocale(locale);
  
  initTheme();
  
  const loaded = await loadData();
  if (!loaded) return;
  
  window.chartModule.createChart('priceChart');
  
  window.tableModule.initTable(
    historicalData,
    currentCurrency,
    currentUnit,
    currentPriceData.exchangeRates
  );
  
  updateAll();
  initControls();
  
  const langSelect = document.getElementById('langSelect');
  if (langSelect) langSelect.value = locale;
}

init();
