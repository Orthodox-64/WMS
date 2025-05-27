import DashboardLayout from '@/components/dashboard-layout';
import MetricCard from '@/components/metric-card';
import DistributionChart from '@/components/distribution-chart';
import { Warehouse, Package, TruckIcon, BoxIcon } from 'lucide-react';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Warehouses"
            value="42"
            icon={<Warehouse size={24} />}
            href="/master-data"
          />
          <MetricCard
            title="Pending Inward Entries"
            value="18"
            icon={<Package size={24} />}
            href="/inward"
          />
          <MetricCard
            title="Pending Delivery Orders"
            value="24"
            icon={<TruckIcon size={24} />}
            href="/ro"
          />
          <MetricCard
            title="Pending Outward Entries"
            value="12"
            icon={<BoxIcon size={24} />}
            href="/outward"
          />
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <DistributionChart />
        </div>
      </div>
    </DashboardLayout>
  );
}