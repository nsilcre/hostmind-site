import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/app/api/auth/route'

// GET /api/export?type=clients|bookings|revenue&format=csv|json
export async function GET(req: NextRequest) {
  try {
    // Auth check
    const session = getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'clients'
    const format = (searchParams.get('format') || 'csv').toLowerCase()

    if (!['clients', 'bookings', 'revenue'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de exportación no válido. Usa: clients, bookings, revenue' },
        { status: 400 }
      )
    }
    if (!['csv', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'Formato no válido. Usa: csv, json' },
        { status: 400 }
      )
    }

    const dateStr = new Date().toISOString().split('T')[0]
    const baseFilename = `hostmind_${type}_${dateStr}`

    if (type === 'clients') {
      const clients = await db.client.findMany({ orderBy: { createdAt: 'desc' } })
      const rows = clients.map((c) => ({
        nombre: c.name,
        email: c.email || '',
        telefono: c.phone || '',
        canal: c.channel,
        estado: c.status,
        puntuacion: c.score ?? '',
        clasificacion: c.scoreLabel || '',
        fechaRegistro: c.createdAt.toISOString().split('T')[0],
      }))

      if (format === 'json') {
        return jsonResponse(rows, baseFilename)
      }
      return csvResponse(
        ['Nombre', 'Email', 'Teléfono', 'Canal', 'Estado', 'Puntuación', 'Clasificación', 'Fecha Registro'],
        rows.map((r) => [r.nombre, r.email, r.telefono, r.canal, r.estado, r.puntuacion, r.clasificacion, r.fechaRegistro]),
        baseFilename
      )
    }

    if (type === 'bookings') {
      const bookings = await db.booking.findMany({ orderBy: { startDate: 'desc' } })
      const rows = bookings.map((b) => ({
        titulo: b.title,
        fechaInicio: b.startDate,
        fechaFin: b.endDate,
        estado: b.status,
        precio: b.price ?? 0,
        fechaCreacion: b.createdAt.toISOString().split('T')[0],
      }))

      if (format === 'json') {
        return jsonResponse(rows, baseFilename)
      }
      return csvResponse(
        ['Título', 'Fecha Inicio', 'Fecha Fin', 'Estado', 'Precio (€)', 'Fecha Creación'],
        rows.map((r) => [r.titulo, r.fechaInicio, r.fechaFin, r.estado, r.precio, r.fechaCreacion]),
        baseFilename
      )
    }

    if (type === 'revenue') {
      // Monthly revenue summary from bookings
      const bookings = await db.booking.findMany({
        where: { price: { gt: 0 } },
        orderBy: { startDate: 'desc' },
      })

      // Group by month
      const monthlyMap: Record<string, { total: number; count: number }> = {}
      for (const b of bookings) {
        const month = b.startDate.substring(0, 7) // "YYYY-MM"
        if (!monthlyMap[month]) monthlyMap[month] = { total: 0, count: 0 }
        monthlyMap[month].total += b.price ?? 0
        monthlyMap[month].count += 1
      }

      const rows = Object.entries(monthlyMap)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, data]) => ({
          mes: month,
          totalReservas: data.count,
          ingresos: Math.round(data.total * 100) / 100,
        }))

      if (format === 'json') {
        return jsonResponse(rows, baseFilename)
      }
      return csvResponse(
        ['Mes', 'Total Reservas', 'Ingresos (€)'],
        rows.map((r) => [r.mes, r.totalReservas, r.ingresos]),
        baseFilename
      )
    }

    return NextResponse.json({ error: 'Tipo no soportado' }, { status: 400 })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Error al exportar datos' }, { status: 500 })
  }
}

function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // If the value contains a comma, double-quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values.map(escapeCsvField).join(',')
}

function csvResponse(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  baseFilename: string
) {
  const lines = [buildCsvRow(headers), ...rows.map(buildCsvRow)]
  const csv = lines.join('\n') + '\n'
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${baseFilename}.csv"`,
    },
  })
}

function jsonResponse(data: unknown[], baseFilename: string) {
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${baseFilename}.json"`,
    },
  })
}
