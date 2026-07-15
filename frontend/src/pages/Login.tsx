import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { parseApiError } from "../api/client";
import { FormError } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolSlug, setSchoolSlug] = useState("");
  const [showSchoolCode, setShowSchoolCode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, schoolSlug.trim() || undefined);
      navigate("/app", { replace: true });
    } catch (err) {
      const msg = parseApiError(err, "Unable to sign in. Please try again.").message;
      // If the backend says "registered with more than one school", show school code field
      if (msg.includes("more than one school")) {
        setShowSchoolCode(true);
        setError("You have multiple schools. Please enter your school code to continue.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-brand-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-4">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to Kalvi</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your school account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <input
                className="input"
                type="email"
                placeholder="admin@yourschool.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* School code — only shown when user has multiple schools */}
            {showSchoolCode && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-xs font-medium text-amber-800 mb-2">
                  Multiple schools found for this email. Enter your school code to continue.
                </p>
                <label className="label">School Code</label>
                <input
                  className="input"
                  placeholder="e.g. springdale-high"
                  value={schoolSlug}
                  onChange={(e) => setSchoolSlug(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <FormError message={error} />

            <button className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2 text-sm">
            <p className="text-slate-500">
              New to Kalvi?{" "}
              <Link to="/signup" className="text-brand-600 font-semibold hover:underline">
                Create an account →
              </Link>
            </p>
            <p>
              <Link to="/" className="text-slate-400 hover:text-slate-600 text-xs transition">
                ← Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
