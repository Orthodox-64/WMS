"use client";

import DashboardLayout from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WarehouseCreationPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/surveys');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBack}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Surveys
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Warehouse Creation</h1>
            <p className="text-muted-foreground">Set up and configure new warehouse facilities and their specifications.</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="mr-2 h-5 w-5" />
              New Warehouse Setup
            </CardTitle>
            <CardDescription>
              Configure and set up a new warehouse facility with all necessary specifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <Building className="mx-auto h-16 w-16 text-gray-400 mb-6" />
                <h3 className="text-xl font-medium text-gray-900 mb-3">Warehouse Creation Form</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  This is where the warehouse creation form will be implemented. 
                  You can add form fields for warehouse details, location information, 
                  capacity specifications, and operational parameters.
                </p>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Features to implement:</p>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>• Warehouse name and code</li>
                    <li>• Location and address details</li>
                    <li>• Storage capacity configuration</li>
                    <li>• Facility specifications</li>
                    <li>• Operational parameters</li>
                    <li>• Manager assignment</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 