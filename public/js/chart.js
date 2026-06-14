let chartInstance = null;
let currentChartRange = 'all';

function getTimeConfig(range) {
  switch (range) {
    case '1m': return { unit: 'day', stepSize: 1, showYearAtJanuary: false };
    case '3m': return { unit: 'day', stepSize: 2, showYearAtJanuary: false };
    case '6m': return { unit: 'day', stepSize: 1, showYearAtJanuary: false };
    case '1y': return { unit: 'day', stepSize: 1, showYearAtJanuary: false };
    case '3y': return { unit: 'month', stepSize: 1, showYearAtJanuary: true };
    case '5y': return { unit: 'month', stepSize: 1, showYearAtJanuary: true };
    case '10y': return { unit: 'year', stepSize: 1, showYearAtJanuary: true };
    default: return { unit: 'year', stepSize: 1, showYearAtJanuary: false };
  }
}

function createChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94A3B8' : '#6B7280';
  const gridColor = isDark ? '#334155' : '#E5E7EB';
  
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: 'Gold Price',
        data: [],
        borderColor: isDark ? '#60A5FA' : '#3B82F6',
        backgroundColor: isDark ? 'rgba(96,165,250,0.1)' : 'rgba(59,130,246,0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          titleColor: isDark ? '#E2E8F0' : '#1F2937',
          bodyColor: isDark ? '#94A3B8' : '#6B7280',
          borderColor: isDark ? '#334155' : '#E5E7EB',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: function(items) {
              if (!items.length) return '';
              const ts = items[0].parsed.x;
              return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
            },
            label: function(item) {
              const currency = document.getElementById('currencySelect').value;
              const symbol = window.utils.CURRENCY_SYMBOLS[currency] || '';
              return symbol + item.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'year',
            stepSize: 1,
            displayFormats: {
              day: 'MM/dd',
              week: 'MM/dd',
              month: 'MMM',
              quarter: 'MMM yyyy',
              year: 'yyyy'
            }
          },
          ticks: {
            color: textColor,
            maxRotation: 0,
            autoSkipPadding: 20,
            callback: function(value) {
              const date = new Date(value);
              const month = date.getMonth();
              const year = date.getFullYear();
              
              if (currentChartRange === 'all') {
                return year.toString();
              }
              
              if (currentChartRange === '3y' || currentChartRange === '5y' || currentChartRange === '10y') {
                if (month === 0) {
                  return year.toString();
                }
                return date.toLocaleDateString(undefined, { month: 'short' });
              }
              
              return date.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
            }
          },
          grid: { color: gridColor }
        },
        y: {
          ticks: {
            color: textColor,
            callback: function(value) {
              const currency = document.getElementById('currencySelect').value;
              const symbol = window.utils.CURRENCY_SYMBOLS[currency] || '';
              return symbol + value.toLocaleString();
            }
          },
          grid: { color: gridColor }
        }
      }
    }
  });
  
  return chartInstance;
}

function updateChart(data, currency, unit, exchangeRates, range) {
  if (!chartInstance) return;
  
  currentChartRange = range || 'all';
  const timeConfig = getTimeConfig(currentChartRange);
  
  chartInstance.options.scales.x.time.unit = timeConfig.unit;
  chartInstance.options.scales.x.time.stepSize = timeConfig.stepSize;
  chartInstance.options.scales.x.ticks.autoSkip = !(currentChartRange === '10y' || currentChartRange === 'all');
  
  const points = data.map(([date, price]) => {
    return {
      x: new Date(date + 'T00:00:00').getTime(),
      y: window.utils.convertPrice(price, currency, unit, exchangeRates)
    };
  });
  
  chartInstance.data.datasets[0].data = points;
  chartInstance.update('none');
}

function updateChartTheme() {
  if (!chartInstance) return;
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94A3B8' : '#6B7280';
  const gridColor = isDark ? '#334155' : '#E5E7EB';
  const lineColor = isDark ? '#60A5FA' : '#3B82F6';
  const fillColor = isDark ? 'rgba(96,165,250,0.1)' : 'rgba(59,130,246,0.1)';
  
  chartInstance.data.datasets[0].borderColor = lineColor;
  chartInstance.data.datasets[0].backgroundColor = fillColor;
  
  chartInstance.options.scales.x.ticks.color = textColor;
  chartInstance.options.scales.y.ticks.color = textColor;
  chartInstance.options.scales.x.grid.color = gridColor;
  chartInstance.options.scales.y.grid.color = gridColor;
  
  chartInstance.options.plugins.tooltip.backgroundColor = isDark ? '#1E293B' : '#FFFFFF';
  chartInstance.options.plugins.tooltip.titleColor = isDark ? '#E2E8F0' : '#1F2937';
  chartInstance.options.plugins.tooltip.bodyColor = isDark ? '#94A3B8' : '#6B7280';
  chartInstance.options.plugins.tooltip.borderColor = isDark ? '#334155' : '#E5E7EB';
  
  chartInstance.update('none');
}

window.chartModule = { createChart, updateChart, updateChartTheme };
