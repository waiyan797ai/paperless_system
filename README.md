# 29 — Office Management & Paperless System

A modern enterprise-grade office management platform with paperless workflows, department communication, document distribution, and real-time notifications.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Laravel 11, Sanctum, Reverb (WebSocket) |
| Frontend | React 19, Vite, Tailwind CSS v4 |
| Database | PostgreSQL (SQLite supported for local dev) |
| API | REST with role-based access control |

## Project Structure

```
management/
├── backend/          # Laravel 11 API
├── frontend/         # React + Vite SPA
└── README.md
```

## Features

- **Authentication** — Login, forgot password, change password, profile management
- **Organization** — Departments & sections with hierarchy
- **User Management** — Super Admin, Admin, Department Head, Approver, Employee roles
- **Policy Management** — Upload, view, search, and download PDF policies
- **Request Forms** — Leave, Travel, Purchase, General requests with approval workflow
- **Inter-Department Requests** — Cross-department communication with attachments
- **Document Distribution** — Send documents to departments with read/acknowledge tracking
- **Notifications** — Real-time alerts via Laravel Reverb
- **Dashboards** — Role-specific dashboards with analytics
- **Audit Logs** — Full activity tracking
- **Reports** — Request, department, approval, and user activity reports

## Quick Start

### Prerequisites

- PHP 8.2+
- Composer
- Node.js 18+
- PostgreSQL 14+ (or SQLite for local development)

### Backend Setup

```bash
cd backend
cp .env.example .env
php artisan key:generate

# PostgreSQL (production)
# Set DB_CONNECTION=pgsql and configure DB_* variables in .env

# SQLite (local development)
touch database/database.sqlite
# Set DB_CONNECTION=sqlite in .env

php artisan migrate --seed
./serve.sh
```

> **File uploads:** Always start the backend with `./serve.sh` (not plain `php artisan serve`). Default PHP allows only 2 MB uploads.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Demo Accounts

| Email | Role | Password |
|-------|------|----------|
| admin@29.com | Admin | password |
| hr.head@29.com | Department Head | password |
| approver@29.com | Approver | password |
| employee1@29.com | Employee | password |

## API Endpoints

Base URL: `http://localhost:8000/api/v1`

### Authentication
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/profile`
- `PUT /auth/profile`
- `POST /auth/change-password`
- `POST /auth/forgot-password`

### Resources
- `/departments`, `/sections`, `/users`
- `/policies`, `/form-requests`, `/inter-requests`
- `/documents`, `/notifications`, `/audit-logs`
- `/dashboard`, `/reports/*`

All protected routes require `Authorization: Bearer {token}` header.

## Design System

- **Primary:** Dark Blue (`#0A1628`, `#1E3A5F`)
- **Secondary:** Gold (`#C9A227`, `#D4AF37`)
- **Effects:** Glassmorphism, smooth animations
- **Modes:** Dark & Light theme toggle

## Real-Time Notifications (Reverb)

```bash
# In backend directory
php artisan reverb:start
```

Configure `REVERB_*` variables in `.env` and connect the frontend via Laravel Echo.

## File Storage

Documents and attachments are stored locally by default. Configure S3 in `.env`:

```
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=...
AWS_BUCKET=...
```

## License

Proprietary — 29 Office Management System
