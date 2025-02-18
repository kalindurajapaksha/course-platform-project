import { db } from "@/drizzle/db";
import { CourseSectionTable, LessonTable } from "@/drizzle/schema";
import { and, asc, desc, eq, gt, lt, or } from "drizzle-orm";
import { getLessonIdTag, revalidateLessonCache } from "./cache/lessons";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import { wherePublicCourseSections } from "@/features/courseSections/db/sections";

export const wherePublicLessons = or(
  eq(LessonTable.status, "public"),
  eq(LessonTable.status, "preview")
);

export async function getNextLessonOrder(sectionId: string) {
  const lesson = await db.query.LessonTable.findFirst({
    columns: { order: true },
    where: eq(LessonTable.sectionId, sectionId),
    orderBy: desc(LessonTable.order),
  });

  return lesson ? lesson.order + 1 : 0;
}

export async function getPublicLesson(id: string) {
  "use cache";
  cacheTag(getLessonIdTag(id));

  return db.query.LessonTable.findFirst({
    columns: {
      id: true,
      youtubeVideoId: true,
      name: true,
      description: true,
      status: true,
      sectionId: true,
      order: true,
    },
    where: and(eq(LessonTable.id, id), wherePublicLessons),
  });
}

export async function getPreviousPublicLesson(lesson: {
  id: string;
  sectionId: string;
  order: number;
}) {
  let previousLesson = await db.query.LessonTable.findFirst({
    where: and(
      lt(LessonTable.order, lesson.order),
      eq(LessonTable.sectionId, lesson.sectionId),
      wherePublicLessons
    ),
    orderBy: desc(LessonTable.order),
    columns: { id: true },
  });

  if (previousLesson == null) {
    const section = await db.query.CourseSectionTable.findFirst({
      where: eq(CourseSectionTable.id, lesson.sectionId),
      columns: { order: true, courseId: true },
    });

    if (section == null) return;

    const previousSection = await db.query.CourseSectionTable.findFirst({
      where: and(
        lt(CourseSectionTable.order, section.order),
        eq(CourseSectionTable.courseId, section.courseId),
        wherePublicCourseSections
      ),
      orderBy: desc(CourseSectionTable.order),
      columns: { id: true },
    });

    if (previousSection == null) return;

    previousLesson = await db.query.LessonTable.findFirst({
      where: and(
        eq(LessonTable.sectionId, previousSection.id),
        wherePublicLessons
      ),
      orderBy: desc(LessonTable.order),
      columns: { id: true },
    });
  }

  return previousLesson;
}

export async function getNextPublicLesson(lesson: {
  id: string;
  sectionId: string;
  order: number;
}) {
  let nextLesson = await db.query.LessonTable.findFirst({
    where: and(
      gt(LessonTable.order, lesson.order),
      eq(LessonTable.sectionId, lesson.sectionId),
      wherePublicLessons
    ),
    orderBy: asc(LessonTable.order),
    columns: { id: true },
  });

  if (nextLesson == null) {
    const section = await db.query.CourseSectionTable.findFirst({
      where: eq(CourseSectionTable.id, lesson.sectionId),
      columns: { order: true, courseId: true },
    });

    if (section == null) return;

    const nextSection = await db.query.CourseSectionTable.findFirst({
      where: and(
        gt(CourseSectionTable.order, section.order),
        eq(CourseSectionTable.courseId, section.courseId),
        wherePublicCourseSections
      ),
      orderBy: asc(CourseSectionTable.order),
      columns: { id: true },
    });

    if (nextSection == null) return;

    nextLesson = await db.query.LessonTable.findFirst({
      where: and(eq(LessonTable.sectionId, nextSection.id), wherePublicLessons),
      orderBy: asc(LessonTable.order),
      columns: { id: true },
    });
  }

  return nextLesson;
}

export async function insertLesson(data: typeof LessonTable.$inferInsert) {
  const [newLesson, courseId] = await db.transaction(async (trx) => {
    const [[newLesson], section] = await Promise.all([
      trx.insert(LessonTable).values(data).returning(),
      trx.query.CourseSectionTable.findFirst({
        columns: { courseId: true },
        where: eq(CourseSectionTable.id, data.sectionId),
      }),
    ]);

    if (section == null) return trx.rollback();

    return [newLesson, section.courseId];
  });

  if (newLesson == null) throw new Error("Failed to create lesson");

  revalidateLessonCache({ id: newLesson.id, courseId });

  return newLesson;
}

export async function updateLesson(
  id: string,
  data: Partial<typeof LessonTable.$inferInsert>
) {
  const [updatedLesson, courseId] = await db.transaction(async (trx) => {
    const currentLesson = await trx.query.LessonTable.findFirst({
      columns: { sectionId: true },
      where: eq(LessonTable.id, id),
    });

    if (
      data.sectionId != null &&
      data.sectionId !== currentLesson?.sectionId &&
      data.order == null
    ) {
      data.order = await getNextLessonOrder(data.sectionId);
    }

    const [updatedLesson] = await trx
      .update(LessonTable)
      .set(data)
      .where(eq(LessonTable.id, id))
      .returning();

    if (updatedLesson == null) {
      trx.rollback();
      throw new Error("Failed to update section");
    }

    const section = await trx.query.CourseSectionTable.findFirst({
      columns: { courseId: true },
      where: eq(CourseSectionTable.id, updatedLesson.sectionId),
    });

    if (section == null) return trx.rollback();

    return [updatedLesson, section.courseId];
  });

  revalidateLessonCache({
    id: updatedLesson.id,
    courseId,
  });

  return updatedLesson;
}

export async function deleteLesson(id: string) {
  const [deletedLesson, courseId] = await db.transaction(async (trx) => {
    const [deletedLesson] = await trx
      .delete(LessonTable)
      .where(eq(LessonTable.id, id))
      .returning();

    if (deletedLesson == null) {
      trx.rollback();
      throw new Error("Failed to delete lesson");
    }
    const section = await trx.query.CourseSectionTable.findFirst({
      columns: { courseId: true },
      where: eq(CourseSectionTable.id, deletedLesson.id),
    });

    if (section == null) return trx.rollback();

    return [deletedLesson, section.courseId];
  });

  revalidateLessonCache({
    id: deletedLesson.id,
    courseId,
  });

  return deletedLesson;
}

export async function updateLessonOrders(lessonIds: string[]) {
  const [lessons, courseId] = await db.transaction(async (trx) => {
    const lessons = await Promise.all(
      lessonIds.map((id, index) =>
        trx
          .update(LessonTable)
          .set({ order: index })
          .where(eq(LessonTable.id, id))
          .returning({
            sectionId: LessonTable.sectionId,
            id: LessonTable.id,
          })
      )
    );
    const sectionId = lessons[0]?.[0]?.sectionId;
    if (sectionId == null) return trx.rollback();
    const section = await trx.query.CourseSectionTable.findFirst({
      columns: { courseId: true },
      where: eq(CourseSectionTable.id, sectionId),
    });
    if (section == null) return trx.rollback();
    return [lessons, section.courseId];
  });

  lessons.flat().forEach(({ id }) => {
    revalidateLessonCache({ id, courseId });
  });
}
