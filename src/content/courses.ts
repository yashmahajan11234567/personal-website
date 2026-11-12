/**
 * Courses & Certificates — data model.
 *
 * Each entry represents a completed course or certification from an external
 * provider (Coursera, NPTEL, edX, etc.). The structure is future-proof:
 * when a certificate PNG is added to public/assets/certificates/, add an
 * entry here and it will appear in the carousel automatically.
 *
 * Fields:
 *   id        — stable key, used for React keys and deep-linking
 *   provider  — e.g. "Coursera", "NPTEL", "edX", "Udemy"
 *   title     — course title as it appears on the certificate
 *   date      — completion date (ISO or display string)
 *   certificateSrc — path to PNG in public/assets/certificates/
 *   verifyUrl — optional URL to verify the certificate (provider's verify page)
 *   skills    — key skills/topics covered, for display
 */
export interface CourseEntry {
  readonly id: string;
  readonly provider: string;
  readonly title: string;
  readonly date: string;
  readonly certificateSrc?: string;
  readonly verifyUrl?: string;
  readonly skills: readonly string[];
}

/**
 * Current catalogue — add entries here as certificates are collected.
 * Entries without certificateSrc will render as text-only cards.
 */
export const COURSES: readonly CourseEntry[] = [
  {
    id: 'devops-masterclass',
    provider: 'College Open Elective',
    title: 'Full-Stack AI DevOps Masterclass',
    date: '2025',
    certificateSrc: undefined,
    verifyUrl: 'https://github.com/yashmahajan11234567/Full-Stack-AI-DevOps-Masterclass',
    skills: ['Docker', 'Kubernetes', 'GitHub Actions', 'CI/CD', 'AWS', 'Azure', 'GCP'],
  },
  // Template for future Coursera/NPTEL certificates:
  // {
  //   id: 'coursera-ml',
  //   provider: 'Coursera',
  //   title: 'Machine Learning Specialization',
  //   date: '2024-06',
  //   certificateSrc: '/assets/certificates/coursera-ml.png',
  //   verifyUrl: 'https://coursera.org/verify/...',
  //   skills: ['ML', 'Python', 'TensorFlow'],
  // },
];

/**
 * Provider colour accents for visual grouping.
 */
export const PROVIDER_COLORS: Record<string, string> = {
  'Coursera': '#0056d2',
  'NPTEL': '#e53935',
  'edX': '#0262aa',
  'Udemy': '#a435f0',
  'Udacity': '#00b0d7',
  'freeCodeCamp': '#2ecc71',
  'College Open Elective': '#ffd600',
};

export function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider] ?? '#00d4ff';
}