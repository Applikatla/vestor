# Inventory Tokenization Platform Startup Script
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Starting Institutional Inventory Tokenization Platform" -ForegroundColor Cyan
Write-Host "Target Chain: Whitechain Sepolia (Chain ID: 1874)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Blockchain Adapter (Port 8081)
Write-Host "`n[1/3] Starting Blockchain Adapter on port 8081..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd adapter; npm start"

# 2. Start Go Backend (Port 8080)
Write-Host "`n[2/3] Starting Go Business Backend on port 8080..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\bin\server.exe"

# 3. Start Next.js Frontend (Port 3000)
Write-Host "`n[3/3] Starting Next.js Web Portal on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"

Write-Host "`nAll platform services launched successfully!" -ForegroundColor Green
Write-Host "Open your browser at: http://localhost:3000" -ForegroundColor Cyan
