# DATA_WORLD_LAYER3_PROJECT_PROFILES.md — verified profiles of the four Core servers

Verification method: live `gh api` inspection of the four public repos under
`github.com/yashmahajan11234567/` on 2026-11-17, cross-checked against the content model
(`src/content/projects.data.ts`). Labels: **VERIFIED** = observed in the repo this session;
**RECORDED** = stated in the content model / project's own reports, not re-executed here;
**UNVERIFIED** = could not be confirmed.

All four repos exist and are public: `Bluestock-fintech` (pushed 2026-08-18),
`Sql-data-warehouse` (2026-06-02), `PRIMETradeAI` (2026-06-04), `Projects` (2026-04-18).

---

## Project 1 — Nifty-100 Financial Analysis (`nifty100-financial-analysis`)

- **Repo:** https://github.com/yashmahajan11234567/Bluestock-fintech — the project code lives in
  the subfolder `nifty100-financial-analysis(Bluestock-fintech)/` (root also holds unrelated
  scratch files and the separate `mutual-fund-analysis/`). RECOMMENDATION (not applied):
  point `github` at the subfolder path.
- **One-sentence description:** End-to-end analysis pipeline over Nifty-100 company financials:
  validate sources against accounting rules, load into SQLite, compute ratio/cash-flow KPIs and
  a scoring screen, expose via FastAPI and a Streamlit dashboard.
- **Problem it solves:** turns raw company Excel/PDF financials into validated, queryable
  metrics and screening outputs for retail-style analysis.
- **Data sources:** Excel exports under `Data/raw/` (VERIFIED directory), plus scraped documents.
- **VERIFIED structure:** `db/schema.sql` with **16 indexes** (VERIFIED count) and **10
  `CREATE TABLE` statements** (companies, profitandloss, balancesheet, cashflow, analysis,
  documents, prosandcons, sectors, stock_prices, financial_ratios) — the content model says "11
  tables"; DISCREPANCY flagged, 10 observed in schema.sql. `src/etl/validator.py` contains
  exactly **16 data-quality checks DQ-01..DQ-16** (VERIFIED), including the balance-sheet
  identity (DQ-04) and EPS sign consistency (DQ-13). `src/analytics/ratios.py` (VERIFIED),
  `src/api/main.py` FastAPI app with 8 routers (companies, documents, health, peers, portfolio,
  screener, sectors, valuation) (VERIFIED), `src/dashboard/app.py` + 8 `_pages` (VERIFIED
  Streamlit multi-page app), `src/reports/` tearsheets via reportlab, `src/nlp/` pros/cons
  parser. `requirements.txt` pins `pandas==2.3.3` and declares `scikit-learn==1.7.2` (VERIFIED).
- **Tests:** `tests/` tree contains **787 `def test_` functions** across ~24 files (VERIFIED
  count). The content model's "714 tests, 699 passing" is the project's recorded pytest run —
  RECORDED, not re-run here.
- **Results (RECORDED, from the content model / project reports):** 92 companies, 5,520 stock
  prices, 3,484 ratio rows in the live DB; TCS FY2024 cross-checked against published figures
  (ROE 50.94%, D/E 0.089, ICR 87.1); "699 of 714 tests pass".
- **Limitations (honest, kept):** shipped ETL load is not idempotent (RECORDED; note schema has
  10 tables, so "fails on 10 of 12 tables" is UNVERIFIED as written); 14/714 tests fail under
  pandas 3.0.5, project pins 2.3.3 (pin VERIFIED); scikit-learn declared but not executed in
  the audited environment (declaration VERIFIED).
- **Tech stack:** Python, pandas, SQLite, T-SQL, FastAPI, Streamlit, pytest, reportlab.
- **Suggested server short label:** `NIFTY100` · banner: `NIFTY-100 FINANCIAL ANALYSIS`
- **Suggested panel content:** as in the content model — 6-stage warehouse flow
  (Source→Validate→Store→Analyse→Screen→Deliver), the three recorded results, the three
  limitations verbatim, evidence pointers (`db/schema.sql`, `src/etl/validator.py`,
  `src/analytics/ratios.py`, `tests/`).

## Project 2 — SQL Data Warehouse & ETL (`sql-data-warehouse`)

- **Repo:** https://github.com/yashmahajan11234567/Sql-data-warehouse
- **One-sentence description:** a medallion (bronze/silver/gold) SQL Server warehouse over CRM/ERP
  CSVs, with star-schema gold views and per-layer data-quality checks — a design/modelling artifact.
- **VERIFIED structure:** exactly **8 .sql files**: `init_database.sql`,
  `bronze/{ddl_bronze,proc_load_bronze}.sql`, `Silver/{ddl.silver,proc_load_silver}.sql` +
  Readme, `Gold/ddl_gold.sql`, `tests/{quality_check_Silver,quality_check_Gold}.sql`.
  Bronze: **6 tables** (`crm_cust_info`, `crm_prd_info`, `crm_sales_details`, `erp_loc_a101`,
  `erp_cust_az12`, `erp_px_cat_g1v2`) loaded by **6 BULK INSERTs** from `datasets/source_crm`
  and `datasets/source_erp` (6 CSVs, VERIFIED). Silver: dedup via `ROW_NUMBER() OVER (...)`
  (VERIFIED) and `LEAD(prd_start_dt) OVER (...) - 1` window function (VERIFIED line 106).
  Gold: **3 views** — `dim_customers`, `dim_products`, `fact_sales` (VERIFIED) = the star schema
  (views, not tables — the content model's "star schema" is VERIFIED, "number of tables"
  = 6 bronze + silver tables, gold as views).
- **Non-runnable defects VERIFIED this session:** bronze DDL declares `cst_material_status`
  while `proc_load_silver.sql`, `ddl_gold.sql` and `quality_check_Silver.sql` read
  `cst_marital_status` — the column-name mismatch is real. BULK INSERT paths are hardcoded
  absolute local paths (`C:\Users\hitoy\Downloads\...`) — portability limitation VERIFIED.
  The content model's separate "centry typo" limitation was NOT located in the five scripts
  grepped — UNVERIFIED.
- **Tech stack:** T-SQL, SQL Server, BULK INSERT, window functions, star schema. README
  confirms it is a learning-journey warehouse project (VERIFIED).
- **Limitations (all carry into the panel):** the marital/material column mismatch; hardcoded
  absolute paths; "presented as a design and modelling artifact rather than a running system".
- **Suggested server short label:** `DWH-ETL` · banner: `SQL DATA WAREHOUSE & ETL`
- **Suggested panel content:** 5-stage pipeline (CSV→Bronze→Silver→Gold→Quality tests), the
  verified bronze/silver/gold structure above, limitations verbatim.

## Project 3 — PRIMETradeAI (`primetradeai`)

- **Repo:** https://github.com/yashmahajan11234567/PRIMETradeAI — repo description: "Bitcoin
  Market Sentiment vs Trader Behavior Analysis using SQL, Python, Machine Learning, and Streamlit
  Dashboard" (VERIFIED).
- **One-sentence description:** analysis of whether Bitcoin market sentiment (Fear & Greed Index)
  relates to Hyperliquid trader behavior and profitability — SQL preparation, ML models, Streamlit
  dashboard. **It is an analysis project, not a trading bot**: README objective is "analyze
  whether sentiment influences trader behavior and profitability" (VERIFIED). There are no
  live-trading or backtest performance results anywhere in the repo, and none may be presented.
- **VERIFIED structure:** `PartA/` = **9 .sql files** (VERIFIED count: Average Trade Size, Daily
  PnL, Duplicate Trades, Leverage Proxy, Missing Values, Total Rows, Total Rows in Sentiment
  Data, Unix Timestamp to Date, Winrate) + `Trader_analysis.csv` = **10,109 bytes** (the ~10 KB
  sample — VERIFIED). `PartB/Trader_Sentiment_Analysis.ipynb` contains `RandomForestClassifier`
  and `KMeans` with sklearn imports (VERIFIED). `PartC/app.py` Streamlit dashboard reading
  `Trader_analysis.csv` with Daily_PnL / Win_Rate / Avg_Trade_Size etc. columns (VERIFIED head);
  "six charts" is RECORDED. `PartC/requirements.txt`, `dashboard_preview.png`, `Project_Summary.pdf`.
- **Data sources (VERIFIED from README):** Bitcoin Fear & Greed Index + Hyperliquid historical
  trader data, imported into SQL Server in Part A.
- **Limitations VERIFIED:** only the 10 KB sample CSV is committed (source DB absent → results
  not reproducible); no `tests/` directory exists (no automated tests — VERIFIED).
- **Tech stack:** T-SQL, Python, pandas, scikit-learn (Random Forest, KMeans), Streamlit.
- **Suggested server short label:** `PRIME` · banner: `PRIMETRADEAI — SENTIMENT ANALYSIS`
- **Suggested panel content:** 4-stage flow (Trade data→T-SQL KPIs→Model→Dashboard); state
  plainly in the panel that this is sentiment-vs-behavior ANALYSIS on a 10 KB sample, with no
  live trading and no performance claims; limitations verbatim.

## Project 4 — Data Analytics Dashboards (`data-analytics-dashboards`)

- **Repo:** https://github.com/yashmahajan11234567/Projects/tree/main/Data-Analytics-Projects
- **One-sentence description:** five interactive BI dashboards (Excel, Tableau, Power BI) over
  public datasets, each committed with its source workbook/report file and a real preview PNG —
  ONE repository, therefore ONE project with five views.
- **VERIFIED structure:** 4 folders — `Bike-Sales-Analysis/` (Bike.xlsx, bike.png, README "Tool
  Used: Microsoft Excel"), `COVID-19-Analysis/` ("Covid Dashboard.twbx", covid.png, README
  Tableau), `HR-Analytics-Dashboard/` (HR.twbx, HR.png, README "Tool Used: Tableau"),
  `Netflix-Content-Analysis/` (netflix-dashboard.twbx + netflix-dashboard.pbix +
  netflix-powerbi.png + netflix-tableu.png [sic], README "Tools Used: Tableau, Power BI").
  → **5 dashboards** (Netflix built twice, once per tool), all tool labels copied from the
  READMEs (VERIFIED). Parent README lists the same projects (VERIFIED).
- **Local previews VERIFIED:** all 5 PNGs committed at `public/assets/dashboards/`
  (bike-sales, covid-19, hr-analytics, netflix-tableau, netflix-powerbi) and rendered by the
  InfoPanel gallery with `object-fit: contain`.
- **Distinct from the Bluestock mutual-fund Power BI work:** that dashboard
  (`mutual-fund-analysis/dashboard/bluestock_mf_dashboard.pbix`) lives inside the
  **Bluestock-fintech** repo and is deliberately EXCLUDED from the content model because its
  input series are synthetic. The two are separate; do not merge.
- **Data sources:** public datasets — bike sales, COVID-19, HR records, Netflix titles (VERIFIED
  from folder contents + READMEs).
- **Limitations (kept):** BI workbooks, not automated systems (no test suite); single public
  dataset each, so findings are descriptive of that dataset; .twbx packaged so build steps not
  fully inspectable; COVID figures as-published at the time.
- **Tech stack:** Excel, Tableau, Power BI.
- **Suggested server short label:** `DASH` · banner: `DATA ANALYTICS DASHBOARDS`
- **Suggested panel content:** the DashboardGallery (5 real previews with per-dashboard tool +
  summary), technologies, 4-stage flow (Collect→Model→Build→Publish), evidence folder list,
  limitations verbatim.

---

## Cross-cutting notes for the implementation phase

1. Content-model fixes to queue (out of scope for this phase, recorded here): P1 `github` URL
   should point at the `nifty100-financial-analysis(Bluestock-fintech)/` subfolder; "11 tables"
   vs 10 observed; "10 of 12 tables" phrasing; warehouse "centry typo" unverified.
2. PRIMETradeAI's name contains "Trade" — the server art and panel must not imply live trading;
   the panel already leads with limitations, keep that ordering.
3. Station order in the world = `projectOrder` = the order above (strongest verified evidence
   first), which also sets server positions left→right: NIFTY100, DWH-ETL, PRIME, DASH.
