"use client";

import { useState, useMemo } from "react";
import { DateRange } from "react-day-picker";
import DashboardLayout from "@/components/dashboard-layout";
import { DateRangePicker } from "@/components/date-range-picker";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAUM, type AUM } from "@/lib/firestore";
import { formatFileNameDate } from "@/lib/utils";
import { saveAs } from "file-saver";
import { parse } from "json2csv";
import { ColumnDef } from "@tanstack/react-table";
import { PieChartComponent } from "@/components/pie-chart";

const columns: ColumnDef<AUM, any>[] = [
  {
    accessorKey: "date",
    header: "Date",
  },
  {
    accessorKey: "state",
    header: "State",
  },
  {
    accessorKey: "commodity",
    header: "Commodity",
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

export default function AUMSummaryPage() {
  const [date, setDate] = useState<DateRange | undefined>();
  const { data: aumData, loading, error } = useAUM(
    date ? { from: date.from!, to: date.to! } : undefined
  );

  const pieChartData = useMemo(() => {
    if (!aumData) return [];
    
    const stateTotals = aumData.reduce((acc, curr) => {
      const state = curr.state;
      acc[state] = (acc[state] || 0) + parseFloat(curr.aum);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(stateTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [aumData]);

  const handleExportCSV = () => {
    try {
      const csvData = parse(aumData);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
      const fileName = `aum-summary-${
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                AUM Summary
              </CardTitle>
              <div className="flex items-center gap-4">
                <DateRangePicker date={date} onDateChange={setDate} />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportCSV}
                  disabled={loading || Boolean(error) || !aumData?.length}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={aumData || []}
                isLoading={loading}
                error={error?.message}
              />
            </CardContent>
          </Card>
          <PieChartComponent
            title="AUM Distribution by State"
            data={pieChartData}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
