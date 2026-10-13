$nodeCommand = Get-Command node -CommandType Application -ErrorAction SilentlyContinue

if ($nodeCommand) {
    $nodePath = $nodeCommand.Source
} else {
    $nodePath = 'C:\Users\Restore\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}

if (-not (Test-Path -LiteralPath $nodePath -PathType Leaf)) {
    Write-Error 'Node.js não foi encontrado no PATH nem no runtime bundled.'
    exit 1
}

Set-Location -LiteralPath $PSScriptRoot
& $nodePath 'server.mjs'
exit $LASTEXITCODE
