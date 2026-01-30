'use client'

import { useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

interface SparklineChartProps {
  data: { date: string; amount: number }[]
  color?: 'default' | 'positive' | 'negative'
}

export function SparklineChart({ data, color = 'default' }: SparklineChartProps) {
  const chartColor = useMemo(() => {
    switch (color) {
      case 'positive':
        return { stroke: '#22c55e', fill: '#22c55e' }
      case 'negative':
        return { stroke: '#ef4444', fill: '#ef4444' }
      default:
        return { stroke: '#3b82f6', fill: '#3b82f6' }
    }
  }, [color])

  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
        No data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColor.fill} stopOpacity={0.3} />
            <stop offset="100%" stopColor={chartColor.fill} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="amount"
          stroke={chartColor.stroke}
          strokeWidth={1.5}
          fill={`url(#gradient-${color})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
