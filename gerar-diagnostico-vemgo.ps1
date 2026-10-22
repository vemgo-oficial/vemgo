# VemGO - Gerador de diagnóstico local
# Gera somente codigo-projeto.txt e estrutura-projeto.txt.
# NÃO conecta ao Supabase, NÃO exporta schema e NÃO altera o banco remoto.

$ErrorActionPreference = 'Stop'

# Usa a pasta atual como raiz do projeto. Execute dentro de C:\VemGO\vemgo.
$root = (Get-Location).Path.TrimEnd('\','/')

if (-not (Test-Path (Join-Path $root 'package.json'))) {
    Write-Host "ERRO: package.json não encontrado em: $root" -ForegroundColor Red
    Write-Host 'Abra o PowerShell na pasta raiz do projeto VemGO e execute o script novamente.' -ForegroundColor Yellow
    exit 1
}

function Write-Utf8NoBom {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content
    )
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

$excludedDirectories = @(
    'node_modules', '.next', '.git', '.vercel', 'coverage', 'dist', 'build',
    '.turbo', '.cache', 'out'
)
$excludedFiles = @(
    'codigo-projeto.txt', 'estrutura-projeto.txt', 'supabase-schema.sql',
    'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb',
    '.env', '.env.local', '.env.development', '.env.production', '.env.test'
)
$includedExtensions = @(
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.scss',
    '.sass', '.html', '.md', '.mdx', '.txt', '.sql', '.prisma', '.yml',
    '.yaml', '.toml', '.xml', '.sh', '.ps1'
)

Write-Host "Raiz do projeto: $root" -ForegroundColor Cyan
Write-Host 'Localizando arquivos (ignorando dependências, build e segredos)...' -ForegroundColor Cyan

$allFiles = Get-ChildItem -LiteralPath $root -Recurse -File -Force | Where-Object {
    $file = $_
    $relative = $file.FullName.Substring($root.Length).TrimStart('\','/')
    $parts = $relative -split '[\\/]'
    $hasExcludedDirectory = $false
    foreach ($part in $parts) {
        if ($excludedDirectories -contains $part) { $hasExcludedDirectory = $true; break }
    }
    $isSecretFile = ($file.Name -match '^\.env($|\.)') -or ($file.Name -match '\.(pem|key|p12|pfx)$')
    (-not $hasExcludedDirectory) -and (-not $isSecretFile) -and ($excludedFiles -notcontains $file.Name)
}

# 1) Estrutura atual
$structureLines = @(
    'VemGO - ESTRUTURA ATUAL DO PROJETO',
    "Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    "Raiz: $root",
    'Nota: diretórios de dependências/build e arquivos secretos foram omitidos.',
    ''
)
foreach ($file in ($allFiles | Sort-Object FullName)) {
    $relative = $file.FullName.Substring($root.Length).TrimStart('\','/')
    $structureLines += $relative
}
Write-Utf8NoBom -Path (Join-Path $root 'estrutura-projeto.txt') -Content ($structureLines -join "`r`n")

# 2) Código-fonte e configurações para diagnóstico
$sourceFiles = $allFiles | Where-Object {
    $includedExtensions -contains $_.Extension.ToLowerInvariant() -and
    $_.Name -ne 'gerar-diagnostico-vemgo.ps1'
} | Sort-Object FullName

$builder = New-Object System.Text.StringBuilder
[void]$builder.AppendLine('VemGO - CÓDIGO-FONTE E CONFIGURAÇÕES PARA DIAGNÓSTICO')
[void]$builder.AppendLine("Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$builder.AppendLine("Raiz: $root")
[void]$builder.AppendLine('Nota: arquivos .env, chaves privadas, dependências, build e arquivos de lock foram omitidos.')
[void]$builder.AppendLine('Este arquivo pode conter código interno. Revise antes de compartilhar publicamente.')

foreach ($file in $sourceFiles) {
    $relative = $file.FullName.Substring($root.Length).TrimStart('\','/')
    [void]$builder.AppendLine('')
    [void]$builder.AppendLine(('=' * 100))
    [void]$builder.AppendLine("ARQUIVO: $relative")
    [void]$builder.AppendLine(('=' * 100))
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        [void]$builder.AppendLine($content)
    } catch {
        [void]$builder.AppendLine("[Não foi possível ler este arquivo: $($_.Exception.Message)]")
    }
}
Write-Utf8NoBom -Path (Join-Path $root 'codigo-projeto.txt') -Content $builder.ToString()

Write-Host ''
Write-Host 'Diagnóstico gerado com sucesso:' -ForegroundColor Green
Write-Host (Join-Path $root 'estrutura-projeto.txt')
Write-Host (Join-Path $root 'codigo-projeto.txt')
Write-Host 'Nenhum comando Supabase foi executado e o banco remoto não foi alterado.' -ForegroundColor Green
