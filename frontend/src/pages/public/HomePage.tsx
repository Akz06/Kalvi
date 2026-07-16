import { Link } from "react-router-dom";
import { CheckIcon, ArrowRightIcon } from "../../components/icons";

const FEATURES = [
  {
    icon: "👨‍🎓",
    title: "Student Management",
    desc: "Admissions, profiles, academic history, guardian contacts — all in one place.",
  },
  {
    icon: "📅",
    title: "Attendance",
    desc: "Daily attendance per section, absence alerts, and percentage tracking.",
  },
  {
    icon: "💰",
    title: "Fee Management",
    desc: "Class-specific fee heads, multi-head invoicing, payment ledger, and receipts.",
  },
  {
    icon: "📝",
    title: "Exams & Report Cards",
    desc: "Create exams, record marks, auto-compute grades, and print PDF report cards.",
  },
  {
    icon: "🗓",
    title: "Academic Years",
    desc: "Year management, student enrollment, and end-of-year promotion workflows.",
  },
  {
    icon: "👨‍👩‍👧",
    title: "Parent Portal",
    desc: "Parents get a dedicated login to view attendance, fees, and exam results.",
  },
];

const BOARDS = ["CBSE", "State Board", "ICSE", "IB"];

const STATS = [
  { value: "6+", label: "Core modules" },
  { value: "PDF", label: "Receipts & report cards" },
  { value: "CBSE · ICSE · IB", label: "All major boards supported" },
  { value: "100%", label: "Your data, fully isolated" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Top Nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <span className="text-xl font-bold text-brand-800">Kalvi</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link to="/features" className="hover:text-brand-600 transition">Features</Link>
            <Link to="/pricing" className="hover:text-brand-600 transition">Pricing</Link>
            <Link to="/help" className="hover:text-brand-600 transition">Help Guide</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 hover:text-brand-700 transition"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-700 transition"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-brand-800 via-brand-700 to-teal-700 text-white overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute bottom-0 -left-20 w-72 h-72 bg-white/5 rounded-full" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6 animate-fade-in">
            <span className="text-yellow-300">✦</span>
            Any school · Fully configurable · CBSE · State Board · ICSE · IB
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight animate-slide-up">
            The Modern ERP<br />
            <span className="text-teal-300">Built for Every School</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-brand-100 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            One platform for student records, attendance, fee management, exams,
            report cards, and a parent portal — configurable per school, per class.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Link
              to="/register"
              className="bg-white text-brand-800 font-bold px-8 py-3.5 rounded-xl text-base hover:bg-brand-50 transition shadow-lg"
            >
              🏫 Register Your School — Free
            </Link>
            <Link
              to="/login"
              className="border border-white/30 bg-white/10 text-white font-semibold px-8 py-3.5 rounded-xl text-base hover:bg-white/20 transition"
            >
              Sign In <ArrowRightIcon className="w-4 h-4 inline ml-1" />
            </Link>
          </div>

          <p className="mt-4 text-sm text-brand-200 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            No credit card required · Set up your school in under 2 minutes
          </p>

          {/* Board badges */}
          <div className="mt-10 flex flex-wrap gap-2 justify-center">
            {BOARDS.map((b) => (
              <span
                key={b}
                className="bg-white/10 border border-white/20 text-white text-xs font-medium px-3 py-1 rounded-full"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Bar ───────────────────────────────────────── */}
      <section className="bg-brand-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-teal-300">{s.value}</p>
              <p className="text-sm text-brand-200 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Grid ────────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-brand-600 uppercase tracking-wider">
              Everything your school needs
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mt-2">
              12 modules, fully configurable
            </h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              Every feature can be toggled per school. Only activate what you need.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:-translate-y-1 transition-all"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-slate-800">{f.title}</h3>
                <p className="text-slate-500 text-sm mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 text-brand-600 font-semibold hover:text-brand-800 transition"
            >
              View all features <ArrowRightIcon className="w-4 h-4 inline ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Configurability Highlight ────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <span className="text-sm font-semibold text-teal-600 uppercase tracking-wider">
              Built for Indian schools
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mt-2">
              Every school is different.<br />Kalvi fits yours.
            </h2>
            <p className="text-slate-500 mt-4 leading-relaxed">
              Configure your class range (LKG to Class 12), board, currency, sections
              per class, pass percentage, and which modules are active — all from a
              simple Preferences form. No developer needed.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              {[
                "Class-specific fee heads with custom default amounts",
                "Per-school feature flags — enable only what you need",
                "Academic year management with student promotion workflows",
                "Configurable grading: CBSE, State Board, ICSE, IB",
                "Multi-currency support (INR, USD, EUR, and more)",
                "School branding — logo, colors, tagline, contact info",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              to="/register"
              className="mt-8 inline-flex bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-brand-700 transition"
            >
              Start Configuring Your School <ArrowRightIcon className="w-4 h-4 inline ml-1" />
            </Link>
          </div>

          {/* Mock config card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">
              ⚙️ School Preferences — Example Setup
            </h3>
            {[
              ["Board", "CBSE"],
              ["Class Range", "Class 1 – Class 12"],
              ["Sections per Class", "A, B"],
              ["Currency", "INR (₹)"],
              ["Pass Percentage", "35%"],
              ["Academic Year", "2024-2025"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm border-b border-slate-200 pb-2">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-800 font-medium">{v}</span>
              </div>
            ))}

            <div className="pt-2">
              <p className="text-xs text-slate-500 mb-2 font-medium">Active Modules</p>
              <div className="flex flex-wrap gap-2">
                {["Students", "Attendance", "Fees", "Exams", "Report Cards", "Parent Portal"].map(
                  (m) => (
                    <span
                      key={m}
                      className="bg-teal-50 text-teal-700 border border-teal-200 text-xs font-medium px-2.5 py-1 rounded-full"
                    >
                      <CheckIcon className="w-3 h-3 text-teal-600 inline mr-1" />{m}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Built for school administrators
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Kalvi is designed from the ground up for principals, admin staff, and teachers —
              not IT departments. If you can fill a form, you can run your school on Kalvi.
            </p>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
              {[
                { icon: "⚡", title: "Up in minutes", desc: "Register, configure your classes, and start adding students in one sitting. No installation, no IT help needed." },
                { icon: "🔒", title: "Your data is yours", desc: "Each school is fully isolated. No other school can ever see your students, fees, or records." },
                { icon: "📱", title: "Works on any device", desc: "Runs in any modern browser — desktop, tablet, or phone. No app to download." },
              ].map((item) => (
                <div key={item.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-semibold text-slate-800 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-brand-800 to-teal-700 text-white text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold">
            Ready to modernise your school?
          </h2>
          <p className="mt-4 text-brand-100 text-lg">
            Register your school in under 2 minutes. No setup fee, no credit card.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-brand-800 font-bold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition shadow-lg"
            >
              🏫 Register Your School
            </Link>
            <Link
              to="/pricing"
              className="border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🎓</span>
              <span className="text-white font-bold text-base">Kalvi</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-xs">
              Modern school management for CBSE, State Board, ICSE and IB schools across India.
            </p>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Product</p>
            <ul className="space-y-2">
              <li><Link to="/features" className="hover:text-white transition">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-white transition">Pricing</Link></li>
              <li><Link to="/help" className="hover:text-white transition">Help Guide</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Get Started</p>
            <ul className="space-y-2">
              <li><Link to="/register" className="hover:text-white transition">Register School</Link></li>
              <li><Link to="/login" className="hover:text-white transition">Admin Login</Link></li>
              <li><Link to="/parent/login" className="hover:text-white transition">Parent Login</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold mb-3">Boards Supported</p>
            <ul className="space-y-2">
              {BOARDS.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-slate-800 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} Kalvi · School Management System
        </div>
      </footer>
    </div>
  );
}
