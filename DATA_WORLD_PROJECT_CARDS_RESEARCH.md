# DATA_WORLD_PROJECT_CARDS_RESEARCH.md
*Phase 1 — research & content audit for the four Core / Projects cards. All verification via live `gh api` inspection of the four public repos under `github.com/yashmahajan11234567/` on 2026-11-17, cross-checked against `src/content/projects.data.ts`. Labels: **VERIFIED** = observed in the repo this session; **RECORDED** = stated in content model / project's own reports, not re-executed; **UNVERIFIED** = could not be confirmed.*

---

## Repo Summary

| Project | Repo | Sub-path / Notes | Last push | Size (KB) |
|---|---|---|---|---|
| NIFTY 100 Financial Analysis | [Bluestock-fintech](https://github.com/yashmahajan11234567/Bluestock-fintech) | `nifty100-financial-analysis(Bluestock-fintech)/` | 2026-08-18 | 23,213 |
| SQL Data Warehouse & ETL | [Sql-data-warehouse](https://github.com/yashmahajan11234567/Sql-data-warehouse) | root | 2026-06-02 | 1,093 |
| PRIMETradeAI | [PRIMETradeAI](https://github.com/yashmahajan11234567/PRIMETradeAI) | root | 2026-06-04 | 492 |
| Data Analytics Dashboards | [Projects](https://github.com/yashmahajan11234567/Projects) | `Data-Analytics-Projects/` | 2026-04-18 | 101,110 |

All four repos are public.

---

## Project 1 — NIFTY 100 Financial Analysis (`nifty100-financial-analysis`)

**Repo URL:** https://github.com/yashmahajan11234567/Bluestock-fintech/tree/main/nifty100-financial-analysis(Bluestock-fintech)

### Verified Structure
- `db/schema.sql` — **10 `CREATE TABLE`** statements (companies, profitandloss, balancesheet, cashflow, analysis, documents, prosandcons, sectors, stock_prices, financial_ratios) + **16 indexes** (VERIFIED count). Content model says "11 tables" → **DISCREPANCY: 10 observed**.
- `src/etl/validator.py` — exactly **16 data-quality rules DQ-01..DQ-16** (VERIFIED). Includes balance-sheet identity (DQ-04), EPS sign consistency (DQ-13).
- `src/analytics/ratios.py` — ROE, D/E, ICR, CAGR, cash-flow KPIs (VERIFIED).
- `src/api/main.py` — FastAPI with **8 routers**: companies, documents, health, peers, portfolio, screener, sectors, valuation (VERIFIED).
- `src/dashboard/app.py` — Streamlit entry + `src/dashboard/_pages/` (8 files, VERIFIED).
- `src/reports/tearsheet.py` — `reportlab` imports (VERIFIED: `from reportlab.lib import colors`, `TA_CENTER`, `TA_LEFT`, `TA_RIGHT`, `A4`). `reportlab` **not pinned** in `requirements.txt` (UNVERIFIED version).
- `requirements.txt` pins: `fastapi==0.116.1`, `pandas==2.3.3`, `pytest==9.1.1`, `scikit-learn==1.7.2`, `streamlit==1.58.0` (VERIFIED).
- `tests/` — **33 test files** (VERIFIED tree count). Content model records "714 tests, 699 passing" — **RECORDED**, not re-run. Source report (`DAY45_FINAL_QA_REPORT.md`) not found via API (404).

### Data Sources
- `Data/raw/` — Excel exports of company financials (VERIFIED directory exists).

### Results (RECORDED from content model / project reports)
- Live DB: 92 companies, 5,520 stock prices, 3,484 ratio rows.
- TCS FY2024 cross-checked: ROE 50.94%, D/E 0.089, ICR 87.1.
- "699 of 714 tests pass".

### Limitations (kept verbatim from content model)
1. Shipped ETL load is not idempotent; recorded run fails on 10 tables (schema has exactly 10 → "fails on 10 of 12" is **UNVERIFIED** as written).
2. 14 of 714 tests fail under pandas 3.0.5; project pins 2.3.3 (pin VERIFIED).
3. scikit-learn declared but not executed in audited environment (declaration VERIFIED).

### Tech Stack (VERIFIED from code + deps)
Python, pandas, SQLite, T-SQL, FastAPI, Streamlit, pytest, reportlab (imported, not pinned).

### Evidence References
- `db/schema.sql` — 10-table schema, 16 indexes (count verified)
- `src/etl/validator.py` — 16 DQ rules
- `src/analytics/ratios.py` — ratio formulas, live-validated against TCS FY2024
- `tests/` — recorded run: 714 tests, 699 passing
- `src/reports/tearsheet.py` — reportlab usage
- `src/api/main.py` — 8 routers

---

## Project 2 — SQL Data Warehouse & ETL (`sql-data-warehouse`)

**Repo URL:** https://github.com/yashmahajan11234567/Sql-data-warehouse

### Verified Structure
- **8 `.sql` files** total:
  - `init_database.sql`
  - `scripts/bronze/ddl_bronze.sql`, `scripts/bronze/proc_load_bronze.sql`
  - `scripts/Silver/ddl.silver.sql`, `scripts/Silver/proc_load_silver.sql`, `scripts/Silver/Readme.md`
  - `scripts/Gold/ddl_gold.sql`
  - `tests/quality_check_Silver.sql`, `tests/quality_check_Gold.sql`
- **Bronze layer**: 6 tables (`crm_cust_info`, `crm_prd_info`, `crm_sales_details`, `erp_loc_a101`, `erp_cust_az12`, `erp_px_cat_g1v2`) loaded by 6 `BULK INSERT` from 6 CSVs under `datasets/source_crm/` and `datasets/source_erp/` (VERIFIED).
- **Silver layer**: Deduplication via `ROW_NUMBER() OVER (...)` + `LEAD(prd_start_dt) OVER (...) - 1` window function (line 106, VERIFIED).
- **Gold layer**: **3 views** — `dim_customers`, `dim_products`, `fact_sales` (VERIFIED) = star schema (views, not tables; content model "number of tables" = 6 bronze + silver, gold as views).

### Non-Runnable Defects (VERIFIED this session)
| File | `cst_material_status` | `cst_marital_status` |
|---|---:|---:|
| `scripts/bronze/ddl_bronze.sql` | 1 | 0 |
| `scripts/Silver/proc_load_silver.sql` | 0 | 4 |
| `scripts/Silver/ddl.silver.sql` | 0 | 1 |
| `scripts/Gold/ddl_gold.sql` | 0 | 1 |
| `tests/quality_check_Silver.sql` | 0 | 1 |

→ **Column-name mismatch is real** (bronze declares `cst_material_status`; silver/gold/tests read `cst_marital_status`).

- **Hardcoded absolute paths** in `proc_load_bronze.sql`: `C:\Users\hitoy\Downloads\data_analyst_projects\sql-data-warehouse-project\datasets\source_crm\*.csv` (VERIFIED, 3 occurrences).
- Content model's separate "centry typo" limitation — grepped all 5 scripts, **NOT located** → **UNVERIFIED**.

### Tech Stack
T-SQL, SQL Server, BULK INSERT, Window Functions, Star Schema. README confirms "learning-journey warehouse project" (VERIFIED).

### Limitations (carry into panel)
1. `cst_marital_status` / `cst_material_status` column mismatch.
2. Hardcoded absolute local paths prevent portable execution.
3. Presented as a design and modelling artifact rather than a running system.

### Evidence References
- 8 `.sql` files covering load, transform, quality layers
- Medallion bronze/silver/gold procedure definitions
- `datasets/source_crm/*.csv`, `datasets/source_erp/*.csv` (6 CSVs)

---

## Project 3 — PRIMETradeAI (`primetradeai`)

**Repo URL:** https://github.com/yashmahajan11234567/PRIMETradeAI

**Repo description (VERIFIED):** "Bitcoin Market Sentiment vs Trader Behavior Analysis using SQL, Python, Machine Learning, and Streamlit Dashboard"

### Verified Structure
- `PartA/` — **9 `.sql` files** (VERIFIED): Average Trade Size, Daily PnL, Duplicate Trades, Leverage Proxy, Missing Values, Total Rows, Total Rows in Sentiment Data, Unix Timestamp to Date, Winrate + `Trader_analysis.csv` = **10,109 bytes** (the ~10 KB sample, VERIFIED via API `size` field).
- `PartB/Trader_Sentiment_Analysis.ipynb` — `RandomForestClassifier`, `KMeans` with sklearn imports (VERIFIED).
- `PartC/app.py` — Streamlit dashboard reading `Trader_analysis.csv` with columns `Daily_PnL`, `Win_Rate`, `Avg_Trade_Size`, etc. (VERIFIED head). "Six charts" is **RECORDED**.
- `PartC/requirements.txt`, `dashboard_preview.png`, `Project_Summary.pdf`.

### Data Sources (VERIFIED from README)
- Bitcoin Fear & Greed Index.
- Hyperliquid historical trader data, imported into SQL Server in Part A.

### Objective (VERIFIED from README)
"Analyze whether Bitcoin market sentiment (Fear/Greed Index) influences trader behavior and profitability." → **Analysis project, not a trading bot**. No live-trading or backtest performance results anywhere in the repo.

### Limitations (VERIFIED)
1. Only the 10 KB sample CSV is committed; source database absent → results not reproducible.
2. No `tests/` directory exists → no automated tests.

### Tech Stack (VERIFIED)
T-SQL, Python, pandas, scikit-learn (Random Forest, KMeans), Streamlit.

### Evidence References
- `PartA/` — 9 T-SQL queries + 10 KB sample CSV
- `PartB/Trader_Sentiment_Analysis.ipynb` — model notebook
- `PartC/app.py` — Streamlit dashboard
- README — objective & dataset description

---

## Project 4 — Data Analytics Dashboards (`data-analytics-dashboards`)

**Repo URL:** https://github.com/yashmahajan11234567/Projects/tree/main/Data-Analytics-Projects

### Verified Structure (4 folders, 5 dashboards)
| Folder | Files (VERIFIED) | Tool (from README) |
|---|---|---|
| `Bike-Sales-Analysis/` | `Bike.xlsx`, `bike.png`, `README.md` | Microsoft Excel |
| `COVID-19-Analysis/` | `Covid Dashboard.twbx`, `covid.png`, `README.md` | Tableau |
| `HR-Analytics-Dashboard/` | `HR.twbx`, `HR.png`, `README.md` | Tableau |
| `Netflix-Content-Analysis/` | `netflix-dashboard.twbx`, `netflix-dashboard.pbix`, `netflix-powerbi.png`, `netflix-tableu.png`, `README.md` | Tableau, Power BI |

→ **5 dashboards** (Netflix built twice, once per tool). Tool labels copied from READMEs (VERIFIED). Parent README lists same projects (VERIFIED).

### Local Previews (VERIFIED)
All 5 PNGs committed at `public/assets/dashboards/` (bike-sales, covid-19, hr-analytics, netflix-tableau, netflix-powerbi) and rendered by InfoPanel gallery with `object-fit: contain`.

### Distinct from Bluestock Mutual-Fund Work
The Bluestock mutual-fund Power BI dashboard (`mutual-fund-analysis/dashboard/bluestock_mf_dashboard.pbix`) lives inside **Bluestock-fintech** repo and is **EXCLUDED from the content model** because its input series are synthetic. The two are separate; do not merge.

### Data Sources (VERIFIED)
Public datasets: bike sales, COVID-19, HR records, Netflix titles (from folder contents + READMEs).

### Limitations (kept)
1. BI workbooks, not automated systems — no test suite.
2. Each dashboard built on a single public dataset → findings descriptive of that dataset, not generalisable.
3. `.twbx` packaged so build steps not fully inspectable from repo alone.
4. COVID-19 figures reflect dataset as published at the time, not current epidemiology.

### Tech Stack
Excel, Tableau, Power BI.

### Evidence References
- `Bike-Sales-Analysis/` — Bike.xlsx, bike.png
- `COVID-19-Analysis/` — Covid Dashboard.twbx, covid.png
- `HR-Analytics-Dashboard/` — HR.twbx, HR.png
- `Netflix-Content-Analysis/` — netflix-dashboard.twbx, netflix-dashboard.pbix, both preview images
- All 5 preview PNGs at `public/assets/dashboards/`

---

## Cross-Cutting Notes for Implementation Phase

1. **Content-model fixes to queue** (out of scope for Phase 1):
   - P1 `github` URL should point at `nifty100-financial-analysis(Bluestock-fintech)/` subfolder.
   - "11 tables" vs 10 observed in schema.sql.
   - "fails on 10 of 12 tables" phrasing (schema has 10).
   - Warehouse "centry typo" limitation unverified.
2. **PRIMETradeAI name** contains "Trade" — server art and panel must not imply live trading; panel already leads with limitations, keep that ordering.
3. **Station order** in world = `projectOrder` = strongest verified evidence first: NIFTY 100 → SQL DWH → PRIMETradeAI → Dashboards (left → right).