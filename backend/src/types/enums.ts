export type UserRole = 'patient' | 'doctor' | 'admin';
export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
export type AnchorStatus = 'PENDING' | 'ANCHORED' | 'SIMULATED' | 'FAILED';
export type VerificationStatus = 'VERIFIED' | 'MISMATCH' | 'NOT_ANCHORED' | 'UNAVAILABLE';
export type AuditResult = 'SUCCESS' | 'FAILURE';
export type DoctorVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export const USER_ROLES: UserRole[] = ['patient', 'doctor', 'admin'];
export const ACCESS_REQUEST_STATUSES: AccessRequestStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REVOKED',
];
export const DOCTOR_VERIFICATION_STATUSES: DoctorVerificationStatus[] = [
  'PENDING',
  'VERIFIED',
  'REJECTED',
];
