'use client'

import { AppShell } from '@/components/app-shell'
import { useState, useMemo, useEffect } from 'react'
import { useData } from '@/lib/data-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  MonthGlanceCard, 
  BudgetsSummaryCard, 
  UncategorizedCard,
  UpcomingCard,
  IOUsCard,
  InvestmentsCard
} from '@/components/dashboard/summary-cards'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function DashboardContent() {
  const { 
    transactions, 
    categories, 
    recurringPayments, 
    billInstances, 
    ious, 
    investments,
    syncStatus,
    settings
  } = useData()
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

  const formatSyncTime = (iso: string | null) => {
    if (!iso) return 'Not synced'
    const date = new Date(iso)
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(date)
  }

  const monthTransactions = useMemo(
    () => transactions.filter(t => isInSelectedMonth(t.date)),
    [transactions, selectedMonth]
  )

  const totalSpent = useMemo(() => 
    monthTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  , [monthTransactions])

  const totalIncome = useMemo(() => 
    monthTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)
  , [monthTransactions])

  const dailySpending = useMemo(() => {
    const daysInMonth = new Date(selectedMonth.getUTCFullYear(), selectedMonth.getUTCMonth() + 1, 0).getDate()
    const data: { date: string; amount: number }[] = []
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(Date.UTC(selectedMonth.getUTCFullYear(), selectedMonth.getUTCMonth(), day))
        .toISOString()
        .split('T')[0]
      const spendForDay = monthTransactions
        .filter(t => normalizeDate(t.date).getTime() === new Date(`${dateStr}T00:00:00Z`).getTime() && t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      data.push({ date: dateStr, amount: spendForDay })
    }
    return data
  }, [selectedMonth, monthTransactions])

  const categoriesWithMonthSpend = useMemo(() => 
    categories.map(cat => {
      const spent = monthTransactions
        .filter(t => t.category === cat.id && t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      return { ...cat, currentMonthSpent: spent }
    })
  , [categories, monthTransactions])

  const goMonth = (delta: number) => {
    setSelectedMonth(prev => {
      const next = new Date(prev)
      next.setUTCMonth(prev.getUTCMonth() + delta)
      return new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), 1))
    })
  }
  const canGoForward = selectedMonth < currentMonthStart

  return (
    <AppShell title="Home" showSearch>
      <div className="px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
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
        </div>

        {/* Sync Status */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Good morning</h2>
          <div className="flex items-center gap-2">
            {settings.demoMode && (
              <Badge variant="secondary" className="text-xs">
                Demo Mode
              </Badge>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className={cn(
                "h-3 w-3",
                syncStatus.isSyncing && "animate-spin"
              )} />
              <span>
                {syncStatus.isSyncing 
                  ? 'Syncing...' 
                  : syncStatus.lastSyncedAt 
                    ? `Updated ${formatSyncTime(syncStatus.lastSyncedAt)}`
                    : 'Not synced'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard Cards - Mobile: Stack, Desktop: Grid */}
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {/* Month at a Glance - Full width on desktop */}
          <div className="lg:col-span-2 xl:col-span-1">
            <MonthGlanceCard 
              totalSpent={totalSpent}
              totalIncome={totalIncome}
              dailySpending={dailySpending}
            />
          </div>

          {/* Budgets Summary */}
          <BudgetsSummaryCard categories={categoriesWithMonthSpend} />

          {/* Uncategorized */}
          <UncategorizedCard transactions={transactions} />

          {/* Upcoming Bills */}
          <UpcomingCard 
            billInstances={billInstances}
            recurringPayments={recurringPayments}
          />

          {/* IOUs */}
          <IOUsCard ious={ious} />

          {/* Investments */}
          <InvestmentsCard investments={investments} />
        </div>
      </div>
    </AppShell>
  )
}



export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [canRender, setCanRender] = useState(false)

  useEffect(() => {
    const isDemo = searchParams.get('demo') === 'true'
    const hasToken = typeof window !== 'undefined' && !!window.localStorage.getItem('ledger_token')

    if (!isDemo && !hasToken) {
      router.replace('/welcome')
      return
    }

    setCanRender(true)
  }, [router, searchParams])

  if (!canRender) return null
  return <DashboardContent />
}
