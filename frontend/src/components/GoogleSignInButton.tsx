import { useEffect, useRef, useState } from "react";

interface Props {
  onToken: (idToken: string) => void;
  label?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
        };
      };
    };
    // callback set on window so GSI can call it by name
    __kalviGoogleCallback?: (response: { credential: string }) => void;
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function GoogleSignInButton({
  onToken,
  label = "Continue with Google",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [rendered, setRendered] = useState(false);

  /* ── 1. Detect when the GSI SDK is ready ─────────────────────────────── */
  useEffect(() => {
    if (!CLIENT_ID) return;

    // Already loaded synchronously (script tag without async/defer)
    if (window.google?.accounts?.id) {
      setSdkReady(true);
      return;
    }

    // Fallback: poll every 50 ms (max 10 s)
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (window.google?.accounts?.id) {
        clearInterval(timer);
        setSdkReady(true);
      } else if (attempts > 200) {
        clearInterval(timer); // give up after 10 s
      }
    }, 50);

    return () => clearInterval(timer);
  }, []);

  /* ── 2. Once SDK is ready, initialize + render the button ────────────── */
  useEffect(() => {
    if (!sdkReady || !containerRef.current || rendered) return;
    if (!CLIENT_ID) return;

    // Expose the callback on window so GSI can call it
    window.__kalviGoogleCallback = (response: { credential: string }) => {
      onToken(response.credential);
    };

    window.google!.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: window.__kalviGoogleCallback,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // The container must have a non-zero width when renderButton is called.
    // Use rAF to ensure layout is painted first.
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const width = containerRef.current.getBoundingClientRect().width || 400;
      window.google!.accounts.id.renderButton(containerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: label.toLowerCase().includes("sign up") ? "signup_with" : "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: Math.floor(width),
      });
      setRendered(true);
    });
  }, [sdkReady, onToken, label, rendered]);

  // Don't render anything if no Client ID is configured
  if (!CLIENT_ID) return null;

  return (
    <div className="w-full">
      {/* Google renders its branded button inside this div */}
      <div
        ref={containerRef}
        className="w-full flex justify-center min-h-[44px]"
      />
      {/* Show a skeleton while SDK loads */}
      {!rendered && (
        <div className="w-full h-11 rounded-md bg-slate-100 animate-pulse flex items-center justify-center gap-2 border border-slate-200">
          <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-sm text-slate-400">{label}</span>
        </div>
      )}
    </div>
  );
}
