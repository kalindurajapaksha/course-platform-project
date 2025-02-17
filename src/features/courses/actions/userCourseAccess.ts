import { db } from "@/drizzle/db";
import { insertUserCourseAccess } from "../db/userCourseAccess";

export function addUserCourseAccess(
  {
    userId,
    courseIds,
  }: {
    userId: string;
    courseIds: string[];
  },
  trx: Omit<typeof db, "$client"> = db
) {
  const values = courseIds.map((courseId) => ({ userId, courseId }));
  return insertUserCourseAccess(values, trx);
}
