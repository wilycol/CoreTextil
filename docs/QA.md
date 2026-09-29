# QA de CoreTextil · Informe previo al piloto

Fecha: 2026-09-29 · Verificación estática (`tsc --noEmit` 0 errores, `next build` OK: 19 páginas + 9 endpoints API).
**No hay prueba end-to-end todavía**: requiere proyecto Supabase creado, migraciones 0001→0010 ejecutadas y `.env.local` (ver checklist al final).

## Anexo post-QA: API v1 y refactor de servicios

- Lógica de negocio extraída a `src/lib/services/*` (explode, orders, production,
  tickets, liquidation, bundleSheet): Server Actions y API comparten implementación.
- Nueva API `/api/v1/*` (9 endpoints) con contrato uniforme: ver `docs/API.md`.
- Migración **0010**: los operarios ven los logs de su equipo (necesario para el tope
  compartido por atado en la UI de marcación).
- Tickets: el jefe ahora puede **descartar** (`cancelled`) además de aprobar.
- La API usa la misma sesión/cookies y RLS que la app: sin claves de servicio.

## Bugs corregidos en este QA

| # | Severidad | Dónde | Problema | Fix |
|---|---|---|---|---|
| 1 | 🔴 Crítico | `ordenes/[id]/page.tsx` | La consulta de `daily_production_logs` **no filtraba por orden** (`.select(...)` sin `.eq("order_id")`): con varias órdenes en producción sumaba logs de otras órdenes → "entregadas" infladas y liquidaciones prematuras. Además era O(total BD). | `.eq("order_id", id)` |
| 2 | 🔴 Crítico | `ordenes/[id]/actions.ts` | `liquidateOrder` pagaba por **suma simple de unidades marcadas**, no por **ruta completa** (contradecía la definición de la UI). Un atado con 1 de 6 operaciones al 100% se pagaba completo. | Mismo criterio que la UI: atado entregado solo si TODAS las operaciones ≥ unidades del atado |
| 3 | 🔴 Crítico | RLS `tenants` | No existía política **INSERT**: el onboarding de marca fallaba al crear el tenant (`new row violates row-level security`). | Migración 0009: `tenants_insert_member` |
| 4 | 🔴 Crítico | RLS `profiles` | `profiles_update_self` (`using (id = auth.uid())` sin `with check`) permitía a **cualquier usuario** cambiarse `role`, `tenant_id` y `satellite_owner_id` → escalada a brand_admin de cualquier marca. | Migración 0009: trigger `guard_profile_role_change` (solo un perfil aún `operator` define rol/vínculo, flujo de onboarding) |
| 5 | 🟢 Feature (no era bug) | `escanear/actions.ts` (getBundleSheet) | La ficha del atado devolvía el consumo base sin considerar la talla ni las unidades. | Ampliada con talla, unidades y factores → recálculo por atado (parte del ítem de consumo por talla) |
| 6 | 🟠 Alto | Trigger `enforce_bundle_cap` | Race condition: dos inserts simultáneos (dos operarios, mismo atado+operación) leían el total antes de insertar y podían superar el tope. | Migración 0009: `SELECT ... FOR UPDATE` sobre el atado dentro del trigger |
| 7 | 🟢 Endurecimiento (no era bug) | `nueva-prenda/actions.ts` | `createGarment` confiaba ciegamente en el ADN enviado por el cliente (verificado: `vision.ts` sí normaliza `parts` y lanza error si vienen vacías; el flujo IA funcionaba). | Guardía server añadida: rechaza ADN sin partes u operaciones |
| 8 | 🟠 Alto | `nomina/NominaClient.tsx` + `nomina/page.tsx` | La tabla mostraba siempre **la semana en curso** aunque eligieras quincena/mes/fechas custom; `savePayroll` sí usaba el rango elegido → lo guardado no coincidía con lo mostrado. La página además solo cargaba logs desde el lunes. | Cliente agrega por `loggedAt` dentro del rango; página carga 12 meses de logs |
| 9 | 🟠 Alto | `satelite/simulador/SimClient.tsx` | `cfi` nulo (sin costos fijos registrados) se trataba como 0 → margen irreal "rentable". | Sin CFI no hay simulación; se mantiene el aviso para registrar costos |
| 10 | 🟡 Medio | `operario/actions.ts` | No validaba que la **operación pertenezca a la prenda del atado** (una op de otra prenda pagaba tarifa ajena). También aceptaba `units` no numéricos/negativos/decimales. | Validación de pertenencia + `units` entero 1..10 000 |
| 11 | 🟡 Medio | `ordenes/nueva/actions.ts` | Sin validación server de la matriz: filas `size/color` vacías creaban atados `REF--NN`; `unitPrice ≤ 0` o NaN creaba órdenes inválidas. | Filtrado de matriz + precio > 0 obligatorio |
| 12 | 🟡 Medio | `nomina/actions.ts` | Fechas sin formato ISO estricto ni límite (rango de años → nómina gigante). | Regex `YYYY-MM-DD`, orden coherente, tope 366 días |
| 13 | 🟡 Medio | `tickets/actions.ts` | Cantidad sin cota (podía enviarse un entero enorme). | Entero 1..10 000 |

## Verificado sin cambios (falsos positivos descartados)

- `getBundleSheet` **sí** filtra operaciones/materiales por la prenda del atado (el resultado era idéntico, con o sin `!inner`).
- La página de tickets tolera embeds filtrados por RLS (PostgREST devuelve `null`, no error).
- El manifest PWA es consistente (los iconos maskable que anunciaba el resumen no existen; sin registro de service worker el matcher del middleware no afecta a `/sw.js`).
- `liquidateOrder` re-chequea doble liquidación en servidor (además del unique de DB) y el insert de `order_liquidations` incluye todos los campos NOT NULL.

## Cobertura RLS resultante (0001–0009)

- **Marca** (tenant): tenants propios, profiles de su tenant, prendas/piezas/operaciones/materiales propios, órdenes, atados, logs de su tenant, tickets, liquidaciones.
- **Satélite**: órdenes/atados asignados vía `satellite_user_id`, prenda+piezas+ops+materiales de lo que produce (0007), logs de su equipo (`logs_read_team`), tickets donde interviene (0009 amplió la lectura por orden asignada), recepciones QR propias, nómina propia.
- **Operario**: logs propios, tickets propios, atados/órdenes del taller de su jefe vía `current_satellite_id()` (0007), recepciones del taller.
- **Endurecido en 0009**: INSERT en `tenants`, guardia de escalada en `profiles`, tope de atado con lock.

## Riesgos aceptados para el piloto (documentados)

1. **Tope compartido por taller**: el tope es por `bundle+operación` (suma de todos los operarios del taller), no por operario individual: es el diseño acordado y con el lock de 0009 es seguro ante concurrencia.
2. **Una prenda sin operaciones** nunca produce "entregadas" → la marca no puede liquidarla (decisión consciente: exigir ruta completa antes de despachar).
3. **Orden sin satélite asignado** queda en `cutting`; solo con satélite pasa a `dispatched`. El flujo de reasignación manual no existe aún (recrear orden si te equivocas de email).
4. **Precios por talla**: la ruta de máquinas paga igual todas las tallas (solo los materiales escalan). Queda como siguiente paso.

## Checklist para el piloto (pendiente del usuario)

1. Crear proyecto Supabase (región cercana a Cúcuta, p. ej. `us-east1`/`eastus`).
2. Ejecutar en el SQL Editor, en orden: `0001` → `0009` (9 scripts).
3. Authentication → Providers → Google con Client ID/Secret (redirect `https://TU-PROYECTO.supabase.co/auth/v1/callback`); añadir el dominio de producción a URL redirects.
4. `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, opcional `GEMINI_API_KEY` y `GEMINI_MODEL=gemini-2.0-flash`.
5. Smoke test sugerido (2 cuentas Google reales + 1 terciaria para operario):
   - Marca: onboarding → crear prenda (con y sin foto) → ficha técnica (PDF y print) → orden con satélite → imprimir QR.
   - Satélite: onboarding → escanear/confirmar recepción → ficha del atado (talla y unidades correctas) → marcar +10/+25 hasta el tope (probar el rechazo del tope) → nómina semana.
   - Operario: vincularse por email del jefe → marcar → crear ticket → jefe aprueba → marca despacha.
   - Marca: verificar "entregadas" solo con ruta completa → liquidar → reportes con el pago.
