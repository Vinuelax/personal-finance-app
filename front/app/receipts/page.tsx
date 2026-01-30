'use client'

import React from "react"

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { DataProvider, useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { 
  Camera, 
  Upload, 
  ImageIcon as Image, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Plus,
  Trash2,
  Tag,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Receipt, ReceiptLineItem } from '@/lib/types'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

// Demo receipts
const demoReceipts: Receipt[] = [
  {
    id: 'rec-1',
    imageUrl: '/placeholder-receipt.jpg',
    merchant: 'Whole Foods Market',
    date: '2026-01-28',
    total: 89.43,
    lineItems: [
      { id: 'li-1', description: 'Organic Bananas', amount: 3.49, categoryId: 'cat-1' },
      { id: 'li-2', description: 'Almond Milk', amount: 5.99, categoryId: 'cat-1' },
      { id: 'li-3', description: 'Fresh Salmon', amount: 24.99, categoryId: 'cat-1' },
      { id: 'li-4', description: 'Mixed Greens', amount: 6.99, categoryId: null },
      { id: 'li-5', description: 'Other items', amount: 47.97, categoryId: null },
    ],
    status: 'needs_review',
    transactionId: null,
  },
  {
    id: 'rec-2',
    imageUrl: '/placeholder-receipt.jpg',
    merchant: 'Target',
    date: '2026-01-25',
    total: 156.78,
    lineItems: [
      { id: 'li-6', description: 'Household supplies', amount: 45.00, categoryId: 'cat-6' },
      { id: 'li-7', description: 'Clothing', amount: 89.78, categoryId: 'cat-6' },
      { id: 'li-8', description: 'Snacks', amount: 22.00, categoryId: 'cat-1' },
    ],
    status: 'complete',
    transactionId: 'txn-7',
  },
]

// Upload Sheet
interface UploadSheetProps {
  open: boolean
  onClose: () => void
  onUpload: (file: File) => void
}

function UploadSheet({ open, onClose, onUpload }: UploadSheetProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      onUpload(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Add Receipt</SheetTitle>
          <SheetDescription>
            Upload a photo or take a picture of your receipt
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-border"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Drop image here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Camera Button */}
          <Button variant="outline" className="w-full h-14 bg-transparent" asChild>
            <label>
              <Camera className="h-5 w-5 mr-2" />
              Take Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </Button>

          {/* Tips */}
          <Card className="bg-secondary/50 border-0">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-2">Tips for best results:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Place receipt on a flat, contrasting surface</li>
                <li>Ensure good lighting without glare</li>
                <li>Capture the entire receipt in the frame</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Receipt Detail Sheet
interface ReceiptDetailProps {
  receipt: Receipt | null
  onClose: () => void
}

function ReceiptDetail({ receipt, onClose }: ReceiptDetailProps) {
  const { categories } = useData()
  const [editingLine, setEditingLine] = useState<string | null>(null)

  if (!receipt) return null

  const allocatedTotal = receipt.lineItems
    .filter(li => li.categoryId)
    .reduce((sum, li) => sum + li.amount, 0)
  const unallocated = receipt.total - allocatedTotal
  const allocationProgress = (allocatedTotal / receipt.total) * 100

  return (
    <Sheet open={!!receipt} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>{receipt.merchant}</SheetTitle>
          <SheetDescription>
            {new Date(receipt.date).toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto pb-32">
          {/* Total and Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{formatCurrency(receipt.total)}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <Badge className={cn(
              receipt.status === 'complete' && "bg-positive/20 text-positive border-positive/30",
              receipt.status === 'needs_review' && "bg-warning/20 text-warning border-warning/30",
              receipt.status === 'parsing' && "bg-primary/20 text-primary border-primary/30",
            )}>
              {receipt.status === 'complete' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {receipt.status === 'needs_review' && <AlertCircle className="h-3 w-3 mr-1" />}
              {receipt.status === 'parsing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {receipt.status.replace('_', ' ')}
            </Badge>
          </div>

          {/* Allocation Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Allocation</span>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(allocatedTotal)} / {formatCurrency(receipt.total)}
                </span>
              </div>
              <Progress value={allocationProgress} className="h-2" />
              {unallocated > 0 && (
                <p className="text-xs text-warning mt-2">
                  {formatCurrency(unallocated)} remaining to allocate
                </p>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Line Items</h3>
              <Button variant="ghost" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            
            <div className="space-y-2">
              {receipt.lineItems.map(item => {
                const category = categories.find(c => c.id === item.categoryId)
                const isUnallocated = !item.categoryId

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      isUnallocated && "border-warning/30 bg-warning/5"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                      isUnallocated ? "bg-warning/20" : "bg-secondary"
                    )}>
                      {isUnallocated ? (
                        <Tag className="h-4 w-4 text-warning" />
                      ) : (
                        <span className="text-sm">
                          {category?.icon === 'shopping-cart' && '🛒'}
                          {category?.icon === 'shopping-bag' && '🛍️'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.description}</p>
                      {category && (
                        <p className="text-xs text-muted-foreground">{category.name}</p>
                      )}
                    </div>
                    
                    <p className="font-medium text-sm">{formatCurrency(item.amount)}</p>
                    
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Fixed Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-bottom space-y-2">
          {receipt.status === 'needs_review' && (
            <Button className="w-full" disabled={unallocated > 0.01}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Receipt
            </Button>
          )}
          {receipt.status === 'complete' && (
            <Button variant="outline" className="w-full bg-transparent">
              View Linked Transaction
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ReceiptsContent() {
  const [receipts] = useState(demoReceipts)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  const handleUpload = async (file: File) => {
    setShowUpload(false)
    setUploadingReceipt(true)
    
    // Simulate upload and parsing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setUploadingReceipt(false)
    // Would normally add to receipts list
  }

  const needsReview = receipts.filter(r => r.status === 'needs_review')
  const completed = receipts.filter(r => r.status === 'complete')

  return (
    <AppShell title="Receipts">
      <div className="px-4 lg:px-6 py-4 space-y-6">
        {/* Upload Card */}
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setShowUpload(true)}
        >
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Camera className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Scan a Receipt</h3>
            <p className="text-sm text-muted-foreground">
              Upload or take a photo to track line items
            </p>
          </CardContent>
        </Card>

        {/* Uploading Status */}
        {uploadingReceipt && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-4">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <div className="flex-1">
                <p className="font-medium text-sm">Processing receipt...</p>
                <p className="text-xs text-muted-foreground">This may take a moment</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Needs Review */}
        {needsReview.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              Needs Review ({needsReview.length})
            </h2>
            <div className="space-y-2">
              {needsReview.map(receipt => (
                <Card 
                  key={receipt.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedReceipt(receipt)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{receipt.merchant}</p>
                      <p className="text-sm text-muted-foreground">
                        {receipt.lineItems.length} items · {receipt.lineItems.filter(li => !li.categoryId).length} unallocated
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(receipt.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(receipt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-positive" />
              Completed ({completed.length})
            </h2>
            <div className="space-y-2">
              {completed.map(receipt => (
                <Card 
                  key={receipt.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedReceipt(receipt)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{receipt.merchant}</p>
                      <p className="text-sm text-muted-foreground">
                        {receipt.lineItems.length} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(receipt.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(receipt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {receipts.length === 0 && !uploadingReceipt && (
          <div className="text-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Image className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No receipts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Scan your first receipt to track expenses
            </p>
            <Button onClick={() => setShowUpload(true)}>
              <Camera className="h-4 w-4 mr-2" />
              Add Receipt
            </Button>
          </div>
        )}
      </div>

      <UploadSheet 
        open={showUpload} 
        onClose={() => setShowUpload(false)}
        onUpload={handleUpload}
      />
      
      <ReceiptDetail
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </AppShell>
  )
}

export default function ReceiptsPage() {
  return (
    <DataProvider>
      <ReceiptsContent />
    </DataProvider>
  )
}
