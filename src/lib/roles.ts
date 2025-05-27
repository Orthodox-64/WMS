export type UserRole = 'admin' | 'user';

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export const ROLE_PERMISSIONS = {
  admin: [
    '/dashboard',
    '/surveys',
    '/inward',
    '/outward',
    '/reports',
    '/ro',
    '/master-data',
    '/admin',
  ],
  user: [
    '/dashboard',
    '/surveys',
    '/inward',
    '/outward',
  ],
} as const;

export function hasPermission(role: UserRole | null, path: string): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(path);
} 