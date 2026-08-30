Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting suv++ Agent Servers..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "[1/2] Starting Backend API (Port 4000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

Write-Host "[2/2] Starting Frontend App (Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host ""
Write-Host "Servers are launching in separate terminal windows!" -ForegroundColor Yellow
Write-Host "Open your browser at: http://localhost:3000" -ForegroundColor Cyan
