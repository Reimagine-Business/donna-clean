"use client";

import { useMemo, useState } from "react";
import { type Entry } from "@/app/daily-entries/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CustomerGroup = {
  id: string;
  name: string;
  itemCount: number;
  totalAmount: number;
  items: Entry[];
};

type PendingCollectionsDashboardProps = {
  entries: Entry[];
  open: boolean;
  onClose: () => void;
  onSettleCustomer: (customer: CustomerGroup) => void;
};

export function PendingCollectionsDashboard({
  entries,
  open,
  onClose,
  onSettleCustomer,
}: PendingCollectionsDashboardProps) {
  // Group entries by party and calculate totals
  const customersWithPending = useMemo<CustomerGroup[]>(() => {
    const grouped = entries
      .filter(e => e.entry_type === 'Credit' && !e.settled && (e.remaining_amount ?? e.amount) > 0)
      .reduce((acc, entry) => {
        const partyKey = entry.party_id || 'unknown';
        if (!acc[partyKey]) {
          acc[partyKey] = {
            id: partyKey,
            name: entry.party?.name || 'Unknown Customer',
            items: [],
            totalAmount: 0,
            itemCount: 0,
          };
        }
        acc[partyKey].items.push(entry);
        acc[partyKey].totalAmount += entry.remaining_amount ?? entry.amount;
        acc[partyKey].itemCount += 1;
        return acc;
      }, {} as Record<string, CustomerGroup>);

    return Object.values(grouped).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [entries]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pending Collections</DialogTitle>
          <DialogDescription>
            Outstanding credit sales by customer
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {customersWithPending.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-center">
                <p className="text-lg font-medium">No pending collections</p>
                <p className="text-sm mt-1">All credit sales have been settled</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Pending Items</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customersWithPending.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.itemCount} pending item{customer.itemCount !== 1 ? 's' : ''}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(customer.totalAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        onClick={() => onSettleCustomer(customer)}
                      >
                        Settle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
