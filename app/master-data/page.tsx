"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardLayout from '@/components/dashboard-layout';

export default function MasterDataPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Master Data</h1>
        <p className="text-muted-foreground">Manage warehouse master data and configurations.</p>
        
        <div className="border rounded-lg p-8 flex items-center justify-center">
          <p className="text-muted-foreground">Master data management will be implemented here.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}