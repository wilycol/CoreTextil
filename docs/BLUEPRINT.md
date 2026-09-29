# CoreTextil SaaS · Blueprint Técnico

**Producto**: Plataforma SaaS multi-tenant que digitaliza el ciclo de producción textil
descentralizado (marca → taller de corte → satélites de ensamble → operarios).
**Mercado inicial**: Cúcuta, Norte de Santander, Colombia.
**Este documento reemplaza al blueprint original**: está sincronizado con el código implementado (repositorio `coretextil`).

---

## 1. Visión del producto

En Cúcuta miles de prendas se cortan en un taller principal y se ensamblan de forma
descentralizada en "talleres satélite" (patios, casas, pequeños talleres familiares).
Hoy ese flujo se coordina con cuadernos, WhatsApp y desconfianza: se pierden atados,
los pagos se discuten, los operarios no saben cuánto ganaron y las marcas no saben
en qué va su producción hasta que llega tarde.

CoreTextil convierte ese caos en un flujo trazable y verificable:

1. La **marca** crea el ADN de la prenda (despiece, ruta de máquinas, SAM, tarifas y materiales).
2. Emite una **orden de corte** con matriz talla×color; el sistema genera **atados unívocos**
   (`REF-TALLA-COLOR-NN`) con **etiquetas QR** imprimibles.
3. El **satélite** recibe cada atado escaneando su QR (recepción única e idempotente).
4. Los **operarios** marcan su destajo con botones rápidos; la base de datos aplica un
   **tope estricto por atado y operación** (no se puede reportar más de lo cortado).
5. Las novedades (piezas faltantes, tela dañada) viajan como **tickets** con estado,
   del operario al jefe del satélite y de este a la mesa de corte de la marca.
6. La marca **liquida por entregado** (solo atados con la ruta completa al 100%) y el
   satélite liquida **nómina** a sus operarios a un clic.

## 2. Stack tecnológico (implementado)

| Capa | Tecnología | Rol |
|---|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind 4 | PWA instalable, server components |
| Backend | Server Actions + Route Handlers (`/api/v1/*`) | Mutaciones y API pública interna |
| Base de datos | Supabase (PostgreSQL 15) | Modelo relacional multi-tenant |
| Seguridad | RLS + `current_profile()` (SECURITY DEFINER) | Aislamiento por tenant en la base, no en la app |
| Auth | Supabase Auth + Google SSO | Un perfil automático por usuario (`handle_new_user`) |
| IA | Gemini 2.0 Flash (visión) + fallback heurístico local | Foto/boceto → ADN de prenda |
| QR | `qrcode` (generación server-side) + `jsqr` (escaneo con cámara) | Ciclo completo del atado |
| PDF | `jspdf` + `jspdf-autotable` (cliente) | Ficha técnica descargable |
| Hosting | Vercel (serverless) + Supabase (managed Postgres) | Despliegue ver `docs/DEPLOY.md` |

## 3. Arquitectura y flujo de datos

```
┌─────────────┐   QR labels   ┌──────────────┐  escaneo/marcación  ┌──────────────┐
│  MARCA      │──────────────▶│  ATADOS      │◀────────────────────│  SATÉLITE    │
│  (tenant)   │  órdenes      │  (bultos)    │  recepción única    │  + operarios │
└─────┬───────┘               └──────────────┘                     └──────┬───────┘
      │ liquida entregadas                                               │ liquida nómina
      ▼                                                                  ▼
 order_liquidations                                            payroll_runs (breakdown)
      └───────────────────────── reportes contables ─────────────────────────┘
```

- **Multi-tenancy**: cada fila de negocio lleva `tenant_id`; la RLS resuelve el tenant del
  usuario con `current_profile()`. Los satélites **no son tenants**: se vinculan a marcas
  vía `satellite_links` y acceden a las órdenes asignadas vía `satellite_user_id`.
- **Integridad en la base, no en la UI**: el tope de destajo es un trigger
  (`enforce_bundle_cap` con `SELECT … FOR UPDATE`), la recepción única es un
  `UNIQUE(bundle_id)` y la liquidación única es un `UNIQUE(order_id)`.
- **Una sola lógica de negocio**: los servicios en `src/lib/services/*` son usados tanto
  por las Server Actions (UI/PWA) como por la API `/api/v1` — no hay dos implementaciones.

## 4. Modelo de datos (14 tablas)

| Tabla | Propósito |
|---|---|
| `tenants` | Organizaciones de marca |
| `profiles` | Usuario (1:1 con auth.users): rol, tenant, jefe de taller |
| `satellite_links` | Vínculo satélite ↔ marca (base del plan Monomarca/Pro) |
| `satellite_cost_profiles` | Costos fijos mensuales del taller (CFI) |
| `garments` | Prenda: SAM, precio sugerido, **`size_factors`** (consumo por talla) |
| `garment_parts` | Despiece (código de pieza, material) |
| `garment_operations` | Ruta de máquinas con tarifa de destajo por operación |
| `garment_materials` | Tela e insumos: consumo por prenda (talla base M) y costo unitario |
| `production_orders` | Orden de corte: satélite asignado, precio acordado, estado |
| `order_bundles` | Atados unívocos: talla, color, unidades, `bundle_code` |
| `daily_production_logs` | Marcación de destajo (tope por trigger) |
| `material_tickets` | Novedades con flujo de estados entre operario/jefe/marca |
| `satellite_bundle_receipts` | Recepciones QR (una por atado) |
| `payroll_runs` / `order_liquidations` | Nómina del satélite / pago de la marca |

**Estados de orden**: `draft → cutting → dispatched → in_progress → completed`
**Estados de ticket**: `pending_satellite → approved_satellite → in_cutting_room → dispatched → resolved` (o `cancelled`)

## 5. Endpoints de la API v1 (serverless Next.js)

Autenticación por cookies de sesión Supabase (same-origin, la PWA ya la trae).
Contrato uniforme: `{ ok: true, data }` / `{ ok: false, error }`.
Detalle completo con payloads: **[docs/API.md](API.md)**.

| Método | Ruta | Rol | Función |
|---|---|---|---|
| GET | `/api/v1/health` | cualquiera | Health check |
| POST | `/api/v1/ai/explode-garment` | marca | Imagen → despiece + secuencia de ensamble (IA/fallback) |
| POST | `/api/v1/satellite/calculate-yield` | satélite | CFI, destajo por máquina, margen y semáforo |
| POST | `/api/v1/production/log-units` | operario/jefe | Valida tope de bulto y guarda avance |
| POST | `/api/v1/tickets/report` | operario/jefe | Registro inicial de novedad |
| PATCH | `/api/v1/tickets/:id/verify` | jefe satélite | Aprobación (`approve`) o descarte (`discard`) |
| GET | `/api/v1/bundles/:code/sheet` | satélite/operario | Ficha del atado con materiales por talla y unidades |
| POST | `/api/v1/bundles/receive` | satélite/operario | Recepción QR (idempotente, RPC) |
| POST | `/api/v1/orders/:id/liquidate` | marca | Liquidación por ruta completa |

## 6. Seguridad

- **RLS en todas las tablas** (migraciones 0003, 0007, 0009, 0010): el anon key es
  público por diseño; la barrera real son las políticas.
- **Anti-escalada de privilegios** (0009): un perfil solo define su rol/vínculo durante
  el onboarding (siendo `operator`); nadie puede auto-promoverse a `brand_admin` de otra marca.
- **Tope de atado con lock** (`FOR UPDATE`): seguro ante marcación concurrente de varios operarios.
- **Liquidación atómica**: `UNIQUE(order_id)` + re-chequeo en servicio → imposible el doble pago.
- La API v1 comparte el mismo usuario de sesión y la misma RLS: no existen credenciales de servicio en el cliente.

## 7. Decisiones de diseño clave

1. **Consumo por talla**: `garments.size_factors` (JSON por prenda) multiplica el consumo
   base (talla M). El escáner calcula la tela total del atado: consumo × factor × unidades.
2. **Entregada = ruta completa**: una prenda cuenta como entregada solo cuando **todas**
   las operaciones del atado llegan al tope; la liquidación paga exactamente eso.
3. **Snapshot `satellite_name`** en liquidaciones: los reportes sobreviven a desvinculaciones.
4. **IA con degradación elegante**: sin `GEMINI_API_KEY`, el ADN se genera con blueprints
   heurísticos locales (`src/lib/ai.ts`) y la app sigue funcionando.
5. **PWA primero**: la operación de planta (escanear, marcar) es táctil e instalable;
   el endpoint de escáner y marcación reutilizan los mismos servicios que la API.

## 8. Roadmap sugerido

- **Corto plazo (piloto)**: reprocesos de tickets (`in_cutting_room → resolved`), notificaciones WhatsApp, reporte de tela consumida por orden.
- **Mediano plazo**: Storage de Supabase para evidencias fotográficas, tarifas de destajo por talla, app de contador (CSV/PDF de reportes).
- **Largo plazo**: marketplace de capacidad (marcas publican cortes, satélites ofertan), facturación de planes integrada, modo offline de marcación con cola.
