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
import { Badge } from '@/components/ui/badge'

interface PendingAdvancesDashboardProps {
  entries: Entry[]
  open: boolean
  onClose: () => void
  onSettleAdvance: (advance: AdvanceGroup) => void
}

export interface AdvanceGroup {
  id: string
  name: string
  type: 'Received' | 'Paid'  // Received from customers, Paid to vendors
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

export function PendingAdvancesDashboard({
  entries,
  open,
  onClose,
  onSettleAdvance,
}: PendingAdvancesDashboardProps) {
  // Group entries by party, separating Received and Paid
  const advancesWithPending = useMemo<AdvanceGroup[]>(() => {
    const grouped = entries
      .filter(
        (e) =>
          e.entry_type === 'Advance' &&
          !e.settled &&
          (e.remaining_amount ?? e.amount) > 0
      )
      .reduce(
        (acc, entry) => {
          const partyKey = entry.party_id || 'unknown'
          const advanceType = entry.category === 'Sales' ? 'Received' : 'Paid'
          const uniqueKey = `${partyKey}-${advanceType}`

          if (!acc[uniqueKey]) {
            acc[uniqueKey] = {
              id: partyKey,
              name: entry.party?.name || (advanceType === 'Received' ? 'Unknown Customer' : 'Unknown Vendor'),
              type: advanceType,
              items: [],
              totalAmount: 0,
              itemCount: 0,
            }
          }
          acc[uniqueKey].items.push(entry)
          acc[uniqueKey].totalAmount += entry.remaining_amount ?? entry.amount
          acc[uniqueKey].itemCount += 1
          return acc
        },
        {} as Record<string, AdvanceGroup>
      )

    // Sort by highest outstanding amount
    return Object.values(grouped).sort((a, b) => b.totalAmount - a.totalAmount)
  }, [entries])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pending Advances</DialogTitle>
        </DialogHeader>

        {advancesWithPending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No pending advances
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              All advances have been settled
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Party</TableHead>
                  <TableHead className="text-xs sm:text-sm">Type</TableHead>
                  <TableHead className="text-xs sm:text-sm">No of Items</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Amount</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advancesWithPending.map((advance, index) => (
                  <TableRow key={`${advance.id}-${advance.type}-${index}`}>
                    <TableCell className="font-medium text-sm">
                      {advance.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={advance.type === 'Received' ? 'default' : 'secondary'} className="text-xs">
                        {advance.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm text-center">
                      {advance.itemCount}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary text-sm">
                      {formatCurrency(advance.totalAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        onClick={() => onSettleAdvance(advance)}
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
