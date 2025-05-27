"use client";

import { ColumnDef } from "@tanstack/react-table";

export type Warehouse = {
  id: string;
  srNo: number;
  state: string;
  commodity: string;
  aum: string;
  quantity: number;
};

export const columns: ColumnDef<Warehouse>[] = [
  {
    accessorKey: "srNo",
    header: "Sr. No",
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
    accessorKey: "aum",
    header: "AUM",
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => {
      const quantity = parseFloat(row.getValue("quantity"));
      return <div className="font-medium">{quantity.toLocaleString()} Units</div>;
    },
  },
];