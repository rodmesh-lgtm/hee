# Ephemeral CI host only: executes the REAL Node startup under LocalService.
# Uses hash-verified real FFmpeg/FFprobe. No camera or remote API is contacted.
$ErrorActionPreference = 'Stop'
$runtime = Join-Path $env:ProgramFiles 'INFRO\RuntimeTest'
$state = Join-Path $env:ProgramData 'INFRO\Live\State'
$location = Join-Path $env:ProgramFiles 'INFRO\Live Connector'
$originalPath = [Environment]::GetEnvironmentVariable('PATH', 'Machine')
New-Item -ItemType Directory -Force $runtime | Out-Null
Copy-Item (Get-Command node.exe).Source (Join-Path $runtime 'node.exe')
# Exact archive/hash from Microsoft's Gyan.FFmpeg 8.1.2 WinGet manifest.
$archive = Join-Path $env:RUNNER_TEMP 'infro-ffmpeg-runtime.zip'
Invoke-WebRequest 'https://github.com/GyanD/codexffmpeg/releases/download/8.1.2/ffmpeg-8.1.2-full_build.zip' -OutFile $archive -UseBasicParsing
if ((Get-FileHash $archive -Algorithm SHA256).Hash -ne 'B8CDEFAB5F50590A076C27C2B56B0294A0E6154FADED28BA1BA05EBC4F801F57') { throw 'FFmpeg archive hash mismatch' }
Expand-Archive $archive (Join-Path $env:RUNNER_TEMP 'infro-ffmpeg-runtime')
Copy-Item (Join-Path $env:RUNNER_TEMP 'infro-ffmpeg-runtime\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe') $runtime
Copy-Item (Join-Path $env:RUNNER_TEMP 'infro-ffmpeg-runtime\ffmpeg-8.1.2-full_build\bin\ffprobe.exe') $runtime
# Reproduce customer WinGet ACLs: admin can stage files, LocalService cannot
# read the vendor directory. The installed connector must repair this itself.
$vendorAcl = New-Object Security.AccessControl.DirectorySecurity
$vendorAcl.SetAccessRuleProtection($true, $false)
foreach ($sidValue in @('S-1-5-32-544','S-1-5-18')) {
 $sid = New-Object Security.Principal.SecurityIdentifier($sidValue)
 $rule = New-Object Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
 $vendorAcl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $runtime -AclObject $vendorAcl
$tokenFile = Join-Path $state 'connector.json'
if (Test-Path $tokenFile) { throw 'Runtime test refuses existing pairing state' }
[IO.File]::WriteAllText($tokenFile, '{"origin":"https://ir.sa","token":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}', (New-Object Text.UTF8Encoding($false)))
$diagnostic = Join-Path $state 'service-status.json'
Remove-Item $diagnostic -Force -ErrorAction SilentlyContinue
try {
 [Environment]::SetEnvironmentVariable('PATH', "$runtime;$originalPath", 'Machine')
 $prepare = Start-Process (Join-Path $location 'INFROConnectorService.exe') -ArgumentList '--prepare-runtime' -Wait -PassThru
 if ($prepare.ExitCode -ne 0) { throw 'Preparing real runtime paths failed' }
 $saved = Get-Content (Join-Path $state 'runtime.json') -Raw | ConvertFrom-Json
 foreach ($name in @('node','ffmpeg','ffprobe')) {
  if ($saved.$name -ne (Join-Path $location "Runtime\$name.exe")) { throw "Runtime not staged: $name" }
 }
 # Starting again must preserve usable staged paths rather than reverting to WinGet.
 $prepare = Start-Process (Join-Path $location 'INFROConnectorService.exe') -ArgumentList '--prepare-runtime' -Wait -PassThru
 if ($prepare.ExitCode -ne 0) { throw 'Second runtime preparation failed' }
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
 Write-Output 'PASS: restricted vendor runtime staged automatically; real Node/FFmpeg/FFprobe validated under LocalService after repeat preparation; no external request made.'
} finally {
 & sc.exe stop InfroLiveConnector
 & sc.exe delete InfroLiveConnector
 [Environment]::SetEnvironmentVariable('PATH', $originalPath, 'Machine')
 Remove-Item $tokenFile -Force -ErrorAction SilentlyContinue
 Remove-Item (Join-Path $state "runtime.json") -Force -ErrorAction SilentlyContinue
 Remove-Item $runtime -Recurse -Force -ErrorAction SilentlyContinue
}
