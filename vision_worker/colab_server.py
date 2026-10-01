# ==========================================
# CORETEXTIL VISION ENGINE - COLAB WORKER
# Fase 2: SAM 2 + FastAPI + Cloudflare Tunnel
# ==========================================
# INSTRUCCIONES PARA GOOGLE COLAB:
# 1. Selecciona Entorno de Ejecución -> GPU T4
# 2. Copia y pega el código de "Instalación" en la Celda 1
# 3. Copia y pega este servidor en la Celda 2 y ejecútalo.
# ==========================================

'''
# --- CÓDIGO PARA LA CELDA 1 (INSTALACIÓN DE DEPENDENCIAS) ---
!pip install -q fastapi uvicorn supabase python-multipart nest-asyncio pillow
!pip install -q git+https://github.com/facebookresearch/segment-anything-2.0.git
!wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
!dpkg -i cloudflared-linux-amd64.deb
'''

import os
import time
import uuid
import json
import asyncio
import subprocess
from fastapi import FastAPI, File, UploadFile, Form
from supabase import create_client, Client
import nest_asyncio
import uvicorn
from PIL import Image, ImageDraw, ImageFont

# ------------------------------------------
# 1. CONFIGURACIÓN DEL ENTORNO (Reemplaza con tus keys)
# ------------------------------------------
SUPABASE_URL = "TU_SUPABASE_URL"
SUPABASE_KEY = "TU_SUPABASE_SERVICE_ROLE_KEY"
GEMINI_API_KEY = "TU_GEMINI_API_KEY"

# Inicializar Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Inicializar FastAPI
app = FastAPI(title="CoreTextil Vision Engine")

# ------------------------------------------
# 2. INICIO DE CLOUDFLARE Y REGISTRO EN SUPABASE
# ------------------------------------------
def start_cloudflare_tunnel(port=8000):
    print("Iniciando túnel de Cloudflare...")
    process = subprocess.Popen(
        ["cloudflared", "tunnel", "--url", f"http://localhost:{port}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    
    tunnel_url = None
    for line in process.stdout:
        if "trycloudflare.com" in line:
            # Extraer la URL
            parts = line.split(" ")
            for p in parts:
                if "trycloudflare.com" in p:
                    tunnel_url = p.strip()
                    break
        if tunnel_url:
            break
            
    if tunnel_url:
        print(f"🚀 Túnel activo en: {tunnel_url}")
        # Notificar a Supabase (Fénix Flow)
        supabase.table("ai_vision_worker").update({
            "cloudflare_url": tunnel_url,
            "status": "online"
        }).eq("id", 1).execute()
    else:
        print("❌ Error al iniciar Cloudflare Tunnel")

# ------------------------------------------
# 3. ENDPOINTS DE LA API
# ------------------------------------------
@app.get("/")
def health_check():
    return {"status": "online", "gpu": "T4 Ready"}

@app.post("/api/v1/extract")
async def extract_garment(
    referenceCode: str = Form(...),
    baseRateCop: int = Form(...),
    tenantId: str = Form(...),
    # Aquí recibiríamos las imágenes
    # files: list[UploadFile] = File(...) 
):
    """
    Este endpoint representa el Pipeline Completo:
    1. VLM (Gemini) devuelve JSON con BBoxes
    2. SAM 2 recorta las piezas
    3. Pillow genera el mapa
    4. Supabase Storage guarda las imágenes
    """
    
    # [SIMULACIÓN PARA MVP]
    # En la versión final aquí va el código de SAM 2 (predictor.predict)
    # y la subida a storage.
    
    # Actualizamos el heartbeat
    supabase.table("ai_vision_worker").update({"status": "online"}).eq("id", 1).execute()
    
    return {
        "ok": True,
        "message": "Fase 2 en construcción. Conexión GPU exitosa."
    }

# ------------------------------------------
# 4. EJECUCIÓN DEL SERVIDOR
# ------------------------------------------
if __name__ == "__main__":
    nest_asyncio.apply() # Permite correr uvicorn en Colab
    
    # Arrancar túnel en hilo paralelo o background
    import threading
    threading.Thread(target=start_cloudflare_tunnel, daemon=True).start()
    
    # Arrancar servidor
    print("Arrancando Uvicorn...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
