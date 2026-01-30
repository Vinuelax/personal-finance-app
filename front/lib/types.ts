// Core data types for Ledger

export interface Transaction {
  id: string
  date: string
  merchant: string
  amount: number
  category: string | null
  notes: string
  source: 'bank' | 'manual'
  receiptId: string | null
  createdAt: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  monthlyBudget: number
  currentMonthSpent: number
  rollover: boolean
}

export interface RecurringPayment {
  id: string
  name: string
  amount: number
  cadence: 'weekly' | 'monthly' | 'yearly'
  dayOfMonth: number
  categoryId: string | null
  startDate: string
  endDate: string | null
  autoPost: boolean
  paused: boolean
}

export interface BillInstance {
  id: string
  recurringPaymentId: string
  dueDate: string
  amount: number
  status: 'projected' | 'paid' | 'skipped'
}

export interface IOU {
  id: string
  friendName: string
  items: { description: string; amount: number }[]
  netBalance: number // positive = they owe me, negative = I owe them
  status: 'open' | 'settled'
  createdAt: string
  settledAt: string | null
}

export interface IOUEvent {
  id: string
  iouId: string
  type: 'charge' | 'payment'
  amount: number
  description: string
  date: string
}

export interface Investment {
  id: string
  symbol: string
  name: string
  type: 'stock' | 'etf' | 'crypto' | 'bond' | 'mutual_fund' | 'other'
  quantity: number
  avgCost: number
  currentPrice: number
}

// Fintual-specific investment type
export interface FintualGoal {
  id: string
  name: string
  riskLevel: 1 | 2 | 3 | 4 | 5 // 1 = Very Conservative, 5 = Very Risky
  riskName: string // e.g., "Risky Norris", "Moderate Pitt", "Conservative Clooney"
  deposited: number
  currentValue: number
  profit: number
  profitPercent: number
  lastUpdated: string
  priceHistory: { date: string; value: number }[]
}

export interface Receipt {
  id: string
  imageUrl: string
  merchant: string
  date: string
  total: number
  lineItems: ReceiptLineItem[]
  status: 'uploading' | 'parsing' | 'needs_review' | 'complete'
  transactionId: string | null
}

export interface ReceiptLineItem {
  id: string
  description: string
  amount: number
  categoryId: string | null
}

export interface UserSettings {
  currency: string
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6
  theme: 'light' | 'dark' | 'system'
  demoMode: boolean
}

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncedAt: string | null
}
