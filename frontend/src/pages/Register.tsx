import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { parseApiError, type ApiFieldIssue } from "../api/client";
import { publicApi } from "../lib/publicApi";
import { useAuth } from "../context/AuthContext";
import { ArrowRightIcon, ArrowLeftIcon, SchoolIcon } from "../components/icons";
import { FormError, FieldHint } from "../components/ui";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminName: "",
    email: "",
    password: "",
    city: "",
    state: "",
    board: "CBSE",
    minClassLevel: 1,
    maxClassLevel: 12,
    sectionsPerClass: 2,
  });
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<ApiFieldIssue[]>([]);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIssues([]);
    // Client-side check so users get instant, clear feedback.
    if (form.minClassLevel > form.maxClassLevel) {
      setError("Lowest class cannot be higher than the highest class.");
      return;
    }
    setLoading(true);
    try {
      await publicApi.post("/schools/register", {
        school: { name: form.name, slug: form.slug },
        admin: { name: form.adminName, email: form.email, password: form.password },
        settings: {
          city: form.city,
          state: form.state,
          board: form.board,
          minClassLevel: Number(form.minClassLevel),
          maxClassLevel: Number(form.maxClassLevel),
          sectionsPerClass: Number(form.sectionsPerClass),
        },
      });
      // Auto-login the new admin.
      await login(form.email, form.password, form.slug);
      navigate("/app", { replace: true });
    } catch (err) {
      const parsed = parseApiError(err, "We couldn't create your school. Please try again.");
      setError(parsed.message);
      setIssues(parsed.issues);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-800 p-4">
      <div className="card w-full max-w-2xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><SchoolIcon className="w-8 h-8" /></div>
          <h1 className="text-2xl font-bold mt-2">Register Your School</h1>
          <p className="text-sm text-slate-500">
            Set up your school in under 2 minutes
          </p>
        </div>
        {/* Step indicators */}
        <div className="flex gap-2 mb-6 justify-center text-xs text-slate-400">
          <span className="bg-brand-100 text-brand-700 font-semibold px-3 py-1 rounded-full">1 · School Info</span>
          <ArrowRightIcon className="w-4 h-4 text-slate-300 self-center" />
          <span className="bg-brand-100 text-brand-700 font-semibold px-3 py-1 rounded-full">2 · Admin Account</span>
          <ArrowRightIcon className="w-4 h-4 text-slate-300 self-center" />
          <span className="bg-brand-100 text-brand-700 font-semibold px-3 py-1 rounded-full">3 · Class Setup</span>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {/* Section 1 */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="bg-brand-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
              Your School
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">School Name <span className="text-red-400">*</span></label>
                <input className="input" placeholder="e.g. Springdale High School" value={form.name}
                  onChange={(e) => set("name", e.target.value)} required />
              </div>
              <div>
                <label className="label">School Code <span className="text-red-400">*</span></label>
                <input className="input" placeholder="e.g. springdale-high" value={form.slug}
                  onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} required />
                <FieldHint>
                  A short, unique ID for your school — staff type this when logging in.
                  Use lowercase letters, numbers and hyphens only.
                </FieldHint>
              </div>
              <div>
                <label className="label">City</label>
                <input className="input" placeholder="e.g. Chennai" value={form.city}
                  onChange={(e) => set("city", e.target.value)} />
              </div>
              <div>
                <label className="label">State</label>
                <input className="input" placeholder="e.g. Tamil Nadu" value={form.state}
                  onChange={(e) => set("state", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Curriculum Board <span className="text-red-400">*</span></label>
                <select className="input" value={form.board}
                  onChange={(e) => set("board", e.target.value)}>
                  <option value="CBSE">CBSE</option>
                  <option value="STATE">State Board</option>
                  <option value="ICSE">ICSE</option>
                  <option value="IB">IB</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="bg-brand-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
              Admin Account
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Your Name <span className="text-red-400">*</span></label>
                <input className="input" placeholder="e.g. Ravi Kumar" value={form.adminName}
                  onChange={(e) => set("adminName", e.target.value)} required />
              </div>
              <div>
                <label className="label">Email Address <span className="text-red-400">*</span></label>
                <input className="input" type="email" placeholder="admin@yourschool.com" value={form.email}
                  onChange={(e) => set("email", e.target.value)} required />
              </div>
              <div className="md:col-span-2">
                <label className="label">Password <span className="text-red-400">*</span></label>
                <input className="input" type="password" placeholder="At least 6 characters" value={form.password}
                  onChange={(e) => set("password", e.target.value)} required minLength={6} />
                <FieldHint>You can change this from Settings after logging in.</FieldHint>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="bg-brand-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">3</span>
              Class Structure
              <span className="text-xs font-normal text-slate-400">(you can change this later)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">First Class</label>
                <input className="input" type="number" min={1} max={20} value={form.minClassLevel}
                  onChange={(e) => set("minClassLevel", Number(e.target.value))} />
                <FieldHint>e.g. 1 for Class 1, or LKG enter 0</FieldHint>
              </div>
              <div>
                <label className="label">Last Class</label>
                <input className="input" type="number" min={1} max={20} value={form.maxClassLevel}
                  onChange={(e) => set("maxClassLevel", Number(e.target.value))} />
                <FieldHint>e.g. 10 or 12</FieldHint>
              </div>
              <div>
                <label className="label">Sections per Class</label>
                <input className="input" type="number" min={1} max={10} value={form.sectionsPerClass}
                  onChange={(e) => set("sectionsPerClass", Number(e.target.value))} />
                <FieldHint>e.g. 2 creates A and B in each class</FieldHint>
              </div>
            </div>
          </div>

          <div>
            <FormError message={error} issues={issues} />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Link to="/login" className="text-sm text-brand-600 flex items-center gap-1"><ArrowLeftIcon className="w-3.5 h-3.5" /> Already registered?</Link>
            <button className="btn-primary px-8" disabled={loading}>
              {loading ? "Setting up your school…" : <span className="flex items-center gap-1.5">Create My School <ArrowRightIcon className="w-4 h-4" /></span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
