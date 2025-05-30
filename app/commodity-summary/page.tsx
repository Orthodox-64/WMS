"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/date-range-picker";
import { DataTable } from "@/components/data-table";
import DashboardLayout from "@/components/dashboard-layout";
import { Download } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { useCommodities, type Commodity } from "@/lib/firestore";
import { formatFileNameDate } from "@/lib/utils";
import { saveAs } from "file-saver";
import { parse } from "json2csv";
import { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<Commodity, any>[] = [
  {
    accessorKey: "date",
    header: "Date",
  },
  {
    accessorKey: "commodity",
    header: "Commodity",
  },
  {
    accessorKey: "variety",
    header: "Variety",
  },
  {
    accessorKey: "quantity",
    header: "Quantity (MT)",
  },
  {
    accessorKey: "aum",
    header: "AUM (₹)",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("aum"));
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amount);
      return formatted;
    },
  },
];

export default function CommoditySummaryPage() {
  const [date, setDate] = useState<DateRange | undefined>();
  const { data: commodities, loading, error } = useCommodities(
    date ? { from: date.from!, to: date.to! } : undefined
  );

  const handleExportCSV = () => {
    try {
      const csvData = parse(commodities);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
      const fileName = `commodity-summary-${
        date?.from ? formatFileNameDate(date.from) : "all"
      }.csv`;
      saveAs(blob, fileName);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">
              Commodity Summary
            </CardTitle>
            <div className="flex items-center gap-4">
              <DateRangePicker date={date} onDateChange={setDate} />
              <Button
                variant="outline"
                size="icon"
                onClick={handleExportCSV}
                disabled={loading || Boolean(error) || !commodities?.length}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={commodities || []}
              isLoading={loading}
              error={error?.message}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
