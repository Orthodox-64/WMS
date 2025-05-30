'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
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

// Dummy data for location distribution over time
const DUMMY_LOCATION_DATA = [
  { date: "2024-01", Maharashtra: 400, Gujarat: 300, Punjab: 200, Haryana: 150, Karnataka: 100, "Tamil Nadu": 80 },
  { date: "2024-02", Maharashtra: 450, Gujarat: 320, Punjab: 220, Haryana: 160, Karnataka: 110, "Tamil Nadu": 85 },
  { date: "2024-03", Maharashtra: 500, Gujarat: 350, Punjab: 250, Haryana: 170, Karnataka: 120, "Tamil Nadu": 90 },
  { date: "2024-04", Maharashtra: 480, Gujarat: 340, Punjab: 240, Haryana: 165, Karnataka: 115, "Tamil Nadu": 88 },
  { date: "2024-05", Maharashtra: 520, Gujarat: 360, Punjab: 260, Haryana: 180, Karnataka: 130, "Tamil Nadu": 95 },
  { date: "2024-06", Maharashtra: 550, Gujarat: 380, Punjab: 280, Haryana: 190, Karnataka: 140, "Tamil Nadu": 100 }
];

function useDashboardData() {
  const { data: aumData, loading: aumLoading } = useAUM();
  const { data: commodityData, loading: commodityLoading } = useCommodities();

  const pieChartData = useMemo(() => {
    // If no data is available, use dummy data
    if (!aumData || aumData.length === 0) {
      return { 
        aumData: DUMMY_AUM_DATA, 
        commodityData: DUMMY_COMMODITY_DATA,
        locationData: DUMMY_LOCATION_DATA
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

    // Process location data over time
    const locationData = aumData.reduce((acc, curr) => {
      const date = curr.date.split('T')[0].substring(0, 7); // Get YYYY-MM format
      if (!acc[date]) {
        acc[date] = {};
      }
      acc[date][curr.state] = (acc[date][curr.state] || 0) + parseFloat(curr.aum);
      return acc;
    }, {} as Record<string, Record<string, number>>);

    const locationResults = Object.entries(locationData)
      .map(([date, values]) => ({
        date,
        ...values
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-6); // Get last 6 months

    return { 
      aumData: aumResults.length > 0 ? aumResults : DUMMY_AUM_DATA,
      commodityData: commodityResults.length > 0 ? commodityResults : DUMMY_COMMODITY_DATA,
      locationData: locationResults.length > 0 ? locationResults : DUMMY_LOCATION_DATA
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
    <Card className="cursor-pointer" onClick={() => router.push(redirectPath)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
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

interface LineChartCardProps {
  title: string;
  data: Array<Record<string, any>>;
}

function LineChartCard({ title, data }: LineChartCardProps) {
  const states = Object.keys(data[0]).filter(key => key !== 'date');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {states.map((state, index) => (
              <Line
                key={state}
                type="monotone"
                dataKey={state}
                stroke={COLORS[index % COLORS.length]}
                activeDot={{ r: 8 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DashboardCharts() {
  const { commodityData, aumData, locationData, loading } = useDashboardData();

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
    <div className="space-y-6">
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
      <LineChartCard
        title="AUM Distribution by Location Over Time"
        data={locationData}
      />
    </div>
  );
}
