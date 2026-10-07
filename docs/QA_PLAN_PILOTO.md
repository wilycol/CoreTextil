# 🧪 Plan Maestro de Pruebas y Matriz QA · CoreTextil V2

**Documento Oficial de Garantía de Calidad (QA Lead)**  
**Fecha:** 2026-10-07  
**Resultado de Pruebas Estáticas & Unitarias:** 🟢 **100% APROBADO (23/23 Tests Verificados)**

---

## 📐 1. Matriz de Flujos de Trabajo e Historias de Usuario (User Stories)

| ID | Flujo de Trabajo | Historia de Usuario (HU) / Caso de Uso | Criterio de Aceptación (QA) | Estado Test |
|---|---|---|---|---|
| **HU-01** | **Onboarding & Roles** | Como usuario nuevo, quiero seleccionar mi rol (Marca, Satélite, Operario) o cambiarlo mediante el Re-Onboarding Universal. | El trigger `guard_profile_role_change` bloquea escaladas no autorizadas pero permite reset a `operator` y asignación a `superadmin`. | 🟢 Pasa |
| **HU-02** | **Vision Engine V2 (IA)** | Como Marca o Patronista, quiero subir un boceto/foto para extraer el ADN de la prenda. | Normalización estricta del ADN; se rechaza cualquier prenda sin piezas u operaciones. | 🟢 Pasa |
| **HU-03** | **Factores por Talla** | Como Taller Satélite, quiero ver el consumo de tela y materiales escalado según la talla del atado. | Aplicación de factores XS (0.95) a XXL (1.20) sobre el consumo base con `scaleBundleMaterials()`. | 🟢 Unitario Pasa (`sizeFactors.test.ts`) |
| **HU-04** | **Órdenes de Corte & Math** | Como Marca, quiero crear una orden con matriz de tallas/colores y generar atados unívoquos con QR. | Cálculo de totales, filtrado de filas vacías y formato seguro en COP (`computeOrderStats`). | 🟢 Unitario Pasa (`orderMath.test.ts`) |
| **HU-05** | **Simulador CFI** | Como Jefe de Satélite, quiero calcular mi costo fijo unitario antes de cotizar un lote. | Cálculo `CFI = Costos Fijos / Capacidad`, alertas de semáforo de rentabilidad sin división por 0. | 🟢 Unitario Pasa (`costing.test.ts`) |
| **HU-06** | **Ruta Completa de Atados** | Como Marca, solo debo liquidar atados cuya ruta de ensamble fue completada al 100%. | `computeDeliveredUnits` exige que TODAS las operaciones alcancen el 100% de unidades del atado. | 🟢 Unitario Pasa (`liquidation.test.ts`) |
| **HU-07** | **Tope de Atado & Locks** | Como Operario, registro piezas confeccionadas en mi bitácora sin superar el tope del atado. | `SELECT ... FOR UPDATE` previene race conditions y la API valida rango 1..10.000 unidades. | 🟢 Pasa |
| **HU-08** | **Tickets de Soporte** | Como Operario o Satélite, creo tickets por faltantes o reportes de fallas con evidencia visual. | Validación de motivos permitidos, límites de cantidad y control de estados por SuperAdmin. | 🟢 Unitario Pasa (`tickets.test.ts`) |
| **HU-09** | **Catálogo Comercial** | Como Visitante en la Landing Page, reviso los planes disponibles y la demostración ejecutiva. | Plan piloto de 60 días a $0, Satélite Monomarca gratis y reproductor interactivo con Autoplay y Pantalla Completa. | 🟢 Unitario Pasa (`branding.test.ts`) |

---

## 🔬 2. Suites de Pruebas Unitarias Automatizadas (`Vitest`)

Hemos automatizado la suite de pruebas unitarias en `tests/` con **Vitest**:

```bash
npm test
```

### Resultados de la Ejecución:
- `tests/sizeFactors.test.ts` (5 tests) — Normalización, factores por defecto, sanitización y escalado de materiales.
- `tests/orderMath.test.ts` (4 tests) — Progreso de orden, cálculo de pendientes, límite de atado y formato COP.
- `tests/costing.test.ts` (3 tests) — Cálculo CFI, protección contra división por cero y semáforo de margen neto.
- `tests/liquidation.test.ts` (4 tests) — Criterio de ruta completa, rechazo de entregas parciales y acumulación operaria.
- `tests/tickets.test.ts` (4 tests) — Validación de causas, cotas de unidades y prevención de datos corruptos.
- `tests/branding.test.ts` (3 tests) — Precios de planes, piloto 60 días y plan sugerido.

**Total:** `6 test files` | `23 passed` (0 fallos).

---

## 📋 3. Protocolo Manual de Smoke Test para el Piloto (Cúcuta)

Para la validación en vivo durante la primera semana del piloto:

1. **Prueba de Marca (Lote Piloto):**
   - Registrar una marca de prueba → Crear prenda con foto en **Vision Engine** → Generar orden de corte → Descargar/Imprimir planilla QR en PDF.
2. **Prueba de Satélite (Recepción y Costeo):**
   - Iniciar sesión como Satélite → Escanear código QR del atado → Verificar que el consumo de insumos corresponda a la talla del atado → Consultar el Simulador CFI.
3. **Prueba de Operario (Registro de Destajo):**
   - Registrar unidades confeccionadas desde un celular Android → Probar el límite de marcación del atado → Generar la Cuenta de Cobro por WhatsApp.
4. **Prueba de Liquidación (Marca):**
   - Verificar que la orden no permita ser liquidada hasta completar la ruta → Realizar la liquidación y consultar el **Resumen Contable con Soporte Fiscal**.
5. **Prueba de Soporte:**
   - Crear un ticket con captura de pantalla desde `/dashboard/soporte` → Resolverlo desde la cuenta `superadmin`.

---

## 🔒 4. Salvaguardas y Garantías de Seguridad Implementadas

1. **Protección de Escalada de Roles:** Ningún usuario puede auto-asignarse el rol de `brand_admin` o `superadmin` mediante llamadas manipulas a la API; la base de datos cuenta con la función de guardia `guard_profile_role_change()`.
2. **Concurrencia en Planta:** Bloqueo explícito `FOR UPDATE` en PostgreSQL para evitar registros duplicados simultáneos de dos operarios sobre el mismo atado.
3. **Integridad Relacional y Re-Onboarding:** El cambio de rol desvincula relaciones sin borrar el historial contable, garantizando idempotencia.
