/**
 * Certificates & Achievements carousel — content model.
 *
 * Every field below traces to an audited source document (see the asset
 * audit): the five PDFs committed under public/assets/certificates/pdf/.
 * Nothing is invented — where a document does not state a fact (e.g. the
 * Agratas certificate prints no issue date), the field is omitted rather
 * than filled from file metadata.
 *
 * Adding a new certificate or achievement = one new object here + one PDF
 * in pdf/ + one preview render in previews/. No structural changes.
 */

export type AchievementKind = 'certificate' | 'achievement';

export interface CertificateEntry {
  readonly id: string;
  readonly kind: AchievementKind;
  readonly title: string;
  readonly issuer: string;
  /** As printed on the document. Omitted when the document states no date. */
  readonly date?: string;
  readonly description?: string;
  /** WebP page-1 preview, served from public/assets/certificates/previews/. */
  readonly image: string;
  /** Original document, served from public/assets/certificates/pdf/. */
  readonly pdf: string;
  readonly alt: string;
  /** Download filename for the PDF action. */
  readonly fileName: string;
  /** Verified facts shown in the expanded view (IDs, hours, filing dates). */
  readonly details?: readonly { readonly label: string; readonly text: string }[];
  /** External credential verification URL printed on the document. */
  readonly verifyUrl?: string;
}

const PREVIEWS = '/assets/certificates/previews/';
const PDFS = '/assets/certificates/pdf/';

export const CERTIFICATES: readonly CertificateEntry[] = [
  {
    id: 'aws-academy-cloud-foundations',
    kind: 'certificate',
    title: 'AWS Academy Graduate — Cloud Foundations',
    issuer: 'AWS Academy',
    date: '06/06/2025',
    description: 'Certificate of Completion — 20 course hours, with Credly digital badge.',
    image: `${PREVIEWS}aws-academy-cloud-foundations.webp`,
    pdf: `${PDFS}aws-academy-cloud-foundations.pdf`,
    alt: 'AWS Academy Cloud Foundations certificate of completion for Yash Mahajan, issued 06/06/2025',
    fileName: 'AWS-Academy-Cloud-Foundations.pdf',
    details: [
      { label: 'Course hours', text: '20 hours' },
      { label: 'Issued', text: '06/06/2025' },
    ],
    verifyUrl: 'https://www.credly.com/go/BuMaiLhV',
  },
  {
    id: 'aws-academy-ml-foundations',
    kind: 'certificate',
    title: 'AWS Academy Graduate — Machine Learning Foundations',
    issuer: 'AWS Academy',
    date: '07/02/2025',
    description: 'Certificate of Completion — 20 course hours, with Credly digital badge.',
    image: `${PREVIEWS}aws-academy-machine-learning-foundations.webp`,
    pdf: `${PDFS}aws-academy-machine-learning-foundations.pdf`,
    alt: 'AWS Academy Machine Learning Foundations certificate of completion for Yash Mahajan, issued 07/02/2025',
    fileName: 'AWS-Academy-ML-Foundations.pdf',
    details: [
      { label: 'Course hours', text: '20 hours' },
      { label: 'Issued', text: '07/02/2025' },
    ],
    verifyUrl: 'https://www.credly.com/go/SyV8pMCG',
  },
  {
    id: 'udemy-fullstack-ai-devops',
    kind: 'certificate',
    title: 'Full Stack AI DevOps + Real Projects | AWS, Azure, GCP, K8S',
    issuer: 'Udemy — EmbarkX (instructors: Faisal Memon, EmbarkX Official, Team EmbarkX)',
    date: 'Nov. 19, 2026',
    description: 'Certificate of Completion — 40 total hours.',
    image: `${PREVIEWS}udemy-fullstack-ai-devops.webp`,
    pdf: `${PDFS}udemy-fullstack-ai-devops.pdf`,
    alt: 'Udemy certificate of completion for Full Stack AI DevOps + Real Projects, Yash Mahajan, Nov. 19, 2026',
    fileName: 'Udemy-FullStack-AI-DevOps.pdf',
    details: [
      { label: 'Length', text: '40 total hours' },
      { label: 'Certificate no.', text: 'UC-0b9a71c8-ab7d-434c-8edf-c5c5e3f271ac' },
      { label: 'Reference no.', text: '0004' },
    ],
    verifyUrl: 'https://ude.my/UC-0b9a71c8-ab7d-434c-8edf-c5c5e3f271ac',
  },
  {
    id: 'copyright-affordable-housing',
    kind: 'achievement',
    title: 'Copyright Registration — "Affordable Housing: Personalized Recommendation System"',
    issuer: 'Copyright Office, Government of India',
    date: '22/07/2025',
    description:
      'Copyright registered under the Copyright Act, 1957 (literary work). Co-authored with four college teammates; all five authors and the college address are printed on the certificate and are intentionally displayed.',
    image: `${PREVIEWS}copyright-affordable-housing.webp`,
    pdf: `${PDFS}copyright-affordable-housing.pdf`,
    alt: 'Copyright certificate LD-20250168994 for the work Affordable Housing: Personalized Recommendation System, registered 22/07/2025',
    fileName: 'Copyright-LD-20250168994.pdf',
    details: [
      { label: 'Certificate no.', text: 'LD-20250168994' },
      { label: 'Application no.', text: '4206/2025-CO/L' },
      { label: 'Date of filing', text: '06/02/2025' },
      { label: 'Date of ROC', text: '22/07/2025' },
    ],
  },
  {
    id: 'agratas-industrial-training',
    kind: 'certificate',
    title: 'Certificate of Industrial Training — Finance',
    issuer: 'Agratas Edutech (AICTE · ISO 9001:2015 certified)',
    // No date is printed on this certificate; the PDF metadata creation date
    // is deliberately NOT presented as the issue date.
    description: 'Industrial Training program with Industrial Mentors, Finance domain.',
    image: `${PREVIEWS}agratas-industrial-training.webp`,
    pdf: `${PDFS}agratas-industrial-training.pdf`,
    alt: 'Agratas Edutech certificate of industrial training in Finance for Yash Gajanan Mahajan, registration no. 24AE02151764',
    fileName: 'Agratas-Industrial-Training.pdf',
    details: [{ label: 'Registration no.', text: '24AE02151764' }],
  },
];
