import { useState, useEffect } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Check, Circle } from 'lucide-react';

import { supabase } from '../lib/supabase';

export default function LoadingScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const { topic, depth, time } = location.state || {};

  const steps = [
    "Planning your course structure",
    "Designing your learning path",
    "Sequencing lessons",
    "Preparing your course",
  ];

  useEffect(() => {
    if (!topic) return;
    let isMounted = true;
    
    // Mock progression through steps every 2.4s, just for visual feedback
    const t = setInterval(() => {
      setStepIdx((i) => {
        if (i < steps.length - 1) return i + 1;
        return i;
      });
    }, 2400);

    const generateCourse = async () => {
      try {
        // 90-second client-side timeout — Edge Function hard limit is 150s.
        // If the server doesn't respond in time, show an actionable error.
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Course generation timed out. Please try a simpler topic or try again.")), 45000)
        );
        
        const invocation = supabase.functions.invoke('generate-course', {
          body: { topic, depth, time }
        });
        
        const { data, error } = await Promise.race([invocation, timeout]);

        if (error) throw error;
        
        if (data && !data.success) {
          throw new Error(data.error || "Generation failed from backend.");
        }
        
        if (data && data.success && isMounted) {
          clearInterval(t);
          setStepIdx(steps.length); // All done
          
          // Small delay so user sees all checkmarks before navigating
          setTimeout(() => {
            navigate(`/course/${data.course_id}`);
          }, 1000);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error generating course:", err);
          clearInterval(t);
          setErrorMsg(err.message || "Failed to generate course. Please try again.");
        }
      }
    };

    generateCourse();

    return () => {
      isMounted = false;
      clearInterval(t);
    };
  }, [topic, depth, time, navigate, steps.length]);

  // If user navigates here directly without state from the form, redirect back
  if (!topic) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] font-sans flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center p-[60px_32px] relative pt-[120px]">
        <div className="text-[11px] tracking-[0.18em] uppercase text-[#8B6F4E] font-semibold mb-5">
          Building your course
        </div>
        
        <h1 className="font-serif text-[42px] font-normal italic tracking-[-0.02em] text-center max-w-[600px] m-0 mb-3 leading-[1.15] text-[#1A1614]">
          A personalized course on
        </h1>
        <div className="font-serif text-[42px] font-medium text-[#C4553F] text-center mb-14 leading-[1.15] max-w-[600px]">
          {topic}
        </div>

        <div className="w-full max-w-[440px] h-[3px] bg-[#E0D5C0] rounded-full overflow-hidden mb-4">
          <div className="h-full bg-[#C4553F] rounded-full animate-fillBar"></div>
        </div>

        <ul className="w-full max-w-[440px] list-none p-0 m-0 mb-12">
          {steps.map((s, i) => {
            const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
            return (
              <li key={s} className={`flex items-center gap-[14px] py-[14px] border-b border-[#E0D5C0] text-[15px] transition-all duration-300 last:border-b-0
                ${state === "done" ? "text-[#1A1614]" : ""}
                ${state === "active" ? "text-[#1A1614] font-medium" : ""}
                ${state === "pending" ? "text-[#5C4A3A] opacity-45" : ""}
              `}>
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  {state === "done" && <Check size={16} color="#C4553F" strokeWidth={2.5} />}
                  {state === "active" && !errorMsg && (
                    <div className="w-4 h-4 rounded-full border-2 border-[#E0D5C0] border-t-[#C4553F] animate-spin"></div>
                  )}
                  {state === "pending" && !errorMsg && <Circle size={14} color="#A89680" />}
                  {errorMsg && (state === "active" || state === "pending") && <Circle size={14} color="#C4553F" />}
                </span>
                {s}
              </li>
            );
          })}
        </ul>

        {errorMsg ? (
          <div className="text-center">
            <div className="text-[15px] text-[#C4553F] font-medium mb-4 max-w-[440px]">
              {errorMsg}
            </div>
            <button 
              onClick={() => navigate('/')}
              className="bg-transparent border border-[#C4553F] text-[#C4553F] px-6 py-2 rounded-full font-medium text-[14px] hover:bg-[#C4553F] hover:text-white transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="text-[13px] text-[#8B6F4E] font-serif italic text-center">
            Typically 15–25 seconds. Lesson content loads as you read.
          </div>
        )}
      </main>

      <style>{`
        @keyframes fillBar {
          0% { width: 15%; }
          50% { width: 72%; }
          100% { width: 88%; }
        }
        .animate-fillBar {
          animation: fillBar 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
