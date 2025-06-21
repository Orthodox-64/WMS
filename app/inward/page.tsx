"use client";

import DashboardLayout from '@/components/dashboard-layout';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
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
    // New fields
    dateOfInward: '',
    cadNumber: '',
    license: '',
    commodity: '',
    varietyName: '',
    marketRate: '',
    bankName: '',
    bankBranch: '',
    bankState: '',
    ifscCode: '',
    bankReceipt: '',
    // Reservation fields
    billingStatus: '',
    reservationRate: '',
    reservationQty: '',
    reservationStart: '',
    reservationEnd: '',
    billingCycle: '',
    billingType: '',
    billingRate: '',
    // Insurance fields
    insuranceManagedBy: '',
    firePolicyNumber: '',
    firePolicyAmount: '',
    firePolicyStart: '',
    firePolicyEnd: '',
    burglaryPolicyNumber: '',
    burglaryPolicyAmount: '',
    burglaryPolicyStart: '',
    burglaryPolicyEnd: '',
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
    totalBags: '',
    totalQuantity: '',
    totalValue: '',
    averageWeight: '',
    stacks: [
      {
        stackNumber: '',
        numberOfBags: ''
      }
    ],
  });

  // Combined form for display
  const form = { ...baseForm, ...currentEntryForm };

  // Fetch all data on mount
  useEffect(() => {
    async function fetchData() {
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
    }
    fetchData();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate base form fields and collect missing fields
    const missingBaseFields = [];
    if (!form.state) missingBaseFields.push('State');
    if (!form.branch) missingBaseFields.push('Branch');
    if (!form.location) missingBaseFields.push('Location');
    if (!form.warehouseName) missingBaseFields.push('Warehouse Name');
    if (!form.client) missingBaseFields.push('Client Name');
    if (!form.dateOfInward) missingBaseFields.push('Date of Inward');
    if (!form.cadNumber) missingBaseFields.push('CAD Number');
    if (!form.license) missingBaseFields.push('License');
    if (!form.commodity) missingBaseFields.push('Commodity');
    if (!form.varietyName) missingBaseFields.push('Variety Name');
    if (!form.bankName) missingBaseFields.push('Bank Name');
    if (!form.bankReceipt) missingBaseFields.push('Bank Receipt');

    if (missingBaseFields.length > 0) {
      alert(`Please fill in the following required base fields:\n\n${missingBaseFields.join('\n')}`);
      return;
    }
    
    // Validate warehouse data
    if (!form.warehouseCode || !form.businessType) {
      const missingWarehouseFields = [];
      if (!form.warehouseCode) missingWarehouseFields.push('Warehouse Code');
      if (!form.businessType) missingWarehouseFields.push('Business Type');
      alert(`Warehouse data is incomplete. Please select a valid warehouse.\n\nMissing: ${missingWarehouseFields.join(', ')}`);
      return;
    }
    
    // Validate commodity data
    if (!form.marketRate) {
      alert('Market rate is missing. Please select a valid commodity variety.');
      return;
    }
    
    // Validate bank data
    const missingBankFields = [];
    if (!form.bankBranch) missingBankFields.push('Bank Branch');
    if (!form.bankState) missingBankFields.push('Bank State');
    if (!form.ifscCode) missingBankFields.push('IFSC Code');
    
    if (missingBankFields.length > 0) {
      alert(`Bank details are incomplete. Please select a valid bank.\n\nMissing: ${missingBankFields.join(', ')}`);
      return;
    }

    // If there are saved entries, validate current entry
    if (inwardEntries.length > 0) {
      const missingCurrentFields = [];
      if (!currentEntryForm.vehicleNumber) missingCurrentFields.push('Vehicle Number');
      if (!currentEntryForm.getpassNumber) missingCurrentFields.push('Getpass Number');
      if (!currentEntryForm.weightBridge) missingCurrentFields.push('Weight Bridge');
      if (!currentEntryForm.weightBridgeSlipNumber) missingCurrentFields.push('Weight Bridge Slip Number');
      if (!currentEntryForm.grossWeight) missingCurrentFields.push('Gross Weight');
      if (!currentEntryForm.tareWeight) missingCurrentFields.push('Tare Weight');
      if (!currentEntryForm.totalBags) missingCurrentFields.push('Total Bags');
      if (!currentEntryForm.totalQuantity) missingCurrentFields.push('Total Quantity');
      if (!currentEntryForm.totalValue) missingCurrentFields.push('Total Value');

      if (missingCurrentFields.length > 0) {
        alert(`Please fill in the following required fields for the current entry:\n\n${missingCurrentFields.join('\n')}`);
        return;
      }

      // Validate getpass number uniqueness for current entry
      const isGetpassDuplicate = inwardEntries.some(entry => 
        entry.getpassNumber === currentEntryForm.getpassNumber
      );
      
      if (isGetpassDuplicate) {
        alert('Getpass number must be unique. This getpass number has already been used in a previous entry.');
        return;
      }

      // Validate stack data
      if (!validateStackBags()) {
        alert('Total bags must equal the sum of all stack bags. Please check your entries.');
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
    }
    
    // Save current entry if it has data
    let allEntries = [...inwardEntries];
    if (currentEntryForm.vehicleNumber) {
      const currentEntry = {
        id: Date.now(),
        ...baseForm,
        ...currentEntryForm,
        entryNumber: inwardEntries.length + 1
      };
      allEntries.push(currentEntry);
    }

    // Validate that we have at least one entry to save
    if (allEntries.length === 0) {
      alert('Please add at least one inward entry before saving.');
      return;
    }
    
    try {
      // Save all entries to Firebase
      const inwardCollection = collection(db, 'inward');
      const savedEntries = [];
      
      for (const entry of allEntries) {
        // Generate unique inward ID for this entry
        const inwardId = await generateInwardId();
        
        // Prepare entry data for Firebase (remove React-specific fields)
        const entryData = {
          // Inward ID
          inwardId: inwardId,
          
          // Base form data
          state: entry.state || '-',
          branch: entry.branch || '-',
          location: entry.location || '-',
          warehouseName: entry.warehouseName || '-',
          warehouseCode: entry.warehouseCode || '-',
          warehouseAddress: entry.warehouseAddress || '-',
          businessType: entry.businessType || '-',
          client: entry.client || '-',
          clientCode: entry.clientCode || '-',
          dateOfInward: entry.dateOfInward || '-',
          cadNumber: entry.cadNumber || '-',
          license: entry.license || '-',
          commodity: entry.commodity || '-',
          varietyName: entry.varietyName || '-',
          marketRate: entry.marketRate || '-',
          bankName: entry.bankName || '-',
          bankBranch: entry.bankBranch || '-',
          bankState: entry.bankState || '-',
          ifscCode: entry.ifscCode || '-',
          bankReceipt: entry.bankReceipt || '-',
          
          // Reservation data
          billingStatus: entry.billingStatus || '-',
          reservationRate: entry.reservationRate || '-',
          reservationQty: entry.reservationQty || '-',
          reservationStart: entry.reservationStart || '-',
          reservationEnd: entry.reservationEnd || '-',
          billingCycle: entry.billingCycle || '-',
          billingType: entry.billingType || '-',
          billingRate: entry.billingRate || '-',
          
          // Insurance data
          insuranceManagedBy: entry.insuranceManagedBy || '-',
          firePolicyNumber: entry.firePolicyNumber || '-',
          firePolicyAmount: entry.firePolicyAmount || '-',
          firePolicyStart: entry.firePolicyStart || '-',
          firePolicyEnd: entry.firePolicyEnd || '-',
          burglaryPolicyNumber: entry.burglaryPolicyNumber || '-',
          burglaryPolicyAmount: entry.burglaryPolicyAmount || '-',
          burglaryPolicyStart: entry.burglaryPolicyStart || '-',
          burglaryPolicyEnd: entry.burglaryPolicyEnd || '-',
          bankFundedBy: entry.bankFundedBy || '-',
          
          // Inward entry data
          vehicleNumber: entry.vehicleNumber || '-',
          getpassNumber: entry.getpassNumber || '-',
          weightBridge: entry.weightBridge || '-',
          weightBridgeSlipNumber: entry.weightBridgeSlipNumber || '-',
          grossWeight: entry.grossWeight || '-',
          tareWeight: entry.tareWeight || '-',
          netWeight: entry.netWeight || '-',
          totalBags: entry.totalBags || '-',
          totalQuantity: entry.totalQuantity || '-',
          totalValue: entry.totalValue || '-',
          averageWeight: entry.averageWeight || '-',
          stacks: entry.stacks || [],
          
          // Metadata
          entryNumber: entry.entryNumber,
          createdAt: new Date().toISOString(),
          status: 'active'
        };
        
        const docRef = await addDoc(inwardCollection, entryData);
        savedEntries.push({ ...entryData, firebaseId: docRef.id });
      }
      
      // Show summary with inward IDs
      const totalBags = allEntries.reduce((sum, entry) => sum + (parseInt(entry.totalBags) || 0), 0);
      const totalQuantity = allEntries.reduce((sum, entry) => sum + (parseFloat(entry.totalQuantity) || 0), 0);
      
      const inwardIdsList = savedEntries.map(entry => entry.inwardId).join(', ');
      
      alert(`Inward data saved successfully to Firebase!\n\nSummary:\n- Total Entries: ${allEntries.length}\n- Inward IDs: ${inwardIdsList}\n- Total Bags: ${totalBags}\n- Total Quantity: ${totalQuantity.toFixed(3)} MT\n\nAll entries have been stored in the 'inward' collection.`);
      
      setShowAddModal(false);
      
      // Reset all forms
      resetForm();
      setInwardEntries([]);
      
    } catch (error) {
      console.error('Error saving inward entries to Firebase:', error);
      alert('Error saving inward entries to Firebase. Please try again.');
    }
  };

  // Reset form when modal is closed
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
      dateOfInward: '',
      cadNumber: '',
      license: '',
      commodity: '',
      varietyName: '',
      marketRate: '',
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
      totalBags: '',
      totalQuantity: '',
      totalValue: '',
      averageWeight: '',
      stacks: [
        {
          stackNumber: '',
          numberOfBags: ''
        }
      ],
    });
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

  // Calculate average weight
  const calculateAverageWeight = (netWeight: string, totalBags: string) => {
    const net = parseFloat(netWeight) || 0;
    const bags = parseInt(totalBags) || 0;
    if (bags > 0) {
      return ((net / bags) * 1000).toFixed(2);
    }
    return '0.00';
  };

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

  // Handle total bags change
  const handleTotalBagsChange = (value: string) => {
    setCurrentEntryForm(f => ({
      ...f,
      totalBags: value,
      averageWeight: calculateAverageWeight(f.netWeight, value)
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
    return currentEntryForm.stacks.reduce((total, stack) => {
      return total + (parseInt(stack.numberOfBags) || 0);
    }, 0);
  };

  // Validate stack bags match total bags
  const validateStackBags = () => {
    const stackTotal = calculateTotalBagsFromStacks();
    const totalBags = parseInt(currentEntryForm.totalBags) || 0;
    return stackTotal === totalBags;
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
    if (!currentEntryForm.getpassNumber) missingFields.push('Getpass Number');
    if (!currentEntryForm.weightBridge) missingFields.push('Weight Bridge');
    if (!currentEntryForm.weightBridgeSlipNumber) missingFields.push('Weight Bridge Slip Number');
    if (!currentEntryForm.grossWeight) missingFields.push('Gross Weight');
    if (!currentEntryForm.tareWeight) missingFields.push('Tare Weight');
    if (!currentEntryForm.totalBags) missingFields.push('Total Bags');
    if (!currentEntryForm.totalQuantity) missingFields.push('Total Quantity');
    if (!currentEntryForm.totalValue) missingFields.push('Total Value');

    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields:\n\n${missingFields.join('\n')}`);
      return;
    }

    // Validate getpass number uniqueness
    const isGetpassDuplicate = inwardEntries.some(entry => 
      entry.getpassNumber === currentEntryForm.getpassNumber
    );
    
    if (isGetpassDuplicate) {
      alert('Getpass number must be unique. This getpass number has already been used in a previous entry.');
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
    
    setInwardEntries(prev => [...prev, newEntry]);
    
    // Reset only the current entry form for new entry
    setCurrentEntryForm({
      vehicleNumber: '',
      getpassNumber: '',
      weightBridge: '',
      weightBridgeSlipNumber: '',
      grossWeight: '',
      tareWeight: '',
      netWeight: '',
      totalBags: '',
      totalQuantity: '',
      totalValue: '',
      averageWeight: '',
      stacks: [
        {
          stackNumber: '',
          numberOfBags: ''
        }
      ],
    });
    
    alert(`Entry ${newEntry.entryNumber} saved successfully! New entry form ready.`);
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

  const columns = [
    { accessorKey: "inwardId", header: "Inward ID" },
    { accessorKey: "state", header: "State" },
    { accessorKey: "branch", header: "Branch" },
    { accessorKey: "location", header: "Location" },
    { accessorKey: "warehouseName", header: "Warehouse Name" },
    { accessorKey: "client", header: "Client Name" },
    { accessorKey: "commodity", header: "Commodity" },
    { accessorKey: "totalBags", header: "Total Bags" },
    { accessorKey: "totalQuantity", header: "Total Quantity (MT)" },
    { accessorKey: "netWeight", header: "Net Weight (MT)" },
    { accessorKey: "averageWeight", header: "Avg. Weight (Rs/MT)" },
    { accessorKey: "dateOfInward", header: "Date of Inward" },
    { accessorKey: "getpassNumber", header: "Getpass No." },
    { accessorKey: "vehicleNumber", header: "Vehicle No." },
    { accessorKey: "bankName", header: "Bank Name" },
    { accessorKey: "insuranceManagedBy", header: "Insurance Managed By" },
  ];

  return (
    <DashboardLayout>
      {/* Module title and dashboard button row */}
      <div className="flex items-center justify-between mt-10 mb-10 px-8">
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
      
      {/* Data Table */}
      <div className="px-8">
        <DataTable columns={columns} data={inwardData} searchKey="inwardId" />
      </div>

      {/* Add Inward Modal */}
      <Dialog open={showAddModal} onOpenChange={handleModalChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <Input value={getBusinessTypeLabel(form.businessType)} readOnly placeholder="Auto-filled" />
              </div>
            </div>

            <div>
              <Label className="block font-semibold mb-1">Warehouse Address</Label>
              <Input value={form.warehouseAddress} onChange={e => setBaseForm(f => ({ ...f, warehouseAddress: e.target.value }))} placeholder="Enter warehouse address" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="block font-semibold mb-1">Client Name</Label>
                <Select value={form.client} onValueChange={v => setBaseForm(f => ({ ...f, client: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => <SelectItem key={c.firmName} value={c.firmName}>{c.firmName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientCode">Client Code</Label>
                <Input id="clientCode" value={form.clientCode} readOnly />
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

              <div>
                <Label className="block font-semibold mb-1">License <span className="text-red-500">*</span></Label>
                <Input 
                  value={form.license} 
                  onChange={e => setBaseForm(f => ({ ...f, license: e.target.value }))} 
                  placeholder="Enter License Number"
                />
              </div>
            </div>

            {/* Commodity Information */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4 text-orange-700">Commodity Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block font-semibold mb-1">Commodity <span className="text-red-500">*</span></Label>
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
                  <Label className="block font-semibold mb-1">Variety Name <span className="text-red-500">*</span></Label>
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

              <div>
                <Label className="block font-semibold mb-1">Market Rate (Rs/MT)</Label>
                <Input 
                  value={form.marketRate} 
                  readOnly 
                  placeholder="Auto-filled from commodity variety"
                />
              </div>
            </div>

            {/* Bank Information */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4 text-orange-700">Bank Information</h3>
              
              <div>
                <Label className="block font-semibold mb-1">Bank Name <span className="text-red-500">*</span></Label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block font-semibold mb-1">Bank Branch</Label>
                  <Input value={form.bankBranch} readOnly placeholder="Auto-filled" />
                </div>
                <div>
                  <Label className="block font-semibold mb-1">Bank State</Label>
                  <Input value={form.bankState} readOnly placeholder="Auto-filled" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block font-semibold mb-1">IFSC Code</Label>
                  <Input value={form.ifscCode} readOnly placeholder="Auto-filled" />
                </div>
                <div>
                  <Label className="block font-semibold mb-1">Bank Receipt <span className="text-red-500">*</span></Label>
                  <Input 
                    value={form.bankReceipt} 
                    onChange={e => setBaseForm(f => ({ ...f, bankReceipt: e.target.value }))} 
                    placeholder="Enter Bank Receipt Number"
                  />
                </div>
              </div>
            </div>

            {/* Reservation/Billing Information */}
            {form.billingStatus && (
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
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4 text-orange-700">Insurance Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="block font-semibold mb-1">Insurance Managed By</Label>
                    <Input value={form.insuranceManagedBy} readOnly placeholder="Auto-filled" />
                  </div>
                </div>

                {form.insuranceManagedBy !== 'bank' && (
                  <>
                    {/* Fire Policy */}
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
                    </div>

                    {/* Burglary Policy */}
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
                          Vehicle: {entry.vehicleNumber} | Getpass: {entry.getpassNumber}
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
                            <Label className="block font-medium mb-1 text-green-600">Getpass Number</Label>
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

                      {/* Quantity and Value Information */}
                      <div className="mb-4">
                        <h5 className="text-md font-semibold mb-2 text-green-700">Quantity and Value Information</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="block font-medium mb-1 text-green-600">Total Bags</Label>
                            <Input value={entry.totalBags} readOnly className="bg-white border-green-300" />
                          </div>
                          <div>
                            <Label className="block font-medium mb-1 text-green-600">Total Quantity (MT)</Label>
                            <Input value={entry.totalQuantity} readOnly className="bg-white border-green-300" />
                          </div>
                          <div>
                            <Label className="block font-medium mb-1 text-green-600">Total Value (Rs/MT)</Label>
                            <Input value={entry.totalValue} readOnly className="bg-white border-green-300" />
                          </div>
                          <div>
                            <Label className="block font-medium mb-1 text-green-600">Average Weight (Rs/MT)</Label>
                            <Input value={entry.averageWeight} readOnly className="bg-white border-green-300" />
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
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-orange-700">Inward Entry</h3>
                <Button 
                  type="button" 
                  onClick={addNewInwardEntry}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Add New Entry
                </Button>
              </div>

              {/* Vehicle Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="block font-semibold mb-1">Vehicle Number <span className="text-red-500">*</span></Label>
                  <Input 
                    value={form.vehicleNumber} 
                    onChange={e => setCurrentEntryForm(f => ({ ...f, vehicleNumber: e.target.value }))} 
                    placeholder="Enter Vehicle Number"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-1">Getpass Number <span className="text-red-500">*</span></Label>
                  <Input 
                    value={form.getpassNumber} 
                    onChange={e => setCurrentEntryForm(f => ({ ...f, getpassNumber: e.target.value }))} 
                    placeholder="Enter Getpass Number"
                  />
                  <p className="text-xs text-orange-600 mt-1">Getpass number must be unique across all entries</p>
                </div>
              </div>

              {/* Weight Bridge Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="block font-semibold mb-1">Weight Bridge <span className="text-red-500">*</span></Label>
                  <Input 
                    value={form.weightBridge} 
                    onChange={e => setCurrentEntryForm(f => ({ ...f, weightBridge: e.target.value }))} 
                    placeholder="Enter Weight Bridge"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-1">Weight Bridge Slip Number <span className="text-red-500">*</span></Label>
                  <Input 
                    value={form.weightBridgeSlipNumber} 
                    onChange={e => setCurrentEntryForm(f => ({ ...f, weightBridgeSlipNumber: e.target.value }))} 
                    placeholder="Enter Slip Number"
                  />
                </div>
              </div>

              {/* Weight Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label className="block font-semibold mb-1">Gross Weight (MT) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    step="0.001"
                    value={form.grossWeight} 
                    onChange={e => handleGrossWeightChange(e.target.value)} 
                    placeholder="0.000"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-1">Tare Weight (MT) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    step="0.001"
                    value={form.tareWeight} 
                    onChange={e => handleTareWeightChange(e.target.value)} 
                    placeholder="0.000"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-1">Net Weight (MT)</Label>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="block font-semibold mb-1">Total Bags <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    value={form.totalBags} 
                    onChange={e => handleTotalBagsChange(e.target.value)} 
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-1">Total Quantity (MT) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    step="0.001"
                    value={form.totalQuantity} 
                    onChange={e => setCurrentEntryForm(f => ({ ...f, totalQuantity: e.target.value }))} 
                    placeholder="0.000"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-1">Total Value (Rs/MT) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={form.totalValue} 
                    onChange={e => setCurrentEntryForm(f => ({ ...f, totalValue: e.target.value }))} 
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-1">Average Weight (Rs/MT)</Label>
                  <Input 
                    value={form.averageWeight} 
                    readOnly 
                    placeholder="Auto-calculated"
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {/* Stack Information */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
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
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="block font-semibold mb-1">Stack Number <span className="text-red-500">*</span></Label>
                        <Input 
                          value={stack.stackNumber} 
                          onChange={e => updateStack(index, 'stackNumber', e.target.value)} 
                          placeholder="Enter Stack Number"
                        />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Number of Bags <span className="text-red-500">*</span></Label>
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
                  <div className={`p-3 rounded-lg mb-4 ${
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
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg">
                {inwardEntries.length > 0 ? `Save All Entries (${inwardEntries.length + 1} total)` : 'Save Inward'}
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