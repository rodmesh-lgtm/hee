import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth';
import { getActiveBusinessForUser } from '../../../lib/active-business';
import { db } from '../../../lib/db';
import { validateReportPeriod } from '../../../lib/retail-analytics/shopify-report';
import { consumePublicWriteLimit } from '../../../lib/rate-limit';
export const dynamic = 'force-dynamic';
const reply = (data: unknown, status=200) => NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store',Vary:'Cookie'}});
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return reply({error:'UNAUTHENTICATED'},401);
    const business = await getActiveBusinessForUser(user.id,'businessAnalytics');
    const params = new URL(request.url).searchParams;
    if (!business || params.get('businessId') !== business.id) return reply({error:'WORKSPACE_CHANGED'},403);
    const from=params.get('from')??'', until=params.get('until')??'';
    validateReportPeriod({from,until});
    const limit=await consumePublicWriteLimit({scope:'retail.branches.read',businessId:business.id,identity:user.id,limit:10,windowSeconds:60});
    if (!limit.allowed) return reply({error:'RATE_LIMITED'},429);
    // Aggregate in the database, without loading names, phones or individual appointments.
    const [branches,counts] = await db.$transaction([
      db.branch.findMany({where:{businessId:business.id},select:{id:true,name:true,isActive:true},orderBy:[{sortOrder:'asc'},{id:'asc'}]}),
      db.booking.groupBy({by:['branchId','status'],orderBy:[{branchId:'asc'},{status:'asc'}],where:{businessId:business.id,bookingDate:{gte:from,lte:until}},_count:{_all:true}}),
    ]);
    const current=await getActiveBusinessForUser(user.id,'businessAnalytics');
    if (!current || current.id !== business.id) return reply({error:'WORKSPACE_CHANGED'},403);
    const countOf=(row:typeof counts[number])=>{if(!row._count||typeof row._count!=='object'||typeof row._count._all!=='number')throw new Error('INVALID_AGGREGATE');return row._count._all;};
    const rows=branches.map(branch=>({id:branch.id,name:branch.name,active:branch.isActive,counts:Object.fromEntries(counts.filter(c=>c.branchId===branch.id).map(c=>[c.status,countOf(c)]))}));
    const ids=new Set(branches.map(b=>b.id));
    return reply({businessId:business.id,from,until,fetchedAt:new Date().toISOString(),rows,unassigned:counts.filter(c=>!c.branchId||!ids.has(c.branchId)).reduce((sum,c)=>sum+countOf(c),0)});
  } catch(error) { return reply({error:error instanceof Error&&error.message==='INVALID_PERIOD'?'INVALID_PERIOD':'REPORT_UNAVAILABLE'},error instanceof Error&&error.message==='INVALID_PERIOD'?400:503); }
}
