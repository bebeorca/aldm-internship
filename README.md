# SURAT

Sistem Penyuratan berbasis web yang digunakan untuk mengelola proses pembuatan, pengajuan, dan pengarsipan surat secara digital.

---

## Tech Stack

### Frontend

* React
* Vite

### Backend

* Laravel 12
* PHP 8.3

### Database

* MySQL 8

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

* Docker Desktop
* Git

No additional installation such as PHP, Composer, Node.js, MySQL, or XAMPP is required.

---

## Getting Started

### 1. Clone Repository

```bash
git clone <repository-url>
cd SURAT
```

### 2. Configure Environment

Create a Laravel environment file:

```bash
copy backend/.env.example backend/.env
```

Configure the database inside `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=app
DB_USERNAME=root
DB_PASSWORD=root
```

### 3. Build and Run Containers

```bash
docker compose up --build
```

Or run in detached mode:

```bash
docker compose up --build -d
```

---

## Laravel Setup

Generate application key:

```bash
docker compose exec backend php artisan key:generate
```

Run database migrations:

```bash
docker compose exec backend php artisan migrate
```

Run seeders:

```bash
docker compose exec backend php artisan db:seed
```

---

## Access Application

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:8000 |
| Database | localhost:3306        |

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

### Rebuild Containers

```bash
docker compose up --build
```

### Access Backend Container

```bash
docker compose exec backend sh
```

### Laravel Commands

```bash
docker compose exec backend php artisan migrate

docker compose exec backend php artisan migrate:fresh

docker compose exec backend php artisan optimize:clear
```

---

## Development Workflow

1. Pull the latest changes:

```bash
git pull
```

2. Start containers:

```bash
docker compose up -d
```

3. Develop features normally.

4. Commit changes:

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

If only application code changes:

```bash
git pull
```

---

## Contributors

* Development Team
* Project Supervisor
* Stakeholders

---

## License

This project is intended for academic and internal development purposes.
