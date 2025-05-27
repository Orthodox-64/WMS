import DashboardLayout from '@/components/dashboard-layout';

export default function SurveysPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">UH Surveys</h1>
        <p className="text-muted-foreground">Manage and view all UH surveys.</p>
        
        <div className="border rounded-lg p-8 flex items-center justify-center">
          <p className="text-muted-foreground">Survey management will be implemented here.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}