# DATA_WORLD_PROJECT_CARDS_CONTENT.md
*Phase 1 — proposed final copy for all four project cards. Ready for implementation. Structure per brief: Title · GitHub URL · Description · Skills & Technologies · PROJECT OVERVIEW (PROBLEM, SOLUTION, IMPACT).*

---

## Project 1 — NIFTY 100 Financial Analysis

**GitHub URL:** https://github.com/yashmahajan11234567/Bluestock-fintech/tree/main/nifty100-financial-analysis(Bluestock-fintech)

**Description**
An end-to-end financial analysis pipeline over Nifty-100 company data: raw Excel exports are validated against 16 accounting rules, loaded into a 10-table SQLite database with 16 indexes, analysed for profitability, solvency and cash-flow KPIs, then exposed via a FastAPI service and a multi-page Streamlit dashboard.

**Skills & Technologies**
Python · pandas · SQLite · T-SQL · FastAPI · Streamlit · pytest · reportlab

**PROJECT OVERVIEW**

**PROBLEM**
Retail-grade financial analysis requires validated, queryable company fundamentals, but public financial statements arrive as unstructured Excel/PDF exports with inconsistent schemas, missing values, and accounting errors that break automated ratios.

**SOLUTION**
Built a six-stage warehouse pipeline: (1) Source — ingest Excel exports; (2) Validate — 16 data-quality rules (DQ-01..DQ-16) including balance-sheet identity and EPS sign checks; (3) Store — 10-table SQLite schema with foreign keys and 16 indexes; (4) Analyse — ROE, debt-to-equity, interest coverage, CAGR, cash-flow KPIs computed in `ratios.py`; (5) Screen — winsorized multi-factor scoring; (6) Deliver — 8 FastAPI routers and a Streamlit multi-page dashboard. Tearsheet PDFs generated via `reportlab`.

**IMPACT**
- Live database: 92 companies, 5,520 stock prices, 3,484 ratio rows.
- TCS FY2024 cross-checked against published figures — ROE 50.94%, D/E 0.089, ICR 87.1.
- 699 of 714 tests pass (recorded pytest run; project pins pandas 2.3.3).
- Limitations acknowledged: ETL load not idempotent (fails on all 10 tables); 14 tests fail under pandas 3.0.5; scikit-learn declared but not executed.

---

## Project 2 — SQL Data Warehouse & ETL

**GitHub URL:** https://github.com/yashmahajan11234567/Sql-data-warehouse

**Description**
A medallion-architecture SQL Server warehouse over CRM/ERP CSV sources: six bronze tables loaded via `BULK INSERT`, deduplicated and windowed in silver using `ROW_NUMBER()` and `LEAD()`, then modelled as a three-view star schema (dim_customers, dim_products, fact_sales) in gold, with per-layer data-quality assertion scripts. Presented as a design and modelling artifact.

**Skills & Technologies**
T-SQL · SQL Server · BULK INSERT · Window Functions · Star Schema

**PROJECT OVERVIEW**

**PROBLEM**
Analytics teams need a clean, dimensional model over messy operational CSVs, but raw extracts contain duplicates, inconsistent keys, and temporal gaps that prevent reliable reporting without a structured transformation layer.

**SOLUTION**
Implemented the medallion pattern in eight SQL scripts: (1) Bronze — six `BULK INSERT` procedures staging raw CSVs without transformation; (2) Silver — deduplication via `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)` and surrogate key generation with `LEAD(prd_start_dt) OVER (...) - 1` for SCD2-style effective ranges; (3) Gold — three star-schema views (`dim_customers`, `dim_products`, `fact_sales`) built for reporting; (4) Quality tests — assertion scripts at silver and gold layers verifying row counts, null constraints, and referential integrity.

**IMPACT**
- Bronze: 6 tables, 6 CSVs loaded.
- Silver: deduplicated and windowed transforms using ANSI-SQL window functions.
- Gold: 3 views forming a complete star schema for BI connectivity.
- **Known limitations (non-runnable):** bronze declares `cst_material_status` while silver/gold/tests read `cst_marital_status` (column-name mismatch); `BULK INSERT` paths are hardcoded absolute local paths (`C:\Users\hitoy\Downloads\...`); the project is a modelling artifact, not a portable running system.

---

## Project 3 — PRIMETradeAI

**GitHub URL:** https://github.com/yashmahajan11234567/PRIMETradeAI

**Description**
Analysis of whether Bitcoin market sentiment (Fear & Greed Index) relates to Hyperliquid trader behavior and profitability — SQL preparation, supervised/unsupervised ML models, and a Streamlit dashboard. **This is an analysis project, not a trading bot**; no live-trading or backtest performance results are claimed.

**Skills & Technologies**
T-SQL · Python · pandas · scikit-learn (Random Forest, KMeans) · Streamlit

**PROJECT OVERVIEW**

**PROBLEM**
Market sentiment indicators are widely cited but rarely tested against actual trader PnL and behavior at the individual-account level. A reproducible analysis requires aligning daily sentiment with granular trade records and measuring predictive power.

**SOLUTION**
Four-stage analytics workflow: (1) Trade data — Hyperliquid historical records + Bitcoin Fear & Greed Index imported into SQL Server; (2) T-SQL KPIs — nine analytical queries (average trade size, daily PnL, duplicates, leverage proxy, missing values, row counts, sentiment rows, timestamp conversion, winrate); (3) Model — `RandomForestClassifier` for directional prediction and `KMeans` for trader segmentation in a Jupyter notebook; (4) Dashboard — Streamlit app (`PartC/app.py`) reading the 10 KB consolidated `Trader_analysis.csv` with six charts over Daily_PnL, Win_Rate, Avg_Trade_Size, etc.

**IMPACT**
- 9 T-SQL queries prepared the consolidated analysis table.
- ML models trained on the 10,109-byte sample CSV (`PartA/Trader_analysis.csv`).
- Streamlit dashboard visualises six sentiment-vs-behavior views.
- **Critical limitations:** only the 10 KB sample CSV is committed (source database absent → results not reproducible); no automated test suite exists. This is a sentiment-vs-behavior analysis artifact, not a live trading system.

---

## Project 4 — Data Analytics Dashboards

**GitHub URL:** https://github.com/yashmahajan11234567/Projects/tree/main/Data-Analytics-Projects

**Description**
A collection of five interactive BI dashboards built in Excel, Tableau, and Power BI over public datasets. Each dashboard ships with its committed source workbook or report file (`.xlsx`, `.twbx`, `.pbix`) and a real preview PNG so every figure on screen is reproducible from the repository. One repository = one project with five views.

**Skills & Technologies**
Excel · Tableau · Power BI

**PROJECT OVERVIEW**

**PROBLEM**
Portfolio reviewers cannot verify dashboard claims from screenshots alone. A credible showcase must ship the actual workbook/report files so structure, calculations, and filters are inspectable, not just the rendered output.

**SOLUTION**
Built five dashboards across three tools, each committed with its source file and a real preview image under `public/assets/dashboards/`:
1. **Bike Sales Dashboard** (Excel) — customer purchasing behavior by income, age, commute distance.
2. **COVID-19 Dashboard** (Tableau) — global cases, deaths by continent, country population impact over time.
3. **HR Analytics Dashboard** (Tableau) — employee demographics, salary distribution across roles/ages, hiring vs termination trends.
4. **Netflix Content Analysis** (Tableau) — catalogue by genre, country, release year, rating classification with interactive filters.
5. **Netflix Content Analysis** (Power BI) — same analysis rebuilt as a `.pbix` report showing genre mix, country map, growth by year.
Pipeline: Collect (public datasets) → Model (segment/aggregate in the tool) → Build (interactive pages with filters/drill-down) → Publish (committed `.xlsx`, `.twbx`, `.pbix` + preview PNGs).

**IMPACT**
- 5 dashboards, 3 tools, all source files committed for reproducibility.
- Previews rendered with `object-fit: contain` preserving true aspect ratios (962×593 to 2024×1449).
- **Limitations:** BI workbooks, not automated systems (no test suite); single public dataset each → findings descriptive, not generalisable; `.twbx` packaged so build steps not fully inspectable; COVID-19 figures as-published at dataset time. **Distinct from** the separate Bluestock mutual-fund Power BI work (synthetic inputs, excluded from this project).