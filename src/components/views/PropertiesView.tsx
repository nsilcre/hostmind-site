'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Trash2, Star, X,
  Loader2, Clock, Euro, MapPin,
  Bed, Bath, UsersRound, Building, Upload, Pencil
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger
} from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { useToasts } from '@/components/shared/ToastProvider'
import { API, fadeIn, staggerContainer, slideUp, propertyStatusLabel, propertyTypeIcon, propertyTypeLabel } from '@/components/shared/helpers'

export default function PropertiesView() {
  const { token, properties, setProperties, navigate } = useAppStore()
  const { addToast } = useToasts()
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editProp, setEditProp] = useState<typeof properties[0] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const emptyForm = { name: '', city: '', type: 'apartment', bedrooms: 1, bathrooms: 1, guests: 2, pricePerNight: 50, minimumStay: 1, petsAllowed: false, description: '', amenities: '', imageUrl: '', depositAmount: 0, cleaningFee: 0, extraGuestFee: 0, checkInTime: '15:00', checkOutTime: '11:00', cancellationPolicy: 'flexible', houseRules: '' }
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  const fetchProperties = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await API('/api/properties', token)
      if (res.ok) setProperties(await res.json())
    } catch { addToast('Error al cargar propiedades', 'error') } finally { setLoading(false) }
  }

  useEffect(() => { fetchProperties() }, [token])

  const uploadImage = async (file: File, onSuccess: (url: string) => void) => {
    if (!token) return
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await res.json()
      if (res.ok) onSuccess(data.url)
      else addToast(data.error || 'Error al subir imagen', 'error')
    } catch { addToast('Error al subir imagen', 'error') } finally { setUploadingImage(false) }
  }

  const openEditDialog = (prop: typeof properties[0]) => {
    let amenitiesStr = ''
    try { amenitiesStr = prop.amenities ? JSON.parse(prop.amenities).join(', ') : '' } catch { /* empty */ }
    let imageUrl = ''
    try { const imgs = prop.images ? JSON.parse(prop.images) : []; imageUrl = imgs[0] || '' } catch { /* empty */ }
    setEditProp(prop)
    setEditForm({
      name: prop.name,
      city: prop.city || '',
      type: prop.type,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      guests: prop.guests,
      pricePerNight: prop.pricePerNight,
      minimumStay: prop.minimumStay,
      petsAllowed: prop.petsAllowed,
      description: prop.description || '',
      amenities: amenitiesStr,
      imageUrl,
      depositAmount: (prop as unknown as Record<string, unknown>).depositAmount as number || 0,
      cleaningFee: (prop as unknown as Record<string, unknown>).cleaningFee as number || 0,
      extraGuestFee: (prop as unknown as Record<string, unknown>).extraGuestFee as number || 0,
      checkInTime: (prop as unknown as Record<string, unknown>).checkInTime as string || '15:00',
      checkOutTime: (prop as unknown as Record<string, unknown>).checkOutTime as string || '11:00',
      cancellationPolicy: (prop as unknown as Record<string, unknown>).cancellationPolicy as string || 'flexible',
      houseRules: (prop as unknown as Record<string, unknown>).houseRules as string || '',
    })
    setEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editProp || !editForm.name || !token) return
    setUpdating(true)
    try {
      const amenities = editForm.amenities.split(',').map(a => a.trim()).filter(Boolean)
      const res = await API(`/api/properties/${editProp.id}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name,
          city: editForm.city || null,
          type: editForm.type,
          bedrooms: editForm.bedrooms,
          bathrooms: editForm.bathrooms,
          guests: editForm.guests,
          pricePerNight: editForm.pricePerNight,
          description: editForm.description || null,
          amenities: amenities.length > 0 ? amenities : [],
          petsAllowed: editForm.petsAllowed,
          minimumStay: editForm.minimumStay,
          images: editForm.imageUrl ? [editForm.imageUrl] : [],
          depositAmount: editForm.depositAmount || null,
          cleaningFee: editForm.cleaningFee || null,
          extraGuestFee: editForm.extraGuestFee || null,
          checkInTime: editForm.checkInTime || null,
          checkOutTime: editForm.checkOutTime || null,
          cancellationPolicy: editForm.cancellationPolicy || null,
          houseRules: editForm.houseRules || null,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setProperties(properties.map(p => p.id === editProp.id ? { ...p, ...updated } : p))
        setEditDialogOpen(false)
        setEditProp(null)
        addToast('Propiedad actualizada', 'success')
      } else {
        const data = await res.json()
        addToast(data.error || 'Error al actualizar', 'error')
      }
    } catch { addToast('Error al actualizar propiedad', 'error') } finally { setUpdating(false) }
  }

  const handleCreate = async () => {
    if (!form.name || !token) return
    setSubmitting(true)
    try {
      const amenities = form.amenities.split(',').map(a => a.trim()).filter(Boolean)
      const res = await API('/api/properties', token, {
        method: 'POST',
        body: JSON.stringify({
          name: form.name, city: form.city || null, type: form.type,
          bedrooms: form.bedrooms, bathrooms: form.bathrooms, guests: form.guests,
          pricePerNight: form.pricePerNight, description: form.description || null,
          amenities: amenities.length > 0 ? amenities : undefined,
          petsAllowed: form.petsAllowed, minimumStay: form.minimumStay,
          images: form.imageUrl ? [form.imageUrl] : undefined,
          depositAmount: form.depositAmount || null,
          cleaningFee: form.cleaningFee || null,
          extraGuestFee: form.extraGuestFee || null,
          checkInTime: form.checkInTime || null,
          checkOutTime: form.checkOutTime || null,
          cancellationPolicy: form.cancellationPolicy || null,
          houseRules: form.houseRules || null,
        }),
      })
      if (res.ok) {
        setProperties([await res.json(), ...properties])
        setDialogOpen(false)
        setForm(emptyForm)
        addToast('Propiedad creada', 'success')
      }
    } catch { addToast('Error al crear propiedad', 'error') } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!token) return
    try {
      const res = await API(`/api/properties/${id}`, token, { method: 'DELETE' })
      if (res.ok) { setProperties(properties.filter(p => p.id !== id)); addToast(`${name} eliminada`, 'success') }
    } catch { addToast('Error al eliminar', 'error') }
  }

  const filtered = properties.filter(p => statusFilter === 'ALL' || p.status === statusFilter)

  const statusFilters = [
    { id: 'ALL', label: 'Todas', emoji: '🏠' },
    { id: 'active', label: 'Activas', emoji: '✅' },
    { id: 'inactive', label: 'Inactivas', emoji: '⚪' },
    { id: 'maintenance', label: 'Mantenimiento', emoji: '🔧' },
  ]

  return (
    <motion.div {...fadeIn} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Propiedades</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{properties.length} propiedades registradas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl active:scale-[0.97] transition-transform">
              <Plus className="size-4" /> Nueva propiedad
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-white/10 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nueva Propiedad</DialogTitle>
              <DialogDescription className="text-zinc-400">Añade una nueva propiedad a tu inventario</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-sm text-zinc-300 mb-1 block">Nombre *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre de la propiedad" className="bg-zinc-800/50 border-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Ciudad</Label>
                  <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Madrid" className="bg-zinc-800/50 border-white/10" />
                </div>
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Tipo</Label>
                  <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full h-10 rounded-md bg-zinc-800/50 border border-white/10 text-sm text-zinc-200 px-3">
                    <option value="apartment">Apartamento</option>
                    <option value="house">Casa</option>
                    <option value="villa">Villa</option>
                    <option value="studio">Estudio</option>
                    <option value="room">Habitación</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Dormitorios</Label>
                  <Input type="number" min={1} value={form.bedrooms} onChange={(e) => setForm(f => ({ ...f, bedrooms: parseInt(e.target.value) || 1 }))} className="bg-zinc-800/50 border-white/10" />
                </div>
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Baños</Label>
                  <Input type="number" min={1} value={form.bathrooms} onChange={(e) => setForm(f => ({ ...f, bathrooms: parseInt(e.target.value) || 1 }))} className="bg-zinc-800/50 border-white/10" />
                </div>
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Huéspedes</Label>
                  <Input type="number" min={1} value={form.guests} onChange={(e) => setForm(f => ({ ...f, guests: parseInt(e.target.value) || 2 }))} className="bg-zinc-800/50 border-white/10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Precio por noche (€)</Label>
                  <Input type="number" min={1} value={form.pricePerNight} onChange={(e) => setForm(f => ({ ...f, pricePerNight: parseInt(e.target.value) || 50 }))} className="bg-zinc-800/50 border-white/10" />
                </div>
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Mín. noches de estancia</Label>
                  <Input type="number" min={1} value={form.minimumStay} onChange={(e) => setForm(f => ({ ...f, minimumStay: parseInt(e.target.value) || 1 }))} className="bg-zinc-800/50 border-white/10" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 border border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm text-zinc-200 font-medium">Mascotas permitidas</p>
                  <p className="text-xs text-zinc-500">El asistente informará al cliente de esta política</p>
                </div>
                <Switch checked={form.petsAllowed} onCheckedChange={(v) => setForm(f => ({ ...f, petsAllowed: v }))} className="data-[state=checked]:bg-amber-500" />
              </div>
              <div>
                <Label className="text-sm text-zinc-300 mb-1 block">Descripción</Label>
                <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe tu propiedad..." rows={2} className="bg-zinc-800/50 border-white/10" />
              </div>
              <div>
                <Label className="text-sm text-zinc-300 mb-1 block">Servicios (separados por coma)</Label>
                <Input value={form.amenities} onChange={(e) => setForm(f => ({ ...f, amenities: e.target.value }))} placeholder="WiFi, A/C, Piscina..." className="bg-zinc-800/50 border-white/10" />
              </div>
              <div className="border-t border-white/10 pt-3">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Precios y condiciones</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-zinc-300 mb-1 block">Depósito / fianza (€)</Label>
                    <Input type="number" min={0} value={form.depositAmount} onChange={(e) => setForm(f => ({ ...f, depositAmount: parseFloat(e.target.value) || 0 }))} placeholder="0" className="bg-zinc-800/50 border-white/10" />
                  </div>
                  <div>
                    <Label className="text-sm text-zinc-300 mb-1 block">Tarifa de limpieza (€)</Label>
                    <Input type="number" min={0} value={form.cleaningFee} onChange={(e) => setForm(f => ({ ...f, cleaningFee: parseFloat(e.target.value) || 0 }))} placeholder="0" className="bg-zinc-800/50 border-white/10" />
                  </div>
                  <div>
                    <Label className="text-sm text-zinc-300 mb-1 block">Extra por huésped (€)</Label>
                    <Input type="number" min={0} value={form.extraGuestFee} onChange={(e) => setForm(f => ({ ...f, extraGuestFee: parseFloat(e.target.value) || 0 }))} placeholder="0" className="bg-zinc-800/50 border-white/10" />
                  </div>
                  <div>
                    <Label className="text-sm text-zinc-300 mb-1 block">Política de cancelación</Label>
                    <select value={form.cancellationPolicy} onChange={(e) => setForm(f => ({ ...f, cancellationPolicy: e.target.value }))} className="w-full h-10 rounded-md bg-zinc-800/50 border border-white/10 text-sm text-foreground px-3">
                      <option value="flexible">Flexible (24h)</option>
                      <option value="moderate">Moderada (5 días)</option>
                      <option value="strict">Estricta (7 días)</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm text-zinc-300 mb-1 block">Check-in</Label>
                    <Input type="time" value={form.checkInTime} onChange={(e) => setForm(f => ({ ...f, checkInTime: e.target.value }))} className="bg-zinc-800/50 border-white/10" />
                  </div>
                  <div>
                    <Label className="text-sm text-zinc-300 mb-1 block">Check-out</Label>
                    <Input type="time" value={form.checkOutTime} onChange={(e) => setForm(f => ({ ...f, checkOutTime: e.target.value }))} className="bg-zinc-800/50 border-white/10" />
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-sm text-zinc-300 mb-1 block">Normas de la casa</Label>
                  <Textarea value={form.houseRules} onChange={(e) => setForm(f => ({ ...f, houseRules: e.target.value }))} placeholder="No fiestas, no fumar, silencio después de las 22h..." rows={2} className="bg-zinc-800/50 border-white/10" />
                </div>
              </div>
              <div>
                <Label className="text-sm text-zinc-300 mb-1 block">Foto de portada</Label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, url => setForm(prev => ({ ...prev, imageUrl: url }))) }} />
                {form.imageUrl ? (
                  <div className="relative rounded-lg overflow-hidden h-28 bg-zinc-800">
                    <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setForm(f => ({ ...f, imageUrl: '' }))} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80">
                      <X className="size-3" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}
                    className="w-full h-20 rounded-lg border-2 border-dashed border-white/10 bg-zinc-800/30 hover:bg-zinc-800/60 flex flex-col items-center justify-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
                    {uploadingImage ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
                    <span className="text-xs">{uploadingImage ? 'Subiendo...' : 'Subir foto (JPG, PNG, WebP · máx. 5 MB)'}</span>
                  </button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-zinc-400">Cancelar</Button>
              <Button onClick={handleCreate} disabled={!form.name || submitting} className="bg-amber-500 hover:bg-amber-600 text-white">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Propiedad</DialogTitle>
            <DialogDescription className="text-zinc-400">Modifica los datos de {editProp?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-sm text-zinc-300 mb-1 block">Nombre *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre de la propiedad" className="bg-zinc-800/50 border-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-zinc-300 mb-1 block">Ciudad</Label>
                <Input value={editForm.city} onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))} placeholder="Madrid" className="bg-zinc-800/50 border-white/10" />
              </div>
              <div>
                <Label className="text-sm text-zinc-300 mb-1 block">Tipo</Label>
                <select value={editForm.type} onChange={(e) => setEditForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full h-10 rounded-md bg-zinc-800/50 border border-white/10 text-sm text-zinc-200 px-3">
                  <option value="apartment">Apartamento</option>
                  <option value="house">Casa</option>
                  <option value="villa">Villa</option>
                  <option value="studio">Estudio</option>
                  <option value="room">Habitación</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm text-zinc-300 mb-1 block">Dormitorios</Label>
                <Input type="number" min={1} value={editForm.bedrooms} onChange={(e) => setEditForm(f => ({ ...f, bedrooms: parseInt(e.target.value) || 1 }))} className="bg-zinc-800/50 border-white/10" />
              </div>
              <div>
                <Label className="text-sm text-zinc-300 mb-1 block">Baños</Label>
                <Input type="number" min={1} value={editForm.bathrooms} onChange={(e) => setEditForm(f => ({ ...f, bathrooms: parseInt(e.target.value) || 1 }))} className="bg-zinc-800/50 border-white/10" />
              </div>
              <div>
                <Label className="text-sm text-zinc-300 mb-1 block">Huéspedes</Label>
                <Input type="number" min={1} value={editForm.guests} onChange={(e) => setEditForm(f => ({ ...f, guests: parseInt(e.target.value) || 2 }))} className="bg-zinc-800/50 border-white/10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-zinc-300 mb-1 block">Precio por noche (€)</Label>
                <Input type="number" min={1} value={editForm.pricePerNight} onChange={(e) => setEditForm(f => ({ ...f, pricePerNight: parseInt(e.target.value) || 50 }))} className="bg-zinc-800/50 border-white/10" />
              </div>
              <div>
                <Label className="text-sm text-zinc-300 mb-1 block">Mín. noches de estancia</Label>
                <Input type="number" min={1} value={editForm.minimumStay} onChange={(e) => setEditForm(f => ({ ...f, minimumStay: parseInt(e.target.value) || 1 }))} className="bg-zinc-800/50 border-white/10" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 border border-white/10 px-4 py-3">
              <div>
                <p className="text-sm text-zinc-200 font-medium">Mascotas permitidas</p>
                <p className="text-xs text-zinc-500">El asistente informará al cliente de esta política</p>
              </div>
              <Switch checked={editForm.petsAllowed} onCheckedChange={(v) => setEditForm(f => ({ ...f, petsAllowed: v }))} className="data-[state=checked]:bg-amber-500" />
            </div>
            <div>
              <Label className="text-sm text-zinc-300 mb-1 block">Descripción</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe tu propiedad..." rows={2} className="bg-zinc-800/50 border-white/10" />
            </div>
            <div>
              <Label className="text-sm text-zinc-300 mb-1 block">Servicios (separados por coma)</Label>
              <Input value={editForm.amenities} onChange={(e) => setEditForm(f => ({ ...f, amenities: e.target.value }))} placeholder="WiFi, A/C, Piscina..." className="bg-zinc-800/50 border-white/10" />
            </div>
            <div className="border-t border-white/10 pt-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Precios y condiciones</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Depósito / fianza (€)</Label>
                  <Input type="number" min={0} value={editForm.depositAmount} onChange={(e) => setEditForm(f => ({ ...f, depositAmount: parseFloat(e.target.value) || 0 }))} placeholder="0" className="bg-zinc-800/50 border-white/10" />
                </div>
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Tarifa de limpieza (€)</Label>
                  <Input type="number" min={0} value={editForm.cleaningFee} onChange={(e) => setEditForm(f => ({ ...f, cleaningFee: parseFloat(e.target.value) || 0 }))} placeholder="0" className="bg-zinc-800/50 border-white/10" />
                </div>
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Extra por huésped (€)</Label>
                  <Input type="number" min={0} value={editForm.extraGuestFee} onChange={(e) => setEditForm(f => ({ ...f, extraGuestFee: parseFloat(e.target.value) || 0 }))} placeholder="0" className="bg-zinc-800/50 border-white/10" />
                </div>
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Política de cancelación</Label>
                  <select value={editForm.cancellationPolicy} onChange={(e) => setEditForm(f => ({ ...f, cancellationPolicy: e.target.value }))} className="w-full h-10 rounded-md bg-zinc-800/50 border border-white/10 text-sm text-foreground px-3">
                    <option value="flexible">Flexible (24h)</option>
                    <option value="moderate">Moderada (5 días)</option>
                    <option value="strict">Estricta (7 días)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Check-in</Label>
                  <Input type="time" value={editForm.checkInTime} onChange={(e) => setEditForm(f => ({ ...f, checkInTime: e.target.value }))} className="bg-zinc-800/50 border-white/10" />
                </div>
                <div>
                  <Label className="text-sm text-zinc-300 mb-1 block">Check-out</Label>
                  <Input type="time" value={editForm.checkOutTime} onChange={(e) => setEditForm(f => ({ ...f, checkOutTime: e.target.value }))} className="bg-zinc-800/50 border-white/10" />
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-sm text-zinc-300 mb-1 block">Normas de la casa</Label>
                <Textarea value={editForm.houseRules} onChange={(e) => setEditForm(f => ({ ...f, houseRules: e.target.value }))} placeholder="No fiestas, no fumar, silencio después de las 22h..." rows={2} className="bg-zinc-800/50 border-white/10" />
              </div>
            </div>
            <div>
              <Label className="text-sm text-zinc-300 mb-1 block">Foto de portada</Label>
              <input ref={editFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, url => setEditForm(prev => ({ ...prev, imageUrl: url }))) }} />
              {editForm.imageUrl ? (
                <div className="relative rounded-lg overflow-hidden h-28 bg-zinc-800">
                  <img src={editForm.imageUrl} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setEditForm(f => ({ ...f, imageUrl: '' }))} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80">
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <button onClick={() => editFileInputRef.current?.click()} disabled={uploadingImage}
                  className="w-full h-20 rounded-lg border-2 border-dashed border-white/10 bg-zinc-800/30 hover:bg-zinc-800/60 flex flex-col items-center justify-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
                  {uploadingImage ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
                  <span className="text-xs">{uploadingImage ? 'Subiendo...' : 'Subir foto (JPG, PNG, WebP · máx. 5 MB)'}</span>
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-zinc-400">Cancelar</Button>
            <Button onClick={handleUpdate} disabled={!editForm.name || updating} className="bg-amber-500 hover:bg-amber-600 text-white">
              {updating ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />} Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {statusFilters.map(f => (
          <motion.button key={f.id} whileTap={{ scale: 0.95 }}
            onClick={() => setStatusFilter(f.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
              statusFilter === f.id ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10'
            }`}>
            <span>{f.emoji}</span><span>{f.label}</span>
          </motion.button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border border-white/10 bg-card/50 p-4">
              <Skeleton className="h-32 w-full rounded-lg bg-zinc-800 mb-3" />
              <Skeleton className="h-5 w-40 bg-zinc-800 mb-2" />
              <Skeleton className="h-3 w-24 bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building className="size-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No hay propiedades</p>
          <p className="text-sm text-zinc-500 mt-1">{statusFilter !== 'ALL' ? 'No hay propiedades con este estado' : 'Añade tu primera propiedad'}</p>
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((prop, i) => {
            const statusInfo = propertyStatusLabel(prop.status)
            let amenitiesList: string[] = []
            try { amenitiesList = prop.amenities ? JSON.parse(prop.amenities) : [] } catch { /* empty */ }

            let imageUrl: string | null = null
            try { const imgs = prop.images ? JSON.parse(prop.images) : []; imageUrl = imgs[0] || null } catch { /* empty */ }

            return (
              <motion.div key={prop.id} variants={slideUp} transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-white/10 bg-card/60 hover:bg-card/80 transition-all group overflow-hidden relative">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
                </div>
                <div className="relative h-32 bg-gradient-to-br from-zinc-800 to-zinc-700 flex items-center justify-center cursor-pointer"
                  onClick={() => navigate('property-detail', { propertyId: prop.id })}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={prop.name} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        prop.type === 'apartment' ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                        prop.type === 'villa' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                        prop.type === 'studio' ? 'bg-gradient-to-r from-cyan-400 to-cyan-600' :
                        prop.type === 'house' ? 'bg-gradient-to-r from-rose-400 to-rose-600' :
                        'bg-gradient-to-r from-zinc-400 to-zinc-600'
                      }`} />
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-2">
                          {propertyTypeIcon(prop.type)}
                        </div>
                        <p className="text-xs text-zinc-400">{propertyTypeLabel(prop.type)}</p>
                      </div>
                    </>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.cls}`}>{statusInfo.label}</span>
                  </div>
                </div>

                <div className="p-4 cursor-pointer" onClick={() => navigate('property-detail', { propertyId: prop.id })}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground text-sm line-clamp-1">{prop.name}</h3>
                    <div className="flex items-center gap-1 text-amber-400 shrink-0">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`size-3 ${s <= Math.round(prop.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`} />
                        ))}
                      </div>
                      <span className="text-xs font-medium">{prop.rating?.toFixed(1) || '—'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <MapPin className="size-3" />
                    <span>{prop.city || 'Sin ubicación'}</span>
                    <span className="text-zinc-600">·</span>
                    <span>{prop.country}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
                    <span className="flex items-center gap-1"><Bed className="size-3" />{prop.bedrooms}</span>
                    <span className="flex items-center gap-1"><Bath className="size-3" />{prop.bathrooms}</span>
                    <span className="flex items-center gap-1"><UsersRound className="size-3" />{prop.guests}</span>
                    <span className="flex items-center gap-1"><Clock className="size-3" />Mín. {prop.minimumStay}n</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${prop.petsAllowed ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-zinc-500 border-zinc-700 bg-zinc-800/50'}`}>
                      {prop.petsAllowed ? '🐾 Mascotas ✓' : '🚫 Sin mascotas'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div className="flex items-center gap-1">
                      <Euro className="size-4 text-emerald-400" />
                      <span className="text-lg font-bold text-foreground">{prop.pricePerNight}</span>
                      <span className="text-xs text-zinc-500">/noche</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditDialog(prop) }}
                        className="h-7 w-7 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-all">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(prop.id, prop.name) }}
                        className="h-7 w-7 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
