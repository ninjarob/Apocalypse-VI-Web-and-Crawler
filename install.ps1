# Quick Start Script for Windows PowerShell
# Run this to install all dependencies

Write-Host "=== Apocalypse VI MUD Crawler - Installation ===" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✓ npm found: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Write-Host ""

# Root
Write-Host "[1/4] Installing root dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "Failed!" -ForegroundColor Red; exit 1 }

# Crawler
Write-Host "[2/4] Installing crawler dependencies..." -ForegroundColor Cyan
Set-Location crawler
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "Failed!" -ForegroundColor Red; exit 1 }
Set-Location ..

# Backend
Write-Host "[3/4] Installing backend dependencies..." -ForegroundColor Cyan
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "Failed!" -ForegroundColor Red; exit 1 }
Set-Location ..

# Frontend
Write-Host "[4/4] Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "Failed!" -ForegroundColor Red; exit 1 }
Set-Location ..

Write-Host ""
Write-Host "=== Installation Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Install Ollama from https://ollama.ai/"
Write-Host "   Then run: ollama pull llama3.2:3b"
Write-Host ""
Write-Host "2. Copy .env.example files and configure:"
Write-Host "   - crawler/.env (MUD credentials)"
Write-Host "   - backend/.env (optional - SQLite auto-created)"
Write-Host ""
Write-Host "3. Open 3 terminals and run:"
Write-Host "   Terminal 1: cd backend && npm run dev"
Write-Host "   Terminal 2: cd frontend && npm run dev"
Write-Host "   Terminal 3: cd crawler && npm run build && npm start"
Write-Host ""
Write-Host "4. Open browser to http://localhost:5173"
Write-Host ""
Write-Host "See SETUP.md for detailed instructions!" -ForegroundColor Cyan
