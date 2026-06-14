const LOCALES = ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'hi'];

let currentLocale = 'en';
let strings = {};

async function loadLocale(locale) {
  if (!LOCALES.includes(locale)) locale = 'en';
  if (locale === currentLocale && strings.title) return;
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

  if (strings.title) {
    document.title = strings.title;
  }

  const descEl = document.querySelector('meta[name="description"]');
  if (descEl && strings.description) {
    descEl.setAttribute('content', strings.description);
  }

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && strings.title) {
    ogTitle.setAttribute('content', strings.title);
  }

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc && strings.description) {
    ogDesc.setAttribute('content', strings.description);
  }

  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle && strings.title) {
    twitterTitle.setAttribute('content', strings.title);
  }

  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc && strings.description) {
    twitterDesc.setAttribute('content', strings.description);
  }
}

function t(key) {
  return strings[key] || key;
}

function detectLocale() {
  const params = new URLSearchParams(window.location.search);
  const queryLang = params.get('lang');
  if (queryLang && LOCALES.includes(queryLang)) return queryLang;

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
