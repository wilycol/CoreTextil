import sys
import asyncio
import json
import requests
from supabase import create_client, Client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

# Configuración (Supabase CoreTextil - Service Role)
SUPABASE_URL = "https://lsypibiyuhpykykroprz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzeXBpYml5dWhweWt5a3JvcHJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDcwNDg0NywiZXhwIjoyMTA2MjgwODQ3fQ.t_U--wGYs82DA0LheHl1NO71b5PvkDoMGPA9-3FAlVQ"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def test_vision():
    print("1. Consultando URL del túnel en Supabase...")
    response = supabase.table("ai_vision_worker").select("cloudflare_url, status, last_ping").eq("id", 1).execute()
    
    if not response.data:
        print("[X] No se encontró el worker en la base de datos.")
        return
        
    worker = response.data[0]
    print(f"   Estado en DB: {worker.get('status')} | Último ping: {worker.get('last_ping')}")
    
    if worker.get("status") != "online" or not worker.get("cloudflare_url"):
        print("[X] El motor de visión está apagado en Supabase (status != online o cloudflare_url es null).")
        return
        
    url = worker["cloudflare_url"]
    print(f"[OK] Túnel encontrado: {url}")
    print("\n2. Consultando un Tenant válido en la DB para la prueba...")
    
    tenants_res = supabase.table("tenants").select("id, name").limit(1).execute()
    
    if not tenants_res.data:
        print("[X] No hay tenants registrados en la base de datos.")
        return
        
    real_tenant_id = tenants_res.data[0]["id"]
    tenant_name = tenants_res.data[0]["name"]
    print(f"[OK] Tenant usado: '{tenant_name}' ({real_tenant_id})")
    
    payload = {
        "referenceCode": "POLO-ISOLATED-2026",
        "name": "Camiseta Polo Test Aislado",
        "tenantId": real_tenant_id
    }
    
    print("\n3. Enviando datos de prueba al endpoint /api/v1/extract...")
    try:
        res = requests.post(f"{url}/api/v1/extract", data=payload, timeout=30)
        print(f"   Código de respuesta HTTP: {res.status_code}")
        
        if res.status_code == 200:
            print("\n[SUCCESS] ¡Respuesta exitosa del Motor de Visión!")
            print(json.dumps(res.json(), indent=2))
        else:
            print(f"\n[ERROR] Error {res.status_code} al contactar al motor:")
            print(res.text)
            
    except Exception as e:
        print(f"[ERROR] Error de conexión con el túnel: {e}")

if __name__ == "__main__":
    test_vision()
