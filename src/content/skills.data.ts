/**
 * DATA world skill set.
 *
 * Every `evidence` line below is traceable to the approved evidence audit
 * (`.hermes/plans/2026-10-04_021500-portfolio-evidence-audit.md`). Nothing is
 * inferred, and no metric appears that the audit did not verify by execution or
 * direct measurement.
 *
 * PROGRESSION ORDER
 *
 * The audit derived this order and the reasoning is worth preserving:
 *
 *   SQL → ETL → Data quality → Python → Regex → Screening → API/Visualisation
 *
 * This is deliberately NOT the generic "Python first" ladder. The strongest
 * verified assets are the data-quality rule engine and the medallion warehouse,
 * so they come early. Python sits mid-path because it is applied TO validated
 * data — verified through the screener and pandas over quality-checked input,
 * not as standalone work. Putting Python first would misrepresent the evidence.
 */

import type { Skill } from './types';

export const DATA_SKILLS: readonly Skill[] = [
  {
    id: 'sql',
    name: 'SQL / T-SQL',
    world: 'data',
    category: 'storage',
    summary: 'Schema design and query work across SQLite and SQL Server.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Handwritten 11-table relational schema with 16 indexes and foreign-key relationships',
        'Medallion bronze/silver/gold layering implemented as T-SQL stored procedures',
        'Window functions including LEAD() for dedup logic; star-schema gold layer',
        'Eight .sql files read directly: load, transform, and data-quality test scripts',
      ],
      repository: 'Bluestock_fintech, Sql-data-warehouse',
    },
    visual: { kind: 'database-terminal', treatment: 'solid' },
  },
  {
    id: 'etl',
    name: 'ETL / Medallion Architecture',
    world: 'data',
    category: 'pipeline',
    summary: 'Three-stage load pipeline with reject-and-log handling.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'proc_load_bronze / proc_load_silver implement the layered load',
        'Silver stage deduplicates using a LEAD() window technique',
        'Gold layer materialises a star schema for reporting',
        'Load audit records per-table outcomes rather than failing silently',
      ],
      repository: 'Sql-data-warehouse, Bluestock_fintech',
    },
    visual: { kind: 'pipeline-vessel', treatment: 'solid' },
  },
  {
    id: 'data-quality',
    name: 'Data Quality Engineering',
    world: 'data',
    category: 'quality',
    summary: 'Accounting-aware validation rules, not just type checks.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        '16 data-quality rules implemented in a dedicated validator',
        'DQ-04 asserts the balance-sheet identity (assets = liabilities + equity)',
        'DQ-13 asserts EPS sign consistency',
        'Rules encode accounting meaning, not null-count checks',
      ],
      repository: 'Bluestock_fintech',
    },
    visual: { kind: 'inspection-arch', treatment: 'solid' },
  },
  {
    id: 'python',
    name: 'Python / pandas',
    world: 'data',
    category: 'analysis',
    summary: 'Analysis applied to validated data, plus a test suite.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Screener script applying winsorize-and-scale before scoring',
        'pandas used across ratio, CAGR, and cash-flow modules',
        '699 of 714 tests pass; the 14 failures trace to pandas 3.0.5 dtype drift against a 2.3.3 pin',
        'scikit-learn is declared but was NOT executed in this environment',
      ],
      repository: 'Bluestock_fintech',
    },
    visual: { kind: 'code-station', treatment: 'solid' },
  },
  {
    id: 'regex-nlp',
    name: 'Regex NLP',
    world: 'data',
    category: 'analysis',
    summary: 'Pattern extraction from text with cross-validation.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Four compiled regex patterns extract structured fields from unstructured text',
        'Extracted values are cross-validated against an independent calculation',
        'Regex output feeds the scoring stage rather than being displayed raw',
      ],
      repository: 'Bluestock_fintech',
    },
    visual: { kind: 'text-parser', treatment: 'solid' },
  },
  {
    id: 'screening',
    name: 'Scoring / Screening',
    world: 'data',
    category: 'analysis',
    summary: 'Winsorized multi-factor screening with clustering code.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'Multi-factor screen winsorizes and scales inputs before weighting',
        'KMeans clustering and an elbow-method implementation are present in the code',
        'Clustering was NOT executed during the audit — scikit-learn is absent from the environment',
      ],
      repository: 'Bluestock_fintech',
    },
    visual: { kind: 'selector-gate', treatment: 'solid' },
  },
  {
    id: 'visualization',
    name: 'Data Visualisation / API',
    world: 'data',
    category: 'delivery',
    summary: 'FastAPI endpoints and a Streamlit UI over the same live data.',
    experience: {
      experienceType: 'PROJECT',
      evidence: [
        'FastAPI endpoints return real rows from the SQLite database',
        'Streamlit UI renders the same underlying data',
        'Both verified live during the audit — API calls returned real data',
      ],
      repository: 'Bluestock_fintech',
    },
    visual: { kind: 'dashboard-screen', treatment: 'solid' },
  },
];