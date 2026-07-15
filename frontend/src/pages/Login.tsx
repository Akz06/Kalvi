import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { parseApiError } from "../api/client";
import { FormError } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [schoolSlug, setSchoolSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setError(parseApiError(err, "Unable to sign in. Please try again.").message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-800 p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="text-4xl">🎓</div>
          <h1 className="text-2xl font-bold mt-2">Kalvi</h1>
          <p className="text-sm text-slate-500">School Management System</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">School Code</label>
            <input
              className="input"
              placeholder="Your school's unique code"
              value={schoolSlug}
              onChange={(e) => setSchoolSlug(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-slate-400">
              The short code your school was registered with (e.g. "springdale").
            </p>
          </div>
          <div>
            <label className="label">Email Address</label>
            <input
              className="input"
              type="email"
              placeholder="admin@yourschool.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
          <FormError message={error} />
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <div className="mt-5 text-center text-xs text-slate-400 space-y-2">
          <p>
            New to Kalvi?{" "}
            <Link to="/signup" className="text-brand-600 font-medium hover:underline">
              Create an account →
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
