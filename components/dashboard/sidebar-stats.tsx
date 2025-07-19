import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface StatsData {
  warehouseCount: number;
  pendingSurveys: number;
  pendingInward: number;
  pendingOutward: number;
  pendingDO: number;
  pendingRO: number;
}

// TODO: Replace with real data from Firestore
const mockStats: StatsData = {
  warehouseCount: 42,
  pendingSurveys: 15,
  pendingInward: 18,
  pendingOutward: 12,
  pendingDO: 24,
  pendingRO: 8,
};

export function SidebarStats() {
  const [stats, setStats] = useState({
    warehouseCount: 0,
    pendingSurveys: 0,
    pendingInward: 0,
    pendingOutward: 0,
    pendingDO: 0,
    pendingRO: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      // Number of Warehouses (unique warehouseName in inspections)
      const inspectionsSnap = await getDocs(collection(db, 'inspections'));
      const warehouseSet = new Set();
      let pendingSurveys = 0;
      inspectionsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.warehouseName) warehouseSet.add(data.warehouseName);
        if (!data.status || data.status === 'pending') pendingSurveys++;
      });
      // Pending Inward Entries (inward entries with status not 'approve')
      const inwardSnap = await getDocs(collection(db, 'inward'));
      let pendingInward = 0;
      inwardSnap.docs.forEach(doc => {
        const data = doc.data();
        if (!data.status || data.status !== 'approve') pendingInward++;
      });
      setStats({
        warehouseCount: warehouseSet.size,
        pendingSurveys,
        pendingInward,
        pendingOutward: 0,
        pendingDO: 0,
        pendingRO: 0,
      });
    }
    fetchStats();
  }, []);

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="inline-block border-b-2 border-green-500 pb-2 w-fit">Warehouse Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Number of Warehouses</TableCell>
              <TableCell className="text-right text-orange-400">{stats.warehouseCount}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pending Surveys</TableCell>
              <TableCell className="text-right text-orange-400">{stats.pendingSurveys}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pending Inward Entries</TableCell>
              <TableCell className="text-right text-orange-400">{stats.pendingInward}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pending Outward Entries</TableCell>
              <TableCell className="text-right text-orange-400">0</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pending DO Entries</TableCell>
              <TableCell className="text-right text-orange-400">0</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pending RO Entries</TableCell>
              <TableCell className="text-right text-orange-400">0</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
