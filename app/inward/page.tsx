"use client";

import DashboardLayout from '@/components/dashboard-layout';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Download, Plus, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/data-table';
import { uploadToCloudinary } from '@/lib/cloudinary';
import React from 'react';

export default function InwardPage() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inwardData, setInwardData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<string[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [insuranceData, setInsuranceData] = useState<any[]>([]);
  const [inwardEntries, setInwardEntries] = useState<any[]>([]);
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);
  const [insuranceEntries, setInsuranceEntries] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [showSRForm, setShowSRForm] = useState(false);
  const [selectedRowForSR, setSelectedRowForSR] = useState<any>(null);
  const [inspectionInsuranceData, setInspectionInsuranceData] = useState<any[]>([]);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [dataVersion, setDataVersion] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileAttachment, setFileAttachment] = useState<File | null>(null);
  const [selectedInsuranceIndex, setSelectedInsuranceIndex] = useState<number | null>(null);
  const [remainingFirePolicy, setRemainingFirePolicy] = useState('');
  const [remainingBurglaryPolicy, setRemainingBurglaryPolicy] = useState('');
  const [hologramNumber, setHologramNumber] = useState('');
  const [isFormApproved, setIsFormApproved] = useState(false);
  const [srGenerationDate, setSrGenerationDate] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  // Add state for initial remaining values from Firestore
  const [initialRemainingFire, setInitialRemainingFire] = useState('');
  const [initialRemainingBurglary, setInitialRemainingBurglary] = useState('');
  // Add state for selected insurance type
  const [selectedInsuranceType, setSelectedInsuranceType] = useState<string>('all');

  // Add state for insurance information section
  const [selectedInsuranceInfoType, setSelectedInsuranceInfoType] = useState<string>('');
  const [selectedInsuranceInfoIndex, setSelectedInsuranceInfoIndex] = useState<number | null>(null);

  // Filter insurance entries based on selected type
  const filteredInsuranceEntries = useMemo(() => {
    if (!selectedInsuranceType || selectedInsuranceType === 'all') {
      return insuranceEntries;
    }
    return insuranceEntries.filter(ins => ins.insuranceTakenBy === selectedInsuranceType);
  }, [insuranceEntries, selectedInsuranceType]);

  // Filter insurance entries for information section based on selected type
  const filteredInsuranceInfoEntries = useMemo(() => {
    if (!selectedInsuranceInfoType) {
      return [];
    }
    return insuranceEntries.filter(ins => ins.insuranceTakenBy === selectedInsuranceInfoType);
  }, [insuranceEntries, selectedInsuranceInfoType]);

  // Function to get receipt type from inspection collection
  const getReceiptTypeFromInspection = async (warehouseName: string): Promise<string> => {
    try {
      console.log('Fetching receipt type for warehouse:', warehouseName);
      
      if (!warehouseName || warehouseName.trim() === '') {
        console.log('No warehouse name provided, returning N/A');
        return 'N/A';
      }

      const inspectionsCollection = collection(db, 'inspections');
      
      // First try exact match
      let q = query(inspectionsCollection, where('warehouseName', '==', warehouseName));
      let querySnapshot = await getDocs(q);
      
      console.log('Exact match query result for warehouse', warehouseName, ':', querySnapshot.size, 'documents found');
      
      // If no exact match, try case-insensitive search by fetching all and filtering
      if (querySnapshot.empty) {
        console.log('No exact match found, trying case-insensitive search...');
        const allInspections = await getDocs(inspectionsCollection);
        console.log('Total inspections in collection:', allInspections.docs.length);
        
        // Log all available warehouse names for debugging
        const allWarehouseNames = allInspections.docs.map(doc => doc.data().warehouseName).filter(Boolean);
        console.log('Available warehouse names in inspections:', allWarehouseNames);
        
        const matchingInspection = allInspections.docs.find(doc => {
          const data = doc.data();
          return data.warehouseName && 
                 data.warehouseName.toLowerCase().trim() === warehouseName.toLowerCase().trim();
        });
        
        if (matchingInspection) {
          const inspectionData = matchingInspection.data();
          console.log('Case-insensitive match found for warehouse', warehouseName, ':', inspectionData);
          console.log('Receipt type found:', inspectionData.receiptType);
          return inspectionData.receiptType || 'N/A';
        }
      } else {
        const inspectionData = querySnapshot.docs[0].data();
        console.log('Exact match found for warehouse', warehouseName, ':', inspectionData);
        console.log('Receipt type found:', inspectionData.receiptType);
        return inspectionData.receiptType || 'N/A';
      }
      
      console.log('No inspection found for warehouse:', warehouseName);
      return 'N/A';
    } catch (error) {
      console.error('Error fetching receipt type for warehouse', warehouseName, ':', error);
      return 'N/A';
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch inward data for the table
      const inwardCollection = collection(db, 'inward');
      const inwardSnap = await getDocs(inwardCollection);
      console.log('Total inward entries found:', inwardSnap.docs.length);
      
      const inwardDataWithReceiptType = await Promise.all(
        inwardSnap.docs.map(async (doc) => {
          const data = doc.data();
          console.log('Processing inward entry:', data.inwardId, 'for warehouse:', data.warehouseName);
          
          // Fetch receipt type from inspection collection
          const receiptType = await getReceiptTypeFromInspection(data.warehouseName);
          console.log('Receipt type for inward', data.inwardId, ':', receiptType);
          
          return { ...data, id: doc.id, receiptType };
        })
      );
      
      console.log('Final inward data with receipt types:', inwardDataWithReceiptType);
      setInwardData(inwardDataWithReceiptType);

      // States from branches
      const branchSnap = await getDocs(collection(db, 'branches'));
      const branchArr = branchSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBranches(branchArr);
      setStates(Array.from(new Set(branchArr.map((b: any) => b.state))));
      
      // Clients
      const clientSnap = await getDocs(collection(db, 'clients'));
      setClients(clientSnap.docs.map(doc => doc.data()));
      
      // Warehouses from inspections - ensure unique warehouses
      const inspectionsSnap = await getDocs(collection(db, 'inspections'));
      const warehouseMap = new Map();
      inspectionsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.warehouseName && data.status === 'activated') {
          // Use warehouse name as key to ensure uniqueness
          if (!warehouseMap.has(data.warehouseName)) {
            // Extract insurance data from the inspection
            let insuranceEntries: any[] = [];
            
            // Check multiple possible locations for insurance data
            if (data.insuranceEntries && Array.isArray(data.insuranceEntries)) {
              console.log('Found top-level insurance entries for warehouse:', data.warehouseName, data.insuranceEntries.length);
              insuranceEntries = data.insuranceEntries;
            } else if (data.warehouseInspectionData?.insuranceEntries && Array.isArray(data.warehouseInspectionData.insuranceEntries)) {
              console.log('Found nested insurance entries for warehouse:', data.warehouseName, data.warehouseInspectionData.insuranceEntries.length);
              insuranceEntries = data.warehouseInspectionData.insuranceEntries;
            } else if (data.warehouseInspectionData) {
              // Legacy format - convert to new format
              const legacyData = data.warehouseInspectionData;
              if (legacyData.firePolicyNumber || legacyData.burglaryPolicyNumber) {
                console.log('Found legacy insurance format for warehouse:', data.warehouseName);
                insuranceEntries = [{
                  id: `legacy_${Date.now()}`,
                  insuranceTakenBy: legacyData.insuranceTakenBy || '',
                  insuranceCommodity: legacyData.insuranceCommodity || '',
                  clientName: legacyData.clientName || '',
                  clientAddress: legacyData.clientAddress || '',
                  selectedBankName: legacyData.selectedBankName || '',
                  firePolicyCompanyName: legacyData.firePolicyCompanyName || '',
                  firePolicyNumber: legacyData.firePolicyNumber || '',
                  firePolicyAmount: legacyData.firePolicyAmount || '',
                  firePolicyStartDate: legacyData.firePolicyStartDate || null,
                  firePolicyEndDate: legacyData.firePolicyEndDate || null,
                  burglaryPolicyCompanyName: legacyData.burglaryPolicyCompanyName || '',
                  burglaryPolicyNumber: legacyData.burglaryPolicyNumber || '',
                  burglaryPolicyAmount: legacyData.burglaryPolicyAmount || '',
                  burglaryPolicyStartDate: legacyData.burglaryPolicyStartDate || null,
                  burglaryPolicyEndDate: legacyData.burglaryPolicyEndDate || null,
                  createdAt: new Date(legacyData.createdAt || Date.now())
                }];
              }
            }
            
            // Store warehouse data with insurance entries
            warehouseMap.set(data.warehouseName, {
              ...data,
              insuranceEntries: insuranceEntries
            });
          }
        }
      });
      setWarehouses(Array.from(warehouseMap.values()));
      console.log('Warehouses loaded with insurance data:', Array.from(warehouseMap.values()));
      
      // Reservations
      const reservationSnap = await getDocs(collection(db, 'reservation'));
      setReservations(reservationSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      // Commodities
      const commoditySnap = await getDocs(collection(db, 'commodities'));
      setCommodities(commoditySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      // Banks
      const bankSnap = await getDocs(collection(db, 'banks'));
      setBanks(bankSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      // Insurance data
      const insuranceSnap = await getDocs(collection(db, 'insurance'));
      setInsuranceData(insuranceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Form state
  const [baseForm, setBaseForm] = useState({
    state: '',
    branch: '',
    location: '',
    warehouseName: '',
    warehouseCode: '',
    warehouseAddress: '',
    businessType: '',
    client: '',
    clientCode: '',
    clientAddress: '',
    dateOfInward: '',
    cadNumber: '',
    attachmentUrl: '',
    commodity: '',
    varietyName: '',
    marketRate: '',
    totalBags: '',
    totalQuantity: '',
    totalValue: '',
    bankName: '',
    bankBranch: '',
    bankState: '',
    ifscCode: '',
    bankReceipt: '',
    billingStatus: '',
    reservationRate: '',
    reservationQty: '',
    reservationStart: '',
    reservationEnd: '',
    billingCycle: '',
    billingType: '',
    billingRate: '',
    insuranceManagedBy: '',
    firePolicyNumber: '',
    firePolicyAmount: '',
    firePolicyStart: '',
    firePolicyEnd: '',
    burglaryPolicyNumber: '',
    burglaryPolicyAmount: '',
    burglaryPolicyStart: '',
    burglaryPolicyEnd: '',
    firePolicyCompanyName: '',
    burglaryPolicyCompanyName: '',
    firePolicyBalance: '',
    burglaryPolicyBalance: '',
    bankFundedBy: '',
  });

  // Current entry form (for inward entry details)
  const [currentEntryForm, setCurrentEntryForm] = useState({
    vehicleNumber: '',
    getpassNumber: '',
    weightBridge: '',
    weightBridgeSlipNumber: '',
    grossWeight: '',
    tareWeight: '',
    netWeight: '',
    averageWeight: '',
    totalBags: '',
    totalQuantity: '',
    dateOfSampling: '',
    dateOfTesting: '',
    labResults: [] as string[],
    labResultsValidation: [] as boolean[],
    stacks: [
      {
        stackNumber: '',
        numberOfBags: ''
      }
    ],
  });

  // Combined form for display
  const form = { ...baseForm, ...currentEntryForm, totalValue: baseForm.totalValue };

  // Calculate insurance balance amounts
  useEffect(() => {
    const fireAmount = parseFloat(baseForm.firePolicyAmount) || 0;
    const burglaryAmount = parseFloat(baseForm.burglaryPolicyAmount) || 0;
    const totalValue = parseFloat(baseForm.totalValue) || 0;

    const fireBalance = fireAmount - totalValue;
    const burglaryBalance = burglaryAmount - totalValue;

    setBaseForm(f => ({
      ...f,
      firePolicyBalance: fireBalance >= 0 ? fireBalance.toFixed(2) : '0.00',
      burglaryPolicyBalance: burglaryBalance >= 0 ? burglaryBalance.toFixed(2) : '0.00',
    }));
  }, [baseForm.firePolicyAmount, baseForm.burglaryPolicyAmount, baseForm.totalValue]);

  // Auto-calculate total bags and quantity from all entries (saved and current)
  useEffect(() => {
    // Sum from already saved entries
    const savedBagsSum = inwardEntries.reduce((sum, entry) => sum + (parseInt(entry.totalBags, 10) || 0), 0);
    const savedQuantitySum = inwardEntries.reduce((sum, entry) => sum + (parseFloat(entry.totalQuantity) || 0), 0);

    // Get values from the current, unsaved entry form
    const currentBags = parseInt(currentEntryForm.totalBags, 10) || 0;
    const currentQuantity = parseFloat(currentEntryForm.totalQuantity) || 0;

    // Calculate the grand total
    const totalBagsSum = savedBagsSum + currentBags;
    const totalQuantitySum = savedQuantitySum + currentQuantity;

    setBaseForm(f => ({
      ...f,
      totalBags: totalBagsSum > 0 ? totalBagsSum.toString() : '',
      totalQuantity: totalQuantitySum > 0 ? totalQuantitySum.toFixed(3) : '',
    }));
  }, [inwardEntries, currentEntryForm.totalBags, currentEntryForm.totalQuantity]);

  // Fetch all data on mount
  useEffect(() => {
    fetchData();
  }, [dataVersion]);

  // Filter branches by state
  const filteredBranches = branches.filter((b: any) => b.state === form.state);
  // Filter locations by branch
  const filteredLocations = filteredBranches.find((b: any) => b.branch === form.branch)?.locations || [];
  // Filter warehouses by location - ensure unique warehouses
  const filteredWarehouses = useMemo(() => {
    const fw = warehouses.filter((w: any) => 
      w.location?.trim().toLowerCase() === form.location.trim().toLowerCase()
    );
    console.log('Filtered Warehouses:', fw, 'Form:', form);
    return fw;
  }, [warehouses, form.location]);

  // Auto-fill warehouse code/address and business type
  useEffect(() => {
    if (form.warehouseName) {
      const wh = filteredWarehouses.find((w: any) => w.warehouseName === form.warehouseName);
      if (wh) {
        // Prefer address from warehouseInspectionData if available
        const address = wh.warehouseInspectionData?.address || wh.warehouseAddress || '';
        setBaseForm(f => ({ 
          ...f, 
          warehouseCode: wh.warehouseCode || '', 
          warehouseAddress: address,
          businessType: wh.businessType || ''
        }));
        
        // Fetch reservation data for this warehouse
        const warehouseReservation = reservations.find((r: any) => 
          r.warehouse === form.warehouseName && 
          r.state === form.state && 
          r.branch === form.branch && 
          r.location === form.location
        );
        
        if (warehouseReservation) {
          setBaseForm(f => ({
            ...f,
            billingStatus: warehouseReservation.billingStatus || '',
            reservationRate: warehouseReservation.reservationRate || '',
            reservationQty: warehouseReservation.reservationQty || '',
            reservationStart: warehouseReservation.reservationStart || '',
            reservationEnd: warehouseReservation.reservationEnd || '',
            billingCycle: warehouseReservation.billingCycle || '',
            billingType: warehouseReservation.billingType || '',
            billingRate: warehouseReservation.billingRate || '',
          }));
        } else {
          // Clear reservation fields if no reservation found
          setBaseForm(f => ({
            ...f,
            billingStatus: '',
            reservationRate: '',
            reservationQty: '',
            reservationStart: '',
            reservationEnd: '',
            billingCycle: '',
            billingType: '',
            billingRate: '',
          }));
        }
      } else {
        // Clear all warehouse-related fields if warehouse not found
        setBaseForm(f => ({ 
          ...f, 
          warehouseCode: '', 
          warehouseAddress: '', 
          businessType: '',
          billingStatus: '',
          reservationRate: '',
          reservationQty: '',
          reservationStart: '',
          reservationEnd: '',
          billingCycle: '',
          billingType: '',
          billingRate: '',
        }));
      }
    } else {
      setBaseForm(f => ({ 
        ...f, 
        warehouseCode: '', 
        warehouseAddress: '', 
        businessType: '',
        billingStatus: '',
        reservationRate: '',
        reservationQty: '',
        reservationStart: '',
        reservationEnd: '',
        billingCycle: '',
        billingType: '',
        billingRate: '',
      }));
    }
    // eslint-disable-next-line
  }, [form.warehouseName, reservations]);

  // Auto-fill client ID and address
  useEffect(() => {
    if (form.client) {
      const selectedClient = clients.find(c => c.firmName === form.client);
      if (selectedClient) {
        setBaseForm(f => ({ 
          ...f, 
          clientCode: selectedClient.clientId,
          clientAddress: selectedClient.companyAddress || ''
        }));
      }
    } else {
      setBaseForm(f => ({ 
        ...f, 
        clientCode: '',
        clientAddress: ''
      }));
    }
  }, [form.client, clients]);

  const getBusinessTypeLabel = (type: string) => {
    switch (type) {
      case 'cm': return 'Collateral Management (CM)';
      case 'pwh': return 'Professional Warehousing (PWH)';
      case 'ncdex': return 'NCDEX';
      default: return type;
    }
  };

  // Get varieties for selected commodity
  const getCommodityVarieties = (commodityName: string) => {
    const commodity = commodities.find((c: any) => c.commodityName === commodityName);
    return commodity?.varieties || [];
  };

  // Get bank details for selected bank
  const getBankDetails = (bankName: string) => {
    const bank = banks.find((b: any) => b.bankName === bankName);
    return bank || null;
  };

  // Handle commodity selection
  const handleCommodityChange = (commodityName: string) => {
    const selectedCommodity = commodities.find((c: any) => c.commodityName === commodityName);
    console.log('Selected commodity:', selectedCommodity);
    console.log('Commodity rate:', selectedCommodity?.rate);
    
    setBaseForm(f => ({ 
      ...f, 
      commodity: commodityName,
      varietyName: '',
      marketRate: selectedCommodity?.rate ? selectedCommodity.rate.toString() : ''
    }));
    
    // Fetch insurance data based on current selections
    fetchInsuranceData(commodityName);
  };

  // Fetch insurance data based on selected criteria
  const fetchInsuranceData = (commodityName: string) => {
    if (!form.state || !form.branch || !form.location || !form.warehouseName || !commodityName) {
      return;
    }

    // Find matching insurance entries from the inspection module
    const matchingInsuranceEntries = insuranceEntries.filter((insurance: any) => 
      insurance.insuranceCommodity === commodityName
    );

    if (matchingInsuranceEntries.length > 0) {
      // Use the first matching insurance entry for backward compatibility
      const firstInsurance = matchingInsuranceEntries[0];
      setBaseForm(f => ({
        ...f,
        insuranceManagedBy: firstInsurance.insuranceTakenBy || '',
        firePolicyNumber: firstInsurance.firePolicyNumber || '',
        firePolicyAmount: firstInsurance.firePolicyAmount || '',
        firePolicyStart: firstInsurance.firePolicyStartDate || '',
        firePolicyEnd: firstInsurance.firePolicyEndDate || '',
        burglaryPolicyNumber: firstInsurance.burglaryPolicyNumber || '',
        burglaryPolicyAmount: firstInsurance.burglaryPolicyAmount || '',
        burglaryPolicyStart: firstInsurance.burglaryPolicyStartDate || '',
        burglaryPolicyEnd: firstInsurance.burglaryPolicyEndDate || '',
        firePolicyCompanyName: firstInsurance.firePolicyCompanyName || '',
        burglaryPolicyCompanyName: firstInsurance.burglaryPolicyCompanyName || '',
        bankFundedBy: firstInsurance.selectedBankName || '',
      }));
    } else {
      // Clear insurance fields if no matching insurance found
      setBaseForm(f => ({
        ...f,
        insuranceManagedBy: '',
        firePolicyNumber: '',
        firePolicyAmount: '',
        firePolicyStart: '',
        firePolicyEnd: '',
        burglaryPolicyNumber: '',
        burglaryPolicyAmount: '',
        burglaryPolicyStart: '',
        burglaryPolicyEnd: '',
        firePolicyCompanyName: '',
        burglaryPolicyCompanyName: '',
        bankFundedBy: '',
      }));
    }
  };

  // Handle variety selection
  const handleVarietyChange = (varietyName: string) => {
    const commodity = commodities.find((c: any) => c.commodityName === form.commodity);
    const variety = commodity?.varieties?.find((v: any) => v.varietyName === varietyName);
    
    setBaseForm(f => ({ 
      ...f, 
      varietyName: varietyName,
      // Keep existing marketRate if already set from commodity, otherwise use variety rate
      marketRate: f.marketRate || (variety?.rate ? `${variety.rate} ` : '')
    }));

    const particulars = variety?.particulars || [];
    setCurrentEntryForm(f => ({
      ...f,
      labResults: Array(particulars.length).fill(''),
      labResultsValidation: Array(particulars.length).fill(true)
    }));
  };

  // Handle bank selection
  const handleBankChange = (bankName: string) => {
    const bank = banks.find((b: any) => b.bankName === bankName);
    
    if (bank) {
      setBaseForm(f => ({ 
        ...f, 
        bankName: bankName,
        bankBranch: bank.locations?.[0]?.branchName || '',
        bankState: bank.state || '',
        ifscCode: bank.locations?.[0]?.ifscCode || ''
      }));
    } else {
      setBaseForm(f => ({ 
        ...f, 
        bankName: bankName,
        bankBranch: '',
        bankState: '',
        ifscCode: ''
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select a JPG, PNG, PDF, or Excel file.",
          variant: "destructive",
        });
        setFileAttachment(null);
        e.target.value = ''; // Clear the input
      } else {
        setFileAttachment(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fileAttachment && !isEditMode) {
      alert('Please attach a file.');
      return;
    }

    // Base form validations
    const missingBaseFields = [];
    if (!form.state) missingBaseFields.push('State');
    if (!form.branch) missingBaseFields.push('Branch');
    if (!form.location) missingBaseFields.push('Location');
    if (!form.warehouseName) missingBaseFields.push('Warehouse Name');
    if (!form.client) missingBaseFields.push('Client Name');
    if (!form.dateOfInward) missingBaseFields.push('Date of Inward');
    if (!form.cadNumber) missingBaseFields.push('CAD Number');
    if (!form.commodity) missingBaseFields.push('Commodity');
    if (!form.varietyName) missingBaseFields.push('Variety Name');
    if (!form.marketRate) missingBaseFields.push('Market Rate');
    if (!baseForm.totalBags) missingBaseFields.push('Total Bags (in Commodity Info)');
    if (!baseForm.totalQuantity) missingBaseFields.push('Total Quantity (in Commodity Info)');

    if (missingBaseFields.length > 0) {
      alert(`Please fill in the following required base fields:\n\n${missingBaseFields.join('\n')}`);
      return;
    }
    
    setIsUploading(true);
    let uploadedFileUrl = '';
    
    try {
      if (fileAttachment) {
        const uploadResult = await uploadToCloudinary(fileAttachment);
        uploadedFileUrl = uploadResult.secure_url;
      } else if (isEditMode && editingRow) {
        uploadedFileUrl = editingRow.attachmentUrl || '';
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('File upload failed. Please try again.');
      setIsUploading(false);
      return;
    }
    setIsUploading(false);

    let allEntries = [...inwardEntries];
    if (currentEntryForm.vehicleNumber || currentEntryForm.getpassNumber) {
      allEntries.push({ id: Date.now(), ...baseForm, ...currentEntryForm, entryNumber: inwardEntries.length + 1 });
    }
    
    if (allEntries.length === 0 && !isEditMode) {
      alert('Please add at least one inward entry before saving.');
      return;
    }

    // For edit mode, use the current form data
    if (isEditMode) {
      allEntries = [{ id: Date.now(), ...baseForm, ...currentEntryForm, entryNumber: 1 }];
    }

    // Final validation loop for all entries
    for (const entry of allEntries) {
      const missingFields = [];
      if (!entry.vehicleNumber) missingFields.push('Vehicle Number');
      if (!entry.getpassNumber) missingFields.push('Gatepass Number');
      if (!entry.totalBags) missingFields.push('Total Bags (in Inward Entry)');
      
      if (missingFields.length > 0) {
        alert(`Validation Error in Entry #${entry.entryNumber}:\nPlease fill in these fields: ${missingFields.join(', ')}`);
        return;
      }

      const stackBagsSum = (entry.stacks || []).reduce((sum: number, stack: { numberOfBags: string }) => sum + (parseInt(stack.numberOfBags) || 0), 0);
      const totalBags = parseInt(entry.totalBags) || 0;

      if (stackBagsSum !== totalBags) {
        alert(`Validation Error in Entry #${entry.entryNumber}:\nTotal Bags (${totalBags}) does not match the sum of bags in stacks (${stackBagsSum}).`);
        return;
      }
    }

    // Save to Firebase
    try {
      const inwardCollection = collection(db, 'inward');
      
      if (isEditMode && editingRow) {
        // Update existing document
        const q = query(inwardCollection, where('inwardId', '==', editingRow.inwardId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docRef = doc(db, 'inward', querySnapshot.docs[0].id);
          const { id, labResultsValidation, ...entryData } = allEntries[0]; // remove client-side id and validation state

          // Replace empty string fields with a hyphen
          const sanitizedData = Object.fromEntries(
            Object.entries(entryData).map(([key, value]) => [
              key,
              typeof value === 'string' && value === '' ? '-' : value,
            ])
          );

          await updateDoc(docRef, {
            ...sanitizedData,
            attachmentUrl: uploadedFileUrl,
            updatedAt: new Date().toISOString(),
            labResults: allEntries[0].labResults || [],
          });
          
          toast({
            title: "Success",
            description: "Inward entry updated successfully.",
            variant: "default",
          });
        }
      } else {
        // Create new documents
        for (const entry of allEntries) {
          const inwardId = await generateInwardId();
          const { id, labResultsValidation, ...entryData } = entry; // remove client-side id and validation state

          // Replace empty string fields with a hyphen
          const sanitizedData = Object.fromEntries(
            Object.entries(entryData).map(([key, value]) => [
              key,
              typeof value === 'string' && value === '' ? '-' : value,
            ])
          );

          await addDoc(inwardCollection, {
            ...sanitizedData,
            attachmentUrl: uploadedFileUrl,
            inwardId,
            createdAt: new Date().toISOString(),
            labResults: entry.labResults || [],
          });
        }
        
        toast({
          title: "Success",
          description: `Successfully saved ${allEntries.length} inward entries.`,
          variant: "default",
        });
      }
      
      handleModalClose();
      setDataVersion(v => v + 1);
    } catch (error) {
      console.error('Error saving inward entries to Firebase:', error);
      toast({
        title: "Error",
        description: "Error saving inward entries to Firebase. Please try again.",
        variant: "destructive",
      });
    }

    // After saving inward entry, update inspection insurance entry
    if (selectedInsuranceIndex !== null) {
      const ins = insuranceEntries[selectedInsuranceIndex];
      const newRemainingFire = (parseFloat(initialRemainingFire) - parseFloat(baseForm.totalValue || '0')).toFixed(2);
      const newRemainingBurglary = (parseFloat(initialRemainingBurglary) - parseFloat(baseForm.totalValue || '0')).toFixed(2);
      // Update Firestore
      const inspectionsCollection = collection(db, 'inspections');
      const q = query(inspectionsCollection, where('warehouseName', '==', form.warehouseName));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRef = doc(db, 'inspections', querySnapshot.docs[0].id);
        const inspectionData = querySnapshot.docs[0].data();
        let insuranceList = inspectionData.insuranceEntries || [];
        if (!Array.isArray(insuranceList) && inspectionData.warehouseInspectionData?.insuranceEntries) {
          insuranceList = inspectionData.warehouseInspectionData.insuranceEntries;
        }
        const updatedList = insuranceList.map((i: any) => {
          if (i.firePolicyNumber === ins.firePolicyNumber && i.burglaryPolicyNumber === ins.burglaryPolicyNumber) {
            return {
              ...i,
              remainingFirePolicyAmount: newRemainingFire,
              remainingBurglaryPolicyAmount: newRemainingBurglary,
            };
          }
          return i;
        });
        await updateDoc(docRef, { insuranceEntries: updatedList });
      }
    }

    // Also update if insurance is selected in information section
    if (selectedInsuranceInfoIndex !== null) {
      const ins = filteredInsuranceInfoEntries[selectedInsuranceInfoIndex];
      // Use the already calculated remaining amounts from state
      const newRemainingFire = remainingFirePolicy;
      const newRemainingBurglary = remainingBurglaryPolicy;
      // Update Firestore
      const inspectionsCollection = collection(db, 'inspections');
      const q = query(inspectionsCollection, where('warehouseName', '==', form.warehouseName));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRef = doc(db, 'inspections', querySnapshot.docs[0].id);
        const inspectionData = querySnapshot.docs[0].data();
        let insuranceList = inspectionData.insuranceEntries || [];
        if (!Array.isArray(insuranceList) && inspectionData.warehouseInspectionData?.insuranceEntries) {
          insuranceList = inspectionData.warehouseInspectionData.insuranceEntries;
        }
        const updatedList = insuranceList.map((i: any) => {
          if (i.firePolicyNumber === ins.firePolicyNumber && i.burglaryPolicyNumber === ins.burglaryPolicyNumber) {
            return {
              ...i,
              remainingFirePolicyAmount: newRemainingFire,
              remainingBurglaryPolicyAmount: newRemainingBurglary,
            };
          }
          return i;
        });
        await updateDoc(docRef, { insuranceEntries: updatedList });
      }
    }
  };

  const resetForm = () => {
    setBaseForm({
      state: '',
      branch: '',
      location: '',
      warehouseName: '',
      warehouseCode: '',
      warehouseAddress: '',
      businessType: '',
      client: '',
      clientCode: '',
      clientAddress: '',
      dateOfInward: '',
      cadNumber: '',
      attachmentUrl: '',
      commodity: '',
      varietyName: '',
      marketRate: '',
      totalBags: '',
      totalQuantity: '',
      totalValue: '',
      bankName: '',
      bankBranch: '',
      bankState: '',
      ifscCode: '',
      bankReceipt: '',
      billingStatus: '',
      reservationRate: '',
      reservationQty: '',
      reservationStart: '',
      reservationEnd: '',
      billingCycle: '',
      billingType: '',
      billingRate: '',
      insuranceManagedBy: '',
      firePolicyNumber: '',
      firePolicyAmount: '',
      firePolicyStart: '',
      firePolicyEnd: '',
      burglaryPolicyNumber: '',
      burglaryPolicyAmount: '',
      burglaryPolicyStart: '',
      burglaryPolicyEnd: '',
      firePolicyCompanyName: '',
      burglaryPolicyCompanyName: '',
      firePolicyBalance: '',
      burglaryPolicyBalance: '',
      bankFundedBy: '',
    });
    
    setCurrentEntryForm({
      vehicleNumber: '',
      getpassNumber: '',
      weightBridge: '',
      weightBridgeSlipNumber: '',
      grossWeight: '',
      tareWeight: '',
      netWeight: '',
      averageWeight: '',
      totalBags: '',
      totalQuantity: '',
      dateOfSampling: '',
      dateOfTesting: '',
      labResults: [],
      labResultsValidation: [],
      stacks: [
        {
          stackNumber: '',
          numberOfBags: ''
        }
      ],
    });
    setFileAttachment(null);
    setSelectedInsuranceType('all');
    setSelectedInsuranceIndex(null);
    setSelectedInsuranceInfoType('');
    setSelectedInsuranceInfoIndex(null);
    setRemainingFirePolicy('');
    setRemainingBurglaryPolicy('');
    setInitialRemainingFire('');
    setInitialRemainingBurglary('');
    setInsuranceEntries([]);
    setInwardEntries([]);
    setCurrentEntryIndex(0);
    setIsUploading(false);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setIsEditMode(false);
    setEditingRow(null);
    resetForm();
  };

  // Calculate net weight when gross or tare weight changes
  const calculateNetWeight = (gross: string, tare: string) => {
    const grossNum = parseFloat(gross) || 0;
    const tareNum = parseFloat(tare) || 0;
    const net = grossNum - tareNum;
    return net >= 0 ? net.toFixed(3) : '0.000';
  };

  // Auto-calculate Average Weight for the current inward entry
  useEffect(() => {
    const netWeight = parseFloat(currentEntryForm.netWeight) || 0;
    const totalBags = parseInt(currentEntryForm.totalBags, 10) || 0;

    if (netWeight > 0 && totalBags > 0) {
      const avgWeight = (netWeight / totalBags) * 1000; // Convert MT/bag to Kg/bag
      setCurrentEntryForm(f => ({ ...f, averageWeight: avgWeight.toFixed(2) }));
    } else {
      setCurrentEntryForm(f => ({ ...f, averageWeight: '' }));
    }
  }, [currentEntryForm.netWeight, currentEntryForm.totalBags]);

  // Handle gross weight change
  const handleGrossWeightChange = (value: string) => {
    setCurrentEntryForm(f => ({
      ...f,
      grossWeight: value,
      netWeight: calculateNetWeight(value, f.tareWeight)
    }));
  };

  // Handle tare weight change
  const handleTareWeightChange = (value: string) => {
    setCurrentEntryForm(f => ({
      ...f,
      tareWeight: value,
      netWeight: calculateNetWeight(f.grossWeight, value)
    }));
  };

  // Handle net weight change (for manual updates)
  const handleNetWeightChange = (value: string) => {
    setCurrentEntryForm(f => ({
      ...f,
      netWeight: value,
      averageWeight: calculateAverageWeight(value, f.totalBags)
    }));
  };

  // Add new stack
  const addStack = () => {
    setCurrentEntryForm(f => ({
      ...f,
      stacks: [...f.stacks, { stackNumber: '', numberOfBags: '' }]
    }));
  };

  // Update stack
  const updateStack = (index: number, field: string, value: string) => {
    setCurrentEntryForm(f => ({
      ...f,
      stacks: f.stacks.map((stack, i) => 
        i === index ? { ...stack, [field]: value } : stack
      )
    }));
  };

  // Remove stack
  const removeStack = (index: number) => {
    setCurrentEntryForm(f => ({
      ...f,
      stacks: f.stacks.filter((_, i) => i !== index)
    }));
  };

  // Calculate total bags from stacks
  const calculateTotalBagsFromStacks = () => {
    return currentEntryForm.stacks.reduce((total: number, stack: { numberOfBags: string }) => {
      return total + (parseInt(stack.numberOfBags) || 0);
    }, 0);
  };

  // Validate stack bags match total bags
  const validateStackBags = () => {
    const stackTotal = calculateTotalBagsFromStacks();
    return stackTotal === (parseInt(currentEntryForm.totalBags) || 0);
  };

  // Add new inward entry
  const addNewInwardEntry = () => {
    if (!validateStackBags()) {
      alert('Total bags must equal the sum of all stack bags. Please check your entries.');
      return;
    }
    
    // Validate required fields for current entry and collect missing fields
    const missingFields = [];
    if (!currentEntryForm.vehicleNumber) missingFields.push('Vehicle Number');
    if (!currentEntryForm.getpassNumber) missingFields.push('Gatepass Number');
    if (!currentEntryForm.weightBridge) missingFields.push('Weight Bridge');
    if (!currentEntryForm.weightBridgeSlipNumber) missingFields.push('Weight Bridge Slip Number');
    if (!currentEntryForm.grossWeight) missingFields.push('Gross Weight');
    if (!currentEntryForm.tareWeight) missingFields.push('Tare Weight');

    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields:\n\n${missingFields.join('\n')}`);
      return;
    }

    // Validate getpass number uniqueness
    const isGetpassDuplicate = inwardEntries.some(entry => 
      entry.getpassNumber === currentEntryForm.getpassNumber
    );
    
    if (isGetpassDuplicate) {
      alert('Gatepass number must be unique. This gatepass number has already been used in a previous entry.');
      return;
    }

    // Validate stack entries
    const missingStackFields = [];
    for (let i = 0; i < currentEntryForm.stacks.length; i++) {
      const stack = currentEntryForm.stacks[i];
      if (!stack.stackNumber) missingStackFields.push(`Stack ${i + 1} - Stack Number`);
      if (!stack.numberOfBags) missingStackFields.push(`Stack ${i + 1} - Number of Bags`);
    }
    
    if (missingStackFields.length > 0) {
      alert(`Please fill in the following stack fields:\n\n${missingStackFields.join('\n')}`);
      return;
    }
    
    // Save current entry to inwardEntries array
    const newEntry = {
      id: Date.now(),
      ...baseForm,
      ...currentEntryForm,
      entryNumber: inwardEntries.length + 1
    };

    const updatedEntries = [...inwardEntries, newEntry];
    setInwardEntries(updatedEntries);
    
    // Reset only the current entry form for new entry
    setCurrentEntryForm({
      vehicleNumber: '',
      getpassNumber: '',
      weightBridge: '',
      weightBridgeSlipNumber: '',
      grossWeight: '',
      tareWeight: '',
      netWeight: '',
      averageWeight: '',
      totalBags: '',
      totalQuantity: '',
      dateOfSampling: '',
      dateOfTesting: '',
      labResults: [],
      labResultsValidation: [],
      stacks: [
        {
          stackNumber: '',
          numberOfBags: ''
        }
      ],
    });
    
    alert(`Entry ${newEntry.entryNumber} saved successfully! New entry form ready.`);
  };

  // Auto-calculate Total Value
  useEffect(() => {
    if (baseForm.totalQuantity && baseForm.marketRate) {
      const totalValue = (parseFloat(baseForm.totalQuantity) * parseFloat(baseForm.marketRate)).toFixed(2);
      setBaseForm(f => ({ ...f, totalValue }));
    } else {
      setBaseForm(f => ({ ...f, totalValue: '' }));
    }
  }, [baseForm.totalQuantity, baseForm.marketRate]);

  const calculateAverageWeight = (netWeight: string, totalBags: string) => {
    const net = parseFloat(netWeight) || 0;
    const bags = parseInt(totalBags) || 0;
    if (bags > 0) {
      return ((net / bags) * 1000).toFixed(2);
    }
    return '0.00';
  };

  const columns = [
    { accessorKey: "inwardId", header: "Inward Code" },
    { accessorKey: "dateOfInward", header: "Date of Inward" },
    { accessorKey: "state", header: "State" },
    { accessorKey: "branch", header: "Branch" },
    { accessorKey: "location", header: "Location" },
    { accessorKey: "warehouseName", header: "Warehouse Name" },
    { accessorKey: "warehouseCode", header: "Warehouse Code" },
    { accessorKey: "warehouseAddress", header: "Warehouse Address" },
    { accessorKey: "receiptType", header: "Receipt Type" },
    { accessorKey: "client", header: "Client" },
    { accessorKey: "clientCode", header: "Client Code" },
    { accessorKey: "clientAddress", header: "Client Address" },
    { accessorKey: "commodity", header: "Commodity" },
    { accessorKey: "varietyName", header: "Variety" },
    { accessorKey: "totalBags", header: "Total Bags" },
    { accessorKey: "totalQuantity", header: "Total Quantity (MT)" },
    { accessorKey: "marketRate", header: "Market Rate" },
    { accessorKey: "totalValue", header: "Total Value" },
    { accessorKey: "grossWeight", header: "Gross Weight" },
    { accessorKey: "tareWeight", header: "Tare Weight" },
    { accessorKey: "netWeight", header: "Net Weight" },
    { accessorKey: "averageWeight", header: "Avg. Weight" },
    { accessorKey: "vehicleNumber", header: "Vehicle No." },
    { accessorKey: "getpassNumber", header: "Gatepass No." },
    { accessorKey: "weightBridge", header: "Weight Bridge" },
    { accessorKey: "weightBridgeSlipNumber", header: "Slip No." },
    { accessorKey: "cadNumber", header: "CAD Number" },
    { accessorKey: "entryNumber", header: "Entry No." },
    { 
      accessorKey: "stacks",
      header: "Stack No(s)",
      cell: ({ row }: any) => {
        const stacks = row.original.stacks;
        return Array.isArray(stacks) ? stacks.map((s: any) => s.stackNumber).join(', ') : '';
      }
    },
    // Lab details
    { accessorKey: "dateOfSampling", header: "Sampling Date" },
    { accessorKey: "dateOfTesting", header: "Testing Date" },
    { 
      accessorKey: "labResults",
      header: "Lab Results (%)",
      cell: ({ row }: any) => {
        const results = row.original.labResults;
        return Array.isArray(results) ? results.join(', ') : '';
      }
    },
    // Business and Billing
    { accessorKey: "businessType", header: "Business Type" },
    { accessorKey: "billingStatus", header: "Billing Status" },
    { accessorKey: "billingCycle", header: "Billing Cycle" },
    { accessorKey: "billingType", header: "Billing Type" },
    { accessorKey: "billingRate", header: "Billing Rate" },
    { accessorKey: "reservationRate", header: "Reservation Rate" },
    { accessorKey: "reservationQty", header: "Reservation Qty" },
    { accessorKey: "reservationStart", header: "Reservation Start" },
    { accessorKey: "reservationEnd", header: "Reservation End" },
    // Bank details
    { accessorKey: "bankName", header: "Bank Name" },
    { accessorKey: "bankBranch", header: "Bank Branch" },
    { accessorKey: "bankState", header: "Bank State" },
    { accessorKey: "ifscCode", header: "IFSC Code" },
    { accessorKey: "bankReceipt", header: "Base Receipt" },
    // Insurance details
    { accessorKey: "insuranceManagedBy", header: "Insurance Managed By" },
    { accessorKey: "bankFundedBy", header: "Bank Funded By" },
    // Action column
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex space-x-2">
          <Button
            onClick={() => handleViewSR(row.original)}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => handleEdit(row.original)}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => handleDelete(row.original)}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    
    // Sort data by Inward ID
    const sortedData = [...inwardData].sort((a, b) => {
      const idA = parseInt(a.inwardId?.split('-')[1] || '0', 10);
      const idB = parseInt(b.inwardId?.split('-')[1] || '0', 10);
      return idA - idB;
    });

    if (!term) return sortedData;

    return sortedData.filter((item: any) => {
      const lowerCaseSearchTerm = term.toLowerCase();
      return (
        item.state?.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.branch?.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.location?.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.warehouseName?.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.client?.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.receiptType?.toLowerCase().includes(lowerCaseSearchTerm)
      );
    });
  }, [searchTerm, inwardData]);

  const handleExportCSV = () => {
    const dataToExport = filteredData;
    if (dataToExport.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There is no data available to export.",
        variant: "destructive",
      });
      return;
    }
  
    const getCellContent = (row: any, column: any): string => {
      const { accessorKey } = column;
      const value = row[accessorKey];
  
      if (accessorKey === 'stacks' && Array.isArray(value)) {
        return value.map((s: any) => s.stackNumber).join(', ');
      }
      if (accessorKey === 'labResults' && Array.isArray(value)) {
        return value.join(', ');
      }
      return value ?? '';
    };
  
    const csvHeaders = columns.map(c => (typeof c.header === 'string' ? c.header : c.accessorKey) || '').join(',');
    const csvRows = dataToExport
      .map(row =>
        columns
          .map(col => {
            const cellValue = getCellContent(row, col);
            const stringValue = String(cellValue).replace(/"/g, '""');
            return `"${stringValue}"`;
          })
          .join(',')
      )
      .join('\\r\\n');
  
    const csvContent = `\\uFEFF${csvHeaders}\\r\\n${csvRows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'inward-data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate sequential inward ID
  const generateInwardId = async () => {
    try {
      const inwardCollection = collection(db, 'inward');
      const snapshot = await getDocs(inwardCollection);
      
      // Extract existing inward IDs and find the highest number
      const existingIds = snapshot.docs
        .map(doc => doc.data().inwardId)
        .filter(id => id && id.startsWith('INW-'))
        .map(id => {
          const match = id.match(/INW-(\d{3})/);
          return match ? parseInt(match[1], 10) : 0;
        });
      
      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
      const nextId = maxId + 1;
      
      return `INW-${nextId.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating inward ID:', error);
      // Fallback to timestamp-based ID if there's an error
      return `INW-${Date.now().toString().slice(-3)}`;
    }
  };

  // Helper to get particulars for selected commodity and variety
  const getSelectedVarietyParticulars = () => {
    const commodity = commodities.find((c: any) => c.commodityName === form.commodity);
    const variety = commodity?.varieties?.find((v: any) => v.varietyName === form.varietyName);
    return variety?.particulars || [];
  };

  // Add handler for lab result input changes
  const handleLabResultChange = (index: number, value: string) => {
    const particulars = getSelectedVarietyParticulars();
    const particular = particulars[index];
    if (!particular) return;

    const { minPercentage, maxPercentage } = particular;
    const numericValue = parseFloat(value);
    let isValid = true;

    if (!isNaN(numericValue)) {
      if (numericValue < minPercentage || numericValue > maxPercentage) {
        isValid = false;
        toast({
          title: "Invalid Value",
          description: `Value for ${particular.name} must be between ${minPercentage}% and ${maxPercentage}%.`,
          variant: "destructive",
        });
      }
    }

    setCurrentEntryForm(f => {
      const updatedResults = [...(f.labResults || [])];
      updatedResults[index] = value;
      
      const updatedValidation = [...(f.labResultsValidation || [])];
      updatedValidation[index] = isValid;

      return { ...f, labResults: updatedResults, labResultsValidation: updatedValidation };
    });
  };

  // Handle edit button click
  const handleEdit = (row: any) => {
    setIsEditMode(true);
    setEditingRow(row);
    
    // Populate form with row data
    setBaseForm({
      state: row.state || '',
      branch: row.branch || '',
      location: row.location || '',
      warehouseName: row.warehouseName || '',
      warehouseCode: row.warehouseCode || '',
      warehouseAddress: row.warehouseAddress || '',
      businessType: row.businessType || '',
      client: row.client || '',
      clientCode: row.clientCode || '',
      clientAddress: row.clientAddress || '',
      dateOfInward: row.dateOfInward || '',
      cadNumber: row.cadNumber || '',
      attachmentUrl: row.attachmentUrl || '',
      commodity: row.commodity || '',
      varietyName: row.varietyName || '',
      marketRate: row.marketRate || '',
      totalBags: row.totalBags || '',
      totalQuantity: row.totalQuantity || '',
      totalValue: row.totalValue || '',
      bankName: row.bankName || '',
      bankBranch: row.bankBranch || '',
      bankState: row.bankState || '',
      ifscCode: row.ifscCode || '',
      bankReceipt: row.bankReceipt || '',
      billingStatus: row.billingStatus || '',
      reservationRate: row.reservationRate || '',
      reservationQty: row.reservationQty || '',
      reservationStart: row.reservationStart || '',
      reservationEnd: row.reservationEnd || '',
      billingCycle: row.billingCycle || '',
      billingType: row.billingType || '',
      billingRate: row.billingRate || '',
      insuranceManagedBy: row.insuranceManagedBy || '',
      firePolicyNumber: row.firePolicyNumber || '',
      firePolicyAmount: row.firePolicyAmount || '',
      firePolicyStart: row.firePolicyStart || '',
      firePolicyEnd: row.firePolicyEnd || '',
      burglaryPolicyNumber: row.burglaryPolicyNumber || '',
      burglaryPolicyAmount: row.burglaryPolicyAmount || '',
      burglaryPolicyStart: row.burglaryPolicyStart || '',
      burglaryPolicyEnd: row.burglaryPolicyEnd || '',
      firePolicyCompanyName: row.firePolicyCompanyName || '',
      burglaryPolicyCompanyName: row.burglaryPolicyCompanyName || '',
      firePolicyBalance: row.firePolicyBalance || '',
      burglaryPolicyBalance: row.burglaryPolicyBalance || '',
      bankFundedBy: row.bankFundedBy || '',
    });

    // Populate current entry form with row data
    setCurrentEntryForm({
      vehicleNumber: row.vehicleNumber || '',
      getpassNumber: row.getpassNumber || '',
      weightBridge: row.weightBridge || '',
      weightBridgeSlipNumber: row.weightBridgeSlipNumber || '',
      grossWeight: row.grossWeight || '',
      tareWeight: row.tareWeight || '',
      netWeight: row.netWeight || '',
      averageWeight: row.averageWeight || '',
      totalBags: row.totalBags || '',
      totalQuantity: row.totalQuantity || '',
      dateOfSampling: row.dateOfSampling || '',
      dateOfTesting: row.dateOfTesting || '',
      labResults: row.labResults || [],
      labResultsValidation: row.labResultsValidation || [],
      stacks: row.stacks || [{ stackNumber: '', numberOfBags: '' }],
    });

    // Fetch insurance entries if warehouse is selected
    if (row.warehouseName) {
      const selectedWarehouse = warehouses.find(w => w.warehouseName === row.warehouseName);
      if (selectedWarehouse) {
        const inspectionInsuranceEntries = selectedWarehouse.insuranceEntries || [];
        setInsuranceEntries(inspectionInsuranceEntries);
      }
    }

    setShowAddModal(true);
  };

  // Handle delete button click
  const handleDelete = async (row: any) => {
    if (confirm('Are you sure you want to delete this inward entry? This action cannot be undone.')) {
      try {
        // Delete from Firebase
        const inwardCollection = collection(db, 'inward');
        const q = query(inwardCollection, where('inwardId', '==', row.inwardId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docRef = doc(db, 'inward', querySnapshot.docs[0].id);
          await deleteDoc(docRef);
          
          toast({
            title: "Success",
            description: "Inward entry deleted successfully.",
            variant: "default",
          });
          
          // Refresh data
          setDataVersion(v => v + 1);
        }
      } catch (error) {
        console.error('Error deleting inward entry:', error);
        toast({
          title: "Error",
          description: "Failed to delete inward entry. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Handle view SR button click
  const handleViewSR = async (row: any) => {
    setSelectedRowForSR(row);
    setShowSRForm(true);
    
    // Fetch insurance data from inspection collection
    try {
      const inspectionsCollection = collection(db, 'inspections');
      const q = query(inspectionsCollection, where('warehouseName', '==', row.warehouseName));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const inspectionData = querySnapshot.docs[0].data();
        let insuranceEntries: any[] = [];
        
        // Check multiple possible locations for insurance data
        if (inspectionData.insuranceEntries && Array.isArray(inspectionData.insuranceEntries)) {
          console.log('Found top-level insurance entries:', inspectionData.insuranceEntries.length);
          insuranceEntries = inspectionData.insuranceEntries;
        } else if (inspectionData.warehouseInspectionData?.insuranceEntries && Array.isArray(inspectionData.warehouseInspectionData.insuranceEntries)) {
          console.log('Found nested insurance entries:', inspectionData.warehouseInspectionData.insuranceEntries.length);
          insuranceEntries = inspectionData.warehouseInspectionData.insuranceEntries;
        } else if (inspectionData.warehouseInspectionData) {
          // Legacy format - convert to new format
          const legacyData = inspectionData.warehouseInspectionData;
          if (legacyData.firePolicyNumber || legacyData.burglaryPolicyNumber) {
            console.log('Found legacy insurance format, converting to new format');
            insuranceEntries = [{
              id: `legacy_${Date.now()}`,
              insuranceTakenBy: legacyData.insuranceTakenBy || '',
              insuranceCommodity: legacyData.insuranceCommodity || '',
              clientName: legacyData.clientName || '',
              clientAddress: legacyData.clientAddress || '',
              selectedBankName: legacyData.selectedBankName || '',
              firePolicyCompanyName: legacyData.firePolicyCompanyName || '',
              firePolicyNumber: legacyData.firePolicyNumber || '',
              firePolicyAmount: legacyData.firePolicyAmount || '',
              firePolicyStartDate: legacyData.firePolicyStartDate || null,
              firePolicyEndDate: legacyData.firePolicyEndDate || null,
              burglaryPolicyCompanyName: legacyData.burglaryPolicyCompanyName || '',
              burglaryPolicyNumber: legacyData.burglaryPolicyNumber || '',
              burglaryPolicyAmount: legacyData.burglaryPolicyAmount || '',
              burglaryPolicyStartDate: legacyData.burglaryPolicyStartDate || null,
              burglaryPolicyEndDate: legacyData.burglaryPolicyEndDate || null,
              createdAt: new Date(legacyData.createdAt || Date.now())
            }];
          }
        }
        
        console.log('Insurance entries fetched from inspection:', insuranceEntries);
        setInspectionInsuranceData(insuranceEntries);
      } else {
        console.log('No inspection found for warehouse:', row.warehouseName);
        setInspectionInsuranceData([]);
      }
    } catch (error) {
      console.error('Error fetching insurance data from inspection:', error);
      setInspectionInsuranceData([]);
    }
  };

  // SR/WR View Modal
  const handleApproveSR = (sr: any) => {
    if (!hologramNumber.trim()) {
      toast({
        title: 'Hologram Number Required',
        description: 'Please enter the hologram number before proceeding.',
        variant: 'destructive',
      });
      return;
    }
    setIsFormApproved(true);
    setSrGenerationDate(new Date().toLocaleDateString());
    toast({
      title: 'Approved Successfully',
      description: 'The receipt has been approved and is now ready for printing.',
      variant: 'default',
    });
  };

  const handleRejectSR = (sr: any) => {
    // Implement reject logic
    console.log('Reject SR:', sr);
    setShowSRForm(false);
  };

  const handleResubmitSR = (sr: any) => {
    // Implement resubmit logic
    console.log('Resubmit SR:', sr);
    setShowSRForm(false);
  };

  const isInsuranceExpired = (sr: any) => {
    // Check if any insurance policy is expired
    const today = new Date();
    
    // Check inspection insurance data first
    for (const insurance of inspectionInsuranceData) {
      const fireEndDate = insurance.firePolicyEndDate ? new Date(insurance.firePolicyEndDate) : null;
      const burglaryEndDate = insurance.burglaryPolicyEndDate ? new Date(insurance.burglaryPolicyEndDate) : null;
      
      if (fireEndDate && fireEndDate < today) {
        return true;
      }
      if (burglaryEndDate && burglaryEndDate < today) {
        return true;
      }
    }
    
    // Fallback to inward data if no inspection insurance found
    const fireEndDate = sr.firePolicyEnd ? new Date(sr.firePolicyEnd) : null;
    const burglaryEndDate = sr.burglaryPolicyEnd ? new Date(sr.burglaryPolicyEnd) : null;
    
    if (fireEndDate && fireEndDate < today) {
      return true;
    }
    if (burglaryEndDate && burglaryEndDate < today) {
      return true;
    }
    
    return false;
  };

  // Generate a unique SR No based on inwardId and date
  const generateSRNo = (row: any) => {
    if (!row) return '';
    const date = row.dateOfInward ? row.dateOfInward.replace(/-/g, '') : '';
    return `SR-${row.inwardId || 'XXX'}-${date}`;
  };

  // In the insurance selection section, update the calculation:
  const calculateRemainingAmounts = (ins: any) => {
    // Sum totalValue from all inward entries for this insurance
    const totalInwardValue = inwardData.filter((entry: any) =>
      entry.warehouseName === form.warehouseName &&
      entry.firePolicyNumber === ins.firePolicyNumber &&
      entry.burglaryPolicyNumber === ins.burglaryPolicyNumber
    ).reduce((sum: number, entry: any) => sum + (parseFloat(entry.totalValue) || 0), 0);
    const firePolicyAmt = parseFloat(ins.firePolicyAmount) || 0;
    const burglaryPolicyAmt = parseFloat(ins.burglaryPolicyAmount) || 0;
    setRemainingFirePolicy((firePolicyAmt - totalInwardValue).toFixed(2));
    setRemainingBurglaryPolicy((burglaryPolicyAmt - totalInwardValue).toFixed(2));
  };

  // Print handler using html2canvas and jsPDF
  const handlePrint = async () => {
    if (!printRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    const receiptType = selectedRowForSR?.receiptType || 'SR';
    const filename = `${receiptType}-${selectedRowForSR?.inwardId || 'XXX'}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
    toast({ title: 'PDF Generated', description: 'The receipt PDF has been downloaded successfully.', variant: 'default' });
  };

  // Update insurance selection logic to fetch and display remaining values from Firestore
  const handleInsuranceSelect = async (idx: number) => {
    setSelectedInsuranceIndex(idx);
    const ins = insuranceEntries[idx];
    setBaseForm(f => ({
      ...f,
      insuranceManagedBy: ins.insuranceTakenBy || '',
      firePolicyNumber: ins.firePolicyNumber || '',
      firePolicyAmount: ins.firePolicyAmount || '',
      firePolicyStart: ins.firePolicyStartDate || '',
      firePolicyEnd: ins.firePolicyEndDate || '',
      burglaryPolicyNumber: ins.burglaryPolicyNumber || '',
      burglaryPolicyAmount: ins.burglaryPolicyAmount || '',
      burglaryPolicyStart: ins.burglaryPolicyStartDate || '',
      burglaryPolicyEnd: ins.burglaryPolicyEndDate || '',
      firePolicyCompanyName: ins.firePolicyCompanyName || '',
      burglaryPolicyCompanyName: ins.burglaryPolicyCompanyName || '',
      bankFundedBy: ins.selectedBankName || '',
    }));
    // Fetch latest remaining values from Firestore
    const inspectionsCollection = collection(db, 'inspections');
    const q = query(inspectionsCollection, where('warehouseName', '==', form.warehouseName));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const inspectionData = querySnapshot.docs[0].data();
      let insuranceList = inspectionData.insuranceEntries || [];
      if (!Array.isArray(insuranceList) && inspectionData.warehouseInspectionData?.insuranceEntries) {
        insuranceList = inspectionData.warehouseInspectionData.insuranceEntries;
      }
      const firestoreIns = insuranceList.find((i: any) => i.firePolicyNumber === ins.firePolicyNumber && i.burglaryPolicyNumber === ins.burglaryPolicyNumber);
      setInitialRemainingFire(firestoreIns?.remainingFirePolicyAmount || ins.firePolicyAmount || '');
      setInitialRemainingBurglary(firestoreIns?.remainingBurglaryPolicyAmount || ins.burglaryPolicyAmount || '');
    } else {
      setInitialRemainingFire(ins.firePolicyAmount || '');
      setInitialRemainingBurglary(ins.burglaryPolicyAmount || '');
    }
  };

  // Handle insurance selection in information section
  const handleInsuranceInfoSelect = async (idx: number) => {
    setSelectedInsuranceInfoIndex(idx);
    const ins = filteredInsuranceInfoEntries[idx];
    
    // Fetch latest remaining values from Firestore
    const inspectionsCollection = collection(db, 'inspections');
    const q = query(inspectionsCollection, where('warehouseName', '==', form.warehouseName));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const inspectionData = querySnapshot.docs[0].data();
      let insuranceList = inspectionData.insuranceEntries || [];
      if (!Array.isArray(insuranceList) && inspectionData.warehouseInspectionData?.insuranceEntries) {
        insuranceList = inspectionData.warehouseInspectionData.insuranceEntries;
      }
      const firestoreIns = insuranceList.find((i: any) => i.firePolicyNumber === ins.firePolicyNumber && i.burglaryPolicyNumber === ins.burglaryPolicyNumber);
      
      // Use remaining values if they exist, otherwise use policy amounts
      const initialFire = firestoreIns?.remainingFirePolicyAmount || ins.firePolicyAmount || '';
      const initialBurglary = firestoreIns?.remainingBurglaryPolicyAmount || ins.burglaryPolicyAmount || '';
      
      setInitialRemainingFire(initialFire);
      setInitialRemainingBurglary(initialBurglary);
    } else {
      // If no Firestore data, use policy amounts
      const initialFire = ins.firePolicyAmount || '';
      const initialBurglary = ins.burglaryPolicyAmount || '';
      
      setInitialRemainingFire(initialFire);
      setInitialRemainingBurglary(initialBurglary);
    }
  };

  // Recalculate remaining amounts when total value or initial amounts change
  useEffect(() => {
    if (selectedInsuranceInfoIndex !== null && (initialRemainingFire || initialRemainingBurglary)) {
      const totalValue = parseFloat(baseForm.totalValue) || 0;
      const initialFire = parseFloat(initialRemainingFire) || 0;
      const initialBurglary = parseFloat(initialRemainingBurglary) || 0;
      
      const remainingFire = initialFire - totalValue;
      const remainingBurglary = initialBurglary - totalValue;
      
      setRemainingFirePolicy(remainingFire >= 0 ? remainingFire.toFixed(2) : '0.00');
      setRemainingBurglaryPolicy(remainingBurglary >= 0 ? remainingBurglary.toFixed(2) : '0.00');
    }
  }, [selectedInsuranceInfoIndex, initialRemainingFire, initialRemainingBurglary, baseForm.totalValue]);

  return (
    <DashboardLayout>
      {/* Module title and dashboard button row */}
      <div className="flex items-center justify-between mt-4 mb-10 px-8">
        <Button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-2xl font-semibold shadow-lg rounded-xl flex items-center gap-2" onClick={() => router.push('/dashboard')}>
          <span className="text-2xl">&#8592;</span> Dashboard
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-orange-600 inline-block border-b-4 border-[#1aad4b] pb-2 px-10 py-1 bg-orange-50 rounded-xl shadow" style={{ letterSpacing: '0.02em' }}>
            Inward Module
          </h1>
        </div>
        <Button className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-lg font-semibold shadow-lg rounded-xl" onClick={() => {
          setIsEditMode(false);
          setEditingRow(null);
          resetForm();
          setShowAddModal(true);
        }}>
          + Add Inward
        </Button>
      </div>
      
      {/* Search and Export */}
      <div className="px-8 mb-4">
        <Card className="bg-green-50 border border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800">Search & Export Options</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="flex-grow flex items-center gap-2">
              <Search className="text-gray-500" />
              <Label htmlFor="search-input" className="font-semibold text-gray-700">Search:</Label>
              <Input
                id="search-input"
                placeholder="Search by state, branch, location, warehouse name, client, or receipt type..."
                className="w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={handleExportCSV}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Data Table */}
      <div className="px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700 text-xl">Inward Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={filteredData}
              isLoading={loading}
              error={error || undefined}
              wrapperClassName="border-green-300"
              headClassName="bg-orange-100 text-orange-600 font-bold"
              cellClassName="text-green-800"
            />
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Inward Modal */}
      <Dialog open={showAddModal} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-orange-700 text-xl">
              {isEditMode ? 'Edit Inward' : 'Add Inward'}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="block font-semibold mb-1">State</Label>
                <Select value={form.state} onValueChange={v => setBaseForm(f => ({ ...f, state: v, branch: '', location: '', warehouseName: '', warehouseCode: '', warehouseAddress: '', businessType: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                  <SelectContent>
                    {states.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="block font-semibold mb-1">Branch</Label>
                <Select value={form.branch} onValueChange={v => setBaseForm(f => ({ ...f, branch: v, location: '', warehouseName: '', warehouseCode: '', warehouseAddress: '', businessType: '' }))} disabled={!form.state}>
                  <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                  <SelectContent>
                    {filteredBranches.map((b: any) => <SelectItem key={b.branch} value={b.branch}>{b.branch}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="block font-semibold mb-1">Location</Label>
                <Select value={form.location} onValueChange={v => setBaseForm(f => ({ ...f, location: v, warehouseName: '', warehouseCode: '', warehouseAddress: '', businessType: '' }))} disabled={!form.branch}>
                  <SelectTrigger><SelectValue placeholder="Select Location" /></SelectTrigger>
                  <SelectContent>
                    {filteredLocations.map((loc: any) => <SelectItem key={loc.locationName} value={loc.locationName}>{loc.locationName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="block font-semibold mb-1">Warehouse Name</Label>
                <Select value={form.warehouseName} onValueChange={async (warehouseName) => {
                  setBaseForm(f => ({ 
                    ...f, 
                    warehouseName: warehouseName,
                    warehouseCode: '',
                    warehouseAddress: '',
                    businessType: '',
                    // Clear insurance data when warehouse changes
                    insuranceManagedBy: '',
                    firePolicyNumber: '',
                    firePolicyAmount: '',
                    firePolicyStart: '',
                    firePolicyEnd: '',
                    burglaryPolicyNumber: '',
                    burglaryPolicyAmount: '',
                    burglaryPolicyStart: '',
                    burglaryPolicyEnd: '',
                    firePolicyCompanyName: '',
                    burglaryPolicyCompanyName: '',
                    bankFundedBy: '',
                  }));
                  
                  // Reset insurance type and selection when warehouse changes
                  setSelectedInsuranceType('all');
                  setSelectedInsuranceIndex(null);
                  setSelectedInsuranceInfoType('');
                  setSelectedInsuranceInfoIndex(null);
                  
                  const selectedWarehouse = filteredWarehouses.find((w: any) => w.warehouseName === warehouseName);
                    if (selectedWarehouse) {
                      setBaseForm(f => ({
                        ...f,
                        warehouseCode: selectedWarehouse.warehouseCode || '',
                        warehouseAddress: selectedWarehouse.warehouseInspectionData?.address || selectedWarehouse.warehouseAddress || '',
                        businessType: selectedWarehouse.businessType || '',
                        // Auto-fill bank information from inspection
                        bankName: selectedWarehouse.bankName || '',
                        bankBranch: selectedWarehouse.bankBranch || '',
                        bankState: selectedWarehouse.bankState || '',
                        ifscCode: selectedWarehouse.ifscCode || ''
                      }));
                      
                      // Fetch insurance entries from inspection module
                    let insuranceEntries: any[] = [];
                    
                    // First check if insurance data is already loaded with the warehouse
                    if (selectedWarehouse.insuranceEntries && selectedWarehouse.insuranceEntries.length > 0) {
                      insuranceEntries = selectedWarehouse.insuranceEntries;
                      console.log('Insurance entries from loaded warehouse data:', insuranceEntries);
                    } else {
                      // If not loaded, fetch from inspection collection
                      try {
                        const inspectionsCollection = collection(db, 'inspections');
                        const q = query(inspectionsCollection, where('warehouseName', '==', warehouseName));
                        const querySnapshot = await getDocs(q);
                        
                        if (!querySnapshot.empty) {
                          const inspectionData = querySnapshot.docs[0].data();
                          
                          // Check multiple possible locations for insurance data
                          if (inspectionData.insuranceEntries && Array.isArray(inspectionData.insuranceEntries)) {
                            console.log('Found top-level insurance entries:', inspectionData.insuranceEntries.length);
                            insuranceEntries = inspectionData.insuranceEntries;
                          } else if (inspectionData.warehouseInspectionData?.insuranceEntries && Array.isArray(inspectionData.warehouseInspectionData.insuranceEntries)) {
                            console.log('Found nested insurance entries:', inspectionData.warehouseInspectionData.insuranceEntries.length);
                            insuranceEntries = inspectionData.warehouseInspectionData.insuranceEntries;
                          } else if (inspectionData.warehouseInspectionData) {
                            // Legacy format - convert to new format
                            const legacyData = inspectionData.warehouseInspectionData;
                            if (legacyData.firePolicyNumber || legacyData.burglaryPolicyNumber) {
                              console.log('Found legacy insurance format, converting to new format');
                              insuranceEntries = [{
                                id: `legacy_${Date.now()}`,
                                insuranceTakenBy: legacyData.insuranceTakenBy || '',
                                insuranceCommodity: legacyData.insuranceCommodity || '',
                                clientName: legacyData.clientName || '',
                                clientAddress: legacyData.clientAddress || '',
                                selectedBankName: legacyData.selectedBankName || '',
                                firePolicyCompanyName: legacyData.firePolicyCompanyName || '',
                                firePolicyNumber: legacyData.firePolicyNumber || '',
                                firePolicyAmount: legacyData.firePolicyAmount || '',
                                firePolicyStartDate: legacyData.firePolicyStartDate || null,
                                firePolicyEndDate: legacyData.firePolicyEndDate || null,
                                burglaryPolicyCompanyName: legacyData.burglaryPolicyCompanyName || '',
                                burglaryPolicyNumber: legacyData.burglaryPolicyNumber || '',
                                burglaryPolicyAmount: legacyData.burglaryPolicyAmount || '',
                                burglaryPolicyStartDate: legacyData.burglaryPolicyStartDate || null,
                                burglaryPolicyEndDate: legacyData.burglaryPolicyEndDate || null,
                                createdAt: new Date(legacyData.createdAt || Date.now())
                              }];
                            }
                          }
                        }
                      } catch (error) {
                        console.error('Error fetching insurance data from inspection:', error);
                      }
                    }
                    
                    setInsuranceEntries(insuranceEntries);
                    console.log('Insurance entries set for warehouse:', warehouseName, insuranceEntries);
                  } else {
                    setInsuranceEntries([]);
                  }
                }} disabled={!form.location}>
                  <SelectTrigger><SelectValue placeholder="Select Warehouse" /></SelectTrigger>
                  <SelectContent>
                    {filteredWarehouses.map((w: any) => (
                      <SelectItem 
                        key={`${w.warehouseName}-${w.warehouseCode || 'no-code'}`} 
                        value={w.warehouseName}
                      >
                        {w.warehouseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="block font-semibold mb-1">Warehouse Code</Label>
                <Input value={form.warehouseCode} readOnly placeholder="Auto-filled" />
              </div>
              <div>
                <Label className="block font-semibold mb-1">Business Type</Label>
                <Select value={form.businessType} onValueChange={v => setBaseForm(f => ({ ...f, businessType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Business Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cm">Collateral Management (CM)</SelectItem>
                    <SelectItem value="pwh">Professional Warehousing (PWH)</SelectItem>
                    <SelectItem value="ncdex">NCDEX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="block font-semibold mb-1">Warehouse Address</Label>
              <Input value={form.warehouseAddress} onChange={e => setBaseForm(f => ({ ...f, warehouseAddress: e.target.value }))} placeholder="Enter warehouse address" />
            </div>
              <div>
                <Label className="block font-semibold mb-1">Client Name</Label>
                <Select value={form.client} onValueChange={v => setBaseForm(f => ({ ...f, client: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => <SelectItem key={c.firmName} value={c.firmName}>{c.firmName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="block font-semibold mb-1">Client Code</Label>
                <Input value={form.clientCode} readOnly placeholder="Auto-filled" />
              </div>
              <div>
                <Label className="block font-semibold mb-1">Client Address</Label>
                <Input 
                  value={form.clientAddress} 
                  onChange={e => setBaseForm(f => ({ ...f, clientAddress: e.target.value }))} 
                  placeholder="Enter client address"
                />
              </div>
            </div>

            {/* Inward Details */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4 text-orange-700">Inward Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="block font-semibold mb-1">Date of Inward <span className="text-red-500">*</span></Label>
                  <Input 
                    type="date" 
                    value={form.dateOfInward} 
                    onChange={e => setBaseForm(f => ({ ...f, dateOfInward: e.target.value }))} 
                    placeholder="Select date"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-1">CAD Number <span className="text-red-500">*</span></Label>
                  <Input 
                    value={form.cadNumber} 
                    onChange={e => setBaseForm(f => ({ ...f, cadNumber: e.target.value }))} 
                    placeholder="Enter CAD Number"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block font-semibold mb-1">Base Receipt</Label>
                  <Input 
                    value={form.bankReceipt} 
                    onChange={e => setBaseForm(f => ({ ...f, bankReceipt: e.target.value }))} 
                    placeholder="Enter Base Receipt Number"
                  />
                </div>
              </div>
            </div>

            {/* Commodity Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-6 text-orange-700">Commodity Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label className="block font-semibold mb-2">Commodity <span className="text-red-500">*</span></Label>
                  <Select value={form.commodity} onValueChange={handleCommodityChange}>
                    <SelectTrigger><SelectValue placeholder="Select Commodity" /></SelectTrigger>
                    <SelectContent>
                      {commodities.map((c: any) => (
                        <SelectItem key={c.commodityName} value={c.commodityName}>
                          {c.commodityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Variety Name <span className="text-red-500">*</span></Label>
                  <Select 
                    value={form.varietyName} 
                    onValueChange={handleVarietyChange}
                    disabled={!form.commodity}
                  >
                    <SelectTrigger><SelectValue placeholder="Select Variety" /></SelectTrigger>
                    <SelectContent>
                      {getCommodityVarieties(form.commodity).map((v: any) => (
                        <SelectItem key={v.varietyName} value={v.varietyName}>
                          {v.varietyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                  <Label className="block font-semibold mb-2">Market Rate (Rs/MT) <span className="text-red-500">*</span></Label>
                <Input 
                    type="text"
                    value={form.marketRate} 
                    onChange={e => setBaseForm(f => ({ ...f, marketRate: e.target.value }))} 
                    placeholder="Enter Market Rate"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Total Bags <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    value={baseForm.totalBags}
                    readOnly
                    placeholder="Auto-calculated from entries"
                    className="bg-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block font-semibold mb-2">Total Quantity (MT) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    step="0.001"
                    value={baseForm.totalQuantity}
                    readOnly
                    placeholder="Auto-calculated from entries"
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Total Value (Rs/MT)</Label>
                  <Input 
                    value={baseForm.totalValue}
                  readOnly 
                    placeholder="Auto-calculated"
                    className="bg-gray-50"
                />
                </div>
              </div>
            </div>

            {/* Bank Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-6 text-orange-700">Bank Information (Auto-filled from Inspection)</h3>
              
              <div className="mb-6">
                <Label className="block font-semibold mb-2">Bank Name</Label>
                <Input value={form.bankName} readOnly placeholder="Auto-filled from inspection" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label className="block font-semibold mb-2">Bank Branch</Label>
                  <Input value={form.bankBranch} readOnly placeholder="Auto-filled from inspection" />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Bank State</Label>
                  <Input value={form.bankState} readOnly placeholder="Auto-filled from inspection" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block font-semibold mb-2">IFSC Code</Label>
                  <Input value={form.ifscCode} readOnly placeholder="Auto-filled from inspection" />
                </div>
              </div>
            </div>

            {/* Reservation/Billing Information */}
            {form.businessType !== 'cm' && form.billingStatus && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4 text-orange-700">Reservation & Billing Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="block font-semibold mb-1">Billing Status</Label>
                    <Input value={form.billingStatus} readOnly placeholder="Auto-filled" />
                  </div>
                </div>

                {form.billingStatus === 'reservation' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="block font-semibold mb-1">Reservation Rate</Label>
                      <Input value={form.reservationRate} readOnly placeholder="Auto-filled" />
                    </div>
                    <div>
                      <Label className="block font-semibold mb-1">Reservation Quantity</Label>
                      <Input value={form.reservationQty} readOnly placeholder="Auto-filled" />
                    </div>
                    <div>
                      <Label className="block font-semibold mb-1">Reservation Start Date</Label>
                      <Input value={form.reservationStart} readOnly placeholder="Auto-filled" />
                    </div>
                    <div>
                      <Label className="block font-semibold mb-1">Reservation End Date</Label>
                      <Input value={form.reservationEnd} readOnly placeholder="Auto-filled" />
                    </div>
                  </div>
                )}

                {form.billingStatus === 'post-reservation' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="block font-semibold mb-1">Billing Cycle</Label>
                      <Input value={form.billingCycle} readOnly placeholder="Auto-filled" />
                    </div>
                    <div>
                      <Label className="block font-semibold mb-1">Billing Type</Label>
                      <Input value={form.billingType} readOnly placeholder="Auto-filled" />
                    </div>
                    <div>
                      <Label className="block font-semibold mb-1">Rate</Label>
                      <Input value={form.billingRate} readOnly placeholder="Auto-filled" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {form.warehouseName && !form.billingStatus && (
              <div className="border-t pt-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> No reservation data found for this warehouse. 
                    Please ensure a reservation exists in the Reservation + Billing section.
                  </p>
                </div>
              </div>
            )}

            {/* Insurance Information */}
            {insuranceEntries.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold mb-6 text-orange-700">Insurance Information (From Inspection Module)</h3>
                
                                {/* Insurance Type Selection for Information */}
                <div className="mb-6">
                  <Label className="block font-semibold mb-2">Select Insurance Type to View Details</Label>
                  <Select
                    value={selectedInsuranceInfoType}
                    onValueChange={(value) => {
                      setSelectedInsuranceInfoType(value);
                      setSelectedInsuranceInfoIndex(null); // Reset selection when type changes
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select Insurance Type to View Details" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warehouse owner">Warehouse Owner</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="agrogreen">Agrogreen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Insurance Selection Dropdown */}
                {selectedInsuranceInfoType && filteredInsuranceInfoEntries.length > 0 && (
                  <div className="mb-6">
                    <Label className="block font-semibold mb-2">Select Insurance</Label>
                    <Select
                      value={selectedInsuranceInfoIndex !== null ? String(selectedInsuranceInfoIndex) : ''}
                      onValueChange={(value) => handleInsuranceInfoSelect(parseInt(value, 10))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Insurance" /></SelectTrigger>
                      <SelectContent>
                        {filteredInsuranceInfoEntries.map((ins: any, idx: number) => (
                          <SelectItem key={ins.id || idx} value={String(idx)}>
                            {ins.firePolicyNumber} / {ins.burglaryPolicyNumber} (Fire: {ins.firePolicyAmount}, Burglary: {ins.burglaryPolicyAmount})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}



                {/* Calculation Details - shown when insurance is selected */}
                {selectedInsuranceInfoIndex !== null && (
                  <div className="mb-6">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="font-semibold text-orange-700 mb-2">Calculation Details</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Total Value of Current Entry: </span>
                          <span className="text-blue-700">{baseForm.totalValue || '0'}</span>
                        </div>
                        <div>
                          <span className="font-medium">Calculation: </span>
                          <span className="text-blue-700">Current Remaining - Total Value</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Display Insurance Information based on selected type */}
                {selectedInsuranceInfoType && filteredInsuranceInfoEntries.length > 0 && (
                <div className="space-y-6">
                    {filteredInsuranceInfoEntries.map((insurance, index) => (
                    <div key={insurance.id || index} className="border border-orange-200 rounded-lg p-6 bg-orange-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-orange-700">Insurance #{index + 1}</h4>
                        <div className="text-sm text-orange-600 font-medium">
                          {insurance.insuranceTakenBy} - {insurance.insuranceCommodity}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label className="block font-semibold mb-1">Insurance Taken By</Label>
                          <Input value={insurance.insuranceTakenBy || ''} readOnly placeholder="Auto-filled from inspection" />
                        </div>
                        <div>
                          <Label className="block font-semibold mb-1">Commodity</Label>
                          <Input value={insurance.insuranceCommodity || ''} readOnly placeholder="Auto-filled from inspection" />
                        </div>
                      </div>

                      {insurance.insuranceTakenBy === 'client' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label className="block font-semibold mb-1">Client Name</Label>
                            <Input value={insurance.clientName || ''} readOnly placeholder="Auto-filled from inspection" />
                          </div>
                          <div>
                            <Label className="block font-semibold mb-1">Client Address</Label>
                            <Input value={insurance.clientAddress || ''} readOnly placeholder="Auto-filled from inspection" />
                          </div>
                        </div>
                      )}

                      {insurance.insuranceTakenBy === 'bank' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label className="block font-semibold mb-1">Bank Name</Label>
                            <Input value={insurance.selectedBankName || ''} readOnly placeholder="Auto-filled from inspection" />
                          </div>
                        </div>
                      )}

                      {insurance.insuranceTakenBy && insurance.insuranceTakenBy !== 'bank' && (
                        <>
                          {/* Fire Policy */}
                          <h5 className="text-md font-semibold text-orange-600 mt-4 mb-2">Fire Policy Details</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <Label className="block font-semibold mb-1">Fire Policy Company Name</Label>
                              <Input value={insurance.firePolicyCompanyName || ''} readOnly placeholder="Auto-filled from inspection" />
                            </div>
                            <div>
                              <Label className="block font-semibold mb-1">Fire Policy Number</Label>
                              <Input value={insurance.firePolicyNumber || ''} readOnly placeholder="Auto-filled from inspection" />
                            </div>
                            <div>
                              <Label className="block font-semibold mb-1">Fire Policy Amount</Label>
                              <Input value={insurance.firePolicyAmount || ''} readOnly placeholder="Auto-filled from inspection" />
                            </div>
                            <div>
                              <Label className="block font-semibold mb-1">Fire Policy Start Date</Label>
                              <Input value={insurance.firePolicyStartDate || ''} readOnly placeholder="Auto-filled from inspection" />
                            </div>
                            <div>
                              <Label className="block font-semibold mb-1">Fire Policy End Date</Label>
                              <Input value={insurance.firePolicyEndDate || ''} readOnly placeholder="Auto-filled from inspection" />
                            </div>
                              {selectedInsuranceInfoIndex === index && (
                                <>
                                  <div>
                                    <Label className="block font-semibold mb-1">Remaining Fire Policy Amount</Label>
                                    <Input value={initialRemainingFire || '0'} readOnly className="bg-green-50" />
                                  </div>
                                  <div>
                                    <Label className="block font-semibold mb-1">Update Remaining Fire Policy Amount</Label>
                                    <Input value={remainingFirePolicy} readOnly className="bg-blue-50" />
                                  </div>
                                </>
                              )}
                          </div>

                          {/* Burglary Policy */}
                          <h5 className="text-md font-semibold text-orange-600 mt-4 mb-2">Burglary Policy Details</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="block font-semibold mb-1">Burglary Policy Company Name</Label>
                              <Input value={insurance.burglaryPolicyCompanyName || ''} readOnly placeholder="Auto-filled from inspection" />
                            </div>
                            <div>
                              <Label className="block font-semibold mb-1">Burglary Policy Number</Label>
                              <Input value={insurance.burglaryPolicyNumber || ''} readOnly placeholder="Auto-filled from inspection" />
                            </div>
                            <div>
                              <Label className="block font-semibold mb-1">Burglary Policy Amount</Label>
                              <Input value={insurance.burglaryPolicyAmount || ''} readOnly placeholder="Auto-filled from inspection" />
                            </div>
                            <div>
                              <Label className="block font-semibold mb-1">Burglary Policy Start Date</Label>
                              <Input value={insurance.burglaryPolicyStartDate || ''} readOnly placeholder="Auto-filled from inspection" />
                            </div>
                            <div>
                              <Label className="block font-semibold mb-1">Burglary Policy End Date</Label>
                              <Input value={insurance.burglaryPolicyEndDate || ''} readOnly placeholder="Auto-filled from inspection" />
                            </div>
                              {selectedInsuranceInfoIndex === index && (
                                <>
                                  <div>
                                    <Label className="block font-semibold mb-1">Remaining Burglary Policy Amount</Label>
                                    <Input value={initialRemainingBurglary || '0'} readOnly className="bg-green-50" />
                                  </div>
                                  <div>
                                    <Label className="block font-semibold mb-1">Update Remaining Burglary Policy Amount</Label>
                                    <Input value={remainingBurglaryPolicy} readOnly className="bg-blue-50" />
                                  </div>
                                </>
                              )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                )}

                {/* Show message when no insurance found for selected type */}
                {selectedInsuranceInfoType && filteredInsuranceInfoEntries.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      <strong>Note:</strong> No insurance data found for the selected type &quot;{selectedInsuranceInfoType}&quot; in this warehouse. 
                      Please ensure insurance data exists in the Warehouse Inspection section.
                    </p>
                  </div>
                )}
              </div>
            )}

            {form.commodity && insuranceEntries.length === 0 && (
              <div className="border-t pt-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> No insurance data found for this warehouse in the inspection module. 
                    Please ensure insurance data exists in the Warehouse Inspection section.
                  </p>
                </div>
              </div>
            )}

            {/* Saved Inward Entries */}
            {inwardEntries.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4 text-green-700">Saved Inward Entries</h3>
      <div className="space-y-6">
                  {inwardEntries.map((entry, index) => (
                    <div key={entry.id} className="border border-green-300 rounded-lg p-6 bg-green-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-green-800">Entry #{entry.entryNumber}</h4>
                        <div className="text-sm text-green-600 font-medium">
                          Vehicle: {entry.vehicleNumber} | Gatepass: {entry.getpassNumber}
                        </div>
                      </div>
                      
                      {/* Inward ID */}
                      <div className="mb-4">
                        <h5 className="text-md font-semibold mb-2 text-green-700">Inward Information</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="block font-medium mb-1 text-green-600">Inward ID</Label>
                            <Input value={entry.inwardId || 'Pending'} readOnly className="bg-white border-green-300 font-mono" />
                          </div>
                        </div>
                      </div>

                      {/* Vehicle Information */}
                      <div className="mb-4">
                        <h5 className="text-md font-semibold mb-2 text-green-700">Vehicle Information</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="block font-medium mb-1 text-green-600">Vehicle Number</Label>
                            <Input value={entry.vehicleNumber} readOnly className="bg-white border-green-300" />
                          </div>
                          <div>
                            <Label className="block font-medium mb-1 text-green-600">Gatepass Number</Label>
                            <Input value={entry.getpassNumber} readOnly className="bg-white border-green-300" />
                          </div>
                        </div>
                      </div>

                      {/* Weight Bridge Information */}
                      <div className="mb-4">
                        <h5 className="text-md font-semibold mb-2 text-green-700">Weight Bridge Information</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="block font-medium mb-1 text-green-600">Weight Bridge</Label>
                            <Input value={entry.weightBridge} readOnly className="bg-white border-green-300" />
                          </div>
                          <div>
                            <Label className="block font-medium mb-1 text-green-600">Weight Bridge Slip Number</Label>
                            <Input value={entry.weightBridgeSlipNumber} readOnly className="bg-white border-green-300" />
                          </div>
                        </div>
                      </div>

                      {/* Weight Information */}
                      <div className="mb-4">
                        <h5 className="text-md font-semibold mb-2 text-green-700">Weight Information</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="block font-medium mb-1 text-green-600">Gross Weight (MT)</Label>
                            <Input value={entry.grossWeight} readOnly className="bg-white border-green-300" />
                          </div>
                          <div>
                            <Label className="block font-medium mb-1 text-green-600">Tare Weight (MT)</Label>
                            <Input value={entry.tareWeight} readOnly className="bg-white border-green-300" />
                          </div>
                          <div>
                            <Label className="block font-medium mb-1 text-green-600">Net Weight (MT)</Label>
                            <Input value={entry.netWeight} readOnly className="bg-white border-green-300" />
                          </div>
                        </div>
                      </div>

                      {/* Stack Information */}
                      <div>
                        <h5 className="text-md font-semibold mb-2 text-green-700">Stack Information</h5>
                        <div className="space-y-3">
                          {entry.stacks.map((stack: any, stackIndex: number) => (
                            <div key={stackIndex} className="border border-green-200 rounded-lg p-3 bg-white">
                              <div className="flex items-center justify-between mb-2">
                                <h6 className="font-medium text-green-700">Stack {stackIndex + 1}</h6>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="block font-medium mb-1 text-green-600">Stack Number</Label>
                                  <Input value={stack.stackNumber} readOnly className="bg-gray-50 border-green-300" />
                                </div>
                                <div>
                                  <Label className="block font-medium mb-1 text-green-600">Number of Bags</Label>
                                  <Input value={stack.numberOfBags} readOnly className="bg-gray-50 border-green-300" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inward Entry Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-orange-700">Inward Entry</h3>
                <Button 
                  type="button" 
                  onClick={addNewInwardEntry}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
                >
                  Add New Entry
                </Button>
              </div>

              {/* Vehicle Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label className="block font-semibold mb-2">Vehicle Number <span className="text-red-500">*</span></Label>
                  <Input 
                    value={form.vehicleNumber} 
                    onChange={e => setCurrentEntryForm(f => ({ ...f, vehicleNumber: e.target.value }))} 
                    placeholder="Enter Vehicle Number"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Gatepass Number <span className="text-red-500">*</span></Label>
                  <Input 
                    value={form.getpassNumber} 
                    onChange={e => setCurrentEntryForm(f => ({ ...f, getpassNumber: e.target.value }))} 
                    placeholder="Enter Gatepass Number"
                  />
                  <p className="text-xs text-orange-600 mt-1">Gatepass number must be unique across all entries</p>
                </div>
              </div>

              {/* Weight Bridge Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label className="block font-semibold mb-2">Weighbridge Name<span className="text-red-500">*</span></Label>
                  <Input 
                    value={form.weightBridge} 
                    onChange={e => setCurrentEntryForm(f => ({ ...f, weightBridge: e.target.value }))} 
                    placeholder="Enter Weighbridge Name"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Weighbridge Slip Number <span className="text-red-500">*</span></Label>
                  <Input 
                    value={form.weightBridgeSlipNumber} 
                    onChange={e => setCurrentEntryForm(f => ({ ...f, weightBridgeSlipNumber: e.target.value }))} 
                    placeholder="Enter Slip Number"
                  />
                </div>
              </div>

              {/* Weight Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <Label className="block font-semibold mb-2">Gross Weight (MT) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    step="0.001"
                    value={form.grossWeight} 
                    onChange={e => handleGrossWeightChange(e.target.value)} 
                    placeholder="0.000"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Tare Weight (MT) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    step="0.001"
                    value={form.tareWeight} 
                    onChange={e => handleTareWeightChange(e.target.value)} 
                    placeholder="0.000"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Net Weight (MT)</Label>
                  <Input 
                    type="number"
                    step="0.001"
                    value={form.netWeight} 
                    onChange={e => handleNetWeightChange(e.target.value)} 
                    placeholder="Auto-calculated"
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {/* Quantity and Value Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <Label className="block font-semibold mb-2">Total Bags <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    value={currentEntryForm.totalBags}
                    onChange={e => setCurrentEntryForm(f => ({ ...f, totalBags: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Total Quantity (MT) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    step="0.001"
                    value={currentEntryForm.totalQuantity}
                    onChange={e => setCurrentEntryForm(f => ({ ...f, totalQuantity: e.target.value }))} 
                    placeholder="0.000"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Average Weight (MT)</Label>
                  <Input 
                    value={form.averageWeight} 
                    readOnly 
                    placeholder="Auto-calculated"
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {/* Stack Information */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-md font-semibold text-orange-600">Stack Entry</h4>
                  <Button 
                    type="button" 
                    onClick={addStack}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                  >
                    + Add Stack
                  </Button>
                </div>

                {form.stacks.map((stack, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-medium text-gray-700">Stack {index + 1}</h5>
                      {form.stacks.length > 1 && (
                        <Button 
                          type="button" 
                          onClick={() => removeStack(index)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="block font-semibold mb-2">Stack Number <span className="text-red-500">*</span></Label>
                        <Input 
                          value={stack.stackNumber} 
                          onChange={e => updateStack(index, 'stackNumber', e.target.value)} 
                          placeholder="Enter Stack Number"
                        />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-2">Number of Bags <span className="text-red-500">*</span></Label>
                        <Input 
                          type="number"
                          value={stack.numberOfBags} 
                          onChange={e => updateStack(index, 'numberOfBags', e.target.value)} 
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Stack Validation */}
                {form.totalBags && (
                  <div className={`p-4 rounded-lg mb-6 ${
                    validateStackBags() 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`text-sm ${
                      validateStackBags() ? 'text-green-700' : 'text-red-700'
                    }`}>
                      <strong>Stack Validation:</strong> 
                      Total Bags: {form.totalBags} | 
                      Stack Bags: {calculateTotalBagsFromStacks()} | 
                      {validateStackBags() ? ' ✓ Valid' : ' ✗ Mismatch'}
                    </p>
                  </div>
                )}
              </div>

              {/* Lab Parameter Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-6 text-orange-700">Lab Parameter</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <Label className="block font-semibold mb-2">Date of Sampling <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date"
                      value={currentEntryForm.dateOfSampling}
                      onChange={e => setCurrentEntryForm(f => ({ ...f, dateOfSampling: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="block font-semibold mb-2">Date of Testing <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date"
                      value={currentEntryForm.dateOfTesting}
                      onChange={e => setCurrentEntryForm(f => ({ ...f, dateOfTesting: e.target.value }))}
                      disabled={!currentEntryForm.dateOfSampling}
                      min={currentEntryForm.dateOfSampling}
                    />
                  </div>
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Quality Parameters (from Commodity & Variety)</Label>
                  <div className="overflow-x-auto max-w-lg">
                    <table className="min-w-full border border-green-300 rounded-lg">
                      <thead className="bg-orange-100 text-orange-600 font-bold">
                        <tr>
                          <th className="px-4 py-2 border-green-300 border">Parameter</th>
                          <th className="px-4 py-2 border-green-300 border">Min %</th>
                          <th className="px-4 py-2 border-green-300 border">Max %</th>
                          <th className="px-4 py-2 border-green-300 border">Actual (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Find particulars for the selectedRowForSR
                          const commodity = commodities.find((c: any) => c.commodityName === selectedRowForSR?.commodity);
                          const variety = commodity?.varieties?.find((v: any) => v.varietyName === selectedRowForSR?.varietyName);
                          const particulars = variety?.particulars || [];
                          return particulars.length > 0 ? (
                            particulars.map((p: any, idx: number) => (
                          <tr key={idx} className="text-green-800">
                            <td className="px-4 py-2 border-green-300 border">{p.name}</td>
                            <td className="px-4 py-2 border-green-300 border">{p.minPercentage}</td>
                            <td className="px-4 py-2 border-green-300 border">{p.maxPercentage}</td>
                            <td className="px-4 py-2 border-green-300 border">
                              <Input
                                type="number"
                                    value={selectedRowForSR?.labResults?.[idx] || ''}
                                    readOnly
                                    className="w-24 bg-white border border-green-300 text-center"
                              />
                            </td>
                          </tr>
                            ))
                          ) : (
                          <tr><td colSpan={4} className="text-center text-gray-400 py-2">No quality parameters found for this variety.</td></tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* File Attachment Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 text-orange-700">File Attachment</h3>
              <div>
                <Label className="block font-semibold mb-2">Attach File <span className="text-red-500">*</span></Label>
                <Input 
                  type="file"
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.pdf,.xls,.xlsx"
                  className="pt-1.5"
                />
                {fileAttachment && <p className="text-sm text-gray-500 mt-1">Selected: {fileAttachment.name}</p>}
              </div>
            </div>



            <div className="flex justify-end pt-8">
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3" disabled={isUploading}>
                {isUploading ? 'Uploading & Saving...' : (isEditMode ? 'Update Inward Entry' : 'Submit')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <div className="space-y-6 px-8">
        {loading && (
          <div className="border rounded-lg p-8 flex items-center justify-center">
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        )}
        
        {error && (
          <div className="border border-red-200 rounded-lg p-8 flex items-center justify-center">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {!loading && !error && (
        <div className="border rounded-lg p-8 flex items-center justify-center">
          <p className="text-muted-foreground">Inward management will be implemented here.</p>
        </div>
        )}
      </div>

      {/* SR/WR View Modal */}
      <Dialog open={showSRForm} onOpenChange={setShowSRForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-green-700 text-xl">
              {selectedRowForSR?.receiptType === 'WR' ? 'Warehouse Receipt View' : 'Stock Receipt View'}
            </DialogTitle>
          </DialogHeader>
          {selectedRowForSR && (
            <div className="space-y-4">
              {/* CAD No and SR/WR No */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="font-semibold">CAD No</Label>
                  <Input value={selectedRowForSR.cadNumber || ''} readOnly />
                </div>
                <div className="flex-1">
                  <Label className="font-semibold">{selectedRowForSR.receiptType === 'WR' ? 'WR No' : 'SR No'}</Label>
                  <Input value={selectedRowForSR.srNo || `${selectedRowForSR.receiptType === 'WR' ? 'WR' : 'SR'}-${selectedRowForSR.inwardId || 'XXX'}-${selectedRowForSR.dateOfInward ? selectedRowForSR.dateOfInward.replace(/-/g, '') : ''}`} readOnly />
                </div>
                <div className="flex-1">
                  <Label className="font-semibold">{selectedRowForSR.receiptType === 'WR' ? 'WR Generation Date' : 'SR Generation Date'}</Label>
                  <Input value={selectedRowForSR.srGenerationDate || ''} readOnly placeholder="Auto-set on Approve" />
                </div>
              </div>
              {/* Stock Inward Date */}
              <div>
                <Label className="font-semibold">Stock Inward Date</Label>
                <Input value={selectedRowForSR.dateOfInward || ''} readOnly />
              </div>
              {/* Bank, Warehouse, Client, Commodity Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Bank Details</Label>
                  <Input value={selectedRowForSR.bankName || ''} readOnly className="mb-1" />
                  <Input value={selectedRowForSR.bankBranch || ''} readOnly className="mb-1" />
                  <Input value={selectedRowForSR.ifscCode || ''} readOnly />
                </div>
                <div>
                  <Label className="font-semibold">Warehouse Details</Label>
                  <Input value={selectedRowForSR.warehouseName || ''} readOnly className="mb-1" />
                  <Input value={selectedRowForSR.warehouseCode || ''} readOnly className="mb-1" />
                  <Input value={selectedRowForSR.warehouseAddress || ''} readOnly />
                </div>
                <div>
                  <Label className="font-semibold">Client Details</Label>
                  <Input value={selectedRowForSR.client || ''} readOnly className="mb-1" />
                  <Input value={selectedRowForSR.clientCode || ''} readOnly className="mb-1" />
                  <Input value={selectedRowForSR.clientAddress || ''} readOnly />
                </div>
                <div>
                  <Label className="font-semibold">Commodity Details</Label>
                  <Input value={selectedRowForSR.commodity || ''} readOnly className="mb-1" />
                  <Input value={selectedRowForSR.varietyName || ''} readOnly />
                </div>
              </div>
              {/* Bags and Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">No. of Bags</Label>
                  <Input value={selectedRowForSR.totalBags || ''} readOnly />
                </div>
                <div>
                  <Label className="font-semibold">Total Quantity (MT)</Label>
                  <Input value={selectedRowForSR.totalQuantity || ''} readOnly />
                </div>
              </div>
              {/* Validity Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Validity Start Date</Label>
                  <Input value={selectedRowForSR.dateOfInward || ''} readOnly />
                </div>
                <div>
                  <Label className="font-semibold">Validity End Date (Insurance End)</Label>
                  <Input value={(() => {
                    // Get the earliest insurance end date from inspection data
                    let earliestEndDate: Date | null = null;
                    for (const insurance of inspectionInsuranceData) {
                      const fireEndDate = insurance.firePolicyEndDate ? new Date(insurance.firePolicyEndDate) : null;
                      const burglaryEndDate = insurance.burglaryPolicyEndDate ? new Date(insurance.burglaryPolicyEndDate) : null;
                      
                      if (fireEndDate && (!earliestEndDate || fireEndDate < earliestEndDate)) {
                        earliestEndDate = fireEndDate;
                      }
                      if (burglaryEndDate && (!earliestEndDate || burglaryEndDate < earliestEndDate)) {
                        earliestEndDate = burglaryEndDate;
                      }
                    }
                    
                    // Fallback to inward data if no inspection insurance found
                    if (!earliestEndDate) {
                      const fireEnd = selectedRowForSR.firePolicyEnd ? new Date(selectedRowForSR.firePolicyEnd) : null;
                      const burglaryEnd = selectedRowForSR.burglaryPolicyEnd ? new Date(selectedRowForSR.burglaryPolicyEnd) : null;
                      
                      if (fireEnd && (!earliestEndDate || fireEnd < earliestEndDate)) earliestEndDate = fireEnd;
                      if (burglaryEnd && (!earliestEndDate || burglaryEnd < earliestEndDate)) earliestEndDate = burglaryEnd;
                    }
                    
                    return earliestEndDate ? earliestEndDate.toLocaleDateString() : '';
                  })()} readOnly />
                </div>
              </div>
              {/* Insurance Expiry Check */}
              {isInsuranceExpired(selectedRowForSR) && (
                <div className="bg-red-100 text-red-700 p-2 rounded font-semibold">
                  Insurance is expired. Please update the end date before approval.
                </div>
              )}
              {/* Hologram No and QR space */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="font-semibold">Hologram No</Label>
                  <Input 
                    placeholder="Enter Hologram No"
                    value={hologramNumber}
                    onChange={e => setHologramNumber(e.target.value)}
                    readOnly={isFormApproved}
                  />
                </div>
                <div className="w-40 h-20 border-2 border-dashed border-gray-400 flex items-center justify-center ml-4">
                  <span className="text-xs text-gray-400">QR Sticker Space</span>
                </div>
              </div>
              {/* Insurance Details */}
              <div>
                <Label className="font-semibold">Insurance Details (from Inspection)</Label>
                {inspectionInsuranceData.length > 0 ? (
                  inspectionInsuranceData.map((insurance, index) => (
                    <div key={insurance.id || index} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <h6 className="font-medium text-blue-600 mb-2">Insurance Entry {index + 1}</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Insurance Taken By</Label>
                          <Input value={insurance.insuranceTakenBy || ''} readOnly className="text-sm" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Commodity</Label>
                          <Input value={insurance.insuranceCommodity || ''} readOnly className="text-sm" />
                        </div>
                        {insurance.insuranceTakenBy === 'client' && (
                          <>
                            <div>
                              <Label className="text-sm font-medium">Client Name</Label>
                              <Input value={insurance.clientName || ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Client Address</Label>
                              <Input value={insurance.clientAddress || ''} readOnly className="text-sm" />
                            </div>
                          </>
                        )}
                        {insurance.insuranceTakenBy === 'bank' && (
                          <div>
                            <Label className="text-sm font-medium">Bank Name</Label>
                            <Input value={insurance.selectedBankName || ''} readOnly className="text-sm" />
                          </div>
                        )}
                        {insurance.insuranceTakenBy && insurance.insuranceTakenBy !== 'bank' && (
                          <>
                            <div>
                              <Label className="text-sm font-medium">Fire Policy Company</Label>
                              <Input value={insurance.firePolicyCompanyName || ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Fire Policy Number</Label>
                              <Input value={insurance.firePolicyNumber || ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Fire Policy Amount</Label>
                              <Input value={insurance.firePolicyAmount ? `₹${insurance.firePolicyAmount}` : ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Fire Policy End Date</Label>
                              <Input value={insurance.firePolicyEndDate ? new Date(insurance.firePolicyEndDate).toLocaleDateString() : ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Burglary Policy Company</Label>
                              <Input value={insurance.burglaryPolicyCompanyName || ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Burglary Policy Number</Label>
                              <Input value={insurance.burglaryPolicyNumber || ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Burglary Policy Amount</Label>
                              <Input value={insurance.burglaryPolicyAmount ? `₹${insurance.burglaryPolicyAmount}` : ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Burglary Policy End Date</Label>
                              <Input value={insurance.burglaryPolicyEndDate ? new Date(insurance.burglaryPolicyEndDate).toLocaleDateString() : ''} readOnly className="text-sm" />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm">No insurance data found in inspection</div>
                )}
              </div>
              {/* Margin and Dotted Line */}
              <div className="my-8">
                <hr className="border-t-2 border-dotted border-gray-400" />
              </div>
              {/* Agrogreen Logo and Test Certificate (Modal View) */}
              <div className="relative flex flex-col items-center justify-center my-8">
                <img src="/AGlogo.webp" alt="Agrogreen Logo" style={{ width: 280, height: 'auto', marginBottom: 8 }} />
                <div className="text-base font-bold text-center tracking-wide mb-8" style={{ letterSpacing: 1 }}>TEST CERTIFICATE</div>
                <img src="/AGlogo.webp" alt="Agrogreen Logo Small" style={{ width: 48, height: 'auto', position: 'absolute', right: 0, bottom: 0, opacity: 0.7 }} />
                {/* FROM SECTION */}
                <div className="w-full max-w-2xl mx-auto mt-8 mb-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="font-semibold mb-1">Client Name</Label>
                      <Input readOnly value={selectedRowForSR?.client || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">Commodity Name</Label>
                      <Input readOnly value={selectedRowForSR?.commodity || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">Warehouse Name</Label>
                      <Input readOnly value={selectedRowForSR?.warehouseName || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">Warehouse Address</Label>
                      <Input readOnly value={selectedRowForSR?.warehouseAddress || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">Total Number of Bags</Label>
                      <Input readOnly value={selectedRowForSR?.totalBags || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">CAD No</Label>
                      <Input readOnly value={selectedRowForSR?.cadNumber || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">Date of Sampling</Label>
                      <Input readOnly value={selectedRowForSR?.dateOfSampling || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">Date of Testing</Label>
                      <Input readOnly value={selectedRowForSR?.dateOfTesting || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                  </div>
                </div>
                {/* Disclaimer */}
                {/* <div className="w-full max-w-2xl mx-auto text-xs text-gray-600 mb-4 text-justify">
                  This Report is given to you on the base of best tesing ability. Any discrepancy found in the report should be brought to our notice  within 48 hours of Receipt of the report. The above results are valid for the date and time of sampling and testing only. Total liability or any claim arising out of this report is limited to the invoiced amount only.
                </div> */}
                {/* Analysis Statement */}
                <div className="w-full max-w-2xl mx-auto text-center font-semibold text-sm mb-4">
                  THE ABOVE SAMPLE WAS ANALYZED BY US AND THE RESULTS ARE FOLLOWS
                </div>
                {/* Quality Parameters Table */}
                <div className="w-full max-w-2xl mx-auto mb-8">
                  <Label className="block font-semibold mb-2 text-green-700">Quality Parameters (from Commodity & Variety)</Label>
                  <div className="overflow-x-auto max-w-lg">
                    <table className="min-w-full border border-green-300 rounded-lg">
                      <thead className="bg-orange-100 text-orange-600 font-bold">
                        <tr>
                          <th className="px-4 py-2 border-green-300 border">Parameter</th>
                          <th className="px-4 py-2 border-green-300 border">Min %</th>
                          <th className="px-4 py-2 border-green-300 border">Max %</th>
                          <th className="px-4 py-2 border-green-300 border">Actual (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Find particulars for the selectedRowForSR
                          const commodity = commodities.find((c: any) => c.commodityName === selectedRowForSR?.commodity);
                          const variety = commodity?.varieties?.find((v: any) => v.varietyName === selectedRowForSR?.varietyName);
                          const particulars = variety?.particulars || [];
                          return particulars.length > 0 ? (
                            particulars.map((p: any, idx: number) => (
                              <tr key={idx} className="text-green-800">
                                <td className="px-4 py-2 border-green-300 border">{p.name}</td>
                                <td className="px-4 py-2 border-green-300 border">{p.minPercentage}</td>
                                <td className="px-4 py-2 border-green-300 border">{p.maxPercentage}</td>
                                <td className="px-4 py-2 border-green-300 border">
                                  <Input
                                    type="number"
                                    value={selectedRowForSR?.labResults?.[idx] || ''}
                                    readOnly
                                    className="w-24 bg-white border border-green-300 text-center"
                              />
                            </td>
                          </tr>
                            ))
                          ) : (
                          <tr><td colSpan={4} className="text-center text-gray-400 py-2">No quality parameters found for this variety.</td></tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Footer Section */}
                <div className="w-full max-w-2xl mx-auto flex justify-between items-end mt-8 mb-2">
                  <div className="text-xs font-semibold text-left">THE QUALITY OF GOODS IS AVERAGE</div>
                  <div className="flex flex-col items-end">
                    <div className="text-xs font-bold mb-1">AGROGREEN WAREHOUSING PRIVATE LIMITED</div>
                    <div className="w-40 h-20 border-2 border-dashed border-gray-400 flex items-center justify-center mb-1">
                      <span className="text-[10px] text-gray-400">Stamp</span>
                    </div>
                    <div className="text-[10px] font-semibold">AUTHORIZED SIGNATORY</div>
                  </div>
                </div>
              </div>
              {/* Approve/Reject/Resubmit Buttons */}
              {!isFormApproved && (
                <div className="flex gap-4 mt-4 justify-end">
                <Button
                  onClick={() => handleApproveSR(selectedRowForSR)}
                  disabled={isInsuranceExpired(selectedRowForSR)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                      {selectedRowForSR.receiptType === 'WR' ? 'Proceed to WR' : 'Proceed to SR'}
                </Button>
                <Button
                  onClick={() => handleRejectSR(selectedRowForSR)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => handleResubmitSR(selectedRowForSR)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  Resubmit
                </Button>
              </div>
              )}
              {/* Print Button - Only show after approval */}
              {isFormApproved && (
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={handlePrint}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
                  >
                    Print Receipt
                  </Button>
                </div>
              )}
              {/* Hidden printRef for PDF export */}
              {isFormApproved && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
                  <div ref={printRef} style={{ width: 700, padding: 32, fontFamily: 'Arial, sans-serif', color: '#222', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px #e0f2e9' }}>
                    {/* Header */}
                    <div style={{ background: '#1aad4b', color: '#fff', borderRadius: 12, padding: '18px 0', textAlign: 'center', marginBottom: 24, fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>{selectedRowForSR?.receiptType === 'WR' ? 'Warehouse Receipt' : 'Stock Receipt'}</div>
                    {/* Top Row: CAD, SR/WR No, Date */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#17803c', marginBottom: 2, fontSize: 13 }}>CAD No</div>
                        <div style={{ border: '1px solid #1aad4b', borderRadius: 8, padding: '0 12px', height: 40, lineHeight: '40px', marginBottom: 6, fontSize: 16, color: '#17803c', background: '#f8fff5', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontWeight: 600, textAlign: 'center' }}>{selectedRowForSR.cadNumber || ''}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#17803c', marginBottom: 2, fontSize: 13 }}>{selectedRowForSR.receiptType === 'WR' ? 'WR No' : 'SR No'}</div>
                        <div style={{ border: '1px solid #1aad4b', borderRadius: 8, padding: '0 12px', height: 40, lineHeight: '40px', marginBottom: 6, fontSize: 16, color: '#17803c', background: '#f8fff5', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontWeight: 600, textAlign: 'center' }}>{selectedRowForSR.srNo || `${selectedRowForSR.receiptType === 'WR' ? 'WR' : 'SR'}-${selectedRowForSR.inwardId || 'XXX'}-${selectedRowForSR.dateOfInward ? selectedRowForSR.dateOfInward.replace(/-/g, '') : ''}`}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#17803c', marginBottom: 2, fontSize: 13 }}>{selectedRowForSR.receiptType === 'WR' ? 'WR Generation Date' : 'SR Generation Date'}</div>
                        <div style={{ border: '1px solid #1aad4b', borderRadius: 8, padding: '0 12px', height: 40, lineHeight: '40px', marginBottom: 6, fontSize: 16, color: '#17803c', background: '#f8fff5', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontWeight: 600, textAlign: 'center' }}>{srGenerationDate || ''}</div>
                      </div>
                    </div>
                    {/* Stock Inward Date */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 500, color: '#17803c', marginBottom: 2, fontSize: 13 }}>Stock Inward Date</div>
                      <div style={{ border: '1px solid #1aad4b', borderRadius: 8, padding: '0 12px', height: 40, lineHeight: '40px', fontSize: 16, color: '#17803c', background: '#f8fff5', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontWeight: 600, textAlign: 'center' }}>{selectedRowForSR.dateOfInward || ''}</div>
                    </div>
                    {/* Bank, Warehouse, Client, Commodity Details */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#17803c', marginBottom: 2, fontSize: 13 }}>Bank Details</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px', marginBottom: 4 }}>{selectedRowForSR.bankName || ''}</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px', marginBottom: 4 }}>{selectedRowForSR.bankBranch || ''}</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px' }}>{selectedRowForSR.ifscCode || ''}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#17803c', marginBottom: 2, fontSize: 13 }}>Warehouse Details</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px', marginBottom: 4 }}>{selectedRowForSR.warehouseName || ''}</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px', marginBottom: 4 }}>{selectedRowForSR.warehouseCode || ''}</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px' }}>{selectedRowForSR.warehouseAddress || ''}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#17803c', marginBottom: 2, fontSize: 13 }}>Client Details</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px', marginBottom: 4 }}>{selectedRowForSR.client || ''}</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px', marginBottom: 4 }}>{selectedRowForSR.clientCode || ''}</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px' }}>{selectedRowForSR.clientAddress || ''}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#17803c', marginBottom: 2, fontSize: 13 }}>Commodity Details</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px', marginBottom: 4 }}>{selectedRowForSR.commodity || ''}</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px' }}>{selectedRowForSR.varietyName || ''}</div>
                      </div>
                    </div>
                    {/* Bags and Quantity */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#17803c', marginBottom: 2, fontSize: 13 }}>No. of Bags</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px' }}>{selectedRowForSR.totalBags || ''}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#17803c', marginBottom: 2, fontSize: 13 }}>Total Quantity (MT)</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px' }}>{selectedRowForSR.totalQuantity || ''}</div>
                      </div>
                    </div>
                    {/* Validity Dates */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#17803c', marginBottom: 2, fontSize: 13 }}>Validity Start Date</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px' }}>{selectedRowForSR.dateOfInward || ''}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#17803c', marginBottom: 2, fontSize: 13 }}>Validity End Date (Insurance End)</div>
                        <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px' }}>{(() => {
                          let earliestEndDate: Date | null = null;
                          for (const insurance of inspectionInsuranceData) {
                            const fireEndDate = insurance.firePolicyEndDate ? new Date(insurance.firePolicyEndDate) : null;
                            const burglaryEndDate = insurance.burglaryPolicyEndDate ? new Date(insurance.burglaryPolicyEndDate) : null;
                            if (fireEndDate && (!earliestEndDate || fireEndDate < earliestEndDate)) earliestEndDate = fireEndDate;
                            if (burglaryEndDate && (!earliestEndDate || burglaryEndDate < earliestEndDate)) earliestEndDate = burglaryEndDate;
                          }
                          if (!earliestEndDate) {
                            const fireEnd = selectedRowForSR.firePolicyEnd ? new Date(selectedRowForSR.firePolicyEnd) : null;
                            const burglaryEnd = selectedRowForSR.burglaryPolicyEnd ? new Date(selectedRowForSR.burglaryPolicyEnd) : null;
                            if (fireEnd && (!earliestEndDate || fireEnd < earliestEndDate)) earliestEndDate = fireEnd;
                            if (burglaryEnd && (!earliestEndDate || burglaryEnd < earliestEndDate)) earliestEndDate = burglaryEnd;
                          }
                          return earliestEndDate ? earliestEndDate.toLocaleDateString() : '';
                        })()}</div>
                      </div>
                    </div>
                    {/* Hologram No */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 500, color: '#17803c', marginBottom: 2, fontSize: 13 }}>Hologram No</div>
                      <div style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: '6px 12px', fontWeight: 600 }}>{hologramNumber}</div>
                    </div>
                    {/* Insurance Details */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 500, color: '#17803c', marginBottom: 2, fontSize: 13 }}>Insurance Details (from Inspection)</div>
                      {inspectionInsuranceData.length > 0 ? (
                        inspectionInsuranceData.map((insurance, index) => (
                          <div key={insurance.id || index} style={{ border: '1px solid #b2e2c7', borderRadius: 8, padding: 12, marginBottom: 8, background: '#f8fff5' }}>
                            <div style={{ fontWeight: 600, color: '#17803c', marginBottom: 4 }}>Entry {index + 1}</div>
                            <div style={{ display: 'flex', gap: 12 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>Insurance Taken By</div>
                                <div style={{ fontWeight: 600 }}>{insurance.insuranceTakenBy}</div>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>Commodity</div>
                                <div style={{ fontWeight: 600 }}>{insurance.insuranceCommodity}</div>
                                {insurance.insuranceTakenBy === 'client' && <><div style={{ fontWeight: 500, fontSize: 13 }}>Client Name</div><div style={{ fontWeight: 600 }}>{insurance.clientName}</div><div style={{ fontWeight: 500, fontSize: 13 }}>Client Address</div><div style={{ fontWeight: 600 }}>{insurance.clientAddress}</div></>}
                                {insurance.insuranceTakenBy === 'bank' && <><div style={{ fontWeight: 500, fontSize: 13 }}>Bank Name</div><div style={{ fontWeight: 600 }}>{insurance.selectedBankName}</div></>}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>Fire Policy Company</div>
                                <div style={{ fontWeight: 600 }}>{insurance.firePolicyCompanyName}</div>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>Fire Policy Number</div>
                                <div style={{ fontWeight: 600 }}>{insurance.firePolicyNumber}</div>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>Fire Policy Amount</div>
                                <div style={{ fontWeight: 600 }}>{insurance.firePolicyAmount}</div>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>Fire Policy End Date</div>
                                <div style={{ fontWeight: 600 }}>{insurance.firePolicyEndDate ? new Date(insurance.firePolicyEndDate).toLocaleDateString() : ''}</div>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>Burglary Policy Company</div>
                                <div style={{ fontWeight: 600 }}>{insurance.burglaryPolicyCompanyName}</div>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>Burglary Policy Number</div>
                                <div style={{ fontWeight: 600 }}>{insurance.burglaryPolicyNumber}</div>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>Burglary Policy Amount</div>
                                <div style={{ fontWeight: 600 }}>{insurance.burglaryPolicyAmount}</div>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>Burglary Policy End Date</div>
                                <div style={{ fontWeight: 600 }}>{insurance.burglaryPolicyEndDate ? new Date(insurance.burglaryPolicyEndDate).toLocaleDateString() : ''}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: '#888' }}>No insurance data found in inspection</div>
                      )}
                    </div>
                    {/* Margin and Dotted Line */}
                    <div style={{ margin: '32px 0' }}>
                      <hr style={{ borderTop: '2px dotted #888', width: '100%' }} />
                    </div>
                    {/* Agrogreen Logo and Test Certificate (PDF/Print View) */}
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '32px 0 16px 0' }}>
                      <img src="/AGlogo.webp" alt="Agrogreen Logo" style={{ width: 280, height: 'auto', marginBottom: 8 }} />
                      <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'center', letterSpacing: 1, marginBottom: 32 }}>TEST CERTIFICATE</div>
                      <img src="/AGlogo.webp" alt="Agrogreen Logo Small" style={{ width: 48, height: 'auto', position: 'absolute', right: 0, bottom: 0, opacity: 0.7 }} />
                      {/* FROM SECTION */}
                      <div style={{ width: '100%', maxWidth: 500, margin: '32px auto 16px auto', border: '1px solid #eee', borderRadius: 8, padding: 16, background: '#f8f8f8', fontSize: 12 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>Client Name</div>
                            <div style={{ border: '1px solid #2ecc40', borderRadius: 6, padding: 6, background: '#fff', color: '#17803c' }}>{selectedRowForSR?.client || ''}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>Commodity Name</div>
                            <div style={{ border: '1px solid #2ecc40', borderRadius: 6, padding: 6, background: '#fff', color: '#17803c' }}>{selectedRowForSR?.commodity || ''}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>Warehouse Name</div>
                            <div style={{ border: '1px solid #2ecc40', borderRadius: 6, padding: 6, background: '#fff', color: '#17803c' }}>{selectedRowForSR?.warehouseName || ''}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>Warehouse Address</div>
                            <div style={{ border: '1px solid #2ecc40', borderRadius: 6, padding: 6, background: '#fff', color: '#17803c' }}>{selectedRowForSR?.warehouseAddress || ''}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>Total Number of Bags</div>
                            <div style={{ border: '1px solid #2ecc40', borderRadius: 6, padding: 6, background: '#fff', color: '#17803c' }}>{selectedRowForSR?.totalBags || ''}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>CAD No</div>
                            <div style={{ border: '1px solid #2ecc40', borderRadius: 6, padding: 6, background: '#fff', color: '#17803c' }}>{selectedRowForSR?.cadNumber || ''}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>Date of Sampling</div>
                            <div style={{ border: '1px solid #2ecc40', borderRadius: 6, padding: 6, background: '#fff', color: '#17803c' }}>{selectedRowForSR?.dateOfSampling || ''}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>Date of Testing</div>
                            <div style={{ border: '1px solid #2ecc40', borderRadius: 6, padding: 6, background: '#fff', color: '#17803c' }}>{selectedRowForSR?.dateOfTesting || ''}</div>
                          </div>
                        </div>
                      </div>
                      {/* Disclaimer */}
                      <div style={{ width: '100%', maxWidth: 500, margin: '0 auto 16px auto', fontSize: 10, color: '#666', textAlign: 'justify' }}>
                        This Report is given to you on the base of best tesing ability. Any discrepancy found in the report should be brought to our notice  within 48 hours of Receipt of the report. The above results are valid for the date and time of sampling and testing only. Total liability or any claim arising out of this report is limited to the invoiced amount only.
                      </div>
                      {/* Analysis Statement */}
                      <div style={{ width: '100%', maxWidth: 500, margin: '0 auto 16px auto', fontWeight: 600, fontSize: 12, textAlign: 'center' }}>
                        THE ABOVE SAMPLE WAS ANALYZED BY US AND THE RESULTS ARE FOLLOWS
                      </div>
                      {/* Quality Parameters Table */}
                      <div style={{ width: '100%', maxWidth: 500, margin: '0 auto 32px auto' }}>
                        <div style={{ fontWeight: 600, color: '#17803c', marginBottom: 6 }}>Quality Parameters (from Commodity & Variety)</div>
                        <table style={{ width: '100%', border: '1px solid #2ecc40', borderCollapse: 'collapse', fontSize: 11 }}>
                          <thead>
                            <tr style={{ background: '#fff5e6' }}>
                              <th style={{ border: '1px solid #2ecc40', padding: 8, color: '#e67c1f', fontWeight: 700 }}>Parameter</th>
                              <th style={{ border: '1px solid #2ecc40', padding: 8, color: '#e67c1f', fontWeight: 700 }}>Min %</th>
                              <th style={{ border: '1px solid #2ecc40', padding: 8, color: '#e67c1f', fontWeight: 700 }}>Max %</th>
                              <th style={{ border: '1px solid #2ecc40', padding: 8, color: '#e67c1f', fontWeight: 700 }}>Actual (%)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const commodity = commodities.find((c) => c.commodityName === selectedRowForSR?.commodity);
                              const variety = commodity?.varieties?.find((v: any) => v.varietyName === selectedRowForSR?.varietyName);
                              const particulars = variety?.particulars || [];
                              return particulars.length > 0 ? (
                                particulars.map((p: any, idx: number) => {
                                  const actualValue = (selectedRowForSR?.labResults && selectedRowForSR.labResults[idx] !== undefined && selectedRowForSR.labResults[idx] !== null)
                                    ? selectedRowForSR.labResults[idx]
                                    : '';
                                    // console.log(
                                    //   actualValue
                                    // );
                                    
                                  return (
                                    <tr key={idx} style={{ color: '#17803c' }}>
                                      <td style={{ border: '1px solid #2ecc40', padding: 8 }}>{p.name}</td>
                                      <td style={{ border: '1px solid #2ecc40', padding: 8 }}>{p.minPercentage}</td>
                                      <td style={{ border: '1px solid #2ecc40', padding: 8 }}>{p.maxPercentage}</td>
                                      <td style={{ border: '1px solid #2ecc40', padding: 8 }}>
                                        <div style={{ width: 60, border: '1px solid #2ecc40', borderRadius: 6, padding: 4, textAlign: 'center', background: '#fff', minHeight: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          {actualValue}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#bbb', padding: 8 }}>No quality parameters found for this variety.</td></tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                      {/* Footer Section */}
                      <div style={{ width: '100%', maxWidth: 500, margin: '32px auto 0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div style={{ fontSize: 10, fontWeight: 600, textAlign: 'left' }}>THE QUALITY OF GOODS IS AVERAGE</div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>AGROGREEN WAREHOUSING PRIVATE LIMITED</div>
                          <div style={{ width: 120, height: 56, border: '2px dashed #bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 8, color: '#bbb' }}>Stamp</span>
                          </div>
                          <div style={{ fontSize: 8, fontWeight: 600 }}>AUTHORIZED SIGNATORY</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Insurance Seal/Stamp and Company Info */}
              <div className="flex justify-between items-end mt-8">
                <div>
                  {/* <div className="font-bold text-lg">TEST certificate</div> */}
                </div>
                <div className="flex flex-col items-end">
                  
                  {/* <div className="text-sm font-semibold">{process.env.NEXT_PUBLIC_COMPANY_NAME || 'Company Name'}</div> */}
                  {/* <div className="text-xs text-gray-500">{process.env.NEXT_PUBLIC_COMPANY_LOCATION || 'Location'}</div> */}
                  </div>
                </div>
              {/* Disclaimer at the very end */}
              <div className="w-full max-w-2xl mx-auto text-xs text-gray-600 mt-8 mb-2 text-justify border-t pt-4">
                This Report is given to you on the base of best tesing ability. Any discrepancy found in the report should be brought to our notice within 48 hours of Receipt of the report. The above results are valid for the date and time of sampling and testing only. Total liability or any claim arising out of this report is limited to the invoiced amount only.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}