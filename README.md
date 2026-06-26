# SURAT

Web-based correspondence management system for creating, submitting, managing, and archiving digital documents efficiently.

---

## Tech Stack

### Frontend

* React
* Vite

### Backend

* Laravel 12
* PHP 8.3

### Database

* PostgreSQL 17

### Database Management

* pgAdmin 4

### DevOps

* Docker
* Docker Compose

---

## Project Structure

```text
SURAT/
│
├── frontend/
│   └── React Application
│
├── backend/
│   └── Laravel Application
│
├── docker-compose.yml
│
└── README.md
```

---

## Requirements

Make sure the following tools are installed:

* Docker Desktop / Docker Engine
* Docker Compose
* Git

No need to install PHP, Composer, Node.js, PostgreSQL, or other local dependencies manually.

---

## Getting Started

### 1. Clone Repository

```bash
git clone <repository-url>
cd SURAT
```

---

### 2. Configure Environment

Create Laravel environment file:

```bash
cp backend/.env.example backend/.env
```

Configure PostgreSQL connection inside `backend/.env`

```env
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=app
DB_USERNAME=postgres
DB_PASSWORD=postgres123
```

Recommended local development configuration:

```env
SESSION_DRIVER=file
QUEUE_CONNECTION=sync
CACHE_STORE=file
```

---

### 3. Build and Run Containers

Build project containers:

```bash
docker compose up --build
```

Run in detached mode:

```bash
docker compose up --build -d
```

---

## Laravel Setup

### Generate Application Key

```bash
docker compose exec backend php artisan key:generate
```

### Run Database Migration

```bash
docker compose exec backend php artisan migrate
```

### Run Seeder (Optional)

```bash
docker compose exec backend php artisan db:seed
```

---

## Available Services

| Service    | URL                   |
| ---------- | --------------------- |
| Frontend   | http://localhost:3000 |
| Backend    | http://localhost:8000 |
| PostgreSQL | localhost:5432        |
| pgAdmin    | http://localhost:8080 |

---

## pgAdmin Login

Default login credentials:

```text
Email: admin@local.com
Password: admin123
```

To connect PostgreSQL server inside pgAdmin:

```text
Host: postgres
Port: 5432
Username: postgres
Password: postgres123
Database: app
```

---

## Useful Commands

### Start Containers

```bash
docker compose up -d
```

### Stop Containers

```bash
docker compose down
```

### Remove Containers + Volumes

```bash
docker compose down -v
```

### Rebuild Containers

```bash
docker compose up --build
```

---

## Container Access

### Backend Container

```bash
docker compose exec backend sh
```

### Frontend Container

```bash
docker compose exec frontend sh
```

---

## Laravel Commands

Run migration:

```bash
docker compose exec backend php artisan migrate
```

Fresh migration:

```bash
docker compose exec backend php artisan migrate:fresh
```

Clear cache:

```bash
docker compose exec backend php artisan optimize:clear
```

Check Laravel info:

```bash
docker compose exec backend php artisan about
```

---

## Development Workflow

Pull latest changes:

```bash
git pull
```

Start containers:

```bash
docker compose up -d
```

Develop features normally.

Commit changes:

```bash
git add .
git commit -m "feat: add new feature"
git push
```

---

## Team Collaboration

If Docker configuration changes:

```bash
git pull
docker compose up --build
```

If only source code changes:

```bash
git pull
docker compose up -d
```

If database schema changes:

```bash
docker compose exec backend php artisan migrate
```

---

## Contributors

* Development Team
* Project Supervisor
* Stakeholders

---

## License

This project is intended for academic and internal development purposes.
