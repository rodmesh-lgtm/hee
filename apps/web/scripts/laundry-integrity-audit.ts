import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
if(process.env.APP_ENV!=="test"||process.env.ALLOW_LAUNDRY_INTEGRITY_AUDIT!=="true")throw new Error("Laundry integrity audit requires explicit disposable test runtime");
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1});
async function main(){
const client=await pool.connect();
const user=randomUUID(),business=randomUUID(),journal=randomUUID();
try{
 await client.query("BEGIN");
 await client.query('INSERT INTO "User" (id,name,email,"createdAt","updatedAt") VALUES ($1,\'Laundry audit\',$2,now(),now())',[user,`${user}@hee.test`]);
 await client.query('INSERT INTO "Business" (id,"ownerId",name,slug,"businessType","createdAt","updatedAt") VALUES ($1,$2,\'Laundry audit\',$1,\'audit\',now(),now())',[business,user]);
 await client.query('INSERT INTO "LaundryBook" ("businessId","createdBy") VALUES ($1,$2)',[business,user]);
 await client.query('INSERT INTO "LaundryAccount" ("businessId",code,name,kind) VALUES ($1,\'1100\',\'Cash\',\'asset\'),($1,\'3000\',\'Opening\',\'equity\')',[business]);
 const header=async(id:string,n:number)=>client.query('INSERT INTO "LaundryJournal" (id,"businessId",number,"sourceKey",description,"effectiveAt","createdBy") VALUES ($1,$2,$3,$1,\'Audit\',now(),$4)',[id,business,n,user]);
 await client.query("SAVEPOINT missing_lines");
 await header(randomUUID(),99);
 await assert.rejects(()=>client.query("SET CONSTRAINTS laundry_journal_header_balance IMMEDIATE"),/LAUNDRY_JOURNAL_UNBALANCED/);
 await client.query("ROLLBACK TO SAVEPOINT missing_lines");
 await client.query("RELEASE SAVEPOINT missing_lines");
 await header(journal,1);
 await client.query('INSERT INTO "LaundryJournalLine" (id,"businessId","journalId","accountCode",debit,credit) VALUES ($1,$2,$3,\'1100\',100,0),($4,$2,$3,\'3000\',0,100)',[randomUUID(),business,journal,randomUUID()]);
 await client.query("SET CONSTRAINTS laundry_journal_header_balance, laundry_journal_lines_balance IMMEDIATE");
 await client.query("SET CONSTRAINTS laundry_journal_header_balance, laundry_journal_lines_balance DEFERRED");
 await client.query("SAVEPOINT immutable");
 await assert.rejects(()=>client.query('UPDATE "LaundryJournal" SET description=\'Edited\' WHERE id=$1',[journal]),/LAUNDRY_POSTED_JOURNAL_IMMUTABLE/);
 await client.query("ROLLBACK TO SAVEPOINT immutable");
 await client.query("RELEASE SAVEPOINT immutable");
 await client.query("SAVEPOINT deleted_line");
 await client.query('DELETE FROM "LaundryJournalLine" WHERE "journalId"=$1 AND debit>0',[journal]);
 await assert.rejects(()=>client.query("SET CONSTRAINTS laundry_journal_lines_balance IMMEDIATE"),/LAUNDRY_JOURNAL_UNBALANCED/);
 await client.query("ROLLBACK TO SAVEPOINT deleted_line");
 await client.query("RELEASE SAVEPOINT deleted_line");
 // Prove the PostgreSQL driver sees the deferred COMMIT error and rolls back
 // the complete transaction, independent of ORM commit-result handling.
 await header(randomUUID(),2);
 await assert.rejects(()=>client.query("COMMIT"),/LAUNDRY_JOURNAL_UNBALANCED/);
 assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM "Business" WHERE id=$1',[business])).rows[0].n,0);
 console.log("laundry-integrity: PASS balanced posting, immutable journal, missing/deleted lines, deferred COMMIT rollback");
}finally{await client.query("ROLLBACK");client.release();}
}
main().catch(error=>{console.error("laundry-integrity: FAIL",error);process.exitCode=1;}).finally(()=>pool.end());
