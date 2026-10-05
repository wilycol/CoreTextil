# Roadmap Fase 2: Expansión del SaaS CoreTextil

Este documento recopila las ideas, mejoras y módulos que transformarán a CoreTextil desde un MVP funcional hacia una plataforma SaaS robusta, escalable e impulsada por IA.

## 1. Perfil Completo del Operario (Onboarding de Datos)
Actualmente, el operario acepta la invitación y entra directamente. Para la Fase 2, se debe desarrollar un flujo de completado de perfil (`/dashboard/operario/perfil`):
- **Datos de Contacto:** WhatsApp, Teléfono, Redes sociales.
- **Habilidades y Destrezas:** Años de experiencia, especialidades (ej. ajuste liviano, ajuste pesado, jean, prendas finas).
- **Manejo de Máquinas:** Selección múltiple de máquinas que domina (Plana, Fileteadora, Recubridora, Cerradora, etc.).

## 2. Configuración "Mi Taller" (Satélites)
El dueño del taller satélite requiere una "planilla de registro" para formalizar su organización en la plataforma:
- **Nombre Comercial del Taller.**
- **Costos Fijos Operativos:** Arriendo, servicios, depreciación de maquinaria.
- **Capacidad Instalada:** Número de operarios, máquinas disponibles.

## 3. Marketplace de Operarios (Agentes Libres)
Para los usuarios que se registren como "Operarios Libres" (sin vinculación inicial a un satélite):
- **Bolsa de Empleo Interna:** Los talleres satélite podrán buscar operarios por zona, especialidad y disponibilidad para contratarlos mediante invitaciones directas.
- **Ficha Técnica Pública:** El operario libre tendrá su "CV Textil" visible para los talleres aprobados.

## 4. IA para Optimización de Rendimiento
Aprovechar el historial de producción (marcaciones de destajo) para generar insights con Inteligencia Artificial:
- **Trazabilidad de Producción:** Medir tiempos reales vs tiempos SAM teóricos de las prendas.
- **Asignación Inteligente:** La IA recomendará qué operario debe hacer qué operación (ej. pegar cuellos, cerrar costados) basándose en su rendimiento estadístico histórico en cortes anteriores.
- **Productividad:** Ayudar a los dueños de talleres a maximizar su eficiencia, equilibrando líneas de ensamble con sugerencias matemáticas.

## 5. Ficha de Registro de Marcas (Onboarding B2B)
Al registrar una marca, se desplegará un formulario para completar la identidad corporativa antes de acceder al Dashboard:
- **Nombre de la Empresa / Marca**
- **NIT / RUT / Documento Tributario**
- **Teléfono y Datos del Administrador**

## 6. Motor de Visión IA (Procesamiento de Imágenes)
El proceso de "ADN de Prenda" será asistido visualmente por Inteligencia Artificial, almacenando múltiples imágenes en el bucket `garments`:
- **Input (Imágenes de Referencia):** La marca sube **3 a 5 fotos** de la prenda armada desde distintos ángulos.
- **Output de IA (Despiece):** El motor devuelve **1 imagen por pieza** (ej. 5 fotos para 5 piezas) con sus dimensiones esperadas según la talla.
- **Transparencia en la Red:** Todas las imágenes (referencia + piezas individuales) conformarán el mapa de ensamblaje en las Órdenes de Corte, siendo la guía visual principal para los talleres y operarios de la red.

---
*Documento vivo. Se irá actualizando a medida que se completen hitos de la Fase 1 y 2.*
