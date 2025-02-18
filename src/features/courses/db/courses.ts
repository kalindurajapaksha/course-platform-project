import { db } from "@/drizzle/db";
import {
  CourseSectionTable,
  CourseTable,
  LessonTable,
  UserCourseAccessTable,
  UserLessonCompleteTable,
} from "@/drizzle/schema";
import {
  getCourseSectionCourseTag,
  getCourseSectionGlobalTag,
} from "@/features/courseSections/db/cache/courseSections";
import { wherePublicCourseSections } from "@/features/courseSections/db/sections";
import {
  getLessonCourseTag,
  getLessonGlobalTag,
} from "@/features/lessons/db/cache/lessons";
import { getUserLessonCompleteUserTag } from "@/features/lessons/db/cache/userLessonComplete";
import { wherePublicLessons } from "@/features/lessons/db/lessons";
import { and, asc, countDistinct, eq } from "drizzle-orm";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import {
  getCourseGlobalTag,
  getCourseIdTag,
  revalidateCourseCache,
} from "./cache/courses";
import {
  getUserCourseAccessGlobalTag,
  getUserCourseAccessUserTag,
} from "./cache/userCourseAccess";

export async function getCoursesForCourseTable() {
  "use cache";
  cacheTag(
    getCourseGlobalTag(),
    getUserCourseAccessGlobalTag(),
    getCourseSectionGlobalTag(),
    getLessonGlobalTag()
  );
  return db
    .select({
      id: CourseTable.id,
      name: CourseTable.name,
      sectionCount: countDistinct(CourseSectionTable),
      lessonCount: countDistinct(LessonTable),
      studentCount: countDistinct(UserCourseAccessTable),
    })
    .from(CourseTable)
    .leftJoin(
      CourseSectionTable,
      eq(CourseSectionTable.courseId, CourseTable.id)
    )
    .leftJoin(LessonTable, eq(LessonTable.sectionId, CourseSectionTable.id))
    .leftJoin(
      UserCourseAccessTable,
      eq(UserCourseAccessTable.courseId, CourseTable.id)
    )
    .orderBy(asc(CourseTable.name))
    .groupBy(CourseTable.id);
}

export async function getCourseForCourseEdit(id: string) {
  "use cache";
  cacheTag(
    getCourseIdTag(id),
    getCourseSectionCourseTag(id),
    getLessonCourseTag(id)
  );

  return db.query.CourseTable.findFirst({
    columns: { id: true, name: true, description: true },
    where: eq(CourseTable.id, id),
    with: {
      courseSections: {
        orderBy: asc(CourseSectionTable.order),
        columns: { id: true, name: true, status: true },
        with: {
          lessons: {
            orderBy: asc(LessonTable.order),
            columns: {
              id: true,
              name: true,
              sectionId: true,
              description: true,
              status: true,
              youtubeVideoId: true,
            },
          },
        },
      },
    },
  });
}

export async function getCoursesForProducts() {
  "use cache";
  cacheTag(getCourseGlobalTag());

  return db.query.CourseTable.findMany({
    columns: { id: true, name: true },
    orderBy: asc(CourseTable.name),
  });
}

export async function getUserCourses(userId: string) {
  "use cache";
  cacheTag(
    getUserCourseAccessUserTag(userId),
    getUserLessonCompleteUserTag(userId)
  );

  const courses = await db
    .select({
      id: CourseTable.id,
      name: CourseTable.name,
      description: CourseTable.description,
      sectionsCount: countDistinct(CourseSectionTable.id),
      lessonsCount: countDistinct(LessonTable.id),
      lessonsComplete: countDistinct(UserLessonCompleteTable.lessonId),
    })
    .from(CourseTable)
    .leftJoin(
      UserCourseAccessTable,
      and(
        eq(UserCourseAccessTable.courseId, CourseTable.id),
        eq(UserCourseAccessTable.userId, userId)
      )
    )
    .leftJoin(
      CourseSectionTable,
      and(
        eq(CourseSectionTable.courseId, CourseTable.id),
        wherePublicCourseSections
      )
    )
    .leftJoin(
      LessonTable,
      and(eq(LessonTable.sectionId, CourseSectionTable.id), wherePublicLessons)
    )
    .leftJoin(
      UserLessonCompleteTable,
      and(
        eq(UserLessonCompleteTable.lessonId, LessonTable.id),
        eq(UserLessonCompleteTable.userId, userId)
      )
    )
    .orderBy(CourseTable.name)
    .groupBy(CourseTable.id);

  courses.forEach((course) => {
    cacheTag(
      getCourseIdTag(course.id),
      getCourseSectionCourseTag(course.id),
      getLessonCourseTag(course.id)
    );
  });

  return courses;
}

export async function getPublicBasicCourse(id: string) {
  "use cache";
  cacheTag(getCourseIdTag(id));

  return db.query.CourseTable.findFirst({
    columns: { id: true, name: true, description: true },
    where: eq(CourseTable.id, id),
  });
}

export async function getPublicCourseForLayout(id: string) {
  "use cache";
  cacheTag(
    getCourseIdTag(id),
    getCourseSectionCourseTag(id),
    getLessonCourseTag(id)
  );

  return db.query.CourseTable.findFirst({
    columns: { id: true, name: true },
    where: eq(CourseTable.id, id),
    with: {
      courseSections: {
        orderBy: asc(CourseSectionTable.order),
        where: wherePublicCourseSections,
        columns: { id: true, name: true },
        with: {
          lessons: {
            orderBy: asc(LessonTable.order),
            where: wherePublicLessons,
            columns: { id: true, name: true },
          },
        },
      },
    },
  });
}

export async function insertCourse(data: typeof CourseTable.$inferInsert) {
  const [newCourse] = await db.insert(CourseTable).values(data).returning();

  if (newCourse == null) throw new Error("Failed to create course");
  revalidateCourseCache(newCourse.id);
  return newCourse;
}

export async function updateCourse(
  id: string,
  data: typeof CourseTable.$inferInsert
) {
  const [updatedCourse] = await db
    .update(CourseTable)
    .set(data)
    .where(eq(CourseTable.id, id))
    .returning();

  if (updatedCourse == null) throw new Error("Failed to update course");
  revalidateCourseCache(updatedCourse.id);
  return updatedCourse;
}

export async function deleteCourse(id: string) {
  const [deletedCourse] = await db
    .delete(CourseTable)
    .where(eq(CourseTable.id, id))
    .returning();

  if (deletedCourse == null) throw new Error("Failed to delete course");
  revalidateCourseCache(deletedCourse.id);
  return deletedCourse;
}
