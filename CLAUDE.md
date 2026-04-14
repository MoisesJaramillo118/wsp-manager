# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WSP Manager is a full-stack WhatsApp automation system for the Clemencia Brand. It integrates real-time messaging via the Evolution API with AI responses (OpenAI/Groq/Gemini), advisor management, a POS module, PDF receipt generation, and a dashboard.

- **Backend:** Django 4.2 + Django REST Framework, JWT auth, SQLite, runs on port 3006 via Gunicorn
- **Frontend:** React 19 + TypeScript + Vite, Zustand state management, Tailwind CSS 4
- **WhatsApp Integration:** Evolution API (external service, configured via `.env`)

## Commands

### Backend (Django)

```bash
cd backend-django

# Install dependencies
pip install -r requirements.txt

# Run development server
python manage.py runserver

# Apply migrations
python manage.py migrate

# Create migrations
python manage.py makemigrations

# Run with Gunicorn (production, port 3006)
gunicorn -c gunicorn.conf.py config.wsgi:application
```

### Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Run dev server (proxies /wsp-api to backend)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# TypeScript type check
npx tsc --noEmit
```

## Architecture

### Backend (`backend-django/`)

**Django apps** under `apps/`:

| App | Responsibility |
|-----|---------------|
| `accounts` | Advisor model, JWT authentication |
| `conversations` | Conversation, Chat, InternalNote models |
| `contacts` | Contact and group management |
| `messaging` | Message routing logic |
| `ai` | AI provider abstraction (OpenAI/Groq/Gemini), system prompts |
| `webhook` | Incoming Evolution API webhook processing (async via threading) |
| `connection` | Evolution API client (`evolution.py`) |
| `sales` | Sales/POS tracking |
| `catalogs` | PDF catalog management |
| `dashboard` | KPI statistics |
| `tags`, `reminders`, `alerts` | Supporting features |

**`core/`** — shared utilities: custom exception handler, pagination, permissions, `SlashMiddleware`.

**`config/`** — Django settings, URL routing, Gunicorn config.

**Database:** SQLite at `data/whatsapp.db`.

### Frontend (`frontend/src/`)

**State management** (Zustand stores in `stores/`):
- `authStore.ts` — JWT tokens and session (sessionStorage)
- `chatStore.ts` — Active conversation and message state
- `contactStore.ts` — Contact list state
- `uiStore.ts` — Active section and loading state

**API layer:**
- `config/api.ts` — Axios instance with JWT injection, auto-prefixing to `/wsp-api/api`, and 401 redirect
- `services/` — One file per domain (auth, chatService, contacts, messaging, catalogs, ai, sales, advisors, dashboard, etc.)

**Routing:** React Router in `App.tsx`.

**Types:** All domain interfaces defined in `types/index.ts` (Advisor, Conversation, ChatMessage, Contact, VentaCerrada, AISettings, etc.).

### API Proxy

Vite dev server proxies `/wsp-api` → `http://localhost:3006` (configured in `vite.config.ts`). In production, Nginx handles the same proxy — see `nginx.example.conf`.

## Environment Configuration

Backend reads from `backend-django/.env` (see `.env.example`):

```bash
EVOLUTION_API_URL=       # WhatsApp API base URL
EVOLUTION_API_KEY=       # API key
JWT_SECRET_KEY=          # Django secret key / JWT signing
WEBHOOK_URL=             # Public URL for Evolution API callbacks
UPLOADS_DIR=             # Path for file uploads
```

## Deployment

- PM2 manages backend and frontend processes
- `install.sh` automates full setup (supports Ubuntu 22.04, Debian, Amazon Linux)
- Daily database backup via cron (managed by `scripts/`)
- Default admin credentials: `admin@clemencia.com` / `admin123`
