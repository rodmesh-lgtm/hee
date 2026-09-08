"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveBusinessForUser } from "../lib/active-business";
import { getCurrentUserForWrites } from "../lib/auth";
import { updateReminderExecutionContext, REMINDER_PRIORITIES, REMINDER_WORK_HEALTH, type ReminderPriority, type ReminderWorkHealth } from "../lib/reminders/execution-context";
import { isSmartRemindersSchemaReady } from "../lib/reminders/schema-readiness";

const bounded=(form:FormData,key:string,max:number)=>{const value=String(form.get(key)??"").normalize("NFKC").trim();return value&&value.length<=max?value:null;};
function dueAt(form:FormData){const raw=String(form.get("businessDueAt")??"").trim();if(!raw)return null;if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))throw new Error("REMINDER_EXECUTION_DUE_INVALID");const value=new Date(`${raw}T23:59:59.999Z`);if(Number.isNaN(value.getTime()))throw new Error("REMINDER_EXECUTION_DUE_INVALID");return value;}

export async function updateReminderExecutionContextAction(form:FormData){
  const user=await getCurrentUserForWrites();
  const business=await getActiveBusinessForUser(user.id);
  if(!business)redirect("/dashboard?business=required");
  if(!await isSmartRemindersSchemaReady())redirect("/dashboard/reminders?schema=pending");
  const reminderId=bounded(form,"reminderId",128);
  const workHealth=String(form.get("workHealth")??"") as ReminderWorkHealth;
  const priority=String(form.get("priority")??"") as ReminderPriority;
  const responsiblePerson=bounded(form,"responsiblePerson",160);
  const nextAction=bounded(form,"nextAction",1200);
  if(!reminderId||!REMINDER_WORK_HEALTH.includes(workHealth)||!REMINDER_PRIORITIES.includes(priority))redirect("/dashboard/reminders?execution=invalid");
  try{
    await updateReminderExecutionContext({businessId:business.id,actorUserId:user.id,reminderId,workHealth,priority,responsiblePerson,nextAction,businessDueAt:dueAt(form)});
    revalidatePath("/dashboard/reminders");revalidatePath("/dashboard/notes");
  }catch{redirect("/dashboard/reminders?execution=failed");}
  redirect("/dashboard/reminders?execution=success&tab=work");
}