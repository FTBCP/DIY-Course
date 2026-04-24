import { useState, useEffect, useCallback } from "react";
import CourseSidebar from "../components/CourseSidebar";
import LessonContent from "../components/LessonContent";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function CoursePlayer() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [completedLessonIds, setCompletedLessonIds] = useState(new Set());
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Load course, lessons, and existing progress ───────────────────
  useEffect(() => {
    async function loadCourse() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (courseError) {
        console.error(courseError);
        setLoading(false);
        return;
      }
      setCourse(courseData);

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', id)
        .order('order', { ascending: true });

      if (lessonsError) {
        console.error(lessonsError);
        setLoading(false);
        return;
      }

      const loadedLessons = lessonsData || [];
      setLessons(loadedLessons);

      // ── Load progress records and resume ─────────────────────────
      if (user && loadedLessons.length > 0) {
        const lessonIds = loadedLessons.map(l => l.id);

        const { data: progressData } = await supabase
          .from('progress')
          .select('lesson_id, completed_at, last_viewed_at')
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds);

        if (progressData && progressData.length > 0) {
          // Build the set of completed lesson IDs
          const completed = new Set(
            progressData.filter(p => p.completed_at).map(p => p.lesson_id)
          );
          setCompletedLessonIds(completed);

          // Resume at the most recently viewed lesson
          const sorted = [...progressData].sort(
            (a, b) => new Date(b.last_viewed_at) - new Date(a.last_viewed_at)
          );
          const lastViewedId = sorted[0].lesson_id;
          const lastIdx = loadedLessons.findIndex(l => l.id === lastViewedId);

          if (lastIdx !== -1) {
            // If the last-viewed lesson is complete and there's a next one, advance
            const advance = completed.has(lastViewedId) && lastIdx < loadedLessons.length - 1;
            setActiveLessonIdx(advance ? lastIdx + 1 : lastIdx);
          }
        }
      }

      setLoading(false);
    }

    loadCourse();
  }, [id]);

  // ── Write last_viewed_at whenever the active lesson changes ───────
  useEffect(() => {
    if (!userId || lessons.length === 0) return;
    const lesson = lessons[activeLessonIdx];
    if (!lesson) return;

    supabase.from('progress').upsert(
      { user_id: userId, lesson_id: lesson.id, last_viewed_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    );
  }, [activeLessonIdx, userId, lessons]);

  // ── Mark current lesson complete, then advance ────────────────────
  const handleMarkComplete = useCallback(async () => {
    if (!userId || lessons.length === 0) return;
    const lesson = lessons[activeLessonIdx];
    if (!lesson) return;

    const { error } = await supabase.from('progress').upsert(
      {
        user_id: userId,
        lesson_id: lesson.id,
        completed_at: new Date().toISOString(),
        last_viewed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    );

    if (!error) {
      setCompletedLessonIds(prev => new Set([...prev, lesson.id]));
      // Advance to next lesson if available
      if (activeLessonIdx < lessons.length - 1) {
        setActiveLessonIdx(activeLessonIdx + 1);
      }
    }
  }, [userId, lessons, activeLessonIdx]);

  // ── Navigation ────────────────────────────────────────────────────
  const goPrev = () => { if (activeLessonIdx > 0) setActiveLessonIdx(activeLessonIdx - 1); };
  const goNext = () => { if (activeLessonIdx < lessons.length - 1) setActiveLessonIdx(activeLessonIdx + 1); };

  // ── Build sidebar data (flat — all lessons in one group for now) ──
  const sidebarModules = [{
    mod: "Course Lessons",
    items: lessons.map((l, idx) => ({
      id: l.id,
      t: l.title,
      flatIndex: idx,
      state: completedLessonIds.has(l.id)
        ? "complete"
        : idx === activeLessonIdx
          ? "current"
          : "upcoming",
    }))
  }];

  const completedCount = completedLessonIds.size;
  const activeLesson = lessons[activeLessonIdx];

  // ── Render ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center font-serif text-[#1A1614] text-lg">
        Loading course...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center font-serif text-[#C4553F] text-lg">
        Course not found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[300px_1fr] min-h-screen bg-[#F5F1E8]">
      <div className="relative">
        <Link to="/" className="absolute top-4 left-4 z-10 text-[#8B6F4E] hover:text-[#F5F1E8] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <CourseSidebar
          courseTitle={course.title}
          progress={completedCount}
          total={lessons.length}
          lessons={sidebarModules}
          activeLessonIdx={activeLessonIdx}
          setActiveLessonIdx={setActiveLessonIdx}
        />
      </div>
      <div className="overflow-y-auto">
        {activeLesson ? (
          <LessonContent
            moduleName="Course Lessons"
            lessonNum={activeLessonIdx + 1}
            lessonTitle={activeLesson.title}
            body={activeLesson.body}
            videoUrl={activeLesson.video_url}
            citations={activeLesson.citations}
            isComplete={completedLessonIds.has(activeLesson.id)}
            onMarkComplete={handleMarkComplete}
            goPrev={activeLessonIdx > 0 ? goPrev : null}
            goNext={activeLessonIdx < lessons.length - 1 ? goNext : null}
          />
        ) : (
          <div className="p-[60px] max-w-[700px] mx-auto text-[#1A1614] font-serif">
            No lessons generated yet.
          </div>
        )}
      </div>
    </div>
  );
}
