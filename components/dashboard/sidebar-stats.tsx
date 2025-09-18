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
      try {
        // Number of Warehouses (unique warehouseName in inspections)
        const inspectionsSnap = await getDocs(collection(db, 'inspections'));
        const warehouseSet = new Set();
        let pendingSurveys = 0;
        inspectionsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.warehouseName) warehouseSet.add(data.warehouseName);
          if (!data.status || data.status === 'pending') pendingSurveys++;
        });

        // Pending Inward Entries (inward entries with status not 'approved' or 'approve')
        const inwardSnap = await getDocs(collection(db, 'inward'));
        let pendingInward = 0;
        inwardSnap.docs.forEach(doc => {
          const data = doc.data();
          const status = (data.status || '').toLowerCase().trim();
          if (status !== 'approved' && status !== 'approve') {
            pendingInward++;
          }
        });

        // Pending Outward Entries (outward entries with status not 'approved')
        const outwardSnap = await getDocs(collection(db, 'outwards'));
        let pendingOutward = 0;
        outwardSnap.docs.forEach(doc => {
          const data = doc.data();
          const status = ((data.outwardStatus || data.status) || '').toLowerCase().trim();
          if (status !== 'approved' && status !== 'approve') {
            pendingOutward++;
          }
        });

        // Pending DO Entries (delivery order entries with status not 'approved')
        const doSnap = await getDocs(collection(db, 'deliveryOrders'));
        let pendingDO = 0;
        doSnap.docs.forEach(doc => {
          const data = doc.data();
          const status = (data.doStatus || '').toLowerCase().trim();
          if (status !== 'approved' && status !== 'approve') {
            pendingDO++;
          }
        });

        // Pending RO Entries (release order entries with status not 'approved')
        const roSnap = await getDocs(collection(db, 'releaseOrders'));
        let pendingRO = 0;
        roSnap.docs.forEach(doc => {
          const data = doc.data();
          const status = (data.roStatus || '').toLowerCase().trim();
          if (status !== 'approved' && status !== 'approve') {
            pendingRO++;
          }
        });

        const newStats = {
          warehouseCount: warehouseSet.size,
          pendingSurveys,
          pendingInward,
          pendingOutward,
          pendingDO,
          pendingRO,
        };
        
        // Debug logging
        console.log('Stats fetched:', newStats);
        
        setStats(newStats);
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Keep existing values on error
      }
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
              <TableCell className="text-right text-orange-400">{stats.pendingOutward}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pending DO Entries</TableCell>
              <TableCell className="text-right text-orange-400">{stats.pendingDO}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pending RO Entries</TableCell>
              <TableCell className="text-right text-orange-400">{stats.pendingRO}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
