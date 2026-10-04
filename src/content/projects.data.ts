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
    github: 'https://github.com/yashmahajan11234567/Bluestock_fintech',
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
];