"use client"

import React from "react"

import { useState, useMemo } from "react"
import { AppShell } from "@/components/app-shell"
import { useData } from "@/lib/data-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TrendingUp,
  TrendingDown,
  Plus,
  MoreHorizontal,
  Briefcase,
  DollarSign,
  Percent,
  PieChart,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts"
import type { Investment } from "@/lib/types"

const INVESTMENT_TYPES = ["stock", "etf", "crypto", "bond", "mutual_fund", "other"] as const

// Computed colors for charts
const ALLOCATION_COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
]

export default function InvestmentsPage() {
  const { investments, addInvestment, updateInvestment, deleteInvestment, currency, formatCurrency, user } = useData()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [formData, setFormData] = useState({
    symbol: "",
    name: "",
    type: "stock" as Investment["type"],
    quantity: "",
    avgCost: "",
    currentPrice: "",
  })

  // Portfolio calculations
  const portfolioStats = useMemo(() => {
    const totalValue = investments.reduce((sum, inv) => sum + inv.currentPrice * inv.quantity, 0)
    const totalCost = investments.reduce((sum, inv) => sum + inv.avgCost * inv.quantity, 0)
    const totalGainLoss = totalValue - totalCost
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0

    return { totalValue, totalCost, totalGainLoss, totalGainLossPercent }
  }, [investments])

  // Allocation data for pie chart
  const allocationData = useMemo(() => {
    const byType: Record<string, number> = {}
    investments.forEach((inv) => {
      const value = inv.currentPrice * inv.quantity
      byType[inv.type] = (byType[inv.type] || 0) + value
    })
    return Object.entries(byType).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "),
      value,
    }))
  }, [investments])

  // Performance history (mock data)
  const performanceHistory = useMemo(() => {
    const data = []
    let value = portfolioStats.totalValue * 0.85
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      data.push({
        month: date.toLocaleDateString("en-US", { month: "short" }),
        value: Math.round(value),
      })
      value = value * (1 + (Math.random() * 0.06 - 0.02))
    }
    data[data.length - 1].value = Math.round(portfolioStats.totalValue)
    return data
  }, [portfolioStats.totalValue])

  const resetForm = () => {
    setFormData({
      symbol: "",
      name: "",
      type: "stock",
      quantity: "",
      avgCost: "",
      currentPrice: "",
    })
    setEditingInvestment(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const investment = {
      symbol: formData.symbol.toUpperCase(),
      name: formData.name,
      type: formData.type,
      quantity: parseFloat(formData.quantity),
      avgCost: parseFloat(formData.avgCost),
      currentPrice: parseFloat(formData.currentPrice),
    }

    if (editingInvestment) {
      updateInvestment(editingInvestment.id, investment)
    } else {
      addInvestment(investment)
    }

    resetForm()
    setIsAddOpen(false)
  }

  const handleEdit = (investment: Investment) => {
    setFormData({
      symbol: investment.symbol,
      name: investment.name,
      type: investment.type,
      quantity: investment.quantity.toString(),
      avgCost: investment.avgCost.toString(),
      currentPrice: investment.currentPrice.toString(),
    })
    setEditingInvestment(investment)
    setIsAddOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteInvestment(id)
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-4 pb-24 md:p-6 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Investments</h1>
            <p className="text-sm text-muted-foreground">Track your portfolio performance</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Investment</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingInvestment ? "Edit Investment" : "Add Investment"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input
                      id="symbol"
                      placeholder="AAPL"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value as Investment["type"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVESTMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Apple Inc."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="any"
                      placeholder="10"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="avgCost">Avg Cost</Label>
                    <Input
                      id="avgCost"
                      type="number"
                      step="0.01"
                      placeholder="150.00"
                      value={formData.avgCost}
                      onChange={(e) => setFormData({ ...formData, avgCost: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="currentPrice">Current</Label>
                    <Input
                      id="currentPrice"
                      type="number"
                      step="0.01"
                      placeholder="175.00"
                      value={formData.currentPrice}
                      onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="mt-2">
                  {editingInvestment ? "Update" : "Add"} Investment
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span className="text-xs">Portfolio Value</span>
              </div>
              <p className="text-xl font-semibold">{formatCurrency(portfolioStats.totalValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Total Cost</span>
              </div>
              <p className="text-xl font-semibold">{formatCurrency(portfolioStats.totalCost)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                {portfolioStats.totalGainLoss >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-positive" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-negative" />
                )}
                <span className="text-xs">Total Gain/Loss</span>
              </div>
              <p className={`text-xl font-semibold ${portfolioStats.totalGainLoss >= 0 ? "text-positive" : "text-negative"}`}>
                {portfolioStats.totalGainLoss >= 0 ? "+" : ""}{formatCurrency(portfolioStats.totalGainLoss)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Percent className="h-4 w-4" />
                <span className="text-xs">Return %</span>
              </div>
              <p className={`text-xl font-semibold ${portfolioStats.totalGainLossPercent >= 0 ? "text-positive" : "text-negative"}`}>
                {portfolioStats.totalGainLossPercent >= 0 ? "+" : ""}{portfolioStats.totalGainLossPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Performance Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Portfolio Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceHistory}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${currency}${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Value"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Allocation Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <PieChart className="h-4 w-4" />
                Asset Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allocationData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="h-48 w-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={allocationData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {allocationData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), "Value"]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2">
                    {allocationData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length] }}
                        />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-muted-foreground">
                  No investments to display
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Holdings List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            {investments.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-medium">No investments yet</h3>
                  <p className="text-sm text-muted-foreground">Add your first investment to start tracking</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Investment
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {investments.map((investment) => {
                  const value = investment.currentPrice * investment.quantity
                  const cost = investment.avgCost * investment.quantity
                  const gainLoss = value - cost
                  const gainLossPercent = cost > 0 ? (gainLoss / cost) * 100 : 0
                  const isPositive = gainLoss >= 0

                  return (
                    <div
                      key={investment.id}
                      className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-semibold text-sm">
                          {investment.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium">{investment.symbol}</p>
                          <p className="text-sm text-muted-foreground">
                            {investment.quantity} shares @ {formatCurrency(investment.avgCost)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(value)}</p>
                          <p className={`text-sm ${isPositive ? "text-positive" : "text-negative"}`}>
                            {isPositive ? "+" : ""}{formatCurrency(gainLoss)} ({gainLossPercent.toFixed(1)}%)
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(investment)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(investment.id)}
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
