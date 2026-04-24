# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AI Recruiter** platform with two separate backends living in the same repo:

| Directory | Stack | Status |
|-----------|-------|--------|
| `backend/` | FastAPI + asyncpg + PostgreSQL | Active development |
| `untitled folder/` | Django + DRF + SQLite/PostgreSQL | Legacy prototype |

The `frontend/` directory contains only an `__init__.py`; actual HTML/JS is served as static files from `untitled folder/`.

---

## FastAPI Backend (`backend/`)

### Running locally

```bash
cd backend
# Activate the shared venv at repo root
source ../.venv/bin/activate

# Set required env vars (or use backend/config/.env)
export DB_HOST=localhost DB_PORT=5432 DB_NAME=postgres DB_USER=postgres DB_PASSWORD=<pw>
export JWT_SECRET=dev-secret

uvicorn main:app --reload --port 8001
```

The app is available at `http://localhost:8001`. Swagger UI is at `/docs`.

### Key environment variables (`backend/config/.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `DB_HOST/PORT/NAME/USER/PASSWORD` | — | PostgreSQL connection |
| `MAX_POOL_SIZE` | `200` | asyncpg pool size |
| `JWT_SECRET` | `change-me-in-production` | HS256 signing key |
| `JWT_ALGORITHM` | `HS256` | — |
| `ACCESS_TOKEN_TTL_MINUTES` | `30` | Access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | `14` | Refresh token lifetime |
| `SMTP_HOST/PORT/USER/PASSWORD/FROM` | — | Outbound email |
| `SMTP_REQUIRED` | `false` | If `true`, email failures abort registration |
| `EMAIL_CODE_TTL_MINUTES` | `10` | Verification code lifetime |

If SMTP is not configured, email codes are printed to the log instead of sent (safe for local dev when `SMTP_REQUIRED=false`).

### Architecture

```
backend/
├── main.py                  # FastAPI app, lifespan, AuthMiddleware, exception handler
├── config/config.py         # dotenv loader — all env vars imported from here
├── db/database.py           # asyncpg pool: init_db_pool / close_db_pool / get_db_conn*
└── app/
    ├── exceptions.py        # EDSServiceException (trilingual), ServiceError
    ├── middleware/
    │   └── auth_middleware.py   # Bearer token → aihr.user_sessions lookup → request.state.user_id
    ├── presentation/
    │   └── main_controller.py   # APIRouter prefix="/api", includes auth_router
    └── modules/
        ├── base/presentation/schemas/responses/api_response_dto.py  # ApiResponseDTO, MessageDTO, ErrorDTO
        └── auth/
            ├── presentation/api/auth_controller.py  # All /api/auth/* endpoints
            ├── presentation/schemas/requests/       # Pydantic request models
            ├── presentation/schemas/responses/      # TokenPair, user data wrappers
            └── services/
                ├── auth_service.py        # Orchestrates the full auth flow
                ├── user_service.py        # DB CRUD for aihr.users + profiles
                ├── session_service.py     # aihr.user_sessions CRUD
                ├── token_service.py       # JWT encode/decode, TokenPair dataclass
                ├── email_code_service.py  # aihr.email_verifications + aihr.auth_email_codes
                ├── email_sender_service.py # SMTP email dispatch (asyncio.to_thread)
                └── password_service.py    # PBKDF2-SHA256 hash/verify
```

### Auth flow

1. **Register** → `POST /api/auth/register/{candidate|recruiter}` — hashes password, writes pending record to `aihr.email_verifications`, sends 6-digit code via email.
2. **Verify email** → `POST /api/auth/verify-email` — validates code (constant-time compare), inserts into `aihr.users` + profile table (`aihr.candidate_profiles` or `aihr.recruiter_profiles`), creates session row, returns JWT pair.
3. **Login** → `POST /api/auth/login` — authenticates, creates new session row, returns JWT pair.
4. **Protected requests** — `AuthMiddleware` checks `Authorization: Bearer <token>` against `aihr.user_sessions` (active, not revoked, not expired). Sets `request.state.user_id` and holds a live asyncpg connection in `request.state.db` for the duration of the request.
5. **Refresh** → `POST /api/auth/refresh` — decodes refresh token, locates active session, rotates both tokens in-place.
6. **Logout** → `POST /api/auth/logout` — marks session as inactive/revoked.

### Database conventions

- All tables live in the `aihr` PostgreSQL schema.
- Row-level security uses `SET my.current_user_id = '<id>'` on each connection before executing queries.
- The pool is initialized at startup via `lifespan`; services access it directly via `database.db_pool`.
- `get_db_conn(request)` extracts the connection placed by `AuthMiddleware` onto `request.state.db` — use this in protected routes.

### Error responses

`EDSServiceException` produces a trilingual JSON body (`ru`/`kz`/`en`) and is handled globally with HTTP 401. The controller maps specific `exc.code` values to other status codes (409, 410, 503, etc.) via `_raise_registration_error`.

### Public vs protected routes

`AuthMiddleware` skips auth for paths listed in `EXCLUDE_PATHS` (`/`, `/docs`, `/openapi.json`, `/redoc`, `/health`) and `PUBLIC_PREFIXES` (all `/api/auth/register/*`, `/api/auth/login`, `/api/auth/refresh`, etc.). Everything else requires a valid session.

---

## Django Backend (`untitled folder/`)

### Running locally

```bash
cd "untitled folder"
source .venv/bin/activate      # separate venv with Django deps
cp .env.example .env           # set DATABASE_URL, DJANGO_SECRET_KEY, JWT_SECRET
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Docker

```bash
cd "untitled folder"
cp .env.example .env           # set DATABASE_URL to postgresql://postgres:postgres@db:5432/app
docker compose up --build
```

### Django endpoints

- `GET /health`
- `POST /auth/register`, `POST /auth/login`
- `GET /users/me`
- `POST /screening/rank` — multipart: `job_description` text + `resumes` files; runs TF-IDF + cosine similarity ML screening
- Static HTML pages served from the project root (`/landing.html`, `/upload-resumes.html`, etc.)

### Django apps

- `accounts` — custom User model, JWT (SimpleJWT), CompanyInfo
- `jobs` — Job and JobApplication models
- `screening` — ML resume ranking (scikit-learn TF-IDF + cosine similarity, pypdf/python-docx parsing)
