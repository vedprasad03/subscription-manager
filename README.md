# Subscription Manager

An AI-powered web app that automatically detects, tracks, and helps you optimize your recurring subscriptions using your Gmail inbox and Claude.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL + SQLAlchemy + Alembic |
| AI | Anthropic Claude API |
| Auth | JWT (access + refresh tokens) |
| Email | Gmail API (read-only OAuth 2.0) |

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (for PostgreSQL)
- A [Google Cloud Console](https://console.cloud.google.com/) project with the Gmail API enabled
- An [Anthropic API key](https://console.anthropic.com/)

## Setup

### 1. Clone and configure environment

```bash
cp .env.example .env
```

Fill in `.env`:
- `SECRET_KEY` — any long random string
- `ENCRYPTION_KEY` — run `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` and paste the output
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from Google Cloud Console (OAuth 2.0 credentials, Web application type)
- `ANTHROPIC_API_KEY` — from Anthropic Console

### 2. Start the database

```bash
docker compose up -d
```

### 3. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

API runs at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Google OAuth setup

In Google Cloud Console:
1. Enable the **Gmail API**
2. Create **OAuth 2.0 credentials** (Web application)
3. Add `http://localhost:8000/api/gmail/callback` as an authorized redirect URI
4. Copy the client ID and secret into `.env`

## Project structure

```
subscription-manager/
├── backend/
│   ├── app/
│   │   ├── core/        # config, database, security, deps
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── routers/     # API endpoints
│   │   └── services/    # Gmail integration, Claude AI
│   ├── alembic/         # database migrations
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── api/         # Axios client + API functions
│       ├── context/     # Auth context
│       ├── pages/       # Login, Register, Dashboard, ConnectGmail
│       └── components/  # NotificationBell, AddSubscriptionModal
├── docker-compose.yml
└── .env.example
```
