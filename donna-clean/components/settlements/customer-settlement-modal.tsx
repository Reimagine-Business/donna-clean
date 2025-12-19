'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { type Entry } from '@/lib/entries'
import { type CustomerGroup } from './pending-collections-dashboard'
import { createSettlement } from '@/app/settlements/actions'
import { showSuccess, showError } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CustomerSettlementModalProps {
  customer: CustomerGroup | null
  onClose: () => void
  onSuccess?: () => void
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CustomerSettlementModal({
  customer,
  onClose,
  onSuccess,
}: CustomerSettlementModalProps) {
  const router = useRouter()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [amount, setAmount] = useState<number>(0)
  const [settlementDate, setSettlementDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  )
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank'>('Cash')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-select first item if only one exists
  useEffect(() => {
    if (customer && customer.items.length === 1) {
      setSelectedItemId(customer.items[0].id)
    }
  }, [customer])

  // Auto-set full amount when item selected
  useEffect(() => {
    if (selectedItemId && customer) {
      const item = customer.items.find((i) => i.id === selectedItemId)
      if (item) {
        const remaining = item.remaining_amount ?? item.amount
        setAmount(remaining)
      }
    }
  }, [selectedItemId, customer])

  if (!customer) return null

  const selectedItem = customer.items.find((i) => i.id === selectedItemId)
  const selectedItemRemaining = selectedItem
    ? selectedItem.remaining_amount ?? selectedItem.amount
    : 0

  const handleSetHalf = () => {
    if (selectedItem) {
      const remaining = selectedItem.remaining_amount ?? selectedItem.amount
      setAmount(Math.floor(remaining / 2))
    }
  }

  const handleSetFull = () => {
    if (selectedItem) {
      const remaining = selectedItem.remaining_amount ?? selectedItem.amount
      setAmount(remaining)
    }
  }

  const handleConfirmSettlement = async () => {
    if (!selectedItemId) {
      showError('Please select an item to settle')
      return
    }

    if (amount <= 0) {
      showError('Settlement amount must be greater than zero')
      return
    }

    if (amount > selectedItemRemaining) {
      showError(
        `Settlement amount cannot exceed remaining amount (${formatCurrency(selectedItemRemaining)})`
      )
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createSettlement(
        selectedItemId,
        amount,
        settlementDate
      )

      if (result.success) {
        showSuccess(`Successfully settled ${formatCurrency(amount)}!`)
        onSuccess?.()
        onClose()
        router.refresh()
      } else {
        showError(result.error || 'Failed to create settlement')
      }
    } catch (error) {
      console.error('Settlement error:', error)
      showError('An error occurred while processing the settlement')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-2xl bg-background rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-bold">Settle Credit for {customer.name}</h2>
        </div>

        <div className="space-y-3">
          {/* Customer Summary - Compact */}
          <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
            <div>
              <span className="font-semibold">{customer.name}</span>
              <span className="text-sm text-muted-foreground ml-2">
                ({customer.itemCount} {customer.itemCount === 1 ? 'item' : 'items'})
              </span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-primary">
                {formatCurrency(customer.totalAmount)}
              </div>
            </div>
          </div>

          {/* Items List - Always Expanded */}
          <div className="space-y-2">
            {customer.items.map((item) => {
              const itemRemaining = item.remaining_amount ?? item.amount
              const isSelected = item.id === selectedItemId

              return (
                <label
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="selectedItem"
                    checked={isSelected}
                    onChange={() => setSelectedItemId(item.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {item.category} - {format(new Date(item.entry_date), 'MMM dd, yyyy')}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(itemRemaining)}</p>
                        <p className="text-xs text-muted-foreground">remaining</p>
                      </div>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>

          {/* Settlement Form */}
          {selectedItem && (
            <div className="space-y-3">
              {/* Amount Input */}
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-sm">Amount</Label>
                <div className="flex gap-2">
                  <Input
                    id="amount"
                    type="number"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="Enter amount"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={handleSetHalf} className="px-3">
                    Half
                  </Button>
                  <Button type="button" variant="outline" onClick={handleSetFull} className="px-3">
                    Full
                  </Button>
                </div>
                {amount > 0 && amount < selectedItemRemaining && (
                  <p className="text-sm text-muted-foreground">
                    Remaining after settlement: {formatCurrency(selectedItemRemaining - amount)}
                  </p>
                )}
              </div>

              {/* Date & Method in same row on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="settlementDate" className="text-sm">Date</Label>
                  <Input
                    id="settlementDate"
                    type="date"
                    value={settlementDate}
                    onChange={(e) => setSettlementDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="paymentMethod" className="text-sm">Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value) => setPaymentMethod(value as 'Cash' | 'Bank')}
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {!selectedItem && customer.items.length > 1 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Select an item to proceed with settlement
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-4 border-t flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="min-w-[100px]">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSettlement}
            disabled={!selectedItem || isSubmitting || amount <= 0}
            className="min-w-[140px]"
          >
            {isSubmitting ? 'Processing...' : `Confirm - ${formatCurrency(amount)}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
