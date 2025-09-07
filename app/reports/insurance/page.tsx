"use client";

import DashboardLayout from '@/components/dashboard-layout';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Calendar, Filter, X, ArrowLeft, Shield, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit, where, getDoc, doc, Timestamp } from 'firebase/firestore';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface InsuranceReportData {
  id: string;
  date: string;
  warehouseName: string;
  warehouseCode: string;
  state: string;
  branch: string;
  location: string;
  insuranceTakenBy: string;
  insuranceCommodity: string;
  clientName: string;
  clientAddress: string;
  selectedBankName: string;
  firePolicyCompanyName: string;
  firePolicyNumber: string;
  firePolicyAmount: string;
  firePolicyStartDate: string;
  firePolicyEndDate: string;
  burglaryPolicyCompanyName: string;
  burglaryPolicyNumber: string;
  burglaryPolicyAmount: string;
  burglaryPolicyStartDate: string;
  burglaryPolicyEndDate: string;
  remainingFirePolicyAmount: string;
  remainingBurglaryPolicyAmount: string;
  status: string;
  isPolicyExpired: boolean;
  [key: string]: any;
}

export default function InsuranceReportsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [insuranceData, setInsuranceData] = useState<InsuranceReportData[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'date', 'warehouseName', 'warehouseCode', 'state', 'branch', 'location',
    'insuranceTakenBy', 'insuranceCommodity', 'clientName', 'clientAddress', 'selectedBankName',
    'firePolicyCompanyName', 'firePolicyNumber', 'firePolicyAmount', 'firePolicyStartDate', 'firePolicyEndDate',
    'burglaryPolicyCompanyName', 'burglaryPolicyNumber', 'burglaryPolicyAmount', 'burglaryPolicyStartDate', 'burglaryPolicyEndDate',
    'remainingFirePolicyAmount', 'remainingBurglaryPolicyAmount', 'status'
  ]);

  // Column definitions for table
  const allColumns = [
    { key: 'date', label: 'Date', width: 'w-24' },
    { key: 'srNumber', label: 'SR Number', width: 'w-20' },
    { key: 'warehouseName', label: 'Warehouse Name', width: 'w-32' },
    { key: 'warehouseCode', label: 'Warehouse Code', width: 'w-28' },
    { key: 'state', label: 'State', width: 'w-24' },
    { key: 'branch', label: 'Branch', width: 'w-24' },
    { key: 'location', label: 'Location', width: 'w-24' },
    { key: 'insuranceTakenBy', label: 'Insurance Taken By', width: 'w-28' },
    { key: 'insuranceCommodity', label: 'Commodity', width: 'w-24' },
    { key: 'clientName', label: 'Client Name', width: 'w-28' },
    { key: 'clientAddress', label: 'Client Address', width: 'w-32' },
    { key: 'selectedBankName', label: 'Bank Name', width: 'w-24' },
    { key: 'firePolicyCompanyName', label: 'Fire Policy Company', width: 'w-28' },
    { key: 'firePolicyNumber', label: 'Fire Policy Number', width: 'w-28' },
    { key: 'firePolicyAmount', label: 'Fire Policy Amount', width: 'w-24' },
    { key: 'firePolicyStartDate', label: 'Fire Policy Start', width: 'w-24' },
    { key: 'firePolicyEndDate', label: 'Fire Policy End', width: 'w-24' },
    { key: 'burglaryPolicyCompanyName', label: 'Burglary Policy Company', width: 'w-28' },
    { key: 'burglaryPolicyNumber', label: 'Burglary Policy Number', width: 'w-28' },
    { key: 'burglaryPolicyAmount', label: 'Burglary Policy Amount', width: 'w-24' },
    { key: 'burglaryPolicyStartDate', label: 'Burglary Policy Start', width: 'w-24' },
    { key: 'burglaryPolicyEndDate', label: 'Burglary Policy End', width: 'w-24' },
    { key: 'remainingFirePolicyAmount', label: 'Remaining Fire Amount', width: 'w-24' },
    { key: 'remainingBurglaryPolicyAmount', label: 'Remaining Burglary Amount', width: 'w-24' },
    { key: 'status', label: 'Status', width: 'w-20' }
  ];

  // Set default date range (6 months ago to today)
  useEffect(() => {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(sixMonthsAgo.toISOString().split('T')[0]);
  }, []);

  // Fetch insurance data
  useEffect(() => {
    fetchInsuranceData();
  }, []);

  const fetchInsuranceData = async () => {
    setLoading(true);
    try {
      // Fetch from inspections collection which contains insurance data
      const inspectionsCollection = collection(db, 'inspections');
      
      // Create date range query if dates are set
      let q = query(inspectionsCollection, orderBy('createdAt', 'desc'), limit(1000));
      
      if (startDate && endDate) {
        const startTimestamp = Timestamp.fromDate(new Date(startDate));
        const endTimestamp = Timestamp.fromDate(new Date(endDate));
        q = query(inspectionsCollection, 
          where('createdAt', '>=', startTimestamp),
          where('createdAt', '<=', endTimestamp),
          orderBy('createdAt', 'desc'), 
          limit(1000)
        );
      }
      
      const querySnapshot = await getDocs(q);
      console.log('Inspections collection query result:', querySnapshot.size, 'documents');
      
      const data: InsuranceReportData[] = [];
      
      querySnapshot.docs.forEach((doc, index) => {
        const docData = doc.data();
        
        // Check if this inspection has insurance data
        if (docData.insuranceEntries && Array.isArray(docData.insuranceEntries)) {
          docData.insuranceEntries.forEach((insurance: any) => {
            const endDate = insurance.firePolicyEndDate || insurance.burglaryPolicyEndDate;
            const isExpired = endDate ? new Date(endDate) < new Date() : false;
            
            data.push({
              id: `${doc.id}_${insurance.insuranceId || Date.now()}`,
              srNumber: (index + 1).toString(),
              date: docData.createdAt || docData.dateOfInspection || '',
              warehouseName: docData.warehouseName || '',
              warehouseCode: docData.warehouseCode || '',
              state: docData.state || '',
              branch: docData.branch || '',
              location: docData.location || '',
              insuranceTakenBy: insurance.insuranceTakenBy || '',
              insuranceCommodity: insurance.insuranceCommodity || '',
              clientName: insurance.clientName || '',
              clientAddress: insurance.clientAddress || '',
              selectedBankName: insurance.selectedBankName || '',
              firePolicyCompanyName: insurance.firePolicyCompanyName || '',
              firePolicyNumber: insurance.firePolicyNumber || '',
              firePolicyAmount: insurance.firePolicyAmount || '',
              firePolicyStartDate: insurance.firePolicyStartDate || '',
              firePolicyEndDate: insurance.firePolicyEndDate || '',
              burglaryPolicyCompanyName: insurance.burglaryPolicyCompanyName || '',
              burglaryPolicyNumber: insurance.burglaryPolicyNumber || '',
              burglaryPolicyAmount: insurance.burglaryPolicyAmount || '',
              burglaryPolicyStartDate: insurance.burglaryPolicyStartDate || '',
              burglaryPolicyEndDate: insurance.burglaryPolicyEndDate || '',
              remainingFirePolicyAmount: insurance.remainingFirePolicyAmount || '',
              remainingBurglaryPolicyAmount: insurance.remainingBurglaryPolicyAmount || '',
              status: insurance.status || 'Active',
              isPolicyExpired: isExpired,
              ...insurance
            });
          });
        }
        
        // Also check for direct insurance fields
        if (docData.firePolicyNumber || docData.burglaryPolicyNumber) {
          const endDate = docData.firePolicyEndDate || docData.burglaryPolicyEndDate;
          const isExpired = endDate ? new Date(endDate) < new Date() : false;
          
          data.push({
            id: `${doc.id}_direct`,
            srNumber: (index + 1).toString(),
            date: docData.createdAt || docData.dateOfInspection || '',
            warehouseName: docData.warehouseName || '',
            warehouseCode: docData.warehouseCode || '',
            state: docData.state || '',
            branch: docData.branch || '',
            location: docData.location || '',
            insuranceTakenBy: docData.insuranceTakenBy || '',
            insuranceCommodity: docData.insuranceCommodity || '',
            clientName: docData.clientName || '',
            clientAddress: docData.clientAddress || '',
            selectedBankName: docData.selectedBankName || '',
            firePolicyCompanyName: docData.firePolicyCompanyName || '',
            firePolicyNumber: docData.firePolicyNumber || '',
            firePolicyAmount: docData.firePolicyAmount || '',
            firePolicyStartDate: docData.firePolicyStartDate || '',
            firePolicyEndDate: docData.firePolicyEndDate || '',
            burglaryPolicyCompanyName: docData.burglaryPolicyCompanyName || '',
            burglaryPolicyNumber: docData.burglaryPolicyNumber || '',
            burglaryPolicyAmount: docData.burglaryPolicyAmount || '',
            burglaryPolicyStartDate: docData.burglaryPolicyStartDate || '',
            burglaryPolicyEndDate: docData.burglaryPolicyEndDate || '',
            remainingFirePolicyAmount: docData.remainingFirePolicyAmount || '',
            remainingBurglaryPolicyAmount: docData.remainingBurglaryPolicyAmount || '',
            status: docData.status || 'Active',
            isPolicyExpired: isExpired,
            ...docData
          });
        }
      });
      
      console.log('Processed insurance data:', data.length, 'records');
      setInsuranceData(data);
    } catch (error) {
      console.error('Error fetching insurance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique filter options
  const uniqueWarehouses = useMemo(() => {
    return Array.from(new Set(insuranceData.map(item => item.warehouseName).filter(Boolean)));
  }, [insuranceData]);

  const uniqueStates = useMemo(() => {
    return Array.from(new Set(insuranceData.map(item => item.state).filter(Boolean)));
  }, [insuranceData]);

  const uniqueBranches = useMemo(() => {
    return Array.from(new Set(insuranceData.map(item => item.branch).filter(Boolean)));
  }, [insuranceData]);

  const uniqueClients = useMemo(() => {
    return Array.from(new Set(insuranceData.map(item => item.clientName).filter(Boolean)));
  }, [insuranceData]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(insuranceData.map(item => item.status).filter(Boolean)));
  }, [insuranceData]);

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    let filtered = insuranceData;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply warehouse filter
    if (warehouseFilter && warehouseFilter !== 'all') {
      filtered = filtered.filter(item => item.warehouseName === warehouseFilter);
    }

    // Apply state filter
    if (stateFilter && stateFilter !== 'all') {
      filtered = filtered.filter(item => item.state === stateFilter);
    }

    // Apply branch filter
    if (branchFilter && branchFilter !== 'all') {
      filtered = filtered.filter(item => item.branch === branchFilter);
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
      filtered = filtered.filter(item => item.clientName === clientFilter);
    }
    
    return filtered;
  }, [insuranceData, searchTerm, statusFilter, warehouseFilter, stateFilter, branchFilter, clientFilter]);

  // Export filtered data to CSV
  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    
    const headers = [
      'Date', 'SR Number', 'Warehouse Name', 'Warehouse Code', 'State', 'Branch', 'Location',
      'Insurance Taken By', 'Commodity', 'Client Name', 'Client Address', 'Bank Name',
      'Fire Policy Company', 'Fire Policy Number', 'Fire Policy Amount', 'Fire Policy Start Date', 'Fire Policy End Date',
      'Burglary Policy Company', 'Burglary Policy Number', 'Burglary Policy Amount', 'Burglary Policy Start Date', 'Burglary Policy End Date',
      'Remaining Fire Amount', 'Remaining Burglary Amount', 'Status'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.date || '',
        row.srNumber || '',
        row.warehouseName || '',
        row.warehouseCode || '',
        row.state || '',
        row.branch || '',
        row.location || '',
        row.insuranceTakenBy || '',
        row.insuranceCommodity || '',
        row.clientName || '',
        row.clientAddress || '',
        row.selectedBankName || '',
        row.firePolicyCompanyName || '',
        row.firePolicyNumber || '',
        row.firePolicyAmount || '',
        row.firePolicyStartDate || '',
        row.firePolicyEndDate || '',
        row.burglaryPolicyCompanyName || '',
        row.burglaryPolicyNumber || '',
        row.burglaryPolicyAmount || '',
        row.burglaryPolicyStartDate || '',
        row.burglaryPolicyEndDate || '',
        row.remainingFirePolicyAmount || '',
        row.remainingBurglaryPolicyAmount || '',
        row.status || ''
      ].map(value => typeof value === 'string' && value.includes(',') ? `"${value}"` : value).join(','))
    ].join('\n');
    
    const filename = startDate && endDate 
      ? `insurance_report_${startDate}_to_${endDate}.csv`
      : `insurance_report_${new Date().toISOString().split('T')[0]}.csv`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setWarehouseFilter('all');
    setStateFilter('all');
    setBranchFilter('all');
    setClientFilter('all');
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || warehouseFilter !== 'all' || stateFilter !== 'all' || branchFilter !== 'all' || clientFilter !== 'all';

  // Handle date change with 6-month limit
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value);
      // Ensure end date is not more than 6 months from start date
      if (endDate && value) {
        const start = new Date(value);
        const maxEnd = new Date(start);
        maxEnd.setMonth(maxEnd.getMonth() + 6);
        if (new Date(endDate) > maxEnd) {
          setEndDate(maxEnd.toISOString().split('T')[0]);
        }
      }
    } else {
      setEndDate(value);
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
    if (normalizedStatus.includes('approved') || normalizedStatus.includes('active') || normalizedStatus.includes('valid')) {
      return 'bg-green-100 text-green-800';
    } else if (normalizedStatus.includes('pending')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (normalizedStatus.includes('rejected') || normalizedStatus.includes('expired') || normalizedStatus.includes('cancelled')) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  // Check if policy is expired
  const isPolicyExpired = (endDate: string) => {
    if (!endDate) return false;
    try {
      const end = new Date(endDate);
      const today = new Date();
      return end < today;
    } catch {
      return false;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center text-lg font-semibold tracking-tight bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </button>
          </div>
          
          <div className="text-center flex flex-col items-center">
            {/* Logo */}
            <div className="w-36 h-10 relative mb-3 bg-white rounded-lg px-2 py-1">
              {/* <Image 
                src="/AGlogo.webp" 
                alt="AgroGreen Logo" 
                fill
                className="object-contain"
                priority
              /> */}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-orange-600 inline-block border-b-4 border-green-500 pb-2 px-6 py-3 bg-orange-100 rounded-lg">
              Insurance Reports
            </h1>
            <p className="text-muted-foreground">Generate and view insurance policy reports</p>
          </div>
          
          <div className="flex space-x-2">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="stateFilter">State</Label>
                    <Select value={stateFilter} onValueChange={setStateFilter}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All States</SelectItem>
                        {uniqueStates.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="branchFilter">Branch</Label>
                    <Select value={branchFilter} onValueChange={setBranchFilter}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        {uniqueBranches.map(branch => (
                          <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                    {stateFilter !== 'all' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-teal-100 text-teal-800">
                        State: {stateFilter}
                        <button onClick={() => setStateFilter('all')} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {branchFilter !== 'all' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                        Branch: {branchFilter}
                        <button onClick={() => setBranchFilter('all')} className="ml-1">
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
            Showing {filteredData.length} of {insuranceData.length} records
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
                <thead className="bg-orange-100">
                  <tr>
                    {visibleColumns.includes('date') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Date</th>}
                    {visibleColumns.includes('warehouseName') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Warehouse Name</th>}
                    {visibleColumns.includes('warehouseCode') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Warehouse Code</th>}
                    {visibleColumns.includes('state') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">State</th>}
                    {visibleColumns.includes('branch') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Branch</th>}
                    {visibleColumns.includes('location') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Location</th>}
                    {visibleColumns.includes('insuranceTakenBy') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Insurance Taken By</th>}
                    {visibleColumns.includes('insuranceCommodity') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Commodity</th>}
                    {visibleColumns.includes('clientName') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Client Name</th>}
                    {visibleColumns.includes('clientAddress') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Client Address</th>}
                    {visibleColumns.includes('selectedBankName') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Bank Name</th>}
                    {visibleColumns.includes('firePolicyCompanyName') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Fire Policy Company</th>}
                    {visibleColumns.includes('firePolicyNumber') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Fire Policy Number</th>}
                    {visibleColumns.includes('firePolicyAmount') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Fire Policy Amount</th>}
                    {visibleColumns.includes('firePolicyStartDate') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Fire Policy Start</th>}
                    {visibleColumns.includes('firePolicyEndDate') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Fire Policy End</th>}
                    {visibleColumns.includes('burglaryPolicyCompanyName') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Burglary Policy Company</th>}
                    {visibleColumns.includes('burglaryPolicyNumber') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Burglary Policy Number</th>}
                    {visibleColumns.includes('burglaryPolicyAmount') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Burglary Policy Amount</th>}
                    {visibleColumns.includes('burglaryPolicyStartDate') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Burglary Policy Start</th>}
                    {visibleColumns.includes('burglaryPolicyEndDate') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Burglary Policy End</th>}
                    {visibleColumns.includes('remainingFirePolicyAmount') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Remaining Fire Amount</th>}
                    {visibleColumns.includes('remainingBurglaryPolicyAmount') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Remaining Burglary Amount</th>}
                    {visibleColumns.includes('status') && <th className="border border-orange-300 px-4 py-2 text-left text-orange-800 font-semibold">Status</th>}
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
                      {visibleColumns.includes('insuranceTakenBy') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.insuranceTakenBy || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('insuranceCommodity') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.insuranceCommodity || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('clientName') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.clientName || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('clientAddress') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.clientAddress || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('selectedBankName') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.selectedBankName || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('firePolicyCompanyName') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.firePolicyCompanyName || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('firePolicyNumber') && (
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                          {item.firePolicyNumber || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('firePolicyAmount') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.firePolicyAmount || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('firePolicyStartDate') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {formatDate(item.firePolicyStartDate)}
                        </td>
                      )}
                      {visibleColumns.includes('firePolicyEndDate') && (
                        <td className="border border-gray-200 px-4 py-2">
                          <span className={isPolicyExpired(item.firePolicyEndDate) ? 'text-red-600 font-medium' : ''}>
                            {formatDate(item.firePolicyEndDate)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('burglaryPolicyCompanyName') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.burglaryPolicyCompanyName || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('burglaryPolicyNumber') && (
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                          {item.burglaryPolicyNumber || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('burglaryPolicyAmount') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.burglaryPolicyAmount || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('burglaryPolicyStartDate') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {formatDate(item.burglaryPolicyStartDate)}
                        </td>
                      )}
                      {visibleColumns.includes('burglaryPolicyEndDate') && (
                        <td className="border border-gray-200 px-4 py-2">
                          <span className={isPolicyExpired(item.burglaryPolicyEndDate) ? 'text-red-600 font-medium' : ''}>
                            {formatDate(item.burglaryPolicyEndDate)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('remainingFirePolicyAmount') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.remainingFirePolicyAmount || 'N/A'}
                        </td>
                      )}
                      {visibleColumns.includes('remainingBurglaryPolicyAmount') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.remainingBurglaryPolicyAmount || 'N/A'}
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
                  {loading ? 'Loading data...' : 'No insurance data found matching the current filters'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
