import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, parseApiError, type ApiFieldIssue } from "../api/client";
import { useAuth } from "../context/AuthContext";
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
      await api.post("/schools/register", {
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
          <div className="text-4xl">🏫</div>
          <h1 className="text-2xl font-bold mt-2">Register Your School</h1>
          <p className="text-sm text-slate-500">
            Set up a new tenant with a configurable class structure
          </p>
        </div>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">School Name</label>
            <input className="input" value={form.name}
              onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div>
            <label className="label">School Code (URL-safe)</label>
            <input className="input" placeholder="greenwood" value={form.slug}
              onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} required />
            <FieldHint>
              Lowercase letters, numbers and hyphens only. Staff will use this
              code to sign in.
            </FieldHint>
          </div>
          <div>
            <label className="label">Admin Name</label>
            <input className="input" value={form.adminName}
              onChange={(e) => set("adminName", e.target.value)} required />
          </div>
          <div>
            <label className="label">Admin Email</label>
            <input className="input" type="email" value={form.email}
              onChange={(e) => set("email", e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={form.password}
              onChange={(e) => set("password", e.target.value)} required minLength={6} />
            <FieldHint>At least 6 characters.</FieldHint>
          </div>
          <div>
            <label className="label">Board</label>
            <select className="input" value={form.board}
              onChange={(e) => set("board", e.target.value)}>
              <option value="CBSE">CBSE</option>
              <option value="STATE">State Board</option>
              <option value="ICSE">ICSE</option>
              <option value="IB">IB</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" value={form.city}
              onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <label className="label">State</label>
            <input className="input" value={form.state}
              onChange={(e) => set("state", e.target.value)} />
          </div>
          <div>
            <label className="label">Lowest Class</label>
            <input className="input" type="number" min={1} max={20} value={form.minClassLevel}
              onChange={(e) => set("minClassLevel", Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Highest Class</label>
            <input className="input" type="number" min={1} max={20} value={form.maxClassLevel}
              onChange={(e) => set("maxClassLevel", Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Sections per Class</label>
            <input className="input" type="number" min={1} max={10} value={form.sectionsPerClass}
              onChange={(e) => set("sectionsPerClass", Number(e.target.value))} />
          </div>
          <div className="md:col-span-2">
            <FormError message={error} issues={issues} />
          </div>
          <div className="md:col-span-2 flex items-center justify-between pt-2">
            <Link to="/login" className="text-sm text-brand-600">← Back to login</Link>
            <button className="btn-primary" disabled={loading}>
              {loading ? "Creating…" : "Create School"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
