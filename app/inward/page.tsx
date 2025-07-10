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
import { Search, Download, Plus, Edit, Trash2, Eye, Printer } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/data-table';
import { uploadToCloudinary } from '@/lib/cloudinary';
import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [hologramNumber, setHologramNumber] = useState('');
  const [isFormApproved, setIsFormApproved] = useState(false);
  const [srGenerationDate, setSrGenerationDate] = useState('');
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [dataVersion, setDataVersion] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileAttachment, setFileAttachment] = useState<File | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

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
          <Button
            onClick={() => handleViewSR(row.original)}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
          >
            <Eye className="h-4 w-4" />
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
    // Reset form state
    setHologramNumber('');
    setIsFormApproved(false);
    setSrGenerationDate('');
    
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
    // Validate hologram number
    if (!hologramNumber.trim()) {
      toast({
        title: "Hologram Number Required",
        description: "Please enter the hologram number before proceeding.",
        variant: "destructive",
      });
      return;
    }

    // Set approval state and generation date
    setIsFormApproved(true);
    setSrGenerationDate(new Date().toLocaleDateString());
    
    toast({
      title: "Approved Successfully",
      description: "The receipt has been approved and is now ready for printing.",
      variant: "default",
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

  // Static print-friendly receipt component
  const inputBoxStyle: React.CSSProperties = {
    border: '1px solid #1aad4b',
    borderRadius: 8,
    padding: '0 12px',
    height: 40,
    lineHeight: '40px',
    marginBottom: 6,
    fontSize: 16,
    color: '#17803c',
    background: '#f8fff5',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontWeight: 600,
    textAlign: 'center',
  };

  const labelStyle = {
    fontWeight: 500,
    color: '#17803c',
    marginBottom: 2,
    fontSize: 13,
    letterSpacing: 0.2,
  };

  const sectionStyle = {
    background: '#eafbe7',
    borderRadius: 10,
    padding: '14px 18px',
    marginBottom: 14,
    boxShadow: '0 1px 4px #e0f2e9',
  };

  const dividerStyle = {
    border: 'none',
    borderTop: '2px solid #1aad4b',
    margin: '18px 0',
  };

  const StaticReceipt = React.forwardRef<HTMLDivElement, { data: any, insurance: any[], hologramNumber: string, srGenerationDate: string }>(
    ({ data, insurance, hologramNumber, srGenerationDate }, ref) => (
      <div ref={ref} style={{ width: 700, padding: 32, fontFamily: 'Arial, sans-serif', color: '#222', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px #e0f2e9' }}>
        <div style={{ background: '#1aad4b', color: '#fff', borderRadius: 12, padding: '18px 0', textAlign: 'center', marginBottom: 24, fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>Stock/Warehouse Receipt</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>CAD No</div>
            <div style={inputBoxStyle}>{data.cadNumber || ''}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>SR No</div>
            <div style={inputBoxStyle}>{data.srNo || `SR-${data.inwardId || 'XXX'}-${data.dateOfInward ? data.dateOfInward.replace(/-/g, '') : ''}`}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>SR Generation Date</div>
            <div style={inputBoxStyle}>{srGenerationDate || ''}</div>
          </div>
        </div>
        <div style={sectionStyle}>
          <div style={{ marginBottom: 8 }}>
            <div style={labelStyle}>Stock Inward Date</div>
            <div style={inputBoxStyle}>{data.dateOfInward || ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Bank Details</div>
              <div style={inputBoxStyle}>{data.bankName}</div>
              <div style={inputBoxStyle}>{data.bankBranch}</div>
              <div style={inputBoxStyle}>{data.ifscCode}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Warehouse Details</div>
              <div style={inputBoxStyle}>{data.warehouseName}</div>
              <div style={inputBoxStyle}>{data.warehouseCode}</div>
              <div style={inputBoxStyle}>{data.warehouseAddress}</div>
            </div>
          </div>
        </div>
        <div style={sectionStyle}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Client Details</div>
              <div style={inputBoxStyle}>{data.client}</div>
              <div style={inputBoxStyle}>{data.clientCode}</div>
              <div style={inputBoxStyle}>{data.clientAddress}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Commodity Details</div>
              <div style={inputBoxStyle}>{data.commodity}</div>
              <div style={inputBoxStyle}>{data.varietyName}</div>
            </div>
          </div>
        </div>
        <div style={sectionStyle}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>No. of Bags</div>
              <div style={inputBoxStyle}>{data.totalBags}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Total Quantity (MT)</div>
              <div style={inputBoxStyle}>{data.totalQuantity}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Validity Start Date</div>
              <div style={inputBoxStyle}>{data.dateOfInward || ''}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Validity End Date (Insurance End)</div>
              <div style={inputBoxStyle}></div>
            </div>
          </div>
        </div>
        <div style={sectionStyle}>
          <div style={labelStyle}>Hologram No</div>
          <div style={inputBoxStyle}>{hologramNumber}</div>
        </div>
        <div style={sectionStyle}>
          <div style={labelStyle}>Insurance Details (from Inspection)</div>
          {insurance.length > 0 ? insurance.map((ins, idx) => (
            <div key={ins.id || idx} style={{ border: '1px solid #b2e2c7', borderRadius: 6, padding: 10, margin: 6, background: '#fff' }}>
              <div style={{ fontWeight: 600, color: '#17803c', marginBottom: 4 }}>Entry {idx + 1}</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>Insurance Taken By</div>
                  <div style={inputBoxStyle}>{ins.insuranceTakenBy}</div>
                  <div style={labelStyle}>Commodity</div>
                  <div style={inputBoxStyle}>{ins.insuranceCommodity}</div>
                  {ins.insuranceTakenBy === 'client' && <><div style={labelStyle}>Client Name</div><div style={inputBoxStyle}>{ins.clientName}</div><div style={labelStyle}>Client Address</div><div style={inputBoxStyle}>{ins.clientAddress}</div></>}
                  {ins.insuranceTakenBy === 'bank' && <><div style={labelStyle}>Bank Name</div><div style={inputBoxStyle}>{ins.selectedBankName}</div></>}
                </div>
                <div style={{ flex: 1 }}>
                  {ins.insuranceTakenBy && ins.insuranceTakenBy !== 'bank' && <>
                    <div style={labelStyle}>Fire Policy Company</div>
                    <div style={inputBoxStyle}>{ins.firePolicyCompanyName}</div>
                    <div style={labelStyle}>Fire Policy Number</div>
                    <div style={inputBoxStyle}>{ins.firePolicyNumber}</div>
                    <div style={labelStyle}>Fire Policy Amount</div>
                    <div style={inputBoxStyle}>{ins.firePolicyAmount}</div>
                    <div style={labelStyle}>Fire Policy End Date</div>
                    <div style={inputBoxStyle}>{ins.firePolicyEndDate && new Date(ins.firePolicyEndDate).toLocaleDateString()}</div>
                    <div style={labelStyle}>Burglary Policy Company</div>
                    <div style={inputBoxStyle}>{ins.burglaryPolicyCompanyName}</div>
                    <div style={labelStyle}>Burglary Policy Number</div>
                    <div style={inputBoxStyle}>{ins.burglaryPolicyNumber}</div>
                    <div style={labelStyle}>Burglary Policy Amount</div>
                    <div style={inputBoxStyle}>{ins.burglaryPolicyAmount}</div>
                    <div style={labelStyle}>Burglary Policy End Date</div>
                    <div style={inputBoxStyle}>{ins.burglaryPolicyEndDate && new Date(ins.burglaryPolicyEndDate).toLocaleDateString()}</div>
                  </>}
                </div>
              </div>
            </div>
          )) : <span style={{ color: '#888' }}>No insurance data found in inspection</span>}
        </div>
        <hr style={dividerStyle} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#17803c' }}>Signature</div>
            <div style={{ width: 180, height: 32, borderBottom: '2px solid #1aad4b', marginTop: 8 }}></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <b>Company:</b> {process.env.NEXT_PUBLIC_COMPANY_NAME || 'Company Name'}<br />
            <span style={{ fontSize: 13, color: '#17803c' }}>{process.env.NEXT_PUBLIC_COMPANY_LOCATION || 'Location'}</span>
          </div>
        </div>
      </div>
    )
  );

  // Update generatePDF to use printRef
  const generatePDF = async () => {
    try {
      const element = printRef.current;
      if (!element) {
        toast({
          title: "Error",
          description: "Could not find the receipt form element.",
          variant: "destructive",
        });
        return;
      }
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#fff',
        width: 700
      });
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
      toast({
        title: "PDF Generated",
        description: "The receipt PDF has been downloaded successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  StaticReceipt.displayName = 'StaticReceipt';

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
                
                <div className="space-y-6">
                  {insuranceEntries.map((insurance, index) => (
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
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
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
                        {getSelectedVarietyParticulars().map((p: any, idx: number) => (
                          <tr key={idx} className="text-green-800">
                            <td className="px-4 py-2 border-green-300 border">{p.name}</td>
                            <td className="px-4 py-2 border-green-300 border">{p.minPercentage}</td>
                            <td className="px-4 py-2 border-green-300 border">{p.maxPercentage}</td>
                            <td className="px-4 py-2 border-green-300 border">
                              <Input
                                type="number"
                                value={currentEntryForm.labResults?.[idx] || ''}
                                onChange={(e) => handleLabResultChange(idx, e.target.value)}
                                placeholder="0.00"
                                className={`w-full ${currentEntryForm.labResultsValidation?.[idx] === false ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                              />
                            </td>
                          </tr>
                        ))}
                        {getSelectedVarietyParticulars().length === 0 && (
                          <tr><td colSpan={4} className="text-center text-gray-400 py-2">No quality parameters found for this variety.</td></tr>
                        )}
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
            <DialogTitle className="text-green-700 text-xl">Stock/Warehouse Receipt View</DialogTitle>
          </DialogHeader>
          {selectedRowForSR && (
            <div id="receipt-form" className="space-y-4">
              {/* CAD No and SR No */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="font-semibold">CAD No</Label>
                  <Input value={selectedRowForSR.cadNumber || ''} readOnly />
                </div>
                <div className="flex-1">
                  <Label className="font-semibold">SR No</Label>
                  <Input value={selectedRowForSR.srNo || `SR-${selectedRowForSR.inwardId || 'XXX'}-${selectedRowForSR.dateOfInward ? selectedRowForSR.dateOfInward.replace(/-/g, '') : ''}`} readOnly />
                </div>
                <div className="flex-1">
                  <Label className="font-semibold">SR Generation Date</Label>
                  <Input value={srGenerationDate || ''} readOnly placeholder="Auto-set on Approve" />
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
                    let earliestEndDate = null;
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
                      
                      if (fireEnd && (!earliestEndDate || fireEnd < earliestEndDate)) {
                        earliestEndDate = fireEnd;
                      }
                      if (burglaryEnd && (!earliestEndDate || burglaryEnd < earliestEndDate)) {
                        earliestEndDate = burglaryEnd;
                      }
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
                    onChange={(e) => setHologramNumber(e.target.value)}
                    disabled={isFormApproved}
                  />
                </div>
                <div className="w-32 h-16 border-2 border-dashed border-gray-400 flex items-center justify-center ml-4">
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
              {/* Approve/Reject/Resubmit Buttons */}
              {!isFormApproved && (
              <div className="flex gap-4 mt-4">
                <Button
                  onClick={() => handleApproveSR(selectedRowForSR)}
                  disabled={isInsuranceExpired(selectedRowForSR)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                    Proceed to {selectedRowForSR?.receiptType || 'SR'}
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
                    onClick={generatePDF}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
                  >
                    <Printer className="mr-1 h-4 w-4" />
                    Print Receipt
                  </Button>
                </div>
              )}
              {/* Insurance Seal/Stamp and Company Info */}
              <div className="flex justify-between items-end mt-8">
                <div>
                  <div className="font-bold text-lg">TEST certificate</div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="w-32 h-16 border-2 border-dashed border-gray-400 flex items-center justify-center mb-2">
                    <span className="text-xs text-gray-400">Seal/Stamp</span>
                  </div>
                  <div className="text-sm font-semibold">{process.env.NEXT_PUBLIC_COMPANY_NAME || 'Company Name'}</div>
                  <div className="text-xs text-gray-500">{process.env.NEXT_PUBLIC_COMPANY_LOCATION || 'Location'}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {isFormApproved && selectedRowForSR && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
          <StaticReceipt
            ref={printRef}
            data={selectedRowForSR}
            insurance={inspectionInsuranceData}
            hologramNumber={hologramNumber}
            srGenerationDate={srGenerationDate}
          />
        </div>
      )}
    </DashboardLayout>
  );
}