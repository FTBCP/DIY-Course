import { CheckCircle2, Circle, X } from "lucide-react";

const SHOW_COST = import.meta.env.VITE_SHOW_TOKEN_COST === 'true';

// Pricing per token (Anthropic April 2026 rates)
const SONNET_IN  = 3  / 1_000_000;   // lessons use claude-sonnet-4-6
const SONNET_OUT = 15 / 1_000_000;
const HAIKU_IN   = 0.80 / 1_000_000; // outline uses claude-haiku-4-5
const HAIKU_OUT  = 4   / 1_000_000;

// Typical token counts per lesson (Sonnet + web search)
const EST_LESSON_IN  = 1000;
const EST_LESSON_OUT = 800;

// Outline is generated with Haiku — a tiny fixed cost
const EST_OUTLINE_IN  = 500;
const EST_OUTLINE_OUT = 300;

function lessonCost(inputTokens, outputTokens) {
  return inputTokens * SONNET_IN + outputTokens * SONNET_OUT;
}

function outlineCost(inputTokens, outputTokens) {
  return inputTokens * HAIKU_IN + outputTokens * HAIKU_OUT;
}

export default function CourseSidebar({ courseTitle, progress, total, lessons, activeLessonIdx, setActiveLessonIdx, inputTokens = 0, outputTokens = 0, backgroundGeneratingCount = 0, onClose }) {
  const percentComplete = total > 0 ? Math.round((progress / total) * 100) : 0;

  // Estimated total: outline (Haiku) + all lessons (Sonnet)
  const estimatedTotal =
    outlineCost(EST_OUTLINE_IN, EST_OUTLINE_OUT) +
    total * (EST_LESSON_IN * SONNET_IN + EST_LESSON_OUT * SONNET_OUT);

  // Actual so far: the course input/output tokens are cumulative across outline + generated lessons.
  // Outline tokens (Haiku) are a small share — using Sonnet rate for all slightly overestimates, but is acceptable.
  const actualTotal = inputTokens * SONNET_IN + outputTokens * SONNET_OUT;

  return (
    <aside className="bg-[#1A1614] text-[#F5F1E8] py-16 overflow-y-auto border-r border-[#2A2420] min-h-screen relative">
      {/* Close button — mobile only */}
      <button
        onClick={onClose}
        className="lg:hidden absolute top-4 right-4 text-[#8B6F4E] hover:text-[#F5F1E8] transition-colors p-1"
        aria-label="Close menu"
      >
        <X size={20} />
      </button>
      <div className="px-7 pb-6 mb-5 border-b border-[#2A2420]">
        <div className="text-[10px] tracking-[0.2em] uppercase text-[#8B6F4E] mb-2 font-semibold">
          Your Course
        </div>
        <h2 className="font-serif text-[22px] font-medium leading-tight text-[#F5F1E8] mb-2.5">
          {courseTitle}
        </h2>
        <div className="h-0.5 bg-[#2A2420] rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-[#C4553F] transition-all duration-300"
            style={{ width: `${percentComplete}%` }}
          ></div>
        </div>
        <div className="text-xs text-[#8B6F4E] mt-2 font-sans">
          {progress} of {total} lessons complete
        </div>
        {backgroundGeneratingCount > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <span className="w-3 h-3 rounded-full border-2 border-[#3A2E28] border-t-[#C4553F] animate-spin inline-block shrink-0" />
            <span className="text-xs text-[#8B6F4E] font-sans">Preparing your lessons…</span>
          </div>
        )}
      </div>

      {lessons.map((group, gi) => (
        <div key={gi}>
          <div className="px-7 pt-4 pb-2 text-[10px] tracking-[0.2em] uppercase text-[#5C4A3A] font-semibold">
            {group.mod}
          </div>
          {group.items.map((l, li) => {
            const isCurrent = activeLessonIdx === l.flatIndex;
            const num = l.flatIndex + 1;
            const hasActualCost = l.inputTokens > 0 || l.outputTokens > 0;

            return (
              <div
                key={li}
                onClick={() => setActiveLessonIdx(l.flatIndex)}
                className={`
                  flex items-start gap-3 py-2.5 px-7 cursor-pointer border-l-2 transition-all duration-150 text-sm leading-snug
                  ${isCurrent ? "bg-[#2A2420] border-[#C4553F] text-[#F5F1E8]" : "border-transparent text-[#A89680] hover:bg-[#2A2420] hover:text-[#F5F1E8]"}
                  ${l.state === "complete" && !isCurrent ? "text-[#7A6A56]" : ""}
                `}
              >
                <span className="mt-0.5 shrink-0">
                  {l.state === "complete" && <CheckCircle2 size={16} color="#5C7A3A" strokeWidth={2} />}
                  {isCurrent && l.state !== "complete" && <Circle size={16} color="#C4553F" strokeWidth={2.5} fill="#C4553F" />}
                  {isCurrent && l.state === "complete" && <CheckCircle2 size={16} color="#5C7A3A" strokeWidth={2} />}
                  {l.state === "upcoming" && !isCurrent && !l.backgroundGenerating && <Circle size={16} color="#5C4A3A" strokeWidth={1.5} />}
                  {l.state === "upcoming" && !isCurrent && l.backgroundGenerating && (
                    <span className="w-4 h-4 rounded-full border-2 border-[#3A2E28] border-t-[#8B6F4E] animate-spin inline-block" />
                  )}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span>
                    <span className="font-serif text-[11px] italic text-[#8B6F4E] mr-0.5">
                      {String(num).padStart(2, "0")} &nbsp;
                    </span>
                    {l.t}
                  </span>
                  {SHOW_COST && hasActualCost && (
                    <span className="font-mono text-[10px] text-[#5C4A3A]">
                      ${lessonCost(l.inputTokens, l.outputTokens).toFixed(4)}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      {SHOW_COST && (
        <div className="px-7 pt-5 mt-4 border-t border-[#2A2420]">
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#5C4A3A] font-semibold mb-2">
            Course API Cost
          </div>
          <div className="flex justify-between text-[11px] text-[#8B6F4E] mb-1">
            <span>Estimated (all lessons)</span>
            <span className="font-mono">~${estimatedTotal.toFixed(4)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-[#8B6F4E] mb-1">
            <span>Actual so far</span>
            <span className="font-mono text-[#C4553F]">${actualTotal.toFixed(4)}</span>
          </div>
          <div className="text-[10px] text-[#5C4A3A] mt-1">
            {(inputTokens + outputTokens).toLocaleString()} tokens · per-lesson cost shown above each title
          </div>
        </div>
      )}
    </aside>
  );
}
