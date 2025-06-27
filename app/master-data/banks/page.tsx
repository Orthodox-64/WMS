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
import { Trash2, Edit, CheckCircle, AlertCircle, X, Download, Search, Plus, MapPin, Building, Upload, Eye, FileText } from "lucide-react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { uploadToCloudinary, CloudinaryUploadResult } from '@/lib/cloudinary';

interface BankLocation {
  id?: string;
  locationId: string;
  locationName: string;
  branchName: string;
  ifscCode: string;
  address?: string;
  authorizePerson1?: string;
  authorizePerson2?: string;
  uploadedFiles?: CloudinaryUploadResult[];
  createdAt?: string;
}

interface BankData {
  id?: string;
  bankId: string;
  bankName?: string;
  state: string;
  branch: string;
  locations: BankLocation[];
  createdAt?: string;
}

export default function BankModulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [banks, setBanks] = useState<BankData[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<BankData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BankData>({
    bankId: '',
    state: '',
    branch: '',
    locations: [],
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankData | null>(null);
  const [locationFormData, setLocationFormData] = useState<BankLocation>({
    locationId: '',
    locationName: '',
    branchName: '',
    ifscCode: '',
    address: '',
    authorizePerson1: '',
    authorizePerson2: '',
    uploadedFiles: [],
  });
  const [expandedBanks, setExpandedBanks] = useState<Set<string>>(new Set());
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // File upload states
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showFileModal, setShowFileModal] = useState(false);
  const [viewingFiles, setViewingFiles] = useState<CloudinaryUploadResult[]>([]);

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

  // Load banks data
  useEffect(() => {
    loadBanks();
  }, []);

  // Filter banks based on search term
  useEffect(() => {
    filterBanksBySearch();
  }, [banks, searchTerm]);

  const loadBanks = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'banks'));
      const banksData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        locations: doc.data().locations || []
      })) as BankData[];
      setBanks(banksData);
    } catch (error) {
      console.error('Error loading banks:', error);
    }
  };

  const filterBanksBySearch = () => {
    if (!searchTerm.trim()) {
      setFilteredBanks(banks);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = banks.filter(bank =>
      bank.branch.toLowerCase().includes(searchLower) ||
      bank.state.toLowerCase().includes(searchLower) ||
      bank.bankId.toLowerCase().includes(searchLower) ||
      bank.locations.some(location => 
        location.locationName.toLowerCase().includes(searchLower) ||
        location.ifscCode.toLowerCase().includes(searchLower)
      )
    );

    setFilteredBanks(filtered);
  };

  const exportToCSV = () => {
    const dataToExport = searchTerm.trim() ? filteredBanks : banks;
    
    if (dataToExport.length === 0) {
      toast({
        title: "❌ No Data to Export",
        description: "There are no banks to export.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const headers = [
      'Location ID', 'Bank/Branch Name', 'State', 'Branch', 'IFSC Code', 'Authorize Person 1', 'Authorize Person 2', 'Files Count', 'Address', 'Bank Created Date', 'Location Created Date'
    ];

    const csvData = [headers];
    
    dataToExport.forEach(bank => {
      if (bank.locations.length === 0) {
        // Bank without locations
        csvData.push([
          '-',
          bank.state,
          bank.state,
          '-',
          '',
          '',
          '',
          '',
          '',
          bank.createdAt ? new Date(bank.createdAt).toLocaleDateString() : '',
          ''
        ]);
      } else {
        // Bank with locations
        bank.locations.forEach(location => {
          csvData.push([
            location.locationId,
            location.locationName, // This is the bank name entered in the form
            bank.state,
            location.branchName || '',
            location.ifscCode,
            location.authorizePerson1 || '',
            location.authorizePerson2 || '',
            location.uploadedFiles ? location.uploadedFiles.length.toString() : '0',
            location.address || '',
            bank.createdAt ? new Date(bank.createdAt).toLocaleDateString() : '',
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
    a.download = `banks_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "✅ Export Successful",
      description: `${dataToExport.length} banks exported to CSV file.`,
      className: "bg-green-100 border-green-500 text-green-700",
      duration: 3000,
    });
  };

  // Generate unique bank ID
  const generateBankId = () => {
    if (banks.length === 0) {
      return 'BK-0001';
    }
    
    // Extract numbers from existing bank IDs and find the highest
    const existingNumbers = banks
      .map(bank => bank.bankId)
      .filter(id => id && id.startsWith('BK-'))
      .map(id => parseInt(id.split('-')[1]))
      .filter(num => !isNaN(num));
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    
    return `BK-${nextNumber.toString().padStart(4, '0')}`;
  };

  // Generate unique location ID 
  const generateLocationId = () => {
    // Get all existing location IDs from all banks
    const allLocationIds: string[] = [];
    banks.forEach(bank => {
      bank.locations.forEach(location => {
        if (location.locationId) {
          allLocationIds.push(location.locationId);
        }
      });
    });

    const existingNumbers = allLocationIds
      .filter(id => id && id.startsWith('BK-'))
      .map(id => parseInt(id.split('-')[1]))
      .filter(num => !isNaN(num));
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    
    return `BK-${nextNumber.toString().padStart(4, '0')}`;
  };

  const handleInputChange = (field: keyof BankData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationInputChange = (field: keyof BankLocation, value: string) => {
    // Special validation for IFSC code
    if (field === 'ifscCode') {
      // Convert to uppercase and limit to 11 characters
      const upperValue = value.toUpperCase().slice(0, 11);
      
      // Allow only alphanumeric characters
      if (!/^[A-Z0-9]*$/.test(upperValue)) {
        toast({
          title: "❌ Invalid Characters",
          description: "IFSC code can only contain letters and numbers",
          variant: "destructive",
          duration: 2000,
        });
        return;
      }
      
      // IFSC code validation: Should not be all numbers
      if (/^\d+$/.test(upperValue) && upperValue.length > 0) {
        toast({
          title: "❌ Invalid IFSC Code",
          description: "IFSC code cannot contain only numbers. Format: ABCD0123456",
          variant: "destructive",
          duration: 2000,
        });
        return; // Don't update the field
      }
      
      // Validate format as user types (for guidance)
      if (upperValue.length >= 1 && !/^[A-Z]/.test(upperValue)) {
        toast({
          title: "💡 IFSC Format Tip",
          description: "IFSC code should start with bank letters (e.g., SBIN, HDFC, ICIC)",
          variant: "default",
          duration: 2000,
        });
      }
      
      if (upperValue.length === 5 && upperValue[4] !== '0') {
        toast({
          title: "💡 IFSC Format Tip",
          description: "The 5th character should always be '0' (zero)",
          variant: "default",
          duration: 2000,
        });
      }
      
      setLocationFormData(prev => ({ ...prev, [field]: upperValue }));
      return;
    }
    
    setLocationFormData(prev => ({ ...prev, [field]: value }));
  };

  // File upload functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles(Array.from(files));
    }
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "❌ No Files Selected",
        description: "Please select files to upload.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const uploadPromises = selectedFiles.map(file => uploadToCloudinary(file));
      const uploadResults = await Promise.all(uploadPromises);
      
      // Add uploaded files to location form data
      setLocationFormData(prev => ({
        ...prev,
        uploadedFiles: [...(prev.uploadedFiles || []), ...uploadResults]
      }));

      setSelectedFiles([]);
      // Reset file input
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      toast({
        title: "✅ Upload Successful",
        description: `${uploadResults.length} file(s) uploaded successfully.`,
        className: "bg-green-100 border-green-500 text-green-700",
        duration: 3000,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "❌ Upload Failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewFiles = (files: CloudinaryUploadResult[]) => {
    setViewingFiles(files);
    setShowFileModal(true);
  };

  const handleRemoveFile = (fileIndex: number) => {
    setLocationFormData(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles?.filter((_, index) => index !== fileIndex) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const bankData = {
        ...formData,
        branch: formData.branch || '', // Initialize with empty branch for new banks
        createdAt: isEditing ? formData.createdAt : new Date().toISOString(),
      };

      if (isEditing && editingId) {
        // Update existing bank
        await updateDoc(doc(db, 'banks', editingId), bankData);
        setSuccessMessage({
          title: "Bank Updated Successfully! 🎉",
          description: `Bank in ${formData.state} has been updated in the system.`
        });
      } else {
        // Add new bank
        const newBankId = generateBankId();
        const newBankData = { ...bankData, bankId: newBankId };
        
        await addDoc(collection(db, 'banks'), newBankData);
        setSuccessMessage({
          title: "New Bank Added Successfully! 🎉",
          description: `Bank in ${formData.state} has been registered with Bank ID: ${newBankId}. You can now add locations to this bank.`
        });
      }

      setShowSuccessModal(true);
      
      // Close the add bank modal and reset form
      setShowAddBankModal(false);
      setFormData({
        bankId: '',
        state: '',
        branch: '',
        locations: [],
      });
      setIsEditing(false);
      setEditingId(null);
      loadBanks();
      
      // Auto close modal after 4 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 4000);
      
    } catch (error) {
      toast({
        title: "❌ Error Occurred",
        description: "Failed to save bank information. Please check your connection and try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBank) return;
    
    // Comprehensive IFSC Code Validation
    const ifscCode = locationFormData.ifscCode.trim();
    
    // Check if IFSC code is empty
    if (!ifscCode) {
      toast({
        title: "❌ IFSC Code Required",
        description: "Please enter a valid IFSC code",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Check if IFSC code is only numbers
    if (/^\d+$/.test(ifscCode)) {
      toast({
        title: "❌ Invalid IFSC Code Format",
        description: "IFSC code cannot contain only numbers. Format: ABCD0123456 (4 letters + 0 + 6 alphanumeric)",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    // Check IFSC code length
    if (ifscCode.length !== 11) {
      toast({
        title: "❌ Invalid IFSC Code Length",
        description: "IFSC code must be exactly 11 characters long. Format: ABCD0123456",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Check IFSC code format: 4 letters + 0 + 6 alphanumeric
    const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscPattern.test(ifscCode)) {
      toast({
        title: "❌ Invalid IFSC Code Format",
        description: "IFSC code should follow format: ABCD0123456 (4 letters + 0 + 6 alphanumeric characters)",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    // Check if IFSC code already exists (uniqueness validation)
    const isDuplicateIFSC = banks.some(bank => 
      bank.locations.some(location => {
        // Skip the current location if we're editing
        if (isEditingLocation && editingLocationId && location.locationId === editingLocationId) {
          return false;
        }
        return location.ifscCode.toUpperCase() === ifscCode.toUpperCase();
      })
    );
    
    if (isDuplicateIFSC) {
      toast({
        title: "❌ Duplicate IFSC Code",
        description: `IFSC code "${ifscCode}" already exists in the system. Each branch must have a unique IFSC code.`,
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let updatedLocations;
      let updatedBank;
      let successMsg;
      
      if (isEditingLocation && editingLocationId) {
        // Edit existing location
        updatedLocations = selectedBank.locations.map(location =>
          location.locationId === editingLocationId
            ? { ...locationFormData, createdAt: location.createdAt }
            : location
        );
        // Update the bank with the new locations
        updatedBank = { 
          ...selectedBank, 
          locations: updatedLocations
        };
        successMsg = {
          title: "Branch Updated Successfully! ✅",
          description: `${locationFormData.branchName} branch has been updated in ${selectedBank.state}`
        };
      } else {
        // Add new location
        const newLocationId = generateLocationId();
        const newLocation: BankLocation = {
          ...locationFormData,
          locationId: newLocationId,
          createdAt: new Date().toISOString(),
        };
        updatedLocations = [...selectedBank.locations, newLocation];
        // Update the bank with the new locations
        updatedBank = { 
          ...selectedBank, 
          locations: updatedLocations
        };
        successMsg = {
          title: "Branch Added Successfully! 📍",
          description: `${locationFormData.branchName} branch has been added to ${selectedBank.state} with Location ID: ${newLocationId}`
        };
      }
      
      await updateDoc(doc(db, 'banks', selectedBank.id!), updatedBank);
      
      setSuccessMessage(successMsg);
      setShowSuccessModal(true);
      setShowAddLocationModal(false);
      setLocationFormData({
        locationId: '',
        locationName: '',
        branchName: '',
        ifscCode: '',
        address: '',
        authorizePerson1: '',
        authorizePerson2: '',
        uploadedFiles: [],
      });
      setSelectedBank(null);
      setIsEditingLocation(false);
      setEditingLocationId(null);
      loadBanks();
      
      // Auto close modal after 4 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 4000);
      
    } catch (error) {
      toast({
        title: "❌ Error Occurred",
        description: `Failed to ${isEditingLocation ? 'update' : 'add'} branch. Please check your connection and try again.`,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (bank: BankData) => {
    setFormData(bank);
    setIsEditing(true);
    setEditingId(bank.id || null);
    setShowAddBankModal(true);
  };

  const handleAddNewBank = () => {
    // Reset form for new bank
    setFormData({
      bankId: '',
      state: '',
      branch: '',
      locations: [],
    });
    setIsEditing(false);
    setEditingId(null);
    setShowAddBankModal(true);
  };

  const handleAddLocation = (bank: BankData) => {
    setSelectedBank(bank);
    setLocationFormData({
      locationId: '',
      locationName: '',
      branchName: '',
      ifscCode: '',
      address: '',
      authorizePerson1: '',
      authorizePerson2: '',
      uploadedFiles: [],
    });
    setIsEditingLocation(false);
    setEditingLocationId(null);
    setShowAddLocationModal(true);
  };

  const handleEditLocation = (bank: BankData, location: BankLocation) => {
    setSelectedBank(bank);
    setLocationFormData({
      locationId: location.locationId,
      locationName: location.locationName,
      branchName: location.branchName || '',
      ifscCode: location.ifscCode,
      address: location.address || '',
      authorizePerson1: location.authorizePerson1 || '',
      authorizePerson2: location.authorizePerson2 || '',
      uploadedFiles: location.uploadedFiles || [],
    });
    setIsEditingLocation(true);
    setEditingLocationId(location.locationId);
    setShowAddLocationModal(true);
  };

  const handleCloseModal = () => {
    setShowAddBankModal(false);
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      bankId: '',
      state: '',
      branch: '', // This will be set when adding branches
      locations: [],
    });
  };

  const handleCloseLocationModal = () => {
    setShowAddLocationModal(false);
    setSelectedBank(null);
    setLocationFormData({
      locationId: '',
      locationName: '',
      branchName: '',
      ifscCode: '',
      address: '',
      authorizePerson1: '',
      authorizePerson2: '',
      uploadedFiles: [],
    });
    setIsEditingLocation(false);
    setEditingLocationId(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'banks', id));
      setSuccessMessage({
        title: "Bank Deleted Successfully! 🗑️",
        description: "The bank and all its locations have been permanently removed from the database. This action cannot be undone."
      });
      setShowSuccessModal(true);
      setDeleteId(null);
      loadBanks();
      
      // Auto close modal after 3 seconds for delete
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
      
    } catch (error) {
      toast({
        title: "❌ Delete Failed",
        description: "Failed to delete bank. Please check your connection and try again.",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const toggleBankExpansion = (bankId: string) => {
    const newExpanded = new Set(expandedBanks);
    if (newExpanded.has(bankId)) {
      newExpanded.delete(bankId);
    } else {
      newExpanded.add(bankId);
    }
    setExpandedBanks(newExpanded);
  };

  if (user?.role !== 'admin') return null;

  const displayBanks = searchTerm.trim() ? filteredBanks : banks;

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
              Bank Module
            </h1>
          </div>
          
          {/* Add Bank Button */}
          <Button
            onClick={handleAddNewBank}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 shadow-lg"
          >
            ✅ Add New Bank
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
                  placeholder="Search by state, branch name, or IFSC..."
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
                {filteredBanks.length} banks found for "{searchTerm}"
              </div>
            )}
          </CardContent>
        </Card>

        {/* Banks Table with Hierarchical Structure */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Registered Banks & Locations</CardTitle>
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
                    <TableHead className="text-orange-700 font-semibold sticky left-0 bg-orange-100 border-r border-orange-300 text-center p-2 whitespace-nowrap">Location ID</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Bank/Branch Name</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">State</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Branch</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">IFSC Code</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Authorize Person 1</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Authorize Person 2</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Files</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Created Date</TableHead>
                    <TableHead className="text-orange-700 font-semibold sticky right-0 bg-orange-100 border-l border-orange-300 text-center p-2 whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayBanks.map((bank) => (
                    <>
                      {/* Bank Row - Always show */}
                      <TableRow key={bank.id} className="hover:bg-green-50 border-b border-gray-200">
                          <TableCell className="text-green-700 font-bold sticky left-0 bg-white border-r border-gray-300 text-center p-2 whitespace-nowrap">
                            <span className="text-gray-400 text-xs">-</span>
                          </TableCell>
                          <TableCell className="text-green-700 font-medium border-r border-gray-300 text-center p-2 whitespace-nowrap flex items-center gap-2">
                            <Building className="w-4 h-4 text-green-600" />
                            {bank.state} - Bank Entry
                            {bank.locations.length > 0 && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium ml-2">
                                {bank.locations.length} branches
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{bank.state}</TableCell>
                          <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">
                            <span className="text-gray-400 text-xs">-</span>
                          </TableCell>
                          <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">
                            <span className="text-gray-400 text-xs">-</span>
                          </TableCell>
                          <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">
                            <span className="text-gray-400 text-xs">-</span>
                          </TableCell>
                          <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">
                            <span className="text-gray-400 text-xs">-</span>
                          </TableCell>
                          <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">
                            {bank.createdAt ? new Date(bank.createdAt).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="sticky right-0 bg-white border-l border-gray-300 text-center p-2">
                            <div className="flex space-x-2">
                              {bank.locations.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-300 text-green-600 hover:bg-green-50"
                                  onClick={() => toggleBankExpansion(bank.id!)}
                                  title={`${expandedBanks.has(bank.id!) ? 'Hide' : 'View'} ${bank.locations.length} branch(es)`}
                                >
                                  {expandedBanks.has(bank.id!) ? '👁️‍🗨️' : '👁️'} {bank.locations.length}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleAddLocation(bank)}
                                title="Add Branch"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-orange-300 text-orange-600 hover:bg-orange-50"
                                onClick={() => handleEdit(bank)}
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
                                      Are you sure you want to delete the bank entry for <strong>{bank.state}</strong> and all its locations? 
                                      This action cannot be undone and will permanently remove all bank data from the system.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="border-gray-300 text-gray-600 hover:bg-gray-50">
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction 
                                      className="bg-red-500 hover:bg-red-600 text-white"
                                      onClick={() => bank.id && handleDelete(bank.id)}
                                    >
                                      🗑️ Delete Bank
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      
                      {/* Location Rows - Show when bank is expanded */}
                      {expandedBanks.has(bank.id!) && bank.locations.map((location) => (
                        <TableRow key={location.id || location.locationId} className="bg-blue-50 border-b border-blue-200">
                          <TableCell className="text-blue-700 font-medium sticky left-0 bg-blue-50 border-r border-blue-300 text-center p-2 whitespace-nowrap pl-8">
                            {location.locationId}
                          </TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap pl-8">
                            {location.locationName}
                          </TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap">{bank.state}</TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap">{location.branchName || '-'}</TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono text-xs">
                              {location.ifscCode}
                            </span>
                          </TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap">
                            {location.authorizePerson1 || '-'}
                          </TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap">
                            {location.authorizePerson2 || '-'}
                          </TableCell>
                          <TableCell className="text-blue-700 border-r border-blue-300 text-center p-2 whitespace-nowrap">
                            {location.uploadedFiles && location.uploadedFiles.length > 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleViewFiles(location.uploadedFiles!)}
                                title={`View ${location.uploadedFiles.length} file(s)`}
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                {location.uploadedFiles.length}
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-xs">No files</span>
                            )}
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
                                onClick={() => handleEditLocation(bank, location)}
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
                  {displayBanks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-gray-500 py-8 border-r border-gray-300">
                        {searchTerm ? 'No banks found for the search term.' : 'No banks registered yet. Click "Add New Bank" to get started.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Bank Modal */}
        <Dialog open={showAddBankModal} onOpenChange={setShowAddBankModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-orange-300">
            <DialogHeader>
              <DialogTitle className="text-orange-700 text-xl flex items-center gap-2">
                {isEditing ? '🔄 Edit Bank' : '✅ Add New Bank'}
              </DialogTitle>
              <DialogDescription className="text-green-600">
                {isEditing ? 'Update bank information' : 'Enter state information for the bank (branches can be added separately)'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {/* State Dropdown */}
                <div className="space-y-2">
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
                  After adding the state, you can add multiple branches with different bank names, locations and IFSC codes. 
                  Each branch will be associated with the selected state.
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
                    ? (isEditing ? '🔄 Updating...' : '⏳ Adding Bank...') 
                    : (isEditing ? '🔄 Update Bank' : '✅ Add Bank')
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
                {isEditingLocation ? '🔄 Edit Branch' : '📍 Add New Branch'}
              </DialogTitle>
              <DialogDescription className="text-green-600">
                {isEditingLocation ? 'Editing branch in' : 'Adding branch to'}: <strong>{selectedBank?.state}</strong>
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleLocationSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bank Name */}
                <div className="space-y-2">
                  <Label htmlFor="bankName" className="text-green-600 font-medium">
                    Bank Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="bankName"
                    value={locationFormData.locationName}
                    onChange={(e) => handleLocationInputChange('locationName', e.target.value)}
                    className="border-blue-300 focus:border-blue-500 text-blue-700"
                    placeholder="e.g., State Bank of India, HDFC Bank"
                    required
                  />
                  <p className="text-xs text-blue-600">Enter the bank name for this branch</p>
                </div>

                {/* Branch */}
                <div className="space-y-2">
                  <Label htmlFor="branch" className="text-green-600 font-medium">
                    Branch <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="branch"
                    value={locationFormData.branchName}
                    onChange={(e) => handleLocationInputChange('branchName', e.target.value)}
                    className="border-blue-300 focus:border-blue-500 text-blue-700"
                    placeholder="e.g., Main Branch, City Center Branch"
                    required
                  />
                  <p className="text-xs text-blue-600">This branch will be displayed in the Branch column</p>
                </div>

                {/* IFSC Code */}
                <div className="space-y-2">
                  <Label htmlFor="ifscCode" className="text-green-600 font-medium">
                    IFSC Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ifscCode"
                    value={locationFormData.ifscCode}
                    onChange={(e) => handleLocationInputChange('ifscCode', e.target.value)}
                    className="border-blue-300 focus:border-blue-500 text-blue-700"
                    maxLength={11}
                    placeholder="e.g., SBIN0001234"
                    required
                  />
                  <p className="text-xs text-blue-600 mt-1">
                    Format: 4 letters + 0 + 6 alphanumeric characters (e.g., SBIN0001234)
                  </p>
                </div>

                {/* Authorize Person 1 */}
                <div className="space-y-2">
                  <Label htmlFor="authorizePerson1" className="text-green-600 font-medium">
                    Authorize Person 1
                  </Label>
                  <Input
                    id="authorizePerson1"
                    value={locationFormData.authorizePerson1}
                    onChange={(e) => handleLocationInputChange('authorizePerson1', e.target.value)}
                    className="border-blue-300 focus:border-blue-500 text-blue-700"
                    placeholder="e.g., John Doe"
                  />
                </div>

                {/* Authorize Person 2 */}
                <div className="space-y-2">
                  <Label htmlFor="authorizePerson2" className="text-green-600 font-medium">
                    Authorize Person 2
                  </Label>
                  <Input
                    id="authorizePerson2"
                    value={locationFormData.authorizePerson2}
                    onChange={(e) => handleLocationInputChange('authorizePerson2', e.target.value)}
                    className="border-blue-300 focus:border-blue-500 text-blue-700"
                    placeholder="e.g., Jane Smith"
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

              {/* File Upload Section */}
              <div className="space-y-4 border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="text-blue-800 font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  📎 File Attachments
                </h4>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      id="fileInput"
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleFileUpload}
                    disabled={isUploading || selectedFiles.length === 0}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>⏳ Uploading...</>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="text-sm text-blue-600">
                    Selected: {selectedFiles.map(f => f.name).join(', ')}
                  </div>
                )}

                {/* Display uploaded files */}
                {locationFormData.uploadedFiles && locationFormData.uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-blue-700">Uploaded Files:</h5>
                    <div className="flex flex-wrap gap-2">
                      {locationFormData.uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white border border-blue-300 rounded-lg p-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                                                     <span className="text-sm text-blue-700 truncate max-w-[150px]">
                             {file.original_filename || `File ${index + 1}`}
                           </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(file.secure_url, '_blank')}
                            className="p-1 h-6 w-6 text-blue-600 hover:bg-blue-100"
                            title="View file"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveFile(index)}
                            className="p-1 h-6 w-6 text-red-600 hover:bg-red-100"
                            title="Remove file"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bank Info Display */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-green-800 font-semibold mb-2">🏦 Bank Information (Inherited):</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-green-700">Bank Name:</span>
                    <p className="text-green-600">{selectedBank?.state}</p>
                  </div>
                  <div>
                    <span className="font-medium text-green-700">State:</span>
                    <p className="text-green-600">{selectedBank?.state}</p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-blue-600">
                  The branch name you enter will be displayed in the Branch column of the table.
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
                    ? (isEditingLocation ? '⏳ Updating Branch...' : '⏳ Adding Branch...') 
                    : (isEditingLocation ? '🔄 Update Branch' : '📍 Add Branch')
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* File Viewing Modal */}
        <Dialog open={showFileModal} onOpenChange={setShowFileModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border-blue-300">
            <DialogHeader>
              <DialogTitle className="text-blue-700 text-xl flex items-center gap-2">
                <FileText className="w-5 h-5" />
                📁 View Attached Files
              </DialogTitle>
              <DialogDescription className="text-green-600">
                Click on any file to open it in a new tab
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3">
              {viewingFiles.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No files attached</p>
              ) : (
                viewingFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer"
                       onClick={() => window.open(file.secure_url, '_blank')}>
                    <FileText className="w-6 h-6 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-700">{file.original_filename}</p>
                      <p className="text-sm text-gray-500">Format: {file.format.toUpperCase()}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-blue-300 text-blue-600 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(file.secure_url, '_blank');
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button 
                onClick={() => setShowFileModal(false)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6"
              >
                Close
              </Button>
            </div>
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