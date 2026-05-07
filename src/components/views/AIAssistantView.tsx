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
import { API, fadeIn, staggerContainer, slideUp, scoreBg, channelIcon, statusIcon, notifIcon, activityIcon, propertyTypeIcon, propertyTypeLabel, propertyStatusLabel, timeAgo, formatMarkdown, MONTHS_ES, MONTHS_SHORT, DAYS_ES } from '@/components/shared/helpers'

interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function AIAssistantView() {
  const { token, navigate } = useAppStore()
  const { addToast } = useToasts()
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!initialized) {
      setMessages([{
        role: 'assistant',
        content: '¡Hola! 👋 Soy tu **Asistente IA** de HostMind.\n\nPuedo ayudarte con:\n• Gestión de reservas y propiedades\n• Consultas sobre precios y disponibilidad\n• Políticas de cancelación\n• Optimización de tu negocio de alquileres\n\n¿En qué puedo ayudarte hoy?'
      }])
      setInitialized(true)
    }
  }, [initialized])

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || !token || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await API('/api/ai-chat', token, {
        method: 'POST',
        body: JSON.stringify({ message: msg, history: messages.slice(-6) }),
      })
      const data = await res.json()
      if (res.ok && data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        addToast('Error al obtener respuesta', 'error')
      }
    } catch {
      addToast('Error de conexión', 'error')
    } finally {
      setLoading(false)
    }
  }

  const quickReplies = [
    '¿Cuáles son los precios?',
    'Políticas de cancelación',
    'Cómo gestionar reservas',
    'Optimizar ingresos',
  ]

  return (
    <motion.div {...fadeIn} className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-white/10 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('dashboard')} className="rounded-xl hover:bg-white/10 shrink-0">
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Sparkles className="size-4 text-amber-400" />
            </div>
            Asistente IA
          </h2>
          <p className="text-xs text-muted-foreground">Tu ayudante inteligente de HostMind</p>
        </div>
        <Button
          variant="ghost" size="sm"
          onClick={() => { setMessages([]); setInitialized(false) }}
          className="text-zinc-400 hover:text-zinc-200 text-xs"
        >
          <RefreshCw className="size-3.5 mr-1" /> Limpiar
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-thin">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'assistant'
                ? 'bg-white/10 text-foreground rounded-tl-sm'
                : 'bg-amber-500/20 text-zinc-100 rounded-tr-sm border border-amber-500/20'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/25 text-amber-400 uppercase tracking-wider">
                    IA
                  </span>
                </div>
              )}
              <p className="whitespace-pre-wrap">{formatMarkdown(msg.content)}</p>
            </div>
          </motion.div>
        ))}

        {/* Quick replies (show only when last message is from assistant and not loading) */}
        {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !loading && messages.length <= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-2 px-1"
          >
            {quickReplies.map((reply) => (
              <motion.button
                key={reply}
                whileTap={{ scale: 0.95 }}
                onClick={() => sendMessage(reply)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-zinc-300 border border-white/10 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30 transition-all"
              >
                {reply}
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/25 text-amber-400 uppercase tracking-wider">
                  IA
                </span>
              </div>
              <div className="flex gap-1.5">
                <motion.div className="w-2 h-2 bg-amber-400/60 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} />
                <motion.div className="w-2 h-2 bg-amber-400/60 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} />
                <motion.div className="w-2 h-2 bg-amber-400/60 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/10 shrink-0">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Escribe tu pregunta..."
          disabled={loading}
          className="flex-1 h-11 rounded-xl bg-zinc-800/50 border-white/10 text-sm"
        />
        <Button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          size="icon"
          className="h-11 w-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shrink-0 active:scale-95 transition-transform"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </motion.div>
  )
}
