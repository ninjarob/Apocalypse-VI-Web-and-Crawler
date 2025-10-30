# Start all services for development
# Run this after configuration is complete

Write-Host "=== Starting Apocalypse VI MUD Crawler ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will start all services in separate windows..." -ForegroundColor Yellow
Write-Host ""

# Check if .env files exist
$missingEnv = @()

if (!(Test-Path "backend\.env")) {
    $missingEnv += "backend\.env"
}

if (!(Test-Path "crawler\.env")) {
    $missingEnv += "crawler\.env"
}

if ($missingEnv.Count -gt 0) {
    Write-Host "⚠ Missing configuration files:" -ForegroundColor Red
    foreach ($file in $missingEnv) {
        Write-Host "  - $file" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please copy .env.example files and configure them first!" -ForegroundColor Yellow
    Write-Host "See SETUP.md for instructions." -ForegroundColor Yellow
    exit 1
}

# Start Backend
Write-Host "Starting Backend API..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; npm run dev"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev"

# Wait a bit for frontend to start
Start-Sleep -Seconds 3

# Start Crawler
Write-Host "Starting Crawler..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\crawler'; npm run dev"

Write-Host ""
Write-Host "=== All Services Started! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Services running in separate windows:" -ForegroundColor Cyan
Write-Host "  • Backend API:  http://localhost:3001" -ForegroundColor White
Write-Host "  • Frontend:     http://localhost:3000" -ForegroundColor White
Write-Host "  • Crawler:      Exploring the MUD..." -ForegroundColor White
Write-Host ""
Write-Host "Open your browser to: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop: Close the terminal windows or press Ctrl+C in each" -ForegroundColor Gray
