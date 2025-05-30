'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Types for chart data
interface ChartData {
  name: string;
  value: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

function useDashboardData() {
  const [commodityData, setCommodityData] = useState<ChartData[]>([]);
  const [aumData, setAumData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch commodity data
        const commodityRef = collection(db, "commodities");
        const commoditySnapshot = await getDocs(
          query(commodityRef, orderBy("quantity", "desc"), limit(5))
        );
        const commodityResults = commoditySnapshot.docs.map((doc) => ({
          name: doc.data().name,
          value: doc.data().quantity,
        }));
        setCommodityData(commodityResults);

        // Fetch AUM data
        const aumRef = collection(db, "aum_by_state");
        const aumSnapshot = await getDocs(
          query(aumRef, orderBy("value", "desc"), limit(5))
        );
        const aumResults = aumSnapshot.docs.map((doc) => ({
          name: doc.data().state,
          value: doc.data().value,
        }));
        setAumData(aumResults);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // Use mock data as fallback
        setCommodityData([
          { name: "Wheat", value: 400 },
          { name: "Rice", value: 300 },
          { name: "Corn", value: 200 },
          { name: "Soybeans", value: 100 },
        ]);
        setAumData([
          { name: "Maharashtra", value: 500 },
          { name: "Gujarat", value: 400 },
          { name: "Punjab", value: 300 },
          { name: "Haryana", value: 200 },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { commodityData, aumData, loading };
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
