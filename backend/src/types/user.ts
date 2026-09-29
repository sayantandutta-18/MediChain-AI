import type { UserRole } from './enums';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  email: string;
  name: string;
}
