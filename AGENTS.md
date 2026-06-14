# AGENTS.md — OhMyGold

## Project

Static international gold price website. No backend at runtime. Data is pre-generated hourly by GitHub Actions and deployed to Cloudflare Pages.

## Architecture

```
.github/workflows/update-data.yml   # Hourly cron: fetch data, commit JSON, deploy
scripts/fetch-data.js               # Node script: fetch FRED + exchange rates, write JSON
public/
  data/
    current-price.json              # Latest price in all currency/unit combos
    historical-data.json            # 20 years daily gold prices (USD/oz t)
  index.html                        # SPA entry point
  css/style.css
  js/
    app.js                          # Main init, data loading, event wiring
    chart.js                        # Chart.js line chart with smart granularity
    i18n.js                         # Locale loader + string resolver
    utils.js                        # Unit conversion, number formatting, pagination
  locales/{en,zh,ja,ko,es,fr,de}.json
```

## Key Commands

- `npm run fetch-data` — Run data fetch script locally (requires `FRED_API_KEY` env var)
- `npm run dev` — Serve `public/` locally (e.g., `npx serve public`)
- No build step. No bundler. No framework. Vanilla JS with ES modules.

## Constraints

- **No runtime server.** Everything is static files + JSON.
- **No npm dependencies for frontend.** Chart.js loaded via CDN.
- **Data is generated, not fetched client-side.** The frontend loads JSON from `/data/`.
- **FRED API** provides historical gold prices (series `GOLDAMGBD228NLBM`). Free API key required.
- **Exchange rates** fetched from a free API (e.g., open.er-api.com or exchangerate-api.com free tier).
- **Hourly GitHub Actions** commits updated JSON to the repo; Cloudflare Pages auto-deploys.

## Feature Rules

- **Chart granularity**: < 3 months = daily; 3–12 months = weekly; > 1 year = monthly. Aggregate in frontend from daily source data.
- **Units**: Troy ounce (31.1035 g), Gram, Kilogram. Convert from USD/oz t base.
- **Currencies**: USD, CNY, EUR, GBP, JPY. Apply exchange rates to USD base price.
- **i18n**: 7 locales. All user-visible strings in locale JSON files. Language auto-detected from browser, with manual override.
- **Table**: Paginated, 50 rows per page. Shows date + price in selected currency/unit.

## Conventions

- No comments unless they explain a non-obvious "why".
- Use `const`/`let`, never `var`. ES modules (`import`/`export`).
- CSS: plain CSS, no preprocessor. Mobile-first responsive.
- JSON data files are committed to the repo (they are the build output).
