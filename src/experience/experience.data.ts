/**
 * Verified content for the Experience section.
 *
 * EVIDENCE DISCIPLINE: every line below traces to a verified source —
 * src/content/projects.data.ts, src/content/skills.data.ts, src/content/skills.cloud.ts,
 * the certificate PNGs in public/assets/certificates/ (OCR-read), and public
 * GitHub repositories verified via `gh repo list` / `gh repo view`.
 * Nothing here is invented.
 *
 * Agratas: the certificate (Agratas Edutech, Certificate of Appreciation,
 * Reg No. 24AE02151764) is OCR-verified to name Yash Gajanan Mahajan and a
 * FINANCE internship program from 11 December 2024 to 10 February 2025.
 * No Agratas project repository is public, so no GitHub link is asserted.
 */

export type DestId = 'lighthouse' | 'windmill' | 'pagoda';

export interface CertificateInfo {
  src: string;
  alt: string;
  fileName: string;
  /** Optional verified facts shown above the preview (issuer, title, reg no.). */
  details?: { label: string; text: string }[];
}

export interface Highlight {
  label: string;
  text: string;
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export interface Pathway {
  name: string;
  desc: string;
}

export interface ProjectLink {
  name: string;
  desc: string;
  stack: string[];
  url: string;
}

export interface DestinationContent {
  id: DestId;
  landmark: string;
  accent: string;
  title: string;
  role?: string;
  dates?: string;
  overview?: string;
  highlights?: (string | Highlight)[];
  skills?: SkillGroup[];
  pathways?: Pathway[];
  projects?: ProjectLink[];
  certificate?: CertificateInfo;
}

/**
 * Selector order is Windmill -> Lighthouse -> Pagoda (user-approved).
 * This order drives ONLY the selector buttons and Prev/Next navigation;
 * 3D island positions are keyed by id in scene/poses.ts and are untouched.
 */
export const DEST_ORDER: readonly DestId[] = ['windmill', 'lighthouse', 'pagoda'];

export const DESTINATIONS: readonly DestinationContent[] = [
  {
    id: 'windmill',
    landmark: 'Windmill',
    accent: '#ffb27a',
    title: 'Agratas Edutech',
    role: 'Finance Internship',
    dates: '11 December 2024 – 10 February 2025',
    overview:
      'Completed a Finance Internship at Agratas Edutech, gaining exposure to a structured, finance-oriented learning program. The internship built familiarity with the analytical tools used to organize and interpret financial information — Microsoft Excel and Microsoft Power BI — and strengthened my interest in structured financial analysis. It concluded with successful program completion and a Certificate of Appreciation recognizing my enthusiasm, dedication, and work ethic.',
    highlights: [
      { label: 'Program Completion', text: 'Successfully completed the Finance Internship program at Agratas Edutech.' },
      { label: 'Internship Duration', text: '11 December 2024 – 10 February 2025.' },
      { label: 'Professional Recognition', text: 'Received a Certificate of Appreciation (Reg No. 24AE02151764).' },
      { label: 'Recognized Qualities', text: 'Recognized for exceptional enthusiasm, dedication, and a commendable work ethic.' },
    ],
    skills: [
      { label: 'Finance & Domain', items: ['Finance'] },
      { label: 'Tools', items: ['Microsoft Excel', 'Microsoft Power BI'] },
    ],
    certificate: {
      src: '/assets/certificates/agratas-internship-certificate.png',
      alt: 'Agratas Edutech Certificate of Appreciation for Yash Gajanan Mahajan',
      fileName: 'agratas-internship-certificate.png',
    },
  },
  {
    id: 'lighthouse',
    landmark: 'Lighthouse',
    accent: '#8ab8ff',
    title: 'Bluestock Fintech',
    role: 'Data Analyst Intern',
    dates: '20 Jun 2026 – 20 Sep 2026',
    overview:
      'Data analyst internship on the NIFTY-100 Financial Analysis platform — financial company data validated, modelled and analysed end to end, from source checks to a live dashboard. Role and dates are verified on the internship certificate.',
    highlights: [
      'NIFTY-100 Financial Analysis built end to end: 16 accounting-aware validation rules, an 11-table SQLite model, ratio and cash-flow analytics, FastAPI API and Streamlit dashboard',
      'Financial Ratio Engine — ROE, debt-to-equity, interest coverage, CAGR — validated against TCS FY2024 published figures (ROE 50.94%, D/E 0.089, ICR 87.1)',
      'Stock screener with winsorized multi-factor scoring and peer comparison',
      'Live database measurement: 92 companies, 5,520 stock prices, 3,484 ratio rows; 699 of 714 tests pass',
    ],
    skills: [
      { label: 'Programming', items: ['Python', 'pandas', 'pytest'] },
      { label: 'Data', items: ['SQL / T-SQL', 'SQLite'] },
      { label: 'Delivery', items: ['FastAPI', 'Streamlit', 'reportlab'] },
    ],
    projects: [
      {
        name: 'NIFTY-100 Financial Analysis',
        desc: 'End-to-end pipeline over NIFTY-100 company financials: validated sources, relational model, ratio engine, screener, API and dashboard.',
        stack: ['Python', 'pandas', 'SQLite', 'FastAPI', 'Streamlit'],
        url: 'https://github.com/yashmahajan11234567/Bluestock-fintech',
      },
    ],
    certificate: {
      src: '/assets/certificates/bluestock-internship-certificate.png',
      alt: 'Bluestock Fintech certificate of internship — Yash Mahajan, Data Analyst Intern, 20 Jun 2026 – 20 Sep 2026',
      fileName: 'bluestock-internship-certificate.png',
    },
  },
  {
    id: 'pagoda',
    landmark: 'Pagoda',
    accent: '#ff7ad9',
    title: 'Career Growth',
    overview:
      'An ongoing development path into data-focused engineering — every skill and project below is backed by a committed public repository; no qualifications are claimed that are not on record.',
    pathways: [
      { name: 'Data Analytics', desc: 'Analysis pipelines, ratio engines, screening and BI dashboards' },
      { name: 'Data Engineering', desc: 'Medallion ETL, dimensional modelling, data-quality testing' },
      { name: 'Cloud Infrastructure', desc: 'Warehouse and platform deployment on cloud services' },
      { name: 'DevOps', desc: 'Versioned pipelines, reproducible environments, CI for data projects' },
    ],
    skills: [
      { label: 'Data & Analytics', items: ['SQL / T-SQL', 'Python / pandas', 'Excel', 'Power BI', 'Tableau', 'Streamlit'] },
      { label: 'Cloud & DevOps', items: ['Docker', 'Kubernetes / Minikube', 'GitHub Actions', 'Terraform / AWS', 'Ansible', 'Prometheus / Grafana / Loki'] },
      { label: 'Backend', items: ['FastAPI', 'Flask', 'Node.js', 'Go', 'PostgreSQL'] },
    ],
    projects: [
      {
        name: 'RxVerify — Digital Prescription Verification',
        desc: 'Flask app productionized end to end: Minikube deploy with probes and rollback, GHA pipeline to GHCR, Prometheus/Grafana/Loki monitoring, Terraform/Ansible for AWS.',
        stack: ['Kubernetes', 'Docker', 'GitHub Actions', 'Terraform', 'AWS'],
        url: 'https://github.com/yashmahajan11234567/digital-prescription-verification-devops',
      },
      {
        name: 'NIFTY-100 Financial Analysis',
        desc: 'Financial analysis pipeline with validation rule engine, ratio engine, screener, API and dashboard over NIFTY-100 data.',
        stack: ['Python', 'pandas', 'SQLite', 'FastAPI', 'Streamlit'],
        url: 'https://github.com/yashmahajan11234567/Bluestock-fintech',
      },
      {
        name: 'SQL Data Warehouse & ETL',
        desc: 'Medallion bronze/silver/gold warehouse in T-SQL with star-schema gold layer and per-layer data-quality tests.',
        stack: ['T-SQL', 'SQL Server'],
        url: 'https://github.com/yashmahajan11234567/Sql-data-warehouse',
      },
      {
        name: 'PRIMETradeAI',
        desc: 'Crypto-market analysis: nine T-SQL queries over trade history, Random Forest and KMeans models, Streamlit dashboard.',
        stack: ['T-SQL', 'Python', 'scikit-learn', 'Streamlit'],
        url: 'https://github.com/yashmahajan11234567/PRIMETradeAI',
      },
    ],
  },
];
