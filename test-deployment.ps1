Write-Host "====================================" -ForegroundColor Cyan
Write-Host "CIP Dashboard Deployment Test" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker not found!" -ForegroundColor Red
    exit 1
}

try {
    docker ps | Out-Null
    Write-Host "Docker is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker not running! Start Docker Desktop" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Checking files..." -ForegroundColor Yellow
$files = @("docker-compose.yml", "Dockerfile", "backend\Dockerfile", "nginx.conf", "docker-entrypoint.sh")
$missing = @()
foreach ($f in $files) {
    if (Test-Path $f) {
        Write-Host "  Found: $f" -ForegroundColor Green
    } else {
        Write-Host "  MISSING: $f" -ForegroundColor Red
        $missing += $f
    }
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "ERROR: $($missing.Count) files are missing!" -ForegroundColor Red
    Write-Host "Create these files before continuing." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Stopping old containers..." -ForegroundColor Yellow
docker-compose down -v 2>$null

Write-Host "Building Docker images (this takes 5-10 minutes)..." -ForegroundColor Yellow
docker-compose build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Starting services..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "Waiting 30 seconds for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "Checking services..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "http://localhost:8080/api/check_session" -UseBasicParsing -TimeoutSec 5 | Out-Null
    Write-Host "  Backend: OK (port 8080)" -ForegroundColor Green
} catch {
    Write-Host "  Backend: NOT RESPONDING" -ForegroundColor Red
}

try {
    Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing -TimeoutSec 5 | Out-Null
    Write-Host "  Frontend: OK (port 80)" -ForegroundColor Green
} catch {
    Write-Host "  Frontend: NOT RESPONDING" -ForegroundColor Red
}

Write-Host ""
Write-Host "Container Status:" -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Open in browser: http://localhost" -ForegroundColor Green
Write-Host "Login: admin / password" -ForegroundColor Yellow
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor White
Write-Host "  docker-compose logs -f" -ForegroundColor Cyan
Write-Host "  docker-compose down" -ForegroundColor Cyan
Write-Host ""
