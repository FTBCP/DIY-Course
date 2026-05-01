import { useState } from 'react';

export default function QuizBlock({ questions, onComplete }) {
  const [selected, setSelected] = useState({}); // { questionIdx: "A" | "B" | "C" | "D" }
  const [revealed, setRevealed] = useState(false);

  if (!questions || questions.length === 0) return null;

  const allAnswered = questions.every((_, i) => selected[i] !== undefined);

  const handleReveal = () => {
    const correct = questions.filter((q, i) => selected[i] === q.correct).length;
    setRevealed(true);
    onComplete?.({ correct, total: questions.length });
  };

  const optionStyle = (qIdx, letter) => {
    const q = questions[qIdx];
    if (!revealed) {
      return selected[qIdx] === letter
        ? 'border-[#1A1614] bg-[#EDE8DE] text-[#1A1614] font-semibold'
        : 'border-[#E0D5C0] text-[#5C4A3A] hover:border-[#1A1614] cursor-pointer';
    }
    if (letter === q.correct) return 'border-[#5C7A3A] bg-[#EBF2E6] text-[#3A5A1E] font-semibold';
    if (selected[qIdx] === letter) return 'border-[#C4553F] bg-[#FCF0EE] text-[#C4553F]';
    return 'border-[#E0D5C0] text-[#A89680]';
  };

  return (
    <div className="mt-14 mb-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-[#E0D5C0]" />
        <span className="text-[11px] tracking-[0.18em] uppercase text-[#8B6F4E] font-semibold font-sans">
          Check your understanding
        </span>
        <div className="h-px flex-1 bg-[#E0D5C0]" />
      </div>

      <div className="space-y-8">
        {questions.map((q, qIdx) => (
          <div key={qIdx}>
            <p className="font-sans text-[15px] font-semibold text-[#1A1614] mb-3 leading-snug">
              {qIdx + 1}. {q.question}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt) => {
                const letter = opt[0]; // "A", "B", "C", "D"
                return (
                  <button
                    key={letter}
                    disabled={revealed}
                    onClick={() => !revealed && setSelected(prev => ({ ...prev, [qIdx]: letter }))}
                    className={`w-full text-left px-4 py-3 rounded border-[1.5px] font-sans text-[14px] leading-snug transition-all ${optionStyle(qIdx, letter)} disabled:cursor-default`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {revealed && (
              <p className="mt-3 text-[13px] font-sans text-[#5C4A3A] leading-relaxed pl-1">
                <span className="font-semibold text-[#5C7A3A]">Why: </span>
                {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>

      {!revealed && (
        <button
          onClick={handleReveal}
          disabled={!allAnswered}
          className="mt-8 bg-[#1A1614] text-[#F5F1E8] border-none py-3 px-7 text-[14px] font-semibold rounded font-sans cursor-pointer hover:bg-[#C4553F] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Check answers
        </button>
      )}

      {revealed && (
        <div className="mt-6 flex items-center gap-2 text-[14px] font-sans font-semibold text-[#5C7A3A]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#5C7A3A" strokeWidth="1.5"/>
            <path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="#5C7A3A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {questions.filter((q, i) => selected[i] === q.correct).length} of {questions.length} correct
        </div>
      )}
    </div>
  );
}
