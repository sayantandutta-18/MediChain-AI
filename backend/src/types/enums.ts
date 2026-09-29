export type UserRole = 'patient' | 'doctor';
export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
export type AnchorStatus = 'PENDING' | 'ANCHORED' | 'SIMULATED' | 'FAILED';
export type VerificationStatus = 'VERIFIED' | 'MISMATCH' | 'NOT_ANCHORED' | 'UNAVAILABLE';
export type AuditResult = 'SUCCESS' | 'FAILURE';

export const USER_ROLES: UserRole[] = ['patient', 'doctor'];
export const ACCESS_REQUEST_STATUSES: AccessRequestStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REVOKED',
];
