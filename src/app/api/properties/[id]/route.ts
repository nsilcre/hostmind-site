import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/properties/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const property = await db.property.findUnique({
      where: { id },
      include: {
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
    }

    return NextResponse.json(property)
  } catch (error) {
    console.error('Error fetching property:', error)
    return NextResponse.json({ error: 'Error al cargar propiedad' }, { status: 500 })
  }
}

// PUT /api/properties/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const property = await db.property.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.bedrooms !== undefined && { bedrooms: body.bedrooms }),
        ...(body.bathrooms !== undefined && { bathrooms: body.bathrooms }),
        ...(body.guests !== undefined && { guests: body.guests }),
        ...(body.pricePerNight !== undefined && { pricePerNight: body.pricePerNight }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.amenities !== undefined && { amenities: body.amenities ? JSON.stringify(body.amenities) : null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.rating !== undefined && { rating: body.rating }),
        ...(body.petsAllowed !== undefined && { petsAllowed: body.petsAllowed }),
        ...(body.minimumStay !== undefined && { minimumStay: body.minimumStay }),
        ...(body.images !== undefined && { images: Array.isArray(body.images) ? JSON.stringify(body.images) : body.images }),
        ...(body.facebookPostId !== undefined && { facebookPostId: body.facebookPostId }),
        ...(body.facebookPublishedAt !== undefined && { facebookPublishedAt: body.facebookPublishedAt ? new Date(body.facebookPublishedAt) : null }),
        ...(body.depositAmount !== undefined && { depositAmount: body.depositAmount }),
        ...(body.cleaningFee !== undefined && { cleaningFee: body.cleaningFee }),
        ...(body.extraGuestFee !== undefined && { extraGuestFee: body.extraGuestFee }),
        ...(body.checkInTime !== undefined && { checkInTime: body.checkInTime }),
        ...(body.checkOutTime !== undefined && { checkOutTime: body.checkOutTime }),
        ...(body.cancellationPolicy !== undefined && { cancellationPolicy: body.cancellationPolicy }),
        ...(body.houseRules !== undefined && { houseRules: body.houseRules }),
      },
    })

    await db.activityLog.create({
      data: {
        type: 'property_updated',
        title: `Propiedad "${property.name}" actualizada`,
      },
    })

    return NextResponse.json(property)
  } catch (error) {
    console.error('Error updating property:', error)
    return NextResponse.json({ error: 'Error al actualizar propiedad' }, { status: 500 })
  }
}

// DELETE /api/properties/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const property = await db.property.findUnique({ where: { id } })
    
    await db.property.delete({ where: { id } })

    await db.activityLog.create({
      data: {
        type: 'property_deleted',
        title: `Propiedad "${property?.name || id}" eliminada`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting property:', error)
    return NextResponse.json({ error: 'Error al eliminar propiedad' }, { status: 500 })
  }
}
