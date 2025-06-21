"use client";

import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Download, Plus, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader as DialogHeaderUI, DialogTitle as DialogTitleUI } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Select as SelectUI, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/data-table';
import Select from 'react-select';

export default function InsuranceMasterPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();

  // Data states
  const [states, setStates] = useState<string[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [insuranceData, setInsuranceData] = useState<any[]>([]);

  // Form state
  const [form, setForm] = useState<any>({
    state: '',
    branch: '',
    location: '',
    warehouse: '',
    commodities: [],
    banks: [],
    insuranceManagedBy: '',
    firePolicyNumber: '',
    firePolicyAmount: '',
    firePolicyStart: '',
    firePolicyEnd: '',
    burglaryPolicyNumber: '',
    burglaryPolicyAmount: '',
    burglaryPolicyStart: '',
    burglaryPolicyEnd: '',
    clientName: '',
    clientId: '',
    bankFundedBy: '',
  });
  const [selectedBankDetails, setSelectedBankDetails] = useState<any[]>([]);

  // Edit modal state
  const [editRow, setEditRow] = useState<any>(null);

  // Table columns (removed Created At)
  const columns: { key: string; label: string }[] = [
    { key: 'insuranceId', label: 'Insurance Code' },
    { key: 'state', label: 'State' },
    { key: 'branch', label: 'Branch' },
    { key: 'location', label: 'Location' },
    { key: 'warehouse', label: 'Warehouse Name' },
    { key: 'insuranceManagedBy', label: 'Managed By' },
    { key: 'banks', label: 'Banks' },
    { key: 'commodities', label: 'Commodities' },
    { key: 'firePolicyNumber', label: 'Fire Policy No.' },
    { key: 'firePolicyAmount', label: 'Fire Policy Amt.' },
    { key: 'firePolicyStart', label: 'Fire Policy Start' },
    { key: 'firePolicyEnd', label: 'Fire Policy End' },
    { key: 'burglaryPolicyNumber', label: 'Burglary Policy No.' },
    { key: 'burglaryPolicyAmount', label: 'Burglary Policy Amt.' },
    { key: 'burglaryPolicyStart', label: 'Burglary Policy Start' },
    { key: 'burglaryPolicyEnd', label: 'Burglary Policy End' },
    { key: 'clientName', label: 'Client Name' },
    { key: 'clientId', label: 'Client Code' },
    { key: 'bankFundedBy', label: 'Bank Funded By' },
    { key: 'actions', label: 'Actions' },
  ];

  // Fetch all data on modal open
  useEffect(() => {
    if (!showAddModal) return;
    const fetchData = async () => {
      // States
      setStates([
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
      ]);
      // Branches
      const branchSnap = await getDocs(collection(db, 'branches'));
      setBranches(branchSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      // Commodities
      const commoditySnap = await getDocs(collection(db, 'commodities'));
      setCommodities(commoditySnap.docs.map(doc => doc.data()));
      // Banks
      const bankSnap = await getDocs(collection(db, 'banks'));
      const bankArr = bankSnap.docs.map(doc => doc.data());
      console.log('Fetched banks:', bankArr);
      setBanks(bankArr);
      // Clients
      const clientSnap = await getDocs(collection(db, 'clients'));
      setClients(clientSnap.docs.map(doc => doc.data()));
      // Warehouses (from inspections)
      const inspectionSnap = await getDocs(collection(db, 'inspections'));
      setWarehouses(inspectionSnap.docs.map(doc => doc.data()));
    };
    fetchData();
  }, [showAddModal]);

  // Fetch banks on page load
  useEffect(() => {
    const fetchBanks = async () => {
      const bankSnap = await getDocs(collection(db, 'banks'));
      const bankArr = bankSnap.docs.map(doc => doc.data());
      setBanks(bankArr);
    };
    fetchBanks();
  }, []);

  // Dependent dropdowns
  useEffect(() => {
    if (!form.state) {
      setLocations([]);
      return;
    }
    const filteredBranches = branches.filter((b: any) => b.state === form.state);
    if (form.branch) {
      const branchObj = filteredBranches.find((b: any) => b.branch === form.branch);
      setLocations(branchObj?.locations || []);
    } else {
      setLocations([]);
    }
  }, [form.state, form.branch, branches]);

  // Bank details for selected banks
  useEffect(() => {
    if (!form.banks.length) {
      setSelectedBankDetails([]);
      return;
    }
    setSelectedBankDetails(
      banks.filter((b: any) => form.banks.includes(b.bankName) && b.state === form.state && b.branchName === form.branch)
    );
  }, [form.banks, banks, form.state, form.branch]);

  // Warehouse dropdown filtered by location and status
  const filteredWarehouses = warehouses.filter((wh: any) =>
    wh.location === form.location && (wh.status === 'activate' || wh.status === 'reactivate')
  );

  // Commodity multi-select options
  const commodityOptions = commodities.map((c: any) => c.commodityName);

  // Bank multi-select options
  const bankOptions = banks.filter((b: any) => b.state === form.state && b.branchName === form.branch).map((b: any) => b.bankName);

  // Client dropdown options
  const clientOptions = clients.map((c: any) => ({ name: c.firmName, id: c.clientId }));

  // Bank locations for selected state
  const bankLocationOptions = banks
    .flatMap((bank: any) =>
      (bank.locations || []).map((loc: any) => ({
        bankName: bank.bankName,
        bankId: bank.bankId,
        state: loc.state || form.state, // fallback to selected state if not present
        branchName: loc.branchName,
        ifscCode: loc.ifscCode,
        locationId: loc.locationId,
        locationName: loc.locationName,
      }))
    )
    .filter((loc: any) => loc.state === form.state);

  // Handle form changes
  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
    if (field === 'clientName') {
      const client = clients.find((c: any) => c.firmName === value);
      setForm((prev: any) => ({ ...prev, clientId: client ? client.clientId : '' }));
    }
  };

  // Generate sequential insuranceId
  async function generateInsuranceId() {
    const snap = await getDocs(collection(db, 'insurance'));
    const ids = snap.docs
      .map(doc => doc.data().insuranceId)
      .filter(Boolean)
      .map((id) => {
        const match = id.match(/INS-(\d{4})/);
        return match ? parseInt(match[1], 10) : 0;
      });
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `INS-${(maxId + 1).toString().padStart(4, '0')}`;
  }

  // Handle form submit
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      if (editRow) {
        // Only update fire/burglary policy fields
        const updateFields: any = {};
        ['firePolicyNumber','firePolicyAmount','firePolicyStart','firePolicyEnd','burglaryPolicyNumber','burglaryPolicyAmount','burglaryPolicyStart','burglaryPolicyEnd'].forEach(key => {
          updateFields[key] = form[key] === '' || form[key] === null || form[key] === undefined ? '-' : form[key];
        });
        await updateDoc(doc(db, 'insurance', editRow.id), updateFields);
        setInsuranceData(data => data.map((r: any) => r.id === editRow.id ? { ...r, ...updateFields } : r));
        toast({ title: 'Insurance updated successfully!', variant: 'default' });
      } else {
        // Add new
        const dataToSave: any = { ...form };
        Object.keys(dataToSave).forEach(key => {
          const value = dataToSave[key];
          if (value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
            dataToSave[key] = '-';
          }
        });
        const insuranceId = await generateInsuranceId();
        dataToSave.insuranceId = insuranceId;
        dataToSave.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'insurance'), dataToSave);
        toast({ title: 'Insurance added successfully!', variant: 'default' });
      }
      setShowAddModal(false);
      setEditRow(null);
      setForm({
        state: '', branch: '', location: '', warehouse: '', commodities: [], banks: [], insuranceManagedBy: '', firePolicyNumber: '', firePolicyAmount: '', firePolicyStart: '', firePolicyEnd: '', burglaryPolicyNumber: '', burglaryPolicyAmount: '', burglaryPolicyStart: '', burglaryPolicyEnd: '', clientName: '', clientId: '', bankFundedBy: '',
      });
    } catch (err) {
      toast({ title: 'Error saving insurance', description: String(err), variant: 'destructive' });
    }
  };

  // When opening edit modal, populate form
  useEffect(() => {
    if (editRow) {
      setForm({ ...editRow });
    }
  }, [editRow]);

  // When closing modal, clear editRow
  useEffect(() => {
    if (!showAddModal) {
      setEditRow(null);
      setForm({
        state: '', branch: '', location: '', warehouse: '', commodities: [], banks: [], insuranceManagedBy: '', firePolicyNumber: '', firePolicyAmount: '', firePolicyStart: '', firePolicyEnd: '', burglaryPolicyNumber: '', burglaryPolicyAmount: '', burglaryPolicyStart: '', burglaryPolicyEnd: '', clientName: '', clientId: '', bankFundedBy: '',
      });
    }
  }, [showAddModal]);

  // Insurance data state
  useEffect(() => {
    const fetchInsurance = async () => {
      const snap = await getDocs(collection(db, 'insurance'));
      const data: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => {
        const idA = a.insuranceId || '';
        const idB = b.insuranceId || '';
        const numA = parseInt(idA.split('-')[1] || '0');
        const numB = parseInt(idB.split('-')[1] || '0');
        return numA - numB;
      });
      setInsuranceData(data);
    };
    fetchInsurance();
  }, [showAddModal]);

  // Helper to get bank name from bankId
  function getBankNameFromId(val: string, banksArr: any[]) {
    const [bankId] = val.split('|');
    const bank = banksArr.find((b: any) => String(b.bankId) === String(bankId));
    return bank && bank.bankName ? bank.bankName : bankId;
  }

  // Render table rows
  function renderCell(row: any, col: { key: string; label: string }, banks: any[]) {
    const value = row[col.key];
    if (col.key === 'actions') {
      return (
        <div className="flex gap-2 justify-center">
          <button
            className="p-2 rounded bg-orange-100 hover:bg-orange-200 text-orange-600"
            onClick={() => {
              setEditRow(row);
              setForm({ ...row });
              setShowAddModal(true);
            }}
          >
            <Edit size={18} />
          </button>
          <button className="p-2 rounded bg-red-100 hover:bg-red-200 text-red-600" onClick={async () => {
            if (window.confirm('Are you sure you want to delete this insurance record?')) {
              await deleteDoc(doc(db, 'insurance', row.id));
              setInsuranceData(data => data.filter((r: any) => r.id !== row.id));
            }
          }}><Trash2 size={18} /></button>
        </div>
      );
    }
    if (col.key === 'bankFundedBy' && value && value !== '-') {
      return <span className="text-green-700">{getBankNameFromId(value, banks)}</span>;
    }
    if (col.key === 'banks' && Array.isArray(value) && value[0] !== '-') {
      // Deduplicate bank names
      const names = value.map((v: string) => getBankNameFromId(v, banks));
      const uniqueNames = Array.from(new Set(names));
      return <span className="text-green-700">{uniqueNames.join(', ')}</span>;
    }
    if (col.key === 'commodities' && Array.isArray(value) && value[0] !== '-') {
      return <span className="text-green-700">{value.join(', ')}</span>;
    }
    if (value === '-' || value === undefined) {
      return <span className="text-gray-400">-</span>;
    }
    return <span className="text-green-700">{value}</span>;
  }

  useEffect(() => {
    if (banks.length > 0) {
      console.log('Banks:', banks);
    }
  }, [banks]);

  useEffect(() => {
    if (bankLocationOptions.length > 0) {
      console.log('Bank Location Options:', bankLocationOptions);
    }
  }, [bankLocationOptions]);

  // 1. Filtered insurance data based on search term
  const filteredInsuranceData = insuranceData.filter((row: any) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;
    return (
      (row.state && row.state.toLowerCase().includes(search)) ||
      (row.branch && row.branch.toLowerCase().includes(search)) ||
      (row.location && row.location.toLowerCase().includes(search)) ||
      (row.warehouse && row.warehouse.toLowerCase().includes(search))
    );
  });

  // 2. CSV Export logic
  function downloadCSV() {
    if (filteredInsuranceData.length === 0) return;
    // Prepare CSV header
    const header = columns.filter(col => col.key !== 'actions').map(col => col.label);
    // Prepare CSV rows
    const rows = filteredInsuranceData.map(row =>
      columns.filter(col => col.key !== 'actions').map(col => {
        let value = row[col.key];
        if (col.key === 'bankFundedBy' && value && value !== '-') {
          value = getBankNameFromId(value, banks);
        }
        if (col.key === 'banks' && Array.isArray(value) && value[0] !== '-') {
          const names = value.map((v: string) => getBankNameFromId(v, banks));
          value = Array.from(new Set(names)).join(', ');
        }
        if (col.key === 'commodities' && Array.isArray(value) && value[0] !== '-') {
          value = value.join(', ');
        }
        if (value === undefined || value === null) value = '';
        return `"${String(value).replace(/"/g, '""')}"`;
      })
    );
    const csvContent = [header, ...rows].map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'insurance-data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

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
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-orange-600 inline-block border-b-4 border-green-500 pb-2 px-6 py-3 bg-orange-100 rounded-lg">
              Insurance Master
            </h1>
          </div>
          {/* Add New Insurance Button */}
          <Button className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 shadow-lg" onClick={() => setShowAddModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Add New Insurance
          </Button>
        </div>

        {/* Search & Export Section */}
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
                  placeholder="Search by State, Warehouse Name, Client Name, and Location"
                  className="border-green-300 focus:border-green-500 flex-1"
                />
              </div>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white whitespace-nowrap" onClick={downloadCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Placeholder */}
        {banks.length === 0 ? (
          <Card className="border-green-300 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-green-50 rounded-t-xl sticky top-0 z-10">
              <CardTitle className="text-green-700">Registered Insurance</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <div className="w-full text-center text-gray-400 py-8">Loading banks...</div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-300 shadow-lg rounded-xl overflow-hidden">
            {/* <CardHeader className="bg-green-50 rounded-t-xl sticky top-0 z-10">
              <CardTitle className="text-green-700"></CardTitle>
            </CardHeader> */}
            <CardContent className="overflow-x-auto p-0">
              <DataTable
                columns={columns.map((c) => ({
                  accessorKey: c.key,
                  header: c.label,
                  cell: ({ row }: any) => renderCell(row.original, c, banks),
                }))}
                data={filteredInsuranceData}
                wrapperClassName="border-green-300"
                headClassName="bg-orange-100 text-orange-600 font-bold"
                cellClassName="text-green-800"
              />
            </CardContent>
          </Card>
        )}

        {/* Add New Insurance Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeaderUI>
              <DialogTitleUI>Add New Insurance</DialogTitleUI>
            </DialogHeaderUI>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* State */}
                <div className="space-y-2">
                  <Label className="text-green-600 font-medium">State</Label>
                  <SelectUI value={form.state} onValueChange={v => handleChange('state', v)} required>
                    <SelectTrigger className="border-orange-300 focus:border-orange-500 text-orange-700"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{states.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
                  </SelectUI>
                </div>
                {/* Branch */}
                <div className="space-y-2">
                  <Label className="text-green-600 font-medium">Branch</Label>
                  <SelectUI value={form.branch} onValueChange={v => handleChange('branch', v)} required disabled={!form.state}>
                    <SelectTrigger className="border-orange-300 focus:border-orange-500 text-orange-700"><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>{branches.filter((b: any) => b.state === form.state).map(branch => <SelectItem key={branch.branch} value={branch.branch}>{branch.branch}</SelectItem>)}</SelectContent>
                  </SelectUI>
                </div>
                {/* Location */}
                <div className="space-y-2">
                  <Label className="text-green-600 font-medium">Location</Label>
                  <SelectUI value={form.location} onValueChange={v => handleChange('location', v)} required disabled={!form.branch}>
                    <SelectTrigger className="border-orange-300 focus:border-orange-500 text-orange-700"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>{locations.map((loc: any) => <SelectItem key={loc.locationId} value={loc.locationName}>{loc.locationName}</SelectItem>)}</SelectContent>
                  </SelectUI>
                </div>
                {/* Warehouse */}
                <div className="space-y-2">
                  <Label className="text-green-600 font-medium">Warehouse Name</Label>
                  <SelectUI value={form.warehouse} onValueChange={v => handleChange('warehouse', v)} required disabled={!form.location}>
                    <SelectTrigger className="border-orange-300 focus:border-orange-500 text-orange-700"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                    <SelectContent>{filteredWarehouses.map((wh: any) => <SelectItem key={wh.warehouseName} value={wh.warehouseName}>{wh.warehouseName}</SelectItem>)}</SelectContent>
                  </SelectUI>
                </div>
                {/* Commodities Multi-Select (react-select, no children) */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-green-600 font-medium">Commodities</Label>
                  <Select
                    isMulti
                    options={commodityOptions.map((c: string) => ({ value: c, label: c }))}
                    value={commodityOptions.filter((c: string) => form.commodities?.includes(c)).map((c: string) => ({ value: c, label: c }))}
                    onChange={(selected: any) => handleChange('commodities', selected.map((s: any) => s.value))}
                    placeholder="Select commodities"
                    styles={{
                      control: (base: any) => ({ ...base, borderColor: '#fb923c', minHeight: 40 }),
                      multiValue: (base: any) => ({ ...base, backgroundColor: '#bbf7d0', color: '#047857' }),
                      multiValueLabel: (base: any) => ({ ...base, color: '#047857', fontWeight: 500 }),
                      option: (base: any, state: any) => ({ ...base, color: state.isSelected ? '#fb923c' : '#047857', backgroundColor: state.isSelected ? '#fef3c7' : '#fff' }),
                    }}
                  />
                </div>
                {/* Banks Multi-Select (react-select, no children) */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-green-600 font-medium">Banks</Label>
                  <Select
                    isMulti
                    options={bankLocationOptions.map((loc: any) => ({ value: `${loc.bankId}|${loc.locationId}`, label: `${loc.bankName} (${loc.branchName})` }))}
                    value={bankLocationOptions.filter((loc: any) => form.banks?.includes(`${loc.bankId}|${loc.locationId}`)).map((loc: any) => ({ value: `${loc.bankId}|${loc.locationId}`, label: `${loc.bankName} (${loc.branchName})` }))}
                    onChange={(selected: any) => handleChange('banks', selected.map((s: any) => s.value))}
                    placeholder="Select banks"
                    styles={{
                      control: (base: any) => ({ ...base, borderColor: '#fb923c', minHeight: 40 }),
                      multiValue: (base: any) => ({ ...base, backgroundColor: '#bbf7d0', color: '#047857' }),
                      multiValueLabel: (base: any) => ({ ...base, color: '#047857', fontWeight: 500 }),
                      option: (base: any, state: any) => ({ ...base, color: state.isSelected ? '#fb923c' : '#047857', backgroundColor: state.isSelected ? '#fef3c7' : '#fff' }),
                    }}
                  />
                </div>
                {/* After the Banks multi-select field, show selected bank details if any banks are selected */}
                {form.banks && form.banks.length > 0 && (
                  <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-lg p-2 mt-2">
                    <div className="font-semibold text-green-700 mb-1">Selected Bank Details:</div>
                    {form.banks.map((val: string, idx: number) => {
                      const [bankId, locationId] = val.split('|');
                      const loc = bankLocationOptions.find((l: any) => l.bankId === bankId && l.locationId === locationId);
                      if (!loc) return null;
                      return (
                        <div key={val} className="text-sm text-green-900 mb-1">
                          {loc.state} | {loc.bankName} | {loc.branchName} | IFSC: {loc.ifscCode}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Insurance Managed By */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-green-600 font-medium">Insurance Managed By</Label>
                  <SelectUI value={form.insuranceManagedBy} onValueChange={v => handleChange('insuranceManagedBy', v)} required>
                    <SelectTrigger className="border-orange-300 focus:border-orange-500 text-orange-700"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warehouse owner">Warehouse Owner</SelectItem>
                      <SelectItem value="borrower">Borrower</SelectItem>
                      <SelectItem value="agrogreen">Agrogreen</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </SelectUI>
                </div>
                {/* Bank Funded By (Single Select, only from selected banks, react-select, no children) */}
                {form.insuranceManagedBy === 'bank' && (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-green-600 font-medium">Bank Funded By</Label>
                      <Select
                        isMulti={false}
                        options={bankLocationOptions.filter((loc: any) => form.banks.includes(`${loc.bankId}|${loc.locationId}`)).map((loc: any) => ({ value: `${loc.bankId}|${loc.locationId}`, label: `${loc.bankName} (${loc.branchName})` }))}
                        value={bankLocationOptions.filter((loc: any) => `${loc.bankId}|${loc.locationId}` === form.bankFundedBy).map((loc: any) => ({ value: `${loc.bankId}|${loc.locationId}`, label: `${loc.bankName} (${loc.branchName})` }))}
                        onChange={(selected: any) => handleChange('bankFundedBy', selected ? selected.value : '')}
                        placeholder="Select bank funded by"
                        styles={{
                          control: (base: any) => ({ ...base, borderColor: '#fb923c', minHeight: 40, fontSize: '0.875rem', color: '#047857' }),
                          singleValue: (base: any) => ({ ...base, color: '#047857', fontSize: '0.875rem' }),
                          option: (base: any, state: any) => ({ ...base, color: '#047857', fontSize: '0.875rem', backgroundColor: state.isSelected ? '#fef3c7' : '#fff' }),
                        }}
                      />
                    </div>
                    {/* Show details of selected Bank Funded By */}
                    {form.bankFundedBy && (
                      (() => {
                        const [bankId, locationId] = form.bankFundedBy.split('|');
                        const loc = bankLocationOptions.find((l: any) => l.bankId === bankId && l.locationId === locationId);
                        if (!loc) return null;
                        return (
                          <div className="md:col-span-2 bg-orange-50 border border-orange-200 rounded-lg p-2 mt-2">
                            <div className="font-semibold text-orange-700 mb-1">Bank Funded By Details:</div>
                            <div className="text-sm text-green-700 mb-1">
                              {loc.state} | {loc.bankName} | {loc.branchName} | IFSC: {loc.ifscCode}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </>
                )}
                {/* If borrower, show client name/id */}
                {form.insuranceManagedBy === 'borrower' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-green-600 font-medium">Client Name</Label>
                      <SelectUI value={form.clientName} onValueChange={v => handleChange('clientName', v)}>
                        <SelectTrigger className="border-orange-300 focus:border-orange-500 text-orange-700"><SelectValue placeholder="Select client" /></SelectTrigger>
                        <SelectContent>{clientOptions.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                      </SelectUI>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-green-600 font-medium">Client ID</Label>
                      <Input value={form.clientId} readOnly className="border-orange-300 focus:border-orange-500 text-orange-700 bg-gray-100" />
                    </div>
                  </>
                )}
                {/* If not managed by bank, show fire/burglary policy fields */}
                {form.insuranceManagedBy && form.insuranceManagedBy !== 'bank' && (
                  <>
                    {/* Fire Policy */}
                    <div className="space-y-2">
                      <Label className="text-green-600 font-medium">Fire Policy Number</Label>
                      <Input value={form.firePolicyNumber} onChange={e => handleChange('firePolicyNumber', e.target.value)} className="border-orange-300 focus:border-orange-500 text-orange-700" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-green-600 font-medium">Fire Policy Amount</Label>
                      <Input type="number" value={form.firePolicyAmount} onChange={e => handleChange('firePolicyAmount', e.target.value)} className="border-orange-300 focus:border-orange-500 text-orange-700" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-green-600 font-medium">Fire Policy Start Date</Label>
                      <Input type="date" value={form.firePolicyStart} onChange={e => handleChange('firePolicyStart', e.target.value)} className="border-orange-300 focus:border-orange-500 text-orange-700" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-green-600 font-medium">Fire Policy End Date</Label>
                      <Input type="date" value={form.firePolicyEnd} onChange={e => handleChange('firePolicyEnd', e.target.value)} className="border-orange-300 focus:border-orange-500 text-orange-700" />
                    </div>
                    {/* Burglary Policy */}
                    <div className="space-y-2">
                      <Label className="text-green-600 font-medium">Burglary Policy Number</Label>
                      <Input value={form.burglaryPolicyNumber} onChange={e => handleChange('burglaryPolicyNumber', e.target.value)} className="border-orange-300 focus:border-orange-500 text-orange-700" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-green-600 font-medium">Burglary Policy Amount</Label>
                      <Input type="number" value={form.burglaryPolicyAmount} onChange={e => handleChange('burglaryPolicyAmount', e.target.value)} className="border-orange-300 focus:border-orange-500 text-orange-700" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-green-600 font-medium">Burglary Policy Start Date</Label>
                      <Input type="date" value={form.burglaryPolicyStart} onChange={e => handleChange('burglaryPolicyStart', e.target.value)} className="border-orange-300 focus:border-orange-500 text-orange-700" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-green-600 font-medium">Burglary Policy End Date</Label>
                      <Input type="date" value={form.burglaryPolicyEnd} onChange={e => handleChange('burglaryPolicyEnd', e.target.value)} className="border-orange-300 focus:border-orange-500 text-orange-700" />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2 shadow-lg">{editRow ? 'Update Insurance' : 'Add Insurance'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 