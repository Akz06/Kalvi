/**
 * GoogleCallback — /auth/google/callback
 *
 * Google redirects here after the user approves.
 * We grab the `code` from the URL, send it to the backend,
 * and the backend exchanges it for user info + returns a Kalvi JWT.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { publicApi } from "../api/client";
import { ArrowLeftIcon } from "../components/icons";

interface SchoolOption {
  id: string | null;
  slug: string;
  name: string;
}

export default function GoogleCallback() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const done = useRef(false);

  const [schools, setSchools] = useState<SchoolOption[] | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [switchingSlug, setSwitchingSlug] = useState<string | null>(null);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const expectedState = sessionStorage.getItem("kalvi_google_oauth_state");
    const oauthError = params.get("error");

    sessionStorage.removeItem("kalvi_google_oauth_state");

    if (oauthError || !code) {
      setError(oauthError === "access_denied" ? "Google sign-in was cancelled." : "Google sign-in failed. Please try again.");
      return;
    }

    if (!state || !expectedState || state !== expectedState) {
      setError("Google sign-in could not be verified. Please try again.");
      return;
    }

    // Exchange code for Kalvi JWT via backend
    publicApi
      .post("/auth/google/callback", {
        code,
        redirectUri: `${window.location.origin}/auth/google/callback`,
      })
      .then((res: { data: any }) => {
        const data = res.data;

        if (data.requiresSchoolSelection) {
          setSchools(data.schools);
          setEmail(data._email ?? "");
          return;
        }

        loginWithToken(data.token, data.user);
        navigate(data.user.schoolId ? "/app" : "/create-school", { replace: true });
      })
      .catch(() => {
        setError("Google sign-in failed. Please try again.");
      });
  }, []);

  async function selectSchool(slug: string) {
    setSwitchingSlug(slug);
    try {
      const res = await publicApi.post("/auth/google/select-school", {
        email,
        schoolSlug: slug,
      });
      loginWithToken(res.data.token, res.data.user);
      navigate(res.data.user.schoolId ? "/app" : "/create-school", { replace: true });
    } catch {
      setError("Could not open that school. Please try again.");
      setSwitchingSlug(null);
    }
  }

  // ── School picker (multi-school Google accounts) ─────────────────────────
  if (schools) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-brand-900 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 mb-3">
              <svg className="w-6 h-6 text-brand-600" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800">Choose a school</h2>
            <p className="text-sm text-slate-500 mt-1">
              Your Google account is linked to {schools.length} schools
            </p>
          </div>

          <div className="space-y-2">
            {schools.map((s) => (
              <button
                key={s.slug}
                onClick={() => selectSchool(s.slug)}
                disabled={switchingSlug !== null}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-slate-100 hover:border-brand-500 hover:bg-brand-50 transition-all group disabled:opacity-60"
              >
                <div className="text-left">
                  <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.slug}</p>
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

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full text-sm text-slate-400 hover:text-slate-600 pt-2 transition"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5 inline mr-1" /> Use a different account
          </button>
        </div>
      </div>
    );
  }

  // ── Loading / error state ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-brand-900 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
        {error ? (
          <>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-100 mx-auto">
              <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium">{error}</p>
            <button
              onClick={() => navigate("/login")}
              className="btn-primary w-full py-2.5"
            >
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            <svg className="w-10 h-10 text-brand-500 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-slate-600 font-medium">Signing you in with Google…</p>
            <p className="text-xs text-slate-400">This will only take a moment</p>
          </>
        )}
      </div>
    </div>
  );
}
