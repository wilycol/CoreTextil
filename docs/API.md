# CoreTextil API · v1

API interna serverless (Next.js Route Handlers en `/api/v1/*`). Comparte la sesión
Supabase de la PWA (cookies same-origin) y la misma RLS: no hay claves de servicio.

**Contrato uniforme**

```jsonc
// Éxito
{ "ok": true, "data": { /* ... */ } }
// Error
{ "ok": false, "error": "mensaje en español" }
```

**Códigos HTTP**: `200` OK · `201` creado · `400` petición inválida · `401` sin sesión ·
`403` rol/propiedad · `404` no encontrado · `409` tope de atado superado · `500` interno.

---

## GET /api/v1/health

Health check (para uptime de Vercel/monitoring).

```bash
curl https://TU-APP.vercel.app/api/v1/health
```

```jsonc
{ "ok": true, "data": { "service": "coretextil-api", "version": "v1", "time": "2026-09-29T12:00:00.000Z" } }
```

---

## POST /api/v1/ai/explode-garment

Imagen → **ADN de prenda**: despiece, secuencia de ensamble (ruta de máquinas), SAM,
tarifas y materiales sugeridos. Usa Gemini 2.0 Flash si hay `GEMINI_API_KEY`; si no,
caerá al generador heurístico local (`source: "fallback"`).
`maxDuration = 60` (serverless).

**Body** (JSON):
```jsonc
{
  "imageBase64": "/9j/4AAQ...",       // sin prefijo data: (o se limpia solo)
  "mimeType": "image/jpeg",
  "referenceCode": "BML-01",          // obligatorio
  "baseRateCop": 4000,                // destajo total de referencia
  "hintName": "Body manga larga"      // opcional
}
```
O **multipart/form-data** con campos: `image` (File), `referenceCode`, `baseRateCop`, `hintName`.

**Response**:
```jsonc
{ "ok": true, "data": {
  "source": "gemini",                 // "gemini" | "fallback"
  "note": null,
  "dna": {
    "name": "Body manga larga",
    "totalSamMinutes": 4.2,
    "suggestedRetailPrice": 42000,
    "parts": [{ "part_code": "BML-01-FRE", "name": "Frente", "material_type": "tela principal" }],
    "operations": [{ "step_order": 1, "operation_name": "Filetear hombros",
                     "machine_type": "fileteadora", "sam_minutes": 0.5, "base_rate_cop": 476 }],
    "materials": [{ "name": "Tela principal (jersey algodón)", "unit": "m",
                    "quantity_per_garment": 0.45, "unit_cost_cop": 8000 }],
    "materialsCostCop": 5700
  }
} }
```

> Nota: este endpoint **no guarda** nada; la persistencia se hace desde la UI
> (revisión humana del ADN antes de crear la prenda).

---

## POST /api/v1/satellite/calculate-yield

Desglose de **costos fijos unitarios (CFI)**, destajo por máquina y **semáforo** de
rentabilidad antes de aceptar un corte. Roles: `satellite_owner`, `operator`.

**Body** (alternativas):
```jsonc
{ "orderId": "uuid-de-la-orden" }                    // usa precio y prenda de la orden
{ "unitPrice": 4000, "garmentId": "uuid-prenda" }    // simulación libre
```

**Response** (con costos fijos registrados):
```jsonc
{ "ok": true, "data": {
  "hasCostProfile": true,
  "cfi": 350,                          // costo fijo unitario COP
  "workerPoolCop": 4000,               // bolsa total de operarios por prenda
  "byMachine": { "fileteadora": 1900, "plana": 1600, "collarin": 500 },
  "operations": [{ "operation_name": "Filetear hombros", "machine_type": "fileteadora", "base_rate_cop": 476 }],
  "unitPriceCop": 4000,
  "netPerUnitCop": -350,               // unitPrice − CFI − bolsa
  "netMarginPct": -8.8,
  "light": { "label": "A pérdida", "color": "red", "cls": "bg-red-950 text-red-300 border-red-700" }
} }
```
Sin costos fijos: `hasCostProfile: false`, `cfi/netPerUnitCop/netMarginPct/light` en `null`
y una `note` pidiendo registrarlos (mismo criterio que el simulador de la UI).

---

## POST /api/v1/production/log-units

Valida el **tope de bulto** (trigger `enforce_bundle_cap` con `FOR UPDATE` en la base)
y guarda el avance del operario. Roles: `operator`, `satellite_owner`.

**Body**:
```jsonc
{
  "bundleCode": "BML-01-M-NEGRO-01",   // o "bundleId": "uuid"
  "operationId": "uuid-operacion",
  "units": 10
}
```

**Response**:
```jsonc
{ "ok": true, "data": { "earnedCop": 4760, "operation": "Filetear hombros", "bundleCode": "BML-01-M-NEGRO-01" } }
```

**Errores**:
- `409` `"Tope del atado superado: 40 de 40 piezas ya registradas para esta operacion"`
- `403` `"Ese atado no pertenece a tu taller."` / `"Esa operación no pertenece a la prenda del atado."`
- `404` `"Atado no encontrado."` · `401` `"Sesión expirada."`

---

## POST /api/v1/tickets/report

Registro inicial de **novedad** (pieza faltante, tela dañada, insumos insuficientes).
Roles: `operator`, `satellite_owner`. Estado inicial: `pending_satellite`.

**Body**:
```jsonc
{
  "bundleCode": "BML-01-M-NEGRO-01",   // o "bundleId"
  "quantity": 2,
  "reason": "missing_piece",           // missing_piece | damaged_fabric | shortage_supplies
  "partId": "uuid-pieza"               // opcional
}
```

**Response**: `201`
```jsonc
{ "ok": true, "data": { "ticketId": "uuid", "status": "pending_satellite" } }
```

---

## PATCH /api/v1/tickets/:id/verify

**Aprobación o descarte** por el jefe del satélite. Solo si está `pending_satellite`
y el ticket pertenece a su taller. Rol: `satellite_owner`.

**Body**:
```jsonc
{ "action": "approve" }   // "approve" → approved_satellite | "discard" → cancelled
```

**Response**:
```jsonc
{ "ok": true, "data": { "ticketId": "uuid", "status": "approved_satellite" } }
```

Flujo posterior (desde la mesa de corte de la marca): `approved_satellite → dispatched → resolved`.

---

## GET /api/v1/bundles/:code/sheet

Ficha resumida del atado (**"qué coser"**): operaciones con tarifas y materiales
**recalculados a la talla y las unidades del atado**. Roles: satélite/operario.

```bash
curl https://TU-APP.vercel.app/api/v1/bundles/BML-01-M-NEGRO-01/sheet
```

**Response**:
```jsonc
{ "ok": true, "data": {
  "garmentName": "Body manga larga", "referenceCode": "BML-01",
  "size": "XL", "units": 40,
  "totalSamMinutes": 4.2,
  "destajoTotalCop": 4000,
  "materialsCostCop": 5985,             // por prenda a la talla XL (factor 1.1)
  "materialsCostForBundle": 239400,     // tela e insumos de TODO el atado
  "operations": [ /* ruta con tarifas */ ],
  "materials": [{
    "name": "Tela principal (jersey algodón)", "unit": "m",
    "quantity_per_garment": 0.5,         // 0.45 × 1.1 (talla XL)
    "unit_cost_cop": 8000,
    "quantity_for_bundle": 20,           // 0.5 × 40 unidades
    "cost_for_bundle": 160000
  }]
} }
```

---

## POST /api/v1/bundles/receive

**Recepción QR** del atado. RPC atómica `receive_bundle_by_code`: valida que el atado
pertenezca al taller, registra la recepción **una sola vez** (idempotente) y pasa la
orden `dispatched → in_progress`. Roles: satélite/operario.

**Body**: `{ "bundleCode": "BML-01-M-NEGRO-01", "note": "opcional" }`

**Response**: `201`
```jsonc
{ "ok": true, "data": {
  "bundleId": "uuid", "bundleCode": "BML-01-M-NEGRO-01",
  "size": "M", "color": "NEGRO", "units": 40,
  "orderId": "uuid", "orderNumber": "OC-XXXXXX",
  "alreadyReceived": false
} }
```

---

## POST /api/v1/orders/:id/liquidate

**Liquidación por corte** (solo marca dueña): paga únicamente los atados con la
**ruta completa al 100%**, guarda snapshot del nombre del satélite, marca la orden
`completed` y es **única por orden** (DB + re-chequeo).

**Response**:
```jsonc
{ "ok": true, "data": { "orderId": "uuid", "units": 120, "totalCop": 480000 } }
```

**Errores**: `403` no es tu marca · `404` orden no existe ·
`400` `"Aún no hay piezas entregadas que liquidar."` /
`"Esta orden ya fue liquidada por 480000 COP."`
