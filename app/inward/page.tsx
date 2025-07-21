"use client";

import DashboardLayout from '@/components/dashboard-layout';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Download, Plus, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/data-table';
import { uploadToCloudinary } from '@/lib/cloudinary';
import React from 'react';
import StorageReceipt from '@/components/StorageReceipt';
import TestCertificate from '@/components/TestCertificate';
import PrintableWarehouseReceipt from '@/components/PrintableWarehouseReceipt';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

// Move normalizeDate to top-level scope (before export default function InwardPage)
function normalizeDate(val: any) {
  if (!val) return '';
  let date: Date | null = null;

  // Firestore Timestamp object
  if (val.seconds) date = new Date(val.seconds * 1000);
  // Milliseconds number
  else if (typeof val === 'number' && val > 1000000000000) date = new Date(val);
  // String that looks like a number with .000000000 (e.g. '063888114600.000000000')
  else if (typeof val === 'string' && /^\d{10,}(\.\d+)?$/.test(val.replace(/^0+/, ''))) {
    const num = val.replace(/^0+/, '').split('.')[0];
    const ts = num.length > 10 ? parseInt(num) : parseInt(num) * 1000;
    if (!isNaN(ts)) date = new Date(ts);
  }
  // String that looks like a number
  else if (!isNaN(val) && val.length > 10) date = new Date(Number(val));
  // ISO string or yyyy-mm-dd or Firestore string
  else if (typeof val === 'string' && val.length >= 10) {
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) date = new Date(parsed);
    else {
      const match = val.match(/([A-Za-z]+ \d{1,2}, \d{4})/);
      if (match) {
        const d = new Date(match[1]);
        if (!isNaN(d.getTime())) date = d;
      }
    }
  }

  if (date && !isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return '';
}

// Add this helper at the top-level scope:
function parseDDMMYYYY(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('-').map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

// 1. Add helper functions at the top-level scope:
function isDateExpired(dateStr: string): boolean {
  if (!dateStr) return false;
  let d: Date | null = null;
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    d = parseDDMMYYYY(dateStr);
  } else {
    d = new Date(dateStr);
  }
  if (!d || isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  // Debug log
  console.log('EXPIRED CHECK:', { dateStr, parsed: d, parsedISO: d.toISOString(), today, expired: d < today });
  return d < today;
}
function isDateWithinDays(dateStr: string, days: number): boolean {
  if (!dateStr) return false;
  let d: Date | null = null;
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    d = parseDDMMYYYY(dateStr);
  } else {
    d = new Date(dateStr);
  }
  if (!d || isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

// Add this above the InwardPage component:
function AlertCell({ row }: { row: any }) {
  const [insuranceEndDates, setInsuranceEndDates] = React.useState<{fire: string, burglary: string}>({fire: '', burglary: ''});
  // Always prefer selectedInsurance fields if present
  const insuranceTakenBy = (row.original.selectedInsurance && row.original.selectedInsurance.insuranceTakenBy) || row.original.insuranceManagedBy || row.original.insuranceTakenBy;
  const insuranceId = (row.original.selectedInsurance && row.original.selectedInsurance.insuranceId) || row.original.insuranceId;
  React.useEffect(() => {
    async function fetchInsuranceEndDates() {
      const warehouseName = row.original.warehouseName;
      if (!warehouseName || !insuranceTakenBy || !insuranceId) {
        setInsuranceEndDates({
          fire: row.original.firePolicyEnd || '',
          burglary: row.original.burglaryPolicyEnd || ''
        });
        return;
      }
      try {
        const inspectionsCollection = collection(db, 'inspections');
        const q = query(inspectionsCollection, where('warehouseName', '==', warehouseName));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const inspectionData = querySnapshot.docs[0].data();
          let insuranceEntries = inspectionData.insuranceEntries || [];
          if (!Array.isArray(insuranceEntries) && inspectionData.warehouseInspectionData?.insuranceEntries) {
            insuranceEntries = inspectionData.warehouseInspectionData.insuranceEntries;
          }
          // Debug: log all insurance entries for this warehouse
          console.log('INSURANCE ENTRIES for', warehouseName, insuranceEntries);
          const match = insuranceEntries.find((ins: any) => ins.insuranceTakenBy === insuranceTakenBy && ins.insuranceId === insuranceId);
          if (match) {
            setInsuranceEndDates({
              fire: match.firePolicyEndDate || '',
              burglary: match.burglaryPolicyEndDate || ''
            });
            return;
          }
        }
      } catch (e) { /* ignore */ }
      setInsuranceEndDates({
        fire: row.original.firePolicyEnd || '',
        burglary: row.original.burglaryPolicyEnd || ''
      });
    }
    fetchInsuranceEndDates();
  }, [row.original, insuranceTakenBy, insuranceId]);
  const fireEnd = normalizeDate(insuranceEndDates.fire);
  const burglaryEnd = normalizeDate(insuranceEndDates.burglary);
  const isExpired = isDateExpired(fireEnd) || isDateExpired(burglaryEnd);
  const isWithin10 = !isExpired && (isDateWithinDays(fireEnd, 10) || isDateWithinDays(burglaryEnd, 10));
  // Debug log
  console.log('ALERT CHECK:', {
    warehouse: row.original.warehouseName,
    insuranceTakenBy,
    insuranceId,
    fireEnd,
    burglaryEnd,
    isExpired,
    isWithin10
  });
  if (isWithin10) {
    // Blinking red SVG star icon
    return (
      <svg className="blinking-red" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="16" cy="28" rx="10" ry="4" fill="#B0BEC5"/>
        <polygon points="16,4 18.5,13 28,13 20,18 22.5,27 16,21.5 9.5,27 12,18 4,13 13.5,13" fill="#FF5252" stroke="#FF8A65" strokeWidth="1.5"/>
        <polygon points="16,7 17.5,13 23,13 18,16 19.5,22 16,18.5 12.5,22 14,16 9,13 14.5,13" fill="#FFE0B2"/>
      </svg>
    );
  }
  if (isExpired) {
    // Blinking orange SVG star icon
    return (
      <svg className="blinking-orange" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="16" cy="28" rx="10" ry="4" fill="#B0BEC5"/>
        <polygon points="16,4 18.5,13 28,13 20,18 22.5,27 16,21.5 9.5,27 12,18 4,13 13.5,13" fill="#FF9800" stroke="#FFB300" strokeWidth="1.5"/>
        <polygon points="16,7 17.5,13 23,13 18,16 19.5,22 16,18.5 12.5,22 14,16 9,13 14.5,13" fill="#FFE0B2"/>
      </svg>
    );
  }
  return null;
}

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
  const [insuranceEntries, setInsuranceEntries] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [showSRForm, setShowSRForm] = useState(false);
  const [selectedRowForSR, setSelectedRowForSR] = useState<any>(null);
  const [inspectionInsuranceData, setInspectionInsuranceData] = useState<any[]>([]);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [dataVersion, setDataVersion] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileAttachment, setFileAttachment] = useState<File | null>(null);
  const [selectedInsuranceIndex, setSelectedInsuranceIndex] = useState<number | null>(null);
  const [remainingFirePolicy, setRemainingFirePolicy] = useState('');
  const [remainingBurglaryPolicy, setRemainingBurglaryPolicy] = useState('');
  const [hologramNumber, setHologramNumber] = useState('');
  const [isFormApproved, setIsFormApproved] = useState(false);
  const [srGenerationDate, setSrGenerationDate] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  const testCertRef = useRef<HTMLDivElement>(null);
  const printableReceiptRef = useRef<HTMLDivElement>(null);
  // Add state for initial remaining values from Firestore
  const [initialRemainingFire, setInitialRemainingFire] = useState('');
  const [initialRemainingBurglary, setInitialRemainingBurglary] = useState('');
  // Add state for selected insurance type
  const [selectedInsuranceType, setSelectedInsuranceType] = useState<string>('all');

  // Add state for insurance information section
  const [selectedInsuranceInfoType, setSelectedInsuranceInfoType] = useState<string>('');
  const [selectedInsuranceInfoIndex, setSelectedInsuranceInfoIndex] = useState<number | null>(null);
  const [insuranceReadOnly, setInsuranceReadOnly] = useState(false);

  // In the InwardPage component, add state for 'your insurance' data
  const [yourInsurance, setYourInsurance] = useState<any>(null);

  // Filter insurance entries based on selected type
  const filteredInsuranceEntries = useMemo(() => {
    if (!selectedInsuranceType || selectedInsuranceType === 'all') {
      return insuranceEntries;
    }
    return insuranceEntries.filter(ins => ins.insuranceTakenBy === selectedInsuranceType);
  }, [insuranceEntries, selectedInsuranceType]);

  // Filter insurance entries for information section based on selected type
  const filteredInsuranceInfoEntries = useMemo(() => {
    if (!selectedInsuranceInfoType) {
      return [];
    }
    return insuranceEntries.filter(ins => ins.insuranceTakenBy === selectedInsuranceInfoType);
  }, [insuranceEntries, selectedInsuranceInfoType]);

  // Function to get receipt type from inspection collection
  const getReceiptTypeFromInspection = async (warehouseName: string): Promise<string> => {
    try {
      console.log('Fetching receipt type for warehouse:', warehouseName);
      
      if (!warehouseName || warehouseName.trim() === '') {
        console.log('No warehouse name provided, returning N/A');
        return 'N/A';
      }

      const inspectionsCollection = collection(db, 'inspections');
      
      // First try exact match
      let q = query(inspectionsCollection, where('warehouseName', '==', warehouseName));
      let querySnapshot = await getDocs(q);
      
      console.log('Exact match query result for warehouse', warehouseName, ':', querySnapshot.size, 'documents found');
      
      // If no exact match, try case-insensitive search by fetching all and filtering
      if (querySnapshot.empty) {
        console.log('No exact match found, trying case-insensitive search...');
        const allInspections = await getDocs(inspectionsCollection);
        console.log('Total inspections in collection:', allInspections.docs.length);
        
        // Log all available warehouse names for debugging
        const allWarehouseNames = allInspections.docs.map(doc => doc.data().warehouseName).filter(Boolean);
        console.log('Available warehouse names in inspections:', allWarehouseNames);
        
        const matchingInspection = allInspections.docs.find(doc => {
          const data = doc.data();
          return data.warehouseName && 
                 data.warehouseName.toLowerCase().trim() === warehouseName.toLowerCase().trim();
        });
        
        if (matchingInspection) {
          const inspectionData = matchingInspection.data();
          console.log('Case-insensitive match found for warehouse', warehouseName, ':', inspectionData);
          console.log('Receipt type found:', inspectionData.receiptType);
          return inspectionData.receiptType || 'N/A';
        }
      } else {
        const inspectionData = querySnapshot.docs[0].data();
        console.log('Exact match found for warehouse', warehouseName, ':', inspectionData);
        console.log('Receipt type found:', inspectionData.receiptType);
        return inspectionData.receiptType || 'N/A';
      }
      
      console.log('No inspection found for warehouse:', warehouseName);
      return 'N/A';
    } catch (error) {
      console.error('Error fetching receipt type for warehouse', warehouseName, ':', error);
      return 'N/A';
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch inward data for the table
      const inwardCollection = collection(db, 'inward');
      const inwardSnap = await getDocs(inwardCollection);
      console.log('Total inward entries found:', inwardSnap.docs.length);
      
      const inwardDataWithReceiptType = await Promise.all(
        inwardSnap.docs.map(async (doc) => {
          const data = doc.data();
          console.log('Processing inward entry:', data.inwardId, 'for warehouse:', data.warehouseName);
          
          // Fetch receipt type from inspection collection
          const receiptType = await getReceiptTypeFromInspection(data.warehouseName);
          console.log('Receipt type for inward', data.inwardId, ':', receiptType);
          
          // Fetch insurance data for this inward entry from inspection collection based on selectedInsurance
          let insuranceData = {
            firePolicyAmount: '-',
            burglaryPolicyAmount: '-',
            firePolicyStartDate: '-',
            firePolicyEndDate: '-',
            burglaryPolicyStartDate: '-',
            burglaryPolicyEndDate: '-',
            firePolicyName: '-',
            burglaryPolicyName: '-',
            bankFundedBy: '-'
          };

          // Check if this inward entry has selectedInsurance data
          if (data.selectedInsurance && data.selectedInsurance.insuranceId && data.selectedInsurance.insuranceTakenBy) {
            console.log('Processing selectedInsurance for inward:', data.inwardId, data.selectedInsurance);
            
            try {
              // First try to find insurance data in inspection collection
              if (data.warehouseName) {
                const inspectionsCollection = collection(db, 'inspections');
                const q = query(inspectionsCollection, where('warehouseName', '==', data.warehouseName));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                  const inspectionData = querySnapshot.docs[0].data();
                  let insuranceEntries: any[] = [];
                  
                  // Check multiple possible locations for insurance data
                  if (inspectionData.insuranceEntries && Array.isArray(inspectionData.insuranceEntries)) {
                    insuranceEntries = inspectionData.insuranceEntries;
                  } else if (inspectionData.warehouseInspectionData?.insuranceEntries && Array.isArray(inspectionData.warehouseInspectionData.insuranceEntries)) {
                    insuranceEntries = inspectionData.warehouseInspectionData.insuranceEntries;
                  } else if (inspectionData.warehouseInspectionData) {
                    // Legacy format - convert to new format
                    const legacyData = inspectionData.warehouseInspectionData;
                    if (legacyData.firePolicyNumber || legacyData.burglaryPolicyNumber) {
                      insuranceEntries = [{
                        id: `legacy_${Date.now()}`,
                        insuranceTakenBy: legacyData.insuranceTakenBy || '',
                        insuranceCommodity: legacyData.insuranceCommodity || '',
                        clientName: legacyData.clientName || '',
                        clientAddress: legacyData.clientAddress || '',
                        selectedBankName: legacyData.selectedBankName || '',
                        firePolicyCompanyName: legacyData.firePolicyCompanyName || '',
                        firePolicyNumber: legacyData.firePolicyNumber || '',
                        firePolicyAmount: legacyData.firePolicyAmount || '',
                        firePolicyStartDate: legacyData.firePolicyStartDate || null,
                        firePolicyEndDate: legacyData.firePolicyEndDate || null,
                        burglaryPolicyCompanyName: legacyData.burglaryPolicyCompanyName || '',
                        burglaryPolicyNumber: legacyData.burglaryPolicyNumber || '',
                        burglaryPolicyAmount: legacyData.burglaryPolicyAmount || '',
                        burglaryPolicyStartDate: legacyData.burglaryPolicyStartDate || null,
                        burglaryPolicyEndDate: legacyData.burglaryPolicyEndDate || null,
                        createdAt: new Date(legacyData.createdAt || Date.now())
                      }];
                    }
                  }

                  // Find matching insurance entry based on selectedInsurance
                  const matchingInsurance = insuranceEntries.find((ins: any) => 
                    ins.insuranceId === data.selectedInsurance.insuranceId &&
                    ins.insuranceTakenBy === data.selectedInsurance.insuranceTakenBy
                  );

                  if (matchingInsurance) {
                    console.log('Found matching insurance for inward:', data.inwardId, matchingInsurance);
                    console.log('Extracting insurance data from inspection collection for inward:', data.inwardId);
                    console.log('Raw date values from matchingInsurance:', {
                      firePolicyStartDate: matchingInsurance.firePolicyStartDate,
                      firePolicyEndDate: matchingInsurance.firePolicyEndDate,
                      burglaryPolicyStartDate: matchingInsurance.burglaryPolicyStartDate,
                      burglaryPolicyEndDate: matchingInsurance.burglaryPolicyEndDate,
                      firePolicyStartDateType: typeof matchingInsurance.firePolicyStartDate,
                      firePolicyEndDateType: typeof matchingInsurance.firePolicyEndDate,
                      burglaryPolicyStartDateType: typeof matchingInsurance.burglaryPolicyStartDate,
                      burglaryPolicyEndDateType: typeof matchingInsurance.burglaryPolicyEndDate
                    });
                    
                    // Extract all required insurance fields from inspection collection
                    insuranceData = {
                      firePolicyAmount: matchingInsurance.firePolicyAmount || '-',           // From inspection collection
                      burglaryPolicyAmount: matchingInsurance.burglaryPolicyAmount || '-',   // From inspection collection
                      firePolicyStartDate: (() => {
                        const date = matchingInsurance.firePolicyStartDate;
                        console.log('Processing firePolicyStartDate:', date, 'type:', typeof date);
                        if (date) {
                          if (typeof date === 'string' || typeof date === 'number') {
                            const formatted = new Date(date).toLocaleDateString();
                            console.log('Formatted firePolicyStartDate:', formatted);
                            return formatted;
                          } else if (date instanceof Date) {
                            const formatted = date.toLocaleDateString();
                            console.log('Formatted firePolicyStartDate (Date object):', formatted);
                            return formatted;
                          } else if (date && typeof date === 'object' && date.toDate) {
                            // Handle Firestore Timestamp
                            const formatted = date.toDate().toLocaleDateString();
                            console.log('Formatted firePolicyStartDate (Firestore Timestamp):', formatted);
                            return formatted;
                          }
                        }
                        console.log('FirePolicyStartDate returning "-"');
                        return '-';
                      })(),  // From inspection collection
                      firePolicyEndDate: (() => {
                        const date = matchingInsurance.firePolicyEndDate;
                        console.log('Processing firePolicyEndDate:', date, 'type:', typeof date);
                        if (date) {
                          if (typeof date === 'string' || typeof date === 'number') {
                            const formatted = new Date(date).toLocaleDateString();
                            console.log('Formatted firePolicyEndDate:', formatted);
                            return formatted;
                          } else if (date instanceof Date) {
                            const formatted = date.toLocaleDateString();
                            console.log('Formatted firePolicyEndDate (Date object):', formatted);
                            return formatted;
                          } else if (date && typeof date === 'object' && date.toDate) {
                            // Handle Firestore Timestamp
                            const formatted = date.toDate().toLocaleDateString();
                            console.log('Formatted firePolicyEndDate (Firestore Timestamp):', formatted);
                            return formatted;
                          }
                        }
                        console.log('FirePolicyEndDate returning "-"');
                        return '-';
                      })(),    // From inspection collection
                      burglaryPolicyStartDate: (() => {
                        const date = matchingInsurance.burglaryPolicyStartDate;
                        console.log('Processing burglaryPolicyStartDate:', date, 'type:', typeof date);
                        if (date) {
                          if (typeof date === 'string' || typeof date === 'number') {
                            const formatted = new Date(date).toLocaleDateString();
                            console.log('Formatted burglaryPolicyStartDate:', formatted);
                            return formatted;
                          } else if (date instanceof Date) {
                            const formatted = date.toLocaleDateString();
                            console.log('Formatted burglaryPolicyStartDate (Date object):', formatted);
                            return formatted;
                          } else if (date && typeof date === 'object' && date.toDate) {
                            // Handle Firestore Timestamp
                            const formatted = date.toDate().toLocaleDateString();
                            console.log('Formatted burglaryPolicyStartDate (Firestore Timestamp):', formatted);
                            return formatted;
                          }
                        }
                        console.log('BurglaryPolicyStartDate returning "-"');
                        return '-';
                      })(),  // From inspection collection
                      burglaryPolicyEndDate: (() => {
                        const date = matchingInsurance.burglaryPolicyEndDate;
                        console.log('Processing burglaryPolicyEndDate:', date, 'type:', typeof date);
                        if (date) {
                          if (typeof date === 'string' || typeof date === 'number') {
                            const formatted = new Date(date).toLocaleDateString();
                            console.log('Formatted burglaryPolicyEndDate:', formatted);
                            return formatted;
                          } else if (date instanceof Date) {
                            const formatted = date.toLocaleDateString();
                            console.log('Formatted burglaryPolicyEndDate (Date object):', formatted);
                            return formatted;
                          } else if (date && typeof date === 'object' && date.toDate) {
                            // Handle Firestore Timestamp
                            const formatted = date.toDate().toLocaleDateString();
                            console.log('Formatted burglaryPolicyEndDate (Firestore Timestamp):', formatted);
                            return formatted;
                          }
                        }
                        console.log('BurglaryPolicyEndDate returning "-"');
                        return '-';
                      })(),    // From inspection collection
                      firePolicyName: matchingInsurance.firePolicyCompanyName || '-',        // From inspection collection
                      burglaryPolicyName: matchingInsurance.burglaryPolicyCompanyName || '-', // From inspection collection
                      bankFundedBy: matchingInsurance.selectedBankName || '-'                // From inspection collection
                    };
                    
                    console.log('Insurance data extracted from inspection collection for inward:', data.inwardId, {
                      firePolicyAmount: insuranceData.firePolicyAmount,
                      burglaryPolicyAmount: insuranceData.burglaryPolicyAmount,
                      firePolicyStartDate: insuranceData.firePolicyStartDate,
                      firePolicyEndDate: insuranceData.firePolicyEndDate,
                      burglaryPolicyStartDate: insuranceData.burglaryPolicyStartDate,
                      burglaryPolicyEndDate: insuranceData.burglaryPolicyEndDate,
                      firePolicyName: insuranceData.firePolicyName,
                      burglaryPolicyName: insuranceData.burglaryPolicyName,
                      bankFundedBy: insuranceData.bankFundedBy
                    });
                  } else {
                    console.log('No matching insurance found for inward:', data.inwardId, 'selectedInsurance:', data.selectedInsurance);
                    console.log('Available insurance entries in inspection:', insuranceEntries.map(ins => ({
                      insuranceId: ins.insuranceId,
                      insuranceTakenBy: ins.insuranceTakenBy
                    })));
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching insurance data for inward entry:', data.inwardId, error);
            }
          } else {
            console.log('No selectedInsurance data for inward:', data.inwardId);
          }
          
          return { 
            ...data, 
            id: doc.id, 
            receiptType,
            ...insuranceData
          };
        })
      );
      
      console.log('Final inward data with receipt types and insurance data:', inwardDataWithReceiptType);
      setInwardData(inwardDataWithReceiptType);

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
        if (data.warehouseName && data.status === 'activated') {
          // Use warehouse name as key to ensure uniqueness
          if (!warehouseMap.has(data.warehouseName)) {
            // Extract insurance data from the inspection
            let insuranceEntries: any[] = [];
            
            // Check multiple possible locations for insurance data
            if (data.insuranceEntries && Array.isArray(data.insuranceEntries)) {
              console.log('Found top-level insurance entries for warehouse:', data.warehouseName, data.insuranceEntries.length);
              insuranceEntries = data.insuranceEntries;
            } else if (data.warehouseInspectionData?.insuranceEntries && Array.isArray(data.warehouseInspectionData.insuranceEntries)) {
              console.log('Found nested insurance entries for warehouse:', data.warehouseName, data.warehouseInspectionData.insuranceEntries.length);
              insuranceEntries = data.warehouseInspectionData.insuranceEntries;
            } else if (data.warehouseInspectionData) {
              // Legacy format - convert to new format
              const legacyData = data.warehouseInspectionData;
              if (legacyData.firePolicyNumber || legacyData.burglaryPolicyNumber) {
                console.log('Found legacy insurance format for warehouse:', data.warehouseName);
                insuranceEntries = [{
                  id: `legacy_${Date.now()}`,
                  insuranceTakenBy: legacyData.insuranceTakenBy || '',
                  insuranceCommodity: legacyData.insuranceCommodity || '',
                  clientName: legacyData.clientName || '',
                  clientAddress: legacyData.clientAddress || '',
                  selectedBankName: legacyData.selectedBankName || '',
                  firePolicyCompanyName: legacyData.firePolicyCompanyName || '',
                  firePolicyNumber: legacyData.firePolicyNumber || '',
                  firePolicyAmount: legacyData.firePolicyAmount || '',
                  firePolicyStartDate: legacyData.firePolicyStartDate || null,
                  firePolicyEndDate: legacyData.firePolicyEndDate || null,
                  burglaryPolicyCompanyName: legacyData.burglaryPolicyCompanyName || '',
                  burglaryPolicyNumber: legacyData.burglaryPolicyNumber || '',
                  burglaryPolicyAmount: legacyData.burglaryPolicyAmount || '',
                  burglaryPolicyStartDate: legacyData.burglaryPolicyStartDate || null,
                  burglaryPolicyEndDate: legacyData.burglaryPolicyEndDate || null,
                  createdAt: new Date(legacyData.createdAt || Date.now())
                }];
              }
            }
            
            // Store warehouse data with insurance entries
            warehouseMap.set(data.warehouseName, {
              ...data,
              insuranceEntries: insuranceEntries
            });
          }
        }
      });
      setWarehouses(Array.from(warehouseMap.values()));
      console.log('Warehouses loaded with insurance data:', Array.from(warehouseMap.values()));
      
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
  }, []);

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
    clientAddress: '',
    dateOfInward: '',
    cadNumber: '',
    attachmentUrl: '',
    commodity: '',
    varietyName: '',
    marketRate: '',
    totalBags: '',
    totalQuantity: '',
    totalValue: '',
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
    firePolicyCompanyName: '',
    burglaryPolicyCompanyName: '',
    firePolicyBalance: '',
    burglaryPolicyBalance: '',
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
    averageWeight: '',
    totalBags: '',
    totalQuantity: '',
    dateOfSampling: '',
    dateOfTesting: '',
    labResults: [] as string[],
    labResultsValidation: [] as boolean[],
    stacks: [
      {
        stackNumber: '',
        numberOfBags: ''
      }
    ],
  });

  // Combined form for display
  const form = { ...baseForm, ...currentEntryForm, totalValue: baseForm.totalValue };

  // Calculate insurance balance amounts
  useEffect(() => {
    const fireAmount = parseFloat(baseForm.firePolicyAmount) || 0;
    const burglaryAmount = parseFloat(baseForm.burglaryPolicyAmount) || 0;
    const totalValue = parseFloat(baseForm.totalValue) || 0;

    const fireBalance = fireAmount - totalValue;
    const burglaryBalance = burglaryAmount - totalValue;

    setBaseForm(f => ({
      ...f,
      firePolicyBalance: fireBalance >= 0 ? fireBalance.toFixed(2) : '0.00',
      burglaryPolicyBalance: burglaryBalance >= 0 ? burglaryBalance.toFixed(2) : '0.00',
    }));
  }, [baseForm.firePolicyAmount, baseForm.burglaryPolicyAmount, baseForm.totalValue]);

  // Auto-calculate total bags and quantity from all entries (saved and current)
  useEffect(() => {
    // Sum from already saved entries
    const savedBagsSum = inwardEntries.reduce((sum, entry) => sum + (parseInt(entry.totalBags, 10) || 0), 0);
    const savedQuantitySum = inwardEntries.reduce((sum, entry) => sum + (parseFloat(entry.totalQuantity) || 0), 0);

    // Get values from the current, unsaved entry form
    const currentBags = parseInt(currentEntryForm.totalBags, 10) || 0;
    const currentQuantity = parseFloat(currentEntryForm.totalQuantity) || 0;

    // Calculate the grand total
    const totalBagsSum = savedBagsSum + currentBags;
    const totalQuantitySum = savedQuantitySum + currentQuantity;

    setBaseForm(f => ({
      ...f,
      totalBags: totalBagsSum > 0 ? totalBagsSum.toString() : '',
      totalQuantity: totalQuantitySum > 0 ? totalQuantitySum.toFixed(3) : '',
    }));
  }, [inwardEntries, currentEntryForm.totalBags, currentEntryForm.totalQuantity]);

  // Fetch all data on mount
  useEffect(() => {
    fetchData();
  }, [dataVersion]);

  // Filter branches by state
  const filteredBranches = branches.filter((b: any) => b.state === form.state);
  // Filter locations by branch
  const filteredLocations = filteredBranches.find((b: any) => b.branch === form.branch)?.locations || [];
  // Filter warehouses by location - ensure unique warehouses
  const filteredWarehouses = useMemo(() => {
    const fw = warehouses.filter((w: any) => 
      w.location?.trim().toLowerCase() === form.location.trim().toLowerCase()
    );
    console.log('Filtered Warehouses:', fw, 'Form:', form);
    return fw;
  }, [warehouses, form.location]);

  // Auto-fill warehouse code/address and business type
  useEffect(() => {
    if (form.warehouseName) {
      const wh = filteredWarehouses.find((w: any) => w.warehouseName === form.warehouseName);
      if (wh) {
        // Prefer address from warehouseInspectionData if available
        const address = wh.warehouseInspectionData?.address || wh.warehouseAddress || '';
        setBaseForm(f => ({ 
          ...f, 
          warehouseCode: wh.warehouseCode || '', 
          warehouseAddress: address,
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

  // Auto-fill client ID and address
  useEffect(() => {
    if (form.client) {
      const selectedClient = clients.find(c => c.firmName === form.client);
      if (selectedClient) {
        setBaseForm(f => ({ 
          ...f, 
          clientCode: selectedClient.clientId,
          clientAddress: selectedClient.companyAddress || ''
        }));
      }
    } else {
      setBaseForm(f => ({ 
        ...f, 
        clientCode: '',
        clientAddress: ''
      }));
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
    const selectedCommodity = commodities.find((c: any) => c.commodityName === commodityName);
    console.log('Selected commodity:', selectedCommodity);
    console.log('Commodity rate:', selectedCommodity?.rate);
    
    setBaseForm(f => ({ 
      ...f, 
      commodity: commodityName,
      varietyName: '',
      marketRate: selectedCommodity?.rate ? selectedCommodity.rate.toString() : ''
    }));
    
    // Fetch insurance data based on current selections
    fetchInsuranceData(commodityName);
  };

  // Fetch insurance data based on selected criteria
  const fetchInsuranceData = (commodityName: string) => {
    if (!form.state || !form.branch || !form.location || !form.warehouseName || !commodityName) {
      return;
    }

    // Find matching insurance entries from the inspection module
    const matchingInsuranceEntries = insuranceEntries.filter((insurance: any) => 
      insurance.insuranceCommodity === commodityName
    );

    if (matchingInsuranceEntries.length > 0) {
      // Use the first matching insurance entry for backward compatibility
      const firstInsurance = matchingInsuranceEntries[0];
      setBaseForm(f => ({
        ...f,
        insuranceManagedBy: firstInsurance.insuranceTakenBy || '',
        firePolicyNumber: firstInsurance.firePolicyNumber || '',
        firePolicyAmount: firstInsurance.firePolicyAmount || '',
        firePolicyStart: firstInsurance.firePolicyStartDate || '',
        firePolicyEnd: firstInsurance.firePolicyEndDate || '',
        burglaryPolicyNumber: firstInsurance.burglaryPolicyNumber || '',
        burglaryPolicyAmount: firstInsurance.burglaryPolicyAmount || '',
        burglaryPolicyStart: firstInsurance.burglaryPolicyStartDate || '',
        burglaryPolicyEnd: firstInsurance.burglaryPolicyEndDate || '',
        firePolicyCompanyName: firstInsurance.firePolicyCompanyName || '',
        burglaryPolicyCompanyName: firstInsurance.burglaryPolicyCompanyName || '',
        bankFundedBy: firstInsurance.selectedBankName || '',
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
        firePolicyCompanyName: '',
        burglaryPolicyCompanyName: '',
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
      // Keep existing marketRate if already set from commodity, otherwise use variety rate
      marketRate: f.marketRate || (variety?.rate ? `${variety.rate} ` : '')
    }));

    const particulars = variety?.particulars || [];
    setCurrentEntryForm(f => ({
      ...f,
      labResults: Array(particulars.length).fill(''),
      labResultsValidation: Array(particulars.length).fill(true)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select a JPG, PNG, PDF, or Excel file.",
          variant: "destructive",
        });
        setFileAttachment(null);
        e.target.value = ''; // Clear the input
      } else {
        setFileAttachment(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fileAttachment && !isEditMode) {
      alert('Please attach a file.');
      return;
    }

    // Base form validations
    const missingBaseFields = [];
    if (!form.state) missingBaseFields.push('State');
    if (!form.branch) missingBaseFields.push('Branch');
    if (!form.location) missingBaseFields.push('Location');
    if (!form.warehouseName) missingBaseFields.push('Warehouse Name');
    if (!form.client) missingBaseFields.push('Client Name');
    if (!form.dateOfInward) missingBaseFields.push('Date of Inward');
    if (!form.cadNumber) missingBaseFields.push('CAD Number');
    if (!form.commodity) missingBaseFields.push('Commodity');
    if (!form.varietyName) missingBaseFields.push('Variety Name');
    if (!form.marketRate) missingBaseFields.push('Market Rate');
    if (!baseForm.totalBags) missingBaseFields.push('Total Bags (in Commodity Info)');
    if (!baseForm.totalQuantity) missingBaseFields.push('Total Quantity (in Commodity Info)');

    if (missingBaseFields.length > 0) {
      alert(`Please fill in the following required base fields:\n\n${missingBaseFields.join('\n')}`);
      return;
    }
    
    setIsUploading(true);
    let uploadedFileUrl = '';
    
    try {
      if (fileAttachment) {
        const uploadResult = await uploadToCloudinary(fileAttachment);
        uploadedFileUrl = uploadResult.secure_url;
      } else if (isEditMode && editingRow) {
        uploadedFileUrl = editingRow.attachmentUrl || '';
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('File upload failed. Please try again.');
      setIsUploading(false);
      return;
    }
    setIsUploading(false);

    let allEntries = [...inwardEntries];
    if (currentEntryForm.vehicleNumber || currentEntryForm.getpassNumber) {
      allEntries.push({ id: Date.now(), ...baseForm, ...currentEntryForm, entryNumber: inwardEntries.length + 1 });
    }
    
    if (allEntries.length === 0 && !isEditMode) {
      alert('Please add at least one inward entry before saving.');
      return;
    }

    // For edit mode, use the current form data
    if (isEditMode) {
      allEntries = [{ id: Date.now(), ...baseForm, ...currentEntryForm, entryNumber: 1 }];
    }

    // --- Insurance selection validation ---
    let selectedInsuranceMeta = null;
    let debugSelectedInsurance = null;
    if (selectedInsuranceInfoIndex !== null) {
      const ins = filteredInsuranceInfoEntries[selectedInsuranceInfoIndex];
      debugSelectedInsurance = ins;
      selectedInsuranceMeta = {
        insuranceTakenBy: ins?.insuranceTakenBy,
        insuranceId: ins?.insuranceId,
      };
    } else if (selectedInsuranceIndex !== null) {
      const ins = insuranceEntries[selectedInsuranceIndex];
      debugSelectedInsurance = ins;
      selectedInsuranceMeta = {
        insuranceTakenBy: ins?.insuranceTakenBy,
        insuranceId: ins?.insuranceId,
      };
    }
    // Debug log
    console.log('DEBUG: Selected insurance entry:', debugSelectedInsurance);
    // Insurance validation removed - allowing updates without insurance selection

    // --- Ensure all date fields are strings ---
    allEntries = allEntries.map(entry => ({
      ...entry,
      firePolicyStart: entry.firePolicyStart ? String(entry.firePolicyStart) : '',
      firePolicyEnd: entry.firePolicyEnd ? String(entry.firePolicyEnd) : '',
      burglaryPolicyStart: entry.burglaryPolicyStart ? String(entry.burglaryPolicyStart) : '',
      burglaryPolicyEnd: entry.burglaryPolicyEnd ? String(entry.burglaryPolicyEnd) : '',
    }));

    // Final validation loop for all entries
    for (const entry of allEntries) {
      const missingFields = [];
      if (!entry.vehicleNumber) missingFields.push('Vehicle Number');
      if (!entry.getpassNumber) missingFields.push('Gatepass Number');
      if (!entry.totalBags) missingFields.push('Total Bags (in Inward Entry)');
      
      if (missingFields.length > 0) {
        alert(`Validation Error in Entry #${entry.entryNumber}:\nPlease fill in these fields: ${missingFields.join(', ')}`);
        return;
      }

      const stackBagsSum = (entry.stacks || []).reduce((sum: number, stack: { numberOfBags: string }) => sum + (parseInt(stack.numberOfBags) || 0), 0);
      const totalBags = parseInt(entry.totalBags) || 0;

      if (stackBagsSum !== totalBags) {
        alert(`Validation Error in Entry #${entry.entryNumber}:\nTotal Bags (${totalBags}) does not match the sum of bags in stacks (${stackBagsSum}).`);
        return;
      }
    }

    // Save to Firebase
    try {
      const inwardCollection = collection(db, 'inward');
      
      if (isEditMode && editingRow) {
        // Update existing document
        console.log('Starting update for editingRow:', editingRow.inwardId);
        const q = query(inwardCollection, where('inwardId', '==', editingRow.inwardId));
        const querySnapshot = await getDocs(q);
        
        console.log('Query result:', querySnapshot.empty ? 'No documents found' : `${querySnapshot.docs.length} documents found`);
        
        if (!querySnapshot.empty) {
          const docRef = doc(db, 'inward', querySnapshot.docs[0].id);
          console.log('Document reference:', docRef.path);
          
          // Check if document exists before updating
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            throw new Error(`Document with ID ${querySnapshot.docs[0].id} does not exist`);
          }
          console.log('Document exists, proceeding with update');
          
          const { id, labResultsValidation, ...entryData } = allEntries[0]; // remove client-side id and validation state

          // Replace empty string fields with a hyphen
          const sanitizedData = Object.fromEntries(
            Object.entries(entryData).map(([key, value]) => [
              key,
              typeof value === 'string' && value === '' ? '-' : value,
            ])
          );

          console.log('Sanitized data keys:', Object.keys(sanitizedData));
          console.log('Selected insurance meta:', selectedInsuranceMeta);

          // Clean selectedInsurance to remove undefined values
          const cleanSelectedInsurance = selectedInsuranceMeta ? {
            insuranceTakenBy: selectedInsuranceMeta.insuranceTakenBy || null,
            insuranceId: selectedInsuranceMeta.insuranceId || null,
          } : null;

          // Remove insurance-related fields from update data to prevent insurance data changes
          const { 
            insuranceManagedBy,
            firePolicyNumber,
            firePolicyAmount,
            firePolicyStart,
            firePolicyEnd,
            burglaryPolicyNumber,
            burglaryPolicyAmount,
            burglaryPolicyStart,
            burglaryPolicyEnd,
            firePolicyCompanyName,
            burglaryPolicyCompanyName,
            firePolicyBalance,
            burglaryPolicyBalance,
            bankFundedBy,
            ...nonInsuranceData
          } = sanitizedData;

          const updateData = {
            ...nonInsuranceData,
            attachmentUrl: uploadedFileUrl,
            updatedAt: new Date().toISOString(),
            labResults: allEntries[0].labResults || [],
            // Keep the existing selectedInsurance without changes
            selectedInsurance: editingRow.selectedInsurance || null,
          };

          console.log('About to update document with data:', updateData);
          await updateDoc(docRef, updateData);
          console.log('Document updated successfully');
          
          toast({
            title: "Success",
            description: "Inward entry updated successfully.",
            variant: "default",
          });
        } else {
          throw new Error(`No document found with inwardId: ${editingRow.inwardId}`);
        }
      } else {
        // Create new documents
        for (const entry of allEntries) {
          const inwardId = await generateInwardId();
          const { id, labResultsValidation, ...entryData } = entry; // remove client-side id and validation state

          // Replace empty string fields with a hyphen
          const sanitizedData = Object.fromEntries(
            Object.entries(entryData).map(([key, value]) => [
              key,
              typeof value === 'string' && value === '' ? '-' : value,
            ])
          );

          // Clean selectedInsurance to remove undefined values
          const cleanSelectedInsurance = selectedInsuranceMeta ? {
            insuranceTakenBy: selectedInsuranceMeta.insuranceTakenBy || null,
            insuranceId: selectedInsuranceMeta.insuranceId || null,
          } : null;

          await addDoc(inwardCollection, {
            ...sanitizedData,
            attachmentUrl: uploadedFileUrl,
            inwardId,
            createdAt: new Date().toISOString(),
            labResults: entry.labResults || [],
            selectedInsurance: cleanSelectedInsurance,
            status: 'pending', // <-- set default status
          });
        }
        
        toast({
          title: "Success",
          description: `Successfully saved ${allEntries.length} inward entries.`,
          variant: "default",
        });
      }
      
      // After saving inward entry, update inspection insurance entry (moved inside try-catch)
      try {
    if (selectedInsuranceIndex !== null) {
      const ins = insuranceEntries[selectedInsuranceIndex];
      const newRemainingFire = (parseFloat(initialRemainingFire) - parseFloat(baseForm.totalValue || '0')).toFixed(2);
      const newRemainingBurglary = (parseFloat(initialRemainingBurglary) - parseFloat(baseForm.totalValue || '0')).toFixed(2);
      // Update Firestore
      const inspectionsCollection = collection(db, 'inspections');
      const q = query(inspectionsCollection, where('warehouseName', '==', form.warehouseName));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRef = doc(db, 'inspections', querySnapshot.docs[0].id);
        const inspectionData = querySnapshot.docs[0].data();
        let insuranceList = inspectionData.insuranceEntries || [];
        if (!Array.isArray(insuranceList) && inspectionData.warehouseInspectionData?.insuranceEntries) {
          insuranceList = inspectionData.warehouseInspectionData.insuranceEntries;
        }
        const updatedList = insuranceList.map((i: any) => {
          if (i.firePolicyNumber === ins.firePolicyNumber && i.burglaryPolicyNumber === ins.burglaryPolicyNumber) {
            if (ins.insuranceTakenBy === 'warehouse owner') {
              // Swap the update for warehouse owner type
              return {
                ...i,
                burglaryPolicyAmount: newRemainingFire,
                firePolicyAmount: newRemainingBurglary,
                remainingFirePolicyAmount: newRemainingFire,
                remainingBurglaryPolicyAmount: newRemainingBurglary,
              };
            } else {
              // Default update for other types
              return {
                ...i,
                firePolicyAmount: newRemainingFire,
                burglaryPolicyAmount: newRemainingBurglary,
                remainingFirePolicyAmount: newRemainingFire,
                remainingBurglaryPolicyAmount: newRemainingBurglary,
              };
            }
          }
          return i;
        });
        await updateDoc(docRef, { insuranceEntries: updatedList });
      }
    }

    // Also update if insurance is selected in information section
    if (selectedInsuranceInfoIndex !== null) {
      const ins = filteredInsuranceInfoEntries[selectedInsuranceInfoIndex];
      // Use the already calculated remaining amounts from state
      const newRemainingFire = remainingFirePolicy;
      const newRemainingBurglary = remainingBurglaryPolicy;
      
      // Update source collections (clients or agrogreen) based on sourceDocumentId and insuranceId
      if (ins.sourceDocumentId && ins.insuranceId) {
          if (ins.sourceCollection === 'clients') {
            // Update client insurance
              const clientDocRef = doc(db, 'clients', ins.sourceDocumentId);
              const clientDocSnap = await getDoc(clientDocRef);
              
              if (clientDocSnap.exists()) {
                const clientData = clientDocSnap.data() as any;
                const insurances = clientData.insurances || [];
                
                // Find and update the specific insurance
                const updatedInsurances = insurances.map((insurance: any) => {
                  if (insurance.insuranceId === ins.insuranceId) {
                    return {
                      ...insurance,
                      firePolicyAmount: newRemainingFire,
                      burglaryPolicyAmount: newRemainingBurglary,
                      remainingFirePolicyAmount: newRemainingFire,
                      remainingBurglaryPolicyAmount: newRemainingBurglary,
                    };
                  }
                  return insurance;
                });
                
                await updateDoc(clientDocRef, {
                  insurances: updatedInsurances
                });
            }
          } else if (ins.sourceCollection === 'agrogreen') {
            // Update Agrogreen insurance
              const agrogreenDocRef = doc(db, 'agrogreen', ins.sourceDocumentId);
              const agrogreenDocSnap = await getDoc(agrogreenDocRef);
              
              if (agrogreenDocSnap.exists()) {
                await updateDoc(agrogreenDocRef, {
                  firePolicyAmount: newRemainingFire,
                  burglaryPolicyAmount: newRemainingBurglary,
                  remainingFirePolicyAmount: newRemainingFire,
                  remainingBurglaryPolicyAmount: newRemainingBurglary,
                });
              }
        }
      }
      
      // Update Firestore inspection entry as well
      const inspectionsCollection = collection(db, 'inspections');
      const q = query(inspectionsCollection, where('warehouseName', '==', form.warehouseName));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRef = doc(db, 'inspections', querySnapshot.docs[0].id);
        const inspectionData = querySnapshot.docs[0].data();
        let insuranceList = inspectionData.insuranceEntries || [];
        if (!Array.isArray(insuranceList) && inspectionData.warehouseInspectionData?.insuranceEntries) {
          insuranceList = inspectionData.warehouseInspectionData.insuranceEntries;
        }
        const updatedList = insuranceList.map((i: any) => {
          if (i.firePolicyNumber === ins.firePolicyNumber && i.burglaryPolicyNumber === ins.burglaryPolicyNumber) {
            return {
              ...i,
              remainingFirePolicyAmount: newRemainingFire,
              remainingBurglaryPolicyAmount: newRemainingBurglary,
            };
          }
          return i;
        });
        await updateDoc(docRef, { insuranceEntries: updatedList });
      }
        }
      } catch (insuranceError) {
        console.error('Error updating insurance data:', insuranceError);
        // Don't fail the entire operation if insurance update fails
        toast({
          title: "Warning",
          description: "Inward entry saved successfully, but there was an issue updating insurance data.",
          variant: "default",
        });
      }
      
      handleModalClose();
      setDataVersion(v => v + 1);
    } catch (error: any) {
      console.error('Error saving inward entries to Firebase:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      
      // More specific error messages based on error type
      let errorMessage = "Error saving inward entries to Firebase. Please try again.";
      
      if (error?.code === 'permission-denied') {
        errorMessage = "Permission denied. Please check your authentication.";
      } else if (error?.code === 'unavailable') {
        errorMessage = "Firebase service is temporarily unavailable. Please try again.";
      } else if (error?.code === 'not-found') {
        errorMessage = "Document not found. Please refresh and try again.";
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

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
      clientAddress: '',
      dateOfInward: '',
      cadNumber: '',
      attachmentUrl: '',
      commodity: '',
      varietyName: '',
      marketRate: '',
      totalBags: '',
      totalQuantity: '',
      totalValue: '',
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
      firePolicyCompanyName: '',
      burglaryPolicyCompanyName: '',
      firePolicyBalance: '',
      burglaryPolicyBalance: '',
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
      averageWeight: '',
      totalBags: '',
      totalQuantity: '',
      dateOfSampling: '',
      dateOfTesting: '',
      labResults: [],
      labResultsValidation: [],
      stacks: [
        {
          stackNumber: '',
          numberOfBags: ''
        }
      ],
    });
    setFileAttachment(null);
    setSelectedInsuranceType('all');
    setSelectedInsuranceIndex(null);
    setSelectedInsuranceInfoType('');
    setSelectedInsuranceInfoIndex(null);
    setRemainingFirePolicy('');
    setRemainingBurglaryPolicy('');
    setInitialRemainingFire('');
    setInitialRemainingBurglary('');
    setInsuranceEntries([]);
    setInwardEntries([]);
    setCurrentEntryIndex(0);
    setIsUploading(false);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setIsEditMode(false);
    setEditingRow(null);
    resetForm();
  };

  // Calculate net weight when gross or tare weight changes
  const calculateNetWeight = (gross: string, tare: string) => {
    const grossNum = parseFloat(gross) || 0;
    const tareNum = parseFloat(tare) || 0;
    const net = grossNum - tareNum;
    return net >= 0 ? net.toFixed(3) : '0.000';
  };

  // Auto-calculate Average Weight for the current inward entry
  useEffect(() => {
    const netWeight = parseFloat(currentEntryForm.netWeight) || 0;
    const totalBags = parseInt(currentEntryForm.totalBags, 10) || 0;

    if (netWeight > 0 && totalBags > 0) {
      const avgWeight = (netWeight / totalBags) * 1000; // Convert MT/bag to Kg/bag
      setCurrentEntryForm(f => ({ ...f, averageWeight: avgWeight.toFixed(2) }));
    } else {
      setCurrentEntryForm(f => ({ ...f, averageWeight: '' }));
    }
  }, [currentEntryForm.netWeight, currentEntryForm.totalBags]);

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
    return currentEntryForm.stacks.reduce((total: number, stack: { numberOfBags: string }) => {
      return total + (parseInt(stack.numberOfBags) || 0);
    }, 0);
  };

  // Validate stack bags match total bags
  const validateStackBags = () => {
    const stackTotal = calculateTotalBagsFromStacks();
    return stackTotal === (parseInt(currentEntryForm.totalBags) || 0);
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
    if (!currentEntryForm.getpassNumber) missingFields.push('Gatepass Number');
    if (!currentEntryForm.weightBridge) missingFields.push('Weight Bridge');
    if (!currentEntryForm.weightBridgeSlipNumber) missingFields.push('Weight Bridge Slip Number');
    if (!currentEntryForm.grossWeight) missingFields.push('Gross Weight');
    if (!currentEntryForm.tareWeight) missingFields.push('Tare Weight');

    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields:\n\n${missingFields.join('\n')}`);
      return;
    }

    // Validate getpass number uniqueness
    const isGetpassDuplicate = inwardEntries.some(entry => 
      entry.getpassNumber === currentEntryForm.getpassNumber
    );
    
    if (isGetpassDuplicate) {
      alert('Gatepass number must be unique. This gatepass number has already been used in a previous entry.');
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

    const updatedEntries = [...inwardEntries, newEntry];
    setInwardEntries(updatedEntries);
    
    // Reset only the current entry form for new entry
    setCurrentEntryForm({
      vehicleNumber: '',
      getpassNumber: '',
      weightBridge: '',
      weightBridgeSlipNumber: '',
      grossWeight: '',
      tareWeight: '',
      netWeight: '',
      averageWeight: '',
      totalBags: '',
      totalQuantity: '',
      dateOfSampling: '',
      dateOfTesting: '',
      labResults: [],
      labResultsValidation: [],
      stacks: [
        {
          stackNumber: '',
          numberOfBags: ''
        }
      ],
    });
    
    alert(`Entry ${newEntry.entryNumber} saved successfully! New entry form ready.`);
  };

  // Auto-calculate Total Value
  useEffect(() => {
    if (baseForm.totalQuantity && baseForm.marketRate) {
      const totalValue = (parseFloat(baseForm.totalQuantity) * parseFloat(baseForm.marketRate)).toFixed(2);
      setBaseForm(f => ({ ...f, totalValue }));
    } else {
      setBaseForm(f => ({ ...f, totalValue: '' }));
    }
  }, [baseForm.totalQuantity, baseForm.marketRate]);

  const calculateAverageWeight = (netWeight: string, totalBags: string) => {
    const net = parseFloat(netWeight) || 0;
    const bags = parseInt(totalBags) || 0;
    if (bags > 0) {
      return ((net / bags) * 1000).toFixed(2);
    }
    return '0.00';
  };

  const columns = [
    { accessorKey: "inwardId", header: "Inward Code" },
    { accessorKey: "dateOfInward", header: "Date of Inward" },
    { accessorKey: "state", header: "State" },
    { accessorKey: "branch", header: "Branch" },
    { accessorKey: "location", header: "Location" },
    { accessorKey: "warehouseName", header: "Warehouse Name" },
    { accessorKey: "warehouseCode", header: "Warehouse Code" },
    { accessorKey: "warehouseAddress", header: "Warehouse Address" },
    { accessorKey: "receiptType", header: "Receipt Type" },
    { accessorKey: "client", header: "Client" },
    { accessorKey: "clientCode", header: "Client Code" },
    { accessorKey: "clientAddress", header: "Client Address" },
    { accessorKey: "commodity", header: "Commodity" },
    { accessorKey: "varietyName", header: "Variety" },
    { accessorKey: "totalBags", header: "Total Bags" },
    { accessorKey: "totalQuantity", header: "Total Quantity (MT)" },
    { accessorKey: "marketRate", header: "Market Rate" },
    { accessorKey: "totalValue", header: "Total Value" },
    { accessorKey: "grossWeight", header: "Gross Weight" },
    { accessorKey: "tareWeight", header: "Tare Weight" },
    { accessorKey: "netWeight", header: "Net Weight" },
    { accessorKey: "averageWeight", header: "Avg. Weight" },
    { accessorKey: "vehicleNumber", header: "Vehicle No." },
    { accessorKey: "getpassNumber", header: "Gatepass No." },
    { accessorKey: "weightBridge", header: "Weight Bridge" },
    { accessorKey: "weightBridgeSlipNumber", header: "Slip No." },
    { accessorKey: "cadNumber", header: "CAD Number" },
    { accessorKey: "entryNumber", header: "Entry No." },
    { 
      accessorKey: "stacks",
      header: "Stack No(s)",
      cell: ({ row }: any) => {
        const stacks = row.original.stacks;
        return Array.isArray(stacks) ? stacks.map((s: any) => s.stackNumber).join(', ') : '';
      }
    },
    // Lab details
    { accessorKey: "dateOfSampling", header: "Sampling Date" },
    { accessorKey: "dateOfTesting", header: "Testing Date" },
    { 
      accessorKey: "labResults",
      header: "Lab Results (%)",
      cell: ({ row }: any) => {
        const results = row.original.labResults;
        return Array.isArray(results) ? results.join(', ') : '';
      }
    },
    // Business and Billing
    { accessorKey: "businessType", header: "Business Type" },
    { accessorKey: "billingStatus", header: "Billing Status" },
    { accessorKey: "billingCycle", header: "Billing Cycle" },
    { accessorKey: "billingType", header: "Billing Type" },
    { accessorKey: "billingRate", header: "Billing Rate" },
    { accessorKey: "reservationRate", header: "Reservation Rate" },
    { accessorKey: "reservationQty", header: "Reservation Qty" },
    { accessorKey: "reservationStart", header: "Reservation Start" },
    { accessorKey: "reservationEnd", header: "Reservation End" },
    // Bank details
    { accessorKey: "bankName", header: "Bank Name" },
    { accessorKey: "bankBranch", header: "Bank Branch" },
    { accessorKey: "bankState", header: "Bank State" },
    { accessorKey: "ifscCode", header: "IFSC Code" },
    { accessorKey: "bankReceipt", header: "Base Receipt" },
    // Insurance details
    { 
      accessorKey: "selectedInsurance", 
      header: "Insurance Managed By",
      cell: ({ row }: any) => {
        const selectedInsurance = row.original.selectedInsurance;
        if (selectedInsurance && selectedInsurance.insuranceTakenBy) {
          return selectedInsurance.insuranceTakenBy;
        }
        return row.original.insuranceManagedBy || '-';
      }
    },
    { accessorKey: "firePolicyAmount", header: "Fire Policy Amount" },
    { accessorKey: "burglaryPolicyAmount", header: "Burglary Policy Amount" },
    { accessorKey: "firePolicyStartDate", header: "Fire Policy Start Date" },
    { accessorKey: "firePolicyEndDate", header: "Fire Policy End Date" },
    { accessorKey: "burglaryPolicyStartDate", header: "Burglary Policy Start Date" },
    { accessorKey: "burglaryPolicyEndDate", header: "Burglary Policy End Date" },
    { accessorKey: "firePolicyName", header: "Fire Policy Name" },
    { accessorKey: "burglaryPolicyName", header: "Burglary Policy Name" },
    { accessorKey: "bankFundedBy", header: "Bank Funded By" },
    // Add status column
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.original.status || 'pending';
        // Optionally, you can style the status text
        let color = 'text-gray-600';
        if (status === 'approve') color = 'text-green-600 font-semibold';
        else if (status === 'rejected') color = 'text-red-600 font-semibold';
        else if (status === 'resubmited') color = 'text-yellow-600 font-semibold';
        else if (status === 'pending') color = 'text-blue-600 font-semibold';
        return <span className={color}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
      }
    },
    // Action column
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex space-x-2">
          <Button
            onClick={() => handleViewSR(row.original)}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => handleEdit(row.original)}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => handleDelete(row.original)}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: 'alert',
      header: 'Alert',
      cell: AlertCell
    },
  ];

  // ... inside InwardPage component, after other useState hooks ...
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const sortColumn = 'inwardId';

  // ... update filteredData to sort by sortColumn and sortDirection ...
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    // Sort data by Inward Code and direction
    const sortedData = [...inwardData].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      // If value is number, compare as number
      if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    if (!term) return sortedData;
    return sortedData.filter((item: any) => {
      const lowerCaseSearchTerm = term.toLowerCase();
      return (
        item.state?.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.branch?.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.location?.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.warehouseName?.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.client?.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.receiptType?.toLowerCase().includes(lowerCaseSearchTerm)
      );
    });
  }, [searchTerm, inwardData, sortDirection]);

  const handleExportCSV = () => {
    const dataToExport = filteredData;
    if (dataToExport.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There is no data available to export.",
        variant: "destructive",
      });
      return;
    }
  
    const getCellContent = (row: any, column: any): string => {
      const { accessorKey } = column;
      const value = row[accessorKey];
  
      if (accessorKey === 'stacks' && Array.isArray(value)) {
        return value.map((s: any) => s.stackNumber).join(', ');
      }
      if (accessorKey === 'labResults' && Array.isArray(value)) {
        return value.join(', ');
      }
      // Handle insurance data that might be undefined
      if (accessorKey === 'firePolicyAmount' || accessorKey === 'burglaryPolicyAmount' || 
          accessorKey === 'firePolicyStartDate' || accessorKey === 'firePolicyEndDate' ||
          accessorKey === 'burglaryPolicyStartDate' || accessorKey === 'burglaryPolicyEndDate' ||
          accessorKey === 'firePolicyName' || accessorKey === 'burglaryPolicyName' ||
          accessorKey === 'bankFundedBy') {
        return value ?? '-';
      }
      // Handle selectedInsurance column
      if (accessorKey === 'selectedInsurance') {
        const selectedInsurance = row.selectedInsurance;
        if (selectedInsurance && selectedInsurance.insuranceTakenBy) {
          return selectedInsurance.insuranceTakenBy;
        }
        return row.insuranceManagedBy || '-';
      }
      return value ?? '';
    };
  
    const csvHeaders = columns.map(c => (typeof c.header === 'string' ? c.header : c.accessorKey) || '').join(',');
    const csvRows = dataToExport
      .map(row =>
        columns
          .map(col => {
            const cellValue = getCellContent(row, col);
            const stringValue = String(cellValue).replace(/"/g, '""');
            return `"${stringValue}"`;
          })
          .join(',')
      )
      .join('\\r\\n');
  
    const csvContent = `\\uFEFF${csvHeaders}\\r\\n${csvRows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'inward-data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  // Helper to get particulars for selected commodity and variety
  const getSelectedVarietyParticulars = () => {
    // Use selectedRowForSR if available (for PDF generation), otherwise use form data
    const commodityName = selectedRowForSR?.commodity || form.commodity;
    const varietyName = selectedRowForSR?.varietyName || form.varietyName;
    
    console.log('getSelectedVarietyParticulars called with:', { 
      commodity: commodityName, 
      varietyName: varietyName,
      commoditiesCount: commodities.length 
    });
    
    const commodity = commodities.find((c: any) => c.commodityName === commodityName);
    console.log('Found commodity:', commodity);
    
    const variety = commodity?.varieties?.find((v: any) => v.varietyName === varietyName);
    console.log('Found variety:', variety);
    
    const particulars = variety?.particulars || [];
    console.log('Returning particulars:', particulars);
    
    return particulars;
  };

  // Add handler for lab result input changes
  const handleLabResultChange = (index: number, value: string) => {
    const particulars = getSelectedVarietyParticulars();
    const particular = particulars[index];
    if (!particular) return;

    const { minPercentage, maxPercentage } = particular;
    const numericValue = parseFloat(value);
    let isValid = true;

    if (!isNaN(numericValue)) {
      if (numericValue < minPercentage || numericValue > maxPercentage) {
        isValid = false;
        toast({
          title: "Invalid Value",
          description: `Value for ${particular.name} must be between ${minPercentage}% and ${maxPercentage}%.`,
          variant: "destructive",
        });
      }
    }

    setCurrentEntryForm(f => {
      const updatedResults = [...(f.labResults || [])];
      updatedResults[index] = value;
      
      const updatedValidation = [...(f.labResultsValidation || [])];
      updatedValidation[index] = isValid;

      return { ...f, labResults: updatedResults, labResultsValidation: updatedValidation };
    });
  };

  // Handle edit button click
  const handleEdit = async (row: any) => {
    setIsEditMode(true);
    setEditingRow(row);
    
    // Populate form with row data
    setBaseForm({
      state: row.state || '',
      branch: row.branch || '',
      location: row.location || '',
      warehouseName: row.warehouseName || '',
      warehouseCode: row.warehouseCode || '',
      warehouseAddress: row.warehouseAddress || '',
      businessType: row.businessType || '',
      client: row.client || '',
      clientCode: row.clientCode || '',
      clientAddress: row.clientAddress || '',
      dateOfInward: row.dateOfInward || '',
      cadNumber: row.cadNumber || '',
      attachmentUrl: row.attachmentUrl || '',
      commodity: row.commodity || '',
      varietyName: row.varietyName || '',
      marketRate: row.marketRate || '',
      totalBags: row.totalBags || '',
      totalQuantity: row.totalQuantity || '',
      totalValue: row.totalValue || '',
      bankName: row.bankName || '',
      bankBranch: row.bankBranch || '',
      bankState: row.bankState || '',
      ifscCode: row.ifscCode || '',
      bankReceipt: row.bankReceipt || '',
      billingStatus: row.billingStatus || '',
      reservationRate: row.reservationRate || '',
      reservationQty: row.reservationQty || '',
      reservationStart: row.reservationStart || '',
      reservationEnd: row.reservationEnd || '',
      billingCycle: row.billingCycle || '',
      billingType: row.billingType || '',
      billingRate: row.billingRate || '',
      insuranceManagedBy: row.insuranceManagedBy || '',
      firePolicyNumber: row.firePolicyNumber || '',
      firePolicyAmount: row.firePolicyAmount || '',
      firePolicyStart: row.firePolicyStart || '',
      firePolicyEnd: row.firePolicyEnd || '',
      burglaryPolicyNumber: row.burglaryPolicyNumber || '',
      burglaryPolicyAmount: row.burglaryPolicyAmount || '',
      burglaryPolicyStart: row.burglaryPolicyStart || '',
      burglaryPolicyEnd: row.burglaryPolicyEnd || '',
      firePolicyCompanyName: row.firePolicyCompanyName || '',
      burglaryPolicyCompanyName: row.burglaryPolicyCompanyName || '',
      firePolicyBalance: row.firePolicyBalance || '',
      burglaryPolicyBalance: row.burglaryPolicyBalance || '',
      bankFundedBy: row.bankFundedBy || '',
    });

    // Populate current entry form with row data
    setCurrentEntryForm({
      vehicleNumber: row.vehicleNumber || '',
      getpassNumber: row.getpassNumber || '',
      weightBridge: row.weightBridge || '',
      weightBridgeSlipNumber: row.weightBridgeSlipNumber || '',
      grossWeight: row.grossWeight || '',
      tareWeight: row.tareWeight || '',
      netWeight: row.netWeight || '',
      averageWeight: row.averageWeight || '',
      totalBags: row.totalBags || '',
      totalQuantity: row.totalQuantity || '',
      dateOfSampling: row.dateOfSampling || '',
      dateOfTesting: row.dateOfTesting || '',
      labResults: row.labResults || [],
      labResultsValidation: row.labResultsValidation || [],
      stacks: row.stacks || [{ stackNumber: '', numberOfBags: '' }],
    });

    // Fetch insurance entries from inspection collection if warehouse is selected
    let inspectionInsuranceEntries = [];
    if (row.warehouseName) {
      // Fetch from Firestore to ensure latest data
      const inspectionsCollection = collection(db, 'inspections');
      const q = query(inspectionsCollection, where('warehouseName', '==', row.warehouseName));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const inspectionData = querySnapshot.docs[0].data();
        if (inspectionData.insuranceEntries && Array.isArray(inspectionData.insuranceEntries)) {
          inspectionInsuranceEntries = inspectionData.insuranceEntries;
        } else if (inspectionData.warehouseInspectionData?.insuranceEntries && Array.isArray(inspectionData.warehouseInspectionData.insuranceEntries)) {
          inspectionInsuranceEntries = inspectionData.warehouseInspectionData.insuranceEntries;
        }
      }
    }
    setInsuranceEntries(inspectionInsuranceEntries);

    setShowAddModal(true);

    // Auto-select insurance by insuranceTakenBy and insuranceId
    if (row.selectedInsurance) {
      const idx = inspectionInsuranceEntries.findIndex(
        (ins: any) => ins.insuranceId === row.selectedInsurance.insuranceId &&
                      ins.insuranceTakenBy === row.selectedInsurance.insuranceTakenBy
      );
      if (idx !== -1) {
        setSelectedInsuranceInfoIndex(idx);
        setSelectedInsuranceIndex(idx);
      }
      setInsuranceReadOnly(true);
    } else {
      setInsuranceReadOnly(false);
    }

    // In handleEdit, after setting insuranceEntries and before setShowAddModal(true):
    if (row.selectedInsurance && inspectionInsuranceEntries.length > 0) {
      const match = inspectionInsuranceEntries.find(
        (ins: any) =>
          ins.insuranceId === row.selectedInsurance.insuranceId &&
          ins.insuranceTakenBy === row.selectedInsurance.insuranceTakenBy
      );
      
      console.log('=== EDIT MODE INSURANCE DEBUG ===');
      console.log('Row selectedInsurance:', row.selectedInsurance);
      console.log('Found insurance match:', match);
      console.log('Insurance data types:', {
        firePolicyAmount: match?.firePolicyAmount,
        firePolicyAmountType: typeof match?.firePolicyAmount,
        burglaryPolicyAmount: match?.burglaryPolicyAmount,
        burglaryPolicyAmountType: typeof match?.burglaryPolicyAmount
      });
      console.log('=== END EDIT MODE INSURANCE DEBUG ===');
      
      setYourInsurance(match || null);
    } else {
      setYourInsurance(null);
    }
  };

  // Handle delete button click
  const handleDelete = async (row: any) => {
    if (confirm('Are you sure you want to delete this inward entry? This action cannot be undone.')) {
      try {
        // Delete from Firebase
        const inwardCollection = collection(db, 'inward');
        const q = query(inwardCollection, where('inwardId', '==', row.inwardId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docRef = doc(db, 'inward', querySnapshot.docs[0].id);
          await deleteDoc(docRef);
          
          toast({
            title: "Success",
            description: "Inward entry deleted successfully.",
            variant: "default",
          });
          
          // Refresh data
          setDataVersion(v => v + 1);
        }
      } catch (error) {
        console.error('Error deleting inward entry:', error);
        toast({
          title: "Error",
          description: "Failed to delete inward entry. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Handle view SR button click
  const handleViewSR = async (row: any) => {
    setSelectedRowForSR(row);
    setShowSRForm(true);
    setRemarks(row.remarks || '');
    setHologramNumber(row.hologramNumber || '');
    if (row.srGenerationDate) {
      setSrGenerationDate(row.srGenerationDate);
    } else {
      setSrGenerationDate('');
    }
    
    // Fetch insurance data from inspection collection
    try {
      const inspectionsCollection = collection(db, 'inspections');
      const q = query(inspectionsCollection, where('warehouseName', '==', row.warehouseName));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const inspectionData = querySnapshot.docs[0].data();
        let insuranceEntries: any[] = [];
        
        // Check multiple possible locations for insurance data
        if (inspectionData.insuranceEntries && Array.isArray(inspectionData.insuranceEntries)) {
          console.log('Found top-level insurance entries:', inspectionData.insuranceEntries.length);
          insuranceEntries = inspectionData.insuranceEntries;
        } else if (inspectionData.warehouseInspectionData?.insuranceEntries && Array.isArray(inspectionData.warehouseInspectionData.insuranceEntries)) {
          console.log('Found nested insurance entries:', inspectionData.warehouseInspectionData.insuranceEntries.length);
          insuranceEntries = inspectionData.warehouseInspectionData.insuranceEntries;
        } else if (inspectionData.warehouseInspectionData) {
          // Legacy format - convert to new format
          const legacyData = inspectionData.warehouseInspectionData;
          if (legacyData.firePolicyNumber || legacyData.burglaryPolicyNumber) {
            console.log('Found legacy insurance format, converting to new format');
            insuranceEntries = [{
              id: `legacy_${Date.now()}`,
              insuranceTakenBy: legacyData.insuranceTakenBy || '',
              insuranceCommodity: legacyData.insuranceCommodity || '',
              clientName: legacyData.clientName || '',
              clientAddress: legacyData.clientAddress || '',
              selectedBankName: legacyData.selectedBankName || '',
              firePolicyCompanyName: legacyData.firePolicyCompanyName || '',
              firePolicyNumber: legacyData.firePolicyNumber || '',
              firePolicyAmount: legacyData.firePolicyAmount || '',
              firePolicyStartDate: legacyData.firePolicyStartDate || null,
              firePolicyEndDate: legacyData.firePolicyEndDate || null,
              burglaryPolicyCompanyName: legacyData.burglaryPolicyCompanyName || '',
              burglaryPolicyNumber: legacyData.burglaryPolicyNumber || '',
              burglaryPolicyAmount: legacyData.burglaryPolicyAmount || '',
              burglaryPolicyStartDate: legacyData.burglaryPolicyStartDate || null,
              burglaryPolicyEndDate: legacyData.burglaryPolicyEndDate || null,
              createdAt: new Date(legacyData.createdAt || Date.now())
            }];
          }
        }
        
        console.log('Insurance entries fetched from inspection:', insuranceEntries);
        setInspectionInsuranceData(insuranceEntries);
      } else {
        console.log('No inspection found for warehouse:', row.warehouseName);
        setInspectionInsuranceData([]);
      }
    } catch (error) {
      console.error('Error fetching insurance data from inspection:', error);
      setInspectionInsuranceData([]);
    }
  };

  // SR/WR View Modal
  const handleApproveSR = async (sr: any) => {
    if (!hologramNumber.trim()) {
      toast({
        title: 'Hologram Number Required',
        description: 'Please enter the hologram number before proceeding.',
        variant: 'destructive',
      });
      return;
    }
    // Update status, srGenerationDate, and hologramNumber in Firestore
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    try {
      const inwardCollection = collection(db, 'inward');
      const q = query(inwardCollection, where('inwardId', '==', sr.inwardId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRef = doc(db, 'inward', querySnapshot.docs[0].id);
        await updateDoc(docRef, { status: 'approve', srGenerationDate: todayISO, hologramNumber });
      }
    } catch (error) {
      console.error('Error updating status to approve:', error);
    }
    setIsFormApproved(true);
    setSrGenerationDate(todayISO);
    toast({
      title: 'Approved Successfully',
      description: 'The receipt has been approved and is now ready for printing.',
      variant: 'default',
    });
    // Update the inward document with remarks
    if (sr && sr.id) {
      const inwardDocRef = doc(db, 'inward', sr.id);
      await updateDoc(inwardDocRef, { remarks });
    }
  };

  const handleRejectSR = async (sr: any) => {
    // Update status in Firestore
    try {
      const inwardCollection = collection(db, 'inward');
      const q = query(inwardCollection, where('inwardId', '==', sr.inwardId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRef = doc(db, 'inward', querySnapshot.docs[0].id);
        await updateDoc(docRef, { status: 'rejected' });
      }
    } catch (error) {
      console.error('Error updating status to rejected:', error);
    }
    setShowSRForm(false);
  };

  const handleResubmitSR = async (sr: any) => {
    // Update status in Firestore
    try {
      const inwardCollection = collection(db, 'inward');
      const q = query(inwardCollection, where('inwardId', '==', sr.inwardId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRef = doc(db, 'inward', querySnapshot.docs[0].id);
        await updateDoc(docRef, { status: 'resubmited' });
      }
    } catch (error) {
      console.error('Error updating status to resubmited:', error);
    }
    setShowSRForm(false);
    // Open edit modal for this entry
    handleEdit(sr);
  };

  const isInsuranceExpired = (sr: any) => {
    // Check if any insurance policy is expired
    const today = new Date();
    // Check inspection insurance data first
    for (const insurance of inspectionInsuranceData) {
      const fireEndDate = insurance.firePolicyEndDate ? new Date(insurance.firePolicyEndDate) : null;
      const burglaryEndDate = insurance.burglaryPolicyEndDate ? new Date(insurance.burglaryPolicyEndDate) : null;
      if (fireEndDate instanceof Date && !isNaN(fireEndDate.getTime()) && fireEndDate < today) {
        return true;
      }
      if (burglaryEndDate instanceof Date && !isNaN(burglaryEndDate.getTime()) && burglaryEndDate < today) {
        return true;
      }
    }
    // Fallback to inward data if no inspection insurance found
    const fireEndDate = sr.firePolicyEnd ? new Date(sr.firePolicyEnd) : null;
    const burglaryEndDate = sr.burglaryPolicyEnd ? new Date(sr.burglaryPolicyEnd) : null;
    if (fireEndDate instanceof Date && !isNaN(fireEndDate.getTime()) && fireEndDate < today) {
      return true;
    }
    if (burglaryEndDate instanceof Date && !isNaN(burglaryEndDate.getTime()) && burglaryEndDate < today) {
      return true;
    }
    return false;
  };

  // Generate a unique SR/WR No based on inwardId, date, and receiptType
  const generateSRNo = (row: any) => {
    if (!row) return '';
    const date = row.dateOfInward ? row.dateOfInward.replace(/-/g, '') : '';
    const prefix = row.receiptType === 'WR' ? 'WR' : 'SR';
    return `${prefix}-${row.inwardId || 'XXX'}-${date}`;
  };

  // In the insurance selection section, update the calculation:
  const calculateRemainingAmounts = (ins: any) => {
    // Sum totalValue from all inward entries for this insurance
    const totalInwardValue = inwardData.filter((entry: any) =>
      entry.warehouseName === form.warehouseName &&
      entry.firePolicyNumber === ins.firePolicyNumber &&
      entry.burglaryPolicyNumber === ins.burglaryPolicyNumber
    ).reduce((sum: number, entry: any) => sum + (parseFloat(entry.totalValue) || 0), 0);
    const firePolicyAmt = parseFloat(ins.firePolicyAmount) || 0;
    const burglaryPolicyAmt = parseFloat(ins.burglaryPolicyAmount) || 0;
    setRemainingFirePolicy((firePolicyAmt - totalInwardValue).toFixed(2));
    setRemainingBurglaryPolicy((burglaryPolicyAmt - totalInwardValue).toFixed(2));
  };

  // Print handler using html2canvas and jsPDF with new layout
  const handlePrint = async () => {
    console.log('Print button clicked');
    if (!printableReceiptRef.current) {
      toast({ title: 'Error', description: 'Print ref not available. Please try again.', variant: 'destructive' });
      return;
    }
    setIsPrinting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      // Wait a moment for the component to render
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(printableReceiptRef.current, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#fff',
        logging: true,
        allowTaint: false,
        height: printableReceiptRef.current.scrollHeight,
        width: printableReceiptRef.current.scrollWidth
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const receiptType = selectedRowForSR?.receiptType === 'WR' ? 'warehouse' : 'storage';
      pdf.save(`${receiptType}-receipt-${selectedRowForSR?.inwardId || 'document'}.pdf`);
      
      toast({ 
        title: 'PDF Generated', 
        description: `The ${receiptType} receipt PDF has been downloaded successfully.`, 
        variant: 'default' 
      });
    } catch (err) {
      console.error('PDF generation error:', err);
      toast({ title: 'Error', description: 'Failed to generate PDF. See console for details.', variant: 'destructive' });
    } finally {
      setIsPrinting(false);
    }
  };

  // Update insurance selection logic to fetch and display remaining values from Firestore
  const handleInsuranceSelect = async (idx: number) => {
    setSelectedInsuranceIndex(idx);
    const ins = insuranceEntries[idx];
    setBaseForm(f => ({
      ...f,
      insuranceManagedBy: ins.insuranceTakenBy || '',
      firePolicyNumber: ins.firePolicyNumber || '',
      firePolicyAmount: ins.firePolicyAmount || '',
      firePolicyStart: ins.firePolicyStartDate || '',
      firePolicyEnd: ins.firePolicyEndDate || '',
      burglaryPolicyNumber: ins.burglaryPolicyNumber || '',
      burglaryPolicyAmount: ins.burglaryPolicyAmount || '',
      burglaryPolicyStart: ins.burglaryPolicyStartDate || '',
      burglaryPolicyEnd: ins.burglaryPolicyEndDate || '',
      firePolicyCompanyName: ins.firePolicyCompanyName || '',
      burglaryPolicyCompanyName: ins.burglaryPolicyCompanyName || '',
      bankFundedBy: ins.selectedBankName || '',
    }));
    // Fetch latest remaining values from Firestore
    const inspectionsCollection = collection(db, 'inspections');
    const q = query(inspectionsCollection, where('warehouseName', '==', form.warehouseName));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const inspectionData = querySnapshot.docs[0].data();
      let insuranceList = inspectionData.insuranceEntries || [];
      if (!Array.isArray(insuranceList) && inspectionData.warehouseInspectionData?.insuranceEntries) {
        insuranceList = inspectionData.warehouseInspectionData.insuranceEntries;
      }
      const firestoreIns = insuranceList.find((i: any) => i.firePolicyNumber === ins.firePolicyNumber && i.burglaryPolicyNumber === ins.burglaryPolicyNumber);
      setInitialRemainingFire(firestoreIns?.remainingFirePolicyAmount || ins.firePolicyAmount || '');
      setInitialRemainingBurglary(firestoreIns?.remainingBurglaryPolicyAmount || ins.burglaryPolicyAmount || '');
    } else {
      setInitialRemainingFire(ins.firePolicyAmount || '');
      setInitialRemainingBurglary(ins.burglaryPolicyAmount || '');
    }
  };

  // Handle insurance selection in information section
  const handleInsuranceInfoSelect = async (idx: number) => {
    setSelectedInsuranceInfoIndex(idx);
    const ins = filteredInsuranceInfoEntries[idx];
    
    console.log('=== INSURANCE SELECTION DEBUG ===');
    console.log('Selected insurance index:', idx);
    console.log('Selected insurance data:', ins);
    console.log('Fire Policy Amount (raw):', ins?.firePolicyAmount, 'Type:', typeof ins?.firePolicyAmount);
    console.log('Burglary Policy Amount (raw):', ins?.burglaryPolicyAmount, 'Type:', typeof ins?.burglaryPolicyAmount);
    
    try {
      let foundInsurance = null;
      
      // Find insurance based on sourceDocumentId and insuranceId
      if (ins.sourceDocumentId && ins.insuranceId) {
        if (ins.sourceCollection === 'clients') {
          // Find insurance in clients collection by sourceDocumentId and insuranceId
          try {
            const clientDocRef = doc(db, 'clients', ins.sourceDocumentId);
            const clientDocSnap = await getDoc(clientDocRef);
            
            if (clientDocSnap.exists()) {
              const clientData = clientDocSnap.data() as any;
              const insurances = clientData.insurances || [];
              console.log('Client insurances found:', insurances.length);
              console.log('Looking for insuranceId:', ins.insuranceId);
              
              foundInsurance = insurances.find((insurance: any) => {
                console.log('Checking insurance:', insurance.insuranceId, 'against:', ins.insuranceId);
                return insurance.insuranceId === ins.insuranceId;
              });
              
              if (foundInsurance) {
                console.log('Found client insurance:', foundInsurance);
                // Use remaining amounts from client insurance if available, otherwise use policy amounts
                const initialFire = foundInsurance.remainingFirePolicyAmount || foundInsurance.firePolicyAmount || ins.firePolicyAmount || '';
                const initialBurglary = foundInsurance.remainingBurglaryPolicyAmount || foundInsurance.burglaryPolicyAmount || ins.burglaryPolicyAmount || '';
                
                console.log('Client insurance - Initial Fire:', initialFire, 'Type:', typeof initialFire);
                console.log('Client insurance - Initial Burglary:', initialBurglary, 'Type:', typeof initialBurglary);
                
                setInitialRemainingFire(initialFire);
                setInitialRemainingBurglary(initialBurglary);
              } else {
                console.log('Insurance not found in client data');
              }
            } else {
              console.log('Client document not found with ID:', ins.sourceDocumentId);
            }
          } catch (error) {
            console.error('Error finding client insurance:', error);
          }
        } else if (ins.sourceCollection === 'agrogreen') {
          // Find insurance in agrogreen collection by sourceDocumentId (which is the document ID)
          try {
            const agrogreenDocRef = doc(db, 'agrogreen', ins.sourceDocumentId);
            const agrogreenDocSnap = await getDoc(agrogreenDocRef);
            
            if (agrogreenDocSnap.exists()) {
              foundInsurance = agrogreenDocSnap.data();
              
              if (foundInsurance) {
                console.log('Found Agrogreen insurance:', foundInsurance);
                // Use remaining amounts from Agrogreen insurance if available, otherwise use policy amounts
                const initialFire = foundInsurance.remainingFirePolicyAmount || foundInsurance.firePolicyAmount || ins.firePolicyAmount || '';
                const initialBurglary = foundInsurance.remainingBurglaryPolicyAmount || foundInsurance.burglaryPolicyAmount || ins.burglaryPolicyAmount || '';
                
                console.log('Agrogreen insurance - Initial Fire:', initialFire, 'Type:', typeof initialFire);
                console.log('Agrogreen insurance - Initial Burglary:', initialBurglary, 'Type:', typeof initialBurglary);
                
                setInitialRemainingFire(initialFire);
                setInitialRemainingBurglary(initialBurglary);
              }
            } else {
              console.log('Agrogreen document not found with ID:', ins.sourceDocumentId);
            }
          } catch (error) {
            console.error('Error finding Agrogreen insurance:', error);
          }
        }
      }
      
      // Fallback: If no sourceDocumentId or insuranceId, use the existing logic
      if (!foundInsurance) {
        console.log('No sourceDocumentId or insuranceId found, using fallback logic');
        // Fetch latest remaining values from Firestore
        const inspectionsCollection = collection(db, 'inspections');
        const q = query(inspectionsCollection, where('warehouseName', '==', form.warehouseName));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const inspectionData = querySnapshot.docs[0].data();
          let insuranceList = inspectionData.insuranceEntries || [];
          if (!Array.isArray(insuranceList) && inspectionData.warehouseInspectionData?.insuranceEntries) {
            insuranceList = inspectionData.warehouseInspectionData.insuranceEntries;
          }
          const firestoreIns = insuranceList.find((i: any) => i.firePolicyNumber === ins.firePolicyNumber && i.burglaryPolicyNumber === ins.burglaryPolicyNumber);
          
          console.log('Found Firestore insurance:', firestoreIns);
          
          // Use remaining values if they exist, otherwise use policy amounts
          const initialFire = firestoreIns?.remainingFirePolicyAmount || ins.firePolicyAmount || '';
          const initialBurglary = firestoreIns?.remainingBurglaryPolicyAmount || ins.burglaryPolicyAmount || '';
          
          console.log('Fallback - Initial Fire:', initialFire, 'Type:', typeof initialFire);
          console.log('Fallback - Initial Burglary:', initialBurglary, 'Type:', typeof initialBurglary);
          
          setInitialRemainingFire(initialFire);
          setInitialRemainingBurglary(initialBurglary);
        } else {
          // If no Firestore data, use policy amounts
          const initialFire = ins.firePolicyAmount || '';
          const initialBurglary = ins.burglaryPolicyAmount || '';
          
          console.log('No Firestore data - Initial Fire:', initialFire, 'Type:', typeof initialFire);
          console.log('No Firestore data - Initial Burglary:', initialBurglary, 'Type:', typeof initialBurglary);
          
          setInitialRemainingFire(initialFire);
          setInitialRemainingBurglary(initialBurglary);
        }
      }
    } catch (error) {
      console.error('Error finding insurance:', error);
      // Fallback to policy amounts on error
      const initialFire = ins.firePolicyAmount || '';
      const initialBurglary = ins.burglaryPolicyAmount || '';
      
      console.log('Error fallback - Initial Fire:', initialFire, 'Type:', typeof initialFire);
      console.log('Error fallback - Initial Burglary:', initialBurglary, 'Type:', typeof initialBurglary);
      
      setInitialRemainingFire(initialFire);
      setInitialRemainingBurglary(initialBurglary);
    }
    console.log('=== END INSURANCE SELECTION DEBUG ===');
  };

  // Debug function to examine client insurance data structure
  const debugClientInsuranceData = async (clientId: string, insuranceId: string) => {
    try {
      console.log('=== DEBUGGING CLIENT INSURANCE DATA ===');
      console.log('Client ID:', clientId);
      console.log('Insurance ID:', insuranceId);
      
      const clientDocRef = doc(db, 'clients', clientId);
      const clientDocSnap = await getDoc(clientDocRef);
      
      if (clientDocSnap.exists()) {
        const clientData = clientDocSnap.data() as any;
        console.log('Client data structure:', Object.keys(clientData));
        
        const insurances = clientData.insurances || [];
        console.log('Number of insurances:', insurances.length);
        
        insurances.forEach((insurance: any, index: number) => {
          console.log(`Insurance ${index + 1}:`, {
            insuranceId: insurance.insuranceId,
            firePolicyAmount: insurance.firePolicyAmount,
            burglaryPolicyAmount: insurance.burglaryPolicyAmount,
            remainingFirePolicyAmount: insurance.remainingFirePolicyAmount,
            remainingBurglaryPolicyAmount: insurance.remainingBurglaryPolicyAmount,
            firePolicyNumber: insurance.firePolicyNumber,
            burglaryPolicyNumber: insurance.burglaryPolicyNumber
          });
        });
        
        const targetInsurance = insurances.find((insurance: any) => insurance.insuranceId === insuranceId);
        if (targetInsurance) {
          console.log('Target insurance found:', targetInsurance);
        } else {
          console.log('Target insurance not found');
        }
      } else {
        console.log('Client document does not exist');
      }
      console.log('=== END DEBUGGING ===');
    } catch (error) {
      console.error('Error debugging client insurance data:', error);
    }
  };

  // Helper function to format amount values
  const formatAmount = (amount: any): string => {
    if (amount === null || amount === undefined || amount === '') {
      return '0.00';
    }
    
    // Convert to number if it's a string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    
    // Check if it's a valid number
    if (isNaN(numAmount)) {
      console.warn('Invalid amount value:', amount, 'Type:', typeof amount);
      return '0.00';
    }
    
    return numAmount.toFixed(2);
  };

  // Recalculate remaining amounts when total value or initial amounts change
  useEffect(() => {
    if (selectedInsuranceInfoIndex !== null && (initialRemainingFire || initialRemainingBurglary)) {
      const totalValue = parseFloat(baseForm.totalValue) || 0;
      const initialFire = parseFloat(initialRemainingFire) || 0;
      const initialBurglary = parseFloat(initialRemainingBurglary) || 0;
      
      const remainingFire = initialFire - totalValue;
      const remainingBurglary = initialBurglary - totalValue;
      
      setRemainingFirePolicy(remainingFire >= 0 ? remainingFire.toFixed(2) : '0.00');
      setRemainingBurglaryPolicy(remainingBurglary >= 0 ? remainingBurglary.toFixed(2) : '0.00');
    }
  }, [selectedInsuranceInfoIndex, initialRemainingFire, initialRemainingBurglary, baseForm.totalValue]);

  // Add remarks state in InwardPage component
  const [remarks, setRemarks] = useState('');

  // ... inside InwardPage component, after other useState hooks ...
  const [isPrinting, setIsPrinting] = useState(false);
  // ... rest of the code unchanged ...

  // ... inside InwardPage component, after other useState hooks ...
  const [showPrintDebug, setShowPrintDebug] = useState(false);
  // ...
  // Add a toggle button for debug mode above the DialogContent/modal rendering:
  <div className="flex justify-end mb-2">
    <Button onClick={() => setShowPrintDebug(v => !v)} className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-1 text-xs">
      {showPrintDebug ? 'Hide Print Debug' : 'Show Print Debug'}
    </Button>
  </div>
  // ...
  // Render the print area visibly if debug is on, otherwise keep it hidden as before:
  {(isFormApproved || selectedRowForSR?.status === 'approve') && (
    <div style={showPrintDebug ? { position: 'static', margin: '32px 0', zIndex: 1000, background: '#fff' } : { position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
      <div ref={printRef}>
        <StorageReceipt
          data={{
            srNo: generateSRNo(selectedRowForSR),
            srGenerationDate: srGenerationDate || '-',
            dateOfIssue: selectedRowForSR?.dateOfInward || '',
            baseReceiptNo: selectedRowForSR?.baseReceiptNo || selectedRowForSR?.bankReceipt || '-',
            cadNo: selectedRowForSR?.cadNo || selectedRowForSR?.cadNumber || '',
            dateOfDeposit: selectedRowForSR?.dateOfInward || '',
            branch: selectedRowForSR?.branch || '-',
            warehouseName: selectedRowForSR?.warehouseName || '',
            warehouseAddress: selectedRowForSR?.warehouseAddress || '',
            client: selectedRowForSR?.client || '',
            clientAddress: selectedRowForSR?.clientAddress || '',
            commodity: selectedRowForSR?.commodity || '',
            totalBags: selectedRowForSR?.totalBags || '',
            netWeight: selectedRowForSR?.totalQuantity || '',
            grade: selectedRowForSR?.grade || '-',
            remarks: selectedRowForSR?.remarks || '-',
            marketRate: selectedRowForSR?.marketRate || '',
            valueOfCommodity: selectedRowForSR?.totalValue || '',
            hologramNumber: hologramNumber || '',
            insuranceDetails: [
              {
                policyNo: inspectionInsuranceData[0]?.firePolicyNumber || '-',
                company: inspectionInsuranceData[0]?.firePolicyCompanyName || '-',
                validFrom: inspectionInsuranceData[0]?.firePolicyStartDate ? normalizeDate(inspectionInsuranceData[0]?.firePolicyStartDate) : '-',
                validTo: inspectionInsuranceData[0]?.firePolicyEndDate ? normalizeDate(inspectionInsuranceData[0]?.firePolicyEndDate) : '-',
                sumInsured: inspectionInsuranceData[0]?.firePolicyAmount || '-',
              },
            ],
            bankName: selectedRowForSR?.bankName || '',
            date: selectedRowForSR?.dateOfInward || '',
            place: selectedRowForSR?.branch || '',
            stockInwardDate: selectedRowForSR?.dateOfInward || '-',
            receiptType: selectedRowForSR?.receiptType || 'SR',
            varietyName: selectedRowForSR?.varietyName || '',
            dateOfSampling: selectedRowForSR?.dateOfSampling || '',
            dateOfTesting: selectedRowForSR?.dateOfTesting || '',
          }}
        />
      </div>
      <div ref={testCertRef}>
        <TestCertificate
          client={selectedRowForSR?.client || ''}
          clientAddress={selectedRowForSR?.clientAddress || ''}
          commodity={selectedRowForSR?.commodity || ''}
          varietyName={selectedRowForSR?.varietyName || ''}
          warehouseName={selectedRowForSR?.warehouseName || ''}
          warehouseAddress={selectedRowForSR?.warehouseAddress || ''}
          totalBags={selectedRowForSR?.totalBags || ''}
          dateOfSampling={selectedRowForSR?.dateOfSampling || ''}
          dateOfTesting={selectedRowForSR?.dateOfTesting || ''}
          qualityParameters={(() => {
            const commodity = commodities.find((c: any) => c.commodityName === selectedRowForSR?.commodity);
            const variety = commodity?.varieties?.find((v: any) => v.varietyName === selectedRowForSR?.varietyName);
            const particulars = variety?.particulars || [];
            return particulars.map((p: any, idx: number) => ({
              name: p.name,
              minPercentage: p.minPercentage,
              maxPercentage: p.maxPercentage,
              actual: selectedRowForSR?.labResults?.[idx] || '',
            }));
          })()}
        />
      </div>
    </div>
  )}
  // ... rest unchanged ...

  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => columns.map(col => col.accessorKey));

  // Helper to get all column keys (excluding action/alert if you want to always show them)
  const allColumnKeys = columns.map(col => col.accessorKey);

  // Filter columns based on visibleColumnKeys
  const visibleColumns = useMemo(() => {
    return columns.filter(col => visibleColumnKeys.includes(col.accessorKey));
  }, [columns, visibleColumnKeys]);

  return (
    <DashboardLayout>
      {/* Module title and dashboard button row */}
      <div className="flex items-center justify-between mt-4 mb-10 px-8">
        <Button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-2xl font-semibold shadow-lg rounded-xl flex items-center gap-2" onClick={() => router.push('/dashboard')}>
          <span className="text-2xl">&#8592;</span> Dashboard
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-orange-600 inline-block border-b-4 border-[#1aad4b] pb-2 px-10 py-1 bg-orange-50 rounded-xl shadow" style={{ letterSpacing: '0.02em' }}>
            Inward Module
          </h1>
        </div>
        <Button className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-lg font-semibold shadow-lg rounded-xl" onClick={() => {
          setIsEditMode(false);
          setEditingRow(null);
          resetForm();
          setShowAddModal(true);
        }}>
          + Add Inward
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
                placeholder="Search by state, branch, location, warehouse name, client, or receipt type..."
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
      
      {/* Data Table */}
      <div className="px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700 text-xl">Inward Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-2">
                <label className="font-semibold text-sm">Sort by Inward Code:</label>
                <button
                  onClick={() => setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))}
                  className="ml-1 px-2 py-1 border rounded text-lg"
                  title={sortDirection === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                  type="button"
                >
                  {sortDirection === 'asc' ? '▲' : '▼'}
                </button>
              </div>
              {/* Column Visibility Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-2">Columns</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={visibleColumnKeys.length === allColumnKeys.length}
                    onCheckedChange={checked => {
                      if (checked) setVisibleColumnKeys(allColumnKeys);
                      else setVisibleColumnKeys([]);
                    }}
                  >
                    Select All
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {columns.map(col => (
                    <DropdownMenuCheckboxItem
                      key={col.accessorKey}
                      checked={visibleColumnKeys.includes(col.accessorKey)}
                      onCheckedChange={checked => {
                        setVisibleColumnKeys(prev =>
                          checked
                            ? [...prev, col.accessorKey]
                            : prev.filter(k => k !== col.accessorKey)
                        );
                      }}
                    >
                      {typeof col.header === 'string' ? col.header : col.accessorKey}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <DataTable
              columns={visibleColumns}
              data={filteredData}
              isLoading={loading}
              error={error || undefined}
              wrapperClassName="border-green-300"
              headClassName="text-center bg-orange-100 text-orange-600 font-bold"
              cellClassName="text-center"
            />
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Inward Modal */}
      <Dialog open={showAddModal} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-orange-700 text-xl">
              {isEditMode ? 'Edit Inward' : 'Add Inward'}
            </DialogTitle>
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
                <Select value={form.warehouseName} onValueChange={async (warehouseName) => {
                  setBaseForm(f => ({ 
                    ...f, 
                    warehouseName: warehouseName,
                    warehouseCode: '',
                    warehouseAddress: '',
                    businessType: '',
                    // Clear insurance data when warehouse changes
                    insuranceManagedBy: '',
                    firePolicyNumber: '',
                    firePolicyAmount: '',
                    firePolicyStart: '',
                    firePolicyEnd: '',
                    burglaryPolicyNumber: '',
                    burglaryPolicyAmount: '',
                    burglaryPolicyStart: '',
                    burglaryPolicyEnd: '',
                    firePolicyCompanyName: '',
                    burglaryPolicyCompanyName: '',
                    bankFundedBy: '',
                  }));
                  
                  // Reset insurance type and selection when warehouse changes
                  setSelectedInsuranceType('all');
                  setSelectedInsuranceIndex(null);
                  setSelectedInsuranceInfoType('');
                  setSelectedInsuranceInfoIndex(null);
                  
                  const selectedWarehouse = filteredWarehouses.find((w: any) => w.warehouseName === warehouseName);
                    if (selectedWarehouse) {
                      setBaseForm(f => ({
                        ...f,
                        warehouseCode: selectedWarehouse.warehouseCode || '',
                        warehouseAddress: selectedWarehouse.warehouseInspectionData?.address || selectedWarehouse.warehouseAddress || '',
                        businessType: selectedWarehouse.businessType || '',
                        // Auto-fill bank information from inspection
                        bankName: selectedWarehouse.bankName || '',
                        bankBranch: selectedWarehouse.bankBranch || '',
                        bankState: selectedWarehouse.bankState || '',
                        ifscCode: selectedWarehouse.ifscCode || ''
                      }));
                      
                      // Fetch insurance entries from inspection module
                    let insuranceEntries: any[] = [];
                    
                    // First check if insurance data is already loaded with the warehouse
                    if (selectedWarehouse.insuranceEntries && selectedWarehouse.insuranceEntries.length > 0) {
                      insuranceEntries = selectedWarehouse.insuranceEntries;
                      console.log('Insurance entries from loaded warehouse data:', insuranceEntries);
                    } else {
                      // If not loaded, fetch from inspection collection
                      try {
                        const inspectionsCollection = collection(db, 'inspections');
                        const q = query(inspectionsCollection, where('warehouseName', '==', warehouseName));
                        const querySnapshot = await getDocs(q);
                        
                        if (!querySnapshot.empty) {
                          const inspectionData = querySnapshot.docs[0].data();
                          
                          // Check multiple possible locations for insurance data
                          if (inspectionData.insuranceEntries && Array.isArray(inspectionData.insuranceEntries)) {
                            console.log('Found top-level insurance entries:', inspectionData.insuranceEntries.length);
                            insuranceEntries = inspectionData.insuranceEntries;
                          } else if (inspectionData.warehouseInspectionData?.insuranceEntries && Array.isArray(inspectionData.warehouseInspectionData.insuranceEntries)) {
                            console.log('Found nested insurance entries:', inspectionData.warehouseInspectionData.insuranceEntries.length);
                            insuranceEntries = inspectionData.warehouseInspectionData.insuranceEntries;
                          } else if (inspectionData.warehouseInspectionData) {
                            // Legacy format - convert to new format
                            const legacyData = inspectionData.warehouseInspectionData;
                            if (legacyData.firePolicyNumber || legacyData.burglaryPolicyNumber) {
                              console.log('Found legacy insurance format, converting to new format');
                              insuranceEntries = [{
                                id: `legacy_${Date.now()}`,
                                insuranceTakenBy: legacyData.insuranceTakenBy || '',
                                insuranceCommodity: legacyData.insuranceCommodity || '',
                                clientName: legacyData.clientName || '',
                                clientAddress: legacyData.clientAddress || '',
                                selectedBankName: legacyData.selectedBankName || '',
                                firePolicyCompanyName: legacyData.firePolicyCompanyName || '',
                                firePolicyNumber: legacyData.firePolicyNumber || '',
                                firePolicyAmount: legacyData.firePolicyAmount || '',
                                firePolicyStartDate: legacyData.firePolicyStartDate || null,
                                firePolicyEndDate: legacyData.firePolicyEndDate || null,
                                burglaryPolicyCompanyName: legacyData.burglaryPolicyCompanyName || '',
                                burglaryPolicyNumber: legacyData.burglaryPolicyNumber || '',
                                burglaryPolicyAmount: legacyData.burglaryPolicyAmount || '',
                                burglaryPolicyStartDate: legacyData.burglaryPolicyStartDate || null,
                                burglaryPolicyEndDate: legacyData.burglaryPolicyEndDate || null,
                                createdAt: new Date(legacyData.createdAt || Date.now())
                              }];
                            }
                          }
                        }
                      } catch (error) {
                        console.error('Error fetching insurance data from inspection:', error);
                      }
                    }
                    
                    // Debug insurance entries before setting
                    console.log('=== INSURANCE ENTRIES DEBUG ===');
                    console.log('Warehouse:', warehouseName);
                    console.log('Insurance entries count:', insuranceEntries.length);
                    insuranceEntries.forEach((entry: any, index: number) => {
                      console.log(`Entry ${index + 1}:`, {
                        id: entry.id,
                        insuranceId: entry.insuranceId,
                        firePolicyAmount: entry.firePolicyAmount,
                        firePolicyAmountType: typeof entry.firePolicyAmount,
                        burglaryPolicyAmount: entry.burglaryPolicyAmount,
                        burglaryPolicyAmountType: typeof entry.burglaryPolicyAmount,
                        firePolicyNumber: entry.firePolicyNumber,
                        burglaryPolicyNumber: entry.burglaryPolicyNumber
                      });
                    });
                    console.log('=== END INSURANCE ENTRIES DEBUG ===');
                    
                    setInsuranceEntries(insuranceEntries);
                    console.log('Insurance entries set for warehouse:', warehouseName, insuranceEntries);
                  } else {
                    setInsuranceEntries([]);
                  }
                }} disabled={!form.location}>
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
                <Select value={form.businessType} onValueChange={v => setBaseForm(f => ({ ...f, businessType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Business Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cm">Collateral Management (CM)</SelectItem>
                    <SelectItem value="pwh">Professional Warehousing (PWH)</SelectItem>
                    <SelectItem value="ncdex">NCDEX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="block font-semibold mb-1">Warehouse Address</Label>
              <Input value={form.warehouseAddress} onChange={e => setBaseForm(f => ({ ...f, warehouseAddress: e.target.value }))} placeholder="Enter warehouse address" />
            </div>
              <div>
                <Label className="block font-semibold mb-1">Client Name</Label>
                <Select value={form.client} onValueChange={v => setBaseForm(f => ({ ...f, client: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => <SelectItem key={c.firmName} value={c.firmName}>{c.firmName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="block font-semibold mb-1">Client Code</Label>
                <Input value={form.clientCode} readOnly placeholder="Auto-filled" />
              </div>
              <div>
                <Label className="block font-semibold mb-1">Client Address</Label>
                <Input 
                  value={form.clientAddress} 
                  onChange={e => setBaseForm(f => ({ ...f, clientAddress: e.target.value }))} 
                  placeholder="Enter client address"
                />
              </div>
            </div>

            {/* Inward Details */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4 text-orange-700">Inward Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block font-semibold mb-1">Base Receipt</Label>
                  <Input 
                    value={form.bankReceipt} 
                    onChange={e => setBaseForm(f => ({ ...f, bankReceipt: e.target.value }))} 
                    placeholder="Enter Base Receipt Number"
                  />
                </div>
              </div>
            </div>

            {/* Commodity Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-6 text-orange-700">Commodity Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label className="block font-semibold mb-2">Commodity <span className="text-red-500">*</span></Label>
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
                  <Label className="block font-semibold mb-2">Variety Name <span className="text-red-500">*</span></Label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                  <Label className="block font-semibold mb-2">Market Rate (Rs/MT) <span className="text-red-500">*</span></Label>
                <Input 
                    type="text"
                    value={form.marketRate} 
                    onChange={e => setBaseForm(f => ({ ...f, marketRate: e.target.value }))} 
                    placeholder="Enter Market Rate"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Total Bags <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    value={baseForm.totalBags}
                    readOnly
                    placeholder="Auto-calculated from entries"
                    className="bg-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block font-semibold mb-2">Total Quantity (MT) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    step="0.001"
                    value={baseForm.totalQuantity}
                    readOnly
                    placeholder="Auto-calculated from entries"
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Total Value (Rs/MT)</Label>
                  <Input 
                    value={baseForm.totalValue}
                  readOnly 
                    placeholder="Auto-calculated"
                    className="bg-gray-50"
                />
                </div>
              </div>
            </div>

            {/* Bank Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-6 text-orange-700">Bank Information (Auto-filled from Inspection)</h3>
              
              <div className="mb-6">
                <Label className="block font-semibold mb-2">Bank Name</Label>
                <Input value={form.bankName} readOnly placeholder="Auto-filled from inspection" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label className="block font-semibold mb-2">Bank Branch</Label>
                  <Input value={form.bankBranch} readOnly placeholder="Auto-filled from inspection" />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Bank State</Label>
                  <Input value={form.bankState} readOnly placeholder="Auto-filled from inspection" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block font-semibold mb-2">IFSC Code</Label>
                  <Input value={form.ifscCode} readOnly placeholder="Auto-filled from inspection" />
                </div>
              </div>
            </div>

            {/* Reservation/Billing Information */}
            {form.businessType !== 'cm' && form.billingStatus && (
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

            {/* Insurance Information (From Inspection Module) */}
            {!isEditMode && insuranceEntries.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold mb-6 text-orange-700">Insurance Information (From Inspection Module)</h3>
                
                                {/* Insurance Type Selection for Information */}
                <div className="mb-6">
                  <Label className="block font-semibold mb-2">Select Insurance Type to View Details</Label>
                  <Select
                    value={selectedInsuranceInfoType}
                    onValueChange={(value) => {
                      setSelectedInsuranceInfoType(value);
                      setSelectedInsuranceInfoIndex(null); // Reset selection when type changes
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select Insurance Type to View Details" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warehouse owner">Warehouse Owner</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="agrogreen">Agrogreen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Insurance Selection Dropdown */}
                {selectedInsuranceInfoType && filteredInsuranceInfoEntries.length > 0 && (
                  <div className="mb-6">
                    <Label className="block font-semibold mb-2">Select Insurance</Label>
                    <Select
                      value={selectedInsuranceInfoIndex !== null ? String(selectedInsuranceInfoIndex) : ''}
                      onValueChange={(value) => handleInsuranceInfoSelect(parseInt(value, 10))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Insurance" /></SelectTrigger>
                      <SelectContent>
                        {filteredInsuranceInfoEntries.map((ins: any, idx: number) => (
                          <SelectItem key={ins.id || idx} value={String(idx)}>
                            {ins.insuranceId || 'N/A'} - {ins.firePolicyNumber} / {ins.burglaryPolicyNumber} (Fire: {formatAmount(ins.firePolicyAmount)}, Burglary: {formatAmount(ins.burglaryPolicyAmount)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Display Insurance Information based on selected insurance only */}
                {selectedInsuranceInfoType && filteredInsuranceInfoEntries.length > 0 && selectedInsuranceInfoIndex !== null && (
                  <div className="space-y-6">
                    {(() => {
                      const insurance = filteredInsuranceInfoEntries[selectedInsuranceInfoIndex];
                      if (!insurance) return null;
                      return (
                        <div key={insurance.id || selectedInsuranceInfoIndex} className="border border-orange-200 rounded-lg p-6 bg-orange-50">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-medium text-orange-700">Insurance #{selectedInsuranceInfoIndex + 1}</h4>
                            <div className="text-sm text-orange-600 font-medium">
                              {insurance.insuranceId || 'N/A'} - {insurance.insuranceTakenBy} - {insurance.insuranceCommodity}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <Label className="block font-semibold mb-1">Insurance Taken By</Label>
                              <Input value={insurance.insuranceTakenBy || ''} readOnly placeholder="Auto-filled from inspection" />
                            </div>
                            <div>
                              <Label className="block font-semibold mb-1">Commodity</Label>
                              <Input value={insurance.insuranceCommodity || ''} readOnly placeholder="Auto-filled from inspection" />
                            </div>
                          </div>
                          {insurance.insuranceTakenBy === 'client' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <Label className="block font-semibold mb-1">Client Name</Label>
                                <Input value={insurance.clientName || ''} readOnly placeholder="Auto-filled from inspection" />
                              </div>
                              <div>
                                <Label className="block font-semibold mb-1">Client Address</Label>
                                <Input value={insurance.clientAddress || ''} readOnly placeholder="Auto-filled from inspection" />
                              </div>
                            </div>
                          )}
                          {insurance.insuranceTakenBy === 'bank' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <Label className="block font-semibold mb-1">Bank Name</Label>
                                <Input value={insurance.selectedBankName || ''} readOnly placeholder="Auto-filled from inspection" />
                              </div>
                            </div>
                          )}
                          {insurance.insuranceTakenBy && insurance.insuranceTakenBy !== 'bank' && (
                            <>
                              {/* Fire Policy */}
                              <h5 className="text-md font-semibold text-orange-600 mt-4 mb-2">Fire Policy Details</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <Label className="block font-semibold mb-1">Fire Policy Company Name</Label>
                                  <Input value={insurance.firePolicyCompanyName || ''} readOnly placeholder="Auto-filled from inspection" />
                                </div>
                                <div>
                                  <Label className="block font-semibold mb-1">Fire Policy Number</Label>
                                  <Input value={insurance.firePolicyNumber || ''} readOnly placeholder="Auto-filled from inspection" />
                                </div>
                                <div>
                                  <Label className="block font-semibold mb-1">Fire Policy Amount</Label>
                                  <Input value={formatAmount(insurance.firePolicyAmount)} readOnly placeholder="Auto-filled from inspection" />
                                </div>
                                <div>
                                  <Label className="block font-semibold mb-1">Fire Policy Start Date</Label>
                                  <Input value={normalizeDate(insurance.firePolicyStartDate)} readOnly placeholder="Auto-filled from inspection" />
                                </div>
                                <div>
                                  <Label className="block font-semibold mb-1">Fire Policy End Date</Label>
                                  <Input value={normalizeDate(insurance.firePolicyEndDate)} readOnly placeholder="Auto-filled from inspection" />
                                </div>
                                {selectedInsuranceInfoIndex === selectedInsuranceInfoIndex && (
                                  <>
                                    <div>
                                      <Label className="block font-semibold mb-1">Remaining Fire Policy Amount</Label>
                                      <Input value={formatAmount(initialRemainingFire)} readOnly className="bg-green-50" />
                                    </div>
                                    <div>
                                      <Label className="block font-semibold mb-1">Update Remaining Fire Policy Amount</Label>
                                      <Input value={remainingFirePolicy} readOnly className="bg-blue-50" />
                                    </div>
                                  </>
                                )}
                              </div>
                              {/* Burglary Policy */}
                              <h5 className="text-md font-semibold text-orange-600 mt-4 mb-2">Burglary Policy Details</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="block font-semibold mb-1">Burglary Policy Company Name</Label>
                                  <Input value={insurance.burglaryPolicyCompanyName || ''} readOnly placeholder="Auto-filled from inspection" />
                                </div>
                                <div>
                                  <Label className="block font-semibold mb-1">Burglary Policy Number</Label>
                                  <Input value={insurance.burglaryPolicyNumber || ''} readOnly placeholder="Auto-filled from inspection" />
                                </div>
                                <div>
                                  <Label className="block font-semibold mb-1">Burglary Policy Amount</Label>
                                  <Input value={formatAmount(insurance.burglaryPolicyAmount)} readOnly placeholder="Auto-filled from inspection" />
                                </div>
                                <div>
                                  <Label className="block font-semibold mb-1">Burglary Policy Start Date</Label>
                                  <Input value={normalizeDate(insurance.burglaryPolicyStartDate)} readOnly placeholder="Auto-filled from inspection" />
                                </div>
                                <div>
                                  <Label className="block font-semibold mb-1">Burglary Policy End Date</Label>
                                  <Input value={normalizeDate(insurance.burglaryPolicyEndDate)} readOnly placeholder="Auto-filled from inspection" />
                                </div>
                                {selectedInsuranceInfoIndex === selectedInsuranceInfoIndex && (
                                  <>
                                    <div>
                                      <Label className="block font-semibold mb-1">Remaining Burglary Policy Amount</Label>
                                      <Input value={formatAmount(initialRemainingBurglary)} readOnly className="bg-green-50" />
                                    </div>
                                    <div>
                                      <Label className="block font-semibold mb-1">Update Remaining Burglary Policy Amount</Label>
                                      <Input value={remainingBurglaryPolicy} readOnly className="bg-blue-50" />
                                    </div>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Show message when no insurance found for selected type */}
                {selectedInsuranceInfoType && filteredInsuranceInfoEntries.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      <strong>Note:</strong> No insurance data found for the selected type &quot;{selectedInsuranceInfoType}&quot; in this warehouse. 
                      Please ensure insurance data exists in the Warehouse Inspection section.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!isEditMode && form.commodity && insuranceEntries.length === 0 && (
              <div className="border-t pt-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> No insurance data found for this warehouse in the inspection module. 
                    Please ensure insurance data exists in the Warehouse Inspection section.
                  </p>
                </div>
              </div>
            )}

            {/* Your Insurance Section */}
            {isEditMode && (
              <div className="border-t pt-6 mb-6">
                <h3 className="text-xl font-semibold mb-4 text-blue-700">Your Insurance</h3>
                {yourInsurance ? (
                  <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-blue-700">Insurance ID: {yourInsurance.insuranceId}</h4>
                      <div className="text-sm text-blue-600 font-medium">
                        {yourInsurance.insuranceTakenBy} - {yourInsurance.insuranceCommodity}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label className="block font-semibold mb-1">Insurance Taken By</Label>
                        <Input value={yourInsurance.insuranceTakenBy || ''} readOnly />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Commodity</Label>
                        <Input value={yourInsurance.insuranceCommodity || ''} readOnly />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Fire Policy Number</Label>
                        <Input value={yourInsurance.firePolicyNumber || ''} readOnly />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Fire Policy Amount</Label>
                        <Input value={formatAmount(yourInsurance.firePolicyAmount)} readOnly />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Fire Policy Start Date</Label>
                        <Input value={normalizeDate(yourInsurance.firePolicyStartDate)} readOnly />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Fire Policy End Date</Label>
                        <Input value={normalizeDate(yourInsurance.firePolicyEndDate)} readOnly />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Burglary Policy Number</Label>
                        <Input value={yourInsurance.burglaryPolicyNumber || ''} readOnly />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Burglary Policy Amount</Label>
                        <Input value={formatAmount(yourInsurance.burglaryPolicyAmount)} readOnly />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Burglary Policy Start Date</Label>
                        <Input value={normalizeDate(yourInsurance.burglaryPolicyStartDate)} readOnly />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-1">Burglary Policy End Date</Label>
                        <Input value={normalizeDate(yourInsurance.burglaryPolicyEndDate)} readOnly />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">No insurance found for this inward entry.</div>
                )}
              </div>
            )}



            {form.commodity && insuranceEntries.length === 0 && (
              <div className="border-t pt-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> No insurance data found for this warehouse in the inspection module. 
                    Please ensure insurance data exists in the Warehouse Inspection section.
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
                          Vehicle: {entry.vehicleNumber} | Gatepass: {entry.getpassNumber}
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
                            <Label className="block font-medium mb-1 text-green-600">Gatepass Number</Label>
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
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-orange-700">Inward Entry</h3>
                <Button 
                  type="button" 
                  onClick={addNewInwardEntry}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
                >
                  Add New Entry
                </Button>
              </div>

              {/* Vehicle Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label className="block font-semibold mb-2">Vehicle Number <span className="text-red-500">*</span></Label>
                  <Input 
                    value={form.vehicleNumber} 
                    onChange={e => setCurrentEntryForm(f => ({ ...f, vehicleNumber: e.target.value }))} 
                    placeholder="Enter Vehicle Number"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Gatepass Number <span className="text-red-500">*</span></Label>
                  <Input 
                    value={form.getpassNumber} 
                    onChange={e => setCurrentEntryForm(f => ({ ...f, getpassNumber: e.target.value }))} 
                    placeholder="Enter Gatepass Number"
                  />
                  <p className="text-xs text-orange-600 mt-1">Gatepass number must be unique across all entries</p>
                </div>
              </div>

              {/* Weight Bridge Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label className="block font-semibold mb-2">Weighbridge Name<span className="text-red-500">*</span></Label>
                  <Input 
                    value={form.weightBridge} 
                    onChange={e => setCurrentEntryForm(f => ({ ...f, weightBridge: e.target.value }))} 
                    placeholder="Enter Weighbridge Name"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Weighbridge Slip Number <span className="text-red-500">*</span></Label>
                  <Input 
                    value={form.weightBridgeSlipNumber} 
                    onChange={e => setCurrentEntryForm(f => ({ ...f, weightBridgeSlipNumber: e.target.value }))} 
                    placeholder="Enter Slip Number"
                  />
                </div>
              </div>

              {/* Weight Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <Label className="block font-semibold mb-2">Gross Weight (MT) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    step="0.001"
                    value={form.grossWeight} 
                    onChange={e => handleGrossWeightChange(e.target.value)} 
                    placeholder="0.000"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Tare Weight (MT) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    step="0.001"
                    value={form.tareWeight} 
                    onChange={e => handleTareWeightChange(e.target.value)} 
                    placeholder="0.000"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Net Weight (MT)</Label>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <Label className="block font-semibold mb-2">Total Bags <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    value={currentEntryForm.totalBags}
                    onChange={e => setCurrentEntryForm(f => ({ ...f, totalBags: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Total Quantity (MT) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    step="0.001"
                    value={currentEntryForm.totalQuantity}
                    onChange={e => setCurrentEntryForm(f => ({ ...f, totalQuantity: e.target.value }))} 
                    placeholder="0.000"
                  />
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Average Weight (MT)</Label>
                  <Input 
                    value={form.averageWeight} 
                    readOnly 
                    placeholder="Auto-calculated"
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {/* Stack Information */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-6">
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
                  <div key={index} className="border border-gray-200 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="block font-semibold mb-2">Stack Number <span className="text-red-500">*</span></Label>
                        <Input 
                          value={stack.stackNumber} 
                          onChange={e => updateStack(index, 'stackNumber', e.target.value)} 
                          placeholder="Enter Stack Number"
                        />
                      </div>
                      <div>
                        <Label className="block font-semibold mb-2">Number of Bags <span className="text-red-500">*</span></Label>
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
                  <div className={`p-4 rounded-lg mb-6 ${
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

              {/* Lab Parameter Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-6 text-orange-700">Lab Parameter</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <Label className="block font-semibold mb-2">Date of Sampling <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date"
                      value={currentEntryForm.dateOfSampling}
                      onChange={e => setCurrentEntryForm(f => ({ ...f, dateOfSampling: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="block font-semibold mb-2">Date of Testing <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date"
                      value={currentEntryForm.dateOfTesting}
                      onChange={e => setCurrentEntryForm(f => ({ ...f, dateOfTesting: e.target.value }))}
                      disabled={!currentEntryForm.dateOfSampling}
                      min={currentEntryForm.dateOfSampling}
                    />
                  </div>
                </div>
                <div>
                  <Label className="block font-semibold mb-2">Quality Parameters (from Commodity & Variety)</Label>
                  <div className="overflow-x-auto max-w-lg">
                    <table className="min-w-full border border-green-300 rounded-lg">
                      <thead className="bg-orange-100 text-orange-600 font-bold">
                        <tr>
                          <th className="px-4 py-2 border-green-300 border">Parameter</th>
                          <th className="px-4 py-2 border-green-300 border">Min %</th>
                          <th className="px-4 py-2 border-green-300 border">Max %</th>
                          <th className="px-4 py-2 border-green-300 border">Actual (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Find particulars for the current form's commodity and variety
                          console.log('Quality Parameters table rendering with:', {
                            formCommodity: form.commodity,
                            formVariety: form.varietyName,
                            commoditiesCount: commodities.length
                          });
                          
                          const commodity = commodities.find((c: any) => c.commodityName === form.commodity);
                          const variety = commodity?.varieties?.find((v: any) => v.varietyName === form.varietyName);
                          const particulars = variety?.particulars || [];
                          
                          console.log('Quality Parameters found:', {
                            commodity: commodity?.commodityName,
                            variety: variety?.varietyName,
                            particularsCount: particulars.length,
                            particulars: particulars
                          });
                          
                          return particulars.length > 0 ? (
                            particulars.map((p: any, idx: number) => (
                          <tr key={idx} className="text-green-800">
                            <td className="px-4 py-2 border-green-300 border">{p.name}</td>
                            <td className="px-4 py-2 border-green-300 border">{p.minPercentage}</td>
                            <td className="px-4 py-2 border-green-300 border">{p.maxPercentage}</td>
                            <td className="px-4 py-2 border-green-300 border">
                              <Input
                                type="number"
                                value={currentEntryForm.labResults?.[idx] || ''}
                                onChange={(e) => handleLabResultChange(idx, e.target.value)}
                                className="w-24 bg-white border border-green-300 text-center"
                                placeholder="Enter value"
                              />
                            </td>
                          </tr>
                            ))
                          ) : (
                          <tr><td colSpan={4} className="text-center text-gray-400 py-2">No quality parameters found for this variety.</td></tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* File Attachment Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 text-orange-700">File Attachment</h3>
              <div>
                <Label className="block font-semibold mb-2">Attach File <span className="text-red-500">*</span></Label>
                <Input 
                  type="file"
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.pdf,.xls,.xlsx"
                  className="pt-1.5"
                />
                {fileAttachment && <p className="text-sm text-gray-500 mt-1">Selected: {fileAttachment.name}</p>}
              </div>
            </div>



            <div className="flex justify-end pt-8">
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3" disabled={isUploading}>
                {isUploading ? 'Uploading & Saving...' : (isEditMode ? 'Update Inward Entry' : 'Submit')}
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

      {/* SR/WR View Modal */}
      <Dialog open={showSRForm} onOpenChange={setShowSRForm}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {/* Custom Header Section */}
          <div className="flex flex-col items-center justify-center mb-8 mt-2">
            <img src="/Group 86.png" alt="Agrogreen Logo" style={{ width: 120, height: 100, marginBottom: 8, borderRadius: '30%', objectFit: 'cover' }} />
            <div className="text-lg font-extrabold text-orange-600 mt-2 mb-1 text-center" style={{ letterSpacing: '0.02em' }}>
              AGROGREEN WAREHOUSING PRIVATE LTD.
            </div>
            <div className="text-base font-semibold text-green-600 mb-2 text-center">
              603, 6th Floor, Princess Business Skyline, Indore, Madhya Pradesh - 452010
            </div>
            <div className="text-md font-bold text-orange-600 underline text-center mb-2" style={{ letterSpacing: '0.01em' }}>
              {selectedRowForSR?.receiptType === 'WR' ? 'Warehouse Receipt' : 'Storage Receipt'}
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-green-700 text-xl">
              {/* {selectedRowForSR?.receiptType === 'WR' ? 'Warehouse Receipt View' : 'Storage Receipt View'} */}
            </DialogTitle>
          </DialogHeader>
          {selectedRowForSR && (
            <div className="space-y-4">
              {/* CAD No and SR/WR No */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="font-semibold">{selectedRowForSR.receiptType === 'WR' ? 'WR No' : 'SR No'}</Label>
                  <Input value={selectedRowForSR.srNo || `${selectedRowForSR.receiptType === 'WR' ? 'WR' : 'SR'}-${selectedRowForSR.inwardId || 'XXX'}-${selectedRowForSR.dateOfInward ? selectedRowForSR.dateOfInward.replace(/-/g, '') : ''}`} readOnly />
                </div>
                <div className="flex-1">
                  <Label className="font-semibold">{selectedRowForSR.receiptType === 'WR' ? 'WR Generation Date' : 'SR Generation Date'}</Label>
                  <Input value={selectedRowForSR.srGenerationDate || ''} readOnly placeholder="Auto-set on Approve" />
                </div>
                <div className="flex-1">
                  <Label className="font-semibold">CAD No</Label>
                  <Input value={selectedRowForSR.cadNumber || ''} readOnly />
                </div>
              </div>
              {/* Stock Inward Date */}
              <div>
                <Label className="font-semibold">Date of deposit</Label>
                <Input value={selectedRowForSR.dateOfInward || ''} readOnly />
              </div>
              {/* Bank, Warehouse, Client, Commodity Details */}
              <div className="mt-6">
                <Label className="font-semibold text-orange-500">Bank Details</Label>
                <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                <div className="flex flex-wrap gap-4 items-center">
                <div>
                    <Label className="text-sm font-medium">Bank Name</Label>
                    <Input value={selectedRowForSR?.bankName || ''} readOnly className="text-sm mt-1 bg-white w-48" />
                </div>
                <div>
                    <Label className="text-sm font-medium">Bank Branch</Label>
                    <Input value={selectedRowForSR?.bankBranch || ''} readOnly className="text-sm mt-1 bg-white w-48" />
                </div>
                <div>
                    <Label className="text-sm font-medium">IFSC Code</Label>
                    <Input value={selectedRowForSR?.ifscCode || ''} readOnly className="text-sm mt-1 bg-white w-48" />
                </div>
                </div>
                </div>
              </div>
              <div className="mt-6">
                <Label className="font-semibold text-orange-500">Warehouse Details</Label>
                <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                <div className="flex flex-wrap gap-4 items-center">
                <div>
                    <Label className="text-sm font-medium">Warehouse Name</Label>
                    <Input value={selectedRowForSR?.warehouseName || ''} readOnly className="text-sm mt-1 bg-white w-48" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Warehouse Code</Label>
                    <Input value={selectedRowForSR?.warehouseCode || ''} readOnly className="text-sm mt-1 bg-white w-48" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Warehouse Address</Label>
                    <Input value={selectedRowForSR?.warehouseAddress || ''} readOnly className="text-sm mt-1 bg-white w-48" />
                  </div>
                </div>
                </div>
              </div>
              <div className="mt-6">
                <Label className="font-semibold text-orange-500">Client Details</Label>
                <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                <div className="flex flex-wrap gap-4 items-center">
                  <div>
                    <Label className="text-sm font-medium">Client Name</Label>
                    <Input value={selectedRowForSR?.client || ''} readOnly className="text-sm mt-1 bg-white w-48" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Client Code</Label>
                    <Input value={selectedRowForSR?.clientCode || ''} readOnly className="text-sm mt-1 bg-white w-48" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Client Address</Label>
                    <Input value={selectedRowForSR?.clientAddress || ''} readOnly className="text-sm mt-1 bg-white w-48" />
                  </div>
                </div>
                </div>
              </div>
              <div className="mt-6">
                <Label className="font-semibold text-orange-500">Commodity Details</Label>
                <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Commodity</Label>
                      <Input value={selectedRowForSR?.commodity || ''} readOnly className="text-sm mt-1 bg-white w-72" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Variety</Label>
                      <Input value={selectedRowForSR?.varietyName || ''} readOnly className="text-sm mt-1 bg-white w-72" />
                    </div>
                    <div>
                      <Label className="font-semibold">No. of Bags/Bales</Label>
                      <Input value={selectedRowForSR.totalBags || ''} readOnly />
                    </div>
                    <div>
                      <Label className="font-semibold">Total Quantity (MT)</Label>
                      <Input value={selectedRowForSR.totalQuantity || ''} readOnly />
                    </div>
                    <div>
                      <Label className="font-semibold">Total Value (Rs/MT)</Label>
                      <Input value={`${selectedRowForSR.totalValue || ''}`} readOnly />
                    </div>
                    <div>
                      <Label className="font-semibold">Market Rate (Rs/MT)</Label>
                      <Input value={`${selectedRowForSR.marketRate || ''}`} readOnly />
                    </div>
                    <div>
                      <Label className="font-semibold">Base Receipt Number</Label>
                      <Input value={selectedRowForSR.bankReceipt || ''} readOnly />
                                  </div>
                    <div>
                      <Label className="font-semibold">Value of Commodities (in words)</Label>
                      <Input value={numberToWords(selectedRowForSR.totalValue)} readOnly />
                    </div>
                  </div>
                </div>
              </div>
              {/* Bags and Quantity */}

              {/* Validity Dates */}
             
              
              <div className="mt-4"></div>
              <Label className="font-semibold text-orange-500">Stock Validity</Label>
              <div className="grid grid-cols-2 gap-4">
                
                <div>
                  <Label className="font-semibold">Validity Start Date</Label>
                  <Input value={srGenerationDate || selectedRowForSR.srGenerationDate || ''} readOnly placeholder="Auto-set on Approve" />
                </div>
                <div>
                  <Label className="font-semibold">Validity End Date</Label>
                  <Input
                    value={(() => {
                      // Find insurance match
                      let insurance = null;
                      if (selectedRowForSR?.selectedInsurance && inspectionInsuranceData.length) {
                        insurance = inspectionInsuranceData.find(
                          (ins: any) =>
                            ins.insuranceId === selectedRowForSR.selectedInsurance.insuranceId &&
                            ins.insuranceTakenBy === selectedRowForSR.selectedInsurance.insuranceTakenBy
                        );
                      }
                      // If insurance taken by bank, 9 months after WR Generation Date
                      if (insurance && insurance.insuranceTakenBy === 'bank') {
                        if (selectedRowForSR.srGenerationDate) {
                          const start = new Date(selectedRowForSR.srGenerationDate);
                          start.setMonth(start.getMonth() + 9);
                          return start.toISOString().slice(0, 10);
                        }
                        return '';
                      }
                      // Otherwise, use fire policy end date
                      if (insurance && insurance.firePolicyEndDate) {
                        return normalizeDate(insurance.firePolicyEndDate);
                      }
                      // Fallback: empty
                      return '';
                    })()}
                    readOnly
                    placeholder="Auto-set on Approve"
                  />
                </div>
              </div>
              {/* Insurance Expiry Check */}
              {isInsuranceExpired(selectedRowForSR) && (
                <div className="bg-red-100 text-red-700 p-2 rounded font-semibold">
                  Insurance is expired. Please update the end date before approval.
                </div>
              )}
                 
            
              {/* Hologram No and QR space */}
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <Label className="font-semibold">Hologram No</Label>
                  <Input 
                    placeholder="Enter Hologram No"
                    value={hologramNumber}
                    onChange={e => setHologramNumber(e.target.value)}
                    readOnly={isFormApproved}
                    className="w-32"
                  />
                </div>
                <div className="w-64 h-32 border-2 border-dashed border-gray-400 flex items-center justify-center ml-4">
                  <span className="text-xs text-gray-400">QR Sticker Space</span>
                </div>
              </div>
              {/* Insurance Details */}
              <div>
                <Label className="font-semibold text-orange-500">Insurance Details </Label>
                {(() => {
                  if (!selectedRowForSR?.selectedInsurance || !inspectionInsuranceData.length) {
                    return <div className="text-gray-500 text-sm">No insurance data found in inspection</div>;
                  }
                  const match = inspectionInsuranceData.find(
                    (insurance: any) =>
                      insurance.insuranceId === selectedRowForSR.selectedInsurance.insuranceId &&
                      insurance.insuranceTakenBy === selectedRowForSR.selectedInsurance.insuranceTakenBy
                  );
                  if (!match) {
                    return <div className="text-gray-500 text-sm">No insurance data found in inspection</div>;
                  }
                  return (
                    <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                      {/* <h6 className="font-medium text-blue-600 mb-2">Insurance Entry</h6> */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Insurance Taken By</Label>
                          <Input value={match.insuranceTakenBy || ''} readOnly className="text-sm" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Commodity</Label>
                          <Input value={match.insuranceCommodity || ''} readOnly className="text-sm" />
                        </div>
                        {match.insuranceTakenBy === 'client' && (
                          <>
                            <div>
                              <Label className="text-sm font-medium">Client Name</Label>
                              <Input value={match.clientName || ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Client Address</Label>
                              <Input value={match.clientAddress || ''} readOnly className="text-sm" />
                            </div>
                          </>
                        )}
                        {match.insuranceTakenBy === 'bank' && (
                          <div>
                            <Label className="text-sm font-medium">Bank Name</Label>
                            <Input value={match.selectedBankName || ''} readOnly className="text-sm" />
                          </div>
                        )}
                        {match.insuranceTakenBy && match.insuranceTakenBy !== 'bank' && (
                          <>
                            <div>
                              <Label className="text-sm font-medium">Fire Policy Company</Label>
                              <Input value={match.firePolicyCompanyName || ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Fire Policy Number</Label>
                              <Input value={match.firePolicyNumber || ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Fire Policy Amount</Label>
                              <Input value={match.firePolicyAmount ? `₹${match.firePolicyAmount}` : ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Fire Policy End Date</Label>
                              <Input value={normalizeDate(match.firePolicyEndDate)} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Burglary Policy Company</Label>
                              <Input value={match.burglaryPolicyCompanyName || ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Burglary Policy Number</Label>
                              <Input value={match.burglaryPolicyNumber || ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Burglary Policy Amount</Label>
                              <Input value={match.burglaryPolicyAmount ? `₹${match.burglaryPolicyAmount}` : ''} readOnly className="text-sm" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Burglary Policy End Date</Label>
                              <Input value={normalizeDate(match.burglaryPolicyEndDate)} readOnly className="text-sm" />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
                {/* Signature block for Stock Receipt only, right after insurance details */}
                <div className="w-full flex justify-end mt-8 mb-2">
                    <div className="flex flex-col items-end">
                      <div className="w-56 h-20 border-2 border-dashed border-gray-400 flex items-center justify-center mb-1">

                        <span className="text-[10px] text-gray-400">Sign/Stamp</span>
                      </div>
                                                                    <div className="text-xs font-bold mb-1 text-orange-500">AGROGREEN WAREHOUSING PRIVATE LIMITED</div>

                      <div className="text-[10px] font-semibold">AUTHORIZED SIGNATORY</div>
                    </div>
                  </div>
                {/* {selectedRowForSR?.receiptType !== 'WR' && (
                  <div className="w-full flex justify-end mt-8 mb-2">
                    <div className="flex flex-col items-end">
                      <div className="w-56 h-20 border-2 border-dashed border-gray-400 flex items-center justify-center mb-1">

                        <span className="text-[10px] text-gray-400">Sign</span>
                      </div>
                                                                    <div className="text-xs font-bold mb-1 text-orange-500">AGROGREEN WAREHOUSING PRIVATE LIMITED</div>

                      <div className="text-[10px] font-semibold">AUTHORIZED SIGNATORY</div>
                    </div>
                  </div>
                )} */}
              </div>
              {/* Margin and Dotted Line */}
              <div className="my-8">
                <hr className="border-t-2 border-dotted border-gray-400" />
              </div>
              {/* Agrogreen Logo and Test Certificate (Modal View) */}
              <div className="relative flex flex-col items-center justify-center my-8">
              <div className="flex flex-col items-center justify-center mb-8 mt-2">
            <img src="/Group 86.png" alt="Agrogreen Logo" style={{ width: 120, height: 100, marginBottom: 8, borderRadius: '30%', objectFit: 'cover' }} />
            <div className="text-lg font-extrabold text-orange-600 mt-2 mb-1 text-center" style={{ letterSpacing: '0.02em' }}>
              AGROGREEN WAREHOUSING PRIVATE LTD.
            </div>
            <div className="text-base font-semibold text-green-600 mb-2 text-center">
              603, 6th Floor, Princess Business Skyline, Indore, Madhya Pradesh - 452010
            </div>
            <div className="text-md font-bold text-orange-600 underline text-center mb-2" style={{ letterSpacing: '0.01em' }}>
              TEST CERTIFICATE
            </div>
          </div>
                {/* FROM SECTION */}
                <div className="w-full max-w-2xl mt-8 mb-4 border border-gray-200 rounded-lg p-4 bg-gray-50" style={{ maxWidth: '900px' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="font-semibold mb-1">Client Name</Label>
                      <Input readOnly value={selectedRowForSR?.client || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">Commodity Name</Label>
                      <Input readOnly value={selectedRowForSR?.commodity || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">Commodity Variety Name</Label>
                      <Input readOnly value={selectedRowForSR?.varietyName || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">Client Address</Label>
                      <Input readOnly value={selectedRowForSR?.clientAddress || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">Warehouse Name</Label>
                      <Input readOnly value={selectedRowForSR?.warehouseName || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">Warehouse Address</Label>
                      <Input readOnly value={selectedRowForSR?.warehouseAddress || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">Total Number of Bags</Label>
                      <Input readOnly value={selectedRowForSR?.totalBags || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">CAD No</Label>
                      <Input readOnly value={selectedRowForSR?.cadNumber || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">Date of Sampling</Label>
                      <Input readOnly value={selectedRowForSR?.dateOfSampling || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                    <div>
                      <Label className="font-semibold mb-1">Date of Testing</Label>
                      <Input readOnly value={selectedRowForSR?.dateOfTesting || ''} className="w-full bg-white border-green-300 text-green-800" />
                    </div>
                  </div>
                </div>
                {/* Remarks input - left aligned */}
                <div className="w-full max-w-2xl mb-4 flex flex-col items-start" style={{ maxWidth: '900px' }}>
                  <Label className="font-semibold mb-1">Remarks</Label>
                  <Input
                    type="text"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Enter remarks here"
                    className="w-full bg-white border-green-300 text-green-800"
                  />
                </div>
                {/* Quality Parameters Table - left aligned */}
                <div className="w-full max-w-2xl mb-8" style={{ maxWidth: '900px' }}>
                  <Label className="block font-semibold mb-2 text-green-700 text-left">Quality Parameters (from Commodity & Variety)</Label>
                  <div className="overflow-x-auto max-w-lg">
                    <table className="min-w-full border border-green-300 rounded-lg">
                      <thead className="bg-orange-100 text-orange-600 font-bold">
                        <tr>
                          <th className="px-4 py-2 border-green-300 border">Parameter</th>
                          <th className="px-4 py-2 border-green-300 border">Min %</th>
                          <th className="px-4 py-2 border-green-300 border">Max %</th>
                          <th className="px-4 py-2 border-green-300 border">Actual (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Find particulars for the selectedRowForSR
                          const commodity = commodities.find((c: any) => c.commodityName === selectedRowForSR?.commodity);
                          const variety = commodity?.varieties?.find((v: any) => v.varietyName === selectedRowForSR?.varietyName);
                          const particulars = variety?.particulars || [];
                          return particulars.length > 0 ? (
                            particulars.map((p: any, idx: number) => (
                              <tr key={idx} className="text-green-800">
                                <td className="px-4 py-2 border-green-300 border">{p.name}</td>
                                <td className="px-4 py-2 border-green-300 border">{p.minPercentage}</td>
                                <td className="px-4 py-2 border-green-300 border">{p.maxPercentage}</td>
                                <td className="px-4 py-2 border-green-300 border">
                                  <Input
                                    type="number"
                                    value={selectedRowForSR?.labResults?.[idx] || ''}
                                    readOnly
                                    className="w-24 bg-white border border-green-300 text-center"
                              />
                            </td>
                          </tr>
                            ))
                          ) : (
                          <tr><td colSpan={4} className="text-center text-gray-400 py-2">No quality parameters found for this variety.</td></tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Footer Section - left and right aligned with space between */}
                <div className="w-full max-w-2xl flex justify-between items-end mt-8 mb-2" style={{ maxWidth: '900px' }}>
                  <div className="text-xs font-semibold text-left">THE QUALITY OF GOODS IS AVERAGE</div>
                  <div className="flex flex-col items-end">
                    {/* <div className="text-xs font-bold mb-1">Stamp</div> */}
                   
                    <div className="w-40 h-20 border-2 border-dashed border-gray-400 flex items-center justify-center mb-1">
                      <span className="text-[10px] text-gray-400">Sign/Stamp</span>
                    </div>
 <div className="text-xs font-bold mb-1 text-orange-500">AGROGREEN WAREHOUSING PRIVATE LIMITED</div>
                    <div className="text-[10px] font-semibold text-green-700">AUTHORIZED SIGNATORY</div>
                  </div>
                </div>
              </div>
              {/* Approve/Reject/Resubmit Buttons and Print Button */}
              {(() => {
                const status = selectedRowForSR?.status;
                if (isFormApproved || status === 'approve') {
                  return (
                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={handlePrint}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
                        disabled={isPrinting}
                      >
                        {isPrinting ? 'Generating PDF...' : 'Print Receipt'}
                      </Button>
                    </div>
                  );
                } else if (status === 'rejected') {
                  return (
                    <div className="flex justify-end mt-4">
                      <Button disabled className="bg-red-600 text-white px-4 py-2 text-sm opacity-70 cursor-not-allowed">
                        Rejected
                      </Button>
                    </div>
                  );
                } else if (status === 'resubmited') {
                  return (
                    <div className="flex justify-end mt-4">
                      <Button className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 text-sm">
                        Your {selectedRowForSR?.receiptType === 'WR' ? 'WR' : 'SR'} needs to be updated
                      </Button>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex gap-4 mt-4 justify-end">
                      <Button
                        onClick={() => handleApproveSR(selectedRowForSR)}
                        disabled={isInsuranceExpired(selectedRowForSR)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {selectedRowForSR.receiptType === 'WR' ? 'Proceed to WR' : 'Proceed to SR'}
                      </Button>
                      <Button
                        onClick={() => handleRejectSR(selectedRowForSR)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleResubmitSR(selectedRowForSR)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white"
                      >
                        Resubmit
                      </Button>
                    </div>
                  );
                }
              })()}
              {/* Hidden printRef for PDF export - New Layout */}
              {(isFormApproved || selectedRowForSR?.status === 'approve') && (
                <div style={showPrintDebug ? { position: 'static', margin: '32px 0', zIndex: 1000, background: '#fff' } : { position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
                  <div ref={printableReceiptRef}>
                    <PrintableWarehouseReceipt
                      selectedRowForSR={selectedRowForSR}
                      hologramNumber={hologramNumber}
                      srGenerationDate={srGenerationDate}
                      getSelectedVarietyParticulars={getSelectedVarietyParticulars}
                    />
                  </div>
                  {/* Keep original components for backward compatibility */}
                  <div ref={printRef} style={{ display: 'none' }}>
                    <StorageReceipt
                      data={{
                        srNo: generateSRNo(selectedRowForSR),
                        srGenerationDate: srGenerationDate || '-',
                        dateOfIssue: selectedRowForSR?.dateOfInward || '',
                        baseReceiptNo: selectedRowForSR?.baseReceiptNo || selectedRowForSR?.bankReceipt || '-',
                        cadNo: selectedRowForSR?.cadNo || selectedRowForSR?.cadNumber || '',
                        dateOfDeposit: selectedRowForSR?.dateOfInward || '',
                        branch: selectedRowForSR?.branch || '-',
                        warehouseName: selectedRowForSR?.warehouseName || '',
                        warehouseAddress: selectedRowForSR?.warehouseAddress || '',
                        client: selectedRowForSR?.client || '',
                        clientAddress: selectedRowForSR?.clientAddress || '',
                        commodity: selectedRowForSR?.commodity || '',
                        totalBags: selectedRowForSR?.totalBags || '',
                        netWeight: selectedRowForSR?.totalQuantity || '',
                        grade: selectedRowForSR?.grade || '-',
                        remarks: selectedRowForSR?.remarks || '-',
                        marketRate: selectedRowForSR?.marketRate || '',
                        valueOfCommodity: selectedRowForSR?.totalValue || '',
                        hologramNumber: hologramNumber || '',
                        insuranceDetails: [
                          {
                            policyNo: inspectionInsuranceData[0]?.firePolicyNumber || '-',
                            company: inspectionInsuranceData[0]?.firePolicyCompanyName || '-',
                            validFrom: inspectionInsuranceData[0]?.firePolicyStartDate ? normalizeDate(inspectionInsuranceData[0]?.firePolicyStartDate) : '-',
                            validTo: inspectionInsuranceData[0]?.firePolicyEndDate ? normalizeDate(inspectionInsuranceData[0]?.firePolicyEndDate) : '-',
                            sumInsured: inspectionInsuranceData[0]?.firePolicyAmount || '-',
                          },
                        ],
                        bankName: selectedRowForSR?.bankName || '',
                        date: selectedRowForSR?.dateOfInward || '',
                        place: selectedRowForSR?.branch || '',
                        stockInwardDate: selectedRowForSR?.dateOfInward || '-',
                        receiptType: selectedRowForSR?.receiptType || 'SR',
                        varietyName: selectedRowForSR?.varietyName || '',
                        dateOfSampling: selectedRowForSR?.dateOfSampling || '',
                        dateOfTesting: selectedRowForSR?.dateOfTesting || '',
                      }}
                    />
                  </div>
                  <div ref={testCertRef} style={{ display: 'none' }}>
                    <TestCertificate
                      client={selectedRowForSR?.client || ''}
                      clientAddress={selectedRowForSR?.clientAddress || ''}
                      commodity={selectedRowForSR?.commodity || ''}
                      varietyName={selectedRowForSR?.varietyName || ''}
                      warehouseName={selectedRowForSR?.warehouseName || ''}
                      warehouseAddress={selectedRowForSR?.warehouseAddress || ''}
                      totalBags={selectedRowForSR?.totalBags || ''}
                      dateOfSampling={selectedRowForSR?.dateOfSampling || ''}
                      dateOfTesting={selectedRowForSR?.dateOfTesting || ''}
                      qualityParameters={(() => {
                        const commodity = commodities.find((c: any) => c.commodityName === selectedRowForSR?.commodity);
                        const variety = commodity?.varieties?.find((v: any) => v.varietyName === selectedRowForSR?.varietyName);
                        const particulars = variety?.particulars || [];
                        return particulars.map((p: any, idx: number) => ({
                          name: p.name,
                          minPercentage: p.minPercentage,
                          maxPercentage: p.maxPercentage,
                          actual: selectedRowForSR?.labResults?.[idx] || '',
                        }));
                      })()}
                    />
                  </div>
                </div>
              )}
              {/* Insurance Seal/Stamp and Company Info */}
              <div className="flex justify-between items-end mt-8">
                <div>
                  {/* <div className="font-bold text-lg">TEST certificate</div> */}
                </div>
                <div className="flex flex-col items-end">
                  
                  {/* <div className="text-sm font-semibold">{process.env.NEXT_PUBLIC_COMPANY_NAME || 'Company Name'}</div> */}
                  {/* <div className="text-xs text-gray-500">{process.env.NEXT_PUBLIC_COMPANY_LOCATION || 'Location'}</div> */}
                  </div>
                </div>
              {/* Disclaimer at the very end */}
              <div className="w-full max-w-2xl mx-auto text-xs text-gray-600 mt-8 mb-2 text-justify border-t pt-4">
                This Report is given to you on the base of best tesing ability. Any discrepancy found in the report should be brought to our notice within 48 hours of Receipt of the report. The above results are valid for the date and time of sampling and testing only. Total liability or any claim arising out of this report is limited to the invoiced amount only.
              </div>
              {/* Stock Validity section */}
              {/* <div className="mt-4">
                <Label className="font-semibold text-orange-500">Stock Validity</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Validity Start Date</Label>
                    <Input value={selectedRowForSR.dateOfInward || ''} readOnly />
                  </div>
                  <div>
                    <Label className="font-semibold">Validity End Date</Label>
                    <Input value={(() => {
                      // If insurance taken by bank, 9 months after start date
                      if (selectedRowForSR.selectedInsurance?.insuranceTakenBy === 'bank') {
                        const start = selectedRowForSR.dateOfInward ? new Date(selectedRowForSR.dateOfInward) : null;
                        if (start && !isNaN(start.getTime())) {
                          start.setMonth(start.getMonth() + 9);
                          return start.toISOString().slice(0, 10);
                        }
                      }
                      // Otherwise, use Fire Policy End Date
                      const fireEnd = selectedRowForSR.firePolicyEnd || (inspectionInsuranceData.find(i => i.insuranceTakenBy !== 'bank')?.firePolicyEndDate);
                      return fireEnd || '';
                    })()} readOnly />
                  </div>
                </div>
              </div> */}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// Add numberToWords helper at the top of the file
function numberToWords(num: string | number): string {
  if (!num) return '';
  const n = parseInt(num.toString().replace(/,/g, ''));
  if (isNaN(n)) return '';
  if (n === 0) return 'zero';
  const a = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
  ];
  const b = [
    '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
  ];
  const g = [
    '', 'thousand', 'million', 'billion', 'trillion'
  ];
  function chunk(num: number): number[] {
    let arr: number[] = [];
    while (num > 0) {
      arr.push(num % 1000);
      num = Math.floor(num / 1000);
    }
    return arr;
  }
  function inWords(num: number): string {
    if (num === 0) return '';
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? ' ' + a[num % 10] : '');
    return a[Math.floor(num / 100)] + ' hundred' + (num % 100 ? ' ' + inWords(num % 100) : '');
  }
  const chunks = chunk(n);
  let str = '';
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i]) {
      str = inWords(chunks[i]) + (g[i] ? ' ' + g[i] : '') + (str ? ' ' + str : '');
    }
  }
  return str.trim() + ' only';
}