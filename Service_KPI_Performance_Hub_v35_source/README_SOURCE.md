# Service KPI Performance Hub – Source Code (v35)

This is the source behind the single-file dashboard `Service_KPI_Performance_Hub_v35.html`.
`python build.py` combines everything back into one self-contained file: `dist/index.html`.

## Folder structure
```
build.py                    builds dist/index.html (Python 3, no extra packages)
src/
  index.template.html       page layout (header, filters, 3 pages); placeholders are filled by build.py
  styles.css                all styling (layout, cards, tables, responsive rules)
  core.js                   Excel reading, duplicate removal and KPI counting
  app.js                    filters, KPI formulas, charts, pages, export, saving data
assets/
  wordmark.png              PHILIPS lettering (sidebar top)
  philips-shield.png        shield logo (sidebar bottom)
vendor/
  chart.min.js              Chart.js 3.9.1 (MIT licence) – charts
  jszip.min.js              JSZip 3.10.2 (MIT licence) – reading and writing .xlsx files
```

## Where to change things
| To change… | Edit |
|---|---|
| Dashboard name, header text, buttons, filter layout | `src/index.template.html` |
| Colours, fonts, card size, layout | `src/styles.css` |
| Required Excel columns, column names, duplicate rule, Parts Match rule | `src/core.js` (`REQ`, `ALT`, `OPT`, `partNos`, `samePart`) |
| KPI list, names, colours, formulas | `src/app.js` → `KPIS` array |
| Higher/lower-is-better direction | `src/app.js` → `DIR` |
| Text under each KPI card | `src/app.js` → `SUB` |
| Weekly trend rules (4 weeks, ±2 pp) | `src/app.js` → `status()` |
| Excel export layout | `src/app.js` → `exportXlsx()` |

## How the KPI counters work (core.js)
Each unique case adds to 20 counters, grouped by day, region, case type, modality, RSE region and RSE team:

| # | Counter | # | Counter |
|---|---|---|---|
| 0 | cases | 10 | FVF (with parts) |
| 1 | RR Scope | 11 | FVF Scope, no parts |
| 2 | RR | 12 | FVF (no parts) |
| 3 | RT Scope | 13 | onsite cases (FVF Scope = 1) |
| 4 | RT | 14 | Service plan before first visit |
| 5 | RDF Scope | 15 | Not touched by T2 |
| 6 | RDF | 16 | First Visit Fix (ResolutionType) |
| 7 | FTR_PA Scope | 17 | Multi Visit Fix (ResolutionType) |
| 8 | FTR_PA | 18 | advised parts |
| 9 | FVF Scope, with parts | 19 | advised parts consumed |

A KPI in `app.js` is `numerator counter ÷ denominator counter` (field `n` and `d`).

## Build and publish
1. Make your changes in `src/`.
2. Run `python build.py`.
3. Open `dist/index.html` in Edge or Chrome and test with an Excel export.
4. Publish `dist/index.html` as `index.html` in the GitHub repository.

## Notes
- No server or internet connection is needed; everything runs in the browser.
- Data is saved in the browser (IndexedDB, database `namKpiTracker`). Changing the saved format version (`v: 5`) makes the dashboard ignore older saved data.
- Never commit Excel exports – they contain case data.
