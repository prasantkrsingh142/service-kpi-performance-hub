# Service KPI Performance Hub

A browser-based dashboard for tracking service KPIs by market, region and week.
It is a **single HTML file**: no installation, no server, and no data leaves your computer.

**Live link:** `https://prasantkrsingh142.github.io/service-kpi-performance-hub/`

---

## Contents
1. [Quick start](#1-quick-start)
2. [What the dashboard shows](#2-what-the-dashboard-shows)
3. [KPI definitions](#3-kpi-definitions)
4. [Filters](#4-filters)
5. [Page guide](#5-page-guide)
6. [Preparing the Excel export](#6-preparing-the-excel-export)
7. [How the data is processed](#7-how-the-data-is-processed)
8. [Privacy and data storage](#8-privacy-and-data-storage)
9. [Updating the data](#9-updating-the-data)
10. [Troubleshooting](#10-troubleshooting)
11. [Maintaining this repository](#11-maintaining-this-repository)

---

## 1. Quick start

1. Open the live link (or `index.html`) in **Microsoft Edge** or **Google Chrome**.
2. Click **Upload Market Data** (top right) and choose your Excel export (`.xlsx`).
3. Wait for the progress bar to finish. The dashboard opens on the **latest month** in your data.
4. Next time you open the link, your last uploaded data loads automatically.

> Open the dashboard directly in the browser. Preview windows inside Teams, Outlook, SharePoint or OneDrive can block uploads and downloads.

---

## 2. What the dashboard shows

| Page | Purpose |
|---|---|
| **Executive Overview** | Total Cases and 11 KPI cards, a monthly/weekly KPI trend chart with case-volume bars, and a KPI table by region with Excel export |
| **Market Comparison** | Upload a second market and compare all KPIs side by side, with trend and bar charts and a market table |
| **Weekly Analysis** | Weekly scorecard with heat-map colours, week-over-week change, 4-week trend status, and a separate chart for every KPI |

---

## 3. KPI definitions

All KPIs are calculated on **unique cases**, dated by **Disposition Date**.

| KPI | Formula | Better when |
|---|---|---|
| **Total Cases** | Count of unique cases in the period | — |
| **RR %** | RR ÷ RR Scope | Higher ▲ |
| **RT %** | RT ÷ RT Scope | Higher ▲ |
| **RDF %** | RDF ÷ RDF Scope | Higher ▲ |
| **FVF With Parts %** | FVF ÷ FVF Scope, for cases with `# Parts Consumed` > 0 | Lower ▼ |
| **FVF Without Parts %** | FVF ÷ FVF Scope, for cases with no parts consumed | Higher ▲ |
| **Service Plan Available Before First Visit %** | Cases with a service plan before the first visit ÷ onsite cases (FVF Scope = 1) | Higher ▲ |
| **FTR PA %** | FTR_PA ÷ FTR_PA Scope | Higher ▲ |
| **Not Touched by T2 %** | Cases with `Touched by T2` = 0 ÷ all cases | Lower ▼ |
| **First Visit Fix %** | FVF ÷ FVF Scope | Higher ▲ |
| **Multi Visit Fix %** | Cases with `ResolutionType` = "Multi Visit Fix" ÷ onsite cases (FVF Scope = 1) | Lower ▼ |
| **Parts Match Success %** | Advised parts that were consumed ÷ all advised parts | Higher ▲ |

### Parts Match Success % in detail
- Part numbers are read from **Parts Advised List** and **Parts Consumed List**.
- An advised part counts as **matched** if the same part appears in that case's consumed list.
- **Same part** means identical, or the same length (11NC or 12NC) and different **only in the last digit**.
- Advised parts that were not consumed count as **not matched**, including cases where nothing was consumed.
- Cases with **nothing advised** are not counted.
- A part number repeated within one advised list is counted once.

Every KPI card shows the counts behind the percentage (for example, *"937 of 2,404 RDF-scope cases were RDF"*). Hover over a card to see its formula.

---

## 4. Filters

Filters sit at the top of every page and apply to all cards, charts and tables.

| Filter | Description |
|---|---|
| **Period Type** | **YTD** = from 1 January to the end of the selected period. **ITM** = the selected period only. Hidden on Weekly Analysis. |
| **Year / Quarter / Month / Week** | Choose the period. Lists are built automatically from your data. Hidden on Weekly Analysis. |
| **Region** | IB Region. Hidden on Market Comparison, because regions differ between markets. |
| **RSE Region** | Multi-select: tick one or more regions, search by name, **Select all** or **Clear (All)**. |
| **Modality** | For example MR, CT. |
| **Case Type** | For example Customer, Manual Proactive Monitoring. |
| **Reset Filters** | Sets every filter to **All** and Period Type to **YTD**. |

**Example (YTD vs ITM), Month = August 2026:**
- YTD covers 1 Jan – 31 Aug 2026.
- ITM covers 1 Aug – 31 Aug 2026 only.

---

## 5. Page guide

### 5.1 Executive Overview
- **KPI cards:** Total Cases plus 11 KPIs, each with the counts behind it.
- **KPI Trend chart:**
  - **View By:** *Monthly (last 12 months)* or *Weekly (last 8 weeks)*.
  - **Select KPIs:** show any combination of KPIs.
  - **Grey bars** show the number of cases in each month or week (right-hand axis). Bars always show that period's cases only, even in YTD mode. Click **Cases** in the legend to hide them.
- **KPI Performance by Region:** all regions with a Total row. Shows 20 rows at a time; scroll for more. **Export to Excel** downloads a formatted `.xlsx` immediately.

### 5.2 Market Comparison
1. Upload your main market with **Upload Market Data**.
2. On this page, click **Upload Comparison Market** and choose another market's Excel.
3. The new market is selected automatically and the period switches to **All** so data is visible straight away.

You get:
- KPI cards showing both markets side by side.
- **KPI Trend Comparison:** solid line = main market, dashed line = comparison market.
- **Current Period Comparison:** bar chart for the selected KPIs.
- **KPI Performance Comparison by Market** table with **Export to Excel**.

You can load several comparison markets, switch between them with the dropdown, and remove one with **×**.

**Market names** are taken, in order, from:
1. A **Market** column in the Excel (also accepted: Market Name, IB Market, Market Group, Market Region).
2. The **"Market:"** filter line at the bottom of the export.
3. A readable file name. Random file names such as `704c63a2….xlsx` are replaced with **Comparison Market**.

If you upload the same data as your main market, you'll see a warning.

### 5.3 Weekly Analysis
Weeks run **Monday to Sunday**, and each week is shown on its own (not YTD).

- **Show last:** 8, 12 or 16 weeks.
- **Include current partial week:** off by default, so an unfinished week does not look like a sudden drop.
- **Summary boxes:** KPIs grouped as **Improving**, **Worsening** or **Stable**.
- **Scorecard table:**
  - Cell colours run from **green (best weeks)** to **red (weakest weeks)** for each KPI, respecting the KPI direction.
  - **WoW change** = latest week − previous week, in percentage points (pp).
  - **Trend** = last 4 weeks vs the 4 weeks before. A change within ±2 pp is **Stable**.
  - For "lower is better" KPIs, a rise ▲ counts as **Worsening**.
- **KPI charts:** one per KPI, showing the weekly value, a dashed 4-week rolling average, and grey bars for cases (or advised parts) in scope.

Rolling averages and trends use **combined counts** (for example total RDF ÷ total RDF Scope), not an average of percentages.

---

## 6. Preparing the Excel export

Use the standard Case Resolution KPI Details export. The first sheet must contain these column headers (names are not case-sensitive):

### Required columns
| Column | Used for |
|---|---|
| `Disposition Date` | Period of every KPI |
| `CaseType` | Case Type filter |
| `ResolutionType` | Multi Visit Fix % |
| `Modality` | Modality filter |
| `IB Region` | Region filter and region table |
| `# Parts Consumed` | FVF With / Without Parts split |
| `Service Plan Available Before First Visit` | Service Plan % |
| `RR Scope`, `RR` | RR % |
| `RT Scope`, `RT` | RT % |
| `RDF Scope`, `RDF` | RDF % |
| `FVF Scope`, `FVF` | FVF and First Visit Fix % |
| `FTR_PA Scope`, `FTR_PA` | FTR PA % |
| `Touched by T2` (or `Touched By Tier 2`) | Not Touched by T2 % |

### Optional columns
| Column | Used for |
|---|---|
| `RSE Region` | RSE Region filter |
| `Parts Advised List`, `Parts Consumed List` | Parts Match Success % |
| `Market` | Market name |

If a required column is missing, the upload stops and lists which column to add.

### Tips
- Always upload the **full export** (for example full YTD), not just new rows. A new upload **replaces** the old data.
- Rename downloaded files to something readable before uploading, for example `ISC_KPI_Export_Oct2026.xlsx`.

---

## 7. How the data is processed

1. The Excel file is read **inside your browser**.
2. **Duplicates are removed.** The export repeats each case on several rows (one per `MonthYear` / `WeekYear` slice). Rows that are identical in every column except `MonthYear` and `WeekYear` are counted once.
   - Example: 110,837 rows became **14,801 unique cases**.
   - This is why a filtered row count in Excel is higher than the case count in the dashboard.
3. Each case is placed in the week and month of its **Disposition Date**.
4. The data is summarised and saved in your browser for next time.

Removing duplicates matters: without it, long-open cases would be counted many times and KPIs such as RDF % would be understated.

---

## 8. Privacy and data storage

- **No data is uploaded anywhere.** All processing happens on your own computer.
- Your last upload is stored in the browser's local storage (IndexedDB) so the dashboard reopens with it.
- Data is tied to **your browser on your computer**. Other people who open the link see an empty dashboard until they upload their own file.
- Clearing browser data, or switching browser, removes the saved data; just upload again.
- **Never commit Excel exports to this repository.** They contain service case data.

---

## 9. Updating the data

1. Download the latest Excel export.
2. Open the dashboard and click **Upload Market Data**.
3. Everything updates automatically:
   - Year, quarter, month, week, region and other filter lists are rebuilt.
   - The dashboard jumps to the latest month.
   - The monthly trend shows the latest 12 months; weekly views show the latest complete weeks.
   - **Last Updated** in the header shows the newest Disposition Date in the file.

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| Upload or Export does nothing | Open the dashboard directly in Edge or Chrome, not in a Teams / Outlook / OneDrive preview. |
| "Missing required column(s)" | Re-export with the columns listed in [section 6](#6-preparing-the-excel-export). |
| Dashboard is empty | Click **Upload Market Data**. Data is saved per browser. |
| Case count lower than Excel row count | Expected: duplicate rows are removed (see [section 7](#7-how-the-data-is-processed)). |
| Both markets show identical numbers | The same file was uploaded twice. Remove the comparison market (**×**) and upload a different market's file. |
| Comparison market has a strange name | Add a `Market` column to the export, or rename the file before uploading. |
| Exported Excel not found | Press **Ctrl + J** in the browser and click **Show in folder**. |
| A KPI shows "—" | No cases fall in that KPI's scope for the selected filters. |
| The latest week is missing on Weekly Analysis | It is still in progress. Tick **Include current partial week** to show it. |

---

## 11. Maintaining this repository

### Repository contents
```
index.html   the complete dashboard (self-contained)
README.md    this guide
.gitignore   blocks Excel/CSV files from being committed
```

### Publishing a new version
1. Rename the new dashboard file to `index.html`.
2. In this repository, replace `index.html` (upload the new file and commit).
3. GitHub Pages updates within 1–2 minutes. The link stays the same.

### Recommended `.gitignore`
```
*.xlsx
*.xlsm
*.xls
*.csv
```

---

*Service KPI Performance Hub · Service Excellence | Higher Uptime | Better Care*
