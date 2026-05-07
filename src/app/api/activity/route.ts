import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/app/api/auth/route'

// GET /api/activity - List activity logs
export async function GET(req: NextRequest) {
  if (!getSessionFromRequest(req)) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  try {
    const activities = await db.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json({ error: 'Error al cargar actividades' }, { status: 500 })
  }
}

// DELETE /api/activity - Clear all activity logs
export async function DELETE(req: NextRequest) {
  if (!getSessionFromRequest(req)) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  try {
    await db.activityLog.deleteMany({})
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error al limpiar actividad' }, { status: 500 })
  }
}
