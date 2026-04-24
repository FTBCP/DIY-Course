import { marked } from "marked";
import { Clock, PlayCircle, BookOpen, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

export default function LessonContent({ moduleName, lessonNum, lessonTitle, body, videoUrl, citations = [], isComplete, onMarkComplete, goPrev, goNext }) {
  // Rough estimate of read time (200 words per minute)
  const wordCount = body ? body.replace(/<[^>]*>?/gm, '').split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const htmlBody = body ? marked.parse(body) : "<p>No content available.</p>";

  return (
    <main className="py-16 px-18 max-w-[820px] mx-auto w-full">
      <div className="flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-[#8B6F4E] font-semibold mb-5">
        <span>Module {moduleName}</span>
        <span>·</span>
        <span>Lesson {String(lessonNum).padStart(2, "0")}</span>
      </div>
      
      <h1 className="font-serif text-[46px] font-medium leading-tight tracking-[-0.02em] m-0 mb-6 text-[#1A1614]">
        {lessonTitle}
      </h1>
      
      <div className="flex gap-5 pb-7 mb-10 border-b border-[#E0D5C0] text-[13px] text-[#8B6F4E] font-sans">
        <div className="flex items-center gap-1.5"><Clock size={14} /> {readTime} min read</div>
        {videoUrl && <div className="flex items-center gap-1.5"><PlayCircle size={14} /> Video included</div>}
        {citations.length > 0 && <div className="flex items-center gap-1.5"><BookOpen size={14} /> {citations.length} sources</div>}
      </div>

      {videoUrl && (
        <div className="my-10 border-[1.5px] border-[#E0D5C0] rounded overflow-hidden bg-[#FAF6EC]">
          <div className="aspect-video relative">
            <iframe
              src={videoUrl.replace("watch?v=", "embed/")}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full"
            ></iframe>
          </div>
        </div>
      )}

      <div 
        className="lesson-body font-serif text-[19px] leading-[1.65] text-[#2A2420] font-normal"
        dangerouslySetInnerHTML={{ __html: htmlBody }}
      />

      {citations.length > 0 && (
        <div className="mt-14 p-6 px-7 bg-[#FAF6EC] border-l-2 border-[#C4553F] rounded-sm">
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#8B6F4E] font-semibold mb-3.5">
            Sources cited in this lesson
          </div>
          
          {citations.map((cite, idx) => (
            <div key={idx} className="flex justify-between items-baseline gap-4 py-2 font-sans text-sm text-[#5C4A3A] border-b border-dotted border-[#E0D5C0] last:border-b-0">
              <span>{idx + 1}. {cite.publisher || "Source"} — "{cite.title}"</span>
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
        {goPrev ? (
          <button
            onClick={goPrev}
            className="bg-transparent border-[1.5px] border-[#E0D5C0] py-3.5 px-5 rounded cursor-pointer font-sans text-sm font-medium text-[#5C4A3A] flex items-center gap-2 transition-all hover:border-[#1A1614] hover:text-[#1A1614]"
          >
            <ChevronLeft size={16} />
            <span className="text-left">
              <span className="font-serif italic text-[11px] text-[#8B6F4E] block mb-0.5 font-normal">Previous</span>
              Back
            </span>
          </button>
        ) : <div />}

        {goNext ? (
          <button
            onClick={isComplete ? goNext : async () => { await onMarkComplete?.(); }}
            className={`border-[1.5px] py-3.5 px-5 rounded cursor-pointer font-sans text-sm font-medium flex items-center gap-2 transition-all ${
              isComplete
                ? "bg-transparent border-[#E0D5C0] text-[#5C4A3A] hover:border-[#1A1614] hover:text-[#1A1614]"
                : "bg-[#1A1614] text-[#F5F1E8] border-[#1A1614] hover:bg-[#C4553F] hover:border-[#C4553F]"
            }`}
          >
            <span className="text-right">
              <span className="font-serif italic text-[11px] block mb-0.5 font-normal" style={{ color: isComplete ? "#8B6F4E" : "#E0A090" }}>
                {isComplete ? "Continue" : "Mark complete & continue"}
              </span>
              Next
            </span>
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={isComplete ? undefined : async () => { await onMarkComplete?.(); }}
            disabled={isComplete}
            className={`border-[1.5px] py-3.5 px-5 rounded font-sans text-sm font-medium flex items-center gap-2 transition-all ${
              isComplete
                ? "bg-transparent border-[#E0D5C0] text-[#8B6F4E] cursor-default"
                : "bg-[#1A1614] text-[#F5F1E8] border-[#1A1614] cursor-pointer hover:bg-[#C4553F] hover:border-[#C4553F]"
            }`}
          >
            <span className="text-right">
              <span className="font-serif italic text-[11px] block mb-0.5 font-normal" style={{ color: isComplete ? "#8B6F4E" : "#E0A090" }}>
                {isComplete ? "Course complete" : "Mark complete"}
              </span>
              {isComplete ? "✓ Done" : "Finish"}
            </span>
          </button>
        )}
      </div>
    </main>
  );
}
