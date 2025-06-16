"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileImage, Trash2, Edit, CheckCircle, AlertCircle, X, Download, Search, Eye, ExternalLink } from "lucide-react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadToCloudinary, CloudinaryUploadResult } from '@/lib/cloudinary';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ClientData {
  id?: string;
  clientId: string;
  firmName: string;
  authorizedPersonName: string;
  firmType: string;
  companyAddress: string;
  contactNumber: string;
  panNumber: string;
  gstNumber: string;
  aadharNumber?: string;
  email?: string;
  landline?: string;
  alternateNumber?: string;
  panCardImage?: string;
  aadharCardImage?: string;
  documentUrls?: string[];
  createdAt?: string;
}

export default function ClientModulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [clients, setClients] = useState<ClientData[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClientData>({
    clientId: '',
    firmName: '',
    authorizedPersonName: '',
    firmType: '',
    companyAddress: '',
    contactNumber: '',
    panNumber: '',
    gstNumber: '',
    aadharNumber: '',
    email: '',
    landline: '',
    alternateNumber: '',
  });
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, type: string, url?: string}[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [viewFileUrl, setViewFileUrl] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user has access
  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user?.role, router]);

  // Load clients data
  useEffect(() => {
    loadClients();
  }, []);

  // Filter clients based on search term
  useEffect(() => {
    filterClientsBySearch();
  }, [clients, searchTerm]);

  const loadClients = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'clients'));
      const clientsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClientData[];
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const filterClientsBySearch = () => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = clients.filter(client => 
      client.firmName.toLowerCase().includes(searchLower) ||
      client.panNumber.toLowerCase().includes(searchLower)
    );

    setFilteredClients(filtered);
  };

  const exportToExcel = () => {
    const dataToExport = filteredClients.length > 0 ? filteredClients : clients;
    
    if (dataToExport.length === 0) {
      toast({
        title: "❌ No Data to Export",
        description: "There are no clients to export.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const headers = [
      'Client ID', 'Firm Name', 'Authorized Person', 'Firm Type', 'Company Address',
      'Contact Number', 'PAN Number', 'GST Number', 'Aadhar Number', 'Email',
      'Landline', 'Alternate Number', 'Created Date'
    ];

    // Create CSV content with proper Excel formatting
    const csvData = [
      headers,
      ...dataToExport.map(client => [
        client.clientId,
        client.firmName,
        client.authorizedPersonName,
        client.firmType,
        client.companyAddress,
        client.contactNumber,
        client.panNumber,
        client.gstNumber,
        client.aadharNumber || '',
        client.email || '',
        client.landline || '',
        client.alternateNumber || '',
        client.createdAt ? new Date(client.createdAt).toLocaleDateString() : ''
      ])
    ];

    // Convert to proper CSV format
    const csvContent = csvData.map(row => 
      row.map(cell => {
        // Escape cells that contain commas, quotes, or line breaks
        const cellString = String(cell || '');
        if (cellString.includes(',') || cellString.includes('"') || cellString.includes('\n') || cellString.includes('\r')) {
          return `"${cellString.replace(/"/g, '""')}"`;
        }
        return cellString;
      }).join(',')
    ).join('\r\n');

    // Add BOM for proper Excel UTF-8 handling
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "✅ Export Successful",
      description: `${dataToExport.length} clients exported to CSV file (Excel compatible).`,
      className: "bg-green-100 border-green-500 text-green-700",
      duration: 3000,
    });
  };

  // Generate unique client ID
  const generateClientId = () => {
    if (clients.length === 0) {
      return 'CC-0001';
    }
    
    // Extract numbers from existing client IDs and find the highest
    const existingNumbers = clients
      .map(client => client.clientId)
      .filter(id => id && id.startsWith('CC-'))
      .map(id => parseInt(id.split('-')[1]))
      .filter(num => !isNaN(num));
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    
    return `CC-${nextNumber.toString().padStart(4, '0')}`;
  };

  // Check if PAN number is unique
  const isPanNumberUnique = (panNumber: string, excludeId?: string) => {
    const panLower = panNumber.toLowerCase().trim();
    return !clients.some(client => 
      client.panNumber.toLowerCase() === panLower && client.id !== excludeId
    );
  };

  const isGstNumberUnique = (gstNumber: string, excludeId?: string) => {
    const gstLower = gstNumber.toLowerCase().trim();
    return !clients.some(client => 
      client.gstNumber.toLowerCase() === gstLower && client.id !== excludeId
    );
  };

  const handleInputChange = (field: keyof ClientData, value: string) => {
    // Contact Number Validation - Indian mobile number
    if (field === 'contactNumber') {
      // Allow only digits
      const digitsOnly = value.replace(/\D/g, '');
      
      // Limit to 10 digits
      const limitedDigits = digitsOnly.slice(0, 10);
      
      // Validate Indian mobile number format (starts with 6, 7, 8, or 9)
      if (limitedDigits.length > 0 && !/^[6-9]/.test(limitedDigits)) {
        toast({
          title: "❌ Invalid Mobile Number",
          description: "Indian mobile numbers should start with 6, 7, 8, or 9",
          variant: "destructive",
          duration: 2000,
        });
        return;
      }
      
      setFormData(prev => ({ ...prev, [field]: limitedDigits }));
      return;
    }
    
    // PAN Number Validation
    if (field === 'panNumber') {
      const upperValue = value.toUpperCase();
      
      // Allow only alphanumeric characters and limit to 10
      const cleanValue = upperValue.replace(/[^A-Z0-9]/g, '').slice(0, 10);
      
      // Real-time format validation
      if (cleanValue.length > 0) {
        // First 5 characters should be letters
        if (cleanValue.length <= 5 && !/^[A-Z]*$/.test(cleanValue)) {
          toast({
            title: "💡 PAN Format Tip",
            description: "First 5 characters should be letters (e.g., ABCDE)",
            variant: "default",
            duration: 2000,
          });
        }
        
        // Characters 6-9 should be digits
        if (cleanValue.length > 5 && cleanValue.length <= 9) {
          const digitsPart = cleanValue.slice(5);
          if (!/^\d*$/.test(digitsPart)) {
            toast({
              title: "💡 PAN Format Tip",
              description: "Characters 6-9 should be digits (e.g., 1234)",
              variant: "default",
              duration: 2000,
            });
          }
        }
        
        // 10th character should be a letter
        if (cleanValue.length === 10 && !/^[A-Z]{5}\d{4}[A-Z]$/.test(cleanValue)) {
          toast({
            title: "💡 PAN Format Tip",
            description: "Last character should be a letter (e.g., F)",
            variant: "default",
            duration: 2000,
          });
        }
        
        // Check uniqueness when PAN is complete and valid
        if (cleanValue.length === 10 && /^[A-Z]{5}\d{4}[A-Z]$/.test(cleanValue)) {
          if (!isPanNumberUnique(cleanValue, editingId ?? undefined)) {
            toast({
              title: "⚠️ PAN Already Exists",
              description: "This PAN number is already registered with another firm",
              variant: "destructive",
              duration: 3000,
            });
          }
        }
      }
      
      setFormData(prev => ({ ...prev, [field]: cleanValue }));
      return;
    }
    
    // GST Number Validation
    if (field === 'gstNumber') {
      const upperValue = value.toUpperCase();
      
      // Allow only alphanumeric characters and limit to 15
      const cleanValue = upperValue.replace(/[^A-Z0-9]/g, '').slice(0, 15);
      
      // Real-time format validation for GST
      if (cleanValue.length > 0) {
        // First 2 digits should be state code (numbers)
        if (cleanValue.length <= 2 && !/^\d*$/.test(cleanValue)) {
          toast({
            title: "💡 GST Format Tip",
            description: "First 2 characters should be state code digits (e.g., 27)",
            variant: "default",
            duration: 2000,
          });
        }
        
        // Characters 3-12 should be PAN format
        if (cleanValue.length > 2 && cleanValue.length <= 12) {
          const panPart = cleanValue.slice(2);
          if (panPart.length === 10 && !/^[A-Z]{5}\d{4}[A-Z]$/.test(panPart)) {
            toast({
              title: "💡 GST Format Tip",
              description: "Characters 3-12 should follow PAN format",
              variant: "default",
              duration: 2000,
            });
          }
        }
        
        // Check uniqueness when GST is complete and valid
        if (cleanValue.length === 15 && /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]{3}$/.test(cleanValue)) {
          if (!isGstNumberUnique(cleanValue, editingId ?? undefined)) {
            toast({
              title: "⚠️ GST Already Exists",
              description: "This GST number is already registered with another firm",
              variant: "destructive",
              duration: 3000,
            });
          }
        }
      }
      
      setFormData(prev => ({ ...prev, [field]: cleanValue }));
      return;
    }
    
    // Aadhar Number Validation (optional field)
    if (field === 'aadharNumber') {
      // Allow only digits
      const digitsOnly = value.replace(/\D/g, '');
      
      // Limit to 12 digits
      const limitedDigits = digitsOnly.slice(0, 12);
      
      setFormData(prev => ({ ...prev, [field]: limitedDigits }));
      return;
    }
    
    // Landline validation
    if (field === 'landline') {
      // Allow digits, spaces, hyphens, and parentheses for landline format
      const cleanValue = value.replace(/[^\d\s\-\(\)]/g, '');
      setFormData(prev => ({ ...prev, [field]: cleanValue }));
      return;
    }
    
    // Alternate number validation (same as contact number)
    if (field === 'alternateNumber') {
      // Allow only digits
      const digitsOnly = value.replace(/\D/g, '');
      
      // Limit to 10 digits
      const limitedDigits = digitsOnly.slice(0, 10);
      
      // Validate Indian mobile number format if not empty
      if (limitedDigits.length > 0 && limitedDigits.length === 10 && !/^[6-9]/.test(limitedDigits)) {
        toast({
          title: "❌ Invalid Mobile Number",
          description: "Indian mobile numbers should start with 6, 7, 8, or 9",
          variant: "destructive",
          duration: 2000,
        });
        return;
      }
      
      setFormData(prev => ({ ...prev, [field]: limitedDigits }));
      return;
    }
    
    // Default behavior for other fields
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true);
    const newUploadedFiles: {name: string, type: string, url?: string}[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Show uploading toast
        toast({
          title: "📤 Uploading...",
          description: `Uploading ${file.name} to cloud storage...`,
          className: "bg-blue-100 border-blue-500 text-blue-700",
          duration: 3000,
        });

        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(file);
        
        const fileInfo = {
          name: file.name,
          type: file.type.includes('image') ? 'Document Image' : 'Document',
          url: uploadResult.secure_url
        };
        
        newUploadedFiles.push(fileInfo);
        
        // Show individual file upload success popup
        toast({
          title: "✅ File Uploaded!",
          description: `${file.name} has been successfully uploaded to cloud storage.`,
          className: "bg-green-100 border-green-500 text-green-700",
          duration: 2000,
        });
        
        // Small delay between file notifications
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "❌ Upload Failed",
          description: `Failed to upload ${file.name}. Please check your connection and try again.`,
          variant: "destructive",
          duration: 4000,
        });
      }
    }
    
    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
    setIsUploading(false);
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = uploadedFiles[index];
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    
    toast({
      title: "🗑️ File Removed",
      description: `${fileToRemove.name} has been removed from attachments.`,
      className: "bg-orange-100 border-orange-500 text-orange-700",
      duration: 2000,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Comprehensive field validations before submission
    
    // Contact Number validation
    if (!formData.contactNumber || formData.contactNumber.length !== 10) {
      toast({
        title: "❌ Invalid Contact Number",
        description: "Please enter a valid 10-digit Indian mobile number",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    if (!/^[6-9]\d{9}$/.test(formData.contactNumber)) {
      toast({
        title: "❌ Invalid Contact Number Format",
        description: "Contact number should be 10 digits starting with 6, 7, 8, or 9",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // PAN Number validation
    if (!formData.panNumber || formData.panNumber.length !== 10) {
      toast({
        title: "❌ Invalid PAN Number",
        description: "PAN number must be exactly 10 characters long",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(formData.panNumber)) {
      toast({
        title: "❌ Invalid PAN Number Format",
        description: "PAN format should be: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    // GST Number validation
    if (!formData.gstNumber || formData.gstNumber.length !== 15) {
      toast({
        title: "❌ Invalid GST Number",
        description: "GST number must be exactly 15 characters long",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]{3}$/.test(formData.gstNumber)) {
      toast({
        title: "❌ Invalid GST Number Format",
        description: "GST format should be: 2 state digits + 10 PAN characters + 3 additional characters",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    // Aadhar validation (if provided)
    if (formData.aadharNumber && formData.aadharNumber.length > 0) {
      if (formData.aadharNumber.length !== 12 || !/^\d{12}$/.test(formData.aadharNumber)) {
        toast({
          title: "❌ Invalid Aadhar Number",
          description: "Aadhar number should be exactly 12 digits",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
    }
    
    // Alternate number validation (if provided)
    if (formData.alternateNumber && formData.alternateNumber.length > 0) {
      if (formData.alternateNumber.length !== 10 || !/^[6-9]\d{9}$/.test(formData.alternateNumber)) {
        toast({
          title: "❌ Invalid Alternate Number",
          description: "Alternate number should be a valid 10-digit Indian mobile number",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
    }
    
    // Enhanced validation for file upload requirement
    if (uploadedFiles.length === 0) {
      toast({
        title: "❌ Document Required",
        description: "At least one document must be uploaded before submitting. Please attach PAN card, Aadhar card, or other relevant documents.",
        variant: "destructive",
        duration: 5000,
      });
      
      // Scroll to file upload section
      const fileSection = document.querySelector('#document-upload-section');
      if (fileSection) {
        fileSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Ensure all uploaded files have valid URLs
    const validFiles = uploadedFiles.filter(file => file.url);
    if (validFiles.length === 0) {
      toast({
        title: "❌ File Upload Incomplete",
        description: "Some files failed to upload properly. Please remove and re-upload the documents.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    // Validate PAN uniqueness - each firm must have unique PAN
    if (!isPanNumberUnique(formData.panNumber, editingId ?? undefined)) {
      toast({
        title: "❌ PAN Number Already Exists",
        description: "This PAN number is already registered with another firm. Each firm must have a unique PAN number.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    // Validate GST uniqueness - each firm must have unique GST
    if (!isGstNumberUnique(formData.gstNumber, editingId ?? undefined)) {
      toast({
        title: "❌ GST Number Already Exists",
        description: "This GST number is already registered with another firm. Each firm must have a unique GST number.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const clientData = {
        ...formData,
        documentUrls: validFiles.map(file => file.url),
        createdAt: isEditing ? formData.createdAt : new Date().toISOString(),
      };

      if (isEditing && editingId) {
        await updateDoc(doc(db, 'clients', editingId), clientData);
        setSuccessMessage({
          title: "Client Updated Successfully! 🎉",
          description: `${formData.firmName} (${formData.clientId}) has been updated in the system. All information has been saved and is now available in the client database.`
        });
      } else {
        // Generate unique client ID for new clients
        const newClientId = generateClientId();
        const newClientData = { ...clientData, clientId: newClientId };
        
        await addDoc(collection(db, 'clients'), newClientData);
        setSuccessMessage({
          title: "New Client Added Successfully! 🎉",
          description: `${formData.firmName} has been registered with Client ID: ${newClientId}. The client information is now saved and can be accessed from the client database.`
        });
      }

      // Show success modal
      setShowSuccessModal(true);

      // Close the add client modal and reset form
      setShowAddClientModal(false);
      setFormData({
        clientId: '',
        firmName: '',
        authorizedPersonName: '',
        firmType: '',
        companyAddress: '',
        contactNumber: '',
        panNumber: '',
        gstNumber: '',
        aadharNumber: '',
        email: '',
        landline: '',
        alternateNumber: '',
      });
      setIsEditing(false);
      setEditingId(null);
      setUploadedFiles([]);
      loadClients();
      
      // Auto close modal after 4 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 4000);
      
    } catch (error) {
      toast({
        title: "❌ Error Occurred",
        description: "Failed to save client information. Please check your connection and try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (client: ClientData) => {
    setFormData(client);
    setIsEditing(true);
    setEditingId(client.id || null);
    
    // Load existing documents for editing
    if (client.documentUrls && client.documentUrls.length > 0) {
      const existingFiles = client.documentUrls.map((url, index) => ({
        name: `Document ${index + 1}`,
        type: 'Existing Document',
        url: url
      }));
      setUploadedFiles(existingFiles);
    }
    
    setShowAddClientModal(true);
  };

  const handleAddNewClient = () => {
    // Reset form for new client
    setFormData({
      clientId: '',
      firmName: '',
      authorizedPersonName: '',
      firmType: '',
      companyAddress: '',
      contactNumber: '',
      panNumber: '',
      gstNumber: '',
      aadharNumber: '',
      email: '',
      landline: '',
      alternateNumber: '',
    });
    setIsEditing(false);
    setEditingId(null);
    setUploadedFiles([]);
    setShowAddClientModal(true);
  };

  const handleCloseModal = () => {
    setShowAddClientModal(false);
    setIsEditing(false);
    setEditingId(null);
    setUploadedFiles([]);
    setFormData({
      clientId: '',
      firmName: '',
      authorizedPersonName: '',
      firmType: '',
      companyAddress: '',
      contactNumber: '',
      panNumber: '',
      gstNumber: '',
      aadharNumber: '',
      email: '',
      landline: '',
      alternateNumber: '',
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'clients', id));
      setSuccessMessage({
        title: "Client Deleted Successfully! 🗑️",
        description: "The client has been permanently removed from the database. This action cannot be undone."
      });
      setShowSuccessModal(true);
      setDeleteId(null);
      loadClients();
      
      // Auto close modal after 3 seconds for delete
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
      
    } catch (error) {
      toast({
        title: "❌ Delete Failed",
        description: "Failed to delete client. Please check your connection and try again.",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  if (user?.role !== 'admin') return null;

  const displayClients = filteredClients.length > 0 || searchTerm ? filteredClients : clients;

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
              Client Module
            </h1>
          </div>
          
          {/* Add Client Button */}
          <Button
            onClick={handleAddNewClient}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 shadow-lg"
          >
            ✅ Add New Client
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
                  placeholder="Search by firm name or PAN number..."
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
                onClick={exportToExcel}
                className="bg-blue-500 hover:bg-blue-600 text-white whitespace-nowrap"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
            
            {searchTerm && (
              <div className="mt-3 text-sm text-green-600">
                {filteredClients.length} clients found for "{searchTerm}"
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clients Table with Proper Grid */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Registered Clients</CardTitle>
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
                    <TableHead className="text-orange-700 font-semibold sticky left-0 bg-orange-100 border-r border-orange-300 text-center p-2 whitespace-nowrap">Client ID</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Firm Name</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Authorized Person</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Firm Type</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Company Address</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Contact Number</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">PAN Number</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">GST Number</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Aadhar Number</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Email</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Landline</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Alternate Number</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Created Date</TableHead>
                    <TableHead className="text-orange-700 font-semibold border-r border-orange-300 text-center p-2 whitespace-nowrap">Documents</TableHead>
                    <TableHead className="text-orange-700 font-semibold sticky right-0 bg-orange-100 border-l border-orange-300 text-center p-2 whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayClients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-green-50 border-b border-gray-200">
                      <TableCell className="text-green-700 font-bold sticky left-0 bg-white border-r border-gray-300 text-center p-2 whitespace-nowrap">{client.clientId}</TableCell>
                      <TableCell className="text-green-700 font-medium border-r border-gray-300 text-center p-2 whitespace-nowrap">{client.firmName}</TableCell>
                      <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{client.authorizedPersonName}</TableCell>
                      <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{client.firmType}</TableCell>
                      <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{client.companyAddress}</TableCell>
                      <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{client.contactNumber}</TableCell>
                      <TableCell className="text-green-700 font-mono border-r border-gray-300 text-center p-2 whitespace-nowrap">{client.panNumber}</TableCell>
                      <TableCell className="text-green-700 font-mono border-r border-gray-300 text-center p-2 whitespace-nowrap">{client.gstNumber}</TableCell>
                      <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{client.aadharNumber || '-'}</TableCell>
                      <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{client.email || '-'}</TableCell>
                      <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{client.landline || '-'}</TableCell>
                      <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">{client.alternateNumber || '-'}</TableCell>
                      <TableCell className="text-green-700 border-r border-gray-300 text-center p-2 whitespace-nowrap">
                        {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="border-r border-gray-300 text-center p-2 whitespace-nowrap">
                        {client.documentUrls && client.documentUrls.length > 0 ? (
                          <div className="flex items-center justify-center space-x-1">
                            <span className="text-green-600 text-sm">{client.documentUrls.length} file{client.documentUrls.length > 1 ? 's' : ''}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-300 text-blue-600 hover:bg-blue-50 h-7 w-7 p-0"
                              onClick={() => {
                                // Create a simple dialog to show all documents
                                const urls = client.documentUrls!.map((url, index) => 
                                  `Document ${index + 1}: ${url}`
                                ).join('\n\n');
                                
                                if (confirm(`View Documents for ${client.firmName}?\n\n${urls}\n\nClick OK to open first document in new tab.`)) {
                                  window.open(client.documentUrls![0], '_blank');
                                }
                              }}
                              title="View Documents"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No documents</span>
                        )}
                      </TableCell>
                      <TableCell className="sticky right-0 bg-white border-l border-gray-300 text-center p-2">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-300 text-orange-600 hover:bg-orange-50"
                            onClick={() => handleEdit(client)}
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
                                  Are you sure you want to delete <strong>{client.firmName}</strong>? 
                                  This action cannot be undone and will permanently remove all client data from the system.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-gray-300 text-gray-600 hover:bg-gray-50">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                  onClick={() => client.id && handleDelete(client.id)}
                                >
                                  🗑️ Delete Client
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {displayClients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center text-gray-500 py-8 border-r border-gray-300">
                        {searchTerm ? 'No clients found for the selected search term.' : 'No clients registered yet. Click "Add New Client" to get started.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Client Modal */}
        <Dialog open={showAddClientModal} onOpenChange={setShowAddClientModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-orange-300">
            <DialogHeader>
              <DialogTitle className="text-orange-700 text-xl flex items-center gap-2">
                {isEditing ? '🔄 Edit Client' : '✅ Add New Client'}
              </DialogTitle>
              <DialogDescription className="text-green-600">
                {isEditing ? 'Update client information and documentation' : 'Enter client information '}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Required Fields */}
                <div className="space-y-2">
                  <Label htmlFor="firmName" className="text-green-600 font-medium">
                    Name of Firm <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firmName"
                    value={formData.firmName}
                    onChange={(e) => handleInputChange('firmName', e.target.value)}
                    className="border-orange-300 focus:border-orange-500 text-orange-700"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="authorizedPersonName" className="text-green-600 font-medium">
                    Authorized Person Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="authorizedPersonName"
                    value={formData.authorizedPersonName}
                    onChange={(e) => handleInputChange('authorizedPersonName', e.target.value)}
                    className="border-orange-300 focus:border-orange-500 text-orange-700"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firmType" className="text-green-600 font-medium">
                    Type of Firm <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.firmType}
                    onValueChange={(value) => handleInputChange('firmType', value)}
                    required
                  >
                    <SelectTrigger className="border-orange-300 focus:border-orange-500 text-orange-700 [&>span]:text-orange-700">
                      <SelectValue 
                        placeholder="Select firm type" 
                        className="text-orange-700"
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem 
                        value="Sole Proprietorship" 
                        className="!text-orange-700 hover:!bg-orange-50 focus:!bg-orange-50 hover:!text-orange-700 focus:!text-orange-700 data-[highlighted]:!text-orange-700 data-[highlighted]:!bg-orange-50"
                        style={{ color: '#c2410c !important' }}
                      >
                        Sole Proprietorship
                      </SelectItem>
                      <SelectItem 
                        value="Partnership" 
                        className="!text-orange-700 hover:!bg-orange-50 focus:!bg-orange-50 hover:!text-orange-700 focus:!text-orange-700 data-[highlighted]:!text-orange-700 data-[highlighted]:!bg-orange-50"
                        style={{ color: '#c2410c !important' }}
                      >
                        Partnership
                      </SelectItem>
                      <SelectItem 
                        value="Hindu Undivided Family (HUF)" 
                        className="!text-orange-700 hover:!bg-orange-50 focus:!bg-orange-50 hover:!text-orange-700 focus:!text-orange-700 data-[highlighted]:!text-orange-700 data-[highlighted]:!bg-orange-50"
                        style={{ color: '#c2410c !important' }}
                      >
                        Hindu Undivided Family (HUF)
                      </SelectItem>
                      <SelectItem 
                        value="Company" 
                        className="!text-orange-700 hover:!bg-orange-50 focus:!bg-orange-50 hover:!text-orange-700 focus:!text-orange-700 data-[highlighted]:!text-orange-700 data-[highlighted]:!bg-orange-50"
                        style={{ color: '#c2410c !important' }}
                      >
                        Company
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="companyAddress" className="text-green-600 font-medium">
                    Company Address <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="companyAddress"
                    value={formData.companyAddress}
                    onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                    className="border-orange-300 focus:border-orange-500 text-orange-700"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactNumber" className="text-green-600 font-medium">
                    Contact Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contactNumber"
                    value={formData.contactNumber}
                    onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                    className="border-orange-300 focus:border-orange-500 text-orange-700"
                    placeholder="e.g., 9876543210"
                    maxLength={10}
                    required
                  />
                  <p className="text-xs text-orange-600 mt-1">
                    10-digit Indian mobile number starting with 6, 7, 8, or 9 (can be shared between firms)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="panNumber" className="text-green-600 font-medium">
                    PAN Card Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="panNumber"
                    value={formData.panNumber}
                    onChange={(e) => handleInputChange('panNumber', e.target.value)}
                    className="border-orange-300 focus:border-orange-500 text-orange-700"
                    placeholder="e.g., ABCDE1234F"
                    maxLength={10}
                    required
                  />
                  <p className="text-xs text-orange-600 mt-1">
                    Format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F) - Must be unique per firm
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstNumber" className="text-green-600 font-medium">
                    GST Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="gstNumber"
                    value={formData.gstNumber}
                    onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                    className="border-orange-300 focus:border-orange-500 text-orange-700"
                    placeholder="e.g., 27ABCDE1234F1Z5"
                    maxLength={15}
                    required
                  />
                  <p className="text-xs text-orange-600 mt-1">
                    Format: 2 state digits + 10 PAN chars + 3 additional chars - Must be unique per firm
                  </p>
                </div>

                {/* Optional Fields */}
                <div className="space-y-2">
                  <Label htmlFor="aadharNumber" className="text-green-600 font-medium">
                    Aadhar Card No (Optional)
                  </Label>
                  <Input
                    id="aadharNumber"
                    value={formData.aadharNumber}
                    onChange={(e) => handleInputChange('aadharNumber', e.target.value)}
                    className="border-green-300 focus:border-green-500 text-orange-700"
                    placeholder="e.g., 123456789012"
                    maxLength={12}
                  />
                  <p className="text-xs text-green-600 mt-1">
                    12-digit Aadhar number (if provided)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-green-600 font-medium">
                    Email (Optional)
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="border-green-300 focus:border-green-500 text-orange-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="landline" className="text-green-600 font-medium">
                    Landline (Optional)
                  </Label>
                  <Input
                    id="landline"
                    value={formData.landline}
                    onChange={(e) => handleInputChange('landline', e.target.value)}
                    className="border-green-300 focus:border-green-500 text-orange-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alternateNumber" className="text-green-600 font-medium">
                    Alternate Number (Optional)
                  </Label>
                  <Input
                    id="alternateNumber"
                    value={formData.alternateNumber}
                    onChange={(e) => handleInputChange('alternateNumber', e.target.value)}
                    className="border-green-300 focus:border-green-500 text-orange-700"
                    placeholder="e.g., 9876543210"
                    maxLength={10}
                  />
                  <p className="text-xs text-green-600 mt-1">
                    10-digit mobile number (if provided, can be shared between firms)
                  </p>
                </div>
              </div>

              {/* File Upload Section */}
              <div id="document-upload-section" className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600">Document Upload <span className="text-red-500">*</span></h3>
                <div className="space-y-3">
                  <div className="flex flex-col space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-orange-300 text-orange-600 hover:bg-orange-50 w-fit"
                      onClick={() => document.getElementById('fileUpload')?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Attach Documents'}
                    </Button>
                    <input
                      id="fileUpload"
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          handleFileUpload(files);
                        }
                      }}
                    />
                    {uploadedFiles.length === 0 && !isUploading && (
                      <div className="text-sm">
                        <span className="text-green-600">
                          You can attach PAN card, Aadhar card, or other relevant documents
                        </span>
                        <br />
                        <span className="text-red-600 font-medium">
                          ⚠️ At least one file is required to proceed
                        </span>
                      </div>
                    )}
                    {isUploading && (
                      <span className="text-sm text-blue-600">
                        📤 Uploading files to cloud storage...
                      </span>
                    )}
                  </div>
                  
                  {/* Show uploaded files */}
                  {uploadedFiles.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-green-700 mb-2">Attached Files:</h4>
                      <div className="space-y-1">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between space-x-2 text-sm text-green-600">
                            <div className="flex items-center space-x-2 flex-1">
                              <FileImage className="w-4 h-4" />
                              <span className="truncate">{file.name}</span>
                              <span className="text-xs text-green-500">({file.type})</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {file.url && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-300 text-blue-600 hover:bg-blue-50 h-6 w-6 p-0"
                                  onClick={() => window.open(file.url, '_blank')}
                                  title="View Document"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-red-300 text-red-600 hover:bg-red-50 h-6 w-6 p-0"
                                onClick={() => handleRemoveFile(index)}
                                title="Remove Document"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
                    ? (isEditing ? '🔄 Updating...' : '⏳ Adding Client...') 
                    : (isEditing ? '🔄 Update Client' : '✅ Add Client')
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