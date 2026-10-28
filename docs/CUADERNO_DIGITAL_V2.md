# 📖 Cuaderno Digital V2 — Rediseño del cuaderno de anotación diaria

**Fecha:** 2026-10-28 · **Estado:** Implementado y verificado (tests + build)
**Fuentes de diseño:**
- Prototipo: `cuaderno_digital_operario_coretextil.html` (mockup móvil táctil)
- Análisis UX: «Experiencia de Usuario desde la Perspectiva del Operario» (personas Doña Marta y Javier)

---

## 1. Qué es y dónde vive

El **Cuaderno Digital** es el cuaderno de campo del operario: registra su producción
manual (a destajo), le deja evidencia de novedades y arma su cuenta de cobro.

En la app reside en [src/app/dashboard/operario/ManualLogbook.tsx](src/app/dashboard/operario/ManualLogbook.tsx)
y se usa en 3 superficies:

| Superficie | storageKey | Variant |
|---|---|---|
| Operario afiliado (pestaña «Cuaderno Digital») | `coretextil_manual_logs::<userId>` | `personal` |
| Operario libre / sin taller (pantalla completa) | `coretextil_manual_logs::<userId>` | `personal` |
| Dueño de taller que también cose (Mi Producción Propia) | `coretextil_manual_logs::<ownerId>` | `own` |

La lógica de negocio pura (testeable) vive en [src/lib/notebook.ts](src/lib/notebook.ts).

## 2. Lo que se hereda de V1 (sigue intacto)

- 🌎 **Formulario global**: prenda (catálogo universal + personalizada), pieza/proceso
  (piezas cortadas + procesos de costura + prenda completa), color, tela, foto adjunta y tarifa.
- ➕➖ **Sumar y restar piezas** (las restas se pintan en rojo y descontan).
- ✏️ Editar/anular anotaciones, modo compacto, liquidación por rango y WhatsApp.

## 3. Novedades V2 (mapeo prototipo → app)

| Prototipo | V2 en la app | Dónde |
|---|---|---|
| Tarjeta taxímetro ($ hoy / piezas hoy) | Tarjeta con **Ganado hoy + Piezas hoy** | Vista Diario |
| Meta diaria + barra de ritmo `⚡ Vas +2%` | **Taxímetro con ritmo justo**: % tiempo vs % meta, pill de ritmo | Vista Diario |
| `Pausar (Almuerzo)` | **Pausa de jornada** — mientras hay pausa el ritmo *no se juzga* (pacePct 0) | Botón en taxímetro |
| Modal «Mi Horario de Trabajo» | Modal jornada (entrada/salida/meta) | Botón Meta en taxímetro |
| Botones `+10/+25/+50/+100` | Igual + input libre + **＋ Sumar / − Restar** | Formulario |
| `−1 pieza / −10 piezas` (deshacer) | **Corrección táctil instantánea** `↩️ −1 / −10` + `🧹 Limpiar` | Formulario |
| Tarjetas de operaciones frecuentes | **Frecuentes automáticas** del histórico (prenda+pieza+tarifa+color+tela) | Vista Diario |
| Calendario de producción con estados | **Calendario mensual**: Por cobrar (verde) / Cobrado ✓ (índigo) / novedad (rojo) | Vista Calendario/Cobro |
| `Marcar período COBRADO` | Marca los días trabajados del rango (evita doble cobro) | Vista Calendario |
| Cuenta de cobro WhatsApp | Incluye **TOTAL PENDIENTE + Ya cobrado en el rango** + desglose | Vista Calendario |
| Modal novedades con 7 tipos | **Novedades que quedan en el diario** (evidencia en rojo, valor $0) y reporte WhatsApp. FAB flotante 🚨 | Global |

## 4. Modelo de datos (localStorage por usuario)

- `<storageKey>` → `ManualLog[]` con nuevo campo `kind: "production" | "novelty"` y `noveltyType`.
  Los registros V1 se migran automáticamente a `kind: "production"`.
- `<storageKey>::shift` → `{ shiftStart, shiftEnd, goal, pausedDate }` (pausa vive solo el día).
- `<storageKey>::paid` → mapa `{ "YYYY-MM-DD": true }` de días ya cobrados.

**Regla de negocio:** las novedades **no alteran** el destajo ($0, 0 piezas) — dejan
evidencia con fecha para respaldar el cobro; un día con solo novedades no cuenta como
día de trabajo para liquidación, pero sí se pinta rojo en el calendario.

## 5. QA — 3 casos de ejemplo con identidades personales

**Resultado: 37/37 pruebas vitest OK** (14 nuevas en `tests/cuaderno-v2.test.ts`).

### 👵 Persona A — "Doña Marta" (52, poca tecnología)
✅ Caso 1 · Inicia turno y fija expectativa: 208 de 400 uds a las 12:00 en turno
07:00–17:00 → tiempo 50 %, meta 52 %, pace **+2 %** (`on_track`).
✅ Caso 1 · Almorzar sin castigo: con pausa activa `status = "paused"` y pace 0.
✅ Caso 2 · Tocó `+100` por error → toca `−10` → quedan **90 uds = $54.000** bien contadas.
Perspectiva: *"Toco los botones grandes y veo cuánto llevo sin escribir prendas; si
me equivoco, no se me borra la cuenta."*

### 👨 Persona B — "Javier" (24, salta entre máquinas)
✅ Caso 1 · Semana completa sin perder la cuenta: lunes→fecha, 2 días activos,
unidades y sumas exactas por tarifa (600/683/550).
✅ Caso 2 · Frecuentes: sus 2 operaciones top suben como tarjetas de 1 toque (cuello ×3 primero).
✅ Caso 3 · Viernes de pago: marcar la semana traslada **toda** la bolsa pendiente a cobrada.
Perspectiva: *"Cambio de promo a jean y vuelvo sin perder la cuenta; el viernes marco la semana."*

### 🏭 Persona C — "Rosa" (taller satélite integrado)
✅ Caso 1 · Novedad registrada: deja constancia pero **no altera** el destajo ni las piezas,
y un día de solo novedades no cuenta como día de cobro.
✅ Caso 2 · Quincena natural del día 20 → 16–31 de octubre.
✅ Caso 3 · Quincena cerrada: los días pagados se separan de los pendientes (sin doble cobro).
✅ Las novedades nunca aparecen en los frecuentes; su etiqueta es legible en el historial.
Perspectiva: *"El atado vino mal y lo reporté esa misma tarde; cuando me pregunten por ese día, está mi evidencia."*

### 🛡️ Robustez del taxímetro (todas las personas)
✅ Antes del turno → 0 % tiempo; después del cierre → 100 %; horario inválido/invertido → `no_shift` sin NaN.

## 6. Verificación técnica

- `npx tsc --noEmit --skipLibCheck` → **0 errores**
- `npm test` (vitest) → **37/37 OK** (7 archivos)
- `npm run build` → **exit 0**

## 7. Próximos pasos sugeridos (no implementados)

1. Subir el cuaderno a Supabase (`manual_notebook_logs`) para respaldo multi-dispositivo.
2. Conectar «Marcar período COBRADO» con `payroll_runs` real del taller.
3. Widget del calendario para el dueño (aprobar nómina a partir de días cobrados por operario).
