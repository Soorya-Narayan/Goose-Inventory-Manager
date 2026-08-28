# CIP Dashboard - Docker Deployment Script (Windows)

Write-Host "=========================================="
Write-Host "CIP Dashboard - Docker Deployment"
Write-Host "=========================================="
Write-Host ""

# Check if Docker is running
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again."
    exit 1
}

Write-Host "✓ Docker is running" -ForegroundColor Green
Write-Host ""

# Stop existing containers
Write-Host "Stopping existing containers..."
docker-compose down
Write-Host ""

# Build images
Write-Host "Building Docker images..."
Write-Host "This may take a few minutes..."
docker-compose build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ Build successful!" -ForegroundColor Green
Write-Host ""

# Start services
Write-Host "Starting services..."
docker-compose up -d

Write-Host ""
Write-Host "=========================================="
Write-Host "Services Status"
Write-Host "=========================================="
docker-compose ps
Write-Host ""

# Wait for services
Write-Host "Waiting for services to be healthy..."
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "=========================================="
Write-Host "Access Dashboard"
Write-Host "=========================================="
Write-Host "Frontend:  http://localhost:5000"
Write-Host "Backend:   http://localhost:5001"
Write-Host "ML API:    http://localhost:5002"
Write-Host ""
Write-Host "Health Checks:"
Write-Host "Backend:   http://localhost:5001/api/health"
Write-Host "ML API:    http://localhost:5002/health"
Write-Host ""
Write-Host "=========================================="
Write-Host "Logs: docker-compose logs -f"
Write-Host "Stop: docker-compose down"
Write-Host "=========================================="
