'use client'

import { AppShell } from '@/components/app-shell'
import { DataProvider, useData } from '@/lib/data-context'
import { 
  MonthGlanceCard, 
  BudgetsSummaryCard, 
  UncategorizedCard,
  UpcomingCard,
  IOUsCard,
  InvestmentsCard
} from '@/components/dashboard/summary-cards'
import { getSpendingByDay, getTotalSpentThisMonth, getTotalIncomeThisMonth } from '@/lib/demo-data'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const totalSpent = getTotalSpentThisMonth(transactions)
  const totalIncome = getTotalIncomeThisMonth(transactions)
  const dailySpending = getSpendingByDay(transactions, 14)

  return (
    <AppShell title="Home" showSearch>
      <div className="px-4 lg:px-6 py-4">
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
                    ? `Updated ${new Date(syncStatus.lastSyncedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
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
          <BudgetsSummaryCard categories={categories} />

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
  return (
    <DataProvider>
      <DashboardContent />
    </DataProvider>
  )
}
