import { Link } from "react-router-dom";
import { CheckIcon, ArrowRightIcon } from "../../components/icons";

const MODULES = [
  {
    icon: "👨‍🎓",
    title: "Student Management",
    description:
      "Complete student profiles including admission number, DOB, gender, guardian details, and address. Search, filter, and export student records. Supports active and last-year student views.",
    highlights: [
      "Admission & profile management",
      "Guardian (parent) contact info",
      "Previous year student view with re-enroll",
      "Soft-delete with history preservation",
    ],
  },
  {
    icon: "👩‍🏫",
    title: "Staff Management",
    description:
      "Manage teaching and non-teaching staff. Assign class mentors, record employee numbers, designations, subjects, and contact info.",
    highlights: [
      "Employee profiles with designation & subject",
      "Class-mentor assignment",
      "Active/inactive status tracking",
    ],
  },
  {
    icon: "🏫",
    title: "Classes & Sections",
    description:
      "Fully configurable class structure. Set the class range (LKG to Class 12), number of sections per class (A, B, C…), and re-provision at any time.",
    highlights: [
      "Configurable class range and section count",
      "Live student counts per section",
      "Section-mentor teacher assignment",
    ],
  },
  {
    icon: "📅",
    title: "Attendance",
    description:
      "Daily section-level attendance. Mark all present with one click, then adjust individual records. View per-student attendance summaries.",
    highlights: [
      "Mark PRESENT / ABSENT / LATE / LEAVE",
      "Bulk 'Mark All Present' action",
      "Per-student percentage summary",
      "30-day recent history",
    ],
  },
  {
    icon: "💰",
    title: "Fee Management",
    description:
      "Class-specific fee heads with configurable default amounts. Multi-head invoicing with a line-item subform. Immutable payment ledger with receipt numbers and payment modes.",
    highlights: [
      "Per-class fee head configuration",
      "Multi-head invoice subform",
      "Payment ledger with receipt PDFs",
      "CASH / UPI / CARD / BANK / CHEQUE modes",
      "Outstanding fee tracking",
    ],
  },
  {
    icon: "📝",
    title: "Exams & Marks",
    description:
      "Create exams per class and subject. Record marks and auto-compute grades (A+ to F) based on configurable pass percentage. Per-student subject-wise breakdown.",
    highlights: [
      "Exam creation per class & subject",
      "Bulk marks entry with inline validation",
      "Auto grade computation (A+ to F)",
      "Overall percentage & grade summary",
    ],
  },
  {
    icon: "📄",
    title: "Report Cards (PDF)",
    description:
      "Generate printable, branded report cards as PDFs directly in the browser. Includes school header, student profile, subject-wise results, grade legend, overall grade, and signature lines.",
    highlights: [
      "A4 branded PDF report card",
      "Subject-wise marks table with grade chips",
      "PASS / FAIL stamp based on pass %",
      "Teacher & principal remarks",
      "Fee receipt PDFs per payment",
    ],
  },
  {
    icon: "🗓",
    title: "Academic Years",
    description:
      "Track student enrollment per academic year. Promote students end-of-year (individually or in bulk). View full enrollment history per student.",
    highlights: [
      "Create and manage academic years",
      "Student enrollment per year",
      "Bulk promotion / transfer / exit workflow",
      "Full enrollment history timeline",
    ],
  },
  {
    icon: "👨‍👩‍👧",
    title: "Parent Portal",
    description:
      "A dedicated parent-facing login with a child-centric view. Parents see attendance, fees, and exam results for their child — read-only, secure, isolated from admin.",
    highlights: [
      "Separate login at /parent/login",
      "Attendance summary + 30-day record",
      "Fee invoices with payment history",
      "Exam results & overall grade",
      "Class / section info",
    ],
  },
  {
    icon: "⚙️",
    title: "Preferences & Configuration",
    description:
      "Everything is configurable per school. The Preferences form lets school admins set branding, academic configuration, and toggle modules on or off — no developer needed.",
    highlights: [
      "School name, city, board, logo",
      "Class range, sections, pass %",
      "Currency & locale",
      "Per-module feature flags",
      "Fee configuration per class",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <span className="text-xl font-bold text-brand-800">Kalvi</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link to="/features" className="text-brand-700 font-semibold">Features</Link>
            <Link to="/pricing" className="hover:text-brand-600 transition">Pricing</Link>
            <Link to="/help" className="hover:text-brand-600 transition">Help Guide</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-brand-700">Sign in</Link>
            <Link to="/register" className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-700 transition">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-800 to-teal-700 text-white py-20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-extrabold">Every feature your school needs</h1>
          <p className="text-brand-100 mt-4 text-lg">
            10 fully configurable modules. Toggle what you need. Configure everything else.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex bg-white text-brand-800 font-bold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition shadow-lg"
          >
            Try All Features Free <ArrowRightIcon className="w-4 h-4 inline ml-1" />
          </Link>
        </div>
      </section>

      {/* Module list */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 space-y-10">
          {MODULES.map((mod, idx) => (
            <div
              key={mod.title}
              className={`bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col md:flex-row gap-8 ${
                idx % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-4xl">
                {mod.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800">{mod.title}</h3>
                <p className="text-slate-500 mt-2 leading-relaxed">{mod.description}</p>
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  {mod.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckIcon className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-brand-800 to-teal-700 text-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold">All features. One platform.</h2>
          <p className="text-brand-100 mt-3">Register free. No credit card.</p>
          <Link to="/register" className="mt-8 inline-flex bg-white text-brand-800 font-bold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition shadow-lg">
            🏫 Register Your School
          </Link>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-500 py-8 text-center text-sm">
        <Link to="/" className="text-white font-bold mr-4">🎓 Kalvi</Link>
        <Link to="/pricing" className="hover:text-white mr-4 transition">Pricing</Link>
        <Link to="/help" className="hover:text-white transition">Help Guide</Link>
        <p className="mt-4 text-xs">© {new Date().getFullYear()} Kalvi</p>
      </footer>
    </div>
  );
}
