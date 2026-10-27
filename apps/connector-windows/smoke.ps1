$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$installer = Resolve-Path dist\INFRO-Connector-Setup-internal.exe
$process = Start-Process $installer -ArgumentList '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-' -PassThru -Wait
if ($process.ExitCode -ne 0) { throw 'Silent internal installation failed' }
$location = Join-Path $env:ProgramFiles 'INFRO\Live Connector'
try {
  $process = Start-Process (Join-Path $location 'INFROConnectorService.exe') -ArgumentList '--service-control-test' -PassThru -Wait
  if ($process.ExitCode -ne 0) { throw "LocalService/SCM/job smoke failed: $($process.ExitCode)" }
  & (Join-Path $PSScriptRoot "runtime-smoke.ps1")
} finally {
  $uninstaller = Join-Path $location 'unins000.exe'
  if (Test-Path $uninstaller) {
    $process = Start-Process $uninstaller -ArgumentList '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART' -PassThru -Wait
    if ($process.ExitCode -ne 0) { throw 'Uninstall failed' }
  }
}
if (Get-Service InfroLiveConnector -ErrorAction SilentlyContinue) { throw 'Service still registered after uninstall' }
