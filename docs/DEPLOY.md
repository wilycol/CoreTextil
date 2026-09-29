# Guía de despliegue · CoreTextil SaaS (Supabase + Vercel)

Esta guía lleva el proyecto de cero a producción. Tiempo estimado: **30–45 minutos**.
Al final tendrás: base de datos con RLS en Supabase, login con Google, app desplegada en Vercel y PWA instalable en los teléfonos del taller.

---

## 0. Requisitos previos

- Cuenta en [supabase.com](https://supabase.com) (gratis) y en [vercel.com](https://vercel.com) (gratis, con GitHub).
- Código del proyecto en un repositorio GitHub (Vercel despliega desde ahí).
- Una cuenta de Google para configurar el SSO (la tuya o una de la marca).

---

## 1. Crear el proyecto en Supabase (10 min)

1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Datos recomendados:
   - **Name**: `coretextil-prod`
   - **Database Password**: genera una y guárdala (no la necesitarás para la app, solo para-admin).
   - **Region**: `East US` (la más cercana con baja latencia a Cúcuta).
3. Espera ~2 min a que el proyecto quede **Active**.

## 2. Ejecutar las migraciones (10 min)

1. En el menú lateral: **SQL Editor** → **New query**.
2. Abre la carpeta `supabase/migrations/` del proyecto. Ejecuta **en orden estricto**
   (copia el contenido completo de cada archivo, pégalo y presiona **Run**):

| Orden | Archivo | Qué crea |
|---|---|---|
| 1 | `0001_tables.sql` | Tablas: tenants, profiles, satellite_links, garments, orders, bundles, logs, tickets… |
| 2 | `0002_functions.sql` | `current_profile()`, `find_satellite_by_email`, trigger de nuevo usuario Google, tope de atado |
| 3 | `0003_rls.sql` | Row Level Security multi-tenant completa |
| 4 | `0004_bundle_receipts.sql` | Recepciones QR + RPC `receive_bundle_by_code` |
| 5 | `0005_payroll_liquidations.sql` | Nómina del satélite y liquidaciones de la marca |
| 6 | `0006_liquidation_names.sql` | Snapshot de nombres para reportes |
| 7 | `0007_materials_and_team_rls.sql` | Materiales por prenda + acceso del equipo satélite |
| 8 | `0008_size_factors.sql` | Consumo de tela por talla (`garments.size_factors`) |
| 9 | `0009_qa_rls_hardening.sql` | QA: INSERT tenants, anti-escalada de roles, tope con lock |
| 10 | `0010_api_team_logs.sql` | Lectura de logs por todo el equipo del taller (API v1) |

> ⚠️ Si ejecutas un script dos veces no pasa nada: todos son idempotentes
> (`if not exists` / `create or replace`). Si uno falla, corrige la causa antes de seguir.

3. Verificación rápida: **Table Editor** debe mostrar 14 tablas y en
   **Authentication → Policies** no debe haber errores.

## 3. Configurar Google SSO (5 min)

1. Ve a [console.cloud.google.com](https://console.cloud.google.com) → crea (o elige) un proyecto.
2. **APIs & Services → OAuth consent screen**: External → nombre de la app → guarda.
3. **Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**: `https://TU-PROYECTO.supabase.co`
   - **Authorized redirect URIs**:
     - `https://TU-PROYECTO.supabase.co/auth/v1/callback`
     - `https://tu-dominio.vercel.app/api/auth/callback` (agregarás el definitivo en el paso 4)
4. Copia el **Client ID** y el **Client Secret**.
5. En Supabase: **Authentication → Providers → Google** → activa, pega Client ID/Secret → Save.
6. En **Authentication → URL Configuration**:
   - Site URL: `https://tu-dominio.vercel.app` (por ahora puede ser un placeholder; lo corriges tras el deploy)
   - Redirect URLs: agrega `https://tu-dominio.vercel.app/auth/callback`

## 4. Desplegar en Vercel (10 min)

1. Sube el proyecto a GitHub (si no está ya):
   ```bash
   git remote add origin https://github.com/TU-USUARIO/coretextil.git
   git push -u origin master
   ```
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo.
3. Framework Preset: **Next.js** (detectado automáticamente). **No toques** build settings.
4. Antes de dar Deploy, abre **Environment Variables** y agrega:

| Variable | Valor | Dónde se obtiene |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon public) | Supabase → Settings → API |
| `GEMINI_API_KEY` | (opcional) clave de IA | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | `gemini-2.0-flash` | opcional (default si se omite) |

   > 🔒 Nuncapegues las claves en el código. La anon key es pública por diseño (la RLS es la barrera real); la de Gemini va solo en el servidor.

5. **Deploy**. Espera ~2 min.
6. Vuelve a Supabase → **Authentication → URL Configuration** y deja definitivo:
   - Site URL: `https://TU-PROYECTO.vercel.app` (o tu dominio propio)
   - Redirect URLs: incluye `https://TU-PROYECTO.vercel.app/auth/callback`
7. En Google Cloud, agrega `https://TU-PROYECTO.vercel.app` a **Authorized JavaScript origins**.

## 5. Verificación post-despliegue (checklist de humo)

1. Abre `https://TU-PROYECTO.vercel.app` → la landing carga con los planes.
2. **Entra con Google** → te pide completar onboarding.
3. Marca **Soy marca** → se crea tu tenant y caes al dashboard.
4. **ADN de prenda**: crea una prenda con nombre+referencia (estimación local)
   y otra con foto si configuraste `GEMINI_API_KEY`.
5. Abre la **ficha técnica**: descarga el **PDF** y prueba la impresión.
6. **Nueva orden**: matriz talla×color → atados con QR → imprime la hoja de QR.
7. Con otra cuenta Google (incógnito): onboarding **Soy taller satélite** →
   escanea un QR (o pega el código) → confirma recepción → mira la ficha con
   talla/unidades y materiales del atado.
8. **Marcación**: marca +10/+25 hasta el tope → el tope debe rechazar el exceso.
9. Con una tercera cuenta: onboarding **Soy operario** con el email del jefe → marca producción → crea un ticket.
10. Jefe aprueba el ticket → marca lo despacha → la marca liquida la orden (solo ruta completa) → **Reportes** muestra el pago.

## 6. PWA en los teléfonos del taller

- Android/Chrome: abre la app → menú ⋮ → **Instalar aplicación**.
- iPhone/Safari: Compartir → **Agregar a pantalla de inicio**.
- La marcación y el escáner funcionan mejor instaladas (pantalla completa, sin barra del navegador).
- La cámara del escáner requiere **HTTPS**: en producción (Vercel) ya lo es; en local usa `localhost`.

## 7. Costos y límites del plan gratuito

| Servicio | Free tier | Nota |
|---|---|---|
| Supabase | 500 MB BD, 50k MAU, 2 GB ancho de banda | Sobra para el piloto (2 marcas + 5 talleres) |
| Vercel Hobby | 100 GB ancho de banda, serverless ilimitado (con límites por invocación) | El endpoint de IA usa `maxDuration = 60` |
| Gemini API | Cuota gratuita generosa por minuto | El fallback heurístico funciona sin clave |

## 8. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `new row violates row-level security` al onboarding de marca | Migración 0009 sin ejecutar | Ejecuta 0009 (`tenants_insert_member`) |
| Login Google: `redirect_uri_mismatch` | URIs mal configuradas | Revisa paso 3.3 y 4.7 (origins + callback) |
| Tras el login vuelve al login | Redirect URLs en Supabase | Agrega `https://…/auth/callback` (paso 4.6) |
| El operario no ve órdenes/atados | Faltan migraciones 0007/0010 | Ejecuta en orden hasta 0010 |
| La cámara no abre en el escáner | Sin HTTPS o permiso | Usa producción (HTTPS) o `localhost`; revisa permisos del navegador |
| PDF no descarga en iOS antiguo | Safari viejo | Actualiza iOS; alternativa: usar Imprimir → Guardar PDF |
| `Tope del atado superado` al marcar | Es el tope funcionando ✅ | No es un error: marca solo lo que queda |

## 9. Dominio propio (opcional)

1. Compra el dominio (p. ej. `coretextil.co`).
2. Vercel → Project → **Settings → Domains** → Add → sigue las instrucciones DNS (CNAME).
3. Actualiza Site URL/Redirect URLs en Supabase y origins en Google Cloud con el dominio final.
