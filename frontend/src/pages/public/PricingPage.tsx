import { Link } from "react-router-dom";

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    highlight: false,
    badge: null,
    description: "Perfect for small schools getting started.",
    features: [
      "Up to 200 students",
      "3 staff accounts",
      "Student management",
      "Attendance tracking",
      "Basic fee management",
      "Community support",
    ],
    cta: "Get Started Free",
    ctaTo: "/register",
    ctaStyle: "border border-brand-600 text-brand-600 hover:bg-brand-50",
  },
  {
    name: "School",
    price: "₹2,999",
    period: "per month",
    highlight: true,
    badge: "Most Popular",
    description: "Full-featured ERP for growing schools.",
    features: [
      "Unlimited students",
      "Unlimited staff",
      "All Starter features",
      "Exams & report cards (PDF)",
      "Academic year & promotion",
      "Parent portal",
      "Class-specific fee heads",
      "Priority support",
    ],
    cta: "Start 14-Day Trial",
    ctaTo: "/register",
    ctaStyle: "bg-brand-600 text-white hover:bg-brand-700",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    highlight: false,
    badge: null,
    description: "For school chains, trusts, and large institutions.",
    features: [
      "Multiple school branches",
      "All School features",
      "Custom branding & themes",
      "Dedicated onboarding",
      "SLA-backed support",
      "On-premise deployment option",
      "Custom module development",
    ],
    cta: "Contact Sales",
    ctaTo: "mailto:sales@schoolos.in",
    ctaStyle: "border border-slate-300 text-slate-700 hover:bg-slate-50",
  },
];

const FAQ = [
  {
    q: "Can I switch plans later?",
    a: "Yes. You can upgrade or downgrade at any time. Upgrades take effect immediately; downgrades apply at the end of your billing period.",
  },
  {
    q: "Do you support CBSE, State Board, and ICSE?",
    a: "Yes — all boards are supported. The grading scale, pass percentage, and report card format are configurable per school from the Preferences form.",
  },
  {
    q: "Is there a free trial for the School plan?",
    a: "Yes. The School plan comes with a 14-day free trial — no credit card required. You can register and explore all features immediately.",
  },
  {
          "Can multiple schools or branches use the same platform?",
    a: "Yes. Kalvi supports multiple schools. Each school or branch gets its own completely isolated environment — separate students, fees, staff, and configuration.",
  },
  {
    q: "Is data from one school visible to another?",
    a: "Never. Every record — students, fees, exams — belongs only to your school. No other school can access your data, ever.",
  },
  {
    q: "Can parents access the system?",
    a: "Yes. The Parent Portal is a separate login where parents can view their child's attendance, fees, and exam results. It's enabled per school via a feature flag.",
  },
];

export default function PricingPage() {
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
            <Link to="/features" className="hover:text-brand-600 transition">Features</Link>
            <Link to="/pricing" className="text-brand-700 font-semibold">Pricing</Link>
            <Link to="/help" className="hover:text-brand-600 transition">Help Guide</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-brand-700 transition">Sign in</Link>
            <Link to="/register" className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-700 transition">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-800 to-teal-700 text-white py-20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-extrabold">Simple, transparent pricing</h1>
          <p className="text-brand-100 mt-4 text-lg">
            Start free. Scale as your school grows. No hidden fees.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 shadow-sm flex flex-col ${
                plan.highlight
                  ? "bg-brand-800 text-white border-brand-700 shadow-xl scale-105"
                  : "bg-white text-slate-800 border-slate-200"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <h3 className={`text-lg font-bold ${plan.highlight ? "text-white" : "text-slate-800"}`}>
                {plan.name}
              </h3>
              <p className={`text-sm mt-1 ${plan.highlight ? "text-brand-200" : "text-slate-500"}`}>
                {plan.description}
              </p>
              <div className="mt-5">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                {plan.price !== "Custom" && (
                  <span className={`text-sm ml-1 ${plan.highlight ? "text-brand-200" : "text-slate-400"}`}>
                    /{plan.period}
                  </span>
                )}
              </div>

              <ul className="mt-6 space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className={`font-bold mt-0.5 flex-shrink-0 ${plan.highlight ? "text-teal-300" : "text-teal-600"}`}>✓</span>
                    <span className={plan.highlight ? "text-brand-100" : "text-slate-600"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={plan.ctaTo}
                className={`mt-8 w-full text-center font-semibold px-6 py-3 rounded-xl transition text-sm ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          All prices in INR · GST applicable · Cancel anytime
        </p>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-10">
            Frequently asked questions
          </h2>
          <div className="space-y-5">
            {FAQ.map((item) => (
              <details key={item.q} className="group border border-slate-200 rounded-xl overflow-hidden">
                <summary className="flex justify-between items-center px-5 py-4 cursor-pointer font-semibold text-slate-800 text-sm list-none hover:bg-slate-50 transition">
                  {item.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-brand-800 to-teal-700 text-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold">Start managing your school today</h2>
          <p className="text-brand-100 mt-3">Register in 2 minutes. No credit card needed.</p>
          <Link
            to="/register"
            className="mt-8 inline-flex bg-white text-brand-800 font-bold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition shadow-lg"
          >
            🏫 Register Your School — Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-500 py-8 text-center text-sm">
        <Link to="/" className="text-white font-bold mr-4">🎓 Kalvi</Link>
        <Link to="/features" className="hover:text-white mr-4 transition">Features</Link>
        <Link to="/help" className="hover:text-white transition">Help Guide</Link>
        <p className="mt-4 text-xs">© {new Date().getFullYear()} Kalvi</p>
      </footer>
    </div>
  );
}
