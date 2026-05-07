import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { verifyToken } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  try {
    const rawToken = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
    const session  = rawToken ? verifyToken(rawToken) : null

    const [adminHash, ownerHash] = await Promise.all([
      bcrypt.hash('admin123', 12),
      bcrypt.hash('owner123', 12),
    ])
    await Promise.all([
      db.user.upsert({
        where:  { username: 'admin' },
        create: { username: 'admin', password: adminHash, name: 'Administrador', role: 'admin' },
        update: {},
      }),
      db.user.upsert({
        where:  { username: 'owner' },
        create: { username: 'owner', password: ownerHash, name: 'Propietario Demo', role: 'owner' },
        update: {},
      }),
    ])

    if (session?.username === 'admin') {
      await clearAllOperationalData()
    } else if (session?.username === 'owner') {
      await seedDemoData()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Error al inicializar' }, { status: 500 })
  }
}

async function clearAllOperationalData() {
  await db.propertyBooking.deleteMany({})
  await db.booking.deleteMany({})
  await db.message.deleteMany({})
  await db.client.deleteMany({})
  await db.activityLog.deleteMany({})
  await db.notification.deleteMany({})
  await db.property.deleteMany({})
  await db.aIConfig.deleteMany({})
  await db.connection.deleteMany({})
}

async function seedDemoData() {
  const owner = await db.user.findUnique({ where: { username: 'owner' } })
  if (!owner) return

  // Solo seed si no hay propiedades (evita duplicar en cada login)
  const existing = await db.property.count()
  if (existing > 0) return

  await db.aIConfig.upsert({
    where:  { id: 'demo-config' },
    create: {
      id: 'demo-config',
      ownerName: 'Costa Rentals',
      greetingMessage: '¡Hola! 👋 Bienvenido a **Costa Rentals**, tu gestor de alojamientos en la Costa Mediterránea.\n\n¿En qué puedo ayudarte hoy?',
      systemPrompt: 'Eres el asistente virtual de Costa Rentals. Gestiona alquileres vacacionales en la Costa Mediterránea española. Responde siempre en español, sé amable y profesional. Promociona las propiedades disponibles y cualifica a los clientes preguntando por fechas, número de personas y motivo del viaje.',
    },
    update: {},
  })

  const props = await Promise.all([
    db.property.create({ data: {
      name: 'Apartamento Sol y Mar',
      address: 'Calle Mediterráneo 12, 3º B',
      city: 'Benidorm',
      country: 'España',
      type: 'apartment',
      bedrooms: 2, bathrooms: 1, guests: 4,
      pricePerNight: 85,
      description: 'Luminoso apartamento a 200m de la playa. Terraza con vistas al mar, cocina equipada y AC. Wifi de alta velocidad incluido.',
      amenities: JSON.stringify(['WiFi', 'Aire acondicionado', 'Terraza', 'Cocina equipada', 'TV', 'Lavadora']),
      status: 'active',
      petsAllowed: false, minimumStay: 3,
      depositAmount: 200, cleaningFee: 50,
      checkInTime: '16:00', checkOutTime: '11:00',
      cancellationPolicy: 'moderate',
      houseRules: 'No se permiten fiestas ni eventos. No fumadores. Respetar el descanso nocturno a partir de las 22h.',
      rating: 4.7, totalBookings: 23, totalRevenue: 8740,
    }}),
    db.property.create({ data: {
      name: 'Villa Costa Dorada',
      address: 'Urbanización Las Palmeras s/n',
      city: 'Tarragona',
      country: 'España',
      type: 'villa',
      bedrooms: 4, bathrooms: 3, guests: 8,
      pricePerNight: 220,
      description: 'Impresionante villa con piscina privada, jardín de 800m² y vistas panorámicas. Ideal para familias y grupos. Barbacoa exterior incluida.',
      amenities: JSON.stringify(['Piscina privada', 'Jardín', 'Barbacoa', 'WiFi', 'Aire acondicionado', 'Parking', 'Lavavajillas', 'TV Satélite']),
      status: 'active',
      petsAllowed: true, minimumStay: 5,
      depositAmount: 500, cleaningFee: 120,
      extraGuestFee: 15,
      checkInTime: '17:00', checkOutTime: '10:00',
      cancellationPolicy: 'strict',
      houseRules: 'Mascotas permitidas con depósito adicional. No se permiten fiestas. Capacidad máxima 8 personas.',
      rating: 4.9, totalBookings: 11, totalRevenue: 14520,
    }}),
    db.property.create({ data: {
      name: 'Estudio Centro Barcelona',
      address: 'Carrer del Consell de Cent 278, 2º',
      city: 'Barcelona',
      country: 'España',
      type: 'studio',
      bedrooms: 0, bathrooms: 1, guests: 2,
      pricePerNight: 95,
      description: 'Moderno estudio en pleno Eixample. A 5 min del Paseo de Gracia. Perfecto para parejas o viajeros de negocios.',
      amenities: JSON.stringify(['WiFi ultrarrápido', 'Aire acondicionado', 'Escritorio', 'TV 4K', 'Cafetera Nespresso']),
      status: 'active',
      petsAllowed: false, minimumStay: 2,
      depositAmount: 150, cleaningFee: 35,
      checkInTime: '15:00', checkOutTime: '11:00',
      cancellationPolicy: 'flexible',
      houseRules: 'No fumar. Silencio a partir de las 23h.',
      rating: 4.6, totalBookings: 41, totalRevenue: 12350,
    }}),
    db.property.create({ data: {
      name: 'Casa Rural Sierra Nevada',
      address: 'Calle Olivos 5',
      city: 'Güéjar Sierra',
      country: 'España',
      type: 'house',
      bedrooms: 3, bathrooms: 2, guests: 6,
      pricePerNight: 140,
      description: 'Encantadora casa rural de piedra rehabilitada con chimenea, vistas a Sierra Nevada y jardín privado. Ideal para escapadas en familia o grupos de amigos.',
      amenities: JSON.stringify(['Chimenea', 'Jardín', 'WiFi', 'Calefacción', 'Barbacoa', 'Parking privado', 'Cocina rústica equipada']),
      status: 'maintenance',
      petsAllowed: true, minimumStay: 2,
      depositAmount: 300, cleaningFee: 80,
      checkInTime: '16:00', checkOutTime: '12:00',
      cancellationPolicy: 'moderate',
      houseRules: 'Se admiten mascotas. No se permiten eventos. Calefacción con cargo adicional en temporada baja.',
      rating: 4.8, totalBookings: 18, totalRevenue: 9240,
    }}),
  ])

  const [pSol, pVilla, pEstudio] = props


  // Cliente 1: TOP – pareja de luna de miel, aceptada
  const c1 = await db.client.create({ data: {
    name: 'María García Ruiz',
    email: 'maria.garcia@gmail.com',
    phone: '+34 612 345 678',
    channel: 'WhatsApp',
    status: 'accepted',
    score: 90, scoreLabel: 'TOP',
    scoreReasons: JSON.stringify(['✅ Departamento de precio alto', '✅ Grupo pequeño (ideal)', '✅ Motivo legítimo', '✅ Estancia larga']),
    step: 5, isManual: false,
    profile: JSON.stringify({ propertyId: pSol.id, propertyName: 'Apartamento Sol y Mar', dates: 'del 10 al 20 de agosto', nights: 10, guests: '2', purpose: 'Luna de miel', propertyPrice: 85 }),
    summary: `🏠 Apartamento Sol y Mar · 📅 del 10 al 20 de agosto · 👥 2 pax · 🌙 10 noches · 🎯 Luna de miel`,
    createdAt: daysAgo(8),
  }})
  await db.message.createMany({ data: [
    { clientId: c1.id, role: 'assistant', content: '¡Hola! 👋 Soy el asistente virtual de Costa Rentals. ¿En qué departamento estás interesada?\n\n1. *Apartamento Sol y Mar* — hasta 4 pax · 85€/noche · Mín. 3 noches\n2. *Villa Costa Dorada* — hasta 8 pax · 220€/noche · Mín. 5 noches\n3. *Estudio Centro Barcelona* — hasta 2 pax · 95€/noche · Mín. 2 noches', createdAt: daysAgo(8) },
    { clientId: c1.id, role: 'user', content: 'Hola! Me interesa el apartamento de Benidorm', createdAt: daysAgo(8) },
    { clientId: c1.id, role: 'assistant', content: '¡Excelente elección! 🏠 *Apartamento Sol y Mar*\n\n¿Qué fechas tienes en mente para tu estancia?', createdAt: daysAgo(8) },
    { clientId: c1.id, role: 'user', content: 'Del 10 al 20 de agosto', createdAt: daysAgo(8) },
    { clientId: c1.id, role: 'assistant', content: '¡Perfecto! ¿Cuántas personas sois en total? (máximo 4 personas)', createdAt: daysAgo(8) },
    { clientId: c1.id, role: 'user', content: 'Somos 2, es nuestra luna de miel 🥂', createdAt: daysAgo(8) },
    { clientId: c1.id, role: 'assistant', content: '¡Qué ilusión! 💍 ¿Cuál es el motivo principal del viaje?\n\n🚫 Recuerda que este alojamiento *no admite mascotas*.', createdAt: daysAgo(8) },
    { clientId: c1.id, role: 'user', content: 'Luna de miel, queremos desconectar y disfrutar de la playa', createdAt: daysAgo(8) },
    { clientId: c1.id, role: 'assistant', content: '¡Gracias por toda la información! 🌟 Hemos registrado tu solicitud. Un responsable revisará tu consulta y te responderá a la brevedad. ¡Hasta pronto!', createdAt: daysAgo(8) },
    { clientId: c1.id, role: 'owner', content: '¡Hola María! Perfecto, tenemos disponibilidad del 10 al 20 de agosto. El precio total sería 850€ + 50€ de limpieza + 200€ de depósito (reembolsable). ¿Te parece bien?', createdAt: daysAgo(7) },
    { clientId: c1.id, role: 'user', content: 'Perfecto! ¿Cómo procedemos para confirmar?', createdAt: daysAgo(7) },
    { clientId: c1.id, role: 'owner', content: 'Te envío los datos de pago por transferencia. Una vez recibido el depósito queda confirmada la reserva 🎉', createdAt: daysAgo(7) },
  ]})

  // Cliente 2: TOP – familia numerosa en villa
  const c2 = await db.client.create({ data: {
    name: 'Carlos López Martín',
    email: 'c.lopez@empresa.com',
    phone: '+34 678 901 234',
    channel: 'Facebook',
    status: 'accepted',
    score: 85, scoreLabel: 'TOP',
    scoreReasons: JSON.stringify(['✅ Departamento de precio alto', '✅ Motivo legítimo', '✅ Estancia larga', '⚠️ Grupo mediano']),
    step: 5, isManual: false,
    profile: JSON.stringify({ propertyId: pVilla.id, propertyName: 'Villa Costa Dorada', dates: 'del 1 al 15 de julio', nights: 14, guests: '6', purpose: 'Vacaciones familiares con los abuelos', propertyPrice: 220 }),
    summary: `🏠 Villa Costa Dorada · 📅 del 1 al 15 de julio · 👥 6 pax · 🌙 14 noches · 🎯 Vacaciones familiares`,
    createdAt: daysAgo(15),
  }})
  await db.message.createMany({ data: [
    { clientId: c2.id, role: 'assistant', content: '¡Hola! 👋 Bienvenido a Costa Rentals. ¿Qué propiedad te interesa?', createdAt: daysAgo(15) },
    { clientId: c2.id, role: 'user', content: 'La villa con piscina, somos una familia grande', createdAt: daysAgo(15) },
    { clientId: c2.id, role: 'assistant', content: '¡Excelente elección! 🏠 *Villa Costa Dorada*\n\n¿Qué fechas tienes en mente?', createdAt: daysAgo(15) },
    { clientId: c2.id, role: 'user', content: 'Del 1 al 15 de julio', createdAt: daysAgo(15) },
    { clientId: c2.id, role: 'user', content: 'Somos 6, dos adultos, tres niños y la abuela', createdAt: daysAgo(14) },
    { clientId: c2.id, role: 'assistant', content: '¡Perfecto para una familia! 🏡 ¿Cuál es el motivo del viaje?\n\n🐾 Este alojamiento *sí admite mascotas*.', createdAt: daysAgo(14) },
    { clientId: c2.id, role: 'user', content: 'Vacaciones de verano con toda la familia, llevamos también al perro', createdAt: daysAgo(14) },
    { clientId: c2.id, role: 'assistant', content: '¡Muchas gracias! 👍 Solicitud registrada. Te contactaremos pronto.', createdAt: daysAgo(14) },
    { clientId: c2.id, role: 'owner', content: 'Hola Carlos! La villa está disponible del 1 al 15 de julio. Total: 3.080€ + 120€ limpieza + 500€ depósito. Para la mascota pedimos 150€ adicionales de depósito. ¿Confirmas?', createdAt: daysAgo(13) },
    { clientId: c2.id, role: 'user', content: 'Perfecto! Hacemos la transferencia esta semana', createdAt: daysAgo(13) },
  ]})

  // Cliente 3: NORMAL – pareja corta estancia
  const c3 = await db.client.create({ data: {
    name: 'Ana Martínez Vega',
    email: 'ana.mv@hotmail.com',
    channel: 'web',
    status: 'negotiating',
    score: 65, scoreLabel: 'NORMAL',
    scoreReasons: JSON.stringify(['✅ Motivo legítimo', '⚠️ Grupo pequeño (ideal)', '⚠️ Departamento de precio medio']),
    step: 5, isManual: false,
    profile: JSON.stringify({ propertyId: pEstudio.id, propertyName: 'Estudio Centro Barcelona', dates: 'del 22 al 25 de mayo', nights: 3, guests: '2', purpose: 'Turismo', propertyPrice: 95 }),
    summary: `🏠 Estudio Centro Barcelona · 📅 del 22 al 25 de mayo · 👥 2 pax · 🌙 3 noches · 🎯 Turismo`,
    createdAt: daysAgo(3),
  }})
  await db.message.createMany({ data: [
    { clientId: c3.id, role: 'assistant', content: '¡Hola! 👋 ¿En qué propiedad estás interesada?', createdAt: daysAgo(3) },
    { clientId: c3.id, role: 'user', content: 'El estudio de Barcelona, para un fin de semana largo', createdAt: daysAgo(3) },
    { clientId: c3.id, role: 'assistant', content: '¡Perfecto! ¿Qué fechas?', createdAt: daysAgo(3) },
    { clientId: c3.id, role: 'user', content: '22 al 25 de mayo', createdAt: daysAgo(3) },
    { clientId: c3.id, role: 'assistant', content: '¿Cuántas personas sois?', createdAt: daysAgo(3) },
    { clientId: c3.id, role: 'user', content: '2 personas', createdAt: daysAgo(3) },
    { clientId: c3.id, role: 'assistant', content: '¿Motivo del viaje?', createdAt: daysAgo(3) },
    { clientId: c3.id, role: 'user', content: 'Turismo, queremos ver la Sagrada Familia y el Barrio Gótico', createdAt: daysAgo(3) },
    { clientId: c3.id, role: 'assistant', content: '¡Muchas gracias! 👍 Solicitud registrada correctamente.', createdAt: daysAgo(3) },
  ]})

  // Cliente 4: NORMAL – trabajo/negocios
  const c4 = await db.client.create({ data: {
    name: 'Roberto Sánchez Gil',
    phone: '+34 655 432 100',
    channel: 'Facebook',
    status: 'classified',
    score: 70, scoreLabel: 'NORMAL',
    scoreReasons: JSON.stringify(['✅ Motivo legítimo', '✅ Grupo pequeño (ideal)', '⚠️ Estancia muy corta']),
    step: 5, isManual: false,
    profile: JSON.stringify({ propertyId: pEstudio.id, propertyName: 'Estudio Centro Barcelona', dates: 'del 8 al 10 de junio', nights: 2, guests: '1', purpose: 'Viaje de negocios', propertyPrice: 95 }),
    summary: `🏠 Estudio Centro Barcelona · 📅 del 8 al 10 de junio · 👥 1 pax · 🌙 2 noches · 🎯 Viaje de negocios`,
    createdAt: daysAgo(5),
  }})
  await db.message.createMany({ data: [
    { clientId: c4.id, role: 'user', content: 'Hola, necesito el estudio de Barcelona para una reunión de trabajo', createdAt: daysAgo(5) },
    { clientId: c4.id, role: 'assistant', content: '¡Hola Roberto! ¿Qué fechas necesitas?', createdAt: daysAgo(5) },
    { clientId: c4.id, role: 'user', content: '8 y 9 de junio, llego el lunes por la mañana', createdAt: daysAgo(5) },
    { clientId: c4.id, role: 'assistant', content: '¿Cuántas personas?', createdAt: daysAgo(5) },
    { clientId: c4.id, role: 'user', content: 'Solo yo', createdAt: daysAgo(5) },
    { clientId: c4.id, role: 'assistant', content: '¿Motivo del viaje?', createdAt: daysAgo(5) },
    { clientId: c4.id, role: 'user', content: 'Viaje de negocios, tengo reuniones en el centro', createdAt: daysAgo(5) },
    { clientId: c4.id, role: 'assistant', content: 'Solicitud registrada 👍 Te contactaremos pronto.', createdAt: daysAgo(5) },
  ]})

  // Cliente 5: NORMAL – amigos escapada
  const c5 = await db.client.create({ data: {
    name: 'Laura Torres Blanco',
    email: 'lauratorres@gmail.com',
    channel: 'WhatsApp',
    status: 'classified',
    score: 58, scoreLabel: 'NORMAL',
    scoreReasons: JSON.stringify(['✅ Motivo legítimo', '⚠️ Grupo mediano', '✅ Estancia larga']),
    step: 5, isManual: false,
    profile: JSON.stringify({ propertyId: pVilla.id, propertyName: 'Villa Costa Dorada', dates: 'del 12 al 19 de agosto', nights: 7, guests: '5', purpose: 'Vacaciones con amigos', propertyPrice: 220 }),
    summary: `🏠 Villa Costa Dorada · 📅 del 12 al 19 de agosto · 👥 5 pax · 🌙 7 noches · 🎯 Vacaciones con amigos`,
    createdAt: daysAgo(2),
  }})
  await db.message.createMany({ data: [
    { clientId: c5.id, role: 'user', content: 'Buenas! Estamos buscando una villa para 5 amigos en agosto', createdAt: daysAgo(2) },
    { clientId: c5.id, role: 'assistant', content: '¡Hola Laura! 👋 ¿Qué propiedad os interesa?\n\n1. *Apartamento Sol y Mar* — 4 pax máx\n2. *Villa Costa Dorada* — 8 pax máx · piscina privada\n3. *Estudio Centro Barcelona* — 2 pax máx', createdAt: daysAgo(2) },
    { clientId: c5.id, role: 'user', content: 'La villa con piscina! 2', createdAt: daysAgo(2) },
    { clientId: c5.id, role: 'assistant', content: '¡Perfecta elección! ¿Qué fechas?', createdAt: daysAgo(2) },
    { clientId: c5.id, role: 'user', content: 'Del 12 al 19 de agosto, 7 noches', createdAt: daysAgo(2) },
    { clientId: c5.id, role: 'assistant', content: '¿Cuántas personas exactamente?', createdAt: daysAgo(2) },
    { clientId: c5.id, role: 'user', content: '5 amigos', createdAt: daysAgo(2) },
    { clientId: c5.id, role: 'assistant', content: '¿Motivo del viaje? 🐾 Este alojamiento sí admite mascotas.', createdAt: daysAgo(2) },
    { clientId: c5.id, role: 'user', content: 'Vacaciones de verano entre amigos, sin mascotas', createdAt: daysAgo(2) },
    { clientId: c5.id, role: 'assistant', content: 'Solicitud registrada 👍 Te contactamos pronto.', createdAt: daysAgo(2) },
  ]})

  // Cliente 6: RIESGO – grupo grande, fiesta
  const c6 = await db.client.create({ data: {
    name: 'Pedro Jiménez Castro',
    channel: 'Facebook',
    status: 'rejected',
    score: 20, scoreLabel: 'RIESGO',
    scoreReasons: JSON.stringify(['🔴 Grupo grande (riesgo)', '🔴 Posible fiesta/evento', '⚠️ Estancia muy corta']),
    step: 5, isManual: false,
    profile: JSON.stringify({ propertyId: pVilla.id, propertyName: 'Villa Costa Dorada', dates: 'del 30 al 31 de julio', nights: 1, guests: '12', purpose: 'Celebración cumpleaños', propertyPrice: 220 }),
    summary: `🏠 Villa Costa Dorada · 📅 del 30 al 31 de julio · 👥 12 pax · 🌙 1 noche · 🎯 Celebración cumpleaños`,
    createdAt: daysAgo(10),
  }})
  await db.message.createMany({ data: [
    { clientId: c6.id, role: 'user', content: 'Hola, queremos alquilar la villa para el fin de semana para una fiesta de cumpleaños', createdAt: daysAgo(10) },
    { clientId: c6.id, role: 'assistant', content: '¡Hola! ¿Qué fechas?', createdAt: daysAgo(10) },
    { clientId: c6.id, role: 'user', content: '30 de julio, solo una noche', createdAt: daysAgo(10) },
    { clientId: c6.id, role: 'assistant', content: '¿Cuántas personas sois?', createdAt: daysAgo(10) },
    { clientId: c6.id, role: 'user', content: 'Unos 12, puede que alguno más', createdAt: daysAgo(10) },
    { clientId: c6.id, role: 'assistant', content: '⚠️ Este departamento tiene capacidad máxima para *8 personas*. ¿Podéis ser menos?', createdAt: daysAgo(10) },
    { clientId: c6.id, role: 'user', content: 'No, somos los que somos para la fiesta', createdAt: daysAgo(10) },
    { clientId: c6.id, role: 'assistant', content: '¡Muchas gracias! ⚠️ Solicitud registrada. Un responsable revisará tu consulta.', createdAt: daysAgo(10) },
    { clientId: c6.id, role: 'owner', content: 'Hola Pedro, lamentablemente no podemos aceptar su solicitud. La villa tiene capacidad máxima para 8 personas y no admitimos eventos o celebraciones. Disculpe las molestias.', createdAt: daysAgo(9) },
  ]})

  // Cliente 7: RIESGO – perfil sospechoso
  const c7 = await db.client.create({ data: {
    name: 'Sofía Ruiz Morales',
    channel: 'web',
    status: 'rejected',
    score: 30, scoreLabel: 'RIESGO',
    scoreReasons: JSON.stringify(['🔴 Posible fiesta/evento', '🔴 Grupo grande (riesgo)']),
    step: 5, isManual: false,
    profile: JSON.stringify({ propertyId: pSol.id, propertyName: 'Apartamento Sol y Mar', dates: 'del 14 al 16 de junio', nights: 2, guests: '8', purpose: 'Cumpleaños', propertyPrice: 85 }),
    summary: `🏠 Apartamento Sol y Mar · 📅 del 14 al 16 de junio · 👥 8 pax · 🌙 2 noches · 🎯 Cumpleaños`,
    createdAt: daysAgo(6),
  }})
  await db.message.createMany({ data: [
    { clientId: c7.id, role: 'user', content: 'Hola necesito el apartamento de Benidorm para 8 personas el fin de semana', createdAt: daysAgo(6) },
    { clientId: c7.id, role: 'assistant', content: '¡Hola! El Apartamento Sol y Mar tiene capacidad máxima para 4 personas. ¿Podéis ajustar el número?', createdAt: daysAgo(6) },
    { clientId: c7.id, role: 'user', content: 'No, somos 8 para un cumpleaños', createdAt: daysAgo(6) },
    { clientId: c7.id, role: 'assistant', content: '⚠️ Lamentablemente no es posible alojar a 8 personas en ese apartamento. Te recomiendo la Villa Costa Dorada para grupos grandes.', createdAt: daysAgo(6) },
  ]})

  // Cliente 8: Pendiente (recién llegado)
  const c8 = await db.client.create({ data: {
    name: 'Miguel Fernández Ortiz',
    channel: 'Facebook',
    status: 'pending',
    step: 1, isManual: false,
    createdAt: hoursAgo(3),
  }})
  await db.message.createMany({ data: [
    { clientId: c8.id, role: 'assistant', content: '¡Hola! 👋 Soy el asistente de Costa Rentals. ¿En qué propiedad estás interesado?\n\n1. *Apartamento Sol y Mar* — Benidorm · 4 pax · 85€/noche\n2. *Villa Costa Dorada* — Tarragona · 8 pax · 220€/noche\n3. *Estudio Centro Barcelona* — Barcelona · 2 pax · 95€/noche', createdAt: hoursAgo(3) },
    { clientId: c8.id, role: 'user', content: 'Hola, me gustaría información sobre el apartamento de Benidorm', createdAt: hoursAgo(2) },
    { clientId: c8.id, role: 'assistant', content: '¡Perfecto! *Apartamento Sol y Mar* en Benidorm. ¿Qué fechas tienes en mente?', createdAt: hoursAgo(2) },
  ]})

  // Cliente 9: Pendiente (recién llegado, sin responder)
  const c9 = await db.client.create({ data: {
    name: 'Elena Gómez Pascual',
    email: 'elena.gomez@outlook.com',
    channel: 'web',
    status: 'pending',
    step: 0, isManual: false,
    createdAt: hoursAgo(1),
  }})
  await db.message.createMany({ data: [
    { clientId: c9.id, role: 'assistant', content: '¡Hola Elena! 👋 Soy el asistente de Costa Rentals. ¿En qué propiedad estás interesada?', createdAt: hoursAgo(1) },
    { clientId: c9.id, role: 'user', content: 'Buenas! Vi vuestro anuncio en Facebook. Quería preguntar por disponibilidad en agosto', createdAt: hoursAgo(1) },
  ]})

  // Cliente 10: Manual (pesado, transferido)
  const c10 = await db.client.create({ data: {
    name: 'Jorge Silva Prado',
    phone: '+34 699 111 222',
    channel: 'WhatsApp',
    status: 'classified',
    score: 45, scoreLabel: 'NORMAL',
    step: 5, isManual: true,
    profile: JSON.stringify({ propertyId: pSol.id, dates: 'sin confirmar', guests: '3', purpose: 'vacaciones' }),
    summary: `🏠 Apartamento Sol y Mar · 📅 sin confirmar · 👥 3 pax · 🎯 Vacaciones`,
    createdAt: daysAgo(1),
  }})
  await db.message.createMany({ data: [
    { clientId: c10.id, role: 'user', content: 'Hola, cuánto cuesta el apartamento por semana?', createdAt: daysAgo(1) },
    { clientId: c10.id, role: 'assistant', content: 'Hola! El Apartamento Sol y Mar está a 85€/noche. Para una semana (7 noches) serían 595€ + limpieza. ¿Te interesa?', createdAt: daysAgo(1) },
    { clientId: c10.id, role: 'user', content: 'Es muy caro, me hacéis precio?', createdAt: daysAgo(1) },
    { clientId: c10.id, role: 'user', content: 'Y el wifi funciona bien? Y tiene parking? Y se puede llevar el perro? Y...', createdAt: daysAgo(1) },
    { clientId: c10.id, role: 'user', content: 'Oye pero es que yo necesito saber si hay descuento para última hora también', createdAt: hoursAgo(4) },
  ]})

  await db.booking.createMany({ data: [
    { clientId: c1.id, propertyId: pSol.id, title: 'María García – Luna de miel', startDate: '2026-08-10', endDate: '2026-08-20', status: 'confirmed', price: 900, notes: 'Check-in 17:00. Champán de bienvenida solicitado.' },
    { clientId: c2.id, propertyId: pVilla.id, title: 'Carlos López – Familia', startDate: '2026-07-01', endDate: '2026-07-15', status: 'confirmed', price: 3350, notes: 'Llevan perro labrador. Reservar zona barbacoa.' },
    { clientId: c3.id, propertyId: pEstudio.id, title: 'Ana Martínez – Turismo BCN', startDate: '2026-05-22', endDate: '2026-05-25', status: 'pending', price: 285 },
    { clientId: c4.id, propertyId: pEstudio.id, title: 'Roberto Sánchez – Negocios', startDate: '2026-06-08', endDate: '2026-06-10', status: 'pending', price: 190 },
    { propertyId: pSol.id, title: 'Reserva directa – Cliente alemán (Booking)', startDate: '2026-06-15', endDate: '2026-06-22', status: 'confirmed', price: 620, notes: 'Gestión a través de Booking.com' },
    { propertyId: pVilla.id, title: 'Reserva Airbnb – Familia francesa', startDate: '2026-07-18', endDate: '2026-07-25', status: 'confirmed', price: 1650, notes: 'Airbnb ID: HM-2847' },
  ]})

  await db.propertyBooking.createMany({ data: [
    { propertyId: pSol.id, guestName: 'María García', startDate: '2026-08-10', endDate: '2026-08-20', status: 'confirmed', totalPrice: 900 },
    { propertyId: pVilla.id, guestName: 'Carlos López', startDate: '2026-07-01', endDate: '2026-07-15', status: 'confirmed', totalPrice: 3350 },
    { propertyId: pEstudio.id, guestName: 'Ana Martínez', startDate: '2026-05-22', endDate: '2026-05-25', status: 'pending', totalPrice: 285 },
    { propertyId: pSol.id, guestName: 'Klaus Müller', startDate: '2026-06-15', endDate: '2026-06-22', status: 'confirmed', totalPrice: 620, notes: 'Booking.com' },
    { propertyId: pVilla.id, guestName: 'Famille Dupont', startDate: '2026-07-18', endDate: '2026-07-25', status: 'confirmed', totalPrice: 1650, notes: 'Airbnb' },
    { propertyId: pEstudio.id, guestName: 'Yuki Tanaka', startDate: '2026-04-05', endDate: '2026-04-10', status: 'completed', totalPrice: 475 },
    { propertyId: pSol.id, guestName: 'Sarah Johnson', startDate: '2026-03-20', endDate: '2026-03-27', status: 'completed', totalPrice: 640 },
  ]})

  await db.activityLog.createMany({ data: [
    { type: 'client_created', title: 'Nuevo lead: Elena Gómez', content: 'Canal: Web · Sin clasificar', createdAt: hoursAgo(1) },
    { type: 'client_created', title: 'Nuevo lead: Miguel Fernández', content: 'Canal: Facebook · En conversación', createdAt: hoursAgo(3) },
    { type: 'message_sent', title: 'Mensaje enviado a Jorge Silva', content: 'Transferido a gestión manual', createdAt: hoursAgo(4) },
    { type: 'client_created', title: 'Lead clasificado: Laura Torres', content: 'Puntuación: 58 · NORMAL · Villa Costa Dorada', createdAt: daysAgo(2) },
    { type: 'booking_created', title: 'Nueva reserva: Ana Martínez', content: 'Estudio Centro Barcelona · 22–25 Mayo · 285€', createdAt: daysAgo(3) },
    { type: 'client_created', title: 'Lead clasificado: Roberto Sánchez', content: 'Puntuación: 70 · NORMAL · Estudio Barcelona', createdAt: daysAgo(5) },
    { type: 'client_created', title: 'Lead RIESGO rechazado: Sofía Ruiz', content: 'Motivo: grupo grande + evento', createdAt: daysAgo(6) },
    { type: 'property_created', title: 'Check-out completado: Estudio BCN', content: 'Yuki Tanaka · 5 noches · 475€ cobrados', createdAt: daysAgo(7) },
    { type: 'action_taken', title: 'Reserva confirmada: María García', content: 'Apartamento Sol y Mar · Agosto 10–20 · 900€', createdAt: daysAgo(7) },
    { type: 'client_created', title: 'Lead TOP aceptado: María García', content: 'Puntuación: 90 · Luna de miel · 10 noches', createdAt: daysAgo(8) },
    { type: 'client_created', title: 'Lead RIESGO rechazado: Pedro Jiménez', content: 'Motivo: fiesta + sobrecapacidad', createdAt: daysAgo(10) },
    { type: 'booking_created', title: 'Reserva Airbnb: Famille Dupont', content: 'Villa Costa Dorada · 18–25 Jul · 1.650€', createdAt: daysAgo(12) },
    { type: 'action_taken', title: 'Reserva confirmada: Carlos López', content: 'Villa Costa Dorada · Jul 1–15 · 3.350€', createdAt: daysAgo(13) },
    { type: 'client_created', title: 'Lead TOP aceptado: Carlos López', content: 'Puntuación: 85 · Familia · 14 noches', createdAt: daysAgo(15) },
    { type: 'property_updated', title: 'Casa Rural Sierra: estado → Mantenimiento', content: 'Revisión anual de caldera e instalación eléctrica', createdAt: daysAgo(16) },
    { type: 'booking_created', title: 'Reserva Booking.com: Thomas Weber', content: 'Villa Costa Dorada · confirmada · 5 noches', createdAt: daysAgo(28) },
    { type: 'property_created', title: 'Propiedad creada: Estudio Centro Barcelona', content: 'Barcelona · 95€/noche · 2 pax', createdAt: daysAgo(60) },
    { type: 'property_created', title: 'Propiedad creada: Casa Rural Sierra Nevada', content: 'Güéjar Sierra · 140€/noche · 6 pax', createdAt: daysAgo(75) },
  ]})

  await db.notification.createMany({ data: [
    { userId: owner.id, type: 'client', title: 'Nuevo lead sin clasificar', content: 'Elena Gómez acaba de iniciar una conversación desde la web.', read: false, link: 'messages', createdAt: hoursAgo(1) },
    { userId: owner.id, type: 'message', title: 'Miguel Fernández está esperando respuesta', content: 'Interesado en el Apartamento Sol y Mar. Lleva 2 horas en conversación.', read: false, link: 'messages', createdAt: hoursAgo(2) },
    { userId: owner.id, type: 'alert', title: 'Jorge Silva: modo manual activado', content: 'El cliente ha sido transferido a gestión manual tras múltiples preguntas.', read: false, link: 'messages', createdAt: hoursAgo(4) },
    { userId: owner.id, type: 'booking', title: 'Reserva pendiente de confirmar', content: 'Ana Martínez · Estudio Barcelona · 22–25 mayo · 285€', read: true, link: 'calendar', createdAt: daysAgo(3) },
    { userId: owner.id, type: 'booking', title: 'Check-in mañana: María García', content: 'Apartamento Sol y Mar · Entrada 10 ago a las 16:00.', read: true, link: 'calendar', createdAt: daysAgo(1) },
  ]})
}


function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000)
}
