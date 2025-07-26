"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, Download, Plus } from 'lucide-react';
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { DataTable } from '@/components/data-table';

export default function ReleaseOrderPage() {
  const { userRole } = useAuth();
  const router = useRouter();
  // Placeholder state for search
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [inwardOptions, setInwardOptions] = React.useState<any[]>([]);
  const [inwardSearch, setInwardSearch] = React.useState('');
  const [selectedInward, setSelectedInward] = React.useState<any>(null);
  const [releaseBags, setReleaseBags] = React.useState('');
  const [releaseQty, setReleaseQty] = React.useState('');
  const [fileAttachment, setFileAttachment] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  const [currentBalanceBags, setCurrentBalanceBags] = React.useState<number | null>(null);
  const [currentBalanceQty, setCurrentBalanceQty] = React.useState<number | null>(null);
  const [releaseOrders, setReleaseOrders] = React.useState<any[]>([]);
  // For showing previous ROs for the selected SR/WR
  const [previousROs, setPreviousROs] = React.useState<any[]>([]);
  const [showRODetails, setShowRODetails] = React.useState(false);
  const [selectedRO, setSelectedRO] = React.useState<any>(null);
  const [remark, setRemark] = React.useState('');
  const [roStatusUpdating, setROStatusUpdating] = React.useState(false);

  // Fetch all releaseOrders for the table
  React.useEffect(() => {
    const fetchROs = async () => {
      const roCol = collection(db, 'releaseOrders');
      const snap = await getDocs(roCol);
      let data = snap.docs.map((doc, idx) => {
        const d = doc.data();
        // Ensure roCode and roStatus
        return {
          id: doc.id,
          ...d,
          roCode: d.roCode || `RO-${String(idx + 1).padStart(4, '0')}`,
          roStatus: d.roStatus || 'pending',
        };
      });
      // Sort by roCode descending (latest first)
      data.sort((a, b) => (b.roCode || '').localeCompare(a.roCode || ''));
      setReleaseOrders(data);
    };
    fetchROs();
  }, [submitSuccess, roStatusUpdating]);

  // Helper to get balance from DB if not present in row
  const getBalanceBags = (row: any) => {
    if (typeof row.balanceBags === 'number') return row.balanceBags;
    if (row.balanceBags && !isNaN(Number(row.balanceBags))) return Number(row.balanceBags);
    if (typeof row.totalBags === 'number' && typeof row.releaseBags === 'number') {
      return row.totalBags - row.releaseBags;
    }
    return '';
  };
  const getBalanceQty = (row: any) => {
    if (typeof row.balanceQuantity === 'number') return row.balanceQuantity;
    if (row.balanceQuantity && !isNaN(Number(row.balanceQuantity))) return Number(row.balanceQuantity);
    if (typeof row.totalQuantity === 'number' && typeof row.releaseQuantity === 'number') {
      return row.totalQuantity - row.releaseQuantity;
    }
    return '';
  };

  // Group releaseOrders by srwrNo, show only latest per group
  const [expandedRows, setExpandedRows] = React.useState<{ [key: string]: boolean }>({});
  const groupedROs: { [key: string]: any[] } = {};
  releaseOrders.forEach(ro => {
    if (!groupedROs[ro.srwrNo]) groupedROs[ro.srwrNo] = [];
    groupedROs[ro.srwrNo].push(ro);
  });
  // Sort each group by createdAt descending
  Object.values(groupedROs).forEach(group => group.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
  // Only show latest per group in main table
  const latestROs = Object.values(groupedROs).map(group => group[0]);

  // Columns for main table
  const roColumns = [
    {
      accessorKey: 'expand',
      header: '',
      cell: ({ row }: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setExpandedRows(prev => ({ ...prev, [row.original.srwrNo]: !prev[row.original.srwrNo] }));
          }}
        >
          {expandedRows[row.original.srwrNo] ? '▼' : '▶'}
        </Button>
      ),
    },
    { accessorKey: 'roCode', header: 'RO Code', cell: ({ row }: any) => <div>{row.original.roCode || ''}</div> },
    { accessorKey: 'srwrNo', header: 'SR/WR No.', cell: ({ row }: any) => <div style={{ minWidth: 180 }}>{row.original.srwrNo}</div> },
    { accessorKey: 'state', header: 'State' },
    { accessorKey: 'branch', header: 'Branch' },
    { accessorKey: 'warehouseName', header: 'Warehouse Name' },
    { accessorKey: 'warehouseCode', header: 'Warehouse Code' },
    { accessorKey: 'warehouseAddress', header: 'Warehouse Address' },
    { accessorKey: 'clientCode', header: 'Client Code' },
    { accessorKey: 'clientAddress', header: 'Client Address' },
    { accessorKey: 'totalBags', header: 'Total Bags' },
    { accessorKey: 'totalQuantity', header: 'Total Quantity' },
    { accessorKey: 'balanceBags', header: 'Balance Bags', cell: ({ row }: any) => <div>{getBalanceBags(row.original)}</div> },
    { accessorKey: 'balanceQuantity', header: 'Balance Quantity', cell: ({ row }: any) => <div>{getBalanceQty(row.original)}</div> },
    { accessorKey: 'roStatus', header: 'RO Status', cell: ({ row }: any) => (
      <Button variant="link" className="text-blue-600 underline p-0" onClick={() => { setSelectedRO(row.original); setShowRODetails(true); }}>{row.original.roStatus || 'pending'}</Button>
    ) },
  ];

  // Placeholder handler for export
  const handleExportCSV = () => {
    // TODO: Implement export logic
    alert('Export CSV functionality coming soon!');
  };

  // Fetch approved inward entries for SR/WR dropdown
  React.useEffect(() => {
    const fetchInwards = async () => {
      const inwardCol = collection(db, 'inward');
      const q = query(inwardCol, where('status', '==', 'approve'));
      const snap = await getDocs(q);
      const inwardData: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch all inspections once for efficiency
      const inspectionsCol = collection(db, 'inspections');
      const inspectionsSnap = await getDocs(inspectionsCol);
      const inspections = inspectionsSnap.docs.map(doc => doc.data());

      // Map inward entries to include receiptType from inspection
      const merged = inwardData.map(inward => {
        const inspection = inspections.find(
          ins => ins.warehouseName && inward.warehouseName &&
            ins.warehouseName.toLowerCase().trim() === inward.warehouseName.toLowerCase().trim()
        );
        return {
          ...inward,
          receiptType: inspection?.receiptType || 'SR',
        };
      });
      setInwardOptions(merged);
    };
    fetchInwards();
  }, []);

  // Filtered options for dropdown
  const filteredInwardOptions = React.useMemo(() => {
    if (!inwardSearch) return inwardOptions;
    return inwardOptions.filter(opt => {
      const srwr = `${opt.receiptType || 'SR'}-${opt.inwardId || ''}-${opt.dateOfInward || ''}`.toLowerCase();
      return srwr.includes(inwardSearch.toLowerCase());
    });
  }, [inwardOptions, inwardSearch]);

  // When SR/WR is selected, fetch latest balance from releaseOrders or use inward totals
  React.useEffect(() => {
    const fetchLatestBalance = async () => {
      if (!selectedInward) {
        setCurrentBalanceBags(null);
        setCurrentBalanceQty(null);
        return;
      }
      const srwrNo = `${selectedInward.receiptType || 'SR'}-${selectedInward.inwardId || ''}-${selectedInward.dateOfInward || ''}`;
      const releaseOrdersCol = collection(db, 'releaseOrders');
      const q = query(releaseOrdersCol, where('srwrNo', '==', srwrNo));
      const snap = await getDocs(q);
      if (!snap.empty) {
        // Get the latest (by createdAt)
        const sorted = snap.docs
          .map(doc => doc.data())
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setCurrentBalanceBags(Number(sorted[0].balanceBags) || 0);
        setCurrentBalanceQty(Number(sorted[0].balanceQuantity) || 0);
      } else {
        setCurrentBalanceBags(Number(selectedInward.totalBags) || 0);
        setCurrentBalanceQty(Number(selectedInward.totalQuantity) || 0);
      }
    };
    fetchLatestBalance();
  }, [selectedInward]);

  // Fetch previous ROs for the selected SR/WR
  React.useEffect(() => {
    const fetchPrevROs = async () => {
      if (!selectedInward) {
        setPreviousROs([]);
        return;
      }
      const srwrNo = `${selectedInward.receiptType || 'SR'}-${selectedInward.inwardId || ''}-${selectedInward.dateOfInward || ''}`;
      const releaseOrdersCol = collection(db, 'releaseOrders');
      const q = query(releaseOrdersCol, where('srwrNo', '==', srwrNo));
      const snap = await getDocs(q);
      if (!snap.empty) {
        // Sort by createdAt ascending
        const sorted = snap.docs
          .map(doc => doc.data())
          .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        setPreviousROs(sorted);
      } else {
        setPreviousROs([]);
      }
    };
    fetchPrevROs();
  }, [selectedInward, submitSuccess]);

  // Handle file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setFormError('Please select a JPG, JPEG, PNG, or PDF file.');
        setFileAttachment(null);
        e.target.value = '';
      } else {
        setFormError(null);
        setFileAttachment(file);
      }
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitSuccess(false);
    if (!selectedInward) {
      setFormError('Please select a SR/WR No.');
      return;
    }
    if (!releaseBags || !releaseQty) {
      setFormError('Please enter Release Bags and Release Qty.');
      return;
    }
    if (!fileAttachment) {
      setFormError('Please attach a file.');
      return;
    }
    setIsUploading(true);
    let uploadedFileUrl = '';
    try {
      const uploadResult = await uploadToCloudinary(fileAttachment);
      uploadedFileUrl = uploadResult.secure_url;
    } catch (error) {
      setFormError('File upload failed.');
      setIsUploading(false);
      return;
    }
    setIsUploading(false);

    // Generate unique RO code (RO-0001, RO-0002, ...)
    let roCode = '';
    try {
      const releaseOrdersCol = collection(db, 'releaseOrders');
      const allROsSnap = await getDocs(releaseOrdersCol);
      const allROs = allROsSnap.docs.map(doc => doc.data());
      const maxNum = allROs
        .map(ro => {
          const match = typeof ro.roCode === 'string' && ro.roCode.match(/^RO-(\d{4})$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .reduce((a, b) => Math.max(a, b), 0);
      roCode = `RO-${String(maxNum + 1).padStart(4, '0')}`;
    } catch (err) {
      roCode = 'RO-0001';
    }

    // Calculate new balances
    const totalBagsNum = currentBalanceBags !== null ? currentBalanceBags : (Number(selectedInward.totalBags) || 0);
    const totalQtyNum = currentBalanceQty !== null ? currentBalanceQty : (Number(selectedInward.totalQuantity) || 0);
    const releaseBagsNum = Number(releaseBags) || 0;
    const releaseQtyNum = Number(releaseQty) || 0;
    const newBalanceBags = totalBagsNum - releaseBagsNum;
    const newBalanceQty = totalQtyNum - releaseQtyNum;

    const roData = {
      srwrNo: `${selectedInward.receiptType || 'SR'}-${selectedInward.inwardId || ''}-${selectedInward.dateOfInward || ''}`,
      inwardId: selectedInward.inwardId,
      receiptType: selectedInward.receiptType,
      cadNumber: selectedInward.cadNumber,
      state: selectedInward.state,
      branch: selectedInward.branch,
      location: selectedInward.location,
      warehouseName: selectedInward.warehouseName,
      warehouseCode: selectedInward.warehouseCode,
      warehouseAddress: selectedInward.warehouseAddress,
      client: selectedInward.client,
      clientCode: selectedInward.clientCode,
      clientAddress: selectedInward.clientAddress,
      totalBags: totalBagsNum,
      totalQuantity: totalQtyNum,
      balanceBags: newBalanceBags,
      balanceQuantity: newBalanceQty,
      releaseBags: releaseBagsNum,
      releaseQuantity: releaseQtyNum,
      attachmentUrl: uploadedFileUrl,
      createdAt: new Date().toISOString(),
      roCode,
    };
    try {
      await addDoc(collection(db, 'releaseOrders'), roData);
      setSubmitSuccess(true);
      setShowAddModal(false);
      setSelectedInward(null);
      setReleaseBags('');
      setReleaseQty('');
      setFileAttachment(null);
    } catch (error) {
      setFormError('Failed to save Release Order.');
    }
  };

  const handleROStatusChange = async (status: string) => {
    if (!selectedRO) return;
    setROStatusUpdating(true);
    try {
      const roCol = collection(db, 'releaseOrders');
      // Update status and remark
      await addDoc(roCol, {
        ...selectedRO,
        roStatus: status,
        remark,
        updatedAt: new Date().toISOString(),
      });
      setShowRODetails(false);
      setRemark('');
      setSelectedRO(null);
    } catch (err) {
      alert('Failed to update RO status');
    }
    setROStatusUpdating(false);
  };

  // Redirect supervisors who don't have access
  useEffect(() => {
    if (userRole === 'supervisor') {
      router.push('/dashboard');
    }
  }, [userRole, router]);

  if (userRole === 'supervisor') return null;

  return (
    <DashboardLayout>
      {/* Module title and dashboard button row */}
      <div className="flex items-center justify-between mt-4 mb-10 px-8">
        <Button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-2xl font-semibold shadow-lg rounded-xl flex items-center gap-2" onClick={() => router.push('/dashboard')}>
          <span className="text-2xl">&#8592;</span> Dashboard
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-orange-600 inline-block border-b-4 border-[#1aad4b] pb-2 px-10 py-1 bg-orange-50 rounded-xl shadow" style={{ letterSpacing: '0.02em' }}>
            Release Order
          </h1>
        </div>
        <Button className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-sm font-semibold shadow-lg rounded-xl" onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-5 w-5" /> Add RO
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
                placeholder="Search by RO fields..."
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
      {/* Add RO Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-5xl w-full p-2">
          <DialogHeader>
            <DialogTitle>Add Release Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
            {/* SR/WR No. Dropdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="srwr-select">Storage/ Warehouse Receipt No.</Label>
                <Select value={selectedInward ? `${selectedInward.receiptType || 'SR'}-${selectedInward.inwardId || ''}-${selectedInward.dateOfInward || ''}` : ''} onValueChange={val => {
                  const found = inwardOptions.find(opt => `${opt.receiptType || 'SR'}-${opt.inwardId || ''}-${opt.dateOfInward || ''}` === val);
                  setSelectedInward(found || null);
                }}>
                  <SelectTrigger id="srwr-select" className="w-full">
                    <SelectValue placeholder="Select SR/WR No." />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom">
                    <Input
                      placeholder="Type to filter..."
                      value={inwardSearch}
                      onChange={e => setInwardSearch(e.target.value)}
                      className="mb-1"
                    />
                    {filteredInwardOptions.map(opt => (
                      <SelectItem key={opt.inwardId} value={`${opt.receiptType || 'SR'}-${opt.inwardId || ''}-${opt.dateOfInward || ''}`}>{`${opt.receiptType || 'SR'}-${opt.inwardId || ''}-${opt.dateOfInward || ''}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Auto fields */}
            {selectedInward && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>CAD NO</Label>
                  <Input value={selectedInward.cadNumber || ''} readOnly />
                </div>
                <div>
                  <Label>STATE</Label>
                  <Input value={selectedInward.state || ''} readOnly />
                </div>
                <div>
                  <Label>BRANCH</Label>
                  <Input value={selectedInward.branch || ''} readOnly />
                </div>
                <div>
                  <Label>LOCATION</Label>
                  <Input value={selectedInward.location || ''} readOnly />
                </div>
                <div>
                  <Label>WAREHOUSE NAME</Label>
                  <Input value={selectedInward.warehouseName || ''} readOnly />
                </div>
                <div>
                  <Label>WAREHOUSE CODE</Label>
                  <Input value={selectedInward.warehouseCode || ''} readOnly />
                </div>
                <div>
                  <Label>WAREHOUSE ADDRESS</Label>
                  <Input value={selectedInward.warehouseAddress || ''} readOnly />
                </div>
                <div>
                  <Label>CLIENT NAME</Label>
                  <Input value={selectedInward.client || ''} readOnly />
                </div>
                <div>
                  <Label>CLIENT CODE</Label>
                  <Input value={selectedInward.clientCode || ''} readOnly />
                </div>
                <div>
                  <Label>CLIENT ADDRESS</Label>
                  <Input value={selectedInward.clientAddress || ''} readOnly />
                </div>
                <div>
                  <Label>TOTAL BAGS</Label>
                  <Input value={selectedInward.totalBags || ''} readOnly />
                </div>
                <div>
                  <Label>TOTAL QUANTITY (MT)</Label>
                  <Input value={selectedInward.totalQuantity || ''} readOnly />
                </div>
                <div>
                  <Label>BALANCE BAGS</Label>
                  <Input value={currentBalanceBags || ''} readOnly />
                </div>
                <div>
                  <Label>BALANCE QTY (MT)</Label>
                  <Input value={currentBalanceQty || ''} readOnly />
                </div>
                <div>
                  <Label>RELEASE BAGS</Label>
                  <Input value={releaseBags} onChange={e => setReleaseBags(e.target.value)} type="number" min="0" required />
                </div>
                <div>
                  <Label>RELEASE QTY (MT)</Label>
                  <Input value={releaseQty} onChange={e => setReleaseQty(e.target.value)} type="number" min="0" required />
                </div>
                <div className="md:col-span-2">
                  <Label>Attachment (JPG, JPEG, PNG, PDF)</Label>
                  <Input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} required />
                </div>
              </div>
            )}
            {formError && <div className="text-red-600 font-semibold text-center">{formError}</div>}

            {/* Previous ROs Table for this SR/WR */}
            {selectedInward && previousROs.length > 0 && (
              <div className="mb-4">
                <div className="font-semibold mb-2 text-green-700">Previous Release Orders for this SR/WR</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead className="bg-orange-100">
                      <tr>
                        <th className="px-2 py-1 border text-orange-500">Date</th>
                        <th className="px-2 py-1 border text-orange-500">RO Code</th>
                        <th className="px-2 py-1 border text-orange-500">Release Bags</th>
                        <th className="px-2 py-1 border text-orange-500">Release Qty</th>
                        <th className="px-2 py-1 border text-orange-500">Balance Bags</th>
                        <th className="px-2 py-1 border text-orange-500">Balance Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previousROs.map((ro, idx) => (
                        <tr key={ro.roCode || idx} className="even:bg-gray-50">
                          <td className="px-2 py-1 border text-center">{ro.createdAt ? new Date(ro.createdAt).toLocaleDateString('en-GB') : ''}</td>
                          <td className="px-2 py-1 border text-center">{ro.roCode}</td>
                          <td className="px-2 py-1 border text-center">{ro.releaseBags}</td>
                          <td className="px-2 py-1 border text-center">{ro.releaseQuantity}</td>
                          <td className="px-2 py-1 border text-center">{ro.balanceBags}</td>
                          <td className="px-2 py-1 border text-center">{ro.balanceQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={isUploading}>{isUploading ? 'Uploading...' : 'Submit'}</Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* RO table with grouping and expand/collapse */}
      <div className="px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700 text-xl">Release Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="min-w-full border text-sm">
              <thead className="bg-orange-100">
                <tr>
                  <th className="px-2 py-1 border"></th>
                  <th className="px-2 py-1 border">RO Code</th>
                  <th className="px-2 py-1 border">SR/WR No.</th>
                  <th className="px-2 py-1 border">State</th>
                  <th className="px-2 py-1 border">Branch</th>
                  <th className="px-2 py-1 border">Warehouse Name</th>
                  <th className="px-2 py-1 border">Warehouse Code</th>
                  <th className="px-2 py-1 border">Warehouse Address</th>
                  <th className="px-2 py-1 border">Client Code</th>
                  <th className="px-2 py-1 border">Client Address</th>
                  <th className="px-2 py-1 border">Total Bags</th>
                  <th className="px-2 py-1 border">Total Quantity</th>
                  <th className="px-2 py-1 border">Balance Bags</th>
                  <th className="px-2 py-1 border">Balance Quantity</th>
                  <th className="px-2 py-1 border">RO Status</th>
                </tr>
              </thead>
              <tbody>
                {latestROs.map(ro => (
                  <React.Fragment key={ro.roCode}>
                    <tr className="even:bg-gray-50">
                      <td className="px-2 py-1 border text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedRows(prev => ({ ...prev, [ro.srwrNo]: !prev[ro.srwrNo] }))}
                        >
                          {expandedRows[ro.srwrNo] ? '▼' : '▶'}
                        </Button>
                      </td>
                      <td className="px-2 py-1 border text-center">{ro.roCode}</td>
                      <td className="px-2 py-1 border text-center">{ro.srwrNo}</td>
                      <td className="px-2 py-1 border text-center">{ro.state}</td>
                      <td className="px-2 py-1 border text-center">{ro.branch}</td>
                      <td className="px-2 py-1 border text-center">{ro.warehouseName}</td>
                      <td className="px-2 py-1 border text-center">{ro.warehouseCode}</td>
                      <td className="px-2 py-1 border text-center">{ro.warehouseAddress}</td>
                      <td className="px-2 py-1 border text-center">{ro.clientCode}</td>
                      <td className="px-2 py-1 border text-center">{ro.clientAddress}</td>
                      <td className="px-2 py-1 border text-center">{ro.totalBags}</td>
                      <td className="px-2 py-1 border text-center">{ro.totalQuantity}</td>
                      <td className="px-2 py-1 border text-center">{getBalanceBags(ro)}</td>
                      <td className="px-2 py-1 border text-center">{getBalanceQty(ro)}</td>
                      <td className="px-2 py-1 border text-center">
                        <Button variant="link" className="text-blue-600 underline p-0" onClick={() => { setSelectedRO(ro); setShowRODetails(true); }}>{ro.roStatus || 'pending'}</Button>
                      </td>
                    </tr>
                    {expandedRows[ro.srwrNo] && (
                      <tr>
                        <td colSpan={15} className="p-0">
                          <div className="bg-gray-50 border-t">
                            <div className="font-semibold mb-2 text-green-700 px-4 pt-2">All Release Orders for SR/WR No. {ro.srwrNo}</div>
                            <div className="overflow-x-auto px-4 pb-2">
                              <table className="min-w-full border text-xs">
                                <thead className="bg-orange-50">
                                  <tr>
                                    <th className="px-2 py-1 border">Date</th>
                                    <th className="px-2 py-1 border">RO Code</th>
                                    <th className="px-2 py-1 border">Release Bags</th>
                                    <th className="px-2 py-1 border">Release Qty</th>
                                    <th className="px-2 py-1 border">Balance Bags</th>
                                    <th className="px-2 py-1 border">Balance Qty</th>
                                    <th className="px-2 py-1 border">RO Status</th>
                                    <th className="px-2 py-1 border">Attachment</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {groupedROs[ro.srwrNo].map((entry, idx) => (
                                    <tr key={entry.roCode || idx} className="even:bg-gray-100">
                                      <td className="px-2 py-1 border text-center">{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-GB') : ''}</td>
                                      <td className="px-2 py-1 border text-center">{entry.roCode}</td>
                                      <td className="px-2 py-1 border text-center">{entry.releaseBags}</td>
                                      <td className="px-2 py-1 border text-center">{entry.releaseQuantity}</td>
                                      <td className="px-2 py-1 border text-center">{entry.balanceBags}</td>
                                      <td className="px-2 py-1 border text-center">{entry.balanceQuantity}</td>
                                      <td className="px-2 py-1 border text-center">
                                        <Button variant="link" className="text-blue-600 underline p-0" onClick={() => { setSelectedRO(entry); setShowRODetails(true); }}>{entry.roStatus || 'pending'}</Button>
                                      </td>
                                      <td className="px-2 py-1 border text-center">
                                        {entry.attachmentUrl ? <a href={entry.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a> : <span className="text-gray-400">No file</span>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        {/* RO Details Dialog */}
        <Dialog open={showRODetails} onOpenChange={setShowRODetails}>
          <DialogContent className="max-w-5xl w-full p-2">
            <DialogHeader>
              <DialogTitle>RO Details</DialogTitle>
            </DialogHeader>
            {selectedRO && (
              <form className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>RO Code</Label><Input value={selectedRO.roCode || ''} readOnly /></div>
                  <div><Label>Status</Label><Input value={selectedRO.roStatus || 'pending'} readOnly /></div>
                  <div><Label>SR/WR No.</Label><Input value={selectedRO.srwrNo || ''} readOnly /></div>
                  <div><Label>CAD Number</Label><Input value={selectedRO.cadNumber || ''} readOnly /></div>
                  <div><Label>State</Label><Input value={selectedRO.state || ''} readOnly /></div>
                  <div><Label>Branch</Label><Input value={selectedRO.branch || ''} readOnly /></div>
                  <div><Label>Location</Label><Input value={selectedRO.location || ''} readOnly /></div>
                  <div><Label>Warehouse Name</Label><Input value={selectedRO.warehouseName || ''} readOnly /></div>
                  <div><Label>Warehouse Code</Label><Input value={selectedRO.warehouseCode || ''} readOnly /></div>
                  <div><Label>Warehouse Address</Label><Input value={selectedRO.warehouseAddress || ''} readOnly /></div>
                  <div><Label>Client Name</Label><Input value={selectedRO.client || ''} readOnly /></div>
                  <div><Label>Client Code</Label><Input value={selectedRO.clientCode || ''} readOnly /></div>
                  <div><Label>Client Address</Label><Input value={selectedRO.clientAddress || ''} readOnly /></div>
                  <div><Label>Total Bags</Label><Input value={selectedRO.totalBags || ''} readOnly /></div>
                  <div><Label>Total Quantity</Label><Input value={selectedRO.totalQuantity || ''} readOnly /></div>
                  <div><Label>Balance Bags</Label><Input value={getBalanceBags(selectedRO)} readOnly /></div>
                  <div><Label>Balance Quantity</Label><Input value={getBalanceQty(selectedRO)} readOnly /></div>
                  <div><Label>Release Bags</Label><Input value={selectedRO.releaseBags || ''} readOnly /></div>
                  <div><Label>Release Quantity</Label><Input value={selectedRO.releaseQuantity || ''} readOnly /></div>
                  <div><Label>Attachment</Label>{selectedRO.attachmentUrl ? <a href={selectedRO.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View File</a> : <span className="text-gray-400">No file</span>}</div>
                </div>
                <div className="mt-4">
                  <Label>Remark</Label>
                  <Input value={remark} onChange={e => setRemark(e.target.value)} placeholder="Enter remark..." />
                </div>
                <div className="flex gap-4 mt-4 justify-end">
                  <Button type="button" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleROStatusChange('approved')} disabled={roStatusUpdating}>Approve</Button>
                  <Button type="button" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleROStatusChange('rejected')} disabled={roStatusUpdating}>Reject</Button>
                  <Button type="button" className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={() => handleROStatusChange('resubmitted')} disabled={roStatusUpdating}>Resubmit</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}