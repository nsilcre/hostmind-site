'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, RefreshCw, Plus, Sparkles,
  Users, Clock, MessageCircle,
  Building, Euro, CheckCircle, TrendingUp,
  ArrowUpRight, ArrowDownRight, Calendar, Eye,
  Search, X, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { useAppStore, type Client, type Activity, type Booking, type Property } from '@/lib/store'
import { useToasts, ShimmerCard } from '@/components/shared/ToastProvider'
import { API, fadeIn, staggerContainer, slideUp, scoreBg, channelIcon, statusIcon, activityIcon, timeAgo, MONTHS_ES } from '@/components/shared/helpers'

function MiniSparkline({ data, color = 'bg-amber-400' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-1 h-10">
      {data.map((v, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${(v / max) * 100}%` }}
          transition={{ delay: i * 0.04, duration: 0.4, ease: 'easeOut' }}
          className={`flex-1 rounded-sm ${color} min-w-[4px]`}
          style={{ opacity: 0.4 + (i / data.length) * 0.6 }}
        />
      ))}
    </div>
  )
}

function PipelineColumn({
  title,
  clients,
  dotColor,
  textColor,
  accentBg,
  navigate,
}: {
  title: string
  clients: Client[]
  dotColor: string
  textColor: string
  accentBg: string
  navigate: (view: string, params?: Record<string, string>) => void
}) {
  return (
    <div className="min-w-[180px] md:min-w-[200px] shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">{title}</h4>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${accentBg} ${textColor}`}>
          {clients.length}
        </span>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin pr-1">
        {clients.length === 0 ? (
          <p className="text-[11px] text-zinc-600 py-3 text-center">Sin clientes</p>
        ) : (
          clients.map((c) => (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('profile', { clientId: c.id })}
              className="w-full text-left rounded-lg border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] p-2.5 transition-colors group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-zinc-300 group-hover:text-zinc-100 truncate font-medium">
                  {c.name}
                </span>
                {c.scoreLabel && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${scoreBg(c.scoreLabel)}`}>
                    {c.score || '-'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {channelIcon(c.channel)}
                <span className="text-[10px] text-zinc-500">{c.channel}</span>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  )
}

function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed: { label: 'Confirmada', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    pending: { label: 'Pendiente', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    cancelled: { label: 'Cancelada', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
    completed: { label: 'Completada', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  }
  const s = map[status] || { label: status, cls: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.cls}`}>
      {s.label}
    </span>
  )
}

export default function DashboardView() {
  const {
    clients, currentFilter, setCurrentFilter, navigate, token,
    searchQuery, setSearchQuery, user, activities, bookings,
    setBookings, properties, setProperties
  } = useAppStore()
  const { addToast } = useToasts()
  const pipelineRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  const [quickStats, setQuickStats] = useState<{
    totalClients: number
    messagesWeek: number
    activeProperties: number
    revenue: number
    confirmedBookings: number
    avgOccupancy: number
    monthlyRevenue: Record<string, number>
  } | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)
  const [bookingsLoading, setBookingsLoading] = useState(true)

  const fetchClients = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await API('/api/clients', token)
      if (res.ok) {
        const data = await res.json()
        useAppStore.getState().setClients(data)
      }
    } catch {
      addToast('Error al cargar clientes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!token) return
    setStatsLoading(true)
    try {
      const res = await API('/api/stats', token)
      if (res.ok) {
        const data = await res.json()
        setQuickStats({
          totalClients: data.total,
          messagesWeek: data.totalMessages,
          activeProperties: data.activeProperties,
          revenue: data.totalRevenue + data.propertyRevenue,
          confirmedBookings: data.confirmedBookings,
          avgOccupancy: data.avgOccupancy,
          monthlyRevenue: data.monthlyRevenue || {},
        })
      }
    } catch { /* silent */ } finally {
      setStatsLoading(false)
    }
  }

  const fetchActivities = async () => {
    if (!token) return
    setActivityLoading(true)
    try {
      const res = await API('/api/activity', token)
      if (res.ok) {
        useAppStore.getState().setActivities(await res.json())
      }
    } catch { /* silent */ } finally {
      setActivityLoading(false)
    }
  }

  const fetchBookings = async () => {
    if (!token) return
    setBookingsLoading(true)
    try {
      const res = await API('/api/bookings', token)
      if (res.ok) {
        setBookings(await res.json())
      }
    } catch { /* silent */ } finally {
      setBookingsLoading(false)
    }
  }

  const fetchProperties = async () => {
    if (!token) return
    try {
      const res = await API('/api/properties', token)
      if (res.ok) {
        setProperties(await res.json())
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchClients()
    fetchStats()
    fetchActivities()
    fetchBookings()
    fetchProperties()
  }, [token])

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 20 ? 'Buenas tardes' : 'Buenas noches'
  const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const sparkData = React.useMemo(() => {
    if (!quickStats?.monthlyRevenue) return [0, 0, 0, 0, 0, 0, 0]
    const months: number[] = []
    const curMonth = now.getMonth()
    const curYear = now.getFullYear()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(curYear, curMonth - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push(quickStats.monthlyRevenue[key] || 0)
    }
    return months
  }, [quickStats])

  const revenueChange = React.useMemo(() => {
    if (!quickStats?.monthlyRevenue) return null
    const curMonth = now.getMonth()
    const curYear = now.getFullYear()
    const curMonthKey = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`
    const prevYear = curMonth === 0 ? curYear - 1 : curYear
    const prevMonthKey = `${prevYear}-${String(curMonth === 0 ? 12 : curMonth).padStart(2, '0')}`
    const last = quickStats.monthlyRevenue[curMonthKey] || 0
    const prev = quickStats.monthlyRevenue[prevMonthKey] || 0
    if (prev === 0 && last === 0) return null
    if (prev === 0) return { value: 100, positive: true }
    const pct = Math.round(((last - prev) / prev) * 100)
    return { value: Math.abs(pct), positive: pct >= 0 }
  }, [quickStats])

  const pipelineStages = React.useMemo(() => {
    const stageMap: Record<number, Client[]> = { 0: [], 1: [], 2: [], 3: [] }
    clients.forEach((c) => {
      const step = c.step >= 0 && c.step <= 3 ? c.step : 0
      stageMap[step].push(c)
    })
    return stageMap
  }, [clients])

  const upcomingBookings = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return bookings
      .filter((b) => b.startDate >= today && b.status !== 'cancelled')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 4)
  }, [bookings])

  const activeProps = React.useMemo(
    () => properties.filter((p) => p.status === 'active').length,
    [properties]
  )

  const occupancy = quickStats?.avgOccupancy ?? 0

  const formatCurrency = (val: number) => val.toLocaleString('es-ES')

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const filtered = clients.filter((c) => {
    if (currentFilter !== 'ALL' && c.scoreLabel !== currentFilter) return false
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const filters = [
    { id: 'ALL', label: 'Todos', emoji: '📋' },
    { id: 'TOP', label: 'TOP', emoji: '⭐' },
    { id: 'NORMAL', label: 'Normal', emoji: '👍' },
    { id: 'RIESGO', label: 'Riesgo', emoji: '⚠️' },
  ]

  const quickStatCards = [
    {
      label: 'Total Clientes',
      value: quickStats?.totalClients ?? '-',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/15',
      trend: quickStats ? { value: '+12%', positive: true } : null,
    },
    {
      label: 'Reservas Confirmadas',
      value: quickStats?.confirmedBookings ?? '-',
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/15',
      trend: quickStats && quickStats.confirmedBookings > 0 ? { value: '+8%', positive: true } : null,
    },
    {
      label: 'Propiedades Activas',
      value: activeProps || quickStats?.activeProperties || '-',
      icon: Building,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/15',
      trend: null,
    },
    {
      label: 'Tasa Ocupación',
      value: quickStats ? `${Math.round(occupancy)}%` : '-',
      icon: TrendingUp,
      color: 'text-amber-400',
      bg: 'bg-amber-500/15',
      trend: occupancy >= 70 ? { value: `${Math.round(occupancy)}%`, positive: true } : null,
    },
  ]

  const bookingBorderColors = ['border-l-emerald-500', 'border-l-amber-500', 'border-l-blue-500', 'border-l-purple-500']

  return (
    <motion.div {...fadeIn} className="space-y-5">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/5 border border-amber-500/20 p-5 md:p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                {greeting}, <span className="text-amber-400">{user?.name || 'Propietario'}</span> 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-1 capitalize">{dateStr}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Sparkles className="size-5 text-amber-400" />
            </div>
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide pb-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('properties')}
              className="h-8 text-xs bg-white/5 border-white/10 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400 whitespace-nowrap"
            >
              <Plus className="size-3 mr-1.5" />
              Nueva propiedad
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('calendar')}
              className="h-8 text-xs bg-white/5 border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 whitespace-nowrap"
            >
              <Calendar className="size-3 mr-1.5" />
              Ver reservas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('messages')}
              className="h-8 text-xs bg-white/5 border-white/10 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 whitespace-nowrap"
            >
              <Users className="size-3 mr-1.5" />
              Ver clientes
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="rounded-xl border border-white/10 bg-card/60 p-5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Euro className="size-4 text-emerald-400" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ingresos totales</span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-10 w-40 bg-zinc-800 rounded-lg" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                  {quickStats ? `${formatCurrency(quickStats.revenue)}€` : '0€'}
                </span>
                {revenueChange !== null && (
                  <span className={`flex items-center gap-0.5 text-xs font-semibold ${revenueChange.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {revenueChange.positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                    {revenueChange.value}%
                  </span>
                )}
                {revenueChange !== null && (
                  <span className="text-[10px] text-zinc-500">vs. mes anterior</span>
                )}
              </div>
            )}
          </div>

          <div className="w-full md:w-40 shrink-0">
            {statsLoading ? (
              <Skeleton className="h-10 w-full bg-zinc-800 rounded" />
            ) : (
              <>
                <p className="text-[10px] text-zinc-500 mb-1">Últimos 7 meses</p>
                <MiniSparkline data={sparkData} color="bg-emerald-400" />
              </>
            )}
          </div>

          <div className="w-full md:w-36 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wide font-semibold">Ocupación</span>
              <span className="text-sm font-bold text-amber-400">{Math.round(occupancy)}%</span>
            </div>
            <Progress value={occupancy} className="h-2 bg-white/5 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500" />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-card/50 p-4">
              <Skeleton className="h-8 w-16 bg-zinc-800 mb-2 rounded-lg" />
              <Skeleton className="h-3 w-12 bg-zinc-800" />
            </div>
          ))
        ) : (
          quickStatCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06 }}
              className="rounded-xl border border-white/10 bg-card/60 p-4 hover:bg-card/80 transition-all hover:border-white/20 hover:shadow-lg cursor-default"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`size-[18px] ${card.color}`} />
                </div>
                {card.trend && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${card.trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {card.trend.positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                    {card.trend.value}
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-foreground">{card.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{card.label}</p>
            </motion.div>
          ))
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-white/10 bg-card/60 p-4 md:p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="size-4 text-amber-400" />
            Pipeline de clientes
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('messages')}
            className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
          >
            <Eye className="size-3 mr-1" />
            Ver todo
          </Button>
        </div>
        <div
          ref={pipelineRef}
          className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-thin pb-2 -mx-1 px-1"
        >
          <PipelineColumn
            title="Nuevos"
            clients={pipelineStages[0]}
            dotColor="bg-blue-400"
            textColor="text-blue-400"
            accentBg="bg-blue-500/15"
            navigate={navigate}
          />
          <PipelineColumn
            title="Clasificados"
            clients={pipelineStages[1]}
            dotColor="bg-amber-400"
            textColor="text-amber-400"
            accentBg="bg-amber-500/15"
            navigate={navigate}
          />
          <PipelineColumn
            title="Negociando"
            clients={pipelineStages[2]}
            dotColor="bg-orange-400"
            textColor="text-orange-400"
            accentBg="bg-orange-500/15"
            navigate={navigate}
          />
          <PipelineColumn
            title="Aceptados"
            clients={pipelineStages[3]}
            dotColor="bg-emerald-400"
            textColor="text-emerald-400"
            accentBg="bg-emerald-500/15"
            navigate={navigate}
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl border border-white/10 bg-card/60 p-4 md:p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="size-4 text-amber-400" />
              Actividad reciente
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchActivities}
              disabled={activityLoading}
              className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
            >
              <RefreshCw className={`size-3 mr-1 ${activityLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          {activityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-7 rounded-full bg-zinc-800" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-32 bg-zinc-800 mb-1" />
                    <Skeleton className="h-3 w-20 bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-6">No hay actividad reciente</p>
          ) : (
            <div className="space-y-1">
              {activities.slice(0, 6).map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-white/[0.03] transition-colors cursor-default"
                >
                  <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      a.type === 'client_created' ? 'bg-blue-400' :
                      a.type === 'message_sent' ? 'bg-emerald-400' :
                      a.type === 'booking_created' ? 'bg-amber-400' :
                      a.type === 'action_taken' ? 'bg-purple-400' :
                      a.type?.includes('property') ? 'bg-cyan-400' :
                      'bg-zinc-500'
                    }`} />
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                      {activityIcon(a.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 leading-snug">{a.title}</p>
                    {a.content && <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{a.content}</p>}
                  </div>
                  <span className="text-[10px] text-zinc-500 whitespace-nowrap mt-0.5">{timeAgo(a.createdAt)}</span>
                </div>
              ))}
              <button
                onClick={() => navigate('results')}
                className="w-full text-center text-xs text-amber-400 hover:text-amber-300 py-2 font-medium transition-colors"
              >
                Ver todo
              </button>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-white/10 bg-card/60 p-4 md:p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="size-4 text-emerald-400" />
              Próximas reservas
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('calendar')}
              className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
            >
              <Eye className="size-3 mr-1" />
              Ver todo
            </Button>
          </div>

          {bookingsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-zinc-800/50 border border-white/5" />
              ))}
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="size-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No hay reservas próximas</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingBookings.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.06 }}
                  className={`rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors p-3 border-l-2 ${bookingBorderColors[i % bookingBorderColors.length]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-200 truncate">{b.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formatDateShort(b.startDate)} — {formatDateShort(b.endDate)}
                        </span>
                      </div>
                    </div>
                    <BookingStatusBadge status={b.status} />
                  </div>
                  {b.price && (
                    <p className="text-xs text-emerald-400 font-semibold mt-1.5">{b.price.toLocaleString('es-ES')}€</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="space-y-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            placeholder="Buscar clientes por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-zinc-800/50 border-white/10 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="size-3.5 text-zinc-500 hover:text-zinc-300" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Clientes</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} de {clients.length} clientes
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchClients}
            disabled={loading}
            className="rounded-xl hover:bg-white/10"
          >
            <RefreshCw className={`size-4.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {filters.map((f) => (
            <motion.button
              key={f.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentFilter(f.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                currentFilter === f.id
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10'
              }`}
            >
              <span>{f.emoji}</span>
              <span>{f.label}</span>
            </motion.button>
          ))}
        </div>

        {loading && clients.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <ShimmerCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="size-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">No hay clientes</p>
            <p className="text-sm text-zinc-500 mt-1">
              {currentFilter !== 'ALL' || searchQuery ? 'Prueba cambiando el filtro o búsqueda' : 'Los clientes aparecerán aquí'}
            </p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {filtered.map((client, i) => (
              <motion.div
                key={client.id}
                variants={slideUp}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate('profile', { clientId: client.id })}
                className="rounded-xl border border-white/10 bg-card/60 hover:bg-card/80 p-4 cursor-pointer transition-all active:scale-[0.98] group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                      {client.isManual && (
                        <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
                          Manual
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {channelIcon(client.channel)}
                        {client.channel}
                      </span>
                      <span className="text-zinc-600">·</span>
                      {statusIcon(client.status)}
                    </div>
                    {client.summary && (
                      <p className="text-xs text-zinc-400 mt-2 line-clamp-1">{client.summary}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {client.scoreLabel && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${scoreBg(client.scoreLabel)}`}>
                        {client.scoreLabel === 'TOP' ? '⭐' : client.scoreLabel === 'NORMAL' ? '👍' : '⚠️'} {client.score}
                      </span>
                    )}
                    <ChevronRight className="size-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <button
        onClick={() => navigate('demo')}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center transition-all active:scale-95 z-30"
      >
        <Sparkles className="size-6" />
      </button>
    </motion.div>
  )
}
