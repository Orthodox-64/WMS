'use client';

import DashboardLayout from '@/components/dashboard-layout';
import { DashboardCards } from '@/components/dashboard/dashboard-cards';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { SidebarStats } from '@/components/dashboard/sidebar-stats';
import { DistributionChart } from "@/components/dashboard/distribution-chart";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        
        {/* Pie Charts */}
        <DashboardCharts />
        
        {/* Info Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <SidebarStats />
          </div>
          <div className="md:col-span-2">
            <DistributionChart />
          </div>
        </div>
        
        {/* Dashboard Cards */}
        <DashboardCards />
      </div>
    </DashboardLayout>
  );
}