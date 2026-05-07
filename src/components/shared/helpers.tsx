'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, MessageSquare, Calendar, CheckCircle, XCircle, Clock, MessageCircle,
  UsersRound, Info, AlertTriangle, Zap, Trash2, Building, Building2,
  Phone, Facebook, Globe, Bed, Activity as ActivityIcon, Bot, HandMetal
} from 'lucide-react'

export async function API(url: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  })
}

export const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25 },
}

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
}

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export const slideDown = {
  initial: { opacity: 0, y: -10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.98 },
  transition: { duration: 0.2 },
}

export function scoreBg(label: string | null) {
  if (label === 'TOP') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  if (label === 'NORMAL') return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
  if (label === 'RIESGO') return 'bg-red-500/15 text-red-400 border-red-500/30'
  return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
}

export function channelIcon(channel: string) {
  const ch = channel?.toLowerCase() || ''
  if (ch.includes('whatsapp')) return <Phone className="size-3.5" />
  if (ch.includes('facebook')) return <Facebook className="size-3.5" />
  return <MessageCircle className="size-3.5" />
}

export function statusIcon(status: string) {
  if (status === 'accepted') return <CheckCircle className="size-3.5 text-emerald-400" />
  if (status === 'rejected') return <XCircle className="size-3.5 text-red-400" />
  if (status === 'negotiating') return <Clock className="size-3.5 text-amber-400" />
  if (status === 'manual') return <HandMetal className="size-3.5 text-amber-400" />
  return <Clock className="size-3.5 text-zinc-400" />
}

export function notifIcon(type: string) {
  if (type === 'client') return <UsersRound className="size-4 text-blue-400" />
  if (type === 'message') return <MessageCircle className="size-4 text-emerald-400" />
  if (type === 'booking') return <Calendar className="size-4 text-amber-400" />
  if (type === 'alert') return <AlertTriangle className="size-4 text-red-400" />
  return <Info className="size-4 text-zinc-400" />
}

export function activityIcon(type: string) {
  if (type === 'client_created') return <UsersRound className="size-3.5 text-blue-400" />
  if (type === 'message_sent') return <MessageCircle className="size-3.5 text-emerald-400" />
  if (type === 'booking_created') return <Calendar className="size-3.5 text-amber-400" />
  if (type === 'action_taken') return <Zap className="size-3.5 text-purple-400" />
  if (type === 'property_created' || type === 'property_updated') return <Building className="size-3.5 text-cyan-400" />
  if (type === 'property_deleted') return <Trash2 className="size-3.5 text-red-400" />
  return <ActivityIcon className="size-3.5 text-zinc-400" />
}

export function propertyTypeIcon(type: string) {
  if (type === 'studio') return <Building2 className="size-5" />
  if (type === 'room') return <Bed className="size-5" />
  if (type === 'villa' || type === 'house') return <Home className="size-5" />
  return <Building className="size-5" />
}

export function propertyTypeLabel(type: string) {
  const map: Record<string, string> = { apartment: 'Apartamento', villa: 'Villa', house: 'Casa', studio: 'Estudio', room: 'Habitación' }
  return map[type] || type
}

export function propertyStatusLabel(status: string) {
  if (status === 'active') return { label: 'Activo', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
  if (status === 'inactive') return { label: 'Inactivo', cls: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' }
  if (status === 'maintenance') return { label: 'Mantenimiento', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
  return { label: status, cls: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' }
}

export function timeAgo(dateStr: string) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `Hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function formatMarkdown(text: string): React.ReactNode {
  if (!text) return null
  const parts: React.ReactNode[] = []
  const lines = text.split('\n')
  let key = 0

  for (const line of lines) {
    if (line.match(/^[\s]*[•\-]\s/)) {
      const content = line.replace(/^[\s]*[•\-]\s/, '')
      parts.push(
        <span key={key++} className="flex gap-1.5">
          <span>•</span>
          <span dangerouslySetInnerHTML={{ __html: inlineMarkdown(content) }} />
        </span>
      )
    } else {
      parts.push(
        <span key={key++} dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />
      )
    }
    parts.push(<br key={key++} />)
  }
  parts.pop()
  return <>{parts}</>
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-white/10 text-xs">$1</code>')
}
