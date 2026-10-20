/**
 * DATA world projects.
 *
 * Order is by strength of verified evidence, not by preference.
 *
 * LIMITATIONS ARE PRESERVED, NOT HIDDEN
 *
 * Each project below carries the limitations the audit actually found. The SQL
 * warehouse will not run; the Bluestock ETL fails on most tables; PRIMETradeAI
 * ships only a sample dataset. Recording these in the content model is
 * deliberate: a portfolio that hides a known defect is less defensible under
 * questioning than one that states it. The limitation travels WITH the project,
 * so any future panel or game object renders it rather than omitting it.
 *
 * The Mutual Fund analytics work is absent from this file on purpose. Its input
 * series are synthetic, so its outputs are not valid findings. The code is real;
 * the numbers are not, and a portfolio must not present them as results.
 */

import type { Project } from './types';

export const DATA_PROJECTS: readonly Project[] = [
  {
    id: 'nifty100-financial-analysis',
    title: 'Nifty-100 Financial Analysis',
    world: 'data',
    authorship: 'solo',
    contribution:
      'Designed the schema, built the validation rule engine, implemented the ratio and cash-flow analytics, and shipped the API and dashboard.',
    description:
      'An end-to-end financial analysis pipeline over Nifty-100 company data: sources are validated against accounting rules, loaded into a relational model, analysed for profitability and solvency, then exposed through an API and a dashboard.',
    technologies: [
      'Python',
      'pandas',
      'SQLite',
      'T-SQL',
      'FastAPI',
      'Streamlit',
      'pytest',
      'reportlab',
    ],
    workflow: {
      metaphor: 'warehouse',
      stages: [
        { id: 'source', label: 'Source', detail: 'Excel exports of company financials' },
        {
          id: 'validate',
          label: 'Validate',
          detail: '16 accounting-aware data-quality rules, including the balance-sheet identity and EPS sign checks',
        },
        {
          id: 'store',
          label: 'Store',
          detail: 'SQLite, 11 tables with 16 indexes and foreign keys',
        },
        {
          id: 'analyse',
          label: 'Analyse',
          detail: 'ROE, debt-to-equity, interest coverage, CAGR, and cash-flow KPIs',
        },
        { id: 'screen', label: 'Screen', detail: 'Winsorized multi-factor scoring' },
        { id: 'deliver', label: 'Deliver', detail: 'FastAPI endpoints and a Streamlit dashboard' },
      ],
    },
    results: [
      'Live database measurement: 92 companies, 5,520 stock prices, 3,484 ratio rows',
      'TCS FY2024 verified against published figures — ROE 50.94%, D/E 0.089, ICR 87.1',
      '699 of 714 tests pass',
    ],
    limitations: [
      'The shipped ETL load is not idempotent and fails on 10 of 12 tables in its recorded run',
      '14 of 714 tests fail under the installed pandas 3.0.5; the project pins 2.3.3',
      'scikit-learn is declared but was not executed in the audited environment',
    ],
    github: 'https://github.com/yashmahajan11234567/Bluestock-fintech',
    evidence: [
      'db/schema.sql — 11-table schema with 16 indexes',
      'validator.py — the 16 data-quality rules',
      'ratios.py — ratio formulas, live-validated against TCS FY2024',
      'tests/ — 714 tests, 699 passing',
    ],
  },
  {
    id: 'sql-data-warehouse',
    title: 'SQL Data Warehouse & ETL',
    world: 'data',
    authorship: 'solo',
    contribution:
      'Wrote the medallion pipeline, the dimensional modelling, and the data-quality test scripts.',
    description:
      'A layered SQL Server warehouse built with the medallion pattern: raw bronze ingestion, deduplicated and windowed silver transforms, and a gold star schema, with data-quality tests at each layer.',
    technologies: ['T-SQL', 'SQL Server', 'BULK INSERT', 'Window Functions', 'Star Schema'],
    workflow: {
      metaphor: 'pipeline-vessel',
      stages: [
        { id: 'csv', label: 'CSV inputs', detail: 'Flat files staged for load' },
        { id: 'bronze', label: 'Bronze', detail: 'BULK INSERT into raw tables, no transformation' },
        {
          id: 'silver',
          label: 'Silver',
          detail: 'Deduplication plus LEAD() window functions',
        },
        { id: 'gold', label: 'Gold', detail: 'Star schema built for reporting' },
        { id: 'dq', label: 'Quality tests', detail: 'Assertion scripts per layer' },
      ],
    },
    limitations: [
      'Currently non-runnable: a silver procedure reads cst_marital_status while bronze declares cst_material_status',
      'A centry typo in a column reference',
      'Hardcoded absolute local paths in the SQL scripts prevent portable execution',
      'Presented as a design and modelling artifact rather than a running system',
    ],
    github: 'https://github.com/yashmahajan11234567/Sql-data-warehouse',
    evidence: [
      'Eight .sql files covering load, transform, and quality layers',
      'Medallion bronze/silver/gold procedure definitions',
    ],
  },
  {
    id: 'primetradeai',
    title: 'PRIMETradeAI',
    world: 'data',
    authorship: 'solo',
    contribution:
      'Built the T-SQL analysis queries, the scikit-learn models, and the Streamlit dashboard.',
    description:
      'A crypto-market analysis project that queries trade data with T-SQL, applies supervised and unsupervised learning, and presents the results in a Streamlit dashboard.',
    technologies: ['T-SQL', 'Python', 'pandas', 'scikit-learn', 'Random Forest', 'KMeans', 'Streamlit'],
    workflow: {
      metaphor: 'analytics-terminal',
      stages: [
        { id: 'trades', label: 'Trade data', detail: 'Hyperliquid trade records' },
        { id: 'sql', label: 'T-SQL KPIs', detail: 'Nine analytical queries over the trade history' },
        { id: 'ml', label: 'Model', detail: 'Random Forest for prediction, KMeans for segmentation' },
        { id: 'dashboard', label: 'Dashboard', detail: 'Streamlit UI with six charts' },
      ],
    },
    limitations: [
      'Only a 10 KB sample CSV is committed; the source database is absent, so results are not reproducible',
      'No automated tests',
    ],
    github: 'https://github.com/yashmahajan11234567/PRIMETradeAI',
    evidence: ['PartA/ — nine T-SQL queries', 'PartB/ — model notebook', 'PartC/app.py — Streamlit dashboard'],
    },
    {
      id: 'data-analytics-dashboards',
      title: 'Data Analytics Dashboards',
      world: 'data',
      authorship: 'solo',
      contribution:
        'Built five dashboards across three BI tools, each committed with its source workbook or report file.',
      description:
        'A collection of five interactive dashboards built in Excel, Tableau and Power BI. Each dashboard ships with its committed source file — a workbook, a .twbx, or a .pbix — so every figure on screen is reproducible from the repository rather than mocked up.',
      technologies: ['Excel', 'Tableau', 'Power BI'],
      workflow: {
        metaphor: 'analytics-terminal',
        stages: [
          { id: 'collect', label: 'Collect', detail: 'Public datasets: bike sales, COVID-19, HR records, Netflix titles' },
          { id: 'model', label: 'Model', detail: 'Segment and aggregate in the tool the dashboard ships in' },
          { id: 'build', label: 'Build', detail: 'Interactive report pages with filters and drill-down' },
          { id: 'publish', label: 'Publish', detail: 'Committed as .xlsx, .twbx and .pbix alongside a preview image' },
        ],
      },
      /*
       * THE FIVE DASHBOARDS ARE ONE PROJECT, NOT FIVE
       *
       * All five live in a single repository under
       * `Projects/Data-Analytics-Projects`, so they are one body of work with five
       * views. Splitting them into top-level world stations would have claimed
       * eight projects instead of four and overstated a single repo as five
       * separate builds.
       *
       * EVERY PREVIEW IS THE REAL COMMITTED IMAGE
       *
       * `previewPath` files are committed under `public/assets/dashboards/` and were
       * copied from the repository itself — not generated, not redrawn. The audit
       * measured each one to confirm it is a real PNG and to record its true
       * aspect ratio, because they differ sharply (962x593 up to 2024x1449) and the
       * panel renders them with `object-fit: contain` so none is ever stretched.
       *
       * `technology` is copied from each dashboard's own README. HR Analytics is
       * Tableau because that folder contains `HR.twbx` and its README states
       * "Tool Used: Tableau" — the explicit "verify exact technology" step, not a
       * guess from the screenshot. Netflix appears twice because it genuinely was
       * built twice, once per tool, which is why both files sit in that folder.
       */
      dashboards: [
        {
          id: 'bike-sales',
          title: 'Bike Sales Dashboard',
          technology: 'Excel',
          previewPath: '/assets/dashboards/bike-sales.png',
          summary:
            'Customer purchasing behaviour segmented by income, age and commute distance, in an interactive Excel dashboard.',
        },
        {
          id: 'covid-19',
          title: 'COVID-19 Dashboard',
          technology: 'Tableau',
          previewPath: '/assets/dashboards/covid-19.png',
          summary:
            'Global COVID-19 trends: cases, deaths by continent, and country population impact over time.',
        },
        {
          id: 'hr-analytics',
          title: 'HR Analytics Dashboard',
          technology: 'Tableau',
          previewPath: '/assets/dashboards/hr-analytics.png',
          summary:
            'Employee demographics, salary distribution across roles and ages, and hiring against termination trends.',
        },
        {
          id: 'netflix-tableau',
          title: 'Netflix Content Analysis',
          technology: 'Tableau',
          previewPath: '/assets/dashboards/netflix-tableau.png',
          summary:
            'Netflix catalogue analysed by genre, country and release year, with rating classification and interactive filtering.',
        },
        {
          id: 'netflix-powerbi',
          title: 'Netflix Content Analysis',
          technology: 'Power BI',
          previewPath: '/assets/dashboards/netflix-powerbi.png',
          summary:
            'The same Netflix analysis rebuilt in Power BI as a .pbix report, showing genre mix, country map and growth by year.',
        },
      ],
      limitations: [
        'These are BI workbooks and report files, not automated systems — nothing here has a test suite',
        'Each dashboard is built on a single public dataset, so the findings are descriptive of that dataset and are not generalisable claims',
        'Several workbooks are packaged (.twbx) rather than openable source, so the build steps are not fully inspectable from the repository alone',
        'COVID-19 figures reflect the dataset as published at the time and are not a current epidemiological source',
      ],
      github: 'https://github.com/yashmahajan11234567/Projects/tree/main/Data-Analytics-Projects',
      evidence: [
        'Bike-Sales-Analysis/ — Bike.xlsx and bike.png',
        'COVID-19-Analysis/ — Covid Dashboard.twbx and covid.png',
        'HR-Analytics-Dashboard/ — HR.twbx and HR.png',
        'Netflix-Content-Analysis/ — netflix-dashboard.twbx, netflix-dashboard.pbix, and both preview images',
      ],
    },
  ];