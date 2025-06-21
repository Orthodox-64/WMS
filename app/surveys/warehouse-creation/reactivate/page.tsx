"use client";

import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Download,
  Eye,
  Lock,
  Search
} from "lucide-react";
import WarehouseInspectionForm from '../inspection-form';

// Interface for inspection data
interface InspectionData {
  id: string;
  inspectionCode: string;
  warehouseCode: string;
  state: string;
  branch: string;
  location: string;
  businessType: string;
  warehouseStatus: string;
  warehouseName?: string;
  bankState: string;
  bankBranch: string;
  bankName: string;
  ifscCode: string;
  receiptType: string;
  createdAt: string;
  warehouseInspectionData?: {
    remarks?: string;
  };
}

export default function ReactivateWarehousePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<InspectionData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Load inspections from Firebase
  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inspections'));
      const inspectionData: InspectionData[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Only include documents with 'reactivate' status
        if (data.status === 'reactivate') {
          inspectionData.push({
            id: doc.id,
            inspectionCode: data.inspectionCode || '',
            warehouseCode: data.warehouseCode || '',
            state: data.state || '',
            branch: data.branch || '',
            location: data.location || '',
            businessType: data.businessType || '',
            warehouseStatus: data.warehouseStatus || '',
            warehouseName: data.warehouseName || '',
            bankState: data.bankState || '',
            bankBranch: data.bankBranch || '',
            bankName: data.bankName || '',
            ifscCode: data.ifscCode || '',
            receiptType: data.receiptType || '',
            createdAt: data.createdAt || '',
            warehouseInspectionData: data.warehouseInspectionData || {}
          });
        }
      });
      
      // Filter for reactivate status - status filtering is now done in forEach loop above
      setInspections(inspectionData);
    } catch (error) {
      console.error('Error loading inspections:', error);
      toast({
        title: "Error",
        description: "Failed to load inspections",
        variant: "destructive",
      });
    }
  };

  const getWarehouseStatus = (warehouseCode: string): 'pending' | 'submitted' | 'activated' | 'rejected' | 'resubmitted' | 'closed' | 'reactivate' => {
    // Simple logic to determine status - you can modify this based on your business logic
    // For demo purposes, showing empty results for non-pending statuses
    return 'pending'; // This will show no results for reactivate status
  };

  const exportToCSV = () => {
    const headers = [
      'Inspection Code', 'Warehouse Code', 'State', 'Branch', 'Location', 
      'Business Type', 'Warehouse Name', 'Bank State', 'Bank Branch', 
      'Bank Name', 'IFSC Code', 'Receipt Type', 'Created Date', 'Remarks'
    ];
    
    const csvContent = [
      headers.join(','),
      ...inspections.map(inspection => [
        inspection.inspectionCode,
        inspection.warehouseCode,
        inspection.state,
        inspection.branch,
        inspection.location,
        inspection.businessType.toUpperCase(),
        inspection.warehouseName || '',
        inspection.bankState,
        inspection.bankBranch,
        inspection.bankName,
        inspection.ifscCode,
        inspection.receiptType,
        inspection.createdAt,
        inspection.warehouseInspectionData?.remarks || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reactivate-warehouse-inspections-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    // This would typically delete from Firebase, but for now just show a message
    toast({
      title: "Delete",
      description: "Delete functionality would be implemented here",
    });
  };

  const handleViewDetails = (inspection: InspectionData) => {
    setSelectedInspection(inspection);
    setShowInspectionForm(true);
  };

  const handleClose = async (inspection: InspectionData) => {
    try {
      const inspectionsRef = collection(db, 'inspections');
      const q = query(inspectionsRef, where('inspectionCode', '==', inspection.inspectionCode));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docRef = doc(db, 'inspections', querySnapshot.docs[0].id);
        await updateDoc(docRef, {
          status: 'closed',
          lastUpdated: new Date().toISOString(),
          closedAt: new Date().toISOString()
        });
        
        toast({
          title: "Warehouse Closed",
          description: `Warehouse ${inspection.warehouseCode} has been moved to closed status.`,
        });
        
        // Reload the data
        loadInspections();
      } else {
        toast({
          title: "Error",
          description: "Could not find the warehouse record to update.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error closing warehouse:', error);
      toast({
        title: "Error",
        description: "Failed to close warehouse",
        variant: "destructive",
      });
    }
  };

  const convertInspectionToFormData = (inspection: InspectionData) => {
    // Get the saved warehouse inspection data from the inspection record
    const warehouseData = inspection.warehouseInspectionData || {};
    
    // Return the saved form data with fallbacks to inspection data
    return {
      // Use saved warehouse inspection data if available, otherwise fallback to inspection data
      ...warehouseData,
      
      // Override with inspection-specific data
      warehouseName: inspection.warehouseName || warehouseData.warehouseName || '',
      warehouseCode: inspection.warehouseCode || warehouseData.warehouseCode || '',
      status: 'reactivate', // Always reactivate for this page
      
      // Bank details from inspection (these are the specific bank for this inspection)
      bankState: inspection.bankState || warehouseData.bankState || '',
      bankBranch: inspection.bankBranch || warehouseData.bankBranch || '',
      bankName: inspection.bankName || warehouseData.bankName || '',
      ifscCode: inspection.ifscCode || warehouseData.ifscCode || '',
      
      // Location details from inspection
      state: inspection.state || warehouseData.state || '',
      branch: inspection.branch || warehouseData.branch || '',
      location: inspection.location || warehouseData.location || '',
      businessType: inspection.businessType || warehouseData.businessType || '',
      receiptType: inspection.receiptType || warehouseData.receiptType || '',
      
      // Include creation info
      createdAt: inspection.createdAt || warehouseData.createdAt || '',
      inspectionCode: inspection.inspectionCode || inspection.id || '',
      
      // Ensure arrays and objects have defaults
      nameOfBank: warehouseData.nameOfBank || [],
      attachedFiles: warehouseData.attachedFiles || [],
      
      // Ensure boolean defaults
      warehouseFitCertification: warehouseData.warehouseFitCertification || false,
      
      // Ensure date fields are properly handled - convert strings to Date objects
      dateOfInspection: warehouseData.dateOfInspection ? new Date(warehouseData.dateOfInspection) : null,
      validityOfInsurance: warehouseData.validityOfInsurance ? new Date(warehouseData.validityOfInsurance) : null,
      expiryDate: warehouseData.expiryDate ? new Date(warehouseData.expiryDate) : null,
      oeDate: warehouseData.oeDate ? new Date(warehouseData.oeDate) : null
    };
  };

  // Filtered inspections
  const filteredInspections = inspections.filter((inspection) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;
    return (
      (inspection.state && inspection.state.toLowerCase().includes(search)) ||
      (inspection.location && inspection.location.toLowerCase().includes(search)) ||
      (inspection.warehouseName && inspection.warehouseName.toLowerCase().includes(search)) ||
      (inspection.bankBranch && inspection.bankBranch.toLowerCase().includes(search))
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header with Back Button and Centered Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.back()}
              className="inline-block text-lg font-semibold tracking-tight bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
            >
              ← Warehouse Creation
            </button>
          </div>
          
          {/* Centered Title with Light Orange Background */}
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-orange-600 inline-block border-b-4 border-green-500 pb-2 px-6 py-3 bg-orange-100 rounded-lg">
              <RefreshCw className="inline mr-2 h-8 w-8 text-teal-500" />
              Reactivate Warehouses
            </h1>
          </div>
          
          {/* Export Button */}
          <div className="flex space-x-2">
            {inspections.length > 0 && (
              <Button 
                onClick={exportToCSV}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </div>

        {/* Status Description */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-6 h-6 text-teal-500" />
            <div>
              <h3 className="text-lg font-medium text-teal-900">Reactivate Warehouses</h3>
              <p className="text-teal-700 mt-1">
                Warehouses that are pending reactivation after being closed or decommissioned.
              </p>
            </div>
          </div>
        </div>

        {/* Search & Export Options Card */}
        <Card className="border-green-300 mb-8">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Search & Export Options</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2 flex-1 min-w-[300px]">
                <Search className="w-5 h-5 text-green-600" />
                <label htmlFor="searchTerm" className="text-green-600 font-medium whitespace-nowrap">Search:</label>
                <input
                  id="searchTerm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search by State, Location, Warehouse Name, or Bank Branch..."
                  className="border border-green-300 focus:border-green-500 rounded px-3 py-2 flex-1 text-green-700"
                />
              </div>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white whitespace-nowrap" onClick={() => {
                const headers = [
                  'Inspection Code', 'Warehouse Code', 'State', 'Branch', 'Location', 
                  'Business Type', 'Warehouse Name', 'Bank State', 'Bank Branch', 
                  'Bank Name', 'IFSC Code', 'Receipt Type', 'Created Date', 'Remarks'
                ];
                const csvContent = [
                  headers.join(','),
                  ...filteredInspections.map(inspection => [
                    inspection.inspectionCode,
                    inspection.warehouseCode,
                    inspection.state,
                    inspection.branch,
                    inspection.location,
                    inspection.businessType.toUpperCase(),
                    inspection.warehouseName || '',
                    inspection.bankState,
                    inspection.bankBranch,
                    inspection.bankName,
                    inspection.ifscCode,
                    inspection.receiptType,
                    inspection.createdAt,
                    inspection.warehouseInspectionData?.remarks || ''
                  ].join(','))
                ].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `reactivate-warehouse-inspections-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
              }}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inspections Table */}
        {inspections.length > 0 ? (
          <Card className="border-green-300">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-700">Reactivate Warehouse Inspections</CardTitle>
              <CardDescription className="text-green-600">
                All reactivation-pending warehouse inspection surveys with their details and actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                className="overflow-x-auto relative"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 25% 25%, rgba(34, 197, 94, 0.03) 0%, transparent 50%),
                    radial-gradient(circle at 75% 75%, rgba(249, 115, 22, 0.03) 0%, transparent 50%),
                    linear-gradient(135deg, rgba(34, 197, 94, 0.01) 0%, rgba(249, 115, 22, 0.01) 100%)
                  `,
                  backgroundSize: '400px 400px, 300px 300px, 100% 100%',
                  backgroundPosition: '0% 0%, 100% 100%, 0% 0%',
                  backgroundRepeat: 'no-repeat, no-repeat, no-repeat'
                }}
              >
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="bg-orange-50 border-b-2 border-orange-200">
                      <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Inspection Code</TableHead>
                      <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Warehouse Code</TableHead>
                      <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">State</TableHead>
                      <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Branch</TableHead>
                      <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Location</TableHead>
                      <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Business Type</TableHead>
                      <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Warehouse Name</TableHead>
                      <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Bank State</TableHead>
                      <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Bank Branch</TableHead>
                      <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Bank Name</TableHead>
                      <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">IFSC Code</TableHead>
                      <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Receipt Type</TableHead>
                      <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Created</TableHead>
                      <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Remarks</TableHead>
                      <TableHead className="text-orange-700 font-semibold text-center p-2 whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInspections.map((inspection) => (
                      <TableRow key={inspection.id} className="hover:bg-green-50 border-b border-gray-200">
                        <TableCell className="text-green-700 font-bold border-r border-gray-300 text-center p-2 whitespace-nowrap">{inspection.inspectionCode}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{inspection.warehouseCode}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{inspection.state}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{inspection.branch}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{inspection.location}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{inspection.businessType.toUpperCase()}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{inspection.warehouseName}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{inspection.bankState}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{inspection.bankBranch}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{inspection.bankName}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{inspection.ifscCode}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{inspection.receiptType}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{inspection.createdAt}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 max-w-xs">
                          <div className="truncate" title={inspection.warehouseInspectionData?.remarks || ''}>
                            {inspection.warehouseInspectionData?.remarks || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center p-2">
                          <div className="flex space-x-2 justify-center">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewDetails(inspection)}
                              className="border-blue-300 text-blue-600 hover:bg-blue-50"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleClose(inspection)}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              title="Close Warehouse"
                            >
                              <Lock className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-12">
            <RefreshCw className="w-16 h-16 text-teal-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reactivation Pending Inspections</h3>
            <p className="text-gray-500">
              There are currently no warehouse inspections pending reactivation.
            </p>
          </div>
        )}

        {/* Warehouse Inspection Form Dialog */}
        <Dialog open={showInspectionForm} onOpenChange={setShowInspectionForm}>
          <DialogContent className="max-w-full max-h-[90vh] overflow-y-auto p-0">
            {selectedInspection && (
              <WarehouseInspectionForm 
                onClose={() => setShowInspectionForm(false)}
                initialData={convertInspectionToFormData(selectedInspection)}
                mode="view"
                onStatusChange={(warehouseCode, newStatus) => {
                  // Reload the inspections data after status change
                  loadInspections();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 