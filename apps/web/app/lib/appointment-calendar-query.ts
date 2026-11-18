import { Prisma } from "@prisma/client";
import { appointmentSearchPattern } from "./appointment-board";
import { calendarWindow, type CalendarView } from "./appointment-calendar";

export type CalendarRow = {
  day: string; id: string; status: string; bookingDate: string; bookingTime: string;
  startsAt: Date; endsAt: Date; customerName: string; customerPhone: string;
  serviceName: string | null; branchName: string | null; position: number;
};
export type CalendarCount = { day: string; count: number; observedAt: Date };
export function appointmentCalendarQueries(input: {
  businessId: string; date: string; view: CalendarView; branchId: string;
  validBranch: boolean; search: string; status: string; page: number;
}) {
  const window = calendarWindow(input.date, input.view);
  const limit = input.view === "week" ? 10 : 25;
  const offset = input.view === "week" ? 0 : (input.page - 1) * limit;
  const branch = !input.validBranch ? Prisma.sql`AND false` : input.branchId === "main" ? Prisma.sql`AND b."branchId" IS NULL` : input.branchId ? Prisma.sql`AND b."branchId" = ${input.branchId}` : Prisma.empty;
  const search = input.search ? Prisma.sql`AND (c."name" ILIKE ${appointmentSearchPattern(input.search)} OR c."phone" ILIKE ${appointmentSearchPattern(input.search)})` : Prisma.empty;
  const status = input.status ? Prisma.sql`AND b."status" = ${input.status}` : Prisma.empty;
  const base = Prisma.sql`WITH visits AS (
    SELECT b."id", b."status", b."bookingDate", b."bookingTime",
      ((b."bookingDate" || ' ' || b."bookingTime")::timestamp AT TIME ZONE 'Asia/Riyadh') AS "startsAt",
      ((b."bookingDate" || ' ' || b."bookingTime")::timestamp AT TIME ZONE 'Asia/Riyadh')
        + make_interval(mins => COALESCE(snapshot."durationMinutes", CASE WHEN s."durationMinutes" BETWEEN 5 AND 1440 THEN s."durationMinutes" ELSE 30 END)) AS "endsAt",
      c."name" AS "customerName", c."phone" AS "customerPhone", s."name" AS "serviceName", branch."name" AS "branchName"
    FROM "Booking" b
    JOIN "Customer" c ON c."id" = b."customerId" AND c."businessId" = b."businessId"
    LEFT JOIN "Service" s ON s."id" = b."serviceId" AND s."businessId" = b."businessId"
    LEFT JOIN "Branch" branch ON branch."id" = b."branchId" AND branch."businessId" = b."businessId"
    LEFT JOIN "BookingDurationSnapshot" snapshot ON snapshot."bookingId" = b."id"
    WHERE b."businessId" = ${input.businessId}
      AND b."bookingDate" >= ${shiftPreviousDay(window.start)} AND b."bookingDate" < ${window.end}
      ${branch} ${search} ${status}
  ), days AS (
    SELECT ${window.start}::date + n AS day FROM generate_series(0, ${window.days.length - 1}) n
  ), visible AS (
    SELECT to_char(days.day, 'YYYY-MM-DD') AS day, visits.*,
      (row_number() OVER (PARTITION BY days.day ORDER BY "startsAt", "id"))::int AS position
    FROM days JOIN visits ON "startsAt" < ((days.day + 1)::timestamp AT TIME ZONE 'Asia/Riyadh')
      AND "endsAt" > (days.day::timestamp AT TIME ZONE 'Asia/Riyadh')
  )`;
  return {
    limit,
    rows: Prisma.sql`${base} SELECT * FROM visible WHERE position > ${offset} AND position <= ${offset + limit} ORDER BY day, position`,
    counts: Prisma.sql`${base} SELECT day, COUNT(*)::int AS count, CURRENT_TIMESTAMP AS "observedAt" FROM visible GROUP BY day ORDER BY day`,
  };
}
function shiftPreviousDay(date: string) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}
