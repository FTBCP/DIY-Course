import { useState, useEffect } from "react";
import { BookOpen, Clock, Target, ArrowRight, Check, ChevronLeft, ChevronRight, PlayCircle, ExternalLink, Menu, Circle, CheckCircle2, Sparkles } from "lucide-react";

export default function DIYCoursesMockups() {
  const [screen, setScreen] = useState("intake");

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F5F1E8",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: "#1A1614",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; }

        .serif { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; }
        .sans { font-family: 'Inter', system-ui, sans-serif; }

        .screen-tabs {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          display: flex;
          gap: 4px;
          background: rgba(26, 22, 20, 0.92);
          padding: 6px;
          border-radius: 999px;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .screen-tab {
          background: transparent;
          border: none;
          color: #F5F1E8;
          padding: 8px 18px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.02em;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .screen-tab.active {
          background: #C4553F;
          color: #F5F1E8;
        }
        .screen-tab:hover:not(.active) {
          background: rgba(255,255,255,0.08);
        }

        /* === INTAKE === */
        .intake-wrap {
          max-width: 680px;
          margin: 0 auto;
          padding: 120px 32px 80px;
        }
        .intake-eyebrow {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8B6F4E;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .intake-title {
          font-size: 52px;
          line-height: 1.05;
          font-weight: 500;
          letter-spacing: -0.02em;
          margin: 0 0 20px;
          color: #1A1614;
        }
        .intake-title em {
          font-style: italic;
          font-weight: 400;
          color: #C4553F;
        }
        .intake-sub {
          font-size: 17px;
          line-height: 1.5;
          color: #5C4A3A;
          margin-bottom: 56px;
          max-width: 520px;
        }
        .q-block { margin-bottom: 44px; }
        .q-num {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 14px;
          color: #8B6F4E;
          margin-bottom: 8px;
          display: block;
        }
        .q-label {
          font-size: 22px;
          font-weight: 500;
          letter-spacing: -0.01em;
          margin-bottom: 16px;
          color: #1A1614;
          font-family: 'Fraunces', serif;
        }
        .q-input {
          width: 100%;
          padding: 16px 20px;
          font-size: 16px;
          background: #FAF6EC;
          border: 1.5px solid #E0D5C0;
          border-radius: 4px;
          font-family: 'Inter', sans-serif;
          color: #1A1614;
          transition: all 0.15s;
        }
        .q-input:focus {
          outline: none;
          border-color: #C4553F;
          background: #fff;
        }
        .q-input::placeholder { color: #A89680; }

        .chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip {
          padding: 10px 18px;
          background: #FAF6EC;
          border: 1.5px solid #E0D5C0;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 500;
          color: #5C4A3A;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .chip:hover { border-color: #C4553F; }
        .chip.selected {
          background: #1A1614;
          color: #F5F1E8;
          border-color: #1A1614;
        }

        .cta-btn {
          margin-top: 24px;
          background: #1A1614;
          color: #F5F1E8;
          border: none;
          padding: 18px 32px;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.02em;
          cursor: pointer;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .cta-btn:hover { background: #C4553F; }

        .intake-footnote {
          margin-top: 48px;
          padding-top: 32px;
          border-top: 1px solid #E0D5C0;
          font-size: 13px;
          color: #8B6F4E;
          font-style: italic;
          font-family: 'Fraunces', serif;
        }

        /* === LOADING === */
        .loading-wrap {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 32px;
          position: relative;
        }
        .loading-eyebrow {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8B6F4E;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .loading-title {
          font-family: 'Fraunces', serif;
          font-size: 42px;
          font-weight: 400;
          font-style: italic;
          letter-spacing: -0.02em;
          text-align: center;
          max-width: 600px;
          margin: 0 0 12px;
          line-height: 1.15;
        }
        .loading-topic {
          font-family: 'Fraunces', serif;
          font-size: 42px;
          font-weight: 500;
          font-style: normal;
          color: #C4553F;
          text-align: center;
          margin-bottom: 56px;
          line-height: 1.15;
          max-width: 600px;
        }

        .steps-list {
          width: 100%;
          max-width: 440px;
          list-style: none;
          padding: 0;
          margin: 0 0 48px;
        }
        .step-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid #E0D5C0;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          color: #5C4A3A;
          transition: all 0.3s;
        }
        .step-item:last-child { border-bottom: none; }
        .step-item.done { color: #1A1614; }
        .step-item.active { color: #1A1614; font-weight: 500; }
        .step-item.pending { opacity: 0.45; }

        .step-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #E0D5C0;
          border-top-color: #C4553F;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #C4553F;
          border-radius: 50%;
          animation: pulse 1.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .progress-strip {
          width: 100%;
          max-width: 440px;
          height: 3px;
          background: #E0D5C0;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 16px;
        }
        .progress-fill {
          height: 100%;
          background: #C4553F;
          border-radius: 999px;
          animation: fillBar 8s ease-in-out infinite;
        }
        @keyframes fillBar {
          0% { width: 15%; }
          50% { width: 72%; }
          100% { width: 88%; }
        }

        .loading-foot {
          font-size: 13px;
          color: #8B6F4E;
          font-style: italic;
          font-family: 'Fraunces', serif;
        }

        /* === COURSE PLAYER === */
        .player {
          display: grid;
          grid-template-columns: 300px 1fr;
          min-height: 100vh;
        }
        .sidebar {
          background: #1A1614;
          color: #F5F1E8;
          padding: 68px 0 32px;
          overflow-y: auto;
          border-right: 1px solid #2A2420;
        }
        .sidebar-header {
          padding: 0 28px 24px;
          border-bottom: 1px solid #2A2420;
          margin-bottom: 20px;
        }
        .sidebar-eyebrow {
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8B6F4E;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .sidebar-title {
          font-family: 'Fraunces', serif;
          font-size: 22px;
          font-weight: 500;
          line-height: 1.2;
          color: #F5F1E8;
          margin: 0 0 10px;
        }
        .sidebar-progress-text {
          font-size: 12px;
          color: #8B6F4E;
          margin-top: 8px;
          font-family: 'Inter', sans-serif;
        }
        .sidebar-progress-bar {
          height: 2px;
          background: #2A2420;
          border-radius: 999px;
          margin-top: 8px;
          overflow: hidden;
        }
        .sidebar-progress-bar-fill {
          height: 100%;
          width: 30%;
          background: #C4553F;
        }

        .module-label {
          padding: 16px 28px 8px;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #5C4A3A;
          font-weight: 600;
        }

        .lesson-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 11px 28px;
          cursor: pointer;
          border-left: 2px solid transparent;
          transition: all 0.15s;
          font-size: 14px;
          line-height: 1.4;
          color: #A89680;
        }
        .lesson-item:hover {
          background: #2A2420;
          color: #F5F1E8;
        }
        .lesson-item.current {
          background: #2A2420;
          border-left-color: #C4553F;
          color: #F5F1E8;
        }
        .lesson-item.complete { color: #7A6A56; }
        .lesson-icon {
          margin-top: 2px;
          flex-shrink: 0;
        }
        .lesson-num {
          font-family: 'Fraunces', serif;
          font-size: 11px;
          font-style: italic;
          color: #8B6F4E;
          margin-right: 2px;
        }

        /* Main content */
        .main {
          padding: 68px 72px 120px;
          max-width: 820px;
          margin: 0 auto;
          width: 100%;
        }
        .main-crumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #8B6F4E;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .main-title {
          font-family: 'Fraunces', serif;
          font-size: 46px;
          font-weight: 500;
          line-height: 1.1;
          letter-spacing: -0.02em;
          margin: 0 0 24px;
          color: #1A1614;
        }
        .main-meta {
          display: flex;
          gap: 20px;
          padding-bottom: 28px;
          margin-bottom: 40px;
          border-bottom: 1px solid #E0D5C0;
          font-size: 13px;
          color: #8B6F4E;
          font-family: 'Inter', sans-serif;
        }
        .main-meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .prose {
          font-family: 'Fraunces', serif;
          font-size: 19px;
          line-height: 1.65;
          color: #2A2420;
          font-weight: 400;
        }
        .prose p { margin: 0 0 24px; }
        .prose h3 {
          font-family: 'Fraunces', serif;
          font-size: 24px;
          font-weight: 600;
          margin: 44px 0 16px;
          letter-spacing: -0.01em;
        }
        .prose strong { color: #1A1614; font-weight: 600; }
        .prose em { font-style: italic; color: #C4553F; }

        .citation {
          color: #C4553F;
          text-decoration: none;
          border-bottom: 1px dotted #C4553F;
          font-size: 0.75em;
          vertical-align: super;
          margin-left: 2px;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
        }

        .video-card {
          margin: 40px 0;
          border: 1.5px solid #E0D5C0;
          border-radius: 4px;
          overflow: hidden;
          background: #FAF6EC;
        }
        .video-thumb {
          aspect-ratio: 16/9;
          background:
            linear-gradient(135deg, rgba(26,22,20,0.6) 0%, rgba(196,85,63,0.4) 100%),
            url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225"><rect fill="%235C4A3A" width="400" height="225"/><circle fill="%23C4553F" opacity="0.3" cx="120" cy="100" r="60"/><circle fill="%238B6F4E" opacity="0.5" cx="280" cy="140" r="45"/></svg>');
          background-size: cover;
          background-position: center;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: pointer;
        }
        .play-circle {
          width: 68px;
          height: 68px;
          background: rgba(245, 241, 232, 0.95);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1A1614;
        }
        .video-meta {
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
        }
        .video-channel {
          color: #1A1614;
          font-weight: 600;
        }
        .video-stats {
          color: #8B6F4E;
          font-size: 12px;
        }

        .sources-block {
          margin-top: 56px;
          padding: 24px 28px;
          background: #FAF6EC;
          border-left: 2px solid #C4553F;
          border-radius: 2px;
        }
        .sources-label {
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8B6F4E;
          font-weight: 600;
          margin-bottom: 14px;
        }
        .source-item {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 16px;
          padding: 8px 0;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #5C4A3A;
          border-bottom: 1px dotted #E0D5C0;
        }
        .source-item:last-child { border-bottom: none; }
        .source-link {
          color: #1A1614;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .source-link:hover { color: #C4553F; }

        .lesson-footer {
          margin-top: 64px;
          padding-top: 32px;
          border-top: 1px solid #E0D5C0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }
        .nav-btn {
          background: transparent;
          border: 1.5px solid #E0D5C0;
          padding: 14px 22px;
          border-radius: 4px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #5C4A3A;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.15s;
        }
        .nav-btn:hover { border-color: #1A1614; color: #1A1614; }
        .nav-btn.primary {
          background: #1A1614;
          color: #F5F1E8;
          border-color: #1A1614;
        }
        .nav-btn.primary:hover { background: #C4553F; border-color: #C4553F; }
        .nav-btn-sub {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 11px;
          color: #8B6F4E;
          display: block;
          margin-bottom: 2px;
          font-weight: 400;
        }

        .complete-pill {
          background: #1F3A1F;
          color: #D8E8C4;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'Inter', sans-serif;
        }
      `}</style>

      {/* Screen selector */}
      <div className="screen-tabs">
        <button className={`screen-tab ${screen === "intake" ? "active" : ""}`} onClick={() => setScreen("intake")}>
          1. Intake
        </button>
        <button className={`screen-tab ${screen === "loading" ? "active" : ""}`} onClick={() => setScreen("loading")}>
          2. Generating
        </button>
        <button className={`screen-tab ${screen === "player" ? "active" : ""}`} onClick={() => setScreen("player")}>
          3. Course Player
        </button>
      </div>

      {screen === "intake" && <IntakeScreen />}
      {screen === "loading" && <LoadingScreen />}
      {screen === "player" && <PlayerScreen />}
    </div>
  );
}

function IntakeScreen() {
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState("intermediate");
  const [time, setTime] = useState("weekend");

  return (
    <div className="intake-wrap">
      <div className="intake-eyebrow">Start a new course</div>
      <h1 className="intake-title serif">
        What would you like<br/>to <em>understand</em>?
      </h1>
      <p className="intake-sub">
        Tell us what you want to learn. We'll research the web, pull the best sources, and build you a course you can finish over a weekend or a month.
      </p>

      <div className="q-block">
        <span className="q-num">01</span>
        <label className="q-label">Your topic</label>
        <input
          className="q-input"
          type="text"
          placeholder="e.g. How compound interest works, Basic photography, Acquiring a small business..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </div>

      <div className="q-block">
        <span className="q-num">02</span>
        <label className="q-label">How deep do you want to go?</label>
        <div className="chip-row">
          {[
            { id: "overview", label: "Overview" },
            { id: "intermediate", label: "Intermediate" },
            { id: "deep", label: "Deep dive" },
          ].map((d) => (
            <button
              key={d.id}
              className={`chip ${depth === d.id ? "selected" : ""}`}
              onClick={() => setDepth(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="q-block">
        <span className="q-num">03</span>
        <label className="q-label">How much time do you have?</label>
        <div className="chip-row">
          {[
            { id: "afternoon", label: "An afternoon" },
            { id: "weekend", label: "A weekend" },
            { id: "week", label: "A week" },
            { id: "month", label: "A month" },
          ].map((t) => (
            <button
              key={t.id}
              className={`chip ${time === t.id ? "selected" : ""}`}
              onClick={() => setTime(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <button className="cta-btn">
        Generate my course
        <ArrowRight size={16} />
      </button>

      <p className="intake-footnote">
        Generation takes about 90 seconds. Every lesson includes cited sources and a curated video.
      </p>
    </div>
  );
}

function LoadingScreen() {
  const [stepIdx, setStepIdx] = useState(0);
  const steps = [
    "Framing the curriculum",
    "Searching authoritative sources",
    "Drafting lesson content",
    "Finding video companions",
    "Organizing modules",
  ];

  useEffect(() => {
    const t = setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length);
    }, 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="loading-wrap">
      <div className="loading-eyebrow">Building your course</div>
      <h1 className="loading-title">A personalized course on</h1>
      <div className="loading-topic serif">Compound interest</div>

      <div className="progress-strip">
        <div className="progress-fill"></div>
      </div>

      <ul className="steps-list">
        {steps.map((s, i) => {
          const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
          return (
            <li key={s} className={`step-item ${state}`}>
              <span className="step-icon">
                {state === "done" && <Check size={16} color="#C4553F" strokeWidth={2.5} />}
                {state === "active" && <div className="spinner"></div>}
                {state === "pending" && <Circle size={14} color="#A89680" />}
              </span>
              {s}
            </li>
          );
        })}
      </ul>

      <div className="loading-foot">
        Typically 60–120 seconds. We're reading real sources, not making things up.
      </div>
    </div>
  );
}

function PlayerScreen() {
  const lessons = [
    { mod: "Foundations", items: [
      { t: "What makes compound interest different", state: "complete" },
      { t: "The simple-interest baseline", state: "complete" },
      { t: "Rate, time, and principal", state: "complete" },
    ]},
    { mod: "How it compounds", items: [
      { t: "The exponential formula", state: "current" },
      { t: "Monthly vs annual compounding", state: "upcoming" },
      { t: "Continuous compounding", state: "upcoming" },
    ]},
    { mod: "Applications", items: [
      { t: "Savings & retirement", state: "upcoming" },
      { t: "Debt and the reverse case", state: "upcoming" },
      { t: "Rules of thumb (72, 114, 144)", state: "upcoming" },
    ]},
  ];

  return (
    <div className="player">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-eyebrow">Your Course</div>
          <h2 className="sidebar-title">Compound Interest, Explained</h2>
          <div className="sidebar-progress-bar">
            <div className="sidebar-progress-bar-fill"></div>
          </div>
          <div className="sidebar-progress-text">3 of 9 lessons complete</div>
        </div>

        {lessons.map((group, gi) => (
          <div key={gi}>
            <div className="module-label">{group.mod}</div>
            {group.items.map((l, li) => {
              const num = gi * 3 + li + 1;
              return (
                <div key={li} className={`lesson-item ${l.state === "current" ? "current" : ""} ${l.state === "complete" ? "complete" : ""}`}>
                  <span className="lesson-icon">
                    {l.state === "complete" && <CheckCircle2 size={16} color="#5C7A3A" strokeWidth={2} />}
                    {l.state === "current" && <Circle size={16} color="#C4553F" strokeWidth={2.5} fill="#C4553F" />}
                    {l.state === "upcoming" && <Circle size={16} color="#5C4A3A" strokeWidth={1.5} />}
                  </span>
                  <span><span className="lesson-num">{String(num).padStart(2, "0")} &nbsp;</span>{l.t}</span>
                </div>
              );
            })}
          </div>
        ))}
      </aside>

      <main className="main">
        <div className="main-crumb">
          <span>Module 2 · How it compounds</span>
          <span>·</span>
          <span>Lesson 04</span>
        </div>
        <h1 className="main-title">The exponential formula</h1>
        <div className="main-meta">
          <div className="main-meta-item"><Clock size={14} /> 6 min read</div>
          <div className="main-meta-item"><PlayCircle size={14} /> Video included</div>
          <div className="main-meta-item"><BookOpen size={14} /> 4 sources</div>
        </div>

        <div className="prose">
          <p>
            Compound interest differs from simple interest in a subtle but enormous way: <strong>interest earns interest</strong>. Each period, the interest you've already accumulated becomes part of the base that generates new interest. Over long horizons, this produces exponential growth — a curve that starts slow and ends steep.<a href="#" className="citation">1</a>
          </p>

          <p>
            The standard formula captures this compactly. If you invest a principal <em>P</em> at an annual rate <em>r</em>, compounded <em>n</em> times per year for <em>t</em> years, your ending balance <em>A</em> is:
          </p>

          <h3>A = P(1 + r/n)^(nt)</h3>

          <p>
            The exponent <em>nt</em> is where the power lives. Doubling the time doesn't double the result — it squares a portion of it. This is why financial planners obsess over starting early: a decade of compounding in your 20s meaningfully outperforms the same decade in your 50s, even with larger contributions later.<a href="#" className="citation">2</a>
          </p>

          <div className="video-card">
            <div className="video-thumb">
              <div className="play-circle">
                <PlayCircle size={32} fill="#C4553F" color="#C4553F" strokeWidth={1.5} />
              </div>
            </div>
            <div className="video-meta">
              <div>
                <div className="video-channel">Khan Academy</div>
                <div className="video-stats">Compound interest introduction · 2.4M views</div>
              </div>
              <ExternalLink size={14} color="#8B6F4E" />
            </div>
          </div>

          <p>
            A useful intuition pump: imagine a lily pad that doubles its coverage daily on a pond. On day 29, the pond is half-covered. On day 30, fully covered. The last day <em>doubles everything</em> that came before. Compound growth works the same way — the late periods dwarf the early ones, which is exactly backwards from how most people intuit it.<a href="#" className="citation">3</a>
          </p>
        </div>

        <div className="sources-block">
          <div className="sources-label">Sources cited in this lesson</div>
          <div className="source-item">
            <span>1. Investopedia — "Compound Interest: What Is It and How Does It Work?"</span>
            <a href="#" className="source-link">View <ExternalLink size={12} /></a>
          </div>
          <div className="source-item">
            <span>2. SEC.gov — "Investor.gov: Compound Interest Calculator"</span>
            <a href="#" className="source-link">View <ExternalLink size={12} /></a>
          </div>
          <div className="source-item">
            <span>3. Khan Academy — Finance & Capital Markets curriculum</span>
            <a href="#" className="source-link">View <ExternalLink size={12} /></a>
          </div>
          <div className="source-item">
            <span>4. Federal Reserve Bank of St. Louis — Economic Education resources</span>
            <a href="#" className="source-link">View <ExternalLink size={12} /></a>
          </div>
        </div>

        <div className="lesson-footer">
          <button className="nav-btn">
            <ChevronLeft size={16} />
            <span>
              <span className="nav-btn-sub">Previous</span>
              Rate, time, and principal
            </span>
          </button>
          <button className="nav-btn primary">
            <span>
              <span className="nav-btn-sub" style={{color: "#E0A090"}}>Mark complete & continue</span>
              Monthly vs annual compounding
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </main>
    </div>
  );
}
