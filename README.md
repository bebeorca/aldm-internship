git clone <repo>

cd SURAT

copy .env.example backend/.env

docker compose up --build

docker compose exec backend php artisan key:generate

docker compose exec backend php artisan migrate
