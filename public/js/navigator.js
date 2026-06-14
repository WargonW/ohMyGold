let navCanvas = null;
let navCtx = null;
let navData = [];
let navDataAsc = [];
let navWidth = 0;
let navHeight = 0;

let selectionStart = 0;
let selectionEnd = 1;

let isDragging = false;
let dragType = null;
let dragStartX = 0;
let dragStartSelection = { start: 0, end: 1 };

let onRangeChangeCallback = null;

function initNavigator(canvasId, callback) {
  navCanvas = document.getElementById(canvasId);
  if (!navCanvas) return;
  
  navCtx = navCanvas.getContext('2d');
  onRangeChangeCallback = callback;
  
  setupEventListeners();
  resizeNavigator();
  
  window.addEventListener('resize', () => {
    resizeNavigator();
    drawMiniChart();
    updateSelectionUI();
  });
}

function resizeNavigator() {
  const container = navCanvas.parentElement;
  const rect = container.getBoundingClientRect();
  navWidth = rect.width;
  navHeight = rect.height;
  
  const dpr = window.devicePixelRatio || 1;
  navCanvas.width = navWidth * dpr;
  navCanvas.height = navHeight * dpr;
  navCtx.scale(dpr, dpr);
}

function setNavigatorData(data) {
  navData = data;
  navDataAsc = [...data].reverse();
  selectionStart = 0;
  selectionEnd = 1;
  drawMiniChart();
  updateSelectionUI();
}

function drawMiniChart() {
  if (!navCtx || navData.length === 0) return;
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  
  navCtx.clearRect(0, 0, navWidth, navHeight);
  
  const prices = navDataAsc.map(([, price]) => price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  
  const padding = 4;
  const labelHeight = 16;
  const chartWidth = navWidth - padding * 2;
  const chartHeight = navHeight - padding * 2 - labelHeight;
  
  navCtx.beginPath();
  navCtx.moveTo(padding, padding + chartHeight);
  
  for (let i = 0; i < navDataAsc.length; i++) {
    const x = padding + (i / (navDataAsc.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((prices[i] - minPrice) / priceRange) * chartHeight;
    navCtx.lineTo(x, y);
  }
  
  navCtx.lineTo(padding + chartWidth, padding + chartHeight);
  navCtx.closePath();
  
  const gradient = navCtx.createLinearGradient(0, 0, 0, navHeight);
  if (isDark) {
    gradient.addColorStop(0, 'rgba(96, 165, 250, 0.3)');
    gradient.addColorStop(1, 'rgba(96, 165, 250, 0.05)');
  } else {
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.02)');
  }
  navCtx.fillStyle = gradient;
  navCtx.fill();
  
  navCtx.beginPath();
  for (let i = 0; i < navDataAsc.length; i++) {
    const x = padding + (i / (navDataAsc.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((prices[i] - minPrice) / priceRange) * chartHeight;
    
    if (i === 0) {
      navCtx.moveTo(x, y);
    } else {
      navCtx.lineTo(x, y);
    }
  }
  
  navCtx.strokeStyle = isDark ? '#60A5FA' : '#3B82F6';
  navCtx.lineWidth = 1.5;
  navCtx.stroke();
  
  navCtx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
  navCtx.fillStyle = isDark ? '#94A3B8' : '#6B7280';
  navCtx.textAlign = 'center';
  navCtx.textBaseline = 'bottom';
  
  const tickColor = isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(107, 114, 128, 0.3)';
  
  let lastYear = null;
  for (let i = 0; i < navDataAsc.length; i++) {
    const dateStr = navDataAsc[i][0];
    const year = dateStr.substring(0, 4);
    
    if (year !== lastYear) {
      const x = padding + (i / (navDataAsc.length - 1)) * chartWidth;
      
      navCtx.strokeStyle = tickColor;
      navCtx.lineWidth = 1;
      navCtx.beginPath();
      navCtx.moveTo(x, padding);
      navCtx.lineTo(x, padding + chartHeight);
      navCtx.stroke();
      
      navCtx.fillText(year, x, navHeight - 2);
      
      lastYear = year;
    }
  }
}

function updateSelectionUI() {
  const container = navCanvas.parentElement;
  const maskLeft = container.querySelector('.navigator-mask-left');
  const maskRight = container.querySelector('.navigator-mask-right');
  const window = container.querySelector('.navigator-window');
  
  const leftPx = selectionStart * navWidth;
  const rightPx = selectionEnd * navWidth;
  const widthPx = rightPx - leftPx;
  
  maskLeft.style.width = leftPx + 'px';
  maskRight.style.width = (navWidth - rightPx) + 'px';
  
  window.style.left = leftPx + 'px';
  window.style.width = widthPx + 'px';
}

function setupEventListeners() {
  const container = navCanvas.parentElement;
  const handleLeft = container.querySelector('.navigator-handle-left');
  const handleRight = container.querySelector('.navigator-handle-right');
  const window = container.querySelector('.navigator-window');
  
  handleLeft.addEventListener('mousedown', (e) => startDrag(e, 'left'));
  handleRight.addEventListener('mousedown', (e) => startDrag(e, 'right'));
  window.addEventListener('mousedown', (e) => {
    if (e.target === window) startDrag(e, 'window');
  });
  
  handleLeft.addEventListener('touchstart', (e) => startDrag(e, 'left'));
  handleRight.addEventListener('touchstart', (e) => startDrag(e, 'right'));
  window.addEventListener('touchstart', (e) => {
    if (e.target === window) startDrag(e, 'window');
  });
  
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchmove', onDrag, { passive: false });
  document.addEventListener('touchend', stopDrag);
}

function startDrag(e, type) {
  e.preventDefault();
  isDragging = true;
  dragType = type;
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  dragStartX = clientX;
  dragStartSelection = { start: selectionStart, end: selectionEnd };
}

function onDrag(e) {
  if (!isDragging) return;
  e.preventDefault();
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const dx = (clientX - dragStartX) / navWidth;
  
  const minSelection = 0.02;
  
  if (dragType === 'left') {
    selectionStart = Math.max(0, Math.min(dragStartSelection.start + dx, selectionEnd - minSelection));
  } else if (dragType === 'right') {
    selectionEnd = Math.min(1, Math.max(dragStartSelection.end + dx, selectionStart + minSelection));
  } else if (dragType === 'window') {
    const windowSize = dragStartSelection.end - dragStartSelection.start;
    let newStart = dragStartSelection.start + dx;
    let newEnd = dragStartSelection.end + dx;
    
    if (newStart < 0) {
      newStart = 0;
      newEnd = windowSize;
    } else if (newEnd > 1) {
      newEnd = 1;
      newStart = 1 - windowSize;
    }
    
    selectionStart = newStart;
    selectionEnd = newEnd;
  }
  
  updateSelectionUI();
  
  if (onRangeChangeCallback) {
    const startIdx = Math.floor(selectionStart * (navDataAsc.length - 1));
    const endIdx = Math.floor(selectionEnd * (navDataAsc.length - 1));
    const selectedAsc = navDataAsc.slice(startIdx, endIdx + 1);
    const selectedDesc = [...selectedAsc].reverse();
    onRangeChangeCallback(selectedDesc);
  }
}

function stopDrag() {
  isDragging = false;
  dragType = null;
}

function updateNavigatorTheme() {
  drawMiniChart();
}

window.navigatorModule = { initNavigator, setNavigatorData, updateNavigatorTheme };