#!/bin/bash

# CIP Dashboard - Docker Build and Run Script

echo "=========================================="
echo "CIP Dashboard - Docker Deployment"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down
echo ""

# Build images
echo "Building Docker images..."
echo "This may take a few minutes..."
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "✓ Build successful!"
echo ""

# Start services
echo "Starting services..."
docker-compose up -d

echo ""
echo "=========================================="
echo "Services Status"
echo "=========================================="
docker-compose ps
echo ""

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 10

echo ""
echo "=========================================="
echo "Access Dashboard"
echo "=========================================="
echo "Frontend:  http://localhost:5000"
echo "Backend:   http://localhost:5001"
echo "ML API:    http://localhost:5002"
echo ""
echo "Health Checks:"
echo "Backend:   http://localhost:5001/api/health"
echo "ML API:    http://localhost:5002/health"
echo ""
echo "=========================================="
echo "Logs: docker-compose logs -f"
echo "Stop: docker-compose down"
echo "=========================================="
