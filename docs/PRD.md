# CoreTextil SaaS · Especificación Técnica / PRD

**Versión**: 2.0 (actualizada al código implementado — reemplaza al PRD original)
**Producto**: CoreTextil SaaS — Plataforma de producción textil descentralizada
**Mercado inicial**: Cúcuta, Norte de Santander
**Estado**: MVP funcional verificado (`tsc` 0 errores, `next build` 19+9 rutas). Pendiente: piloto en campo.

---

## 1. Problema

En el ecosistema textil de Cúcuta, las marcas cortan y descentralizan el ensamble en
talleres satélite (patios familiares y pequeños talleres). La coordinación hoy es manual:

- **Atados perdidos**: bultos de 20–50 prendas viajan sin trazabilidad; nadie sabe dónde están.
- **Pagos disputados**: el destajo se apunta en cuadernos; el operario no sabe cuánto ganó ni la marca cuánto debe.
- **Tope de destajo imposible**: reportar más piezas de las cortadas es el fraude más común y hoy es indetectable.
- **Novedades invisibles**: una pieza faltante o tela dañada se reporta de palabra y se olvida.
- **Margen ciego**: el satélite acepta cortes a pérdida porque no conoce su costo fijo unitario; la marca no conoce su costo real (mano de obra + materiales).

## 2. Objetivos del producto

| # | Objetivo | Métrica de éxito (piloto 60 días) |
|---|---|---|
| O1 | Trazabilidad total del atado (corte → ensamble → pago) | 100% de atados recibidos vía QR |
| O2 | Eliminar el sobrerreporte de destajo | 0 pagos por unidades fuera de tope |
| O3 | Pago transparente al operario | Billetera del día visible; 0 disputas de conteo |
| O4 | Decisión de aceptar/rechazar cortes con datos | ≥80% de satélites con costos fijos registrados |
| O5 | Costo real por prenda para la marca | Fichas técnicas con materiales para el 100% de prendas nuevas |

## 3. Usuarios y roles

| Rol | Quién es | Qué hace en la app |
|---|---|---|
| `brand_admin` / `designer` / `cutter` | Marca, diseñador, mesa de corte | ADN de prenda, órdenes, QR, tickets (despacho), liquidación, reportes |
| `satellite_owner` | Jefe del taller satélite | Recibe atados, simula rentabilidad, aprueba tickets, liquida nómina |
| `operator` | Operario del taller | Recibe atados, marca destajo, reporta faltantes, ve su billetera |

El rol se define una vez en el onboarding (con guardia anti-escalada en la base).

## 4. Requerimientos funcionales (implementados)

### Módulo A · Marca
- **A1 ADN de prenda**: foto/boceto → IA de visión (Gemini) o estimación local → despiece (`garment_parts`), ruta de máquinas con tarifas (`garment_operations`), materiales (`garment_materials`). *(Server action + POST `/api/v1/ai/explode-garment`)*
- **A2 Ficha técnica**: documento imprimible y **PDF descargable** con 6 secciones (despiece, ruta, materiales, consumo por talla, costos/margen, notas). *(página + jspdf)*
- **A3 Consumo de tela por talla**: factores editables por prenda (default XS 0.95 · S 1 · M 1 · L 1.05 · XL 1.1 · XXL 1.2); costo de materiales por talla. *(0008 + editor)*
- **A4 Órdenes de corte**: matriz talla×color → atados `REF-TALLA-COLOR-NN` con QR imprimible; asignación de satélite por email. *(Server action + servicio compartido)*
- **A5 Liquidación por corte**: paga solo atados con **ruta completa al 100%**; una liquidación por orden (única a nivel DB); snapshot del nombre del satélite. *(UI + POST `/api/v1/orders/:id/liquidate`)*
- **A6 Mesa de reposición**: ve y **despacha** tickets aprobados por satélites.
- **A7 Reportes contables**: 12 meses (pagado, prendas, órdenes, tickets) + top satélites.

### Módulo B · Satélite
- **B1 Costos fijos (CFI)**: arriendo, energía, consumibles, mantenimiento ÷ capacidad mensual.
- **B2 Simulador con semáforo**: ingreso − CFI − bolsa de operarios → margen % (verde ≥20, amarillo 10–19, rojo <10). Sin costos fijos no simula (evita falsos "rentable"). *(UI + POST `/api/v1/satellite/calculate-yield`)*
- **B3 Recepción QR**: escaneo con cámara (jsQR) o código manual; recepción **única por atado** (RPC idempotente); orden pasa a "En ensamble". *(UI + POST `/api/v1/bundles/receive`)*
- **B4 Ficha del atado**: al escanear ve "qué coser": operaciones con tarifas y **materiales recalculados a la talla y unidades del atado**. *(UI + GET `/api/v1/bundles/:code/sheet`)*
- **B5 Nómina a un clic**: semana/quincena/mes o fechas custom; desglose por operario guardado como comprobante (`payroll_runs`, único por satélite+periodo).

### Módulo C · Operario y equipo
- **C1 Marcación de destajo**: botones +10/+25/+50 y cantidad libre; billetera del día; el tope del atado se valida **en la base** (trigger con lock) y la UI muestra lo faltante del equipo. *(UI + POST `/api/v1/production/log-units`)*
- **C2 Tickets de faltantes**: creación con atado/motivo/cantidad → aprobación **o descarte** del jefe → despacho de la marca. *(UI + POST `/api/v1/tickets/report`, PATCH `/api/v1/tickets/:id/verify`)*
- **C3 Escáner disponible para operarios** (mismo flujo B3–B4).

### Módulo D · Plataforma
- **D1 Google SSO** con perfil automático (trigger `handle_new_user`).
- **D2 Onboarding por rol**: marca (crea tenant), satélite, operario (se vincula por email del jefe vía RPC).
- **D3 PWA instalable** (manifest + iconos; cámara requiere HTTPS de producción).
- **D4 API v1 serverless** con contrato uniforme y misma sesión/RLS que la app. *(docs/API.md)*
- **D5 Multi-tenant estricto por RLS** con endurecimientos del QA (0009): INSERT de tenants, anti-escalada de roles, tope concurrente seguro, lectura de logs por equipo (0010).

## 5. Requerimientos no funcionales

| Categoría | Requisito | Estado |
|---|---|---|
| Seguridad | RLS en todas las tablas; sin service key en cliente; anti-escalada | ✅ (0003/0007/0009/0010) |
| Integridad | Topes y unicidades en DB (no solo UI) | ✅ triggers + UNIQUE |
| Usabilidad móvil | PWA táctil, botones grandes, flujo escanear-marcar < 30 s | ✅ |
| Performance | Consultas filtradas por orden/tenant; sin full-scans del cliente | ✅ (fix QA) |
| Disponibilidad IA | Degradación elegante sin Gemini (heurística local) | ✅ |
| Idioma | Interfaz 100% en español colombiano | ✅ |
| Costos | Corre en free tiers (Supabase/Vercel/Gemini) para piloto | ✅ docs/DEPLOY.md §7 |

## 6. Criterios de aceptación (smoke test del piloto)

1. Marca crea prenda → ficha PDF incluye sección por talla con factores.
2. Orden con matriz S/M/L×2 colores genera 6 atados QR; el código es unívoco.
3. Satélite escanea → recepción única (re-escanear no duplica) → ficha muestra tela total del atado según talla y unidades.
4. Dos operarios marcan el mismo atado+operación en paralelo → la suma nunca supera el tope (409 en API).
5. Operario crea ticket → jefe aprueba → marca despacha → estado visible para los 3.
6. Marca intenta liquidar con ruta incompleta → rechazado; con ruta completa → paga exactamente entregadas y orden queda `completed`.
7. Segundo intento de liquidación → rechazado (unicidad).
8. Reportes muestran el pago del mes y el satélite en el top.

## 7. Fuera de alcance del MVP (explícito)

- Facturación/cobro de planes integrada (los planes están publicados en landing; el cobro es manual en el piloto).
- Multi-marca del satélite con cotización por marca (hoy el vínculo ya soporta varias marcas; la UI de alternancia es siguiente paso).
- Modo offline de marcación (la PWA avisa, no encola).
- Chat/mensajería (WhatsApp externo).
- Pagos electrónicos (la liquidación es comprobante, la transferencia es externa).

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación implementada |
|---|---|---|
| Adoptación baja de operarios (alfabetización digital) | Alto | Flujos de 2 toques, botones gigantes, QR manual de respaldo |
| QR dañados en planta | Medio | Entrada manual por código + el código es legible por humano |
| Datos maestros mal cargados (materiales/tarifas) | Medio | IA propone, marca edita; totales siempre visibles |
| Crecimiento de `daily_production_logs` | Bajo | Índices por atado+operación y operario+fecha; consultas filtradas |

## 9. Referencias

- Arquitectura y decisiones: [docs/BLUEPRINT.md](BLUEPRINT.md)
- Endpoints y payloads: [docs/API.md](API.md)
- Despliegue: [docs/DEPLOY.md](DEPLOY.md)
- Informe de QA: [docs/QA.md](QA.md)
