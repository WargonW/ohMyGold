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

if (ALLOWED_DOMAINS.length > 0) {
  setInterval(() => {
    if (!checkDomain()) {
      document.body.innerHTML = '';
    }
  }, 10000);
}

console.log('%cProtected by OhMyGold', 'font-size:24px;font-weight:bold;color:#3B82F6');
console.log('%cThis website is protected. Unauthorized cloning or reproduction is prohibited.', 'font-size:14px;color:#6B7280');
