import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/app/api/auth/route'

// GET /api/reviews - List reviews
export async function GET(req: NextRequest) {
  if (!getSessionFromRequest(req)) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  try {
    const reviews = await db.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

    return NextResponse.json({ reviews, avgRating, total: reviews.length })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ error: 'Error al cargar reseñas' }, { status: 500 })
  }
}

// POST /api/reviews - Create review
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { guestName, propertyId, propertyName, rating, comment, source } = body

    if (!guestName || !rating) {
      return NextResponse.json({ error: 'Nombre y puntuación son obligatorios' }, { status: 400 })
    }

    const review = await db.review.create({
      data: {
        guestName,
        propertyId: propertyId || null,
        propertyName: propertyName || null,
        rating: Math.min(5, Math.max(1, rating)),
        comment: comment || null,
        source: source || 'direct',
        response: null,
      },
    })

    await db.activityLog.create({
      data: {
        type: 'review_received',
        title: `Nueva reseña de ${guestName}`,
        content: `${rating} estrellas${propertyName ? ` para ${propertyName}` : ''}`,
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json({ error: 'Error al crear reseña' }, { status: 500 })
  }
}

// PUT /api/reviews - Respond to review
export async function PUT(req: NextRequest) {
  try {
    const { id, response } = await req.json()
    if (!id || !response) {
      return NextResponse.json({ error: 'ID y respuesta son obligatorios' }, { status: 400 })
    }

    const review = await db.review.update({
      where: { id },
      data: { response, respondedAt: new Date() },
    })

    return NextResponse.json(review)
  } catch (error) {
    console.error('Error responding to review:', error)
    return NextResponse.json({ error: 'Error al responder reseña' }, { status: 500 })
  }
}
