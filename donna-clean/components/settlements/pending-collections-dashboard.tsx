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

interface PendingCollectionsDashboardProps {
  entries: Entry[]
  open: boolean
  onClose: () => void
  onSettleCustomer: (customer: CustomerGroup) => void
}

export interface CustomerGroup {
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

export function PendingCollectionsDashboard({
  entries,
  open,
  onClose,
  onSettleCustomer,
}: PendingCollectionsDashboardProps) {
  // Group entries by customer (party)
  const customersWithPending = useMemo<CustomerGroup[]>(() => {
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
              name: entry.party?.name || 'Unknown Customer',
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
        {} as Record<string, CustomerGroup>
      )

    // Sort by highest outstanding amount
    return Object.values(grouped).sort((a, b) => b.totalAmount - a.totalAmount)
  }, [entries])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pending Collections</DialogTitle>
        </DialogHeader>

        {customersWithPending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No pending collections
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              All credit sales have been settled
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Customer</TableHead>
                  <TableHead className="text-xs sm:text-sm">No of Items</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Amount</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customersWithPending.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium text-sm">
                      {customer.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm text-center">
                      {customer.itemCount}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary text-sm">
                      {formatCurrency(customer.totalAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        onClick={() => onSettleCustomer(customer)}
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
