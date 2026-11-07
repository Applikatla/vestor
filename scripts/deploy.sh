#!/usr/bin/env bash
# ==============================================================================
# Vestor Deployment Script (Follows CI/CD Architecture Flow)
# ==============================================================================
set -euo pipefail

PROJECT_DIR="${1:-$HOME/vestor}"
echo "=========================================================="
echo "Starting Vestor Deployment on $(hostname)"
echo "Directory: $PROJECT_DIR"
echo "=========================================================="

cd "$PROJECT_DIR"

# 1. Pull latest code
echo -e "\n[1/4] Pulling latest code from origin/main..."
git fetch origin main
git reset --hard origin/main

# 2. Backend deployment (Go)
echo -e "\n[2/4] Deploying Backend (Go)..."
cd "$PROJECT_DIR/backend"
echo " -> Downloading Go modules..."
go mod download

echo " -> Building Go server binary..."
mkdir -p bin
go build -o bin/server cmd/server/main.go

echo " -> Restarting Backend service..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart vestor-backend || pm2 start bin/server --name "vestor-backend"
elif systemctl is-active --quiet vestor-backend; then
    sudo systemctl restart vestor-backend
else
    pkill -f "bin/server" || true
    nohup ./bin/server > "$PROJECT_DIR/backend/server.log" 2>&1 &
fi

# 3. Frontend deployment (Next.js)
echo -e "\n[3/4] Deploying Frontend (Next.js)..."
cd "$PROJECT_DIR/frontend"
echo " -> Installing dependencies (npm ci)..."
npm ci

echo " -> Building Next.js production bundle..."
npm run build

echo " -> Restarting Frontend service..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart vestor-frontend || pm2 start npm --name "vestor-frontend" -- start -- -p 3000
elif systemctl is-active --quiet vestor-frontend; then
    sudo systemctl restart vestor-frontend
else
    pkill -f "next-server" || true
    nohup npm start > "$PROJECT_DIR/frontend/frontend.log" 2>&1 &
fi

# 4. Health checks
echo -e "\n[4/4] Performing Health Checks..."
sleep 4

echo " -> Testing Backend endpoint (http://localhost:8080/health)..."
if curl -s -f http://localhost:8080/health >/dev/null; then
    echo "    ✓ Backend is healthy!"
else
    echo "    ✗ Backend health check failed!"
    exit 1
fi

echo " -> Testing Frontend endpoint (http://localhost:3000)..."
if curl -s -f http://localhost:3000 >/dev/null; then
    echo "    ✓ Frontend is healthy!"
else
    echo "    ✗ Frontend health check failed!"
    exit 1
fi

echo -e "\n=========================================================="
echo "✓ Deployment successfully completed!"
echo "=========================================================="

