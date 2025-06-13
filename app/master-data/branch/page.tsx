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
import { Trash2, Edit, CheckCircle, AlertCircle, X, Download, Search, Plus, MapPin, Building2 } from "lucide-react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface BranchLocation {
  id?: string;
  locationId: string;
  locationName: string;
  address?: string;
  pincode?: string;
  createdAt?: string;
}

interface BranchData {
  id?: string;
  branchId: string;
  name: string;
  state: string;
  branch: string;
  locations: BranchLocation[];
  createdAt?: string;
}

export default function BranchModulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [branches, setBranches] = useState<BranchData[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<BranchData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BranchData>({
    branchId: '',
    name: '',
    state: '',
    branch: '',
    locations: [],
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);
  const [locationFormData, setLocationFormData] = useState<BranchLocation>({
    locationId: '',
    locationName: '',
    address: '',
    pincode: '',
  });
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Indian states list
  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
    "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", 
    "Ladakh", "Lakshadweep", "Puducherry"
  ];

  // Check if user has access
  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user?.role, router]);

  // Load branches data
  useEffect(() => {
    loadBranches();
  }, []);

  // Filter branches based on search term
  useEffect(() => {
    filterBranchesBySearch();
  }, [branches, searchTerm]);

  const loadBranches = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'branches'));
      const branchesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        locations: doc.data().locations || []
      })) as BranchData[];
      setBranches(branchesData);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const filterBranchesBySearch = () => {
    if (!searchTerm.trim()) {
      setFilteredBranches(branches);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = branches.filter(branch =>
      branch.name.toLowerCase().includes(searchLower) ||
      branch.branch.toLowerCase().includes(searchLower) ||
      branch.state.toLowerCase().includes(searchLower) ||
      branch.branchId.toLowerCase().includes(searchLower) ||
      branch.locations.some(location => 
        location.locationName.toLowerCase().includes(searchLower) ||
        location.address?.toLowerCase().includes(searchLower) ||
        location.pincode?.toLowerCase().includes(searchLower)
      )
    );

    setFilteredBranches(filtered);
  };

  const exportToCSV = () => {
    const dataToExport = searchTerm.trim() ? filteredBranches : branches;
    
    if (dataToExport.length === 0) {
      toast({
        title: "❌ No Data to Export",
        description: "There are no branches to export.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const headers = [
      'Branch ID', 'Name', 'State', 'Branch', 'Location Name', 'Address', 'Pincode', 'Branch Created Date', 'Location Created Date'
    ];

    const csvData = [headers];
    
    dataToExport.forEach(branch => {
      if (branch.locations.length === 0) {
        // Branch without locations
        csvData.push([
          '-',
          branch.name,
          branch.state,
          branch.branch,
          '',
          '',
          '',
          branch.createdAt ? new Date(branch.createdAt).toLocaleDateString() : '',
          ''
        ]);
      } else {
        // Branch with locations
        branch.locations.forEach(location => {
          csvData.push([
            location.locationId,
            branch.name,
            branch.state,
            branch.branch,
            location.locationName,
            location.address || '',
            location.pincode || '',
            branch.createdAt ? new Date(branch.createdAt).toLocaleDateString() : '',
            location.createdAt ? new Date(location.createdAt).toLocaleDateString() : ''
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
    a.download = `branches_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "✅ Export Successful",
      description: `${dataToExport.length} branches exported to CSV file.`,
      className: "bg-green-100 border-green-500 text-green-700",
      duration: 3000,
    });
  };

  // Generate unique branch ID
  const generateBranchId = () => {
    if (branches.length === 0) {
      return 'BR-0001';
    }
    
    // Extract numbers from existing branch IDs and find the highest
    const existingNumbers = branches
      .map(branch => branch.branchId)
      .filter(id => id && id.startsWith('BR-'))
      .map(id => parseInt(id.split('-')[1]))
      .filter(num => !isNaN(num));
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    
    return `BR-${nextNumber.toString().padStart(4, '0')}`;
  };

  // Generate unique location ID 
  const generateLocationId = () => {
    // Get all existing location IDs from all branches
    const allLocationIds: string[] = [];
    branches.forEach(branch => {
      branch.locations.forEach(location => {
        if (location.locationId) {
          allLocationIds.push(location.locationId);
        }
      });
    });

    const existingNumbers = allLocationIds
      .filter(id => id && id.startsWith('BR-'))
      .map(id => parseInt(id.split('-')[1]))
      .filter(num => !isNaN(num));
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    
    return `BR-${nextNumber.toString().padStart(4, '0')}`;
  };

  const handleInputChange = (field: keyof BranchData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationInputChange = (field: keyof BranchLocation, value: string) => {
    setLocationFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const branchData = {
        ...formData,
        createdAt: isEditing ? formData.createdAt : new Date().toISOString(),
      };

      if (isEditing && editingId) {
        // Update existing branch
        await updateDoc(doc(db, 'branches', editingId), branchData);
        setSuccessMessage({
          title: "Branch Updated Successfully! 🎉",
          description: `${formData.name} has been updated in the system.`
        });
      } else {
        // Add new branch
        const newBranchId = generateBranchId();
        const newBranchData = { ...branchData, branchId: newBranchId };
        
        await addDoc(collection(db, 'branches'), newBranchData);
        setSuccessMessage({
          title: "New Branch Added Successfully! 🎉",
          description: `${formData.name} has been registered with Branch ID: ${newBranchId}. You can now add locations to this branch.`
        });
      }

      setShowSuccessModal(true);
      
      // Close the add branch modal and reset form
      setShowAddBranchModal(false);
      setFormData({
        branchId: '',
        name: '',
        state: '',
        branch: '',
        locations: [],
      });
      setIsEditing(false);
      setEditingId(null);
      loadBranches();
      
      // Auto close modal after 4 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 4000);
      
    } catch (error) {
      toast({
        title: "❌ Error Occurred",
        description: "Failed to save branch information. Please check your connection and try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBranch) return;
    
    setIsSubmitting(true);
    
    try {
      let updatedLocations;
      let successMsg;
      
      if (isEditingLocation && editingLocationId) {
        // Edit existing location
        updatedLocations = selectedBranch.locations.map(location =>
          location.locationId === editingLocationId
            ? { ...locationFormData, createdAt: location.createdAt }
            : location
        );
        successMsg = {
          title: "Location Updated Successfully! ✅",
          description: `${locationFormData.locationName} has been updated in ${selectedBranch.name}`
        };
      } else {
        // Add new location
        const newLocationId = generateLocationId();
        const newLocation: BranchLocation = {
          ...locationFormData,
          locationId: newLocationId,
          createdAt: new Date().toISOString(),
        };
        updatedLocations = [...selectedBranch.locations, newLocation];
        successMsg = {
          title: "Location Added Successfully! 📍",
          description: `${locationFormData.locationName} has been added to ${selectedBranch.name} with Location ID: ${newLocationId}`
        };
      }
      
      const updatedBranch = { ...selectedBranch, locations: updatedLocations };
      
      await updateDoc(doc(db, 'branches', selectedBranch.id!), updatedBranch);
      
      setSuccessMessage(successMsg);
      setShowSuccessModal(true);
      setShowAddLocationModal(false);
      setLocationFormData({
        locationId: '',
        locationName: '',
        address: '',
        pincode: '',
      });
      setSelectedBranch(null);
      setIsEditingLocation(false);
      setEditingLocationId(null);
      loadBranches();
      
      // Auto close modal after 4 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 4000);
      
    } catch (error) {
      toast({
        title: "❌ Error Occurred",
        description: `Failed to ${isEditingLocation ? 'update' : 'add'} location. Please check your connection and try again.`,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (branch: BranchData) => {
    setFormData(branch);
    setIsEditing(true);
    setEditingId(branch.id || null);
    setShowAddBranchModal(true);
  };

  const handleAddNewBranch = () => {
    // Reset form for new branch
    setFormData({
      branchId: '',
      name: '',
      state: '',
      branch: '',
      locations: [],
    });
    setIsEditing(false);
    setEditingId(null);
    setShowAddBranchModal(true);
  };

  const handleAddLocation = (branch: BranchData) => {
    setSelectedBranch(branch);
    setLocationFormData({
      locationId: '',
      locationName: '',
      address: '',
      pincode: '',
    });
    setIsEditingLocation(false);
    setEditingLocationId(null);
    setShowAddLocationModal(true);
  };

  const handleEditLocation = (branch: BranchData, location: BranchLocation) => {
    setSelectedBranch(branch);
    setLocationFormData({
      locationId: location.locationId,
      locationName: location.locationName,
      address: location.address || '',
      pincode: location.pincode || '',
    });
    setIsEditingLocation(true);
    setEditingLocationId(location.locationId);
    setShowAddLocationModal(true);
  };

  const handleCloseModal = () => {
    setShowAddBranchModal(false);
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      branchId: '',
      name: '',
      state: '',
      branch: '',
      locations: [],
    });
  };

  const handleCloseLocationModal = () => {
    setShowAddLocationModal(false);
    setSelectedBranch(null);
    setLocationFormData({
      locationId: '',
      locationName: '',
      address: '',
      pincode: '',
    });
    setIsEditingLocation(false);
    setEditingLocationId(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'branches', id));
      setSuccessMessage({
        title: "Branch Deleted Successfully! 🗑️",
        description: "The branch and all its locations have been permanently removed from the database. This action cannot be undone."
      });
      setShowSuccessModal(true);
      setDeleteId(null);
      loadBranches();
      
      // Auto close modal after 3 seconds for delete
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
      
    } catch (error) {
      toast({
        title: "❌ Delete Failed",
        description: "Failed to delete branch. Please check your connection and try again.",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const toggleBranchExpansion = (branchId: string) => {
    const newExpanded = new Set(expandedBranches);
    if (newExpanded.has(branchId)) {
      newExpanded.delete(branchId);
    } else {
      newExpanded.add(branchId);
    }
    setExpandedBranches(newExpanded);
  };

  if (user?.role !== 'admin') return null;

  const displayBranches = searchTerm.trim() ? filteredBranches : branches;

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
              Branch & Location Module
            </h1>
          </div>
          
          {/* Add Branch Button */}
          <Button
            onClick={handleAddNewBranch}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 shadow-lg"
          >
            ✅ Add New Branch
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
                  placeholder="Search by name, state, branch, location, or pincode..."
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
                {filteredBranches.length} branches found for "{searchTerm}"
              </div>
            )}
          </CardContent>
        </Card>

        {/* Branches Table with Hierarchical Structure */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Registered Branches & Locations</CardTitle>
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
                    <TableHead className="text-orange-700 font-semibold sticky left-0 bg-orange-100 border-r border-orange-300 text-center p-2 whitespace-nowrap">Branch ID</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">State</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Branch</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Location</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Created Date</TableHead>
                    <TableHead className="text-orange-700 font-semibold sticky right-0 bg-orange-100 border-l border-orange-300 text-center p-2 whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayBranches.map((branch) => (
                    <>
                      {/* Branch Row */}
                      <TableRow key={branch.id} className="hover:bg-green-50 border-b border-gray-200">
                        <TableCell className="text-green-700 font-bold sticky left-0 bg-white border-r border-gray-300 text-center p-2 whitespace-nowrap">
                          <span className="text-gray-400 text-xs">-</span>
                        </TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{branch.state}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{branch.branch}</TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                              {branch.locations.length} locations
                            </span>
                            {branch.locations.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleBranchExpansion(branch.id!)}
                                className="text-green-600 hover:bg-green-100 p-1"
                              >
                                {expandedBranches.has(branch.id!) ? '▼' : '▶'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">
                          {branch.createdAt ? new Date(branch.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="sticky right-0 bg-white border-l border-gray-300 text-center p-2">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-300 text-blue-600 hover:bg-blue-50"
                              onClick={() => handleAddLocation(branch)}
                              title="Add Location"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-orange-300 text-orange-600 hover:bg-orange-50"
                              onClick={() => handleEdit(branch)}
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
                                    Are you sure you want to delete <strong>{branch.name}</strong> and all its locations? 
                                    This action cannot be undone and will permanently remove all branch data from the system.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-gray-300 text-gray-600 hover:bg-gray-50">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-red-500 hover:bg-red-600 text-white"
                                    onClick={() => branch.id && handleDelete(branch.id)}
                                  >
                                    🗑️ Delete Branch
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Location Rows (Expandable) */}
                      {expandedBranches.has(branch.id!) && branch.locations.map((location) => (
                        <TableRow key={location.id || location.locationId} className="bg-blue-50 border-b border-blue-200">
                          <TableCell className="text-blue-700 font-medium sticky left-0 bg-blue-50 border-r border-blue-300 text-center p-2 whitespace-nowrap pl-8">
                            {location.locationId}
                          </TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap">{branch.state}</TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap">{branch.branch}</TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap flex items-center gap-2 pl-8">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            {location.locationName}
                          </TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap">
                            {location.createdAt ? new Date(location.createdAt).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="sticky right-0 bg-blue-50 border-l border-blue-300 text-center p-2">
                            <div className="flex space-x-1 justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-orange-300 text-orange-600 hover:bg-orange-50 p-1"
                                onClick={() => handleEditLocation(branch, location)}
                                title="Edit Location"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                  {displayBranches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8 border-r border-gray-300">
                        {searchTerm ? 'No branches found for the search term.' : 'No branches registered yet. Click "Add New Branch" to get started.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Branch Modal */}
        <Dialog open={showAddBranchModal} onOpenChange={setShowAddBranchModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-orange-300">
            <DialogHeader>
              <DialogTitle className="text-orange-700 text-xl flex items-center gap-2">
                {isEditing ? '🔄 Edit Branch' : '✅ Add New Branch'}
              </DialogTitle>
              <DialogDescription className="text-green-600">
                {isEditing ? 'Update branch information' : 'Enter branch basic information (locations can be added separately)'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Branch */}
                <div className="space-y-2">
                  <Label htmlFor="branch" className="text-green-600 font-medium">
                    Branch <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="branch"
                    value={formData.branch}
                    onChange={(e) => handleInputChange('branch', e.target.value)}
                    className="border-orange-300 focus:border-orange-500 text-orange-700"
                    placeholder="e.g., Mumbai, Delhi, Pune"
                    required
                  />
                </div>

                {/* State Dropdown */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="state" className="text-green-600 font-medium">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => handleInputChange('state', value)}
                    required
                  >
                    <SelectTrigger className="border-orange-300 focus:border-orange-500 text-orange-700 [&>span]:text-orange-700">
                      <SelectValue 
                        placeholder="Select state" 
                        className="text-orange-700"
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-60">
                      {indianStates.map(state => (
                        <SelectItem 
                          key={state} 
                          value={state} 
                          className="!text-orange-700 hover:!bg-orange-50 focus:!bg-orange-50 hover:!text-orange-700 focus:!text-orange-700 data-[highlighted]:!text-orange-700 data-[highlighted]:!bg-orange-50"
                          style={{ color: '#c2410c !important' }}
                        >
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Important Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-blue-800 font-semibold mb-2">📝 Important Note:</h4>
                <p className="text-blue-700 text-sm">
                  After adding the branch, you can add multiple locations with different addresses and pincodes. 
                  Each location will inherit the branch name, state, and branch information.
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
                    ? (isEditing ? '🔄 Updating...' : '⏳ Adding Branch...') 
                    : (isEditing ? '🔄 Update Branch' : '✅ Add Branch')
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Location Modal */}
        <Dialog open={showAddLocationModal} onOpenChange={setShowAddLocationModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-blue-300">
            <DialogHeader>
              <DialogTitle className="text-blue-700 text-xl flex items-center gap-2">
                {isEditingLocation ? '🔄 Edit Location' : '📍 Add New Location'}
              </DialogTitle>
              <DialogDescription className="text-green-600">
                {isEditingLocation ? 'Editing location in' : 'Adding location to'}: <strong>{selectedBranch?.name}</strong> ({selectedBranch?.state} - {selectedBranch?.branch})
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleLocationSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Branch */}
                <div className="space-y-2">
                  <Label htmlFor="locationName" className="text-green-600 font-medium">
                    Branch <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="locationName"
                    value={locationFormData.locationName}
                    onChange={(e) => handleLocationInputChange('locationName', e.target.value)}
                    className="border-blue-300 focus:border-blue-500 text-blue-700"
                    placeholder="e.g., Mumbai Main, Delhi Central, Pune West"
                    required
                  />
                </div>

                {/* Pincode */}
                <div className="space-y-2">
                  <Label htmlFor="pincode" className="text-green-600 font-medium">
                    Pincode (Optional)
                  </Label>
                  <Input
                    id="pincode"
                    value={locationFormData.pincode}
                    onChange={(e) => handleLocationInputChange('pincode', e.target.value)}
                    className="border-blue-300 focus:border-blue-500 text-blue-700"
                    maxLength={6}
                    placeholder="e.g., 400001"
                  />
                </div>

                {/* Address (Optional) */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="text-green-600 font-medium">
                    Address (Optional)
                  </Label>
                  <Input
                    id="address"
                    value={locationFormData.address}
                    onChange={(e) => handleLocationInputChange('address', e.target.value)}
                    className="border-blue-300 focus:border-blue-500 text-blue-700"
                    placeholder="e.g., 123 Main Street, Near City Mall"
                  />
                </div>
              </div>

              {/* Branch Info Display */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-green-800 font-semibold mb-2">🏢 Branch Information (Inherited):</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-green-700">Name:</span>
                    <p className="text-green-600">{selectedBranch?.name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-green-700">State:</span>
                    <p className="text-green-600">{selectedBranch?.state}</p>
                  </div>
                  <div>
                    <span className="font-medium text-green-700">Branch:</span>
                    <p className="text-green-600">{selectedBranch?.branch}</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer with Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                  onClick={handleCloseLocationModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting 
                    ? (isEditingLocation ? '⏳ Updating Location...' : '⏳ Adding Location...') 
                    : (isEditingLocation ? '🔄 Update Location' : '📍 Add Location')
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