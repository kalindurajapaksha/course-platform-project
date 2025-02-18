import ActionButton from "@/components/ActionButton";
import { SkeletonButton } from "@/components/Skeleton";
import { Button } from "@/components/ui/button";
import { LessonStatus } from "@/drizzle/schema";
import { updateLessonCompleteStatus } from "@/features/lessons/actions/userLessonComplete";
import YoutubeVideoPlayer from "@/features/lessons/components/YoutubeVideoPlayer";
import {
  getPublicLesson as getLesson,
  getNextPublicLesson,
  getPreviousPublicLesson,
} from "@/features/lessons/db/lessons";
import { getIsLessonComplete } from "@/features/lessons/db/userLessonComplete";
import { canViewLesson } from "@/features/lessons/permissions/lessons";
import { canUpdateUserLessonCompleteStatus } from "@/features/lessons/permissions/userLessonComplete";
import { getCurrentUser } from "@/services/clerk";
import { CheckSquare2Icon, LockIcon, XSquareIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReactNode, Suspense } from "react";

export default async function LessonsPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const lesson = await getLesson(lessonId);
  if (lesson == null) return notFound();

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SuspenseBoundary lesson={lesson} courseId={courseId} />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return null;
}

async function SuspenseBoundary({
  lesson,
  courseId,
}: {
  lesson: {
    id: string;
    youtubeVideoId: string;
    name: string;
    description: string | null;
    status: LessonStatus;
    sectionId: string;
    order: number;
  };
  courseId: string;
}) {
  const { userId, role } = await getCurrentUser();
  const isLessonComplete =
    userId == null
      ? false
      : await getIsLessonComplete({ lessonId: lesson.id, userId });
  const canView = await canViewLesson({ role, userId }, lesson);
  const canUpdateCompletionStatus = await canUpdateUserLessonCompleteStatus(
    { userId },
    lesson.id
  );

  return (
    <div className="my-4 flex flex-col gap-4">
      <div className="aspect-video">
        {canView ? (
          <YoutubeVideoPlayer
            videoId={lesson.youtubeVideoId}
            onFinishedVideo={
              !isLessonComplete && canUpdateCompletionStatus
                ? updateLessonCompleteStatus.bind(null, lesson.id, true)
                : undefined
            }
          />
        ) : (
          <div className="flex items-center justify-center bg-primary text-primary-foreground h-full w-full">
            <LockIcon className="size-16" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start gap-4">
          <h1 className="text-2xl font-semibold">{lesson.name}</h1>
          <div className="flex gap-2 justify-end">
            <Suspense fallback={<SkeletonButton />}>
              <ToLessonButton
                lesson={lesson}
                courseId={courseId}
                lessonFunc={getPreviousPublicLesson}
              >
                Previous
              </ToLessonButton>
            </Suspense>
            {canUpdateCompletionStatus && (
              <ActionButton
                action={updateLessonCompleteStatus.bind(
                  null,
                  lesson.id,
                  !isLessonComplete
                )}
                variant="outline"
              >
                <div className="flex gap-2 items-center">
                  {isLessonComplete ? (
                    <>
                      <CheckSquare2Icon /> Mark Incomplete
                    </>
                  ) : (
                    <>
                      <XSquareIcon /> Mark Complete
                    </>
                  )}
                </div>
              </ActionButton>
            )}
            <Suspense fallback={<SkeletonButton />}>
              <ToLessonButton
                lesson={lesson}
                courseId={courseId}
                lessonFunc={getNextPublicLesson}
              >
                Next
              </ToLessonButton>
            </Suspense>
          </div>
        </div>
        {canView ? (
          lesson.description && <p>{lesson.description}</p>
        ) : (
          <p>This lesson is locked. Please purchase the course to view it.</p>
        )}
      </div>
    </div>
  );
}

async function ToLessonButton({
  children,
  courseId,
  lessonFunc,
  lesson,
}: {
  children: ReactNode;
  courseId: string;
  lesson: {
    id: string;
    sectionId: string;
    order: number;
  };
  lessonFunc: (lesson: {
    id: string;
    sectionId: string;
    order: number;
  }) => Promise<{ id: string } | undefined>;
}) {
  const toLesson = await lessonFunc(lesson);
  if (toLesson == null) return null;

  return (
    <Button variant="outline" asChild>
      <Link href={`/courses/${courseId}/lessons/${toLesson.id}`}>
        {children}
      </Link>
    </Button>
  );
}
