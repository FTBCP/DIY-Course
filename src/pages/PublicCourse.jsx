import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Clock, PlayCircle, BookOpen, ExternalLink, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PublicCourse() {
  const { shareToken } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const readerRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      // Try public access first
      let courseData = null;
      const { data: publicData } = await supabase
        .from('courses')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_public', true)
        .single();

      if (publicData) {
        courseData = publicData;
        if (user && publicData.user_id === user.id) setIsOwner(true);
      } else if (user) {
        // Try owner access for private courses
        const { data: ownerData } = await supabase
          .from('courses')
          .select('*')
          .eq('share_token', shareToken)
          .single();
        if (ownerData && ownerData.user_id === user.id) {
          courseData = ownerData;
          setIsOwner(true);
        }
      }

      if (!courseData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCourse(courseData);

      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseData.id)
        .order('order', { ascending: true });

      setLessons(lessonsData || []);
      setLoading(false);
    }
    load();
  }, [shareToken]);

  const handleStartReading = () => {
    setShowReader(true);
    setTimeout(() => readerRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center font-serif text-[#1A1614] text-lg">
        Loading course…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-[32px] text-[#1A1614]">Course not found</h1>
        <p className="text-[#8B6F4E] font-sans text-[15px]">This course may have been made private or the link is incorrect.</p>
        <Link to="/signup" className="mt-2 bg-[#1A1614] text-[#F5F1E8] px-6 py-3 rounded font-sans text-[14px] font-medium hover:bg-[#C4553F] transition-colors">
          Create your own course →
        </Link>
      </div>
    );
  }

  const generatedLessons = lessons.filter(l => l.body);
  const videoCount = generatedLessons.filter(l => l.video_url).length;
  const citationCount = generatedLessons.reduce((sum, l) => sum + (l.citations?.length || 0), 0);
  const totalReadMins = Math.max(5, Math.round(lessons.length * 9 / 5) * 5);
  const outcomes = course.outcomes || [];

  const activeLesson = generatedLessons[activeLessonIdx];
  const htmlBody = activeLesson?.body ? DOMPurify.sanitize(marked.parse(activeLesson.body)) : '';
  const citations = activeLesson?.citations || [];
  const wordCount = activeLesson?.body ? activeLesson.body.split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="min-h-screen bg-[#F5F1E8]">

      {/* Header */}
      <header className="bg-[#1A1614] px-6 py-4 flex items-center justify-between">
        <div className="font-serif text-[#F5F1E8] text-[18px] italic">DIY Courses</div>
        {isOwner ? (
          <Link
            to={`/course/${course.id}`}
            className="text-[13px] font-sans font-medium text-[#F5F1E8] bg-[#C4553F] px-4 py-2 rounded hover:bg-[#A33D2A] transition-colors"
          >
            Open in course player →
          </Link>
        ) : (
          <Link
            to="/signup"
            className="text-[13px] font-sans font-medium text-[#F5F1E8] bg-[#C4553F] px-4 py-2 rounded hover:bg-[#A33D2A] transition-colors"
          >
            Create your own →
          </Link>
        )}
      </header>

      {/* Hero */}
      <div className="bg-[#1A1614] px-6 pb-16 pt-14 text-center">
        <div className="text-[11px] tracking-[0.18em] uppercase text-[#8B6F4E] font-semibold mb-5 font-sans">
          {isOwner && !course.is_public ? 'Your course (private)' : 'Free course'}
        </div>
        <h1 className="font-serif text-[clamp(34px,5vw,56px)] font-medium text-[#F5F1E8] leading-[1.08] letter-spacing-[-0.02em] max-w-[760px] mx-auto mb-5">
          {course.title}
        </h1>
        <p className="text-[17px] text-[#A89680] max-w-[520px] mx-auto mb-10 leading-[1.6] font-sans">
          A personalized, research-backed course on <em className="font-serif italic">{course.topic}</em> — built from real sources with curated videos.
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center flex-wrap gap-0 mb-10">
          {[
            { icon: '📚', value: lessons.length, label: `lesson${lessons.length !== 1 ? 's' : ''}` },
            { icon: '⏱', value: `~${totalReadMins} min`, label: 'to complete' },
            videoCount > 0 && { icon: '🎬', value: videoCount, label: `video${videoCount !== 1 ? 's' : ''}` },
            citationCount > 0 && { icon: '📖', value: citationCount, label: 'cited sources' },
          ].filter(Boolean).map((stat, i, arr) => (
            <div key={i} className={`flex items-center gap-2 text-[14px] text-[#A89680] px-5 ${i < arr.length - 1 ? 'border-r border-[#2A2420]' : ''}`}>
              <span>{stat.icon}</span>
              <span><strong className="text-[#F5F1E8] font-semibold">{stat.value}</strong> {stat.label}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleStartReading}
          className="bg-[#C4553F] text-[#F5F1E8] font-sans font-semibold text-[16px] px-10 py-4 rounded-lg border-none cursor-pointer hover:bg-[#A33D2A] transition-colors"
        >
          Start reading — it's free →
        </button>
        <p className="mt-3 text-[13px] text-[#3A2E28] font-sans">No account required</p>
      </div>

      {/* Outcomes */}
      {outcomes.length > 0 && (
        <div className="max-w-[780px] mx-auto px-6 py-16">
          <div className="text-[11px] tracking-[0.18em] uppercase text-[#8B6F4E] font-semibold mb-3 font-sans">
            What you'll learn
          </div>
          <h2 className="font-serif text-[30px] font-medium text-[#1A1614] mb-10 leading-[1.2]">
            By the end of this course, you'll be able to…
          </h2>
          <div className="flex flex-col gap-4">
            {outcomes.map((outcome, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-5 h-5 bg-[#C4553F] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={11} color="white" strokeWidth={2.5} />
                </div>
                <span className="text-[16px] text-[#1A1614] leading-[1.5] font-sans">{outcome}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lesson list */}
      <div className={`max-w-[780px] mx-auto px-6 pb-16 ${outcomes.length > 0 ? 'pt-0' : 'pt-16'}`}>
        <hr className="border-[#E0D5C0] mb-16" />
        <div className="text-[11px] tracking-[0.18em] uppercase text-[#8B6F4E] font-semibold mb-3 font-sans">
          Course lessons
        </div>
        <h2 className="font-serif text-[30px] font-medium text-[#1A1614] mb-10 leading-[1.2]">
          Everything covered, start to finish
        </h2>
        <div className="border border-[#E0D5C0] rounded-xl overflow-hidden bg-white">
          {lessons.map((lesson, idx) => {
            const lessonReadMins = lesson.body ? Math.max(1, Math.ceil(lesson.body.split(/\s+/).length / 200)) : null;
            return (
              <div key={lesson.id} className="flex items-center gap-4 px-5 py-4 border-b border-[#E0D5C0] last:border-b-0">
                <span className="font-serif italic text-[11px] text-[#8B6F4E] w-6 flex-shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 text-[14px] text-[#1A1614] leading-snug font-sans">{lesson.title}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {lesson.video_url && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-[#F0E8E0] text-[#6A3A2A]">Video</span>
                  )}
                  {lessonReadMins && (
                    <span className="text-[12px] text-[#8B6F4E] font-sans">{lessonReadMins} min</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[13px] text-[#8B6F4E] font-serif italic">
          All lessons include cited sources from real web research.
        </p>
      </div>

      {/* Reader section */}
      {showReader && generatedLessons.length > 0 && (
        <div ref={readerRef} className="border-t-2 border-[#C4553F]">
          <div className="lg:grid lg:grid-cols-[260px_1fr] max-w-[1200px] mx-auto">

            {/* Sidebar */}
            <nav className="border-r border-[#E0D5C0] py-8 lg:min-h-screen bg-[#FAF6EC]">
              <div className="px-5 text-[10px] tracking-[0.2em] uppercase text-[#8B6F4E] font-semibold mb-4 font-sans">
                Lessons
              </div>
              {generatedLessons.map((l, idx) => (
                <button
                  key={l.id}
                  onClick={() => setActiveLessonIdx(idx)}
                  className={`w-full text-left flex items-start gap-3 px-5 py-3 border-l-2 text-[13px] leading-snug transition-all font-sans
                    ${activeLessonIdx === idx
                      ? 'border-[#C4553F] bg-[#EDE8DE] text-[#1A1614] font-medium'
                      : 'border-transparent text-[#5C4A3A] hover:bg-[#EDE8DE]'}`}
                >
                  <span className="font-serif italic text-[11px] text-[#8B6F4E] shrink-0 mt-0.5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  {l.title}
                </button>
              ))}
            </nav>

            {/* Lesson content */}
            {activeLesson && (
              <main className="py-10 px-6 lg:py-16 lg:px-16 max-w-[780px]">
                <div className="text-[11px] tracking-[0.15em] uppercase text-[#8B6F4E] font-semibold mb-4 font-sans">
                  Lesson {String(activeLessonIdx + 1).padStart(2, '0')}
                </div>
                <h2 className="font-serif text-[32px] lg:text-[42px] font-medium leading-tight text-[#1A1614] mb-6">
                  {activeLesson.title}
                </h2>
                <div className="flex gap-5 pb-7 mb-10 border-b border-[#E0D5C0] text-[13px] text-[#8B6F4E] font-sans">
                  <div className="flex items-center gap-1.5"><Clock size={14} /> {readTime} min read</div>
                  {activeLesson.video_url && <div className="flex items-center gap-1.5"><PlayCircle size={14} /> Video included</div>}
                  {citations.length > 0 && <div className="flex items-center gap-1.5"><BookOpen size={14} /> {citations.length} sources</div>}
                </div>

                {activeLesson.video_url && (
                  <div className="my-10 border-[1.5px] border-[#E0D5C0] rounded overflow-hidden bg-[#FAF6EC]">
                    <div className="aspect-video relative">
                      <iframe
                        src={activeLesson.video_url.replace('watch?v=', 'embed/')}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full"
                      />
                    </div>
                  </div>
                )}

                <div
                  className="lesson-body font-serif text-[19px] leading-[1.65] text-[#2A2420]"
                  dangerouslySetInnerHTML={{ __html: htmlBody }}
                />

                {citations.length > 0 && (
                  <div className="mt-14 p-6 px-7 bg-[#FAF6EC] border-l-2 border-[#C4553F] rounded-sm">
                    <div className="text-[10px] tracking-[0.2em] uppercase text-[#8B6F4E] font-semibold mb-3.5 font-sans">
                      Sources
                    </div>
                    {citations.map((cite, idx) => (
                      <div key={idx} className="flex justify-between items-baseline gap-4 py-2 font-sans text-sm text-[#5C4A3A] border-b border-dotted border-[#E0D5C0] last:border-b-0">
                        <span>{idx + 1}. {cite.title}</span>
                        {cite.url && (
                          <a href={cite.url} target="_blank" rel="noreferrer" className="text-[#1A1614] no-underline flex items-center gap-1.5 shrink-0 hover:text-[#C4553F]">
                            View <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-16 pt-8 border-t border-[#E0D5C0] flex justify-between items-center gap-5">
                  {activeLessonIdx > 0 ? (
                    <button
                      onClick={() => { setActiveLessonIdx(activeLessonIdx - 1); readerRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="bg-transparent border-[1.5px] border-[#E0D5C0] py-3 px-5 rounded font-sans text-sm font-medium text-[#5C4A3A] flex items-center gap-2 hover:border-[#1A1614] hover:text-[#1A1614] transition-all"
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                  ) : <div />}
                  {activeLessonIdx < generatedLessons.length - 1 ? (
                    <button
                      onClick={() => { setActiveLessonIdx(activeLessonIdx + 1); readerRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="bg-transparent border-[1.5px] border-[#E0D5C0] py-3 px-5 rounded font-sans text-sm font-medium text-[#5C4A3A] flex items-center gap-2 hover:border-[#1A1614] hover:text-[#1A1614] transition-all"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  ) : <div />}
                </div>

                {activeLessonIdx === generatedLessons.length - 1 && !isOwner && (
                  <div className="mt-16 p-8 bg-[#1A1614] rounded text-center">
                    <div className="font-serif text-[24px] text-[#F5F1E8] mb-2">
                      Learn anything, your way.
                    </div>
                    <p className="text-[#A89680] font-sans text-[14px] mb-6">
                      Create your own personalized course on any topic. Your first course is free.
                    </p>
                    <Link
                      to="/signup"
                      className="inline-block bg-[#C4553F] text-[#F5F1E8] px-8 py-3 rounded font-sans text-[14px] font-semibold hover:bg-[#A33D2A] transition-colors"
                    >
                      Create your free course →
                    </Link>
                  </div>
                )}
              </main>
            )}
          </div>
        </div>
      )}

      {/* Bottom CTA — only for non-owners */}
      {!isOwner && (
        <div className="bg-[#1A1614] px-6 py-20 text-center">
          <h2 className="font-serif text-[clamp(28px,4vw,44px)] text-[#F5F1E8] font-medium leading-[1.15] mb-4">
            Want to learn <em className="italic text-[#C4553F]">anything</em> this thoroughly?
          </h2>
          <p className="text-[16px] text-[#8B6F4E] font-sans max-w-[420px] mx-auto mb-8 leading-[1.6]">
            DIY Courses builds you a personalized, research-backed course on any topic in under 30 seconds. Your first course is free.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-[#C4553F] text-[#F5F1E8] px-10 py-4 rounded-lg font-sans text-[16px] font-semibold hover:bg-[#A33D2A] transition-colors"
          >
            Create your free course →
          </Link>
          <p className="mt-4 text-[13px] text-[#3A2E28] font-sans">No credit card required.</p>
        </div>
      )}

    </div>
  );
}
