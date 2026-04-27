import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Clock, PlayCircle, BookOpen, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PublicCourse() {
  const { shareToken } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: courseData, error } = await supabase
        .from('courses')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_public', true)
        .single();

      if (error || !courseData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCourse(courseData);

      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseData.id)
        .not('body', 'is', null)
        .order('order', { ascending: true });

      setLessons(lessonsData || []);
      setLoading(false);
    }
    load();
  }, [shareToken]);

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

  const activeLesson = lessons[activeLessonIdx];
  const wordCount = activeLesson?.body ? activeLesson.body.replace(/<[^>]*>?/gm, '').split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const htmlBody = activeLesson?.body ? DOMPurify.sanitize(marked.parse(activeLesson.body)) : '';
  const citations = activeLesson?.citations || [];

  return (
    <div className="min-h-screen bg-[#F5F1E8]">

      {/* Header */}
      <header className="bg-[#1A1614] px-6 py-4 flex items-center justify-between">
        <div className="font-serif text-[#F5F1E8] text-[18px] italic">DIY Courses</div>
        <Link
          to="/signup"
          className="text-[13px] font-sans font-medium text-[#F5F1E8] bg-[#C4553F] px-4 py-2 rounded hover:bg-[#A33D2A] transition-colors"
        >
          Create your own →
        </Link>
      </header>

      {/* Course title banner */}
      <div className="bg-[#F5F1E8] px-6 py-10 border-b border-[#E0D5C0] text-center">
        <div className="text-[11px] tracking-[0.18em] uppercase text-[#8B6F4E] font-semibold mb-3">
          Shared course
        </div>
        <h1 className="font-serif text-[36px] lg:text-[46px] font-medium text-[#1A1614] leading-tight max-w-[700px] mx-auto">
          {course.title}
        </h1>
        <p className="text-[#8B6F4E] font-sans text-[14px] mt-3">
          {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[280px_1fr] max-w-[1200px] mx-auto">

        {/* Lesson list sidebar */}
        <nav className="border-r border-[#E0D5C0] py-8 lg:min-h-screen">
          <div className="px-6 text-[10px] tracking-[0.2em] uppercase text-[#8B6F4E] font-semibold mb-4">
            Lessons
          </div>
          {lessons.map((l, idx) => (
            <button
              key={l.id}
              onClick={() => setActiveLessonIdx(idx)}
              className={`w-full text-left flex items-start gap-3 px-6 py-3 border-l-2 text-[14px] leading-snug transition-all
                ${activeLessonIdx === idx
                  ? 'border-[#C4553F] bg-[#EDE8DE] text-[#1A1614] font-medium'
                  : 'border-transparent text-[#5C4A3A] hover:bg-[#EDE8DE]'}
              `}
            >
              <span className="font-serif italic text-[11px] text-[#8B6F4E] shrink-0 mt-0.5">
                {String(idx + 1).padStart(2, '0')}
              </span>
              {l.title}
            </button>
          ))}
        </nav>

        {/* Lesson content */}
        {activeLesson ? (
          <main className="py-10 px-6 lg:py-16 lg:px-16 max-w-[780px]">
            <div className="text-[11px] tracking-[0.15em] uppercase text-[#8B6F4E] font-semibold mb-4">
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
                <div className="text-[10px] tracking-[0.2em] uppercase text-[#8B6F4E] font-semibold mb-3.5">
                  Sources
                </div>
                {citations.map((cite, idx) => (
                  <div key={idx} className="flex justify-between items-baseline gap-4 py-2 font-sans text-sm text-[#5C4A3A] border-b border-dotted border-[#E0D5C0] last:border-b-0">
                    <span>{idx + 1}. {cite.publisher || 'Source'} — "{cite.title}"</span>
                    {cite.url && (
                      <a href={cite.url} target="_blank" rel="noreferrer" className="text-[#1A1614] no-underline flex items-center gap-1.5 shrink-0 hover:text-[#C4553F]">
                        View <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Prev / Next nav */}
            <div className="mt-16 pt-8 border-t border-[#E0D5C0] flex justify-between items-center gap-5">
              {activeLessonIdx > 0 ? (
                <button
                  onClick={() => setActiveLessonIdx(activeLessonIdx - 1)}
                  className="bg-transparent border-[1.5px] border-[#E0D5C0] py-3 px-5 rounded font-sans text-sm font-medium text-[#5C4A3A] flex items-center gap-2 hover:border-[#1A1614] hover:text-[#1A1614] transition-all"
                >
                  <ChevronLeft size={16} /> Previous
                </button>
              ) : <div />}
              {activeLessonIdx < lessons.length - 1 ? (
                <button
                  onClick={() => setActiveLessonIdx(activeLessonIdx + 1)}
                  className="bg-transparent border-[1.5px] border-[#E0D5C0] py-3 px-5 rounded font-sans text-sm font-medium text-[#5C4A3A] flex items-center gap-2 hover:border-[#1A1614] hover:text-[#1A1614] transition-all"
                >
                  Next <ChevronRight size={16} />
                </button>
              ) : <div />}
            </div>

            {/* CTA — only shown on the last lesson */}
            {activeLessonIdx === lessons.length - 1 && (
              <div className="mt-16 p-8 bg-[#1A1614] rounded text-center">
                <div className="font-serif text-[24px] text-[#F5F1E8] mb-2">
                  Learn anything, your way.
                </div>
                <p className="text-[#A89680] font-sans text-[14px] mb-6">
                  Create your own personalized course on any topic — free to get started.
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
        ) : (
          <div className="p-16 font-serif text-[#8B6F4E] italic">No lessons available yet.</div>
        )}
      </div>
    </div>
  );
}
