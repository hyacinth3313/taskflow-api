#  TaskFlow API

> Scalable REST API with JWT Authentication, Role-Based Access Control, and a polished frontend UI — built for the PrimeTrade Backend Developer Intern assignment.

[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.18-blue)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-ready-blue)](https://docker.com)
[![API Docs](https://img.shields.io/badge/Docs-Swagger-orange)](http://localhost:3001/api-docs)

---

##  Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Authentication Flow](#-authentication-flow)
- [Role-Based Access](#-role-based-access-control)
- [Database Schema](#-database-schema)
- [Security](#-security)
- [Scalability](#-scalability)
- [Docker Deployment](#-docker-deployment)

---

## ✅ Features

### Backend
-  **JWT Authentication** — Access tokens (7d) + Refresh tokens (30d), stored hashed in DB
-  **Role-Based Access Control** — `user` and `admin` roles with route-level enforcement
-  **Task CRUD** — Full Create / Read / Update / Delete with filtering, sorting, and pagination
-  **Advanced Querying** — Filter by status/priority, search by title/description, sort by any field
-  **Dashboard Stats** — Per-user and global analytics endpoints
-  **Input Validation** — express-validator with descriptive error messages
-  **Rate Limiting** — Global (100 req/15min) + strict auth (10 req/15min)
-  **Swagger UI** — Interactive API docs at `/api-docs`
-  **Winston Logging** — Structured logs with file rotation
-  **Graceful Shutdown** — DB pool cleanup on SIGTERM/SIGINT
-  **Docker Ready** — Multi-stage Dockerfile + Docker Compose

### Frontend
-  **Single-Page App** — Vanilla JS, zero dependencies, dark theme
-  **Auth flows** — Login + Register with validation feedback
-  **Task Manager** — Create, edit, delete, filter, search, and quick-toggle status
-  **Admin Panel** — User management (toggle active, change role, view stats)
-  **Pagination** — Server-side pagination on tasks and users
-  **Keyboard shortcuts** — `N` to create task, `Esc` to close modal

---

##  Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Runtime    | Node.js 20 (LTS)                   |
| Framework  | Express 4.18                       |
| Database   | PostgreSQL 16                      |
| Auth       | JWT (jsonwebtoken) + bcryptjs      |
| Validation | express-validator                  |
| Security   | helmet, cors, express-rate-limit   |
| Docs       | swagger-jsdoc + swagger-ui-express |
| Logging    | Winston                            |
| Frontend   | Vanilla JS / HTML / CSS            |
| Container  | Docker + Docker Compose            |
| Cache      | Redis (optional, pre-wired)        |

---

##  Project Structure

```
taskflow-api/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js       # PG pool + transaction helper
│   │   │   ├── schema.sql        # Full DB schema with indexes
│   │   │   └── swagger.js        # OpenAPI 3.0 spec
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── task.controller.js
│   │   │   └── user.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js     # JWT verify + RBAC
│   │   │   ├── error.middleware.js    # Global error handler
│   │   │   └── validate.middleware.js
│   │   ├── models/
│   │   │   ├── user.model.js
│   │   │   └── task.model.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── task.routes.js
│   │   │   ├── admin.routes.js
│   │   │   └── health.routes.js
│   │   ├── validators/
│   │   │   ├── auth.validator.js
│   │   │   └── task.validator.js
│   │   ├── utils/
│   │   │   ├── jwt.js
│   │   │   ├── logger.js
│   │   │   └── response.js
│   │   ├── app.js             # Express setup
│   │   └── server.js          # Entry point
│   ├── logs/                  # Auto-created
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── frontend/
│   └── index.html             # Full SPA
├── docs/
│   └── SCALABILITY.md
├── docker-compose.yml
├── nginx.conf
└── README.md
```

---

##  Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- npm or yarn

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/taskflow-api.git
cd taskflow-api/backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secrets
```

### 3. Set Up Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE taskflow_db;"

# Run schema migration
psql -U postgres -d taskflow_db -f src/config/schema.sql
```

### 4. Start the API

```bash
npm run dev      # Development (hot-reload)
npm start        # Production
```

### 5. Open the Frontend

Open `frontend/index.html` in your browser, or serve it:
```bash
npx serve ../frontend -p 3000
```

### 6. View API Docs

Visit **http://localhost:3001/api-docs** for the interactive Swagger UI.

---

##  API Documentation

### Base URL
```
http://localhost:3001/api/v1
```

### Endpoints Overview

####  Auth (`/auth`)
| Method | Path              | Auth | Description                     |
|--------|-------------------|------|---------------------------------|
| POST   | `/auth/register`  | —    | Register new user               |
| POST   | `/auth/login`     | —    | Login, get token pair           |
| POST   | `/auth/refresh`   | —    | Refresh access token            |
| POST   | `/auth/logout`    | ✓    | Logout & revoke refresh token   |
| GET    | `/auth/me`        | ✓    | Get current user profile        |

####  Tasks (`/tasks`)
| Method | Path              | Auth | Description                     |
|--------|-------------------|------|---------------------------------|
| GET    | `/tasks`          | ✓    | List tasks (paginated, filtered)|
| POST   | `/tasks`          | ✓    | Create task                     |
| GET    | `/tasks/stats`    | ✓    | Get task statistics             |
| GET    | `/tasks/:id`      | ✓    | Get single task                 |
| PATCH  | `/tasks/:id`      | ✓    | Update task (partial)           |
| DELETE | `/tasks/:id`      | ✓    | Delete task                     |

####  Admin (`/admin`) — Role: admin only
| Method | Path                       | Description           |
|--------|----------------------------|-----------------------|
| GET    | `/admin/stats`             | Global system stats   |
| GET    | `/admin/users`             | List all users        |
| GET    | `/admin/users/:id`         | Get user detail       |
| PATCH  | `/admin/users/:id/toggle`  | Enable/disable user   |
| PATCH  | `/admin/users/:id/role`    | Change user role      |
| GET    | `/admin/tasks`             | All tasks (all users) |

####  Health
| Method | Path             | Description          |
|--------|------------------|----------------------|
| GET    | `/health`        | DB + uptime check    |

### Query Parameters (GET /tasks)

| Param      | Type    | Description                              |
|------------|---------|------------------------------------------|
| `page`     | integer | Page number (default: 1)                 |
| `limit`    | integer | Items per page (default: 10, max: 100)   |
| `status`   | string  | `todo` \| `in_progress` \| `done`        |
| `priority` | string  | `low` \| `medium` \| `high`             |
| `search`   | string  | Full-text search on title + description  |
| `sortBy`   | string  | `created_at`, `due_date`, `priority`, etc|
| `sortOrder`| string  | `asc` \| `desc`                          |

### Response Format

All responses follow a consistent structure:

```json
{
  "success": true,
  "message": "Tasks retrieved",
  "data": [...],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### HTTP Status Codes

| Code | Meaning                  |
|------|--------------------------|
| 200  | OK                       |
| 201  | Created                  |
| 400  | Bad Request / Validation |
| 401  | Unauthorized             |
| 403  | Forbidden (RBAC)         |
| 404  | Not Found                |
| 409  | Conflict (duplicate)     |
| 429  | Too Many Requests        |
| 500  | Internal Server Error    |

---

##  Authentication Flow

```
Client                      Server
  │                            │
  ├──POST /auth/login ────────►│  Verify credentials
  │                            │  Hash comparison (bcrypt)
  │◄── accessToken (7d) ───────┤
  │◄── refreshToken (30d) ─────┤  Stored hashed in DB
  │                            │
  ├──GET /tasks ──────────────►│  Bearer accessToken
  │  Authorization: Bearer ... │  Verify JWT signature
  │◄── 200 tasks ──────────────┤
  │                            │
  ├──POST /auth/refresh ──────►│  refreshToken in body
  │                            │  Verify DB hash
  │◄── new accessToken ────────┤
  │◄── new refreshToken ───────┤  Rotation on every refresh
  │                            │
  ├──POST /auth/logout ────────►│ Clear DB refresh token
  │◄── 200 ────────────────────┤
```

---

##  Role-Based Access Control

| Feature                    | `user` | `admin` |
|----------------------------|--------|---------|
| Register / Login           | ✓      | ✓       |
| View/edit own tasks        | ✓      | ✓       |
| View/edit any task         | ✗      | ✓       |
| View own stats             | ✓      | ✓       |
| Global stats               | ✗      | ✓       |
| List all users             | ✗      | ✓       |
| Enable/disable users       | ✗      | ✓       |
| Change user roles          | ✗      | ✓       |

---

##  Database Schema

```sql
users
├── id           UUID (PK)
├── name         VARCHAR(100)
├── email        VARCHAR(255) UNIQUE
├── password_hash VARCHAR(255)
├── role         VARCHAR(20)  CHECK (user | admin)
├── is_active    BOOLEAN
├── refresh_token TEXT (hashed)
├── last_login   TIMESTAMPTZ
├── created_at   TIMESTAMPTZ
└── updated_at   TIMESTAMPTZ

tasks
├── id           UUID (PK)
├── title        VARCHAR(200)
├── description  TEXT
├── status       VARCHAR(20)  CHECK (todo | in_progress | done)
├── priority     VARCHAR(10)  CHECK (low | medium | high)
├── due_date     DATE
├── user_id      UUID (FK → users.id, CASCADE DELETE)
├── tags         TEXT[]
├── created_at   TIMESTAMPTZ
└── updated_at   TIMESTAMPTZ

audit_logs
├── id         UUID (PK)
├── user_id    UUID (FK → users.id)
├── action     VARCHAR(50)
├── entity     VARCHAR(50)
├── entity_id  UUID
├── ip_address INET
└── created_at TIMESTAMPTZ
```

Indexes on: `users.email`, `users.role`, `tasks.user_id`, `tasks.status`, `tasks.priority`, `tasks.due_date`.

Auto-update `updated_at` via PostgreSQL triggers.

---

##  Security

| Practice                    | Implementation                        |
|-----------------------------|---------------------------------------|
| Password hashing            | bcrypt (12 salt rounds)               |
| JWT signing                 | HS256, issuer+audience claims         |
| Refresh token storage       | Hashed with bcrypt in DB              |
| Token rotation              | New refresh token on every refresh    |
| HTTP headers                | helmet (CSP, HSTS, X-Frame, etc.)     |
| Rate limiting               | Global + strict auth-specific limits  |
| Input validation            | express-validator on all endpoints    |
| SQL injection prevention    | Parameterized queries (pg library)    |
| Body size limit             | 10kb max request body                 |
| CORS                        | Configured per environment            |
| Non-root Docker user        | Runs as `nodeuser` (UID 1001)        |

---

##  Docker Deployment

### Using Docker Compose (recommended)

```bash
# Copy and configure environment
cp backend/.env.example .env

# Start all services (API + PostgreSQL + Redis + Nginx)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down
```

Services started:
- `postgres` → port 5432
- `redis`    → port 6379
- `api`      → port 3001
- `frontend` → port 3000 (via Nginx)

### Manual Docker Build

```bash
cd backend
docker build -t taskflow-api .
docker run -p 3001:3001 --env-file .env taskflow-api
```

---

##  Running Tests

```bash
cd backend
npm test
```

Tests cover auth endpoints (register, login, refresh, logout) and task CRUD.
