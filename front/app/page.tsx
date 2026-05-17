'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const hasToken = typeof window !== 'undefined' && !!window.localStorage.getItem('ledger_token')
    router.replace(hasToken ? '/dashboard' : '/welcome')
  }, [router])

  return null
}
