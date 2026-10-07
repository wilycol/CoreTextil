import base64

logo_bytes = open('public/logo.png', 'rb').read()
icon_bytes = open('public/icon.png', 'rb').read()

logo_b64 = base64.b64encode(logo_bytes).decode('utf-8')
icon_b64 = base64.b64encode(icon_bytes).decode('utf-8')

with open('src/components/logo_base64.ts', 'w') as f:
    f.write(f'export const LOGO_BASE64 = "data:image/png;base64,{logo_b64}";\n')
    f.write(f'export const ICON_BASE64 = "data:image/png;base64,{icon_b64}";\n')

print(f"Successfully generated logo_base64.ts (Logo: {len(logo_b64)} chars, Icon: {len(icon_b64)} chars)")
