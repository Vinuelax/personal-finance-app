'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight, AlertCircle, TrendingUp, TrendingDown, Calendar, Users, Wallet } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Transaction, Category, BillInstance, IOU, Investment, RecurringPayment } from '@/lib/types'
import { SparklineChart } from './sparkline-chart'

// Format currency
function formatCurrency(amount: number, showSign = false) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Math.abs(amount))
  
  if (showSign && amount !== 0) {
    return amount > 0 ? `+${formatted}` : `-${formatted}`
  }
  return formatted
}

// Month at a Glance Card
interface MonthGlanceCardProps {
  totalSpent: number
  totalIncome: number
  dailySpending: { date: string; amount: number }[]
  isLoading?: boolean
}

export function MonthGlanceCard({ totalSpent, totalIncome, dailySpending, isLoading }: MonthGlanceCardProps) {
  const net = totalIncome - totalSpent
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Month at a Glance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
            <p className="text-xs text-muted-foreground">spent this month</p>
          </div>
          <div className="text-right">
            <p className={cn(
              "text-sm font-medium flex items-center gap-1",
              net >= 0 ? "text-positive" : "text-negative"
            )}>
              {net >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatCurrency(net, true)}
            </p>
            <p className="text-xs text-muted-foreground">net</p>
          </div>
        </div>
        
        <div className="h-12">
          <SparklineChart data={dailySpending} />
        </div>
      </CardContent>
    </Card>
  )
}

// Budgets Summary Card
interface BudgetsSummaryCardProps {
  categories: Category[]
  isLoading?: boolean
}

export function BudgetsSummaryCard({ categories, isLoading }: BudgetsSummaryCardProps) {
  const sortedCategories = [...categories]
    .sort((a, b) => (b.currentMonthSpent / b.monthlyBudget) - (a.currentMonthSpent / a.monthlyBudget))
    .slice(0, 3)

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-16" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">Budgets</CardTitle>
        <Link href="/transactions?tab=budgets">
          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
            View all <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedCategories.map(category => {
          const percentage = Math.min((category.currentMonthSpent / category.monthlyBudget) * 100, 100)
          const isOverBudget = category.currentMonthSpent > category.monthlyBudget
          const remaining = category.monthlyBudget - category.currentMonthSpent
          
          return (
            <div key={category.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{category.name}</span>
                <span className={cn(
                  "text-xs",
                  isOverBudget ? "text-negative" : "text-muted-foreground"
                )}>
                  {isOverBudget 
                    ? `${formatCurrency(Math.abs(remaining))} over`
                    : `${formatCurrency(remaining)} left`
                  }
                </span>
              </div>
              <Progress 
                value={percentage} 
                className={cn(
                  "h-1.5",
                  isOverBudget && "[&>div]:bg-negative"
                )}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// Uncategorized Card
interface UncategorizedCardProps {
  transactions: Transaction[]
  isLoading?: boolean
}

export function UncategorizedCard({ transactions, isLoading }: UncategorizedCardProps) {
  const uncategorized = transactions.filter(t => t.category === null && t.amount < 0)
  const latestThree = uncategorized.slice(0, 3)

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (uncategorized.length === 0) {
    return (
      <Card className="border-positive/20 bg-positive/5">
        <CardContent className="pt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-positive">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">All caught up!</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">No uncategorized transactions</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-warning/20 bg-warning/5">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">Uncategorized</CardTitle>
          <Badge variant="secondary" className="bg-warning/20 text-warning-foreground border-0">
            {uncategorized.length}
          </Badge>
        </div>
        <Link href="/transactions?filter=uncategorized">
          <Button size="sm" variant="secondary">
            Review now
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {latestThree.map(txn => (
          <div key={txn.id} className="flex items-center justify-between py-1.5">
            <div>
              <p className="text-sm font-medium">{txn.merchant}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <p className="text-sm font-medium text-negative">{formatCurrency(txn.amount)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Upcoming Bills Card
interface UpcomingCardProps {
  billInstances: BillInstance[]
  recurringPayments: RecurringPayment[]
  isLoading?: boolean
}

export function UpcomingCard({ billInstances, recurringPayments, isLoading }: UpcomingCardProps) {
  const upcoming = billInstances
    .filter(b => b.status === 'projected')
    .slice(0, 4)
    .map(bill => {
      const payment = recurringPayments.find(p => p.id === bill.recurringPaymentId)
      return { ...bill, name: payment?.name || 'Unknown' }
    })

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (upcoming.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p className="text-sm text-muted-foreground">No upcoming bills</p>
          <Link href="/settings/recurring">
            <Button variant="link" size="sm" className="mt-1">
              Add recurring payment
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Upcoming
        </CardTitle>
        <Link href="/calendar">
          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
            View all <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.map(bill => (
          <div key={bill.id} className="flex items-center justify-between py-1.5">
            <div>
              <p className="text-sm font-medium">{bill.name}</p>
              <p className="text-xs text-muted-foreground">
                Due {new Date(bill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <p className="text-sm font-medium">{formatCurrency(bill.amount)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// IOUs Card
interface IOUsCardProps {
  ious: IOU[]
  isLoading?: boolean
}

export function IOUsCard({ ious, isLoading }: IOUsCardProps) {
  const openIOUs = ious.filter(i => i.status === 'open')
  const theyOweMe = openIOUs.filter(i => i.netBalance > 0).reduce((sum, i) => sum + i.netBalance, 0)
  const iOweThem = openIOUs.filter(i => i.netBalance < 0).reduce((sum, i) => sum + Math.abs(i.netBalance), 0)

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Users className="h-4 w-4" />
          Debts & IOUs
        </CardTitle>
        <Link href="/ious">
          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
            View all <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-positive/10">
            <p className="text-lg font-bold text-positive">{formatCurrency(theyOweMe)}</p>
            <p className="text-xs text-muted-foreground">owed to you</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-negative/10">
            <p className="text-lg font-bold text-negative">{formatCurrency(iOweThem)}</p>
            <p className="text-xs text-muted-foreground">you owe</p>
          </div>
        </div>
        {openIOUs.length > 0 && (
          <div className="mt-3 pt-3 border-t space-y-1.5">
            {openIOUs.slice(0, 2).map(iou => (
              <div key={iou.id} className="flex items-center justify-between text-sm">
                <span>{iou.friendName}</span>
                <span className={cn(
                  "font-medium",
                  iou.netBalance > 0 ? "text-positive" : "text-negative"
                )}>
                  {formatCurrency(iou.netBalance, true)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Investments Card
interface InvestmentsCardProps {
  investments: Investment[]
  isLoading?: boolean
}

export function InvestmentsCard({ investments = [], isLoading }: InvestmentsCardProps) {
  const totalValue = investments.reduce((sum, inv) => sum + (inv.quantity * inv.currentPrice), 0)
  const totalCost = investments.reduce((sum, inv) => sum + (inv.quantity * inv.avgCost), 0)
  const totalGain = totalValue - totalCost
  const percentGain = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!investments || investments.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Investments
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p className="text-sm text-muted-foreground">Track your investments</p>
          <Link href="/investments">
            <Button variant="link" size="sm" className="mt-1">
              Get started
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Investments
        </CardTitle>
        <Link href="/investments">
          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
            View all <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            <p className="text-xs text-muted-foreground">total value</p>
          </div>
          <div className="text-right">
            <p className={cn(
              "text-sm font-medium flex items-center gap-1",
              totalGain >= 0 ? "text-positive" : "text-negative"
            )}>
              {totalGain >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatCurrency(totalGain, true)} ({percentGain.toFixed(1)}%)
            </p>
            <p className="text-xs text-muted-foreground">all time</p>
          </div>
        </div>
        
        <div className="mt-2 space-y-1.5">
          {investments.slice(0, 3).map(inv => {
            const value = inv.quantity * inv.currentPrice
            const gain = (inv.currentPrice - inv.avgCost) * inv.quantity
            return (
              <div key={inv.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{inv.symbol}</span>
                <span className={cn(
                  gain >= 0 ? "text-positive" : "text-negative"
                )}>
                  {formatCurrency(value)}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
