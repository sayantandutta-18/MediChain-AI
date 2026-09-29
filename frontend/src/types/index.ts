export type UserRole = 'patient' | 'doctor';
export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
export type AnchorStatus = 'PENDING' | 'ANCHORED' | 'SIMULATED' | 'FAILED';
export type VerificationStatus = 'VERIFIED' | 'MISMATCH' | 'NOT_ANCHORED' | 'UNAVAILABLE';
export type RecordCategory =
  | 'lab-report'
  | 'prescription'
  | 'imaging'
  | 'discharge-summary'
  | 'vaccination'
  | 'other';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialty: string | null;
  registrationNumber: string | null;
  hospital: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface DoctorSummary {
  id: string;
  name: string;
  email: string;
  specialty: string | null;
  registrationNumber: string | null;
  hospital: string | null;
}

export interface AuthSession {
  token: string;
  expiresIn: string;
  user: User;
}

export interface BlockchainMeta {
  status: AnchorStatus;
  network: string;
  transactionDigest: string | null;
  objectId: string | null;
  packageId: string | null;
  anchoredAt: string | null;
  onChainHash: string | null;
}

export interface MedicalRecord {
  id: string;
  recordId: string;
  title: string;
  description: string | null;
  category: RecordCategory;
  fileName: string;
  mimeType: string;
  size: number;
  fileHash: string;
  hasPlainText: boolean;
  blockchain: BlockchainMeta;
  createdAt: string;
  updatedAt: string;
  patient?: { id: string; name: string } | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface AccessRequest {
  id: string;
  status: AccessRequestStatus;
  reason: string;
  purpose: string | null;
  decisionNote: string | null;
  requestedAt: string;
  decidedAt: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  expired: boolean;
  doctor: {
    id: string;
    name: string;
    email: string;
    specialty: string | null;
    hospital: string | null;
    registrationNumber: string | null;
  } | null;
  patient: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export interface VerificationReport {
  recordId: string;
  title?: string;
  status: VerificationStatus;
  checkedAt: string;
  mongoHash: string;
  onChainHash: string | null;
  match: boolean;
  network: string;
  transactionDigest: string | null;
  objectId: string | null;
  anchoredAt: string | null;
  message: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  actorRole: UserRole | null;
  resourceType: string | null;
  resourceId: string | null;
  result: 'SUCCESS' | 'FAILURE';
  statusCode: number | null;
  reason: string | null;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface RecordStats {
  total: number;
  anchored: number;
  unanchored: number;
  categories: Array<{ category: string; count: number }>;
}

export interface AccessStats {
  pending: number;
  approved: number;
  rejected: number;
  revoked: number;
  accessiblePatients: number;
}

export interface AiReport {
  summary: string;
  keyFindings: string[];
  terminology: Array<{ term: string; explanation: string }>;
  patientFriendlyExplanation: string;
  suggestedQuestions: string[];
  urgency: 'routine' | 'discuss-soon' | 'prompt-attention';
  disclaimer: string;
  model: string;
  generatedAt: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  dependencies: {
    database: { connected: boolean; name: string };
    blockchain: { network: string; configured: boolean; reachable: boolean };
    ai: { configured: boolean; model: string };
  };
}

export const RECORD_CATEGORIES: RecordCategory[] = [
  'lab-report',
  'prescription',
  'imaging',
  'discharge-summary',
  'vaccination',
  'other',
];

export const RECORD_CATEGORY_LABELS: Record<RecordCategory, string> = {
  'lab-report': 'Lab report',
  prescription: 'Prescription',
  imaging: 'Imaging',
  'discharge-summary': 'Discharge summary',
  vaccination: 'Vaccination',
  other: 'Other',
};
