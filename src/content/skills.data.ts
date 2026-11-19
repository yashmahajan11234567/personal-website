/**
 * DATA world skill set — exactly six primary visible skills.
 *
 * THE AXIS IS THE TOOL, NOT THE TECHNIQUE
 *
 * The Data World presents six stations: SQL, Python, Excel, Power BI, Tableau,
 * Streamlit. These are the tools the work was actually done in, and each one has
 * a committed repository with a working artifact behind it. An earlier pass
 * modelled the axis as technique instead — SQL, ETL, Data Quality, Regex NLP,
 * Screening, Visualisation — which produced seven stations with no dashboard,
 * no BI tool and no spreadsheet in the world at all, despite all three being
 * among the most substantial verified work.
 *
 * WHAT HAPPENED TO THE FOUR RETIRED TECHNIQUES
 *
 * ETL, Data Quality Engineering, Regex NLP and Scoring/Screening were real,
 * audit-verified work and none of it has been thrown away. It is demoted to
 * EVIDENCE inside the skills that actually exercise it:
 *
 *   ETL + Data Quality  -> SQL      (medallion load, DQ-04, DQ-13)
 *   Regex + Screening   -> Python   (compiled parsers, winsorize-and-scale)
 *
 * They are no longer rooms to walk into, but every claim they carried survives
 * on the station whose repository contains the code. Deleting them outright
 * would have discarded verified evidence; promoting them back to stations would
 * have contradicted the approved six-skill list.
 *
 * EVIDENCE DISCIPLINE, UNCHANGED
 *
 * Every `evidence` line below traces to the approved evidence audit
 * (`.hermes/plans/2026-10-04_021500-portfolio-evidence-audit.md`). Nothing is
 * inferred, and no metric appears that the audit did not verify by execution or
 * direct measurement. Repository references are absolute URLs validated by
 * `content/index.ts` at load — the previous bare-name `repository` field put a
 * comma-separated string straight into an `href` and broke every skill link.
 */

import type { Skill } from './types';

/** The fintech analytics app. Two of the six skills are demonstrated here. */
const REPO_FINTECH = {
  name: 'Bluestock-fintech',
  // Renamed on GitHub (was `Bluestock_fintech`, which 404s since the rename).
  url: 'https://github.com/yashmahajan11234567/Bluestock-fintech',
} as const;

/** The Power BI mutual-fund dashboard folder inside the fintech app. */
const REPO_FINTECH_PB_DASHBOARDS = {
  name: 'Bluestock-fintech mutual-fund-analysis/dashboard',
  url: 'https://github.com/yashmahajan11234567/Bluestock-fintech/tree/main/mutual-fund-analysis/dashboard',
} as const;

/** The medallion SQL Server warehouse. */
const REPO_WAREHOUSE = {
  name: 'Sql-data-warehouse',
  url: 'https://github.com/yashmahajan11234567/Sql-data-warehouse',
} as const;

/** The crypto-market analysis project: T-SQL queries, ML models, Streamlit app. */
const REPO_PRIME = {
  name: 'PRIMETradeAI',
  url: 'https://github.com/yashmahajan11234567/PRIMETradeAI',
} as const;

/** The BI dashboard collection. Excel, Power BI and Tableau all live here. */
const REPO_DASHBOARDS = {
  name: 'Projects/Data-Analytics-Projects',
  url: 'https://github.com/yashmahajan11234567/Projects/tree/main/Data-Analytics-Projects',
} as const;

export const DATA_SKILLS: readonly Skill[] = [
  {
    id: 'sql',
    name: 'SQL / T-SQL',
    world: 'data',
    category: 'storage',
    summary: 'Schema design, medallion pipelines and star-schema modelling in T-SQL.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Handwritten 11-table relational schema with 16 indexes and foreign-key relationships',
        'Medallion bronze/silver/gold layering implemented as T-SQL stored procedures',
        'Window functions including LEAD() for dedup logic; star-schema gold layer',
        'Eight .sql files read directly: load, transform, and data-quality test scripts',
        'ETL: proc_load_bronze and proc_load_silver implement the layered load, with a per-table load audit rather than silent failure',
        'Data quality: 16 accounting-aware rules, including DQ-04 asserting the balance-sheet identity and DQ-13 asserting EPS sign consistency',
        'Nine analytical T-SQL queries over trade history in PRIMETradeAI',
      ],
      usage:
        'I designed and hand-wrote an 11-table relational schema with foreign keys and 16 supporting indexes, then implemented the bronze/silver/gold load as T-SQL stored procedures with a per-table load audit. Data quality runs as 16 test scripts, including the accounting-aware DQ-04 balance-sheet identity and the DQ-13 EPS sign rule. In PRIMETradeAI I wrote nine analytical T-SQL queries over the trade-history tables.',
      applications: [
        {
          project: 'SQL Data Warehouse & ETL',
          contribution: 'The warehouse itself: the 11-table schema, 16 indexes, medallion stored procedures and the 16-rule DQ suite.',
          repository: REPO_WAREHOUSE,
        },
        {
          project: 'Nifty-100 Financial Analysis',
          contribution: 'SQL Server backend for the analytics application; the FastAPI layer serves the same database rows the Streamlit dashboard displays.',
          repository: REPO_FINTECH,
        },
        {
          project: 'PRIMETradeAI',
          contribution: 'Nine analytical T-SQL queries over the trade history for the sentiment-vs-behaviour study.',
          repository: REPO_PRIME,
        },
      ],
      repositories: [REPO_WAREHOUSE, REPO_FINTECH, REPO_PRIME],
    },
    visual: { kind: 'database-terminal', treatment: 'solid' },
  },
  {
    id: 'python',
    name: 'Python / pandas',
    world: 'data',
    category: 'analysis',
    summary: 'Analysis applied to validated data, plus a large test suite that pins the result.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Screener script applying winsorize-and-scale before scoring',
        'pandas used across ratio, CAGR, and cash-flow modules',
        '699 of 714 tests pass; the 14 failures trace to pandas 3.0.5 dtype drift against a 2.3.3 pin',
        'scikit-learn is declared but was NOT executed in this environment',
        'Regex NLP: four compiled patterns extract structured fields from unstructured text, cross-validated against an independent calculation',
        'Screening: multi-factor winsorize-and-scale scoring, with KMeans clustering and an elbow-method implementation present in the code',
        'Random Forest and KMeans models in PRIMETradeAI over the trade history',
      ],
      usage:
        'pandas for the ratio, CAGR and cash-flow calculation modules behind the screener, which winsorizes and scales features before scoring; four compiled regex patterns for the NLP extraction, cross-validated against an independent calculation; 699 of 714 tests pass, with the 14 failures traced to pandas 3.0.5 dtype drift against the pinned 2.3.3. In PRIMETradeAI, Random Forest and KMeans models over the trade history.',
      applications: [
        {
          project: 'Nifty-100 Financial Analysis',
          contribution: 'The screener and the pandas analysis modules (ratio, CAGR, cash flow), plus the test suite — 699 of 714 tests passing.',
          repository: REPO_FINTECH,
        },
        {
          project: 'PRIMETradeAI',
          contribution: 'Random Forest and KMeans modelling over the trade history.',
          repository: REPO_PRIME,
        },
      ],
      repositories: [REPO_FINTECH, REPO_PRIME],
    },
    visual: { kind: 'code-station', treatment: 'solid' },
  },
  {
    id: 'excel',
    name: 'Excel',
    world: 'data',
    category: 'delivery',
    summary: 'Interactive dashboard modelling delivered straight from a committed workbook.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Bike Sales Analysis shipped as an interactive Excel dashboard, committed as Bike.xlsx',
        'Customer segmentation on income, age and commute distance',
        'Income-versus-purchase visualisation built in the workbook',
        'The dashboard states its own findings: higher income raises purchase probability, middle-aged customers contribute the most, and shorter commutes convert better',
      ],
      usage:
        'In the Bike Sales Analysis I segmented customers on income, age and commute distance from the raw Bike.xlsx data and built the income-vs-purchase visualisation; the dashboard states its findings from those segments.',
      applications: [
        {
          project: 'Data Analytics Dashboards',
          contribution: 'Bike Sales Dashboard (Bike.xlsx): customer segmentation on income, age and commute distance, and the income-vs-purchase chart.',
          repository: REPO_DASHBOARDS,
        },
      ],
      repositories: [REPO_DASHBOARDS],
    },
    visual: { kind: 'analytics-monitor', treatment: 'solid' },
  },
  {
    id: 'power-bi',
    name: 'Power BI',
    world: 'data',
    category: 'delivery',
    summary: 'Mutual-fund dashboards in Bluestock Fintech plus the Netflix content analysis, both as committed .pbix reports.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Bluestock Fintech Power BI report committed as bluestock_mf_dashboard.pbix.pbix with four dashboard views: Fund Performance, Industry Overview, Investor Analytics, and SIP & Market Trends',
        'Netflix Content Analysis committed as netflix-dashboard.pbix',
        'Genre distribution, country map, rating classification and year-on-year trend views',
        'Interactive filtering across the report pages',
        'The Netflix report states its own findings: movies are about 70% of the catalogue, Drama and International Movies lead, and production rises sharply after 2015',
      ],
      usage:
        'Built interactive Power BI dashboards to analyse mutual fund performance, industry trends, investor behaviour, and SIP/market trends. Also developed a Netflix Content Analysis report covering genre distribution, country-wise analysis, rating classification, yearly trends, and interactive filtering.',
      applications: [
        {
          project: 'Bluestock Fintech — Mutual Fund Analysis',
          contribution:
            'Four Power BI dashboard views in bluestock_mf_dashboard.pbix.pbix: Fund Performance, Industry Overview, Investor Analytics, and SIP & Market Trends.',
          repository: REPO_FINTECH_PB_DASHBOARDS,
        },
        {
          project: 'Data Analytics Dashboards',
          contribution:
            'Netflix Content Analysis (.pbix): genre distribution, country mapping, rating classification, year-on-year trends and interactive filters.',
          repository: REPO_DASHBOARDS,
        },
      ],
      repositories: [REPO_FINTECH_PB_DASHBOARDS, REPO_DASHBOARDS],
    },
    visual: { kind: 'analytics-monitor', treatment: 'solid' },
  },
  {
    id: 'tableau',
    name: 'Tableau',
    world: 'data',
    category: 'delivery',
    summary: 'Three committed Tableau workbooks: COVID-19, HR analytics and Netflix.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'COVID-19 Analysis committed as Covid Dashboard.twbx: global cases, deaths by continent, country population impact and time series',
        'HR Analytics Dashboard committed as HR.twbx: demographics, salary against age, department breakdown, and hiring and termination trends',
        'Netflix Content Analysis committed as netflix-dashboard.twbx alongside its Power BI sibling',
        'The workbooks state their own findings: Europe recorded the highest COVID-19 death count, most HR employees fall in the 25-34 band, and Netflix genres cluster on Drama and International Movies',
      ],
      usage:
        'Three committed Tableau workbooks, each reading its own dataset: Covid Dashboard.twbx, HR.twbx for HR Analytics, and netflix-dashboard.twbx alongside its Power BI sibling.',
      applications: [
        {
          project: 'Data Analytics Dashboards',
          contribution: 'COVID-19 Dashboard (Covid Dashboard.twbx), HR Analytics Dashboard (HR.twbx) and the Netflix Content Analysis workbook (netflix-dashboard.twbx).',
          repository: REPO_DASHBOARDS,
        },
      ],
      repositories: [REPO_DASHBOARDS],
    },
    visual: { kind: 'analytics-monitor', treatment: 'solid' },
  },
  {
    id: 'streamlit',
    name: 'Streamlit',
    world: 'data',
    category: 'delivery',
    summary: 'Live web UIs over the same data the pipelines produce, verified running.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Streamlit dashboard over the Nifty-100 SQLite database, served from the same rows the API returns',
        'FastAPI endpoints verified live during the audit — calls returned real data, and the Streamlit UI renders that same data',
        'PRIMETradeAI ships a Streamlit app presenting six charts over the modelled trade data',
        'This is the delivery layer for the whole pipeline: one validated database, several ways to read it',
      ],
      usage:
        'In Nifty-100 Financial Analysis the Streamlit dashboard runs over the Nifty-100 SQLite database and shows the same rows the FastAPI endpoints serve (verified live). In PRIMETradeAI the Streamlit app presents six charts over the modelled trade data.',
      applications: [
        {
          project: 'Nifty-100 Financial Analysis',
          contribution: 'Streamlit dashboard over the Nifty-100 SQLite database, verified to render the same rows the FastAPI endpoints return.',
          repository: REPO_FINTECH,
        },
        {
          project: 'PRIMETradeAI',
          contribution: 'Streamlit app presenting six charts over the modelled trade data.',
          repository: REPO_PRIME,
        },
      ],
      repositories: [REPO_FINTECH, REPO_PRIME],
    },
    visual: { kind: 'repository-terminal', treatment: 'solid' },
  },
];