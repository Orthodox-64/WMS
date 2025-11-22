"use client";

import DashboardLayout from '@/components/dashboard-layout';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';import { Card, CardContent } from '@/components/ui/card';
import { Download, ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { FiltersAndControls } from '@/components/reports/FiltersAndControls';

interface InsuranceReportData {
  id: string;
  state: string;
  branch: string;
  location: string;
  typeOfBusiness: string;
  warehouseType: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseAddress: string;
  clientCode: string;
  clientName: string;
  commodity: string;
  variety: string;
  bankName: string;
  bankBranchName: string;
  bankState: string;
  ifscCode: string;
  balanceBags: string;
  balanceQty: string;
  insuranceManagedBy: string;
  rate: string;
  aum: string;
  firePolicyNumber: string;
  firePolicySumInsured: string;
  firePolicyStartDate: string;
  firePolicyEndDate: string;
  burglaryPolicyNumber: string;
  burglaryPolicySumInsured: string;
  burglaryPolicyStartDate: string;
  burglaryPolicyEndDate: string;
  firePolicyRemainingAmount: string;
  burglaryPolicyRemainingAmount: string;
  [key: string]: any;
}

export default function InsuranceReportsPage() {
  const router = useRouter();
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [commodityFilter, setCommodityFilter] = useState('all');
  const [insuranceManagedByFilter, setInsuranceManagedByFilter] = useState('all');
  
  // Data and UI states
  const [loading, setLoading] = useState(false);
  const [insuranceData, setInsuranceData] = useState<InsuranceReportData[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'state', 'branch', 'location', 'typeOfBusiness', 'warehouseType', 'warehouseCode', 'warehouseName', 'warehouseAddress',
    'clientCode', 'clientName', 'commodity', 'bankName', 'bankBranchName', 'bankState', 'ifscCode',
    'balanceBags', 'balanceQty', 'insuranceManagedBy', 'rate', 'aum', 'firePolicyNumber', 'firePolicySumInsured',
    'firePolicyStartDate', 'firePolicyEndDate', 'burglaryPolicyNumber', 'burglaryPolicySumInsured', 'burglaryPolicyStartDate', 'burglaryPolicyEndDate',
    'firePolicyRemainingAmount', 'burglaryPolicyRemainingAmount'
  ]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Column definitions for table - 28 columns matching the image
  const allColumns = [
    { key: 'state', label: 'State', width: 'w-24' },
    { key: 'branch', label: 'Branch', width: 'w-24' },
    { key: 'location', label: 'Location', width: 'w-24' },
    { key: 'typeOfBusiness', label: 'Type of Business', width: 'w-32' },
    { key: 'warehouseType', label: 'Warehouse Type', width: 'w-28' },
    { key: 'warehouseCode', label: 'Warehouse Code', width: 'w-28' },
    { key: 'warehouseName', label: 'Warehouse Name', width: 'w-32' },
    { key: 'warehouseAddress', label: 'Warehouse Address', width: 'w-36' },
    { key: 'clientCode', label: 'Client Code', width: 'w-24' },
    { key: 'clientName', label: 'Client Name', width: 'w-28' },
    { key: 'commodity', label: 'Commodity', width: 'w-24' },
    { key: 'bankName', label: 'Bank Name', width: 'w-28' },
    { key: 'bankBranchName', label: 'Bank Branch Name', width: 'w-32' },
    { key: 'bankState', label: 'Bank State', width: 'w-24' },
    { key: 'ifscCode', label: 'IFSC Code', width: 'w-24' },
    { key: 'balanceBags', label: 'Balance Bags', width: 'w-24' },
    { key: 'balanceQty', label: 'Balance Quantity (MT)', width: 'w-24' },
    { key: 'insuranceManagedBy', label: 'Insurance Managed By', width: 'w-32' },
    { key: 'rate', label: 'Rate', width: 'w-20' },
    { key: 'aum', label: 'AUM', width: 'w-20' },
    { key: 'firePolicyNumber', label: 'Fire Policy Number', width: 'w-28' },
    { key: 'firePolicySumInsured', label: 'Fire Policy Sum Insured', width: 'w-32' },
    { key: 'firePolicyStartDate', label: 'Fire Policy Start Date', width: 'w-28' },
    { key: 'firePolicyEndDate', label: 'Fire Policy End Date', width: 'w-28' },
    { key: 'burglaryPolicyNumber', label: 'Burglary Policy Number', width: 'w-32' },
    { key: 'burglaryPolicySumInsured', label: 'Burglary Policy Sum Insured', width: 'w-36' },
    { key: 'burglaryPolicyStartDate', label: 'Burglary Policy Start Date', width: 'w-32' },
    { key: 'burglaryPolicyEndDate', label: 'Burglary Policy End Date', width: 'w-32' },
    { key: 'firePolicyRemainingAmount', label: 'Fire Policy Remaining Amount', width: 'w-36' },
    { key: 'burglaryPolicyRemainingAmount', label: 'Burglary Policy Remaining Amount', width: 'w-40' }
  ];  // Set default date range (6 months ago to today)
  useEffect(() => {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(sixMonthsAgo.toISOString().split('T')[0]);
  }, []);

  // Fetch insurance data when component mounts or when date filters change
  useEffect(() => {
    if (startDate && endDate) {
      fetchInsuranceData();
    }
  }, [startDate, endDate]);

  const fetchInsuranceData = async () => {
    setLoading(true);
    try {
      const data: InsuranceReportData[] = [];
      
      // Fetch from multiple collections for comprehensive data
      console.log('🔍 INSURANCE REPORT: Fetching from multiple collections...');
      const [insuranceSnap, inspectionsSnap, inwardSnap, outwardSnap] = await Promise.all([
        getDocs(collection(db, 'insurance')),
        getDocs(collection(db, 'inspections')),
        getDocs(collection(db, 'inward')),
        getDocs(collection(db, 'outward'))
      ]);
      
      console.log('📊 Collection query results:', {
        insurance: insuranceSnap.size,
        inspections: inspectionsSnap.size,
        inward: inwardSnap.size,
        outward: outwardSnap.size
      });
      
      // Create comprehensive maps for cross-referencing data
      const warehouseDetailsMap = new Map();
      const insuranceDataMap = new Map(); // Map by warehouse name to store insurance master data
      const outwardDataMap = new Map();
      
      // Build warehouse details map from inspections (warehouse type, business type, bank details)
      inspectionsSnap.docs.forEach(doc => {
        const docData = doc.data();
        const warehouseName = docData.warehouseName;
        if (warehouseName && (docData.status === 'activated' || docData.status === 'reactivate')) {
          warehouseDetailsMap.set(warehouseName, {
            warehouseCode: docData.warehouseCode || '',
            address: docData.address || docData.warehouseInspectionData?.address || '',
            state: docData.state || docData.warehouseInspectionData?.state || '',
            branch: docData.branch || docData.warehouseInspectionData?.branch || '',
            location: docData.location || docData.warehouseInspectionData?.location || '',
            // Warehouse type with comprehensive fallback chain
            warehouseType: (() => {
                          const baseType = docData.typeOfWarehouse ||
                                           docData.typeofwarehouse ||
                                           docData.warehouseType ||
                                           docData.warehouseInspectionData?.typeOfWarehouse ||
                                           docData.warehouseInspectionData?.warehouseType || '';
                          const customType = docData.customWarehouseType ||
                                             docData.warehouseInspectionData?.customWarehouseType || '';
                          const baseStr = typeof baseType === 'string' ? baseType.trim().toLowerCase() : '';
                          // If base type indicates 'other(s)', use the customWarehouseType from inspections
                          if (baseStr.includes('other')) {
                            return customType || baseType || '';
                          }
                          return baseType || '';
                        })(),
            // Business type with fallback chain
            businessType: docData.businessType ||
                         docData.typeOfBusiness ||
                         docData.warehouseInspectionData?.businessType ||
                         docData.warehouseInspectionData?.typeOfBusiness || '',
            // Bank details from inspections
            bankName: docData.bankName || docData.warehouseInspectionData?.bankName || '',
            bankBranchName: docData.bankBranch || docData.bankBranchName || docData.warehouseInspectionData?.bankBranch || '',
            bankState: docData.bankState || docData.warehouseInspectionData?.bankState || '',
            ifscCode: docData.ifscCode || docData.warehouseInspectionData?.ifscCode || ''
          });
        }
      });
      
      // Build insurance master data map - store all insurance entries by warehouse name
      insuranceSnap.docs.forEach(doc => {
        const docData = doc.data();
        const warehouseName = docData.warehouseName;
        if (warehouseName) {
          if (!insuranceDataMap.has(warehouseName)) {
            insuranceDataMap.set(warehouseName, []);
          }
          
          // Extract insurance entries from this document
          let insuranceEntries: any[] = [];
          if (docData.insuranceEntries && Array.isArray(docData.insuranceEntries) && docData.insuranceEntries.length > 0) {
            insuranceEntries = docData.insuranceEntries;
          } else {
            // If no array, treat entire document as one entry
            insuranceEntries = [docData];
          }
          
          // Store all entries for this warehouse
          insuranceEntries.forEach(entry => {
            insuranceDataMap.get(warehouseName).push({
              ...entry,
              _sourceDocId: doc.id // Track which document this came from
            });
          });
        }
      });
      
      // Build outward data map for balance calculations
      outwardSnap.docs.forEach(doc => {
        const docData = doc.data();
        const warehouseName = docData.warehouseName;
        if (warehouseName) {
          if (!outwardDataMap.has(warehouseName)) {
            outwardDataMap.set(warehouseName, []);
          }
          outwardDataMap.get(warehouseName).push({
            outwardBags: Number(docData.outwardBags || 0),
            outwardQuantity: Number(docData.outwardQuantity || 0)
          });
        }
      });
      
      console.log('Applying date filtering for insurance report. Date range:', startDate, 'to', endDate);
      
      // Filter INWARD documents by date range first (since we're showing inward-based data)
      let filteredInwardDocs = inwardSnap.docs;
      
      if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // Include the entire end date
        
        console.log('Filtering inward by date range:', startDateObj, 'to', endDateObj);
        
        filteredInwardDocs = inwardSnap.docs.filter(doc => {
          const docData = doc.data();
          let docDate = null;
          
          // Try to get date from createdAt field first
          if (docData.createdAt) {
            if (docData.createdAt.toDate) {
              // Firestore Timestamp
              docDate = docData.createdAt.toDate();
            } else if (typeof docData.createdAt === 'string') {
              // String date
              docDate = new Date(docData.createdAt);
            }
          }
          
          // If no createdAt or invalid, try inwardDate or dateOfInward
          if (!docDate || isNaN(docDate.getTime())) {
            if (docData.inwardDate) {
              docDate = new Date(docData.inwardDate);
            } else if (docData.dateOfInward) {
              docDate = new Date(docData.dateOfInward);
            }
          }
          
          // If still no valid date, exclude from results
          if (!docDate || isNaN(docDate.getTime())) {
            console.log('No valid date found for inward document:', doc.id);
            return false;
          }
          
          // Check if date falls within range
          const isInRange = docDate >= startDateObj && docDate <= endDateObj;
          return isInRange;
        });
        
        console.log('Insurance report: After date filtering:', filteredInwardDocs.length, 'of', inwardSnap.docs.length, 'inward documents remain');
      }
      
      // PROCESS EACH INWARD ENTRY - Each inward doc becomes one row in insurance report
      filteredInwardDocs.forEach(doc => {
        const inwardData = doc.data();
        const warehouseName = inwardData.warehouseName;
        
        console.log('=== INWARD-BASED INSURANCE REPORT DEBUG ===');
        console.log('Processing inward entry for warehouse:', warehouseName);
        console.log('Branch:', inwardData.branch, 'Insurance:', inwardData.insuranceManagedBy || inwardData.selectedInsurance);
        
        // Get warehouse details from inspections
        const warehouseDetails = warehouseDetailsMap.get(warehouseName) || {};
        
        // Get insurance master data for this warehouse (may have multiple entries)
        const insuranceEntries = insuranceDataMap.get(warehouseName) || [];
        
        // Try to find matching insurance entry based on insurance type or other criteria
        // For now, use the first matching entry or create default
        let matchingInsurance: any = {};
        const inwardInsuranceType = (inwardData.insuranceManagedBy || inwardData.selectedInsurance || '').toString().toLowerCase();
        
        if (insuranceEntries.length > 0) {
          // Try to find exact match by insurance type
          matchingInsurance = insuranceEntries.find((ins: any) => {
            const insType = (ins.insuranceType || '').toString().toLowerCase();
            return insType === inwardInsuranceType || 
                   (inwardInsuranceType.includes('bank') && insType.includes('bank')) ||
                   (inwardInsuranceType.includes('client') && insType.includes('client')) ||
                   (inwardInsuranceType.includes('agro') && insType.includes('agro'));
          }) || insuranceEntries[0]; // Fallback to first entry
        }
        
        console.log('Found matching insurance entry:', matchingInsurance ? 'Yes' : 'No');
        
        // Get outward data for THIS specific inward's balance calculations
        const outwardEntries = outwardDataMap.get(warehouseName) || [];
        const totalOutwardBags = outwardEntries.reduce((sum: number, entry: any) => sum + entry.outwardBags, 0);
        const totalOutwardQuantity = outwardEntries.reduce((sum: number, entry: any) => sum + entry.outwardQuantity, 0);
        
        // Calculate balance bags and quantity for THIS inward entry
        const inwardBags = Number(inwardData.totalBags || inwardData.inwardBags || 0);
        const inwardQuantity = Number(inwardData.totalQuantity || inwardData.inwardQuantity || 0);
        const balanceBags = inwardBags - totalOutwardBags;
        const balanceQty = inwardQuantity - totalOutwardQuantity;
        
        console.log('Balance calculations for this inward:', {
          inwardBags,
          totalOutwardBags,
          balanceBags,
          inwardQuantity,
          totalOutwardQuantity,
          balanceQty
        });
        
        // Calculate AUM (Assets Under Management) - rate * balance quantity
        const rate = Number(matchingInsurance.rate || inwardData.rate || inwardData.marketRate || 0);
        const aum = rate * Math.max(0, balanceQty);
        
        // Comprehensive bank details from inward data with fallbacks
        const bankName = inwardData.bankName || 
                        inwardData.bank || 
                        inwardData.selectedBankName ||
                        matchingInsurance.bankFundedBy ||
                        matchingInsurance.bankName ||
                        warehouseDetails.bankName || '';
        
        const bankBranchName = inwardData.bankBranchName ||
                              inwardData.bankBranch ||
                              inwardData.branchName ||
                              inwardData.selectedBankBranchName ||
                              matchingInsurance.bankBranchName ||
                              matchingInsurance.bankBranch ||
                              warehouseDetails.bankBranchName || '';
        
        const bankState = inwardData.bankState ||
                         inwardData.selectedBankState ||
                         matchingInsurance.bankState ||
                         warehouseDetails.bankState || '';
        
        const ifscCode = inwardData.ifscCode ||
                        inwardData.IFSC ||
                        inwardData.ifsc ||
                        matchingInsurance.ifscCode ||
                        warehouseDetails.ifscCode || '';
        
        console.log('Final bank details:', { bankName, bankBranchName, bankState, ifscCode });
        
        // Check if insurance is taken by client
        const insuranceType = (inwardData.insuranceManagedBy || inwardData.selectedInsurance || matchingInsurance.insuranceType || '').toString().toLowerCase();
        const isTakenByClient = insuranceType.includes('client');
        
        console.log('Insurance type check:', {
          insuranceType: insuranceType,
          isTakenByClient
        });

        // Calculate SR Last Validity Date
        const calculateSRValidityDate = () => {
          // Try matching insurance entry dates first
          const entryPolicyEndDates = [
            matchingInsurance.firePolicyEndDate, 
            matchingInsurance.burglaryPolicyEndDate, 
            matchingInsurance.policyEndDate, 
            matchingInsurance.endDate
          ].filter(Boolean);
          
          if (entryPolicyEndDates.length > 0) {
            const dates = entryPolicyEndDates.map((d: any) => new Date(d)).filter((d: Date) => !isNaN(d.getTime()));
            if (dates.length > 0) {
              const earliest = dates.reduce((a: Date, b: Date) => a < b ? a : b);
              return earliest.toISOString().split('T')[0];
            }
          }

          // Fallback: add 9 months to inward date or insurance start date
          const fallbackStartDate = inwardData.inwardDate || 
                                   inwardData.dateOfInward || 
                                   matchingInsurance.firePolicyStartDate || 
                                   matchingInsurance.dateOfCreation;
          if (fallbackStartDate) {
            try {
              const d = new Date(fallbackStartDate);
              if (!isNaN(d.getTime())) {
                d.setMonth(d.getMonth() + 9);
                return d.toISOString().split('T')[0];
              }
            } catch {}
          }

          return '';
        };

        const srLastValidityDateForRow = calculateSRValidityDate();
        
        // Create a row for THIS inward entry
        data.push({
          id: doc.id, // Use inward doc ID
          state: inwardData.state || warehouseDetails.state || '',
          branch: inwardData.branch || warehouseDetails.branch || '',
          location: inwardData.location || warehouseDetails.location || '',
          typeOfBusiness: warehouseDetails.businessType || '',
          warehouseType: warehouseDetails.warehouseType || inwardData.warehouseType || '',
          warehouseCode: inwardData.warehouseCode || warehouseDetails.warehouseCode || '',
          warehouseName: warehouseName || '',
          warehouseAddress: warehouseDetails.address || inwardData.warehouseAddress || '',
          // Client details from inward
          clientCode: isTakenByClient ? (inwardData.clientCode || matchingInsurance.clientCode || '') : '-',
          clientName: isTakenByClient ? (inwardData.clientName || inwardData.client || matchingInsurance.clientName || '') : '-',
          // Commodity and Variety from inward
          commodity: inwardData.commodity || inwardData.commodityName || matchingInsurance.commodityName || '',
          variety: inwardData.variety || inwardData.varietyName || matchingInsurance.varietyName || '',
          // Bank details
          bankName: bankName,
          bankBranchName: bankBranchName,
          bankState: bankState,
          ifscCode: ifscCode,
          // Balance calculations for this specific inward
          balanceBags: String(Math.max(0, balanceBags)),
          balanceQty: String(Math.max(0, balanceQty)),
          insuranceManagedBy: inwardData.insuranceManagedBy || inwardData.selectedInsurance || matchingInsurance.insuranceType || '',
          rate: String(rate),
          aum: String(aum),
          // Policy details from matching insurance entry
          firePolicyNumber: matchingInsurance.firePolicyNumber || '',
          firePolicySumInsured: matchingInsurance.firePolicyAmount || '',
          firePolicyStartDate: matchingInsurance.firePolicyStartDate || '',
          firePolicyEndDate: matchingInsurance.firePolicyEndDate || '',
          burglaryPolicyNumber: matchingInsurance.burglaryPolicyNumber || '',
          burglaryPolicySumInsured: matchingInsurance.burglaryPolicyAmount || '',
          burglaryPolicyStartDate: matchingInsurance.burglaryPolicyStartDate || '',
          burglaryPolicyEndDate: matchingInsurance.burglaryPolicyEndDate || '',
          srLastValidityDate: srLastValidityDateForRow || '',
          // Remaining amounts
          firePolicyRemainingAmount: matchingInsurance.firePolicyRemainingAmount || '',
          burglaryPolicyRemainingAmount: matchingInsurance.burglaryPolicyRemainingAmount || ''
        });
      }); // End of inward docs loop
      
      console.log('✅ INSURANCE REPORT: Final processed data:', data.length, 'records');
      setInsuranceData(data);
    } catch (error) {
      console.error('❌ Error fetching insurance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique filter options
  const uniqueWarehouses = useMemo(() => {
    return Array.from(new Set(insuranceData.map(item => item.warehouseName).filter(Boolean))).sort();
  }, [insuranceData]);

  const uniqueStates = useMemo(() => {
    return Array.from(new Set(insuranceData.map(item => item.state).filter(Boolean))).sort();
  }, [insuranceData]);

  const uniqueBranches = useMemo(() => {
    return Array.from(new Set(insuranceData.map(item => item.branch).filter(Boolean))).sort();
  }, [insuranceData]);

  const uniqueClients = useMemo(() => {
    return Array.from(new Set(insuranceData.map(item => item.clientName).filter(Boolean))).sort();
  }, [insuranceData]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(insuranceData.map(item => item.status).filter(Boolean))).sort();
  }, [insuranceData]);

  const uniqueCommodities = useMemo(() => {
    return Array.from(new Set(insuranceData.map(item => item.commodity).filter(Boolean))).sort();
  }, [insuranceData]);

  const uniqueInsuranceManagedBy = useMemo(() => {
    return Array.from(new Set(insuranceData.map(item => item.insuranceManagedBy).filter(Boolean))).sort();
  }, [insuranceData]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, warehouseFilter, stateFilter, branchFilter, clientFilter, commodityFilter, insuranceManagedByFilter, itemsPerPage, startDate, endDate]);

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
    
    // Apply all filters
    if (warehouseFilter && warehouseFilter !== 'all') {
      filtered = filtered.filter(item => item.warehouseName === warehouseFilter);
    }

    if (stateFilter && stateFilter !== 'all') {
      filtered = filtered.filter(item => item.state === stateFilter);
    }

    if (branchFilter && branchFilter !== 'all') {
      filtered = filtered.filter(item => item.branch === branchFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (clientFilter && clientFilter !== 'all') {
      filtered = filtered.filter(item => item.clientName === clientFilter);
    }

    if (commodityFilter && commodityFilter !== 'all') {
      filtered = filtered.filter(item => item.commodity === commodityFilter);
    }

    if (insuranceManagedByFilter && insuranceManagedByFilter !== 'all') {
      filtered = filtered.filter(item => item.insuranceManagedBy === insuranceManagedByFilter);
    }
    
    return filtered;
  }, [insuranceData, searchTerm, statusFilter, warehouseFilter, stateFilter, branchFilter, clientFilter, commodityFilter, insuranceManagedByFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Pagination functions
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPage = (page: number) => setCurrentPage(page);

  // Export filtered data to CSV
  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    
    const headers = [
      'State', 'Branch', 'Location', 'Type of Business', 'Warehouse Type', 'Warehouse Code', 'Warehouse Name', 'Warehouse Address',
      'Client Code', 'Client Name', 'Commodity', 'Bank Name', 'Bank Branch Name', 'Bank State', 'IFSC Code',
      'Balance Bags', 'Balance Quantity (MT)', 'Insurance Managed By', 'Rate', 'AUM', 'Fire Policy Number', 'Fire Policy Sum Insured',
      'Fire Policy Start Date', 'Fire Policy End Date', 'Burglary Policy Number', 'Burglary Policy Sum Insured', 'Burglary Policy Start Date', 'Burglary Policy End Date',
      'Fire Policy Remaining Amount', 'Burglary Policy Remaining Amount'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.state || '',
        row.branch || '',
        row.location || '',
        row.typeOfBusiness || '',
        row.warehouseType || '',
        row.warehouseCode || '',
        row.warehouseName || '',
        row.warehouseAddress || '',
        row.clientCode || '',
        row.clientName || '',
        row.commodity || '',
        row.bankName || '',
        row.bankBranchName || '',
        row.bankState || '',
        row.ifscCode || '',
        row.balanceBags || '',
        row.balanceQty || '',
        row.insuranceManagedBy || '',
        row.rate || '',
        row.aum || '',
        row.firePolicyNumber || '',
        row.firePolicySumInsured || '',
        row.firePolicyStartDate || '',
        row.firePolicyEndDate || '',
        row.burglaryPolicyNumber || '',
        row.burglaryPolicySumInsured || '',
        row.burglaryPolicyStartDate || '',
        row.burglaryPolicyEndDate || '',
        row.firePolicyRemainingAmount || '',
        row.burglaryPolicyRemainingAmount || ''
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
    setCommodityFilter('all');
    setInsuranceManagedByFilter('all');
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || warehouseFilter !== 'all' || stateFilter !== 'all' || 
    branchFilter !== 'all' || clientFilter !== 'all' || commodityFilter !== 'all' || insuranceManagedByFilter !== 'all';

  // Toggle column visibility
  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(col => col !== columnKey)
        : [...prev, columnKey]
    );
  };

  // Filter options for the modular component
  const filterOptions = [
    {
      key: 'status',
      label: 'Status',
      value: statusFilter,
      options: uniqueStatuses
    },
    {
      key: 'warehouse',
      label: 'Warehouse',
      value: warehouseFilter,
      options: uniqueWarehouses
    },
    {
      key: 'state',
      label: 'State',
      value: stateFilter,
      options: uniqueStates
    },
    {
      key: 'branch',
      label: 'Branch',
      value: branchFilter,
      options: uniqueBranches
    },
    {
      key: 'client',
      label: 'Client',
      value: clientFilter,
      options: uniqueClients
    },
    {
      key: 'commodity',
      label: 'Commodity',
      value: commodityFilter,
      options: uniqueCommodities
    },
    {
      key: 'insuranceManagedBy',
      label: 'Insurance Managed By',
      value: insuranceManagedByFilter,
      options: uniqueInsuranceManagedBy
    }
  ];

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    switch (key) {
      case 'status':
        setStatusFilter(value);
        break;
      case 'warehouse':
        setWarehouseFilter(value);
        break;
      case 'state':
        setStateFilter(value);
        break;
      case 'branch':
        setBranchFilter(value);
        break;
      case 'client':
        setClientFilter(value);
        break;
      case 'commodity':
        setCommodityFilter(value);
        break;
      case 'insuranceManagedBy':
        setInsuranceManagedByFilter(value);
        break;
    }
  };

  // Active filters for display
  const activeFilters = filterOptions
    .filter(filter => filter.value !== 'all')
    .map(filter => ({
      key: filter.key,
      label: filter.label,
      value: filter.value,
      onRemove: () => handleFilterChange(filter.key, 'all')
    }));

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
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
              onClick={() => router.push('/reports')}
              className="inline-flex items-center text-lg font-semibold tracking-tight bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Reports
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

        {/* Filters & Controls - Modular Component */}
        <FiltersAndControls
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          loading={loading}
          onApplyFilters={fetchInsuranceData}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          allColumns={allColumns}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
          onClearFilters={clearFilters}
          activeFilters={activeFilters}
        />

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} entries
            {filteredData.length !== insuranceData.length && ` (filtered from ${insuranceData.length} total)`}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Data Table with Sticky Headers */}
        <div className="table-container">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full max-h-[600px]">
                <table className="min-w-full border-collapse border border-gray-200 table-auto md:table-fixed">
                  <thead className="sticky-header bg-orange-100">
                    <tr>
                      {allColumns
                        .filter(col => visibleColumns.includes(col.key))
                        .map(column => (
                          <th key={column.key} className="border border-orange-300 px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm text-orange-800 font-semibold whitespace-nowrap" style={{ minWidth: 120 }}>
                            {column.label}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        {allColumns
                          .filter(col => visibleColumns.includes(col.key))
                          .map(column => (
                            <td key={column.key} className="border border-gray-200 px-4 py-2 whitespace-nowrap">
                              {column.key === 'firePolicyStartDate' || column.key === 'firePolicyEndDate' || 
                               column.key === 'burglaryPolicyStartDate' || column.key === 'burglaryPolicyEndDate' ? (
                                <span className={isPolicyExpired(item[column.key]) && column.key.includes('EndDate') ? 'text-red-600 font-medium' : ''}>
                                  {formatDate(item[column.key])}
                                </span>
                              ) : column.key === 'firePolicySumInsured' || column.key === 'burglaryPolicySumInsured' ||
                                       column.key === 'balanceBags' || column.key === 'balanceQty' || 
                                       column.key === 'rate' || column.key === 'aum' ? (
                                <span className="text-right block">
                                  {item[column.key] || '-'}
                                </span>
                              ) : column.key === 'warehouseCode' || column.key === 'clientCode' || 
                                       column.key === 'firePolicyNumber' || column.key === 'burglaryPolicyNumber' || 
                                       column.key === 'ifscCode' ? (
                                <span className="font-mono text-sm">
                                  {item[column.key] || '-'}
                                </span>
                              ) : (
                                item[column.key] || '-'
                              )}
                            </td>
                          ))}
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

        {/* Pagination Controls */}
        {filteredData.length > 0 && (
          <Card>
            <CardContent className="flex items-center justify-between space-x-2 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNumber <= totalPages) {
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    );
                  }
                  return null;
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-sm text-gray-500">
                {filteredData.length} total entries
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
