# Padisaar CRM — database setup (PowerShell)
# Run from project root: .\scripts\setup-database.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "==> Starting PostgreSQL (Docker)..." -ForegroundColor Cyan
Set-Location $Root
docker compose up -d

Write-Host "==> Waiting for database..." -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i - 30; $i++) {
    $status = docker inspect padisaar-postgres --format "{{.State.Health.Status}}" 2>$null
    if ($status -eq "healthy") { $ready = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ready) {
    Write-Host "Database container not healthy yet. Check: docker compose logs db" -ForegroundColor Yellow
}

Set-Location "$Root\backend"

if (-not (Test-Path ".env")) {
    Write-Host "==> Creating .env from .env.example..." -ForegroundColor Cyan
    Copy-Item ".env.example" ".env"
}

if (-not (Test-Path "venv\Scripts\alembic.exe")) {
    Write-Host "ERROR: Backend venv not found. Run:" -ForegroundColor Red
    Write-Host "  cd backend; python -m venv venv; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt"
    exit 1
}

Write-Host "==> Running migrations..." -ForegroundColor Cyan
.\venv\Scripts\alembic upgrade head

Write-Host "==> Seeding sample data..." -ForegroundColor Cyan
.\venv\Scripts\python seed.py

Write-Host "==> Resetting demo passwords..." -ForegroundColor Cyan
.\venv\Scripts\python reset_passwords.py

Write-Host ""
Write-Host "Database ready." -ForegroundColor Green
Write-Host "  Host:     localhost:5434"
Write-Host "  Database: padisaar_crm"
Write-Host "  User:     postgres / postgres"
Write-Host ""
Write-Host "Login users:"
Write-Host "  admin@padisaar.com / admin123  (Manager)"
Write-Host "  expert@padisaar.com / expert123 (Expert)"
