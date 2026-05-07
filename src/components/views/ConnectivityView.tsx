'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Facebook, Phone, X,
  CheckCircle, Loader2, Shield, ExternalLink,
  Info, AlertTriangle, Key, MessageCircle,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { useToasts } from '@/components/shared/ToastProvider'
import { API, fadeIn, timeAgo } from '@/components/shared/helpers'

export default function ConnectivityView() {
  const { token, connections, navigate } = useAppStore()
  const { addToast } = useToasts()
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [pageToken, setPageToken] = useState('')
  const [connecting, setConnecting] = useState(false)

  const fbConnection = connections['facebook']
  const isConnected = fbConnection?.connected ?? false

  useEffect(() => {
    if (!token) return
    API('/api/connectivity', token)
      .then(res => {
        if (!res.ok) return
        res.json().then(data => {
          useAppStore.getState().setConnections(data)
          if (data.facebook?.connected) {
            API('/api/facebook?action=verify-token', token)
              .then(r => r.json())
              .then(d => {
                if (d.expired) addToast('Tu token de Facebook ha expirado. Reconecta tu cuenta con un token nuevo.', 'error')
              })
              .catch(() => {})
          }
        })
      })
      .catch(() => addToast('Error al cargar datos', 'error'))
      .finally(() => setLoading(false))
  }, [token])

  const connectWithToken = async () => {
    if (!token || !pageToken.trim()) {
      addToast('Introduce un Page Access Token válido', 'error')
      return
    }
    setConnecting(true)
    try {
      const res = await API('/api/facebook', token, {
        method: 'POST',
        body: JSON.stringify({ action: 'manual-token', pageToken: pageToken.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const connRes = await API('/api/connectivity', token)
        if (connRes.ok) useAppStore.getState().setConnections(await connRes.json())
        setTokenDialogOpen(false)
        setPageToken('')
        if (data.missingPerms?.length) {
          addToast(`Facebook conectado pero faltan permisos: ${data.missingPerms.join(', ')}`, 'error')
        } else {
          addToast(`Facebook conectado: ${data.pageName}`, 'success')
        }
      } else {
        addToast(data.error || 'Error conectando Facebook', 'error')
      }
    } catch { addToast('Error de conexión', 'error') } finally { setConnecting(false) }
  }

  const disconnectFacebook = async () => {
    if (!token) return
    setDisconnecting('facebook')
    try {
      await API('/api/facebook', token, { method: 'POST', body: JSON.stringify({ action: 'disconnect' }) })
      const connRes = await API('/api/connectivity', token)
      if (connRes.ok) useAppStore.getState().setConnections(await connRes.json())
      addToast('Facebook desconectado', 'success')
    } catch { addToast('Error al desconectar', 'error') } finally { setDisconnecting(null) }
  }

  const tokenSteps = [
    { num: 1, title: 'Abre Graph API Explorer', desc: 'Ve a developers.facebook.com/tools/explorer — inicia sesión con la cuenta que administra tu Página.' },
    { num: 2, title: 'Selecciona tu App', desc: 'En el menú desplegable "Meta App" elige la aplicación que tienes creada (o crea una nueva en developers.facebook.com/apps).' },
    { num: 3, title: 'Cambia a "Page Access Token"', desc: 'Justo debajo de "Meta App", cambia el selector de "User Token" a "Page Access Token" y elige tu Página.' },
    { num: 4, title: 'Añade los permisos requeridos', desc: 'Haz clic en "Add a Permission" y añade: pages_messaging · pages_read_engagement · pages_manage_metadata · pages_manage_posts. Los tres primeros son para mensajes; pages_manage_posts es necesario para publicar propiedades en el feed.' },
    { num: 5, title: 'Genera el token', desc: 'Haz clic en "Generate Access Token". Facebook te pedirá autorización — acepta todos los permisos.' },
    { num: 6, title: 'Copia y pega el token', desc: 'Copia el token generado (empieza por EAA...), cierra esta guía y pégalo en "Conectar con Token".' },
  ]

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-zinc-800/30 animate-pulse" />)}
      </div>
    )
  }

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Conectividad</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gestiona tus canales de comunicación</p>
      </div>

      {/* Connected Facebook Info Banner */}
      {isConnected && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <CheckCircle className="size-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-blue-300 flex items-center gap-2">
                Facebook conectado
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Activo
                </span>
              </h3>
              {fbConnection?.pageName && (
                <p className="text-xs text-muted-foreground mt-1">Página: {fbConnection.pageName}</p>
              )}
              {fbConnection?.connectedAt && (
                <p className="text-[10px] text-zinc-500 mt-0.5">Conectado {timeAgo(fbConnection.connectedAt)}</p>
              )}
            </div>
            <Button size="sm" variant="outline"
              onClick={() => navigate('messages')}
              className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10 rounded-lg shrink-0">
              <MessageCircle className="size-3.5 mr-1.5" /> Ver mensajes
            </Button>
          </div>
        </motion.div>
      )}

      {/* Provider List */}
      <div className="space-y-3">
        {/* Facebook */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-xl border border-white/10 bg-gradient-to-r from-blue-600/20 to-blue-800/10 bg-card/60 p-4 hover:bg-card/80 transition-all">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              isConnected ? 'bg-emerald-500/20 shadow-lg shadow-emerald-500/10' : 'bg-zinc-700/50'
            }`}>
              <Facebook className={`size-5 transition-colors ${isConnected ? 'text-emerald-400' : 'text-blue-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm text-foreground">Facebook Messenger</h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase tracking-wider">Real</span>
                <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full transition-all ${
                  isConnected
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-500/15 text-zinc-500 border border-zinc-500/30'
                }`}>
                  <motion.span
                    animate={isConnected ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-zinc-500'}`}
                  />
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Lee y responde mensajes de tu Página de Facebook</p>
              {fbConnection?.pageName && (
                <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1">
                  <CheckCircle className="size-3" /> {fbConnection.pageName}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {!isConnected && (
                <Button variant="ghost" size="sm" onClick={() => setGuideOpen(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                  <Info className="size-3 mr-1" /> Guía
                </Button>
              )}
              {isConnected ? (
                <Button variant="outline" size="sm"
                  onClick={disconnectFacebook}
                  disabled={disconnecting === 'facebook'}
                  className="rounded-lg text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 active:scale-[0.97] transition-transform">
                  {disconnecting === 'facebook' ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                  Desconectar
                </Button>
              ) : (
                <Button size="sm"
                  onClick={() => setTokenDialogOpen(true)}
                  className="rounded-lg text-xs bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.97] transition-transform">
                  <Key className="size-3.5 mr-1.5" /> Conectar con Token
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* WhatsApp — coming soon */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-white/10 bg-gradient-to-r from-green-600/20 to-green-800/10 bg-card/60 p-4 opacity-60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-700/50 flex items-center justify-center">
              <Phone className="size-5 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-foreground">WhatsApp Business</h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-500/20 text-zinc-500 uppercase tracking-wider">Pronto</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">WhatsApp Business API (próximamente)</p>
            </div>
            <Button variant="default" size="sm" disabled
              className="rounded-lg text-xs bg-amber-500 hover:bg-amber-600 text-white opacity-50">
              Conectar
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Guide Dialog */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-300">
              <Facebook className="size-5" />
              Cómo obtener tu Page Access Token
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Sigue estos pasos para obtener el token de acceso de tu Página de Facebook
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {tokenSteps.map((step) => (
              <div key={step.num} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-400">{step.num}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="size-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-blue-300">Permisos obligatorios para Mensajes</p>
                <div className="flex flex-wrap gap-1.5">
                  {['pages_messaging', 'pages_read_engagement', 'pages_manage_metadata', 'pages_manage_posts'].map(p => (
                    <code key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">{p}</code>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 pt-1">
                  Sin estos permisos el token conecta pero no puede leer conversaciones de Messenger.
                </p>
              </div>
            </div>
            <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-medium">
              <ExternalLink className="size-3.5" /> Abrir Graph API Explorer
            </a>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setGuideOpen(false)} className="rounded-lg">Cerrar</Button>
            <Button onClick={() => { setGuideOpen(false); setTokenDialogOpen(true) }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              <Key className="size-4 mr-2" /> Conectar con Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Input Dialog */}
      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="size-5 text-blue-400" />
              Conectar Facebook con Page Token
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Pega tu Page Access Token de Meta Business Suite
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="page-token" className="text-sm font-medium text-foreground">Page Access Token</Label>
              <Input
                id="page-token"
                value={pageToken}
                onChange={(e) => setPageToken(e.target.value)}
                placeholder="EAAxxxxxxxxx..."
                className="h-10 rounded-lg bg-zinc-800/50 border-white/10 text-sm font-mono"
              />
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Genera el token en{' '}
                <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-0.5">
                  Graph API Explorer <ExternalLink className="size-2.5" />
                </a>
                . Selecciona tu App → Page Access Token → tu Página → añade{' '}
                <code className="text-blue-300">pages_messaging</code>,{' '}
                <code className="text-blue-300">pages_read_engagement</code> y{' '}
                <code className="text-blue-300">pages_manage_posts</code> → Generate Token.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
            <div className="flex items-start gap-2">
              <Shield className="size-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-400">
                El token se almacena de forma segura en la base de datos local. Se verifica con la API de Facebook antes de guardarse.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setTokenDialogOpen(false); setPageToken('') }} className="rounded-lg">
              Cancelar
            </Button>
            <Button onClick={connectWithToken} disabled={connecting || !pageToken.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              {connecting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
              {connecting ? 'Verificando...' : 'Conectar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
