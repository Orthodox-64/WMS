import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { DataTable } from '@/components/data-table';
import type { Row } from '@tanstack/react-table';

const columns = [
  {
    accessorKey: "state",
    header: "State",
    cell: ({ row }: { row: Row<any> }) => <span className="font-semibold text-green-800 w-full flex justify-center">{row.getValue("state")}</span>,
    meta: { align: 'center' },
  },
  {
    accessorKey: "branch",
    header: "Branch",
    cell: ({ row }: { row: Row<any> }) => <span className="text-green-800 w-full flex justify-center">{row.getValue("branch")}</span>,
    meta: { align: 'center' },
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }: { row: Row<any> }) => <span className="text-green-800 w-full flex justify-center">{row.getValue("location")}</span>,
    meta: { align: 'center' },
  },
  {
    accessorKey: "warehouseName",
    header: "Warehouse Name",
    cell: ({ row }: { row: Row<any> }) => <span className="text-green-800 w-full flex justify-center">{row.getValue("warehouseName")}</span>,
    meta: { align: 'center' },
  },
  {
    accessorKey: "warehouseCode",
    header: "Warehouse Code",
    cell: ({ row }: { row: Row<any> }) => <span className="text-green-800 w-full flex justify-center">{row.getValue("warehouseCode")}</span>,
    meta: { align: 'center' },
  },
  {
    accessorKey: "status",
    header: "Warehouse Status",
    cell: ({ row }: { row: Row<any> }) => {
      let status = row.getValue("status");
      let color = "";
      switch ((status || "").toLowerCase()) {
        case "activated":
        case "active":
          color = "bg-green-200 text-green-800";
          status = "Activated";
          break;
        case "pending":
          color = "bg-yellow-200 text-yellow-800";
          break;
        case "closed":
          color = "bg-red-200 text-red-800";
          break;
        case "reactivated":
        case "reactive":
          color = "bg-blue-200 text-blue-800";
          status = "Reactivate";
          break;
        case "rejected":
          color = "bg-gray-200 text-gray-800";
          break;
        default:
          color = "bg-gray-100 text-gray-700";
      }
      return <span className={`px-2 py-1 rounded w-full flex justify-center ${color}`}>{status}</span>;
    },
    meta: { align: 'center' },
  },
];

export default function WarehouseStatusTable({ showHeader = false }) {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchInspections = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'inspections'));
        setInspections(snap.docs.map(doc => doc.data()));
      } catch (err) {
        setError("Failed to fetch warehouse inspections");
      } finally {
        setLoading(false);
      }
    };
    fetchInspections();
  }, []);

  // Prepare rows for the table
  const summaryRows = useMemo(() => {
    let arr = inspections.map(entry => ({
      state: entry.state || (entry.warehouseInspectionData && entry.warehouseInspectionData.state) || '',
      branch: entry.branch || (entry.warehouseInspectionData && entry.warehouseInspectionData.branch) || '',
      location: entry.location || (entry.warehouseInspectionData && entry.warehouseInspectionData.location) || '',
      warehouseName: entry.warehouseName || (entry.warehouseInspectionData && entry.warehouseInspectionData.warehouseName) || '',
      warehouseCode: entry.warehouseCode || (entry.warehouseInspectionData && entry.warehouseInspectionData.warehouseCode) || '',
      status: entry.status && entry.status.trim() ? entry.status : 'Pending',
    }));
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      arr = arr.filter(row =>
        row.state.toLowerCase().includes(term) ||
        row.branch.toLowerCase().includes(term) ||
        row.location.toLowerCase().includes(term) ||
        row.warehouseName.toLowerCase().includes(term) ||
        row.warehouseCode.toLowerCase().includes(term) ||
        row.status.toLowerCase().includes(term)
      );
    }
    return arr;
  }, [inspections, searchTerm]);

  // CSV export
  const handleExportCSV = () => {
    const headers = ["State", "Branch", "Location", "Warehouse Name", "Warehouse Code", "Warehouse Status"];
    const rows = summaryRows.map(row => [row.state, row.branch, row.location, row.warehouseName, row.warehouseCode, row.status]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "warehouse-status.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {showHeader && (
        <div className="flex items-center justify-center">
          <h1 className="text-3xl font-bold tracking-tight text-orange-600 inline-block border-b-4 border-green-500 pb-2 px-6 py-3 bg-orange-100 rounded-lg">
            Warehouse Status
          </h1>
        </div>
      )}
      {/* Search & Export Card */}
      <Card className="border-green-300">
        <CardHeader className="bg-green-50">
          <CardTitle className="text-green-700">Search & Export</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by state, branch, location, warehouse name, code, or status..."
                className="border-green-300 focus:border-green-500 pl-10"
              />
            </div>
            <Button
              onClick={handleExportCSV}
              className="bg-blue-500 hover:bg-blue-600 text-white"
              disabled={loading || !summaryRows.length}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-700 text-xl text-center w-full">Warehouse Status Table</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={summaryRows}
            isLoading={loading}
            error={error || undefined}
            wrapperClassName="border-green-300"
            headClassName="bg-orange-100 text-orange-600 font-bold text-center"
            cellClassName="text-green-800 text-center"
          />
        </CardContent>
      </Card>
    </div>
  );
} 