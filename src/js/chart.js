let chartInstance = null;

function createChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94A3B8' : '#6B7280';
  const gridColor = isDark ? '#334155' : '#E5E7EB';
  
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
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
              return items[0].label;
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
          ticks: {
            color: textColor,
            maxTicksLimit: 8,
            maxRotation: 0
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

function updateChart(data, currency, unit, exchangeRates) {
  if (!chartInstance) return;
  
  const labels = data.map(([date]) => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  });
  
  const prices = data.map(([, price]) => {
    return window.utils.convertPrice(price, currency, unit, exchangeRates);
  });
  
  chartInstance.data.labels = labels;
  chartInstance.data.datasets[0].data = prices;
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
