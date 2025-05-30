"use client";

import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  error?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  error,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="w-full h-32 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-32 flex items-center justify-center text-destructive">
        {error}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="w-full h-32 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  table.previousPage();
                }}
                className={
                  !table.getCanPreviousPage()
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
            {table.getPageCount() > 0 && (
              <PaginationItem>
                <PaginationLink
                  href="#"
                  isActive={table.getState().pagination.pageIndex === 0}
                  onClick={(e) => {
                    e.preventDefault();
                    table.setPageIndex(0);
                  }}
                >
                  1
                </PaginationLink>
              </PaginationItem>
            )}
            {table.getPageCount() > 3 &&
              table.getState().pagination.pageIndex > 1 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
            {table.getState().pagination.pageIndex > 0 &&
              table.getState().pagination.pageIndex < table.getPageCount() - 1 && (
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    isActive={true}
                    onClick={(e) => {
                      e.preventDefault();
                    }}
                  >
                    {table.getState().pagination.pageIndex + 1}
                  </PaginationLink>
                </PaginationItem>
              )}
            {table.getPageCount() > 3 &&
              table.getState().pagination.pageIndex < table.getPageCount() - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
            {table.getPageCount() > 1 && (
              <PaginationItem>
                <PaginationLink
                  href="#"
                  isActive={
                    table.getState().pagination.pageIndex ===
                    table.getPageCount() - 1
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    table.setPageIndex(table.getPageCount() - 1);
                  }}
                >
                  {table.getPageCount()}
                </PaginationLink>
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  table.nextPage();
                }}
                className={
                  !table.getCanNextPage()
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}