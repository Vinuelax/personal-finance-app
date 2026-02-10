import type {
  Transaction,
  Category,
  RecurringPayment,
  BillInstance,
  IOU,
  Investment,
  FintualGoal,
} from './types'

// Demo categories with budgets
export const demoCategories: Category[] = [
  { id: 'cat-1', name: 'Groceries', icon: 'shopping-cart', color: '#4ade80', monthlyBudget: 600, currentMonthSpent: 423.50, rollover: false, rolloverTargetCategoryId: null },
  { id: 'cat-2', name: 'Dining Out', icon: 'utensils', color: '#f97316', monthlyBudget: 300, currentMonthSpent: 287.20, rollover: false, rolloverTargetCategoryId: null },
  { id: 'cat-3', name: 'Transport', icon: 'car', color: '#3b82f6', monthlyBudget: 200, currentMonthSpent: 145.00, rollover: false, rolloverTargetCategoryId: null },
  { id: 'cat-4', name: 'Entertainment', icon: 'film', color: '#a855f7', monthlyBudget: 150, currentMonthSpent: 89.99, rollover: false, rolloverTargetCategoryId: null },
  { id: 'cat-5', name: 'Utilities', icon: 'zap', color: '#eab308', monthlyBudget: 250, currentMonthSpent: 187.34, rollover: false, rolloverTargetCategoryId: null },
  { id: 'cat-6', name: 'Shopping', icon: 'shopping-bag', color: '#ec4899', monthlyBudget: 200, currentMonthSpent: 245.00, rollover: false, rolloverTargetCategoryId: null },
  { id: 'cat-7', name: 'Health', icon: 'heart', color: '#ef4444', monthlyBudget: 100, currentMonthSpent: 45.00, rollover: false, rolloverTargetCategoryId: null },
  { id: 'cat-8', name: 'Subscriptions', icon: 'repeat', color: '#06b6d4', monthlyBudget: 100, currentMonthSpent: 78.97, rollover: false, rolloverTargetCategoryId: 'cat-9' },
  { id: 'cat-9', name: 'Investments', icon: 'trending-up', color: '#0ea5e9', monthlyBudget: 500, currentMonthSpent: 0, rollover: true, rolloverTargetCategoryId: null },
]

// Demo transactions
export const demoTransactions: Transaction[] = [
  { id: 'txn-1', date: '2026-01-28', merchant: 'Whole Foods', amount: -89.43, category: 'cat-1', notes: '', source: 'bank', receiptId: null, createdAt: '2026-01-28T10:30:00Z' },
  { id: 'txn-2', date: '2026-01-28', merchant: 'Shell Gas Station', amount: -45.00, category: 'cat-3', notes: '', source: 'bank', receiptId: null, createdAt: '2026-01-28T08:15:00Z' },
  { id: 'txn-3', date: '2026-01-27', merchant: 'The Local Bistro', amount: -67.50, category: 'cat-2', notes: 'Dinner with team', source: 'bank', receiptId: null, createdAt: '2026-01-27T19:45:00Z' },
  { id: 'txn-4', date: '2026-01-27', merchant: 'Amazon', amount: -34.99, category: null, notes: '', source: 'bank', receiptId: null, createdAt: '2026-01-27T14:20:00Z' },
  { id: 'txn-5', date: '2026-01-26', merchant: 'Starbucks', amount: -8.75, category: 'cat-2', notes: '', source: 'bank', receiptId: null, createdAt: '2026-01-26T09:00:00Z' },
  { id: 'txn-6', date: '2026-01-26', merchant: 'Netflix', amount: -15.99, category: 'cat-8', notes: '', source: 'bank', receiptId: null, createdAt: '2026-01-26T00:00:00Z' },
  { id: 'txn-7', date: '2026-01-25', merchant: 'Target', amount: -156.78, category: null, notes: '', source: 'bank', receiptId: null, createdAt: '2026-01-25T16:30:00Z' },
  { id: 'txn-8', date: '2026-01-25', merchant: 'CVS Pharmacy', amount: -23.45, category: 'cat-7', notes: '', source: 'bank', receiptId: null, createdAt: '2026-01-25T12:00:00Z' },
  { id: 'txn-9', date: '2026-01-24', merchant: 'Uber', amount: -24.50, category: 'cat-3', notes: '', source: 'bank', receiptId: null, createdAt: '2026-01-24T22:15:00Z' },
  { id: 'txn-10', date: '2026-01-24', merchant: 'Spotify', amount: -10.99, category: 'cat-8', notes: '', source: 'bank', receiptId: null, createdAt: '2026-01-24T00:00:00Z' },
  { id: 'txn-11', date: '2026-01-23', merchant: 'Trader Joe\'s', amount: -78.32, category: 'cat-1', notes: '', source: 'bank', receiptId: null, createdAt: '2026-01-23T17:45:00Z' },
  { id: 'txn-12', date: '2026-01-23', merchant: 'Unknown Merchant', amount: -42.00, category: null, notes: '', source: 'bank', receiptId: null, createdAt: '2026-01-23T11:30:00Z' },
  { id: 'txn-13', date: '2026-01-22', merchant: 'Electric Company', amount: -134.56, category: 'cat-5', notes: 'Monthly bill', source: 'bank', receiptId: null, createdAt: '2026-01-22T00:00:00Z' },
  { id: 'txn-14', date: '2026-01-21', merchant: 'Paycheck', amount: 3250.00, category: null, notes: 'Bi-weekly salary', source: 'bank', receiptId: null, createdAt: '2026-01-21T00:00:00Z' },
  { id: 'txn-15', date: '2026-01-20', merchant: 'AMC Theaters', amount: -32.00, category: 'cat-4', notes: '', source: 'bank', receiptId: null, createdAt: '2026-01-20T20:00:00Z' },
]

// Demo recurring payments
export const demoRecurringPayments: RecurringPayment[] = [
  { id: 'rec-1', name: 'Rent', amount: 1850, cadence: 'monthly', dayOfMonth: 1, categoryId: null, startDate: '2025-01-01', endDate: null, autoPost: true, paused: false },
  { id: 'rec-2', name: 'Car Insurance', amount: 145, cadence: 'monthly', dayOfMonth: 15, categoryId: 'cat-3', startDate: '2025-03-15', endDate: null, autoPost: true, paused: false },
  { id: 'rec-3', name: 'Gym Membership', amount: 49.99, cadence: 'monthly', dayOfMonth: 5, categoryId: 'cat-7', startDate: '2025-06-05', endDate: null, autoPost: true, paused: false },
  { id: 'rec-4', name: 'Phone Bill', amount: 85, cadence: 'monthly', dayOfMonth: 20, categoryId: 'cat-5', startDate: '2024-01-20', endDate: null, autoPost: true, paused: false },
]

// Demo bill instances
export const demoBillInstances: BillInstance[] = [
  { id: 'bill-1', recurringPaymentId: 'rec-1', dueDate: '2026-02-01', amount: 1850, status: 'projected' },
  { id: 'bill-2', recurringPaymentId: 'rec-3', dueDate: '2026-02-05', amount: 49.99, status: 'projected' },
  { id: 'bill-3', recurringPaymentId: 'rec-2', dueDate: '2026-02-15', amount: 145, status: 'projected' },
  { id: 'bill-4', recurringPaymentId: 'rec-4', dueDate: '2026-02-20', amount: 85, status: 'projected' },
  { id: 'bill-5', recurringPaymentId: 'rec-1', dueDate: '2026-01-01', amount: 1850, status: 'paid' },
]

// Demo IOUs
export const demoIOUs: IOU[] = [
  { id: 'iou-1', friendName: 'Sarah', items: [{ description: 'Dinner split', amount: 45.00 }], netBalance: 45.00, status: 'open', createdAt: '2026-01-25T20:00:00Z', settledAt: null },
  { id: 'iou-2', friendName: 'Mike', items: [{ description: 'Concert tickets', amount: -85.00 }], netBalance: -85.00, status: 'open', createdAt: '2026-01-20T15:00:00Z', settledAt: null },
  { id: 'iou-3', friendName: 'Alex', items: [{ description: 'Groceries', amount: 32.50 }, { description: 'Gas', amount: 25.00 }], netBalance: 57.50, status: 'open', createdAt: '2026-01-18T12:00:00Z', settledAt: null },
]

// Demo investments
export const demoInvestments: Investment[] = [
  { id: 'inv-1', symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', quantity: 25, avgCost: 145.00, currentPrice: 178.50 },
  { id: 'inv-2', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'etf', quantity: 40, avgCost: 210.00, currentPrice: 245.30 },
  { id: 'inv-3', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', quantity: 0.5, avgCost: 35000.00, currentPrice: 42500.00 },
  { id: 'inv-4', symbol: 'BND', name: 'Vanguard Total Bond Market ETF', type: 'bond', quantity: 50, avgCost: 75.00, currentPrice: 73.20 },
  { id: 'inv-5', symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', quantity: 15, avgCost: 280.00, currentPrice: 415.00 },
]

// Demo Fintual goals (Chilean mutual fund platform)
export const demoFintualGoals: FintualGoal[] = [
  {
    id: 'fintual-1',
    name: 'Emergency Fund',
    riskLevel: 2,
    riskName: 'Conservative Clooney',
    deposited: 5000000,
    currentValue: 5234500,
    profit: 234500,
    profitPercent: 4.69,
    lastUpdated: '2026-01-29T10:00:00Z',
    priceHistory: [
      { date: '2025-07-01', value: 5000000 },
      { date: '2025-08-01', value: 5025000 },
      { date: '2025-09-01', value: 5055000 },
      { date: '2025-10-01', value: 5095000 },
      { date: '2025-11-01', value: 5140000 },
      { date: '2025-12-01', value: 5185000 },
      { date: '2026-01-01', value: 5210000 },
      { date: '2026-01-29', value: 5234500 },
    ],
  },
  {
    id: 'fintual-2',
    name: 'Retirement',
    riskLevel: 5,
    riskName: 'Risky Norris',
    deposited: 15000000,
    currentValue: 18450000,
    profit: 3450000,
    profitPercent: 23.0,
    lastUpdated: '2026-01-29T10:00:00Z',
    priceHistory: [
      { date: '2025-07-01', value: 15000000 },
      { date: '2025-08-01', value: 15350000 },
      { date: '2025-09-01', value: 14980000 },
      { date: '2025-10-01', value: 16200000 },
      { date: '2025-11-01', value: 17100000 },
      { date: '2025-12-01', value: 17650000 },
      { date: '2026-01-01', value: 18100000 },
      { date: '2026-01-29', value: 18450000 },
    ],
  },
  {
    id: 'fintual-3',
    name: 'Vacation Fund',
    riskLevel: 3,
    riskName: 'Moderate Pitt',
    deposited: 2000000,
    currentValue: 2185000,
    profit: 185000,
    profitPercent: 9.25,
    lastUpdated: '2026-01-29T10:00:00Z',
    priceHistory: [
      { date: '2025-07-01', value: 2000000 },
      { date: '2025-08-01', value: 2025000 },
      { date: '2025-09-01', value: 2010000 },
      { date: '2025-10-01', value: 2085000 },
      { date: '2025-11-01', value: 2120000 },
      { date: '2025-12-01', value: 2155000 },
      { date: '2026-01-01', value: 2170000 },
      { date: '2026-01-29', value: 2185000 },
    ],
  },
  {
    id: 'fintual-4',
    name: 'House Down Payment',
    riskLevel: 4,
    riskName: 'Risky Norris',
    deposited: 8000000,
    currentValue: 9120000,
    profit: 1120000,
    profitPercent: 14.0,
    lastUpdated: '2026-01-29T10:00:00Z',
    priceHistory: [
      { date: '2025-07-01', value: 8000000 },
      { date: '2025-08-01', value: 8150000 },
      { date: '2025-09-01', value: 7950000 },
      { date: '2025-10-01', value: 8400000 },
      { date: '2025-11-01', value: 8750000 },
      { date: '2025-12-01', value: 8950000 },
      { date: '2026-01-01', value: 9050000 },
      { date: '2026-01-29', value: 9120000 },
    ],
  },
]

// Helper functions
export function getSpendingByDay(transactions: Transaction[], days: number = 30) {
  const now = new Date()
  const data: { date: string; amount: number }[] = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    const daySpend = transactions
      .filter(t => t.date === dateStr && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    data.push({ date: dateStr, amount: daySpend })
  }
  
  return data
}

export function getUncategorizedTransactions(transactions: Transaction[]) {
  return transactions.filter(t => t.category === null && t.amount < 0)
}

export function getTotalSpentThisMonth(transactions: Transaction[]) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  
  return transactions
    .filter(t => t.date >= monthStart && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}

export function getTotalIncomeThisMonth(transactions: Transaction[]) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  
  return transactions
    .filter(t => t.date >= monthStart && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
}

export function getExpensesByCategory(transactions: Transaction[], categories: Category[]) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  
  const categoryMap = new Map<string, { name: string; color: string; amount: number }>()
  
  // Initialize with all categories
  categories.forEach(cat => {
    categoryMap.set(cat.id, { name: cat.name, color: cat.color, amount: 0 })
  })
  
  // Add uncategorized
  categoryMap.set('uncategorized', { name: 'Uncategorized', color: '#9ca3af', amount: 0 })
  
  // Sum up expenses
  transactions
    .filter(t => t.date >= monthStart && t.amount < 0)
    .forEach(t => {
      const catId = t.category || 'uncategorized'
      const current = categoryMap.get(catId)
      if (current) {
        current.amount += Math.abs(t.amount)
      }
    })
  
  // Return only categories with spending, sorted by amount
  return Array.from(categoryMap.entries())
    .filter(([, data]) => data.amount > 0)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.amount - a.amount)
}
