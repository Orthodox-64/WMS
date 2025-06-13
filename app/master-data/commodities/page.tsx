"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, CheckCircle, AlertCircle, X, Download, Search, Plus, MapPin, Package, Minus } from "lucide-react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Particular {
  name: string;
  minPercentage: number;
  maxPercentage: number;
}

interface CommodityVariety {
  id?: string;
  varietyId: string;
  varietyName: string;
  locationId: string;
  locationName: string;
  branchName: string;
  rate: number;
  particulars: Particular[];
  createdAt?: string;
}

interface CommodityData {
  id?: string;
  commodityId: string;
  commodityName: string;
  varieties: CommodityVariety[];
  createdAt?: string;
}

interface BranchLocation {
  locationId: string;
  locationName: string;
  branchName: string;
  state: string;
  branch: string;
}

export default function CommodityModulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [branchLocations, setBranchLocations] = useState<BranchLocation[]>([]);
  const [filteredCommodities, setFilteredCommodities] = useState<CommodityData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CommodityData>({
    commodityId: '',
    commodityName: '',
    varieties: [],
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAddCommodityModal, setShowAddCommodityModal] = useState(false);
  const [showAddVarietyModal, setShowAddVarietyModal] = useState(false);
  const [selectedCommodity, setSelectedCommodity] = useState<CommodityData | null>(null);
  const [varietyFormData, setVarietyFormData] = useState<CommodityVariety>({
    varietyId: '',
    varietyName: '',
    locationId: '',
    locationName: '',
    branchName: '',
    rate: 0,
    particulars: [{ name: 'Moisture', minPercentage: 0, maxPercentage: 15 }],
  });
  const [expandedCommodities, setExpandedCommodities] = useState<Set<string>>(new Set());
  const [isEditingVariety, setIsEditingVariety] = useState(false);
  const [editingVarietyId, setEditingVarietyId] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user has access
  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user?.role, router]);

  // Load commodities and branch locations data
  useEffect(() => {
    loadCommodities();
    loadBranchLocations();
  }, []);

  // Filter commodities based on search term
  useEffect(() => {
    filterCommoditiesBySearch();
  }, [commodities, searchTerm]);

  const loadCommodities = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'commodities'));
      const commoditiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        varieties: doc.data().varieties || []
      })) as CommodityData[];
      setCommodities(commoditiesData);
    } catch (error) {
      console.error('Error loading commodities:', error);
    }
  };

  const loadBranchLocations = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'branches'));
      const branchesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          state: data.state,
          branch: data.branch,
          locations: data.locations || []
        };
      });
      
      // Flatten all locations from all branches
      const allLocations: BranchLocation[] = [];
      branchesData.forEach(branchData => {
        if (branchData.locations && branchData.locations.length > 0) {
          branchData.locations.forEach((location: any) => {
            allLocations.push({
              locationId: location.locationId,
              locationName: location.locationName,
              branchName: branchData.name,
              state: branchData.state,
              branch: branchData.branch
            });
          });
        }
      });
      
      setBranchLocations(allLocations);
    } catch (error) {
      console.error('Error loading branch locations:', error);
    }
  };

  const filterCommoditiesBySearch = () => {
    if (!searchTerm.trim()) {
      setFilteredCommodities(commodities);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = commodities.filter(commodity =>
      commodity.commodityName.toLowerCase().includes(searchLower) ||
      commodity.commodityId.toLowerCase().includes(searchLower) ||
      commodity.varieties.some(variety => 
        variety.varietyName.toLowerCase().includes(searchLower) ||
        variety.locationName.toLowerCase().includes(searchLower) ||
        variety.branchName.toLowerCase().includes(searchLower)
      )
    );

    setFilteredCommodities(filtered);
  };

  const exportToCSV = () => {
    const dataToExport = searchTerm.trim() ? filteredCommodities : commodities;
    
    if (dataToExport.length === 0) {
      toast({
        title: "❌ No Data to Export",
        description: "There are no commodities to export.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const headers = [
      'Commodity ID', 'Commodity Name', 'Variety ID', 'Variety Name', 'Location', 'Branch', 'Rate (₹)', 'Particulars', 'Commodity Created Date', 'Variety Created Date'
    ];

    const csvData = [headers];
    
    dataToExport.forEach(commodity => {
      if (commodity.varieties.length === 0) {
        // Commodity without varieties
        csvData.push([
          '-',
          commodity.commodityName,
          '',
          '',
          '',
          '',
          '',
          '',
          commodity.createdAt ? new Date(commodity.createdAt).toLocaleDateString() : '',
          ''
        ]);
      } else {
        // Commodity with varieties
        commodity.varieties.forEach(variety => {
          csvData.push([
            variety.varietyId,
            commodity.commodityName,
            variety.varietyId,
            variety.varietyName,
            variety.locationName,
            variety.branchName,
            variety.rate.toString(),
            variety.particulars?.map(p => `${p.name}: ${p.minPercentage}%-${p.maxPercentage}%`).join('; ') || '',
            commodity.createdAt ? new Date(commodity.createdAt).toLocaleDateString() : '',
            variety.createdAt ? new Date(variety.createdAt).toLocaleDateString() : ''
          ]);
        });
      }
    });

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commodities_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "✅ Export Successful",
      description: `${dataToExport.length} commodities exported to CSV file.`,
      className: "bg-green-100 border-green-500 text-green-700",
      duration: 3000,
    });
  };

  // Generate unique commodity ID
  const generateCommodityId = () => {
    if (commodities.length === 0) {
      return 'CM-0001';
    }
    
    // Extract numbers from existing commodity IDs and find the highest
    const existingNumbers = commodities
      .map(commodity => commodity.commodityId)
      .filter(id => id && id.startsWith('CM-'))
      .map(id => parseInt(id.split('-')[1]))
      .filter(num => !isNaN(num));
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    
    return `CM-${nextNumber.toString().padStart(4, '0')}`;
  };

  // Generate unique variety ID 
  const generateVarietyId = () => {
    // Get all existing variety IDs from all commodities
    const allVarietyIds: string[] = [];
    commodities.forEach(commodity => {
      commodity.varieties.forEach(variety => {
        if (variety.varietyId) {
          allVarietyIds.push(variety.varietyId);
        }
      });
    });

    const existingNumbers = allVarietyIds
      .filter(id => id && id.startsWith('CV-'))
      .map(id => parseInt(id.split('-')[1]))
      .filter(num => !isNaN(num));
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    
    return `CV-${nextNumber.toString().padStart(4, '0')}`;
  };

  const handleInputChange = (field: keyof CommodityData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVarietyInputChange = (field: keyof CommodityVariety, value: string | number | Particular[]) => {
    setVarietyFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleParticularChange = (index: number, field: keyof Particular, value: string | number) => {
    const updatedParticulars = [...varietyFormData.particulars];
    updatedParticulars[index] = { ...updatedParticulars[index], [field]: value };
    setVarietyFormData(prev => ({ ...prev, particulars: updatedParticulars }));
  };

  const addParticular = () => {
    setVarietyFormData(prev => ({
      ...prev,
      particulars: [...prev.particulars, { name: '', minPercentage: 0, maxPercentage: 0 }]
    }));
  };

  const removeParticular = (index: number) => {
    if (varietyFormData.particulars.length > 1) {
      const updatedParticulars = varietyFormData.particulars.filter((_, i) => i !== index);
      setVarietyFormData(prev => ({ ...prev, particulars: updatedParticulars }));
    }
  };

  const handleLocationSelect = (locationId: string) => {
    const selectedLocation = branchLocations.find(loc => loc.locationId === locationId);
    if (selectedLocation) {
      setVarietyFormData(prev => ({
        ...prev,
        locationId: selectedLocation.locationId,
        locationName: selectedLocation.locationName,
        branchName: selectedLocation.branchName
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const commodityData = {
        ...formData,
        createdAt: isEditing ? formData.createdAt : new Date().toISOString(),
      };

      if (isEditing && editingId) {
        // Update existing commodity
        await updateDoc(doc(db, 'commodities', editingId), commodityData);
        setSuccessMessage({
          title: "Commodity Updated Successfully! 🎉",
          description: `${formData.commodityName} has been updated in the system.`
        });
      } else {
        // Add new commodity
        const newCommodityId = generateCommodityId();
        const newCommodityData = { ...commodityData, commodityId: newCommodityId };
        
        await addDoc(collection(db, 'commodities'), newCommodityData);
        setSuccessMessage({
          title: "New Commodity Added Successfully! 🎉",
          description: `${formData.commodityName} has been registered with Commodity ID: ${newCommodityId}. You can now add varieties to this commodity.`
        });
      }

      setShowSuccessModal(true);
      
      // Close the add commodity modal and reset form
      setShowAddCommodityModal(false);
      setFormData({
        commodityId: '',
        commodityName: '',
        varieties: [],
      });
      setIsEditing(false);
      setEditingId(null);
      loadCommodities();
      
      // Auto close modal after 4 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 4000);
      
    } catch (error) {
      toast({
        title: "❌ Error Occurred",
        description: "Failed to save commodity information. Please check your connection and try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVarietySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCommodity) return;
    
    setIsSubmitting(true);
    
    try {
      let updatedVarieties;
      let successMsg;
      
      if (isEditingVariety && editingVarietyId) {
        // Edit existing variety
        updatedVarieties = selectedCommodity.varieties.map(variety =>
          variety.varietyId === editingVarietyId
            ? { ...varietyFormData, createdAt: variety.createdAt }
            : variety
        );
        successMsg = {
          title: "Variety Updated Successfully! ✅",
          description: `${varietyFormData.varietyName} has been updated in ${selectedCommodity.commodityName}`
        };
      } else {
        // Add new variety
        const newVarietyId = generateVarietyId();
        const newVariety: CommodityVariety = {
          ...varietyFormData,
          varietyId: newVarietyId,
          createdAt: new Date().toISOString(),
        };
        updatedVarieties = [...selectedCommodity.varieties, newVariety];
        successMsg = {
          title: "Variety Added Successfully! 📍",
          description: `${varietyFormData.varietyName} has been added to ${selectedCommodity.commodityName} with Variety ID: ${newVarietyId}`
        };
      }
      
      const updatedCommodity = { ...selectedCommodity, varieties: updatedVarieties };
      
      await updateDoc(doc(db, 'commodities', selectedCommodity.id!), updatedCommodity);
      
      setSuccessMessage(successMsg);
      setShowSuccessModal(true);
      setShowAddVarietyModal(false);
      setVarietyFormData({
        varietyId: '',
        varietyName: '',
        locationId: '',
        locationName: '',
        branchName: '',
        rate: 0,
        particulars: [{ name: 'Moisture', minPercentage: 0, maxPercentage: 15 }],
      });
      setSelectedCommodity(null);
      setIsEditingVariety(false);
      setEditingVarietyId(null);
      loadCommodities();
      
      // Auto close modal after 4 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 4000);
      
    } catch (error) {
      toast({
        title: "❌ Error Occurred",
        description: `Failed to ${isEditingVariety ? 'update' : 'add'} variety. Please check your connection and try again.`,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (commodity: CommodityData) => {
    setFormData(commodity);
    setIsEditing(true);
    setEditingId(commodity.id || null);
    setShowAddCommodityModal(true);
  };

  const handleAddNewCommodity = () => {
    // Reset form for new commodity
    setFormData({
      commodityId: '',
      commodityName: '',
      varieties: [],
    });
    setIsEditing(false);
    setEditingId(null);
    setShowAddCommodityModal(true);
  };

  const handleAddVariety = (commodity: CommodityData) => {
    setSelectedCommodity(commodity);
    setVarietyFormData({
      varietyId: '',
      varietyName: '',
      locationId: '',
      locationName: '',
      branchName: '',
      rate: 0,
      particulars: [{ name: 'Moisture', minPercentage: 0, maxPercentage: 15 }],
    });
    setIsEditingVariety(false);
    setEditingVarietyId(null);
    setShowAddVarietyModal(true);
  };

  const handleEditVariety = (commodity: CommodityData, variety: CommodityVariety) => {
    setSelectedCommodity(commodity);
    setVarietyFormData({
      varietyId: variety.varietyId,
      varietyName: variety.varietyName,
      locationId: variety.locationId,
      locationName: variety.locationName,
      branchName: variety.branchName,
      rate: variety.rate,
      particulars: variety.particulars || [{ name: 'Moisture', minPercentage: 0, maxPercentage: 15 }],
    });
    setIsEditingVariety(true);
    setEditingVarietyId(variety.varietyId);
    setShowAddVarietyModal(true);
  };

  const handleCloseModal = () => {
    setShowAddCommodityModal(false);
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      commodityId: '',
      commodityName: '',
      varieties: [],
    });
  };

  const handleCloseVarietyModal = () => {
    setShowAddVarietyModal(false);
    setSelectedCommodity(null);
    setVarietyFormData({
      varietyId: '',
      varietyName: '',
      locationId: '',
      locationName: '',
      branchName: '',
      rate: 0,
      particulars: [{ name: 'Moisture', minPercentage: 0, maxPercentage: 15 }],
    });
    setIsEditingVariety(false);
    setEditingVarietyId(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'commodities', id));
      setSuccessMessage({
        title: "Commodity Deleted Successfully! 🗑️",
        description: "The commodity and all its varieties have been permanently removed from the database. This action cannot be undone."
      });
      setShowSuccessModal(true);
      setDeleteId(null);
      loadCommodities();
      
      // Auto close modal after 3 seconds for delete
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
      
    } catch (error) {
      toast({
        title: "❌ Delete Failed",
        description: "Failed to delete commodity. Please check your connection and try again.",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const toggleCommodityExpansion = (commodityId: string) => {
    const newExpanded = new Set(expandedCommodities);
    if (newExpanded.has(commodityId)) {
      newExpanded.delete(commodityId);
    } else {
      newExpanded.add(commodityId);
    }
    setExpandedCommodities(newExpanded);
  };

  if (user?.role !== 'admin') return null;

  const displayCommodities = searchTerm.trim() ? filteredCommodities : commodities;

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
              ← Dashboard
            </button>
          </div>
          
          {/* Centered Title with Light Orange Background */}
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-orange-600 inline-block border-b-4 border-green-500 pb-2 px-6 py-3 bg-orange-100 rounded-lg">
              Commodity & Variety Module
            </h1>
          </div>
          
          {/* Add Commodity Button */}
          <Button
            onClick={handleAddNewCommodity}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 shadow-lg"
          >
            ✅ Add New Commodity
          </Button>
        </div>

        {/* Search and Export Section */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Search & Export Options</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2 flex-1 min-w-[300px]">
                <Search className="w-4 h-4 text-green-600" />
                <Label htmlFor="searchTerm" className="text-green-600 font-medium whitespace-nowrap">Search:</Label>
                <Input
                  id="searchTerm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by commodity name, variety, location, or branch..."
                  className="border-green-300 focus:border-green-500 flex-1"
                />
                {searchTerm && (
                  <Button
                    onClick={() => setSearchTerm('')}
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <Button
                onClick={exportToCSV}
                className="bg-blue-500 hover:bg-blue-600 text-white whitespace-nowrap"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
            
            {searchTerm && (
              <div className="mt-3 text-sm text-green-600">
                {filteredCommodities.length} commodities found for "{searchTerm}"
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commodities Table with Hierarchical Structure */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Registered Commodities & Varieties</CardTitle>
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
                    <TableHead className="text-orange-700 font-semibold sticky left-0 bg-orange-100 border-r border-orange-300 text-center p-2 whitespace-nowrap">Variety ID</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Commodity Name</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Variety Name</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Branch</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Rate (₹)</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Particulars</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Created Date</TableHead>
                    <TableHead className="text-orange-700 font-semibold sticky right-0 bg-orange-100 border-l border-orange-300 text-center p-2 whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayCommodities.map((commodity) => (
                    <>
                      {/* Commodity Row */}
                      <TableRow key={commodity.id} className="hover:bg-green-50 border-b border-gray-200">
                        <TableCell className="text-green-700 font-bold sticky left-0 bg-white border-r border-gray-300 text-center p-2 whitespace-nowrap">
                          <span className="text-gray-400 text-xs">-</span>
                        </TableCell>
                        <TableCell className="text-green-700 font-medium border-r border-gray-300 text-center p-2 whitespace-nowrap flex items-center gap-2">
                          <Package className="w-4 h-4 text-green-600" />
                          {commodity.commodityName}
                        </TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                              {commodity.varieties.length} varieties
                            </span>
                            {commodity.varieties.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleCommodityExpansion(commodity.id!)}
                                className="text-green-600 hover:bg-green-100 p-1"
                              >
                                {expandedCommodities.has(commodity.id!) ? '▼' : '▶'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">
                          <span className="text-gray-400 text-xs">-</span>
                        </TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">
                          {commodity.createdAt ? new Date(commodity.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="sticky right-0 bg-white border-l border-gray-300 text-center p-2">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-300 text-blue-600 hover:bg-blue-50"
                              onClick={() => handleAddVariety(commodity)}
                              title="Add Variety"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-orange-300 text-orange-600 hover:bg-orange-50"
                              onClick={() => handleEdit(commodity)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="border-red-200">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5" />
                                    Confirm Deletion
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-700">
                                    Are you sure you want to delete <strong>{commodity.commodityName}</strong> and all its varieties? 
                                    This action cannot be undone and will permanently remove all commodity data from the system.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-gray-300 text-gray-600 hover:bg-gray-50">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-red-500 hover:bg-red-600 text-white"
                                    onClick={() => commodity.id && handleDelete(commodity.id)}
                                  >
                                    🗑️ Delete Commodity
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Variety Rows (Expandable) */}
                      {expandedCommodities.has(commodity.id!) && commodity.varieties.map((variety) => (
                        <TableRow key={variety.id || variety.varietyId} className="bg-blue-50 border-b border-blue-200">
                          <TableCell className="text-blue-700 font-medium sticky left-0 bg-blue-50 border-r border-blue-300 text-center p-2 whitespace-nowrap pl-8">
                            {variety.varietyId}
                          </TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap pl-8">
                            {commodity.commodityName}
                          </TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap flex items-center gap-2 pl-8">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            {variety.varietyName}
                          </TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap">
                            {variety.locationName}
                          </TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap font-mono">
                            ₹{variety.rate.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 min-w-48">
                            <div className="space-y-1 text-xs">
                              {variety.particulars?.map((p, index) => (
                                <div key={index} className="bg-blue-100 px-2 py-1 rounded border">
                                  <span className="font-medium text-blue-800">{p.name}:</span>
                                  <br />
                                  <span className="text-blue-600">{p.minPercentage}% - {p.maxPercentage}%</span>
                                </div>
                              )) || <span className="text-gray-400 text-xs">-</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap">
                            {variety.createdAt ? new Date(variety.createdAt).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="sticky right-0 bg-blue-50 border-l border-blue-300 text-center p-2">
                            <div className="flex space-x-1 justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-orange-300 text-orange-600 hover:bg-orange-50 p-1"
                                onClick={() => handleEditVariety(commodity, variety)}
                                title="Edit Variety"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                  {displayCommodities.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-500 py-8 border-r border-gray-300">
                        {searchTerm ? 'No commodities found for the search term.' : 'No commodities registered yet. Click "Add New Commodity" to get started.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Commodity Modal */}
        <Dialog open={showAddCommodityModal} onOpenChange={setShowAddCommodityModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-orange-300">
            <DialogHeader>
              <DialogTitle className="text-orange-700 text-xl flex items-center gap-2">
                {isEditing ? '🔄 Edit Commodity' : '✅ Add New Commodity'}
              </DialogTitle>
              <DialogDescription className="text-green-600">
                {isEditing ? 'Update commodity information' : 'Enter commodity basic information (varieties can be added separately)'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {/* Commodity Name */}
                <div className="space-y-2">
                  <Label htmlFor="commodityName" className="text-green-600 font-medium">
                    Commodity Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="commodityName"
                    value={formData.commodityName}
                    onChange={(e) => handleInputChange('commodityName', e.target.value)}
                    className="border-orange-300 focus:border-orange-500 text-orange-700"
                    placeholder="e.g., Wheat, Rice, Corn"
                    required
                  />
                </div>
              </div>

              {/* Important Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-blue-800 font-semibold mb-2">📝 Important Note:</h4>
                <p className="text-blue-700 text-sm">
                  After adding the commodity, you can add multiple varieties with different rates for different branch locations. 
                  Each variety will be linked to a specific location from the branch module.
                </p>
              </div>

              {/* Modal Footer with Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                  onClick={handleCloseModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting 
                    ? (isEditing ? '🔄 Updating...' : '⏳ Adding Commodity...') 
                    : (isEditing ? '🔄 Update Commodity' : '✅ Add Commodity')
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Variety Modal */}
        <Dialog open={showAddVarietyModal} onOpenChange={setShowAddVarietyModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-blue-300">
            <DialogHeader>
              <DialogTitle className="text-blue-700 text-xl flex items-center gap-2">
                {isEditingVariety ? '🔄 Edit Variety' : '📍 Add New Variety'}
              </DialogTitle>
              <DialogDescription className="text-green-600">
                {isEditingVariety ? 'Editing variety in' : 'Adding variety to'}: <strong>{selectedCommodity?.commodityName}</strong>
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleVarietySubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Variety Name */}
                <div className="space-y-2">
                  <Label htmlFor="varietyName" className="text-green-600 font-medium">
                    Variety Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="varietyName"
                    value={varietyFormData.varietyName}
                    onChange={(e) => handleVarietyInputChange('varietyName', e.target.value)}
                    className="border-blue-300 focus:border-blue-500 text-blue-700"
                    placeholder="e.g., Basmati, Durum, Sweet Corn"
                    required
                  />
                </div>

                {/* Rate */}
                <div className="space-y-2">
                  <Label htmlFor="rate" className="text-green-600 font-medium">
                    Rate (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={varietyFormData.rate}
                    onChange={(e) => handleVarietyInputChange('rate', parseFloat(e.target.value) || 0)}
                    className="border-blue-300 focus:border-blue-500 text-blue-700"
                    placeholder="e.g., 2500.00"
                    required
                  />
                </div>

                {/* Location Selection */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="location" className="text-green-600 font-medium">Branch <span className="text-red-500">*</span></Label>
                  <Select
                    value={varietyFormData.locationId}
                    onValueChange={handleLocationSelect}
                    required
                  >
                    <SelectTrigger className="border-blue-300 focus:border-blue-500 text-blue-700 [&>span]:text-blue-700">
                      <SelectValue placeholder="Select branch" className="text-blue-700" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-60">
                      {branchLocations.map(location => (
                        <SelectItem 
                          key={location.locationId} 
                          value={location.locationId} 
                          className="!text-blue-700 hover:!bg-blue-50 focus:!bg-blue-50 hover:!text-blue-700 focus:!text-blue-700 data-[highlighted]:!text-blue-700 data-[highlighted]:!bg-blue-50"
                          style={{ color: '#1d4ed8 !important' }}
                        >
                          {location.locationName} - {location.branchName} ({location.state})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Selected Location Info Display */}
              {varietyFormData.locationId && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-green-800 font-semibold mb-2">📍 Selected Location Information:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-green-700">Location:</span>
                      <p className="text-green-600">{varietyFormData.locationName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Branch:</span>
                      <p className="text-green-600">{varietyFormData.branchName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Location ID:</span>
                      <p className="text-green-600">{varietyFormData.locationId}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Particulars Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-blue-600">Particulars (Parameters) <span className="text-red-500">*</span></h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-green-300 text-green-600 hover:bg-green-50"
                    onClick={addParticular}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Parameter
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {varietyFormData.particulars.map((particular, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="space-y-2">
                        <Label className="text-green-600 font-medium text-sm">
                          Parameter Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={particular.name}
                          onChange={(e) => handleParticularChange(index, 'name', e.target.value)}
                          className="border-blue-300 focus:border-blue-500 text-blue-700"
                          placeholder="e.g., Moisture, Protein"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-green-600 font-medium text-sm">
                          Min Percentage <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          value={particular.minPercentage}
                          onChange={(e) => handleParticularChange(index, 'minPercentage', parseFloat(e.target.value) || 0)}
                          className="border-blue-300 focus:border-blue-500 text-blue-700"
                          min="0"
                          max="100"
                          step="0.1"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-green-600 font-medium text-sm">
                          Max Percentage <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          value={particular.maxPercentage}
                          onChange={(e) => handleParticularChange(index, 'maxPercentage', parseFloat(e.target.value) || 0)}
                          className="border-blue-300 focus:border-blue-500 text-blue-700"
                          min="0"
                          max="100"
                          step="0.1"
                          required
                        />
                      </div>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-600 hover:bg-red-50 w-full"
                          onClick={() => removeParticular(index)}
                          disabled={varietyFormData.particulars.length === 1}
                        >
                          <Minus className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer with Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                  onClick={handleCloseVarietyModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting 
                    ? (isEditingVariety ? '⏳ Updating Variety...' : '⏳ Adding Variety...') 
                    : (isEditingVariety ? '🔄 Update Variety' : '📍 Add Variety')
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Success Modal */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="border-green-300 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-green-700 flex items-center gap-3 text-xl">
                <CheckCircle className="w-6 h-6 text-green-500" />
                {successMessage.title}
              </DialogTitle>
              <DialogDescription className="text-gray-700 mt-3 text-base leading-relaxed">
                {successMessage.description}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end mt-6">
              <Button 
                onClick={() => setShowSuccessModal(false)}
                className="bg-green-500 hover:bg-green-600 text-white px-6"
              >
                ✅ Got it!
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 