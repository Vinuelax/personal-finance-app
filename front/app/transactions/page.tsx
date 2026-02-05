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
import type { Transaction, TransactionSplit, Category } from '@/lib/types'
import { DataProvider } from '@/lib/data-context'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Math.abs(amount))
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
  const isIncome = transaction.amount > 0
  const isUncategorized = !transaction.category && !isIncome

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
        </div>
      </div>
      
      <div className="text-right">
        <p className={cn(
          "font-medium text-sm",
          isIncome ? "text-positive" : "text-foreground"
        )}>
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
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
                    value={split.amount}
                    onChange={(e) => updateSplit(split.id, { amount: parseFloat(e.target.value) })}
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
                {transaction.amount > 0 ? '+' : '-'}{formatCurrency(transaction.amount)}
              </p>
              {transaction.splits && transaction.splits.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {transaction.splits.length} split{transaction.splits.length > 1 ? 's' : ''} · {transaction.splits.map(s => s.label).join(', ')}
                </p>
              )}
            </div>

            {/* Category */}
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
          onUpdate(transaction.id, { splits })
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
  onSave: (id: string, updates: Partial<Category>) => void
}

function BudgetEditDialog({ open, onClose, category, onSave }: BudgetEditDialogProps) {
  const [budget, setBudget] = useState(category?.monthlyBudget?.toString() || '')
  const [rollover, setRollover] = useState(category?.rollover || false)

  const handleSave = () => {
    if (category && budget) {
      onSave(category.id, { 
        monthlyBudget: parseFloat(budget),
        rollover 
      })
      onClose()
    }
  }

  // Update state when category changes
  if (category && budget === '' && category.monthlyBudget) {
    setBudget(category.monthlyBudget.toString())
    setRollover(category.rollover)
  }

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
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save
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
  onAdd: (category: Omit<Category, 'id' | 'currentMonthSpent'>) => void
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

  const handleAdd = () => {
    if (name && budget) {
      onAdd({
        name,
        icon: selectedIcon,
        color: selectedColor,
        monthlyBudget: parseFloat(budget),
        rollover: false,
      })
      setName('')
      setBudget('')
      setSelectedIcon('shopping-cart')
      setSelectedColor(CATEGORY_COLORS[0])
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
function BudgetsView({ categories, onUpdateCategory, onAddCategory }: { 
  categories: Category[]
  onUpdateCategory: (id: string, updates: Partial<Category>) => void
  onAddCategory: (category: Omit<Category, 'id' | 'currentMonthSpent'>) => void
}) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  
  const sortedCategories = [...categories].sort((a, b) => 
    (b.currentMonthSpent / b.monthlyBudget) - (a.currentMonthSpent / a.monthlyBudget)
  )

  const totalBudget = categories.reduce((sum, c) => sum + c.monthlyBudget, 0)
  const totalSpent = categories.reduce((sum, c) => sum + c.currentMonthSpent, 0)

  return (
    <div className="space-y-4 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">January 2026</h2>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)} spent
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {sortedCategories.map(category => {
          const percentage = (category.currentMonthSpent / category.monthlyBudget) * 100
          const isOverBudget = percentage > 100
          const remaining = category.monthlyBudget - category.currentMonthSpent

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
        onSave={onUpdateCategory}
      />

      <AddBudgetDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={onAddCategory}
      />
    </div>
  )
}

function TransactionsContent() {
  const { 
    transactions, 
    categories, 
    recurringPayments,
    addRecurringPayment,
    updateRecurringPayment,
    toggleRecurringPause,
    stopRecurringPayment,
    updateTransaction, 
    deleteTransaction, 
    updateCategory, 
    addCategory, 
    attachReceiptToTransaction, 
    addReceipt 
  } = useData()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'uncategorized' | 'categorized'>('all')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'transactions'
  const [activeTab, setActiveTab] = useState(initialTab)
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && tab !== activeTab) setActiveTab(tab)
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

  const handleUpdate = useCallback((id: string, updates: Partial<Transaction>) => {
    updateTransaction(id, updates)
    setSelectedTransaction((prev) => prev && prev.id === id ? { ...prev, ...updates } : prev)
  }, [updateTransaction])

  // Filter and group transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions

    // Apply filter
    if (filter === 'uncategorized') {
      filtered = filtered.filter(t => t.category === null && t.amount < 0)
    } else if (filter === 'categorized') {
      filtered = filtered.filter(t => t.category !== null || t.amount > 0)
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
  }, [transactions, filter, searchQuery])

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {}
    filteredTransactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = []
      groups[t.date].push(t)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredTransactions])

  const uncategorizedCount = transactions.filter(t => t.category === null && t.amount < 0).length
  const recurringActive = recurringPayments.filter(p => !p.endDate)
  const recurringStopped = recurringPayments.filter(p => p.endDate)

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
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
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
            
            <div className="flex gap-2">
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

        <TabsContent value="budgets" className="mt-0">
          <BudgetsView categories={categories} />
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
        categories={categories}
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
    <DataProvider>
      <Suspense fallback={<div className="p-4">Loading transactions...</div>}>
        <TransactionsContent />
      </Suspense>
    </DataProvider>
  )
}
