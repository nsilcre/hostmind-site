import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/app/api/auth/route'

// GET /api/properties - List all properties
export async function GET(req: NextRequest) {
  if (!getSessionFromRequest(req)) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    const properties = await db.property.findMany({ where, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(properties)
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json({ error: 'Error al cargar propiedades' }, { status: 500 })
  }
}

async function publishToFacebook(property: {
  name: string; city?: string | null; type: string; guests: number;
  pricePerNight: number; description?: string | null; petsAllowed: boolean; minimumStay: number
}) {
  try {
    const connection = await db.connection.findFirst({ where: { provider: 'facebook', connected: true } })
    if (!connection?.accessToken) return

    const typeLabel: Record<string, string> = {
      apartment: 'Apartamento', house: 'Casa', villa: 'Villa', studio: 'Estudio', room: 'Habitación',
    }
    const pets = property.petsAllowed ? '🐾 Mascotas permitidas' : '🚫 No se admiten mascotas'
    const minStay = property.minimumStay > 1 ? `\n🌙 Estancia mínima: ${property.minimumStay} noches` : ''
    const desc = property.description ? `\n\n${property.description}` : ''

    const message = [
      `🏠 ¡Nueva propiedad disponible! *${property.name}*`,
      ``,
      `📍 ${typeLabel[property.type] || property.type}${property.city ? ` en ${property.city}` : ''}`,
      `👥 Hasta ${property.guests} personas`,
      `💶 ${property.pricePerNight}€/noche`,
      `${pets}${minStay}${desc}`,
      ``,
      `¡Contáctanos para más información o para hacer tu reserva! 📩`,
    ].join('\n')

    await fetch(
      `https://graph.facebook.com/v21.0/${connection.pageId}/feed?access_token=${connection.accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      }
    )
  } catch (e) {
    console.error('Error auto-publishing to Facebook:', e)
  }
}

// POST /api/properties - Create property
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, address, city, country, type, bedrooms, bathrooms, guests, pricePerNight, description, amenities, petsAllowed, minimumStay, images, depositAmount, cleaningFee, extraGuestFee, checkInTime, checkOutTime, cancellationPolicy, houseRules } = body

    if (!name) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })

    const property = await db.property.create({
      data: {
        name,
        address: address || null,
        city: city || null,
        country: country || 'España',
        type: type || 'apartment',
        bedrooms: bedrooms || 1,
        bathrooms: bathrooms || 1,
        guests: guests || 2,
        pricePerNight: pricePerNight || 50,
        description: description || null,
        amenities: amenities ? JSON.stringify(amenities) : null,
        petsAllowed: petsAllowed ?? false,
        minimumStay: minimumStay || 1,
        images: images ? JSON.stringify(images) : null,
        depositAmount: depositAmount || null,
        cleaningFee: cleaningFee || null,
        extraGuestFee: extraGuestFee || null,
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
        cancellationPolicy: cancellationPolicy || null,
        houseRules: houseRules || null,
      },
    })

    await db.activityLog.create({
      data: {
        type: 'property_created',
        title: `Propiedad "${name}" creada`,
        content: `${type || 'apartamento'} en ${city || 'sin ciudad'} - ${pricePerNight || 50}€/noche`,
      },
    })

    // Facebook publishing is manual (via button in PropertiesView)

    return NextResponse.json(property, { status: 201 })
  } catch (error) {
    console.error('Error creating property:', error)
    return NextResponse.json({ error: 'Error al crear propiedad' }, { status: 500 })
  }
}
