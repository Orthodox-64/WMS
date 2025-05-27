import DashboardLayout from '@/components/layout/DashboardLayout';
import PlaceholderPage from '@/components/PlaceholderPage';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function MasterDataPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <PlaceholderPage title="Master Data" />
      </DashboardLayout>
    </ProtectedRoute>
  );
} 