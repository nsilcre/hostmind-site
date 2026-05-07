import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/app/api/auth/route'

export async function GET(req: NextRequest) {
  if (!getSessionFromRequest(req)) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  try {
    const clients = await db.client.findMany()
    const totalMessages = await db.message.count()
    const properties = await db.property.findMany()
    const bookings = await db.booking.findMany()

    const total = clients.length
    const byLabel: Record<string, number> = { TOP: 0, NORMAL: 0, RIESGO: 0, pending: 0 }
    const byChannel: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    let scoreSum = 0

    clients.forEach(c => {
      byLabel[c.scoreLabel || 'pending'] = (byLabel[c.scoreLabel || 'pending'] || 0) + 1
      byChannel[c.channel] = (byChannel[c.channel] || 0) + 1
      byStatus[c.status] = (byStatus[c.status] || 0) + 1
      scoreSum += c.score || 0
    })

    // Revenue stats
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.price || 0), 0)
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length
    const pendingBookings = bookings.filter(b => b.status === 'pending').length
    const completedBookings = bookings.filter(b => b.status === 'completed').length

    // Property stats
    const totalProperties = properties.length
    const activeProperties = properties.filter(p => p.status === 'active').length
    const avgOccupancy = totalProperties > 0 
      ? Math.round(properties.reduce((sum, p) => sum + p.totalBookings, 0) / totalProperties * 10) / 10 
      : 0
    const avgRating = totalProperties > 0
      ? Math.round(properties.reduce((sum, p) => sum + (p.rating || 0), 0) / totalProperties * 10) / 10
      : 0
    const propertyRevenue = properties.reduce((sum, p) => sum + p.totalRevenue, 0)

    // Monthly revenue (last 6 months from bookings)
    const monthlyRevenue: Record<string, number> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyRevenue[key] = 0
    }
    bookings.forEach(b => {
      const month = b.startDate?.substring(0, 7)
      if (month && monthlyRevenue[month] !== undefined) {
        monthlyRevenue[month] += b.price || 0
      }
    })

    return NextResponse.json({
      total,
      avgScore: total > 0 ? Math.round(scoreSum / total) : 0,
      byLabel,
      byChannel,
      byStatus,
      totalMessages,
      // Revenue
      totalRevenue,
      confirmedBookings,
      pendingBookings,
      completedBookings,
      // Properties
      totalProperties,
      activeProperties,
      avgOccupancy,
      avgRating,
      propertyRevenue,
      monthlyRevenue,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
