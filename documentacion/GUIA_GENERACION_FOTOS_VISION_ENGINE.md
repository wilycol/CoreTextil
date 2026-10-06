# Guía Oficial de Generación de Fotos para Vision Engine V2
## Manual de Simulación con ChatGPT e Inteligencia Artificial Nativa (CoreTextil SaaS)

Esta guía permite a cualquier marca, diseñador o emprendedor textil generar las **5 fotografías técnicas de entrada** utilizando ChatGPT o cualquier generador de IA. Con estas fotos, el **CoreTextil Vision Engine V2** procesa automáticamente el ADN de la prenda, despiezando las partes 2D, calculando los minutos SAM, identificando las puntadas industriales (504, 301, 406) y estructurando la Ficha Técnica completa.

---

## 🎯 Reglas Fundamentales para ChatGPT:
1. **Imágenes Separadas**: Se deben solicitar **5 archivos de imagen independientes** (1 imagen por cada ángulo), **NUNCA un collage o lámina combinada**.
2. **Revés e Interior Expuesto**: Las fotos de costura (3, 4 y 5) deben mostrar la prenda **volteada al revés (inside-out)** para exponer la puntada industrial real de **Fileteadora 504 (Overlock)**.
3. **Cinta Métrica Legible**: La Foto 1 debe incluir una cinta métrica nítida con números claros en centímetros para activar el Quality Gate `FULL_PRECISION` (`px → cm`).

---

## 🚀 PROMPT MAESTRO GENERAL (Copia y pega en ChatGPT):

```text
Actúa como fotógrafo industrial de producto textil para inspección de fichas técnicas de ropa.
Toma como referencia la prenda que acabo de adjuntar (respetando estrictamente su color, tipo de tela, silueta y detalles de diseño). 

IMPORTANTE: Genera 5 ARCHIVOS DE IMAGEN INDEPENDIENTES Y SEPARADOS (una imagen por cada número). NO crees una lámina, infografía ni collage combinando las tomas.

1. FOTO 1 - VISTA FRONTAL EXTENDIDA CON CINTA MÉTRICA NÍTIDA:
Prenda completa extendida de frente sobre la mesa en plano cenital de 90 grados (top-down). Coloca a un costado una CINTA MÉTRICA textil de costurero de color amarillo brillante extendida en línea recta a lo largo de la prenda, con NÚMEROS NEGROS EN CENTÍMETROS (cm) de gran tamaño, nítidos, legibles y de alto contraste para calibración métrica.

2. FOTO 2 - VISTA TRASERA / REVERSO ESTRUCTURAL:
Prenda extendida completamente por la parte trasera (espalda o posterior del pantalón), en plano cenital recto de 90 grados, mostrando claramente el canesú, costuras traseras, pinzas o bolsillos posteriores.

3. FOTO 3 - DETALLE INTERNO DE SISAS Y UNIONES (VOLTEADA AL REVÉS / INSIDE-OUT):
Foto de acercamiento (close-up) de la sisa y unión de manga VOLTEADA AL REVÉS (INSIDE-OUT). Muestra la cara INTERNA de la prenda con las lazadas expuestas del hilo de la costura de ensamble, NO la superficie lisa externa.

4. FOTO 4 - DETALLE INTERNO DE CUELLO / TAPA COSTURA Y RIB (INSIDE-OUT):
Foto macro enfocada en la cara INTERNA / REVÉS del cuello escote y tapa costura (o pretina interna si es pantalón), mostrando el dobladillo expuesto, las puntadas de remate y el reves del elastico/rib.

5. FOTO 5 - REVERSO MACRO DE COSTURA DE FILETEADORA 504 (VISTA INTERIOR):
Fotografía macro de cerca de la prenda VOLTEADA AL REVÉS (inside-out), enfocada en una costura lateral o dobladillo interno, mostrando nítidamente las lazadas de cadeneta de sobrehilado de la máquina Fileteadora 504 (Overlock) y pespuntes expuestos.

Mantén consistencia absoluta en el tejido, color y proporciones de la prenda en las 5 tomas.
```

---

## 📸 PROMPTS INDIVIDUALES PARA COPIAR CON UN CLIC:

### 1️⃣ Foto 1: Frontal con Cinta Métrica Nítida (Calibración `px → cm`)
> *"Genera una foto de estudio plano (flat lay 90°) de la VISTA FRONTAL de la prenda adjunta extendida en mesa de corte. Coloca a un costado una CINTA MÉTRICA textil de costura amarilla extendida en línea recta, con NÚMEROS NEGROS EN CENTÍMETROS (cm) muy nítidos, grandes y legibles para calibración métrica. Fondo gris neutro."*

### 2️⃣ Foto 2: Trasera / Espalda Estructural
> *"Genera una foto de estudio plano de la VISTA TRASERA (espalda o posterior) de la prenda adjunta. Muestra de forma plana el canesú, costura trasera de hombros o tiro posterior sobre mesa de corte."*

### 3️⃣ Foto 3: Sisas e Interior de Manga (Volteada al Revés / Inside-Out)
> *"Genera una foto de acercamiento (close-up) enfocada en la sisa y unión de la manga VOLTEADA AL REVÉS (INSIDE-OUT). Debe mostrar la cara interna del tejido y la costura de sobrehilado expuesta."*

### 4️⃣ Foto 4: Interior del Cuello / Tapa Costura / Pretina Interna
> *"Genera una foto macro enfocada en la cara INTERNA / REVÉS del cuello y tapa costura (o pretina interna) de la prenda adjunta, mostrando las costuras interiores y remates."*

### 5️⃣ Foto 5: Revés Interior (Puntada Fileteadora 504 / Overlock)
> *"Genera una foto de cerca de la prenda VOLTEADA AL REVÉS (inside-out). Muestra nítidamente las lazadas de cadeneta de sobrehilado de máquina Fileteadora 504 (Overlock) en una costura interna."*
