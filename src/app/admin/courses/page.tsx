import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import CourseTable from "@/features/courses/components/CourseTable";
import { getCoursesForCourseTable as getCourses } from "@/features/courses/db/courses";
import Link from "next/link";

export default async function CoursesPage() {
  const courses = await getCourses();
  return (
    <div className="container my-6">
      <PageHeader title="Courses">
        <Button asChild>
          <Link href="/admin/courses/new">New Course</Link>
        </Button>
      </PageHeader>
      <CourseTable courses={courses} />
    </div>
  );
}
