# CoreTextil SaaS · Blueprint Técnico

**Producto**: Plataforma SaaS multi-tenant impulsada por Inteligencia Artificial que digitaliza y conecta el ciclo de producción textil descentralizado (marca/diseñador → mesa de corte → satélites de ensamble → operarios).
**Alcance**: Colombia y Latinoamérica (LATAM) · Piloto de campo activo en Cúcuta, Norte de Santander.
**Estado**: Producción funcional verificada (`tsc` 0 errores, `next build` 26 rutas optimizadas, PWA & TWA Android Ready).

---

## 1. Visión y Arquitectura del Producto

En la industria de la confección, miles de prendas se cortan en un taller principal y se ensamblan de forma descentralizada en talleres satélite (patios, pequeñas plantas familiares). Históricamente, este flujo operaba bajo opacidad: cuadernos rayados, llamadas a ciegas, atados traspapelaos y discusiones en la liquidación de destajo.

CoreTextil convierte ese caos en un **Ecosistema Neural Trazable y Verificable**:

1. **La Marca / Diseñador** crea el **ADN de la Prenda** mediante el **Vision Engine V2** (Ficha técnica digital, despiece, consumos de tela por talla, tabla de medidas y árbol de procesos con tiempos SAM y costos por máquina).
2. Emite una **Orden de Corte** basada en la matriz talla×color; el sistema genera **atados unívocos** (`REF-TALLA-COLOR-NN`) con **etiquetas QR imprimibles**.
3. El **Taller Satélite** recibe el bulto escaneando el código QR desde su celular (recepción única e idempotente en la base de datos).
4. El taller consulta su **Simulador de Costos Fijos (CFI)** para asegurar su margen de ganancia antes de coser.
5. Los **Operarios** marcan su destajo en vivo desde su móvil con botones rápidos. La base de datos aplica un **lock estricto por atado y operación** (evitando el sobrerreporte de piezas).
6. En **"Mi Red"**, la marca y el satélite monitorean el avance porcentual % por cada proceso de ensamble (Corte, Filete, Plana, Collarín, Presille, Pulido).
7. Las novedades (piezas faltantes o tela defectuosa) se gestionan mediante **Tickets con Nomenclatura Unívoqua** (operario → jefe de taller → mesa de corte).
8. La marca **liquida por entregado al 100% de la ruta**, y el satélite liquida la **nómina de destajo a 1 clic** con comprobante digital inmodificable.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Rol |
|---|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind 4 | PWA táctil instalable + TWA Android (Play Store Ready) |
| Brand Assets | Componente `Logo.tsx` + `logo_base64.ts` | Renderizado Base64 embebido en 0ms (resistente a fallas de red/caché) |
| Backend | Server Actions + Route Handlers (`/api/v1/*`) | Mutaciones y API pública interna serverless |
| Base de datos | Supabase (PostgreSQL 15) | Modelo relacional multi-tenant con RLS |
| Seguridad | RLS + `current_profile()` (SECURITY DEFINER) | Aislamiento estricto por tenant en la base de datos |
| Auth | Supabase Auth + Google SSO | Perfil automático por usuario (`handle_new_user`) |
| IA | Vision Engine V2 (Gemini / ChatGPT multimodal) + fallback local | Foto/boceto → ADN de prenda (Ficha técnica + Despiece + Matriz + Árbol de procesos) |
| QR | `qrcode` (server-side) + `jsqr` (cliente en vivo) | Escaneo rápido desde teléfonos móviles |
| PDF | `jspdf` + `jspdf-autotable` | Ficha técnica descargable con despiece y costos |
| Android Integration | PWA / TWA + `.well-known/assetlinks.json` | Publicación en Google Play Store |
| Hosting | Vercel (CI/CD) + Supabase (Managed Postgres) | Infraestructura serverless de alta velocidad |

---

## 3. Arquitectura y Flujo de Datos "Mi Red"

```
┌─────────────────┐    QR labels     ┌─────────────────┐   escaneo/marcación   ┌─────────────────┐
│  MARCA /        │─────────────────▶│  ATADOS QR      │◀──────────────────────│  TALLER SATÉLITE│
│  DISEÑADOR      │   órdenes        │  (bultos)       │   recepción única     │  + OPERARIOS    │
└────────┬────────┘                  └─────────────────┘                       └────────┬────────┘
         │ liquida entregadas                                                           │ liquida nómina
         ▼                                                                              ▼
order_liquidations                                                            payroll_runs (breakdown)
         └───────────────────────── reportes contables / Mi Red ─────────────────────────┘
```

- **Multi-tenancy:** Cada fila de negocio incluye `tenant_id` aislado mediante RLS. Los satélites se vinculan a las marcas mediante `satellite_links` y acceden a las órdenes asignadas.
- **Red Neural "Mi Red":**
  - Ficha interactiva de Satélite con desglose porcentual % de cumplimiento por proceso (Corte, Filete, Plana, Collarín, Presille, Pulido).
  - Ficha interactiva de Operario (`selectedOperator`) con saldo acumulado de destajo del día/semana e historial cronológico detallado por atado y fecha.
- **Integridad Transaccional:**
  - Tope de destajo mediante trigger `enforce_bundle_cap` con `SELECT ... FOR UPDATE`.
  - Recepción única vía `UNIQUE(bundle_id)`.
  - Liquidación única por orden vía `UNIQUE(order_id)`.

---

## 4. Modelo de Datos (14 Tablas Principales)

1. `tenants`: Organizaciones de marca y talleres principales.
2. `profiles`: Usuario (1:1 con `auth.users`), rol (`brand_admin`, `designer`, `cutter`, `satellite_owner`, `operator`), tenant y jefe de taller.
3. `satellite_links`: Vínculo satélite ↔ marca (base de los planes Monomarca / Pro).
4. `satellite_cost_profiles`: Costos fijos mensuales del taller (CFI).
5. `garments`: Prenda: SAM, precio sugerido y `size_factors` (consumo por talla XS a XL).
6. `garment_parts`: Despiece de tela y moldes.
7. `garment_operations`: Ruta secuencial de máquinas con tarifas de destajo.
8. `garment_materials`: Insumos y materiales (consumo base talla M y costo unitario).
9. `production_orders`: Orden de corte: satélite asignado, precio acordado y estado.
10. `order_bundles`: Atados unívocos: talla, color, unidades y `bundle_code`.
11. `daily_production_logs`: Marcación de destajo con registro de operario e historial cronológico.
12. `material_tickets`: Novedades y faltantes con flujo de estados.
13. `satellite_bundle_receipts`: Recepciones QR únicas por atado.
14. `payroll_runs` / `order_liquidations`: Nómina del satélite / Pago por ruta completa de la marca.

---

## 5. Endpoints de la API v1 (Serverless Next.js)

Contrato uniforme: `{ ok: true, data }` / `{ ok: false, error }`.

| Método | Ruta | Rol | Función |
|---|---|---|---|
| GET | `/api/v1/health` | Cualquiera | Health check de la API |
| POST | `/api/v1/ai/explode-garment` | Marca | Imagen → ADN de prenda (despiece + ruta de máquinas + costos) |
| POST | `/api/v1/satellite/calculate-yield` | Satélite | Calculadora CFI, margen y semáforo de rentabilidad |
| POST | `/api/v1/production/log-units` | Operario / Jefe | Marcación de destajo con validación de tope |
| POST | `/api/v1/tickets/report` | Operario / Jefe | Registro de novedad con nomenclatura unívoqua |
| PATCH | `/api/v1/tickets/:id/verify` | Jefe Satélite / Marca | Aprobación o despacho de reposición |
| GET | `/api/v1/bundles/:code/sheet` | Satélite / Operario | Ficha del atado con consumos recalculados por talla |
| POST | `/api/v1/bundles/receive` | Satélite / Operario | Recepción de atado por QR (idempotente) |
| POST | `/api/v1/orders/:id/liquidate` | Marca | Liquidación por ruta completa terminada |

---

## 6. Seguridad y Resiliencia

- **RLS en todas las tablas:** Políticas de seguridad a nivel de fila activas en Supabase.
- **Anti-escalada de privilegios:** Rol asignado en onboarding sin posibilidad de alteración por cliente.
- **Lock de Concurrencia (`FOR UPDATE`):** Protección estricta en DB para marcaciones simultáneas de operarios sobre el mismo atado.
- **Resiliencia Visual Base64:** Los logotipos oficiales están embebidos en Base64 en el cliente, garantizando 0 fallas de carga por caché o red.

---
*CoreTextil SaaS · Blueprint Técnico v2.0 (Colombia y Latinoamérica).*
