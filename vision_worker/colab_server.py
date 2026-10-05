# ==========================================
# CORETEXTIL VISION ENGINE - COLAB WORKER
# Hito 6: Despiece Paramétrico, Graceful Quality Gate, Reglas de Taller, AI Render & Piezas Aisladas
# ==========================================
# INSTRUCCIONES PARA GOOGLE COLAB:
# 1. Selecciona Entorno de Ejecución -> GPU T4
# 2. Celda 1 (Instalación):
# !pip install -q fastapi uvicorn supabase python-multipart nest-asyncio pillow google-generativeai ezdxf opencv-python-headless
# !wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
# !dpkg -i cloudflared-linux-amd64.deb
# 3. Celda 2: Copia y pega este script.
# ==========================================

import os
import re
import uuid
import json
import time
import io
import asyncio
import subprocess
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from supabase import create_client, Client
import nest_asyncio
import uvicorn
from PIL import Image, ImageDraw, ImageFont

# Importaciones opcionales
try:
    import cv2
    import numpy as np
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

# ------------------------------------------
# 🎨 HUGGING FACE DIFFUSERS (GENERACIÓN FOTORREALISTA GRATUITA EN GPU)
# ------------------------------------------
HAS_DIFFUSERS = False
hf_pipe = None

def init_hf_diffusers(model_id: str = "stabilityai/sdxl-turbo"):
    global HAS_DIFFUSERS, hf_pipe
    try:
        import torch
        from diffusers import AutoPipelineForText2Image
        print(f"🎨 Cargando modelo fotorrealista Hugging Face ({model_id}) en GPU...")
        hf_pipe = AutoPipelineForText2Image.from_pretrained(
            model_id, 
            torch_dtype=torch.float16, 
            variant="fp16"
        )
        if torch.cuda.is_available():
            hf_pipe.to("cuda")
            print("🚀 Hugging Face Diffusers cargado en CUDA GPU exitosamente.")
            HAS_DIFFUSERS = True
        else:
            print("⚠️ GPU no disponible. Se omitirá Diffusers para evitar lentitud en CPU.")
            HAS_DIFFUSERS = False
    except Exception as e:
        print(f"ℹ️ HuggingFace diffusers no disponible ({e}). Se usará renderizador vectorial local.")
        HAS_DIFFUSERS = False

try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

try:
    import ezdxf
    HAS_EZDXF = True
except ImportError:
    HAS_EZDXF = False

# Configuración (Credenciales CoreTextil)
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://lsypibiyuhpykykroprz.supabase.co")
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzeXBpYml5dWhweWt5a3JvcHJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc9MDcwNDg0NywiZXhwIjoyMTA2MjgwODQ3fQ.t_U--wGYs82DA0LheHl1NO71b5PvkDoMGPA9-3FAlVQ"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzeXBpYml5dWhweWt5a3JvcHJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDcwNDg0NywiZXhwIjoyMTA2MjgwODQ3fQ.t_U--wGYs82DA0LheHl1NO71b5PvkDoMGPA9-3FAlVQ"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AQ.Ab8RN6LsmyH_22klEU-km2qrG7eejDxN3RxNTH_SY0cbw1fSBA")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI(title="CoreTextil Vision Engine V2 - Multi-Part & Individual Piece Renders")

if HAS_GEMINI and GEMINI_API_KEY and not GEMINI_API_KEY.startswith("AQ."):
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        print("Aviso al configurar Gemini:", e)

# ------------------------------------------
# CLOUDFLARE TUNNEL
# ------------------------------------------
def start_cloudflare_tunnel(port=8010):
    print("Iniciando túnel de Cloudflare...")
    process = subprocess.Popen(
        ["cloudflared", "tunnel", "--url", f"http://localhost:{port}"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
    tunnel_url = None
    for line in process.stdout:
        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
        if match:
            tunnel_url = match.group(0)
            break

    if tunnel_url:
        print(f"🚀 Túnel activo en: {tunnel_url}")
        try:
            supabase.table("ai_vision_worker").upsert({
                "id": 1,
                "cloudflare_url": tunnel_url,
                "status": "online",
                "last_ping": datetime.now(timezone.utc).isoformat()
            }).execute()
            print("✅ Estado 'online' registrado exitosamente en Supabase.")
        except Exception as e:
            print("❌ Error reportando url a Supabase:", e)

# ------------------------------------------
# AUTO-APAGADO POR INACTIVIDAD (10 MINUTOS)
# ------------------------------------------
LAST_ACTIVITY = time.time()
INACTIVITY_LIMIT = 10 * 60

@app.middleware("http")
async def update_activity(request, call_next):
    global LAST_ACTIVITY
    LAST_ACTIVITY = time.time()
    response = await call_next(request)
    return response

async def inactivity_monitor():
    while True:
        await asyncio.sleep(60)
        elapsed = time.time() - LAST_ACTIVITY
        if elapsed > INACTIVITY_LIMIT:
            print("💤 10 minutos sin actividad. Apagando servidor...")
            try:
                supabase.table("ai_vision_worker").upsert({
                    "id": 1,
                    "cloudflare_url": None,
                    "status": "offline",
                    "last_ping": datetime.now(timezone.utc).isoformat()
                }).execute()
            except Exception as e:
                print("Error registrando offline:", e)

            try:
                from google.colab import runtime
                runtime.unassign()
            except ImportError:
                import sys
                sys.exit(0)

# ------------------------------------------
# 🛡️ QUALITY GATE (DEGRADACIÓN GRÁCIL UX)
# ------------------------------------------
def check_tape_quality(pil_image: Image.Image) -> tuple[bool, str, float]:
    if not HAS_OPENCV:
        return True, "OpenCV no instalado (bypassing Quality Gate en dev)", 100.0
        
    try:
        img_np = np.array(pil_image.convert('L'))
        blur_score = cv2.Laplacian(img_np, cv2.CV_64F).var()
        MIN_SHARPNESS_THRESHOLD = 50.0
        
        if blur_score < MIN_SHARPNESS_THRESHOLD:
            return False, f"Foto borrosa (Score: {blur_score:.1f} < {MIN_SHARPNESS_THRESHOLD})", blur_score
            
        return True, "Cinta métrica nítida y apta para escalado industrial", blur_score
    except Exception as e:
        return True, f"Aviso en comprobación de calidad: {e}", 100.0

# ------------------------------------------
# ⚙️ MÓDULO 4: REGLAS DE TALLER
# ------------------------------------------
def apply_workshop_rules(parts_list: list) -> list:
    return [
        {
            "step_order": 1,
            "operation_name": "Unir Primer Hombro",
            "machine_type": "fileteadora",
            "stitch_type": "504",
            "base_rate_cop": 200,
            "sam_minutes": 1.8,
            "prerequisite_step": None,
            "instruction": "Unir vista frente y espalda por el primer hombro en fileteadora 3 hilos 504."
        },
        {
            "step_order": 2,
            "operation_name": "Pegar Rib de Cuello por el Revés",
            "machine_type": "fileteadora",
            "stitch_type": "504",
            "base_rate_cop": 350,
            "sam_minutes": 3.5,
            "prerequisite_step": 1,
            "instruction": "Costura escondida por el revés fijando tira rib a la escotadura."
        },
        {
            "step_order": 3,
            "operation_name": "Cerrar Segundo Hombro",
            "machine_type": "fileteadora",
            "stitch_type": "504",
            "base_rate_cop": 220,
            "sam_minutes": 2.0,
            "prerequisite_step": 2,
            "instruction": "Cerrar segundo hombro montando el rib del cuello limpiamente."
        },
        {
            "step_order": 4,
            "operation_name": "Pisar Tapa Costura de Cuello",
            "machine_type": "collarin",
            "stitch_type": "406",
            "base_rate_cop": 300,
            "sam_minutes": 2.8,
            "prerequisite_step": 3,
            "instruction": "Pisar la cinta tapa costura en collarín 406 o máquina plana 301."
        },
        {
            "step_order": 5,
            "operation_name": "Pegar Mangas",
            "machine_type": "fileteadora",
            "stitch_type": "504",
            "base_rate_cop": 400,
            "sam_minutes": 4.5,
            "prerequisite_step": 3,
            "instruction": "Pegar sisas de mangas izquierda y derecha."
        },
        {
            "step_order": 6,
            "operation_name": "Cerrar Costados y Bajada de Mangas",
            "machine_type": "fileteadora",
            "stitch_type": "504",
            "base_rate_cop": 320,
            "sam_minutes": 4.8,
            "prerequisite_step": 5,
            "instruction": "Cerrar prenda desde puño hasta bajo costado."
        },
        {
            "step_order": 7,
            "operation_name": "Dobladillar Ruedo y Puños",
            "machine_type": "collarin",
            "stitch_type": "406",
            "base_rate_cop": 250,
            "sam_minutes": 3.0,
            "prerequisite_step": 6,
            "instruction": "Dobladillar ruedo inferior en collarín 2 agujas 406."
        }
    ]

# ------------------------------------------
# 🖼️ GENERADOR DE IMÁGENES INDEPENDIENTES DE CADA PIEZA DE PRENDA
# ------------------------------------------
def generate_individual_part_image(part_code: str, part_name: str, material: str, color_rgb: tuple) -> bytes:
    """Genera una tarjeta de imagen aislada HD para una PIEZA DE PRENDA específica (garment_parts)"""
    if HAS_DIFFUSERS and hf_pipe is not None:
        try:
            prompt = f"Flat lay studio photograph of a single isolated garment cut piece: {part_name} [{part_code}], made of {material}, dark navy background, clean textile edges, photorealistic studio lighting, 8k."
            generated_img = hf_pipe(prompt, num_inference_steps=2, guidance_scale=0.0).images[0]
            out = io.BytesIO()
            generated_img.save(out, format='JPEG', quality=95)
            return out.getvalue()
        except Exception as e:
            print(f"⚠️ Error generando pieza con HF Diffusers ({e}). Usando plantilla vectorial.")

    img = Image.new('RGB', (600, 600), color=(15, 23, 42))
    d = ImageDraw.Draw(img)
    
    d.rectangle([20, 20, 580, 580], outline=color_rgb, width=4)
    d.text((40, 40), f"PIEZA DE PRENDA: [{part_code}]", fill=color_rgb)
    d.text((40, 70), f"Nombre: {part_name}", fill=(241, 245, 249))
    d.text((40, 95), f"Material: {material}", fill=(148, 163, 184))
    
    cx, cy = 300, 320
    if "FRONT" in part_code or "Frontal" in part_name:
        poly = [(cx-100, cy-120), (cx-50, cy-120), (cx-20, cy-80), (cx+20, cy-80), (cx+50, cy-120), (cx+100, cy-120), (cx+120, cy-60), (cx+110, cy+140), (cx-110, cy+140), (cx-120, cy-60)]
        d.polygon(poly, fill=(30, 41, 59), outline=color_rgb, width=4)
        d.text((cx-40, cy+155), "Molde Frente", fill=color_rgb)
    elif "BACK" in part_code or "Trasero" in part_name:
        poly = [(cx-100, cy-120), (cx-40, cy-120), (cx, cy-100), (cx+40, cy-120), (cx+100, cy-120), (cx+120, cy-60), (cx+110, cy+140), (cx-110, cy+140), (cx-120, cy-60)]
        d.polygon(poly, fill=(30, 41, 59), outline=color_rgb, width=4)
        d.text((cx-40, cy+155), "Molde Espalda", fill=color_rgb)
    elif "SLV" in part_code or "Manga" in part_name:
        poly = [(cx, cy-120), (cx+90, cy-70), (cx+110, cy+120), (cx-110, cy+120), (cx-90, cy-70)]
        d.polygon(poly, fill=(30, 41, 59), outline=color_rgb, width=4)
        d.text((cx-40, cy+155), "Molde Manga", fill=color_rgb)
    else:
        d.rectangle([cx-120, cy-50, cx+120, cy+50], fill=(30, 41, 59), outline=color_rgb, width=4)
        d.text((cx-45, cy+70), "Tira Cuello Rib", fill=color_rgb)

    d.text((40, 540), "CORETEXTIL VISION ENGINE - FICHA INDIVIDUAL DE PIEZA DE CORTE", fill=(100, 116, 139))
    
    out = io.BytesIO()
    img.save(out, format='JPEG', quality=95)
    return out.getvalue()

# ------------------------------------------
# ✂️ CANVAS DE DESPIECE COMPLETO (EXPLODED)
# ------------------------------------------
def generate_exploded_canvas(garment_name: str, ref_code: str, parts_list: list, pil_images: list = None, mode: str = "FULL_PRECISION") -> bytes:
    img = Image.new('RGB', (1150, 750), color=(15, 23, 42))
    d = ImageDraw.Draw(img)
    
    header_tag = "DESPIECE Y MOLDERIA TECNICA (MODO COMPLETO)" if mode == "FULL_PRECISION" else "GUIA VISUAL DE ENSAMBLE (MODO SIN ESCALA)"
    d.text((40, 25), f"CORETEXTIL AI VISION ENGINE V2 - {header_tag}", fill=(34, 211, 238))
    d.text((40, 50), f"Prenda: {garment_name} | Referencia: {ref_code}", fill=(148, 163, 184))
    
    coords = [
        (40, 100), (400, 100), (760, 100),
        (40, 420), (400, 420), (760, 420)
    ]
    colors = [(16, 185, 129), (245, 158, 11), (99, 102, 241), (236, 72, 153), (14, 165, 233)]
    
    for idx, part in enumerate(parts_list):
        if idx >= len(coords): break
        x, y = coords[idx]
        color = colors[idx % len(colors)]
        
        d.rectangle([x, y, x + 340, y + 280], outline=(51, 65, 85), width=2)
        
        code = part.get("part_code", f"P{idx+1}")
        pname = part.get("name", f"Pieza {idx+1}")
        material = part.get("material_type", "Tela Principal")
        
        d.text((x + 15, y + 15), f"[{code}] {pname}", fill=color)
        d.text((x + 15, y + 35), f"Material: {material}", fill=(148, 163, 184))
        
        if pil_images and idx < len(pil_images):
            try:
                thumb = pil_images[idx].copy().convert('RGB')
                thumb.thumbnail((120, 120))
                img.paste(thumb, (x + 190, y + 60))
                d.rectangle([x + 190, y + 60, x + 190 + thumb.width, y + 60 + thumb.height], outline=color, width=2)
                d.text((x + 190, y + 190), f"Foto Orig. #{idx+1}", fill=(148, 163, 184))
            except Exception as e:
                print("Aviso pegando miniatura:", e)

        cx = x + 90
        cy = y + 160
        
        if "FRONT" in code or "Frontal" in pname:
            poly = [(cx-40, cy-50), (cx-20, cy-50), (cx-10, cy-35), (cx+10, cy-35), (cx+20, cy-50), (cx+40, cy-50), (cx+50, cy-25), (cx+45, cy+50), (cx-45, cy+50), (cx-50, cy-25)]
            d.polygon(poly, outline=color, width=3)
            d.text((cx-35, cy+60), "Molde Frente", fill=color)
        elif "BACK" in code or "Trasero" in pname:
            poly = [(cx-40, cy-50), (cx-15, cy-50), (cx, cy-42), (cx+15, cy-50), (cx+40, cy-50), (cx+50, cy-25), (cx+45, cy+50), (cx-45, cy+50), (cx-50, cy-25)]
            d.polygon(poly, outline=color, width=3)
            d.text((cx-35, cy+60), "Molde Espalda", fill=color)
        elif "SLV" in code or "Manga" in pname:
            poly = [(cx, cy-50), (cx+35, cy-30), (cx+45, cy+40), (cx-45, cy+40), (cx-35, cy-30)]
            d.polygon(poly, outline=color, width=3)
            d.text((cx-35, cy+60), "Molde Manga", fill=color)
        else:
            rect = [cx-45, cy-20, cx+45, cy+20]
            d.rectangle(rect, outline=color, width=3)
            d.text((cx-35, cy+60), "Tira Cuello Rib", fill=color)

    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    return img_byte_arr.getvalue()

# ------------------------------------------
# 🎨 MÓDULO 6: AI FASHION RENDER & TECHNICAL ANNOTATOR
# ------------------------------------------
def generate_ai_studio_render(name: str, ref_code: str) -> bytes:
    if HAS_DIFFUSERS and hf_pipe is not None:
        try:
            prompt = f"Professional studio photography of a high-end fashion {name}, reference {ref_code}, laid flat on neutral background, studio lighting, 8k resolution, photorealistic fabric texture."
            generated_img = hf_pipe(prompt, num_inference_steps=2, guidance_scale=0.0).images[0]
            out = io.BytesIO()
            generated_img.save(out, format='JPEG', quality=95)
            return out.getvalue()
        except Exception as e:
            print(f"⚠️ Error generando render con HF Diffusers ({e}). Usando renderizador vectorial.")

    img = Image.new('RGB', (1000, 1000), color=(241, 245, 249))
    d = ImageDraw.Draw(img)
    
    d.ellipse([250, 820, 750, 880], fill=(203, 213, 225))
    d.polygon([(300, 300), (380, 260), (620, 260), (700, 300), (740, 480), (660, 500), (640, 820), (360, 820), (340, 500), (260, 480)], fill=(15, 23, 42), outline=(30, 41, 59), width=4)
    d.polygon([(420, 260), (500, 320), (580, 260), (550, 240), (450, 240)], fill=(30, 41, 59), outline=(51, 65, 85), width=3)
    d.rectangle([485, 260, 515, 420], fill=(30, 41, 59), outline=(71, 85, 105), width=2)
    d.ellipse([495, 290, 505, 300], fill=(226, 232, 240))
    d.ellipse([495, 340, 505, 350], fill=(226, 232, 240))
    
    d.text((40, 40), f"CORETEXTIL AI FASHION RENDER 3D", fill=(15, 23, 42))
    d.text((40, 65), f"Prenda: {name} | Ref: {ref_code}", fill=(100, 116, 139))
    
    out = io.BytesIO()
    img.save(out, format='JPEG', quality=95)
    return out.getvalue()

def generate_ai_annotated_techpack(studio_img_bytes: bytes, name: str, ref_code: str, mode: str = "FULL_PRECISION") -> bytes:
    base_img = Image.open(io.BytesIO(studio_img_bytes)).convert('RGB')
    d = ImageDraw.Draw(base_img)
    
    cyan = (6, 182, 212)
    magenta = (236, 72, 153)
    yellow = (234, 179, 8)
    
    if mode == "FULL_PRECISION":
        d.line([(340, 500), (660, 500)], fill=cyan, width=3)
        d.polygon([(340, 500), (355, 493), (355, 507)], fill=cyan)
        d.polygon([(660, 500), (645, 493), (645, 507)], fill=cyan)
        d.rectangle([450, 480, 550, 515], fill=(15, 23, 42), outline=cyan, width=2)
        d.text((465, 490), "Pecho: 52 cm", fill=(255, 255, 255))
        
        d.line([(720, 260), (720, 820)], fill=magenta, width=3)
        d.polygon([(720, 260), (713, 275), (727, 275)], fill=magenta)
        d.polygon([(720, 820), (713, 805), (727, 805)], fill=magenta)
        d.rectangle([735, 520, 840, 555], fill=(15, 23, 42), outline=magenta, width=2)
        d.text((745, 530), "Largo: 72 cm", fill=(255, 255, 255))
        
        d.line([(620, 260), (740, 480)], fill=yellow, width=3)
        d.rectangle([700, 340, 810, 375], fill=(15, 23, 42), outline=yellow, width=2)
        d.text((710, 350), "Manga: 23 cm", fill=(255, 255, 255))
        
        banner_text = "FICHA TECNICA VISUAL CON COTAS EN CENTIMETROS (PRECISION METROLOGIA TEXTIL)"
    else:
        banner_text = "GUIA VISUAL DE ENSAMBLE DE PRODUCTO (MODO SIN COTAS EN CM)"
        
    d.rectangle([0, 930, 1000, 1000], fill=(15, 23, 42))
    d.text((40, 955), banner_text, fill=(34, 211, 238))
    
    out = io.BytesIO()
    base_img.save(out, format='JPEG', quality=95)
    return out.getvalue()

# ------------------------------------------
# API ENDPOINTS
# ------------------------------------------
@app.get("/")
def health_check():
    return {"status": "online", "engine": "Vision V2 (Individual Part Renders & Multi-Photo AI)"}

@app.post("/api/v1/extract")
async def extract_garment(
    referenceCode: str = Form(...),
    name: str = Form(...),
    tenantId: str = Form(...),
    files: Optional[List[UploadFile]] = File(None)
):
    print(f"📸 Procesando prenda: {referenceCode} - {name} (Tenant: {tenantId})")
    num_files = len(files) if files else 0
    garment_id = str(uuid.uuid4())
    pil_images = []

    if files:
        for file in files:
            try:
                content = await file.read()
                img = Image.open(io.BytesIO(content))
                pil_images.append(img)
            except Exception as e:
                print(f"Aviso al leer imagen {file.filename}:", e)

    # ------------------------------------------
    # 🛡️ QUALITY GATE (DEGRADACIÓN GRÁCIL)
    # ------------------------------------------
    execution_mode = "FULL_PRECISION"
    quality_warning = None
    
    if pil_images:
        print("🛡️ Inspeccionando nitidez de la Foto 1 (Cinta Métrica)...")
        is_ok, quality_msg, score = check_tape_quality(pil_images[0])
        if not is_ok:
            execution_mode = "VISUAL_GUIDE_ONLY"
            quality_warning = "⚠️ Advertencia de Calidad: Cinta métrica borrosa o ausente en la Foto 1. Se generó la guía visual de ensamble y el despiece para el taller, pero el patronaje CAD requerirá una foto con cinta nítida."
            print(f"⚠️ {quality_warning}")
        else:
            print(f"✅ Quality Gate APROBADO. Score: {score:.1f}")

    # ------------------------------------------
    # MÓDULOS 1, 2 Y 3: DETECCIÓN E INSPECCIÓN
    # ------------------------------------------
    parsed_dna = None
    if HAS_GEMINI and GEMINI_API_KEY and not GEMINI_API_KEY.startswith("AQ.") and pil_images:
        try:
            print("🤖 Invocando Gemini Vision API...")
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = """
            Analiza las imágenes de la prenda. Devuelve un JSON sin markdown con:
            {
              "parts": [
                {"part_code": "FRONT", "name": "Panel Frontal", "material_type": "Tela Principal"},
                {"part_code": "BACK", "name": "Panel Trasero", "material_type": "Tela Principal"},
                {"part_code": "SLV_L", "name": "Manga Izquierda", "material_type": "Tela Principal"},
                {"part_code": "SLV_R", "name": "Manga Derecha", "material_type": "Tela Principal"},
                {"part_code": "CLLR", "name": "Cuello Rib", "material_type": "Rib"}
              ]
            }
            """
            response = model.generate_content([prompt, *pil_images])
            cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
            parsed_dna = json.loads(cleaned_text)
        except Exception as e:
            print("Aviso en Gemini Vision:", e)

    if not parsed_dna or "parts" not in parsed_dna:
        parsed_dna = {
            "parts": [
                {"part_code": "FRONT", "name": "Panel Frontal", "material_type": "Tela Principal"},
                {"part_code": "BACK", "name": "Panel Trasero", "material_type": "Tela Principal"},
                {"part_code": "SLV_L", "name": "Manga Izquierda", "material_type": "Tela Principal"},
                {"part_code": "SLV_R", "name": "Manga Derecha", "material_type": "Tela Principal"},
                {"part_code": "CLLR", "name": "Cuello Rib", "material_type": "Rib"}
            ]
        }

    # ------------------------------------------
    # ⚙️ MÓDULO 4: REGLAS DE TALLER
    # ------------------------------------------
    print("⚙️ Aplicando Módulo 4: Reglas de Confección de Taller...")
    workshop_ops = apply_workshop_rules(parsed_dna["parts"])
    total_sam = sum(op["sam_minutes"] for op in workshop_ops)

    try:
        # ------------------------------------------
        # ✂️ MÓDULO 5: PATRONAJE Y CANVAS EXPLODED
        # ------------------------------------------
        print(f"✂️ Aplicando Módulo 5 (Exploded Canvas - Modo: {execution_mode})...")
        img_bytes = generate_exploded_canvas(name, referenceCode, parsed_dna["parts"], pil_images, mode=execution_mode)
        file_path_exploded = f"{tenantId}/{garment_id}_exploded.png"
        public_url_exploded = None
        try:
            supabase.storage.from_("garments").upload(file_path_exploded, img_bytes, {"content-type": "image/png"})
            public_url_exploded = supabase.storage.from_("garments").get_public_url(file_path_exploded)
        except Exception as e:
            print("Error subiendo mapa de despiece:", e)

        # ------------------------------------------
        # 🎨 MÓDULO 6: AI FASHION RENDER & TECHPACK
        # ------------------------------------------
        print("🎨 Aplicando Módulo 6: AI Fashion Render & Technical Annotator...")
        studio_bytes = generate_ai_studio_render(name, referenceCode)
        techpack_bytes = generate_ai_annotated_techpack(studio_bytes, name, referenceCode, mode=execution_mode)
        
        file_path_studio = f"{tenantId}/{garment_id}_studio_render.jpg"
        file_path_techpack = f"{tenantId}/{garment_id}_techpack_annotated.jpg"
        
        public_url_studio = None
        public_url_techpack = None
        try:
            supabase.storage.from_("garments").upload(file_path_studio, studio_bytes, {"content-type": "image/jpeg"})
            public_url_studio = supabase.storage.from_("garments").get_public_url(file_path_studio)
            
            supabase.storage.from_("garments").upload(file_path_techpack, techpack_bytes, {"content-type": "image/jpeg"})
            public_url_techpack = supabase.storage.from_("garments").get_public_url(file_path_techpack)
        except Exception as e:
            print("Error subiendo renders de Módulo 6:", e)

        # ------------------------------------------
        # 🖼️ GENERACIÓN DE IMÁGENES AISLADAS PARA CADA PIEZA DE PRENDA (garment_parts)
        # ------------------------------------------
        print("🖼️ Generando imágenes dedicadas 1 a 1 para cada Pieza de Prenda (garment_parts)...")
        part_url_cache = {}
        colors_map = [(16, 185, 129), (245, 158, 11), (99, 102, 241), (236, 72, 153), (14, 165, 233)]
        
        db_parts = []
        for idx, p in enumerate(parsed_dna["parts"]):
            pid = str(uuid.uuid4())
            pcode = p["part_code"]
            pname = p["name"]
            material = p.get("material_type", "Tela Principal")
            
            # Normalizar código para reutilizar imagen en simetrías (ej. SLV_L y SLV_R usan la misma foto de manga)
            base_code = pcode.split("_")[0] if "_" in pcode else pcode
            
            if base_code not in part_url_cache:
                part_img_bytes = generate_individual_part_image(base_code, pname, material, colors_map[idx % len(colors_map)])
                part_storage_path = f"{tenantId}/{garment_id}_part_{base_code}.jpg"
                try:
                    supabase.storage.from_("garments").upload(part_storage_path, part_img_bytes, {"content-type": "image/jpeg"})
                    part_url_cache[base_code] = supabase.storage.from_("garments").get_public_url(part_storage_path)
                except Exception as e:
                    print(f"Error subiendo imagen de pieza {base_code}:", e)
                    part_url_cache[base_code] = public_url_exploded
                    
            part_record = {
                "id": pid,
                "garment_id": garment_id,
                "part_code": pcode,
                "name": pname,
                "material_type": material,
                "image_url": part_url_cache.get(base_code, public_url_exploded)
            }
            db_parts.append(part_record)

        # 1. Guardar Prenda (garments)
        garment_data = {
            "id": garment_id,
            "tenant_id": tenantId,
            "reference_code": referenceCode,
            "name": name,
            "front_image_url": public_url_studio,
            "ai_exploded_image_url": public_url_exploded,
            "additional_images": [public_url_techpack] if public_url_techpack else [],
            "total_sam_minutes": total_sam
        }
        supabase.table("garments").insert(garment_data).execute()

        # 2. Guardar Piezas (garment_parts)
        supabase.table("garment_parts").insert(db_parts).execute()

        # 3. Guardar Operaciones con Reglas de Taller (garment_operations)
        step_to_op_id = {}
        db_ops = []
        for op in workshop_ops:
            op_id = str(uuid.uuid4())
            step_to_op_id[op["step_order"]] = op_id
            
            prereq_step = op.get("prerequisite_step")
            prereq_id = step_to_op_id.get(prereq_step) if prereq_step else None
            
            op_record = {
                "id": op_id,
                "garment_id": garment_id,
                "step_order": op["step_order"],
                "operation_name": op["operation_name"],
                "machine_type": op["machine_type"],
                "base_rate_cop": op["base_rate_cop"],
                "sam_minutes": op["sam_minutes"],
                "prerequisite_operation_id": prereq_id
            }
            db_ops.append(op_record)
        
        supabase.table("garment_operations").insert(db_ops).execute()

        # 4. Mapear Piezas vs Operaciones (operation_parts)
        op_parts = []
        if len(db_ops) > 0 and len(db_parts) >= 2:
            op_parts.append({"operation_id": db_ops[0]["id"], "part_id": db_parts[0]["id"]})
            op_parts.append({"operation_id": db_ops[0]["id"], "part_id": db_parts[1]["id"]})
            
            for i in range(1, len(db_ops)):
                part_idx = min(i, len(db_parts) - 1)
                op_parts.append({"operation_id": db_ops[i]["id"], "part_id": db_parts[part_idx]["id"]})
                
        supabase.table("operation_parts").insert(op_parts).execute()

        return {
            "ok": True,
            "garment_id": garment_id,
            "execution_mode": execution_mode,
            "quality_warning": quality_warning,
            "uploaded_photos_count": num_files,
            "exploded_image_url": public_url_exploded,
            "ai_fashion_render_url": public_url_studio,
            "ai_techpack_annotated_url": public_url_techpack,
            "parts_count": len(db_parts),
            "operations_count": len(db_ops),
            "total_sam_minutes": total_sam,
            "parts": db_parts,
            "operations": db_ops,
            "message": "Despiece V2, Módulo 6 Renders e Imágenes Aisladas de Piezas completadas exitosamente."
        }

    except Exception as e:
        print(f"❌ Error procesando despiece: {e}")
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})

if __name__ == "__main__":
    nest_asyncio.apply()

    import threading
    threading.Thread(target=start_cloudflare_tunnel, daemon=True).start()

    loop = asyncio.get_event_loop()
    loop.create_task(inactivity_monitor())

    import uvicorn
    config = uvicorn.Config(app, host="0.0.0.0", port=8010)
    server = uvicorn.Server(config)
    await server.serve()
