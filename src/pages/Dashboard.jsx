import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { ArrowRight, BookOpen, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState('intermediate');
  const [time, setTime] = useState('weekend');
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    async function fetchCourses() {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, topic, status, created_at')
        .eq('status', 'ready')
        .order('created_at', { ascending: false });
      if (!error && data) setCourses(data);
      setLoadingCourses(false);
    }
    fetchCourses();
  }, []);

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    navigate('/generating', { state: { topic, depth, time } });
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#1A1614] font-sans">
      <Header />
      
      <main className="max-w-[680px] mx-auto pt-[120px] px-8 pb-[80px]">
        <div className="text-[11px] tracking-[0.18em] uppercase text-[#8B6F4E] font-semibold mb-5">
          Start a new course
        </div>
        
        <h1 className="font-serif text-[52px] leading-[1.05] font-medium tracking-[-0.02em] m-0 mb-5 text-[#1A1614]">
          What would you like<br/>to <em className="italic font-normal text-[#C4553F]">understand</em>?
        </h1>
        
        <p className="text-[17px] leading-[1.5] text-[#5C4A3A] mb-14 max-w-[520px]">
          Tell us what you want to learn. We'll research the web, pull the best sources, and build you a course you can finish over a weekend or a month.
        </p>

        <form onSubmit={handleGenerate}>
          <div className="mb-11">
            <span className="font-serif italic text-sm text-[#8B6F4E] mb-2 block">01</span>
            <label className="block text-[22px] font-medium tracking-[-0.01em] mb-4 text-[#1A1614] font-serif">
              Your topic
            </label>
            <input
              className="w-full p-4 px-5 text-base bg-[#FAF6EC] border-[1.5px] border-[#E0D5C0] rounded text-[#1A1614] transition-all duration-150 focus:outline-none focus:border-[#C4553F] focus:bg-white placeholder:text-[#A89680]"
              type="text"
              placeholder="e.g. How compound interest works, Basic photography, Acquiring a small business..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>

          <div className="mb-11">
            <span className="font-serif italic text-sm text-[#8B6F4E] mb-2 block">02</span>
            <label className="block text-[22px] font-medium tracking-[-0.01em] mb-4 text-[#1A1614] font-serif">
              How deep do you want to go?
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "overview", label: "Overview" },
                { id: "intermediate", label: "Intermediate" },
                { id: "deep", label: "Deep dive" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`px-4.5 py-2.5 bg-[#FAF6EC] border-[1.5px] rounded-full text-sm font-medium cursor-pointer transition-all duration-150 
                    ${depth === d.id 
                      ? "bg-[#1A1614] text-[#F5F1E8] border-[#1A1614]" 
                      : "border-[#E0D5C0] text-[#5C4A3A] hover:border-[#C4553F]"
                    }`}
                  onClick={() => setDepth(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-11">
            <span className="font-serif italic text-sm text-[#8B6F4E] mb-2 block">03</span>
            <label className="block text-[22px] font-medium tracking-[-0.01em] mb-4 text-[#1A1614] font-serif">
              How much time do you have?
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "afternoon", label: "An afternoon" },
                { id: "weekend", label: "A weekend" },
                { id: "week", label: "A week" },
                { id: "month", label: "A month" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`px-4.5 py-2.5 bg-[#FAF6EC] border-[1.5px] rounded-full text-sm font-medium cursor-pointer transition-all duration-150 
                    ${time === t.id 
                      ? "bg-[#1A1614] text-[#F5F1E8] border-[#1A1614]" 
                      : "border-[#E0D5C0] text-[#5C4A3A] hover:border-[#C4553F]"
                    }`}
                  onClick={() => setTime(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit"
            disabled={!topic.trim()}
            className="mt-6 bg-[#1A1614] text-[#F5F1E8] border-none py-4 px-8 text-[15px] font-medium tracking-[0.02em] cursor-pointer rounded inline-flex items-center gap-2.5 transition-all duration-150 hover:bg-[#C4553F] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate my course
            <ArrowRight size={16} />
          </button>
        </form>

        <p className="mt-12 pt-8 border-t border-[#E0D5C0] text-[13px] text-[#8B6F4E] font-serif italic">
          Takes about 20 seconds to build your course. Lesson content loads as you read.
        </p>

        {/* ── Previous courses ─────────────────────────────────────── */}
        {!loadingCourses && courses.length > 0 && (
          <div className="mt-16">
            <div className="text-[11px] tracking-[0.18em] uppercase text-[#8B6F4E] font-semibold mb-6">
              Your courses
            </div>
            <ul className="list-none p-0 m-0 flex flex-col gap-3">
              {courses.map((course) => (
                <li key={course.id}>
                  <Link
                    to={`/course/${course.id}`}
                    className="flex items-center justify-between gap-4 p-5 bg-white border-[1.5px] border-[#E0D5C0] rounded hover:border-[#C4553F] transition-all duration-150 no-underline group"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#FAF6EC] border border-[#E0D5C0] flex items-center justify-center shrink-0 mt-0.5">
                        <BookOpen size={14} color="#8B6F4E" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-serif text-[17px] font-medium text-[#1A1614] leading-snug truncate">
                          {course.title || course.topic}
                        </div>
                        <div className="text-[12px] text-[#8B6F4E] mt-1">
                          {formatDate(course.created_at)}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#A89680" className="shrink-0 group-hover:text-[#C4553F] transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
