'use client'

import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Wallet, 
  FolderPlus, 
  Calendar, 
  Building2, 
  Receipt, 
  TrendingUp,
  Check,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  completed: boolean
  optional?: boolean
  comingSoon?: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const [demoMode, setDemoMode] = useState(false)
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'categories',
      title: 'Add categories & budgets',
      description: 'Organize your spending with custom categories',
      icon: FolderPlus,
      completed: false,
    },
    {
      id: 'recurring',
      title: 'Add recurring bills',
      description: 'Track rent, subscriptions, and regular payments',
      icon: Calendar,
      completed: false,
    },
    {
      id: 'bank',
      title: 'Connect your bank',
      description: 'Import transactions automatically',
      icon: Building2,
      completed: false,
      comingSoon: true,
    },
    {
      id: 'receipts',
      title: 'Enable receipt scanning',
      description: 'Snap photos to track purchases',
      icon: Receipt,
      completed: false,
      optional: true,
    },
    {
      id: 'investments',
      title: 'Add investment accounts',
      description: 'Track your portfolio in one place',
      icon: TrendingUp,
      completed: false,
      optional: true,
    },
  ])

  const completedCount = steps.filter(s => s.completed).length
  const progress = (completedCount / steps.length) * 100

  const toggleStep = (id: string) => {
    setSteps(prev => 
      prev.map(step => 
        step.id === id ? { ...step, completed: !step.completed } : step
      )
    )
  }

  const handleContinue = () => {
    if (demoMode) {
      router.push('/?demo=true')
    } else {
      router.push('/')
    }
  }

  const handleSkip = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-8 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Wallet className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold">Ledger</span>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Setup progress</span>
          <span className="text-sm font-medium">{completedCount}/{steps.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Set up your account</h1>
        <p className="text-muted-foreground mt-1">Complete these steps to get the most out of Ledger</p>
      </div>

      {/* Demo Mode Toggle */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="demo-mode" className="text-sm font-medium cursor-pointer">
                  Demo Mode
                </Label>
                <p className="text-xs text-muted-foreground">Load sample data to explore</p>
              </div>
            </div>
            <Switch
              id="demo-mode"
              checked={demoMode}
              onCheckedChange={setDemoMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="flex-1 space-y-3">
        {steps.map((step) => (
          <Card
            key={step.id}
            className={cn(
              "cursor-pointer transition-all",
              step.completed && "border-positive/50 bg-positive/5",
              step.comingSoon && "opacity-60 cursor-not-allowed"
            )}
            onClick={() => !step.comingSoon && toggleStep(step.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                  step.completed 
                    ? "bg-positive text-positive-foreground" 
                    : "bg-secondary"
                )}>
                  {step.completed ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{step.title}</h3>
                    {step.optional && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        Optional
                      </span>
                    )}
                    {step.comingSoon && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                  step.completed 
                    ? "border-positive bg-positive" 
                    : "border-muted-foreground/30"
                )}>
                  {step.completed && <Check className="h-3 w-3 text-positive-foreground" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="pt-6 space-y-3">
        <Button size="lg" className="w-full" onClick={handleContinue}>
          {demoMode ? 'Start with demo data' : 'Continue'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button variant="ghost" size="lg" className="w-full" onClick={handleSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}
