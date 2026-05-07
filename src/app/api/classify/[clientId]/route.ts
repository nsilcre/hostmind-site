import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function calculateScore(profile: Record<string, unknown>) {
  let score = 50
  const reasons: string[] = []

  const budget = parseInt(String(profile.budget)) || 0
  if (budget >= 1500) { score += 30; reasons.push('✅ Presupuesto alto') }
  else if (budget >= 800) { score += 15; reasons.push('⚠️ Presupuesto medio') }
  else if (budget > 0) { score -= 10; reasons.push('🔴 Presupuesto bajo') }

  const guests = parseInt(String(profile.guests)) || 0
  if (guests <= 2) { score += 20; reasons.push('✅ Grupo pequeño') }
  else if (guests <= 4) { score += 10; reasons.push('⚠️ Grupo mediano') }
  else { score -= 15; reasons.push('🔴 Grupo grande') }

  const purpose = String(profile.purpose || '').toLowerCase()
  if (['vacaciones', 'trabajo', 'negocios', 'turismo'].some(k => purpose.includes(k))) {
    score += 20; reasons.push('✅ Motivo legítimo')
  } else if (['fiesta', 'party'].some(k => purpose.includes(k))) {
    score -= 25; reasons.push('🔴 Posible fiesta')
  }

  const nights = parseInt(String(profile.nights)) || 0
  if (nights >= 5) score += 10

  score = Math.max(0, Math.min(100, score))
  const label = score >= 75 ? 'TOP' : score >= 45 ? 'NORMAL' : 'RIESGO'
  return { score, label, reasons }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const client = await db.client.findUnique({ where: { id: clientId } })
    if (!client) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const profile = client.profile ? JSON.parse(client.profile) : {}
    const scoring = calculateScore(profile)

    await db.client.update({
      where: { id: clientId },
      data: {
        score: scoring.score,
        scoreLabel: scoring.label,
        scoreReasons: JSON.stringify(scoring.reasons),
      },
    })

    return NextResponse.json({ scoring })
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
