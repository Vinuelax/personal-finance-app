// Core data types for Ledger

export interface TransactionSplit {
  id: string
  label: string
  amount: number | null
  categoryId: string | null
}

export interface Transaction {
  id: string
  date: string
  merchant: string
  amount: number
  category: string | null
  notes: string
  source: 'bank' | 'manual'
  receiptId: string | null
  splits?: TransactionSplit[]
  createdAt: string
}

export type CategoryKind = 'expense' | 'income' | 'savings' | 'investment' | 'debt' | 'transfer' | 'mixed'

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  kind: CategoryKind
  monthlyBudget: number
  currentMonthSpent: number
  rollover: boolean
  rolloverTargetCategoryId?: string | null
}

export interface Budget {
  month: string // YYYY-MM
  startMonth?: string | null
  endMonth?: string | null
  categoryId: string
  limit: number
  rollover: boolean
  rolloverTargetCategoryId?: string | null
  currency?: string | null
  copiedFromMonth?: string | null
  purpose?: string | null
  carryForwardEnabled?: boolean
  isTerminal?: boolean
  objectiveId?: string | null
}

export interface ObjectiveMonthPlan {
  month: string
  amount: number
  kind: 'SPEND' | 'SAVE'
  isLastMonth: boolean
}

export interface Objective {
  objectiveId: string
  name: string
  categoryId: string
  currency?: string | null
  totalAmount?: number | null
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  plans: ObjectiveMonthPlan[]
  createdAt?: string | null
  updatedAt?: string | null
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
}

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncedAt: string | null
}
