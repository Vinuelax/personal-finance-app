'use client'

import { useEffect, useState, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useData } from '@/lib/data-context'
import { Upload } from 'lucide-react'

interface AddTransactionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type TxnType = 'expense' | 'income'

export function AddTransactionSheet({ open, onOpenChange }: AddTransactionSheetProps) {
  const { addTransaction, categories, addReceipt } = useData()
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [type, setType] = useState<TxnType>('expense')
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [receiptName, setReceiptName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Reset form whenever the sheet closes
  useEffect(() => {
    if (!open) return
    setMerchant('')
    setAmount('')
    setDate(new Date().toISOString().slice(0, 10))
    setCategory(null)
    setNotes('')
    setType('expense')
    setReceiptId(null)
    setReceiptName(null)
  }, [open])

  const handleSubmit = () => {
    const numericAmount = parseFloat(amount)
    if (!merchant.trim() || Number.isNaN(numericAmount)) {
      return
    }

    const signedAmount = type === 'expense' ? -Math.abs(numericAmount) : Math.abs(numericAmount)

    addTransaction({
      merchant: merchant.trim(),
      amount: signedAmount,
      date,
      category,
      notes,
      source: 'manual',
      receiptId,
    })

    onOpenChange(false)
  }

  const handleFile = (file: File) => {
    const total = parseFloat(amount || '0') || 0
    const id = addReceipt({
      imageUrl: URL.createObjectURL(file),
      merchant: merchant || 'New receipt',
      date,
      total: Math.abs(total),
      lineItems: [],
      status: 'needs_review',
      transactionId: null,
    })
    setReceiptId(id)
    setReceiptName(file.name)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Add Transaction</SheetTitle>
          <SheetDescription>Record a manual transaction.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto pb-4">
          <div className="space-y-2">
            <Label htmlFor="merchant">Merchant</Label>
            <Input
              id="merchant"
              placeholder="e.g. Grocery Store"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TxnType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category (optional)</Label>
              <Select
                value={category ?? 'none'}
                onValueChange={(v) => setCategory(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Receipt (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center bg-transparent"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {receiptId ? 'Replace receipt' : 'Add receipt'}
            </Button>
            {receiptName && (
              <Badge variant="secondary" className="mt-1">{receiptName}</Badge>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-bottom">
          <Button className="w-full" onClick={handleSubmit} disabled={!merchant.trim() || amount === ''}>
            Save Transaction
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
