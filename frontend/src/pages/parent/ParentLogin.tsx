import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParentAuth } from "../../context/ParentAuthContext";
import { parseApiError } from "../../api/client";
import { FormError, FieldHint } from "../../components/ui";

export default function ParentLogin() {
  const { login } = useParentAuth();
  const navigate = useNavigate();

  const [schoolSlug, setSchoolSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ message: string; issues: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(schoolSlug.trim().toLowerCase(), email.trim(), password);
      navigate("/parent/dashboard", { replace: true });

    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">👨‍👩‍👧</div>
          <h1 className="text-2xl font-bold text-slate-800">Parent Portal</h1>
          <p className="text-slate-500 text-sm mt-1">
            Sign in to view your child's progress
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <FormError message={error.message} issues={error.issues} />}

          {/* School code */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              School Code
            </label>
            <input
              type="text"
              value={schoolSlug}
              onChange={(e) => setSchoolSlug(e.target.value)}
              placeholder="e.g. greenwood"
              className="input w-full"
              required
              autoComplete="organization"
            />
            <FieldHint>
              The unique code for your school (provided during admission).
            </FieldHint>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Your Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="input w-full"
              required
              autoComplete="email"
            />
            <FieldHint>
              The email address you registered with the school.
            </FieldHint>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input w-full"
              required
              autoComplete="current-password"
            />
            <FieldHint>
              Contact your school administrator if you've forgotten your password.
            </FieldHint>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 text-base"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Back link */}
        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-sm text-slate-400 hover:text-slate-600 transition"
          >
            ← Back to Admin Login
          </a>
        </div>

        {/* Demo hint */}
        <div className="mt-4 p-3 bg-emerald-50 rounded-lg text-xs text-emerald-700">
          <strong>Demo:</strong> school code <code>greenwood</code> · email{" "}
          <code>vijay@parent.local</code> · password <code>Parent@123</code>
        </div>
      </div>
    </div>
  );
}
