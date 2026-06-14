let chartInstance = null;
let currentChartRange = 'all';
let selectedPoint = null;
let crosshairPos = null;
let crosshairPinned = false;
let keyRepeatTimer = null;
let keyRepeatDelay = 0;

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

function moveCrosshair(direction) {
  if (!selectedPoint || !crosshairPinned) return;
  const data = chartInstance.data.datasets[0].data;
  if (data.length === 0) return;
  const idx = data.findIndex(d => d.x === selectedPoint.dataX);
  if (idx === -1) return;
  const newIdx = Math.max(0, Math.min(data.length - 1, idx + direction));
  if (newIdx === idx) return;
  const pt = data[newIdx];
  const xScale = chartInstance.scales.x;
  const yScale = chartInstance.scales.y;
  const x = xScale.getPixelForValue(pt.x);
  const y = yScale.getPixelForValue(pt.y);
  selectedPoint = { x, y, dataX: pt.x, dataY: pt.y };
  crosshairPos = { x, y };
  chartInstance.draw();
}

function startKeyRepeat(direction) {
  stopKeyRepeat();
  keyRepeatDelay = 100;
  keyRepeatTimer = setInterval(() => {
    moveCrosshair(direction);
    keyRepeatDelay = Math.max(30, keyRepeatDelay * 0.85);
    clearInterval(keyRepeatTimer);
    keyRepeatTimer = setInterval(() => moveCrosshair(direction), keyRepeatDelay);
  }, 300);
}

function stopKeyRepeat() {
  if (keyRepeatTimer) {
    clearInterval(keyRepeatTimer);
    keyRepeatTimer = null;
  }
}

function clearCrosshair() {
  stopKeyRepeat();
  selectedPoint = null;
  crosshairPos = null;
  crosshairPinned = false;
  if (chartInstance) chartInstance.draw();
}

function getCrosshairColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    line: isDark ? 'rgba(148, 163, 184, 0.6)' : 'rgba(107, 114, 128, 0.6)',
    dot: isDark ? '#60A5FA' : '#3B82F6',
    text: isDark ? '#E2E8F0' : '#1F2937',
    bg: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    border: isDark ? '#334155' : '#E5E7EB'
  };
}

const crosshairPlugin = {
  id: 'crosshair',
  afterDraw: function(chart) {
    if (!chartInstance || !crosshairPos) return;
    const { ctx, chartArea } = chart;
    const { x, y } = crosshairPos;
    const colors = getCrosshairColors();

    ctx.save();

    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.line;

    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(chartArea.left, y);
    ctx.lineTo(chartArea.right, y);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = colors.dot;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (selectedPoint) {
      const currency = document.getElementById('currencySelect').value;
      const symbol = window.utils.CURRENCY_SYMBOLS[currency] || '';
      const dateStr = new Date(selectedPoint.dataX).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
      const priceStr = symbol + selectedPoint.dataY.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';

      const dateLabel = dateStr;
      const priceLabel = priceStr;
      const dateWidth = ctx.measureText(dateLabel).width;
      const priceWidth = ctx.measureText(priceLabel).width;
      const labelWidth = Math.max(dateWidth, priceWidth) + 16;
      const labelHeight = 48;
      const labelX = x + 12;
      const labelY = y - labelHeight - 8;

      const bx = Math.max(chartArea.left + 4, Math.min(chartArea.right - labelWidth - 4, labelX));
      const by = Math.max(chartArea.top + 4, labelY);

      ctx.fillStyle = colors.bg;
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, labelWidth, labelHeight, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = colors.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(dateLabel, bx + 8, by + 6);
      ctx.fillStyle = colors.dot;
      ctx.fillText(priceLabel, bx + 8, by + 24);
    }

    ctx.restore();
  }
};

function createChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94A3B8' : '#6B7280';
  const gridColor = isDark ? '#334155' : '#E5E7EB';

  chartInstance = new Chart(canvas, {
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
    onClick: function(e) {
          if (crosshairPinned) {
            crosshairPinned = false;
            return;
          }
          const chart = chartInstance;
          const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: false, axis: 'x' }, false);
          if (points.length > 0) {
            const pt = points[0];
            const x = pt.element.x;
            const y = pt.element.y;
            selectedPoint = {
              x, y,
              dataX: chart.data.datasets[0].data[pt.index].x,
              dataY: chart.data.datasets[0].data[pt.index].y
            };
            crosshairPos = { x, y };
            crosshairPinned = true;
            chart.draw();
          }
        },
        onHover: function(e) {
          if (crosshairPinned) return;
          const chart = chartInstance;
          const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: false, axis: 'x' }, false);
          if (points.length > 0) {
            const pt = points[0];
            const x = pt.element.x;
            const y = pt.element.y;
            selectedPoint = {
              x: x,
              y: y,
              dataX: chart.data.datasets[0].data[pt.index].x,
              dataY: chart.data.datasets[0].data[pt.index].y
            };
            crosshairPos = { x, y };
          } else {
            clearCrosshair();
          }
          chart.draw();
        },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
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
    },
    plugins: [crosshairPlugin]
  });

  canvas.style.cursor = 'crosshair';

  document.addEventListener('keydown', function keyHandler(e) {
    if (e.key === 'Escape' && crosshairPinned) {
      crosshairPinned = false;
      stopKeyRepeat();
      return;
    }
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && crosshairPinned && !e.repeat) {
      e.preventDefault();
      const dir = e.key === 'ArrowLeft' ? -1 : 1;
      moveCrosshair(dir);
      startKeyRepeat(dir);
    }
  });

  document.addEventListener('keyup', function keyUpHandler(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      stopKeyRepeat();
    }
  });

  return chartInstance;
}

function updateChart(data, currency, unit, exchangeRates, range) {
  if (!chartInstance) return;

  stopKeyRepeat();
  selectedPoint = null;
  crosshairPos = null;

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

window.chartModule = { createChart, updateChart, updateChartTheme, clearCrosshair };
