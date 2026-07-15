import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, parseApiError } from "../api/client";
import { FormError } from "../components/ui";
import GoogleSignInButton from "../components/GoogleSignInButton";

interface SchoolOption {
  id: string | null;
  slug: string;
  name: string;
}

type Step = "credentials" | "pick-school";
type PickMode = "password" | "google"; // how the user authenticated

export default function Login() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("credentials");
  const [pickMode, setPickMode] = useState<PickMode>("password");

  // Password login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // School picker state (both modes)
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [googleEmail, setGoogleEmail] = useState(""); // used by Google school picker

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [switchingSlug, setSwitchingSlug] = useState<string | null>(null);

  // ── Helper: handle a scoped login response ──────────────────────────────
  function handleLoginResponse(data: {
    token: string;
    user: { schoolId: string | null; [k: string]: unknown };
  }) {
    loginWithToken(data.token, data.user as unknown as Parameters<typeof loginWithToken>[1]);
    navigate(data.user.schoolId ? "/app" : "/create-school", { replace: true });
  }

  // ── Step 1a: email + password ────────────────────────────────────────────
  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });

      if (res.data.requiresSchoolSelection) {
        setSchools(res.data.schools);
        setPickMode("password");
        setStep("pick-school");
        return;
      }

      handleLoginResponse(res.data);
    } catch (err) {
      setError(parseApiError(err, "Unable to sign in. Please try again.").message);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 1b: Google id_token ─────────────────────────────────────────────
  const handleGoogleToken = useCallback(async (idToken: string) => {
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/google", { idToken });

      if (res.data.requiresSchoolSelection) {
        setSchools(res.data.schools);
        setGoogleEmail(res.data._email ?? "");
        setPickMode("google");
        setStep("pick-school");
        return;
      }

      handleLoginResponse(res.data);
    } catch (err) {
      setError(parseApiError(err, "Google sign-in failed. Please try again.").message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Step 2: pick school ──────────────────────────────────────────────────
  async function selectSchool(slug: string) {
    setSwitchingSlug(slug);
    setError("");
    try {
      let res;
      if (pickMode === "google") {
        // Google flow: no password — just email + schoolSlug
        res = await api.post("/auth/google/select-school", {
          email: googleEmail,
          schoolSlug: slug,
        });
      } else {
        // Password flow: re-login with scoped slug
        res = await api.post("/auth/login", { email, password, schoolSlug: slug });
      }
      handleLoginResponse(res.data);
    } catch (err) {
      setError(parseApiError(err, "Could not open that school.").message);
    } finally {
      setSwitchingSlug(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-brand-900 p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-4">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to Kalvi</h1>
          <p className="text-slate-400 text-sm mt-1">
            {step === "credentials" ? "Sign in to your account" : "Choose a school to continue"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* ── STEP 1: Credentials ── */}
          {step === "credentials" && (
            <div className="space-y-5">
              {/* Google Sign-In button */}
              <GoogleSignInButton onToken={handleGoogleToken} label="Sign in with Google" />

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">or sign in with email</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Email + password form */}
              <form onSubmit={submitCredentials} className="space-y-4">
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

                <FormError message={error} />

                <button className="btn-primary w-full py-2.5" disabled={loading}>
                  {loading ? "Signing in…" : "Sign In →"}
                </button>
              </form>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 text-center space-y-2 text-sm">
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
          )}

          {/* ── STEP 2: School Picker ── */}
          {step === "pick-school" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 text-center mb-2">
                Your account is linked to <strong>{schools.length} schools</strong>. Pick one to open.
              </p>

              <div className="space-y-2">
                {schools.map((s) => (
                  <button
                    key={s.slug}
                    onClick={() => selectSchool(s.slug)}
                    disabled={switchingSlug !== null}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-slate-100 hover:border-brand-500 hover:bg-brand-50 transition-all group disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-brand-600" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 10v4m0 3v4M12 10v4m0 3v4M16 10v4m0 3v4" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.slug}</p>
                      </div>
                    </div>

                    {switchingSlug === s.slug ? (
                      <svg className="w-4 h-4 text-brand-500 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              <FormError message={error} />

              <button
                type="button"
                onClick={() => { setStep("credentials"); setError(""); }}
                className="w-full text-sm text-slate-400 hover:text-slate-600 pt-2 transition"
              >
                ← Use a different account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
