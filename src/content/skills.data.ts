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
      repositories: [REPO_DASHBOARDS],
    },
    visual: { kind: 'analytics-monitor', treatment: 'solid' },
  },
  {
    id: 'power-bi',
    name: 'Power BI',
    world: 'data',
    category: 'delivery',
    summary: 'Netflix content analysis built as a .pbix report over the public dataset.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Netflix Content Analysis committed as netflix-dashboard.pbix',
        'Genre distribution, country map, rating classification and year-on-year trend views',
        'Interactive filtering across the report pages',
        'The report states its own findings: movies are about 70% of the catalogue, Drama and International Movies lead, and production rises sharply after 2015',
      ],
      repositories: [REPO_DASHBOARDS],
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
      repositories: [REPO_FINTECH, REPO_PRIME],
    },
    visual: { kind: 'repository-terminal', treatment: 'solid' },
  },
];