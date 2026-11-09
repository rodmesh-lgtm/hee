using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
namespace Infro.PrintBridge {
 static class SelfTests {
  sealed class FakePrinter:IPrinter {public int Count;public bool Throw;public string[] Names(){return new[]{"Evelon D10 test"};}public void Print(string printer,string title,byte[] png){Interlocked.Increment(ref Count);if(Throw)throw new IOException("Simulated spooler uncertainty");}}
  static readonly JavaScriptSerializer Json=new JavaScriptSerializer{MaxJsonLength=8500000};
  static Dictionary<string,object> Body(params string[] values){var body=new Dictionary<string,object>();for(int i=0;i<values.Length;i+=2)body[values[i]]=values[i+1];return body;}
  static Dictionary<string,object> Result(object value){return Json.Deserialize<Dictionary<string,object>>(Json.Serialize(value));}
  static void Check(bool valid,string name){if(!valid)throw new Exception(name);Console.WriteLine("PASS "+name);}
  static void Reject(Action action,string code){try{action();throw new Exception("Expected "+code);}catch(ApiError error){Check(error.Code==code,code);}}
  static byte[] Png(){using(var image=new Bitmap(576,200)){using(var g=Graphics.FromImage(image)){g.Clear(Color.White);g.DrawString("INFRO 123",SystemFonts.DefaultFont,Brushes.Black,10,10);}using(var stream=new MemoryStream()){image.Save(stream,ImageFormat.Png);return stream.ToArray();}}}
  static string Pair(Service service,string business){return (string)Result(service.Process("https://ir.sa","/v1/pair",Body("businessId",business,"businessName","اختبار الطابعة","code",service.NewCode()),null))["token"];}
  static Dictionary<string,object> Await(Service service,string business,string token,string id){for(int i=0;i<100;i++){var state=Result(service.Process("https://ir.sa","/v1/status",Body("businessId",business,"jobId",id),token));if((string)state["status"]!="pending")return state;Thread.Sleep(20);}throw new Exception("Job timed out");}
  public static int Run(){string root=Path.Combine(Path.GetTempPath(),"infro-print-tests-"+Guid.NewGuid());try{
   var fake=new FakePrinter();var service=new Service(root,fake);string business=Guid.NewGuid().ToString(),other=Guid.NewGuid().ToString();
   Reject(delegate{service.Process("https://evil.example","/v1/health",Body(),null);},"ORIGIN_DENIED");
   string pin=service.NewCode();for(int i=0;i<6;i++)Reject(delegate{service.Process("https://ir.sa","/v1/pair",Body("businessId",business,"businessName","Test","code",pin=="00000000"?"11111111":"00000000"),null);},"PAIR_INVALID");
   Reject(delegate{service.Process("https://ir.sa","/v1/pair",Body("businessId",business,"businessName","Test","code",pin),null);},"PAIR_EXPIRED");
   string token=Pair(service,business);
   Check(!Encoding.UTF8.GetString(File.ReadAllBytes(Path.Combine(root,"bindings.dat"))).Contains(token),"Pair credentials protected by current-user DPAPI");
   Reject(delegate{service.Process("https://ir.sa","/v1/printers",Body("businessId",other),token);},"PAIR_REQUIRED");
   Reject(delegate{service.Process("https://hub.ir.sa","/v1/printers",Body("businessId",business),token);},"PAIR_REQUIRED");
   Reject(delegate{service.Process("https://ir.sa","/v1/select",Body("businessId",business,"printerName","not installed"),token);},"PRINTER_MISSING");
   service.Process("https://ir.sa","/v1/select",Body("businessId",business,"printerName",fake.Names()[0]),token);
   string id=Guid.NewGuid().ToString();var job=Body("businessId",business,"jobId",id,"documentId",Guid.NewGuid().ToString(),"title","فاتورة 00024","createdAt",DateTime.UtcNow.ToString("o"),"png",Convert.ToBase64String(Png()));
   service.Process("https://ir.sa","/v1/print",job,token);Check((string)Await(service,business,token,id)["status"]=="spooled","Native spool acceptance is explicit");
   service.Process("https://ir.sa","/v1/print",job,token);Check(fake.Count==1,"Repeated job ID is never printed twice");
   job["title"]="Changed content";Reject(delegate{service.Process("https://ir.sa","/v1/print",job,token);},"JOB_MISMATCH");job["title"]="فاتورة 00024";
   string otherToken=Pair(service,other);Reject(delegate{service.Process("https://ir.sa","/v1/status",Body("businessId",other,"jobId",id),otherToken);},"JOB_DENIED");
   var invalid=Png();invalid[18]=1;Reject(delegate{Service.ValidateImage(invalid);},"INVALID_IMAGE_SIZE");
   string uncertainId=Guid.NewGuid().ToString();File.WriteAllText(Path.Combine(root,"jobs",uncertainId+".json"),Json.Serialize(new Job{JobId=uncertainId,BusinessId=business,DocumentId="saved",Status="accepted",PrinterName=fake.Names()[0]}),Encoding.UTF8);
   var restarted=new Service(root,fake);Check((string)Result(restarted.Process("https://ir.sa","/v1/status",Body("businessId",business,"jobId",uncertainId),token))["status"]=="uncertain","Restart does not replay an unconfirmed spool operation");Check(fake.Count==1,"Restart cannot generate extra copies");
   fake.Throw=true;job["jobId"]=Guid.NewGuid().ToString();service.Process("https://ir.sa","/v1/print",job,token);Check((string)Await(service,business,token,(string)job["jobId"])["status"]=="uncertain","Spool errors remain uncertain instead of silently retrying");service.Process("https://ir.sa","/v1/print",job,token);Check(fake.Count==2,"Uncertain jobs cannot be resubmitted");
   using(var server=new Server(service,0)){
    var request=(HttpWebRequest)WebRequest.Create("http://127.0.0.1:"+server.Port+"/v1/health");request.Method="POST";request.ContentType="application/json";request.Headers["Origin"]="https://ir.sa";byte[] body=Encoding.UTF8.GetBytes("{}");request.ContentLength=body.Length;using(var stream=request.GetRequestStream())stream.Write(body,0,body.Length);using(var response=(HttpWebResponse)request.GetResponse())Check(response.StatusCode==HttpStatusCode.OK&&response.Headers["Access-Control-Allow-Origin"]=="https://ir.sa","Loopback HTTP accepts the exact trusted origin");
    var denied=(HttpWebRequest)WebRequest.Create("http://127.0.0.1:"+server.Port+"/v1/health");denied.Method="OPTIONS";denied.Headers["Origin"]="https://evil.example";try{denied.GetResponse();throw new Exception("Origin accepted");}catch(WebException error){using(var response=(HttpWebResponse)error.Response)Check(response.StatusCode==HttpStatusCode.Forbidden&&response.Headers["Access-Control-Allow-Origin"]==null,"Foreign website cannot access the local print bridge");}
   }
   string replacement=Pair(service,business);Reject(delegate{service.Process("https://ir.sa","/v1/printers",Body("businessId",business),token);},"PAIR_REQUIRED");service.RevokeAll();Reject(delegate{service.Process("https://ir.sa","/v1/printers",Body("businessId",business),replacement);},"PAIR_REQUIRED");
   Console.WriteLine("All native print bridge checks passed; no physical printer was used.");return 0;
  }catch(Exception error){Console.Error.WriteLine(error);return 1;}finally{try{Directory.Delete(root,true);}catch{}}}
 }
}
