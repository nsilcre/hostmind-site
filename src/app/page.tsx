'use client'

import React, { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Loader2, Sparkles } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { API } from '@/components/shared/helpers'
import { ToastProvider, ToastContainer } from '@/components/shared/ToastProvider'
import { Sidebar, MobileBottomNav, MobileNotifButton } from '@/components/views/LayoutComponents'
import LoginView from '@/components/views/LoginView'
import DashboardView from '@/components/views/DashboardView'
import MessagesView from '@/components/views/MessagesView'
import ProfileView from '@/components/views/ProfileView'
import ChatView from '@/components/views/ChatView'
import DemoIAView from '@/components/views/DemoIAView'
import AIAssistantView from '@/components/views/AIAssistantView'
import CalendarView from '@/components/views/CalendarView'
import PropertiesView from '@/components/views/PropertiesView'
import PropertyDetailView from '@/components/views/PropertyDetailView'
import ResultsView from '@/components/views/ResultsView'
import ConnectivityView from '@/components/views/ConnectivityView'
import SettingsView from '@/components/views/SettingsView'

function AppViews() {
  const { currentView } = useAppStore()
  switch (currentView) {
    case 'dashboard': return <DashboardView />
    case 'messages': return <MessagesView />
    case 'profile': return <ProfileView />
    case 'chat': return <ChatView />
    case 'demo': return <DemoIAView />
    case 'calendar': return <CalendarView />
    case 'properties': return <PropertiesView />
    case 'property-detail': return <PropertyDetailView />
    case 'results': return <ResultsView />
    case 'connectivity': return <ConnectivityView />
    case 'settings': return <SettingsView />
    case 'ai-assistant': return <AIAssistantView />
    default: return <DashboardView />
  }
}

export default function Page() {
  const { token, user, navigate, clients, setClients } = useAppStore()
  const { resolvedTheme } = useTheme()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('hm_token')
      if (savedToken) {
        try {
          const res = await API('/api/auth', savedToken)
          if (res.ok) {
            const data = await res.json()
            useAppStore.getState().setAuth(savedToken, { username: data.username, name: data.name })
            API('/api/seed', savedToken, { method: 'POST' })
            const [clientsRes, notifRes, actRes, propsRes, connRes] = await Promise.all([
              API('/api/clients', savedToken),
              API('/api/notifications', savedToken),
              API('/api/activity', savedToken),
              API('/api/properties', savedToken),
              API('/api/connectivity', savedToken),
            ])
            if (clientsRes.ok) setClients(await clientsRes.json())
            if (notifRes.ok) {
              const notifData = await notifRes.json()
              useAppStore.getState().setNotifications(notifData.notifications)
              useAppStore.getState().setUnreadCount(notifData.unreadCount)
            }
            if (actRes.ok) useAppStore.getState().setActivities(await actRes.json())
            if (propsRes.ok) useAppStore.getState().setProperties(await propsRes.json())
            if (connRes.ok) useAppStore.getState().setConnections(await connRes.json())
            navigate('dashboard')
          } else {
            useAppStore.getState().clearAuth()
            navigate('login')
          }
        } catch {
          useAppStore.getState().clearAuth()
          navigate('login')
        }
      } else {
        navigate('login')
      }
      setChecked(true)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('hm_theme')
    if (stored && (stored === 'dark' || stored === 'light')) {
      useAppStore.getState().setTheme(stored as 'dark' | 'light')
    }
  }, [])

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-amber-500/30">H</div>
            <div className="absolute -inset-2 rounded-2xl bg-amber-500/15 blur-xl -z-10 animate-pulse" />
          </div>
          <Loader2 className="size-5 text-amber-400 animate-spin" />
          <p className="text-xs text-zinc-600">Cargando...</p>
        </div>
      </div>
    )
  }

  const isLoggedIn = !!token && !!user

  if (!isLoggedIn) {
    return (
      <ToastProvider>
        <ToastContainer />
        <LoginView />
      </ToastProvider>
    )
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-background dark:bg-zinc-950">
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 z-[60]" />
        <ToastContainer />
        <Sidebar />
        <MobileNotifButton />
        <main className="flex-1 md:ml-[260px] pb-20 md:pb-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
            <AnimatePresence mode="wait">
              <AppViews />
            </AnimatePresence>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </ToastProvider>
  )
}
