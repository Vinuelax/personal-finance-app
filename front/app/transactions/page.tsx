'use client'

import { useState, useMemo } from 'react'
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
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Transaction, Category } from '@/lib/types'
import { DataProvider } from '@/context/DataContext' // Import DataProvider

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

// Transaction Detail Sheet
interface TransactionDetailProps {
  transaction: Transaction | null
  categories: Category[]
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Transaction>) => void
  onDelete: (id: string) => void
}

function TransactionDetail({ transaction, categories, onClose, onUpdate, onDelete }: TransactionDetailProps) {
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const category = categories.find(c => c.id === transaction?.category)

  if (!transaction) return null

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
              <Button variant="outline" className="h-auto py-3 flex-col gap-1 bg-transparent">
                <Split className="h-4 w-4" />
                <span className="text-xs">Split</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-1 bg-transparent">
                <Receipt className="h-4 w-4" />
                <span className="text-xs">Receipt</span>
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
  const { transactions, categories, updateTransaction, deleteTransaction, updateCategory, addCategory } = useData()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'uncategorized' | 'categorized'>('all')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [activeTab, setActiveTab] = useState('transactions')

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
      </Tabs>

      {/* Transaction Detail Sheet */}
      <TransactionDetail
        transaction={selectedTransaction}
        categories={categories}
        onClose={() => setSelectedTransaction(null)}
        onUpdate={updateTransaction}
        onDelete={deleteTransaction}
      />
    </AppShell>
  )
}

export default function TransactionsPage() {
  return (
    <DataProvider>
      <TransactionsContent />
    </DataProvider>
  )
}
