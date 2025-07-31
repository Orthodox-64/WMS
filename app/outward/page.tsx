'use client';

import DashboardLayout from '@/components/dashboard-layout';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Download, Plus, AlertTriangle, Trash2, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, doc, updateDoc } from 'firebase/firestore';
import { uploadToCloudinary } from '@/lib/cloudinary';
import PrintableOutwardReceipt from '@/components/PrintableOutwardReceipt';

export default function OutwardPage() {
  const { user } = useAuth();
  const userRole = user?.role || 'user';
  const router = useRouter();
  
  // State variables
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [doOptions, setDoOptions] = React.useState<any[]>([]);
  const [doSearch, setDoSearch] = React.useState('');
  const [selectedDO, setSelectedDO] = React.useState<any>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  
  // Form fields
  const [outwardBags, setOutwardBags] = React.useState('');
  const [outwardQty, setOutwardQty] = React.useState('');
  const [vehicleNumber, setVehicleNumber] = React.useState('');
  const [gatepass, setGatepass] = React.useState('');
  const [weighbridgeName, setWeighbridgeName] = React.useState('');
  const [weighbridgeSlipNo, setWeighbridgeSlipNo] = React.useState('');
  const [stackEntries, setStackEntries] = React.useState<any[]>([]);
  const [fileAttachments, setFileAttachments] = React.useState<File[]>([]);
  
  // Status variables
  const [isUploading, setIsUploading] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  const [currentBalanceBags, setCurrentBalanceBags] = React.useState<number | null>(null);
  const [currentBalanceQty, setCurrentBalanceQty] = React.useState<number | null>(null);
  
  // Outward data
  const [outwardEntries, setOutwardEntries] = React.useState<any[]>([]);
  const [showOutwardDetails, setShowOutwardDetails] = React.useState(false);
  const [selectedOutward, setSelectedOutward] = React.useState<any>(null);
  const [remark, setRemark] = React.useState('');
  const [outwardStatusUpdating, setOutwardStatusUpdating] = React.useState(false);
  
  // Fetch all outward entries for the table
  React.useEffect(() => {
    const fetchOutwards = async () => {
      const outwardCol = collection(db, 'outwards');
      const snap = await getDocs(outwardCol);
      let data = snap.docs.map((doc, idx) => {
        const d = doc.data();
        // Ensure outwardCode and outwardStatus
        return {
          id: doc.id,
          ...d,
          outwardCode: d.outwardCode || `OUT-${String(idx + 1).padStart(4, '0')}`,
          outwardStatus: d.outwardStatus || 'pending',
        };
      });
      // Sort by outwardCode descending (latest first)
      data.sort((a, b) => (b.outwardCode || '').localeCompare(a.outwardCode || ''));
      setOutwardEntries(data);
    };
    fetchOutwards();
  }, [submitSuccess, outwardStatusUpdating]);
  
  // Fetch DOs for the dropdown
  React.useEffect(() => {
    const fetchDOs = async () => {
      try {
        // Fetch approved DOs
        const doCol = collection(db, 'deliveryOrders');
        const doQ = query(doCol, where('doStatus', '==', 'approved'));
        const doSnap = await getDocs(doQ);
        
        // Fetch all existing outwards to check balances
        const outwardCol = collection(db, 'outwards');
        const outwardSnap = await getDocs(outwardCol);
        const allOutwards = outwardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Group outwards by DO code for balance calculation
        const outwardsByDO: Record<string, any[]> = {};
        
        // Loop through each outward and group by DO code
        allOutwards.forEach((outwardItem: any) => {
          const doCode = outwardItem.doCode;
          if (doCode) {
            if (!outwardsByDO[doCode]) {
              outwardsByDO[doCode] = [];
            }
            outwardsByDO[doCode].push(outwardItem);
          }
        });
        
        // Calculate balances for DOs taking into account existing outwards
        const doData: any[] = doSnap.docs.map(doc => {
          const docData = doc.data() as any;
          const doData = { 
            id: doc.id, 
            ...docData
          };
          
          // Calculate remaining balance by checking existing outwards
          const doCode = doData.doCode as string | undefined;
          const existingOutwards = doCode ? (outwardsByDO[doCode] || []) : [];
          
          // Start with DO bags and quantity
          let balanceBags = Number(doData.doBags || 0);
          let balanceQuantity = Number(doData.doQuantity || 0);
          
          // Subtract outward quantities from each existing outward
          if (existingOutwards.length > 0) {
            console.log(`Found ${existingOutwards.length} existing outwards for ${doCode}`);
            
            existingOutwards.forEach((outwardItem: any) => {
              const outwardBags = Number(outwardItem.outwardBags || 0);
              const outwardQty = Number(outwardItem.outwardQuantity || 0);
              
              console.log(`Subtracting outward ${outwardItem.outwardCode}: ${outwardBags} bags, ${outwardQty} quantity`);
              
              balanceBags -= outwardBags;
              balanceQuantity -= outwardQty;
            });
          }
          
          // Ensure balance doesn't go below zero
          balanceBags = Math.max(0, balanceBags);
          balanceQuantity = Math.max(0, balanceQuantity);
          
          console.log(`DO ${doCode}: Final balance ${balanceBags} bags, ${balanceQuantity.toFixed(2)} quantity`);
          
          // Add calculated balances to DO data
          return {
            ...doData,
            balanceBags,
            balanceQuantity
          };
        })
        // Filter out DOs with zero balance
        .filter(doItem => doItem.balanceBags > 0);
        
        console.log(`Found ${doData.length} DOs with positive balance`);
        setDoOptions(doData);
        
      } catch (error) {
        console.error("Error fetching DOs:", error);
      }
    };
    
    fetchDOs();
  }, []);

  // Helper to get balance from DO bags/quantity
  const getBalanceBags = (row: any) => {
    if (typeof row.balanceBags === 'number') return row.balanceBags;
    if (row.balanceBags && !isNaN(Number(row.balanceBags))) return Number(row.balanceBags);
    if (typeof row.doBags === 'number' && typeof row.outwardBags === 'number') {
      return row.doBags - row.outwardBags;
    }
    return '';
  };
  
  const getBalanceQty = (row: any) => {
    if (typeof row.balanceQuantity === 'number') return row.balanceQuantity;
    if (row.balanceQuantity && !isNaN(Number(row.balanceQuantity))) return Number(row.balanceQuantity);
    if (typeof row.doQuantity === 'number' && typeof row.outwardQuantity === 'number') {
      return row.doQuantity - row.outwardQuantity;
    }
    return '';
  };
  
  // Helper function to calculate total bags and quantity from stack entries
  const calculateTotalBagsAndQuantity = (entries: any[]) => {
    // Calculate totals from stack entries
    const totalBags = entries.reduce((sum, stack) => sum + (Number(stack.bags) || 0), 0);
    const totalQty = entries.reduce((sum, stack) => sum + (Number(stack.quantity) || 0), 0);
    
    // Update the outward totals
    setOutwardBags(totalBags.toString());
    setOutwardQty(totalQty.toFixed(3));
    
    console.log(`Updated totals: ${totalBags} bags, ${totalQty.toFixed(3)} MT`);
  };

  // Group outward entries by srwrNo, show only latest per group
  const [expandedRows, setExpandedRows] = React.useState<{ [key: string]: boolean }>({});
  const groupedOutwards: { [key: string]: any[] } = {};
  outwardEntries.forEach(outward => {
    if (!groupedOutwards[outward.srwrNo]) groupedOutwards[outward.srwrNo] = [];
    groupedOutwards[outward.srwrNo].push(outward);
  });
  // Sort each group by createdAt descending
  Object.values(groupedOutwards).forEach(group => group.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
  // Only show latest per group in main table
  const latestOutwards = Object.values(groupedOutwards).map(group => group[0]);
  
  // Filter DO options based on search input
  const filteredDOOptions = React.useMemo(() => {
    if (!doSearch) return doOptions;
    
    const searchLower = doSearch.toLowerCase();
    return doOptions.filter(option => {
      const srwrNo = (option.srwrNo || '').toLowerCase();
      const doCode = (option.doCode || '').toLowerCase();
      const client = (option.client || '').toLowerCase();
      const warehouseName = (option.warehouseName || '').toLowerCase();
      
      return srwrNo.includes(searchLower) || 
             doCode.includes(searchLower) || 
             client.includes(searchLower) || 
             warehouseName.includes(searchLower);
    });
  }, [doSearch, doOptions]);
  
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <Button onClick={() => router.push('/dashboard')} variant="ghost" className="flex items-center bg-orange-500 text-white hover:bg-orange-600">
            ← Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-orange-600 text-center flex-1">Outward</h1>
          <Button onClick={() => setShowAddModal(true)} className="bg-green-500 hover:bg-green-600 text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Outward
          </Button>
        </div>

        {/* Search and Export */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
          <div className="text-lg font-semibold text-blue-800 mb-3">Search & Export Options</div>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="mr-2 text-gray-600">Search:</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Search by outward fields..."
                  className="pl-8 w-[400px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={() => alert('Export functionality will be added soon')} className="bg-blue-500 hover:bg-blue-600 text-white">
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="py-3 px-4 bg-blue-50 border-b border-blue-100">
            <h2 className="text-blue-700 text-xl font-semibold">Outward Entries</h2>
          </div>
          <div className="overflow-x-auto">
            {outwardEntries.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No outward entries found. Click "Add Outward" to create your first entry.
              </div>
            ) : (
              <table className="min-w-full border text-sm">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="px-3 py-2 border"></th>
                    <th className="px-3 py-2 border">Outward Code</th>
                    <th className="px-3 py-2 border">SR/WR No.</th>
                    <th className="px-3 py-2 border">DO Code</th>
                    <th className="px-3 py-2 border">State</th>
                    <th className="px-3 py-2 border">Branch</th>
                    <th className="px-3 py-2 border">Warehouse Name</th>
                    <th className="px-3 py-2 border">Warehouse Code</th>
                    <th className="px-3 py-2 border">Client Name</th>
                    <th className="px-3 py-2 border">Vehicle Number</th>
                    <th className="px-3 py-2 border">DO Bags</th>
                    <th className="px-3 py-2 border">DO Qty (MT)</th>
                    <th className="px-3 py-2 border">Outward Bags</th>
                    <th className="px-3 py-2 border">Outward Qty (MT)</th>
                    <th className="px-3 py-2 border">Balance Bags</th>
                    <th className="px-3 py-2 border">Balance Qty (MT)</th>
                    <th className="px-3 py-2 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {latestOutwards.map((outward) => (
                    <React.Fragment key={outward.outwardCode}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 py-2 border">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1"
                            onClick={() => {
                              setExpandedRows(prev => ({ ...prev, [outward.srwrNo]: !prev[outward.srwrNo] }));
                            }}
                          >
                            {expandedRows[outward.srwrNo] ? '▼' : '▶'}
                          </Button>
                        </td>
                        <td className="px-3 py-2 border">{outward.outwardCode}</td>
                        <td className="px-3 py-2 border">{outward.srwrNo}</td>
                        <td className="px-3 py-2 border">{outward.doCode}</td>
                        <td className="px-3 py-2 border">{outward.state}</td>
                        <td className="px-3 py-2 border">{outward.branch}</td>
                        <td className="px-3 py-2 border">{outward.warehouseName}</td>
                        <td className="px-3 py-2 border">{outward.warehouseCode}</td>
                        <td className="px-3 py-2 border">{outward.client}</td>
                        <td className="px-3 py-2 border">{outward.vehicleNumber}</td>
                        <td className="px-3 py-2 border">{outward.doBags}</td>
                        <td className="px-3 py-2 border">{outward.doQuantity}</td>
                        <td className="px-3 py-2 border">{outward.outwardBags}</td>
                        <td className="px-3 py-2 border">{outward.outwardQuantity}</td>
                        <td className="px-3 py-2 border">{getBalanceBags(outward)}</td>
                        <td className="px-3 py-2 border">{getBalanceQty(outward)}</td>
                        <td className="px-3 py-2 border">
                          <Button 
                            variant="link" 
                            className="text-blue-600 underline p-0" 
                            onClick={() => { 
                              setSelectedOutward(outward); 
                              setShowOutwardDetails(true); 
                            }}
                          >
                            {outward.outwardStatus || 'pending'}
                          </Button>
                        </td>
                      </tr>
                      
                      {/* Expanded row for previous entries */}
                      {expandedRows[outward.srwrNo] && groupedOutwards[outward.srwrNo] && groupedOutwards[outward.srwrNo].length > 1 && (
                        <tr>
                          <td colSpan={17} className="p-0">
                            <div className="bg-gray-50 p-4">
                              <div className="text-sm font-medium mb-2">Previous Outward Entries for this SR/WR</div>
                              <div className="overflow-x-auto">
                                <table className="w-full border text-xs">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-2 py-1 border">Date</th>
                                      <th className="px-2 py-1 border">Outward Code</th>
                                      <th className="px-2 py-1 border">Vehicle Number</th>
                                      <th className="px-2 py-1 border">Outward Bags</th>
                                      <th className="px-2 py-1 border">Outward Qty</th>
                                      <th className="px-2 py-1 border">Balance Bags</th>
                                      <th className="px-2 py-1 border">Balance Qty</th>
                                      <th className="px-2 py-1 border">Status</th>
                                      <th className="px-2 py-1 border">Attachment</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {groupedOutwards[outward.srwrNo]
                                      .filter((_, idx) => idx > 0) // Skip the first one (already shown in main table)
                                      .map((entry, idx) => (
                                        <tr key={entry.outwardCode} className="even:bg-gray-100">
                                          <td className="px-2 py-1 border text-center">{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-GB') : ''}</td>
                                          <td className="px-2 py-1 border text-center">{entry.outwardCode}</td>
                                          <td className="px-2 py-1 border text-center">{entry.vehicleNumber}</td>
                                          <td className="px-2 py-1 border text-center">{entry.outwardBags}</td>
                                          <td className="px-2 py-1 border text-center">{entry.outwardQuantity}</td>
                                          <td className="px-2 py-1 border text-center">{getBalanceBags(entry)}</td>
                                          <td className="px-2 py-1 border text-center">{getBalanceQty(entry)}</td>
                                          <td className="px-2 py-1 border text-center">
                                            <div className="flex items-center justify-center gap-2">
                                              <span>{entry.outwardStatus || 'pending'}</span>
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="p-1" 
                                                title="View Details" 
                                                onClick={() => { 
                                                  setSelectedOutward(entry); 
                                                  setShowOutwardDetails(true); 
                                                }}
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-blue-600">
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12z" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                                                </svg>
                                              </Button>
                                            </div>
                                          </td>
                                          <td className="px-2 py-1 border text-center">
                                            {Array.isArray(entry.attachmentUrls) && entry.attachmentUrls.length > 0 ? 
                                              <a href={entry.attachmentUrls[0]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a> : 
                                              <span className="text-gray-400">No file</span>
                                            }
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
            )}
          </div>
        </div>
      </div>
      
      {/* Add Outward Dialog (Form) */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-center text-blue-600 font-bold">
              Create New Outward Entry
              <div className="mt-1 text-sm font-normal text-gray-600">
                Create an outward entry based on a Delivery Order (DO)
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            setFormError(null);

            if (!selectedDO) {
              setFormError('Please select a DO');
              return;
            }
            
            // Check for mandatory attachment
            if (fileAttachments.length === 0) {
              setFormError('Please upload at least one attachment');
              return;
            }

            // Validate outward bags and quantity
            const obBags = Number(outwardBags);
            const oQuantity = Number(outwardQty);
            const balanceBags = currentBalanceBags || 0;
            const balanceQty = currentBalanceQty || 0;

            // Check if balance is zero - if so, prevent creation
            if (balanceBags <= 0 || balanceQty <= 0) {
              setFormError('No remaining balance available for this Delivery Order');
              return;
            }

            if (isNaN(obBags) || obBags <= 0) {
              setFormError('Please enter valid number of bags');
              return;
            }
            if (isNaN(oQuantity) || oQuantity <= 0) {
              setFormError('Please enter valid quantity');
              return;
            }
            
            // Check stack entries total
            const totalStackBags = stackEntries.reduce((sum, stack) => sum + Number(stack.bags || 0), 0);
            if (totalStackBags !== obBags) {
              setFormError(`Total stack bags (${totalStackBags}) must match outward bags (${obBags})`);
              return;
            }
            
            if (obBags > balanceBags) {
              setFormError(`Cannot release more than available balance bags (${balanceBags})`);
              return;
            }
            if (oQuantity > balanceQty) {
              setFormError(`Cannot release more than available balance quantity (${balanceQty})`);
              return;
            }
            
            // Basic validations
            if (!vehicleNumber.trim()) {
              setFormError('Vehicle number is required');
              return;
            }
            if (!gatepass.trim()) {
              setFormError('Gatepass is required');
              return;
            }
            if (!weighbridgeName.trim()) {
              setFormError('Weighbridge name is required');
              return;
            }
            if (!weighbridgeSlipNo.trim()) {
              setFormError('Weighbridge slip number is required');
              return;
            }

            try {
              setIsUploading(true);
              let attachmentUrls: string[] = [];
              let hasUploadErrors = false;

              // Upload attachments if any
              if (fileAttachments.length > 0) {
                for (const file of fileAttachments) {
                  try {
                    console.log(`Uploading file: ${file.name}, type: ${file.type}, size: ${file.size}`);
                    const result = await uploadToCloudinary(file);
                    if (result && result.secure_url) {
                      console.log(`Upload successful: ${result.secure_url}`);
                      attachmentUrls.push(result.secure_url);
                    }
                  } catch (uploadError) {
                    hasUploadErrors = true;
                    console.error(`Error uploading file ${file.name}:`, uploadError);
                    // Continue with next file even if this one fails
                  }
                }
                
                // Show warning if some uploads failed
                if (hasUploadErrors && attachmentUrls.length < fileAttachments.length) {
                  alert(`Some files failed to upload. ${attachmentUrls.length} of ${fileAttachments.length} were successful.`);
                }
              }

              // Prepare outward data
              const newBalanceBags = balanceBags - obBags;
              const newBalanceQty = balanceQty - oQuantity;

              // Get next outward code number
              const outwardCol = collection(db, 'outwards');
              const outwardSnap = await getDocs(outwardCol);
              const outwardCount = outwardSnap.size;
              const newOutwardCode = `OUT-${String(outwardCount + 1).padStart(4, '0')}`;

              // Create new outward record
              const outwardData = {
                outwardCode: newOutwardCode,
                srwrNo: selectedDO.srwrNo,
                doCode: selectedDO.doCode,
                cadNumber: selectedDO.cadNumber,
                state: selectedDO.state,
                branch: selectedDO.branch,
                location: selectedDO.location,
                warehouseName: selectedDO.warehouseName,
                warehouseCode: selectedDO.warehouseCode,
                warehouseAddress: selectedDO.warehouseAddress,
                client: selectedDO.client,
                clientCode: selectedDO.clientCode,
                clientAddress: selectedDO.clientAddress,
                
                // DO data
                doBags: selectedDO.doBags,
                doQuantity: selectedDO.doQuantity,
                
                // Outward specific data
                outwardBags: obBags,
                outwardQuantity: oQuantity,
                vehicleNumber,
                gatepass,
                weighbridgeName,
                weighbridgeSlipNo,
                
                // Stack entries
                stackEntries: stackEntries.map(stack => ({
                  stackNo: stack.stackNo,
                  bags: Number(stack.bags),
                  quantity: Number(stack.quantity)
                })),
                
                // Balance and other data
                balanceBags: newBalanceBags,
                balanceQuantity: newBalanceQty,
                attachmentUrls,
                remark,
                outwardStatus: 'pending',
                createdAt: new Date().toISOString(),
                createdBy: userRole
              };

              await addDoc(collection(db, 'outwards'), outwardData);
              
              setSubmitSuccess(true);
              setIsUploading(false);
              setShowAddModal(false);
              
              // Reset form
              setSelectedDO(null);
              setOutwardBags('');
              setOutwardQty('');
              setVehicleNumber('');
              setGatepass('');
              setWeighbridgeName('');
              setWeighbridgeSlipNo('');
              setStackEntries([]);
              setFileAttachments([]);
              setRemark('');

              // Reset success flag after a delay
              setTimeout(() => {
                setSubmitSuccess(false);
              }, 3000);
            } catch (error: any) {
              console.error('Error submitting outward:', error);
              setFormError(`An error occurred: ${error?.message || 'Unknown error'}. Please try again.`);
              setIsUploading(false);
            }
          }} className="overflow-y-auto pr-1">
            {formError && <div className="bg-red-100 p-3 mb-4 text-red-600 rounded-md text-center font-medium">{formError}</div>}
            
            <div className="space-y-5 pt-4">
              {/* DO Selection */}
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <Label htmlFor="do-select" className="text-blue-800 font-semibold text-lg mb-2 block">
                  Select Delivery Order
                </Label>
                <div className="relative">
                  <div className="relative mb-1">
                    <Input
                      ref={searchInputRef}
                      placeholder="Type to search by SR/WR No or DO Code..."
                      value={doSearch}
                      onChange={(e) => setDoSearch(e.target.value)}
                      className="mb-1 pr-8 border-2 border-blue-300 focus:border-blue-500"
                      autoFocus
                    />
                    {doSearch && (
                      <button 
                        type="button" 
                        onClick={() => setDoSearch('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* Filtered options display count */}
                  {doSearch && (
                    <div className="text-xs mb-2">
                      <span className={`${filteredDOOptions.length > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {filteredDOOptions.length} {filteredDOOptions.length === 1 ? 'result' : 'results'} found
                        {filteredDOOptions.length === 0 && doSearch.length > 0 && " - Try partial SR/WR number or DO code"}
                      </span>
                    </div>
                  )}
                  
                  {/* Debug info */}
                  <div className="text-xs mb-2 text-blue-600">
                    Available DOs: {doOptions.length} | 
                    Filtered: {filteredDOOptions.length} | 
                    With positive balance: {filteredDOOptions.filter(opt => 
                      (opt.balanceBags !== undefined ? Number(opt.balanceBags) : 
                        (opt.doBags !== undefined ? Number(opt.doBags) : 0)) > 0
                    ).length}
                  </div>
                  
                  <Select
                    value={selectedDO?.id || ''}
                    onValueChange={(value) => {
                      const selected = doOptions.find(doItem => doItem.id === value);
                      setSelectedDO(selected || null);
                      
                      // When a DO is selected, update current balance values
                      if (selected) {
                        setCurrentBalanceBags(Number(selected.balanceBags || 0));
                        setCurrentBalanceQty(Number(selected.balanceQuantity || 0));
                        
                        // Reset outward values
                        setOutwardBags('');
                        setOutwardQty('');
                        
                        // Fetch stack information from the inward collection
                        const fetchStackInfo = async () => {
                          try {
                            // We need to find the original inward entry based on SR/WR No
                            const inwardCol = collection(db, 'inward');
                            const inwardSnap = await getDocs(inwardCol);
                            const inwardEntries = inwardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                            
                            // Find the matching inward by srwrNo
                            const matchingInward = inwardEntries.find((entry: any) => {
                              const inwardSrWr = `${entry.receiptType || 'SR'}-${entry.inwardId || ''}-${entry.dateOfInward || ''}`;
                              return inwardSrWr === selected.srwrNo;
                            }) as any; // Type assertion to any since we know the structure
                            
                            if (matchingInward && matchingInward.stackDetails) {
                              console.log('Found matching inward with stack details:', matchingInward.stackDetails);
                              
                              // Convert stack details to our format
                              const stackData = Object.entries(matchingInward.stackDetails || {}).map(([stackNo, details]: [string, any]) => ({
                                stackNo,
                                bags: '',  // User will input this
                                quantity: '', // User will input this
                                inwardBags: details.bags || 0  // Original bags from inward
                              }));
                              
                              setStackEntries(stackData);
                            } else {
                              console.log('No matching inward found or no stack details');
                              // Add a default stack entry as fallback
                              setStackEntries([{
                                stackNo: 'Stack-1',
                                bags: '',
                                quantity: '',
                                inwardBags: 0
                              }]);
                            }
                          } catch (error) {
                            console.error('Error fetching stack information:', error);
                            setStackEntries([{
                              stackNo: 'Stack-1',
                              bags: '',
                              quantity: '',
                              inwardBags: 0
                            }]);
                          }
                        };
                        
                        fetchStackInfo();
                      } else {
                        setCurrentBalanceBags(null);
                        setCurrentBalanceQty(null);
                        setStackEntries([]);
                      }
                    }}
                  >
                    <SelectTrigger id="do-select" className="bg-white">
                      <SelectValue placeholder="Select Delivery Order" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {filteredDOOptions
                        .filter(option => {
                          // Only show options with positive balance
                          const balanceBags = option.balanceBags !== undefined ? 
                            Number(option.balanceBags) : 
                            (option.doBags !== undefined ? Number(option.doBags) : 0);
                          return balanceBags > 0;
                        })
                        .map(option => {
                          // Get the balance for display
                          const balanceBags = option.balanceBags !== undefined ? 
                            Number(option.balanceBags) : 
                            (option.doBags !== undefined ? Number(option.doBags) : 0);
                            
                          return (
                            <SelectItem 
                              key={option.id} 
                              value={option.id}
                            >
                              <span>
                                {option.doCode} - {option.srwrNo}
                                <span className="ml-2 text-green-700">
                                  (Balance: {balanceBags} bags)
                                </span>
                              </span>
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Auto-populated Fields */}
              {selectedDO && (
                <div className="grid grid-cols-2 gap-6 p-4 bg-blue-50 rounded-md border border-blue-200">
                  <div>
                    <Label className="text-blue-800 font-medium">SR/WR NO</Label>
                    <Input value={selectedDO.srwrNo || ''} readOnly className="bg-white border-blue-100" />
                  </div>
                  <div>
                    <Label className="text-blue-800 font-medium">CAD NUMBER</Label>
                    <Input value={selectedDO.cadNumber || ''} readOnly className="bg-white border-blue-100" />
                  </div>
                  <div>
                    <Label className="text-blue-800 font-medium">STATE</Label>
                    <Input value={selectedDO.state || ''} readOnly className="bg-white border-blue-100" />
                  </div>
                  <div>
                    <Label className="text-blue-800 font-medium">BRANCH</Label>
                    <Input value={selectedDO.branch || ''} readOnly className="bg-white border-blue-100" />
                  </div>
                  <div>
                    <Label className="text-blue-800 font-medium">LOCATION</Label>
                    <Input value={selectedDO.location || ''} readOnly className="bg-white border-blue-100" />
                  </div>
                  <div>
                    <Label className="text-blue-800 font-medium">WAREHOUSE NAME</Label>
                    <Input value={selectedDO.warehouseName || ''} readOnly className="bg-white border-blue-100" />
                  </div>
                  <div>
                    <Label className="text-blue-800 font-medium">WAREHOUSE CODE</Label>
                    <Input value={selectedDO.warehouseCode || ''} readOnly className="bg-white border-blue-100" />
                  </div>
                  <div>
                    <Label className="text-blue-800 font-medium">WAREHOUSE ADDRESS</Label>
                    <Input value={selectedDO.warehouseAddress || ''} readOnly className="bg-white border-blue-100" />
                  </div>
                  <div>
                    <Label className="text-blue-800 font-medium">CLIENT NAME</Label>
                    <Input value={selectedDO.client || ''} readOnly className="bg-white border-blue-100" />
                  </div>
                  <div>
                    <Label className="text-blue-800 font-medium">CLIENT CODE</Label>
                    <Input value={selectedDO.clientCode || ''} readOnly className="bg-white border-blue-100" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-blue-800 font-medium">CLIENT ADDRESS</Label>
                    <Input value={selectedDO.clientAddress || ''} readOnly className="bg-white border-blue-100" />
                  </div>
                  
                  <div>
                    <Label className="text-blue-800 font-medium">INWARD BAGS</Label>
                    <Input value={selectedDO.totalBags || ''} readOnly className="bg-white border-blue-100" />
                  </div>
                  <div>
                    <Label className="text-blue-800 font-medium">INWARD QUANTITY (MT)</Label>
                    <Input value={selectedDO.totalQuantity || ''} readOnly className="bg-white border-blue-100" />
                  </div>
                  <div>
                    <Label className="text-blue-800 font-medium">DO BAGS</Label>
                    <Input value={selectedDO.doBags || ''} readOnly className="bg-white border-blue-100" />
                  </div>
                  <div>
                    <Label className="text-blue-800 font-medium">DO QUANTITY (MT)</Label>
                    <Input value={selectedDO.doQuantity || ''} readOnly className="bg-white border-blue-100" />
                  </div>

                  {/* Outward entry input fields */}
                  <div>
                    <Label htmlFor="outwardBags" className="text-blue-600 font-medium">OUTWARD BAGS</Label>
                    <Input
                      id="outwardBags"
                      type="number"
                      value={outwardBags}
                      onChange={(e) => setOutwardBags(e.target.value)}
                      required
                      className="bg-white border-blue-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="outwardQty" className="text-blue-600 font-medium">OUTWARD QUANTITY (MT)</Label>
                    <Input
                      id="outwardQty"
                      type="number"
                      step="0.01"
                      value={outwardQty}
                      onChange={(e) => setOutwardQty(e.target.value)}
                      required
                      className="bg-white border-blue-200"
                    />
                  </div>

                  {/* Auto calculated balance fields */}
                  <div>
                    <Label className="text-blue-800 font-medium">BALANCE BAGS</Label>
                    <Input 
                      value={currentBalanceBags !== null && outwardBags ? 
                        Math.max(0, Number(currentBalanceBags) - Number(outwardBags || 0)).toString() : 
                        currentBalanceBags?.toString() || ''} 
                      readOnly 
                      className="bg-blue-50 border-blue-100"
                    />
                  </div>
                  <div>
                    <Label className="text-blue-800 font-medium">BALANCE QUANTITY (MT)</Label>
                    <Input 
                      value={currentBalanceQty !== null && outwardQty ? 
                        Math.max(0, Number(currentBalanceQty) - Number(outwardQty || 0)).toFixed(2) : 
                        currentBalanceQty?.toString() || ''} 
                      readOnly 
                      className="bg-blue-50 border-blue-100"
                    />
                  </div>
                  
                  {/* Outward entry details */}
                  <div className="col-span-2 mt-4">
                    <h3 className="text-blue-800 font-semibold mb-3 border-b border-blue-200 pb-1">Outward Entry Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="vehicleNumber" className="text-blue-600 font-medium">VEHICLE NUMBER</Label>
                        <Input
                          id="vehicleNumber"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          required
                          className="bg-white border-blue-200"
                          placeholder="e.g. MH12AB1234"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gatepass" className="text-blue-600 font-medium">GATE PASS</Label>
                        <Input
                          id="gatepass"
                          value={gatepass}
                          onChange={(e) => setGatepass(e.target.value)}
                          required
                          className="bg-white border-blue-200"
                          placeholder="e.g. GP12345"
                        />
                      </div>
                      <div>
                        <Label htmlFor="weighbridgeName" className="text-blue-600 font-medium">WEIGHBRIDGE NAME</Label>
                        <Input
                          id="weighbridgeName"
                          value={weighbridgeName}
                          onChange={(e) => setWeighbridgeName(e.target.value)}
                          required
                          className="bg-white border-blue-200"
                          placeholder="e.g. City Weighbridge"
                        />
                      </div>
                      <div>
                        <Label htmlFor="weighbridgeSlipNo" className="text-blue-600 font-medium">WEIGHBRIDGE SLIP NO</Label>
                        <Input
                          id="weighbridgeSlipNo"
                          value={weighbridgeSlipNo}
                          onChange={(e) => setWeighbridgeSlipNo(e.target.value)}
                          required
                          className="bg-white border-blue-200"
                          placeholder="e.g. WB98765"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Stack-wise Entry Details */}
                  <div className="col-span-2 mt-4">
                    <h3 className="text-blue-800 font-semibold mb-3 border-b border-blue-200 pb-1">Stack-wise Entry Details</h3>
                    
                    {/* Stack entries will be loaded dynamically based on inward data */}
                    <div className="mb-4">
                      {/* Stack-wise entry */}
                      <div className="border p-4 rounded-md bg-gray-50 mb-4">
                        <h3 className="text-md font-semibold mb-3">Stack-wise Entry</h3>
                        
                        {stackEntries.length === 0 ? (
                          <p className="text-sm text-gray-500">Select a Delivery Order first to load stack information</p>
                        ) : (
                          <div className="space-y-4">
                            {/* Header */}
                            <div className="grid grid-cols-4 gap-3 text-sm font-medium text-gray-600 mb-1">
                              <div>Stack No.</div>
                              <div>Bags</div>
                              <div>Quantity (MT)</div>
                              <div>Actions</div>
                            </div>
                            
                            {/* Stack entries */}
                            {stackEntries.map((entry, index) => (
                              <div key={index} className="grid grid-cols-4 gap-3">
                                <div>
                                  <Input 
                                    value={entry.stackNo} 
                                    onChange={(e) => {
                                      const newEntries = [...stackEntries];
                                      newEntries[index].stackNo = e.target.value;
                                      setStackEntries(newEntries);
                                    }}
                                    className="bg-white"
                                  />
                                </div>
                                <div>
                                  <Input 
                                    type="number"
                                    value={entry.bags} 
                                    onChange={(e) => {
                                      const newEntries = [...stackEntries];
                                      const newBags = e.target.value;
                                      newEntries[index].bags = newBags;
                                      setStackEntries(newEntries);
                                      
                                      // Update total bags
                                      calculateTotalBagsAndQuantity(newEntries);
                                    }}
                                    className="bg-white"
                                    placeholder={`Max: ${entry.inwardBags || 0}`}
                                  />
                                </div>
                                <div>
                                  <Input 
                                    type="number"
                                    step="0.001"
                                    value={entry.quantity} 
                                    onChange={(e) => {
                                      const newEntries = [...stackEntries];
                                      const newQty = e.target.value;
                                      newEntries[index].quantity = newQty;
                                      setStackEntries(newEntries);
                                      
                                      // Update total quantity
                                      calculateTotalBagsAndQuantity(newEntries);
                                    }}
                                    className="bg-white"
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  {stackEntries.length > 1 && (
                                    <Button 
                                      type="button" 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => {
                                        const newEntries = [...stackEntries];
                                        newEntries.splice(index, 1);
                                        setStackEntries(newEntries);
                                        
                                        // Recalculate totals
                                        calculateTotalBagsAndQuantity(newEntries);
                                      }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                        <path d="M3 6h18"></path>
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                      </svg>
                                    </Button>
                                  )}
                                  {index === stackEntries.length - 1 && (
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        setStackEntries([
                                          ...stackEntries, 
                                          {
                                            stackNo: `Stack-${stackEntries.length + 1}`,
                                            bags: '',
                                            quantity: '',
                                            inwardBags: 0
                                          }
                                        ]);
                                      }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="16"></line>
                                        <line x1="8" y1="12" x2="16" y2="12"></line>
                                      </svg> Add Stack
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                            
                            {/* Totals */}
                            <div className="grid grid-cols-4 gap-3 pt-3 border-t border-gray-200 mt-4">
                              <div className="font-medium">Totals</div>
                              <div className="font-medium">{outwardBags || '0'}</div>
                              <div className="font-medium">{outwardQty || '0'}</div>
                              <div></div>
                            </div>
                            
                            {/* Balance information */}
                            {selectedDO && (
                              <div className="bg-blue-50 p-3 rounded-md mt-2">
                                <div className="text-sm font-medium mb-1">Balance after this outward:</div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="text-sm">
                                    Bags: <span className="font-medium">
                                      {currentBalanceBags !== null && outwardBags
                                        ? Math.max(0, Number(currentBalanceBags) - Number(outwardBags))
                                        : currentBalanceBags || '0'
                                      }
                                    </span>
                                  </div>
                                  <div className="text-sm">
                                    Quantity: <span className="font-medium">
                                      {currentBalanceQty !== null && outwardQty
                                        ? Math.max(0, Number(currentBalanceQty) - Number(outwardQty)).toFixed(3)
                                        : currentBalanceQty?.toFixed(3) || '0.000'
                                      }
                                    </span> MT
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Warning if exceeding balance */}
                            {selectedDO && outwardBags && currentBalanceBags !== null && 
                             Number(outwardBags) > Number(currentBalanceBags) && (
                              <div className="bg-red-50 text-red-800 p-3 rounded-md mt-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 inline mr-2">
                                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                                  <line x1="12" y1="9" x2="12" y2="13"></line>
                                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                Warning: Outward bags ({outwardBags}) exceed available balance ({currentBalanceBags})
                              </div>
                            )}
                            
                            {selectedDO && outwardQty && currentBalanceQty !== null && 
                             Number(outwardQty) > Number(currentBalanceQty) && (
                              <div className="bg-red-50 text-red-800 p-3 rounded-md mt-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 inline mr-2">
                                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                                  <line x1="12" y1="9" x2="12" y2="13"></line>
                                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                Warning: Outward quantity ({outwardQty} MT) exceeds available balance ({currentBalanceQty.toFixed(3)} MT)
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Attachment - Mandatory */}
                  <div className="col-span-2">
                    <Label htmlFor="attachment" className="text-blue-600 font-medium flex items-center">
                      ATTACHMENT (ALL FILE TYPES ALLOWED) 
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="attachment"
                      type="file"
                      className="cursor-pointer bg-white border-blue-200"
                      onChange={(e) => {
                        if (e.target.files) {
                          const filesArray = Array.from(e.target.files);
                          setFileAttachments([...fileAttachments, ...filesArray]);
                          // Reset the input to allow selecting the same file again
                          e.target.value = '';
                        }
                      }}
                      required={fileAttachments.length === 0}
                      multiple
                    />
                    {fileAttachments.length > 0 && (
                      <div className="mt-3 bg-blue-50 p-3 rounded-md border border-blue-100">
                        <Label className="text-blue-800 font-medium mb-2 block">Selected Files:</Label>
                        <div className="space-y-2">
                          {fileAttachments.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-blue-100">
                              <span className="text-sm truncate">{file.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-red-500"
                                onClick={() => {
                                  const newFiles = [...fileAttachments];
                                  newFiles.splice(idx, 1);
                                  setFileAttachments(newFiles);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Remark */}
                  <div className="col-span-2">
                    <Label htmlFor="remark" className="text-blue-800 font-medium">REMARK</Label>
                    <Input
                      id="remark"
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="Enter remarks..."
                      className="bg-white border-blue-100"
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-8 pt-4 border-t border-blue-100">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6" disabled={isUploading}>
                {isUploading ? 'Submitting...' : 'SUBMIT'}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="border-blue-200 text-blue-800 hover:bg-blue-50">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Outward Details Dialog */}
      <Dialog open={showOutwardDetails} onOpenChange={setShowOutwardDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-center text-blue-600 font-bold">
              Outward Entry Details
              {selectedOutward && (
                <div className="mt-1 text-sm font-normal text-gray-600">
                  {selectedOutward.outwardCode} | {selectedOutward.srwrNo} | {selectedOutward.doCode}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOutward && (
            <>
              <div className="mb-4">
                <div className="bg-blue-50 rounded p-3 mb-4 flex flex-wrap justify-between items-center">
                  <div className="text-sm">
                    <span className="font-medium">Status: </span>
                    <span className={`inline-block px-2 py-1 rounded ${
                      selectedOutward.outwardStatus === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedOutward.outwardStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {(selectedOutward.outwardStatus || 'Pending').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    {/* Approval buttons for manager/admin only */}
                    {(userRole === 'checker' || userRole === 'admin') && 
                      selectedOutward.outwardStatus !== 'approved' && 
                      selectedOutward.outwardStatus !== 'rejected' && (
                      <>
                        <Button 
                          onClick={async () => {
                            setOutwardStatusUpdating(true);
                            try {
                              const outwardRef = doc(db, 'outwards', selectedOutward.id);
                              await updateDoc(outwardRef, {
                                outwardStatus: 'approved',
                                statusUpdatedBy: userRole,
                                statusUpdatedAt: new Date().toISOString()
                              });
                              setShowOutwardDetails(false);
                              
                              // Reload list after status change
                              const outwardCol = collection(db, 'outwards');
                              const snap = await getDocs(outwardCol);
                              const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                              setOutwardEntries(data);
                              setOutwardStatusUpdating(false);
                            } catch (error) {
                              console.error('Error updating outward status:', error);
                              setOutwardStatusUpdating(false);
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={outwardStatusUpdating}
                        >
                          Approve
                        </Button>
                        <Button 
                          onClick={async () => {
                            const remarkInput = prompt('Enter rejection reason:');
                            if (!remarkInput) return;
                            
                            setOutwardStatusUpdating(true);
                            try {
                              const outwardRef = doc(db, 'outwards', selectedOutward.id);
                              await updateDoc(outwardRef, {
                                outwardStatus: 'rejected',
                                statusRemark: remarkInput,
                                statusUpdatedBy: userRole,
                                statusUpdatedAt: new Date().toISOString()
                              });
                              setShowOutwardDetails(false);
                              
                              // Reload list after status change
                              const outwardCol = collection(db, 'outwards');
                              const snap = await getDocs(outwardCol);
                              const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                              setOutwardEntries(data);
                              setOutwardStatusUpdating(false);
                            } catch (error) {
                              console.error('Error updating outward status:', error);
                              setOutwardStatusUpdating(false);
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={outwardStatusUpdating}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {/* Print button */}
                    <Button 
                      onClick={() => {
                        // Open printable view in new window
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Outward Receipt - ${selectedOutward.outwardCode}</title>
                                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                              </head>
                              <body>
                                <div id="print-content">
                                  ${document.getElementById('outward-receipt-content')?.innerHTML || ''}
                                </div>
                                <script>
                                  window.onload = function() { window.print(); }
                                </script>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                        }
                      }}
                      variant="outline"
                      className="border-blue-300 text-blue-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                        <rect x="6" y="14" width="12" height="8"></rect>
                      </svg>
                      Print
                    </Button>
                  </div>
                </div>
                
                {/* Printable receipt content */}
                <div id="outward-receipt-content">
                  <PrintableOutwardReceipt outwardData={selectedOutward} />
                </div>
              </div>
            </>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}