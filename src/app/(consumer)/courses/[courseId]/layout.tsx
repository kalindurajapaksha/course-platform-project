import { getPublicCourseForLayout as getCourse } from "@/features/courses/db/courses";
import { getCompletedLessonIds } from "@/features/lessons/db/userLessonComplete";
import { getCurrentUser } from "@/services/clerk";
import { notFound } from "next/navigation";
import { ReactNode, Suspense } from "react";
import { CoursePageClient } from "./_client";

export default async function CoursesPageLayout({
  params,
  children,
}: {
  params: Promise<{ courseId: string }>;
  children: ReactNode;
}) {
  const { courseId } = await params;
  const course = await getCourse(courseId);

  if (course == null) return notFound();
  return (
    <div className="grid grid-cols-[300px,1fr] gap-8 container">
      <div className="py-4">
        <div className="text-lg font-semibold">{course.name}</div>
        <Suspense
          fallback={<CoursePageClient course={mapCourse(course, [])} />}
        >
          <SuspenseBoundary course={course} />
        </Suspense>
      </div>
      <div className="py-4">{children}</div>
    </div>
  );
}

async function SuspenseBoundary({
  course,
}: {
  course: {
    name: string;
    id: string;
    courseSections: {
      name: string;
      id: string;
      lessons: {
        name: string;
        id: string;
      }[];
    }[];
  };
}) {
  const { userId } = await getCurrentUser();
  const completedLessonIds =
    userId == null ? [] : await getCompletedLessonIds(userId);

  return <CoursePageClient course={mapCourse(course, completedLessonIds)} />;
}

function mapCourse(
  course: {
    name: string;
    id: string;
    courseSections: {
      name: string;
      id: string;
      lessons: {
        name: string;
        id: string;
      }[];
    }[];
  },
  completedLessonIds: string[]
) {
  return {
    ...course,
    courseSections: course.courseSections.map((section) => {
      return {
        ...section,
        lessons: section.lessons.map((lesson) => {
          return {
            ...lesson,
            isComplete: completedLessonIds.includes(lesson.id),
          };
        }),
      };
    }),
  };
}
