import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { hasPermission } from '@/lib/roles';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) {
    router.push('/login');
    return null;
  }

  if (!hasPermission(role, pathname)) {
    router.push('/dashboard');
    return null;
  }

  return <>{children}</>;
} 