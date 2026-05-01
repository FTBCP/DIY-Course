import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { ArrowRight, Trash2, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [experience, setExperience] = useState('beginner');
  const [courses, setCourses] = useState([]);
  const [lessonCounts, setLessonCounts] = useState({});
  const [completedCounts, setCompletedCounts] = useState({});
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [upgradingLoading, setUpgradingLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('courses')
        .select('id, title, topic, status, created_at, is_public, share_token')
        .eq('user_id', user.id)
        .eq('status', 'ready')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('status, current_period_start, current_period_end')
          .eq('user_id', user.id)
          .single();
        setSubscription(subData);
        setActiveTab('new');
        setLoadingCourses(false);
        return;
      }

      setCourses(data);

      // Fetch subscription status
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('status, current_period_start, current_period_end')
        .eq('user_id', user.id)
        .single();
      setSubscription(subData);

      const courseIds = data.map(c => c.id);

      // Lesson totals per course
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, course_id')
        .in('course_id', courseIds);

      if (lessons) {
        const totals = {};
        const lessonToCourse = {};
        lessons.forEach(l => {
          totals[l.course_id] = (totals[l.course_id] || 0) + 1;
          lessonToCourse[l.id] = l.course_id;
        });
        setLessonCounts(totals);

        // Completed lesson counts per course for this user
        if (user) {
          const lessonIds = lessons.map(l => l.id);
          const { data: progress } = await supabase
            .from('progress')
            .select('lesson_id')
            .eq('user_id', user.id)
            .not('completed_at', 'is', null)
            .in('lesson_id', lessonIds);

          if (progress) {
            const completed = {};
            progress.forEach(p => {
              const cId = lessonToCourse[p.lesson_id];
              if (cId) completed[cId] = (completed[cId] || 0) + 1;
            });
            setCompletedCounts(completed);
          }
        }
      }

      setLoadingCourses(false);
    }

    fetchData();
  }, []);

  const isSubscribed = subscription?.status === 'active' &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end) > new Date();

  const coursesThisPeriod = isSubscribed
    ? courses.filter(c => new Date(c.created_at) >= new Date(subscription.current_period_start)).length
    : 0;

  const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';
  const canCreate = !paymentsEnabled || (isSubscribed ? coursesThisPeriod < 10 : courses.length < 1);

  const periodResetDate = isSubscribed
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : null;

  const handleUpgrade = async () => {
    setUpgradingLoading(true);
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { origin: window.location.origin },
    });
    if (error || !data?.url) {
      alert('Something went wrong starting checkout. Please try again.');
      setUpgradingLoading(false);
      return;
    }
    window.location.href = data.url;
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    navigate('/generating', { state: { topic, experience } });
  };

  const handleDelete = async (courseId) => {
    await supabase.from('courses').delete().eq('id', courseId);
    setCourses(prev => prev.filter(c => c.id !== courseId));
    setConfirmDeleteId(null);
  };

  const handleToggleShare = async (course) => {
    const newIsPublic = !course.is_public;
    const { error } = await supabase
      .from('courses')
      .update({ is_public: newIsPublic })
      .eq('id', course.id);
    if (!error) {
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_public: newIsPublic } : c));
      if (newIsPublic) {
        navigator.clipboard.writeText(`${window.location.origin}/c/${course.share_token}`);
        setCopiedId(course.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    }
  };

  const actionLabel = (courseId) => {
    const total = lessonCounts[courseId] || 0;
    const done = completedCounts[courseId] || 0;
    if (total > 0 && done >= total) return 'Review';
    if (done > 0) return 'Resume';
    return 'Start';
  };

  const EXPERIENCE_OPTIONS = [
    { id: 'beginner', label: 'Complete beginner' },
    { id: 'some-background', label: 'Some background' },
    { id: 'knowledgeable', label: 'Fairly knowledgeable' },
    { id: 'refresher', label: 'Just a refresher' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#1A1614] font-sans">
      <Header />

      <main className="max-w-[700px] mx-auto pt-[80px] px-8 pb-[80px]">

        {/* ── Tabs ── */}
        <div className="flex border-b border-[#E0D5C0] mb-10">
          {courses.length > 0 && (
            <button
              onClick={() => setActiveTab('courses')}
              className={`pb-3 mr-8 text-[14px] font-semibold font-sans border-b-2 transition-colors ${
                activeTab === 'courses'
                  ? 'border-[#C4553F] text-[#1A1614]'
                  : 'border-transparent text-[#8B6F4E] hover:text-[#1A1614]'
              }`}
            >
              My Courses
            </button>
          )}
          <button
            onClick={() => setActiveTab('new')}
            className={`pb-3 text-[14px] font-semibold font-sans border-b-2 transition-colors ${
              activeTab === 'new'
                ? 'border-[#C4553F] text-[#1A1614]'
                : 'border-transparent text-[#8B6F4E] hover:text-[#1A1614]'
            }`}
          >
            New Course
          </button>
        </div>

        {/* ── My Courses tab ── */}
        {activeTab === 'courses' && (
          <div>
            {loadingCourses ? (
              <p className="text-[#8B6F4E] font-serif italic">Loading your courses…</p>
            ) : (
              <>
              {/* Continue where you left off */}
              {(() => {
                const inProgress = courses.find(c => {
                  const total = lessonCounts[c.id] || 0;
                  const done = completedCounts[c.id] || 0;
                  return done > 0 && done < total;
                });
                if (!inProgress) return null;
                const total = lessonCounts[inProgress.id] || 0;
                const done = completedCounts[inProgress.id] || 0;
                return (
                  <div className="mb-8 p-5 bg-white border border-[#E0D5C0] rounded-xl">
                    <div className="text-[11px] tracking-[0.15em] uppercase text-[#8B6F4E] font-semibold mb-1.5 font-sans">
                      Continue where you left off
                    </div>
                    <div className="font-serif text-[17px] font-medium text-[#1A1614] mb-3 truncate">
                      {inProgress.title || inProgress.topic}
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-[3px] bg-[#E0D5C0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#C4553F] rounded-full" style={{ width: `${Math.round((done / total) * 100)}%` }} />
                      </div>
                      <span className="text-[11px] text-[#8B6F4E] font-sans whitespace-nowrap">{done} of {total} lessons</span>
                    </div>
                    <Link
                      to={`/course/${inProgress.id}`}
                      className="inline-flex items-center gap-1.5 bg-[#1A1614] text-[#F5F1E8] py-2.5 px-5 rounded text-[13px] font-semibold font-sans no-underline hover:bg-[#C4553F] transition-colors"
                    >
                      Resume →
                    </Link>
                  </div>
                );
              })()}
              <ul className="list-none p-0 m-0">
                {courses.map((course) => {
                  const total = lessonCounts[course.id] || 0;
                  const done = completedCounts[course.id] || 0;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const isConfirming = confirmDeleteId === course.id;

                  return (
                    <li key={course.id} className="border-b border-[#E0D5C0] py-4 last:border-b-0">
                      {isConfirming ? (
                        /* Inline delete confirmation */
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-serif text-[15px] text-[#C4553F]">
                            Delete "{course.title}"?
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleDelete(course.id)}
                              className="text-[13px] font-semibold text-[#C4553F] font-sans hover:underline"
                            >
                              Yes, delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[13px] text-[#8B6F4E] font-sans hover:text-[#1A1614]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Normal row */
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/c/${course.share_token}`}
                              className="font-serif text-[16px] font-medium text-[#1A1614] truncate mb-2 block hover:text-[#C4553F] hover:underline transition-colors no-underline"
                            >
                              {course.title || course.topic}
                            </Link>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-[3px] bg-[#E0D5C0] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#C4553F] rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-[#8B6F4E] font-sans whitespace-nowrap">
                                {done} of {total} lessons
                              </span>
                            </div>
                          </div>

                          <Link
                            to={`/course/${course.id}`}
                            className="text-[13px] font-semibold text-[#C4553F] font-sans whitespace-nowrap hover:underline no-underline"
                          >
                            {actionLabel(course.id)} →
                          </Link>

                          <button
                            onClick={() => handleToggleShare(course)}
                            className={`transition-colors p-1 relative ${course.is_public ? 'text-[#C4553F]' : 'text-[#C0AD98] hover:text-[#C4553F]'}`}
                            title={course.is_public ? 'Shared — click to copy link' : 'Share course'}
                          >
                            <Share2 size={14} />
                            {copiedId === course.id && (
                              <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1A1614] text-[#F5F1E8] text-[10px] font-sans px-2 py-1 rounded whitespace-nowrap">
                                Link copied!
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(course.id)}
                            className="text-[#C0AD98] hover:text-[#C4553F] transition-colors p-1"
                            title="Delete course"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              </>
            )}

            <button
              onClick={() => setActiveTab('new')}
              className="mt-10 text-[13px] font-semibold font-sans text-[#8B6F4E] hover:text-[#C4553F] transition-colors flex items-center gap-1.5"
            >
              + Start a new course
            </button>
          </div>
        )}

        {/* ── New Course tab ── */}
        {activeTab === 'new' && !canCreate && (
          <div>
            {isSubscribed ? (
              // Paid user hit monthly limit
              <div>
                <h1 className="font-serif text-[38px] leading-[1.1] font-medium tracking-[-0.02em] mb-4 text-[#1A1614]">
                  You've used all 10 courses this month.
                </h1>
                <p className="text-[16px] text-[#5C4A3A] font-sans mb-8 leading-relaxed">
                  Your limit resets on <strong>{periodResetDate}</strong>. In the meantime, review a course you've already built or share one with a friend.
                </p>
                <button
                  onClick={() => setActiveTab('courses')}
                  className="bg-[#1A1614] text-[#F5F1E8] border-none py-3.5 px-7 text-[14px] font-medium rounded cursor-pointer hover:bg-[#C4553F] transition-colors font-sans"
                >
                  View my courses →
                </button>
              </div>
            ) : (
              // Free user hit 1-course limit
              <div>
                <div className="text-[11px] tracking-[0.18em] uppercase text-[#8B6F4E] font-semibold mb-4 font-sans">
                  Upgrade to continue
                </div>
                <h1 className="font-serif text-[38px] leading-[1.1] font-medium tracking-[-0.02em] mb-4 text-[#1A1614]">
                  You've used your free course.
                </h1>
                <p className="text-[16px] text-[#5C4A3A] font-sans mb-8 max-w-[460px] leading-relaxed">
                  Upgrade to build up to 10 courses per month on any topic — with research-backed lessons, curated videos, and cited sources.
                </p>
                <div className="bg-white border border-[#E0D5C0] rounded-xl p-7 mb-6 max-w-[400px]">
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="font-serif text-[42px] font-medium text-[#1A1614]">$9.99</span>
                    <span className="text-[#8B6F4E] font-sans text-[14px]">/month</span>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {[
                      '10 courses per month',
                      'Research-backed lessons with citations',
                      'Curated YouTube videos per lesson',
                      'Share courses publicly',
                      'Cancel anytime',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-[14px] text-[#1A1614] font-sans">
                        <span className="w-4 h-4 bg-[#C4553F] rounded-full flex items-center justify-center shrink-0">
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleUpgrade}
                    disabled={upgradingLoading}
                    className="w-full bg-[#C4553F] text-[#F5F1E8] border-none py-3.5 text-[15px] font-semibold rounded cursor-pointer hover:bg-[#A33D2A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-sans"
                  >
                    {upgradingLoading ? 'Redirecting to checkout…' : 'Upgrade for $9.99/month →'}
                  </button>
                </div>
                <p className="text-[12px] text-[#8B6F4E] font-sans">Secure payment via Stripe. Cancel anytime from your account settings.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'new' && canCreate && (
          <div>
            <h1 className="font-serif text-[48px] leading-[1.05] font-medium tracking-[-0.02em] mb-5 text-[#1A1614]">
              What would you like<br />to <em className="italic font-normal text-[#C4553F]">understand</em>?
            </h1>

            <p className="text-[16px] leading-[1.5] text-[#5C4A3A] mb-12 max-w-[520px]">
              Tell us what you want to learn. We'll research the web, pull the best sources, and build you a course you can finish over a weekend or a month.
            </p>

            <form onSubmit={handleGenerate}>
              <div className="mb-10">
                <span className="font-serif italic text-sm text-[#8B6F4E] mb-2 block">01</span>
                <label className="block text-[20px] font-medium tracking-[-0.01em] mb-4 text-[#1A1614] font-serif">
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

              <div className="mb-10">
                <span className="font-serif italic text-sm text-[#8B6F4E] mb-2 block">02</span>
                <label className="block text-[20px] font-medium tracking-[-0.01em] mb-4 text-[#1A1614] font-serif">
                  How familiar are you with this topic?
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_OPTIONS.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setExperience(e.id)}
                      className={`px-4 py-2.5 border-[1.5px] rounded-full text-sm font-medium cursor-pointer transition-all duration-150
                        ${experience === e.id
                          ? 'bg-[#1A1614] text-[#F5F1E8] border-[#1A1614]'
                          : 'bg-[#FAF6EC] border-[#E0D5C0] text-[#5C4A3A] hover:border-[#C4553F]'
                        }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!topic.trim()}
                className="mt-4 bg-[#1A1614] text-[#F5F1E8] border-none py-4 px-8 text-[15px] font-medium tracking-[0.02em] cursor-pointer rounded inline-flex items-center gap-2.5 transition-all duration-150 hover:bg-[#C4553F] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate my course
                <ArrowRight size={16} />
              </button>
            </form>

            <p className="mt-10 pt-8 border-t border-[#E0D5C0] text-[13px] text-[#8B6F4E] font-serif italic">
              Takes about 20 seconds to build your course. Lesson content loads as you read.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
