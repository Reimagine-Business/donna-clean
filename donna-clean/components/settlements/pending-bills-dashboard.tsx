'use client'

import { useMemo } from 'react'
import { type Entry } from '@/lib/entries'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'

interface PendingBillsDashboardProps {
  entries: Entry[]
  open: boolean
  onClose: () => void
  onSettleVendor: (vendor: VendorGroup) => void
}

export interface VendorGroup {
  id: string
  name: string
  itemCount: number
  totalAmount: number
  items: Entry[]
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function PendingBillsDashboard({
  entries,
  open,
  onClose,
  onSettleVendor,
}: PendingBillsDashboardProps) {
  // Group entries by vendor (party)
  const vendorsWithPending = useMemo<VendorGroup[]>(() => {
    const grouped = entries
      .filter(
        (e) =>
          e.entry_type === 'Credit' &&
          !e.settled &&
          (e.remaining_amount ?? e.amount) > 0
      )
      .reduce(
        (acc, entry) => {
          const partyKey = entry.party_id || 'unknown'
          if (!acc[partyKey]) {
            acc[partyKey] = {
              id: partyKey,
              name: entry.party?.name || 'Unknown Vendor',
              items: [],
              totalAmount: 0,
              itemCount: 0,
            }
          }
          acc[partyKey].items.push(entry)
          acc[partyKey].totalAmount += entry.remaining_amount ?? entry.amount
          acc[partyKey].itemCount += 1
          return acc
        },
        {} as Record<string, VendorGroup>
      )

    // Sort by highest outstanding amount
    return Object.values(grouped).sort((a, b) => b.totalAmount - a.totalAmount)
  }, [entries])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pending Bills</DialogTitle>
        </DialogHeader>

        {vendorsWithPending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No pending bills
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              All credit bills have been settled
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Vendor</TableHead>
                  <TableHead className="text-xs sm:text-sm">No of Items</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Amount</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorsWithPending.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium text-sm">
                      {vendor.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm text-center">
                      {vendor.itemCount}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary text-sm">
                      {formatCurrency(vendor.totalAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        onClick={() => onSettleVendor(vendor)}
                        className="text-xs px-3 py-1"
                      >
                        Settle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
