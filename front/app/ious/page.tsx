'use client'

import React from "react"

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { 
  Users,
  Plus,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  DollarSign,
  Trash2,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IOU } from '@/lib/types'

const useCurrencyFormatter = () => {
  const { formatCurrency } = useData()
  return formatCurrency
}

// IOU Detail Sheet
interface IOUDetailProps {
  iou: IOU | null
  onClose: () => void
  onSettle: (id: string) => void
}

function IOUDetail({ iou, onClose, onSettle }: IOUDetailProps) {
  const formatCurrency = useCurrencyFormatter()
  if (!iou) return null

  const isOwedToMe = iou.netBalance > 0

  return (
    <Sheet open={!!iou} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            {iou.friendName}
          </SheetTitle>
          <SheetDescription>
            {iou.status === 'settled' 
              ? `Settled on ${new Date(iou.settledAt!).toLocaleDateString()}`
              : 'Active balance'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto pb-32">
          {/* Balance */}
          <div className="text-center py-4">
            <p className={cn(
              "text-4xl font-bold",
              isOwedToMe ? "text-positive" : "text-negative"
            )}>
              {isOwedToMe ? '+' : '-'}{formatCurrency(Math.abs(iou.netBalance))}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isOwedToMe ? 'They owe you' : 'You owe them'}
            </p>
          </div>

          {/* Status */}
          {iou.status === 'settled' && (
            <Card className="bg-positive/10 border-positive/30">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-positive" />
                <div>
                  <p className="font-medium text-sm">Settled</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(iou.settledAt!).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items */}
          <div>
            <h3 className="font-medium mb-3">Items</h3>
            <div className="space-y-2">
              {iou.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center",
                      item.amount > 0 ? "bg-positive/20" : "bg-negative/20"
                    )}>
                      {item.amount > 0 ? (
                        <ArrowDownLeft className="h-4 w-4 text-positive" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-negative" />
                      )}
                    </div>
                    <p className="text-sm font-medium">{item.description}</p>
                  </div>
                  <p className={cn(
                    "font-medium",
                    item.amount > 0 ? "text-positive" : "text-negative"
                  )}>
                    {item.amount > 0 ? '+' : '-'}{formatCurrency(Math.abs(item.amount))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div>
            <h3 className="font-medium mb-3">Activity</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm">Created</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(iou.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
              {iou.status === 'settled' && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-positive/10">
                  <div className="h-2 w-2 rounded-full bg-positive" />
                  <div className="flex-1">
                    <p className="text-sm text-positive">Settled</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(iou.settledAt!).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-bottom space-y-2">
          {iou.status === 'open' && (
            <>
              <Button className="w-full" onClick={() => {
                onSettle(iou.id)
                onClose()
              }}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Settled
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Add IOU Sheet
interface AddIOUSheetProps {
  open: boolean
  onClose: () => void
  onAdd: (iou: Omit<IOU, 'id' | 'createdAt' | 'settledAt'>) => void
}

function AddIOUSheet({ open, onClose, onAdd }: AddIOUSheetProps) {
  const [friendName, setFriendName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [direction, setDirection] = useState<'owed' | 'owes'>('owed')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amountNum = parseFloat(amount)
    if (!friendName || !description || isNaN(amountNum)) return

    onAdd({
      friendName,
      items: [{
        description,
        amount: direction === 'owed' ? amountNum : -amountNum
      }],
      netBalance: direction === 'owed' ? amountNum : -amountNum,
      status: 'open'
    })

    // Reset form
    setFriendName('')
    setDescription('')
    setAmount('')
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Add IOU</SheetTitle>
          <SheetDescription>
            Track money owed between friends
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="friend">Friend's Name</Label>
            <Input
              id="friend"
              placeholder="Enter name"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Direction</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={direction === 'owed' ? 'default' : 'outline'}
                onClick={() => setDirection('owed')}
                className="h-12"
              >
                <ArrowDownLeft className="h-4 w-4 mr-2" />
                They owe me
              </Button>
              <Button
                type="button"
                variant={direction === 'owes' ? 'default' : 'outline'}
                onClick={() => setDirection('owes')}
                className="h-12"
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                I owe them
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">What for?</Label>
            <Input
              id="description"
              placeholder="e.g., Dinner split"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-9"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full">
              Add IOU
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function IOUsContent() {
  const formatCurrency = useCurrencyFormatter()
  const { ious, addIOU, settleIOU } = useData()
  const [selectedIOU, setSelectedIOU] = useState<IOU | null>(null)
  const [showAddIOU, setShowAddIOU] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  const openIOUs = ious.filter(i => i.status === 'open')
  const theyOweMe = openIOUs.filter(i => i.netBalance > 0)
  const iOweThem = openIOUs.filter(i => i.netBalance < 0)
  const settled = ious.filter(i => i.status === 'settled')

  const totalOwedToMe = theyOweMe.reduce((sum, i) => sum + i.netBalance, 0)
  const totalIOweThem = iOweThem.reduce((sum, i) => sum + Math.abs(i.netBalance), 0)

  const filteredIOUs = activeTab === 'owed' 
    ? theyOweMe 
    : activeTab === 'owes' 
      ? iOweThem 
      : openIOUs

  return (
    <AppShell title="IOUs">
      <div className="px-4 lg:px-6 py-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-positive/10 border-positive/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownLeft className="h-4 w-4 text-positive" />
                <span className="text-xs text-muted-foreground">Owed to you</span>
              </div>
              <p className="text-2xl font-bold text-positive">{formatCurrency(totalOwedToMe)}</p>
              <p className="text-xs text-muted-foreground">{theyOweMe.length} people</p>
            </CardContent>
          </Card>
          <Card className="bg-negative/10 border-negative/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="h-4 w-4 text-negative" />
                <span className="text-xs text-muted-foreground">You owe</span>
              </div>
              <p className="text-2xl font-bold text-negative">{formatCurrency(totalIOweThem)}</p>
              <p className="text-xs text-muted-foreground">{iOweThem.length} people</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              All ({openIOUs.length})
            </TabsTrigger>
            <TabsTrigger value="owed" className="flex-1">
              Owed ({theyOweMe.length})
            </TabsTrigger>
            <TabsTrigger value="owes" className="flex-1">
              I Owe ({iOweThem.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 space-y-2">
            {filteredIOUs.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No IOUs</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Track shared expenses with friends
                </p>
                <Button onClick={() => setShowAddIOU(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add IOU
                </Button>
              </div>
            ) : (
              filteredIOUs.map(iou => (
                <Card 
                  key={iou.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedIOU(iou)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{iou.friendName}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {iou.items.map(i => i.description).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-medium",
                        iou.netBalance > 0 ? "text-positive" : "text-negative"
                      )}>
                        {iou.netBalance > 0 ? '+' : '-'}{formatCurrency(Math.abs(iou.netBalance))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(iou.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Settled Section */}
        {settled.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-positive" />
              Settled ({settled.length})
            </h2>
            <div className="space-y-2">
              {settled.slice(0, 3).map(iou => (
                <Card 
                  key={iou.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors opacity-70"
                  onClick={() => setSelectedIOU(iou)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{iou.friendName}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        Settled
                      </Badge>
                    </div>
                    <p className="font-medium text-muted-foreground">
                      {formatCurrency(Math.abs(iou.netBalance))}
                    </p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* FAB for adding */}
        {filteredIOUs.length > 0 && (
          <div className="fixed bottom-24 right-4 lg:bottom-6 safe-area-bottom">
            <Button 
              size="lg" 
              className="h-14 w-14 rounded-full shadow-lg"
              onClick={() => setShowAddIOU(true)}
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        )}
      </div>

      <IOUDetail
        iou={selectedIOU}
        onClose={() => setSelectedIOU(null)}
        onSettle={settleIOU}
      />

      <AddIOUSheet
        open={showAddIOU}
        onClose={() => setShowAddIOU(false)}
        onAdd={addIOU}
      />
    </AppShell>
  )
}

export default function IOUsPage() {
  return <IOUsContent />
}
