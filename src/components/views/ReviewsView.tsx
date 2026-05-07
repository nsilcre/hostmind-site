'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Send, Star, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { useAppStore, type Review } from '@/lib/store'
import { useToasts, ShimmerCard } from '@/components/shared/ToastProvider'
import { API, fadeIn, staggerContainer, slideUp, timeAgo } from '@/components/shared/helpers'

export default function ReviewsView() {
  const { token, reviews, setReviews } = useAppStore()
  const { addToast } = useToasts()
  const [loading, setLoading] = useState(true)
  const [avgRating, setAvgRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)

  useEffect(() => {
    const fetchReviews = async () => {
      if (!token) return
      setLoading(true)
      try {
        const res = await API('/api/reviews', token)
        if (res.ok) {
          const data = await res.json()
          setReviews(data.reviews)
          setAvgRating(data.avgRating)
          setTotalReviews(data.total)
        }
      } catch {
        addToast('Error al cargar reseñas', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchReviews()
  }, [token, setReviews, addToast])

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))
  const maxDist = Math.max(...distribution.map((d) => d.count), 1)

  const avatarGradient = (rating: number) => {
    if (rating === 5) return 'from-emerald-400 to-emerald-600'
    if (rating === 4) return 'from-blue-400 to-blue-600'
    if (rating === 3) return 'from-amber-400 to-amber-600'
    if (rating === 2) return 'from-orange-400 to-orange-600'
    return 'from-red-400 to-red-600'
  }

  const sourceBadge = (source: string) => {
    const s = source.toLowerCase()
    if (s.includes('airbnb')) return 'bg-rose-500/15 text-rose-400 border-rose-500/30'
    if (s.includes('booking')) return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
    if (s.includes('google')) return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
  }

  const openRespond = (review: Review) => {
    setSelectedReview(review)
    setResponseText(review.response || '')
    setDialogOpen(true)
  }

  const submitResponse = async () => {
    if (!token || !selectedReview || !responseText.trim()) return
    setRespondingId(selectedReview.id)
    try {
      const res = await API('/api/reviews', token, {
        method: 'PUT',
        body: JSON.stringify({ id: selectedReview.id, response: responseText.trim() }),
      })
      if (res.ok) {
        addToast('Respuesta enviada correctamente', 'success')
        setReviews(
          reviews.map((r) =>
            r.id === selectedReview.id
              ? { ...r, response: responseText.trim(), respondedAt: new Date().toISOString() }
              : r
          )
        )
        setDialogOpen(false)
      } else {
        addToast('Error al enviar respuesta', 'error')
      }
    } catch {
      addToast('Error de conexión', 'error')
    } finally {
      setRespondingId(null)
    }
  }

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`size-3.5 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`}
      />
    ))

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <ShimmerCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Reseñas
          <span className="text-base font-normal text-muted-foreground ml-2">({totalReviews})</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Opiniones de tus huéspedes</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Average Rating */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-card/60 p-5"
        >
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground">{avgRating.toFixed(1)}</div>
              <div className="flex gap-0.5 mt-1 justify-center">
                {renderStars(Math.round(avgRating))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">de 5.0</p>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground mb-2">Valoración media</div>
              {distribution.map((d) => (
                <div key={d.star} className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground w-3 text-right">{d.star}</span>
                  <Star className="size-3 text-amber-400 fill-amber-400" />
                  <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(d.count / maxDist) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.1 * (5 - d.star) }}
                      className="h-full rounded-full bg-amber-400"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-4 text-right">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-white/10 bg-card/60 p-5"
        >
          <div className="text-sm font-semibold text-foreground mb-3">Resumen</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <p className="text-lg font-bold text-emerald-400">
                {reviews.filter((r) => r.response).length}
              </p>
              <p className="text-xs text-muted-foreground">Respondidas</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-3">
              <p className="text-lg font-bold text-amber-400">
                {reviews.filter((r) => !r.response).length}
              </p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3">
              <p className="text-lg font-bold text-blue-400">
                {reviews.filter((r) => r.rating >= 4).length}
              </p>
              <p className="text-xs text-muted-foreground">Positivas (4-5★)</p>
            </div>
            <div className="rounded-lg bg-red-500/10 p-3">
              <p className="text-lg font-bold text-red-400">
                {reviews.filter((r) => r.rating <= 2).length}
              </p>
              <p className="text-xs text-muted-foreground">Negativas (1-2★)</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Star className="size-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No hay reseñas</p>
          <p className="text-sm text-zinc-500 mt-1">Las reseñas de tus huéspedes aparecerán aquí</p>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-3"
        >
          {reviews.map((review, i) => (
            <motion.div
              key={review.id}
              variants={slideUp}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-white/10 bg-card/60 p-4 hover:bg-card/80 transition-colors"
            >
              {/* Review Header */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(
                    review.rating
                  )} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                >
                  {review.guestName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground text-sm">
                      {review.guestName}
                    </h3>
                    {review.propertyName && (
                      <span className="text-xs text-muted-foreground">
                        · {review.propertyName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex gap-0.5">{renderStars(review.rating)}</div>
                    <span className="text-[10px] text-zinc-500">{timeAgo(review.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${sourceBadge(
                      review.source
                    )}`}
                  >
                    {review.source}
                  </span>
                  {review.response ? (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Respondida
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Pendiente
                    </span>
                  )}
                </div>
              </div>

              {/* Review Comment */}
              {review.comment && (
                <p className="text-sm text-zinc-300 mt-3 leading-relaxed">{review.comment}</p>
              )}

              {/* Owner Response */}
              {review.response && (
                <div className="mt-3 ml-4 pl-4 border-l-2 border-amber-500/30 rounded-r-lg bg-amber-500/5 p-3">
                  <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">
                    Respuesta del propietario
                  </p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{review.response}</p>
                  {review.respondedAt && (
                    <p className="text-[10px] text-zinc-500 mt-1">{timeAgo(review.respondedAt)}</p>
                  )}
                </div>
              )}

              {/* Respond Button */}
              {!review.response && (
                <div className="mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openRespond(review)}
                    className="text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg gap-1.5"
                  >
                    <MessageSquare className="size-3.5" />
                    Responder
                  </Button>
                </div>
              )}

              {/* Edit Response Button (already responded) */}
              {review.response && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openRespond(review)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-lg gap-1.5"
                  >
                    <RefreshCw className="size-3" />
                    Editar respuesta
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Response Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border border-white/10 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Responder a {selectedReview?.guestName}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedReview && (
                <span className="flex items-center gap-2">
                  {renderStars(selectedReview.rating)}
                  <span className="text-xs">· {selectedReview.propertyName || selectedReview.source}</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedReview?.comment && (
            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              &ldquo;{selectedReview.comment}&rdquo;
            </div>
          )}

          <Textarea
            placeholder="Escribe tu respuesta..."
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            rows={4}
            className="bg-background border-white/10 resize-none"
          />

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="rounded-lg text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={submitResponse}
              disabled={!responseText.trim() || respondingId === selectedReview?.id}
              className="rounded-lg bg-amber-500 hover:bg-amber-600 text-white gap-2"
            >
              {respondingId === selectedReview?.id ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  Enviar respuesta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
