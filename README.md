# WSP Manager - Clemencia Brand

Sistema de WhatsApp automatizado con IA, asesores, ventas y boletas PDF.

## Requisitos
- Ubuntu 22.04 / Amazon Linux / Debian
- Node.js 20+
- 2GB RAM minimo

## Instalacion rapida
```bash
chmod +x install.sh
./install.sh
```

## Login por defecto
- Email: `admin@clemencia.com`
- Password: `admin123`

## Estructura
```
wsp-manager-prod/
  backend/
    server.js        - API principal
    database.js      - Base de datos SQLite
    evolution.js     - Cliente Evolution API
    ai.js            - Integracion IA (OpenAI/Groq/Gemini)
    auth.js          - Autenticacion JWT
    boleta-pdf.js    - Generador de boletas
    scheduler.js     - Programador de mensajes
    data/            - Base de datos (se crea automatico)
    uploads/         - Catalogos y boletas PDF
  frontend/
    index.html       - Aplicacion web completa
  scripts/
    backup.sh        - Backup automatico diario
  nginx.example.conf - Configuracion Nginx de ejemplo
  install.sh         - Script de instalacion
```

## Funcionalidades
- Chat WhatsApp con IA automatica
- Asesores con roles (admin/asesor)
- Autenticacion con email/password y JWT
- POS integrado en chat con descuento de stock
- Boleta PDF enviada automaticamente por WhatsApp
- Catalogos PDF con envio automatico
- Tags, notas internas, recordatorios
- Respuestas rapidas
- Envio masivo (Evolution + Twilio + Meta API)
- Backup automatico diario

## Configuracion
Editar `backend/.env`:
- `EVOLUTION_API_URL` - URL de tu Evolution API
- `EVOLUTION_API_KEY` - API key de Evolution
- `JWT_SECRET` - Secreto para tokens (se genera en instalacion)
- `WEBHOOK_URL` - URL publica para recibir mensajes
