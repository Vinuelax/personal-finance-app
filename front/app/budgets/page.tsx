'use client'

import { AppShell } from '@/components/app-shell'
import { BudgetsView } from '@/app/transactions/page'
import { useData } from '@/lib/data-context'

export default function BudgetsPage() {
  const {
    transactions,
    categories,
    budgets,
    fetchBudgetsForMonth,
    copyBudgetsFromMonth,
    updateCategory,
    addCategory,
    upsertBudget,
    deleteBudgetByScope,
  } = useData()

  return (
    <AppShell title="Budgets">
      <BudgetsView
        categories={categories}
        transactions={transactions}
        budgetsByMonth={budgets}
        fetchBudgetsForMonth={fetchBudgetsForMonth}
        onCopyBudgets={copyBudgetsFromMonth}
        onUpsertBudget={upsertBudget}
        onDeleteBudget={deleteBudgetByScope}
        onUpdateCategory={updateCategory}
        onAddCategory={addCategory}
      />
    </AppShell>
  )
}
