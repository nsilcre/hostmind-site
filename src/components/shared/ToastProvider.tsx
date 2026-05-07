'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

const ToastContext = React.createContext<{ toasts: Toast[]; addToast: (msg: string, type?: Toast['type']) => void }>({
  toasts: [],
  addToast: () => {},
})

export function useToasts() {
  return React.useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])
  return (
    <ToastContext.Provider value={{ toasts, addToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function ToastContainer() {
  const { toasts } = useToasts()
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`pointer-events-auto px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg backdrop-blur-sm border ${
              t.type === 'success'
                ? 'bg-emerald-500/90 text-white border-emerald-400/30'
                : t.type === 'error'
                ? 'bg-red-500/90 text-white border-red-400/30'
                : 'bg-zinc-800/90 text-white border-zinc-600/30'
            }`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function ShimmerCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-card/50 p-4 ${className}`}>
      <Skeleton className="h-5 w-32 mb-3 bg-zinc-800" />
      <Skeleton className="h-3 w-24 mb-2 bg-zinc-800" />
      <Skeleton className="h-3 w-full bg-zinc-800" />
    </div>
  )
}
