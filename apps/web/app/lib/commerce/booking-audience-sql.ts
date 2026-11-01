import { Prisma } from "@prisma/client";

/** Business alias b is the row locked by the final booking INSERT transaction. */
export const bookingAudienceSql = Prisma.sql`COALESCE((
  SELECT item #>> '{config,bookingAudience}'
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(b."pageModules") = 'array'
    THEN b."pageModules" ELSE '[]'::jsonb END) WITH ORDINALITY AS modules(item, ordinal)
  WHERE item ->> 'id' = 'contact'
  ORDER BY ordinal DESC LIMIT 1
), 'legacy')`;
