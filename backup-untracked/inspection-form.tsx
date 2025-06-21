"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Upload, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { collection, getDocs, addDoc, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

interface WarehouseInspectionFormProps {
  onClose: () => void;
  initialData?: any;
  mode?: 'create' | 'view' | 'edit';
  onStatusChange?: (warehouseCode: string, newStatus: string) => void;
}

interface WarehouseData {
  id: string;
  warehouseCode: string;
  warehouseName: string;
}

interface BankData {
  id: string;
  bankName: string;
  state: string;
  locations: {
    branchName: string;
    ifscCode: string;
  }[];
}

interface AssociatedBank {
  bankState: string;
  bankBranch: string;
  bankName: string;
  ifscCode: string;
}

export default function WarehouseInspectionForm({ 
  onClose, 
  initialData, 
  mode = 'create',
  onStatusChange 
}: WarehouseInspectionFormProps) {
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    // Basic warehouse details
    warehouseName: '',
    warehouseCode: '',
    inspectionCode: '',
    address: '',
    status: 'pending', // Default status
    showActivationButtons: false,
    typeOfWarehouse: '',
    customWarehouseType: '',
    license: '',
    licenseNumber: '',
    dateOfInspection: null as Date | null,
    
    // Bank details
    bankState: '',
    bankBranch: '',
    bankName: '',
    ifscCode: '',
    
    // Ownership details
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
    
    // Physical condition
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
    
    // Cold storage specific
    typeOfColdStorage: '',
    typeOfCoolingSystem: '',
    typeOfInsulation: '',
    temperatureMaintained: '',
    
    // Insurance
    insuranceTakenBy: '',
    insuranceCompany: '',
    insurancePolicyNumber: '',
    assuredSum: '',
    validityOfInsurance: null as Date | null,
    originalVerified: '',
    
    // Security
    securityAvailable: '',
    typeOfSecurity: '',
    securityGuard: '',
    
    // Inside warehouse
    stackingDone: '',
    commodityStored: '',
    dunnageUsed: '',
    numberOfBags: '',
    weightInMT: '',
    stockCountable: '',
    otherBanksCargo: '',
    nameOfBank: [] as string[],
    otherCollateralManager: '',
    nameOfManager: '',
    
    // Plan for stocking
    commodity: '',
    quantity: '',
    
    // Warehouse upkeep
    dividedIntoChambers: '',
    howManyChambers: '',
    usingStackCards: '',
    maintainingRegisters: '',
    fireFightingEquipments: '',
    numberOfExtinguishers: '',
    expiryDate: null as Date | null,
    weighbridgeFacility: '',
    weighbridgeType: '',
    distanceToWeighbridge: '',
    distanceToPoliceStation: '',
    distanceToFireStation: '',
    
    // Other details
    riskOfCargoAffected: '',
    duringMonsoon: '',
    monsoonRisk: '',
    
    // Insurance claim history
    insuranceClaimHistory: '',
    claimRemarks: '',
    
    // Certification
    warehouseFitCertification: false,
    
    // OE details
    nameOfOE: '',
    oeDate: null as Date | null,
    contactNumber: '',
    place: '',
    attachedFiles: [] as string[],
    
    // Remarks
    remarks: ''
  });

  // Data states
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [banksData, setBanksData] = useState<BankData[]>([]);
  const [availableBankStates, setAvailableBankStates] = useState<string[]>([]);
  const [availableBankBranches, setAvailableBankBranches] = useState<string[]>([]);
  const [availableBanks, setAvailableBanks] = useState<{name: string, ifsc: string}[]>([]);
  const [associatedBanks, setAssociatedBanks] = useState<AssociatedBank[]>([]);
  
  // Determine if form should be read-only
  const isReadOnly = formData.status === 'submitted';
  
  // Determine which specific fields should be read-only when viewing from status pages
  const isViewMode = mode === 'view';
  const isFormReadOnly = isReadOnly || (isViewMode && formData.status !== 'pending');
  
  // Helper function to check if a field should be read-only
  const isFieldReadOnly = (fieldName: string) => {
    // If in create mode (new form), no fields are read-only
    if (mode === 'create') {
      return false;
    }
    
    // For pending status - only specific pre-fetched fields are read-only
    if (formData.status === 'pending') {
      const preFetchedFields = [
        'warehouseName',
        'warehouseCode', 
        'inspectionCode',
        'bankState',
        'bankBranch', 
        'bankName',
        'ifscCode'
      ];
      
      return preFetchedFields.includes(fieldName);
    }
    
    // For ALL other statuses (submitted, activated, rejected, etc.) - ALL fields are read-only
    return true;
  };
  
  // Custom dropdown states
  const [customWarehouseTypes, setCustomWarehouseTypes] = useState<string[]>([]);
  const [customShutterTypes, setCustomShutterTypes] = useState<string[]>([]);
  
  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const fileNames = files.map(file => file.name);
      setSelectedFiles(prev => [...prev, ...files]);
      setFormData(prev => ({ 
        ...prev, 
        attachedFiles: [...prev.attachedFiles, ...fileNames]
      }));
      toast({
        title: "Files Selected",
        description: `${files.length} file(s) selected successfully`,
      });
    }
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  };

  // Load data on component mount
  useEffect(() => {
    loadWarehouses();
    loadBanksData();
  }, []);

  // Initialize form with existing data if provided (only once)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        // Preserve attachedFiles if they exist in current state
        attachedFiles: initialData.attachedFiles || prev.attachedFiles || []
      }));
      
      // If in view mode and we have a warehouse name, fetch associated banks
      if (mode === 'view' && initialData.warehouseName && initialData.warehouseCode) {
        fetchAssociatedBanks(initialData.warehouseCode);
      }
    }
  }, [initialData?.inspectionCode, mode]); // Only depend on inspectionCode, not entire initialData

  // Bank state effect
  useEffect(() => {
    if (banksData.length > 0) {
      const states = [...new Set(banksData.map(bank => bank.state))];
      setAvailableBankStates(states);
    }
  }, [banksData]);

  // Bank branch effect
  useEffect(() => {
    if (formData.bankState) {
      const banksInState = banksData.filter(bank => bank.state === formData.bankState);
      const branches: string[] = [];
      
      banksInState.forEach(bank => {
        bank.locations.forEach(location => {
          if (location.branchName) branches.push(location.branchName);
        });
      });
      
      setAvailableBankBranches([...new Set(branches)]);
      
      // Don't clear bank data in view mode - preserve the initial data
      if (mode !== 'view') {
        setFormData(prev => ({ ...prev, bankBranch: '', bankName: '', ifscCode: '' }));
      }
    }
  }, [formData.bankState, banksData, mode]);

  // Bank name effect
  useEffect(() => {
    if (formData.bankState && formData.bankBranch) {
      const banksInState = banksData.filter(bank => bank.state === formData.bankState);
      const banksInBranch: {name: string, ifsc: string}[] = [];
      
      banksInState.forEach(bank => {
        bank.locations.forEach(location => {
          if (location.branchName === formData.bankBranch) {
            banksInBranch.push({
              name: bank.bankName,
              ifsc: location.ifscCode
            });
          }
        });
      });
      
      setAvailableBanks(banksInBranch);
      
      // Don't clear bank data in view mode - preserve the initial data
      if (mode !== 'view') {
        setFormData(prev => ({ ...prev, bankName: '', ifscCode: '' }));
      }
    }
  }, [formData.bankState, formData.bankBranch, banksData, mode]);

  // Auto-calculate warehouse capacity
  useEffect(() => {
    if (formData.warehouseLength && formData.warehouseBreadth && formData.divisionFactor) {
      const length = parseFloat(formData.warehouseLength);
      const breadth = parseFloat(formData.warehouseBreadth);
      const division = parseFloat(formData.divisionFactor);
      
      if (!isNaN(length) && !isNaN(breadth) && !isNaN(division) && division !== 0) {
        const capacity = ((length * breadth) / division).toFixed(2);
        setFormData(prev => ({ ...prev, warehouseCapacity: capacity }));
      }
    }
  }, [formData.warehouseLength, formData.warehouseBreadth, formData.divisionFactor]);

  const loadWarehouses = async () => {
    try {
      // Load from inspections collection to get existing warehouses
      const inspectionsRef = collection(db, 'inspections');
      const snapshot = await getDocs(inspectionsRef);
      
      const warehouseSet = new Set<string>();
      const warehouseData: WarehouseData[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.warehouseName && !warehouseSet.has(data.warehouseName)) {
          warehouseSet.add(data.warehouseName);
          warehouseData.push({
            id: doc.id,
            warehouseName: data.warehouseName,
            warehouseCode: data.warehouseCode || 'WH-0001'
          });
        }
      });
      
      setWarehouses(warehouseData);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadBanksData = async () => {
    try {
      const banksRef = collection(db, 'banks');
      const snapshot = await getDocs(banksRef);
      
      const banksData: BankData[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BankData[];
      
      setBanksData(banksData);
    } catch (error) {
      console.error('Error loading banks data:', error);
    }
  };

  const handleWarehouseSelect = async (warehouseName: string) => {
    const selectedWarehouse = warehouses.find(w => w.warehouseName === warehouseName);
    if (selectedWarehouse) {
      setFormData(prev => ({
        ...prev,
        warehouseName,
        warehouseCode: selectedWarehouse.warehouseCode
      }));

      // Fetch associated banks for this warehouse
      await fetchAssociatedBanks(selectedWarehouse.warehouseCode);
    }
  };

  const fetchAssociatedBanks = async (warehouseCode: string) => {
    try {
      // Get all inspections for this warehouse code
      const inspectionsRef = collection(db, 'inspections');
      const snapshot = await getDocs(inspectionsRef);
      
      const associatedBanksData: AssociatedBank[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.warehouseCode === warehouseCode) {
          associatedBanksData.push({
            bankState: data.bankState || '',
            bankBranch: data.bankBranch || '',
            bankName: data.bankName || '',
            ifscCode: data.ifscCode || ''
          });
        }
      });

      // Remove duplicates based on bank name and IFSC
      const uniqueBanks = associatedBanksData.filter((bank, index, self) => 
        index === self.findIndex(b => b.bankName === bank.bankName && b.ifscCode === bank.ifscCode)
      );

      setAssociatedBanks(uniqueBanks);

      // Only auto-fill bank details if we're not in view mode
      // In view mode, preserve the specific inspection's bank details from initialData
      if (mode !== 'view' && uniqueBanks.length > 0) {
        const firstBank = uniqueBanks[0];
        setFormData(prev => ({
          ...prev,
          bankState: firstBank.bankState,
          bankBranch: firstBank.bankBranch,
          bankName: firstBank.bankName,
          ifscCode: firstBank.ifscCode
        }));
      }

    } catch (error) {
      console.error('Error fetching associated banks:', error);
      toast({
        title: "Error",
        description: "Failed to load associated banks",
        variant: "destructive",
      });
    }
  };

  const handleBankSelect = (bankName: string) => {
    const selectedBank = availableBanks.find(b => b.name === bankName);
    if (selectedBank) {
      setFormData(prev => ({
        ...prev,
        bankName,
        ifscCode: selectedBank.ifsc
      }));
    }
  };

  const addBankName = () => {
    setFormData(prev => ({
      ...prev,
      nameOfBank: [...prev.nameOfBank, '']
    }));
  };

  const removeBankName = (index: number) => {
    setFormData(prev => ({
      ...prev,
      nameOfBank: prev.nameOfBank.filter((_, i) => i !== index)
    }));
  };

  const updateBankName = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      nameOfBank: prev.nameOfBank.map((name, i) => i === index ? value : name)
    }));
  };

  const validateForm = () => {
    const baseRequiredFields = [
      'warehouseName', 'address', 'typeOfWarehouse', 'license', 'dateOfInspection',
      'godownOwnership', 'nameOfClient', 'godownOwnerName', 'godownManagedBy', 
      'warehouseLength', 'warehouseBreadth', 'warehouseHeight', 'divisionFactor', 
      'constructionYear', 'totalChambers', 'latitude', 'longitude', 'flooring', 
      'shutterDoor', 'walls', 'roof', 'plinthHeight', 'anyLeakage', 
      'drainageChannels', 'electricWiring', 'compoundWallAvailability', 
      'compoundGate', 'isWarehouseClean', 'waterAvailability', 'insuranceTakenBy',
      'securityAvailable', 'stackingDone', 'stockCountable',
      'otherBanksCargo', 'otherCollateralManager', 'commodity', 'quantity',
      'dividedIntoChambers', 'usingStackCards', 'maintainingRegisters',
      'fireFightingEquipments', 'weighbridgeFacility', 'distanceToPoliceStation',
      'distanceToFireStation', 'riskOfCargoAffected', 'duringMonsoon',
      'insuranceClaimHistory', 'nameOfOE', 'oeDate', 'contactNumber', 'place'
    ];

    // Add insurance fields only if insurance is NOT taken by bank
    const requiredFields = [...baseRequiredFields];
    if (formData.insuranceTakenBy && formData.insuranceTakenBy !== 'bank') {
      requiredFields.push(
        'insuranceCompany', 'insurancePolicyNumber', 'assuredSum', 
        'validityOfInsurance', 'originalVerified'
      );
    }

    const missingFields: string[] = [];

    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        missingFields.push(field.replace(/([A-Z])/g, ' $1').toLowerCase());
      }
    });

    // Check conditional fields
    if (formData.typeOfWarehouse === 'others' && !formData.customWarehouseType) {
      missingFields.push('custom warehouse type');
    }
    if (formData.license === 'yes' && !formData.licenseNumber) {
      missingFields.push('license number');
    }
    if (formData.typeOfWarehouse === 'cold storage') {
      if (!formData.typeOfColdStorage) missingFields.push('type of cold storage');
      if (!formData.typeOfCoolingSystem) missingFields.push('type of cooling system');
      if (!formData.typeOfInsulation) missingFields.push('type of insulation');
      if (!formData.temperatureMaintained) missingFields.push('temperature maintained');
    }

    if (!formData.warehouseFitCertification) {
      missingFields.push('warehouse fit certification');
    }

    return missingFields;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if form is in view mode for non-pending status
    if (isViewMode && formData.status !== 'pending') {
      return;
    }
    
    const missingFields = validateForm();
    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    try {
      // When submitting, update the existing inspection record's status
      const submissionData = {
        ...formData,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        submittedDate: format(new Date(), 'yyyy-MM-dd'),
        lastUpdated: new Date().toISOString()
      };

      // Update the existing inspection record in the inspections collection
      if (formData.inspectionCode) {
        // Find the inspection document by inspectionCode
        const inspectionsRef = collection(db, 'inspections');
        const q = query(inspectionsRef, where('inspectionCode', '==', formData.inspectionCode));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Update the existing inspection record
          const docRef = doc(db, 'inspections', querySnapshot.docs[0].id);
          await updateDoc(docRef, {
            status: 'submitted',
            warehouseInspectionData: submissionData,
            submittedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          });
        }
      } else {
        // Create new inspection record if no inspectionCode exists
        await addDoc(collection(db, 'inspections'), {
          ...submissionData,
          inspectionCode: `INS-${Date.now()}`,
          createdAt: new Date().toISOString()
        });
      }

      // Update status in inspection creation table
      if (onStatusChange && formData.warehouseCode) {
        onStatusChange(formData.warehouseCode, 'submitted');
      }

      toast({
        title: "Success",
        description: "Warehouse inspection form submitted successfully",
      });

      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to submit form. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle status change actions
  const handleStatusAction = async (action: 'edit' | 'activate' | 'resubmit' | 'reject' | 'close' | 'reactivate' | 'submit') => {
    try {
      let newStatus = '';
      let actionMessage = '';

      switch (action) {
        case 'edit':
          newStatus = 'pending';
          actionMessage = 'Moved to pending for editing';
          break;
        case 'activate':
          newStatus = 'activated';
          actionMessage = 'Activated successfully';
          break;
        case 'resubmit':
          newStatus = 'resubmitted';
          actionMessage = 'Moved to resubmitted';
          break;
        case 'reject':
          newStatus = 'rejected';
          actionMessage = 'Rejected';
          break;
        case 'close':
          newStatus = 'closed';
          actionMessage = 'Closed successfully';
          break;
        case 'reactivate':
          newStatus = 'reactivate';
          actionMessage = 'Moved to reactivation';
          break;
        case 'submit':
          newStatus = 'submitted';
          actionMessage = 'Resubmitted successfully';
          break;
      }

      // Update the status in Firebase
      
      let documentFound = false;
      
              // First try with inspectionCode if available
        if (formData.inspectionCode) {
          const inspectionsRef = collection(db, 'inspections');
          const q = query(inspectionsRef, where('inspectionCode', '==', formData.inspectionCode));
          const querySnapshot = await getDocs(q);
        
                  if (!querySnapshot.empty) {
            const docRef = doc(db, 'inspections', querySnapshot.docs[0].id);
          
          // Clean the form data to avoid invalid date issues
          const cleanFormData = { ...formData };
          
          // Fix any invalid dates
          Object.keys(cleanFormData).forEach(key => {
            if (cleanFormData[key] instanceof Date) {
              if (isNaN(cleanFormData[key].getTime())) {
                cleanFormData[key] = null; // Replace invalid dates with null
              } else {
                cleanFormData[key] = cleanFormData[key].toISOString(); // Convert valid dates to ISO string
              }
            }
          });

          await updateDoc(docRef, {
            status: newStatus,
            lastUpdated: new Date().toISOString(),
            [`${newStatus}At`]: new Date().toISOString(),
            warehouseInspectionData: {
              ...cleanFormData,
              status: newStatus,
              lastUpdated: new Date().toISOString()
            }
                      });
            
            documentFound = true;
        }
      }
      
              // If not found by inspectionCode, try by warehouseCode
        if (!documentFound && formData.warehouseCode) {
          const inspectionsRef = collection(db, 'inspections');
          const q = query(inspectionsRef, where('warehouseCode', '==', formData.warehouseCode), where('status', '==', 'submitted'));
          const querySnapshot = await getDocs(q);
        
                  if (!querySnapshot.empty) {
            const docRef = doc(db, 'inspections', querySnapshot.docs[0].id);
          
          // Clean the form data to avoid invalid date issues
          const cleanFormData2 = { ...formData };
          
          // Fix any invalid dates
          Object.keys(cleanFormData2).forEach(key => {
            if (cleanFormData2[key] instanceof Date) {
              if (isNaN(cleanFormData2[key].getTime())) {
                cleanFormData2[key] = null; // Replace invalid dates with null
              } else {
                cleanFormData2[key] = cleanFormData2[key].toISOString(); // Convert valid dates to ISO string
              }
            }
          });

          await updateDoc(docRef, {
            status: newStatus,
            lastUpdated: new Date().toISOString(),
            [`${newStatus}At`]: new Date().toISOString(),
            warehouseInspectionData: {
              ...cleanFormData2,
              status: newStatus,
              lastUpdated: new Date().toISOString()
            }
                      });
            
            documentFound = true;
        }
      }
      
      if (!documentFound) {
        toast({
          title: "Error",
          description: "Could not find inspection record to update",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setFormData(prev => ({ 
        ...prev, 
        status: newStatus,
        showActivationButtons: false
      }));

      // Notify parent component
      if (onStatusChange && formData.warehouseCode) {
        onStatusChange(formData.warehouseCode, newStatus);
      }

      toast({
        title: "Status Updated",
        description: actionMessage,
      });

      // Only close form for non-edit actions
      if (action !== 'edit') {
        setTimeout(() => onClose(), 1000);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      {/* Company Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Image
            src="/logo 3.jpeg"
            alt="Company Logo"
            width={100}
            height={100}
            className="rounded-full"
          />
        </div>
        <h1 className="text-3xl font-bold text-orange-600">
          AGROGREEN WAREHOUSING PRIVATE LTD.
        </h1>
        <p className="text-lg text-green-600 font-medium">
          603, 6th Floor, Princess Business Skyline, Indore, Madhya Pradesh - 452010
        </p>
        <h2 className="text-xl font-semibold text-orange-600 mt-6" style={{ textDecoration: 'underline', textDecorationColor: '#16a34a' }}>
          WAREHOUSE INSPECTION REPORT
        </h2>
        
        {/* Status Indicator */}
        {formData.status !== 'pending' && (
          <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            Status: {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
            {isReadOnly && <span className="ml-2 text-xs">(View Only)</span>}
          </div>
        )}
      </div>

      <style>{`
        [data-radix-select-trigger] {
          color: #ea580c !important;
        }
        [data-radix-select-value] {
          color: #ea580c !important;
        }
        [data-radix-select-content] {
          color: #ea580c !important;
        }
        [data-radix-select-item] {
          color: #ea580c !important;
        }
        [data-radix-select-item][data-highlighted] {
          color: #ea580c !important;
          background-color: rgba(234, 88, 12, 0.1) !important;
        }
        [data-radix-select-item][data-state="checked"] {
          color: #ea580c !important;
        }
        [role="combobox"] {
          color: #ea580c !important;
        }
        [role="option"] {
          color: #ea580c !important;
        }
        [role="listbox"] {
          color: #ea580c !important;
        }
        .text-orange-600 [data-radix-select-trigger],
        .text-orange-600 [data-radix-select-value],
        .text-orange-600 [data-radix-select-content],
        .text-orange-600 [data-radix-select-item] {
          color: #ea580c !important;
        }
        button[role="combobox"] {
          color: #ea580c !important;
        }
        button[role="combobox"] span {
          color: #ea580c !important;
        }
        div[role="listbox"] {
          color: #ea580c !important;
        }
        div[role="option"] {
          color: #ea580c !important;
        }
        /* More specific selectors for shadcn/ui Select */
        .select-trigger,
        .select-value,
        .select-content,
        .select-item {
          color: #ea580c !important;
        }
        /* Target all button and span elements within Select components */
        .space-y-2 button,
        .space-y-2 button span,
        .space-y-2 [data-state] {
          color: #ea580c !important;
        }
        /* Global override for any select-related elements */
        *[class*="select"] {
          color: #ea580c !important;
        }
      `}</style>
      <form onSubmit={handleSubmit} className={`space-y-8 max-w-6xl mx-auto ${isFormReadOnly ? 'form-read-only' : ''}`}>
        {/* Global read-only styles for non-pending status */}
        <style>{`
          ${isFormReadOnly ? `
            .form-read-only input:not([readonly]),
            .form-read-only textarea:not([readonly]),
            .form-read-only select,
            .form-read-only [role="combobox"],
            .form-read-only button[role="combobox"],
            .form-read-only [data-radix-select-trigger],
            .form-read-only button[type="button"]:not(.action-button) {
              pointer-events: none !important;
              background-color: #f9fafb !important;
              opacity: 0.8 !important;
              cursor: not-allowed !important;
              border-color: #d1d5db !important;
            }
            .form-read-only [data-state="open"] {
              pointer-events: none !important;
            }
          ` : ''}
        `}</style>
        {/* Basic Warehouse Details */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Warehouse Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehouseName">Warehouse Name <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.warehouseName} 
                  onValueChange={isFieldReadOnly('warehouseName') ? undefined : handleWarehouseSelect} 
                  disabled={isFieldReadOnly('warehouseName')}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select Warehouse" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    {warehouses.map(warehouse => (
                      <SelectItem key={warehouse.id} value={warehouse.warehouseName}>
                        {warehouse.warehouseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouseCode">Warehouse Code</Label>
                <Input
                  id="warehouseCode"
                  value={formData.warehouseCode}
                  readOnly
                  className="bg-gray-50 text-orange-600"
                />
              </div>
            </div>

            {/* Inspection Code - Only shown in view mode or when data exists */}
            {(isViewMode || formData.inspectionCode) && (
              <div className="space-y-2">
                <Label htmlFor="inspectionCode">Inspection Code</Label>
                <Input
                  id="inspectionCode"
                  value={formData.inspectionCode || ''}
                  readOnly
                  className="bg-gray-50 text-orange-600"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={isFieldReadOnly('address') ? undefined : (e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                readOnly={isFieldReadOnly('address')}
                className={isFieldReadOnly('address') ? "bg-gray-50 text-orange-600" : "text-orange-600"}
                required
              />
            </div>



            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="typeOfWarehouse">Type of Warehouse <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.typeOfWarehouse} 
                  onValueChange={isFieldReadOnly('typeOfWarehouse') ? undefined : (value) => setFormData(prev => ({ ...prev, typeOfWarehouse: value }))}
                  disabled={isFieldReadOnly('typeOfWarehouse')}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: '#ea580c' }}>
                    <SelectValue placeholder="Select Type" className="text-orange-600" style={{ color: '#ea580c' }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: '#ea580c' }}>
                    <SelectItem value="dry warehouse" className="text-orange-600" style={{ color: '#ea580c' }}>Dry Warehouse</SelectItem>
                    <SelectItem value="cold storage" className="text-orange-600" style={{ color: '#ea580c' }}>Cold Storage</SelectItem>
                    <SelectItem value="silo" className="text-orange-600" style={{ color: '#ea580c' }}>Silo</SelectItem>
                    <SelectItem value="tank" className="text-orange-600" style={{ color: '#ea580c' }}>Tank</SelectItem>
                    <SelectItem value="factory premises" className="text-orange-600" style={{ color: '#ea580c' }}>Factory Premises</SelectItem>
                    {customWarehouseTypes.map(type => (
                      <SelectItem key={type} value={type} style={{ color: '#ea580c' }}>{type}</SelectItem>
                    ))}
                    <SelectItem value="others" className="text-orange-600" style={{ color: "#ea580c" }}>Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.typeOfWarehouse === 'others' && (
                <div className="space-y-2">
                  <Label htmlFor="customWarehouseType">Specify Other Type <span className="text-red-500">*</span></Label>
                  <Input
                    id="customWarehouseType"
                    value={formData.customWarehouseType}
                    onChange={isFieldReadOnly('customWarehouseType') ? undefined : (e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ ...prev, customWarehouseType: value }));
                      if (value && !customWarehouseTypes.includes(value)) {
                        setCustomWarehouseTypes(prev => [...prev, value]);
                      }
                    }}
                    readOnly={isFieldReadOnly('customWarehouseType')}
                    className={isFieldReadOnly('customWarehouseType') ? "bg-gray-50 text-orange-600" : "text-orange-600"}
                    required
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license">License <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.license} 
                  onValueChange={isFieldReadOnly('license') ? undefined : (value) => setFormData(prev => ({ ...prev, license: value }))}
                  disabled={isFieldReadOnly('license')}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.license === 'yes' && (
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number <span className="text-red-500">*</span></Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={isFieldReadOnly('licenseNumber') ? undefined : (e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                    readOnly={isFieldReadOnly('licenseNumber')}
                    className={isFieldReadOnly('licenseNumber') ? "bg-gray-50 text-orange-600" : "text-orange-600"}
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Date of Inspection <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal text-orange-600"
                    disabled={isFieldReadOnly('dateOfInspection')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dateOfInspection && !isNaN(formData.dateOfInspection.getTime()) ? format(formData.dateOfInspection, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                {!isFieldReadOnly('dateOfInspection') && (
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.dateOfInspection || undefined}
                      onSelect={(date) => setFormData(prev => ({ ...prev, dateOfInspection: date || null }))}
                      initialFocus
                      className="text-orange-600"
                    />
                  </PopoverContent>
                )}
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
                {/* Bank Details Form - Show selected bank details */}
                <div className="mb-6 p-4 border border-green-200 rounded-lg bg-green-50">
                  <Label className="text-sm font-medium text-green-700 mb-3 block">
                    {isViewMode ? "Bank Details for this Inspection:" : "Select Bank Details:"}
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankState">Bank State <span className="text-red-500">*</span></Label>
                      <Input
                        id="bankState"
                        value={formData.bankState || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, bankState: e.target.value }))}
                  className="text-orange-600"
                        readOnly={isFieldReadOnly('bankState')}
                        className={isFieldReadOnly('bankState') ? "bg-gray-50 text-orange-600" : "text-orange-600"}
                        className="text-orange-600"
                  required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankBranch">Bank Branch <span className="text-red-500">*</span></Label>
                      <Input
                        id="bankBranch"
                        value={formData.bankBranch || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, bankBranch: e.target.value }))}
                  className="text-orange-600"
                        readOnly={isFieldReadOnly('bankBranch')}
                        className={isFieldReadOnly('bankBranch') ? "bg-gray-50 text-orange-600" : "text-orange-600"}
                        className="text-orange-600"
                  required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="bankName"
                        value={formData.bankName || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  className="text-orange-600"
                        readOnly={isFieldReadOnly('bankName')}
                        className={isFieldReadOnly('bankName') ? "bg-gray-50 text-orange-600" : "text-orange-600"}
                        className="text-orange-600"
                  required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ifscCode">IFSC Code <span className="text-red-500">*</span></Label>
                      <Input
                        id="ifscCode"
                        value={formData.ifscCode || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, ifscCode: e.target.value }))}
                  className="text-orange-600"
                        readOnly={isFieldReadOnly('ifscCode')}
                        className={isFieldReadOnly('ifscCode') ? "bg-gray-50 text-orange-600" : "text-orange-600"}
                        className="text-orange-600"
                  required
                      />
                    </div>
                  </div>
                </div>


          </CardContent>
        </Card>

        {/* Ownership & Warehouse Details */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Ownership & Warehouse Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="godownOwnership">Godown Ownership <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.godownOwnership} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, godownOwnership: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select Ownership" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="proprietorship" className="text-orange-600" style={{ color: "#ea580c" }}>Proprietorship</SelectItem>
                    <SelectItem value="partnership" className="text-orange-600" style={{ color: "#ea580c" }}>Partnership</SelectItem>
                    <SelectItem value="company" className="text-orange-600" style={{ color: "#ea580c" }}>Company</SelectItem>
                    <SelectItem value="huf" className="text-orange-600" style={{ color: "#ea580c" }}>HUF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameOfClient">Name of Client <span className="text-red-500">*</span></Label>
                <Input
                  id="nameOfClient"
                  value={formData.nameOfClient}
                  onChange={(e) => setFormData(prev => ({ ...prev, nameOfClient: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="godownOwnerName">Godown Owner Name <span className="text-red-500">*</span></Label>
                <Input
                  id="godownOwnerName"
                  value={formData.godownOwnerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, godownOwnerName: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="godownManagedBy">Godown Managed By <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.godownManagedBy} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, godownManagedBy: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select Manager" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="agrogreen pvt ltd" className="text-orange-600" style={{ color: "#ea580c" }}>Agrogreen</SelectItem>
                    <SelectItem value="warehouse owner" className="text-orange-600" style={{ color: "#ea580c" }}>Warehouse Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehouseLength">Warehouse Length (sq ft) <span className="text-red-500">*</span></Label>
                <Input
                  id="warehouseLength"
                  type="number"
                  step="0.01"
                  value={formData.warehouseLength}
                  onChange={(e) => setFormData(prev => ({ ...prev, warehouseLength: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouseBreadth">Warehouse Breadth (sq ft) <span className="text-red-500">*</span></Label>
                <Input
                  id="warehouseBreadth"
                  type="number"
                  step="0.01"
                  value={formData.warehouseBreadth}
                  onChange={(e) => setFormData(prev => ({ ...prev, warehouseBreadth: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouseHeight">Warehouse Height (sq ft) <span className="text-red-500">*</span></Label>
                <Input
                  id="warehouseHeight"
                  type="number"
                  step="0.01"
                  value={formData.warehouseHeight}
                  onChange={(e) => setFormData(prev => ({ ...prev, warehouseHeight: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="divisionFactor">Division Factor <span className="text-red-500">*</span></Label>
                <Input
                  id="divisionFactor"
                  type="number"
                  step="0.01"
                  min="3"
                  max="9"
                  value={formData.divisionFactor}
                  onChange={(e) => setFormData(prev => ({ ...prev, divisionFactor: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouseCapacity">Warehouse Capacity (MT)</Label>
                <Input
                  id="warehouseCapacity"
                  value={formData.warehouseCapacity}
                  readOnly
                  className="bg-gray-50 text-orange-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="constructionYear">Construction Year <span className="text-red-500">*</span></Label>
                <Input
                  id="constructionYear"
                  type="number"
                  min="1900"
                  max="2030"
                  value={formData.constructionYear}
                  onChange={(e) => setFormData(prev => ({ ...prev, constructionYear: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalChambers">Total Number of Chambers <span className="text-red-500">*</span></Label>
                <Input
                  id="totalChambers"
                  value={formData.totalChambers}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalChambers: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude <span className="text-red-500">*</span></Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude <span className="text-red-500">*</span></Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Physical Condition of Warehouse */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Physical Condition of Warehouse</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="flooring">Flooring <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.flooring} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, flooring: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select Flooring" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="cemented" className="text-orange-600" style={{ color: "#ea580c" }}>Cemented</SelectItem>
                    <SelectItem value="bricks" className="text-orange-600" style={{ color: "#ea580c" }}>Bricks</SelectItem>
                    <SelectItem value="wooden floor" className="text-orange-600" style={{ color: "#ea580c" }}>Wooden Floor</SelectItem>
                    <SelectItem value="stone" className="text-orange-600" style={{ color: "#ea580c" }}>Stone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shutterDoor">Shutter/Door <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.shutterDoor} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, shutterDoor: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select Type" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="iron" className="text-orange-600" style={{ color: "#ea580c" }}>Iron</SelectItem>
                                          {customShutterTypes.map(type => (
                        <SelectItem key={type} value={type} style={{ color: '#ea580c' }}>{type}</SelectItem>
                      ))}
                    <SelectItem value="other" className="text-orange-600" style={{ color: "#ea580c" }}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.shutterDoor === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="customShutterDoor">Specify Other Door Type <span className="text-red-500">*</span></Label>
                <Input
                  id="customShutterDoor"
                  value={formData.customShutterDoor}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, customShutterDoor: value }));
                    if (value && !customShutterTypes.includes(value)) {
                      setCustomShutterTypes(prev => [...prev, value]);
                    }
                  }}
                  className="text-orange-600"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="walls">Walls <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.walls} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, walls: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select Wall Type" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="metal" className="text-orange-600" style={{ color: "#ea580c" }}>Metal</SelectItem>
                    <SelectItem value="bricks" className="text-orange-600" style={{ color: "#ea580c" }}>Bricks</SelectItem>
                    <SelectItem value="metal+bricks" className="text-orange-600" style={{ color: "#ea580c" }}>Metal + Bricks</SelectItem>
                    <SelectItem value="cemented" className="text-orange-600" style={{ color: "#ea580c" }}>Cemented</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roof">Roof <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.roof} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, roof: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select Roof Type" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="cemented" className="text-orange-600" style={{ color: "#ea580c" }}>Cemented</SelectItem>
                    <SelectItem value="tin" className="text-orange-600" style={{ color: "#ea580c" }}>Tin</SelectItem>
                    <SelectItem value="concrete" className="text-orange-600" style={{ color: "#ea580c" }}>Concrete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plinthHeight">Plinth Height (sq ft) <span className="text-red-500">*</span></Label>
                <Input
                  id="plinthHeight"
                  type="number"
                  step="0.01"
                  min="1"
                  max="10"
                  value={formData.plinthHeight}
                  onChange={(e) => setFormData(prev => ({ ...prev, plinthHeight: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="anyLeakage">Any Leakage <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.anyLeakage} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, anyLeakage: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="drainageChannels">Drainage Channels <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.drainageChannels} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, drainageChannels: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="electricWiring">Electric Wiring Inside Warehouse <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.electricWiring} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, electricWiring: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="compoundWallAvailability">Compound Wall Availability <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.compoundWallAvailability} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, compoundWallAvailability: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.compoundWallAvailability === 'yes' && (
              <div className="space-y-2">
                <Label htmlFor="typeOfWall">Type of Wall <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.typeOfWall} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, typeOfWall: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select Wall Type" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="iron" className="text-orange-600" style={{ color: "#ea580c" }}>Iron</SelectItem>
                    <SelectItem value="cemented" className="text-orange-600" style={{ color: "#ea580c" }}>Cemented</SelectItem>
                    <SelectItem value="wire fencing" className="text-orange-600" style={{ color: "#ea580c" }}>Wire Fencing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="compoundGate">Compound Gate <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.compoundGate} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, compoundGate: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.compoundGate === 'yes' && (
                <div className="space-y-2">
                  <Label htmlFor="numberOfGates">Number of Gates <span className="text-red-500">*</span></Label>
                  <Input
                    id="numberOfGates"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.numberOfGates}
                    onChange={(e) => setFormData(prev => ({ ...prev, numberOfGates: e.target.value }))}
                  className="text-orange-600"
                    className="text-orange-600"
                  required
                  className="text-orange-600"
                />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="isWarehouseClean">Is Warehouse Clean <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.isWarehouseClean} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, isWarehouseClean: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waterAvailability">Water Availability <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.waterAvailability} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, waterAvailability: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.waterAvailability === 'yes' && (
              <div className="space-y-2">
                <Label htmlFor="typeOfAvailability">Type of Availability <span className="text-red-500">*</span></Label>
                <Input
                  id="typeOfAvailability"
                  value={formData.typeOfAvailability}
                  onChange={(e) => setFormData(prev => ({ ...prev, typeOfAvailability: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cold Storage Section (conditional) */}
        {formData.typeOfWarehouse === 'cold storage' && (
          <Card className="border-green-300">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-700">Cold Storage Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="typeOfColdStorage">Type of Cold Storage <span className="text-red-500">*</span></Label>
                  <Input
                    id="typeOfColdStorage"
                    value={formData.typeOfColdStorage}
                    onChange={(e) => setFormData(prev => ({ ...prev, typeOfColdStorage: e.target.value }))}
                  className="text-orange-600"
                    className="text-orange-600"
                  required
                  className="text-orange-600"
                />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="typeOfCoolingSystem">Type of Cooling System <span className="text-red-500">*</span></Label>
                  <Input
                    id="typeOfCoolingSystem"
                    value={formData.typeOfCoolingSystem}
                    onChange={(e) => setFormData(prev => ({ ...prev, typeOfCoolingSystem: e.target.value }))}
                  className="text-orange-600"
                    className="text-orange-600"
                  required
                  className="text-orange-600"
                />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="typeOfInsulation">Type of Insulation <span className="text-red-500">*</span></Label>
                  <Input
                    id="typeOfInsulation"
                    value={formData.typeOfInsulation}
                    onChange={(e) => setFormData(prev => ({ ...prev, typeOfInsulation: e.target.value }))}
                  className="text-orange-600"
                    className="text-orange-600"
                  required
                  className="text-orange-600"
                />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperatureMaintained">Temperature Maintained <span className="text-red-500">*</span></Label>
                  <Input
                    id="temperatureMaintained"
                    value={formData.temperatureMaintained}
                    onChange={(e) => setFormData(prev => ({ ...prev, temperatureMaintained: e.target.value }))}
                  className="text-orange-600"
                    className="text-orange-600"
                  required
                  className="text-orange-600"
                />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insurance of Stock */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Insurance of Stock</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insuranceTakenBy">Insurance Taken By <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.insuranceTakenBy} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, insuranceTakenBy: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="warehouse owner" className="text-orange-600" style={{ color: "#ea580c" }}>Warehouse Owner</SelectItem>
                    <SelectItem value="borrower" className="text-orange-600" style={{ color: "#ea580c" }}>Borrower</SelectItem>
                    <SelectItem value="bank" className="text-orange-600" style={{ color: "#ea580c" }}>Bank</SelectItem>
                    <SelectItem value="agrogreen" className="text-orange-600" style={{ color: "#ea580c" }}>Agrogreen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.insuranceTakenBy !== 'bank' && (
                <div className="space-y-2">
                  <Label htmlFor="insuranceCompany">Insurance Company <span className="text-red-500">*</span></Label>
                  <Input
                    id="insuranceCompany"
                    value={formData.insuranceCompany}
                    onChange={(e) => setFormData(prev => ({ ...prev, insuranceCompany: e.target.value }))}
                    className="text-orange-600"
                    required
                  />
                </div>
              )}
            </div>

            {formData.insuranceTakenBy !== 'bank' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="insurancePolicyNumber">Insurance Policy Number <span className="text-red-500">*</span></Label>
                    <Input
                      id="insurancePolicyNumber"
                      value={formData.insurancePolicyNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, insurancePolicyNumber: e.target.value }))}
                      className="text-orange-600"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assuredSum">Assured Sum <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                      <Input
                        id="assuredSum"
                        type="number"
                        className="pl-10 text-orange-600"
                        value={formData.assuredSum}
                        onChange={(e) => setFormData(prev => ({ ...prev, assuredSum: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Validity of Insurance <span className="text-red-500">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.validityOfInsurance && !isNaN(formData.validityOfInsurance.getTime()) ? format(formData.validityOfInsurance, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.validityOfInsurance || undefined}
                          onSelect={(date) => setFormData(prev => ({ ...prev, validityOfInsurance: date || null }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="originalVerified">Original Verified <span className="text-red-500">*</span></Label>
                    <Input
                      id="originalVerified"
                      value={formData.originalVerified}
                      onChange={(e) => setFormData(prev => ({ ...prev, originalVerified: e.target.value }))}
                      className="text-orange-600"
                      required
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security at Warehouse */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Security at Warehouse</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="securityAvailable">Security Available <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.securityAvailable} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, securityAvailable: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.securityAvailable === 'yes' && (
                <div className="space-y-2">
                  <Label htmlFor="typeOfSecurity">Type of Security <span className="text-red-500">*</span></Label>
                  <Select 
  className="select-orange"
                    value={formData.typeOfSecurity} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, typeOfSecurity: value }))}
                    className="text-orange-600"
                  required
                  >
                    <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                      <SelectValue placeholder="Select Type" className="text-orange-600" style={{ color: "#ea580c" }} />
                    </SelectTrigger>
                    <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                      <SelectItem value="agrogreen" className="text-orange-600" style={{ color: "#ea580c" }}>Agrogreen</SelectItem>
                      <SelectItem value="warehouse owner" className="text-orange-600" style={{ color: "#ea580c" }}>Warehouse Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {formData.securityAvailable === 'yes' && (
              <div className="space-y-2">
                <Label htmlFor="securityGuard">Security Guard <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.securityGuard} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, securityGuard: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="day" className="text-orange-600" style={{ color: "#ea580c" }}>Day</SelectItem>
                    <SelectItem value="night" className="text-orange-600" style={{ color: "#ea580c" }}>Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inside the Warehouse */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Inside the Warehouse</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stackingDone">Any Stacking Already Done <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.stackingDone} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, stackingDone: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.stackingDone === 'yes' && (
                <div className="space-y-2">
                  <Label htmlFor="commodityStored">Commodity Stored <span className="text-red-500">*</span></Label>
                  <Input
                    id="commodityStored"
                    value={formData.commodityStored}
                    onChange={(e) => setFormData(prev => ({ ...prev, commodityStored: e.target.value }))}
                  className="text-orange-600"
                    className="text-orange-600"
                  required
                  className="text-orange-600"
                />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dunnageUsed">If Dunnage is Used <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.dunnageUsed} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dunnageUsed: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.dunnageUsed === 'yes' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="numberOfBags">Number of Bags <span className="text-red-500">*</span></Label>
                    <Input
                      id="numberOfBags"
                      type="number"
                      value={formData.numberOfBags}
                      onChange={(e) => setFormData(prev => ({ ...prev, numberOfBags: e.target.value }))}
                  className="text-orange-600"
                      className="text-orange-600"
                  required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weightInMT">Weight in MT <span className="text-red-500">*</span></Label>
                    <Input
                      id="weightInMT"
                      type="number"
                      step="0.01"
                      value={formData.weightInMT}
                      onChange={(e) => setFormData(prev => ({ ...prev, weightInMT: e.target.value }))}
                  className="text-orange-600"
                      className="text-orange-600"
                  required
                    />
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stockCountable">Whether the Stock is Countable <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.stockCountable} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, stockCountable: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otherBanksCargo">Any Other Banks Cargo Stored in Same Warehouse <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.otherBanksCargo} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, otherBanksCargo: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.otherBanksCargo === 'yes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Name of Bank(s)</Label>
                  <Button type="button" onClick={addBankName} size="sm" className="bg-green-500 hover:bg-green-600">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Bank
                  </Button>
                </div>
                {formData.nameOfBank.map((bank, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={bank}
                      onChange={(e) => updateBankName(index, e.target.value)}
                      placeholder="Enter bank name"
                      className="flex-1 text-orange-600"
                    />
                    <Button
                      type="button"
                      onClick={() => removeBankName(index)}
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="otherCollateralManager">Any Other Collateral Manager Working in Same Warehouse <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.otherCollateralManager} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, otherCollateralManager: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.otherCollateralManager === 'yes' && (
                <div className="space-y-2">
                  <Label htmlFor="nameOfManager">Name of the Manager <span className="text-red-500">*</span></Label>
                  <Input
                    id="nameOfManager"
                    value={formData.nameOfManager}
                    onChange={(e) => setFormData(prev => ({ ...prev, nameOfManager: e.target.value }))}
                  className="text-orange-600"
                    className="text-orange-600"
                  required
                  className="text-orange-600"
                />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan for Stocking of Commodity */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Plan for Stocking of Commodity</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commodity">Commodity <span className="text-red-500">*</span></Label>
                <Input
                  id="commodity"
                  value={formData.commodity}
                  onChange={(e) => setFormData(prev => ({ ...prev, commodity: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity (MT) <span className="text-red-500">*</span></Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warehouse Upkeep */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Warehouse Upkeep</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dividedIntoChambers">Whether Warehouse is Divided into Chambers or Partitions <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.dividedIntoChambers} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dividedIntoChambers: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.dividedIntoChambers === 'yes' && (
                <div className="space-y-2">
                  <Label htmlFor="howManyChambers">How Many Chambers <span className="text-red-500">*</span></Label>
                  <Input
                    id="howManyChambers"
                    type="number"
                    value={formData.howManyChambers}
                    onChange={(e) => setFormData(prev => ({ ...prev, howManyChambers: e.target.value }))}
                  className="text-orange-600"
                    className="text-orange-600"
                  required
                  className="text-orange-600"
                />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usingStackCards">Whether Using Stack Cards <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.usingStackCards} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, usingStackCards: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintainingRegisters">Whether Maintaining Registers at Warehouse <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.maintainingRegisters} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, maintainingRegisters: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fireFightingEquipments">Whether Fire Fighting Equipments Available <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.fireFightingEquipments} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, fireFightingEquipments: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.fireFightingEquipments === 'yes' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="numberOfExtinguishers">Number of Extinguishers <span className="text-red-500">*</span></Label>
                    <Input
                      id="numberOfExtinguishers"
                      type="number"
                      value={formData.numberOfExtinguishers}
                      onChange={(e) => setFormData(prev => ({ ...prev, numberOfExtinguishers: e.target.value }))}
                  className="text-orange-600"
                      className="text-orange-600"
                  required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Expiry Date <span className="text-red-500">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.expiryDate && !isNaN(formData.expiryDate.getTime()) ? format(formData.expiryDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.expiryDate || undefined}
                          onSelect={(date) => setFormData(prev => ({ ...prev, expiryDate: date || null }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weighbridgeFacility">Whether Weighbridge Facility Available at Warehouse <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.weighbridgeFacility} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, weighbridgeFacility: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.weighbridgeFacility === 'yes' ? (
                <div className="space-y-2">
                  <Label htmlFor="weighbridgeType">Weighbridge Type <span className="text-red-500">*</span></Label>
                  <Select 
  className="select-orange"
                    value={formData.weighbridgeType} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, weighbridgeType: value }))}
                    className="text-orange-600"
                  required
                  >
                    <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                      <SelectValue placeholder="Select Type" className="text-orange-600" style={{ color: "#ea580c" }} />
                    </SelectTrigger>
                    <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                      <SelectItem value="electronic" className="text-orange-600" style={{ color: "#ea580c" }}>Electronic</SelectItem>
                      <SelectItem value="manual" className="text-orange-600" style={{ color: "#ea580c" }}>Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="distanceToWeighbridge">How Far is Weighbridge from Warehouse (km) <span className="text-red-500">*</span></Label>
                  <Input
                    id="distanceToWeighbridge"
                    type="number"
                    step="0.01"
                    value={formData.distanceToWeighbridge}
                    onChange={(e) => setFormData(prev => ({ ...prev, distanceToWeighbridge: e.target.value }))}
                  className="text-orange-600"
                    className="text-orange-600"
                  required
                  className="text-orange-600"
                />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="distanceToPoliceStation">Distance to Nearest Police Station (km) <span className="text-red-500">*</span></Label>
                <Input
                  id="distanceToPoliceStation"
                  type="number"
                  step="0.01"
                  value={formData.distanceToPoliceStation}
                  onChange={(e) => setFormData(prev => ({ ...prev, distanceToPoliceStation: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="distanceToFireStation">Distance to Nearest Fire Station (km) <span className="text-red-500">*</span></Label>
                <Input
                  id="distanceToFireStation"
                  type="number"
                  step="0.01"
                  value={formData.distanceToFireStation}
                  onChange={(e) => setFormData(prev => ({ ...prev, distanceToFireStation: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Other Details */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Other Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="riskOfCargoAffected">Any Risk of Cargo Getting Affected <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.riskOfCargoAffected} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, riskOfCargoAffected: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duringMonsoon">During Monsoon <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.duringMonsoon} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, duringMonsoon: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                    <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.duringMonsoon === 'yes' && (
              <div className="space-y-2">
                <Label htmlFor="monsoonRisk">Monsoon Risk <span className="text-red-500">*</span></Label>
                <Select 
  className="select-orange"
                  value={formData.monsoonRisk} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, monsoonRisk: value }))}
                  className="text-orange-600"
                  required
                >
                  <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectValue placeholder="Select Risk Type" className="text-orange-600" style={{ color: "#ea580c" }} />
                  </SelectTrigger>
                  <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                    <SelectItem value="flood" className="text-orange-600" style={{ color: "#ea580c" }}>Flood</SelectItem>
                    <SelectItem value="heavy rain" className="text-orange-600" style={{ color: "#ea580c" }}>Heavy Rain</SelectItem>
                    <SelectItem value="storm" className="text-orange-600" style={{ color: "#ea580c" }}>Storm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insurance Claim History */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Insurance Claim Theft/Fraud/Shortage/Fire History (3 Years)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="insuranceClaimHistory">Insurance Claim History <span className="text-red-500">*</span></Label>
              <Select 
  className="select-orange"
                value={formData.insuranceClaimHistory} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, insuranceClaimHistory: value }))}
                className="text-orange-600"
                  required
              >
                <SelectTrigger className="text-orange-600" style={{ color: "#ea580c" }}>
                  <SelectValue placeholder="Select" className="text-orange-600" style={{ color: "#ea580c" }} />
                </SelectTrigger>
                <SelectContent className="text-orange-600" style={{ color: "#ea580c" }}>
                  <SelectItem value="yes" className="text-orange-600" style={{ color: "#ea580c" }}>Yes</SelectItem>
                  <SelectItem value="no" className="text-orange-600" style={{ color: "#ea580c" }}>No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.insuranceClaimHistory === 'yes' && (
              <div className="space-y-2">
                <Label htmlFor="claimRemarks">Remarks <span className="text-red-500">*</span></Label>
                <Textarea
                  id="claimRemarks"
                  value={formData.claimRemarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, claimRemarks: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                  rows={4}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* OE Details */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">OE Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nameOfOE">Name of OE <span className="text-red-500">*</span></Label>
                <Input
                  id="nameOfOE"
                  value={formData.nameOfOE}
                  onChange={(e) => setFormData(prev => ({ ...prev, nameOfOE: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Date <span className="text-red-500">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.oeDate && !isNaN(formData.oeDate.getTime()) ? format(formData.oeDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.oeDate || undefined}
                      onSelect={(date) => setFormData(prev => ({ ...prev, oeDate: date || null }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number <span className="text-red-500">*</span></Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="place">Place <span className="text-red-500">*</span></Label>
                <Input
                  id="place"
                  value={formData.place}
                  onChange={(e) => setFormData(prev => ({ ...prev, place: e.target.value }))}
                  className="text-orange-600"
                  className="text-orange-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachedFiles">Attach Relevant Files</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                {!isFieldReadOnly('attachedFiles') && (
                  <div className="mt-4">
                    <input
                      type="file"
                      id="fileInput"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <label 
                      htmlFor="fileInput"
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Files
                    </label>
                  </div>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Upload relevant documents, images, or certificates
                </p>
                
                {/* File Count Display */}
                <div className="mt-3 flex items-center justify-center text-sm">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                    {formData.attachedFiles.length} file(s) attached
                  </span>
                </div>
                
                {/* Attached Files List */}
                {formData.attachedFiles.length > 0 && (
                  <div className="mt-4 text-left border border-green-200 rounded-lg p-3 bg-green-50">
                    <p className="text-sm font-semibold text-green-800 mb-3 flex items-center">
                      <Upload className="w-4 h-4 mr-1" />
                      Attached Files ({formData.attachedFiles.length}):
                    </p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {formData.attachedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-green-200 shadow-sm">
                          <span className="text-sm text-gray-700 font-medium truncate mr-2">{file}</span>
                          {!isFieldReadOnly('attachedFiles') && (
                            <button
                              type="button"
                              className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-red-100 transition-colors"
                              onClick={() => {
                                setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                                setFormData(prev => ({
                                  ...prev,
                                  attachedFiles: prev.attachedFiles.filter((_, i) => i !== index)
                                }));
                                toast({
                                  title: "File Removed",
                                  description: `"${file}" removed successfully`,
                                });
                              }}
                              title="Remove file"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remarks */}
        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Remarks</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="remarks">Additional Notes/Comments</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={isFieldReadOnly('remarks') ? undefined : (e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                readOnly={isFieldReadOnly('remarks')}
                className={isFieldReadOnly('remarks') ? "bg-gray-50 text-orange-600" : "text-orange-600"}
                placeholder="Enter any additional remarks, observations, or notes about the warehouse inspection..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Certification */}
        <Card className="border-green-300">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="warehouseFitCertification"
                checked={formData.warehouseFitCertification}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, warehouseFitCertification: !!checked }))}
                className="text-orange-600"
                disabled={isFieldReadOnly('warehouseFitCertification')}
                required
              />
              <Label htmlFor="warehouseFitCertification" className="text-sm">
                We Certify That Warehouse is Fit For Commodity Storage and findings given above are based on inspection and true to the best of our knowledge. <span className="text-red-500">*</span>
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons based on status and mode */}
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onClose} className="action-button">
            Cancel
          </Button>
          
          <div className="flex space-x-4">
            {/* PENDING or editing state */}
            {(formData.status === 'pending' || mode === 'edit') && (
              <Button type="submit" className="bg-green-500 hover:bg-green-600 action-button">
                Proceed to Submit
              </Button>
            )}
            
            {/* SUBMITTED state - initial view */}
            {formData.status === 'submitted' && mode === 'view' && !formData.showActivationButtons && (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 action-button"
                  onClick={() => handleStatusAction('edit')}
                >
                  Edit
                </Button>
                <Button 
                  type="button" 
                  className="bg-orange-500 hover:bg-orange-600 action-button"
                  onClick={() => setFormData(prev => ({ ...prev, showActivationButtons: true }))}
                >
                  Proceed to Activate
                </Button>
              </>
            )}
            
            {/* SUBMITTED state - activation buttons showing */}
            {formData.status === 'submitted' && formData.showActivationButtons && (
              <>
                <Button 
                  type="button" 
                  className="bg-green-500 hover:bg-green-600 action-button"
                  onClick={() => handleStatusAction('activate')}
                >
                  Activate
                </Button>
                <Button 
                  type="button" 
                  variant="destructive"
                  className="action-button"
                  onClick={() => handleStatusAction('reject')}
                >
                  Reject
                </Button>
                <Button 
                  type="button" 
                  className="bg-purple-500 hover:bg-purple-600 action-button"
                  onClick={() => handleStatusAction('resubmit')}
                >
                  Resubmission
                </Button>
              </>
            )}
            
            {/* ACTIVATED state */}
            {formData.status === 'activated' && (
              <Button 
                type="button" 
                className="bg-red-500 hover:bg-red-600 action-button"
                onClick={() => handleStatusAction('close')}
              >
                Close
              </Button>
            )}
            
            {/* RESUBMITTED state */}
            {formData.status === 'resubmitted' && mode === 'view' && (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 action-button"
                  onClick={() => handleStatusAction('edit')}
                >
                  Edit
                </Button>
                <Button 
                  type="button" 
                  className="bg-green-500 hover:bg-green-600 action-button"
                  onClick={() => handleStatusAction('submit')}
                >
                  Submit
                </Button>
              </>
            )}
            
            {/* CLOSED state */}
            {formData.status === 'closed' && (
              <Button 
                type="button" 
                className="bg-blue-500 hover:bg-blue-600 action-button"
                onClick={() => handleStatusAction('reactivate')}
              >
                Reactivate
              </Button>
            )}
            
            {/* REJECTED and REACTIVATE states - read only, no buttons except cancel */}
            {(formData.status === 'rejected' || formData.status === 'reactivate') && (
              <div className="text-sm text-gray-500 px-4 py-2 italic">
                Status: {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
} 