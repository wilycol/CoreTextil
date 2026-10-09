# 🧪 Guía Completa de Pruebas Manuales y Recorrido de UI — CoreTextil V2

**Documento de Control de Calidad Visual & Funcional (QA Manual Guide)**  
**Fecha:** 2026-10-07  
**Autor:** Beatriz — Serie X Elite (QA Lead & UX Forensic Engineer)  
**Destinatario:** Wily Col (Lead AI Architect)

---

## 🎯 PROPÓSITO DEL DOCUMENTO

Este documento convierte cada pantalla, modal y componente interactivo de **CoreTextil V2** en un procedimiento paso a paso de **Prueba Manual de Calidad (QA)**. 

Cada sección aplica la metodología BDD **"Como [Rol] quiero [Acción] para [Beneficio]"** e identifica las posibles **desviaciones, estados de error y casos de borde (Edge Cases)** que debes verificar durante las pruebas en vivo.

---

## 📑 ÍNDICE DE RECORRIDO DE LA INTERFAZ

1. [Landing Page Comercial (`/`)](#1-landing-page-comercial-)
2. [Autenticación e Inicio de Sesión (`/auth/login`)](#2-autenticación-e-inicio-de-sesión-authlogin)
3. [Selector de Rol y Onboarding (`/onboarding`)](#3-selector-de-rol-y-onboarding-onboarding)
4. [Dashboard Principal / Hub Central (`/dashboard`)](#4-dashboard-principal--hub-central-dashboard)
5. [Creación de Prenda con IA — Vision Engine V2 (`/dashboard/nueva-prenda`)](#5-creación-de-prenda-con-ia--vision-engine-v2-dashboardnueva-prenda)
6. [Catálogo de Prendas y Ficha Técnica (`/dashboard/prendas` y `/[id]`)](#6-catálogo-de-prendas-y-ficha-técnica-dashboardprendas-y-id)
7. [Emisión de Nueva Orden de Corte (`/dashboard/ordenes/nueva`)](#7-emisión-de-nueva-orden-de-corte-dashboardordenesnueva)
8. [Seguimiento de Orden y Hoja QR (`/dashboard/ordenes` y `/[id]`)](#8-seguimiento-de-orden-y-hoja-qr-dashboardordenes-y-id)
9. [Escáner QR de Atados Móvil (`/dashboard/escanear`)](#9-escáner-qr-de-atados-móvil-dashboardescanear)
10. [Taller Satélite y Capacidades (`/dashboard/satelite`)](#10-taller-satélite-y-capacidades-dashboardsatelite)
11. [Simulador de Costo Fijo Unitario — CFI (`/dashboard/satelite/simulador`)](#11-simulador-de-costo-fijo-unitario--cfi-dashboardsatelitesimulador)
12. [Bitácora de Operario y Marcación de Destajo (`/dashboard/operario`)](#12-bitácora-de-operario-y-marcación-de-destajo-dashboardoperario)
13. [Gestión de Nómina del Taller (`/dashboard/nomina`)](#13-gestión-de-nómina-del-taller-dashboardnomina)
14. [Marketplace de Talento y Capacidad (`/dashboard/talento`)](#14-marketplace-de-talento-y-capacidad-dashboardtalento)
15. [Mesa de Ayuda, Soporte y Feedback Hub (`/dashboard/soporte`)](#15-mesa-de-ayuda-soporte-y-feedback-hub-dashboardsoporte)
16. [Tablero de Tickets de Faltantes (`/dashboard/tickets`)](#16-tablero-de-tickets-de-faltantes-dashboardtickets)
17. [Reportes Contables y Soporte DIAN (`/dashboard/reportes`)](#17-reportes-contables-y-soporte-dian-dashboardreportes)
18. [Perfil de Usuario, Re-Onboarding y Baja (`/dashboard/perfil`)](#18-perfil-de-usuario-re-onboarding-y-baja-dashboardperfil)
19. [Flujo de Invitaciones (`/invite/[token]` + Botón WhatsApp)](#19-flujo-de-invitaciones-invitetoken--botón-whatsapp)
20. [Mi Red (`/dashboard/red`)](#20-mi-red-dashboarred)
21. [Configuración de Marca y Banner de Pendientes (`/dashboard/marca`)](#21-configuración-de-marca-y-banner-de-pendientes-dashboarmarca)
22. [Perfil Técnico del Operario (`/dashboard/operario/perfil`)](#22-perfil-técnico-del-operario-dashboardoperarioperfil)
23. [Guía Vision Engine — Fotos Calibradas (`/dashboard/guias/vision-engine`)](#23-guía-vision-engine--fotos-calibradas-dashboardguiasvision-engine)
24. [PWA: Instalación, Service Worker y Modo Offline](#24-pwa-instalación-service-worker-y-modo-offline)

---

## 1. LANDING PAGE COMERCIAL (`/`)

### 👤 Identidad de Usuario
Visitante, Posible Cliente (Marca o Taller Satélite), Inversionista.

### 📜 Historia de Usuario (BDD)
> **Como** visitante o cliente potencial,  
> **quiero** explorar los beneficios de CoreTextil, ver el video oficial y la presentación ejecutiva,  
> **para** comprender la propuesta de valor e iniciar mi prueba gratuita de 60 días.

### 🧭 Recorrido UI (User Journey)
1. **Hero Section:** Título dinámico "Tu producción de confección en vivo", insignia de piloto en Cúcuta y botón "Empezar gratis".
2. **Sección Video Documental IA:** Reproductor HTML5 con poster `/logo.png` que reproduce el video promocional de Notebook LM (`/media/CoreTextil__Conectando_LATAM.mp4`).
3. **Sección Pitch Deck V2:** 
   - Carrusel de 12 diapositivas.
   - Botones: `← Anterior`, `▶ Reproducir Carrusel` (Autoplay 4s), `⛶ Pantalla Completa`, `Siguiente →`.
   - Clic en imagen abre la **Modal de Pantalla Completa** con botón `🔄 Girar 90°` para teléfonos en vertical.
4. **Sección Guía Paso a Paso:** Explicación del ADN de prenda + Botón "📋 Copiar Prompt de IA" con confirmación en toast ("✓ ¡Prompt Copiado!").
5. **Sección Catálogo de Planes:** Planes para Marcas (Piloto 60 días $0, Emprendedor, Marca Pro destacado) y Satélites (Monomarca $0, Satélite Pro).

### 🔍 Lista de Verificación Manual & Posibles Desviaciones (QA Checklist)
- [ ] **Video HTML5:** Hacer clic en reproducir. Verificar sonido claro y reproducción fluida sin buffering.
- [ ] **Autoplay Carrusel:** Presionar `▶ Reproducir Carrusel`. Verificar que cambie de diapositiva cada 4 segundos.
- [ ] **Pantalla Completa:** Hacer clic sobre la diapositiva. Verificar que cubra todo el viewport.
- [ ] **Giro 90° en Celular:** En celular vertical, presionar `🔄 Girar 90°`. Verificar que la imagen rote 90 grados y se amplíe legiblemente.
- [ ] **Copiado de Prompt:** Presionar "Copiar Prompt". Abrir un bloc de notas y pegar (`Ctrl+V`). Verificar que el texto del prompt master se haya copiado sin caracteres corruptos.

---

## 2. AUTENTICACIÓN E INICIO DE SESIÓN (`/auth/login`)

### 👤 Identidad de Usuario
Cualquier usuario registrado o nuevo.

### 📜 Historia de Usuario (BDD)
> **Como** usuario de CoreTextil,  
> **quiero** iniciar sesión con mi cuenta corporativa de Google OAuth,  
> **para** acceder de forma segura a mi panel según mi rol asignado.

### 🧭 Recorrido UI
1. Tarjeta central limpia con logotipo de CoreTextil.
2. Botón principal: "Entrar con Google" (`/auth/login`).
3. Al hacer clic, redirige a la consola de Supabase Auth OAuth -> Google.
4. Tras autorizar, regresa a `/auth/callback` y efectúa la redirección inteligente:
   - Si no tiene rol -> `/onboarding`.
   - Si tiene rol -> `/dashboard`.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Login Exitoso:** Iniciar sesión con cuenta real de Google. Verificar que no haya bucles infinitos de redirección.
- [ ] **Cancelación de OAuth:** Cancelar la ventana emergente de Google. Verificar que la pantalla regrese limpiamente al login sin pantallas blancas de error.

---

## 3. SELECTOR DE ROL Y ONBOARDING (`/onboarding`)

### 👤 Identidad de Usuario
Usuario recién registrado (Rol inicial `'operator'`).

### 📜 Historia de Usuario (BDD)
> **Como** usuario nuevo,  
> **quiero** elegir mi perfil (Marca, Satélite u Operario) y completar mis datos iniciales,  
> **para** habilitar las herramientas específicas de mi trabajo.

### 🧭 Recorrido UI
1. **Tres Tarjetas de Identidad:**
   - **Opción A (Marca/Diseñador):** Muestra el formulario para crear el nombre de la Marca (Crea el `tenant` en DB).
   - **Opción B (Taller Satélite):** Muestra el formulario para ingresar el Nombre del Taller y número de máquinas.
   - **Opción C (Operario de Costura):** Muestra el campo para ingresar el correo electrónico del Jefe de Taller al cual se vinculará (`satellite_owner_id`).
2. Botón "Confirmar y Comenzar".

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Marca:** Crear marca con nombre "Confecciones Cúcuta Test". Verificar redirección al dashboard de marca.
- [ ] **Operario con Email Inválido:** Ingresar un correo de jefe de taller que NO existe en el sistema. Verificar que el servidor muestre la alerta: *"No se encontró ningún taller satélite registrado con ese correo"*.
- [ ] **Prevención de Cambio Directo:** Intentar alterar la petición HTTP para ser `superadmin`. Verificar que el trigger PostgreSQL lo rechace.

---

## 4. DASHBOARD PRINCIPAL / HUB CENTRAL (`/dashboard`)

### 👤 Identidad de Usuario
Todos los roles (`brand_admin`, `satellite_owner`, `operator`, `superadmin`).

### 📜 Historia de Usuario (BDD)
> **Como** usuario autenticado,  
> **quiero** ver un resumen directo de mis accesos principales y métricas de producción,  
> **para** navegar rápidamente a mis tareas diarias.

### 🧭 Recorrido UI
1. **Encabezado:** Saludo personalizado con el nombre del usuario, insignia de rol activa y botón de perfil/configuración.
2. **Matriz Adaptativa de Tarjetas:**
   - **Si es Marca:** Tarjetas "Crear Prenda IA", "Nueva Orden de Corte", "Mis Órdenes", "Reportes Contables".
   - **Si es Satélite:** Tarjetas "Escanear QR", "Simulador CFI", "Mi Taller", "Nómina de Operarios".
   - **Si es Operario:** Tarjetas "Mi Bitácora de Destajo", "Mesa de Ayuda", "Mi Perfil".
   - **Si es SuperAdmin:** Tarjetas omnipresentes para auditar marcas, satélites, reportes y tickets de soporte.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Visibilidad de Tarjetas:** Iniciar sesión con cada rol y verificar que las tarjetas no muestren módulos prohibidos para ese rol.
- [ ] **SuperAdmin Omnipresente:** Iniciar sesión como `superadmin`. Verificar que todas las tarjetas administrativas se desplieguen sin excepción.

---

## 5. CREACIÓN DE PRENDA CON IA — VISION ENGINE V2 (`/dashboard/nueva-prenda`)

### 👤 Identidad de Usuario
Marca, Diseñador o Patronista Industrial (`brand_admin`, `superadmin`).

### 📜 Historia de Usuario (BDD)
> **Como** diseñador de modas,  
> **quiero** cargar una foto o boceto de una prenda para que el Vision Engine extraiga su ADN,  
> **para** generar la ficha técnica, lista de piezas y árbol de operaciones en segundos.

### 🧭 Recorrido UI
1. **Zona de Carga:** Input de archivo de imagen (JPG/PNG) o cámara.
2. **Caja del Prompt Master:** Muestra el prompt editable con instrucciones de patronaje.
3. **Botón "Generar ADN con IA":** Muestra indicador de carga y spinner.
4. **Formulario Resultante (Editable):**
   - Nombre de prenda, silueta, género.
   - **Tabla 1: Piezas Cortadas (`garment_parts`):** Nombre, consumo base en metros por pieza, material. Botón `+ Agregar Pieza`.
   - **Tabla 2: Medidas por Talla (`garment_measurements`):** Matriz de tolerancias.
   - **Tabla 3: Árbol de Operaciones (`garment_operations`):** Nombre de operación, tipo de máquina (Fileteadora, Plana, Collarín, Presilladora), tiempo SAM en segundos, tarifa COP sugerida.
5. Botón "Guardar Ficha Técnica en Base de Datos".

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Carga de Imagen Real:** Subir foto de un Jean o Camiseta. Verificar que Gemini responda en <10s con las piezas y operaciones.
- [ ] **Intento de Guardar Vacío:** Eliminar todas las piezas y operaciones e intentar guardar. Verificar que el servidor muestre el error: *"No se puede guardar una prenda sin piezas u operaciones"*.
- [ ] **Edición de Tarifas:** Modificar el precio de una operación de $1.200 a $1.500 COP. Guardar y verificar persistencia.

---

## 6. CATÁLOGO DE PRENDAS Y FICHA TÉCNICA (`/dashboard/prendas` y `/[id]`)

### 👤 Identidad de Usuario
Marca y Satélite vinculado.

### 📜 Historia de Usuario (BDD)
> **Como** patronista o jefe de taller,  
> **quiero** consultar la ficha técnica detallada de cualquier prenda del catálogo y exportarla en PDF,  
> **para** instruir a los operarios en la planta de costura.

### 🧭 Recorrido UI
1. Grid de prendas guardadas con foto miniatura, fecha y cantidad de operaciones.
2. Al hacer clic en una prenda: Vista detallada Ficha Técnica.
3. **Botones de Exportación:**
   - Botón `📄 Exportar Ficha en PDF (jsPDF)` -> Descarga archivo `.pdf`.
   - Botón `🖨️ Vista de Impresión` -> Abre cuadro de diálogo de impresión del navegador (`window.print()`).

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Generación PDF:** Presionar "Exportar Ficha en PDF". Abrir el PDF descargado y verificar que las tablas de operaciones e insumos estén perfectamente maquetadas.

---

## 7. EMISIÓN DE NUEVA ORDEN DE CORTE (`/dashboard/ordenes/nueva`)

### 👤 Identidad de Usuario
Marca / Taller de Corte (`brand_admin`).

### 📜 Historia de Usuario (BDD)
> **Como** jefe de producción de la marca,  
> **quiero** crear una orden de corte asignada a un satélite con su matriz de tallas y precio acordado,  
> **para** generar los atados de confección con sus códigos QR.

### 🧭 Recorrido UI
1. Selector desplegable de Prenda.
2. Selector desplegable de Taller Satélite asignado.
3. Campo de **Precio Unitario Acordado (COP)** por prenda completa.
4. **Matriz Dinámica de Tallas y Colores:**
   - Botón `+ Agregar Fila (Talla / Color / Cantidad)`.
   - Campos: Talla (XS a XXL), Color, Cantidad de Unidades (ej. L - Azul - 100 unidades).
5. Checkbox "Dividir en atados automáticos de 50 unidades".
6. Botón "Crear Orden de Corte y Emitir QR".

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Precio Inválido:** Ingresar `$0` o un valor negativo en el precio acordado. Verificar que el servidor impida la creación.
- [ ] **Matriz de Corte:** Ingresar 100 unidades Talla L Azul y 50 Talla M Rojo. Guardar y verificar que cree 3 atados: dos de 50 L Azul y uno de 50 M Rojo.

---

## 8. SEGUIMIENTO DE ORDEN Y HOJA QR (`/dashboard/ordenes` y `/[id]`)

### 👤 Identidad de Usuario
Marca y Taller Satélite.

### 📜 Historia de Usuario (BDD)
> **Como** gerente de marca o satélite,  
> **quiero** monitorear el porcentaje de avance en vivo de cada orden y generar sus hojas de atado QR,  
> **para** controlar la producción y proceder con la liquidación al terminar.

### 🧭 Recorrido UI
1. Barra de progreso visual (% completado en tiempo real).
2. Resumen financiero: Unidades Totales, Unidades Entregadas (Ruta Completa), Unidades Pendientes, Valor Entregado (COP).
3. **Lista de Atados (`order_bundles`):** Código de atado (`REF--NN`), talla, color, estado.
4. Botón `🖨️ Imprimir Planilla de Atados QR`.
5. **Botón "Liquidar Orden completa":** Se activa cuando hay unidades entregadas bajo la regla de ruta completa.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Verificación de Entregadas Parciales:** Con una orden de 100 unidades donde solo 1 operación de 4 fue marcada, verificar que el contador de "Unidades Entregadas" diga `0` y el botón de liquidación no procese valores incompletos.
- [ ] **Hoja QR:** Presionar "Imprimir Planilla QR". Verificar que los códigos QR se rendericen nítidamente.

---

## 9. ESCÁNER QR DE ATADOS MÓVIL (`/dashboard/escanear`)

### 👤 Identidad de Usuario
Jefe de Satélite o Operario (`satellite_owner`, `operator`).

### 📜 Historia de Usuario (BDD)
> **Como** operario o jefe de taller en la planta de costura,  
> **quiero** escanear con la cámara del celular el código QR de un atado,  
> **para** confirmar la recepción del lote y ver los insumos ajustados a su talla.

### 🧭 Recorrido UI
1. Visor de cámara móvil con cuadro de enfoque QR (`jsQR`).
2. Campo alternativo de **Búsqueda Manual por Código** (ej. `ORD-004-L-01`).
3. **Ficha Resultante del Atado (`bundleSheet`):**
   - Muestra el consumo de materiales escalado por el factor de la talla (ej. Talla XL = 1.1x tela).
   - Lista de operaciones del atado.
   - Botón "Confirmar Recepción en Taller".

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Escaneo en Celular:** Escanear un QR desde la pantalla o papel impreso. Verificar respuesta en <1 segundo.
- [ ] **Código Inexistente:** Digitar un código falso `ABC-999`. Verificar mensaje: *"Atado no encontrado en el sistema"*.

---

## 10. TALLER SATÉLITE Y CAPACIDADES (`/dashboard/satelite`)

### 👤 Identidad de Usuario
Jefe de Satélite (`satellite_owner`).

### 📜 Historia de Usuario (BDD)
> **Como** propietario de un taller satélite,  
> **quiero** registrar mis máquinas de coser y vincular a mis operarios,  
> **para** calcular mi capacidad operativa y ofrecer servicios en el Marketplace.

### 🧭 Recorrido UI
1. Formulario de Perfil del Taller: Nombre, Dirección en Cúcuta, Teléfono WhatsApp.
2. Conteo de maquinaria: Cantidad de Fileteadoras, Planas, Collarines, Presilladoras, Dos agujas.
3. Lista de Operarios vinculados por correo electrónico.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Actualización de Maquinaria:** Cambiar cantidad de Fileteadoras de 3 a 5. Guardar y verificar actualización.

---

## 11. SIMULADOR DE COSTO FIJO UNITARIO — CFI (`/dashboard/satelite/simulador`)

### 👤 Identidad de Usuario
Jefe de Satélite (`satellite_owner`).

### 📜 Historia de Usuario (BDD)
> **Como** propietario de satélite,  
> **quiero** ingresar mis costos fijos mensuales (arriendo, luz, insumos) y capacidad de prendas,  
> **para** obtener mi CFI exacto y saber si el precio de una marca me deja ganancia.

### 🧭 Recorrido UI
1. Formulario de Gastos Fijos Mensuales:
   - Arriendo del local ($).
   - Servicio de energía eléctrica ($).
   - Consumibles e insumos de aseo/aceite ($).
   - Mantenimiento preventivo de máquinas ($).
   - Capacidad mensual estimada de prendas (unidades).
2. **Tarjeta Resultante del CFI:** Muestra el costo fijo por unidad (COP).
3. **Simulador de Cotización:** Ingresar el precio ofrecido por la marca y el pago a operarios. Muestra el **Semáforo de Rentabilidad** (🟢 Verde, 🟡 Amarillo, 🔴 Rojo).

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Sin Capacidad (División por cero):** Ingresar `0` en prendas mensuales. Verificar que el sistema use la salvaguarda `Math.max(1, 0)` sin arrojar un error `NaN` o `Infinity`.
- [ ] **Semáforo a Pérdida:** Simular un lote con CFI de $2.000, mano de obra de $3.000 y oferta de marca de $4.500. Verificar que el semáforo cambie a 🔴 Rojo ("A pérdida").

---

## 12. CUADERNO DIGITAL Y MARCACIÓN DE DESTAJO (`/dashboard/operario`)

### 👤 Identidad de Usuario
Operario de Confección (`operator`), Jefe de Satélite (`satellite_owner`), Operario Libre.

### 📜 Historia de Usuario (BDD) — Navegación
> **Como** operario de costura,  
> **quiero** que mi **Cuaderno Digital** sea la primera opción del menú y de la página,  
> **para** anotar y consultar mis cuentas sin buscar entre otras herramientas.

### 🧭 Recorrido UI — Estructura con Pestañas (Cuaderno primero)
1. **Tarjeta del Dashboard:** «📖 Cuaderno Digital» es la PRIMERA tarjeta del menú del operario (antes de Escanear y de la Billetera).
2. **Página con 2 pestañas:**
   - **Pestaña 1 — 📖 Cuaderno Digital (por defecto):** Billetera del día (Ganado hoy / Piezas de hoy) + historial de anotaciones.
   - **Pestaña 2 — ⚙️ Marcación de Atados:** registro formal contra `daily_production_logs` con tope estricto por atado.
3. **Modo Operario Libre (sin taller):** el Cuaderno Digital Personal (localStorage) toma toda la página: registrador rápido con proceso personalizado («Otro proceso»), foto opcional, calculadora de liquidación por período y cuenta de cobro por WhatsApp.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Orden del menú:** Verificar que «📖 Cuaderno Digital» aparece PRIMERA en el menú del operario y del satélite.
- [ ] **Pestaña por defecto:** Al entrar a `/dashboard/operario`, la vista inicial debe ser el Cuaderno Digital, no la marcación.
- [ ] **Prueba de Límite de Atado:** En un atado de 50 unidades, intentar registrar 60. Verificar que el trigger `enforce_bundle_cap` rechace la marcación.
- [ ] **Cuenta de Cobro WhatsApp:** Verificar que el mensaje incluya período, total COP, piezas y desglose.

---

### 📜 Historia de Usuario (BDD) — Cuaderno Personal Editable
> **Como** operario libre que usa su cuaderno personal,  
> **quiero** corregir o eliminar una anotación si me equivoqué contando,  
> **para** que mi cuaderno refleje la cuenta real y no arrastre errores a mi liquidación.

### 🧭 Recorrido UI
1. En el historial, cada anotación tiene botones `✏️` (corregir cantidad) y `🗑️` (eliminar).
2. Al corregir, el total se recalcula con la tarifa (Cantidad × Tarifa) al instante.
3. **Botón `🔲 Iconos` / `📋 Detalle`:** alterna entre lista detallada y cuadrícula de iconos pequeños (prenda, piezas y total al tacto; tocar un icono abre confirmación de eliminación).
4. **Procesos personalizados:** el select «✏️ Otro proceso» permite crear operaciones nuevas que quedan en la lista para usos futuros.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Edición recalcula total:** Corregir de 10 a 25 piezas con tarifa $600. Verificar que el total pase de $6.000 a $15.000 y que la billetera del día suba.
- [ ] **Eliminación con confirmación:** Tocar 🗑️ y cancelar. Verificar que el registro NO se borre. Confirmar y verificar que desaparezca y la billetera baje.
- [ ] **Vista de iconos:** Alternar a `🔲 Iconos`. Verificar la cuadrícula con prenda/piezas/total y que al tocar un icono pida confirmación antes de borrar.
- [ ] **Persistencia:** Corregir una anotación, recargar la PWA y verificar que el cambio sobrevive (localStorage).

---

### 📜 Historia de Usuario (BDD) — Doble Confirmación (Operario Afiliado a Satélite)
> **Como** operario afiliado a un taller satélite,  
> **quiero** que corregir o eliminar una anotación del taller requiera la aprobación del dueño,  
> **para** que ninguna parte pueda alterar sola las cuentas que alimentan la nómina (ej. cuello rib con 2 procesos: fileteadora para pegar y plana para pisar — la desviación típica es anotar los 2 procesos como 1).

### 🧭 Recorrido UI
1. **Operario (pestaña Cuaderno Digital):** en sus anotaciones ve `✏️ Corregir` y `🗑️ Eliminar`.
   - Corregir abre modal con cantidad correcta + motivo visible para el dueño.
   - Enviar crea la solicitud: **el registro NO cambia todavía**; queda «Pendiente».
2. **Dueño del taller (pestaña Cuaderno Digital):** panel «🕊️ Solicitudes de corrección de mi equipo» con `✅ Aprobar` / `✕ Rechazar`.
   - Aprobar aplica el cambio: ajusta unidades, recalcula el pago con la tarifa de la operación y respeta el tope del atado; o elimina la anotación.
   - Rechazar deja el registro intacto.
3. **Regla de doble confirmación:** una sola parte nunca basta. Solo hay 1 solicitud pendiente por anotación.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **No destructivo:** Solicitar corrección como operario y verificar que el historial SIGA mostrando los valores originales hasta que el dueño apruebe.
- [ ] **Aprobación aplica y recalcula:** Aprobar una corrección de 50→40 piezas. Verificar unidades, pago (tarifa × 40) y que la billetera del día baje en ambos perfiles.
- [ ] **Rechazo conservador:** Rechazar una solicitud. Verificar que el registro quede exactamente igual y la solicitud marcada como decidida.
- [ ] **Eliminación por ambos:** Solicitar eliminación y aprobarla. Verificar que la anotación desaparezca de ambos lados.
- [ ] **Tope respetado al corregir:** Intentar corregir por encima del cupo libre del atado. Verificar que la RPC `decide_logbook_change` rechace con mensaje claro.
- [ ] **Aislamiento:** Verificar que el operario solo pueda solicitar cambios sobre SUS anotaciones (RLS `logbook_requests_insert_operator`).

---

## 13. GESTIÓN DE NÓMINA DEL TALLER (`/dashboard/nomina`)

### 👤 Identidad de Usuario
Jefe de Satélite (`satellite_owner`).

### 📜 Historia de Usuario (BDD)
> **Como** jefe de taller satélite,  
> **quiero** ver el acumulado de destajo de todos mis operarios en un rango de fechas y generar la nómina,  
> **para** pagar los sueldos al día sin discrepancias ni cuadernos de papel.

### 🧭 Recorrido UI
1. Selector de Rango de Fechas (Semanal, Quincenal o Personalizado).
2. Tabla de Operarios: Nombre, piezas procesadas, total a pagar (COP).
3. Desglose detallado por operario al hacer clic.
4. Botón "Guardar y Saludar Nómina".

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Filtro de Rango:** Seleccionar la semana pasada. Verificar que las cifras de la tabla se actualicen estrictamente a los logs guardados en esas fechas.

---

## 14. MARKETPLACE DE TALENTO Y CAPACIDAD (`/dashboard/talento`)

### 👤 Identidad de Usuario
Marcas y Satélites (`brand_admin`, `satellite_owner`, `superadmin`).

### 📜 Historia de Usuario (BDD)
> **Como** marca o taller con capacidad libre,  
> **quiero** publicar mi disponibilidad u ofertar talleres de confección en Cúcuta,  
> **para** conseguir contratos de maquiia o contratar mano de obra calificada sin intermediarios.

### 🧭 Recorrido UI
1. **Pestañas de Filtrado:**
   - `Operarios Libres` (Costureros disponibles).
   - `Satélites Buscando Marcas` (Talleres con máquinas libres).
   - `Marcas Buscando Maquila` (Lotes de corte buscando taller de ensamble).
2. Tarjetas de contacto con botón directo "Contactar por WhatsApp".

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Navegación por Pestañas:** Cambiar entre pestañas. Verificar que las tarjetas filtren según la categoría seleccionada.

---

## 15. MESA DE AYUDA, SOPORTE Y FEEDBACK HUB (`/dashboard/soporte`)

### 👤 Identidad de Usuario
Todos los usuarios y SuperAdmin (`operator`, `satellite_owner`, `brand_admin`, `superadmin`).

### 📜 Historia de Usuario (BDD)
> **Como** usuario que encuentra una falla o desea proponer una mejora durante el piloto,  
> **quiero** enviar un ticket de soporte con adjunto de captura de pantalla,  
> **para** recibir atención rápida del equipo técnico.

### 🧭 Recorrido UI
1. **Formulario Inteligente de Ticket:**
   - Desplegable de Categoría: `Reporte de Bug / Falla`, `Sugerencia de Mejora`, `Solicitud de Nueva Función`, `Duda Operativa`.
   - Desplegable de Prioridad: `Baja`, `Media`, `Alta`, `Crítica`.
   - Campo de Asunto y Descripción detallada.
   - **Adjunto de Evidencia Visual:** Subir captura de pantalla (PNG/JPG).
2. Botón `Enviar Ticket de Soporte`.
3. **Botonera de Emergencia:** Botón directo "Atención Inmediata por WhatsApp".
4. **Panel de Gestión de Tickets (Exclusivo SuperAdmin):** Cambiar estado del ticket (`Abierto`, `En Progreso`, `Resuelto`, `Cancelado`).

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Adjuntar Captura de Pantalla:** Subir una imagen de prueba. Verificar que se cargue la vista previa correctamente.
- [ ] **Gestión SuperAdmin:** Iniciar sesión como `superadmin`, ir a `/dashboard/soporte` y cambiar el estado de un ticket a "Resuelto". Verificar persistencia.

---

## 16. TABLERO DE TICKETS DE FALTANTES (`/dashboard/tickets`)

### 👤 Identidad de Usuario
Operario, Jefe de Satélite y Marca.

### 📜 Historia de Usuario (BDD)
> **Como** operario o satélite,  
> **quiero** reportar una pieza faltante o tela defectuosa ligada a un atado concreto,  
> **para** que la marca envíe el repuesto sin detener la línea de producción.

### 🧭 Recorrido UI
1. Formulario de Novedad: Código del atado, tipo de novedad (`missing_piece`, `damaged_fabric`, `shortage_supplies`), cantidad necesaria.
2. Flujo de aprobación por el jefe de satélite (`Aprobar` o `Descartar`).

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Aprobación de Taller:** Crear un ticket como operario. Entrar como jefe de taller y verificar que aparezca en el buzón `pending_satellite`.

---

## 17. REPORTES CONTABLES Y SOPORTE DIAN (`/dashboard/reportes`)

### 👤 Identidad de Usuario
Marca, Satélite y SuperAdmin.

### 📜 Historia de Usuario (BDD)
> **Como** contador o gerente de marca,  
> **quiero** generar resúmenes contables de las liquidaciones efectuadas con desglose de insumos y mano de obra,  
> **para** contar con soporte digital de costos deducibles ante entes fiscales.

### 🧭 Recorrido UI
1. Tabla de Liquidaciones pasadas con fecha, taller satélite, unidades y total en COP.
2. Botones de exportación a CSV/Excel e informe imprimible.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Desglose Fiscal:** Verificar que el reporte conserve el nombre del satélite congelado (`satellite_name`) incluso si el taller cambio de datos posteriormente.

---

## 18. PERFIL DE USUARIO, RE-ONBOARDING Y BAJA (`/dashboard/perfil`)

### 👤 Identidad de Usuario
Todos los usuarios.

### 📜 Historia de Usuario (BDD)
> **Como** usuario de CoreTextil,  
> **quiero** administrar mis datos, reiniciar mi rol si me equivoqué o descargar mi copia de seguridad si decido darme de baja,  
> **para** mantener control total sobre mi información personal y profesional.

### 🧭 Recorrido UI
1. **Datos de Perfil:** Nombre completo, correo electrónico, rol activo.
2. **Zona de Re-Onboarding Universal (Cambiar de Rol):**
   - Botón `🔄 Reiniciar mi Rol y Configuración`.
   - Abre **Modal de Confirmación**: Exige escribir exactamente la frase `CAMBIAR ROL`.
   - Al confirmar: Ejecuta el reset y redirige a `/onboarding`.
3. **Zona de Baja Definitiva:**
   - Botón `⬇️ Descargar Copia de Seguridad JSON` (Genera archivo `coretextil_backup_YYYY-MM-DD.json`).
   - Botón `⚠️ Darme de Baja del Sistema`.
   - Abre **Modal de Baja:** Encuesta de salida con calificación por estrellas, motivo de salida, comentarios y campo obligatorio de confirmación `ELIMINAR MI CUENTA`.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Frase Errónea en Re-Onboarding:** Escribir `cambiar` en minúsculas o incompleto. Verificar que el botón de confirmación permanezca **deshabilitado**.
- [ ] **Descarga JSON Backup:** Hacer clic en "Descargar Copia de Seguridad". Abrir el archivo `.json` descargado y comprobar su contenido estructurado.
- [ ] **Encuesta de Salida:** Completar la encuesta en la modal de baja y confirmar. Verificar que la encuesta se registre en la tabla `account_exit_surveys`.

---

---

## 19. FLUJO DE INVITACIONES (`/invite/[token]` + Botón WhatsApp)

### 👤 Identidad de Usuario
Operario o Taller Satélite invitado (con o sin sesión iniciada); Marca/Satélite que invita.

### 📜 Historia de Usuario (BDD)
> **Como** operario o dueño de taller que recibe un enlace por WhatsApp,  
> **quiero** abrirlo, iniciar sesión si hace falta y aceptar la invitación en 1 clic,  
> **para** quedar vinculado a la red y empezar a trabajar de inmediato.

### 🧭 Recorrido UI
1. **Generación:** En el dashboard, botón «🔗 Invitar Taller Satélite» (marca) o «🔗 Invitar Operario» (satélite) → genera token, copia al portapapeles y abre WhatsApp con mensaje pre-armado.
2. **Recepción:** `/invite/[token]` muestra la pantalla de aceptación con nombre del invitador y rol destino.
3. **Sin sesión:** redirige a `/auth/login?next=/invite/TOKEN` — tras el login **regresa a la invitación** (no la pierde).
4. **Aceptación:** botón de aceptar vincula la cuenta (roles y vínculos según tipo de invitación).

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Enlace válido:** Abrir invitación sin sesión → login → verificar que regresa a `/invite/TOKEN` con `?next` preservado.
- [ ] **Token inválido/expirado/usado:** Verificar pantalla «Enlace Inválido» sin stack trace expuesto.
- [ ] **Aceptación idempotente:** Aceptar la misma invitación dos veces. Verificar que no duplique vínculos.
- [ ] **Aislamiento:** Abrir un token con otra cuenta Google. Verificar que no pueda aceptarse en nombre de otra persona.

---

## 20. MI RED (`/dashboard/red`)

### 👤 Identidad de Usuario
Todos los roles con red (`brand_admin`, `satellite_owner`, `operator`).

### 📜 Historia de Usuario (BDD)
> **Como** miembro de la plataforma,  
> **quiero** ver las marcas, talleres y órdenes con los que estoy vinculado,  
> **para** conocer el estado de mi red de trabajo en un solo lugar.

### 🧭 Recorrido UI
- **Marca:** talleres satélite vinculados, con capacidad de invitar más.
- **Satélite:** marcas afiliadas, órdenes activas en su taller y cuadrilla de operarios a destajo.
- **Operario:** talleres donde trabaja, historial por taller y billetera acumulada.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Datos por rol:** Iniciar sesión con cada rol. Verificar que solo aparezcan vínculos reales de ese usuario (RLS `satellite_links`).
- [ ] **Estado vacío:** Usuario nuevo sin vínculos. Verificar mensaje útil (no tabla vacía sin explicación).

---

## 21. CONFIGURACIÓN DE MARCA Y BANNER DE PENDIENTES (`/dashboard/marca`)

### 👤 Identidad de Usuario
Marca (`brand_admin`, `designer`, `cutter`).

### 📜 Historia de Usuario (BDD)
> **Como** marca nueva,  
> **quiero** completar mi NIT y logo corporativo,  
> **para** que mis fichas técnicas y órdenes queden personalizadas y formales.

### 🧭 Recorrido UI
1. Formulario de datos de la marca (nombre, NIT/RUT, logo).
2. **Banner de recordatorio** (`SetupReminderBanner`) en el dashboard mientras falten datos, con botón directo «Configurar Mi Marca».
3. El banner desaparece al completar logo + NIT.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Banner condicional:** Marca sin NIT → banner visible. Completar → recargar → banner desaparecido.
- [ ] **Carga de logo:** Subir imagen. Verificar que aparezca como avatar en el dashboard.

---

## 22. PERFIL TÉCNICO DEL OPERARIO (`/dashboard/operario/perfil`)

### 👤 Identidad de Usuario
Operario (`operator`).

### 📜 Historia de Usuario (BDD)
> **Como** costurero,  
> **quiero** registrar mis especialidades, máquinas que domino y experiencia,  
> **para** aparecer correctamente en la Bolsa de Operarios y recibir ofertas acordes.

### 🧭 Recorrido UI
1. Formulario: especialidades (multi-selección), máquinas (plana, fileteadora, collarín…), años de experiencia, disponibilidad.
2. Guardado y reflejo en `/dashboard/talento`.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Persistencia:** Cambiar especialidad y recargar. Verificar que quede guardado.
- [ ] **Reflejo en marketplace:** Marcar «disponible» y verificar que el operario aparezca en la Bolsa con la especialidad correcta.

---

## 23. GUÍA VISION ENGINE — FOTOS CALIBRADAS (`/dashboard/guias/vision-engine`)

### 👤 Identidad de Usuario
Marcas y SuperAdmin que preparan fotos para el ADN de prenda.

### 📜 Historia de Usuario (BDD)
> **Como** marca que va a digitalizar una prenda,  
> **quiero** la guía de las 5 fotos calibradas con regla px→cm,  
> **para** que el Vision Engine extraiga medidas y despieces con precisión industrial.

### 🧭 Recorrido UI
1. Instrucciones paso a paso de las 5 fotos (frente, espalda, despiece, detalle, escala con regla).
2. Consejos de iluminación, distancia y encuadre.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Aplicabilidad:** Seguir la guía al subir una foto en `/dashboard/nueva-prenda`. Verificar que la IA retorne piezas y medidas coherentes con la escala indicada.

---

## 24. PWA: INSTALACIÓN, SERVICE WORKER Y MODO OFFLINE

### 👤 Identidad de Usuario
Operarios y jefes de taller que usan la app en Android/Chrome (caso principal del piloto).

### 📜 Historia de Usuario (BDD)
> **Como** operario en la planta,  
> **quiero** instalar CoreTextil como app en mi teléfono y que cargue rápido aunque la señal sea mala,  
> **para** anotar mi producción sin depender de una conexión estable.

### 🧭 Recorrido UI
1. **Instalación:** Chrome Android → menú ⋮ → «Instalar aplicación» (requiere manifest + iconos + service worker con fetch handler, ya implementados).
2. **Service Worker** (`/sw.js`): precachea manifest + iconos; cache-first SOLO para activos inmutables — la API y las páginas autenticadas jamás se cachean.
3. **Registro:** `ServiceWorkerRegister` montado en el layout registra el SW al cargar.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Instalabilidad:** En Android/Chrome, verificar que aparezca «Instalar aplicación» y que la app quede en el launcher con su icono.
- [ ] **SW activo:** DevTools → Application → Service Workers → estado «activated and running», scope `/`.
- [ ] **Seguridad de caché:** Navegar a una página autenticada y verificar que NO se sirva desde caché (datos siempre frescos).
- [ ] **Actualización del SW:** Publicar una nueva versión y verificar que el SW viejo se limpie al activar el nuevo.

---

## 25. PAC-OPERARIO: JUEGO DE ONBOARDING (`/dashboard/operario/juego`)

### 👤 Identidad de Usuario
Operario (principal), cualquier rol curioso. Juego 2D estilo Pac-Man donde el operario "come" chicles (= piezas de su proceso) y al final de la ruta debe hacer su marcación en el celular.

### 📜 Historia de Usuario (BDD)
> **Como** operario nuevo con 5 minutos libres,  
> **quiero** jugar un juego corto donde como chicles y anoto cuántos me comí,  
> **para** entender sin que nadie me explique cómo funciona mi Cuaderno Digital (marcación real, procesos separados, tope del atado y doble confirmación).

### 🧭 Recorrido UI
1. **Menú:** tarjeta «🎮 Aprende jugando» (2ª del operario) + botón «🎮 Aprende jugando» dentro del Cuaderno Digital.
2. **Nivel 1 — La Marcación Exacta:** come chicles azules (mangas/fileteadora) por una serpentina; al final el celular 📱 exige la cifra EXACTA de lo comido.
3. **Nivel 2 — Dos Procesos, Una Prenda:** cuello rib con chicles azules (filete) y verdes (plana); el quiz pide las 2 cantidades por separado.
4. **Nivel 3 — El Tope del Atado:** muro 🚧 bloquea la ruta a la mitad; los chicles posteriores se ven pero no se pueden comer.
5. **Nivel 4 — El Fantasma y el Jefe:** un fantasma 👻 persigue al Pac (BFS real) y el laberinto trae atajos abiertos entre filas; si te atrapa, reintentas el nivel. El celular dañado marca 120; el jefe solo acepta si eliges pedir corrección al dueño (doble confirmación).
6. **Puente real:** tras cada nivel, réplica del cuaderno real + botón «👉 Hazlo de verdad» hacia `/dashboard/operario`. Certificado 🎓 final con reto por WhatsApp.
7. **Controles:** swipe sobre el laberinto, D-pad táctil y teclado (flechas/WASD). Progreso guardado en localStorage.

### 🔍 Lista de Verificación Manual (QA Checklist)
- [ ] **Nivel 1 acepta solo la cifra exacta:** Comer todos los chicles y reportar la cifra correcta → pasa. Reportar la cifra +5 → mensaje de «chicles fantasma» y NO pasa.
- [ ] **Nivel 2 exige 2 cantidades:** La suma correcta pero mal repartida entre azul/verde NO pasa; el desglose correcto sí.
- [ ] **Nivel 3 bloquea de verdad:** Verificar que el Pac se detiene en el muro 🚧 aunque insistas, y que los chicles posteriores quedan visibles pero inalcanzables.
- [ ] **Nivel 4 solo pasa con doble confirmación:** Elegir «no pasa nada» → el juego corrige con la explicación; elegir «pedir corrección» → pasa y muestra la réplica con la corrección aprobada.
- [ ] **Controles móviles:** Swipe y D-pad funcionan en la PWA Android sin hacer scroll la página.
- [ ] **Progreso persistente:** Cerrar el juego a mitad de niveles y reabrir: los niveles superados siguen marcados ✅.
- [ ] **Puente a la app real:** El botón «👉 Hazlo de verdad» lleva a `/dashboard/operario` (Cuaderno Digital).
- [ ] **Rendimiento:** El juego corre fluido en un Android de gama baja (60 fps aprox.) sin errores en consola.
- [ ] **Nivel 4 fantasma persigue:** El fantasma sigue al Pac por la ruta más corta (BFS); si lo atrapa aparece la pantalla 👻 “El fantasma del taller te atrapó!” y el nivel se puede reintentar.
- [ ] **Nivel 4 atajos:** Verificar que entre filas de pasillo hay aberturas extra (no solo los extremos de la serpentina): el Pac puede cambiar de fila por el medio del laberinto.
- [ ] **Cuaderno Manual Global (operario libre):** Sin órdenes ni taller, entrar a `/dashboard/operario`: aparece el cuaderno personal con formulario completo (prenda desplegable tipo franela/camiseta/pantalón/short, pieza/proceso, color, tela, foto, tarifa) y botones «＋ Sumar» / «− Restar»; una resta aparece en rojo y descuenta del total.
- [ ] **Cuaderno Manual Global (operario afiliado):** Con órdenes activas, entrar a Cuaderno Digital: la PRIMERA pestaña ahora muestra el mismo formulario global (anotación manual sin atado); la pestaña «Marcación de Atados» funciona igual que antes.
- [ ] **Cuaderno del dueño (trabajo propio):** Iniciar sesión como `satellite_owner`: la pestaña «Cuaderno Digital» muestra «Mi Producción Propia» con el formulario global permitiéndole al dueño también coser y anotar su propio ensamblaje; hay una 3ª pestaña «Solicitudes» con las correcciones pendientes del equipo.
- [ ] **Superadmin omnipresente:** Iniciar sesión como `superadmin`: el dashboard muestra las nuevas tarjetas «Cuaderno Digital (vista equipo)» y «Escanear atado (QR)»; entrar a Cuaderno Digital muestra el historial de TODOS los operarios y las solicitudes de corrección sin restricción de taller (tras ejecutar la migración 0034).

## 📌 MATRIZ RESUMEN DE CONTROL MANUAL PARA EL PILOTO

| # | Módulo a Probar | Rol Principal | Acción Clave a Probar | Criterio de Éxito Esperado |
|---|---|---|---|---|
| **1** | Landing Pitch Deck | Visitante | Pantalla completa + Giro 90° en móvil | Imagen se amplía legiblemente al rotar celular. |
| **2** | Onboarding | Nuevo | Crear Marca / Vincular Satélite | Redirección correcta sin bucles. |
| **3** | Vision Engine V2 | Marca | Subir foto de prenda y generar ADN | Retorna piezas, medidas y operaciones SAM en <10s. |
| **4** | Orden de Corte | Marca | Crear orden con atados QR | Códigos unívoquos `REF--NN` generados. |
| **5** | Escáner QR | Satélite | Escanear atado desde cámara móvil | Ficha del atado muestra consumos ajustados por talla. |
| **6** | Simulador CFI | Satélite | Ingresar costos fijos de taller | Muestra CFI unitario y Semáforo de Rentabilidad. |
| **7** | Bitácora Operario | Operario | Registrar piezas confeccionadas | Impide superar el límite del atado. |
| **8** | WhatsApp Bill | Operario | Generar Cuenta de Cobro | Abre WhatsApp con el resumen en COP listo para enviar. |
| **9** | Liquidación | Marca | Liquidar orden finalizada | Exige Ruta Completa 100% en todas las operaciones. |
| **10**| Soporte / Feedback | Todos | Crear ticket con captura de pantalla | Se registra la evidencia e informa al SuperAdmin. |
| **11**| Re-Onboarding | Todos | Reiniciar rol escribiendo `CAMBIAR ROL` | Retorna a `/onboarding` sin borrar historial relacional. |
| **12**| Cuaderno Digital (pestaña 1) | Operario/Satélite | Entrar al dashboard y anotar/corregir | Es la primera tarjeta y la vista inicial; corrección personal inmediata. |
| **13**| Doble confirmación | Operario + Dueño | Solicitar y aprobar corrección/eliminación | El registro solo cambia con ambas partes; tope del atado respetado. |
| **14**| Invitaciones | Invitado | Login regresa a la invitación con `?next` | Aceptación en 1 clic sin perder el enlace. |
| **15**| PWA | Operario | Instalar en Android y usar offline-friendly | SW activo; datos autenticados nunca cacheados. |
| **16**| Pac-Operario (onboarding) | Operario | Jugar los 4 niveles y reportar cifras exactas | Cada nivel enseña una regla real del cuaderno; nivel 4 con fantasma y atajos; progreso persistente; puente a la app real. |
| **17**| Cuaderno Manual Global | Operario (+ Dueño) | Anotar con formulario global: prenda/pieza/color/tela/foto y sumar/restar | Sirve para cualquier prenda textil; restas descontadas; foto y WhatsApp funcionan. |
| **18**| Registro propio del dueño | Satellite Owner | Anotar su propia producción de ensamblaje en su taller | Dueño refleja su trabajo en su cuaderno; solicitudes de operarios en pestaña aparte. |
| **19**| SuperAdmin Access | Superadmin | Abrir Cuaderno Digital y Escáner desde el dashboard | Ve anotaciones de todos los operarios y gestiona solicitudes sin bloqueos de taller. |

---

**¡Con esta guía estructurada, tienes el mapa exacto para ejecutar las pruebas manuales de control de calidad antes y durante el lanzamiento del Plan Piloto en Cúcuta!**
