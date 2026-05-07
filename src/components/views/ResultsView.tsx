'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2, BarChart3, Download, FileSpreadsheet, FileJson,
  TrendingUp, ShieldCheck, ShieldAlert, UsersRound,
  ArrowUpRight, CheckCircle, Clock, MessageCircle, CreditCard, Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore, type Stats } from '@/lib/store'
import { useToasts } from '@/components/shared/ToastProvider'
import { API, fadeIn, channelIcon, statusIcon, MONTHS_SHORT } from '@/components/shared/helpers'

export default function ResultsView() {
  const { token } = useAppStore()
  const { addToast } = useToasts()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportingKey, setExportingKey] = useState<string | null>(null)

  const handleExport = useCallback(async (type: 'clients' | 'bookings' | 'revenue', format: 'csv' | 'json') => {
    const key = `${type}-${format}`
    if (!token || exportingKey) return
    setExportingKey(key)
    try {
      const res = await fetch(`/api/export?type=${type}&format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Error al exportar')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match ? match[1] : `hostmind_${type}_${format}.${format}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addToast(`${type === 'clients' ? 'Clientes' : type === 'bookings' ? 'Reservas' : 'Ingresos'} exportados correctamente (${format.toUpperCase()})`, 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error al exportar datos', 'error')
    } finally {
      setExportingKey(null)
    }
  }, [token, exportingKey, addToast])

  const exportButtons = [
    { type: 'clients' as const, format: 'csv' as const, label: 'Clientes (CSV)', FileIcon: FileSpreadsheet, color: 'text-emerald-400', border: 'border-emerald-500/20 hover:bg-emerald-500/10' },
    { type: 'bookings' as const, format: 'csv' as const, label: 'Reservas (CSV)', FileIcon: FileSpreadsheet, color: 'text-amber-400', border: 'border-amber-500/20 hover:bg-amber-500/10' },
    { type: 'clients' as const, format: 'json' as const, label: 'Clientes (JSON)', FileIcon: FileJson, color: 'text-sky-400', border: 'border-sky-500/20 hover:bg-sky-500/10' },
  ]

  useEffect(() => {
    const fetch = async () => {
      if (!token) return
      try {
        const res = await API('/api/stats', token)
        if (res.ok) setStats(await res.json())
      } catch { addToast('Error al cargar estadísticas', 'error') } finally { setLoading(false) }
    }
    fetch()
  }, [token])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="size-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">No hay datos</p>
      </div>
    )
  }

  const statCards = [
    { label: 'Total clientes', value: stats.total, icon: UsersRound, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    { label: 'Score medio', value: stats.avgScore, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/15' },
    { label: 'Clientes TOP', value: stats.byLabel?.TOP || 0, icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    { label: 'Clientes Riesgo', value: stats.byLabel?.RIESGO || 0, icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/15' },
  ]

  const maxLabel = Math.max(...Object.values(stats.byLabel || {}), 1)
  const maxChannel = Math.max(...Object.values(stats.byChannel || {}), 1)
  const maxStatus = Math.max(...Object.values(stats.byStatus || {}), 1)

  const labelColors: Record<string, string> = { TOP: 'bg-emerald-500', NORMAL: 'bg-blue-500', RIESGO: 'bg-red-500', pending: 'bg-zinc-500' }
  const channelColors: Record<string, string> = { WhatsApp: 'bg-green-500', Facebook: 'bg-blue-600', Web: 'bg-zinc-400', Manual: 'bg-amber-500' }
  const statusColors: Record<string, string> = { classified: 'bg-blue-500', accepted: 'bg-emerald-500', rejected: 'bg-red-500', pending: 'bg-zinc-500', negotiating: 'bg-amber-500', manual: 'bg-purple-500' }

  // Revenue chart data
  const monthlyEntries = Object.entries(stats.monthlyRevenue || {})
  const maxRevenue = Math.max(...monthlyEntries.map(([, v]) => v), 1)

  // Booking funnel
  const totalBookings = (stats.pendingBookings || 0) + (stats.confirmedBookings || 0) + (stats.completedBookings || 0)
  const maxFunnel = Math.max(stats.pendingBookings || 0, stats.confirmedBookings || 0, stats.completedBookings || 0, 1)

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resultados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Estadísticas de gestión</p>
        </div>
      </div>

      {/* Export Section */}
      <div className="rounded-xl border border-white/10 bg-card/60 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Download className="size-4 text-muted-foreground" /> Exportar datos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {exportButtons.map((btn) => {
            const isLoading = exportingKey === `${btn.type}-${btn.format}`
            return (
              <Button
                key={`${btn.type}-${btn.format}`}
                variant="outline"
                size="sm"
                disabled={isLoading || !token}
                onClick={() => handleExport(btn.type, btn.format)}
                className={`rounded-lg gap-2 text-xs border ${btn.border} transition-colors w-full justify-center`}
              >
                {isLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <btn.FileIcon className={`size-3.5 ${btn.color}`} />
                )}
                {isLoading ? 'Exportando...' : btn.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="rounded-xl border border-white/10 bg-card/60 p-4 hover:bg-card/80 transition-colors">
            <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
              <card.icon className={`size-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <CreditCard className="size-5 text-emerald-400" /> Ingresos
        </h2>

        {/* Total Revenue Card */}
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Ingresos totales</p>
              <p className="text-3xl font-bold text-emerald-400">{((stats.totalRevenue || 0) + (stats.propertyRevenue || 0)).toLocaleString('es-ES')}€</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-400">
              <ArrowUpRight className="size-5" />
              <span className="text-sm font-medium">{stats.totalProperties} prop.</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-emerald-500/10">
            <div>
              <p className="text-xs text-zinc-500">Propiedades</p>
              <p className="text-sm font-bold text-foreground">{stats.totalProperties}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Valoración media</p>
              <p className="text-sm font-bold text-foreground flex items-center gap-1">
                <Star className="size-3 text-amber-400 fill-amber-400" />
                {stats.avgRating.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Ocupación</p>
              <p className="text-sm font-bold text-foreground">{stats.avgOccupancy}%</p>
            </div>
          </div>
        </div>

        {/* Monthly Revenue Chart */}
        {monthlyEntries.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-card/60 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Ingresos por mes</h3>
            <div className="flex items-end gap-2 h-32">
              {monthlyEntries.map(([month, rev], i) => {
                const height = maxRevenue > 0 ? (rev / maxRevenue) * 100 : 0
                const monthNum = parseInt(month.split('-')[1]) - 1
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {rev > 0 ? `${(rev / 1000).toFixed(1)}k` : '0'}
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(height, 4)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.08 }}
                      className="w-full rounded-t-md bg-gradient-to-t from-emerald-500/80 to-emerald-400/60 min-h-[4px]"
                    />
                    <span className="text-[10px] text-zinc-500">{MONTHS_SHORT[monthNum]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Booking Funnel */}
        <div className="rounded-xl border border-white/10 bg-card/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Embudo de reservas</h3>
            <span className="text-xs text-zinc-500">{totalBookings} total</span>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Pendientes', value: stats.pendingBookings || 0, color: 'bg-amber-500', icon: Clock },
              { label: 'Confirmadas', value: stats.confirmedBookings || 0, color: 'bg-emerald-500', icon: CheckCircle },
              { label: 'Completadas', value: stats.completedBookings || 0, color: 'bg-blue-500', icon: CheckCircle },
            ].map((item, i) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <item.icon className="size-3.5" /> {item.label}
                  </span>
                  <span className="text-muted-foreground font-medium">{item.value}</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${maxFunnel > 0 ? (item.value / maxFunnel) * 100 : 0}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.15 }}
                    className={`h-full rounded-full ${item.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Total Messages */}
      <div className="rounded-xl border border-white/10 bg-card/60 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
            <MessageCircle className="size-5 text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.totalMessages}</p>
            <p className="text-xs text-muted-foreground">Total mensajes</p>
          </div>
        </div>
      </div>

      {/* Distribution by Label */}
      <div className="rounded-xl border border-white/10 bg-card/60 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Distribución por Clasificación</h3>
        <div className="space-y-2.5">
          {Object.entries(stats.byLabel || {}).map(([label, count]) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-300">{label === 'TOP' ? '⭐ TOP' : label === 'NORMAL' ? '👍 Normal' : label === 'RIESGO' ? '⚠️ Riesgo' : label}</span>
                <span className="text-muted-foreground font-medium">{count}</span>
              </div>
              <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(count / maxLabel) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }} className={`h-full rounded-full ${labelColors[label] || 'bg-zinc-500'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution by Channel */}
      <div className="rounded-xl border border-white/10 bg-card/60 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Distribución por Canal</h3>
        <div className="space-y-2.5">
          {Object.entries(stats.byChannel || {}).map(([channel, count]) => (
            <div key={channel} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-300 flex items-center gap-1.5">{channelIcon(channel)} {channel}</span>
                <span className="text-muted-foreground font-medium">{count}</span>
              </div>
              <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(count / maxChannel) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.5 }} className={`h-full rounded-full ${channelColors[channel] || 'bg-zinc-500'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution by Status */}
      <div className="rounded-xl border border-white/10 bg-card/60 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Distribución por Estado</h3>
        <div className="space-y-2.5">
          {Object.entries(stats.byStatus || {}).map(([status, count]) => (
            <div key={status} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-300 capitalize flex items-center gap-1.5">{statusIcon(status)} {status}</span>
                <span className="text-muted-foreground font-medium">{count}</span>
              </div>
              <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(count / maxStatus) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.7 }} className={`h-full rounded-full ${statusColors[status] || 'bg-zinc-500'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
