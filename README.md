# Service KPI Performance Hub

**Live link (Philips internal):** [Service KPI Performance Hub](https://fantastic-adventure-4n38o1n.pages.github.io/Service_KPI_Performance_Hub.html)

**Live link (public):** [Service KPI Performance Hub](https://prasantkrsingh142.github.io/service-kpi-performance-hub/Service_KPI_Performance_Hub.html)

A browser-based service-KPI dashboard delivered as **one self-contained HTML file**.
No installation, no server, no internet connection needed. Open it in Microsoft Edge or Chrome,
upload an Excel export, and every number, chart and table is calculated **inside your browser**.

> **Privacy:** the Excel data never leaves your computer. It is stored only in your own browser
> (IndexedDB) so the dashboard reopens with your last upload. **Never commit Excel exports to GitHub.**

---

## Table of contents
1. [Quick start](#1-quick-start)
2. [The four pages](#2-the-four-pages)
3. [KPI definitions](#3-kpi-definitions)
4. [Good / bad direction of every KPI](#4-good--bad-direction-of-every-kpi)
5. [How Improving / Worsening / Stable works](#5-how-improving--worsening--stable-works)
6. [Filters](#6-filters)
7. [Preparing the Excel export](#7-preparing-the-excel-export)
8. [How the data is processed](#8-how-the-data-is-processed)
9. [Market Comparison and market names](#9-market-comparison-and-market-names)
10. [Everything updates automatically](#10-everything-updates-automatically)
11. [Source code guide](#11-source-code-guide)
12. [Building and testing](#12-building-and-testing)
13. [Publishing on GitHub Pages](#13-publishing-on-github-pages)
14. [Troubleshooting](#14-troubleshooting)
15. [Known limitations](#15-known-limitations)
16. [Version history](#16-version-history)

---

## 1. Quick start

1. Open `index.html` (or the published link) in **Edge** or **Chrome**.
   Open it directly in the browser; previews inside Teams, Outlook, SharePoint or OneDrive can block uploads and downloads.
2. Click **Upload Market Data** (top right) and choose your Excel export (`.xlsx`).
3. Wait for the progress bar. The dashboard opens on the **latest month** in your data.
4. Next time you open it, your last upload loads automatically.
   To refresh, upload the **full latest export** again (an upload replaces the old data; it does not add to it).

A 30 MB export with about 110,000 rows loads in roughly 10 seconds.

---

## 2. The four pages

The left menu follows this order.

| # | Page | What it is for |
|---|---|---|
| 1 | **Executive Overview** | Total Cases and 11 KPI cards, a KPI Trend chart (monthly or weekly) with case-volume bars, and a KPI-by-Region table with Export to Excel |
| 2 | **Monthly Analysis** | Month-by-month scorecard, Improving / Worsening / Stable boxes, and one chart per KPI |
| 3 | **Weekly Analysis** | The same as Monthly, but for Monday–Sunday weeks |
| 4 | **Market Comparison** | Upload a second market and compare all KPIs side by side |

### 2.1 Executive Overview
- **Total Cases card:** unique cases dispositioned in the selected period and filters.
- **11 KPI cards:** each shows the percentage and the counts behind it, e.g. *"937 of 2,404 RDF-scope cases were RDF"*. Hover over a card to see its formula.
- **KPI Trend chart:** choose **Monthly (last 12 months)** or **Weekly (last 8 weeks)**, and pick KPIs with **Select KPIs** (*Select all* / *Clear* + a checkbox per KPI).
  Grey bars show the number of cases in each month/week (right-hand axis) and always show that period's cases only, even in YTD mode.
- **KPI Performance by Region:** all regions plus a Total row (20 rows visible, scroll for more). **Export to Excel** downloads a formatted `.xlsx` immediately.

### 2.2 Monthly Analysis and Weekly Analysis
Each month (or week) is shown **on its own**, not cumulatively.

- **Summary boxes** — Improving, Worsening and Stable. Each box shows the periods compared in its header
  (e.g. `Jul+Aug → Sep+Oct`), then every KPI with its **before → after** values and the change in percentage points (pp).
  KPIs where lower is better carry a **↓ better** tag. Hover over a row to see the counts behind it.
- **Scorecard table** — one column per month/week, cells coloured green (best periods) to red (weakest) for each KPI, respecting its direction.
  - **MoM / WoW change** — latest period minus the previous period.
  - **Trend** — last 2 periods vs the 2 periods before (see section 5).
- **One chart per KPI** — the value for each period (labelled), a dashed rolling average (3-month or 4-week), and grey bars for the cases (or advised parts) in scope.
- **Controls** — *Show last* 6/12/18/24 months or 8/12/16 weeks, and *Include current partial month/week* (off by default so an unfinished period does not look like a sudden drop).
- Year, Quarter, Month, Week and YTD/ITM are hidden on these pages because each period is shown on its own.

### 2.3 Market Comparison
See [section 9](#9-market-comparison-and-market-names).

---

## 3. KPI definitions

All KPIs are calculated on **unique cases**, dated by **Disposition Date**.

| KPI | Formula |
|---|---|
| **Total Cases** | Number of unique cases |
| **RR %** | RR ÷ RR Scope |
| **RT %** | RT ÷ RT Scope |
| **RDF %** | RDF ÷ RDF Scope |
| **FVF With Parts %** | FVF ÷ FVF Scope, for cases with `# Parts Consumed` > 0 |
| **FVF Without Parts %** | FVF ÷ FVF Scope, for cases with no parts consumed |
| **Service Plan Available Before First Visit %** | Cases with a service plan before the first visit ÷ onsite cases (FVF Scope = 1) |
| **FTR PA %** | FTR_PA ÷ FTR_PA Scope |
| **Not Touched by T2 %** | Cases with `Touched by T2` = 0 ÷ all cases |
| **First Visit Fix %** | FVF ÷ FVF Scope (with-parts and without-parts combined) |
| **Multi Visit Fix %** | Cases with `ResolutionType` = "Multi Visit Fix" ÷ onsite cases (FVF Scope = 1) |
| **Parts Match Success %** | Advised parts that were consumed ÷ all advised parts |

### Parts Match Success % in detail
- Part numbers are read from **Parts Advised List** and **Parts Consumed List** (one part per line).
- An advised part is **matched** if the same part appears in that case's consumed list.
- **Same part** means identical, or the same length (11NC or 12NC) and different **only in the last digit**.
- Advised parts that were not consumed count as **not matched** (including cases where nothing was consumed).
- Cases with **nothing advised** are not counted.
- A part number repeated within one advised list is counted once.

Example: a case advises 3 parts and the engineer consumes 1 of them → that case adds 3 advised parts and 1 matched part.

---

## 4. Good / bad direction of every KPI

| Higher is better ▲ | Lower is better ▼ |
|---|---|
| RR, RT, RDF, FVF With Parts, FVF Without Parts, Service Plan, FTR PA, First Visit Fix, Parts Match | Not Touched by T2, Multi Visit Fix |

To change a direction, edit the `DIR` object in `src/app.js`
(`1` = higher is better, `-1` = lower is better, `0` = no direction, shown as Rising / Falling).

---

## 5. How Improving / Worsening / Stable works

For every KPI the dashboard compares **recent** against **previous**:

- **Monthly:** the latest 2 complete months vs the 2 complete months before them
  (e.g. Sep+Oct vs Jul+Aug).
- **Weekly:** the latest 2 complete weeks vs the 2 weeks before them
  (e.g. Oct 12–25 vs Sep 28–Oct 11).

```
change (pp) = recent value − previous value
```

| Change | Result |
|---|---|
| within −2 to +2 pp | **Stable** |
| more than 2 pp in the good direction | **Improving** |
| more than 2 pp in the bad direction | **Worsening** |

The value of each group is worked out from **combined counts**, not by averaging percentages:

```
Sep+Oct RT % = (RT in Sep + RT in Oct) ÷ (RT Scope in Sep + RT Scope in Oct)
```

so a busy month counts more than a quiet one. The same applies to the dashed rolling-average lines.
The newest period is excluded while it is still in progress (unless *Include current partial …* is ticked), and the windows move forward automatically with every upload.

**MoM / WoW** compares only the latest period with the one before, so it can swing more than **Trend**, which uses two periods at a time.

To change the window size or the ±2 pp threshold, edit `H` in the `ANA` object (windows) and the `Math.abs(d)<2` test in `status()` in `src/app.js`.

---

## 6. Filters

Filters apply to every card, chart and table on the page.

| Filter | Description |
|---|---|
| **Period Type** | **YTD** = from 1 January to the end of the selected period. **ITM** = the selected period only. |
| **Year / Quarter / Month / Week** | Lists are built from your data. |
| **Region** | IB Region. Hidden on Market Comparison, because regions differ between markets. |
| **RSE Region** | Multi-select with search, *Select all* and *Clear (All)*. |
| **Modality** | e.g. MR. |
| **Case Type** | e.g. Customer, Manual Proactive Monitoring. |
| **Reset Filters** | Sets everything to **All** and Period Type to **YTD**. |

Year, Quarter, Month, Week and Period Type are hidden on the Monthly and Weekly Analysis pages.

---

## 7. Preparing the Excel export

Use the standard *Case Resolution KPI Details* export. The **first sheet** must have a header row. Header names are not case-sensitive.

**Required columns**

| Column | Used for |
|---|---|
| `Disposition Date` | Period of every KPI |
| `CaseType` | Case Type filter |
| `ResolutionType` | Multi Visit Fix % |
| `Modality` | Modality filter |
| `IB Region` | Region filter and table |
| `# Parts Consumed` | FVF With / Without Parts split |
| `Service Plan Available Before First Visit` | Service Plan % |
| `RR Scope`, `RR` | RR % |
| `RT Scope`, `RT` | RT % |
| `RDF Scope`, `RDF` | RDF % |
| `FVF Scope`, `FVF` | FVF and First Visit Fix % |
| `FTR_PA Scope`, `FTR_PA` | FTR PA % |
| `Touched by T2` (or `Touched By Tier 2`) | Not Touched by T2 % |

**Optional columns**

| Column | Used for |
|---|---|
| `RSE Region` | RSE Region filter |
| `Parts Advised List`, `Parts Consumed List` | Parts Match Success % |
| `Market` (also `Market Name`, `IB Market`, `Market Group`, `Market Region`) | Market name |

If a required column is missing the upload stops and lists which column to add.
Rename downloaded files to something readable before uploading, e.g. `ISC_KPI_Export_Oct2026.xlsx`.

---

## 8. How the data is processed

1. The first worksheet of the `.xlsx` is **streamed** and read row by row (fast, low memory).
2. **Repeated rows are removed.** The export writes each case once per `MonthYear` / `WeekYear` slice.
   Rows identical in every column except those two are counted once.
   Example: 110,837 rows became **14,801 unique cases** — which is why a filtered row count in Excel is larger than the dashboard's case count.
3. Each case is placed in the day of its **Disposition Date**.
4. Cases are summarised into **20 counters** per (day, region, case type, modality, RSE region, RSE team). The dashboard only stores these small totals, not the original rows.
5. All pages are drawn from those counters; filters simply add up the matching counters.
6. The summary is saved in the browser (IndexedDB, database `namKpiTracker`).

Why de-duplication matters: without it, long-open cases (often multi-visit or RDF failures) would be counted many times and KPIs such as RDF % would be understated.

---

## 9. Market Comparison and market names

1. Upload your main market with **Upload Market Data**.
2. On the Market Comparison page click **Upload Comparison Market** and choose another market's Excel.
3. The new market is selected automatically and the period switches to **All**, so data is visible straight away.

You get side-by-side KPI cards, a **KPI Trend Comparison** (solid line = main market, dashed = comparison), a **Current Period Comparison** bar chart, and a market table with **Export to Excel**.
Several comparison markets can be loaded; switch with the dropdown and remove one with **×**.

**Market name** is taken, in order, from:
1. A **Market** column in the Excel.
2. The **"Market:"** filter line at the bottom of the export.
3. A readable file name. Random file names (e.g. `704c63a2….xlsx`) become **Comparison Market**.

If the comparison file is identical to the main market a warning is shown, because both sides would be the same.

---

## 10. Everything updates automatically

Nothing is hard-coded to particular dates, weeks, months or regions. Each time you upload a newer file:

- Year / Quarter / Month / Week / Region / RSE Region / Modality / Case Type lists are rebuilt.
- The dashboard jumps to the latest month; **Last Updated** shows the newest Disposition Date.
- The monthly trend shows the latest 12 months; weekly views show the latest complete weeks.
- Trend windows move forward (e.g. Jul+Aug → Sep+Oct becomes Aug+Sep → Oct+Nov).
- The new data is saved and reopens automatically.

---

## 11. Source code guide

```
build.py                  builds dist/index.html (Python 3 only)
src/
  index.template.html     page layout: menu, header, filters, the 4 pages (placeholders are filled by build.py)
  styles.css              all styling and responsive rules
  core.js                 reads the Excel (streaming), removes repeated rows, fills the 20 counters
  app.js                  KPI definitions, filters, pages, charts, Excel export, saving data
assets/
  wordmark.png            PHILIPS lettering (top of the menu)
  philips-shield.png      shield logo (bottom of the menu)
vendor/
  chart.min.js            Chart.js 3.9.1 (MIT) – charts
  jszip.min.js            JSZip 3.10.2 (MIT) – reads and writes .xlsx files
tools/
  make_sample_excel.py    creates a small made-up Excel file for testing
dist/
  index.html              the built dashboard (generated)
```

### Where to change things

| To change… | Edit |
|---|---|
| Dashboard name, header text, buttons, filter layout, menu order | `src/index.template.html` |
| Colours, fonts, card size, responsive behaviour | `src/styles.css` |
| Required/optional Excel columns, header names, duplicate rule, Parts Match rule | `src/core.js` (`REQ`, `ALT`, `OPT`, `IGNORE_FOR_KEY`, `partNos`, `samePart`) |
| KPI list, names, colours, formulas (numerator `n`, denominator `d`) | `src/app.js` → `KPIS` |
| Higher/lower-is-better | `src/app.js` → `DIR` |
| Text under each KPI card and its hover formula | `src/app.js` → `SUB` |
| Trend window (2 vs 2), rolling-average length, ±2 pp rule | `src/app.js` → `ANA` (`H`, `RW`) and `status()` |
| Excel export layout | `src/app.js` → `exportXlsx()` |
| Logos | replace the files in `assets/` |

### The 20 counters (`core.js`)
Each unique case adds to these counters, grouped by day, region, case type, modality, RSE region and RSE team:

| # | Counter | # | Counter |
|---|---|---|---|
| 0 | cases | 10 | FVF (with parts) |
| 1 | RR Scope | 11 | FVF Scope, no parts |
| 2 | RR | 12 | FVF (without parts) |
| 3 | RT Scope | 13 | onsite cases (FVF Scope = 1) |
| 4 | RT | 14 | service plan before first visit |
| 5 | RDF Scope | 15 | not touched by T2 |
| 6 | RDF | 16 | First Visit Fix (ResolutionType) |
| 7 | FTR_PA Scope | 17 | Multi Visit Fix (ResolutionType) |
| 8 | FTR_PA | 18 | advised parts |
| 9 | FVF Scope, with parts | 19 | advised parts consumed |

A KPI in `app.js` is simply `numerator counter ÷ denominator counter` (`n` and `d`). `n` can be a list of counters that are added together (First Visit Fix uses `[10, 12]`).

### Adding a new KPI (example)
1. If you need a new count, add it as counter 20 in `core.js` (`NC = 21`, update the `add()` function) and in `app.js` keep `OFF + NC` consistent (it already uses `KPI_CORE.NC`).
2. Add an entry to `KPIS` in `app.js` with `n`, `d`, a colour, and (optionally) a `short` name.
3. Add its direction to `DIR`, and a text/formula to `SUB`.
4. Bump the saved-data version (`v: 5` in `core.js`, and the `p.v!==5` / `d.v===5` checks at the bottom of `app.js`) so browsers ignore older saved data.
5. Run `python build.py` and test (section 12).

### Saved-data version
Saved data carries `v: 5`. If you change the counters or the saved layout, increase this number in `core.js` and in the start-up code at the bottom of `app.js`; browsers will then ignore older saved data and ask for a fresh upload.

---

## 12. Building and testing

**Build**
```
python build.py
```
This writes `dist/index.html`. Open it in Edge or Chrome.

**Try it without real data**
```
pip install openpyxl
python tools/make_sample_excel.py sample_a.xlsx ISC
python tools/make_sample_excel.py sample_b.xlsx EMEA
```
Upload `sample_a.xlsx` as the main market and `sample_b.xlsx` as a comparison market.
(The sample numbers are random; they only show that everything works.)

**Manual test checklist**
- Upload a file → Total Cases and all 11 KPI cards fill in; **Last Updated** shows the newest date.
- Reload the page → the same data is still there.
- Filters change cards, charts and tables on every page; **Reset Filters** returns everything to **All**.
- **Export to Excel** downloads a formatted file with all regions and a Total row.
- Monthly and Weekly Analysis: boxes, scorecard and 11 charts appear; hovering over a box row shows counts.
- Market Comparison: the comparison market name comes from the Market column; the KPI selector has only *Select all* and *Clear*.
- Upload a newer file → filter lists, months and weeks move forward automatically.

**Check a KPI by hand:** pick one month in Excel, filter `Disposition Date`, remove duplicates on all columns except `MonthYear` and `WeekYear`, then compute e.g. `RDF ÷ RDF Scope`. It should match the card (YTD mode counts from 1 January).

---

## 13. Publishing on GitHub Pages

1. Run `python build.py`.
2. Create a **public** repository (GitHub Pages on a free account needs this), e.g. `service-kpi-performance-hub`.
3. Upload `dist/index.html` as **`index.html`** in the repository root (plus this README if you wish).
4. **Settings → Pages →** Branch `main`, folder `/ (root)` → Save.
5. After 1–2 minutes the link is `https://<user>.github.io/<repository>/`.

Each person who opens the link uploads their **own** Excel; their data stays in their browser.
The file contains no data, but it does contain Philips branding and KPI definitions — check your organisation's policy before publishing publicly.
To update later, replace `index.html` and commit; the link stays the same.

Keep `.gitignore` as supplied so `.xlsx` / `.csv` files can never be committed.

---

## 14. Troubleshooting

| Problem | Fix |
|---|---|
| Upload or Export does nothing | Open the dashboard directly in Edge/Chrome, not in a Teams/Outlook/OneDrive preview. |
| "Missing required column(s)" | Re-export with the columns in [section 7](#7-preparing-the-excel-export). |
| Dashboard is empty | Click **Upload Market Data**. Data is saved per browser. |
| Dashboard case count is lower than the Excel row count | Expected: repeated rows are removed ([section 8](#8-how-the-data-is-processed)). |
| Both markets show identical numbers | The same file was uploaded twice. Remove the comparison market (**×**) and upload a different market. |
| Comparison market has a strange name | Add a `Market` column to the export or rename the file before uploading. |
| Exported Excel not found | Press **Ctrl + J** in the browser and click **Show in folder**. |
| A KPI shows "—" | No cases fall in that KPI's scope for the current filters. |
| Latest week/month missing on the analysis pages | It is still in progress; tick **Include current partial …**. |
| Nothing appears after changing the code | Run `python build.py` again and open `dist/index.html` (not the files in `src/`). |

---

## 15. Known limitations

- Saved data lives in one browser on one computer. Clearing browser data, switching browser, or moving the file to another location means uploading again.
- An upload **replaces** the previous main-market data; upload the full export each time.
- Only the first worksheet is read.
- Parts Match handles part numbers of the form `XX-…-<8–14 digits>`; other formats are not recognised.
- Dates are taken from `Disposition Date`; cases without one are ignored.

---

## 16. Version history

| Version | Highlights |
|---|---|
| v2–v4 | Disposition Date logic and de-duplication so RDF matches the Philips report (e.g. 38.98%); YTD / ITM; Total cases |
| v5–v9 | RSE Region filter, formatted Excel export with region table, Philips logos |
| v10–v20 | Weekly Analysis page, Parts Match Success %, KPI directions, counts under every KPI card |
| v21–v30 | Market Comparison improvements, case bars in the KPI Trend chart, multi-select RSE Region |
| v31–v35 | Renamed to **Service KPI Performance Hub**; generic market labels; market name read from the Excel |
| v36–v38 | **Monthly Analysis** page; Trend = 2 vs 2 periods; new page order (Overview → Monthly → Weekly → Comparison) |
| v39 | Clearer Improving/Worsening/Stable boxes (periods compared, before → after values, rule text, hover counts) |
| v40 | **FVF With Parts %** changed to higher-is-better |
| v41 | **RDF only** button removed from every KPI selector (Select all + Clear only) |

---

*Service KPI Performance Hub · Service Excellence | Higher Uptime | Better Care*
