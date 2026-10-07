# CoreTextil SaaS · Especificación Técnica / PRD

**Versión**: 2.5 (Actualizada a las funcionalidades implementadas en producción)
**Producto**: CoreTextil SaaS — Plataforma de producción textil descentralizada e impulsada por IA
**Mercado**: Colombia y Latinoamérica (LATAM) · Piloto de campo activo en Cúcuta, Norte de Santander.
**Estado**: Producción funcional verificada (`tsc` 0 errores, `next build` 26 rutas optimizadas, PWA & TWA Android Ready).

---

## 1. Problema de la Industria Textil

En los polos textiles de Colombia y Latinoamérica, las marcas cortan y descentralizan el ensamble en talleres satélites (patios, pequeños talleres familiares). Esta coordinación tradicionalmente sufre por falta de información:

- **Atados perdidos:** Bultos de 20–50 prendas viajan sin trazabilidad; nadie sabe su ubicación exacta.
- **Pagos disputados y cuadernos rayados:** El destajo se anota manualmente; los operarios ignoran su saldo diario y las marcas dudan de los conteos.
- **Sobrerreporte de destajo (Fraude de conteo):** Cobrar más piezas de las cortadas es el error más común y resulta indetectable sin software.
- **Novedades invisibles:** Una pieza faltante o tela dañada se reporta de palabra y paraliza la confección.
- **Margen ciego:** El satélite acepta cortes a pérdida por ignorar su Costo Fijo Unitario (CFI); la marca ignora su costo real (destajo + materiales por talla).

---

## 2. Objetivos del Producto

| # | Objetivo | Métrica de Éxito |
|---|---|---|
| O1 | Trazabilidad total del atado (corte → satélite → operario → pago) | 100% de atados recibidos y rastreados vía QR |
| O2 | Eliminar el sobrerreporte de destajo | 0 pagos por unidades fuera de tope en la base de datos |
| O3 | Billetera transparente para el operario | Saldo diario/semanal e historial cronológico visible en móvil |
| O4 | Decisiones con datos para el satélite | ≥80% de satélites con perfil de Costos Fijos (CFI) registrado |
| O5 | Generación instantánea del ADN de Prenda con IA | Fichas técnicas con IA (Vision Engine V2) y PDF para prendas |
| O6 | Trazabilidad del ecosistema en "Mi Red" | Monitoreo porcentual % en vivo por cada proceso de ensamble |

---

## 3. Usuarios y Roles

| Rol | Descripción | Acciones Clave en la App |
|---|---|---|
| `brand_admin` / `designer` / `cutter` | Marca, diseñador, mesa de corte | Creación de ADN con IA, órdenes de corte, atados QR, mesa de reposición de faltantes, liquidación por ruta completa, reportes contables. |
| `satellite_owner` | Jefe del taller satélite de ensamble | Recepción QR de atados, simulador de rentabilidad CFI, ficha interactiva de avance por marca, gestión de cuadrilla, aprobación de tickets, liquidación de nómina. |
| `operator` | Operario del taller (filete, plana, presille, etc.) | Recepción y escaneo QR, marcación de destajo desde móvil, consulta de Billetera del Día, historial cronológico de piezas, reporte de tickets de faltantes. |

---

## 4. Requerimientos Funcionales Implementados

### Módulo A · Marca y Diseñador
- **A1 ADN de Prenda con IA (Vision Engine V2):** Imagen/boceto → IA multimodal → despiece (`garment_parts`), ruta de máquinas con tarifas (`garment_operations`), materiales (`garment_materials`) y tabla de medidas por talla.
- **A2 Ficha Técnica en PDF:** Generación en 1 clic de documento PDF con 6 secciones descargables.
- **A3 Consumo por Talla:** Factores de consumo de tela por talla (XS a XXL) con matriz de costos.
- **A4 Órdenes de Corte & Atados QR:** Generación de etiquetas QR unívoquas (`REF-TALLA-COLOR-NN`).
- **A5 Liquidación por Corte:** Pago exclusivo a atados con **ruta de procesos completada al 100%** con comprobante digital unívoco.
- **A6 Mesa de Reposición de Faltantes:** Despacho de tickets aprobados por satélites con nomenclatura unívoqua.
- **A7 Ecosistema "Mi Red":** Visualización en tiempo real de los satélites afiliados y su avance por lote.

### Módulo B · Taller Satélite
- **B1 Perfil de Costos Fijos (CFI):** Registro de costos fijos mensuales (arriendo, energía, consumibles, mantenimiento).
- **B2 Simulador con Semáforo:** Cálculo de rentabilidad por corte (Verde ≥20%, Amarillo 10-19%, Rojo <10%).
- **B3 Recepción QR Idempotente:** Escaneo con cámara del celular (`jsQR`) con recepción única por atado.
- **B4 Ficha del Atado & Materiales:** Desglose de "qué coser" con materiales recalculados a la talla y unidades del atado.
- **B5 Ficha de Marca en "Mi Red":** Monitoreo porcentual % en vivo por cada proceso (Corte, Filete, Plana, Collarín, Presille, Pulido).
- **B6 Nómina a 1 Clic:** Liquidación unificada por periodo (semanal/quincenal) con comprobante digital.

### Módulo C · Operarios y Cuadrilla
- **C1 Marcación de Destajo Móvil:** Botones táctiles `+10` / `+25` / `+50` / cantidad libre con tope validado en DB (`FOR UPDATE`).
- **C2 Billetera del Día & Historial Cronológico:** Vista en tiempo real del dinero ganado y desglose por fecha, atado, operación y valor.
- **C3 Módulo "Mi Cuadrilla de Operarios":** Vista del jefe de taller para consultar la producción acumulada de cada operario.
- **C4 Tickets de Novedades:** Registro de piezas faltantes o tela dañada con flujo de aprobación.

### Módulo D · Plataforma & Resiliencia
- **D1 Google SSO:** Autenticación con creación automática de perfil (`handle_new_user`).
- **D2 PWA / TWA Android Ready:** Aplicación instalable en teléfonos Android sin requerir computadores en planta.
- **D3 Resiliencia Visual Base64:** Logotipos oficiales codificados en Base64 (`logo_base64.ts`), garantizando renderizado instantáneo en 0ms sin fallas de caché o red.
- **D4 API v1 Serverless:** Endpoints uniformes compartidos con la aplicación.

---

## 5. Requerimientos No Funcionales

| Categoría | Especificación | Estado |
|---|---|---|
| Seguridad | RLS en el 100% de las tablas; aislamiento multi-tenant en base de datos. | ✅ |
| Integridad | Lock de concurrencia `FOR UPDATE` en marcación de destajo y unicidad de liquidación. | ✅ |
| Usabilidad Móvil | PWA y TWA táctil, botones gigantes, escaneo QR rápido con cámara. | ✅ |
| Performance | Renderizado Base64 nativo en 0ms; builds de producción con 26 rutas optimizadas. | ✅ |
| Resiliencia IA | Fallback heurístico local para generación de ADN en caso de falla de API externa. | ✅ |
| Idioma & Alcance | Interfaz 100% en español; optimizada para Colombia y Latinoamérica (LATAM). | ✅ |

---
*CoreTextil SaaS · PRD v2.5 (Colombia y LATAM).*
