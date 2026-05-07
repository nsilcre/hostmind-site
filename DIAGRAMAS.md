# HostMind — Diagramas técnicos

> Renderizar en [mermaid.live](https://mermaid.live) → pegar el código → captura de pantalla.  
> GitHub también los renderiza automáticamente al subir el archivo.

---

## 1. Diagrama Entidad-Relación (ER)

Representa las tablas de la base de datos y sus relaciones.

```mermaid
erDiagram
    USER {
        string id PK
        string username
        string password
        string name
        string role
        datetime createdAt
    }
    CONNECTION {
        string id PK
        string userId FK
        string provider
        boolean connected
        string accessToken
        string pageId
        string pageName
        datetime connectedAt
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
        string scoreReasons
        int step
        string profile
        string summary
        boolean isManual
        string sourceId
    }
    MESSAGE {
        string id PK
        string clientId FK
        string role
        string content
        datetime createdAt
    }
    PROPERTY {
        string id PK
        string name
        string address
        string city
        string type
        int bedrooms
        int bathrooms
        int guests
        float pricePerNight
        boolean petsAllowed
        int minimumStay
        float depositAmount
        float cleaningFee
        string checkInTime
        string checkOutTime
        string cancellationPolicy
        string status
        float rating
        int totalBookings
        float totalRevenue
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
        string clientId
        string guestName
        string startDate
        string endDate
        string status
        float totalPrice
    }
    REVIEW {
        string id PK
        string guestName
        string propertyId
        string propertyName
        int rating
        string comment
        string source
        string response
        datetime respondedAt
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
        string content
        boolean read
        string link
    }
    ACTIVITY_LOG {
        string id PK
        string userId
        string type
        string title
        string content
        string metadata
    }

    USER ||--o{ CONNECTION : "tiene"
    USER ||--o{ NOTIFICATION : "recibe"
    CLIENT ||--o{ MESSAGE : "genera"
    CLIENT ||--o{ BOOKING : "vinculado a"
    PROPERTY ||--o{ BOOKING : "en calendario"
    PROPERTY ||--o{ PROPERTY_BOOKING : "tiene"
    PROPERTY ||--o{ REVIEW : "recibe"
```

---

## 2. Diagrama de Casos de Uso

Muestra los actores del sistema y las acciones que puede realizar cada uno.

```mermaid
flowchart LR
    P(["👤\nPropietario"])
    L(["💬\nLead / Cliente"])
    FB(["📘\nFacebook Messenger"])
    SYS(["🤖\nSistema / IA"])

    subgraph APP["  HostMind — Límite del sistema  "]
        direction TB

        subgraph GESTION["Gestión"]
            UC1["Ver dashboard"]
            UC2["Gestionar propiedades"]
            UC3["Ver calendario de reservas"]
            UC4["Gestionar reseñas"]
            UC5["Exportar datos CSV/JSON"]
            UC6["Ver estadísticas"]
        end

        subgraph COMUNICACION["Comunicación"]
            UC7["Leer mensajes"]
            UC8["Responder mensajes"]
            UC9["Clasificar cliente manualmente"]
            UC10["Conectar Facebook"]
        end

        subgraph IA["Inteligencia Artificial"]
            UC11["Consultar Asistente IA"]
            UC12["Clasificación automática de lead"]
            UC13["Respuesta automática chatbot"]
        end

        subgraph CAPTACION["Captación"]
            UC14["Iniciar conversación"]
            UC15["Seleccionar propiedad"]
            UC16["Indicar fechas y huéspedes"]
            UC17["Indicar motivo del viaje"]
        end
    end

    P --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6
    P --> UC7 & UC8 & UC9 & UC10
    P --> UC11

    L --> UC14 --> UC15 --> UC16 --> UC17 --> UC12
    FB --> UC7
    FB --> UC13
    SYS --> UC12 & UC13
```

---

## 3. Diagrama de Flujo UX — Chatbot de captación

Representa el recorrido completo de un lead desde el primer mensaje hasta su clasificación.

```mermaid
flowchart TD
    INICIO(["💬 Cliente envía\nprimer mensaje"])

    INICIO --> PASO1["Asistente muestra\nla lista de propiedades\ndisponibles"]

    PASO1 --> P1{"¿Selecciona\npropiedad válida?"}
    P1 -- "No reconocida" --> PASO1
    P1 -- "Número o nombre OK" --> PASO2

    PASO2["✅ Propiedad confirmada\nPregunta por fechas\nde estancia"]

    PASO2 --> PASO3["Cliente indica\nlas fechas"]

    PASO3 --> P2{"¿Cumple la\nestancia mínima?"}
    P2 -- "No" --> PASO3
    P2 -- "Sí" --> PASO4

    PASO4["Pregunta número\nde huéspedes\nMáx. según propiedad"]

    PASO4 --> P3{"¿Dentro de la\ncapacidad máxima?"}
    P3 -- "No" --> PASO4
    P3 -- "Sí" --> PASO5

    PASO5["Pregunta el motivo\ndel viaje"]

    PASO5 --> CALC

    subgraph CALC["⚙️ Puntuación automática 0–100"]
        F1["+ Precio de la propiedad\n+ Tamaño del grupo\n+ Motivo del viaje\n+ Duración de la estancia"]
        F2["- Grupo grande\n- Estancia muy corta\n- Posible fiesta / evento"]
    end

    CALC --> RESULT{"Puntuación\nfinal"}

    RESULT -- "≥ 75" --> TOP["🌟 TOP\nCliente ideal"]
    RESULT -- "45–74" --> NORMAL["👍 NORMAL\nCliente estándar"]
    RESULT -- "< 45" --> RIESGO["⚠️ RIESGO\nRevisar antes de aceptar"]

    TOP & NORMAL & RIESGO --> FIN["Perfil guardado en BD\nNotificación al propietario\nConversación disponible en panel"]
```

---

## 4. Diagrama de Arquitectura

Muestra cómo se comunican todas las capas del sistema.

```mermaid
flowchart TD
    subgraph BROWSER["🖥️ Navegador"]
        SPA["React SPA\nZustand · Framer Motion · Tailwind CSS"]
    end

    subgraph NEXTJS["⚙️ Servidor — Next.js 16 App Router"]
        direction LR
        ROUTES["API Routes\n/api/*"]
        JWT["JWT\nHMAC-SHA256"]
        PRISMA["Prisma ORM"]
    end

    subgraph DB["🗄️ Base de datos"]
        SQLITE["SQLite\ndev.db"]
    end

    subgraph EXTERNAL["🌐 Servicios externos"]
        GROQ["Groq API\nLLaMA 3.3 70B"]
        FB["Facebook\nGraph API v21.0"]
    end

    SPA <-->|"fetch + JSON\nAuthorization: Bearer JWT"| ROUTES
    ROUTES <-->|"verifica token"| JWT
    ROUTES <-->|"consultas"| PRISMA
    PRISMA <-->|"SQL"| SQLITE

    ROUTES <-->|"POST /api/ai-chat\nStreaming de respuesta"| GROQ
    ROUTES <-->|"GET verificación webhook\nPOST mensajes entrantes"| FB
    FB -->|"Mensajes de huéspedes\nen tiempo real"| ROUTES

    style BROWSER fill:#1c1917,stroke:#fbbf24,color:#fef3c7
    style NEXTJS fill:#1c1917,stroke:#fbbf24,color:#fef3c7
    style DB fill:#1c1917,stroke:#fbbf24,color:#fef3c7
    style EXTERNAL fill:#1c1917,stroke:#fbbf24,color:#fef3c7
```

---

## Cómo exportar como imágenes

1. Ir a [mermaid.live](https://mermaid.live)
2. Pegar el bloque de código de cada diagrama (sin las triple comillas)
3. En la esquina superior derecha: **Actions → Download PNG** o **Download SVG**
4. Renombrar los archivos:
   - `diagrama_er.png`
   - `diagrama_casos_uso.png`
   - `diagrama_flujo_ux.png`
   - `diagrama_arquitectura.png`
"# Diagrama" 
