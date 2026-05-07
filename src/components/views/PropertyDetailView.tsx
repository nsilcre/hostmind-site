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
  Moon, Sun, Package, CreditCard, Info,
  History, Calendar
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
import { useAppStore, type Property, type PropertyBooking } from '@/lib/store'
import { useToasts, ToastProvider, ToastContainer, ShimmerCard } from '@/components/shared/ToastProvider'
import { ScoreRing } from '@/components/shared/ScoreRing'
import { API, fadeIn, staggerContainer, slideUp, scoreBg, channelIcon, statusIcon, notifIcon, activityIcon, propertyTypeIcon, propertyTypeLabel, propertyStatusLabel, timeAgo, MONTHS_ES, MONTHS_SHORT, DAYS_ES } from '@/components/shared/helpers'

export default function PropertyDetailView() {
  const { token, viewParams, navigate, properties, setProperties } = useAppStore()
  const { addToast } = useToasts()
  const [property, setProperty] = useState<Property & { bookings?: PropertyBooking[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProperty = async () => {
      if (!viewParams.propertyId || !token) return
      setLoading(true)
      try {
        const res = await API(`/api/properties/${viewParams.propertyId}`, token)
        if (res.ok) setProperty(await res.json())
        else addToast('Propiedad no encontrada', 'error')
      } catch { addToast('Error al cargar', 'error') } finally { setLoading(false) }
    }
    fetchProperty()
  }, [viewParams.propertyId, token])

  const handleDelete = async () => {
    if (!property || !token) return
    try {
      const res = await API(`/api/properties/${property.id}`, token, { method: 'DELETE' })
      if (res.ok) {
        setProperties(properties.filter(p => p.id !== property.id))
        addToast('Propiedad eliminada', 'success')
        navigate('properties')
      }
    } catch { addToast('Error al eliminar', 'error') }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl bg-zinc-800" />
        <Skeleton className="h-8 w-48 bg-zinc-800" />
        <div className="grid grid-cols-3 gap-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-zinc-800" />)}</div>
        <Skeleton className="h-20 rounded-xl bg-zinc-800" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="text-center py-16">
        <Building className="size-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">Propiedad no encontrada</p>
      </div>
    )
  }

  const statusInfo = propertyStatusLabel(property.status)
  let amenitiesList: string[] = []
  try { amenitiesList = property.amenities ? JSON.parse(property.amenities) : [] } catch { /* empty */ }

  const bookingHistory = property.bookings || []

  return (
    <motion.div {...fadeIn} className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('properties')} className="rounded-xl hover:bg-white/10">
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{property.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            <span>{property.city || 'Sin ubicación'}</span>
            <span className="text-zinc-600">·</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.cls}`}>{statusInfo.label}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-400 border-red-500/30 hover:bg-red-500/10 rounded-xl active:scale-[0.97] transition-transform">
          <Trash2 className="size-3.5" /> Eliminar
        </Button>
      </div>

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-700 border border-white/10 p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
          {propertyTypeIcon(property.type)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-zinc-400">{propertyTypeLabel(property.type)}</span>
            {property.rating && (
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="size-3.5 fill-amber-400" />
                <span className="text-sm font-medium">{property.rating.toFixed(1)}</span>
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-foreground">{property.pricePerNight}</span>
            <span className="text-sm text-zinc-500">€/noche</span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Bed, label: 'Dormitorios', value: property.bedrooms },
          { icon: Bath, label: 'Baños', value: property.bathrooms },
          { icon: UsersRound, label: 'Huéspedes', value: property.guests },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-white/10 bg-card/60 p-3 text-center">
            <item.icon className="size-5 text-amber-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{item.value}</p>
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      {property.description && (
        <div className="rounded-xl border border-white/10 bg-card/60 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Descripción</h3>
          <p className="text-sm text-zinc-300 leading-relaxed">{property.description}</p>
        </div>
      )}

      {/* Amenities */}
      {amenitiesList.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-card/60 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Servicios</h3>
          <div className="flex flex-wrap gap-2">
            {amenitiesList.map((a, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground mb-1">Reservas totales</p>
          <p className="text-xl font-bold text-foreground">{property.totalBookings}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/60 p-4">
          <p className="text-xs text-muted-foreground mb-1">Ingresos totales</p>
          <p className="text-xl font-bold text-emerald-400">{property.totalRevenue.toLocaleString('es-ES')}€</p>
        </div>
      </div>

      {/* Booking History */}
      <div className="rounded-xl border border-white/10 bg-card/60 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <History className="size-4 text-amber-400" /> Historial de reservas
        </h3>
        {bookingHistory.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">No hay reservas registradas</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {bookingHistory.map(b => {
              const bStatus = b.status === 'confirmed' ? { label: 'Confirmada', cls: 'text-emerald-400 bg-emerald-500/10' }
                : b.status === 'pending' ? { label: 'Pendiente', cls: 'text-amber-400 bg-amber-500/10' }
                : b.status === 'completed' ? { label: 'Completada', cls: 'text-blue-400 bg-blue-500/10' }
                : { label: 'Cancelada', cls: 'text-red-400 bg-red-500/10' }
              return (
                <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Calendar className="size-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{b.guestName}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${bStatus.cls}`}>{bStatus.label}</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {new Date(b.startDate).toLocaleDateString('es-ES')} → {new Date(b.endDate).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  {b.totalPrice && (
                    <span className="text-sm font-medium text-emerald-400 shrink-0">{b.totalPrice}€</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

