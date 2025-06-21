"use client";

import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import {
  RotateCcw,
  
  
  Download,
  Eye
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

export default function ResubmittedWarehousePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<InspectionData | null>(null);

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
      });
      // Filter for resubmitted status
      const resubmittedInspections = inspectionData.filter(item => item.warehouseStatus === 'resubmitted');
      setInspections(resubmittedInspections);
    } catch (error) {
      console.error('Error loading inspections:', error);
      toast({
        title: "Error",
        description: "Failed to load inspections",
        variant: "destructive",
      });
    }
  };

  const getWarehouseStatus = (warehouseCode: string): 'pending' | 'submitted' | 'activated' | 'rejected' | 'resubmitted' | 'closed' => {
    // Simple logic to determine status - you can modify this based on your business logic
    // For demo purposes, showing empty results for non-pending statuses
    return 'pending'; // This will show no results for resubmitted status
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
    a.download = `resubmitted-warehouse-inspections-${new Date().toISOString().split('T')[0]}.csv`;
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

  const convertInspectionToFormData = (inspection: InspectionData) => {
    // Convert inspection data to the format expected by the warehouse inspection form
    return {
      // Basic warehouse details
      warehouseName: inspection.warehouseName || '',
      warehouseCode: inspection.warehouseCode || '',
      address: '', // Not available in inspection data
      status: 'resubmitted',
      typeOfWarehouse: '',
      
      // Bank details (single bank from inspection)
      bankState: inspection.bankState || '',
      bankBranch: inspection.bankBranch || '',
      bankName: inspection.bankName || '',
      ifscCode: inspection.ifscCode || '',
      
      // Location details from inspection
      state: inspection.state || '',
      branch: inspection.branch || '',
      location: inspection.location || '',
      businessType: inspection.businessType || '',
      receiptType: inspection.receiptType || '',
      
      // Default values for other fields that aren't in inspection data
      license: '',
      licenseNumber: '',
      dateOfInspection: null,
      godownOwnership: '',
      nameOfClient: '',
      godownOwnerName: '',
      godownManagedBy: '',
      warehouseLength: '',
      warehouseBreadth: '',
      warehouseHeight: '',
      divisionFactor: '',
      warehouseCapacity: '',
      constructionYear: '',
      totalChambers: '',
      latitude: '',
      longitude: '',
      
      // Physical condition defaults
      flooring: '',
      shutterDoor: '',
      customShutterDoor: '',
      walls: '',
      roof: '',
      plinthHeight: '',
      anyLeakage: '',
      drainageChannels: '',
      electricWiring: '',
      compoundWallAvailability: '',
      typeOfWall: '',
      compoundGate: '',
      numberOfGates: '',
      isWarehouseClean: '',
      waterAvailability: '',
      typeOfAvailability: '',
      
      // Other defaults
      typeOfColdStorage: '',
      typeOfCoolingSystem: '',
      typeOfInsulation: '',
      temperatureMaintained: '',
      insuranceTakenBy: '',
      insuranceCompany: '',
      insurancePolicyNumber: '',
      assuredSum: '',
      validityOfInsurance: null,
      originalVerified: '',
      securityAvailable: '',
      typeOfSecurity: '',
      securityGuard: '',
      stackingDone: '',
      commodityStored: '',
      dunnageUsed: '',
      numberOfBags: '',
      weightInMT: '',
      stockCountable: '',
      otherBanksCargo: '',
      nameOfBank: [],
      otherCollateralManager: '',
      nameOfManager: '',
      commodity: '',
      quantity: '',
      dividedIntoChambers: '',
      howManyChambers: '',
      usingStackCards: '',
      maintainingRegisters: '',
      fireFightingEquipments: '',
      numberOfExtinguishers: '',
      expiryDate: null,
      weighbridgeFacility: '',
      weighbridgeType: '',
      distanceToWeighbridge: '',
      distanceToPoliceStation: '',
      distanceToFireStation: '',
      riskOfCargoAffected: '',
      duringMonsoon: '',
      monsoonRisk: '',
      insuranceClaimHistory: '',
      claimRemarks: '',
      warehouseFitCertification: false,
      nameOfOE: '',
      oeDate: null,
      contactNumber: '',
      place: '',
      attachedFiles: [],
      
      // Include creation info
      createdAt: inspection.createdAt || '',
      inspectionCode: inspection.inspectionCode || inspection.id || ''
    };
  };

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
              <RotateCcw className="inline mr-2 h-8 w-8 text-purple-500" />
              Resubmitted Warehouses
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
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <RotateCcw className="w-6 h-6 text-purple-500" />
            <div>
              <h3 className="text-lg font-medium text-purple-900">Resubmitted Warehouses</h3>
              <p className="text-purple-700 mt-1">
                Warehouses that have been resubmitted after corrections and are awaiting review.
              </p>
            </div>
          </div>
        </div>

        {/* Inspections Table */}
        {inspections.length > 0 ? (
          <Card className="border-green-300">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-700">Resubmitted Warehouse Inspections</CardTitle>
              <CardDescription className="text-green-600">
                All resubmitted warehouse inspection surveys with their details and actions.
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
                    {inspections.map((inspection) => (
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
            <RotateCcw className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Resubmitted Inspections</h3>
            <p className="text-gray-500">
              There are currently no warehouse inspections in resubmitted status.
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