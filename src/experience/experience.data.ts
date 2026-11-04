/**
 * Verified content for the Experience section.
 *
 * EVIDENCE DISCIPLINE: every line below traces to an existing verified source —
 * src/content/projects.data.ts, src/content/skills.data.ts, the 2026-10-29
 * experience plans, and the certificate PNGs in public/assets/certificates/.
 * Nothing here is invented. Agratas deliberately carries only what the
 * records support: the company name and the certificate. No title, dates,
 * responsibilities, skills or project links are asserted for it.
 */

export type DestId = 'lighthouse' | 'windmill' | 'pagoda';

export interface CertificateInfo {
  src: string;
  alt: string;
  fileName: string;
}

export interface DestinationContent {
  id: DestId;
  landmark: string;
  accent: string;
  title: string;
  role?: string;
  dates?: string;
  sections: { heading: string; body?: string; bullets?: string[] }[];
  github?: string;
  certificate?: CertificateInfo;
}

export const DESTINATIONS: readonly DestinationContent[] = [
  {
    id: 'lighthouse',
    landmark: 'Lighthouse',
    accent: '#8ab8ff',
    title: 'Bluestock Fintech',
    role: 'Data Analyst Intern',
    dates: '20 June 2026 – 20 September 2026',
    sections: [
      {
        heading: 'Experience',
        bullets: [
          'Financial data analysis over NIFTY 100 company data',
          'Data processing and transformation pipelines for company financials',
          'Built the NIFTY 100 Financial Analysis platform end to end: validated sources, relational model, ratio and cash-flow analytics, API and dashboard',
          'Financial ratio engine: ROE, debt-to-equity, interest coverage, CAGR',
          'Stock screening with winsorized multi-factor scoring and peer comparison',
        ],
      },
      {
        heading: 'Skills',
        bullets: ['Python', 'pandas', 'SQL / T-SQL', 'SQLite', 'FastAPI', 'Streamlit', 'pytest', 'reportlab'],
      },
    ],
    github: 'https://github.com/yashmahajan11234567/Bluestock-fintech',
    certificate: {
      src: '/assets/certificates/bluestock-internship-certificate.png',
      alt: 'Bluestock Fintech internship certificate',
      fileName: 'bluestock-internship-certificate.png',
    },
  },
  {
    id: 'windmill',
    landmark: 'Windmill',
    accent: '#ffb27a',
    title: 'Agratas Fintech',
    sections: [
      {
        heading: 'Internship',
        body: 'Fintech internship at Agratas Fintech. The verified artifact on record is the internship certificate below; the official title, exact dates and detailed responsibilities are not part of the verified records and are therefore not asserted here.',
      },
    ],
    certificate: {
      src: '/assets/certificates/agratas-internship-certificate.png',
      alt: 'Agratas Fintech internship certificate',
      fileName: 'agratas-internship-certificate.png',
    },
  },
  {
    id: 'pagoda',
    landmark: 'Pagoda',
    accent: '#ff7ad9',
    title: 'Career Growth',
    sections: [
      {
        heading: 'Direction',
        body: 'An ongoing development path into data-focused engineering — no qualifications or certificates are claimed here, only the direction of work.',
        bullets: [
          'Data Analytics — analysis pipelines, ratio engines, screening and BI dashboards',
          'Data Engineering — medallion ETL, dimensional modelling, data-quality testing',
          'Cloud Infrastructure — warehouse and platform deployment on cloud services',
          'DevOps — versioned pipelines, reproducible environments, CI for data projects',
        ],
      },
    ],
  },
];

export const DEST_ORDER: readonly DestId[] = ['lighthouse', 'windmill', 'pagoda'];
