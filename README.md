# CoreTextil SaaS · MVP

Ecosistema que conecta en tiempo real al taller de corte (marcas y diseñadores)
con talleres satélites de ensamble y sus operarios. Mercado inicial:
**Cúcuta, Norte de Santander**.

## Módulos incluidos en este MVP

| Módulo | Rol | Qué resuelve |
|---|---|---|
| **ADN de prenda** | Marca | Despiece con códigos normalizados, ruta de máquinas (plana / fileteadora / collarín), tiempos SAM y tarifas sugeridas |
| **Órdenes de corte** | Marca | Matriz de tendido por talla × color, atados unívocos `REF-TALLA-COLOR-NN` con QR imprimible |
| **Mi taller (costos)** | Satélite | Costos fijos mensuales y cálculo del CFI (costo fijo unitario) para no aceptar cortes a pérdida |
| **Simulador** | Satélite | Ingreso − CFI − bolsa de operarios, con semáforo de rentabilidad (verde ≥ 20 %, amarillo 10–19 %, rojo < 10 %) |
| **Marcación de operarios** | Operario | Botones rápidos +10 / +25 / +50 con **tope estricto por atado** (trigger en la base) y billetera del día |
| **Tickets de faltantes** | Todos | Flujo `pending_satellite → approved_satellite → dispatched → resolved` entre operario, jefe de satélite y mesa de corte |
| **Escáner QR de recepción** | Satélite / Operario | Recibe atados apuntando la cámara a la etiqueta impresa; recepción única por atado y el lote pasa a «En ensamble» |
| **Nómina de operarios** | Satélite | Liquidación semanal/quincenal/mensual a un clic: piezas y destajo por operario, guardada como comprobante (`payroll_runs`) |
| **Liquidación por corte** | Marca | Paga por prendas entregadas vs por ensamblar; al liquidar, la orden pasa a «Completada» (`order_liquidations`) |
| **ADN con IA de visión** | Marca | Sube foto/boceto → Gemini genera despiece, ruta de máquinas, SAM y tarifas (fallback heurístico sin clave) |
| **Ficha técnica imprimible** | Marca | Despiece, ruta de máquinas y costos en documento blanco y negro listo para anexar al corte (`/dashboard/prendas`) |
| **Reportes contables** | Marca | Últimos 12 meses: pagado por corte, prendas y órdenes liquidadas, tickets resueltos, top satélites (`/dashboard/reportes`) |
| **Ficha al escanear** | Satélite / Operario | Al escanear un atado ve la ficha resumida: qué coser, ruta de máquinas, destajo por operación y materiales recalculados para SU talla y SUS unidades |
| **Costo total real** | Marca | Materiales e insumos por prenda (tela, hilos, avíos) en la ficha técnica, con costo total real y margen bruto real |
| **Consumo de tela por talla** | Marca | Factores de consumo por talla (XS 0.95 · S 1 · M 1 · L 1.05 · XL 1.1 · XXL 1.2, editables por prenda): la ficha muestra costo de materiales por talla y el escáner calcula la tela total del atado según su talla y unidades |
| **Ficha técnica en PDF** | Marca | Descarga la ficha como PDF (`jspdf`) además de la impresión del navegador, lista para enviar por WhatsApp al taller |

## Stack

- **Next.js 16** (App Router, Server Actions + **API `/api/v1`**) + **Tailwind 4** — desplegable en Vercel
- **Supabase**: PostgreSQL + Auth Google SSO + RLS multi-tenant + Storage (pendiente para fotos)
- **qrcode** (generación de etiquetas) y **jsqr** (escaneo con cámara) para el ciclo completo del atado
- **jspdf + jspdf-autotable** para la ficha técnica en PDF descargable
- PWA instalable (`public/manifest.webmanifest`) para uso táctil en planta

## API v1 (serverless)

La misma lógica que usa la PWA está expuesta como API interna en `/api/v1/*`:

| Método | Endpoint | Función |
|---|---|---|
| POST | `/api/v1/ai/explode-garment` | Imagen → despiece y secuencia de ensamble (IA + fallback) |
| POST | `/api/v1/satellite/calculate-yield` | CFI, destajo por máquina y semáforo de rentabilidad |
| POST | `/api/v1/production/log-units` | Valida tope de bulto y guarda avance del operario |
| POST | `/api/v1/tickets/report` | Registro inicial de novedad |
| PATCH | `/api/v1/tickets/:id/verify` | Aprobación o descarte por el jefe de satélite |
| GET | `/api/v1/bundles/:code/sheet` | Ficha del atado (materiales por talla y unidades) |
| POST | `/api/v1/bundles/receive` | Recepción QR idempotente |
| POST | `/api/v1/orders/:id/liquidate` | Liquidación por ruta completa (marca) |
| GET | `/api/v1/health` | Health check |

Contrato y ejemplos: **[docs/API.md](docs/API.md)**.

## Documentación

| Documento | Contenido |
|---|---|
| [docs/DEPLOY.md](docs/DEPLOY.md) | Despliegue paso a paso: Supabase (migraciones + Google SSO) y Vercel |
| [docs/BLUEPRINT.md](docs/BLUEPRINT.md) | Blueprint técnico sincronizado con el código |
| [docs/PRD.md](docs/PRD.md) | Especificación técnica / PRD v2.0 |
| [docs/API.md](docs/API.md) | Contratos y ejemplos de la API v1 |
| [docs/QA.md](docs/QA.md) | Informe de QA pre-piloto (bugs corregidos, RLS, checklist) |
| [docs/PITCH_MARCAS.md](docs/PITCH_MARCAS.md) | Pitch para marcas, diseñadores y talleres principales |
| [docs/PITCH_SATELITES.md](docs/PITCH_SATELITES.md) | Pitch para talleres satélite y operarios |

## Puesta en marcha

1. **Base de datos**: crea un proyecto en [supabase.com](https://supabase.com) y ejecuta,
   en orden, los nueve scripts de `supabase/migrations/` en el SQL Editor
   (0001 tablas → 0002 funciones/triggers → 0003 RLS → 0004 recepciones QR → 0005 nómina y liquidaciones → 0006 nombres para reportes → 0007 materiales y acceso del equipo → 0008 consumo por talla → 0009 endurecimiento RLS del QA).
2. **Google SSO**: en Supabase → Authentication → Providers, activa Google con tu
   Client ID/Secret de Google Cloud (redirect: `https://TU-PROYECTO.supabase.co/auth/v1/callback`).
3. **Variables de entorno**: copia `.env.example` a `.env.local` y pega la URL y la
   anon key de tu proyecto. Para el ADN con IA, agrega tu `GEMINI_API_KEY`
   (gratis en [aistudio.google.com/apikey](https://aistudio.google.com/apikey)).
4. **Instalar y correr**:

```bash
npm install
npm run dev
```

5. Abre `http://localhost:3000`, entra con Google y elige tu rol en el onboarding:
   marca (crea tu organización) o taller satélite. Los operarios entran con Google
   y se vinculan escribiendo el email del jefe de su taller.

## Decisiones de diseño clave

- **Multi-tenancy por `tenant_id`** con RLS estricta: cada consulta pasa por
  `current_profile()`, una función `SECURITY DEFINER` que lee el perfil del usuario.
- **Los satélites no son tenants**: se vinculan a marcas vía `satellite_links`.
  Con 1 marca ligada → plan gratis monomarca; con 2+ → Satélite Pro (validación de
  facturación queda como siguiente paso).
- **El tope de destajo vive en la base de datos**, no en la UI: el trigger
  `enforce_bundle_cap` rechaza cualquier insert que supere las unidades del atado,
  aunque se llame a la API directamente.
- **ADN de prenda con IA** (`src/lib/vision.ts`): Gemini analiza la foto y devuelve
  despiece y ruta de máquinas en JSON. El contrato `VisionResult` normaliza la
  respuesta (máquinas válidas, reparto proporcional del destajo por SAM). Sin
  `GEMINI_API_KEY`, `src/lib/ai.ts` mantiene el generador heurístico local.
- **Consumo por talla** (`src/lib/sizeFactors.ts`): el consumo de la ficha es el
  de la talla base (M); las demás tallas multiplican por un factor editable
  guardado en `garments.size_factors` (JSON). El escáner recalcula tela e insumos
  para el atado completo: consumo/prenda × factor de talla × unidades del atado.

## Próximos pasos sugeridos

- Storage de Supabase para evidencias fotográficas de piezas dañadas
- Exportar reportes contables a CSV/PDF para el contador
- Asignar/editar el destajo por talla (hoy la ruta de máquinas es única para todas las tallas)
- Facturación de planes (Piloto 60 días → Emprendedor/Pro/Planta, Satélite Pro)
