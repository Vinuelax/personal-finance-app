'use client'

import { ReactNode, useEffect, useState } from 'react'

interface ClientOnlyProps {
  children: ReactNode
}

// Simple gate to skip rendering on the server and until the app has mounted.
export function ClientOnly({ children }: ClientOnlyProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  return <>{children}</>
}
