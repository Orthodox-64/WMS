'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMemo } from "react";
import { useAUM } from "@/lib/firestore";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

// Dummy data for testing
const DUMMY_DISTRIBUTION_DATA = [
  { date: "2024-01", Mumbai: 1200, Delhi: 1000, Bangalore: 800, Chennai: 600, Kolkata: 400 },
  { date: "2024-02", Mumbai: 1250, Delhi: 1050, Bangalore: 850, Chennai: 650, Kolkata: 450 },
  { date: "2024-03", Mumbai: 1300, Delhi: 1100, Bangalore: 900, Chennai: 700, Kolkata: 500 },
  { date: "2024-04", Mumbai: 1280, Delhi: 1080, Bangalore: 880, Chennai: 680, Kolkata: 480 },
  { date: "2024-05", Mumbai: 1350, Delhi: 1150, Bangalore: 950, Chennai: 750, Kolkata: 550 },
  { date: "2024-06", Mumbai: 1400, Delhi: 1200, Bangalore: 1000, Chennai: 800, Kolkata: 600 }
];

function useDistributionData() {
  const { data: aumData, loading } = useAUM();

  const distributionData = useMemo(() => {
    if (!aumData || aumData.length === 0) {
      return DUMMY_DISTRIBUTION_DATA;
    }

    // Process location data over time
    const locationData = aumData.reduce((acc, curr) => {
      const date = curr.date.split('T')[0].substring(0, 7); // Get YYYY-MM format
      if (!acc[date]) {
        acc[date] = {};
      }
      acc[date][curr.state] = (acc[date][curr.state] || 0) + parseFloat(curr.aum);
      return acc;
    }, {} as Record<string, Record<string, number>>);

    const results = Object.entries(locationData)
      .map(([date, values]) => ({
        date,
        ...values
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-6); // Get last 6 months

    return results.length > 0 ? results : DUMMY_DISTRIBUTION_DATA;
  }, [aumData]);

  return { distributionData, loading };
}

export function DistributionChart() {
  const { distributionData, loading } = useDistributionData();
  const locations = Object.keys(distributionData[0]).filter(key => key !== 'date');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Distribution Data...</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribution by Location Over Time</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={distributionData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {locations.map((location, index) => (
              <Line
                key={location}
                type="monotone"
                dataKey={location}
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