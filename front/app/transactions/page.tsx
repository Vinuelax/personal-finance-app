'use client'

import { Suspense, useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { Switch } from '@/components/ui/switch'
import { 
  Search, 
  Filter, 
  ChevronLeft,
  ChevronRight, 
  Tag,
  Pencil,
  Trash2,
  Split,
  Receipt,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  Plus,
  X,
  AlertTriangle,
  Upload,
  Calendar,
  Pause,
  Play,
  StopCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Transaction, TransactionSplit, Category, Budget } from '@/lib/types'

const useCurrencyFormatter = () => {
  const { formatCurrency } = useData()
  return formatCurrency
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  })
}

// Transaction Row Component
interface TransactionRowProps {
  transaction: Transaction
  category: Category | undefined
  onSelect: () => void
}

function TransactionRow({ transaction, category, onSelect }: TransactionRowProps) {
  const formatCurrency = useCurrencyFormatter()
  const isIncome = transaction.amount > 0
  const hasSplits = (transaction.splits?.length || 0) > 0
  const splitHasCategory = transaction.splits?.some(s => s.categoryId) || false
  const isUncategorized = !transaction.category && !isIncome && !splitHasCategory

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
        "hover:bg-accent",
        isUncategorized && "bg-warning/5"
      )}
    >
      <div className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
        isUncategorized ? "bg-warning/20" : "bg-secondary"
      )}>
        {isUncategorized ? (
          <Tag className="h-4 w-4 text-warning" />
        ) : hasSplits ? (
          <Split className="h-4 w-4 text-primary" />
        ) : (
          <span className="text-lg">
            {category?.icon === 'shopping-cart' && '🛒'}
            {category?.icon === 'utensils' && '🍽️'}
            {category?.icon === 'car' && '🚗'}
            {category?.icon === 'film' && '🎬'}
            {category?.icon === 'zap' && '⚡'}
            {category?.icon === 'shopping-bag' && '🛍️'}
            {category?.icon === 'heart' && '❤️'}
            {category?.icon === 'repeat' && '🔄'}
            {!category && isIncome && '💰'}
          </span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{transaction.merchant}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {formatDate(transaction.date)}
          </p>
          {isUncategorized && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 border-warning text-warning">
              Uncategorized
            </Badge>
          )}
          {hasSplits && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              Split
            </Badge>
          )}
        </div>
      </div>
      
      <div className="text-right">
        <p className={cn(
          "font-medium text-sm",
          isIncome ? "text-positive" : "text-foreground"
        )}>
          {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
        </p>
        {transaction.source === 'manual' && (
          <p className="text-[10px] text-muted-foreground">Manual</p>
        )}
      </div>
      
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </button>
  )
}

// Category Picker Sheet
interface CategoryPickerProps {
  open: boolean
  onClose: () => void
  categories: Category[]
  onSelect: (categoryId: string) => void
  currentCategoryId: string | null
}

function CategoryPicker({ open, onClose, categories, onSelect, currentCategoryId }: CategoryPickerProps) {
  const formatCurrency = useCurrencyFormatter()
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Select Category</SheetTitle>
          <SheetDescription>Choose a category for this transaction</SheetDescription>
        </SheetHeader>
        
        <div className="grid grid-cols-2 gap-2 overflow-y-auto">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                onSelect(cat.id)
                onClose()
              }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
                currentCategoryId === cat.id 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-xl">
                {cat.icon === 'shopping-cart' && '🛒'}
                {cat.icon === 'utensils' && '🍽️'}
                {cat.icon === 'car' && '🚗'}
                {cat.icon === 'film' && '🎬'}
                {cat.icon === 'zap' && '⚡'}
                {cat.icon === 'shopping-bag' && '🛍️'}
                {cat.icon === 'heart' && '❤️'}
                {cat.icon === 'repeat' && '🔄'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{cat.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(cat.monthlyBudget - cat.currentMonthSpent)} left
                </p>
              </div>
              {currentCategoryId === cat.id && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Split Dialog
interface SplitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction
  categories: Category[]
  onSave: (splits: TransactionSplit[]) => void
}

function SplitDialog({ open, onOpenChange, transaction, categories, onSave }: SplitDialogProps) {
  const [splits, setSplits] = useState<TransactionSplit[]>(
    transaction.splits && transaction.splits.length > 0
      ? transaction.splits
      : [{
          id: `split-${Date.now()}`,
          label: transaction.merchant,
          amount: Math.abs(transaction.amount),
          categoryId: transaction.category,
        }]
  )

  const totalSplit = splits.reduce((sum, s) => sum + Math.abs(Number(s.amount) || 0), 0)
  const needed = Math.abs(transaction.amount)
  const remaining = Number((needed - totalSplit).toFixed(2))

  const updateSplit = (id: string, updates: Partial<TransactionSplit>) => {
    setSplits(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const addSplitRow = () => {
    setSplits(prev => [...prev, {
      id: `split-${Date.now()}`,
      label: `Part ${prev.length + 1}`,
      amount: 0,
      categoryId: null,
    }])
  }

  const removeSplitRow = (id: string) => {
    setSplits(prev => prev.filter(s => s.id !== id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Split Transaction</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {splits.map((split) => (
            <Card key={split.id} className="p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <Input
                  value={split.label}
                  onChange={(e) => updateSplit(split.id, { label: e.target.value })}
                  placeholder="Label"
                />
                {splits.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeSplitRow(split.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={split.amount ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '') {
                        updateSplit(split.id, { amount: null })
                        return
                      }
                      const parsed = parseFloat(value)
                      updateSplit(split.id, { amount: Number.isNaN(parsed) ? null : parsed })
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select
                    value={split.categoryId ?? 'none'}
                    onValueChange={(v) => updateSplit(split.id, { categoryId: v === 'none' ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          ))}

          <Button variant="outline" onClick={addSplitRow} className="w-full bg-transparent">
            <Plus className="h-4 w-4 mr-2" />
            Add part
          </Button>

          <div className={cn(
            "flex items-center justify-between text-sm font-medium p-3 rounded-md",
            remaining === 0 ? "bg-positive/10 text-positive" : "bg-warning/10 text-warning-foreground"
          )}>
            <span>Remaining</span>
            <span>${Math.abs(remaining).toFixed(2)}</span>
          </div>

          {remaining !== 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Splits must add up to the transaction total (${needed.toFixed(2)}).
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 bg-transparent" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            className="flex-1" 
            onClick={() => { onSave(splits); onOpenChange(false) }} 
            disabled={remaining !== 0}
          >
            Save splits
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Receipt dialog
interface ReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction
  hasReceipt: boolean
  onAttach: (transactionId: string, receiptId: string | null) => void
  onCreateReceipt: (receipt: { imageUrl: string; merchant: string; date: string; total: number }) => string
  onDetach: () => void
}

function ReceiptDialog({ open, onOpenChange, transaction, hasReceipt, onAttach, onCreateReceipt, onDetach }: ReceiptDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File) => {
    setUploading(true)
    const previewUrl = URL.createObjectURL(file)
    const receiptId = onCreateReceipt({
      imageUrl: previewUrl,
      merchant: transaction.merchant,
      date: transaction.date,
      total: Math.abs(transaction.amount),
    })
    onAttach(transaction.id, receiptId)
    setUploading(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{hasReceipt ? 'Update Receipt' : 'Attach Receipt'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="border rounded-lg p-4 text-center">
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
              variant="outline" 
              className="bg-transparent"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading…' : 'Upload file'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Attach a photo or PDF of the receipt to this transaction.
            </p>
          </div>

          {hasReceipt && (
            <Button variant="ghost" className="text-destructive" onClick={onDetach}>
              Remove attached receipt
            </Button>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 bg-transparent" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="flex-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {hasReceipt ? 'Replace receipt' : 'Add receipt'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Transaction Detail Sheet
interface TransactionDetailProps {
  transaction: Transaction | null
  categories: Category[]
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Transaction>) => void
  onDelete: (id: string) => void
  onAttachReceipt: (transactionId: string, receiptId: string | null) => void
  onCreateReceipt: (receipt: { imageUrl: string; merchant: string; date: string; total: number }) => string
}

function TransactionDetail({ transaction, categories, onClose, onUpdate, onDelete, onAttachReceipt, onCreateReceipt }: TransactionDetailProps) {
  const formatCurrency = useCurrencyFormatter()
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const { toast } = useToast()
  const category = categories.find(c => c.id === transaction?.category)

  if (!transaction) return null

  const hasReceipt = !!transaction.receiptId

  return (
    <>
      <Sheet open={!!transaction} onOpenChange={() => onClose()}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>{transaction.merchant}</SheetTitle>
            <SheetDescription>
              {formatDate(transaction.date)} · {transaction.source === 'bank' ? 'Bank import' : 'Manual entry'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 overflow-y-auto pb-20">
            {/* Amount */}
            <div className="text-center py-4">
              <p className={cn(
                "text-4xl font-bold",
                transaction.amount > 0 ? "text-positive" : "text-foreground"
              )}>
                {transaction.amount > 0 ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
              </p>
              {transaction.splits && transaction.splits.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {transaction.splits.length} split{transaction.splits.length > 1 ? 's' : ''} · {transaction.splits.map(s => s.label).join(', ')}
                </p>
              )}
            </div>

            {/* Category / Splits */}
            {transaction.splits && transaction.splits.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Splits</Label>
                  <Button variant="ghost" size="sm" onClick={() => setShowSplitDialog(true)}>
                    <Split className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="rounded-lg border divide-y bg-muted/30">
                  {transaction.splits.map(split => {
                    const splitCat = categories.find(c => c.id === split.categoryId)
                    return (
                      <div className="flex items-center justify-between p-3" key={split.id}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl">
                            {splitCat?.icon === 'shopping-cart' && '🛒'}
                            {splitCat?.icon === 'utensils' && '🍽️'}
                            {splitCat?.icon === 'car' && '🚗'}
                            {splitCat?.icon === 'film' && '🎬'}
                            {splitCat?.icon === 'zap' && '⚡'}
                            {splitCat?.icon === 'shopping-bag' && '🛍️'}
                            {splitCat?.icon === 'heart' && '❤️'}
                            {splitCat?.icon === 'repeat' && '🔄'}
                            {!splitCat && '🏷️'}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{split.label}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {splitCat ? splitCat.name : 'No category'}
                            </p>
                          </div>
                        </div>
                        <span className="font-medium">{formatCurrency(Math.abs(split.amount ?? 0))}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Category</Label>
                <button
                  onClick={() => setShowCategoryPicker(true)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {category ? (
                      <>
                        <span className="text-xl">
                          {category.icon === 'shopping-cart' && '🛒'}
                          {category.icon === 'utensils' && '🍽️'}
                          {category.icon === 'car' && '🚗'}
                          {category.icon === 'film' && '🎬'}
                          {category.icon === 'zap' && '⚡'}
                          {category.icon === 'shopping-bag' && '🛍️'}
                          {category.icon === 'heart' && '❤️'}
                          {category.icon === 'repeat' && '🔄'}
                        </span>
                        <span className="font-medium">{category.name}</span>
                      </>
                    ) : (
                      <>
                        <Tag className="h-5 w-5 text-muted-foreground" />
                        <span className="text-muted-foreground">No category</span>
                      </>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add a note..."
                value={transaction.notes}
                onChange={(e) => onUpdate(transaction.id, { notes: e.target.value })}
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-1 bg-transparent"
                onClick={() => setShowSplitDialog(true)}
              >
                <Split className="h-4 w-4" />
                <span className="text-xs">Split</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-1 bg-transparent"
                onClick={() => setShowReceiptDialog(true)}
              >
                <Receipt className="h-4 w-4" />
                <span className="text-xs">{hasReceipt ? 'Replace' : 'Receipt'}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-3 flex-col gap-1 text-destructive hover:text-destructive bg-transparent"
                onClick={() => {
                  onDelete(transaction.id)
                  onClose()
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-xs">Delete</span>
              </Button>
            </div>
          </div>

          {/* Fixed bottom actions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-bottom">
            <Button className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <CategoryPicker
        open={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        categories={categories}
        currentCategoryId={transaction.category}
        onSelect={(categoryId) => onUpdate(transaction.id, { category: categoryId })}
      />

      <SplitDialog
        open={showSplitDialog}
        onOpenChange={setShowSplitDialog}
        transaction={transaction}
        categories={categories}
        onSave={(splits) => {
          const newCategory = splits.length > 1
            ? null
            : (splits[0]?.categoryId ?? transaction.category ?? null)
          onUpdate(transaction.id, { splits, category: newCategory })
          toast({ title: 'Splits updated' })
        }}
      />

      <ReceiptDialog
        open={showReceiptDialog}
        onOpenChange={setShowReceiptDialog}
        transaction={transaction}
        onAttach={onAttachReceipt}
        onCreateReceipt={onCreateReceipt}
        hasReceipt={hasReceipt}
        onDetach={() => {
          onAttachReceipt(transaction.id, null)
          toast({ title: 'Receipt removed' })
        }}
      />
    </>
  )
}

// Budget Edit Dialog
interface BudgetEditDialogProps {
  open: boolean
  onClose: () => void
  category: Category | null
  month: string
  budgetLimit: number
  budgetEntry?: Budget | null
  onSaveCategory: (id: string, updates: Partial<Category>) => void
  onSaveBudget: (month: string, categoryId: string, data: { limit: number; rollover?: boolean; rolloverTargetCategoryId?: string | null; purpose?: string | null; carryForwardEnabled?: boolean; isTerminal?: boolean; applyToFuture?: boolean }) => void | Promise<void>
  onDeleteBudget: (categoryId: string, scope: 'this_month' | 'from_month' | 'all', month: string) => Promise<void>
  categories: Category[]
}

function BudgetEditDialog({ open, onClose, category, month, budgetLimit, budgetEntry, onSaveCategory, onSaveBudget, onDeleteBudget, categories }: BudgetEditDialogProps) {
  const [budget, setBudget] = useState(budgetLimit !== undefined ? budgetLimit.toString() : '')
  const [rollover, setRollover] = useState(category?.rollover || false)
  const [rolloverTarget, setRolloverTarget] = useState<string>(category?.rolloverTargetCategoryId || 'none')
  const [purpose, setPurpose] = useState<string>('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [onlyThisMonth, setOnlyThisMonth] = useState(false)
  const [lastMonth, setLastMonth] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteScope, setDeleteScope] = useState<'this_month' | 'from_month' | 'all'>('this_month')

  const handleSave = async () => {
    if (!category || !budget) return
    setIsSaving(true)
    const limit = parseFloat(budget)
    const carryForwardEnabled = !(onlyThisMonth || lastMonth)
    try {
      await onSaveBudget(month, category.id, {
        limit,
        rollover,
        rolloverTargetCategoryId: rollover ? (rolloverTarget === 'none' ? null : rolloverTarget) : null,
        purpose: purpose || null,
        carryForwardEnabled,
        isTerminal: lastMonth,
        applyToFuture: !onlyThisMonth && !lastMonth,
      })
    } finally {
      setIsSaving(false)
    }
    onSaveCategory(category.id, { 
      rollover,
      rolloverTargetCategoryId: rollover ? (rolloverTarget === 'none' ? null : rolloverTarget) : null,
    })
    onClose()
  }

  const handleDelete = async () => {
    if (!category) return
    setIsSaving(true)
    try {
      await onDeleteBudget(category.id, deleteScope, month)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  // Update state when category changes
  useEffect(() => {
    if (category) {
      setBudget(budgetLimit !== undefined ? budgetLimit.toString() : '')
      setRollover(category.rollover)
      setRolloverTarget(category.rolloverTargetCategoryId || 'none')
      setPurpose(budgetEntry?.purpose || '')
      setOnlyThisMonth((budgetEntry?.carryForwardEnabled ?? true) === false && !Boolean(budgetEntry?.isTerminal))
      setLastMonth(Boolean(budgetEntry?.isTerminal))
      setAdvancedOpen(false)
    } else {
      setBudget('')
      setRollover(false)
      setRolloverTarget('none')
      setPurpose('')
      setOnlyThisMonth(false)
      setLastMonth(false)
      setAdvancedOpen(false)
    }
  }, [category, budgetLimit, budgetEntry])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setBudget('') } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Budget: {category?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="budget">Monthly Budget</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="budget"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose (optional)</Label>
            <Input
              id="purpose"
              placeholder="e.g., Ski trip installments"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start bg-transparent"
            onClick={() => setAdvancedOpen(prev => !prev)}
          >
            {advancedOpen ? 'Hide advanced options' : 'Advanced options'}
          </Button>
          {advancedOpen && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Only this month</Label>
                  <p className="text-xs text-muted-foreground">Future months won&apos;t inherit this budget.</p>
                </div>
                <Switch
                  checked={onlyThisMonth}
                  onCheckedChange={(checked) => {
                    setOnlyThisMonth(checked)
                    if (checked) {
                      setLastMonth(false)
                    }
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Last month</Label>
                  <p className="text-xs text-muted-foreground">This entry ends the timeline after this month.</p>
                </div>
                <Switch
                  checked={lastMonth}
                  onCheckedChange={(checked) => {
                    setLastMonth(checked)
                    if (checked) {
                      setOnlyThisMonth(false)
                    }
                  }}
                />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <Label>Rollover unused budget</Label>
              <p className="text-xs text-muted-foreground">
                Carry over remaining budget to next month
              </p>
            </div>
            <Button
              variant={rollover ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRollover(!rollover)}
            >
              {rollover ? 'On' : 'Off'}
            </Button>
          </div>
          {rollover && (
            <div className="space-y-2">
              <Label htmlFor="rollover-target">Send surplus to</Label>
              <Select
                value={rolloverTarget}
                onValueChange={setRolloverTarget}
              >
                <SelectTrigger id="rollover-target">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Stay in same category</SelectItem>
                  {categories
                    .filter(cat => !category || cat.id !== category.id)
                    .map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Surplus calculated at month end will boost the selected category&apos;s next-month budget.
              </p>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Select value={deleteScope} onValueChange={(v) => setDeleteScope(v as 'this_month' | 'from_month' | 'all')}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">Delete this month</SelectItem>
                <SelectItem value="from_month">Delete from here</SelectItem>
                <SelectItem value="all">Delete everywhere</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              Delete
            </Button>
            <Button onClick={handleSave} className="flex-1" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Add Budget Dialog
interface AddBudgetDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (category: Omit<Category, 'id' | 'currentMonthSpent'> & { purpose?: string | null }) => Promise<string | null>
}

const CATEGORY_ICONS = [
  { icon: 'shopping-cart', emoji: '🛒', label: 'Groceries' },
  { icon: 'utensils', emoji: '🍽️', label: 'Food' },
  { icon: 'car', emoji: '🚗', label: 'Transport' },
  { icon: 'film', emoji: '🎬', label: 'Entertainment' },
  { icon: 'zap', emoji: '⚡', label: 'Utilities' },
  { icon: 'shopping-bag', emoji: '🛍️', label: 'Shopping' },
  { icon: 'heart', emoji: '❤️', label: 'Health' },
  { icon: 'repeat', emoji: '🔄', label: 'Subscriptions' },
]

const CATEGORY_COLORS = [
  '#4ade80', '#f97316', '#3b82f6', '#a855f7', 
  '#eab308', '#ec4899', '#ef4444', '#06b6d4'
]

function AddBudgetDialog({ open, onClose, onAdd }: AddBudgetDialogProps) {
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('shopping-cart')
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0])
  const [rollover, setRollover] = useState(false)
  const [rolloverTarget, setRolloverTarget] = useState('none')
  const [purpose, setPurpose] = useState('')

  const handleAdd = async () => {
    if (name && budget) {
      await onAdd({
        name,
        icon: selectedIcon,
        color: selectedColor,
        monthlyBudget: parseFloat(budget),
        rollover,
        rolloverTargetCategoryId: rollover ? (rolloverTarget === 'none' ? null : rolloverTarget) : null,
        purpose,
      })
      setName('')
      setBudget('')
      setSelectedIcon('shopping-cart')
      setSelectedColor(CATEGORY_COLORS[0])
      setRollover(false)
      setRolloverTarget('none')
      setPurpose('')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Budget Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              placeholder="e.g., Groceries"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Monthly Budget</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="budget"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purpose-add">Purpose (optional)</Label>
            <Input
              id="purpose-add"
              placeholder="e.g., Ski trip installments"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORY_ICONS.map(({ icon, emoji }) => (
                <button
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={cn(
                    "h-12 rounded-lg border-2 flex items-center justify-center text-xl transition-colors",
                    selectedIcon === icon 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all",
                    selectedColor === color 
                      ? "border-foreground scale-110" 
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleAdd} className="flex-1" disabled={!name || !budget}>
              Add Category
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Budgets View
export function BudgetsView({ categories, transactions, budgetsByMonth, fetchBudgetsForMonth, onCopyBudgets, onUpsertBudget, onDeleteBudget, onUpdateCategory, onAddCategory }: { 
  categories: Category[]
  transactions: Transaction[]
  budgetsByMonth: Record<string, Budget[]>
  fetchBudgetsForMonth: (month: string, force?: boolean) => Promise<void>
  onCopyBudgets: (month: string, sourceMonth: string) => Promise<void>
  onUpsertBudget: (month: string, categoryId: string, data: { limit: number; rollover?: boolean; rolloverTargetCategoryId?: string | null; purpose?: string | null; carryForwardEnabled?: boolean; isTerminal?: boolean; applyToFuture?: boolean }) => void | Promise<void>
  onDeleteBudget: (categoryId: string, scope: 'this_month' | 'from_month' | 'all', month: string) => Promise<void>
  onUpdateCategory: (id: string, updates: Partial<Category>) => void
  onAddCategory: (category: Omit<Category, 'id' | 'currentMonthSpent'> & { purpose?: string | null }) => Promise<string | null>
}) {
  const formatCurrency = useCurrencyFormatter()
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
  })
  const currentMonthStart = useMemo(() => {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  }, [])
  const normalizeDate = (dateStr: string) => {
    const base = dateStr.split('T')[0]
    return new Date(`${base}T00:00:00Z`)
  }
  const isInSelectedMonth = (dateStr: string) => {
    const d = normalizeDate(dateStr)
    return (
      d.getUTCFullYear() === selectedMonth.getUTCFullYear() &&
      d.getUTCMonth() === selectedMonth.getUTCMonth()
    )
  }
  const isInMonth = (dateStr: string, monthRef: Date) => {
    const d = normalizeDate(dateStr)
    return d.getUTCFullYear() === monthRef.getUTCFullYear() && d.getUTCMonth() === monthRef.getUTCMonth()
  }

  const monthTransactions = useMemo(
    () => transactions.filter(t => isInSelectedMonth(t.date)),
    [transactions, selectedMonth]
  )
  const prevMonth = useMemo(() => {
    const d = new Date(selectedMonth)
    d.setUTCMonth(d.getUTCMonth() - 1)
    return d
  }, [selectedMonth])
  const prevMonthTransactions = useMemo(
    () => transactions.filter(t => isInMonth(t.date, prevMonth)),
    [transactions, prevMonth]
  )

  const selectedMonthKey = useMemo(() => selectedMonth.toISOString().slice(0, 7), [selectedMonth])
  const prevMonthKey = useMemo(() => prevMonth.toISOString().slice(0, 7), [prevMonth])

  const selectedMonthBudgets = budgetsByMonth[selectedMonthKey] || []
  const selectedBudgetEntryByCategory = useMemo(() => {
    const map: Record<string, Budget> = {}
    selectedMonthBudgets.forEach(b => { map[b.categoryId] = b })
    return map
  }, [selectedMonthBudgets])
  const budgetByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    selectedMonthBudgets.forEach(b => { map[b.categoryId] = b.limit })
    return map
  }, [selectedMonthBudgets])

  const prevBudgetByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    ;(budgetsByMonth[prevMonthKey] || []).forEach(b => { map[b.categoryId] = b.limit })
    return map
  }, [budgetsByMonth, prevMonthKey])

  useEffect(() => {
    fetchBudgetsForMonth(selectedMonthKey, true)
    fetchBudgetsForMonth(prevMonthKey, true)
  }, [fetchBudgetsForMonth, selectedMonthKey, prevMonthKey])

  const rolloverIntoTargets = useMemo(() => {
    const spentPrev: Record<string, number> = {}
    prevMonthTransactions.forEach(t => {
      if (t.amount >= 0) return
      if (t.splits && t.splits.length > 0) {
        t.splits.forEach(s => {
          if (!s.categoryId) return
          const amt = Math.abs(s.amount ?? 0)
          spentPrev[s.categoryId] = (spentPrev[s.categoryId] || 0) + amt
        })
        return
      }
      if (t.category) {
        spentPrev[t.category] = (spentPrev[t.category] || 0) + Math.abs(t.amount)
      }
    })
    const surplusBySource: Record<string, number> = {}
    categories.forEach(cat => {
      const budgetLimit = prevBudgetByCategory[cat.id] ?? cat.monthlyBudget
      const spent = spentPrev[cat.id] || 0
      const surplus = Math.max(0, budgetLimit - spent)
      surplusBySource[cat.id] = surplus
    })
    const inflowByTarget: Record<string, number> = {}
    categories.forEach(cat => {
      if (cat.rollover && cat.rolloverTargetCategoryId) {
        const surplus = surplusBySource[cat.id] || 0
        inflowByTarget[cat.rolloverTargetCategoryId] = (inflowByTarget[cat.rolloverTargetCategoryId] || 0) + surplus
      }
    })
    return inflowByTarget
  }, [categories, prevMonthTransactions])

  const spendingByCategory = useMemo(() => {
    const totals: Record<string, number> = {}
    monthTransactions.forEach(t => {
      if (t.amount >= 0) return
      if (t.splits && t.splits.length > 0) {
        t.splits.forEach(s => {
          if (!s.categoryId) return
          const amt = Math.abs(s.amount ?? 0)
          totals[s.categoryId] = (totals[s.categoryId] || 0) + amt
        })
      } else if (t.category) {
        totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount)
      }
    })
    return totals
  }, [monthTransactions])

  const monthCategories = useMemo(
    () => selectedMonthBudgets
      .map(budget => {
        const cat = categories.find(c => c.id === budget.categoryId)
        if (!cat) return null
        const spent = spendingByCategory[cat.id] || 0
        const rolloverBoost = rolloverIntoTargets[cat.id] || 0
        const limit = (budgetByCategory[cat.id] ?? 0) + rolloverBoost
        return { ...cat, currentMonthSpent: spent, monthlyBudget: limit }
      })
      .filter((cat): cat is Category => cat !== null),
    [selectedMonthBudgets, categories, spendingByCategory, rolloverIntoTargets, budgetByCategory],
  )
  
  const sortedCategories = useMemo(
    () => [...monthCategories].sort((a, b) => {
      const aRemaining = a.monthlyBudget - a.currentMonthSpent
      const bRemaining = b.monthlyBudget - b.currentMonthSpent
      const aOver = aRemaining < 0
      const bOver = bRemaining < 0
      if (aOver !== bOver) return aOver ? -1 : 1

      const aRatio = a.monthlyBudget > 0 ? a.currentMonthSpent / a.monthlyBudget : 0
      const bRatio = b.monthlyBudget > 0 ? b.currentMonthSpent / b.monthlyBudget : 0
      if (bRatio !== aRatio) return bRatio - aRatio

      return a.name.localeCompare(b.name)
    }),
    [monthCategories],
  )

  const totalBudget = monthCategories.reduce((sum, c) => sum + c.monthlyBudget, 0)
  const totalSpent = monthCategories.reduce((sum, c) => sum + c.currentMonthSpent, 0)
  const prevHasBudgets = (budgetsByMonth[prevMonthKey] || []).length > 0
  const hasBudgets = selectedMonthBudgets.length > 0

  const goMonth = (delta: number) => {
    setSelectedMonth(prev => {
      const next = new Date(prev)
      next.setUTCMonth(prev.getUTCMonth() + delta)
      return new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), 1))
    })
  }
  const canGoForward = selectedMonth < currentMonthStart

  const handleAddCategory = async (category: Omit<Category, 'id' | 'currentMonthSpent'> & { purpose?: string | null }) => {
    const id = await onAddCategory(category)
    if (id && category.monthlyBudget !== undefined) {
      await onUpsertBudget(selectedMonthKey, id, { limit: category.monthlyBudget, rollover: category.rollover, purpose: category.purpose ?? category.name })
    }
    return id
  }

  return (
    <div className="space-y-4 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => goMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[160px] text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Month</p>
            <p className="font-semibold">
              {selectedMonth.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={() => goMonth(1)} disabled={!canGoForward}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-right">
          <h2 className="font-semibold">Budgets</h2>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)} spent
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </Button>
        {!hasBudgets && prevHasBudgets && (
          <Button size="sm" onClick={() => onCopyBudgets(selectedMonthKey, prevMonthKey)}>
            Copy last month
          </Button>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {sortedCategories.map(category => {
          const percentage = category.monthlyBudget
            ? (category.currentMonthSpent / category.monthlyBudget) * 100
            : 0
          const remaining = category.monthlyBudget - category.currentMonthSpent
          const isOverBudget = remaining < 0

          return (
            <Card key={category.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setEditingCategory(category)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">
                    {category.icon === 'shopping-cart' && '🛒'}
                    {category.icon === 'utensils' && '🍽️'}
                    {category.icon === 'car' && '🚗'}
                    {category.icon === 'film' && '🎬'}
                    {category.icon === 'zap' && '⚡'}
                    {category.icon === 'shopping-bag' && '🛍️'}
                    {category.icon === 'heart' && '❤️'}
                    {category.icon === 'repeat' && '🔄'}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-medium">{category.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(category.currentMonthSpent)} of {formatCurrency(category.monthlyBudget)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-medium",
                      isOverBudget ? "text-negative" : "text-positive"
                    )}>
                      {isOverBudget 
                        ? `-${formatCurrency(Math.abs(remaining))}` 
                        : formatCurrency(remaining)
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isOverBudget ? 'over' : 'left'}
                    </p>
                  </div>
                </div>
                <Progress 
                  value={Math.min(percentage, 100)} 
                  className={cn(
                    "h-2",
                    isOverBudget && "[&>div]:bg-negative"
                  )}
                />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <BudgetEditDialog
        open={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        category={editingCategory}
        month={selectedMonthKey}
        budgetLimit={editingCategory ? (budgetByCategory[editingCategory.id] ?? editingCategory.monthlyBudget) : 0}
        budgetEntry={editingCategory ? selectedBudgetEntryByCategory[editingCategory.id] : null}
        onSaveCategory={onUpdateCategory}
        onSaveBudget={onUpsertBudget}
        onDeleteBudget={onDeleteBudget}
        categories={categories}
      />

      <AddBudgetDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddCategory}
      />
    </div>
  )
}

function TransactionsContent() {
  const isValidTransactionsTab = (tab: string | null): tab is 'transactions' | 'recurring' =>
    tab === 'transactions' || tab === 'recurring'

  const { 
    transactions, 
    categories, 
    budgets,
    fetchBudgetsForMonth,
    recurringPayments,
    billInstances,
    updateBillInstance,
    addRecurringPayment,
    updateRecurringPayment,
    toggleRecurringPause,
    stopRecurringPayment,
    updateTransaction, 
    deleteTransaction, 
    attachReceiptToTransaction, 
    addReceipt,
    importTransactionsFile,
  } = useData()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'uncategorized' | 'categorized'>('all')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const searchParams = useSearchParams()
  const initialTabParam = searchParams.get('tab')
  const initialTab = isValidTransactionsTab(initialTabParam) ? initialTabParam : 'transactions'
  const [activeTab, setActiveTab] = useState(initialTab)
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (!tab) return
    if (!isValidTransactionsTab(tab)) {
      if (activeTab !== 'transactions') setActiveTab('transactions')
      return
    }
    if (tab !== activeTab) setActiveTab(tab)
  }, [searchParams, activeTab])
  const [recurringFormOpen, setRecurringFormOpen] = useState(false)
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null)
  const [recurringForm, setRecurringForm] = useState({
    name: '',
    amount: '',
    cadence: 'monthly' as 'weekly' | 'monthly' | 'yearly',
    dayOfMonth: '1',
    categoryId: 'none',
    autoPost: true,
  })
  const [isImporting, setIsImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const handleImport = async (file: File | null) => {
    if (!file) return
    setIsImporting(true)
    setImportMessage(null)
    try {
      const result = await importTransactionsFile(file)
      if (result) {
        const { imported, skipped, errors } = result
        setImportMessage(`Imported ${imported} transactions${skipped ? `, skipped ${skipped}` : ''}${errors?.length ? ` (${errors.length} errors)` : ''}`)
      }
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const handleUpdate = useCallback((id: string, updates: Partial<Transaction>) => {
    updateTransaction(id, updates)
    setSelectedTransaction((prev) => prev && prev.id === id ? { ...prev, ...updates } : prev)
  }, [updateTransaction])

  const isTxnUncategorized = useCallback((t: Transaction) => {
    const hasSplits = (t.splits?.length || 0) > 0
    const splitHasCategory = t.splits?.some(s => s.categoryId) || false
    return t.amount < 0 && !t.category && !(hasSplits && splitHasCategory)
  }, [])

  // Filter and group transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions

    // Apply filter
    if (filter === 'uncategorized') {
      filtered = filtered.filter(isTxnUncategorized)
    } else if (filter === 'categorized') {
      filtered = filtered.filter(t => t.category !== null || t.amount > 0 || (t.splits && t.splits.some(s => s.categoryId)))
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t => 
        t.merchant.toLowerCase().includes(query) ||
        t.notes.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [transactions, filter, searchQuery, isTxnUncategorized])

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {}
    filteredTransactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = []
      groups[t.date].push(t)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredTransactions])

  const uncategorizedCount = transactions.filter(isTxnUncategorized).length
  const recurringActive = recurringPayments.filter(p => !p.endDate)
  const recurringStopped = recurringPayments.filter(p => p.endDate)
  const selectedTransactionMonth = useMemo(
    () => (selectedTransaction?.date ? selectedTransaction.date.split('T')[0].slice(0, 7) : null),
    [selectedTransaction],
  )

  useEffect(() => {
    if (!selectedTransactionMonth) return
    fetchBudgetsForMonth(selectedTransactionMonth)
  }, [selectedTransactionMonth, fetchBudgetsForMonth])

  const pickerCategories = useMemo(() => {
    if (!selectedTransactionMonth) return categories
    const monthBudgets = budgets[selectedTransactionMonth] || []
    const budgetByCategory: Record<string, number> = {}
    monthBudgets.forEach(b => { budgetByCategory[b.categoryId] = b.limit })

    const spendingByCategory: Record<string, number> = {}
    transactions.forEach(t => {
      const txnMonth = t.date.split('T')[0].slice(0, 7)
      if (txnMonth !== selectedTransactionMonth || t.amount >= 0) return
      if (t.splits && t.splits.length > 0) {
        t.splits.forEach(s => {
          if (!s.categoryId) return
          spendingByCategory[s.categoryId] = (spendingByCategory[s.categoryId] || 0) + Math.abs(s.amount ?? 0)
        })
        return
      }
      if (t.category) {
        spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + Math.abs(t.amount)
      }
    })

    return categories.map(cat => ({
      ...cat,
      monthlyBudget: budgetByCategory[cat.id] ?? 0,
      currentMonthSpent: spendingByCategory[cat.id] ?? 0,
    }))
  }, [selectedTransactionMonth, categories, budgets, transactions])

  return (
    <AppShell title="Transactions" showSearch>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-14 z-30 bg-background border-b">
          <TabsList className="w-full justify-start rounded-none border-0 h-12 px-4 lg:px-6">
            <TabsTrigger value="transactions" className="relative">
              Transactions
              {uncategorizedCount > 0 && (
                <Badge className="ml-2 h-5 px-1.5 text-[10px]">
                  {uncategorizedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="transactions" className="mt-0">
          {/* Search and Filters */}
          <div className="sticky top-[104px] z-20 bg-background px-4 lg:px-6 py-3 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 flex-wrap items-center">
              {(['all', 'uncategorized', 'categorized'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className="capitalize"
                >
                  {f}
                  {f === 'uncategorized' && uncategorizedCount > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                      {uncategorizedCount}
                    </Badge>
                  )}
                </Button>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                  id="file-import"
                  onChange={(e) => handleImport(e.target.files?.[0] || null)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isImporting}
                  onClick={() => document.getElementById('file-import')?.click()}
                >
                  {isImporting ? 'Importing…' : 'Import CSV/XLSX'}
                </Button>
                {importMessage && (
                  <p className="text-xs text-muted-foreground">{importMessage}</p>
                )}
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="px-4 lg:px-6 py-4">
            {groupedTransactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Receipt className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No transactions found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery 
                    ? 'Try adjusting your search' 
                    : filter === 'uncategorized' 
                      ? 'All transactions are categorized!'
                      : 'Add your first transaction'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedTransactions.map(([date, txns]) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 sticky top-[180px] bg-background py-1">
                      {formatDate(date)}
                    </h3>
                    <div className="space-y-1">
                      {txns.map(txn => (
                        <TransactionRow
                          key={txn.id}
                          transaction={txn}
                          category={categories.find(c => c.id === txn.category)}
                          onSelect={() => setSelectedTransaction(txn)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recurring" className="mt-0">
          <div className="px-4 lg:px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Recurring payments</h2>
                <p className="text-sm text-muted-foreground">Add, pause, or stop automatic bills.</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingRecurringId(null)
                  setRecurringForm({
                    name: '',
                    amount: '',
                    cadence: 'monthly',
                    dayOfMonth: '1',
                    categoryId: 'none',
                    autoPost: true,
                  })
                  setRecurringFormOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            <Card>
              <CardHeader className="pb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Active</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recurringActive.length === 0 && (
                  <p className="text-sm text-muted-foreground">No active recurring payments.</p>
                )}
                {recurringActive.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">${p.amount.toFixed(2)} · {p.cadence} on day {p.dayOfMonth}</p>
                      {p.paused && (
                        <Badge variant="secondary" className="text-[10px]">Paused</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent"
                        onClick={() => {
                          setEditingRecurringId(p.id)
                          setRecurringForm({
                            name: p.name,
                            amount: p.amount.toString(),
                            cadence: p.cadence,
                            dayOfMonth: p.dayOfMonth.toString(),
                            categoryId: p.categoryId ?? 'none',
                            autoPost: p.autoPost,
                          })
                          setRecurringFormOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent"
                        onClick={() => toggleRecurringPause(p.id, !p.paused)}
                      >
                        {p.paused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                        {p.paused ? 'Resume' : 'Pause'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => stopRecurringPayment(p.id)}
                      >
                        <StopCircle className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex items-center gap-2">
                <CardTitle className="text-base">Upcoming bills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {billInstances.length === 0 && (
                  <p className="text-sm text-muted-foreground">No bills yet.</p>
                )}
                {billInstances.map(b => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{recurringPayments.find(r => r.id === b.recurringPaymentId)?.name || 'Bill'}</p>
                      <p className="text-xs text-muted-foreground">Due {b.dueDate}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={b.status}
                        onValueChange={(val) => updateBillInstance(b.id, { status: val as any })}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="projected">Projected</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent"
                        onClick={() => updateBillInstance(b.id, { status: b.status === 'paid' ? 'projected' : 'paid' })}
                      >
                        Mark {b.status === 'paid' ? 'Projected' : 'Paid'}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {recurringStopped.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Stopped</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recurringStopped.map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">${p.amount.toFixed(2)} · ended {p.endDate}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Transaction Detail Sheet */}
      <TransactionDetail
        transaction={selectedTransaction}
        categories={pickerCategories}
        onClose={() => setSelectedTransaction(null)}
        onUpdate={handleUpdate}
        onDelete={deleteTransaction}
        onAttachReceipt={attachReceiptToTransaction}
        onCreateReceipt={({ imageUrl, merchant, date, total }) => addReceipt({
          imageUrl,
          merchant,
          date,
          total,
          lineItems: [],
          status: 'needs_review',
          transactionId: selectedTransaction?.id ?? null,
        })}
      />

      <Dialog open={recurringFormOpen} onOpenChange={setRecurringFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRecurringId ? 'Edit recurring payment' : 'Add recurring payment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={recurringForm.name} onChange={(e) => setRecurringForm({ ...recurringForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={recurringForm.amount}
                  onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label>Day of month</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={recurringForm.dayOfMonth}
                  onChange={(e) => setRecurringForm({ ...recurringForm, dayOfMonth: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cadence</Label>
                <Select
                  value={recurringForm.cadence}
                  onValueChange={(v) => setRecurringForm({ ...recurringForm, cadence: v as 'weekly' | 'monthly' | 'yearly' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={recurringForm.categoryId}
                  onValueChange={(v) => setRecurringForm({ ...recurringForm, categoryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Auto-post transactions</Label>
                <p className="text-xs text-muted-foreground">Automatically create the bill on its due date.</p>
              </div>
              <Switch
                checked={recurringForm.autoPost}
                onCheckedChange={(checked) => setRecurringForm({ ...recurringForm, autoPost: checked })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="bg-transparent flex-1" onClick={() => { setRecurringFormOpen(false); setEditingRecurringId(null) }}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (!recurringForm.name || !recurringForm.amount) return

                if (editingRecurringId) {
                  updateRecurringPayment(editingRecurringId, {
                    name: recurringForm.name.trim(),
                    amount: parseFloat(recurringForm.amount),
                    cadence: recurringForm.cadence,
                    dayOfMonth: parseInt(recurringForm.dayOfMonth || '1', 10),
                    categoryId: recurringForm.categoryId === 'none' ? null : recurringForm.categoryId,
                    autoPost: recurringForm.autoPost,
                  })
                } else {
                  addRecurringPayment({
                    name: recurringForm.name.trim(),
                    amount: parseFloat(recurringForm.amount),
                    cadence: recurringForm.cadence,
                    dayOfMonth: parseInt(recurringForm.dayOfMonth || '1', 10),
                    categoryId: recurringForm.categoryId === 'none' ? null : recurringForm.categoryId,
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: null,
                    autoPost: recurringForm.autoPost,
                  })
                }
                setRecurringFormOpen(false)
                setEditingRecurringId(null)
                setRecurringForm({
                  name: '',
                  amount: '',
                  cadence: 'monthly',
                  dayOfMonth: '1',
                  categoryId: 'none',
                  autoPost: true,
                })
              }}
              disabled={!recurringForm.name || !recurringForm.amount}
            >
              {editingRecurringId ? 'Update' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading transactions...</div>}>
      <TransactionsContent />
    </Suspense>
  )
}
