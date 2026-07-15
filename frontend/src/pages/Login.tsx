import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { parseApiError } from "../api/client";
import { FormError } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [schoolSlug, setSchoolSlug] = useState("greenwood");
  const [email, setEmail] = useState("admin@school.local");
  const [password, setPassword] = useState("Admin@123");
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
          <p className="text-sm text-slate-500">Multi-School Management</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">School Code</label>
            <input
              className="input"
              placeholder="e.g. greenwood"
              value={schoolSlug}
              onChange={(e) => setSchoolSlug(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">
              The unique code your school was registered with.
            </p>
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
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
          <p className="bg-slate-50 rounded-lg p-2 border border-slate-100">
            <span className="font-medium text-slate-500">Demo:</span>{" "}
            greenwood / admin@school.local / Admin@123
          </p>
          <p>
            New school?{" "}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">
              Register here →
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
