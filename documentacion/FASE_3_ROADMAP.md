# ROADMAP CORETEXTIL - FASE 3

Este documento almacena las arquitecturas y características planificadas para la próxima gran versión del sistema. 

## 1. Poliempleo de Operarios Libres (Moonlighting)
Actualmente (Fase 2), un operario solo puede estar vinculado a un Jefe de Satélite a la vez (`satellite_owner_id` en `profiles`). 

**Objetivo Fase 3:** 
Permitir que los operarios independientes (Agentes Libres) trabajen por turnos en múltiples satélites sin tener que desvincularse.

**Solución Técnica Planeada:**
- Eliminar `satellite_owner_id` de la tabla `profiles`.
- Crear una tabla de muchos-a-muchos `satellite_operators`:
  - `satellite_owner_id (uuid)`
  - `operator_id (uuid)`
  - `status (enum: active, inactive)`
- Modificar el sistema de Nómina (`payroll_runs`) para que un operario pueda recibir liquidaciones de distintos satélites en el mismo período, basándose estrictamente en los registros de `daily_production_logs` que pertenecen a cada `tenant_id`.

## 2. Otros Puntos (Por Definir)
*(Aquí agregaremos futuras expansiones)*
