# Build and run CIP Dashboard with Model 1 API

## Development
npm run dev
cd dataset/models && python api_server.py

## Production (Docker)
docker-compose up --build

## Services:
- Frontend: http://localhost:5000
- Backend API: http://localhost:5001
- ML API (Model 1): http://localhost:5002

## Health Checks:
- Backend: http://localhost:5001/api/health
- ML API: http://localhost:5002/health
