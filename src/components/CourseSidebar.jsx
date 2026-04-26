import { CheckCircle2, Circle } from "lucide-react";

const SHOW_COST = import.meta.env.VITE_SHOW_TOKEN_COST === 'true';

// Anthropic claude-sonnet pricing: $3/MTok input, $15/MTok output
function estimateCost(inputTokens, outputTokens) {
  return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
}

export default function CourseSidebar({ courseTitle, progress, total, lessons, activeLessonIdx, setActiveLessonIdx, inputTokens = 0, outputTokens = 0 }) {
  // calculate completion percentage
  const percentComplete = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <aside className="bg-[#1A1614] text-[#F5F1E8] py-16 overflow-y-auto border-r border-[#2A2420] min-h-screen">
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
      </div>

      {lessons.map((group, gi) => (
        <div key={gi}>
          <div className="px-7 pt-4 pb-2 text-[10px] tracking-[0.2em] uppercase text-[#5C4A3A] font-semibold">
            {group.mod}
          </div>
          {group.items.map((l, li) => {
            const isCurrent = activeLessonIdx === l.flatIndex;
            const num = l.flatIndex + 1;

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
                  {l.state === "upcoming" && !isCurrent && <Circle size={16} color="#5C4A3A" strokeWidth={1.5} />}
                </span>
                <span>
                  <span className="font-serif text-[11px] italic text-[#8B6F4E] mr-0.5">
                    {String(num).padStart(2, "0")} &nbsp;
                  </span>
                  {l.t}
                </span>
              </div>
            );
          })}
        </div>
      ))}
      {SHOW_COST && (inputTokens > 0 || outputTokens > 0) && (
        <div className="px-7 pt-5 mt-4 border-t border-[#2A2420]">
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#5C4A3A] font-semibold mb-1.5">
            Est. API Cost
          </div>
          <div className="font-mono text-[#C4553F] text-[15px] font-medium">
            ${estimateCost(inputTokens, outputTokens).toFixed(4)}
          </div>
          <div className="text-[10px] text-[#5C4A3A] mt-0.5">
            {(inputTokens + outputTokens).toLocaleString()} tokens
          </div>
        </div>
      )}
    </aside>
  );
}
