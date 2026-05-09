'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, Bot, HandMetal, Send, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/store'
import { useToasts } from '@/components/shared/ToastProvider'
import { API, fadeIn } from '@/components/shared/helpers'

export default function ChatView() {
  const { clients, viewParams, navigate, token, chatMessages, setChatMessages, activeChatId, setActiveChat } = useAppStore()
  const { addToast } = useToasts()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const client = clients.find((c) => c.id === viewParams.clientId)

  useEffect(() => {
    const fetchMessages = async () => {
      if (!viewParams.clientId || !token) return
      try {
        const res = await API(`/api/messages/${viewParams.clientId}`, token)
        if (res.ok) {
          setChatMessages(await res.json())
          setActiveChat(viewParams.clientId)
        }
      } catch {
        addToast('Error al cargar mensajes', 'error')
      }
    }
    fetchMessages()
    return () => { setChatMessages([]); setActiveChat(null) }
  }, [viewParams.clientId, token])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  const sendMessage = async () => {
    if (!input.trim() || !token || !client) return
    const msg = input.trim()
    setInput('')
    setSending(true)
    try {
      const res = await API(`/api/manual-reply/${client.id}`, token, {
        method: 'POST',
        body: JSON.stringify({ message: msg }),
      })
      if (res.ok) {
        setChatMessages([...chatMessages, { id: `temp-${Date.now()}`, clientId: client.id, role: 'owner', content: msg, createdAt: new Date().toISOString() }])
      } else {
        addToast('Error al enviar mensaje', 'error')
      }
    } catch { addToast('Error de conexión', 'error') } finally { setSending(false); inputRef.current?.focus() }
  }

  const handleTakeControl = async () => {
    if (!client || !token) return
    try {
      const res = await API(`/api/action/${client.id}`, token, { method: 'POST', body: JSON.stringify({ action: 'manual' }) })
      if (res.ok) {
        const data = await res.json()
        if (data.client) {
          useAppStore.getState().setClients(clients.map((c) => (c.id === client.id ? { ...c, ...data.client } : c)))
        }
        addToast('Modo manual activado', 'success')
      }
    } catch { addToast('Error', 'error') }
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <MessageSquare className="size-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">Conversación no encontrada</p>
      </div>
    )
  }

  return (
    <motion.div {...fadeIn} className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 pb-3 border-b border-white/10 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('messages')} className="rounded-xl hover:bg-white/10 shrink-0">
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-foreground truncate">{client.name}</h2>
          <div className="flex items-center gap-1.5">
            {client.isManual ? (
              <span className="text-xs text-amber-400 font-medium flex items-center gap-1"><HandMetal className="size-3" /> Manual</span>
            ) : (
              <span className="text-xs text-blue-400 font-medium flex items-center gap-1"><Bot className="size-3" /> IA Activa</span>
            )}
          </div>
        </div>
        {!client.isManual && (
          <Button onClick={handleTakeControl} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg shrink-0 active:scale-[0.97] transition-transform">
            <HandMetal className="size-3.5" />
            <span className="hidden sm:inline">TOMAR CONTROL</span>
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-thin">
        {chatMessages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="size-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No hay mensajes</p>
          </div>
        ) : (
          chatMessages.map((msg, i) => {
            const isUser = msg.role === 'user'
            const isOwner = msg.role === 'owner'
            const isAI = msg.role === 'assistant'
            return (
              <motion.div key={msg.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className={`flex ${isUser || isOwner ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isAI ? 'bg-white/10 text-foreground rounded-tl-sm' : isOwner ? 'bg-amber-500 text-white rounded-br-sm' : 'bg-zinc-800 text-zinc-200 rounded-tr-sm'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isAI ? 'text-zinc-500' : isOwner ? 'text-amber-200/60' : 'text-zinc-500'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {client.isManual && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-300 flex items-center gap-2 shrink-0">
          <HandMetal className="size-3.5 shrink-0" />
          Modo manual activo — tus mensajes se envían directamente al cliente
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-white/10 shrink-0">
        <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={client.isManual ? 'Escribe tu mensaje...' : 'Activa modo manual para escribir'}
          disabled={!client.isManual || sending}
          className="flex-1 h-11 rounded-xl bg-zinc-800/50 border-white/10" />
        <Button onClick={sendMessage} disabled={!input.trim() || !client.isManual || sending} size="icon"
          className="h-11 w-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shrink-0 active:scale-95 transition-transform">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </motion.div>
  )
}
