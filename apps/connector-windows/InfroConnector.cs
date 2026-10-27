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
    // Service executes only machine-wide installations, never a user's PATH/current directory.
    internal static string Binary(string name) {
      string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
      var dirs = new List<string> { Path.Combine(pf,"nodejs"), Path.Combine(pf,"WinGet","Links") };
      string machine = Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.Machine) ?? "";
      dirs.AddRange(machine.Split(';'));
      foreach(string raw in dirs) {
        if(String.IsNullOrWhiteSpace(raw)) continue;
        string directory = Path.GetFullPath(Environment.ExpandEnvironmentVariables(raw.Trim().Trim('"')));
        if(!directory.StartsWith(pf + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) continue;
        string file = Path.Combine(directory, name + ".exe");
        if(File.Exists(file)) return file;
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
    Process child; ChildJob job;
    internal ConnectorService() { ServiceName=Paths.ServiceName; CanStop=true; AutoLog=false; }
    protected override void OnStart(string[] args) {
      string node=Paths.Binary("node"),media=Path.GetDirectoryName(Paths.Binary("ffmpeg"));
      if(!File.Exists(Path.Combine(media,"ffprobe.exe")) || !File.Exists(Path.Combine(Paths.State,"connector.json"))) throw new InvalidOperationException("SETUP_REQUIRED");
      job=new ChildJob();
      child=new Process { StartInfo=new ProcessStartInfo(node, Paths.Quote(Path.Combine(Paths.App,"infro-live-connector.mjs")) + " --run --state-directory " + Paths.Quote(Paths.State) + " --ffmpeg-directory " + Paths.Quote(media)) { UseShellExecute=false,CreateNoWindow=true,WorkingDirectory=Paths.App,RedirectStandardOutput=true,RedirectStandardError=true }, EnableRaisingEvents=true };
      // Drain output without persisting credentials or raw FFmpeg errors.
      child.OutputDataReceived+=(s,e)=>{}; child.ErrorDataReceived+=(s,e)=>{};
      child.Exited+=(s,e)=> { if(child!=null) Environment.Exit(1); };
      child.Start(); job.Add(child); child.BeginOutputReadLine(); child.BeginErrorReadLine();
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
    readonly System.Windows.Forms.Timer refresh=new System.Windows.Forms.Timer(); bool busy;
    internal SetupForm() {
      Text="INFRO — ربط كاميرات الفرع"; Size=new Size(780,720); MinimumSize=Size; Font=new Font("Segoe UI",11); RightToLeft=RightToLeft.Yes; RightToLeftLayout=true; BackColor=Color.FromArgb(246,249,249);
      var layout=new FlowLayoutPanel { Dock=DockStyle.Fill,FlowDirection=FlowDirection.TopDown,WrapContents=false,AutoScroll=true,Padding=new Padding(24) }; Controls.Add(layout);
      AddLabel(layout,"INFRO | موصل الكاميرات",18);
      AddLabel(layout,"اربط هذا الكمبيوتر بفرعك مرة واحدة. إدارة الكاميرات وروابط العملاء تبقى داخل حسابك.",11);
      AddButton(layout,"١. تجهيز أدوات البث تلقائيًا",async()=> { await InstallTools(); });
      AddButton(layout,"٢. فتح حساب INFRO وإنشاء رمز ربط للفرع",()=>{ OpenAccount();return Task.CompletedTask; });
      AddLabel(layout,"٣. الصق رمز الاقتران المؤقت هنا (لا تدخل كلمة مرور الكاميرا)",11);
      code.Width=650;code.MaxLength=43;code.RightToLeft=RightToLeft.No;code.UseSystemPasswordChar=true;layout.Controls.Add(code);
      pair.Text="ربط هذا الكمبيوتر وتشغيل الخدمة";pair.Width=650;pair.Height=44;pair.Click+=async(s,e)=>await Work(async()=>await Pair());layout.Controls.Add(pair);
      state.Width=650;state.Height=80;layout.Controls.Add(state);
      AddButton(layout,"تشغيل الخدمة بعد اكتمال الاقتران",()=>{if(!File.Exists(Path.Combine(Paths.State,"connector.json")))throw new InvalidOperationException();Paths.StopService();Paths.InstallService();RefreshStatus();return Task.CompletedTask;});
      AddButton(layout,"البحث عن أجهزة الكاميرات في شبكة الفرع",async()=> { devices.Items.Clear(); var hosts=await Task.Run(()=>Discovery.Search()); foreach(string host in hosts)devices.Items.Add(host); state.Text=hosts.Length==0?"لم تظهر أجهزة. يمكنك إضافة عنوان الجهاز يدويًا في INFRO؛ بعض الأجهزة لا تدعم الاكتشاف.":"حدد عنوان الجهاز ثم انسخه لإضافته في لوحة INFRO. الاكتشاف لا يعني تأكيد صلاحية البث."; });
      devices.Width=650;devices.Height=90;devices.RightToLeft=RightToLeft.No;layout.Controls.Add(devices);
      AddButton(layout,"نسخ عنوان الجهاز المحدد",()=>{if(devices.SelectedItem!=null)Clipboard.SetText(devices.SelectedItem.ToString());return Task.CompletedTask;});
      AddLabel(layout,"يجب بقاء الكمبيوتر مستيقظًا ومتصلًا بالشبكة. الخدمة تبدأ مع ويندوز حتى دون تسجيل الدخول.\nإيقاف الربط نهائيًا وإلغاء صلاحياته يتم من حساب INFRO.",10);
      refresh.Interval=5000;refresh.Tick+=(s,e)=>{if(!busy)RefreshStatus();};refresh.Start(); RefreshStatus();
    }
    void AddLabel(Control parent,string text,int size) { parent.Controls.Add(new Label { Text=text,Width=650,AutoSize=true,MaximumSize=new Size(650,0),Font=new Font("Segoe UI",size),Margin=new Padding(0,0,0,14) }); }
    void AddButton(Control parent,string text,Func<Task> action) { var button=new Button { Text=text,Width=650,Height=42,Margin=new Padding(0,0,0,12) };button.Click+=async(s,e)=>await Work(action);parent.Controls.Add(button); }
    async Task Work(Func<Task> action) { if(busy)return;busy=true;pair.Enabled=false;try {await action();}catch {state.Text="تعذر إكمال الخطوة. تحقق من اتصال الإنترنت والمتطلبات ورمز الاقتران، ثم أعد المحاولة. لم تُحفظ كلمات مرور في سجل التشخيص.";}finally{busy=false;pair.Enabled=true;} }
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
      string value=code.Text.Trim();if(!Regex.IsMatch(value,"^[A-Za-z0-9_-]{43}$")) {state.Text="الصق رمز الاقتران كاملًا من حساب INFRO. الرمز صالح لعشر دقائق ويستخدم مرة واحدة.";return;}
      string node=Paths.Binary("node"),ffmpeg=Paths.Binary("ffmpeg"),ffprobe=Paths.Binary("ffprobe");
      if(Path.GetDirectoryName(ffmpeg)!=Path.GetDirectoryName(ffprobe)||Paths.Run(node,"--version")!=0||Paths.Run(ffmpeg,"-version")!=0||Paths.Run(ffprobe,"-version")!=0)throw new InvalidOperationException();
      // Do not silently migrate/revoke a previous manual connector or site.
      string legacy=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),".infro-live","connector.json");
      if(File.Exists(legacy)) {state.Text="يوجد موصل يدوي سابق لهذا المستخدم. افصل موقعه من حساب INFRO وأوقف مهمة INFRO Live Connector قبل نقل الفرع إلى الخدمة الجديدة.";return;}
      if(File.Exists(Path.Combine(Paths.State,"connector.json"))) {state.Text="هذا الكمبيوتر مقترن بالفعل. لإعادة تشغيله استخدم زر تشغيل الخدمة؛ لنقل الفرع تواصل مع الدعم لإلغاء الاقتران السابق بأمان.";return;}
      Paths.Protect();Paths.StopService();
      ServicePointManager.SecurityProtocol=SecurityProtocolType.Tls12;
      var handler=new HttpClientHandler {AllowAutoRedirect=false};
      using(var client=new HttpClient(handler) {Timeout=TimeSpan.FromSeconds(20)}) {
        var response=await client.PostAsync("https://ir.sa/api/live-view/connectors/enroll",new StringContent(Paths.Json.Serialize(new {code=value}),Encoding.UTF8,"application/json"));
        if(!response.IsSuccessStatusCode) {state.Text="لم ينجح الاقتران. أنشئ رمزًا جديدًا وتأكد من تفعيل خدمة البث في حساب المنشأة.";return;}
        string body=await response.Content.ReadAsStringAsync();if(body.Length>8192)throw new InvalidOperationException();
        var data=Paths.Json.Deserialize<Dictionary<string,object>>(body);object raw;
        if(!data.TryGetValue("token",out raw)||!(raw is string)||!Regex.IsMatch((string)raw,"^[A-Za-z0-9_-]{43}$"))throw new InvalidOperationException();
        string temporary=Path.Combine(Paths.State,"connector.pending");
        File.WriteAllText(temporary,Paths.Json.Serialize(new {origin="https://ir.sa",token=(string)raw}),new UTF8Encoding(false));
        string path=Path.Combine(Paths.State,"connector.json");if(File.Exists(path))File.Replace(temporary,path,null);else File.Move(temporary,path);
      }
      code.Clear();Paths.InstallService();state.Text="تم الاقتران وبدأت خدمة ويندوز. أضف الكاميرا من حساب INFRO؛ جاهزية الصورة تظهر هناك بعد التحقق من وصول البث.";
    }
    void RefreshStatus() {
      try {
        string file=Path.Combine(Paths.State,"status.json");
        if(!File.Exists(file)) {state.Text="بانتظار الإعداد أو أول اتصال. ابدأ بتجهيز أدوات البث ثم اقتران الفرع.";return;}
        var data=Paths.Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(file)); DateTime updated;
        if(!DateTime.TryParse(Convert.ToString(data["updatedAt"]),null,System.Globalization.DateTimeStyles.RoundtripKind,out updated)||DateTime.UtcNow-updated.ToUniversalTime()>TimeSpan.FromSeconds(60)) {state.Text="لا توجد حالة اتصال حديثة. تحقق أن الكمبيوتر مستيقظ وأن خدمة INFRO تعمل.";return;}
        string value=Convert.ToString(data["state"]);
        state.Text=value=="connected"?"الموصل متصل بـ INFRO. راجع حالة كل كاميرا ومعاينتها داخل حسابك؛ الاتصال وحده لا يثبت وصول الصورة.":value=="revoked"?"الربط غير مصرح أو خدمة البث غير مفعلة للحساب. راجع حالة الفرع في INFRO.":"انقطع الاتصال بـ INFRO. الموصل يعيد المحاولة تلقائيًا.";
      }catch {state.Text="تعذر قراءة الحالة. راجع إعدادات الربط في حساب INFRO.";}
    }
  }
  static class Program {
    [STAThread] static void Main(string[] args) {
      if(args.Contains("--self-test")) {
        if(!Discovery.Private("192.168.8.44")||Discovery.Private("127.0.0.1")||Discovery.Private("8.8.8.8"))Environment.Exit(2);
        byte[] packet=Encoding.UTF8.GetBytes("<Envelope xmlns:d='urn:test'><d:XAddrs>http://192.168.8.44/onvif/device_service http://8.8.8.8/ http://user:secret@192.168.1.1/</d:XAddrs></Envelope>");
        if(!Discovery.Parse(packet).SequenceEqual(new[]{"192.168.8.44"}))Environment.Exit(3);
        try {Discovery.Parse(Encoding.UTF8.GetBytes("<!DOCTYPE x [<!ENTITY e SYSTEM 'file:///C:/Windows/win.ini'>]><x>&e;</x>"));Environment.Exit(4);}catch(XmlException){}
        Environment.Exit(0);return;
      }
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
