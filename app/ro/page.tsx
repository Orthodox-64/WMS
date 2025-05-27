"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardLayout from '@/components/dashboard-layout';

export default function ReleaseOrderPage() {
  const { userRole } = useAuth();
  const router = useRouter();

  // Redirect supervisors who don't have access
  useEffect(() => {
    if (userRole === 'supervisor') {
      router.push('/dashboard');
    }
  }, [userRole, router]);

  if (userRole === 'supervisor') return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Release Order (RO/DO)</h1>
        <p className="text-muted-foreground">Manage delivery and release orders.</p>
        
        <div className="border rounded-lg p-8 flex items-center justify-center">
          <p className="text-muted-foreground">Release order management will be implemented here.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}