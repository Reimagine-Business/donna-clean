'use client'

import { useState, useEffect } from 'react'

interface GreetingSectionProps {
  businessName: string | null
}

export function GreetingSection({ businessName }: GreetingSectionProps) {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) {
      setGreeting('Good morning')
    } else if (hour < 18) {
      setGreeting('Good afternoon')
    } else {
      setGreeting('Good evening')
    }
  }, [])

  return (
    <div className="mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-white">
        {greeting}
      </h1>
      {businessName && (
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {businessName}
        </p>
      )}
    </div>
  )
}
