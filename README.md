# HostMind

**Plataforma SaaS de gestión de alojamientos turísticos**

HostMind centraliza la gestión de propiedades, reservas, clientes y comunicación en un único panel de control. Incluye un chatbot de captación y clasificación de leads, integración con Facebook Messenger y un asistente con acceso a los datos reales del negocio.

---

## Funcionalidades

| Módulo | Descripción |
|---|---|
| **Dashboard** | Métricas en tiempo real: ingresos, ocupación, actividad reciente |
| **Propiedades** | Alta, edición y gestión con precios, normas, amenities, check-in/out y depósito |
| **Calendario** | Vista mensual de reservas por propiedad |
| **Clientes / Leads** | Clasificación automática TOP / NORMAL / RIESGO con historial de mensajes |
| **Mensajes** | Bandeja integrada con Facebook Messenger |
| **Chatbot** | Flujo de 5 pasos para captar y cualificar leads sin dependencias externas |
| **Asistente IA** | Chat interno con acceso a los datos reales del negocio (Groq / LLaMA) |
| **Conectividad** | Integración con Facebook Messenger vía webhook |
| **Exportación** | Clientes, reservas e ingresos en CSV o JSON |

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 — App Router |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS 4 + shadcn/ui |
| Base de datos | SQLite (Prisma ORM) |
| Estado global | Zustand |
| Animaciones | Framer Motion |
| Autenticación | JWT (HMAC-SHA256, implementación propia) + bcrypt |
| IA | Groq API — llama-3.3-70b-versatile |
| API externa | Facebook Graph API v21.0 |

---

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env        # Linux / macOS
copy .env.example .env      # Windows

# 3. Inicializar la base de datos
npm run db:push

# 4. Arrancar en desarrollo
npm run dev
```

Abre **http://localhost:3000**

### Variables de entorno

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET=""           # genera con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
GROQ_API_KEY=""          # https://console.groq.com
FACEBOOK_WEBHOOK_VERIFY_TOKEN=""
```

---

## Cuentas

| Usuario | Contraseña | Descripción |
|---|---|---|
| `owner` | `owner123` | Demo completo — 4 propiedades, 10 clientes y reservas de ejemplo |
| `admin` | `admin123` | Cuenta limpia — borra todos los datos de demo al iniciar sesión |

---

## Comandos

```bash
npm run dev          # Desarrollo  →  http://localhost:3000
npm run build        # Build de producción
npm start            # Servidor de producción
npm run db:push      # Sincronizar esquema de BD
npm run db:reset     # ⚠️  Borrar y recrear la base de datos
```

---

## Diagramas

### Entidad-Relación (BD)

```mermaid
erDiagram
    USER {
        string id PK
        string username
        string password
        string name
        string role
    }
    CONNECTION {
        string id PK
        string userId FK
        string provider
        boolean connected
        string pageId
        string pageName
    }
    CLIENT {
        string id PK
        string name
        string email
        string phone
        string channel
        string status
        int score
        string scoreLabel
        int step
        boolean isManual
    }
    MESSAGE {
        string id PK
        string clientId FK
        string role
        string content
    }
    PROPERTY {
        string id PK
        string name
        string city
        string type
        int guests
        float pricePerNight
        boolean petsAllowed
        int minimumStay
        string status
        float rating
    }
    BOOKING {
        string id PK
        string clientId FK
        string propertyId FK
        string title
        string startDate
        string endDate
        string status
        float price
    }
    PROPERTY_BOOKING {
        string id PK
        string propertyId FK
        string guestName
        string startDate
        string endDate
        string status
        float totalPrice
    }
    AI_CONFIG {
        string id PK
        string ownerName
        string greetingMessage
        string systemPrompt
    }
    NOTIFICATION {
        string id PK
        string userId FK
        string type
        string title
        boolean read
    }
    ACTIVITY_LOG {
        string id PK
        string userId
        string type
        string title
    }

    USER ||--o{ CONNECTION : "tiene"
    USER ||--o{ NOTIFICATION : "recibe"
    CLIENT ||--o{ MESSAGE : "genera"
    CLIENT ||--o{ BOOKING : "vinculado a"
    PROPERTY ||--o{ BOOKING : "en calendario"
    PROPERTY ||--o{ PROPERTY_BOOKING : "tiene"
```

---

### Casos de uso

```mermaid
flowchart LR
    P(["👤 Propietario"])
    L(["💬 Lead / Cliente"])
    FB(["📘 Facebook"])
    SYS(["🤖 Sistema"])

    subgraph APP["HostMind"]
        direction TB
        subgraph G["Gestión"]
            UC1["Ver dashboard"]
            UC2["Gestionar propiedades"]
            UC3["Calendario de reservas"]
            UC4["Exportar datos"]
            UC5["Ver estadísticas"]
        end
        subgraph C["Comunicación"]
            UC7["Leer mensajes"]
            UC8["Responder mensajes"]
            UC9["Clasificar cliente"]
            UC10["Conectar Facebook"]
        end
        subgraph I["IA"]
            UC11["Consultar Asistente IA"]
            UC12["Clasificación automática"]
            UC13["Respuesta chatbot"]
        end
        subgraph CAP["Captación"]
            UC14["Iniciar conversación"]
            UC15["Seleccionar propiedad"]
            UC16["Indicar fechas y huéspedes"]
            UC17["Indicar motivo del viaje"]
        end
    end

    P --> UC1 & UC2 & UC3 & UC4 & UC5
    P --> UC7 & UC8 & UC9 & UC10 & UC11
    L --> UC14 --> UC15 --> UC16 --> UC17 --> UC12
    FB --> UC7 & UC13
    SYS --> UC12 & UC13
```

---

### Flujo UX — Chatbot de captación

```mermaid
flowchart TD
    INICIO(["💬 Cliente envía primer mensaje"])
    INICIO --> PASO1["Muestra propiedades disponibles"]
    PASO1 --> P1{"¿Propiedad válida?"}
    P1 -- No --> PASO1
    P1 -- Sí --> PASO2["Propiedad confirmada\nPregunta fechas"]
    PASO2 --> PASO3["Cliente indica fechas"]
    PASO3 --> P2{"¿Cumple estancia mínima?"}
    P2 -- No --> PASO3
    P2 -- Sí --> PASO4["Pregunta nº de huéspedes"]
    PASO4 --> P3{"¿Dentro de capacidad?"}
    P3 -- No --> PASO4
    P3 -- Sí --> PASO5["Pregunta motivo del viaje"]
    PASO5 --> CALC

    subgraph CALC["Puntuación 0 – 100"]
        F1["+ Precio · Grupo pequeño · Motivo legítimo · Estancia larga"]
        F2["− Grupo grande · Estancia corta · Posible fiesta"]
    end

    CALC --> R{"Resultado"}
    R -- "≥ 75" --> TOP["🌟 TOP"]
    R -- "45–74" --> NOR["👍 NORMAL"]
    R -- "< 45" --> RIS["⚠️ RIESGO"]
    TOP & NOR & RIS --> FIN["Perfil guardado · Notificación al propietario"]
```

---

### Arquitectura del sistema

```mermaid
flowchart TD
    subgraph NAV["🖥️ Navegador"]
        SPA["React SPA\nZustand · Framer Motion · Tailwind CSS 4"]
    end

    subgraph SRV["⚙️ Servidor — Next.js 16"]
        direction LR
        API["API Routes /api/*"]
        JWT["JWT HMAC-SHA256"]
        ORM["Prisma ORM"]
    end

    subgraph BD["🗄️ Base de datos"]
        DB["SQLite"]
    end

    subgraph EXT["🌐 Servicios externos"]
        GROQ["Groq API\nLLaMA 3.3 70B"]
        FB["Facebook\nGraph API v21.0"]
    end

    SPA <-->|"fetch · JSON · Bearer JWT"| API
    API <--> JWT
    API <--> ORM
    ORM <--> DB
    API <-->|"POST /api/ai-chat"| GROQ
    API <-->|"Webhook /api/facebook"| FB
```

---

## Autor

**Nicolás Silva Cremona**  
Desarrollo de Aplicaciones Web (DAW) — Grado Superior  
IES Playamar · Curso 2025–2026  
nsilcre432@g.educaand.es
