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

interface ReleaseOrderReportData {
  id: string;
  date: string;
  srNumber: string; // Serial number
  roNumber: string;
  inwardId: string;
  doNumber: string;
  warehouseName: string;
  warehouseType: string;
  client: string;
  commodity: string;
  varietyName: string;
  releaseBags: string;
  releaseQty: string;
  totalValue: string;
  vehicleNumber: string;
  gatepass: string;
  status: string;
  remarks: string;
  // Additional fields from dashboard
  state: string;
  branch: string;
  warehouseCode: string;
  warehouseAddress: string;
  clientAddress: string;
  totalBags: string;
  totalQuantity: string;
  balanceBags: string;
  balanceQuantity: string;
  [key: string]: any;
}

export default function ReleaseOrderReportsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  const [loading, setLoading] = useState(false);
  const [roData, setRoData] = useState<ReleaseOrderReportData[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'date', 'srNumber', 'roNumber', 'inwardId', 'state', 'branch', 'warehouseName', 'warehouseCode',
    'warehouseAddress', 'client', 'clientAddress', 'totalBags', 'totalQuantity', 'releaseBags', 
    'releaseQty', 'balanceBags', 'balanceQuantity', 'status'
  ]);

  // Column definitions for 18 columns matching dashboard data
  const allColumns = [
    { key: 'date', label: 'Date', width: 'w-24' },
    { key: 'srNumber', label: 'SR Number', width: 'w-20' },
    { key: 'roNumber', label: 'RO Code', width: 'w-24' },
    { key: 'inwardId', label: 'SR/WR No.', width: 'w-28' },
    { key: 'state', label: 'State', width: 'w-20' },
    { key: 'branch', label: 'Branch', width: 'w-20' },
    { key: 'warehouseName', label: 'Warehouse Name', width: 'w-32' },
    { key: 'warehouseCode', label: 'Warehouse Code', width: 'w-24' },
    { key: 'warehouseAddress', label: 'Warehouse Address', width: 'w-32' },
    { key: 'client', label: 'Client Code', width: 'w-24' },
    { key: 'clientAddress', label: 'Client Address', width: 'w-32' },
    { key: 'totalBags', label: 'Inward Bags', width: 'w-24' },
    { key: 'totalQuantity', label: 'Inward Qty (MT)', width: 'w-28' },
    { key: 'releaseBags', label: 'Release Bags', width: 'w-24' },
    { key: 'releaseQty', label: 'Release Qty (MT)', width: 'w-28' },
    { key: 'balanceBags', label: 'Balance Bags', width: 'w-24' },
    { key: 'balanceQuantity', label: 'Balance Qty (MT)', width: 'w-28' },
    { key: 'status', label: 'RO Status', width: 'w-20' }
  ];

  // Fetch release order data
  useEffect(() => {
    fetchROData();
  }, []);

  // Set default date range (last 6 months)
  useEffect(() => {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(sixMonthsAgo.toISOString().split('T')[0]);
  }, []);

  const fetchROData = async () => {
    setLoading(true);
    try {
      const roCollection = collection(db, 'releaseOrders');
      
      // Build query with date filters
      let q = query(roCollection, orderBy('createdAt', 'desc'), limit(1000));
      
      // Apply date filters if dates are set
      if (startDate && endDate) {
        const startTimestamp = Timestamp.fromDate(new Date(startDate));
        const endTimestamp = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));
        
        q = query(
          roCollection,
          where('createdAt', '>=', startTimestamp),
          where('createdAt', '<=', endTimestamp),
          orderBy('createdAt', 'desc'),
          limit(1000)
        );
      }
      
      const querySnapshot = await getDocs(q);
      
      console.log('RO collection query result:', querySnapshot.size, 'documents');
      
      const data = await Promise.all(querySnapshot.docs.map(async (doc, index) => {
        const docData = doc.data();
        
        // Fetch warehouse type from inspections collection
        let warehouseType = 'N/A';
        if (docData.warehouseName) {
          try {
            const inspectionsCollection = collection(db, 'inspections');
            const warehouseQuery = query(
              inspectionsCollection,
              where('warehouseName', '==', docData.warehouseName),
              where('status', '==', 'activated'),
              limit(1)
            );
            const warehouseSnapshot = await getDocs(warehouseQuery);
            
            if (!warehouseSnapshot.empty) {
              const warehouseData = warehouseSnapshot.docs[0].data();
              warehouseType = warehouseData.warehouseType || warehouseData.businessType || 'N/A';
            }
          } catch (error) {
            console.error('Error fetching warehouse type:', error);
          }
        }
        
        return {
          id: doc.id,
          date: docData.createdAt || docData.dateOfRelease || '',
          srNumber: (index + 1).toString(), // Serial number
          roNumber: docData.roCode || docData.roNumber || doc.id,
          inwardId: docData.srwrNo || docData.inwardId || '',
          doNumber: docData.doCode || docData.doNumber || '',
          warehouseName: docData.warehouseName || '',
          warehouseType: warehouseType,
          client: docData.clientCode || docData.client || '',
          commodity: docData.commodity || '',
          varietyName: docData.varietyName || docData.variety || '',
          releaseBags: docData.releaseBags || docData.bags || '',
          releaseQty: docData.releaseQuantity || docData.quantity || '',
          totalValue: docData.totalValue || docData.value || '',
          vehicleNumber: docData.vehicleNumber || '',
          gatepass: docData.gatepass || '',
          status: docData.roStatus || docData.status || 'Active',
          remarks: docData.remarks || docData.comments || '',
          // Additional fields from dashboard
          state: docData.state || '',
          branch: docData.branch || '',
          warehouseCode: docData.warehouseCode || '',
          warehouseAddress: docData.warehouseAddress || '',
          clientAddress: docData.clientAddress || '',
          totalBags: docData.totalBags || '',
          totalQuantity: docData.totalQuantity || '',
          balanceBags: docData.balanceBags || '',
          balanceQuantity: docData.balanceQuantity || '',
          ...docData
        };
      }));
      
      console.log('Processed RO data:', data.length, 'records');
      setRoData(data);
    } catch (error) {
      console.error('Error fetching RO data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique filter options
  const uniqueStates = useMemo(() => {
    return Array.from(new Set(roData.map(item => item.state).filter(Boolean)));
  }, [roData]);

  const uniqueBranches = useMemo(() => {
    return Array.from(new Set(roData.map(item => item.branch).filter(Boolean)));
  }, [roData]);

  const uniqueWarehouses = useMemo(() => {
    return Array.from(new Set(roData.map(item => item.warehouseName).filter(Boolean)));
  }, [roData]);

  const uniqueClients = useMemo(() => {
    return Array.from(new Set(roData.map(item => item.client).filter(Boolean)));
  }, [roData]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(roData.map(item => item.status).filter(Boolean)));
  }, [roData]);

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    let filtered = roData;
    
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
  }, [roData, searchTerm, statusFilter, warehouseFilter, clientFilter]);

  // Export filtered data to CSV
  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    
    const headers = [
      'Date', 'SR Number', 'RO Code', 'SR/WR No.', 'State', 'Branch', 'Warehouse Name', 'Warehouse Code',
      'Warehouse Address', 'Client Code', 'Client Address', 'Inward Bags', 'Inward Qty (MT)', 'Release Bags',
      'Release Qty (MT)', 'Balance Bags', 'Balance Qty (MT)', 'RO Status'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.date || '',
        row.srNumber || '',
        row.roNumber || '',
        row.inwardId || '',
        row.state || '',
        row.branch || '',
        row.warehouseName || '',
        row.warehouseCode || '',
        row.warehouseAddress || '',
        row.client || '',
        row.clientAddress || '',
        row.totalBags || '',
        row.totalQuantity || '',
        row.releaseBags || '',
        row.releaseQty || '',
        row.balanceBags || '',
        row.balanceQuantity || '',
        row.status || ''
      ].map(value => typeof value === 'string' && value.includes(',') ? `"${value}"` : value).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `release_order_report_${startDate}_to_${endDate}.csv`;
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
    if (normalizedStatus.includes('approved') || normalizedStatus.includes('active') || normalizedStatus.includes('completed')) {
      return 'bg-green-100 text-green-800';
    } else if (normalizedStatus.includes('pending')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (normalizedStatus.includes('rejected') || normalizedStatus.includes('expired') || normalizedStatus.includes('cancelled')) {
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
            <Button 
              onClick={fetchROData}
              variant="outline"
              className="inline-flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
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
              Release Order Reports
            </h1>
            <p className="text-muted-foreground">Generate and view release order transaction reports</p>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={fetchROData} disabled={loading}>
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

              {/* Additional Filters Row */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">


                  <div className="flex items-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          Column Visibility
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {allColumns.map((column) => (
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
                    {warehouseFilter !== 'all' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                        Warehouse: {warehouseFilter}
                        <button onClick={() => setWarehouseFilter('all')} className="ml-1">
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
                    {clientFilter !== 'all' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
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
            Showing {filteredData.length} of {roData.length} records
            {hasActiveFilters && ` (filtered)`}
            {startDate && endDate && ` | Date Range: ${startDate} to ${endDate}`}
          </div>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} size="sm">
              Clear Filters
            </Button>
          )}
        </div>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {visibleColumns.includes('date') && <th className="border border-gray-200 px-4 py-2 text-left">Date</th>}
                    {visibleColumns.includes('srNumber') && <th className="border border-gray-200 px-4 py-2 text-left">SR Number</th>}
                    {visibleColumns.includes('roNumber') && <th className="border border-gray-200 px-4 py-2 text-left">RO Code</th>}
                    {visibleColumns.includes('inwardId') && <th className="border border-gray-200 px-4 py-2 text-left">SR/WR No.</th>}
                    {visibleColumns.includes('state') && <th className="border border-gray-200 px-4 py-2 text-left">State</th>}
                    {visibleColumns.includes('branch') && <th className="border border-gray-200 px-4 py-2 text-left">Branch</th>}
                    {visibleColumns.includes('warehouseName') && <th className="border border-gray-200 px-4 py-2 text-left">Warehouse Name</th>}
                    {visibleColumns.includes('warehouseCode') && <th className="border border-gray-200 px-4 py-2 text-left">Warehouse Code</th>}
                    {visibleColumns.includes('warehouseAddress') && <th className="border border-gray-200 px-4 py-2 text-left">Warehouse Address</th>}
                    {visibleColumns.includes('client') && <th className="border border-gray-200 px-4 py-2 text-left">Client Code</th>}
                    {visibleColumns.includes('clientAddress') && <th className="border border-gray-200 px-4 py-2 text-left">Client Address</th>}
                    {visibleColumns.includes('totalBags') && <th className="border border-gray-200 px-4 py-2 text-left">Inward Bags</th>}
                    {visibleColumns.includes('totalQuantity') && <th className="border border-gray-200 px-4 py-2 text-left">Inward Qty (MT)</th>}
                    {visibleColumns.includes('releaseBags') && <th className="border border-gray-200 px-4 py-2 text-left">Release Bags</th>}
                    {visibleColumns.includes('releaseQty') && <th className="border border-gray-200 px-4 py-2 text-left">Release Qty (MT)</th>}
                    {visibleColumns.includes('balanceBags') && <th className="border border-gray-200 px-4 py-2 text-left">Balance Bags</th>}
                    {visibleColumns.includes('balanceQuantity') && <th className="border border-gray-200 px-4 py-2 text-left">Balance Qty (MT)</th>}
                    {visibleColumns.includes('status') && <th className="border border-gray-200 px-4 py-2 text-left">RO Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {visibleColumns.includes('date') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {formatDate(item.date)}
                        </td>
                      )}
                      {visibleColumns.includes('srNumber') && (
                        <td className="border border-gray-200 px-4 py-2 text-center font-mono text-sm">
                          {item.srNumber || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('roNumber') && (
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                          {item.roNumber || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('inwardId') && (
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                          {item.inwardId || 'N/A'}
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
                      {visibleColumns.includes('warehouseName') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.warehouseName || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('warehouseCode') && (
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                          {item.warehouseCode || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('warehouseAddress') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.warehouseAddress || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('client') && (
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                          {item.client || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('clientAddress') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.clientAddress || 'N/A'}
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
                      {visibleColumns.includes('releaseBags') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.releaseBags || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('releaseQty') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.releaseQty || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('balanceBags') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.balanceBags || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('balanceQuantity') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.balanceQuantity || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('status') && (
                        <td className="border border-gray-200 px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status || 'Active'}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {loading ? 'Loading data...' : 'No release order data found matching the current filters'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
