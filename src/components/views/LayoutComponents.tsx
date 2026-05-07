'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Home, MessageSquare, Calendar, BarChart3, Settings, LogOut,
  Star, Sparkles, Building, Wifi, Bell, User,
  ChevronRight
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import NotificationPanel from './NotificationPanel'

const navItems = [
  { id: 'dashboard', label: 'Inicio', icon: Home },
  { id: 'messages', label: 'Mensajes', icon: MessageSquare, badgeKey: 'pending' },
  { id: 'ai-assistant', label: 'Asistente IA', icon: Sparkles, badge: 'IA' },
  { id: 'properties', label: 'Propiedades', icon: Building },
  { id: 'calendar', label: 'Calendario', icon: Calendar },
  { id: 'results', label: 'Resultados', icon: BarChart3 },
  { id: 'reviews', label: 'Reseñas', icon: Star },
  { id: 'connectivity', label: 'Conectividad', icon: Wifi },
]

const isNavActive = (id: string, currentView: string) =>
  currentView === id ||
  (id === 'dashboard' && ['profile', 'chat', 'demo', 'property-detail'].includes(currentView))

export function Sidebar() {
  const { currentView, navigate, user, clearAuth, clients, unreadCount, showNotifications, setShowNotifications } = useAppStore()
  const pendingCount = clients.filter(c => c.status === 'pending' || c.status === 'classified').length

  const handleLogout = () => { clearAuth(); navigate('login') }

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-[260px] bg-zinc-950 border-r border-white/[0.06] z-40">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-amber-500/25">H</div>
            <div className="absolute -inset-1 rounded-xl bg-amber-500/20 blur-md -z-10" />
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">HostMind</span>
            <p className="text-[10px] text-zinc-600 -mt-0.5">Smart Rental Manager</p>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-lg hover:bg-white/5 transition-colors group">
            <Bell className="size-[18px] text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            {unreadCount > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </button>
          <NotificationPanel />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Menú principal</p>
        {navItems.map((item, idx) => {
          const active = isNavActive(item.id, currentView)
          const badge = item.badgeKey === 'pending' ? pendingCount : item.badge
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all relative group ${
                active
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300'
              }`}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-500"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                active ? 'bg-amber-500/15' : 'bg-white/[0.03] group-hover:bg-white/[0.06]'
              }`}>
                <item.icon className={`size-[16px] transition-all ${active ? 'text-amber-400' : ''}`} />
              </div>
              <span className="flex-1 text-left">{item.label}</span>
              {badge && typeof badge === 'number' && badge > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/90 text-white rounded-full font-bold">{badge}</span>
              )}
              {badge && typeof badge === 'string' && (
                <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/15 text-amber-400 rounded-md font-bold border border-amber-500/20">{badge}</span>
              )}
              {!active && (
                <ChevronRight className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 space-y-1">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-2" />
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
            currentView === 'settings' ? 'bg-amber-500/10 text-amber-400' : 'text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentView === 'settings' ? 'bg-amber-500/15' : 'bg-white/[0.03]'}`}>
            <Settings className="size-[16px]" />
          </div>
          <span>Ajustes</span>
        </motion.button>
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mx-1 mt-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/10 flex items-center justify-center border border-amber-500/20">
              <span className="text-xs font-bold text-amber-400">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-zinc-300 truncate">{user.name}</p>
              <p className="text-[11px] text-zinc-600 truncate">@{user.username}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-all active:scale-[0.98]"
        >
          <LogOut className="size-[16px]" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}

export function MobileBottomNav() {
  const { currentView, navigate, clients, unreadCount } = useAppStore()
  const pendingCount = clients.filter(c => c.status === 'pending' || c.status === 'classified').length
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Inicio' },
    { id: 'messages', icon: MessageSquare, label: 'Mensajes', badge: pendingCount },
    { id: 'ai-assistant', icon: Sparkles, label: 'IA' },
    { id: 'properties', icon: Building, label: 'Propiedades' },
    { id: 'settings', icon: Settings, label: 'Más' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-white/[0.06] safe-area-pb">
      <div className="flex items-center justify-around py-1.5 px-2">
        {tabs.map((tab) => {
          const isActive = isNavActive(tab.id, currentView)
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(tab.id)}
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-[56px] ${
                isActive ? 'text-amber-400' : 'text-zinc-600'
              }`}
            >
              <div className="relative">
                <tab.icon className="size-[20px]" />
                {tab.badge ? (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 bg-amber-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-1">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-amber-500"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}

export function MobileNotifButton() {
  const { unreadCount, showNotifications, setShowNotifications } = useAppStore()
  return (
    <div className="md:hidden relative fixed top-3 right-3 z-50">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2.5 rounded-xl bg-zinc-900/90 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/20"
      >
        <Bell className="size-5 text-zinc-300" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>
      <NotificationPanel />
    </div>
  )
}
