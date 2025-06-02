'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Define role-based route access
const roleBasedRoutes: Record<string, Set<string>> = {
  maker: new Set([
    '/dashboard',
    '/inward',
    '/outward',
    '/commodity-summary',
    '/aum-summary'
  ]),
  checker: new Set([
    '/dashboard',
    '/surveys',
    '/reports',
    '/commodity-summary',
    '/aum-summary'
  ]),
  admin: new Set([
    '/dashboard',
    '/master-data',
    '/reports',
    '/surveys',
    '/inward',
    '/outward',
    '/ro',
    '/commodity-summary',
    '/aum-summary'
  ]),
};

// Add paths that don't require authentication
const publicPaths = new Set([
  '/login',
  '/register',
  '/_next',
  '/favicon.ico',
]);

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't do anything while loading
    if (loading) return;

    // Check if the path is public
    if (publicPaths.has(pathname) || pathname.startsWith('/_next')) {
      return;
    }

    // If no user is logged in, redirect to login
    if (!user) {
      router.push('/login');
      return;
    }

    // Check role-based access
    const userRole = user.role as keyof typeof roleBasedRoutes;
    if (userRole && roleBasedRoutes[userRole]) {
      const allowedPaths = roleBasedRoutes[userRole];
      if (!allowedPaths.has(pathname)) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  // Show nothing while loading
  if (loading) {
    return null;
  }

  return <>{children}</>;
} 