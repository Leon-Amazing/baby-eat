param(
  [string]$OutputDirectory = "unpackage/dist/dev/mp-weixin"
)

$source = Join-Path $PSScriptRoot "../cloudfunctions"
$compiledProject = Join-Path -Path (Get-Location) -ChildPath $OutputDirectory
$destination = Join-Path -Path $compiledProject -ChildPath "cloudfunctions"

if (-not (Test-Path -LiteralPath $source)) {
  throw "Cloud function source directory not found: $source"
}

New-Item -ItemType Directory -Force -Path $destination | Out-Null
Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $destination -Recurse -Force
Write-Output "Cloud functions copied to: $destination"
