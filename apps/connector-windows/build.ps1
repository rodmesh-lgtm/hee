param([switch]$Signed)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
New-Item -ItemType Directory -Force build, dist | Out-Null
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $csc /nologo /target:winexe /platform:x64 /codepage:65001 /win32manifest:app.manifest /out:build\INFROConnector.exe /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.ServiceProcess.dll /reference:System.Net.Http.dll /reference:System.Web.Extensions.dll /reference:System.Xml.dll InfroConnector.cs
if ($LASTEXITCODE -ne 0) { throw 'Windows compilation failed' }
& $csc /nologo /target:winexe /platform:x64 /codepage:65001 /win32manifest:service.manifest /out:build\INFROConnectorService.exe /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.ServiceProcess.dll /reference:System.Net.Http.dll /reference:System.Web.Extensions.dll /reference:System.Xml.dll InfroConnector.cs
if ($LASTEXITCODE -ne 0) { throw 'Windows service compilation failed' }
Copy-Item ..\web\public\connectors\infro-live-connector.mjs build\infro-live-connector.mjs -Force
$p = Start-Process build\INFROConnectorService.exe -ArgumentList '--self-test' -Wait -PassThru
if ($p.ExitCode -ne 0) { throw "Discovery security checks failed: $($p.ExitCode)" }
$iscc = Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'
if (!(Test-Path $iscc)) { throw 'Install Inno Setup 6 from its official distribution before packaging' }
if ($Signed) {
  # Production signing is supplied by the release operator's certificate/HSM tooling.
  # Never create a self-signed certificate or embed a private signing key in this repository.
  if (!(Get-Command 'infro-sign.cmd' -ErrorAction SilentlyContinue)) { throw 'INFRO signing command unavailable' }
  & infro-sign.cmd (Resolve-Path build\INFROConnectorService.exe)
  if ($LASTEXITCODE -ne 0 -or (Get-AuthenticodeSignature build\INFROConnectorService.exe).Status -ne 'Valid') { throw 'Service signature invalid' }
  & infro-sign.cmd (Resolve-Path build\INFROConnector.exe)
  if ($LASTEXITCODE -ne 0 -or (Get-AuthenticodeSignature build\INFROConnector.exe).Status -ne 'Valid') { throw 'App signature invalid' }
  & $iscc /DReleaseSigned '/Sinfro=infro-sign.cmd $f' installer.iss
} else { & $iscc installer.iss }
if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed' }
if ($Signed -and (Get-AuthenticodeSignature dist\INFRO-Connector-Setup.exe).Status -ne 'Valid') { throw 'Installer signature invalid' }
Get-FileHash dist\*.exe -Algorithm SHA256 | Format-List | Out-File dist\SHA256SUMS.txt -Encoding utf8
