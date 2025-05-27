import DashboardLayout from '@/components/dashboard-layout';

export default function InwardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Inward</h1>
        <p className="text-muted-foreground">Manage all inward entries and stocks.</p>
        
        <div className="border rounded-lg p-8 flex items-center justify-center">
          <p className="text-muted-foreground">Inward management will be implemented here.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}