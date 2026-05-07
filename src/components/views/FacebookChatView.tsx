'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft, Send, Facebook, Loader2,
  MessageCircle, ExternalLink, User, Bot, BotOff, CalendarCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToasts } from '@/components/shared/ToastProvider'
import { API, fadeIn, timeAgo } from '@/components/shared/helpers'

interface FBMessage {
  id: string
  message: string
  from: { id: string; name: string }
  createdTime: string
  attachments: unknown[]
  isFromPage: boolean
}

interface FBConversation {
  id: string
  snippet: string
  updatedTime: string
  unreadCount: number
  participant: { id: string; name: string | null; pictureUrl?: string | null } | null
  isPageParticipant: boolean
  messages: FBMessage[]
}

interface FacebookChatViewProps {
  conversation: FBConversation
  onBack: () => void
  token: string | null
}

export default function FacebookChatView({ conversation, onBack, token }: FacebookChatViewProps) {
  const { addToast } = useToasts()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [localMessages, setLocalMessages] = useState<FBMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [aiActive, setAiActive] = useState(true)
  const [togglingAi, setTogglingAi] = useState(false)
  const [isClassified, setIsClassified] = useState(false)
  const [clientProfile, setClientProfile] = useState<Record<string, unknown> | null>(null)
  const [confirmingBooking, setConfirmingBooking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token || !conversation.participant?.id) return
    API(`/api/facebook?action=ai-status&participantId=${conversation.participant.id}`, token)
      .then(r => r.json())
      .then(data => {
        setAiActive(data.aiActive ?? true)
        setIsClassified(data.isClassified ?? false)
        setClientProfile(data.profile ?? null)
      })
      .catch(() => {})
  }, [conversation.participant?.id, token])

  const confirmBooking = async () => {
    if (!token || !conversation.participant?.id || confirmingBooking) return
    setConfirmingBooking(true)
    try {
      const res = await API('/api/facebook', token, {
        method: 'POST',
        body: JSON.stringify({ action: 'confirm-booking', participantId: conversation.participant.id }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        addToast('Reserva confirmada y notificación enviada al cliente', 'success')
        setIsClassified(false)
        await fetchMessages()
      } else {
        addToast(data.error || 'Error al confirmar la reserva', 'error')
      }
    } catch {
      addToast('Error de conexión', 'error')
    } finally {
      setConfirmingBooking(false)
    }
  }

  const toggleAi = async () => {
    if (!token || !conversation.participant?.id || togglingAi) return
    setTogglingAi(true)
    try {
      const res = await API('/api/facebook', token, {
        method: 'POST',
        body: JSON.stringify({ action: 'toggle-ai', participantId: conversation.participant.id, participantName: conversation.participant.name }),
      })
      const data = await res.json()
      if (res.ok) {
        setAiActive(data.aiActive)
        addToast(data.aiActive ? 'IA activada para este chat' : 'IA desactivada — responde tú manualmente', 'success')
      }
    } catch { addToast('Error al cambiar estado de IA', 'error') }
    finally { setTogglingAi(false) }
  }

  useEffect(() => {
    if (!token) return
    setLoadingMessages(true)
    API(`/api/facebook?action=messages&conversationId=${conversation.id}`, token)
      .then(r => r.json())
      .then(data => { if (data.messages) setLocalMessages(data.messages) })
      .catch(() => addToast('Error cargando mensajes', 'error'))
      .finally(() => setLoadingMessages(false))
  }, [conversation.id, token])

  useEffect(() => {
    if (!token) return
    const interval = setInterval(() => {
      API(`/api/facebook?action=messages&conversationId=${conversation.id}`, token)
        .then(r => r.json())
        .then(data => {
          if (data.messages) {
            setLocalMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id))
              const newMsgs = data.messages.filter((m: FBMessage) => !existingIds.has(m.id))
              return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev
            })
          }
        })
        .catch(() => {})
    }, 8000)
    return () => clearInterval(interval)
  }, [conversation.id, token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages])

  const fetchMessages = async () => {
    if (!token) return
    const r = await API(`/api/facebook?action=messages&conversationId=${conversation.id}`, token)
    const data = await r.json()
    if (data.messages) setLocalMessages(data.messages)
  }

  const sendMessage = async () => {
    if (!input.trim() || !token || sending) return
    const msg = input.trim()
    setInput('')
    setSending(true)
    try {
      const res = await API('/api/facebook', token, {
        method: 'POST',
        body: JSON.stringify({
          action: 'send-message',
          conversationId: conversation.id,
          recipientId: conversation.participant?.id || null,
          message: msg,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        await fetchMessages()
      } else {
        addToast(data.error || 'Error enviando mensaje', 'error')
      }
    } catch {
      addToast('Error de conexión', 'error')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const formatFbTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  return (
    <motion.div {...fadeIn} className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-white/10 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl hover:bg-white/10 shrink-0">
          <ChevronLeft className="size-5" />
        </Button>
        <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden">
          {conversation.participant?.pictureUrl ? (
            <img src={conversation.participant.pictureUrl} alt="" className="w-9 h-9 object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center">
              <User className="size-4 text-blue-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground truncate">
              {conversation.participant?.name || 'Usuario de Facebook'}
            </h2>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
              FB Messenger
            </span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Facebook className="size-3" />
            Conversación de Facebook
          </p>
        </div>
        {isClassified && (
          <button
            onClick={confirmBooking}
            disabled={confirmingBooking}
            title={`Confirmar reserva: ${clientProfile?.fechas || ''}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
          >
            {confirmingBooking ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarCheck className="size-3.5" />}
            Confirmar reserva
          </button>
        )}
        <button
          onClick={toggleAi}
          disabled={togglingAi}
          title={aiActive ? 'IA activa — click para desactivar' : 'IA inactiva — click para activar'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0 ${
            aiActive
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
              : 'bg-zinc-800/60 text-zinc-500 border-white/10 hover:bg-zinc-700/60'
          }`}
        >
          {togglingAi ? <Loader2 className="size-3.5 animate-spin" /> : aiActive ? <Bot className="size-3.5" /> : <BotOff className="size-3.5" />}
          {aiActive ? 'IA ON' : 'IA OFF'}
        </button>
        <a
          href={`https://facebook.com/messages/t/${conversation.participant?.id || ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-zinc-400 hover:text-blue-400 shrink-0"
          title="Abrir en Facebook"
        >
          <ExternalLink className="size-4" />
        </a>
      </div>

      {/* Facebook Badge */}
      <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg px-3 py-2 text-xs text-blue-300 flex items-center gap-2 mt-3 shrink-0">
        <Facebook className="size-3.5 shrink-0" />
        Mensajes sincronizados con tu Página de Facebook. Los mensajes se envían en tiempo real.
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-thin">
        {loadingMessages ? (
          <div className="space-y-3 px-1">
            {[1,2,3].map(i => <div key={i} className={`h-10 rounded-2xl bg-zinc-800/40 animate-pulse ${i % 2 === 0 ? 'ml-auto w-2/3' : 'w-2/3'}`} />)}
          </div>
        ) : localMessages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="size-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No hay mensajes en esta conversación</p>
          </div>
        ) : (
          localMessages.map((msg, i) => {
            const isFromPage = msg.isFromPage
            return (
              <motion.div
                key={msg.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`flex ${isFromPage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isFromPage
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                  <div className={`flex items-center justify-between gap-2 mt-1 ${
                    isFromPage ? 'text-blue-200/60' : 'text-zinc-500'
                  }`}>
                    <span className="text-[10px]">
                      {!isFromPage && msg.from?.name ? msg.from.name : ''}
                    </span>
                    <span className="text-[10px]">
                      {formatFbTime(msg.createdTime)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/10 shrink-0">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Escribe tu respuesta de Facebook..."
          disabled={sending}
          className="flex-1 h-11 rounded-xl bg-zinc-800/50 border-white/10 text-sm"
        />
        <Button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          size="icon"
          className="h-11 w-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0 active:scale-95 transition-transform"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </motion.div>
  )
}
