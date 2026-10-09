$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$astraNodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($astraNodeCommand) {
    $astraNodePath = $astraNodeCommand.Source
} else {
    $astraNodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}
if (-not (Test-Path -LiteralPath $astraNodePath)) {
    throw 'Node.js 24+ is required. Install Node.js, then run pnpm install.'
}
$astraVitePath = Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js'
if (-not (Test-Path -LiteralPath $astraVitePath)) {
    throw 'Project dependencies are missing. Run pnpm install --frozen-lockfile first.'
}
Write-Host 'Astra galaxy: http://127.0.0.1:5173/spatial/'
Write-Host 'Simple interface: http://127.0.0.1:5173/today'
Write-Host 'Local demo only. Press Ctrl+C to stop.'
& $astraNodePath $astraVitePath --host 127.0.0.1 --port 5173 --strictPort
