# Service KPI Performance Hub

Single-file HTML dashboard for Service KPIs (RR, RT, RDF, FVF, FTR PA, Service Plan, T2, First/Multi Visit Fix) and NAM Financial Impact / Labor Savings (RR, FVF with parts, FVF without parts).

## Build with your settings

1. Copy `.env.example` to `.env` and edit the values:

   | Key | Meaning |
   |---|---|
   | `MARKET` | Market for the Financial Impact page (built-in 2025 baseline is NAM only) |
   | `LABOR_RATE` | Labor rate, EUR per hour |
   | `TARGET_RR` | FY EUR labor-savings target, RR |
   | `TARGET_FVF_WITHOUT_PARTS` | FY EUR labor-savings target, FVF without parts |
   | `TARGET_FVF_WITH_PARTS` | FY EUR labor-savings target, FVF with parts |

2. Run `python build.py` (Python 3, no packages needed).
3. Open `dist/Service_KPI_Performance_Hub.html` in Edge or Chrome and use **Upload Market Data** to load the current-year raw Excel.

`src/Service_KPI_Performance_Hub.html` also opens directly with the default settings.

## Publish (GitHub Pages)

Live links:

- Philips internal: https://fantastic-adventure-4n38o1n.pages.github.io/Service_KPI_Performance_Hub.html (repo `philips-internal/service-kpi-performance-hub`)
- Public: https://prasantkrsingh142.github.io/service-kpi-performance-hub/Service_KPI_Performance_Hub.html (repo `prasantkrsingh142/service-kpi-performance-hub`)

Run `python build.py --publish`, then commit `Service_KPI_Performance_Hub.html` (repo root) and push `main` to both repos (`git push origin main` and `git push internal main`). GitHub Pages serves that file from `main`.

## Notes

- `.env`, `dist/` and Excel files are not committed.
- Rate and targets can still be changed on the Financial Impact page; those changes are saved in the browser.
