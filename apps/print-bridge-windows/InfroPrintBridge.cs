using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Printing;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly:System.Reflection.AssemblyTitle("INFRO Print Bridge")]
[assembly:System.Reflection.AssemblyCompany("INFRO")]
[assembly:System.Reflection.AssemblyProduct("INFRO Print Bridge — Evelon D10")]
[assembly:System.Reflection.AssemblyVersion("1.0.0.0")]
[assembly:System.Reflection.AssemblyFileVersion("1.0.0.0")]
namespace Infro.PrintBridge {
 public sealed class ApiError : Exception { public int Status; public string Code; public ApiError(int status,string code,string message):base(message){Status=status;Code=code;} }
 public sealed class Binding { public string BusinessId; public string BusinessName; public string Origin; public string TokenHash; public string PrinterName; }
 public sealed class Job { public string JobId; public string BusinessId; public string DocumentId; public string Fingerprint; public string PrinterName; public string Status; public string CreatedAt; }
 public interface IPrinter { string[] Names(); void Print(string printer,string title,byte[] png); }
 public sealed class WindowsPrinter : IPrinter {
  public string[] Names(){return PrinterSettings.InstalledPrinters.Cast<string>().Where(n=>!n.StartsWith("Microsoft Print to PDF",StringComparison.OrdinalIgnoreCase)&&!n.Contains("XPS")&&!n.Contains("OneNote")&&!n.Equals("Fax",StringComparison.OrdinalIgnoreCase)).ToArray();}
  public void Print(string printer,string title,byte[] png){
   if(!Names().Contains(printer))throw new InvalidOperationException("Printer is unavailable");
   using(var stream=new MemoryStream(png))using(var image=Image.FromStream(stream,true,true))using(var document=new PrintDocument()){
    document.PrinterSettings.PrinterName=printer;document.PrinterSettings.PrintToFile=false;document.PrinterSettings.Copies=1;
    if(!document.PrinterSettings.IsValid)throw new InvalidOperationException("Printer is unavailable");
    document.PrintController=new StandardPrintController();document.DocumentName=title;
    document.DefaultPageSettings.PaperSize=new PaperSize("INFRO 80mm",315,Math.Max(150,(int)Math.Ceiling(image.Height*100.0/203.0)+32));
    document.DefaultPageSettings.Margins=new System.Drawing.Printing.Margins(0,0,0,0);document.OriginAtMargins=false;
    int offset=0;
    document.PrintPage+=delegate(object sender,PrintPageEventArgs e){
     // Keep 203 dpi text at its original size; long receipts continue on another page.
     float width=Math.Min(576f*100/203,e.PageSettings.PrintableArea.Width);
     float scale=width/image.Width;float available=Math.Max(1,e.PageSettings.PrintableArea.Height-8);
     int pixels=Math.Min(image.Height-offset,Math.Max(1,(int)Math.Floor(available/scale)));
     float x=Math.Max(0,(e.PageBounds.Width-width)/2-e.PageSettings.HardMarginX);
     e.Graphics.DrawImage(image,new RectangleF(x,0,width,pixels*scale),new Rectangle(0,offset,image.Width,pixels),GraphicsUnit.Pixel);
     offset+=pixels;e.HasMorePages=offset<image.Height;
    };
    document.Print();
   }
  }
 }
 public sealed class Service {
  public const string Version="1.0.0";
  readonly object gate=new object();readonly string directory;readonly IPrinter printer;readonly JavaScriptSerializer json=new JavaScriptSerializer{MaxJsonLength=8500000};
  List<Binding> bindings=new List<Binding>();string code="";DateTime expires=DateTime.MinValue;int attempts=0,active=0;
  public string LastMessage="جاهز للربط";
  public Service(string directory,IPrinter printer){
   this.directory=directory;this.printer=printer;Directory.CreateDirectory(directory);Directory.CreateDirectory(Path.Combine(directory,"jobs"));
   var path=Path.Combine(directory,"bindings.dat");if(File.Exists(path)){
    try{bindings=json.Deserialize<List<Binding>>(Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(path),null,DataProtectionScope.CurrentUser)))??new List<Binding>();}
    catch{File.Move(path,path+".invalid-"+DateTime.UtcNow.Ticks);LastMessage="أعد ربط الكاشير بهذا الجهاز";}
   }
  }
  public static bool Trusted(string origin){return origin=="https://ir.sa"||origin=="https://www.ir.sa"||origin=="https://hub.ir.sa"||origin=="https://admin.ir.sa";}
  public static string Hash(byte[] bytes){using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-","").ToLowerInvariant();}
  public static string RandomToken(){var bytes=new byte[32];using(var rng=RandomNumberGenerator.Create())rng.GetBytes(bytes);return Convert.ToBase64String(bytes);}
  static bool Equal(string a,string b){if(a==null||b==null||a.Length!=b.Length)return false;int value=0;for(int i=0;i<a.Length;i++)value|=a[i]^b[i];return value==0;}
  public string NewCode(){lock(gate){var bytes=new byte[4];using(var rng=RandomNumberGenerator.Create())rng.GetBytes(bytes);code=(BitConverter.ToUInt32(bytes,0)%100000000).ToString("D8");expires=DateTime.UtcNow.AddMinutes(5);attempts=0;return code;}}
  public bool CodeValid(){lock(gate)return DateTime.UtcNow<expires&&attempts<6;}
  public string PairedSummary(){lock(gate)return bindings.Count==0?"لم يُربط كاشير بعد":String.Join("\r\n",bindings.Select(b=>b.BusinessName+" · "+(String.IsNullOrEmpty(b.PrinterName)?"اختر الطابعة من الكاشير":b.PrinterName)));}
  public void RevokeAll(){lock(gate){bindings.Clear();SaveBindings();expires=DateTime.MinValue;LastMessage="أُلغي ربط الكاشيرات";}}
  static string Text(Dictionary<string,object> body,string key,int max){object value;var text=body.TryGetValue(key,out value)?value as string:null;if(text==null||text.Length>max)throw new ApiError(400,"INVALID_INPUT","راجع بيانات الطلب");return text.Trim();}
  static string Id(Dictionary<string,object> body,string key){string value=Text(body,key,80);Guid parsed;if(!Guid.TryParse(value,out parsed))throw new ApiError(400,"INVALID_ID","معرّف غير صالح");return parsed.ToString();}
  void Atomic(string path,byte[] bytes){string temp=path+".tmp-"+Guid.NewGuid();try{using(var file=new FileStream(temp,FileMode.CreateNew,FileAccess.Write,FileShare.None)){file.Write(bytes,0,bytes.Length);file.Flush(true);}if(File.Exists(path))File.Replace(temp,path,null);else File.Move(temp,path);}finally{if(File.Exists(temp))File.Delete(temp);}}
  void SaveBindings(){Atomic(Path.Combine(directory,"bindings.dat"),ProtectedData.Protect(Encoding.UTF8.GetBytes(json.Serialize(bindings)),null,DataProtectionScope.CurrentUser));}
  string JobPath(string id){return Path.Combine(directory,"jobs",id+".json");}
  void SaveJob(Job job){Atomic(JobPath(job.JobId),Encoding.UTF8.GetBytes(json.Serialize(job)));}
  Job ReadJob(string id){var path=JobPath(id);return File.Exists(path)?json.Deserialize<Job>(File.ReadAllText(path,Encoding.UTF8)):null;}
  static object Status(Job job){return new {ok=true,jobId=job.JobId,status=job.Status=="accepted"?"pending":job.Status,printerName=job.PrinterName};}
  public object Process(string origin,string path,Dictionary<string,object> body,string token){
   if(!Trusted(origin))throw new ApiError(403,"ORIGIN_DENIED","الموقع غير مسموح");
   if(path=="/v1/health")return new {ok=true,version=Version};
   lock(gate){
    string business=Id(body,"businessId");
    if(path=="/v1/pair"){
     if(DateTime.UtcNow>=expires||attempts>=6)throw new ApiError(403,"PAIR_EXPIRED","أنشئ رمز ربط جديدًا من برنامج INFRO على ويندوز");
     attempts++;if(!Equal(Text(body,"code",8),code))throw new ApiError(403,"PAIR_INVALID","رمز الربط غير صحيح");
     string name=Text(body,"businessName",180);if(name.Length<1)throw new ApiError(400,"INVALID_NAME","اسم المنشأة مطلوب");
     var old=bindings.FirstOrDefault(b=>b.BusinessId==business&&b.Origin==origin);string selected=old==null?"":old.PrinterName;
     string secret=RandomToken();var binding=new Binding{BusinessId=business,BusinessName=name,Origin=origin,TokenHash=Hash(Encoding.UTF8.GetBytes(secret)),PrinterName=selected};
     var snapshot=bindings.ToList();bindings=bindings.Where(b=>!(b.BusinessId==business&&b.Origin==origin)).ToList();bindings.Add(binding);
     try{SaveBindings();}catch{bindings=snapshot;throw;}
     expires=DateTime.MinValue;LastMessage="تم ربط "+name;
     return new {ok=true,version=Version,token=secret,printers=printer.Names(),printerName=selected};
    }
    string hash=Hash(Encoding.UTF8.GetBytes(token??""));var current=bindings.FirstOrDefault(b=>b.BusinessId==business&&b.Origin==origin&&Equal(b.TokenHash,hash));
    if(current==null)throw new ApiError(403,"PAIR_REQUIRED","أعد ربط الكاشير ببرنامج INFRO على هذا الجهاز");
    if(path=="/v1/printers")return new {ok=true,printers=printer.Names(),printerName=current.PrinterName,version=Version};
    if(path=="/v1/select"){
     string selected=Text(body,"printerName",300);if(!printer.Names().Contains(selected))throw new ApiError(400,"PRINTER_MISSING","الطابعة غير مثبتة في ويندوز");
     string old=current.PrinterName;current.PrinterName=selected;try{SaveBindings();}catch{current.PrinterName=old;throw;}return new {ok=true,printerName=selected};
    }
    if(path=="/v1/revoke"){bindings.Remove(current);SaveBindings();return new {ok=true};}
    if(path=="/v1/status"){
     var job=ReadJob(Id(body,"jobId"));if(job==null)return new {ok=true,status="not-found"};
     if(job.BusinessId!=business)throw new ApiError(403,"JOB_DENIED","العملية لا تخص هذه المنشأة");
     // A process restart never replays a job that may already be in the spooler.
     if(job.Status=="accepted"&&!pending.Contains(job.JobId)){job.Status="uncertain";SaveJob(job);}return Status(job);
    }
    if(path!="/v1/print")throw new ApiError(404,"NOT_FOUND","المسار غير موجود");
    string jobId=Id(body,"jobId"),documentId=Text(body,"documentId",100),title=Text(body,"title",180);
    if(documentId.Length<1||title.Length<1)throw new ApiError(400,"INVALID_DOCUMENT","الفاتورة غير محددة");
    string encoded=Text(body,"png",8000000);byte[] image;try{image=Convert.FromBase64String(encoded);}catch{throw new ApiError(400,"INVALID_IMAGE","صورة الفاتورة غير صالحة");}
    ValidateImage(image);
    string fingerprint=Hash(Encoding.UTF8.GetBytes(documentId+"\n"+title+"\n"+Hash(image)));
    var previous=ReadJob(jobId);if(previous!=null){if(previous.BusinessId!=business||previous.DocumentId!=documentId||previous.Fingerprint!=fingerprint)throw new ApiError(409,"JOB_MISMATCH","معرّف الطباعة مستخدم لمحتوى آخر");if(previous.Status=="accepted"&&!pending.Contains(jobId)){previous.Status="uncertain";SaveJob(previous);}return Status(previous);}
    if(String.IsNullOrEmpty(current.PrinterName)||!printer.Names().Contains(current.PrinterName))throw new ApiError(400,"PRINTER_MISSING","اختر طابعة Evelon D10 المثبتة في ويندوز");
    DateTime created;if(!DateTime.TryParse(Text(body,"createdAt",50),null,System.Globalization.DateTimeStyles.RoundtripKind,out created)||Math.Abs((DateTime.UtcNow-created.ToUniversalTime()).TotalMinutes)>10)throw new ApiError(409,"JOB_EXPIRED","طلب قديم غير مؤكد؛ راجع طابور ويندوز قبل إعادة الطباعة");
    if(active>=5)throw new ApiError(429,"QUEUE_BUSY","طابور الطباعة مشغول؛ انتظر ثم تحقق من العملية");
    var next=new Job{JobId=jobId,BusinessId=business,DocumentId=documentId,Fingerprint=fingerprint,PrinterName=current.PrinterName,Status="accepted",CreatedAt=DateTime.UtcNow.ToString("o")};
    SaveJob(next);pending.Add(jobId);active++;
    Enqueue(delegate{
     try{printer.Print(next.PrinterName,title,image);lock(gate){next.Status="spooled";SaveJob(next);LastMessage="أُرسلت الفاتورة إلى "+next.PrinterName;}}
     catch{lock(gate){next.Status="uncertain";try{SaveJob(next);}catch{}LastMessage="راجع طابور ويندوز؛ تعذر تأكيد إرسال الفاتورة";}}
     finally{lock(gate){pending.Remove(jobId);active--;}}
    });
    return new {ok=true,jobId=jobId,status="pending",printerName=next.PrinterName};
   }
  }
  readonly Queue<Action> work=new Queue<Action>();bool working=false;readonly HashSet<string> pending=new HashSet<string>();
  void Enqueue(Action action){work.Enqueue(action);if(working)return;working=true;ThreadPool.QueueUserWorkItem(delegate{while(true){Action next;lock(gate){if(work.Count==0){working=false;return;}next=work.Dequeue();}try{next();}catch{}}});}
  public static void ValidateImage(byte[] image){
   byte[] signature={137,80,78,71,13,10,26,10};if(image.Length<24||image.Length>6000000||!signature.SequenceEqual(image.Take(8)))throw new ApiError(400,"INVALID_IMAGE","صورة الفاتورة غير صالحة");
   long width=((long)image[16]<<24)|((long)image[17]<<16)|((long)image[18]<<8)|image[19];long height=((long)image[20]<<24)|((long)image[21]<<16)|((long)image[22]<<8)|image[23];
   if(width!=576||height<1||height>30000)throw new ApiError(400,"INVALID_IMAGE_SIZE","مقاس الصورة لا يطابق ورق 80 مم");
   using(var stream=new MemoryStream(image))using(var bitmap=Image.FromStream(stream,true,true)){if(bitmap.Width!=width||bitmap.Height!=height)throw new ApiError(400,"INVALID_IMAGE","الصورة غير صالحة");}
  }
 }
 public sealed class Server : IDisposable {
  readonly Service service;readonly TcpListener listener;readonly SemaphoreSlim clients=new SemaphoreSlim(8);volatile bool stopped=false;public int Port;
  public Server(Service service,int port){this.service=service;listener=new TcpListener(IPAddress.Loopback,port);listener.Start(8);Port=((IPEndPoint)listener.LocalEndpoint).Port;ThreadPool.QueueUserWorkItem(delegate{while(!stopped){try{var client=listener.AcceptTcpClient();if(!clients.Wait(0)){client.Close();continue;}ThreadPool.QueueUserWorkItem(delegate{try{Serve(client);}catch{}finally{clients.Release();client.Close();}});}catch{if(!stopped)Thread.Sleep(100);}}});}
  void Serve(TcpClient client){
   client.ReceiveTimeout=10000;client.SendTimeout=10000;using(var stream=client.GetStream()){
    string origin=null;var deadline=DateTime.UtcNow.AddSeconds(15);try{
     var header=new List<byte>();while(header.Count<8192){if(DateTime.UtcNow>deadline)throw new IOException();int value=stream.ReadByte();if(value<0)return;header.Add((byte)value);int n=header.Count;if(n>=4&&header[n-4]==13&&header[n-3]==10&&header[n-2]==13&&header[n-1]==10)break;}
     if(header.Count>=8192)throw new ApiError(431,"HEADER_TOO_LARGE","طلب غير صالح");
     var lines=Encoding.ASCII.GetString(header.ToArray()).Split(new[]{"\r\n"},StringSplitOptions.None);var request=lines[0].Split(' ');if(request.Length!=3||request[2]!="HTTP/1.1")throw new ApiError(400,"INVALID_HTTP","طلب غير صالح");
     var headers=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);foreach(var line in lines.Skip(1)){if(line.Length==0)continue;int split=line.IndexOf(':');if(split<1||headers.ContainsKey(line.Substring(0,split)))throw new ApiError(400,"INVALID_HTTP","طلب غير صالح");headers[line.Substring(0,split)]=line.Substring(split+1).Trim();}
     string host;headers.TryGetValue("Origin",out origin);headers.TryGetValue("Host",out host);
     if(host!="127.0.0.1:"+Port||!Service.Trusted(origin))throw new ApiError(403,"ORIGIN_DENIED","اتصال غير مسموح");
     if(request[0]=="OPTIONS"){Write(stream,200,"{}",origin);return;}
     if(request[0]!="POST"||headers.ContainsKey("Transfer-Encoding"))throw new ApiError(405,"METHOD_DENIED","طلب غير مسموح");
     int length;string contentLength,type;headers.TryGetValue("Content-Length",out contentLength);headers.TryGetValue("Content-Type",out type);
     if(!Int32.TryParse(contentLength,out length)||length<2||length>8500000||type==null||!type.StartsWith("application/json",StringComparison.OrdinalIgnoreCase))throw new ApiError(400,"INVALID_BODY","طلب غير صالح");
     var bytes=new byte[length];int offset=0;while(offset<length){if(DateTime.UtcNow>deadline)throw new IOException();int read=stream.Read(bytes,offset,length-offset);if(read==0)throw new IOException();offset+=read;}
     var json=new JavaScriptSerializer{MaxJsonLength=8500000,RecursionLimit=10};Dictionary<string,object> body;try{body=json.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(bytes));}catch{throw new ApiError(400,"INVALID_JSON","طلب غير صالح");}
     string token;headers.TryGetValue("X-Infro-Token",out token);var result=service.Process(origin,request[1],body,token);Write(stream,200,json.Serialize(result),origin);
    }catch(ApiError error){Write(stream,error.Status,new JavaScriptSerializer().Serialize(new{ok=false,code=error.Code,error=error.Message}),origin);}catch{try{Write(stream,500,"{\"ok\":false,\"code\":\"BRIDGE_ERROR\",\"error\":\"تعذر إكمال الطلب؛ راجع برنامج الربط\"}",origin);}catch{}}
   }
  }
  static void Write(Stream stream,int status,string body,string origin){var bytes=Encoding.UTF8.GetBytes(body);string cors=Service.Trusted(origin)?"Access-Control-Allow-Origin: "+origin+"\r\nVary: Origin\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, X-Infro-Token\r\n":"";string header="HTTP/1.1 "+status+" Response\r\nContent-Type: application/json; charset=utf-8\r\nCache-Control: no-store\r\nConnection: close\r\nX-Content-Type-Options: nosniff\r\n"+cors+"Content-Length: "+bytes.Length+"\r\n\r\n";var head=Encoding.ASCII.GetBytes(header);stream.Write(head,0,head.Length);stream.Write(bytes,0,bytes.Length);}
  public void Dispose(){stopped=true;listener.Stop();}
 }
 public sealed class BridgeForm : Form {
  readonly Service service;readonly Label pin=new Label(),paired=new Label(),status=new Label();readonly NotifyIcon tray=new NotifyIcon();readonly System.Windows.Forms.Timer timer=new System.Windows.Forms.Timer();
  public BridgeForm(Service service,bool background){
   this.service=service;Text="INFRO · Evelon D10";Width=560;Height=510;RightToLeft=RightToLeft.Yes;RightToLeftLayout=true;Font=new Font("Segoe UI",11);StartPosition=FormStartPosition.CenterScreen;MaximizeBox=false;
   var panel=new FlowLayoutPanel{Dock=DockStyle.Fill,FlowDirection=FlowDirection.TopDown,WrapContents=false,Padding=new Padding(20),AutoScroll=true};Controls.Add(panel);
   panel.Controls.Add(new Label{Text="ربط الطباعة المباشرة · Evelon D10",AutoSize=true,Font=new Font(Font,FontStyle.Bold)});
   panel.Controls.Add(new Label{Text="افتح إعداد الطابعة في كاشير ir.sa وأدخل الرمز التالي.\r\nثم اختر اسم الطابعة المثبتة في ويندوز.",AutoSize=true,MaximumSize=new Size(480,0)});
   pin.Font=new Font("Consolas",26,FontStyle.Bold);pin.AutoSize=true;pin.Padding=new Padding(0,12,0,8);panel.Controls.Add(pin);
   var renew=new Button{Text="إنشاء رمز ربط جديد",AutoSize=true};renew.Click+=delegate{RefreshCode();};panel.Controls.Add(renew);
   var copy=new Button{Text="نسخ رمز الربط",AutoSize=true};copy.Click+=delegate{if(service.CodeValid())Clipboard.SetText(pin.Text);};panel.Controls.Add(copy);
   paired.AutoSize=true;paired.MaximumSize=new Size(475,0);paired.Padding=new Padding(0,12,0,8);panel.Controls.Add(paired);
   status.AutoSize=true;status.MaximumSize=new Size(475,0);panel.Controls.Add(status);
   var revoke=new Button{Text="إلغاء ربط الكاشيرات بهذا الجهاز",AutoSize=true};revoke.Click+=delegate{if(MessageBox.Show("سيحتاج كل كاشير إلى رمز ربط جديد. هل تريد إلغاء الربط؟","INFRO",MessageBoxButtons.YesNo)==DialogResult.Yes){service.RevokeAll();RefreshCode();}};panel.Controls.Add(revoke);
   var hide=new Button{Text="استمرار بجوار الساعة",AutoSize=true};hide.Click+=delegate{Hide();};panel.Controls.Add(hide);
   tray.Icon=SystemIcons.Application;tray.Text="INFRO Print Bridge";tray.Visible=true;var menu=new ContextMenuStrip();menu.Items.Add("فتح رابط الطباعة",null,delegate{Show();Activate();});menu.Items.Add("إغلاق الرابط",null,delegate{tray.Visible=false;Application.Exit();});tray.ContextMenuStrip=menu;tray.DoubleClick+=delegate{Show();Activate();};
   FormClosing+=delegate(object sender,FormClosingEventArgs e){if(e.CloseReason==CloseReason.UserClosing){e.Cancel=true;Hide();}};
   timer.Interval=1000;timer.Tick+=delegate{paired.Text=service.PairedSummary();status.Text=service.LastMessage;if(!service.CodeValid())pin.Text="انتهت صلاحية الرمز";};timer.Start();RefreshCode();
   Shown+=delegate{if(background)Hide();};FormClosed+=delegate{timer.Dispose();tray.Dispose();};
  }
  void RefreshCode(){pin.Text=service.NewCode();}
 }
 static class Program {
  [STAThread] public static int Main(string[] args){
   if(args.Contains("--self-test"))return SelfTests.Run();
   Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
   string directory=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"INFRO","PrintBridge");string installed=Path.Combine(directory,"InfroPrintBridge.exe");
   if(!String.Equals(Application.ExecutablePath,installed,StringComparison.OrdinalIgnoreCase)){
    if(MessageBox.Show("تثبيت رابط طباعة INFRO لهذا المستخدم وتشغيله مع ويندوز؟\r\nلا يحتاج صلاحية مدير. اختر لا لتشغيل النسخة الحالية فقط.","INFRO Print Bridge",MessageBoxButtons.YesNo)==DialogResult.Yes){try{Directory.CreateDirectory(directory);File.Copy(Application.ExecutablePath,installed,true);using(var run=Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run"))run.SetValue("InfroPrintBridge","\""+installed+"\" --background");System.Diagnostics.Process.Start(installed,"--show");return 0;}catch{MessageBox.Show("تعذر التثبيت. أغلق النسخة السابقة وحاول مجددًا.");return 1;}}
   }
   bool created;using(var mutex=new Mutex(true,"Local\\InfroPrintBridge-17861",out created)){
    if(!created){MessageBox.Show("رابط INFRO يعمل بالفعل بجوار الساعة.");return 0;}
    try{var service=new Service(directory,new WindowsPrinter());using(var server=new Server(service,17861))Application.Run(new BridgeForm(service,args.Contains("--background")));}
    catch{MessageBox.Show("تعذر تشغيل رابط الطباعة. تأكد من عدم تشغيل نسخة أخرى ثم حاول مجددًا.","INFRO");return 1;}
   }return 0;
  }
 }
}
