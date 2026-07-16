/**
 * Kalvi School Loader — custom animated SVG loader with school theme.
 *
 * Variants:
 *  - "page"    : full-screen overlay (used for auth guards / route transitions)
 *  - "section" : centred block inside a content area (used for data fetching)
 *  - "inline"  : small inline spinner (used inside buttons / table cells)
 */

import { useEffect, useState } from "react";

/* ─── tiny hook so the dots animate with a staggered delay ─── */
function useDots() {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 450);
    return () => clearInterval(t);
  }, []);
  return ".".repeat(dots);
}

/* ══════════════════════════════════════════════════════════════
   CORE ILLUSTRATION — animated school building + floating elements
   ══════════════════════════════════════════════════════════════ */
function SchoolIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <style>{`
        @keyframes kv-bob    { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-5px)} }
        @keyframes kv-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes kv-float1 { 0%,100%{transform:translate(0,0) rotate(-8deg)} 50%{transform:translate(4px,-8px) rotate(4deg)} }
        @keyframes kv-float2 { 0%,100%{transform:translate(0,0) rotate(6deg)}  50%{transform:translate(-5px,-6px) rotate(-4deg)} }
        @keyframes kv-beam   { 0%,100%{opacity:.15} 50%{opacity:.55} }
        @keyframes kv-pulse  { 0%,100%{r:3} 50%{r:4.5} }
        @keyframes kv-door   { 0%,100%{transform:scaleX(1) } 50%{transform:scaleX(.55)} }

        .kv-bob    { animation: kv-bob    2.4s ease-in-out infinite; }
        .kv-float1 { animation: kv-float1 3.1s ease-in-out infinite; transform-origin:center; }
        .kv-float2 { animation: kv-float2 2.7s ease-in-out infinite; transform-origin:center; }
        .kv-spin   { animation: kv-spin   8s   linear      infinite; transform-origin:48px 18px; }
        .kv-beam   { animation: kv-beam   1.8s ease-in-out infinite; }
        .kv-p1     { animation: kv-pulse  1.4s ease-in-out infinite; }
        .kv-p2     { animation: kv-pulse  1.4s ease-in-out infinite .3s; }
        .kv-p3     { animation: kv-pulse  1.4s ease-in-out infinite .6s; }
        .kv-door   { animation: kv-door   2.2s ease-in-out infinite; transform-origin:42px 72px; }
      `}</style>

      {/* ── glow base ── */}
      <ellipse cx="48" cy="88" rx="28" ry="4" fill="#6366f1" opacity=".12" />

      {/* ── building body ── */}
      <g className="kv-bob">
        {/* main body */}
        <rect x="18" y="46" width="60" height="36" rx="2" fill="#e0e7ff" />
        {/* roof */}
        <path d="M14 48 L48 24 L82 48 Z" fill="#6366f1" />
        {/* roof highlight */}
        <path d="M28 44 L48 29 L68 44 Z" fill="#818cf8" opacity=".5" />

        {/* flag pole */}
        <rect x="47" y="18" width="2" height="10" fill="#c7d2fe" rx="1" />
        {/* flag */}
        <path d="M49 19 L56 22 L49 25 Z" fill="#f59e0b" />

        {/* ── windows (3 top) ── */}
        <rect x="24" y="52" width="10" height="9" rx="1.5" fill="#6366f1" opacity=".8" />
        <rect x="43" y="52" width="10" height="9" rx="1.5" fill="#6366f1" opacity=".8" />
        <rect x="62" y="52" width="10" height="9" rx="1.5" fill="#6366f1" opacity=".8" />
        {/* window shine */}
        <rect x="25" y="53" width="3" height="2" rx=".5" fill="white" opacity=".6" />
        <rect x="44" y="53" width="3" height="2" rx=".5" fill="white" opacity=".6" />
        <rect x="63" y="53" width="3" height="2" rx=".5" fill="white" opacity=".6" />

        {/* ── door ── */}
        <rect x="39" y="62" width="18" height="20" rx="2" fill="#6366f1" className="kv-door" />
        <rect x="39" y="62" width="18" height="20" rx="2" fill="#6366f1" opacity=".3" />
        {/* door knob */}
        <circle cx="54" cy="73" r="1.5" fill="#fbbf24" />

        {/* ── steps ── */}
        <rect x="36" y="80" width="24" height="3" rx="1" fill="#c7d2fe" />
        <rect x="33" y="83" width="30" height="3" rx="1" fill="#c7d2fe" />
      </g>

      {/* ── rotating sun / clock above ── */}
      <g className="kv-spin">
        <circle cx="48" cy="18" r="5" fill="#fbbf24" opacity=".9" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <rect
            key={i}
            x="47.3" y="10"
            width="1.4" height="3"
            rx=".7"
            fill="#fcd34d"
            transform={`rotate(${deg} 48 18)`}
          />
        ))}
      </g>

      {/* ── floating book (top-left) ── */}
      <g className="kv-float1" style={{ transformOrigin: "14px 30px" }}>
        <rect x="6" y="24" width="16" height="12" rx="1.5" fill="#f59e0b" />
        <rect x="7" y="25" width="1.5" height="10" rx=".5" fill="#d97706" />
        <line x1="9.5" y1="27" x2="20" y2="27" stroke="white" strokeWidth=".8" opacity=".7" />
        <line x1="9.5" y1="29.5" x2="20" y2="29.5" stroke="white" strokeWidth=".8" opacity=".7" />
        <line x1="9.5" y1="32" x2="20" y2="32" stroke="white" strokeWidth=".8" opacity=".7" />
      </g>

      {/* ── floating graduation cap (top-right) ── */}
      <g className="kv-float2" style={{ transformOrigin: "80px 26px" }}>
        <ellipse cx="80" cy="29" rx="10" ry="2.5" fill="#6366f1" />
        <rect x="78" y="22" width="4" height="7" rx="1" fill="#6366f1" />
        <polygon points="80,20 74,25 86,25" fill="#4f46e5" />
        <line x1="90" y1="29" x2="90" y2="34" stroke="#fbbf24" strokeWidth="1.2" />
        <circle cx="90" cy="35" r="1.5" fill="#fbbf24" />
      </g>

      {/* ── light beam from window ── */}
      <path
        d="M24 61 L10 80 L20 80 L29 61 Z"
        fill="#fcd34d"
        opacity=".1"
        className="kv-beam"
      />

      {/* ── loading dots below building ── */}
      <circle cx="41" cy="91" r="3" fill="#6366f1" className="kv-p1" />
      <circle cx="48" cy="91" r="3" fill="#818cf8" className="kv-p2" />
      <circle cx="55" cy="91" r="3" fill="#a5b4fc" className="kv-p3" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE LOADER — full-screen, used in auth guards
   ══════════════════════════════════════════════════════════════ */
export function PageLoader() {
  const dots = useDots();
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#eef2ff 0%,#f8fafc 60%,#ede9fe 100%)",
        zIndex: 9999,
      }}
    >
      {/* outer ring */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* spinning dashed ring */}
        <svg
          width="148"
          height="148"
          viewBox="0 0 148 148"
          style={{
            position: "absolute",
            animation: "kv-spin 4s linear infinite",
          }}
          aria-hidden="true"
        >
          <style>{`@keyframes kv-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          <circle
            cx="74" cy="74" r="68"
            stroke="#6366f1"
            strokeWidth="3"
            strokeDasharray="18 10"
            fill="none"
            opacity=".35"
          />
        </svg>

        {/* inner card */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "white",
            boxShadow: "0 8px 40px rgba(99,102,241,.18), 0 2px 8px rgba(0,0,0,.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SchoolIllustration size={84} />
        </div>
      </div>

      {/* brand name */}
      <div
        style={{
          marginTop: 28,
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "-0.5px",
          background: "linear-gradient(90deg,#4f46e5,#7c3aed)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Kalvi
      </div>

      {/* tagline */}
      <div
        style={{
          marginTop: 6,
          fontSize: 13,
          color: "#64748b",
          letterSpacing: "0.02em",
          minWidth: 140,
          textAlign: "center",
        }}
      >
        Loading{dots}
      </div>

      {/* progress bar */}
      <div
        style={{
          marginTop: 20,
          width: 160,
          height: 3,
          borderRadius: 99,
          background: "#e0e7ff",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 99,
            background: "linear-gradient(90deg,#6366f1,#818cf8)",
            animation: "kv-progress 1.6s ease-in-out infinite",
          }}
        />
        <style>{`
          @keyframes kv-progress {
            0%   { width:0%;   marginLeft:0 }
            50%  { width:70%;  marginLeft:0 }
            100% { width:0%;   marginLeft:100% }
          }
        `}</style>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SECTION LOADER — centred block inside a content card
   ══════════════════════════════════════════════════════════════ */
export function SectionLoader({ label }: { label?: string }) {
  const dots = useDots();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 0",
        gap: 12,
      }}
    >
      <SchoolIllustration size={72} />
      <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
        {label ?? "Loading"}
        {dots}
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   INLINE LOADER — tiny spinner for buttons / table cells
   ══════════════════════════════════════════════════════════════ */
export function InlineLoader({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ animation: "kv-spin 1s linear infinite", display: "inline-block" }}
    >
      <style>{`@keyframes kv-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="9" stroke="#c7d2fe" strokeWidth="3" />
      <path
        d="M12 3 A9 9 0 0 1 21 12"
        stroke="#6366f1"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   SPINNER — drop-in replacement for the old <Spinner />
   Routes all existing usage to SectionLoader automatically.
   ══════════════════════════════════════════════════════════════ */
export function Spinner() {
  return <SectionLoader />;
}
