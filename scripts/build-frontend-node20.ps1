$ErrorActionPreference = "Stop"
$nodeUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip"
$tempDir = Join-Path $env:TEMP "node20-portable"
$zipFile = Join-Path $tempDir "node20.zip"
$nodeDir = Join-Path $tempDir "node-v20.18.0-win-x64"
$nodeExe = Join-Path $nodeDir "node.exe"

if (-not (Test-Path $nodeExe)) {
    if (-not (Test-Path $tempDir)) { New-Item -ItemType Directory -Path $tempDir -Force | Out-Null }
    Write-Host "📥 Node 20 휴대용 바이너리 다운로드 중..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $nodeUrl -OutFile $zipFile
    Write-Host "📂 압축 해제 중..." -ForegroundColor Cyan
    Expand-Archive -Path $zipFile -DestinationPath $tempDir -Force
}

Write-Host "🔨 Node 20으로 frontend 빌드 실행 중..." -ForegroundColor Green
$frontendDir = (Resolve-Path (Join-Path $PSScriptRoot "..\frontend")).Path
$viteCli = Join-Path $frontendDir "node_modules\vite\bin\vite.js"

$oldPath = $env:PATH
$env:PATH = "$nodeDir;$env:PATH"

Push-Location $frontendDir
try {
    & $nodeExe $viteCli build
    Write-Host "✅ frontend 빌드 완료!" -ForegroundColor Green
} finally {
    $env:PATH = $oldPath
    Pop-Location
}
