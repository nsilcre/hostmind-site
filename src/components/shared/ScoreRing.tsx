'use client'

import { motion } from 'framer-motion'

export function ScoreRing({ score, label, size = 120 }: { score: number | null; label: string | null; size?: number }) {
  const s = score ?? 0
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (s / 100) * circumference
  const color = label === 'TOP' ? '#10b981' : label === 'NORMAL' ? '#3b82f6' : '#ef4444'
  const textColor = label === 'TOP' ? 'text-emerald-400' : label === 'NORMAL' ? 'text-blue-400' : 'text-red-400'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={45} fill="none" stroke="currentColor" strokeWidth="6" className="text-zinc-700" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={45}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${textColor}`}>{s}</span>
        <span className="text-xs text-zinc-400 mt-0.5">/100</span>
      </div>
    </div>
  )
}
