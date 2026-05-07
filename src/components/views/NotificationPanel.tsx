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

export default function NotificationPanel() {
  const { notifications, unreadCount, showNotifications, setShowNotifications, token, setNotifications, setUnreadCount } = useAppStore()
  const { addToast } = useToasts()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setShowNotifications])

  const handleMarkAllRead = async () => {
    if (!token) return
    try {
      const res = await API('/api/notifications', token, { method: 'PUT' })
      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
        addToast('Todas las notificaciones marcadas como leídas', 'success')
      }
    } catch {
      addToast('Error al actualizar', 'error')
    }
  }

  return (
    <AnimatePresence>
      {showNotifications && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 top-full mt-2 w-80 md:w-96 rounded-xl border border-white/10 bg-zinc-900/98 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-amber-400" />
              <span className="font-semibold text-sm text-foreground">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full font-bold">{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="size-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-white/5 transition-colors hover:bg-white/5 ${!n.read ? 'bg-amber-500/5' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{notifIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${!n.read ? 'text-foreground' : 'text-zinc-300'}`}>{n.title}</p>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                      </div>
                      {n.content && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{n.content}</p>}
                      <p className="text-[10px] text-zinc-500 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
