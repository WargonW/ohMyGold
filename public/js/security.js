const ALLOWED_DOMAINS = [];

function checkDomain() {
  if (ALLOWED_DOMAINS.length === 0) return true;
  const hostname = window.location.hostname;
  if (!ALLOWED_DOMAINS.includes(hostname)) {
    document.body.innerHTML = '<div style="color:#999;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif">Loading...</div>';
    return false;
  }
  return true;
}

window.__securityCheck = checkDomain;

setInterval(() => {
  if (!checkDomain()) {
    document.body.innerHTML = '';
  }
}, 30000);
