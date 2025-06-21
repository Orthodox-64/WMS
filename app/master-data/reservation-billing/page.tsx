"use client";

import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader as DialogHeaderUI, DialogTitle as DialogTitleUI, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, Plus, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, DocumentReference } from 'firebase/firestore';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import React from 'react';
import { CSVLink } from 'react-csv';
import { BlinkingSirenIcon } from '@/components/BlinkingSirenIcon';

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", 
  "Ladakh", "Lakshadweep", "Puducherry"
];

type Location = {
  locationId: string;
  locationName: string;
};

type Branch = {
  id: string;
  state: string;
  branch: string;
  locations: Location[];
  [key: string]: any;
};

const reservationFields = [
  'reservationId', 'state', 'branch', 'location', 'warehouse', 'client', 'clientId', 'billingStatus',
  'reservationRate', 'reservationQty', 'reservationStart', 'reservationEnd',
  'billingCycle', 'billingType', 'billingRate'
];

type Reservation = {
  [key: string]: string | undefined;
  id?: string;
};

export default function ReservationBillingPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [allWarehouses, setAllWarehouses] = useState<{ warehouseName: string, state?: string, branch?: string, location?: string }[]>([]);

  const [form, setForm] = useState<any>({
    state: '', branch: '', location: '', warehouse: '', client: '', clientId: '',
    billingStatus: 'reservation', reservationRate: '', reservationQty: '',
    reservationStart: null, reservationEnd: null, billingCycle: '', billingType: '', billingRate: '',
  });

  const [modalLocations, setModalLocations] = useState<Location[]>([]);
  const [modalWarehouses, setModalWarehouses] = useState<any[]>([]);

  const [alertModal, setAlertModal] = useState<{ open: boolean, type: string, row: Reservation | null }>({ open: false, type: '', row: null });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<string | null>(null);
  const [billingForm, setBillingForm] = useState({ billingCycle: '-', billingType: '-', billingRate: '-' });
  const [showExtendReservation, setShowExtendReservation] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, row: Reservation | null }>({ open: false, row: null });
  const [editDialog, setEditDialog] = useState<{ open: boolean, row: Reservation | null }>({ open: false, row: null });
  const [editBillingForm, setEditBillingForm] = useState({ billingCycle: '', billingType: '', billingRate: '' });

  const [addBillingDialog, setAddBillingDialog] = useState<{ open: boolean, row: Reservation | null }>({ open: false, row: null });
  const [addBillingForm, setAddBillingForm] = useState({ billingCycle: '', billingType: '', billingRate: '' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [branchSnap, clientSnap, inspectionsSnap, reservationSnap] = await Promise.all([
          getDocs(collection(db, 'branches')),
          getDocs(collection(db, 'clients')),
          getDocs(collection(db, 'inspections')),
          getDocs(collection(db, 'reservation'))
        ]);

        const branchArr: Branch[] = branchSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
        setBranches(branchArr);

        const clientArr = clientSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClients(clientArr);

        const warehouseSet = new Set();
        const warehouseArr: { warehouseName: string, state?: string, branch?: string, location?: string }[] = [];
        const allInspectionDocs = inspectionsSnap.docs.map(doc => doc.data());
        console.log('All inspection docs:', allInspectionDocs);
        inspectionsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (
            data.warehouseName &&
            !warehouseSet.has(data.warehouseName) &&
            (data.status === 'activate' || data.status === 'reactivate')
          ) {
            warehouseSet.add(data.warehouseName);
            warehouseArr.push({ warehouseName: data.warehouseName, state: data.state, branch: data.branch, location: data.location });
          }
        });
        console.log('Filtered warehouseArr:', warehouseArr);
        setAllWarehouses(warehouseArr);

        const reservationData: Reservation[] = reservationSnap.docs.map(doc => {
          const d = doc.data();
          const row: Reservation = {};
          reservationFields.forEach(f => { row[f] = d[f] ?? '-'; });
          row.id = doc.id;
          return row;
        });
        setReservations(reservationData);
        
      } catch (err) {
        setError('Failed to load data');
        toast({ title: 'Error', description: 'Failed to load necessary data.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const filteredReservations = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return reservations;
    return reservations.filter(r => 
      Object.values(r).some(val => 
        String(val).toLowerCase().includes(term)
      )
    );
  }, [searchTerm, reservations]);

  useEffect(() => {
    if (form.state && form.branch) {
        const branchObj = branches.find(b => b.state === form.state && b.branch === form.branch);
        setModalLocations(branchObj?.locations || []);
    } else {
        setModalLocations([]);
    }

    if (form.location) {
      const warehousesInLocation = allWarehouses.filter(wh => wh.location === form.location);
      setModalWarehouses(warehousesInLocation);
    } else {
      setModalWarehouses([]);
    }
  }, [form.state, form.branch, form.location, branches, allWarehouses]);
  
  useEffect(() => {
    if (!form.client) {
      setForm((f: any) => ({ ...f, clientId: '' }));
      return;
    }
    const clientObj = clients.find(c => c.firmName === form.client);
    setForm((f: any) => ({ ...f, clientId: clientObj ? clientObj.clientId : '' }));
  }, [form.client, clients]);

  const handleChange = (field: string, value: any) => {
    setForm((f: any) => ({ ...f, [field]: value }));
  };
  
  async function generateReservationId() {
    const reservationSnap = await getDocs(collection(db, 'reservation'));
    const ids = reservationSnap.docs.map(doc => doc.data().reservationId).filter(Boolean).map((id: string) => {
        const match = id.match(/RES-(\d{4})/);
        return match ? parseInt(match[1], 10) : 0;
      });
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `RES-${(maxId + 1).toString().padStart(4, '0')}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.state || !form.branch || !form.location || !form.warehouse || !form.client || !form.clientId) {
      return toast({ title: 'Please fill all required fields', variant: 'destructive' });
    }
    if (form.billingStatus === 'reservation' && (!form.reservationRate || !form.reservationQty || !form.reservationStart || !form.reservationEnd)) {
      return toast({ title: 'Please fill all reservation fields', variant: 'destructive' });
    } else if (form.billingStatus === 'post-reservation' && (!form.billingCycle || !form.billingType || !form.billingRate)) {
      return toast({ title: 'Please fill all billing fields', variant: 'destructive' });
    }

    try {
      const reservationId = await generateReservationId();
      const dataToSave: Reservation = {
        ...form,
        reservationId,
        createdAt: new Date().toISOString()
      };
      
      Object.keys(dataToSave).forEach(key => {
        const value = dataToSave[key];
        if (value === '' || value === null || value === undefined) {
          dataToSave[key] = '-';
        }
      });

      const docRef = await addDoc(collection(db, 'reservation'), dataToSave);
      toast({ title: 'Reservation added successfully!', variant: 'default' });
      setShowAddModal(false);
      
      const newReservation: Reservation = { ...dataToSave, id: docRef.id };
      setReservations(prev => [...prev, newReservation]);
      
      setForm({
        state: '', branch: '', location: '', warehouse: '', client: '', clientId: '', 
        billingStatus: 'reservation', reservationRate: '', reservationQty: '', 
        reservationStart: null, reservationEnd: null, billingCycle: '', billingType: '', billingRate: '',
      });
    } catch (err) {
      toast({ title: 'Error adding reservation', description: String(err), variant: 'destructive' });
    }
  };

  async function updateReservationField(id: string, data: Partial<Reservation>) {
    const snap = await getDocs(collection(db, 'reservation'));
    const docSnap = snap.docs.find(doc => doc.data().reservationId === id);
    if (docSnap) {
        await updateDoc(docSnap.ref as DocumentReference<DocumentData>, data);
        setReservations(prev => prev.map(r => r.reservationId === id ? { ...r, ...data } : r));
        toast({ title: 'Update Successful', description: 'The record has been updated.', variant: 'default' });
    } else {
        toast({ title: 'Update Failed', description: 'Could not find the record to update.', variant: 'destructive' });
    }
  }

  function EndDateCell({ row }: { row: { original: Reservation } }) {
    const d = row.original;
    const today = new Date();
    let endDate: Date | null = null;
    if (d.reservationEnd && d.reservationEnd !== '-') {
      try { endDate = parseISO(d.reservationEnd); } catch {}
    }
    if (!endDate || d.billingStatus !== 'reservation') {
      return <span className="text-green-700">{String(d.reservationEnd)}</span>;
    }
    const daysLeft = differenceInCalendarDays(endDate, today);
    if (daysLeft >= 0 && daysLeft <= 5) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-green-700">{String(d.reservationEnd)}</span>
          <button
            className="p-0 m-0 bg-transparent border-none focus:outline-none"
            title="Alert"
            onClick={() => setAlertModal({ open: true, type: 'aboutToEnd', row: d })}
            type="button"
          >
            <BlinkingSirenIcon color="red" size={24} />
          </button>
        </div>
      );
    } else if (daysLeft < 0) {
      const hasBillingInfo = d.billingCycle !== '-' || d.billingType !== '-' || d.billingRate !== '-';
      if (!hasBillingInfo) {
        return (
          <div className="flex items-center gap-2">
            <span className="text-green-700">{String(d.reservationEnd)}</span>
            <button
              className="p-0 m-0 bg-transparent border-none focus:outline-none"
              title="Alert"
              onClick={() => setAlertModal({ open: true, type: 'expired', row: d })}
              type="button"
            >
              <BlinkingSirenIcon color="red" size={24} />
            </button>
          </div>
        );
      } else {
        return (
          <div className="flex items-center gap-2">
            <span className="text-green-700">{String(d.reservationEnd)}</span>
            <button
              className="p-0 m-0 bg-transparent border-none focus:outline-none"
              title="Update"
              onClick={() => setAlertModal({ open: true, type: 'update', row: d })}
              type="button"
            >
              <BlinkingSirenIcon color="blue" size={24} />
            </button>
          </div>
        );
      }
    }
    return <span className="text-green-700">{String(d.reservationEnd)}</span>;
  }

  async function handleDeleteReservation(row: Reservation) {
    if (!row.id) {
      toast({ title: 'Delete Failed', description: 'No document ID found.', variant: 'destructive' });
      return;
    }
    try {
      await deleteDoc(doc(db, 'reservation', row.id));
      setReservations(prev => prev.filter(r => r.id !== row.id));
      toast({ title: 'Reservation deleted successfully!', variant: 'default' });
    } catch (err) {
      toast({ title: 'Delete Failed', description: String(err), variant: 'destructive' });
    }
    setDeleteDialog({ open: false, row: null });
  }

  function canEditBilling(row: Reservation) {
    return row.billingCycle && row.billingCycle !== '-' && row.billingType && row.billingType !== '-' && row.billingRate && row.billingRate !== '-';
  }

  async function handleEditBillingSubmit() {
    if (!editDialog.row?.id) return;
    try {
      await updateDoc(doc(db, 'reservation', editDialog.row.id), editBillingForm);
      setReservations(prev => prev.map(r => r.id === editDialog.row?.id ? { ...r, ...editBillingForm } : r));
      toast({ title: 'Billing details updated!', variant: 'default' });
      setEditDialog({ open: false, row: null });
    } catch (err) {
      toast({ title: 'Update Failed', description: String(err), variant: 'destructive' });
    }
  }

  function canAddBilling(row: Reservation) {
    return row.billingStatus === 'post-reservation';
  }

  async function handleAddBillingRow() {
    if (!addBillingDialog.row) return;

    if (addBillingForm.billingCycle === addBillingDialog.row.billingCycle && addBillingForm.billingType === addBillingDialog.row.billingType) {
      return toast({
        title: "Validation Error",
        description: "Billing Cycle and Billing Type cannot be the same as the previous entry.",
        variant: "destructive",
      });
    }

    try {
      const reservationId = await generateReservationId();
      const newReservationData = {
        ...addBillingDialog.row,
        reservationId: reservationId,
        billingCycle: addBillingForm.billingCycle,
        billingType: addBillingForm.billingType,
        billingRate: addBillingForm.billingRate,
        createdAt: new Date().toISOString(),
      };
      
      const docRef = await addDoc(collection(db, 'reservation'), newReservationData);
      const newReservation: Reservation = { ...newReservationData, id: docRef.id };
      setReservations(prev => [...prev, newReservation]);
      
      toast({ title: 'New billing row added successfully!', variant: 'default' });
      setAddBillingDialog({ open: false, row: null });
    } catch (err) {
      toast({ title: 'Error adding new row', description: String(err), variant: 'destructive' });
    }
  }

  const reservationColumns: ColumnDef<Reservation>[] = [
    ...reservationFields.map(field => {
      if (field === 'reservationEnd') {
        return {
          accessorKey: field,
          header: 'Reservation End Date',
          cell: ({ row }: { row: any }) => <EndDateCell row={row} />,
        };
      }
      let header = field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      if (field === 'reservationId') header = 'Reservation Code';
      if (field === 'warehouse') header = 'Warehouse Name';
      if (field === 'clientId') header = 'Client Code';
      if (field === 'reservationRate') header = 'Reservation Rate (Rs/MT)';
      if (field === 'reservationQty') header = 'Reservation Quantity (MT)';
      if (field === 'billingRate') header = 'Billing Rate (Rs/MT)';
      return {
        accessorKey: field,
        header,
        cell: ({ row }: { row: any }) => <span className="text-green-700">{String(row.getValue(field))}</span>,
      };
    }),
    {
      id: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-center">
          {/* Edit Button */}
          {canEditBilling(row.original) && (
            <Button size="icon" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50 p-1 w-7 h-7" onClick={() => {
              setEditBillingForm({
                billingCycle: row.original.billingCycle || '',
                billingType: row.original.billingType || '',
                billingRate: row.original.billingRate || '',
              });
              setEditDialog({ open: true, row: row.original });
            }} aria-label="Edit">
              <Pencil size={16} />
            </Button>
          )}
          {/* Delete Button */}
          <Dialog open={deleteDialog.open && deleteDialog.row?.id === row.original.id} onOpenChange={open => setDeleteDialog({ open, row: open ? row.original : null })}>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 p-1 w-7 h-7" aria-label="Delete">
                <Trash2 size={16} />
              </Button>
            </DialogTrigger>
            <DialogContent className="border-red-200 max-w-sm">
              <DialogHeaderUI>
                <DialogTitleUI className="text-red-600 flex items-center gap-2">Confirm Deletion</DialogTitleUI>
              </DialogHeaderUI>
              <div className="text-gray-700 py-2">Are you sure you want to delete reservation <strong>{row.original.reservationId}</strong>? This action cannot be undone.</div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setDeleteDialog({ open: false, row: null })}>Cancel</Button>
                <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={() => handleDeleteReservation(row.original)}>Delete</Button>
              </div>
            </DialogContent>
          </Dialog>
          {canAddBilling(row.original) && (
            <Button size="icon" variant="outline" className="border-green-300 text-green-600 hover:bg-green-50 p-1 w-7 h-7" onClick={() => {
              setAddBillingForm({ billingCycle: '', billingType: '', billingRate: '' });
              setAddBillingDialog({ open: true, row: row.original });
            }} aria-label="Add Billing">
              <Plus size={16} />
            </Button>
          )}
        </div>
      ),
    },
  ];
  
  const csvHeaders = useMemo(() => reservationColumns
    .filter((c): c is ColumnDef<Reservation> & { accessorKey: string } => 'accessorKey' in c)
    .map(c => ({
        label: typeof c.header === 'string' ? c.header : String(c.accessorKey),
        key: c.accessorKey
    })), [reservationColumns]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="inline-block text-lg font-semibold tracking-tight bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors">
            ← Dashboard
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-orange-600 inline-block border-b-4 border-green-500 pb-2 px-6 py-3 bg-orange-100 rounded-lg">
              Reservation + Billing
            </h1>
          </div>
          <Button className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 shadow-lg" onClick={() => setShowAddModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Add New Reservation
          </Button>
        </div>

        <Card className="border-green-300">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">Search & Export</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="searchTerm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by state, warehouse, client, status, or location..."
                  className="border-green-300 focus:border-green-500 pl-10"
                />
              </div>
              <CSVLink data={filteredReservations} headers={csvHeaders} filename={"reservation_billing_export.csv"} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 h-10 px-4 py-2" target="_blank">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </CSVLink>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex justify-end">
          <div className="border p-2 rounded-md bg-gray-50 text-sm max-w-xs">
            <div className="flex items-center space-x-2">
              <span className="h-3 w-3 bg-red-500 rounded-full"></span>
              <span>- Expires within 5 days</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span className="h-3 w-3 bg-blue-500 rounded-full"></span>
              <span>- Expired and updated billing details</span>
            </div>
          </div>
        </div>

        <DataTable columns={reservationColumns} data={filteredReservations} isLoading={loading} error={error} />

        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          Reservation + Billing rate content will appear here.
        </div>

        {/* Add New Reservation Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeaderUI><DialogTitleUI>Add New Reservation</DialogTitleUI></DialogHeaderUI>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-green-600 font-medium">State</Label>
                  <Select value={form.state} onValueChange={v => handleChange('state', v)} required>
                    <SelectTrigger className="border-orange-300 focus:border-orange-500 text-orange-700"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{indianStates.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-green-600 font-medium">Branch</Label>
                  <Select value={form.branch} onValueChange={v => handleChange('branch', v)} required disabled={!form.state}>
                    <SelectTrigger className="border-orange-300 focus:border-orange-500 text-orange-700"><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>{branches.filter(b=>b.state === form.state).map(branch => <SelectItem key={branch.branch} value={branch.branch}>{branch.branch}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-green-600 font-medium">Location</Label>
                  <Select value={form.location} onValueChange={v => handleChange('location', v)} required disabled={!form.branch}>
                    <SelectTrigger className="border-orange-300 focus:border-orange-500 text-orange-700"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>{modalLocations.map(loc => <SelectItem key={loc.locationId} value={loc.locationName}>{loc.locationName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-green-600 font-medium">Warehouse</Label>
                  <Select value={form.warehouse} onValueChange={v => handleChange('warehouse', v)} required disabled={!form.branch}>
                    <SelectTrigger className="border-orange-300 focus:border-orange-500 text-orange-700"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                    <SelectContent>{modalWarehouses.map(wh => <SelectItem key={wh.warehouseName} value={wh.warehouseName}>{wh.warehouseName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-green-600 font-medium">Client Name</Label>
                  <Select value={form.client} onValueChange={v => handleChange('client', v)} required>
                    <SelectTrigger className="border-orange-300 focus:border-orange-500 text-orange-700"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>{clients.map(client => <SelectItem key={client.clientId} value={client.firmName}>{client.firmName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-green-600 font-medium">Client ID</Label>
                  <Input value={form.clientId} readOnly className="border-orange-300 focus:border-orange-500 text-orange-700 bg-gray-100" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-green-600 font-medium">Billing Status</Label>
                <Select value={form.billingStatus} onValueChange={v => handleChange('billingStatus', v)}>
                  <SelectTrigger className="border-orange-300 focus:border-orange-500 text-orange-700 w-64"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="reservation">Reservation</SelectItem><SelectItem value="post-reservation">Post Reservation</SelectItem></SelectContent>
                </Select>
              </div>

              {form.billingStatus === 'reservation' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="space-y-2"><Label>Reservation Rate (₹)</Label><Input type="number" min="0" value={form.reservationRate} onChange={e => handleChange('reservationRate', e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Reservation Quantity</Label><Input type="number" min="0" value={form.reservationQty} onChange={e => handleChange('reservationQty', e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Reservation Start Date</Label><Input type="date" value={form.reservationStart || ''} onChange={e => handleChange('reservationStart', e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Reservation End Date</Label><Input type="date" value={form.reservationEnd || ''} onChange={e => handleChange('reservationEnd', e.target.value)} required /></div>
                </div>
              )}

              {form.billingStatus === 'post-reservation' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="space-y-2">
                    <Label>Billing Cycle</Label>
                    <Select value={form.billingCycle} onValueChange={v => handleChange('billingCycle', v)} required>
                      <SelectTrigger><SelectValue placeholder="Select billing cycle" /></SelectTrigger>
                      <SelectContent><SelectItem value="Daily">Daily</SelectItem><SelectItem value="Weekly">Weekly</SelectItem><SelectItem value="Fortnightly">Fortnightly</SelectItem><SelectItem value="Monthly">Monthly</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Billing Type</Label>
                    <Select value={form.billingType} onValueChange={v => handleChange('billingType', v)} required>
                      <SelectTrigger><SelectValue placeholder="Select billing type" /></SelectTrigger>
                      <SelectContent><SelectItem value="Big bag">Big bag</SelectItem><SelectItem value="Small bag">Small bag</SelectItem><SelectItem value="Qty">Qty</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2"><Label>Rate (Rs/MT)</Label><Input type="number" min="0" value={form.billingRate} onChange={e => handleChange('billingRate', e.target.value)} required /></div>
                </div>
              )}

              <div className="flex justify-end pt-4"><Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2 shadow-lg">Add Bill</Button></div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Alert/Update Modal */}
        <Dialog open={alertModal.open} onOpenChange={open => setAlertModal({ ...alertModal, open, row: null })}>
          <DialogContent className="max-w-lg">
            <DialogHeaderUI>
              <DialogTitleUI>
                {alertModal.type === 'aboutToEnd' && 'Reservation Ending Soon'}
                {alertModal.type === 'expired' && 'Reservation Expired'}
                {alertModal.type === 'update' && 'Update Reservation'}
              </DialogTitleUI>
            </DialogHeaderUI>
            {alertModal.row && (
              <>
                {alertModal.type === 'aboutToEnd' && (
                  <div className="space-y-4 text-center p-4">
                    <p>This reservation is ending soon on <strong>{alertModal.row.reservationEnd || '-'}</strong>.</p>
                    <p>Would you like to extend the reservation period?</p>
                    <div className="flex flex-col items-center gap-2 pt-2">
                      <Input type="date" onChange={e => setCalendarDate(e.target.value)} className="w-auto" />
                      <Button className="w-full bg-green-500 hover:bg-green-600 text-white" disabled={!calendarDate} onClick={async () => {
                        if (calendarDate) {
                          await updateReservationField(alertModal.row?.reservationId || '', { reservationEnd: calendarDate });
                          setAlertModal({ open: false, type: '', row: null });
                        }
                      }}>Update End Date</Button>
                    </div>
                  </div>
                )}
                {alertModal.type === 'expired' && (
                  <div className="space-y-4 p-4">
                    <p className="text-center text-red-600 font-bold">This reservation has expired.</p>
                    <p className="text-center">You can add billing details or extend the reservation.</p>
                    <div className="space-y-2">
                      <Label>Billing Cycle</Label>
                      <Select value={billingForm.billingCycle || ''} onValueChange={v => setBillingForm(f => ({ ...f, billingCycle: v }))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Daily">Daily</SelectItem><SelectItem value="Weekly">Weekly</SelectItem><SelectItem value="Fortnightly">Fortnightly</SelectItem><SelectItem value="Monthly">Monthly</SelectItem></SelectContent></Select>
                      <Label>Billing Type</Label>
                      <Select value={billingForm.billingType || ''} onValueChange={v => setBillingForm(f => ({ ...f, billingType: v }))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Big bag">Big bag</SelectItem><SelectItem value="Small bag">Small bag</SelectItem><SelectItem value="Qty">Qty</SelectItem></SelectContent></Select>
                      <Label>Billing Rate (Rs/MT)</Label>
                      <Input type="number" placeholder="Billing Rate" value={billingForm.billingRate === '-' ? '' : (billingForm.billingRate || '')} onChange={e => setBillingForm(f => ({ ...f, billingRate: e.target.value }))} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={async () => {
                          await updateReservationField(alertModal.row?.reservationId || '', billingForm);
                          setAlertModal({ open: false, type: '', row: null });
                      }}>Add Billing</Button>
                      <Button variant="secondary" onClick={() => setCalendarOpen(c => !c)}>Extend Period</Button>
                    </div>
                    {calendarOpen && (
                      <div className="flex items-center gap-2 pt-2">
                        <Input type="date" onChange={e => setCalendarDate(e.target.value || '')} />
                        <Button className="bg-green-500 hover:bg-green-600 text-white" disabled={!calendarDate} onClick={async () => {
                          if(calendarDate) {
                            await updateReservationField(alertModal.row?.reservationId || '', { reservationEnd: calendarDate });
                            setAlertModal({ open: false, type: '', row: null });
                          }
                        }}>Update</Button>
                      </div>
                    )}
                  </div>
                )}
                {alertModal.type === 'update' && (
                  <div className="space-y-4 text-center p-4">
                    {/* <p>Billing details for this reservation have already been added.</p> */}
                    <p>billing details has been updated so now you can change the reservation period  by removing the billing details.</p>
                    <div className="flex justify-center gap-2 pt-4">
                      <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={async () => {
                        await updateReservationField(alertModal.row?.reservationId || '', { billingCycle: '-', billingType: '-', billingRate: '-' });
                        setShowExtendReservation(true);
                      }}>Clear Billing & Extend</Button>
                    </div>
                    {showExtendReservation && (
                      <div className="space-y-4 pt-4">
                        <Button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded shadow" onClick={() => setCalendarOpen(true)}>
                          Extend Reservation
                        </Button>
                        {calendarOpen && (
                          <div className="flex flex-col items-center gap-3 pt-3 bg-green-50 border border-green-200 rounded-lg p-4">
                            <Label className="text-green-700 font-medium mb-1">Select New End Date</Label>
                            <Input type="date" className="border-orange-300 focus:border-orange-500 text-orange-700 w-64" onChange={e => setCalendarDate(e.target.value || '')} />
                            <Button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded shadow mt-2" disabled={!calendarDate} onClick={async () => {
                              if (calendarDate) {
                                await updateReservationField(alertModal.row?.reservationId || '', { reservationEnd: calendarDate });
                                setShowExtendReservation(false);
                                setCalendarOpen(false);
                                setAlertModal({ open: false, type: '', row: null });
                              }
                            }}>Update End Date</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Billing Modal */}
        <Dialog open={editDialog.open} onOpenChange={open => setEditDialog({ open, row: open ? editDialog.row : null })}>
          <DialogContent className="max-w-lg">
            <DialogHeaderUI>
              <DialogTitleUI>Edit Billing Details</DialogTitleUI>
            </DialogHeaderUI>
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleEditBillingSubmit(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Billing Cycle</Label>
                  <Select value={editBillingForm.billingCycle} onValueChange={v => setEditBillingForm(f => ({ ...f, billingCycle: v }))} required>
                    <SelectTrigger><SelectValue placeholder="Select billing cycle" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Billing Type</Label>
                  <Select value={editBillingForm.billingType} onValueChange={v => setEditBillingForm(f => ({ ...f, billingType: v }))} required>
                    <SelectTrigger><SelectValue placeholder="Select billing type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Big bag">Big bag</SelectItem>
                      <SelectItem value="Small bag">Small bag</SelectItem>
                      <SelectItem value="Qty">Qty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Billing Rate (Rs/MT)</Label>
                  <Input type="number" min="0" value={editBillingForm.billingRate} onChange={e => setEditBillingForm(f => ({ ...f, billingRate: e.target.value }))} required />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2 shadow-lg">Update Billing</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Billing Row Modal */}
        <Dialog open={addBillingDialog.open} onOpenChange={open => setAddBillingDialog({ open, row: open ? addBillingDialog.row : null })}>
          <DialogContent className="max-w-lg">
            <DialogHeaderUI>
              <DialogTitleUI>Add Billing Row</DialogTitleUI>
            </DialogHeaderUI>
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleAddBillingRow(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Billing Cycle</Label>
                  <Select value={addBillingForm.billingCycle} onValueChange={v => setAddBillingForm(f => ({ ...f, billingCycle: v }))} required>
                    <SelectTrigger><SelectValue placeholder="Select billing cycle" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Billing Type</Label>
                  <Select value={addBillingForm.billingType} onValueChange={v => setAddBillingForm(f => ({ ...f, billingType: v }))} required>
                    <SelectTrigger><SelectValue placeholder="Select billing type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Big bag">Big bag</SelectItem>
                      <SelectItem value="Small bag">Small bag</SelectItem>
                      <SelectItem value="Qty">Qty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Billing Rate (Rs/MT)</Label>
                  <Input type="number" min="0" value={addBillingForm.billingRate} onChange={e => setAddBillingForm(f => ({ ...f, billingRate: e.target.value }))} required />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-8 py-2 shadow-lg">Add Row</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}