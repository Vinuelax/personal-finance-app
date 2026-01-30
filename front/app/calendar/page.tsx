'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/app-shell'
import { DataProvider, useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  TrendingDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Transaction, BillInstance, RecurringPayment } from '@/lib/types'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

interface DayData {
  date: Date
  dateStr: string
  isCurrentMonth: boolean
  isToday: boolean
  transactions: Transaction[]
  bills: (BillInstance & { name: string })[]
  totalSpent: number
}

function CalendarContent() {
  const { transactions, billInstances, recurringPayments } = useData()
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)) // January 2026
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
  const [showProjected, setShowProjected] = useState(true)

  // Get bills with names
  const billsWithNames = useMemo(() => 
    billInstances.map(bill => ({
      ...bill,
      name: recurringPayments.find(p => p.id === bill.recurringPaymentId)?.name || 'Unknown'
    }))
  , [billInstances, recurringPayments])

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()
    
    const days: DayData[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i)
      const dateStr = date.toISOString().split('T')[0]
      days.push({
        date,
        dateStr,
        isCurrentMonth: false,
        isToday: false,
        transactions: transactions.filter(t => t.date === dateStr),
        bills: billsWithNames.filter(b => b.dueDate === dateStr),
        totalSpent: transactions
          .filter(t => t.date === dateStr && t.amount < 0)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      days.push({
        date,
        dateStr,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        transactions: transactions.filter(t => t.date === dateStr),
        bills: billsWithNames.filter(b => b.dueDate === dateStr),
        totalSpent: transactions
          .filter(t => t.date === dateStr && t.amount < 0)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      })
    }

    // Next month days
    const remainingDays = 42 - days.length // 6 rows x 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      const dateStr = date.toISOString().split('T')[0]
      days.push({
        date,
        dateStr,
        isCurrentMonth: false,
        isToday: false,
        transactions: transactions.filter(t => t.date === dateStr),
        bills: billsWithNames.filter(b => b.dueDate === dateStr),
        totalSpent: transactions
          .filter(t => t.date === dateStr && t.amount < 0)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      })
    }

    return days
  }, [currentDate, transactions, billsWithNames])

  // Cashflow projection
  const cashflowProjection = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const today = new Date()
    const endOfMonth = new Date(year, month + 1, 0)
    
    let projectedBills = 0
    let projectedSpend = 0
    
    billsWithNames
      .filter(b => {
        const billDate = new Date(b.dueDate)
        return billDate >= today && billDate <= endOfMonth && b.status === 'projected'
      })
      .forEach(b => {
        projectedBills += b.amount
      })

    // Estimate remaining spend based on daily average
    const daysRemaining = Math.max(0, endOfMonth.getDate() - today.getDate())
    const monthStart = new Date(year, month, 1).toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]
    
    const spentSoFar = transactions
      .filter(t => t.date >= monthStart && t.date <= todayStr && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    const daysPassed = today.getDate()
    const dailyAverage = daysPassed > 0 ? spentSoFar / daysPassed : 0
    projectedSpend = dailyAverage * daysRemaining

    return {
      projectedBills,
      projectedSpend,
      total: projectedBills + projectedSpend
    }
  }, [currentDate, transactions, billsWithNames])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1))
      return newDate
    })
  }

  return (
    <AppShell title="Calendar">
      <div className="px-4 lg:px-6 py-4 space-y-4">
        {/* Cashflow Projection */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Expected remaining this month</p>
                <p className="text-2xl font-bold">{formatCurrency(cashflowProjection.total)}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Bills: {formatCurrency(cashflowProjection.projectedBills)}</p>
                <p>Est. spend: {formatCurrency(cashflowProjection.projectedSpend)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold min-w-[160px] text-center">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="show-projected" className="text-sm text-muted-foreground">
              Show bills
            </Label>
            <Switch
              id="show-projected"
              checked={showProjected}
              onCheckedChange={setShowProjected}
            />
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-secondary">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const hasTransactions = day.transactions.length > 0
              const hasBills = showProjected && day.bills.length > 0
              const hasActivity = hasTransactions || hasBills

              return (
                <button
                  key={index}
                  onClick={() => hasActivity && setSelectedDay(day)}
                  disabled={!hasActivity}
                  className={cn(
                    "relative h-16 lg:h-20 p-1 border-t border-l text-left transition-colors",
                    "hover:bg-accent disabled:hover:bg-transparent disabled:cursor-default",
                    !day.isCurrentMonth && "bg-muted/30",
                    day.isToday && "bg-primary/5"
                  )}
                >
                  <span className={cn(
                    "text-sm",
                    !day.isCurrentMonth && "text-muted-foreground",
                    day.isToday && "font-bold text-primary"
                  )}>
                    {day.date.getDate()}
                  </span>
                  
                  {/* Indicators */}
                  <div className="absolute bottom-1 left-1 right-1 flex flex-col gap-0.5">
                    {day.totalSpent > 0 && (
                      <div className="flex items-center gap-0.5">
                        <TrendingDown className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground truncate">
                          {formatCurrency(day.totalSpent)}
                        </span>
                      </div>
                    )}
                    {hasBills && (
                      <div className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5 text-warning" />
                        <span className="text-[10px] text-warning truncate">
                          {day.bills.length} bill{day.bills.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            <span>Spending</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-warning" />
            <span>Bills due</span>
          </div>
        </div>
      </div>

      {/* Day Detail Sheet */}
      <Sheet open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>
              {selectedDay?.date.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric' 
              })}
            </SheetTitle>
            <SheetDescription>
              {selectedDay?.transactions.length || 0} transactions · {selectedDay?.bills.length || 0} bills
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 overflow-y-auto pb-20">
            {/* Transactions */}
            {selectedDay?.transactions && selectedDay.transactions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Transactions
                </h3>
                <div className="space-y-2">
                  {selectedDay.transactions.map(txn => (
                    <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="font-medium text-sm">{txn.merchant}</p>
                        <p className="text-xs text-muted-foreground capitalize">{txn.source}</p>
                      </div>
                      <p className={cn(
                        "font-medium",
                        txn.amount > 0 ? "text-positive" : "text-foreground"
                      )}>
                        {txn.amount > 0 ? '+' : '-'}{formatCurrency(txn.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bills */}
            {selectedDay?.bills && selectedDay.bills.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Bills Due
                </h3>
                <div className="space-y-2">
                  {selectedDay.bills.map(bill => (
                    <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          bill.status === 'paid' && "bg-positive/20",
                          bill.status === 'projected' && "bg-warning/20",
                          bill.status === 'skipped' && "bg-muted"
                        )}>
                          {bill.status === 'paid' && <CheckCircle2 className="h-4 w-4 text-positive" />}
                          {bill.status === 'projected' && <Clock className="h-4 w-4 text-warning" />}
                          {bill.status === 'skipped' && <XCircle className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{bill.name}</p>
                          <Badge variant="outline" className={cn(
                            "text-[10px] h-4",
                            bill.status === 'paid' && "border-positive text-positive",
                            bill.status === 'projected' && "border-warning text-warning",
                            bill.status === 'skipped' && "border-muted-foreground text-muted-foreground"
                          )}>
                            {bill.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="font-medium">{formatCurrency(bill.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Add */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-bottom">
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  )
}

export default function CalendarPage() {
  return (
    <DataProvider>
      <CalendarContent />
    </DataProvider>
  )
}
