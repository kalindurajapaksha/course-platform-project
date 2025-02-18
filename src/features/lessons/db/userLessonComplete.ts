import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import {
  getUserLessonCompleteIdTag,
  getUserLessonCompleteUserTag,
  revalidateUserLessonCompleteCache,
} from "./cache/userLessonComplete";
import { db } from "@/drizzle/db";
import { and, eq } from "drizzle-orm";
import { UserLessonCompleteTable } from "@/drizzle/schema";

export async function getCompletedLessonIds(userId: string) {
  "use cache";
  cacheTag(getUserLessonCompleteUserTag(userId));

  const data = await db.query.UserLessonCompleteTable.findMany({
    columns: { lessonId: true },
    where: eq(UserLessonCompleteTable.userId, userId),
  });

  return data.map((d) => d.lessonId);
}

export async function getIsLessonComplete({
  userId,
  lessonId,
}: {
  userId: string;
  lessonId: string;
}) {
  "use cache";
  cacheTag(getUserLessonCompleteIdTag({ userId, lessonId }));

  const data = await db.query.UserLessonCompleteTable.findFirst({
    where: and(
      eq(UserLessonCompleteTable.userId, userId),
      eq(UserLessonCompleteTable.lessonId, lessonId)
    ),
  });

  return data != null;
}

export async function updateLessonCompleteStatus({
  lessonId,
  userId,
  complete,
}: {
  lessonId: string;
  userId: string;
  complete: boolean;
}) {
  let completion: { lessonId: string; userId: string } | undefined;
  if (complete) {
    const [c] = await db
      .insert(UserLessonCompleteTable)
      .values({
        lessonId,
        userId,
      })
      .onConflictDoNothing()
      .returning();
    completion = c;
  } else {
    const [c] = await db
      .delete(UserLessonCompleteTable)
      .where(
        and(
          eq(UserLessonCompleteTable.lessonId, lessonId),
          eq(UserLessonCompleteTable.userId, userId)
        )
      )
      .returning();
    completion = c;
  }

  if (completion == null) return;

  revalidateUserLessonCompleteCache({
    lessonId: completion.lessonId,
    userId: completion.userId,
  });

  return completion;
}
