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

export default function ProfileView() {
  const { clients, viewParams, navigate, token } = useAppStore()
  const { addToast } = useToasts()
  const client = clients.find((c) => c.id === viewParams.clientId)

  const handleAction = async (action: string) => {
    if (!client || !token) return
    try {
      const res = await API(`/api/action/${client.id}`, token, {
        method: 'POST',
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.client) {
          const updated = clients.map((c) => (c.id === client.id ? { ...c, ...data.client } : c))
          useAppStore.getState().setClients(updated)
        }
        const labels: Record<string, string> = {
          accept: 'Cliente aceptado',
          reject: 'Cliente rechazado',
          negotiate: 'En negociación',
          manual: 'Modo manual activado',
          auto: 'Modo IA activado',
        }
        addToast(labels[action] || 'Acción realizada', 'success')
      }
    } catch {
      addToast('Error al realizar acción', 'error')
    }
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <User className="size-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">Cliente no encontrado</p>
      </div>
    )
  }

  let profile: Record<string, string> = {}
  try { profile = client.profile ? JSON.parse(client.profile) : {} } catch { /* empty */ }

  let reasons: string[] = []
  try { reasons = client.scoreReasons ? JSON.parse(client.scoreReasons) : [] } catch { /* empty */ }

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('dashboard')} className="rounded-xl hover:bg-white/10">
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground truncate">{client.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {channelIcon(client.channel)}
            <span>{client.channel}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center py-4">
        <ScoreRing score={client.score} label={client.scoreLabel} size={140} />
        <div className="mt-3 flex items-center gap-2">
          <Badge className={`text-sm font-bold px-3 py-1 rounded-full border ${scoreBg(client.scoreLabel)}`}>
            {client.scoreLabel === 'TOP' ? '⭐ TOP' : client.scoreLabel === 'NORMAL' ? '👍 NORMAL' : '⚠️ RIESGO'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: '📅', label: 'Fechas', value: profile.dates || '—' },
          { icon: '👥', label: 'Huéspedes', value: profile.guests ? `${profile.guests} personas` : '—' },
          { icon: '💰', label: 'Presupuesto', value: profile.budget ? `${profile.budget}€/noche` : '—' },
          { icon: '🎯', label: 'Motivo', value: profile.purpose || '—' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-white/10 bg-card/60 p-3">
            <p className="text-xs text-muted-foreground mb-1">{item.icon} {item.label}</p>
            <p className="text-sm font-medium text-foreground capitalize">{item.value}</p>
          </div>
        ))}
      </div>

      {reasons.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-amber-400" />
            <h3 className="font-semibold text-sm text-amber-300">Recomendación IA</h3>
          </div>
          <div className="space-y-1.5">
            {reasons.map((r, i) => (
              <p key={i} className="text-sm text-zinc-300">{r}</p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => handleAction('accept')} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm font-semibold hover:bg-emerald-500/25 transition-all active:scale-[0.97]">
          <CheckCircle className="size-4" /> Aceptar
        </button>
        <button onClick={() => handleAction('reject')} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 text-sm font-semibold hover:bg-red-500/25 transition-all active:scale-[0.97]">
          <XCircle className="size-4" /> Rechazar
        </button>
        <button onClick={() => handleAction('negotiate')} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 text-sm font-semibold hover:bg-blue-500/25 transition-all active:scale-[0.97]">
          <MessageCircle className="size-4" /> Negociar
        </button>
        <button onClick={() => handleAction('manual')} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm font-semibold hover:bg-amber-500/25 transition-all active:scale-[0.97]">
          <HandMetal className="size-4" /> TOMAR CONTROL
        </button>
      </div>

      <Button onClick={() => navigate('chat', { clientId: client.id })} variant="outline" className="w-full rounded-xl border-white/10 bg-white/5 h-11 text-sm active:scale-[0.98] transition-transform">
        <Eye className="size-4" /> Ver conversación
      </Button>
    </motion.div>
  )
}
