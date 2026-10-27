# Ephemeral CI host only: executes the REAL Node startup under LocalService.
# Media tools here are version-only fixtures; no camera/video/network test is claimed.
$ErrorActionPreference = 'Stop'
$runtime = Join-Path $env:ProgramFiles 'INFRO\RuntimeTest'
$state = Join-Path $env:ProgramData 'INFRO\Live\State'
$location = Join-Path $env:ProgramFiles 'INFRO\Live Connector'
$originalPath = [Environment]::GetEnvironmentVariable('PATH', 'Machine')
New-Item -ItemType Directory -Force $runtime | Out-Null
Copy-Item (Get-Command node.exe).Source (Join-Path $runtime 'node.exe')
$fixture = Join-Path $runtime 'VersionFixture.cs'
'class VersionFixture { static void Main() { System.Console.WriteLine("version-only CI media fixture"); } }' | Set-Content $fixture -Encoding UTF8
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $csc /nologo /target:exe "/out:$runtime\ffmpeg.exe" $fixture
if ($LASTEXITCODE -ne 0) { throw 'Media fixture compile failed' }
Copy-Item (Join-Path $runtime 'ffmpeg.exe') (Join-Path $runtime 'ffprobe.exe')
$tokenFile = Join-Path $state 'connector.json'
if (Test-Path $tokenFile) { throw 'Runtime test refuses existing pairing state' }
[IO.File]::WriteAllText($tokenFile, '{"origin":"https://ir.sa","token":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}', (New-Object Text.UTF8Encoding($false)))
$diagnostic = Join-Path $state 'service-status.json'
Remove-Item $diagnostic -Force -ErrorAction SilentlyContinue
try {
 [Environment]::SetEnvironmentVariable('PATH', "$runtime;$originalPath", 'Machine')
 $prepare = Start-Process (Join-Path $location 'INFROConnectorService.exe') -ArgumentList '--prepare-runtime' -Wait -PassThru
 if ($prepare.ExitCode -ne 0) { throw 'Preparing real runtime paths failed' }
 $arguments = 'create InfroLiveConnector binPath= "\"' + (Join-Path $location 'INFROConnectorService.exe') + '\" --service-runtime-check" start= demand obj= "NT AUTHORITY\LocalService"'
 $registration = New-Object Diagnostics.Process
 $registration.StartInfo.FileName = Join-Path $env:WINDIR 'System32\sc.exe'
 $registration.StartInfo.Arguments = $arguments
 $registration.StartInfo.UseShellExecute = $false
 [void]$registration.Start()
 $registration.WaitForExit()
 if ($registration.ExitCode -ne 0) { throw 'Runtime service registration failed' }
 $registration.Dispose()
 & sc.exe start InfroLiveConnector
 $watch = [Diagnostics.Stopwatch]::StartNew()
 $code = ''
 while ($watch.Elapsed.TotalSeconds -lt 25) {
  if (Test-Path $diagnostic) { try { $code = (Get-Content $diagnostic -Raw | ConvertFrom-Json).code } catch {} }
  if ($code -eq 'OK' -or ($code -and $code -notin @('STARTING','NODE_STARTED'))) { break }
  Start-Sleep -Milliseconds 200
 }
 if ($code -ne 'OK') { throw "Actual LocalService Node startup failed: $code" }
 Write-Output 'PASS: real Node validated dependencies and saved pairing under LocalService; no external request made.'
} finally {
 & sc.exe stop InfroLiveConnector
 & sc.exe delete InfroLiveConnector
 [Environment]::SetEnvironmentVariable('PATH', $originalPath, 'Machine')
 Remove-Item $tokenFile -Force -ErrorAction SilentlyContinue
 Remove-Item (Join-Path $state "runtime.json") -Force -ErrorAction SilentlyContinue
 Remove-Item $runtime -Recurse -Force -ErrorAction SilentlyContinue
}
