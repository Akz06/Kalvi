import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { publicApi, api } from "../lib/publicApi";
import { parseApiError, type ApiFieldIssue } from "../api/client";
import { ArrowLeftIcon, ArrowRightIcon, SchoolIcon } from "../components/icons";
import { FormError } from "../components/ui";
import GoogleSignInButton from "../components/GoogleSignInButton";

export default function Signup() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<ApiFieldIssue[]>([]);
  const [loading, setLoading] = useState(false);

  // Google sign-in — same flow as Login (creates account if needed)
  const handleGoogleToken = useCallback(async (idToken: string) => {
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/google", { idToken });
      if (res.data.requiresSchoolSelection) {
        // Edge case: signed up via Google but email already has schools
        // Redirect to login to pick school
        navigate("/login", { replace: true });
        return;
      }
      loginWithToken(res.data.token, res.data.user);
      navigate(res.data.user.schoolId ? "/app" : "/create-school", { replace: true });
    } catch (err) {
      setError(parseApiError(err, "Google sign-in failed. Please try again.").message);
    } finally {
      setLoading(false);
    }
  }, []);

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
      // After signup, user has no school yet then go create one
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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><SchoolIcon className="w-8 h-8" /></div>
          <h1 className="text-2xl font-bold mt-2">Create your account</h1>
          <p className="text-sm text-slate-500">
            You'll set up your school in the next step
          </p>
        </div>

        {/* Google sign-up */}
        <GoogleSignInButton />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">or sign up with email</span>
          <div className="flex-1 h-px bg-slate-200" />
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
            {loading ? "Creating account…" : <span className="inline-flex items-center gap-1.5">Create Account <ArrowRightIcon className="w-4 h-4" /></span>}
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
               <ArrowLeftIcon className="w-3.5 h-3.5 inline mr-0.5" /> Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
