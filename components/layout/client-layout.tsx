'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import AuthCheck from '@/components/auth/auth-check';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthCheck>
        {children}
      </AuthCheck>
    </AuthProvider>
  );
} 