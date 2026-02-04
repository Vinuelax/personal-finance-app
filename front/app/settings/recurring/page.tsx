'use client'

import { useMemo, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Calendar, Pause, Play, StopCircle, Plus } from 'lucide-react'
import type { RecurringPayment } from '@/lib/types'
import { DataProvider } from '@/lib/data-context'
import { cn } from '@/lib/utils'

const cadenceLabels: Record<RecurringPayment['cadence'], string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

interface RecurringFormState {
  name: string
  amount: string
  cadence: RecurringPayment['cadence']
  dayOfMonth: string
  categoryId: string | 'none'
  autoPost: boolean
}

function RecurringContent() {
  const { recurringPayments, categories, addRecurringPayment, toggleRecurringPause, stopRecurringPayment } = useData()
  const [openForm, setOpenForm] = useState(false)
  const [form, setForm] = useState<RecurringFormState>({
    name: '',
    amount: '',
    cadence: 'monthly',
    dayOfMonth: '1',
    categoryId: 'none',
    autoPost: true,
  })

  const active = useMemo(() => recurringPayments.filter(p => !p.endDate), [recurringPayments])
  const ended = useMemo(() => recurringPayments.filter(p => p.endDate), [recurringPayments])

  const handleSubmit = () => {
    if (!form.name || !form.amount) return
    addRecurringPayment({
      name: form.name.trim(),
      amount: parseFloat(form.amount),
      cadence: form.cadence,
      dayOfMonth: parseInt(form.dayOfMonth || '1', 10),
      categoryId: form.categoryId === 'none' ? null : form.categoryId,
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      autoPost: form.autoPost,
    })
    setOpenForm(false)
    setForm({
      name: '',
      amount: '',
      cadence: 'monthly',
      dayOfMonth: '1',
      categoryId: 'none',
      autoPost: true,
    })
  }

  const renderRow = (p: RecurringPayment) => (
    <Card key={p.id} className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-medium">{p.name}</p>
            <p className="text-sm text-muted-foreground">
              ${p.amount.toFixed(2)} · {cadenceLabels[p.cadence]} on day {p.dayOfMonth}
            </p>
            {p.endDate && (
              <Badge variant="outline" className="text-[10px]">
                Ended on {p.endDate}
              </Badge>
            )}
            {p.paused && !p.endDate && (
              <Badge variant="secondary" className="text-[10px]">Paused</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {!p.endDate && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-transparent"
                  onClick={() => toggleRecurringPause(p.id, !p.paused)}
                >
                  {p.paused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                  {p.paused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => stopRecurringPayment(p.id)}
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <AppShell title="Recurring Payments" showSearch={false}>
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Recurring payments</h1>
            <p className="text-sm text-muted-foreground">Add, pause, or stop your automatic bills.</p>
          </div>
          <Button onClick={() => setOpenForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add recurring
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Active</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {active.length === 0 && (
              <p className="text-sm text-muted-foreground">No active recurring payments.</p>
            )}
            {active.map(renderRow)}
          </CardContent>
        </Card>

        {ended.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stopped</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ended.map(renderRow)}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add recurring payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label>Day of month</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={form.dayOfMonth}
                  onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cadence</Label>
                <Select
                  value={form.cadence}
                  onValueChange={(v) => setForm({ ...form, cadence: v as RecurringPayment['cadence'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => setForm({ ...form, categoryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Auto-post transactions</Label>
                <p className="text-xs text-muted-foreground">Automatically create the bill on its due date.</p>
              </div>
              <Switch
                checked={form.autoPost}
                onCheckedChange={(checked) => setForm({ ...form, autoPost: checked })}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" className="bg-transparent" onClick={() => setOpenForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.amount}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

export default function RecurringPage() {
  return (
    <DataProvider>
      <RecurringContent />
    </DataProvider>
  )
}
