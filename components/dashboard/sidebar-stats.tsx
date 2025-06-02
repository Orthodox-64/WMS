import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

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
              <TableCell className="text-right text-orange-400">{mockStats.warehouseCount}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pending Surveys</TableCell>
              <TableCell className="text-right text-orange-400">{mockStats.pendingSurveys}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pending Inward Entries</TableCell>
              <TableCell className="text-right text-orange-400">{mockStats.pendingInward}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pending Outward Entries</TableCell>
              <TableCell className="text-right text-orange-400">{mockStats.pendingOutward}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pending DO Entries</TableCell>
              <TableCell className="text-right text-orange-400">{mockStats.pendingDO}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pending RO Entries</TableCell>
              <TableCell className="text-right text-orange-400">{mockStats.pendingRO}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
