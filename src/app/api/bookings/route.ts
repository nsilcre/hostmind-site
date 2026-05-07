import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/app/api/auth/route'

export async function GET(req: NextRequest) {
  if (!getSessionFromRequest(req)) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  try {
    const bookings = await db.booking.findMany({
      orderBy: { startDate: 'asc' },
      include: { property: { select: { id: true, name: true } } },
    })
    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { clientId, propertyId, title, startDate, endDate, notes, status, price } = await req.json()
    if (!startDate || !endDate || !title) {
      return NextResponse.json({ error: 'title, startDate y endDate son requeridos' }, { status: 400 })
    }

    const booking = await db.booking.create({
      data: {
        clientId: clientId || null,
        propertyId: propertyId || null,
        title,
        startDate,
        endDate,
        notes: notes || null,
        status: status || 'confirmed',
        price: price || null,
      },
      include: { property: { select: { id: true, name: true } } },
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
