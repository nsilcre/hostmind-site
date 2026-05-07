'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  Facebook, Phone, Moon, Sun, Bot, Sparkles,
  Wifi, User, Package, Loader2, LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'
import { useToasts } from '@/components/shared/ToastProvider'
import { API, fadeIn } from '@/components/shared/helpers'

export default function SettingsView() {
  const { theme, setTheme, user, clearAuth, token } = useAppStore()
  const { addToast } = useToasts()
  const { resolvedTheme, setTheme: setNextTheme } = useTheme()
  const navigate = useAppStore((s) => s.navigate)

  const [aiConfig, setAiConfig] = useState<{ ownerName: string; systemPrompt: string; greetingMessage: string } | null>(null)
  const [aiSaving, setAiSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    API('/api/ai-config', token)
      .then((r) => r.json())
      .then((data) => {
        setAiConfig({
          ownerName: data.ownerName || '',
          systemPrompt: data.systemPrompt || '',
          greetingMessage: data.greetingMessage || '',
        })
      })
      .catch(() => {})
      .finally(() => setAiLoading(false))
  }, [token])

  const handleSaveAI = async () => {
    if (!token || !aiConfig) return
    setAiSaving(true)
    try {
      const res = await API('/api/ai-config', token, {
        method: 'PUT',
        body: JSON.stringify(aiConfig),
      })
      if (res.ok) addToast('Configuración de IA guardada', 'success')
      else addToast('Error al guardar', 'error')
    } catch { addToast('Error al guardar', 'error') } finally { setAiSaving(false) }
  }

  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setNextTheme(newTheme)
    setTheme(newTheme as 'dark' | 'light')
  }

  const handleLogout = () => {
    clearAuth()
    navigate('login')
  }

  const integrations = [
    { name: 'Facebook Messenger', icon: Facebook, status: 'real', color: 'text-blue-400', bg: 'bg-blue-500/15', note: 'Configura en Conectividad' },
    { name: 'WhatsApp Business', icon: Phone, status: 'soon', color: 'text-emerald-400', bg: 'bg-emerald-500/15', note: 'Próximamente' },
  ]

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configuración de la aplicación</p>
      </div>

      {/* Theme */}
      <div className="rounded-xl border border-white/10 bg-card/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
              {resolvedTheme === 'dark' ? <Moon className="size-5 text-purple-400" /> : <Sun className="size-5 text-amber-400" />}
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Tema</p>
              <p className="text-xs text-muted-foreground">{resolvedTheme === 'dark' ? 'Modo oscuro' : 'Modo claro'}</p>
            </div>
          </div>
          <Switch checked={resolvedTheme === 'dark'} onCheckedChange={toggleTheme} className="data-[state=checked]:bg-amber-500" />
        </div>
      </div>

      {/* IA Personalización */}
      <div className="rounded-xl border border-amber-500/20 bg-card/60 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Bot className="size-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Entrenamiento de la IA</h3>
            <p className="text-[11px] text-muted-foreground">Personaliza cómo se comunica el asistente con tus clientes</p>
          </div>
        </div>

        {aiLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full bg-zinc-800" />
            <Skeleton className="h-20 w-full bg-zinc-800" />
            <Skeleton className="h-20 w-full bg-zinc-800" />
          </div>
        ) : aiConfig ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-zinc-400 mb-1 block">Nombre del asistente</Label>
              <Input
                value={aiConfig.ownerName}
                onChange={(e) => setAiConfig((c) => c ? { ...c, ownerName: e.target.value } : c)}
                placeholder="ej: María, el asistente de ApartHotel Marbella..."
                className="bg-zinc-800/50 border-white/10 text-sm"
              />
              <p className="text-[10px] text-zinc-600 mt-1">Cómo se presentará la IA ante los clientes</p>
            </div>

            <div>
              <Label className="text-xs text-zinc-400 mb-1 block">Mensaje de bienvenida</Label>
              <Textarea
                value={aiConfig.greetingMessage}
                onChange={(e) => setAiConfig((c) => c ? { ...c, greetingMessage: e.target.value } : c)}
                placeholder="¡Hola! 👋 Soy María, tu asistente virtual. Estaré encantada de ayudarte a encontrar el alojamiento perfecto."
                rows={2}
                className="bg-zinc-800/50 border-white/10 text-sm resize-none"
              />
              <p className="text-[10px] text-zinc-600 mt-1">Primer mensaje que recibe el cliente al contactar</p>
            </div>

            <div>
              <Label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1.5">
                <Sparkles className="size-3 text-amber-400" />
                Instrucciones de personalidad
              </Label>
              <Textarea
                value={aiConfig.systemPrompt}
                onChange={(e) => setAiConfig((c) => c ? { ...c, systemPrompt: e.target.value } : c)}
                placeholder={`Ejemplos de instrucciones:\n• Responde siempre de forma cercana y usando el nombre del cliente\n• Si el cliente pregunta por mascotas, sé especialmente amable\n• No ofrezcas descuentos sin consultarlo primero\n• Menciona siempre que hay parking gratuito disponible`}
                rows={5}
                className="bg-zinc-800/50 border-white/10 text-sm resize-none font-mono text-xs"
              />
              <p className="text-[10px] text-zinc-600 mt-1">La IA seguirá estas instrucciones al responder a los clientes</p>
            </div>

            <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 p-3">
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                💡 <strong>Consejo:</strong> Cuantos más detalles incluyas sobre tu estilo de comunicación, normas del alojamiento y cómo manejar situaciones especiales, más natural y efectiva será la IA con tus clientes.
              </p>
            </div>

            <Button
              onClick={handleSaveAI}
              disabled={aiSaving}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-10 active:scale-[0.98] transition-transform"
            >
              {aiSaving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Guardar configuración de IA
            </Button>
          </div>
        ) : null}
      </div>

      {/* Integraciones */}
      <div className="rounded-xl border border-white/10 bg-card/60 p-4 space-y-3">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Wifi className="size-4 text-cyan-400" />
          Integraciones
        </h3>
        <p className="text-xs text-muted-foreground">Servicios conectados a tu cuenta</p>
        <div className="space-y-2 mt-2">
          {integrations.map((intg) => (
            <div key={intg.name} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${intg.bg} flex items-center justify-center`}>
                  <intg.icon className={`size-4 ${intg.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{intg.name}</p>
                  <p className="text-xs text-zinc-500">{intg.note}</p>
                </div>
              </div>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${
                intg.status === 'real' ? 'text-amber-400' : 'text-zinc-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${intg.status === 'real' ? 'bg-amber-400' : 'bg-zinc-500'}`} />
                {intg.status === 'real' ? 'Disponible' : 'Próximamente'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Account */}
      <div className="rounded-xl border border-white/10 bg-card/60 p-4 space-y-4">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <User className="size-4 text-amber-400" />
          Cuenta
        </h3>
        {user && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <User className="size-6 text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{user.name}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* App Version */}
      <div className="rounded-xl border border-white/10 bg-card/60 p-4 space-y-3">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Package className="size-4 text-emerald-400" />
          Versión de la app
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Versión actual</span>
            <span className="text-foreground font-medium">2.1.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Última actualización</span>
            <span className="text-foreground font-medium">15 Ene 2025</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Motor IA</span>
            <span className="text-foreground font-medium">Clasificación automática</span>
          </div>
        </div>
        <Separator className="bg-white/10" />
        <div className="flex items-center gap-3 pt-1">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-sm">H</div>
          <div>
            <p className="text-sm font-semibold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">HostMind</p>
            <p className="text-xs text-muted-foreground">Gestión inteligente de alquileres</p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <Button onClick={handleLogout} variant="outline"
        className="w-full rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-11 active:scale-[0.98] transition-transform">
        <LogOut className="size-4" /> Cerrar sesión
      </Button>

      {/* Sticky Footer */}
      <div className="pb-4 text-center">
        <p className="text-[10px] text-zinc-600">HostMind v2.1.0</p>
      </div>
    </motion.div>
  )
}
