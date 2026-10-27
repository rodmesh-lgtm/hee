using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using System.ServiceProcess;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using System.Xml;

namespace Infro.Live {
  static class Paths {
    internal const string ServiceName = "InfroLiveConnector";
    internal static void ServiceStatus(string state,string code) {
      try { File.WriteAllText(Path.Combine(State,"service-status.json"),Json.Serialize(new {state=state,code=Regex.IsMatch(code??"","^[A-Z0-9_]{1,80}$")?code:"SERVICE_ERROR",updatedAt=DateTime.UtcNow.ToString("o")}),new UTF8Encoding(false)); }catch{}
    }
    internal static string FailureCode(Exception error) {
      var win32=error as System.ComponentModel.Win32Exception??error.InnerException as System.ComponentModel.Win32Exception;
      if(win32!=null)return "WIN32_"+win32.NativeErrorCode;
      return Regex.IsMatch(error.Message??"","^[A-Z0-9_]{1,80}$")?error.Message:"SERVICE_ERROR";
    }
    internal static string PairingError(int status) {
      switch(status) {
        case 410:return "انتهى رمز الاقتران أو استُخدم. أنشئ رمزًا جديدًا من الفرع نفسه. [HTTP410]";
        case 400:return "رمز الاقتران غير صالح. انسخ الرمز كاملًا من صفحة إعداد الكاميرات. [HTTP400]";
        case 429:return "وصلت المحاولات للحد المسموح. انتظر عشر دقائق قبل إنشاء رمز جديد والمحاولة. [HTTP429]";
        case 503:return "خدمة الاقتران غير متاحة حاليًا. شارك هذا الرمز مع الدعم. [HTTP503]";
        default:return "لم ينجح الاقتران. شارك رقم الاستجابة مع دعم INFRO: HTTP"+status;
      }
    }
    internal static readonly string Root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "INFRO", "Live");
    internal static readonly string State = Path.Combine(Root, "State");
    internal static readonly string App = AppDomain.CurrentDomain.BaseDirectory;
    internal static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 65536 };
    internal static string Quote(string s) { return "\"" + s.Replace("\"", "") + "\""; }
    internal static void Protect() {
      foreach (string path in new[] {Path.GetDirectoryName(Root), Root, State}) {
        Directory.CreateDirectory(path);
        if((File.GetAttributes(path) & FileAttributes.ReparsePoint)!=0)throw new InvalidOperationException("UNSAFE_STATE_DIRECTORY");
        var acl = new DirectorySecurity(); acl.SetOwner(new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid,null)); acl.SetAccessRuleProtection(true, false);
        foreach(var sid in new[] {WellKnownSidType.BuiltinAdministratorsSid, WellKnownSidType.LocalSystemSid, WellKnownSidType.LocalServiceSid})
          acl.AddAccessRule(new FileSystemAccessRule(new SecurityIdentifier(sid, null), FileSystemRights.FullControl, InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow));
        Directory.SetAccessControl(path, acl);
      }
    }
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]
    static extern uint GetFinalPathNameByHandle(Microsoft.Win32.SafeHandles.SafeFileHandle handle,StringBuilder path,uint length,uint flags);
    internal static string ResolveMachineBinary(string path) {
      using(var file=File.Open(path,FileMode.Open,FileAccess.Read,FileShare.ReadWrite|FileShare.Delete)) {
        var buffer=new StringBuilder(32768);uint length=GetFinalPathNameByHandle(file.SafeFileHandle,buffer,(uint)buffer.Capacity,0);
        if(length==0||length>=buffer.Capacity)throw new InvalidOperationException("RUNTIME_PATH_RESOLUTION_FAILED");
        string actual=buffer.ToString();if(actual.StartsWith("\\\\?\\",StringComparison.Ordinal))actual=actual.Substring(4);
        string pf=Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        if(!actual.StartsWith(pf+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("UNSAFE_MACHINE_RUNTIME");
        return actual;
      }
    }
    internal static string NormalizePairingCode(string value) {
      return Regex.Replace(value??"", @"[\s\u200e\u200f\u202a-\u202e\u2066-\u2069]", "");
    }
    internal static void SavePairing(string token,string directory) {
      if(!Regex.IsMatch(token??"","^[A-Za-z0-9_-]{43}$"))throw new InvalidOperationException("INVALID_ENROLLMENT");
      string pending=Path.Combine(directory,"connector.pending"),saved=Path.Combine(directory,"connector.json");
      File.WriteAllText(pending,Json.Serialize(new {origin="https://ir.sa",token=token}),new UTF8Encoding(false));
      if(File.Exists(saved))File.Replace(pending,saved,null);else File.Move(pending,saved);
      string status=Path.Combine(directory,"status.json");if(File.Exists(status))File.Delete(status);
    }
    internal static string StatusValue() {
      try { var data=Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(Path.Combine(State,"status.json")));return Convert.ToString(data["state"]); }catch{return "";}
    }
    internal static string StageBinary(string source,string name,string target) {
      string destination=Path.Combine(target,name+".exe");
      if(File.Exists(destination)&&(File.GetAttributes(destination)&FileAttributes.ReparsePoint)!=0)throw new InvalidOperationException("UNSAFE_RUNTIME_FILE");
      if(!String.Equals(source,destination,StringComparison.OrdinalIgnoreCase)) {
        string pending=destination+".pending";
        if(File.Exists(pending))File.Delete(pending);
        try {
          File.Copy(source,pending,false);
          using(var hash=SHA256.Create())using(var input=File.OpenRead(source))using(var output=File.OpenRead(pending)) {
            if(!hash.ComputeHash(input).SequenceEqual(hash.ComputeHash(output)))throw new InvalidOperationException("RUNTIME_COPY_FAILED");
          }
          if(File.Exists(destination))File.Replace(pending,destination,null);else File.Move(pending,destination);
        }finally{if(File.Exists(pending))File.Delete(pending);}
      }
      var acl=new FileSecurity();acl.SetOwner(new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid,null));acl.SetAccessRuleProtection(true,false);
      foreach(var sid in new[]{WellKnownSidType.BuiltinAdministratorsSid,WellKnownSidType.LocalSystemSid})acl.AddAccessRule(new FileSystemAccessRule(new SecurityIdentifier(sid,null),FileSystemRights.FullControl,AccessControlType.Allow));
      acl.AddAccessRule(new FileSystemAccessRule(new SecurityIdentifier(WellKnownSidType.LocalServiceSid,null),FileSystemRights.ReadAndExecute,AccessControlType.Allow));
      File.SetAccessControl(destination,acl);
      return destination;
    }
    internal static void PrepareRuntime() {
      Protect();StopService();string node=Binary("node"),ffmpeg=Binary("ffmpeg"),ffprobe=Binary("ffprobe");
      if(Path.GetDirectoryName(ffmpeg)!=Path.GetDirectoryName(ffprobe))throw new InvalidOperationException("MEDIA_RUNTIME_DIRECTORY_MISMATCH");
      // Vendor WinGet package folders can deny LocalService access. Stage verified copies
      // in our fixed Program Files directory; the service receives read/execute only.
      string target=Path.Combine(App,"Runtime"),pf=Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
      if(!Path.GetFullPath(App).StartsWith(pf+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("INSTALL_IN_PROGRAM_FILES");
      Directory.CreateDirectory(target);
      if((File.GetAttributes(target)&FileAttributes.ReparsePoint)!=0)throw new InvalidOperationException("UNSAFE_RUNTIME_DIRECTORY");
      var acl=new DirectorySecurity();acl.SetOwner(new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid,null));acl.SetAccessRuleProtection(true,false);
      foreach(var sid in new[]{WellKnownSidType.BuiltinAdministratorsSid,WellKnownSidType.LocalSystemSid})
        acl.AddAccessRule(new FileSystemAccessRule(new SecurityIdentifier(sid,null),FileSystemRights.FullControl,InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit,PropagationFlags.None,AccessControlType.Allow));
      acl.AddAccessRule(new FileSystemAccessRule(new SecurityIdentifier(WellKnownSidType.LocalServiceSid,null),FileSystemRights.ReadAndExecute,InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit,PropagationFlags.None,AccessControlType.Allow));
      Directory.SetAccessControl(target,acl);
      node=StageBinary(node,"node",target);ffmpeg=StageBinary(ffmpeg,"ffmpeg",target);ffprobe=StageBinary(ffprobe,"ffprobe",target);
      if(Run(node,"--version")!=0||Run(ffmpeg,"-version")!=0||Run(ffprobe,"-version")!=0)throw new InvalidOperationException("RUNTIME_VALIDATION_FAILED");
      string path=Path.Combine(State,"runtime.json"),pending=path+".pending";
      File.WriteAllText(pending,Json.Serialize(new {node=node,ffmpeg=ffmpeg,ffprobe=ffprobe}),new UTF8Encoding(false));
      if(File.Exists(path))File.Replace(pending,path,null);else File.Move(pending,path);
    }
    internal static string ServiceBinary(string name) {
      var data=Json.Deserialize<Dictionary<string,string>>(File.ReadAllText(Path.Combine(State,"runtime.json")));
      string value=data[name],pf=Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
      if(!Path.IsPathRooted(value)||!Path.GetFullPath(value).StartsWith(pf+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase)||!String.Equals(Path.GetFileName(value),name+".exe",StringComparison.OrdinalIgnoreCase)||!File.Exists(value))throw new InvalidOperationException("INVALID_SAVED_RUNTIME");
      return value;
    }
    // Resolve portable aliases once as the installer, then persist actual machine paths.
    // Service executes only machine-wide installations, never a user's PATH/current directory.
    internal static string Binary(string name) {
      string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
      var dirs = new List<string> { Path.Combine(pf,"nodejs"), Path.Combine(pf,"WinGet","Links"), Path.Combine(App,"Runtime") };
      string machine = Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.Machine) ?? "";
      dirs.AddRange(machine.Split(';'));
      foreach(string raw in dirs) {
        if(String.IsNullOrWhiteSpace(raw)) continue;
        string directory = Path.GetFullPath(Environment.ExpandEnvironmentVariables(raw.Trim().Trim('"')));
        if(!directory.StartsWith(pf + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) continue;
        string file = Path.Combine(directory, name + ".exe");
        if(File.Exists(file)) return ResolveMachineBinary(file);
      }
      throw new InvalidOperationException("MISSING_" + name.ToUpperInvariant());
    }
    internal static int Run(string exe, string args) {
      using(var process = Process.Start(new ProcessStartInfo(exe, args) { UseShellExecute=false, CreateNoWindow=true })) {
        if(!process.WaitForExit(30000)) { process.Kill(); throw new System.TimeoutException(); }
        return process.ExitCode;
      }
    }
    internal static void StopService() {
      using(var service = new ServiceController(ServiceName)) {
        try { if(service.Status != ServiceControllerStatus.Stopped) { service.Stop(); service.WaitForStatus(ServiceControllerStatus.Stopped, TimeSpan.FromSeconds(25)); } }
        catch(InvalidOperationException) { /* Not installed yet. */ }
      }
    }
    internal static void InstallService(bool smoke=false) {
      string pf=Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
      if(!Path.GetFullPath(App).StartsWith(pf+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("INSTALL_IN_PROGRAM_FILES");
      string sc = Path.Combine(Environment.SystemDirectory,"sc.exe");
      // Stop before any credential/config replacement. Service identity has no administrative rights.
      using(var service = new ServiceController(ServiceName)) {
        bool exists; try { var status=service.Status; exists=true; } catch(InvalidOperationException) { exists=false; }
        // sc.exe receives a quoted executable path; all arguments are platform constants.
        string arguments = (exists ? "config " : "create ") + ServiceName + " binPath= \"\\\"" + Path.Combine(App,"INFROConnectorService.exe") + "\\\" " + (smoke?"--service-smoke":"--service") + "\" start= delayed-auto obj= \"NT AUTHORITY\\LocalService\" DisplayName= \"INFRO Live Connector\"";
        if(Run(sc,arguments)!=0) throw new InvalidOperationException("SERVICE_INSTALL_FAILED");
      }
      if(Run(sc,"failure " + ServiceName + " reset= 86400 actions= restart/15000/restart/30000/restart/60000")!=0) throw new InvalidOperationException("SERVICE_RECOVERY_FAILED");
      using(var service=new ServiceController(ServiceName)) { service.Start(); service.WaitForStatus(ServiceControllerStatus.Running,TimeSpan.FromSeconds(25)); }
    }
  }

  // Job object closes all descendants (Node/FFmpeg) if the service stops/crashes.
  sealed class ChildJob : IDisposable {
    IntPtr handle;
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] static extern IntPtr CreateJobObject(IntPtr security,string name);
    [DllImport("kernel32.dll")] static extern bool SetInformationJobObject(IntPtr job,int info,IntPtr data,uint length);
    [DllImport("kernel32.dll")] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    [StructLayout(LayoutKind.Sequential)] struct Basic { public long ProcessTime, JobTime; public uint Flags; public UIntPtr Min,Max; public uint Active; public UIntPtr Affinity; public uint Priority,Scheduling; }
    [StructLayout(LayoutKind.Sequential)] struct IO { public ulong ReadOp,WriteOp,OtherOp,ReadBytes,WriteBytes,OtherBytes; }
    [StructLayout(LayoutKind.Sequential)] struct Extended { public Basic Basic; public IO IO; public UIntPtr ProcessMemory,JobMemory,PeakProcess,PeakJob; }
    internal ChildJob() {
      handle=CreateJobObject(IntPtr.Zero,null); var limits=new Extended(); limits.Basic.Flags=0x2000;
      int size=Marshal.SizeOf(limits); IntPtr ptr=Marshal.AllocHGlobal(size);
      try { Marshal.StructureToPtr(limits,ptr,false); if(handle==IntPtr.Zero || !SetInformationJobObject(handle,9,ptr,(uint)size)) throw new InvalidOperationException("JOB_SETUP_FAILED"); }
      finally { Marshal.FreeHGlobal(ptr); }
    }
    internal void Add(Process process) { if(!AssignProcessToJobObject(handle,process.Handle)) { process.Kill(); throw new InvalidOperationException("JOB_ASSIGN_FAILED"); } }
    public void Dispose() { if(handle!=IntPtr.Zero) { CloseHandle(handle);handle=IntPtr.Zero; } }
  }

  sealed class ConnectorService : ServiceBase {
    Process child; ChildJob job; string startupCode; readonly bool startupCheck;
    internal ConnectorService(bool check=false) { startupCheck=check;ServiceName=Paths.ServiceName; CanStop=true; AutoLog=false; }
    protected override void OnStart(string[] args) {
      try {
      Paths.ServiceStatus("starting","STARTING");
      string node=Paths.ServiceBinary("node"),media=Path.GetDirectoryName(Paths.ServiceBinary("ffmpeg"));
      if(!File.Exists(Path.Combine(media,"ffprobe.exe")) || !File.Exists(Path.Combine(Paths.State,"connector.json"))) throw new InvalidOperationException("SETUP_REQUIRED");
      job=new ChildJob();
      child=new Process { StartInfo=new ProcessStartInfo(node, Paths.Quote(Path.Combine(Paths.App,"infro-live-connector.mjs")) + " --run --state-directory " + Paths.Quote(Paths.State) + " --ffmpeg-directory " + Paths.Quote(media)+(startupCheck?" --startup-check":"")) { UseShellExecute=false,CreateNoWindow=true,WorkingDirectory=Paths.App,RedirectStandardOutput=true,RedirectStandardError=true }, EnableRaisingEvents=false };
      // Drain output without persisting credentials or raw FFmpeg errors.
      child.OutputDataReceived+=(s,e)=>{}; child.ErrorDataReceived+=(s,e)=>{if(e.Data!=null&&Regex.IsMatch(e.Data,"^INFRO_STARTUP_[A-Z0-9_]{1,70}$"))startupCode=e.Data.Substring(14);};
      child.Exited+=(s,e)=> {var exited=child;if(exited!=null){try{exited.WaitForExit();Paths.ServiceStatus("runtime_exited",startupCode??("NODE_EXIT_"+exited.ExitCode));}catch{}Environment.Exit(1);} };
      child.Start(); job.Add(child); child.BeginOutputReadLine(); child.BeginErrorReadLine();
      Paths.ServiceStatus("running","NODE_STARTED");child.EnableRaisingEvents=true;
      }catch(Exception error){Paths.ServiceStatus("startup_failed",Paths.FailureCode(error));if(job!=null)job.Dispose();throw;}
    }
    protected override void OnStop() { var current=child; child=null; if(job!=null)job.Dispose(); if(current!=null)current.Dispose(); }
  }

  sealed class SmokeService : ServiceBase {
    ChildJob job; Process process;
    internal SmokeService() {ServiceName=Paths.ServiceName;AutoLog=false;}
    protected override void OnStart(string[] args) {
      job=new ChildJob();process=Process.Start(new ProcessStartInfo(Path.Combine(Environment.SystemDirectory,"cmd.exe"),"/c ping -t 127.0.0.1 >NUL") {UseShellExecute=false,CreateNoWindow=true});job.Add(process);
      File.WriteAllText(Path.Combine(Paths.Root,"smoke.pid"),process.Id.ToString());
    }
    protected override void OnStop() {if(job!=null)job.Dispose();if(process!=null)process.Dispose();}
  }

  static class Discovery {
    internal static bool Private(string host) {
      IPAddress ip; if(!IPAddress.TryParse(host,out ip)||ip.AddressFamily!=AddressFamily.InterNetwork||ip.ToString()!=host)return false;
      byte[] b=ip.GetAddressBytes(); return b[0]==10 || (b[0]==172&&b[1]>=16&&b[1]<=31) || (b[0]==192&&b[1]==168);
    }
    internal static string[] Parse(byte[] packet) {
      if(packet.Length>32768) return new string[0];
      var result=new HashSet<string>();
      using(var reader=XmlReader.Create(new MemoryStream(packet),new XmlReaderSettings { DtdProcessing=DtdProcessing.Prohibit,XmlResolver=null,MaxCharactersInDocument=32768 })) {
        var doc=new XmlDocument { XmlResolver=null }; doc.Load(reader);
        foreach(XmlNode node in doc.GetElementsByTagName("XAddrs","*")) foreach(string raw in node.InnerText.Split(new[]{' ','\r','\n','\t'},StringSplitOptions.RemoveEmptyEntries)) {
          Uri uri; if(Uri.TryCreate(raw,UriKind.Absolute,out uri)&&(uri.Scheme=="http"||uri.Scheme=="https")&&String.IsNullOrEmpty(uri.UserInfo)&&Private(uri.Host)) result.Add(uri.Host);
        }
      }
      return result.Take(64).ToArray();
    }
    internal static string[] Search() {
      var result=new HashSet<string>();
      var addresses=NetworkInterface.GetAllNetworkInterfaces().Where(n=>n.OperationalStatus==OperationalStatus.Up&&n.NetworkInterfaceType!=NetworkInterfaceType.Loopback)
        .SelectMany(n=>n.GetIPProperties().UnicastAddresses).Where(a=>Private(a.Address.ToString())).Select(a=>a.Address).Take(8).ToArray();
      Parallel.ForEach(addresses,address=> {
        using(var udp=new UdpClient(new IPEndPoint(address,0))) {
          udp.Client.ReceiveTimeout=500; udp.Ttl=1; udp.Client.SetSocketOption(SocketOptionLevel.IP,SocketOptionName.MulticastInterface,address.GetAddressBytes());
          string xml="<?xml version=\"1.0\"?><s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\" xmlns:a=\"http://schemas.xmlsoap.org/ws/2004/08/addressing\"><s:Header><a:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action><a:MessageID>uuid:"+Guid.NewGuid()+"</a:MessageID><a:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</a:To></s:Header><s:Body><d:Probe xmlns:d=\"http://schemas.xmlsoap.org/ws/2005/04/discovery\" xmlns:dn=\"http://www.onvif.org/ver10/network/wsdl\"><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></s:Body></s:Envelope>";
          byte[] probe=Encoding.UTF8.GetBytes(xml); udp.Send(probe,probe.Length,new IPEndPoint(IPAddress.Parse("239.255.255.250"),3702));
          var watch=Stopwatch.StartNew();int received=0;
          while(watch.ElapsedMilliseconds<4000&&received<128) { try { IPEndPoint remote=new IPEndPoint(IPAddress.Any,0);byte[] packet=udp.Receive(ref remote); received++; if(!Private(remote.Address.ToString()))continue; foreach(string host in Parse(packet))lock(result)result.Add(host); } catch(SocketException) {} catch(XmlException) {} }
        }
      });
      return result.OrderBy(x=>x,StringComparer.Ordinal).Take(64).ToArray();
    }
  }

  sealed class SetupForm : Form {
    readonly Label state=new Label(); readonly TextBox code=new TextBox(); readonly ListBox devices=new ListBox(); readonly Button pair=new Button();
    readonly System.Windows.Forms.Timer refresh=new System.Windows.Forms.Timer(); bool busy; DateTime holdUntil=DateTime.MinValue;
    internal SetupForm() {
      Text="INFRO 0.2.3 — ربط كاميرات الفرع"; Size=new Size(780,720); MinimumSize=Size; Font=new Font("Segoe UI",11); RightToLeft=RightToLeft.Yes; RightToLeftLayout=true; BackColor=Color.FromArgb(246,249,249);
      var layout=new FlowLayoutPanel { Dock=DockStyle.Fill,FlowDirection=FlowDirection.TopDown,WrapContents=false,AutoScroll=true,Padding=new Padding(24) }; Controls.Add(layout);
      AddLabel(layout,"INFRO | موصل الكاميرات",18);
      AddLabel(layout,"اربط هذا الكمبيوتر بفرعك مرة واحدة. إدارة الكاميرات وروابط العملاء تبقى داخل حسابك.",11);
      AddButton(layout,"١. تجهيز أدوات البث تلقائيًا",async()=> { await InstallTools(); });
      AddButton(layout,"٢. فتح حساب INFRO وإنشاء رمز ربط للفرع",()=>{ OpenAccount();return Task.CompletedTask; });
      AddLabel(layout,"٣. الصق رمز الاقتران المؤقت هنا (لا تدخل كلمة مرور الكاميرا)",11);
      code.Width=650;code.MaxLength=256;code.RightToLeft=RightToLeft.No;code.UseSystemPasswordChar=true;layout.Controls.Add(code);
      AddButton(layout,"لصق رمز الاقتران من الحافظة",()=>{code.Text=Paths.NormalizePairingCode(Clipboard.ContainsText()?Clipboard.GetText():"");state.Text=Regex.IsMatch(code.Text,"^[A-Za-z0-9_-]{43}$")?"الرمز مكتمل. اضغط ربط هذا الكمبيوتر وتشغيل الخدمة.":"الرمز غير مكتمل. انسخ رمز ربط الفرع من حساب INFRO، ثم اضغط لصق الرمز.";return Task.CompletedTask;});
      pair.Text="ربط هذا الكمبيوتر وتشغيل الخدمة";pair.Width=650;pair.Height=44;pair.Click+=async(s,e)=>await Work(async()=>await Pair());layout.Controls.Add(pair);
      state.Width=650;state.Height=80;layout.Controls.Add(state);
      AddButton(layout,"تشغيل الخدمة بعد اكتمال الاقتران",async()=>{if(!File.Exists(Path.Combine(Paths.State,"connector.json")))throw new InvalidOperationException("PAIRING_REQUIRED");state.Text="جارٍ تشغيل خدمة INFRO. قد يستغرق بدء الخدمة نصف دقيقة؛ يمكنك إبقاء النافذة مفتوحة.";await Task.Run(()=>{Paths.PrepareRuntime();Paths.InstallService();});await WaitForConnection();});
      AddButton(layout,"البحث عن أجهزة الكاميرات في شبكة الفرع",async()=> { devices.Items.Clear(); var hosts=await Task.Run(()=>Discovery.Search()); foreach(string host in hosts)devices.Items.Add(host); state.Text=hosts.Length==0?"لم تظهر أجهزة. يمكنك إضافة عنوان الجهاز يدويًا في INFRO؛ بعض الأجهزة لا تدعم الاكتشاف.":"حدد عنوان الجهاز ثم انسخه لإضافته في لوحة INFRO. الاكتشاف لا يعني تأكيد صلاحية البث."; });
      devices.Width=650;devices.Height=90;devices.RightToLeft=RightToLeft.No;layout.Controls.Add(devices);
      AddButton(layout,"نسخ عنوان الجهاز المحدد",()=>{if(devices.SelectedItem!=null)Clipboard.SetText(devices.SelectedItem.ToString());return Task.CompletedTask;});
      AddLabel(layout,"يجب بقاء الكمبيوتر مستيقظًا ومتصلًا بالشبكة. الخدمة تبدأ مع ويندوز حتى دون تسجيل الدخول.\nإيقاف الربط نهائيًا وإلغاء صلاحياته يتم من حساب INFRO.",10);
      refresh.Interval=5000;refresh.Tick+=(s,e)=>{if(!busy&&DateTime.UtcNow>holdUntil)RefreshStatus();};refresh.Start(); RefreshStatus();
    }
    void AddLabel(Control parent,string text,int size) { parent.Controls.Add(new Label { Text=text,Width=650,AutoSize=true,MaximumSize=new Size(650,0),Font=new Font("Segoe UI",size),Margin=new Padding(0,0,0,14) }); }
    void AddButton(Control parent,string text,Func<Task> action) { var button=new Button { Text=text,Width=650,Height=42,Margin=new Padding(0,0,0,12) };button.Click+=async(s,e)=>await Work(action);parent.Controls.Add(button); }
    async Task Work(Func<Task> action) { if(busy)return;busy=true;pair.Enabled=false;try {await action();}catch(Exception error) {
      switch(error.Message) {
        case "PAIRING_REQUIRED": state.Text="لم يُحفظ اقتران على هذا الكمبيوتر. أدخل رمز الفرع أولًا.";break;
        case "MISSING_NODE": state.Text="لم يُعثر على Node.js على مستوى الجهاز. اضغط تجهيز أدوات البث، وأكمل نافذة التثبيت.";break;
        case "MISSING_FFMPEG": case "MISSING_FFPROBE": state.Text="أدوات الفيديو غير مكتملة على مستوى الجهاز. اضغط تجهيز أدوات البث أو اطلب مساعدة الدعم.";break;
        case "INSTALL_IN_PROGRAM_FILES": state.Text="شغّل البرنامج المثبت من قائمة ابدأ. الخدمة تحتاج تثبيت البرنامج داخل Program Files.";break;
        default: state.Text="تعذر تشغيل الخطوة. شارك رمز التشخيص مع دعم INFRO: "+Paths.FailureCode(error)+". يمكنك مراجعة حالة InfroLiveConnector في خدمات Windows.";break;
      }
    }finally{busy=false;pair.Enabled=true;holdUntil=DateTime.UtcNow.AddSeconds(20);} }
    static void OpenAccount() { Process.Start(new ProcessStartInfo("https://hub.ir.sa/dashboard/live-view/setup") { UseShellExecute=true }); }
    async Task InstallTools() {
      state.Text="سيُفتح مدير حزم Windows لتثبيت Node.js وFFmpeg على مستوى الجهاز. راجع أي شروط أو موافقات تظهر في نوافذ التثبيت.";
      foreach(string id in new[]{"OpenJS.NodeJS.LTS","Gyan.FFmpeg"}) {
        // Known registry packages only. Never auto-accept package/source agreements.
        await Task.Run(()=> { using(var p=Process.Start(new ProcessStartInfo("winget.exe","install --exact --id "+id+" --source winget --scope machine") { UseShellExecute=true })) {p.WaitForExit();} });
      }
      string node=Paths.Binary("node"), ffmpeg=Paths.Binary("ffmpeg"),ffprobe=Paths.Binary("ffprobe");
      if(Path.GetDirectoryName(ffmpeg)!=Path.GetDirectoryName(ffprobe))throw new InvalidOperationException();
      state.Text="تم العثور على أدوات البث. افتح حسابك وأنشئ رمز اقتران ثم الصقه أعلاه.";
    }
    async Task Pair() {
      string value=Paths.NormalizePairingCode(code.Text);if(!Regex.IsMatch(value,"^[A-Za-z0-9_-]{43}$")) {state.Text="الصق رمز الاقتران كاملًا من حساب INFRO. الرمز صالح لعشر دقائق ويستخدم مرة واحدة.";return;}
      string node=Paths.Binary("node"),ffmpeg=Paths.Binary("ffmpeg"),ffprobe=Paths.Binary("ffprobe");
      if(Path.GetDirectoryName(ffmpeg)!=Path.GetDirectoryName(ffprobe)||Paths.Run(node,"--version")!=0||Paths.Run(ffmpeg,"-version")!=0||Paths.Run(ffprobe,"-version")!=0)throw new InvalidOperationException();
      // Do not silently migrate/revoke a previous manual connector or site.
      string legacy=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),".infro-live","connector.json");
      if(File.Exists(legacy)) {state.Text="يوجد موصل يدوي سابق لهذا المستخدم. افصل موقعه من حساب INFRO وأوقف مهمة INFRO Live Connector قبل نقل الفرع إلى الخدمة الجديدة.";return;}
      if(File.Exists(Path.Combine(Paths.State,"connector.json"))) {
        if(MessageBox.Show(this,"سيُستبدل اقتران هذا الكمبيوتر بالفرع الذي أنشأت له الرمز الجديد. ستبقى إعدادات الكاميرات في حسابك. هل تريد المتابعة؟","تجديد اقتران INFRO",MessageBoxButtons.YesNo,MessageBoxIcon.Question)!=DialogResult.Yes)return;
      }
      await Task.Run(()=>{Paths.PrepareRuntime();Paths.StopService();});
      ServicePointManager.SecurityProtocol=SecurityProtocolType.Tls12;
      var handler=new HttpClientHandler {AllowAutoRedirect=false};
      using(var client=new HttpClient(handler) {Timeout=TimeSpan.FromSeconds(20)}) {
        var response=await client.PostAsync("https://ir.sa/api/live-view/connectors/enroll",new StringContent(Paths.Json.Serialize(new {code=value}),Encoding.UTF8,"application/json"));
        if(!response.IsSuccessStatusCode) {state.Text=Paths.PairingError((int)response.StatusCode);return;}
        string body=await response.Content.ReadAsStringAsync();if(body.Length>8192)throw new InvalidOperationException();
        var data=Paths.Json.Deserialize<Dictionary<string,object>>(body);object raw;
        if(!data.TryGetValue("token",out raw)||!(raw is string)||!Regex.IsMatch((string)raw,"^[A-Za-z0-9_-]{43}$"))throw new InvalidOperationException();
        Paths.SavePairing((string)raw,Paths.State);
      }
      code.Clear();
      state.Text="حُفظ الاقتران. جارٍ التحقق من اتصال الخدمة بالمنصة…";await Task.Run(()=>Paths.InstallService());await WaitForConnection();
    }
    async Task WaitForConnection() {
      for(int i=0;i<20;i++) {
        await Task.Delay(1000);
        string value=Paths.StatusValue();if(value=="connected"||value=="revoked"||value=="access_required")break;
        using(var service=new ServiceController(Paths.ServiceName)){if(service.Status!=ServiceControllerStatus.Running)break;}
      }
      RefreshStatus();
    }
    void RefreshStatus() {
      try {
        string file=Path.Combine(Paths.State,"status.json");
        if(Paths.StatusValue()=="revoked") {state.Text="رفضت المنصة الاقتران المحفوظ. أنشئ رمزًا جديدًا للفرع، واضغط لصق رمز الاقتران ثم ربط هذا الكمبيوتر لتجديده.";return;}
        if(!File.Exists(file)) {
          if(!File.Exists(Path.Combine(Paths.State,"connector.json"))) {state.Text="بانتظار الاقتران. جهز أدوات البث ثم أدخل رمز الفرع.";return;}
          string details="";try {var diagnostic=Paths.Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(Path.Combine(Paths.State,"service-status.json")));string codeValue=Convert.ToString(diagnostic["code"]);if(Regex.IsMatch(codeValue,"^[A-Z0-9_]{1,80}$"))details=" التشخيص: "+codeValue;}catch{}
          using(var service=new ServiceController(Paths.ServiceName)) {try {state.Text=service.Status==ServiceControllerStatus.Running?"الاقتران محفوظ والخدمة تعمل. بانتظار أول اتصال ناجح بالمنصة.":"الاقتران محفوظ لكن الخدمة لا تعمل. اضغط تشغيل الخدمة ثم شارك رمز التشخيص مع الدعم.";}catch {state.Text="الاقتران محفوظ لكن خدمة ويندوز غير مثبتة. اضغط تشغيل الخدمة.";}}
          state.Text+=details;return;
        }
        var data=Paths.Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(file)); DateTime updated;
        if(!DateTime.TryParse(Convert.ToString(data["updatedAt"]),null,System.Globalization.DateTimeStyles.RoundtripKind,out updated)||DateTime.UtcNow-updated.ToUniversalTime()>TimeSpan.FromSeconds(60)) {state.Text="لا توجد حالة اتصال حديثة. تحقق أن الكمبيوتر مستيقظ وأن خدمة INFRO تعمل.";return;}
        string value=Convert.ToString(data["state"]);
        using(var service=new ServiceController(Paths.ServiceName)) {if(service.Status!=ServiceControllerStatus.Running){state.Text="الخدمة متوقفة. اضغط تشغيل الخدمة لإصلاح أدوات التشغيل وبدء الاتصال.";return;}}
        state.Text=value=="rate_limited"?"توقف البث مؤقتًا بسبب حد الطلبات. الموصل سيعيد الاتصال تلقائيًا؛ لا تحتاج إلى رمز جديد.":value=="access_required"?"الموصل مقترن، لكن خدمة البث تحتاج تفعيلًا في حساب المنشأة. فعّلها من INFRO؛ الموصل سيعيد الاتصال تلقائيًا.":value=="connected"?"الموصل متصل بـ INFRO. راجع حالة كل كاميرا ومعاينتها داخل حسابك؛ الاتصال وحده لا يثبت وصول الصورة.":value=="revoked"?"الربط غير مصرح أو خدمة البث غير مفعلة للحساب. راجع حالة الفرع في INFRO.":"انقطع الاتصال بـ INFRO. الموصل يعيد المحاولة تلقائيًا.";
      }catch {state.Text="تعذر قراءة الحالة. راجع إعدادات الربط في حساب INFRO.";}
    }
  }
  static class Program {
    [STAThread] static void Main(string[] args) {
      if(args.Contains("--self-test")) {
        if(!Paths.PairingError(410).Contains("HTTP410")||!Paths.PairingError(503).Contains("HTTP503")||Paths.FailureCode(new InvalidOperationException("rtsp://private:secret@host"))!="SERVICE_ERROR")Environment.Exit(7);
        if(Paths.NormalizePairingCode(" \u200fAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAA ")!="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")Environment.Exit(9);
        if(!Discovery.Private("192.168.8.44")||Discovery.Private("127.0.0.1")||Discovery.Private("8.8.8.8"))Environment.Exit(2);
        byte[] packet=Encoding.UTF8.GetBytes("<Envelope xmlns:d='urn:test'><d:XAddrs>http://192.168.8.44/onvif/device_service http://8.8.8.8/ http://user:secret@192.168.1.1/</d:XAddrs></Envelope>");
        if(!Discovery.Parse(packet).SequenceEqual(new[]{"192.168.8.44"}))Environment.Exit(3);
        try {Discovery.Parse(Encoding.UTF8.GetBytes("<!DOCTYPE x [<!ENTITY e SYSTEM 'file:///C:/Windows/win.ini'>]><x>&e;</x>"));Environment.Exit(4);}catch(XmlException){}
        string temporary=Path.Combine(Path.GetTempPath(),"infro-pair-test-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(temporary);
        try {
          Paths.SavePairing(new string('A',43),temporary);File.WriteAllText(Path.Combine(temporary,"status.json"),"{\"state\":\"revoked\"}");
          Paths.SavePairing(new string('B',43),temporary);
          var saved=Paths.Json.Deserialize<Dictionary<string,string>>(File.ReadAllText(Path.Combine(temporary,"connector.json")));
          if(saved["token"]!=new string('B',43)||File.Exists(Path.Combine(temporary,"status.json")))Environment.Exit(10);
          try{Paths.SavePairing("invalid",temporary);Environment.Exit(11);}catch(InvalidOperationException){}
          if(File.ReadAllText(Path.Combine(temporary,"connector.json")).Contains("invalid"))Environment.Exit(12);
        }finally{Directory.Delete(temporary,true);}
        Environment.Exit(0);return;
      }
      if(args.Contains("--prepare-runtime")) {try{Paths.PrepareRuntime();}catch{Environment.ExitCode=8;}return;}
      if(args.Contains("--service-runtime-check")) {ServiceBase.Run(new ConnectorService(true));return;}
      if(args.Contains("--service-smoke")) {ServiceBase.Run(new SmokeService());return;}
      if(args.Contains("--service-control-test")) {
        Paths.Protect();string marker=Path.Combine(Paths.Root,"smoke.pid");if(File.Exists(marker))File.Delete(marker);
        try {
          Paths.InstallService(true);
          for(int i=0;i<50&&!File.Exists(marker);i++)Thread.Sleep(100);
          int pid=Int32.Parse(File.ReadAllText(marker));
          using(var process=Process.GetProcessById(pid)) {Paths.StopService();if(!process.WaitForExit(5000))Environment.Exit(5);}
          return;
        }catch {Environment.ExitCode=6;}finally{Paths.StopService();Paths.Run(Path.Combine(Environment.SystemDirectory,"sc.exe"),"delete "+Paths.ServiceName);}
        return;
      }
      if(args.Contains("--service")) {ServiceBase.Run(new ConnectorService());return;}
      if(args.Contains("--stop-service")) {Paths.StopService();return;}
      Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new SetupForm());
    }
  }
}
