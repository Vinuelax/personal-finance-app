'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Pencil, Trash2 } from 'lucide-react'
import type { Objective, ObjectiveMonthPlan } from '@/lib/types'

interface PlanRow extends ObjectiveMonthPlan {
  id: string
}

const sortPlans = <T extends { month: string }>(plans: T[]) =>
  [...plans].sort((a, b) => a.month.localeCompare(b.month))

const distributeAmounts = (total: number, count: number) => {
  if (count <= 0) return []
  const base = Math.floor(total / count)
  const remainder = total - (base * count)
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0))
}

function ObjectiveDialog({
  open,
  onClose,
  title,
  submitLabel,
  categories,
  defaultValues,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  title: string
  submitLabel: string
  categories: { id: string; name: string }[]
  defaultValues?: {
    name?: string
    currency?: string
    categoryId?: string
    totalAmount?: number | null
    plans?: ObjectiveMonthPlan[]
  }
  onSubmit: (payload: {
    name: string
    currency: string
    categoryId: string | null
    totalAmount: number | null
    plans: ObjectiveMonthPlan[]
    forceReplace: boolean
  }) => Promise<void>
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(defaultValues?.name || '')
  const [currency, setCurrency] = useState(defaultValues?.currency || 'CLP')
  const [categoryId, setCategoryId] = useState<string>(defaultValues?.categoryId || 'auto')
  const [forceReplace, setForceReplace] = useState(false)
  const [totalAmount, setTotalAmount] = useState<string>(defaultValues?.totalAmount ? String(defaultValues.totalAmount) : '')
  const [plans, setPlans] = useState<PlanRow[]>(
    sortPlans(defaultValues?.plans || [{ month: new Date().toISOString().slice(0, 7), amount: 0, kind: 'SPEND', isLastMonth: false }]).map((p, idx) => ({
      ...p,
      isLastMonth: false,
      id: `plan-${idx}-${p.month}`,
    })),
  )

  useEffect(() => {
    if (!open) return
    setIsSaving(false)
    setError(null)
    setName(defaultValues?.name || '')
    setCurrency(defaultValues?.currency || 'CLP')
    setCategoryId(defaultValues?.categoryId || 'auto')
    setForceReplace(false)
    setTotalAmount(defaultValues?.totalAmount ? String(defaultValues.totalAmount) : '')
    setPlans(sortPlans(defaultValues?.plans || [{ month: new Date().toISOString().slice(0, 7), amount: 0, kind: 'SPEND', isLastMonth: false }]).map((p, idx) => ({
      ...p,
      isLastMonth: false,
      id: `plan-${idx}-${p.month}`,
    })))
  }, [open])

  const addPlanRow = () => {
    setPlans(prev => [...prev, {
      id: `plan-${Date.now()}`,
      month: new Date().toISOString().slice(0, 7),
      amount: 0,
      kind: 'SPEND',
      isLastMonth: false,
    }])
  }

  const updatePlanRow = (id: string, updates: Partial<PlanRow>) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, ...updates, isLastMonth: false } : p))
  }

  const removePlanRow = (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id))
  }

  const handleDistribute = () => {
    const parsedTotal = Math.round(Number(totalAmount || 0))
    if (parsedTotal <= 0 || plans.length === 0) return
    const ordered = sortPlans(plans)
    const parts = distributeAmounts(parsedTotal, ordered.length)
    setPlans(ordered.map((plan, idx) => ({ ...plan, amount: parts[idx] })))
  }

  const handleSubmit = async () => {
    if (!name.trim() || plans.length === 0) return
    setError(null)
    setIsSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        currency,
        categoryId: categoryId === 'auto' ? null : categoryId,
        totalAmount: totalAmount ? Number(totalAmount) : null,
        plans: sortPlans(plans).map(p => ({
          month: p.month,
          amount: Number(p.amount || 0),
          kind: p.kind,
          isLastMonth: false,
        })),
        forceReplace,
      })
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed to save objective')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="objective-name">Name</Label>
            <Input id="objective-name" value={name} onChange={e => setName(e.target.value)} placeholder="Trip to Patagonia" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['CLP', 'USD', 'EUR'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto create/reuse by name</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="objective-total">Total amount (optional)</Label>
              <Input
                id="objective-total"
                type="number"
                min="0"
                value={totalAmount}
                onChange={e => setTotalAmount(e.target.value)}
                placeholder="1250000"
              />
            </div>
            <Button type="button" variant="outline" onClick={handleDistribute}>
              Distribute total
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Monthly schedule</Label>
            <div className="space-y-2">
              {sortPlans(plans).map(plan => (
                <div key={plan.id} className="grid grid-cols-1 gap-2 rounded-md border p-2 sm:grid-cols-4">
                  <Input type="month" value={plan.month} onChange={e => updatePlanRow(plan.id, { month: e.target.value })} />
                  <Input type="number" value={plan.amount} onChange={e => updatePlanRow(plan.id, { amount: Number(e.target.value || 0) })} />
                  <Select value={plan.kind} onValueChange={value => updatePlanRow(plan.id, { kind: value as 'SPEND' | 'SAVE' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPEND">SPEND</SelectItem>
                      <SelectItem value="SAVE">SAVE</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => removePlanRow(plan.id)}>Remove</Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={addPlanRow}>Add Month</Button>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={forceReplace} onCheckedChange={checked => setForceReplace(!!checked)} />
            <span className="text-sm text-muted-foreground">Replace conflicting budget months</span>
          </div>

          {error && <p className="text-sm text-negative">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving || !name.trim()}>
              {isSaving ? 'Saving…' : submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ObjectivesContent() {
  const {
    objectives,
    categories,
    settings,
    createObjective,
    updateObjective,
    completeObjective,
    deleteObjective,
    refreshObjectives,
    formatCurrency,
  } = useData()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Objective | null>(null)

  const totalsByObjective = useMemo(() => {
    const map: Record<string, number> = {}
    objectives.forEach(o => {
      map[o.objectiveId] = o.plans.reduce((sum, p) => sum + p.amount, 0)
    })
    return map
  }, [objectives])

  const sortedObjectives = useMemo(
    () => [...objectives]
      .filter(o => o.status !== 'ARCHIVED')
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [objectives],
  )

  return (
    <AppShell title="Objectives">
      <div className="space-y-4 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Objectives</h2>
          <Button onClick={() => setCreateOpen(true)}>New Objective</Button>
        </div>

        <div className="space-y-3">
          {sortedObjectives.map(o => (
            <Card key={o.objectiveId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{o.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {o.status} • {o.plans.length} months • {formatCurrency(totalsByObjective[o.objectiveId] || 0)}
                  {o.totalAmount ? ` / target ${formatCurrency(o.totalAmount)}` : ''}
                </p>
                <div className="space-y-1 text-sm">
                  {sortPlans(o.plans).map(p => (
                    <div key={`${o.objectiveId}-${p.month}`} className="flex justify-between">
                      <span>{p.month} ({p.kind})</span>
                      <span>{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(o)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  {o.status === 'ACTIVE' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => completeObjective(o.objectiveId)}
                    >
                      Mark Complete
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      const confirmed = window.confirm(`Delete objective "${o.name}"?`)
                      if (!confirmed) return
                      await deleteObjective(o.objectiveId)
                      await refreshObjectives()
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {sortedObjectives.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No objectives yet.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ObjectiveDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Objective"
        submitLabel="Create Objective"
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
        defaultValues={{ currency: settings.currency }}
        onSubmit={async payload => {
          await createObjective({
            name: payload.name,
            currency: payload.currency,
            categoryId: payload.categoryId,
            totalAmount: payload.totalAmount,
            plans: payload.plans,
          }, payload.forceReplace)
          await refreshObjectives()
        }}
      />

      <ObjectiveDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit Objective${editing ? `: ${editing.name}` : ''}`}
        submitLabel="Save"
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
        defaultValues={editing ? {
          name: editing.name,
          currency: editing.currency || settings.currency,
          categoryId: editing.categoryId,
          totalAmount: editing.totalAmount,
          plans: editing.plans,
        } : undefined}
        onSubmit={async payload => {
          if (!editing) return
          await updateObjective(editing.objectiveId, {
            name: payload.name,
            currency: payload.currency,
            categoryId: payload.categoryId,
            totalAmount: payload.totalAmount,
            plans: payload.plans,
          }, payload.forceReplace)
          await refreshObjectives()
          setEditing(null)
        }}
      />
    </AppShell>
  )
}

export default function ObjectivesPage() {
  return <ObjectivesContent />
}
