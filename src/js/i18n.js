const LOCALES = ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'hi'];

let currentLocale = 'en';
let strings = {};

async function loadLocale(locale) {
  if (!LOCALES.includes(locale)) locale = 'en';
  currentLocale = locale;
  
  try {
    const response = await fetch(`locales/${locale}.json`);
    strings = await response.json();
  } catch (e) {
    const response = await fetch('locales/en.json');
    strings = await response.json();
    currentLocale = 'en';
  }
  
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  
  applyTranslations();
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (strings[key]) {
      el.textContent = strings[key];
    }
  });
}

function t(key) {
  return strings[key] || key;
}

function detectLocale() {
  const saved = localStorage.getItem('ohmygold-lang');
  if (saved && LOCALES.includes(saved)) return saved;
  
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  const short = browserLang.split('-')[0];
  return LOCALES.includes(short) ? short : 'en';
}

function setLocale(locale) {
  localStorage.setItem('ohmygold-lang', locale);
  loadLocale(locale);
}

function getCurrentLocale() {
  return currentLocale;
}

window.i18n = { loadLocale, t, detectLocale, setLocale, getCurrentLocale };
