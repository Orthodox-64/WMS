'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useAUM, useCommodities } from "@/lib/firestore";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

// Dummy data for testing
const DUMMY_AUM_DATA = [
  { name: "Maharashtra", value: 500 },
  { name: "Gujarat", value: 400 },
  { name: "Punjab", value: 300 },
  { name: "Haryana", value: 200 },
  { name: "Karnataka", value: 150 },
  { name: "Tamil Nadu", value: 100 }
];

const DUMMY_COMMODITY_DATA = [
  { name: "Wheat", value: 400 },
  { name: "Rice", value: 300 },
  { name: "Corn", value: 200 },
  { name: "Soybeans", value: 150 },
  { name: "Cotton", value: 100 },
  { name: "Sugarcane", value: 80 }
];

function useDashboardData() {
  const { data: aumData, loading: aumLoading } = useAUM();
  const { data: commodityData, loading: commodityLoading } = useCommodities();

  const pieChartData = useMemo(() => {
    // If no data is available, use dummy data
    if (!aumData || aumData.length === 0) {
      return { 
        aumData: DUMMY_AUM_DATA, 
        commodityData: DUMMY_COMMODITY_DATA
      };
    }
    
    const stateTotals = aumData.reduce((acc, curr) => {
      const state = curr.state;
      acc[state] = (acc[state] || 0) + parseFloat(curr.aum);
      return acc;
    }, {} as Record<string, number>);

    const aumResults = Object.entries(stateTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const commodityTotals = commodityData?.reduce((acc, curr) => {
      const commodity = curr.commodity;
      acc[commodity] = (acc[commodity] || 0) + parseFloat(curr.quantity);
      return acc;
    }, {} as Record<string, number>) || {};

    const commodityResults = Object.entries(commodityTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return { 
      aumData: aumResults.length > 0 ? aumResults : DUMMY_AUM_DATA,
      commodityData: commodityResults.length > 0 ? commodityResults : DUMMY_COMMODITY_DATA
    };
  }, [aumData, commodityData]);

  return {
    ...pieChartData,
    loading: aumLoading || commodityLoading
  };
}

interface PieChartCardProps {
  title: string;
  data: Array<{ name: string; value: number }>;
  redirectPath: string;
}

function PieChartCard({ title, data, redirectPath }: PieChartCardProps) {
  const router = useRouter();

  return (
    <Card className="cursor-pointer bg-white" onClick={() => router.push(redirectPath)}>
      <CardHeader>
        <CardTitle className="border-b-2 border-green-500 pb-2">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => 
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DashboardCharts() {
  const { commodityData, aumData, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <PieChartCard
        title="Commodity in Quantity"
        data={commodityData}
        redirectPath="/commodity-summary"
      />
      <PieChartCard
        title="AUM Statewise"
        data={aumData}
        redirectPath="/aum-summary"
      />
    </div>
  );
}
