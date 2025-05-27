export type UserRole = 'admin' | 'supervisor';

export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
} as const;

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    '/dashboard',
    '/surveys',
    '/inward',
    '/outward',
    '/reports',
    '/ro',
    '/master-data',
  ],
  [ROLES.SUPERVISOR]: [
    '/dashboard',
    '/surveys',
    '/inward',
    '/outward',
    '/reports',
  ],
} as const;

export function hasPermission(role: UserRole | undefined, path: string): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(path);
} 