import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { publicApi } from "../lib/publicApi";
import { parseApiError, type ApiFieldIssue } from "../api/client";
import { FormError } from "../components/ui";

export default function Signup() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<ApiFieldIssue[]>([]);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIssues([]);
    setLoading(true);
    try {
      const res = await publicApi.post("/auth/signup", {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      // Auto-login: store token and set user
      loginWithToken(res.data.token, res.data.user);
      // After signup, user has no school yet → go create one
      navigate("/create-school", { replace: true });
    } catch (err) {
      const parsed = parseApiError(err, "Could not create your account. Please try again.");
      setError(parsed.message);
      setIssues(parsed.issues);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-800 p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="text-4xl">🎓</div>
          <h1 className="text-2xl font-bold mt-2">Create your account</h1>
          <p className="text-sm text-slate-500">
            You'll set up your school in the next step
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Your Full Name <span className="text-red-400">*</span></label>
            <input
              className="input"
              placeholder="e.g. Ravi Kumar"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Email Address <span className="text-red-400">*</span></label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Password <span className="text-red-400">*</span></label>
            <input
              className="input"
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
              minLength={8}
            />
            <p className="mt-1 text-xs text-slate-400">
              Must include uppercase, lowercase, and a number.
            </p>
          </div>

          <FormError message={error} issues={issues} />

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create Account →"}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-400 space-y-2">
          <p>
            Already have an account?{" "}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
          <p>
            <Link to="/" className="text-slate-400 hover:text-slate-600 transition">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
