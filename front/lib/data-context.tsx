'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  fetchCategories,
  fetchTransactions,
  createCategory,
  updateCategoryApi,
  deleteCategoryApi,
  createTransactionApi,
  updateTransactionApi,
  deleteTransactionApi,
  fetchBudgets,
  upsertBudgetApi,
  copyBudgets,
  deleteBudgetScoped,
  fetchObjectives,
  createObjective as createObjectiveApi,
  updateObjective as updateObjectiveApi,
  completeObjective as completeObjectiveApi,
  deleteObjective as deleteObjectiveApi,
  fetchRecurring,
  fetchBills,
  updateBill,
  createRecurring,
  updateRecurring,
  pauseRecurring,
  resumeRecurring,
  stopRecurring,
  fetchReceipts,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  uploadReceipt,
  importTransactions,
  fetchCurrentUser,
  updateCurrentUser,
  ApiError,
  type ApiCategory,
  type ApiTransaction,
  type ApiBudget,
  type ApiObjective,
  type CreateObjectivePayload,
  type UpdateObjectivePayload,
  type ApiRecurring,
  type ApiBill,
  type ApiReceipt,
} from './api'
import type {
  Transaction,
  TransactionSplit,
  Category,
  RecurringPayment,
  BillInstance,
  IOU,
  Investment,
  FintualGoal,
  UserSettings,
  SyncStatus,
  Receipt,
  Budget,
  Objective,
  ObjectiveMonthPlan,
} from './types'
import {
  demoTransactions,
  demoCategories,
  demoRecurringPayments,
  demoBillInstances,
  demoIOUs,
  demoInvestments,
  demoFintualGoals,
} from './demo-data'

interface User {
  name: string
  email: string
  avatar?: string
}

interface DataContextType {
  // Data
  transactions: Transaction[]
  categories: Category[]
  recurringPayments: RecurringPayment[]
  billInstances: BillInstance[]
  budgets: Record<string, Budget[]>
  objectives: Objective[]
  receipts: Receipt[]
  ious: IOU[]
  investments: Investment[]
  fintualGoals: FintualGoal[]
  settings: UserSettings
  syncStatus: SyncStatus
  user: User
  currency: string // symbol for display
  currencyCode: string
  authToken: string | null
  
  // Actions
  setAuthToken: (token: string | null) => void
  refreshFromBackend: (tokenOverride?: string | null) => Promise<void>
  updateUser: (updates: Partial<User>) => void
  setCurrency: (code: string) => void
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  addTransactionSplit: (id: string, split: TransactionSplit) => void
  removeTransactionSplit: (id: string, splitId: string) => void
  attachReceiptToTransaction: (transactionId: string, receiptId: string | null) => void
  addReceipt: (receipt: Omit<Receipt, 'id'>) => string
  uploadReceipt: (file: File) => Promise<string | null>
  importTransactionsFile: (file: File) => Promise<{ imported: number; skipped: number; errors: string[] } | null>
  updateReceipt: (id: string, updates: Partial<Receipt>) => void
  deleteReceipt: (id: string) => void
  addCategory: (category: Omit<Category, 'id' | 'currentMonthSpent'> & { purpose?: string | null }) => Promise<string | null>
  updateCategory: (id: string, updates: Partial<Category>) => void
  upsertBudget: (month: string, categoryId: string, data: { limit: number; rollover?: boolean; rolloverTargetCategoryId?: string | null; purpose?: string | null; carryForwardEnabled?: boolean; isTerminal?: boolean; objectiveId?: string | null; applyToFuture?: boolean }) => Promise<void> | void
  deleteBudgetByScope: (categoryId: string, scope: 'this_month' | 'from_month' | 'all', month: string) => Promise<void>
  createObjective: (payload: { name: string; categoryId?: string | null; currency?: string | null; totalAmount?: number | null; plans: ObjectiveMonthPlan[] }, force?: boolean) => Promise<Objective>
  updateObjective: (objectiveId: string, payload: { name?: string; categoryId?: string | null; currency?: string | null; totalAmount?: number | null; status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'; plans?: ObjectiveMonthPlan[] }, force?: boolean) => Promise<Objective>
  completeObjective: (objectiveId: string) => Promise<void>
  deleteObjective: (objectiveId: string) => Promise<void>
  refreshObjectives: () => Promise<void>
  addIOU: (iou: Omit<IOU, 'id' | 'createdAt' | 'settledAt'>) => void
  settleIOU: (id: string) => void
  addInvestment: (investment: Omit<Investment, 'id'>) => void
  updateInvestment: (id: string, updates: Partial<Investment>) => void
  deleteInvestment: (id: string) => void
  addRecurringPayment: (payment: Omit<RecurringPayment, 'id' | 'paused'>) => void
  updateRecurringPayment: (id: string, updates: Partial<RecurringPayment>) => void
  toggleRecurringPause: (id: string, paused: boolean) => void
  stopRecurringPayment: (id: string) => void
  updateSettings: (updates: Partial<UserSettings>) => void
  clearAllData: () => void
  loadDemoData: () => void
  clearData: () => void
  formatCurrency: (amount: number) => string
  fetchBudgetsForMonth: (month: string, force?: boolean) => Promise<void>
  copyBudgetsFromMonth: (month: string, sourceMonth: string) => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

const TOKEN_STORAGE_KEY = 'ledger_token'

const currencySymbol = (code: string) => {
  const upper = (code || '').toUpperCase()
  switch (upper) {
    case 'USD': return '$'
    case 'EUR': return '€'
    case 'GBP': return '£'
    case 'JPY': return '¥'
    case 'CAD': return 'C$'
    case 'AUD': return 'A$'
    case 'CLP': return 'CLP$'
    default: return '$'
  }
}

const zeroDecimalCurrencies = ['CLP', 'JPY', 'KRW']
const toMinor = (amount: number, currency?: string) => {
  const code = (currency || 'CLP').toUpperCase()
  return zeroDecimalCurrencies.includes(code) ? Math.round(amount) : Math.round(amount * 100)
}
const fromMinor = (amount: number | null | undefined, currency?: string) => {
  if (amount === null || amount === undefined) return 0
  const code = (currency || 'CLP').toUpperCase()
  return zeroDecimalCurrencies.includes(code) ? amount : amount / 100
}

const mapApiTransaction = (txn: ApiTransaction): Transaction => ({
  id: txn.txnId,
  date: txn.date,
  merchant: txn.merchant || txn.description || 'Transaction',
  amount: typeof txn.amount === 'number' ? fromMinor(txn.amount, txn.currency) : 0,
  category: txn.categoryId ?? null,
  notes: txn.notes ?? '',
  source: txn.source === 'bank' || txn.source === 'bank_scrape' ? 'bank' : 'manual',
  receiptId: txn.receiptId ?? null,
  splits: txn.splits?.map(s => ({
    id: s.id,
    label: s.label,
    amount: fromMinor(s.amount, txn.currency),
    categoryId: s.categoryId ?? null,
  })),
  createdAt: txn.createdAt || txn.updatedAt || new Date(txn.date).toISOString(),
})

const mapApiCategory = (cat: ApiCategory): Category => ({
  id: cat.categoryId,
  name: cat.name,
  icon: cat.icon || 'circle',
  color: cat.color || '#6b7280',
  monthlyBudget: 0,
  currentMonthSpent: 0,
  rollover: false,
  rolloverTargetCategoryId: null,
})

const mapApiRecurring = (rec: ApiRecurring): RecurringPayment => ({
  id: rec.ruleId,
  name: rec.name,
  amount: fromMinor(rec.amount, rec.currency),
  cadence: rec.cadence.toLowerCase() === 'weekly' ? 'weekly' : 'monthly',
  dayOfMonth: rec.dayOfMonth || 1,
  categoryId: rec.categoryId,
  startDate: rec.startDate,
  endDate: rec.endDate,
  autoPost: rec.autopostMode?.toUpperCase()?.includes('AUTO') ?? false,
  paused: rec.isPaused,
})

const mapApiBill = (bill: ApiBill): BillInstance => ({
  id: bill.billId,
  recurringPaymentId: bill.ruleId || '',
  dueDate: bill.dueDate || '',
  amount: fromMinor(bill.amount || 0, bill.currency || undefined),
  status: (bill.status || 'PROJECTED').toLowerCase() === 'paid' ? 'paid' : 'projected',
})

const mapApiReceipt = (rcpt: ApiReceipt): Receipt => ({
  id: rcpt.receiptId,
  imageUrl: rcpt.imageUrl || '',
  merchant: rcpt.merchant || 'Receipt',
  date: rcpt.date || new Date().toISOString().split('T')[0],
  total: fromMinor(rcpt.total || 0),
  lineItems: (rcpt.lineItems || []).map(li => ({
    id: li.id,
    description: li.description,
    amount: fromMinor(li.amount),
    categoryId: li.categoryId,
  })),
  status: (rcpt.status || 'uploading') as Receipt['status'],
  transactionId: rcpt.transactionId || null,
})

const mapApiBudget = (b: ApiBudget, currency?: string): Budget => ({
  month: b.month || new Date().toISOString().slice(0, 7),
  categoryId: b.categoryId,
  limit: fromMinor(b.limit, b.currency || currency),
  rollover: b.rollover ?? false,
  rolloverTargetCategoryId: b.rolloverTargetCategoryId ?? null,
  currency: b.currency || currency,
  copiedFromMonth: b.copiedFromMonth ?? null,
  purpose: b.purpose ?? null,
  carryForwardEnabled: b.carryForwardEnabled ?? true,
  isTerminal: b.isTerminal ?? false,
  objectiveId: b.objectiveId ?? null,
})

const mapApiObjective = (o: ApiObjective, currency?: string): Objective => ({
  objectiveId: o.objectiveId,
  name: o.name,
  categoryId: o.categoryId,
  currency: o.currency || currency || null,
  totalAmount: o.totalAmount === null || o.totalAmount === undefined
    ? null
    : fromMinor(o.totalAmount, o.currency || currency || undefined),
  status: o.status,
  plans: (o.plans || []).map(p => ({
    month: p.month,
    amount: fromMinor(p.amount, o.currency || currency || undefined),
    kind: p.kind,
    isLastMonth: p.isLastMonth,
  })),
  createdAt: o.createdAt ?? null,
  updatedAt: o.updatedAt ?? null,
})

export function DataProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Record<string, Budget[]>>({})
  const [objectives, setObjectives] = useState<Objective[]>([])
  const fetchedBudgetMonthsRef = useRef<Set<string>>(new Set())
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([])
  const [billInstances, setBillInstances] = useState<BillInstance[]>([])
  const [ious, setIOUs] = useState<IOU[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [fintualGoals, setFintualGoals] = useState<FintualGoal[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [settings, setSettings] = useState<UserSettings>({
    currency: 'CLP',
    weekStartDay: 0,
    theme: 'system',
    demoMode: false,
  })
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSyncedAt: null,
  })
  const [authToken, setAuthTokenState] = useState<string | null>(null)
  const [user, setUser] = useState<User>({
    name: 'Demo User',
    email: 'demo@ledger.app',
  })
  
  const currencyCode = settings.currency
  const currency = currencySymbol(currencyCode)
  
  const formatCurrency = useCallback((amount: number) => {
    const noDecimalCurrencies = ['CLP']
    const fractionDigits = noDecimalCurrencies.includes(settings.currency) ? 0 : 2

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount)
  }, [settings.currency])

  // Set initial lastSyncedAt on client to avoid server/client time mismatch
  useEffect(() => {
    setSyncStatus(prev => ({ ...prev, lastSyncedAt: new Date().toISOString() }))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (stored) {
      setAuthTokenState(stored)
      setSettings(prev => ({ ...prev, demoMode: false }))
    }
  }, [])

  const markBudgetMonthFetched = useCallback((month: string) => {
    fetchedBudgetMonthsRef.current = new Set(fetchedBudgetMonthsRef.current).add(month)
  }, [])

  const refreshFromBackend = useCallback(async (tokenOverride?: string | null) => {
    const tokenToUse = tokenOverride ?? authToken
    if (!tokenToUse) return
    setSyncStatus(prev => ({ ...prev, isSyncing: true, isOnline: true }))
    try {
      const [apiUser, apiTransactions, apiCategories, apiBudgets, apiObjectives, apiRecurring, apiBills, apiReceipts] = await Promise.all([
        fetchCurrentUser(tokenToUse),
        fetchTransactions(tokenToUse),
        fetchCategories(tokenToUse),
        fetchBudgets(tokenToUse),
        fetchObjectives(tokenToUse),
        fetchRecurring(tokenToUse),
        fetchBills(tokenToUse),
        fetchReceipts(tokenToUse),
      ])
      console.log('[sync] fetched', {
        txns: apiTransactions.length,
        categories: apiCategories.length,
        budgets: apiBudgets.length,
        objectives: apiObjectives.length,
        recurring: apiRecurring.length,
        bills: apiBills.length,
      })

      const detectedCurrency = apiTransactions.find(t => t.currency)?.currency
      const currencyFromUser = apiUser?.currency

      setTransactions(apiTransactions.map(mapApiTransaction))

      const budgetList = apiBudgets.map(b => mapApiBudget(b, currencyFromUser || detectedCurrency || settings.currency))
      const grouped: Record<string, Budget[]> = {}
      budgetList.forEach(b => {
        grouped[b.month] = grouped[b.month] || []
        grouped[b.month].push(b)
      })
      const currentMonth = new Date().toISOString().slice(0, 7)
      const currentBudgets = grouped[currentMonth] || []
      setBudgets(grouped)
      setObjectives(apiObjectives.map(o => mapApiObjective(o, currencyFromUser || detectedCurrency || settings.currency)))
      setCategories(apiCategories.map(cat => {
        const monthBudget = currentBudgets.find(b => b.categoryId === cat.categoryId)
        return {
          ...mapApiCategory(cat),
          monthlyBudget: monthBudget ? monthBudget.limit : 0,
          rollover: monthBudget ? monthBudget.rollover : false,
          rolloverTargetCategoryId: monthBudget ? monthBudget.rolloverTargetCategoryId ?? null : null,
        }
      }))
      setRecurringPayments(apiRecurring.map(mapApiRecurring))
      setBillInstances(apiBills.map(mapApiBill))
      setReceipts(apiReceipts.map(mapApiReceipt))
      setSettings(prev => ({
        ...prev,
        demoMode: false,
        currency: (currencyFromUser || detectedCurrency || prev.currency || 'CLP').toUpperCase(),
      }))
      setSyncStatus({
        isOnline: true,
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Failed to sync from backend', err)
      setSyncStatus(prev => ({ ...prev, isSyncing: false, isOnline: false }))
      throw err
    }
  }, [authToken])

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => ({ ...prev, ...updates }))
  }, [])

  const setCurrency = useCallback((code: string) => {
    const normalized = (code || '').toUpperCase()
    setSettings(prev => ({ ...prev, currency: normalized }))
    if (authToken) {
      updateCurrentUser(authToken, { currency: normalized })
        .catch(err => console.error('Failed to update currency', err))
    }
  }, [authToken])

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const createLocal = (txn: Transaction) => setTransactions(prev => [txn, ...prev])
    const base: Transaction = {
      ...transaction,
      id: `txn-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    if (!authToken) {
      createLocal(base)
      return
    }
    ;(async () => {
      try {
        const created = await createTransactionApi(authToken, {
          date: transaction.date,
          merchant: transaction.merchant,
          description: transaction.notes,
          amount: toMinor(transaction.amount, settings.currency),
          currency: settings.currency,
          categoryId: transaction.category,
          notes: transaction.notes,
          source: transaction.source,
          receiptId: transaction.receiptId,
        })
        createLocal(mapApiTransaction(created))
        await refreshFromBackend(authToken)
      } catch (err) {
        console.error('Failed to create transaction', err)
        createLocal(base)
      }
    })()
  }, [authToken, settings.currency]) // avoid recursive ref to refreshFromBackend before its declaration

  const upsertBudget = useCallback(async (month: string, categoryId: string, data: { limit: number; rollover?: boolean; rolloverTargetCategoryId?: string | null; purpose?: string | null; carryForwardEnabled?: boolean; isTerminal?: boolean; objectiveId?: string | null; applyToFuture?: boolean }) => {
    const limit = data.limit
    const rollover = data.rollover ?? false
    const rolloverTargetCategoryId = data.rolloverTargetCategoryId ?? null
    const purpose = data.purpose ?? null
    const carryForwardEnabled = data.carryForwardEnabled ?? true
    const isTerminal = data.isTerminal ?? false
    const objectiveId = data.objectiveId ?? null
    const applyToFuture = data.applyToFuture ?? false
    const previousMonth = budgets[month] || []
    setBudgets(prev => {
      const monthList = prev[month] || []
      const filtered = monthList.filter(b => b.categoryId !== categoryId)
      return {
        ...prev,
        [month]: [...filtered, { month, categoryId, limit, rollover, rolloverTargetCategoryId, purpose, carryForwardEnabled, isTerminal, objectiveId }],
      }
    })
    if (authToken) {
      const payload: ApiBudget = {
        month,
        categoryId,
        limit: toMinor(limit, settings.currency),
        rollover,
        rolloverTargetCategoryId,
        currency: settings.currency,
        purpose: purpose ?? undefined,
        carryForwardEnabled,
        isTerminal,
        objectiveId: objectiveId ?? undefined,
      }
      try {
        await upsertBudgetApi(authToken, month, categoryId, payload, applyToFuture)
        const remote = await fetchBudgets(authToken, month)
        const mapped = remote.map(b => mapApiBudget(b, settings.currency))
        setBudgets(prev => ({ ...prev, [month]: mapped }))
        markBudgetMonthFetched(month)
        const [year, monthPart] = month.split('-').map(Number)
        if (year && monthPart) {
          const nextDate = new Date(Date.UTC(year, monthPart, 1))
          const nextMonth = nextDate.toISOString().slice(0, 7)
          const nextRemote = await fetchBudgets(authToken, nextMonth)
          const nextMapped = nextRemote.map(b => mapApiBudget(b, settings.currency))
          setBudgets(prev => ({ ...prev, [nextMonth]: nextMapped }))
          markBudgetMonthFetched(nextMonth)
        }
      } catch (e) {
        console.error('Failed to upsert budget', e)
        setBudgets(prev => ({ ...prev, [month]: previousMonth }))
        throw e
      }
    }
  }, [authToken, markBudgetMonthFetched, settings.currency, budgets])

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)))
    if (authToken) {
      const txn = transactions.find(t => t.id === id)
      if (!txn) return
      const date = txn.date
      const payload: Partial<ApiTransaction> = {}
      if (updates.merchant !== undefined) payload.merchant = updates.merchant
      if (updates.description !== undefined) payload.description = updates.description
      if (updates.amount !== undefined) payload.amount = toMinor(updates.amount, settings.currency)
      if (updates.category !== undefined) payload.categoryId = updates.category
      if (updates.notes !== undefined) payload.notes = updates.notes
      if (updates.receiptId !== undefined) payload.receiptId = updates.receiptId
      if (updates.splits !== undefined) {
        payload.splits = updates.splits?.map(s => ({
          id: s.id,
          label: s.label,
          amount: toMinor(Math.abs(s.amount ?? 0), settings.currency),
          categoryId: s.categoryId,
        }))
      }
      updateTransactionApi(authToken, id, date, payload).catch(err => console.error('Failed to update transaction', err))
    }
  }, [authToken, transactions, settings.currency])

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
    if (authToken) {
      const txn = transactions.find(t => t.id === id)
      if (txn) {
        deleteTransactionApi(authToken, id, txn.date).catch(err => console.error('Failed to delete transaction', err))
      }
    }
  }, [authToken, transactions])

  const addTransactionSplit = useCallback((id: string, split: TransactionSplit) => {
    setTransactions(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, splits: [...(t.splits || []), split] }
          : t
      )
    )
  }, [])

  const removeTransactionSplit = useCallback((id: string, splitId: string) => {
    setTransactions(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, splits: (t.splits || []).filter(s => s.id !== splitId) }
          : t
      )
    )
  }, [])

  const addReceipt = useCallback((receipt: Omit<Receipt, 'id'>) => {
    const newReceipt: Receipt = { ...receipt, id: `rcpt-${Date.now()}` }
    setReceipts(prev => [newReceipt, ...prev])
    return newReceipt.id
  }, [])

  const uploadReceiptHandler = useCallback(async (file: File) => {
    if (!authToken) return null
    try {
      const created = await uploadReceipt(authToken, file)
      const mapped = mapApiReceipt(created)
      setReceipts(prev => [mapped, ...prev])
      return mapped.id
    } catch (err) {
      console.error('Failed to upload receipt', err)
      return null
    }
  }, [authToken])

  const importTransactionsFile = useCallback(async (file: File) => {
    if (!authToken) return null
    const result = await importTransactions(authToken, file)
    await refreshFromBackend(authToken)
    return result
  }, [authToken, refreshFromBackend])

  const updateReceiptHandler = useCallback((id: string, updates: Partial<Receipt>) => {
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    if (authToken) {
      const payload: any = {}
      if (updates.merchant !== undefined) payload.merchant = updates.merchant
      if (updates.date !== undefined) payload.date = updates.date
      if (updates.total !== undefined) payload.total = toMinor(updates.total, settings.currency)
      if (updates.status !== undefined) payload.status = updates.status
      if (updates.transactionId !== undefined) payload.transactionId = updates.transactionId
      if (updates.lineItems !== undefined) {
        payload.lineItems = updates.lineItems.map(li => ({
          id: li.id,
          description: li.description,
          amount: toMinor(li.amount, settings.currency),
          categoryId: li.categoryId,
        }))
      }
      updateReceipt(authToken, id, payload).catch(err => console.error('Failed to update receipt', err))
    }
  }, [authToken])

  const deleteReceiptHandler = useCallback((id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id))
    if (authToken) {
      deleteReceipt(authToken, id).catch(err => console.error('Failed to delete receipt', err))
    }
  }, [authToken])

  const attachReceiptToTransaction = useCallback((transactionId: string, receiptId: string | null) => {
    setTransactions(prev =>
      prev.map(t => (t.id === transactionId ? { ...t, receiptId } : t))
    )
  }, [])

  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'currentMonthSpent'> & { purpose?: string | null }) => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const addLocal = (cat: Category) => setCategories(prev => [...prev, cat])
    const base: Category = {
      ...category,
      id: `cat-${Date.now()}`,
      currentMonthSpent: 0,
      rolloverTargetCategoryId: category.rolloverTargetCategoryId ?? null,
    }
    if (!authToken) {
      addLocal(base)
      if (category.monthlyBudget) {
        setBudgets(prev => {
          const monthList = prev[currentMonth] || []
          return { ...prev, [currentMonth]: [...monthList, { month: currentMonth, categoryId: base.id, limit: category.monthlyBudget, rollover: category.rollover ?? false, rolloverTargetCategoryId: category.rolloverTargetCategoryId ?? null }] }
        })
      }
      return base.id
    }
    try {
      const created = await createCategory(authToken, {
        name: category.name,
        group: null,
        icon: category.icon,
        color: category.color,
      })
      const mapped = mapApiCategory(created)
      addLocal(mapped)
      if (category.monthlyBudget) {
        await upsertBudget(currentMonth, created.categoryId, {
          limit: category.monthlyBudget,
          rollover: category.rollover ?? false,
          rolloverTargetCategoryId: category.rolloverTargetCategoryId ?? null,
          purpose: category.purpose ?? category.name,
        })
      }
      await refreshFromBackend(authToken)
      return created.categoryId
    } catch (err) {
      console.error('Failed to create category', err)
      addLocal(base)
      return base.id
    }
  }, [authToken, refreshFromBackend, upsertBudget])

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)))

    const month = new Date().toISOString().slice(0, 7)
    if (updates.monthlyBudget !== undefined) {
      setBudgets(prev => {
        const monthList = prev[month] || []
        const filtered = monthList.filter(b => b.categoryId !== id)
        return { ...prev, [month]: [...filtered, { month, categoryId: id, limit: updates.monthlyBudget ?? 0, rollover: updates.rollover ?? false, rolloverTargetCategoryId: updates.rolloverTargetCategoryId ?? null }] }
      })
    }

    if (authToken) {
      const payload: Partial<ApiCategory> = {}
      if (updates.name !== undefined) payload.name = updates.name
      if (updates.icon !== undefined) payload.icon = updates.icon
      if (updates.color !== undefined) payload.color = updates.color
      if (Object.keys(payload).length > 0) {
        updateCategoryApi(authToken, id, payload).catch(err => console.error('Failed to update category', err))
      }

      if (updates.monthlyBudget !== undefined) {
        upsertBudget(month, id, {
          limit: updates.monthlyBudget ?? 0,
          rollover: updates.rollover,
          rolloverTargetCategoryId: updates.rolloverTargetCategoryId,
        })
      }
    }
  }, [authToken, upsertBudget])

  const addIOU = useCallback((iou: Omit<IOU, 'id' | 'createdAt' | 'settledAt'>) => {
    const newIOU: IOU = {
      ...iou,
      id: `iou-${Date.now()}`,
      createdAt: new Date().toISOString(),
      settledAt: null,
    }
    setIOUs(prev => [newIOU, ...prev])
  }, [])

  const settleIOU = useCallback((id: string) => {
    setIOUs(prev =>
      prev.map(i =>
        i.id === id
          ? { ...i, status: 'settled' as const, settledAt: new Date().toISOString() }
          : i
      )
    )
  }, [])

  const addInvestment = useCallback((investment: Omit<Investment, 'id'>) => {
    const newInvestment: Investment = {
      ...investment,
      id: `inv-${Date.now()}`,
    }
    setInvestments(prev => [...prev, newInvestment])
  }, [])

  const updateInvestment = useCallback((id: string, updates: Partial<Investment>) => {
    setInvestments(prev =>
      prev.map(inv => (inv.id === id ? { ...inv, ...updates } : inv))
    )
  }, [])

  const deleteInvestment = useCallback((id: string) => {
    setInvestments(prev => prev.filter(inv => inv.id !== id))
  }, [])

  const addRecurringPayment = useCallback((payment: Omit<RecurringPayment, 'id' | 'paused'>) => {
    const newPayment: RecurringPayment = { ...payment, id: `rec-${Date.now()}`, paused: false }
    setRecurringPayments(prev => [...prev, newPayment])
    if (authToken) {
      createRecurring(authToken, {
        name: payment.name,
        amount: toMinor(payment.amount, settings.currency),
        currency: settings.currency,
        categoryId: payment.categoryId,
        cadence: payment.cadence === 'weekly' ? 'WEEKLY' : 'MONTHLY',
        dayOfMonth: payment.dayOfMonth,
        startDate: payment.startDate,
        endDate: payment.endDate,
        autopostMode: payment.autoPost ? 'AUTO' : 'PROJECT_ONLY',
        isPaused: false,
      }).catch(err => console.error('Failed to create recurring', err))
    }
  }, [authToken, settings.currency])

  const updateRecurringPayment = useCallback((id: string, updates: Partial<RecurringPayment>) => {
    setRecurringPayments(prev =>
      prev.map(p => p.id === id ? { ...p, ...updates } : p)
    )
    if (authToken) {
      const payload: Partial<ApiRecurring> = {}
      if (updates.name !== undefined) payload.name = updates.name
      if (updates.amount !== undefined) payload.amount = toMinor(updates.amount, settings.currency)
      if (updates.categoryId !== undefined) payload.categoryId = updates.categoryId
      if (updates.cadence !== undefined) payload.cadence = updates.cadence.toUpperCase()
      if (updates.dayOfMonth !== undefined) payload.dayOfMonth = updates.dayOfMonth
      if (updates.startDate !== undefined) payload.startDate = updates.startDate
      if (updates.endDate !== undefined) payload.endDate = updates.endDate
      if (updates.autoPost !== undefined) payload.autopostMode = updates.autoPost ? 'AUTO' : 'PROJECT_ONLY'
      updateRecurring(authToken, id, payload).catch(err => console.error('Failed to update recurring', err))
    }
  }, [authToken])

  const toggleRecurringPause = useCallback((id: string, paused: boolean) => {
    setRecurringPayments(prev =>
      prev.map(p => (p.id === id ? { ...p, paused } : p))
    )
    if (authToken) {
      const fn = paused ? pauseRecurring : resumeRecurring
      fn(authToken, id).catch(err => console.error('Failed to toggle recurring', err))
    }
  }, [authToken])

  const stopRecurringPayment = useCallback((id: string) => {
    const today = new Date().toISOString().split('T')[0]
    setRecurringPayments(prev =>
      prev.map(p => (p.id === id ? { ...p, endDate: today, paused: true } : p))
    )
    if (authToken) {
      stopRecurring(authToken, id).catch(err => console.error('Failed to stop recurring', err))
    }
  }, [authToken])

  const updateBillInstance = useCallback((id: string, updates: Partial<BillInstance>) => {
    setBillInstances(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    if (authToken) {
      const payload: any = {}
      if (updates.status !== undefined) payload.status = updates.status.toUpperCase()
      if (updates.amount !== undefined) payload.amount = toMinor(updates.amount, settings.currency)
      updateBill(authToken, id, payload).catch(err => console.error('Failed to update bill', err))
    }
  }, [authToken])

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }, [])

  const loadDemoData = useCallback(() => {
    setTransactions(demoTransactions)
    setCategories(demoCategories)
    const demoMonth = new Date().toISOString().slice(0, 7)
    setBudgets({
      [demoMonth]: demoCategories.map(c => ({
        month: demoMonth,
        categoryId: c.id,
        limit: c.monthlyBudget,
        rollover: c.rollover,
        rolloverTargetCategoryId: c.rolloverTargetCategoryId ?? null,
      })),
    })
    setRecurringPayments(demoRecurringPayments)
    setBillInstances(demoBillInstances)
    setIOUs(demoIOUs)
    setInvestments(demoInvestments)
    setFintualGoals(demoFintualGoals)
    setObjectives([])
    setReceipts([])
    setSettings(prev => ({ ...prev, demoMode: true }))
  }, [])

  const clearData = useCallback(() => {
    setTransactions([])
    setCategories([])
    setBudgets({})
    setRecurringPayments([])
    setBillInstances([])
    setIOUs([])
    setInvestments([])
    setFintualGoals([])
    setObjectives([])
    setReceipts([])
    setSettings(prev => ({ ...prev, demoMode: false }))
  }, [])

  const clearAllData = clearData

  const setAuthToken = useCallback((token: string | null) => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token)
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      }
    }
    setAuthTokenState(token)
    if (!token) {
      clearData()
      setSyncStatus(prev => ({ ...prev, lastSyncedAt: null, isSyncing: false, isOnline: true }))
    }
  }, [clearData])

  useEffect(() => {
    if (!authToken) return
    refreshFromBackend().catch(err => {
      console.error('Sync failed', err)
      if (err instanceof ApiError && err.status === 401) {
        setAuthToken(null)
        router.replace('/welcome')
      }
    })
  }, [authToken, refreshFromBackend, router, setAuthToken])

  const fetchBudgetsForMonth = useCallback(async (month: string, force?: boolean) => {
    if (!authToken) return
    if (!force && fetchedBudgetMonthsRef.current.has(month)) return
    markBudgetMonthFetched(month)
    try {
      const remote = await fetchBudgets(authToken, month)
      const mapped = remote.map(b => mapApiBudget(b, settings.currency))
      setBudgets(prev => ({ ...prev, [month]: mapped }))
    } catch (err) {
      const nextFetched = new Set(fetchedBudgetMonthsRef.current)
      nextFetched.delete(month)
      fetchedBudgetMonthsRef.current = nextFetched
      console.error('Failed to fetch budgets for month', month, err)
    }
  }, [authToken, markBudgetMonthFetched, settings.currency])

  const copyBudgetsFromMonth = useCallback(async (month: string, sourceMonth: string) => {
    if (!authToken) return
    try {
      const copied = await copyBudgets(authToken, month, sourceMonth)
      const mapped = copied.map(b => mapApiBudget(b, settings.currency))
      setBudgets(prev => ({ ...prev, [month]: [...(prev[month] || []), ...mapped] }))
      markBudgetMonthFetched(month)
    } catch (err) {
      console.error('Failed to copy budgets from', sourceMonth, 'to', month, err)
    }
  }, [authToken, markBudgetMonthFetched, settings.currency])

  const deleteBudgetByScope = useCallback(async (categoryId: string, scope: 'this_month' | 'from_month' | 'all', month: string) => {
    if (!authToken) return
    await deleteBudgetScoped(authToken, categoryId, scope, scope === 'all' ? undefined : month)
    await fetchBudgetsForMonth(month, true)
    const [year, monthPart] = month.split('-').map(Number)
    if (year && monthPart) {
      const nextDate = new Date(Date.UTC(year, monthPart, 1))
      await fetchBudgetsForMonth(nextDate.toISOString().slice(0, 7), true)
    }
  }, [authToken, fetchBudgetsForMonth])

  const refreshObjectives = useCallback(async () => {
    if (!authToken) return
    const remote = await fetchObjectives(authToken)
    setObjectives(remote.map(o => mapApiObjective(o, settings.currency)))
  }, [authToken, settings.currency])

  const createObjectiveHandler = useCallback(async (
    payload: { name: string; categoryId?: string | null; currency?: string | null; totalAmount?: number | null; plans: ObjectiveMonthPlan[] },
    force = false,
  ) => {
    if (!authToken) throw new Error('Not authenticated')
    const apiPayload: CreateObjectivePayload = {
      name: payload.name,
      categoryId: payload.categoryId ?? null,
      currency: payload.currency ?? settings.currency,
      totalAmount: payload.totalAmount !== undefined && payload.totalAmount !== null
        ? toMinor(payload.totalAmount, payload.currency || settings.currency)
        : null,
      plans: payload.plans.map(p => ({
        month: p.month,
        amount: toMinor(p.amount, payload.currency || settings.currency),
        kind: p.kind,
        isLastMonth: p.isLastMonth,
      })),
    }
    const created = await createObjectiveApi(authToken, apiPayload, force)
    await refreshObjectives()
    for (const p of payload.plans) {
      await fetchBudgetsForMonth(p.month, true)
    }
    return mapApiObjective(created, payload.currency || settings.currency)
  }, [authToken, fetchBudgetsForMonth, refreshObjectives, settings.currency])

  const updateObjectiveHandler = useCallback(async (
    objectiveId: string,
    payload: { name?: string; categoryId?: string | null; currency?: string | null; totalAmount?: number | null; status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'; plans?: ObjectiveMonthPlan[] },
    force = false,
  ) => {
    if (!authToken) throw new Error('Not authenticated')
    const apiPayload: UpdateObjectivePayload = {
      name: payload.name,
      categoryId: payload.categoryId,
      currency: payload.currency,
      totalAmount: payload.totalAmount !== undefined && payload.totalAmount !== null
        ? toMinor(payload.totalAmount, payload.currency || settings.currency)
        : payload.totalAmount ?? undefined,
      status: payload.status,
      plans: payload.plans?.map(p => ({
        month: p.month,
        amount: toMinor(p.amount, payload.currency || settings.currency),
        kind: p.kind,
        isLastMonth: p.isLastMonth,
      })),
    }
    const updated = await updateObjectiveApi(authToken, objectiveId, apiPayload, force)
    await refreshObjectives()
    if (payload.plans) {
      for (const p of payload.plans) {
        await fetchBudgetsForMonth(p.month, true)
      }
    }
    return mapApiObjective(updated, payload.currency || settings.currency)
  }, [authToken, fetchBudgetsForMonth, refreshObjectives, settings.currency])

  const completeObjectiveHandler = useCallback(async (objectiveId: string) => {
    if (!authToken) return
    await completeObjectiveApi(authToken, objectiveId)
    await refreshObjectives()
  }, [authToken, refreshObjectives])

  const deleteObjectiveHandler = useCallback(async (objectiveId: string) => {
    if (!authToken) return
    const objective = objectives.find(o => o.objectiveId === objectiveId)
    await deleteObjectiveApi(authToken, objectiveId)
    await refreshObjectives()
    if (objective) {
      for (const p of objective.plans) {
        await fetchBudgetsForMonth(p.month, true)
      }
    }
  }, [authToken, objectives, fetchBudgetsForMonth, refreshObjectives])

  return (
    <DataContext.Provider
      value={{
        authToken,
        transactions,
        categories,
        budgets,
        objectives,
        recurringPayments,
        billInstances,
        ious,
        investments,
        fintualGoals,
        receipts,
        settings,
        syncStatus,
        user,
        currency,
        currencyCode,
        setAuthToken,
        refreshFromBackend,
        updateUser,
        setCurrency,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addTransactionSplit,
        removeTransactionSplit,
        attachReceiptToTransaction,
        addReceipt,
        addCategory,
        upsertBudget,
        deleteBudgetByScope,
        updateCategory,
        createObjective: createObjectiveHandler,
        updateObjective: updateObjectiveHandler,
        completeObjective: completeObjectiveHandler,
        deleteObjective: deleteObjectiveHandler,
        refreshObjectives,
        addIOU,
        settleIOU,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        addRecurringPayment,
        updateRecurringPayment,
        toggleRecurringPause,
        stopRecurringPayment,
        updateBillInstance,
        uploadReceipt: uploadReceiptHandler,
        importTransactionsFile,
        updateReceipt: updateReceiptHandler,
        deleteReceipt: deleteReceiptHandler,
        updateSettings,
        clearAllData,
        loadDemoData,
        clearData,
        formatCurrency,
        fetchBudgetsForMonth,
        copyBudgetsFromMonth,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
