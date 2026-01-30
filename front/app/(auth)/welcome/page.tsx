'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Wallet, TrendingUp, Receipt, CalendarCheck, PieChart, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: Receipt,
    title: 'Smart Categorization',
    description: 'Automatically categorize transactions and track spending patterns',
  },
  {
    icon: PieChart,
    title: 'Budget Management',
    description: 'Set monthly budgets and get alerts when you\'re close to limits',
  },
  {
    icon: CalendarCheck,
    title: 'Bill Tracking',
    description: 'Never miss a bill with recurring payment reminders',
  },
  {
    icon: TrendingUp,
    title: 'Investment Tracking',
    description: 'Monitor your portfolio performance in one place',
  },
]

export default function WelcomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 safe-area-top">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Wallet className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-3xl font-bold">Ledger</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-center text-balance max-w-md">
          Take control of your personal finances
        </h1>
        <p className="text-muted-foreground text-center mt-3 max-w-sm text-balance">
          Track spending, manage budgets, and reach your financial goals with ease.
        </p>

        {/* Feature Carousel */}
        <div className="w-full max-w-sm mt-10">
          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="flex-shrink-0 w-full border-0 shadow-none bg-secondary/50"
                >
                  <CardContent className="p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Carousel Indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  currentSlide === index ? "bg-primary" : "bg-muted-foreground/30"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="p-6 space-y-3 safe-area-bottom">
        <Link href="/signup" className="block">
          <Button size="lg" className="w-full">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href="/signin" className="block">
          <Button size="lg" variant="outline" className="w-full bg-transparent">
            Sign In
          </Button>
        </Link>
        <Link href="/?demo=true" className="block text-center">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Try demo mode
          </Button>
        </Link>
      </div>
    </div>
  )
}
