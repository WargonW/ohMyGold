const ROWS_PER_PAGE = 50;
let currentPage = 1;
let tableData = [];
let currentCurrency = 'USD';
let currentUnit = 'ozt';
let exchangeRates = { USD: 1 };

function initTable(data, currency, unit, rates) {
  tableData = data;
  currentCurrency = currency;
  currentUnit = unit;
  exchangeRates = rates;
  currentPage = 1;
  renderTable();
}

function updateTableData(currency, unit, rates) {
  currentCurrency = currency;
  currentUnit = unit;
  exchangeRates = rates;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;
  
  const totalPages = Math.ceil(tableData.length / ROWS_PER_PAGE);
  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const end = Math.min(start + ROWS_PER_PAGE, tableData.length);
  const pageData = tableData.slice(start, end);
  
  let html = '';
  for (let i = pageData.length - 1; i >= 0; i--) {
    const [date, price] = pageData[i];
    const idx = tableData.indexOf(pageData[i]);
    const prevPrice = idx < tableData.length - 1 ? tableData[idx + 1][1] : price;
    const change = ((price - prevPrice) / prevPrice * 100);
    
    const convertedPrice = window.utils.convertPrice(price, currentCurrency, currentUnit, exchangeRates);
    const formattedPrice = window.utils.formatPrice(convertedPrice, currentCurrency);
    const formattedDate = window.utils.formatDate(date);
    
    let changeClass = '';
    let changeStr = '';
    if (change > 0) {
      changeClass = 'change-positive';
      changeStr = '+' + change.toFixed(2) + '%';
    } else if (change < 0) {
      changeClass = 'change-negative';
      changeStr = change.toFixed(2) + '%';
    } else {
      changeStr = '0.00%';
    }
    
    html += `<tr>
      <td>${formattedDate}</td>
      <td>${formattedPrice}</td>
      <td class="${changeClass}">${changeStr}</td>
    </tr>`;
  }
  
  tbody.innerHTML = html;
  
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  
  if (pageInfo) {
    const t = window.i18n ? window.i18n.t('pageOf') : 'of';
    pageInfo.textContent = `${currentPage} ${t} ${totalPages}`;
  }
  
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function nextPage() {
  const totalPages = Math.ceil(tableData.length / ROWS_PER_PAGE);
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
}

window.tableModule = { initTable, updateTableData, nextPage, prevPage };
