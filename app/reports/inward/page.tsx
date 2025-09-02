"use client";

import DashboardLayout from '@/components/dashboard-layout';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Calendar, Filter, X, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit, where, getDoc, doc, Timestamp } from 'firebase/firestore';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface InwardReportData {
  id: string;
  date: string;
  srNumber: string; // This will be serial number
  wrNumber: string;
  inwardId: string;
  warehouseName: string;
  warehouseType: string;
  client: string;
  commodity: string;
  varietyName: string;
  totalBags: string;
  totalQuantity: string;
  totalValue: string;
  bankName: string;
  status: string;
  state: string;
  branch: string;
  location: string;
  [key: string]: any;
}

export default function InwardReportsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [inwardData, setInwardData] = useState<InwardReportData[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'date', 'srNumber', 'wrNumber', 'inwardId', 'warehouseName', 'warehouseType', 
    'client', 'commodity', 'varietyName', 'totalBags', 'totalQuantity', 'totalValue', 
    'bankName', 'status', 'state', 'branch', 'location'
  ]);

  // Column definitions
  const allColumns = [
    { key: 'date', label: 'Date', width: 'w-24' },
    { key: 'srNumber', label: 'SR Number', width: 'w-20' },
    { key: 'wrNumber', label: 'WR Number', width: 'w-32' },
    { key: 'inwardId', label: 'Inward ID', width: 'w-24' },
    { key: 'warehouseName', label: 'Warehouse Name', width: 'w-32' },
    { key: 'warehouseType', label: 'Warehouse Type', width: 'w-28' },
    { key: 'client', label: 'Client', width: 'w-28' },
    { key: 'commodity', label: 'Commodity', width: 'w-24' },
    { key: 'varietyName', label: 'Variety', width: 'w-24' },
    { key: 'totalBags', label: 'Total Bags', width: 'w-24' },
    { key: 'totalQuantity', label: 'Total Qty (MT)', width: 'w-28' },
    { key: 'totalValue', label: 'Total Value', width: 'w-24' },
    { key: 'bankName', label: 'Bank Name', width: 'w-28' },
    { key: 'status', label: 'Status', width: 'w-20' },
    { key: 'state', label: 'State', width: 'w-20' },
    { key: 'branch', label: 'Branch', width: 'w-20' },
    { key: 'location', label: 'Location', width: 'w-24' }
  ];

  // Fetch inward data
  useEffect(() => {
    fetchInwardData();
  }, []);

  // Set default date range (last 6 months)
  useEffect(() => {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(sixMonthsAgo.toISOString().split('T')[0]);
  }, []);

  const fetchInwardData = async () => {
    setLoading(true);
    try {
      // Try multiple possible collection names for inward data
      const possibleCollections = ['inwards', 'inward', 'inwardEntries'];
      let data: InwardReportData[] = [];
      
      for (const collectionName of possibleCollections) {
        try {
          console.log(`Trying to fetch from collection: ${collectionName}`);
          const inwardCollection = collection(db, 'inward');
          
          // Build query with date filters
          let q = query(inwardCollection, orderBy('createdAt', 'desc'), limit(1000));
          
          // Apply date filters if dates are set
          if (startDate && endDate) {
            const startTimestamp = Timestamp.fromDate(new Date(startDate));
            const endTimestamp = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));
            
            q = query(
              inwardCollection,
              where('createdAt', '>=', startTimestamp),
              where('createdAt', '<=', endTimestamp),
              orderBy('createdAt', 'desc'),
              limit(1000)
            );
          }
          
          const querySnapshot = await getDocs(q);
          
          console.log(`${collectionName} collection query result:`, querySnapshot.size, 'documents');
          
          if (querySnapshot.size > 0) {
            // Process each inward record
            const processedData = await Promise.all(
              querySnapshot.docs.map(async (doc, index) => {
                const docData = doc.data();
                
                // SR Number is serial number starting from 1
                const srNumber = (index + 1).toString();
                
                // Get WR Number directly from Firebase fields
                let wrNumber = '';
                try {
                  // Try multiple possible field names for WR number
                  wrNumber = docData.wrNumber || 
                            docData.warehouseReceiptNumber || 
                            docData.warehouseReceiptNo || 
                            docData.srNo || 
                            docData.srwrNo || 
                            docData.warehouseReceipt || 
                            docData.receiptNumber || '';
                  
                  // If still no WR number, try to generate one
                  if (!wrNumber) {
                    const inwardId = docData.inwardId || doc.id;
                    const dateOfInward = docData.dateOfInward || docData.createdAt || '';
                    const receiptType = docData.receiptType || 'WR';
                    
                    if (inwardId && dateOfInward) {
                      const formattedDate = dateOfInward.replace(/-/g, '');
                      wrNumber = `${receiptType}-${inwardId}-${formattedDate}`;
                    } else {
                      wrNumber = 'N/A';
                    }
                  }
                } catch (error) {
                  console.log('Error fetching WR number:', error);
                  wrNumber = 'N/A';
                }
                
                // Get warehouse type from warehouse creation survey
                let warehouseType = '';
                if (docData.warehouseName) {
                  try {
                    const inspectionsQuery = query(
                      collection(db, 'inspections'),
                      where('warehouseName', '==', docData.warehouseName),
                      where('status', '==', 'activated')
                    );
                    const inspectionSnapshot = await getDocs(inspectionsQuery);
                    
                    if (!inspectionSnapshot.empty) {
                      const inspectionData = inspectionSnapshot.docs[0].data();
                      warehouseType = inspectionData.warehouseInspectionData?.warehouseType || 
                                    inspectionData.warehouseType || 
                                    inspectionData.businessType || '';
                    }
                  } catch (error) {
                    console.log('Error fetching warehouse type:', error);
                  }
                }
                
                return {
                  id: doc.id,
                  date: docData.createdAt || docData.dateOfInward || '',
                  srNumber: srNumber,
                  wrNumber: wrNumber,
                  inwardId: docData.inwardId || doc.id,
                  state: docData.state || '',
                  branch: docData.branch || '',
                  location: docData.location || '',
                  warehouseName: docData.warehouseName || '',
                  warehouseType: warehouseType,
                  client: docData.client || '',
                  commodity: docData.commodity || '',
                  varietyName: docData.varietyName || '',
                  totalBags: docData.totalBags || '',
                  totalQuantity: docData.totalQuantity || '',
                  totalValue: docData.totalValue || '',
                  bankName: docData.bankName || '',
                  status: docData.status || 'Active',
                  ...docData
                };
              })
            );
            
            data = processedData;
            console.log(`Successfully fetched ${data.length} records from ${collectionName} collection`);
            break;
          }
        } catch (collectionError) {
          console.log(`Failed to fetch from ${collectionName}:`, collectionError);
          continue;
        }
      }
      
      console.log('Final processed inward data:', data.length, 'records');
      setInwardData(data);
    } catch (error) {
      console.error('Error fetching inward data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique filter options
  const uniqueWarehouses = useMemo(() => {
    return Array.from(new Set(inwardData.map(item => item.warehouseName).filter(Boolean)));
  }, [inwardData]);

  const uniqueClients = useMemo(() => {
    return Array.from(new Set(inwardData.map(item => item.client).filter(Boolean)));
  }, [inwardData]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(inwardData.map(item => item.status).filter(Boolean)));
  }, [inwardData]);

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    let filtered = inwardData;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply warehouse filter
    if (warehouseFilter && warehouseFilter !== 'all') {
      filtered = filtered.filter(item => item.warehouseName === warehouseFilter);
    }

    // Apply client filter
    if (clientFilter && clientFilter !== 'all') {
      filtered = filtered.filter(item => item.client === clientFilter);
    }
    
    return filtered;
  }, [inwardData, searchTerm, statusFilter, warehouseFilter, clientFilter]);

  // Export filtered data to CSV
  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    
    const headers = [
      'Date', 'SR Number', 'WR Number', 'Inward ID', 'Warehouse Name', 'Warehouse Type',
      'Client', 'Commodity', 'Variety', 'Total Bags', 'Total Qty (MT)', 'Total Value',
      'Bank Name', 'Status', 'State', 'Branch', 'Location'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredData.map((row, index) => [
        row.date || '',
        (index + 1).toString(),
        row.wrNumber || '',
        row.inwardId || '',
        row.warehouseName || '',
        row.warehouseType || '',
        row.client || '',
        row.commodity || '',
        row.varietyName || '',
        row.totalBags || '',
        row.totalQuantity || '',
        row.totalValue || '',
        row.bankName || '',
        row.status || '',
        row.state || '',
        row.branch || '',
        row.location || ''
      ].map(value => typeof value === 'string' && value.includes(',') ? `"${value}"` : value).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inward_report_${startDate}_to_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setWarehouseFilter('all');
    setClientFilter('all');
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || warehouseFilter !== 'all' || clientFilter !== 'all';

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
    if (normalizedStatus.includes('approved') || normalizedStatus.includes('active')) {
      return 'bg-green-100 text-green-800';
    } else if (normalizedStatus.includes('pending')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (normalizedStatus.includes('rejected')) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  // Handle date change with validation
  const handleDateChange = (field: 'start' | 'end', value: string) => {
    if (field === 'start') {
      setStartDate(value);
      // Ensure end date is not more than 6 months after start date
      if (value && endDate) {
        const start = new Date(value);
        const end = new Date(endDate);
        const sixMonthsLater = new Date(start);
        sixMonthsLater.setMonth(start.getMonth() + 6);
        
        if (end > sixMonthsLater) {
          setEndDate(sixMonthsLater.toISOString().split('T')[0]);
        }
      }
    } else {
      setEndDate(value);
      // Ensure start date is not more than 6 months before end date
      if (value && startDate) {
        const start = new Date(startDate);
        const end = new Date(value);
        const sixMonthsBefore = new Date(end);
        sixMonthsBefore.setMonth(end.getMonth() - 6);
        
        if (start < sixMonthsBefore) {
          setStartDate(sixMonthsBefore.toISOString().split('T')[0]);
        }
      }
    }
  };

  // Toggle column visibility
  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(col => col !== columnKey)
        : [...prev, columnKey]
    );
  };

  // Get visible columns data
  const visibleColumnsData = allColumns.filter(col => visibleColumns.includes(col.key));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.back()}
              className="inline-flex items-center text-lg font-semibold tracking-tight bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reports
            </button>
          </div>
          
          <div className="text-center flex flex-col items-center">
            {/* Logo */}
            <div className="w-36 h-10 relative mb-3 bg-white rounded-lg px-2 py-1">
              <Image 
                src="/AGlogo.webp" 
                alt="AgroGreen Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-orange-600">
              Inward Reports
            </h1>
            <p className="text-muted-foreground">Generate and view inward transaction reports</p>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={fetchInwardData} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button onClick={exportToCSV} disabled={filteredData.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Search & Filter Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search across all fields..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t">
                  {/* Date Range Filter */}
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleDateChange('start', e.target.value)}
                      max={endDate}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => handleDateChange('end', e.target.value)}
                      min={startDate}
                      max={(() => {
                        if (startDate) {
                          const maxDate = new Date(startDate);
                          maxDate.setMonth(maxDate.getMonth() + 6);
                          return maxDate.toISOString().split('T')[0];
                        }
                        return '';
                      })()}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Max 6 months range</p>
                  </div>

                  <div>
                    <Label htmlFor="statusFilter">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {uniqueStatuses.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="warehouseFilter">Warehouse</Label>
                    <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Warehouses</SelectItem>
                        {uniqueWarehouses.map(warehouse => (
                          <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="clientFilter">Client</Label>
                    <Select value={clientFilter} onValueChange={setClientFilter}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Clients</SelectItem>
                        {uniqueClients.map(client => (
                          <SelectItem key={client} value={client}>{client}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Active Filters Summary */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Active Filters:</span>
                    {searchTerm && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        Search: {searchTerm}
                        <button onClick={() => setSearchTerm('')} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {statusFilter !== 'all' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                        Status: {statusFilter}
                        <button onClick={() => setStatusFilter('all')} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {warehouseFilter !== 'all' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                        Warehouse: {warehouseFilter}
                        <button onClick={() => setWarehouseFilter('all')} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {clientFilter !== 'all' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-teal-100 text-teal-800">
                        Client: {clientFilter}
                        <button onClick={() => setClientFilter('all')} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                  <Button variant="outline" onClick={clearFilters} size="sm">
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredData.length} of {inwardData.length} records
            {hasActiveFilters && ` (filtered)`}
            {startDate && endDate && ` | Date Range: ${startDate} to ${endDate}`}
          </div>
          <div className="flex items-center space-x-2">
            {/* Column Visibility Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Columns ({visibleColumns.length}/{allColumns.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allColumns.map(column => (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={visibleColumns.includes(column.key)}
                    onCheckedChange={() => toggleColumn(column.key)}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} size="sm">
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {visibleColumnsData.map(column => (
                      <th key={column.key} className={`border border-gray-200 px-4 py-2 text-left ${column.width}`}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {visibleColumns.includes('date') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {formatDate(item.date)}
                        </td>
                      )}
                      {visibleColumns.includes('srNumber') && (
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm text-center bg-gray-50">
                          {index + 1}
                        </td>
                      )}
                      {visibleColumns.includes('wrNumber') && (
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                          {item.wrNumber || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('inwardId') && (
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                          {item.inwardId || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('warehouseName') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.warehouseName || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('warehouseType') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.warehouseType || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('client') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.client || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('commodity') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.commodity || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('varietyName') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.varietyName || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('totalBags') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.totalBags || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('totalQuantity') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.totalQuantity || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('totalValue') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.totalValue || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('bankName') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.bankName || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('status') && (
                        <td className="border border-gray-200 px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status || 'Active'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('state') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.state || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('branch') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.branch || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('location') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.location || 'N/A'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {loading ? 'Loading data...' : 'No inward data found matching the current filters'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
