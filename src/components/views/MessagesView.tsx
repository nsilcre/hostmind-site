'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronRight, RefreshCw,
  Facebook, X,
  Loader2,
  MessageSquare, Search,
  ExternalLink, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/store'
import { useToasts } from '@/components/shared/ToastProvider'
import { API, fadeIn, staggerContainer, slideUp, timeAgo } from '@/components/shared/helpers'
import FacebookChatView from './FacebookChatView'

interface FBConversation {
  id: string
  snippet: string
  updatedTime: string
  unreadCount: number
  participant: { id: string; name: string | null; pictureUrl: string | null } | null
  isPageParticipant: boolean
  messages: {
    id: string
    message: string
    from: { id: string; name: string }
    createdTime: string
    attachments: unknown[]
    isFromPage: boolean
  }[]
}

export default function MessagesView() {
  const { navigate, token, connections, clients } = useAppStore()
  const { addToast } = useToasts()

  const [fbConversations, setFbConversations] = useState<FBConversation[]>([])
  const [fbLoading, setFbLoading] = useState(false)
  const [fbPermError, setFbPermError] = useState(false)
  const [selectedFbConv, setSelectedFbConv] = useState<FBConversation | null>(null)
  const [fbSearch, setFbSearch] = useState('')

  const isFbConnected = connections['facebook']?.connected ?? false
  const fbDemoClients = clients.filter(c => c.channel?.toLowerCase() === 'facebook')

  const fetchFbConversations = useCallback(async () => {
    if (!token || !isFbConnected) return
    setFbLoading(true)
    try {
      const res = await API('/api/facebook?action=conversations', token)
      const data = await res.json()
      if (res.ok) {
        setFbConversations(data.conversations || [])
        setFbPermError(false)
      } else if (data.code === 'TOKEN_EXPIRED') {
        addToast('Token de Facebook expirado. Reconecta tu cuenta.', 'error')
      } else if (data.code === 'INSUFFICIENT_PERMISSIONS') {
        setFbPermError(true)
      } else {
        addToast(data.error || 'Error cargando conversaciones', 'error')
      }
    } catch {
      addToast('Error de conexión con Facebook', 'error')
    } finally {
      setFbLoading(false)
    }
  }, [token, isFbConnected])

  useEffect(() => {
    if (!isFbConnected || !token) return
    fetchFbConversations()
    const interval = setInterval(fetchFbConversations, 15000)
    return () => clearInterval(interval)
  }, [isFbConnected, fetchFbConversations, token])

  useEffect(() => {
    if (!isFbConnected || !token) return
    const autoReply = () =>
      API('/api/facebook?action=auto-reply', token)
        .then(r => r.json())
        .then(d => { if (d.processed > 0) { fetchFbConversations(); } })
        .catch(() => {})
    autoReply()
    const interval = setInterval(autoReply, 15000)
    return () => clearInterval(interval)
  }, [isFbConnected, token, fetchFbConversations])

  const filteredFbConversations = fbConversations.filter(c => {
    if (fbSearch && !c.participant?.name?.toLowerCase().includes(fbSearch.toLowerCase()) &&
        !c.snippet?.toLowerCase().includes(fbSearch.toLowerCase())) return false
    return true
  })

  if (selectedFbConv) {
    return (
      <FacebookChatView
        conversation={selectedFbConv}
        onBack={() => { setSelectedFbConv(null); fetchFbConversations() }}
        token={token}
      />
    )
  }

  return (
    <motion.div {...fadeIn} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mensajes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Conversaciones de Facebook Messenger</p>
        </div>
        {isFbConnected && !fbPermError && (
          <Button variant="ghost" size="icon" onClick={fetchFbConversations} disabled={fbLoading}
            className="rounded-xl hover:bg-white/10">
            <RefreshCw className={`size-4 ${fbLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      {!isFbConnected ? (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-2.5 text-xs text-blue-400">
            <Facebook className="size-3.5 shrink-0" />
            <span className="flex-1">Conecta tu página de Facebook para recibir mensajes en tiempo real.</span>
            <Button size="sm" onClick={() => navigate('connectivity')}
              className="h-6 text-[10px] px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shrink-0">
              Conectar
            </Button>
          </div>

          {fbDemoClients.length === 0 ? (
            <motion.div {...fadeIn} className="text-center py-12">
              <MessageSquare className="size-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">No hay conversaciones</p>
              <p className="text-xs text-zinc-500 mt-1">Los mensajes de tu página de Facebook aparecerán aquí</p>
            </motion.div>
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
              {fbDemoClients.map((client, i) => {
                const profile = client.profile ? (() => { try { return JSON.parse(client.profile!) } catch { return {} } })() : {}
                const summary = client.summary || profile?.purpose || 'Sin mensajes'
                return (
                  <motion.div
                    key={client.id}
                    variants={slideUp}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate('chat', { clientId: client.id })}
                    className="flex items-center gap-3 rounded-xl border border-blue-500/10 bg-card/60 hover:bg-card/80 p-3.5 cursor-pointer transition-all active:scale-[0.98] group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Facebook className="size-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-foreground truncate">{client.name}</h3>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20 shrink-0">FB</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{summary}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{timeAgo(client.createdAt)}</p>
                    </div>
                    <ChevronRight className="size-4 text-zinc-500 group-hover:text-blue-400 transition-colors shrink-0" />
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </>
      ) : fbPermError ? (
        <motion.div {...fadeIn} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold text-sm text-amber-300">Token sin permisos de Messenger</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                El token guardado no tiene <code className="text-amber-300 bg-amber-500/10 px-1 rounded">pages_messaging</code>. Debes generar un nuevo token con ese permiso.
              </p>
              <div className="rounded-lg bg-zinc-800/60 border border-white/8 p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-zinc-300">Pasos rápidos:</p>
                <ol className="space-y-1">
                  {[
                    'Ve a developers.facebook.com/tools/explorer',
                    'Selecciona tu App → Page Access Token → tu Página',
                    'Añade: pages_messaging · pages_read_engagement',
                    'Genera el token y cópialo',
                    'En Conectividad: Desconecta → Conectar con Token → pega el nuevo',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-400">
                      <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-zinc-700/60 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors border border-white/10">
              <ExternalLink className="size-3.5" /> Graph API Explorer
            </a>
            <Button onClick={() => navigate('connectivity')} size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs">
              <Facebook className="size-3.5" /> Ir a Conectividad
            </Button>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <Input
              placeholder="Buscar conversaciones..."
              value={fbSearch}
              onChange={(e) => setFbSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-zinc-800/50 border-white/10 text-sm"
            />
            {fbSearch && (
              <button onClick={() => setFbSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="size-3.5 text-zinc-500 hover:text-zinc-300" />
              </button>
            )}
          </div>

          {fbLoading && fbConversations.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-zinc-800/30 animate-pulse" />)}
            </div>
          ) : filteredFbConversations.length === 0 ? (
            <motion.div {...fadeIn} className="text-center py-12">
              <MessageSquare className="size-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">
                {fbSearch ? 'Sin resultados' : 'No hay conversaciones'}
              </p>
              {!fbSearch && (
                <p className="text-xs text-zinc-500 mt-1">
                  Los mensajes de tu página de Facebook aparecerán aquí
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
              {filteredFbConversations.map((conv, i) => (
                <motion.div
                  key={conv.id}
                  variants={slideUp}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedFbConv(conv)}
                  className="flex items-center gap-3 rounded-xl border border-blue-500/10 bg-card/60 hover:bg-card/80 p-3.5 cursor-pointer transition-all active:scale-[0.98] group"
                >
                  <div className="w-10 h-10 rounded-full shrink-0 relative">
                    {conv.participant?.pictureUrl ? (
                      <img src={conv.participant.pictureUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Facebook className="size-5 text-blue-400" />
                      </div>
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-bold">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {conv.participant?.name || 'Usuario de Facebook'}
                      </h3>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20 shrink-0">
                        FB
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.snippet || 'Sin mensajes'}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {timeAgo(conv.updatedTime)}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-zinc-500 group-hover:text-blue-400 transition-colors shrink-0" />
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  )
}
