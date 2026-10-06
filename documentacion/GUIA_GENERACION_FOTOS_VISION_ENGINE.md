# Guía Oficial de Generación de Fotos para Vision Engine V2
## Manual de Simulación con ChatGPT e Inteligencia Artificial Nativa (CoreTextil SaaS)

Esta guía permite a cualquier marca, diseñador o emprendedor textil generar las **5 fotografías técnicas de inspección de entrada** utilizando ChatGPT o cualquier generador de IA. Con estas fotos, el **CoreTextil Vision Engine V2** procesa automáticamente el ADN de la prenda, despiezando las partes 2D, calculando los minutos SAM, identificando las puntadas industriales (504, 301, 406) y estructurando la Ficha Técnica completa.

---

## 🎯 Instrucciones de Uso en ChatGPT:

1. Ingresa a **[ChatGPT (chatgpt.com)](https://chatgpt.com)**.
2. Adjunta una foto de referencia de cualquier prenda (superior o inferior, hombre o mujer: *camisa, franela, pantalón, short, chaqueta, vestido, etc.*).
3. Copia y pega el **Prompt Maestro** a continuación.

---

## 🚀 PROMPT MAESTRO GENERAL (Copia y pega en ChatGPT):

```text
Actúa como fotógrafo industrial de producto textil para inspección de fichas técnicas de ropa.
Toma como referencia la prenda que acabo de adjuntar (respetando estrictamente su color, tipo de tela, silueta y detalles de diseño). 

Genera una secuencia de 5 fotografías técnicas de estudio industrial sobre mesa de corte limpia, fondo gris claro neutro (#F4F4F5) e iluminación de catálogo sin sombras duras:

1. FOTO 1 - VISTA FRONTAL EXTENDIDA CON CINTA MÉTRICA:
Prenda completa extendida de frente sobre la mesa en plano cenital de 90 grados (top-down). Debe tener colocada a un costado una cinta métrica textil de costurero amarilla o blanca extendida a lo largo de la prenda para servir como referencia de escala de medición física.

2. FOTO 2 - VISTA TRASERA / REVERSO ESTRUCTURAL:
Prenda extendida completamente por la parte trasera (espalda o posterior del pantalón), en plano cenital recto de 90 grados, mostrando claramente el canesú, costuras traseras, pinzas o bolsillos posteriores.

3. FOTO 3 - DETALLE DE SISAS Y UNIONES DE MANGA O PIERNA:
Una toma de acercamiento (close-up) enfocada en la unión crítica de la sisa/manga con el costado del cuerpo (o la entrepierna/tiro en caso de pantalón o short), mostrando la costura de ensamble de las piezas.

4. FOTO 4 - CUELLO / TAPA COSTURA Y RIB (O PRETINA / ELÁSTICO / CIERRE):
Una toma macro enfocada en la parte superior: el cuello rib con su pisado de tapa costura (para camisetas/camisas) o la pretina con su botón, cierre y elástico (para pantalones/shorts).

5. FOTO 5 - REVERSO MACRO DE COSTURA INTERNA (VISTA INTERIOR / REVÉS):
Una fotografía de acercamiento de la prenda VOLTEADA AL REVÉS (inside-out), mostrando el interior y las costuras de sobrehilado/fileteadora (puntada 504), pespuntes internos y terminación de tela expuesta.

Mantén consistencia absoluta en el tejido, color y proporciones de la prenda en las 5 tomas.
```

---

## 📸 PROMPTS INDIVIDUALES PARA COPIAR CON UN CLIC:

### 1️⃣ Foto 1: Frontal con Cinta Métrica (Calibración `px → cm`)
> *"Genera una foto de estudio plano (flat lay 90°) de la VISTA FRONTAL de la prenda adjunta extendida en mesa de corte. Coloca una CINTA MÉTRICA textil de costurero extendida al lado de la prenda como referencia de medición física. Iluminación industrial clara, fondo gris neutro."*

### 2️⃣ Foto 2: Trasera / Espalda Estructural
> *"Genera una foto de estudio plano de la VISTA TRASERA (espalda o posterior) de la prenda adjunta. Muestra de forma plana el canesú, costura trasera de hombros o tiro posterior sobre mesa de corte."*

### 3️⃣ Foto 3: Sisas y Uniones de Manga / Entrepierna
> *"Genera una foto de acercamiento (close-up) enfocada en la sisa y unión de la manga con el cuerpo (o entrepierna/tiro si es pantalón) de la prenda adjunta, mostrando la costura de ensamble textil."*

### 4️⃣ Foto 4: Cuello / Rib / Tapa Costura o Pretina
> *"Genera una foto de acercamiento macro del CUELLO con rib y tapa costura (o PRETINA con cierre/botón si es pantalón) de la prenda adjunta, mostrando los insumos y remates."*

### 5️⃣ Foto 5: Revés Interior (Costura Interna Fileteadora 504)
> *"Genera una foto de cerca de la prenda adjunta VOLTEADA AL REVÉS (inside-out). Debe mostrar el interior de las costuras con puntada de sobrehilado/fileteadora (504) y terminaciones internas."*

---

## ⚡ ¿Cómo Funciona la Inteligencia Artificial Nativa de CoreTextil?

1. **Subida de las 5 Fotos**: La marca carga las imágenes generadas por ChatGPT o tomadas en taller.
2. **Quality Gate Metrológico (Módulo 2)**: Detecta la cinta métrica en la Foto 1 y establece la escala métrica industrial `px → cm`.
3. **Explosión y Rompecabezas 2D (Módulos 1 & 5)**: **YOLOv11 + SAM 2** aíslan y segmentan cada pieza textil (*delanteros, espalda, mangas, puños, bolsillos*).
4. **Inspección de Puntadas (Módulo 3)**: Examina el revés (Foto 5) para determinar si la costura requiere **Fileteadora 504, Plana 301 o Collarín 406**.
5. **Ruta Operativa & Ficha Técnica**: Calcula los minutos SAM por operación, el costo por destajo y genera los atados de corte con códigos QR unívocos.
