'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface DistributionData {
  name: string;
  value: number;
}

function useDistributionData() {
  const [distributionData, setDistributionData] = useState<DistributionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch distribution data
        const distributionRef = collection(db, "distribution");
        const distributionSnapshot = await getDocs(
          query(distributionRef, orderBy("value", "desc"), limit(10))
        );
        const results = distributionSnapshot.docs.map((doc) => ({
          name: doc.data().location,
          value: doc.data().value,
        }));
        setDistributionData(results);
      } catch (error) {
        console.error("Error fetching distribution data:", error);
        // Use mock data as fallback
        setDistributionData([
          { name: "Mumbai", value: 1200 },
          { name: "Delhi", value: 1000 },
          { name: "Bangalore", value: 800 },
          { name: "Chennai", value: 600 },
          { name: "Kolkata", value: 400 },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { distributionData, loading };
}

export function DistributionChart() {
  const { distributionData, loading } = useDistributionData();

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
        <CardTitle>Distribution by Location</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={distributionData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
} 