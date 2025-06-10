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
import { Upload, FileImage, Trash2, Edit, CheckCircle, AlertCircle, X } from "lucide-react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  createdAt?: string;
}

export default function ClientModulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [clients, setClients] = useState<ClientData[]>([]);
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
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, type: string}[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const handleInputChange = (field: keyof ClientData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (files: FileList) => {
    const newUploadedFiles: {name: string, type: string}[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Simulate file upload (replace with actual Cloudinary upload)
      try {
        // For demo purposes, we'll just store file info
        // In production, upload to Cloudinary here
        const fileInfo = {
          name: file.name,
          type: file.type.includes('image') ? 'Document Image' : 'Document'
        };
        
        newUploadedFiles.push(fileInfo);
        
        // Show individual file upload success popup
        toast({
          title: "✅ File Attached!",
          description: `${file.name} has been successfully attached.`,
          className: "bg-green-100 border-green-500 text-green-700",
          duration: 2000,
        });
        
        // Small delay between file notifications
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        toast({
          title: "❌ Upload Failed",
          description: `Failed to attach ${file.name}. Please try again.`,
          variant: "destructive",
          duration: 3000,
        });
      }
    }
    
    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const clientData = {
        ...formData,
        createdAt: new Date().toISOString(),
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

      // Reset form
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

  const firmTypes = [
    "Private Limited Company",
    "Public Limited Company",
    "Partnership Firm",
    "Limited Liability Partnership (LLP)",
    "Sole Proprietorship",
    "One Person Company (OPC)",
    "Section 8 Company",
    "Producer Company"
  ];

  if (user?.role !== 'admin') return null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-orange-600">Client Module</h1>
          <p className="text-green-600">Manage client information and documentation</p>
        </div>

        {/* Client Form */}
        <Card className="border-orange-300">
          <CardHeader className="bg-orange-50">
            <CardTitle className="text-orange-700">
              {isEditing ? 'Edit Client' : 'Add New Client'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Required Fields */}
                <div className="space-y-2">
                  <Label htmlFor="firmName" className="text-orange-600 font-medium">
                    Name of Firm *
                  </Label>
                  <Input
                    id="firmName"
                    value={formData.firmName}
                    onChange={(e) => handleInputChange('firmName', e.target.value)}
                    className="border-orange-300 focus:border-orange-500 text-green-700"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="authorizedPersonName" className="text-orange-600 font-medium">
                    Authorized Person Name *
                  </Label>
                  <Input
                    id="authorizedPersonName"
                    value={formData.authorizedPersonName}
                    onChange={(e) => handleInputChange('authorizedPersonName', e.target.value)}
                    className="border-orange-300 focus:border-orange-500 text-green-700"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firmType" className="text-orange-600 font-medium">
                    Type of Firm *
                  </Label>
                  <Select
                    value={formData.firmType}
                    onValueChange={(value) => handleInputChange('firmType', value)}
                    required
                  >
                    <SelectTrigger className="border-orange-300 focus:border-orange-500 text-green-700">
                      <SelectValue placeholder="Select firm type" />
                    </SelectTrigger>
                    <SelectContent>
                      {firmTypes.map(type => (
                        <SelectItem key={type} value={type} className="text-green-700">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="companyAddress" className="text-orange-600 font-medium">
                    Company Address *
                  </Label>
                  <Textarea
                    id="companyAddress"
                    value={formData.companyAddress}
                    onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                    className="border-orange-300 focus:border-orange-500 text-green-700"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactNumber" className="text-orange-600 font-medium">
                    Contact Number *
                  </Label>
                  <Input
                    id="contactNumber"
                    value={formData.contactNumber}
                    onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                    className="border-orange-300 focus:border-orange-500 text-green-700"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="panNumber" className="text-orange-600 font-medium">
                    PAN Card Number *
                  </Label>
                  <Input
                    id="panNumber"
                    value={formData.panNumber}
                    onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
                    className="border-orange-300 focus:border-orange-500 text-green-700"
                    maxLength={10}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstNumber" className="text-orange-600 font-medium">
                    GST Number *
                  </Label>
                  <Input
                    id="gstNumber"
                    value={formData.gstNumber}
                    onChange={(e) => handleInputChange('gstNumber', e.target.value.toUpperCase())}
                    className="border-orange-300 focus:border-orange-500 text-green-700"
                    maxLength={15}
                    required
                  />
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
                    maxLength={12}
                  />
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
                  />
                </div>
              </div>

              {/* File Upload Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600">Document Upload (Optional)</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      onClick={() => document.getElementById('fileUpload')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Attach Documents
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
                    <span className="text-sm text-green-600">
                      You can attach PAN card, Aadhar card, or other relevant documents
                    </span>
                  </div>
                  
                  {/* Show uploaded files */}
                  {uploadedFiles.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-green-700 mb-2">Attached Files:</h4>
                      <div className="space-y-1">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm text-green-600">
                            <FileImage className="w-4 h-4" />
                            <span>{file.name}</span>
                            <span className="text-xs text-green-500">({file.type})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button - Moved to Right Corner */}
              <div className="flex justify-end space-x-4">
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-green-300 text-green-600 hover:bg-green-50"
                    onClick={() => {
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
                    }}
                  >
                    Cancel
                  </Button>
                )}
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
          </CardContent>
        </Card>

        {/* Clients Table */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Registered Clients</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-orange-50">
                    <TableHead className="text-orange-700 font-semibold">Client ID</TableHead>
                    <TableHead className="text-orange-700 font-semibold">Firm Name</TableHead>
                    <TableHead className="text-orange-700 font-semibold">Authorized Person</TableHead>
                    <TableHead className="text-orange-700 font-semibold">Firm Type</TableHead>
                    <TableHead className="text-orange-700 font-semibold">Contact</TableHead>
                    <TableHead className="text-orange-700 font-semibold">PAN Number</TableHead>
                    <TableHead className="text-orange-700 font-semibold">GST Number</TableHead>
                    <TableHead className="text-orange-700 font-semibold">Email</TableHead>
                    <TableHead className="text-orange-700 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-green-50">
                      <TableCell className="text-orange-700 font-bold bg-orange-50">{client.clientId}</TableCell>
                      <TableCell className="text-green-700 font-medium">{client.firmName}</TableCell>
                      <TableCell className="text-orange-700">{client.authorizedPersonName}</TableCell>
                      <TableCell className="text-green-700">{client.firmType}</TableCell>
                      <TableCell className="text-orange-700">{client.contactNumber}</TableCell>
                      <TableCell className="text-green-700 font-mono">{client.panNumber}</TableCell>
                      <TableCell className="text-orange-700 font-mono">{client.gstNumber}</TableCell>
                      <TableCell className="text-green-700">{client.email || '-'}</TableCell>
                      <TableCell>
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
                  {clients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                        No clients registered yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
                  </Card>
        </div>

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
      </DashboardLayout>
    );
  } 