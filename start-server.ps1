# ============================================================
#  start-server.ps1 – Sales Reporting Dashboard server
# ============================================================
param([int]$Port = 8080, [switch]$NetworkOnly)

while (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    $Port++
}

$url = "http://localhost:$Port"
$netUrl = "http://$([System.Net.Dns]::GetHostName()):$Port"

Write-Host ""
Write-Host "  =============================================" -ForegroundColor Cyan
Write-Host "   Sales Reporting Dashboard" -ForegroundColor White
Write-Host "  =============================================" -ForegroundColor Cyan
Write-Host ""

$projectPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
$pythonExe = if (Test-Path $projectPython) { $projectPython } elseif (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { $null }

if (-not $pythonExe) {
    Write-Host "  ERROR: Python not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Install Python : https://python.org/downloads" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "  Runtime : Python + Flask + SQLite" -ForegroundColor Green
Write-Host "  Local   : $url" -ForegroundColor Yellow
Write-Host "  Network : $netUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Installing/validating Python dependencies..." -ForegroundColor Gray
& $pythonExe -m pip install -r (Join-Path $PSScriptRoot "requirements.txt")
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  ERROR: Failed to install dependencies." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""
Start-Job { Start-Sleep 1; Start-Process $using:url } | Out-Null
Set-Location $PSScriptRoot
& $pythonExe ".\main.py" --port $Port
