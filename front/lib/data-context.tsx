'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
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
  ious: IOU[]
  investments: Investment[]
  fintualGoals: FintualGoal[]
  receipts: Receipt[]
  settings: UserSettings
  syncStatus: SyncStatus
  user: User
  currency: string
  
  // Actions
  updateUser: (updates: Partial<User>) => void
  setCurrency: (symbol: string) => void
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  addTransactionSplit: (id: string, split: TransactionSplit) => void
  removeTransactionSplit: (id: string, splitId: string) => void
  attachReceiptToTransaction: (transactionId: string, receiptId: string | null) => void
  addReceipt: (receipt: Omit<Receipt, 'id'>) => string
  addCategory: (category: Omit<Category, 'id' | 'currentMonthSpent'>) => void
  updateCategory: (id: string, updates: Partial<Category>) => void
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
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(demoTransactions)
  const [categories, setCategories] = useState<Category[]>(demoCategories)
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>(demoRecurringPayments)
  const [billInstances, setBillInstances] = useState<BillInstance[]>(demoBillInstances)
  const [ious, setIOUs] = useState<IOU[]>(demoIOUs)
  const [investments, setInvestments] = useState<Investment[]>(demoInvestments)
  const [fintualGoals, setFintualGoals] = useState<FintualGoal[]>(demoFintualGoals)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [settings, setSettings] = useState<UserSettings>({
    currency: 'USD',
    weekStartDay: 0,
    theme: 'system',
    demoMode: true,
  })
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSyncedAt: null,
  })
  const [user, setUser] = useState<User>({
    name: 'Demo User',
    email: 'demo@ledger.app',
  })
  
  const currency = settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : settings.currency === 'GBP' ? '£' : '$'
  
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.currency,
    }).format(amount)
  }, [settings.currency])

  // Set initial lastSyncedAt on client to avoid server/client time mismatch
  useEffect(() => {
    setSyncStatus(prev => ({ ...prev, lastSyncedAt: new Date().toISOString() }))
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => ({ ...prev, ...updates }))
  }, [])

  const setCurrency = useCallback((symbol: string) => {
    setSettings(prev => ({ ...prev, currency: symbol }))
  }, [])

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `txn-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    setTransactions(prev => [newTransaction, ...prev])
  }, [])

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    )
  }, [])

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
  }, [])

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

  const attachReceiptToTransaction = useCallback((transactionId: string, receiptId: string | null) => {
    setTransactions(prev =>
      prev.map(t => (t.id === transactionId ? { ...t, receiptId } : t))
    )
  }, [])

  const addCategory = useCallback((category: Omit<Category, 'id' | 'currentMonthSpent'>) => {
    const newCategory: Category = {
      ...category,
      id: `cat-${Date.now()}`,
      currentMonthSpent: 0,
    }
    setCategories(prev => [...prev, newCategory])
  }, [])

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates } : c))
    )
  }, [])

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
  }, [])

  const updateRecurringPayment = useCallback((id: string, updates: Partial<RecurringPayment>) => {
    setRecurringPayments(prev =>
      prev.map(p => p.id === id ? { ...p, ...updates } : p)
    )
  }, [])

  const toggleRecurringPause = useCallback((id: string, paused: boolean) => {
    setRecurringPayments(prev =>
      prev.map(p => (p.id === id ? { ...p, paused } : p))
    )
  }, [])

  const stopRecurringPayment = useCallback((id: string) => {
    const today = new Date().toISOString().split('T')[0]
    setRecurringPayments(prev =>
      prev.map(p => (p.id === id ? { ...p, endDate: today, paused: true } : p))
    )
  }, [])

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }, [])

  const loadDemoData = useCallback(() => {
    setTransactions(demoTransactions)
    setCategories(demoCategories)
    setRecurringPayments(demoRecurringPayments)
    setBillInstances(demoBillInstances)
    setIOUs(demoIOUs)
    setInvestments(demoInvestments)
    setFintualGoals(demoFintualGoals)
    setReceipts([])
    setSettings(prev => ({ ...prev, demoMode: true }))
  }, [])

  const clearData = useCallback(() => {
    setTransactions([])
    setCategories([])
    setRecurringPayments([])
    setBillInstances([])
    setIOUs([])
    setInvestments([])
    setFintualGoals([])
    setReceipts([])
    setSettings(prev => ({ ...prev, demoMode: false }))
  }, [])

  const clearAllData = clearData

  return (
    <DataContext.Provider
      value={{
        transactions,
        categories,
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
        updateCategory,
        addIOU,
        settleIOU,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        addRecurringPayment,
        updateRecurringPayment,
        toggleRecurringPause,
        stopRecurringPayment,
        updateSettings,
        clearAllData,
        loadDemoData,
        clearData,
        formatCurrency,
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
