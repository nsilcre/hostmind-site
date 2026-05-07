'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, RefreshCw, Send, Plus, Trash2, Star, Bot,
  User, Globe, Facebook, Phone, Building2, X,
  CheckCircle, XCircle, Loader2, Eye, HandMetal, Sparkles,
  Users, UsersRound, Clock, MessageCircle,
  Wifi, Building, Bell, Search, MapPin, Bed, Bath, Euro,
  ArrowUpRight, Activity as ActivityIcon, AlertTriangle, Zap,
  Moon, Sun, Package, CreditCard, Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger
} from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { useToasts, ToastProvider, ToastContainer, ShimmerCard } from '@/components/shared/ToastProvider'
import { ScoreRing } from '@/components/shared/ScoreRing'
import { API, fadeIn, staggerContainer, slideUp, scoreBg, channelIcon, statusIcon, notifIcon, activityIcon, propertyTypeIcon, propertyTypeLabel, propertyStatusLabel, timeAgo, MONTHS_ES, MONTHS_SHORT, DAYS_ES } from '@/components/shared/helpers'

export default function DemoIAView() {
  const { token, navigate } = useAppStore()
  const { addToast } = useToasts()
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [scoring, setScoring] = useState<{ score: number; label: string; reasons: string[] } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !token || loading) return
    const msg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await API('/api/clients', token, { method: 'POST', body: JSON.stringify({ channel: 'web', message: msg, clientId }) })
      const data = await res.json()
      if (res.ok) {
        if (!clientId) setClientId(data.clientId)
        if (data.reply) setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
        if (data.isComplete && data.scoring) setScoring(data.scoring)
      } else { addToast('Error', 'error') }
    } catch { addToast('Error de conexión', 'error') } finally { setLoading(false) }
  }

  return (
    <motion.div {...fadeIn} className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 pb-3 border-b border-white/10 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('dashboard')} className="rounded-xl hover:bg-white/10 shrink-0">
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-amber-400" /> Demo IA
          </h2>
          <p className="text-xs text-muted-foreground">Simula una conversación con el asistente IA</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setMessages([]); setClientId(null); setScoring(null) }} className="text-zinc-400 hover:text-zinc-200 text-xs">
          <RefreshCw className="size-3.5" /> Reset
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-thin">
        {messages.length === 0 && !scoring && (
          <div className="text-center py-12">
            <Bot className="size-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">Demo de Clasificación IA</p>
            <p className="text-sm text-zinc-500 mt-1">Escribe un mensaje para iniciar la simulación.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'assistant' ? 'bg-white/10 text-foreground rounded-tl-sm' : 'bg-zinc-800 text-zinc-200 rounded-tr-sm'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </motion.div>
        ))}

        {scoring && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mt-4">
            <h3 className="font-semibold text-amber-300 text-sm flex items-center gap-2 mb-3">
              <Star className="size-4" /> Resultado de Clasificación
            </h3>
            <div className="flex items-center gap-4">
              <ScoreRing score={scoring.score} label={scoring.label} size={90} />
              <div className="flex-1">
                <Badge className={`text-base font-bold px-3 py-1.5 rounded-full border mb-2 ${scoreBg(scoring.label)}`}>
                  {scoring.label === 'TOP' ? '⭐' : scoring.label === 'NORMAL' ? '👍' : '⚠️'} {scoring.label}
                </Badge>
                <div className="space-y-1">
                  {scoring.reasons.map((r, j) => (<p key={j} className="text-xs text-zinc-300">{r}</p>))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <motion.div className="w-2 h-2 bg-zinc-400 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} />
                <motion.div className="w-2 h-2 bg-zinc-400 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} />
                <motion.div className="w-2 h-2 bg-zinc-400 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-white/10 shrink-0">
        <Input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Escribe tu mensaje..." disabled={loading || !!scoring}
          className="flex-1 h-11 rounded-xl bg-zinc-800/50 border-white/10" />
        <Button onClick={sendMessage} disabled={!input.trim() || loading || !!scoring} size="icon"
          className="h-11 w-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shrink-0 active:scale-95 transition-transform">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </motion.div>
  )
}
