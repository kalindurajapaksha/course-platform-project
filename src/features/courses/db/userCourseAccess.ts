import { db } from "@/drizzle/db";
import { UserCourseAccessTable } from "@/drizzle/schema";
import { revalidateUserCourseAccessCache } from "./cache/userCourseAccess";

export async function insertUserCourseAccess(
  data: (typeof UserCourseAccessTable.$inferInsert)[],
  trx: Omit<typeof db, "$client"> = db
) {
  const accesses = await trx
    .insert(UserCourseAccessTable)
    .values(data)
    .onConflictDoNothing()
    .returning();

  accesses.forEach(revalidateUserCourseAccessCache);
  return accesses;
}
