# 📱 GUÍA OFICIAL: PUBLICACIÓN DE CORETEXTIL EN GOOGLE PLAY STORE (ANDROID BETA)

> **Antigravity AI Architecture Directive**
> Documento preparado para: **Wily Col (Director de Ecosistema CoreTextil)**
> Objetivo: Obtener el paquete instalable `.apk` y publicar la versión **Beta** en la **Google Play Console** en menos de 48 horas mediante **Trusted Web Activity (TWA)**.

---

## 🎯 1. ¿Qué es TWA y por qué es la mejor estrategia para CoreTextil?

**Trusted Web Activity (TWA)** es la tecnología oficial creada por Google Chrome para envolver una **Progressive Web App (PWA)** en un contenedor nativo Android de alto rendimiento.

### Ventajas Estratégicas para CoreTextil:
1. **0% Código Duplicado:** Toda la lógica de negocio en Next.js, Supabase, RLS, QR escáner y la UI que hemos construido funciona idéntica en la app Android.
2. **Despliegue Rápido (En < 48 Horas):** Se genera el paquete `.aab` listo para subir a Google Play Store sin reescribir la app en Java/Kotlin.
3. **Actualización Transparente:** Cada mejora que hagamos en el servidor Vercel se actualiza **instantáneamente** en las apps de los teléfonos de los operarios y satélites, sin que ellos tengan que descargar actualizaciones pesadas desde Play Store.
4. **Experiencia Nativa Fullscreen:** Se ejecuta a pantalla completa, sin barra de direcciones URL, con icono propio en la pantalla de inicio del teléfono y acceso a cámara para QR.

---

## ⚡ 2. PASO A PASO 1: Generar el Paquete APK y AAB (En 5 minutos)

Google y Microsoft ofrecen la herramienta gratuita **PWABuilder** para empaquetar la app automáticamente.

### Instrucciones para Wily:
1. Entra desde tu navegador a: **[https://www.pwabuilder.com](https://www.pwabuilder.com)**
2. En la barra central, pega tu dominio oficial de producción:
   `https://coretextil.vercel.app`
3. Haz clic en **Start**. PWABuilder analizará el `manifest.webmanifest` y los íconos que acabamos de subir.
4. Verás una puntuación alta de compatibilidad. Haz clic en el botón verde **Package for Store**.
5. Selecciona la plataforma **Android**.
6. En la ventana emergente de opciones, ingresa los siguientes datos corporativos:
   - **Package ID:** `com.coretextil.app`
   - **App Name:** `CoreTextil`
   - **Launcher Name / Short Name:** `CoreTextil`
   - **App Version:** `1.0.0`
   - **App Version Code:** `1`
   - **Host:** `coretextil.vercel.app`
   - **Start URL:** `/dashboard`
   - **Theme Color:** `#0f172a`
   - **Nav / Status Bar Color:** `#0f172a`
   - **Display Mode:** `Standalone`
7. Haz clic en **Generate**. PWABuilder compilará los archivos en la nube y descargará un archivo `.zip` en tu computador.

---

## 📦 3. Contenido del Archivo Zip Descargado

Al descomprimir el `.zip` generado por PWABuilder, encontrarás los siguientes archivos clave:

1. **`app-release-signed.apk`**: 
   - **Para instalación manual inmediata:** Puedes enviar este archivo por WhatsApp o Google Drive a cualquier taller u operario. Al tocarlo en un celular Android, se instala inmediatamente en la pantalla de inicio.
2. **`app-release.aab`**: 
   - **Android App Bundle Oficial:** Este es el archivo que subiremos a la **Google Play Console** para distribuirlo desde la tienda.
3. **`assetlinks.json`**: 
   - Contiene la firma digital `SHA-256` requerida por Google para certificar que el dominio `coretextil.vercel.app` le pertenece a la app `com.coretextil.app`.

---

## 🛒 4. PASO A PASO 2: Guía Completa de la Google Play Console

### Requisito Previo: Cuenta de Desarrollador
- Debes contar con una cuenta de desarrollador en **[Google Play Console](https://play.google.com/console)**.
- *Nota:* Google cobra una tarifa única de **$25 USD por vida** para habilitar la publicación ilimitada de aplicaciones en Android.

---

### Paso 2.1: Crear la Aplicación en Play Console
1. Inicia sesión en **Play Console**.
2. En la esquina superior derecha, haz clic en **Crear aplicación** (*Create App*).
3. Completa el formulario inicial:
   - **Nombre de la app:** `CoreTextil`
   - **Idioma predeterminado:** `Español (América Latina) - es-419`
   - **¿Es una aplicación o un juego?:** `Aplicación`
   - **¿Gratis o de pago?:** `Gratis`
   - **Declaraciones:** Acepta las políticas de contenido del programa de desarrolladores.
4. Haz clic en **Crear aplicación**.

---

### Paso 2.2: Configurar la Ficha Principal de la Tienda (*Main Store Listing*)
En el menú lateral izquierdo, ve a **Presencia en Play Store > Ficha de la tienda principal**:

1. **Detalles Breves:**
   - **Nombre de la app:** `CoreTextil`
   - **Descripción corta (80 caracteres):** `Conecta talleres de corte, satélites de ensamble y operarios a destajo.`
   - **Descripción completa:** Explicación detallada del ecosistema: marcación de atados por QR, fichas técnicas, mesa de faltantes y liquidación de nómina a destajo.
2. **Recursos Gráficos:**
   - **Icono de la app (512 x 512 px PNG):** Usa el logo oficial `public/logo.png`.
   - **Gráfico con funciones (*Feature Graphic* 1024 x 500 px PNG):** Imagen publicitaria de la app con el logo y el fondo oscuro.
   - **Capturas de pantalla del teléfono (Mínimo 2 imágenes):** Puedes subir las capturas del Dashboard, la Ficha del Taller y el Escáner QR.

---

### Paso 2.3: Subir la Versión Beta (Track de Prueba Abierta / Cerrada)
Para que aparezca como **Versión Beta** en la Play Store:

1. En el menú lateral izquierdo, ve a la sección **Pruebas (Testing)**.
2. Selecciona **Prueba abierta (Open testing)** (si quieres que cualquier persona en Play Store pueda encontrarla y probar la Beta) o **Prueba cerrada (Closed testing)** (si quieres limitar los testers a una lista de correos).
3. Haz clic en **Crear nueva versión** (*Create new release*).
4. En el área de carga de archivos, arrastra el archivo **`app-release.aab`** que descargaste de PWABuilder.
5. En **Nombre de la versión**, escribe: `1.0.0-beta`.
6. En **Notas de la versión**, escribe:
   ```text
   Lanzamiento inicial Beta de CoreTextil.
   - Marcación rápida a destajo para operarios.
   - Red de talleres satélites y marcas clientes.
   - Escáner de etiquetas QR por bultos.
   ```
7. Haz clic en **Guardar** y luego en **Revisar versión**.

---

### Paso 2.4: Vincular Digital Asset Links (`assetlinks.json`)
Para que Android reconozca la aplicación TWA como oficial y **no muestre la barra de direcciones del navegador en el celular**:

1. Abre el archivo `assetlinks.json` que venía dentro del `.zip` de PWABuilder.
2. Copia la huella digital SHA-256 generada.
3. Actualiza el archivo `public/.well-known/assetlinks.json` en nuestro proyecto CoreTextil.
4. Haz un `git commit` y `push` a Vercel. Una vez desplegado, Google Play verificará la conexión dominio-app automáticamente.

---

## 📲 5. Distribución Directa Rápida (Sin Esperar Revisión de Google)

Mientras Google revisa la versión Beta en Play Console (suele tardar entre 4 y 24 horas la primera vez), puedes entregarle la solución **inmediatamente** a tus talleres de Cúcuta:

1. Toma el archivo **`app-release-signed.apk`**.
2. Súbelo a tu Google Drive o envíalo por WhatsApp Web.
3. El dueño del taller abre el archivo en su teléfono Android, acepta la instalación y listo: **CoreTextil queda instalado nativamente con su icono oficial en la pantalla del celular.**

---

### 🛡️ Firma del Arquitecto
Documento preparado por **Beatriz Serie X Elite — Co-CEO Tecnológica**. Sistema listo y preparado para el empaquetamiento TWA Android.
