"use client";

import DashboardLayout from '@/components/dashboard-layout';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Download, Plus, Edit, Trash2 } from "lucide-react";
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
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [dataVersion, setDataVersion] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileAttachment, setFileAttachment] = useState<File | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch inward data for the table
      const inwardCollection = collection(db, 'inward');
      const inwardSnap = await getDocs(inwardCollection);
      setInwardData(inwardSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })));

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
        if (data.warehouseName && (data.status === 'activate' || data.status === 'reactivate')) {
          // Use warehouse name as key to ensure uniqueness
          if (!warehouseMap.has(data.warehouseName)) {
            warehouseMap.set(data.warehouseName, data);
          }
        }
      });
      setWarehouses(Array.from(warehouseMap.values()));
      
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
    return warehouses.filter((w: any) => 
      w.location === form.location && 
      w.state === form.state && 
      w.branch === form.branch
    );
  }, [warehouses, form.location, form.state, form.branch]);

  // Auto-fill warehouse code/address and business type
  useEffect(() => {
    if (form.warehouseName) {
      const wh = filteredWarehouses.find((w: any) => w.warehouseName === form.warehouseName);
      if (wh) {
        setBaseForm(f => ({ 
          ...f, 
          warehouseCode: wh.warehouseCode || '', 
          warehouseAddress: wh.warehouseAddress || '',
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

  // Auto-fill client ID
  useEffect(() => {
    if (form.client) {
      const selectedClient = clients.find(c => c.firmName === form.client);
      if (selectedClient) {
        setBaseForm(f => ({ ...f, clientCode: selectedClient.clientId }));
      }
    } else {
      setBaseForm(f => ({ ...f, clientCode: '' }));
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
    setBaseForm(f => ({ 
      ...f, 
      commodity: commodityName,
      varietyName: '',
      marketRate: ''
    }));
    
    // Fetch insurance data based on current selections
    fetchInsuranceData(commodityName);
  };

  // Fetch insurance data based on selected criteria
  const fetchInsuranceData = (commodityName: string) => {
    if (!form.state || !form.branch || !form.location || !form.warehouseName || !commodityName) {
      return;
    }

    const matchingInsurance = insuranceData.find((insurance: any) => 
      insurance.state === form.state &&
      insurance.branch === form.branch &&
      insurance.location === form.location &&
      insurance.warehouse === form.warehouseName &&
      insurance.commodities && 
      insurance.commodities.includes(commodityName)
    );

    if (matchingInsurance) {
      setBaseForm(f => ({
        ...f,
        insuranceManagedBy: matchingInsurance.insuranceManagedBy || '',
        firePolicyNumber: matchingInsurance.firePolicyNumber || '',
        firePolicyAmount: matchingInsurance.firePolicyAmount || '',
        firePolicyStart: matchingInsurance.firePolicyStart || '',
        firePolicyEnd: matchingInsurance.firePolicyEnd || '',
        burglaryPolicyNumber: matchingInsurance.burglaryPolicyNumber || '',
        burglaryPolicyAmount: matchingInsurance.burglaryPolicyAmount || '',
        burglaryPolicyStart: matchingInsurance.burglaryPolicyStart || '',
        burglaryPolicyEnd: matchingInsurance.burglaryPolicyEnd || '',
        firePolicyCompanyName: matchingInsurance.firePolicyCompanyName || '',
        burglaryPolicyCompanyName: matchingInsurance.burglaryPolicyCompanyName || '',
        bankFundedBy: matchingInsurance.bankFundedBy || '',
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
      marketRate: variety?.rate ? `${variety.rate} Rs/MT` : ''
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
    
    if (!fileAttachment) {
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
      const uploadResult = await uploadToCloudinary(fileAttachment);
      uploadedFileUrl = uploadResult.secure_url;
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
    
    if (allEntries.length === 0) {
      alert('Please add at least one inward entry before saving.');
      return;
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
          labResults: entry.labResults || [], // Ensure labResults is saved as an array
        });
      }
      
      alert(`Successfully saved ${allEntries.length} inward entries.`);
      setShowAddModal(false);
      resetForm();
      setDataVersion(v => v + 1);
    } catch (error) {
      console.error('Error saving inward entries to Firebase:', error);
      alert('Error saving inward entries to Firebase. Please try again.');
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

  const handleModalChange = (open: boolean) => {
    setShowAddModal(open);
    if (!open) {
      resetForm();
    }
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
        item.client?.toLowerCase().includes(lowerCaseSearchTerm)
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
        <Button className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-lg font-semibold shadow-lg rounded-xl" onClick={() => setShowAddModal(true)}>
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
                placeholder="Search by state, branch, location, warehouse name, or client..."
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

      {/* Add Inward Modal */}
      <Dialog open={showAddModal} onOpenChange={handleModalChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-orange-700 text-xl">Add Inward</DialogTitle>
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
                <Select value={form.warehouseName} onValueChange={v => setBaseForm(f => ({ ...f, warehouseName: v }))} disabled={!form.location}>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    type="number"
                    step="0.01"
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
              <h3 className="text-lg font-semibold mb-6 text-orange-700">Bank Information (Optional)</h3>
              
              <div className="mb-6">
                <Label className="block font-semibold mb-2">Bank Name</Label>
                <Select value={form.bankName} onValueChange={handleBankChange}>
                  <SelectTrigger><SelectValue placeholder="Select Bank" /></SelectTrigger>
                  <SelectContent>
                    {banks.map((b: any) => (
                      <SelectItem key={b.bankName} value={b.bankName}>
                        {b.bankName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label className="block font-semibold mb-2">Bank Branch</Label>
                  <Input value={form.bankBranch} readOnly placeholder="Auto-filled" />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Bank State</Label>
                  <Input value={form.bankState} readOnly placeholder="Auto-filled" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block font-semibold mb-2">IFSC Code</Label>
                  <Input value={form.ifscCode} readOnly placeholder="Auto-filled" />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Base Receipt</Label>
                  <Input 
                    value={form.bankReceipt} 
                    onChange={e => setBaseForm(f => ({ ...f, bankReceipt: e.target.value }))} 
                    placeholder="Enter Base Receipt Number"
                  />
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
            {form.insuranceManagedBy && (
              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold mb-6 text-orange-700">Insurance Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="block font-semibold mb-1">Insurance Managed By</Label>
                    <Input value={form.insuranceManagedBy} readOnly placeholder="Auto-filled" />
                  </div>
                </div>

                {form.insuranceManagedBy !== 'bank' && (
                  <>
                    {/* Fire Policy */}
                    <h4 className="text-md font-semibold text-orange-600 mt-4 mb-2">Fire Policy Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label className="block font-semibold mb-1">Fire Policy Number</Label>
                        <Input value={form.firePolicyNumber} readOnly placeholder="Auto-filled" />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Fire Policy Amount</Label>
                        <Input value={form.firePolicyAmount} readOnly placeholder="Auto-filled" />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Fire Policy Start Date</Label>
                        <Input value={form.firePolicyStart} readOnly placeholder="Auto-filled" />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Fire Policy End Date</Label>
                        <Input value={form.firePolicyEnd} readOnly placeholder="Auto-filled" />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Fire Policy Company Name</Label>
                        <Input value={form.firePolicyCompanyName} readOnly placeholder="Auto-filled" />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Sum Insurance Balance Amount for Fire</Label>
                        <Input value={form.firePolicyBalance} readOnly placeholder="Auto-calculated" />
                      </div>
                    </div>

                    {/* Burglary Policy */}
                    <h4 className="text-md font-semibold text-orange-600 mt-4 mb-2">Burglary Policy Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="block font-semibold mb-1">Burglary Policy Number</Label>
                        <Input value={form.burglaryPolicyNumber} readOnly placeholder="Auto-filled" />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Burglary Policy Amount</Label>
                        <Input value={form.burglaryPolicyAmount} readOnly placeholder="Auto-filled" />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Burglary Policy Start Date</Label>
                        <Input value={form.burglaryPolicyStart} readOnly placeholder="Auto-filled" />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Burglary Policy End Date</Label>
                        <Input value={form.burglaryPolicyEnd} readOnly placeholder="Auto-filled" />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Burglary Policy Company Name</Label>
                        <Input value={form.burglaryPolicyCompanyName} readOnly placeholder="Auto-filled" />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Sum Insurance Balance Amount for Burglary</Label>
                        <Input value={form.burglaryPolicyBalance} readOnly placeholder="Auto-calculated" />
                      </div>
                    </div>
                  </>
                )}

                {form.insuranceManagedBy === 'bank' && form.bankFundedBy && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="block font-semibold mb-1">Bank Funded By</Label>
                      <Input value={form.bankFundedBy} readOnly placeholder="Auto-filled" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {form.commodity && !form.insuranceManagedBy && (
              <div className="border-t pt-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> No insurance data found for this commodity at the selected warehouse. 
                    Please ensure insurance data exists in the Insurance Master section.
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
                {isUploading ? 'Uploading & Saving...' : 'Add Inward Entry'}
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
    </DashboardLayout>
  );
}