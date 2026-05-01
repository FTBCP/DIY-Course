import { useState, useEffect, useCallback, useRef } from "react";
import CourseSidebar from "../components/CourseSidebar";
import LessonContent from "../components/LessonContent";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Menu } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function CoursePlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [completedLessonIds, setCompletedLessonIds] = useState(new Set());
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [lessonError, setLessonError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [backgroundGeneratingIds, setBackgroundGeneratingIds] = useState(new Set());
  const [failedLessonIds, setFailedLessonIds] = useState(new Set());

  const generatingRef = useRef(new Set());
  const lessonsRef = useRef([]);
  const failedLessonIdsRef = useRef(new Set());

  // Keep refs current so callbacks always read fresh state
  lessonsRef.current = lessons;
  failedLessonIdsRef.current = failedLessonIds;

  // ── Background generator — skips failed lessons, chains until all done ──
  const generateNextInBackground = useCallback(() => {
    const next = lessonsRef.current.find(
      l => l.body === null && !generatingRef.current.has(l.id) && !failedLessonIdsRef.current.has(l.id)
    );
    if (!next) return;

    const lessonId = next.id;
    generatingRef.current.add(lessonId);
    setBackgroundGeneratingIds(prev => new Set([...prev, lessonId]));

    supabase.functions.invoke('generate-lesson', { body: { lesson_id: lessonId } })
      .then(({ data, error }) => {
        generatingRef.current.delete(lessonId);
        setBackgroundGeneratingIds(prev => { const s = new Set(prev); s.delete(lessonId); return s; });
        if (!error && data?.success) {
          setLessons(prev => prev.map(l =>
            l.id === lessonId
              ? { ...l, body: data.body, citations: data.citations || [], video_url: data.video_url, quiz_questions: data.quiz_questions || [], input_tokens: data.lesson_input_tokens || 0, output_tokens: data.lesson_output_tokens || 0 }
              : l
          ));
          if (data.course_input_tokens !== undefined) {
            setCourse(prev => ({ ...prev, input_tokens: data.course_input_tokens, output_tokens: data.course_output_tokens }));
          }
        } else {
          setFailedLessonIds(prev => new Set([...prev, lessonId]));
        }
        setTimeout(generateNextInBackground, 500);
      });
  }, []);

  // ── On-demand generator — used for the active lesson and "Try again" ──
  const generateActiveLesson = useCallback((lessonId) => {
    if (generatingRef.current.has(lessonId)) return;
    generatingRef.current.add(lessonId);
    setIsGeneratingLesson(true);
    setLessonError(null);
    setFailedLessonIds(prev => { const s = new Set(prev); s.delete(lessonId); return s; });

    const timeoutId = setTimeout(() => {
      setIsGeneratingLesson(false);
      setLessonError("This lesson is taking too long to generate. Please try again.");
      generatingRef.current.delete(lessonId);
      setFailedLessonIds(prev => new Set([...prev, lessonId]));
    }, 90000);

    supabase.functions.invoke('generate-lesson', { body: { lesson_id: lessonId } })
      .then(({ data, error }) => {
        clearTimeout(timeoutId);
        if (error || !data?.success) {
          setLessonError(data?.error || error?.message || "Failed to generate lesson. Please try again.");
          generatingRef.current.delete(lessonId);
          setFailedLessonIds(prev => new Set([...prev, lessonId]));
        } else {
          setLessons(prev => prev.map(l =>
            l.id === lessonId
              ? { ...l, body: data.body, citations: data.citations || [], video_url: data.video_url, quiz_questions: data.quiz_questions || [], input_tokens: data.lesson_input_tokens || 0, output_tokens: data.lesson_output_tokens || 0 }
              : l
          ));
          if (data.course_input_tokens !== undefined) {
            setCourse(prev => ({ ...prev, input_tokens: data.course_input_tokens, output_tokens: data.course_output_tokens }));
          }
          setTimeout(generateNextInBackground, 500);
        }
        setIsGeneratingLesson(false);
      });
  }, [generateNextInBackground]);

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

      // Restore any previously failed lessons so the sidebar shows them correctly
      const previouslyFailed = new Set(loadedLessons.filter(l => l.generation_failed).map(l => l.id));
      if (previouslyFailed.size > 0) setFailedLessonIds(previouslyFailed);

      if (user && loadedLessons.length > 0) {
        const lessonIds = loadedLessons.map(l => l.id);

        const { data: progressData } = await supabase
          .from('progress')
          .select('lesson_id, completed_at, last_viewed_at')
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds);

        if (progressData && progressData.length > 0) {
          const completed = new Set(
            progressData.filter(p => p.completed_at).map(p => p.lesson_id)
          );
          setCompletedLessonIds(completed);

          const sorted = [...progressData].sort(
            (a, b) => new Date(b.last_viewed_at) - new Date(a.last_viewed_at)
          );
          const lastViewedId = sorted[0].lesson_id;
          const lastIdx = loadedLessons.findIndex(l => l.id === lastViewedId);

          if (lastIdx !== -1) {
            const advance = completed.has(lastViewedId) && lastIdx < loadedLessons.length - 1;
            setActiveLessonIdx(advance ? lastIdx + 1 : lastIdx);
          }
        }
      }

      setLoading(false);
    }

    loadCourse();
  }, [id]);

  // ── Auto-generate lesson content when the active lesson has no body ──
  useEffect(() => {
    const activeLesson = lessons[activeLessonIdx];
    if (!activeLesson || activeLesson.body !== null) return;
    if (generatingRef.current.has(activeLesson.id)) return;
    if (failedLessonIds.has(activeLesson.id)) return;
    generateActiveLesson(activeLesson.id);
  }, [activeLessonIdx, lessons]);

  // ── Scroll to top on navigation ──────────────────────────────────
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeLessonIdx]);

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
      if (activeLessonIdx < lessons.length - 1) {
        setActiveLessonIdx(activeLessonIdx + 1);
      }
    }
  }, [userId, lessons, activeLessonIdx]);

  // ── Save quiz result to progress row ─────────────────────────────
  const handleQuizComplete = useCallback(async ({ correct, total }) => {
    if (!userId || lessons.length === 0) return;
    const lesson = lessons[activeLessonIdx];
    if (!lesson) return;
    await supabase.from('progress').upsert(
      {
        user_id: userId,
        lesson_id: lesson.id,
        last_viewed_at: new Date().toISOString(),
        quiz_results: { correct, total, completed_at: new Date().toISOString() },
      },
      { onConflict: 'user_id,lesson_id' }
    );
  }, [userId, lessons, activeLessonIdx]);

  // ── Navigation ────────────────────────────────────────────────────
  const goPrev = () => { if (activeLessonIdx > 0) setActiveLessonIdx(activeLessonIdx - 1); };
  const goNext = () => { if (activeLessonIdx < lessons.length - 1) setActiveLessonIdx(activeLessonIdx + 1); };

  const handleSelectLesson = (idx) => {
    const lesson = lessons[idx];
    // Clear failed state when user explicitly clicks a lesson — allows retry
    if (lesson && lesson.body === null) {
      setFailedLessonIds(prev => { const s = new Set(prev); s.delete(lesson.id); return s; });
    }
    setActiveLessonIdx(idx);
    setSidebarOpen(false);
  };

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
      inputTokens: l.input_tokens || 0,
      outputTokens: l.output_tokens || 0,
      backgroundGenerating: backgroundGeneratingIds.has(l.id),
      failed: failedLessonIds.has(l.id),
    }))
  }];

  const completedCount = completedLessonIds.size;
  const activeLesson = lessons[activeLessonIdx];
  const backgroundGeneratingCount = backgroundGeneratingIds.size;

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
    <div className="min-h-screen bg-[#F5F1E8]">

      {/* ── Mobile topbar (hidden on desktop) ── */}
      <div className="lg:hidden flex items-center justify-between px-4 h-12 bg-[#1A1614] border-b border-[#2A2420]">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-[#8B6F4E] hover:text-[#F5F1E8] transition-colors p-1"
          aria-label="Open lesson menu"
        >
          <Menu size={20} />
        </button>
        <span className="font-serif text-sm text-[#F5F1E8] truncate max-w-[200px] px-3">
          {course.title}
        </span>
        <Link
          to="/"
          className="text-[#8B6F4E] hover:text-[#F5F1E8] transition-colors p-1"
          aria-label="Back to home"
        >
          <ArrowLeft size={20} />
        </Link>
      </div>

      <div className="lg:grid lg:grid-cols-[300px_1fr] lg:min-h-screen">

        {/* ── Sidebar ── */}
        {/* Desktop: normal left column. Mobile: fixed overlay when sidebarOpen */}
        <div className={`
          fixed inset-0 z-50
          lg:relative lg:inset-auto lg:z-auto lg:block
          ${sidebarOpen ? 'block' : 'hidden lg:block'}
        `}>
          {/* Backdrop — mobile only */}
          <div
            className="absolute inset-0 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Panel */}
          <div className="relative w-[300px] h-full lg:h-auto">
            <Link
              to="/"
              className="hidden lg:block absolute top-4 left-4 z-10 text-[#8B6F4E] hover:text-[#F5F1E8] transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <CourseSidebar
              courseTitle={course.title}
              progress={completedCount}
              total={lessons.length}
              lessons={sidebarModules}
              activeLessonIdx={activeLessonIdx}
              setActiveLessonIdx={handleSelectLesson}
              inputTokens={course.input_tokens || 0}
              outputTokens={course.output_tokens || 0}
              backgroundGeneratingCount={backgroundGeneratingCount}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="overflow-y-auto">
          {activeLesson ? (
            isGeneratingLesson || activeLesson.body === null ? (
              <div className="flex flex-col items-center justify-center min-h-[80vh] py-16 px-8">
                <div className="w-8 h-8 rounded-full border-2 border-[#E0D5C0] border-t-[#C4553F] animate-spin mb-6" />
                <p className="font-serif text-[22px] text-[#1A1614] mb-2">
                  Writing your lesson…
                </p>
                <p className="text-[14px] text-[#8B6F4E] font-sans">
                  Researching sources. Usually takes 15–20 seconds.
                </p>
                {lessonError && (
                  <p className="mt-6 text-[14px] text-[#C4553F] text-center max-w-[400px]">
                    {lessonError}
                  </p>
                )}
              </div>
            ) : lessonError ? (
              <div className="flex flex-col items-center justify-center min-h-[80vh] py-16 px-8">
                <p className="font-serif text-[22px] text-[#C4553F] mb-4">
                  Couldn't generate this lesson
                </p>
                <p className="text-[14px] text-[#5C4A3A] font-sans max-w-[400px] text-center mb-6">
                  {lessonError}
                </p>
                <button
                  onClick={() => generateActiveLesson(activeLesson.id)}
                  className="bg-[#1A1614] text-[#F5F1E8] border-none py-3 px-6 text-[14px] font-medium rounded cursor-pointer hover:bg-[#C4553F] transition-colors"
                >
                  Try again
                </button>
              </div>
            ) : (
              <LessonContent
                moduleName="Course Lessons"
                lessonNum={activeLessonIdx + 1}
                lessonTitle={activeLesson.title}
                body={activeLesson.body}
                videoUrl={activeLesson.video_url}
                citations={activeLesson.citations}
                quizQuestions={activeLesson.quiz_questions || []}
                onQuizComplete={handleQuizComplete}
                isComplete={completedLessonIds.has(activeLesson.id)}
                onMarkComplete={handleMarkComplete}
                onDone={() => setShowCompletion(true)}
                goPrev={activeLessonIdx > 0 ? goPrev : null}
                goNext={activeLessonIdx < lessons.length - 1 ? goNext : null}
                inputTokens={activeLesson.input_tokens || 0}
                outputTokens={activeLesson.output_tokens || 0}
              />
            )
          ) : (
            <div className="p-[60px] max-w-[700px] mx-auto text-[#1A1614] font-serif">
              No lessons generated yet.
            </div>
          )}
        </div>

      </div>

      {/* ── Course completion overlay ── */}
      {showCompletion && (
        <div className="fixed inset-0 z-50 bg-[#F5F1E8] flex flex-col items-center justify-center p-8 overflow-y-auto">
          <div className="max-w-[520px] w-full text-center">
            <div className="w-14 h-14 bg-[#5C7A3A] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="22" height="17" viewBox="0 0 22 17" fill="none">
                <path d="M1.5 9l7 7L20.5 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-[11px] tracking-[0.18em] uppercase text-[#5C7A3A] font-semibold mb-3 font-sans">
              Course complete
            </div>
            <h1 className="font-serif text-[32px] lg:text-[40px] font-medium leading-tight tracking-[-0.02em] mb-8 text-[#1A1614]">
              {course.title}
            </h1>

            {course.outcomes && course.outcomes.length > 0 && (
              <div className="text-left mb-10 bg-white border border-[#E0D5C0] rounded-xl p-6">
                <div className="text-[11px] tracking-[0.15em] uppercase text-[#8B6F4E] font-semibold mb-4 font-sans">
                  What you covered
                </div>
                <ul className="space-y-3 list-none p-0 m-0">
                  {course.outcomes.map((outcome, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] text-[#2A2420] font-sans leading-snug">
                      <span className="text-[#5C7A3A] font-bold mt-0.5 shrink-0">✓</span>
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => navigate('/')}
              className="bg-[#1A1614] text-[#F5F1E8] border-none py-3.5 px-8 text-[15px] font-medium rounded cursor-pointer hover:bg-[#C4553F] transition-colors font-sans"
            >
              Back to My Courses →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
