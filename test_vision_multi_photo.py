import sys
import io
import json
import time
import requests
from PIL import Image, ImageDraw
from supabase import create_client, Client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

# Configuración (Supabase CoreTextil - Service Role)
SUPABASE_URL = "https://lsypibiyuhpykykroprz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzeXBpYml5dWhweWt5a3JvcHJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDcwNDg0NywiZXhwIjoyMTA2MjgwODQ3fQ.t_U--wGYs82DA0LheHl1NO71b5PvkDoMGPA9-3FAlVQ"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_sample_garment_photos():
    print("🎨 Generando 5 imágenes de muestra para la prueba multi-foto...")
    photos = []
    labels = [
        ("Vista Frontal", (34, 197, 94)),
        ("Vista Trasera", (234, 179, 8)),
        ("Manga Izquierda", (99, 102, 241)),
        ("Manga Derecha", (236, 72, 153)),
        ("Detalle Cuello", (14, 165, 233))
    ]
    
    for idx, (label, color) in enumerate(labels, 1):
        img = Image.new('RGB', (600, 600), color=(15, 23, 42))
        d = ImageDraw.Draw(img)
        
        d.rectangle([100, 100, 500, 500], outline=color, width=4)
        d.text((120, 120), f"FOTO {idx}/5: {label}", fill=color)
        d.text((120, 160), "CoreTextil Vision Test Dataset", fill=(148, 163, 184))
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG')
        photos.append((f"foto_{idx}_{label.replace(' ', '_').lower()}.jpg", img_byte_arr.getvalue(), "image/jpeg"))
        
    print(f"✅ {len(photos)} fotos preparadas exitosamente en memoria.")
    return photos

def run_multi_photo_test():
    print("1. Consultando URL del túnel en Supabase...")
    response = supabase.table("ai_vision_worker").select("cloudflare_url, status, last_ping").eq("id", 1).execute()
    
    if not response.data:
        print("[X] No se encontró el worker en la base de datos.")
        return
        
    worker = response.data[0]
    print(f"   Estado en DB: {worker.get('status')} | Último ping: {worker.get('last_ping')}")
    
    if worker.get("status") != "online" or not worker.get("cloudflare_url"):
        print("[X] El motor de visión está apagado en Supabase.")
        return
        
    url = worker["cloudflare_url"]
    print(f"[OK] Túnel activo en: {url}")
    
    tenants_res = supabase.table("tenants").select("id, name").limit(1).execute()
    if not tenants_res.data:
        print("[X] No hay tenants registrados.")
        return
        
    tenant_id = tenants_res.data[0]["id"]
    tenant_name = tenants_res.data[0]["name"]
    print(f"[OK] Tenant: '{tenant_name}' ({tenant_id})")
    
    sample_photos = generate_sample_garment_photos()
    unique_ref = f"FRANELA-CREW-{int(time.time())}"
    
    data_payload = {
        "referenceCode": unique_ref,
        "name": f"Franela Básica Cuello Redondo Algodón {int(time.time()) % 1000}",
        "tenantId": tenant_id
    }
    
    files_payload = [
        ("files", (filename, content, mime))
        for filename, content, mime in sample_photos
    ]
    
    print(f"\n3. Enviando petición POST /api/v1/extract (Ref: {unique_ref}) para FRANELA BÁSICA CUELLO REDONDO...")
    try:
        res = requests.post(
            f"{url}/api/v1/extract",
            data=data_payload,
            files=files_payload,
            timeout=60
        )
        
        print(f"   Código HTTP: {res.status_code}")
        if res.status_code == 200:
            result = res.json()
            print("\n🎉 ¡PIPELINE DE DESPIECE DE PRENDA Y PIEZAS COMPLETADO CON ÉXITO!")
            print(f"📌 Garment ID: {result.get('garment_id')}")
            print(f"⚡ Modo de Ejecución: {result.get('execution_mode')}")
            print(f"📸 Fotos Recibidas: {result.get('uploaded_photos_count')}")
            print(f"🧩 Piezas Generadas: {result.get('parts_count')}")
            print(f"⚙️ Operaciones Generadas: {result.get('operations_count')}")
            print(f"⏱️ Tiempo SAM Total: {result.get('total_sam_minutes')} min")
            
            print("\n--- RENDERS DE PRENDA COMPLETA ---")
            print(f"🖼️ Mapa de Despiece Exploded: {result.get('exploded_image_url')}")
            print(f"🎨 Studio Render 3D de Prenda: {result.get('ai_fashion_render_url')}")
            print(f"📐 Tech-Pack Ficha de Cotas: {result.get('ai_techpack_annotated_url')}")
            
            print("\n--- DETALLE E IMÁGENES AISLADAS DE CADA PIEZA DE PRENDA (garment_parts) ---")
            for p in result.get("parts", []):
                print(f"  • [{p['part_code']}] {p['name']} ({p['material_type']}) -> Imagen Pieza: {p.get('image_url')}")
                
            print("\n--- SECTORES Y OPERACIONES (GANTT) ---")
            for op in result.get("operations", []):
                print(f"  Step {op['step_order']}: {op['operation_name']} | Máquina: {op['machine_type']} (Puntada {op.get('stitch_type', '504')}) | SAM: {op['sam_minutes']}m")
                
        else:
            print(f"\n[ERROR] El servidor respondió con código {res.status_code}:")
            print(res.text)
            
    except Exception as e:
        print(f"[ERROR] Error durante la llamada HTTP: {e}")

if __name__ == "__main__":
    run_multi_photo_test()
