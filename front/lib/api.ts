const DEFAULT_API_BASE = 'http://localhost:8000/api/v1'
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, '')
console.log('Using API base URL:', API_BASE_URL)

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'

interface ApiOptions extends RequestInit {
  token?: string
}

interface TokenResponse {
  access_token: string
  token_type: string
}

export interface ApiUser {
  userId: string
  email: string
  currency?: string | null
}

export interface ApiTransaction {
  txnId: string
  date: string
  merchant?: string
  description?: string
  amount: number
  currency?: string
  categoryId?: string | null
  notes?: string | null
  source?: string
  accountId?: string | null
  receiptId?: string | null
  splits?: {
    id: string
    label: string
    amount: number
    categoryId: string | null
  }[]
  createdAt?: string
  updatedAt?: string
}

export interface ApiCategory {
  categoryId: string
  name: string
  group?: string | null
  icon?: string | null
  color?: string | null
}

export interface ApiBudget {
  month: string
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

export interface ApiObjectiveMonthPlan {
  month: string
  amount: number
  kind: 'SPEND' | 'SAVE'
  isLastMonth: boolean
}

export interface ApiObjective {
  objectiveId: string
  name: string
  categoryId: string
  currency?: string | null
  totalAmount?: number | null
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  plans: ApiObjectiveMonthPlan[]
  createdAt?: string | null
  updatedAt?: string | null
}

export interface CreateObjectivePayload {
  name: string
  categoryId?: string | null
  currency?: string | null
  totalAmount?: number | null
  plans: ApiObjectiveMonthPlan[]
}

export interface UpdateObjectivePayload {
  name?: string
  categoryId?: string | null
  currency?: string | null
  totalAmount?: number | null
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  plans?: ApiObjectiveMonthPlan[]
}

export interface ApiRecurring {
  ruleId: string
  name: string
  amount: number
  currency: string
  categoryId: string | null
  cadence: string
  dayOfMonth: number | null
  startDate: string
  endDate: string | null
  autopostMode: string
  isPaused: boolean
}

export interface ApiBill {
  billId: string
  ruleId: string | null
  name: string | null
  dueDate: string | null
  amount: number | null
  currency: string | null
  categoryId: string | null
  status: string | null
  linkedTxnId: string | null
}

export interface ApiReceiptLineItem {
  id: string
  description: string
  amount: number
  categoryId: string | null
}

export interface ApiReceipt {
  receiptId: string
  merchant: string
  date: string
  total: number
  status: string
  imageUrl?: string | null
  lineItems: ApiReceiptLineItem[]
  transactionId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function apiFetch<T>(path: string, method: HttpMethod = 'GET', options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  headers.set('Accept', 'application/json')
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (method !== 'GET' && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
  })

  if (!res.ok) {
    const message = await safeReadError(res)
    throw new ApiError(res.status, message || `Request failed with status ${res.status}`)
  }

  return res.status === 204 ? (null as T) : (await res.json() as T)
}

async function safeReadError(res: Response) {
  try {
    const data = await res.json()
    if (typeof data?.detail === 'string') return data.detail
    if (Array.isArray(data?.detail)) return data.detail.map((d: any) => d.msg || d.detail).join(', ')
    return res.statusText
  } catch {
    return res.statusText
  }
}

export async function login(email: string, password: string): Promise<string> {
  const data = await apiFetch<TokenResponse>('/auth/login', 'POST', {
    body: JSON.stringify({ email, password }),
  })
  return data.access_token
}

export async function importTransactions(token: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<{ imported: number; skipped: number; errors: string[] }>('/transactions/import', 'POST', {
    token,
    body: form,
  })
}

export async function signup(email: string, password: string): Promise<string> {
  const data = await apiFetch<TokenResponse>('/auth/signup', 'POST', {
    body: JSON.stringify({ email, password }),
  })
  return data.access_token
}

export async function fetchTransactions(token: string) {
  return apiFetch<ApiTransaction[]>('/transactions', 'GET', { token })
}

export interface CalendarDaySummary {
  date: string
  income: number
  expense: number
  transactions: ApiTransaction[]
}

export async function fetchCalendar(token: string, month: string) {
  return apiFetch<{ month: string; days: CalendarDaySummary[] }>(`/transactions/calendar?month=${encodeURIComponent(month)}`, 'GET', { token })
}

export async function fetchCategories(token: string) {
  return apiFetch<ApiCategory[]>('/categories', 'GET', { token })
}

export async function createCategory(token: string, payload: Omit<ApiCategory, 'categoryId'>) {
  return apiFetch<ApiCategory>('/categories', 'POST', { token, body: JSON.stringify(payload) })
}

export async function updateCategoryApi(token: string, categoryId: string, payload: Partial<Omit<ApiCategory, 'categoryId'>>) {
  return apiFetch<ApiCategory>(`/categories/${categoryId}`, 'PATCH', { token, body: JSON.stringify(payload) })
}

export async function deleteCategoryApi(token: string, categoryId: string) {
  return apiFetch<{ deleted: boolean }>(`/categories/${categoryId}`, 'DELETE', { token })
}

export async function createTransactionApi(token: string, payload: Omit<ApiTransaction, 'txnId'>) {
  return apiFetch<ApiTransaction>('/transactions', 'POST', { token, body: JSON.stringify(payload) })
}

export async function updateTransactionApi(token: string, txnId: string, date: string, payload: Partial<ApiTransaction>) {
  return apiFetch<ApiTransaction>(`/transactions/${txnId}?date=${encodeURIComponent(date)}`, 'PATCH', { token, body: JSON.stringify(payload) })
}

export async function deleteTransactionApi(token: string, txnId: string, date: string) {
  return apiFetch<{ deleted: boolean }>(`/transactions/${txnId}?date=${encodeURIComponent(date)}`, 'DELETE', { token })
}

export async function fetchBudgets(token: string, month?: string) {
  const query = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiFetch<ApiBudget[]>(`/budgets${query}`, 'GET', { token })
}

export async function upsertBudgetApi(token: string, month: string, categoryId: string, payload: ApiBudget, applyFuture = false) {
  const query = applyFuture ? '?applyFuture=true' : ''
  return apiFetch<ApiBudget>(`/budgets/${month}/${categoryId}${query}`, 'PUT', { token, body: JSON.stringify(payload) })
}

export async function deleteBudget(token: string, month: string, categoryId: string) {
  return apiFetch<{ deleted: boolean }>(`/budgets/${month}/${categoryId}`, 'DELETE', { token })
}

export async function deleteBudgetScoped(token: string, categoryId: string, scope: 'this_month' | 'from_month' | 'all', month?: string) {
  const params = new URLSearchParams({ scope, categoryId })
  if (month) params.set('month', month)
  return apiFetch<{ deleted: boolean; count: number }>(`/budgets/scope?${params.toString()}`, 'DELETE', { token })
}

export async function copyBudgets(token: string, month: string, sourceMonth: string) {
  return apiFetch<ApiBudget[]>(`/budgets/${month}/copy-from/${sourceMonth}`, 'POST', { token })
}

export async function fetchObjectives(token: string) {
  return apiFetch<ApiObjective[]>('/objectives', 'GET', { token })
}

export async function createObjective(token: string, payload: CreateObjectivePayload, force = false) {
  const query = force ? '?force=true' : ''
  return apiFetch<ApiObjective>(`/objectives${query}`, 'POST', { token, body: JSON.stringify(payload) })
}

export async function updateObjective(token: string, objectiveId: string, payload: UpdateObjectivePayload, force = false) {
  const query = force ? '?force=true' : ''
  return apiFetch<ApiObjective>(`/objectives/${objectiveId}${query}`, 'PATCH', { token, body: JSON.stringify(payload) })
}

export async function completeObjective(token: string, objectiveId: string) {
  return apiFetch<ApiObjective>(`/objectives/${objectiveId}/complete`, 'POST', { token })
}

export async function deleteObjective(token: string, objectiveId: string) {
  return apiFetch<{ deleted: boolean }>(`/objectives/${objectiveId}`, 'DELETE', { token })
}

export async function fetchRecurring(token: string) {
  return apiFetch<ApiRecurring[]>('/recurring', 'GET', { token })
}

export async function createRecurring(token: string, payload: Omit<ApiRecurring, 'ruleId' | 'createdAt' | 'updatedAt'>) {
  return apiFetch<ApiRecurring>('/recurring', 'POST', { token, body: JSON.stringify(payload) })
}

export async function updateRecurring(token: string, ruleId: string, payload: Partial<ApiRecurring>) {
  return apiFetch<ApiRecurring>(`/recurring/${ruleId}`, 'PATCH', { token, body: JSON.stringify(payload) })
}

export async function pauseRecurring(token: string, ruleId: string) {
  return apiFetch(`/recurring/${ruleId}/pause`, 'POST', { token })
}

export async function resumeRecurring(token: string, ruleId: string) {
  return apiFetch(`/recurring/${ruleId}/resume`, 'POST', { token })
}

export async function stopRecurring(token: string, ruleId: string) {
  return apiFetch(`/recurring/${ruleId}/stop`, 'POST', { token })
}

export async function fetchBills(token: string) {
  return apiFetch<ApiBill[]>('/bills', 'GET', { token })
}

export async function updateBill(token: string, billId: string, payload: Partial<Pick<ApiBill, 'status' | 'amount'>>) {
  return apiFetch<ApiBill>(`/bills/${billId}`, 'PATCH', { token, body: JSON.stringify(payload) })
}

export async function fetchReceipts(token: string) {
  return apiFetch<ApiReceipt[]>('/receipts', 'GET', { token })
}

export async function createReceipt(token: string, payload: Omit<ApiReceipt, 'receiptId' | 'createdAt' | 'updatedAt'>) {
  return apiFetch<ApiReceipt>('/receipts', 'POST', { token, body: JSON.stringify(payload) })
}

export async function updateReceipt(token: string, receiptId: string, payload: Partial<ApiReceipt>) {
  return apiFetch<ApiReceipt>(`/receipts/${receiptId}`, 'PATCH', { token, body: JSON.stringify(payload) })
}

export async function deleteReceipt(token: string, receiptId: string) {
  return apiFetch<{ deleted: boolean }>(`/receipts/${receiptId}`, 'DELETE', { token })
}

export async function uploadReceipt(token: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE_URL}/receipts/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })
  if (!res.ok) {
    const message = await safeReadError(res as any)
    throw new Error(message || `Upload failed with status ${res.status}`)
  }
  return res.json() as Promise<ApiReceipt>
}

export async function fetchCurrentUser(token: string) {
  return apiFetch<ApiUser>('/user/me', 'GET', { token })
}

export async function updateCurrentUser(token: string, payload: Partial<ApiUser>) {
  return apiFetch<ApiUser>('/user/me', 'PATCH', { token, body: JSON.stringify(payload) })
}
