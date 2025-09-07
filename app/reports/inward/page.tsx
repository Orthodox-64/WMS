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
  cadNumber: string;
  inwardDate: string;
  srWrNumber: string;
  srWrDate: string;
  fundingSrWrDate: string;
  srLastValidityDate: string;
  totalBags: string;
  totalQty: string;
  roBags: string;
  roQty: string;
  doBags: string;
  doQty: string;
  balanceBags: string;
  balanceQty: string;
  insuranceManagedBy: string;
  rate: string;
  aum: string;
  databaseLocation: string;
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
  // Column definitions - 33 columns as per image
  const allColumns = [
    { key: 'state', label: 'State', width: 'w-20' },
    { key: 'branch', label: 'Branch', width: 'w-20' },
    { key: 'location', label: 'Location', width: 'w-24' },
    { key: 'typeOfBusiness', label: 'Type of Business', width: 'w-32' },
    { key: 'warehouseType', label: 'Warehouse Type', width: 'w-28' },
    { key: 'warehouseCode', label: 'Warehouse Code', width: 'w-28' },
    { key: 'warehouseName', label: 'Warehouse Name', width: 'w-32' },
    { key: 'warehouseAddress', label: 'Warehouse Address', width: 'w-36' },
    { key: 'clientCode', label: 'Client Code', width: 'w-24' },
    { key: 'clientName', label: 'Client Name', width: 'w-28' },
    { key: 'commodity', label: 'Commodity', width: 'w-24' },
    { key: 'variety', label: 'Variety', width: 'w-24' },
    { key: 'bankName', label: 'Bank Name', width: 'w-28' },
    { key: 'bankBranchName', label: 'Bank Branch Name', width: 'w-32' },
    { key: 'bankState', label: 'Bank State', width: 'w-24' },
    { key: 'ifscCode', label: 'IFSC Code', width: 'w-24' },
    { key: 'cadNumber', label: 'CAD Number', width: 'w-24' },
    { key: 'inwardDate', label: 'Inward Date', width: 'w-28' },
    { key: 'srWrNumber', label: 'SR/WR Number', width: 'w-32' },
    { key: 'srWrDate', label: 'SR/WR Date', width: 'w-28' },
    { key: 'fundingSrWrDate', label: 'Funding SR/WR Date', width: 'w-36' },
    { key: 'srLastValidityDate', label: 'SR Last Validity Date', width: 'w-32' },
    { key: 'totalBags', label: 'Total Bags', width: 'w-24' },
    { key: 'totalQty', label: 'Total Qty(MT)', width: 'w-28' },
    { key: 'roBags', label: 'RO Bags', width: 'w-20' },
    { key: 'roQty', label: 'RO Qty (MT)', width: 'w-24' },
    { key: 'doBags', label: 'DO Bags', width: 'w-20' },
    { key: 'doQty', label: 'DO Qty (MT)', width: 'w-24' },
    { key: 'balanceBags', label: 'Balance Bags', width: 'w-24' },
    { key: 'balanceQty', label: 'Balance Qty (MT)', width: 'w-28' },
    { key: 'insuranceManagedBy', label: 'Insurance Managed by', width: 'w-32' },
    { key: 'rate', label: 'Rate', width: 'w-20' },
    { key: 'aum', label: 'AUM(I)', width: 'w-20' }
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumns.map(col => col.key));

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
          const inwardCollection = collection(db, collectionName);
          
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
                
                // Debug: Show exactly what data we're getting from the inward collection
                console.log(`=== INWARD DATA FROM ${collectionName} COLLECTION ===`);
                console.log('Document ID:', doc.id);
                console.log('All available fields:', Object.keys(docData));
                console.log('Raw document data:', docData);
                
                // Get SR Number from real data, not hardcoded
                const srNumber = docData.srNumber || docData.sr || docData.serialNumber || docData.srNo || '';
                console.log('SR Number extracted from real data:', srNumber);
                
                // Get WR Number from real data, not generated
                let wrNumber = docData.wrNumber || 
                              docData.warehouseReceiptNumber || 
                              docData.warehouseReceiptNo || 
                              docData.srNo || 
                              docData.srwrNo || 
                              docData.warehouseReceipt || 
                              docData.receiptNumber || 
                              docData.wr || '';
                
                // Only use fallback if no real data exists
                if (!wrNumber) {
                  wrNumber = '-';
                }
                console.log('WR Number extracted from real data:', wrNumber);
                
                // Get warehouse type from warehouse creation survey section for activated warehouses
                let warehouseType = '';
                let warehouseCode = '';
                let warehouseAddress = '';
                let businessType = '';
                
                if (docData.warehouseName) {
                  console.log('Looking for warehouse type for warehouse name:', docData.warehouseName);
                  try {
                    // Fetch warehouse type from inspections collection where typeOfWarehouse field is present
                    try {
                      console.log(`Fetching warehouse type from inspections collection for warehouse: ${docData.warehouseName}`);
                      
                      // Query inspections collection with database location filter if available
                      let inspectionsQuery;
                      if (docData.databaseLocation) {
                        inspectionsQuery = query(
                          collection(db, 'inspections'),
                          where('warehouseName', '==', docData.warehouseName),
                          where('databaseLocation', '==', docData.databaseLocation)
                        );
                      } else {
                        inspectionsQuery = query(
                          collection(db, 'inspections'),
                          where('warehouseName', '==', docData.warehouseName)
                        );
                      }
                      
                      const inspectionsSnapshot = await getDocs(inspectionsQuery);
                      
                      if (!inspectionsSnapshot.empty) {
                        const inspectionData = inspectionsSnapshot.docs[0].data();
                        console.log('Inspections data found:', inspectionData);
                        console.log('Available fields in inspections:', Object.keys(inspectionData));
                        
                        // Get warehouse type from typeOfWarehouse field (correct field name)
                        warehouseType = inspectionData.typeOfWarehouse || 
                                      inspectionData.typeofwarehouse || 
                                      inspectionData.warehouseType || 
                                      inspectionData.warehouseInspectionData?.typeOfWarehouse ||
                                      inspectionData.warehouseInspectionData?.warehouseType || '';
                        
                        // Get other warehouse details from inspections
                        warehouseCode = inspectionData.warehouseCode || 
                                      inspectionData.warehouseInspectionData?.warehouseCode || '';
                        warehouseAddress = inspectionData.warehouseAddress || 
                                        inspectionData.warehouseInspectionData?.warehouseAddress || '';
                        businessType = inspectionData.businessType || 
                                     inspectionData.warehouseInspectionData?.businessType || '';
                        
                        console.log('Extracted warehouse type from inspections:', warehouseType);
                        console.log('Warehouse code from inspections:', warehouseCode);
                      } else {
                        console.log('No inspections data found for warehouse:', docData.warehouseName);
                      }
                    } catch (error) {
                      console.log('Error fetching from inspections collection:', error);
                    }
                    
                    console.log('Final extracted warehouse type:', warehouseType);
                    console.log('Warehouse type will be displayed as:', warehouseType || '-');
                  } catch (error) {
                    console.log('Error fetching warehouse type from warehouse creation:', error);
                  }
                }
                
                // Fetch RO Bags and RO Qty from release order section
                let roBags = '';
                let roQty = '';
                
                if (docData.warehouseName && docData.inwardId) {
                  try {
                    console.log(`Fetching RO data from release orders for warehouse: ${docData.warehouseName}, inward: ${docData.inwardId}`);
                    
                    // Try multiple possible collection names for release orders
                    const possibleROCollections = ['releaseOrders', 'releaseOrder', 'release-orders', 'ro', 'roData'];
                    let roData = null;
                    
                    for (const collectionName of possibleROCollections) {
                      try {
                        console.log(`Trying to fetch RO data from collection: ${collectionName}`);
                        
                        const releaseOrderQuery = query(
                          collection(db, collectionName),
                          where('inwardId', '==', docData.inwardId),
                          where('warehouseName', '==', docData.warehouseName)
                        );
                        
                        const releaseOrderSnapshot = await getDocs(releaseOrderQuery);
                        
                        if (!releaseOrderSnapshot.empty) {
                          roData = releaseOrderSnapshot.docs[0].data();
                          console.log(`Found RO data in ${collectionName}:`, roData);
                          console.log('Available fields in release order:', Object.keys(roData));
                          break;
                        }
                      } catch (error) {
                        console.log(`Error fetching from ${collectionName}:`, error);
                        continue;
                      }
                    }
                    
                    if (roData) {
                      // Get RO Bags and Qty from release order data
                      roBags = roData.releaseBags || 
                               roData.roBags || 
                               roData.bags || 
                               roData.totalBags || 
                               roData.releaseBags || '';
                      roQty = roData.releaseQty || 
                              roData.roQty || 
                              roData.quantity || 
                              roData.totalQuantity || 
                              roData.releaseQuantity || '';
                      
                      console.log('Extracted RO Bags:', roBags);
                      console.log('Extracted RO Qty:', roQty);
                    } else {
                      console.log('No release order data found in any collection for warehouse:', docData.warehouseName, 'inward:', docData.inwardId);
                    }
                  } catch (error) {
                    console.log('Error fetching from release orders collections:', error);
                  }
                }
                
                // Fetch DO Bags and DO Qty from delivery order section
                let doBags = '';
                let doQty = '';
                
                if (docData.warehouseName) {
                  try {
                    console.log(`Fetching DO data from delivery orders for warehouse: ${docData.warehouseName}`);
                    console.log('Available inward data fields:', Object.keys(docData));
                    console.log('Inward ID value:', docData.inwardId);
                    console.log('Warehouse name value:', docData.warehouseName);
                    
                    // First, let's try to get a sample document from each collection to see what's available
                    console.log('=== DEBUGGING: Checking available collections and their structure ===');
                    
                    // Try multiple possible collection names for delivery orders
                    const possibleDOCollections = ['deliveryOrders', 'deliveryOrder', 'delivery-orders', 'do', 'doData', 'delivery', 'deliveryorder'];
                    let doData = null;
                    
                    // Debug: Check what collections actually exist and their structure
                    for (const collectionName of possibleDOCollections) {
                      try {
                        // Get a sample document to see the collection structure
                        const sampleQuery = query(collection(db, collectionName), limit(1));
                        const sampleSnapshot = await getDocs(sampleQuery);
                        if (!sampleSnapshot.empty) {
                          const sampleDoc = sampleSnapshot.docs[0].data();
                          console.log(`Collection ${collectionName} exists with sample document:`, sampleDoc);
                          console.log(`Available fields in ${collectionName}:`, Object.keys(sampleDoc));
                        } else {
                          console.log(`Collection ${collectionName} exists but is empty`);
                        }
                                              } catch (error) {
                          console.log(`Collection ${collectionName} does not exist or is not accessible:`, error instanceof Error ? error.message : String(error));
                        }
                    }
                    
                    for (const collectionName of possibleDOCollections) {
                      try {
                        console.log(`Trying to fetch DO data from collection: ${collectionName}`);
                        
                        // Try different query strategies
                        let deliveryOrderSnapshot = null;
                        
                        // Strategy 1: Query by inwardId and warehouseName
                        if (docData.inwardId) {
                          try {
                            console.log(`Strategy 1: Querying ${collectionName} with inwardId: ${docData.inwardId} and warehouseName: ${docData.warehouseName}`);
                            const deliveryOrderQuery1 = query(
                              collection(db, collectionName),
                              where('inwardId', '==', docData.inwardId),
                              where('warehouseName', '==', docData.warehouseName)
                            );
                            deliveryOrderSnapshot = await getDocs(deliveryOrderQuery1);
                            console.log(`Strategy 1 result for ${collectionName}:`, deliveryOrderSnapshot.size, 'documents');
                            if (!deliveryOrderSnapshot.empty) {
                              console.log('Strategy 1 sample document:', deliveryOrderSnapshot.docs[0].data());
                            }
                          } catch (error) {
                            console.log(`Strategy 1 failed for ${collectionName}:`, error instanceof Error ? error.message : String(error));
                          }
                        }
                        
                        // Strategy 2: Query by warehouseName only (broader search)
                        if (!deliveryOrderSnapshot || deliveryOrderSnapshot.empty) {
                          try {
                            console.log(`Strategy 2: Querying ${collectionName} with warehouseName: ${docData.warehouseName} only`);
                            const deliveryOrderQuery2 = query(
                              collection(db, collectionName),
                              where('warehouseName', '==', docData.warehouseName)
                            );
                            deliveryOrderSnapshot = await getDocs(deliveryOrderQuery2);
                            console.log(`Strategy 2 result for ${collectionName}:`, deliveryOrderSnapshot.size, 'documents');
                            if (!deliveryOrderSnapshot.empty) {
                              console.log('Strategy 2 sample document:', deliveryOrderSnapshot.docs[0].data());
                            }
                          } catch (error) {
                            console.log(`Strategy 2 failed for ${collectionName}:`, error instanceof Error ? error.message : String(error));
                          }
                        }
                        
                        // Strategy 3: Query by client/clientName and warehouseName
                        if ((!deliveryOrderSnapshot || deliveryOrderSnapshot.empty) && docData.client) {
                          try {
                            console.log(`Strategy 3: Querying ${collectionName} with client: ${docData.client} and warehouseName: ${docData.warehouseName}`);
                            const deliveryOrderQuery3 = query(
                              collection(db, collectionName),
                              where('client', '==', docData.client),
                              where('warehouseName', '==', docData.warehouseName)
                            );
                            deliveryOrderSnapshot = await getDocs(deliveryOrderQuery3);
                            console.log(`Strategy 3 result for ${collectionName}:`, deliveryOrderSnapshot.size, 'documents');
                            if (!deliveryOrderSnapshot.empty) {
                              console.log('Strategy 3 sample document:', deliveryOrderSnapshot.docs[0].data());
                            }
                          } catch (error) {
                            console.log(`Strategy 3 failed for ${collectionName}:`, error instanceof Error ? error.message : String(error));
                          }
                        }
                        
                        if (deliveryOrderSnapshot && !deliveryOrderSnapshot.empty) {
                          doData = deliveryOrderSnapshot.docs[0].data();
                          console.log(`Found DO data in ${collectionName}:`, doData);
                          console.log('Available fields in delivery order:', Object.keys(doData));
                          break;
                        }
                      } catch (error) {
                        console.log(`Error fetching from ${collectionName}:`, error);
                        continue;
                      }
                    }
                    
                    if (doData) {
                      // Get DO Bags and Qty from delivery order data - try more field variations
                      console.log('Raw DO data for field extraction:', doData);
                      
                      // Try to find bags-related fields
                      const possibleBagFields = [
                        'deliveryBags', 'doBags', 'bags', 'totalBags', 'releaseBags',
                        'bagQuantity', 'bagQty', 'quantityBags', 'bagsQuantity',
                        'deliveryBagQuantity', 'doBagQuantity', 'bagCount', 'bagNumber'
                      ];
                      
                      // Try to find quantity-related fields
                      const possibleQtyFields = [
                        'deliveryQty', 'doQty', 'quantity', 'totalQuantity', 'deliveryQuantity',
                        'qty', 'quantityMT', 'mtQuantity', 'quantityInMT',
                        'deliveryQtyMT', 'doQtyMT', 'quantityInMetricTons', 'metricTons'
                      ];
                      
                      // Find the first non-empty bag field
                      for (const field of possibleBagFields) {
                        if (doData[field] !== undefined && doData[field] !== null && doData[field] !== '') {
                          doBags = doData[field];
                          console.log(`Found DO Bags in field '${field}':`, doBags);
                          break;
                        }
                      }
                      
                      // Find the first non-empty quantity field
                      for (const field of possibleQtyFields) {
                        if (doData[field] !== undefined && doData[field] !== null && doData[field] !== '') {
                          doQty = doData[field];
                          console.log(`Found DO Qty in field '${field}':`, doQty);
                          break;
                        }
                      }
                      
                      console.log('Final extracted DO Bags:', doBags);
                      console.log('Final extracted DO Qty:', doQty);
                    } else {
                      console.log('No delivery order data found in any collection for warehouse:', docData.warehouseName);
                    }
                  } catch (error) {
                    console.log('Error fetching from delivery orders collections:', error);
                  }
                }
                
                // Log available bank-related fields for debugging
                const bankFields = {
                  bankName: docData.bankName || docData.bank || docData.selectedBankName || '',
                  bankBranchName: docData.bankBranchName || docData.bankBranch || docData.branchName || docData.selectedBankBranchName || '',
                  bankState: docData.bankState || docData.selectedBankState || '',
                  ifscCode: docData.ifscCode || docData.IFSC || docData.ifsc || '',
                  cadNumber: docData.cadNumber || docData.cad || docData.CAD || ''
                };
                
                console.log('Bank fields found in inward data for warehouse:', docData.warehouseName, bankFields);
                
                // Debug AUM/Total Value fields
                const aumFields = {
                  aum: docData.aum,
                  totalValue: docData.totalValue,
                  totalAmount: docData.totalAmount,
                  amount: docData.amount,
                  value: docData.value,
                  assetValue: docData.assetValue,
                  assetsUnderManagement: docData.assetsUnderManagement
                };
                console.log('AUM/Total Value fields found in inward data for warehouse:', docData.warehouseName, aumFields);
                
                // Debug Insurance and Rate fields
                const insuranceAndRateFields = {
                  insuranceManagedBy: docData.insuranceManagedBy,
                  insurance: docData.insurance,
                  insuranceProvider: docData.insuranceProvider,
                  insuranceCompany: docData.insuranceCompany,
                  managedBy: docData.managedBy,
                  insuranceBy: docData.insuranceBy,
                  rate: docData.rate,
                  marketRate: docData.marketRate,
                  currentRate: docData.currentRate,
                  price: docData.price,
                  unitPrice: docData.unitPrice,
                  pricePerUnit: docData.pricePerUnit,
                  ratePerUnit: docData.ratePerUnit
                };
                console.log('Insurance and Rate fields found in inward data for warehouse:', docData.warehouseName, insuranceAndRateFields);
                
                // Debug: Show insurance data immediately after extraction
                console.log('=== IMMEDIATE INSURANCE DATA CHECK ===');
                console.log('Initial insuranceManagedBy from main document:', docData.insuranceManagedBy);
                console.log('Initial insurance from main document:', docData.insurance);
                console.log('Initial managedBy from main document:', docData.managedBy);
                console.log('Initial insuranceBy from main document:', docData.insuranceBy);
                
                // Helper function to format insurance data
                const formatInsuranceData = (insuranceValue: any, docData: any) => {
                  console.log('Formatting insurance value:', insuranceValue);
                  
                  if (!insuranceValue) {
                    console.log('No insurance value to format');
                    return '';
                  }
                  
                  const insuranceValueLower = insuranceValue.toString().toLowerCase().trim();
                  console.log('Insurance value (lowercase):', insuranceValueLower);
                  
                  if (insuranceValueLower === 'client') {
                    const clientName = docData.client || docData.clientName || '';
                    console.log('Client name found:', clientName);
                    if (clientName) {
                      const formatted = `client (${clientName})`;
                      console.log('Formatted as client:', formatted);
                      return formatted;
                    } else {
                      console.log('No client name, returning just client');
                      return 'client';
                    }
                  } else if (insuranceValueLower === 'bank') {
                    const bankName = docData.bankName || docData.bank || docData.selectedBankName || '';
                    const bankBranchName = docData.bankBranchName || docData.bankBranch || docData.branchName || docData.selectedBankBranchName || '';
                    console.log('Bank name found:', bankName);
                    console.log('Bank branch found:', bankBranchName);
                    
                    if (bankName && bankBranchName) {
                      const formatted = `bank (${bankName}-${bankBranchName})`;
                      console.log('Formatted as bank with branch:', formatted);
                      return formatted;
                    } else if (bankName) {
                      const formatted = `bank (${bankName})`;
                      console.log('Formatted as bank without branch:', formatted);
                      return formatted;
                    } else {
                      console.log('No bank details, returning just bank');
                      return 'bank';
                    }
                  } else {
                    console.log('Not client or bank, returning original value:', insuranceValue);
                    return insuranceValue;
                  }
                };
                
                // Extract insurance data directly from the main inward section
                let finalInsuranceManagedBy = '';
                
                // Priority 1: Get insurance data from main inward document
                if (docData.insuranceManagedBy || docData.insurance || docData.managedBy || docData.insuranceBy) {
                  const mainInsuranceValue = docData.insuranceManagedBy || docData.insurance || docData.managedBy || docData.insuranceBy;
                  console.log('=== INSURANCE DATA FROM MAIN INWARD SECTION ===');
                  console.log('Main insurance value found:', mainInsuranceValue);
                  console.log('Insurance field source:', {
                    insuranceManagedBy: docData.insuranceManagedBy,
                    insurance: docData.insurance,
                    managedBy: docData.managedBy,
                    insuranceBy: docData.insuranceBy
                  });
                  
                  // Format the insurance data immediately
                  finalInsuranceManagedBy = formatInsuranceData(mainInsuranceValue, docData);
                  console.log('Insurance formatted from main inward section:', finalInsuranceManagedBy);
                } else {
                  console.log('=== NO INSURANCE DATA IN MAIN INWARD SECTION ===');
                  console.log('Available fields in main inward document:', Object.keys(docData));
                }
                
                // Extract other data
                let finalAum = docData.aum || docData.totalValue || docData.totalAmount || docData.amount || docData.value || docData.assetValue || docData.assetsUnderManagement || '';
                let finalSrLastValidityDate = docData.srLastValidityDate || '';
                let finalSrWrNumber = srNumber || wrNumber || '';
                let finalSrWrDate = docData.srWrDate || docData.approvalDate || '';
                let finalRate = docData.rate || '';
                
                // Always try to fetch from inward details using the actual document ID
                if (doc.id) {
                  try {
                    console.log(`Fetching AUM, SR Last Validity Date, SR/WR Number, SR/WR Date, Insurance Managed by, and Rate from inward details for inward ID: ${doc.id}`);
                    console.log('Current document data structure:', docData);
                    console.log('Document ID from Firestore:', doc.id);
                    
                    // Try multiple possible collection names for inward details
                    const possibleInwardDetailCollections = ['inwardDetails', 'inwardDetail', 'inward-details', 'inward', 'inwardData', 'inwardEntries'];
                    let detailsData = null;
                    
                    for (const collectionName of possibleInwardDetailCollections) {
                      try {
                        console.log(`Trying to fetch from collection: ${collectionName}`);
                        
                        // Strategy 1: Query by inwardId
                        let inwardDetailsQuery = query(
                          collection(db, collectionName),
                          where('inwardId', '==', doc.id)
                        );
                        
                        let inwardDetailsSnapshot = await getDocs(inwardDetailsQuery);
                        
                        if (!inwardDetailsSnapshot.empty) {
                          detailsData = inwardDetailsSnapshot.docs[0].data();
                          console.log(`Found data in ${collectionName} collection:`, detailsData);
                          console.log(`Available fields in ${collectionName}:`, Object.keys(detailsData));
                          break;
                        }
                        
                        // Strategy 2: Query by document ID as a field
                        inwardDetailsQuery = query(
                          collection(db, collectionName),
                          where('id', '==', doc.id)
                        );
                        
                        inwardDetailsSnapshot = await getDocs(inwardDetailsQuery);
                        
                        if (!inwardDetailsSnapshot.empty) {
                          detailsData = inwardDetailsSnapshot.docs[0].data();
                          console.log(`Found data in ${collectionName} collection by ID field:`, detailsData);
                          console.log(`Available fields in ${collectionName}:`, Object.keys(detailsData));
                          break;
                        }
                        
                        // Strategy 3: Query by warehouseName and client to find related data
                        if (docData.warehouseName && docData.client) {
                          inwardDetailsQuery = query(
                            collection(db, collectionName),
                            where('warehouseName', '==', docData.warehouseName),
                            where('client', '==', docData.client)
                          );
                          
                          inwardDetailsSnapshot = await getDocs(inwardDetailsQuery);
                          
                          if (!inwardDetailsSnapshot.empty) {
                            detailsData = inwardDetailsSnapshot.docs[0].data();
                            console.log(`Found data in ${collectionName} collection by warehouse and client:`, detailsData);
                            console.log(`Available fields in ${collectionName}:`, Object.keys(detailsData));
                            break;
                          }
                        }
                        
                      } catch (error) {
                        console.log(`Error fetching from ${collectionName}:`, error instanceof Error ? error.message : String(error));
                        continue;
                      }
                    }
                    
                    if (detailsData) {
                      // Look for AUM in details if not already found
                      if (!finalAum) {
                        finalAum = detailsData.aum || 
                                   detailsData.totalValue || 
                                   detailsData.totalAmount || 
                                   detailsData.amount || 
                                   detailsData.value || 
                                   detailsData.assetValue || 
                                   detailsData.assetsUnderManagement || 
                                   finalAum;
                        console.log('AUM extracted from inward details:', finalAum);
                      }
                      
                      // Look for SR Last Validity Date in details
                      finalSrLastValidityDate = detailsData.srLastValidityDate || 
                                               detailsData.lastValidityDate || 
                                               detailsData.validityDate || 
                                               detailsData.srValidityDate || 
                                               detailsData.validityEndDate || 
                                               detailsData.expiryDate || 
                                               detailsData.validUntil || 
                                               finalSrLastValidityDate;
                      
                      console.log('SR Last Validity Date extracted from inward details:', finalSrLastValidityDate);
                      
                      // Look for SR/WR Number in details
                      finalSrWrNumber = detailsData.srWrNumber || 
                                        detailsData.srNumber || 
                                        detailsData.wrNumber || 
                                        detailsData.srWrNo || 
                                        detailsData.srNo || 
                                        detailsData.wrNo || 
                                        detailsData.srWr || 
                                        detailsData.sr || 
                                        detailsData.wr || 
                                        finalSrWrNumber;
                      
                      console.log('SR/WR Number extracted from inward details:', finalSrWrNumber);
                      
                      // Look for SR/WR Date in details
                      finalSrWrDate = detailsData.srWrDate || 
                                      detailsData.srDate || 
                                      detailsData.wrDate || 
                                      detailsData.approvalDate || 
                                      detailsData.approvedDate || 
                                      detailsData.dateOfApproval || 
                                      detailsData.srWrApprovalDate || 
                                      finalSrWrDate;
                      
                      console.log('SR/WR Date extracted from inward details:', finalSrWrDate);
                      
                      // Look for Insurance Managed by in details (only if not already found in main section)
                      if (!finalInsuranceManagedBy) {
                        let extractedInsurance = detailsData.insuranceManagedBy || 
                                                detailsData.insurance || 
                                                detailsData.insuranceProvider || 
                                                detailsData.insuranceCompany || 
                                                detailsData.managedBy || 
                                                detailsData.insuranceBy || 
                                                detailsData.insuranceManager || 
                                                detailsData.insuranceManagement || 
                                                detailsData.insuranceHandledBy || 
                                                detailsData.insuranceResponsible || 
                                                detailsData.insuranceContact || 
                                                detailsData.insuranceAgent || '';
                        
                        if (extractedInsurance) {
                          console.log('=== INSURANCE DATA FROM INWARD DETAILS (FALLBACK) ===');
                          console.log('Insurance value from details:', extractedInsurance);
                          
                          // Use the helper function to format insurance data
                          finalInsuranceManagedBy = formatInsuranceData(extractedInsurance, docData);
                          console.log('Insurance formatted from inward details:', finalInsuranceManagedBy);
                        }
                      } else {
                        console.log('=== INSURANCE ALREADY FOUND IN MAIN INWARD SECTION ===');
                        console.log('Using main section insurance data:', finalInsuranceManagedBy);
                      }
                      
                      console.log('Insurance Managed by extracted from inward details:', finalInsuranceManagedBy);
                      console.log('Insurance formatting details:', {
                        formattedValue: finalInsuranceManagedBy,
                        clientName: docData.client || docData.clientName || '',
                        bankName: docData.bankName || docData.bank || docData.selectedBankName || '',
                        bankBranchName: docData.bankBranchName || docData.bankBranch || docData.branchName || docData.selectedBankBranchName || ''
                      });
                      console.log('Raw insurance data from details:', {
                        insuranceManagedBy: detailsData.insuranceManagedBy,
                        insurance: detailsData.insurance,
                        insuranceProvider: detailsData.insuranceProvider,
                        insuranceCompany: detailsData.insuranceCompany,
                        managedBy: detailsData.managedBy,
                        insuranceBy: detailsData.insuranceBy,
                        insuranceManager: detailsData.insuranceManager,
                        insuranceManagement: detailsData.insuranceManagement,
                        insuranceHandledBy: detailsData.insuranceHandledBy,
                        insuranceResponsible: detailsData.insuranceResponsible,
                        insuranceContact: detailsData.insuranceContact,
                        insuranceAgent: detailsData.insuranceAgent
                      });
                      
                      // Look for Rate (Market Rate) in details
                      finalRate = detailsData.rate || 
                                  detailsData.marketRate || 
                                  detailsData.currentRate || 
                                  detailsData.price || 
                                  detailsData.unitPrice || 
                                  detailsData.pricePerUnit || 
                                  detailsData.ratePerUnit || 
                                  finalRate;
                      
                      console.log('Rate (Market Rate) extracted from inward details:', finalRate);
                    } else {
                      console.log('No inward details found in any collection for inward ID:', doc.id);
                      
                      // Fallback: Try to find data in the main inward document itself
                      console.log('Trying fallback: Looking for data in main inward document');
                      
                      // Check if the main document has SR/WR data
                      if (docData.srWrNumber || docData.srNumber || docData.wrNumber) {
                        finalSrWrNumber = docData.srWrNumber || docData.srNumber || docData.wrNumber || finalSrWrNumber;
                        console.log('SR/WR Number found in main document:', finalSrWrNumber);
                      }
                      
                      if (docData.srWrDate || docData.srDate || docData.wrDate || docData.approvalDate) {
                        finalSrWrDate = docData.srWrDate || docData.srDate || docData.wrDate || docData.approvalDate || finalSrWrDate;
                        console.log('SR/WR Date found in main document:', finalSrWrDate);
                      }
                      
                      // Check if the main document has Insurance and Rate data
                      if (docData.insuranceManagedBy || docData.insurance || docData.insuranceProvider || docData.insuranceCompany || docData.managedBy || docData.insuranceBy || docData.insuranceManager || docData.insuranceManagement || docData.insuranceHandledBy || docData.insuranceResponsible || docData.insuranceContact || docData.insuranceAgent) {
                        let extractedInsurance = docData.insuranceManagedBy || 
                                                 docData.insurance || 
                                                 docData.insuranceProvider || 
                                                 docData.insuranceCompany || 
                                                 docData.managedBy || 
                                                 docData.insuranceBy || 
                                                 docData.insuranceManager || 
                                                 docData.insuranceManagement || 
                                                 docData.insuranceHandledBy || 
                                                 docData.insuranceResponsible || 
                                                 docData.insuranceContact || 
                                                 docData.insuranceAgent || 
                                                 finalInsuranceManagedBy;
                        
                        // Use the helper function to format insurance data
                        finalInsuranceManagedBy = formatInsuranceData(extractedInsurance, docData);
                        
                        console.log('Insurance Managed by found in main document:', finalInsuranceManagedBy);
                        console.log('Insurance formatting details from main document:', {
                          originalValue: extractedInsurance,
                          formattedValue: finalInsuranceManagedBy,
                          clientName: docData.client || docData.clientName || '',
                          bankName: docData.bankName || docData.bank || docData.selectedBankName || '',
                          bankBranchName: docData.bankBranchName || docData.bankBranch || docData.branchName || docData.selectedBankBranchName || ''
                        });
                        console.log('Raw insurance data from main document:', {
                          insuranceManagedBy: docData.insuranceManagedBy,
                          insurance: docData.insurance,
                          insuranceProvider: docData.insuranceProvider,
                          insuranceCompany: docData.insuranceCompany,
                          managedBy: docData.managedBy,
                          insuranceBy: docData.insuranceBy,
                          insuranceManager: docData.insuranceManager,
                          insuranceManagement: docData.insuranceManagement,
                          insuranceHandledBy: docData.insuranceHandledBy,
                          insuranceResponsible: docData.insuranceResponsible,
                          insuranceContact: docData.insuranceContact,
                          insuranceAgent: docData.insuranceAgent
                        });
                      }
                      
                      if (docData.rate || docData.marketRate || docData.currentRate) {
                        finalRate = docData.rate || docData.marketRate || docData.currentRate || finalRate;
                        console.log('Rate (Market Rate) found in main document:', finalRate);
                      }
                    }
                  } catch (error) {
                    console.log('Error fetching from inward details collections:', error instanceof Error ? error.message : String(error));
                  }
                }
                
                console.log('Final AUM value to be displayed:', finalAum);
                console.log('Final SR Last Validity Date to be displayed:', finalSrLastValidityDate);
                console.log('Final SR/WR Number to be displayed:', finalSrWrNumber);
                console.log('Final SR/WR Date to be displayed:', finalSrWrDate);
                // Final formatting check for insurance data using helper function
                if (finalInsuranceManagedBy) {
                  const finalFormattedInsurance = formatInsuranceData(finalInsuranceManagedBy, docData);
                  if (finalFormattedInsurance !== finalInsuranceManagedBy) {
                    console.log('Final formatting applied: Insurance Managed by updated from', finalInsuranceManagedBy, 'to', finalFormattedInsurance);
                    finalInsuranceManagedBy = finalFormattedInsurance;
                  }
                }
                
                console.log('Final Insurance Managed by to be displayed:', finalInsuranceManagedBy);
                console.log('Final Rate (Market Rate) to be displayed:', finalRate);
                
                // Final debug: Check if we're missing any insurance data
                if (!finalInsuranceManagedBy) {
                  console.log('WARNING: No insurance data found! Checking all possible sources...');
                  console.log('Main document insurance fields:', {
                    insuranceManagedBy: docData.insuranceManagedBy,
                    insurance: docData.insurance,
                    insuranceProvider: docData.insuranceProvider,
                    insuranceCompany: docData.insuranceCompany,
                    managedBy: docData.managedBy,
                    insuranceBy: docData.insuranceBy
                  });
                  console.log('All available fields in main document:', Object.keys(docData));
                }
                
                // Final debug: Show the complete processed data structure
                const finalData = {
                  id: doc.id,
                  state: docData.state || '',
                  branch: docData.branch || '',
                  location: docData.location || '',
                  typeOfBusiness: businessType || docData.businessType || docData.typeOfBusiness || '',
                  warehouseType: warehouseType,
                  warehouseCode: warehouseCode || docData.warehouseCode || '',
                  warehouseName: docData.warehouseName || '',
                  warehouseAddress: warehouseAddress || docData.warehouseAddress || '',
                  clientCode: docData.clientCode || '',
                  clientName: docData.client || docData.clientName || '',
                  commodity: docData.commodity || '',
                  variety: docData.varietyName || docData.variety || '',
                  bankName: bankFields.bankName,
                  bankBranchName: bankFields.bankBranchName,
                  bankState: bankFields.bankState,
                  ifscCode: bankFields.ifscCode,
                  cadNumber: bankFields.cadNumber,
                  inwardDate: docData.createdAt || docData.dateOfInward || docData.inwardDate || '',
                  srWrNumber: finalSrWrNumber,
                  srWrDate: finalSrWrDate,
                  fundingSrWrDate: docData.fundingSrWrDate || '',
                  srLastValidityDate: finalSrLastValidityDate,
                  totalBags: docData.totalBags || '',
                  totalQty: docData.totalQuantity || docData.totalQty || '',
                  roBags: roBags || docData.roBags || '',
                  roQty: roQty || docData.roQty || '',
                  doBags: doBags || docData.doBags || '',
                  doQty: doQty || docData.doQty || '',
                  balanceBags: docData.balanceBags || '',
                  balanceQty: docData.balanceQty || '',
                  insuranceManagedBy: finalInsuranceManagedBy,
                  rate: finalRate,
                  aum: finalAum,
                  databaseLocation: docData.databaseLocation || docData.location || ''
                };
                
                console.log('=== FINAL PROCESSED DATA STRUCTURE ===');
                console.log('Complete processed data:', finalData);
                console.log('Data source collection:', collectionName);
                console.log('Data source document ID:', doc.id);
                
                return finalData;
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
    return Array.from(new Set(inwardData.map(item => item.clientName).filter(Boolean)));
  }, [inwardData]);

  const uniqueStates = useMemo(() => {
    return Array.from(new Set(inwardData.map(item => item.state).filter(Boolean)));
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

    // Apply state filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(item => item.state === statusFilter);
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
  }, [inwardData, searchTerm, statusFilter, warehouseFilter, clientFilter]);

  // Export filtered data to CSV
  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    
    const headers = [
      'State', 'Branch', 'Location', 'Type of Business', 'Warehouse Type', 'Warehouse Code',
      'Warehouse Name', 'Warehouse Address', 'Client Code', 'Client Name', 'Commodity', 'Variety',
      'Bank Name', 'Bank Branch Name', 'Bank State', 'IFSC Code', 'CAD Number', 'Inward Date',
      'SR/WR Number', 'SR/WR Date', 'Funding SR/WR Date', 'SR Last Validity Date', 'Total Bags',
      'Total Qty(MT)', 'RO Bags', 'RO Qty (MT)', 'DO Bags', 'DO Qty (MT)', 'Balance Bags',
      'Balance Qty (MT)', 'Insurance Managed by', 'Rate', 'AUM(I)'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredData.map((row) => [
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
        row.variety || '',
        row.bankName || '',
        row.bankBranchName || '',
        row.bankState || '',
        row.ifscCode || '',
        row.cadNumber || '',
        row.inwardDate || '',
        row.srWrNumber || '',
        row.srWrDate || '',
        row.fundingSrWrDate || '',
        row.srLastValidityDate || '',
        row.totalBags || '',
        row.totalQty || '',
        row.roBags || '',
        row.roQty || '',
        row.doBags || '',
        row.doQty || '',
        row.balanceBags || '',
        row.balanceQty || '',
        row.insuranceManagedBy || '',
        row.rate || '',
        row.aum || ''
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
              Inward Reports
            </h1>
            <p className="text-muted-foreground">Generate and view inward transaction reports</p>
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
                    <Label htmlFor="statusFilter">State</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                        State: {statusFilter}
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
                <thead className="bg-orange-100">
                  <tr>
                    {visibleColumnsData.map(column => (
                      <th key={column.key} className={`border border-orange-300 px-4 py-2 text-left ${column.width} text-orange-800 font-semibold`}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {visibleColumns.includes('state') && (
                        <td className="border border-gray-200 px-4 py-4">
                          {item.state || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('branch') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.branch || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('location') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.location || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('typeOfBusiness') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.typeOfBusiness || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('warehouseType') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.warehouseType || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('warehouseCode') && (
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                          {item.warehouseCode || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('warehouseName') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.warehouseName || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('warehouseAddress') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.warehouseAddress || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('clientCode') && (
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                          {item.clientCode || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('clientName') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.clientName || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('commodity') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.commodity || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('variety') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.variety || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('bankName') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.bankName || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('bankBranchName') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.bankBranchName || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('bankState') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.bankState || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('ifscCode') && (
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                          {item.ifscCode || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('cadNumber') && (
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                          {item.cadNumber || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('inwardDate') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {formatDate(item.inwardDate)}
                        </td>
                      )}
                      {visibleColumns.includes('srWrNumber') && (
                        <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                          {item.srWrNumber || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('srWrDate') && (
                        <td className="border border-gray-200 px-4 py-2">
                          <div>
                            <div>{item.srWrDate ? formatDate(item.srWrDate) : '-'}</div>
                            {/* <div className="text-xs text-gray-500">approval date</div> */}
                          </div>
                        </td>
                      )}
                                                                {visibleColumns.includes('fundingSrWrDate') && (
                        <td className="border border-gray-200 px-4 py-2">
                          <div>
                            <div>{item.fundingSrWrDate ? formatDate(item.fundingSrWrDate) : '-'}</div>
                            {/* <div className="text-xs text-gray-500">mail sent to bank when bank details are present on inward entry</div> */}
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes('srLastValidityDate') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.srLastValidityDate ? formatDate(item.srLastValidityDate) : '-'}
                        </td>
                      )}
                      {visibleColumns.includes('totalBags') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.totalBags || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('totalQty') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.totalQty || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('roBags') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.roBags || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('roQty') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.roQty || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('doBags') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.doBags || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('doQty') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.doQty || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('balanceBags') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.balanceBags || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('balanceQty') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.balanceQty || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('insuranceManagedBy') && (
                        <td className="border border-gray-200 px-4 py-2">
                          {item.insuranceManagedBy || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('rate') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.rate || '-'}
                        </td>
                      )}
                      {visibleColumns.includes('aum') && (
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {item.aum || '-'}
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
