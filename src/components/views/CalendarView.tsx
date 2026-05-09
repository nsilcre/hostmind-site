'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2, Building, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger
} from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { useToasts } from '@/components/shared/ToastProvider'
import { API, fadeIn, MONTHS_ES, DAYS_ES } from '@/components/shared/helpers'

export default function CalendarView() {
  const { token, bookings, setBookings, properties, calYear, calMonth, setCalMonth } = useAppStore()
  const { addToast } = useToasts()
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formPropertyId, setFormPropertyId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchBookings = async () => {
    if (!token) return
    try {
      const res = await API('/api/bookings', token)
      if (res.ok) setBookings(await res.json())
    } catch { addToast('Error al cargar reservas', 'error') } finally { setLoading(false) }
  }

  useEffect(() => { fetchBookings() }, [token])

  const handleCreate = async () => {
    if (!formTitle || !formStart || !formEnd || !token) return
    setSubmitting(true)
    try {
      const res = await API('/api/bookings', token, {
        method: 'POST',
        body: JSON.stringify({
          title: formTitle, startDate: formStart, endDate: formEnd,
          notes: formNotes || null, propertyId: formPropertyId || null,
        }),
      })
      if (res.ok) {
        setBookings([...bookings, await res.json()])
        setDialogOpen(false)
        setFormTitle(''); setFormStart(''); setFormEnd(''); setFormNotes(''); setFormPropertyId('')
        addToast('Reserva creada', 'success')
      }
    } catch { addToast('Error al crear reserva', 'error') } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    try {
      const res = await API(`/api/bookings/${id}`, token, { method: 'DELETE' })
      if (res.ok) { setBookings(bookings.filter((b) => b.id !== id)); addToast('Reserva eliminada', 'success') }
    } catch { addToast('Error al eliminar', 'error') }
  }

  const prevMonth = () => setCalMonth(calMonth === 0 ? calYear - 1 : calYear, calMonth === 0 ? 11 : calMonth - 1)
  const nextMonth = () => setCalMonth(calMonth === 11 ? calYear + 1 : calYear, calMonth === 11 ? 0 : calMonth + 1)

  const firstDay = new Date(calYear, calMonth, 1)
  const lastDay = new Date(calYear, calMonth + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const bookedDays = new Set<string>()
  bookings.forEach((b) => {
    const start = new Date(b.startDate)
    const end = new Date(b.endDate)
    const current = new Date(start)
    while (current <= end) {
      bookedDays.add(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`)
      current.setDate(current.getDate() + 1)
    }
  })

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <motion.div {...fadeIn} className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl active:scale-[0.97] transition-transform">
              <Plus className="size-4" /> Nueva reserva
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nueva Reserva</DialogTitle>
              <DialogDescription className="text-zinc-400">Añade una nueva reserva al calendario</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-sm text-zinc-300 mb-1 block">Propiedad</Label>
                <select
                  value={formPropertyId}
                  onChange={(e) => setFormPropertyId(e.target.value)}
                  className="w-full h-10 rounded-md bg-zinc-800/50 border border-white/10 text-sm text-zinc-200 px-3"
                >
                  <option value="">— Sin propiedad asignada —</option>
                  {properties.filter(p => p.status === 'active').map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.city ? ` · ${p.city}` : ''}</option>
                  ))}
                  {properties.filter(p => p.status !== 'active').length > 0 && (
                    <>
                      <option disabled>── Inactivas ──</option>
                      {properties.filter(p => p.status !== 'active').map(p => (
                        <option key={p.id} value={p.id}>{p.name}{p.city ? ` · ${p.city}` : ''}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div>
                <Label className="text-sm text-zinc-300 mb-1 block">Título / Huésped</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Nombre del huésped" className="bg-zinc-800/50 border-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Inicio</Label>
                  <Input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="bg-zinc-800/50 border-white/10" />
                </div>
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Fin</Label>
                  <Input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="bg-zinc-800/50 border-white/10" />
                </div>
              </div>
              <div>
                <Label className="text-sm text-zinc-300 mb-1 block">Notas</Label>
                <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notas opcionales..." rows={2} className="bg-zinc-800/50 border-white/10" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-zinc-400">Cancelar</Button>
              <Button onClick={handleCreate} disabled={!formTitle || !formStart || !formEnd || submitting} className="bg-amber-500 hover:bg-amber-600 text-white">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-card/60 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-lg hover:bg-white/10"><ChevronLeft className="size-4" /></Button>
        <h2 className="font-semibold text-foreground">{MONTHS_ES[calMonth]} {calYear}</h2>
        <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-lg hover:bg-white/10"><ChevronRight className="size-4" /></Button>
      </div>

      <div className="rounded-xl border border-white/10 bg-card/60 p-3">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_ES.map((d) => (<div key={d} className="text-center text-xs font-medium text-zinc-500 py-1">{d}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="h-9" />
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isBooked = bookedDays.has(dateStr)
            const isToday = dateStr === todayStr
            return (
              <div key={day} className={`h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                isToday ? 'bg-amber-500 text-white font-bold shadow-sm shadow-amber-500/30' : isBooked ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400 hover:bg-white/5'
              }`}>{day}</div>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-400 px-1">Reservas</h3>
        {loading ? (
          <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : bookings.length === 0 ? (
          <p className="text-center text-sm text-zinc-500 py-6">No hay reservas</p>
        ) : (
          bookings.map((b) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-card/60 p-3 group">
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                <Calendar className="size-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{b.title}</p>
                {b.property && (
                  <p className="text-xs text-amber-400 font-medium flex items-center gap-1 truncate">
                    <Building className="size-3 shrink-0" />{b.property.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(b.startDate).toLocaleDateString('es-ES')} → {new Date(b.endDate).toLocaleDateString('es-ES')}
                </p>
                {b.notes && <p className="text-xs text-zinc-500 mt-0.5 truncate">{b.notes}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}
                className="rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <Trash2 className="size-4" />
              </Button>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  )
}
