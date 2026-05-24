# David HQ

App personal de gestión de ventas para Practigram (setter/closer).

## Stack

- Next.js 16 (App Router)
- Tailwind CSS v4
- Supabase
- Notion API (server-side)
- Deploy en Vercel

## Desarrollo local

```bash
npm install
cp .env.example .env.local
# Completar NOTION_API_KEY en .env.local para probar sync Notion
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Variables de entorno (Vercel)

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key pública |
| `NOTION_API_KEY` | Integration secret (solo server) |
| `NOTION_DB_ID` | ID de la database de ventas |

## Deploy

1. Subir repo a GitHub (`david-hq`)
2. Importar en Vercel y conectar el repo
3. Cargar variables de entorno (incl. `NOTION_API_KEY` manualmente)
4. Deploy automático en cada push

## Secciones

- `/` — Dashboard
- `/tracker` — Comisiones
- `/potenciales` — Kanban
- `/agendar` — Formulario ManyChat
- `/transcripciones` — Station integrada
