#define AppVersion "0.2.0"
[Setup]
AppId={{C26DC1A6-72F0-42EF-94F2-D029952C637A}
AppName=INFRO Live Connector
AppVersion={#AppVersion}
AppPublisher=INFRO
AppPublisherURL=https://ir.sa
DefaultDirName={autopf}\INFRO\Live Connector
DefaultGroupName=INFRO
DisableDirPage=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763
OutputDir=dist
OutputBaseFilename=INFRO-Connector-Setup-internal
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\INFROConnector.exe
CloseApplications=yes
SetupMutex=INFROConnectorSetup
#ifdef ReleaseSigned
SignTool=infro
SignedUninstaller=yes
OutputBaseFilename=INFRO-Connector-Setup
#endif
[Languages]
Name: "arabic"; MessagesFile: "compiler:Languages\Arabic.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"
[Files]
Source: "build\INFROConnector.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\INFROConnectorService.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\infro-live-connector.mjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
[Icons]
Name: "{group}\INFRO Connector"; Filename: "{app}\INFROConnector.exe"
Name: "{autodesktop}\INFRO Connector"; Filename: "{app}\INFROConnector.exe"
[Run]
Filename: "{app}\INFROConnector.exe"; Description: "Open INFRO camera setup"; Flags: postinstall nowait skipifsilent
[UninstallRun]
Filename: "{app}\INFROConnector.exe"; Parameters: "--stop-service"; Flags: runhidden waituntilterminated; RunOnceId: "StopInfro"
Filename: "{sys}\sc.exe"; Parameters: "delete InfroLiveConnector"; Flags: runhidden waituntilterminated; RunOnceId: "DeleteInfro"
[Code]
function PrepareToInstall(var NeedsRestart: Boolean): String;
var Code: Integer;
begin
  Result := '';
  if FileExists(ExpandConstant('{app}\INFROConnector.exe')) then
    if not Exec(ExpandConstant('{app}\INFROConnector.exe'), '--stop-service', '', SW_HIDE, ewWaitUntilTerminated, Code) or (Code <> 0) then
      Result := 'Cannot stop INFRO service. Stop it before upgrading.';
end;
