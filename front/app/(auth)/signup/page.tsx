'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet, Eye, EyeOff, ArrowLeft, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const passwordRequirements = [
  { label: 'At least 8 characters', check: (p: string) => p.length >= 8 },
  { label: 'Contains a number', check: (p: string) => /\d/.test(p) },
  { label: 'Contains a letter', check: (p: string) => /[a-zA-Z]/.test(p) },
]

export default function SignUpPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulate account creation
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Go to onboarding
    router.push('/onboarding')
  }

  const allRequirementsMet = passwordRequirements.every(req => req.check(formData.password))

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="py-4">
        <Link href="/welcome">
          <Button variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Wallet className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold">Ledger</span>
      </div>

      {/* Form */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="px-0">
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Get started with Ledger in seconds</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">
                    {showPassword ? 'Hide password' : 'Show password'}
                  </span>
                </Button>
              </div>
              
              {/* Password requirements */}
              {formData.password && (
                <div className="space-y-1.5 pt-2">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div className={cn(
                        "h-4 w-4 rounded-full flex items-center justify-center transition-colors",
                        req.check(formData.password)
                          ? "bg-positive text-positive-foreground"
                          : "bg-muted"
                      )}>
                        {req.check(formData.password) && <Check className="h-2.5 w-2.5" />}
                      </div>
                      <span className={cn(
                        "transition-colors",
                        req.check(formData.password) ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={isLoading || !allRequirementsMet}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By creating an account, you agree to our{' '}
              <Link href="#" className="underline">Terms of Service</Link> and{' '}
              <Link href="#" className="underline">Privacy Policy</Link>
            </p>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/signin" className="font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
