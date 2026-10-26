# Modelo de dominio — ERP LiveFlow

> Entidades de Prisma (`prisma/schema.prisma`). Léelo antes de tocar el esquema o escribir queries.

## Diagrama de relaciones (resumen)

```mermaid
erDiagram
    Lead ||--o{ Conversation : "abre"
    Conversation ||--o{ Message : "contiene"
    Conversation ||--o{ PaymentOrder : "genera"
    Lead ||--o{ PaymentOrder : "debe"
    Lead ||--o{ Shipment : "recibe"
    LiveSession ||--o{ PaymentOrder : "agrupa"
    PaymentOrder ||--|| Shipment : "1 a 1"
    Shipment ||--o{ ShipmentEvent : "historial"
    Carrier ||--o{ Shipment : "transporta"
    Operator ||--o{ Conversation : "atiende"
    Operator ||--o{ PaymentOrder : "crea"
    Campaign ||--o{ CampaignRecipient : "envía"
    Lead ||--o{ CampaignRecipient : "recibe"

    Lead {
        uuid id PK
        string phone UK
        string name
        string source
        datetime firstContactAt
        datetime lastInteractionAt
    }

    Conversation {
        uuid id PK
        uuid leadId FK
        ConversationStatus status
        int priority
        uuid assignedToId FK
        datetime lastMessageAt
        datetime closedAt
    }

    Message {
        uuid id PK
        uuid conversationId FK
        Direction direction
        MessageType type
        string content
        string whatsappMsgId
        datetime sentAt
    }

    PaymentOrder {
        uuid id PK
        uuid conversationId FK
        uuid leadId FK
        uuid liveSessionId FK
        decimal amount
        string currency
        PaymentStatus status
        PaymentProvider provider
        datetime expiresAt
    }

    LiveSession {
        uuid id PK
        string title
        string platform
        string status
        datetime startedAt
    }

    Shipment {
        uuid id PK
        uuid paymentOrderId FK
        uuid leadId FK
        uuid carrierId FK
        ShipmentStatus status
        ShipmentMode mode
        string trackingNumber
    }

    ShipmentEvent {
        uuid id PK
        uuid shipmentId FK
        ShipmentStatus status
        EventSource source
        datetime occurredAt
    }

    Carrier {
        uuid id PK
        string code
        string name
        CarrierMode mode
        CarrierApiProvider apiProvider
    }

    Operator {
        uuid id PK
        string email UK
        OperatorRole role
        int currentLoad
        boolean isOnline
    }

    Campaign {
        uuid id PK
        string name
        CampaignStatus status
        datetime scheduledAt
    }

    CampaignRecipient {
        uuid id PK
        uuid campaignId FK
        uuid leadId FK
        RecipientStatus status
    }
```

Tablas sin relaciones (catálogo y configuración): `Product`, `MessageTemplate`, `BotConfig`, `BusinessConfig`, `ActivityLog`.

### Estados de un envío

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> READY: preparado
    READY --> LABEL_PRINTED: etiqueta impresa
    LABEL_PRINTED --> PICKED_UP: retiro
    PICKED_UP --> IN_TRANSIT
    IN_TRANSIT --> OUT_FOR_DELIVERY
    OUT_FOR_DELIVERY --> DELIVERED
    OUT_FOR_DELIVERY --> FAILED: intento fallido
    FAILED --> OUT_FOR_DELIVERY: reintento
    FAILED --> RETURNED: devolución
    IN_TRANSIT --> LOST: extraviado
    PENDING --> CANCELLED
    READY --> CANCELLED
    DELIVERED --> [*]
    RETURNED --> [*]
    LOST --> [*]
    CANCELLED --> [*]
```

Cada transición se registra en `ShipmentEvent` (`source`: `MANUAL`, `API` o `WEBHOOK`).

## Entidades

### Lead (clienta)

- `phone` único, `name`, `source`, `internalNotes`.
- Dirección desglosada (`addressStreet`, `addressNumber`, `addressColonia`, `addressCity`, `addressState`, `addressZipCode`, `addressNotes`).
- Timestamps `firstContactAt`, `lastInteractionAt`, `metadata` JSON.

### Conversation (conversación)

- Pertenece a un `Lead`; `status` = `ConversationStatus`.
- `priority`, `assignedToId` (Operator), `firstResponseAt`, `responseTimeMs`, `closedAt`.
- `ConversationStatus`: `NEW`, `ATTENTION`, `AWAITING_PAYMENT`, `PAID`, `SHIPPED`, `CLOSED`, `LOST`.

### Message

- `direction` (`INBOUND`/`OUTBOUND`), `type` (`TEXT`, `IMAGE`, `VIDEO`, `AUDIO`, `DOCUMENT`, `LOCATION`, `PAYMENT_LINK`, `SYSTEM`).
- `content`, `mediaUrl`, `whatsappMsgId`, `fromPhone`, timestamps de envío/entrega/lectura.
- `isTemplate` + `templateId` para mensajes de plantilla.

### PaymentOrder (orden de cobro)

- Monto `Decimal(10,2)` + `currency` (default `MXN`).
- Enlaza `Conversation`, `Lead`, opcional `LiveSession`, y `Shipment` (1:1).
- `status` = `PaymentStatus`: `PENDING`, `SENT`, `PAID`, `EXPIRED`, `CANCELLED`, `REFUNDED`.
- `provider` = `PaymentProvider`: `MERCADOPAGO`, `STRIPE`, `PAYPAL`, `CASH`, `TRANSFER`.
- `providerLinkId`/`providerLinkUrl` (link de pago), `expiresAt`.

### LiveSession (transmisión)

- `platform` (default `TIKTOK`), `status` (default `ACTIVE`), `startedAt`, `endedAt`, `notes`.
- Agrupa `PaymentOrder` creadas durante la transmisión.

### Operator (operador/a)

- `role` = `OperatorRole`: `ADMIN`, `AGENT`, `VIEWER`.
- `maxConversations`, `currentLoad`, `isOnline`, `lastSeenAt`.
- `passwordHash` (autenticación pendiente de completar).

### Shipment (envío)

- 1:1 con `PaymentOrder`; pertenece a `Lead`.
- `status` = `ShipmentStatus`: `PENDING`, `READY`, `LABEL_PRINTED`, `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `FAILED`, `RETURNED`, `LOST`, `CANCELLED`.
- `mode` = `ShipmentMode`: `COURIER`, `OWN_FLEET`, `PICKUP`.
- Logística: `trackingNumber`, `carrierId`/`carrierRef`, `service`, `weightGrams`, `dimensions`, `costClp`, `labelUrl`, `trackingUrl`, `providerRef`, `recipient`/`address` JSON, `driverId`, `attempts`, `deliveredTo`, `proofPhotoUrl`.

### ShipmentEvent (historial)

- `status`, `occurredAt`, `source` = `EventSource` (`MANUAL`/`API`/`WEBHOOK`), `note`, `payload` JSON.

### Carrier (transportista)

- `mode` = `CarrierMode`: `COURIER`, `EXTERNAL_OWN_FLEET`, `STORE_PICKUP`.
- `apiProvider` = `CarrierApiProvider`: `MANUAL`, `CHILEXPRESS`, `BLUE`, `SHIPIT`, `ENVIAME`, `STARKEN`, `CORREOS`, `SIMPLIROUTE`, `BEETRACK`.
- `orgId` + `code` únicos; configurable por cliente (sin cliente oficial).

### Campaign / CampaignRecipient

- `CampaignStatus`: `DRAFT`, `SCHEDULED`, `SENDING`, `SENT`, `CANCELLED`.
- `RecipientStatus`: `PENDING`, `SENT`, `DELIVERED`, `READ`, `FAILED`.
- Métricas: `totalLeads`, `sentCount`, `failedCount`.

### Product (catálogo)

- `name`, `price`, `currency`, `category`, `stock`, `isActive`, `isAvailable`, `imageUrl`.

### MessageTemplate

- `name`, `content`, `category`, `shortcut`, `variables`, `isActive`.

### BotConfig / BusinessConfig

- Configuración del bot (mensajes de bienvenida/ausencia/cola, horarios, delay) y del negocio (nombre, moneda, zona horaria, banco, expiración de órdenes, liberación de stock).

### ActivityLog

- Auditoría: `operatorId`, `conversationId`, `action`, `details` JSON, `createdAt`.

## Convenciones de datos

- IDs: `uuid()` (Prisma `@default(uuid())`), no cuid.
- Moneda: `Decimal(10,2)` + `currency` (soporta CLP/USD/EUR/ARS/MXN).
- Enums en **mayúsculas**; los de estado son cerrados y solo se agregan valores.
- JSON libre en `metadata`/`config`/`dimensions`/`recipient`/`address` cuando el shape es variable.

## Índices importantes

Ya definidos en el esquema para los filtros de listado más usados (status, leadId, paymentOrderId, mode, carrierId, sentAt, paidAt, etc.). Revisar `docs/herramientas.md` → Postgres antes de agregar índices.
