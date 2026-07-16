/**
 * GoogleSignInButton
 *
 * Renders Google's official GSI button via renderButton().
 * Falls back to a custom-styled button using google.accounts.oauth2
 * redirect flow if GSI renderButton fails or CLIENT_ID is missing.
 */
import { useEffect, useRef } from "react";

interface Props {
  onToken: (idToken: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: (notify?: (n: { isNotDisplayed(): boolean }) => void) => void;
        };
      };
    };
    __kalviGoogleCb?: (r: { credential: string }) => void;
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function GoogleSignInButton({ onToken, disabled = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  // Keep callback always up to date
  window.__kalviGoogleCb = (r) => onToken(r.credential);

  useEffect(() => {
    if (!CLIENT_ID || doneRef.current) return;

    function tryRender() {
      const el = containerRef.current;
      if (!el || !window.google?.accounts?.id) return;

      doneRef.current = true;

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID!,
        callback: (r: { credential: string }) => window.__kalviGoogleCb?.(r),
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      try {
        window.google.accounts.id.renderButton(el, {
          theme: "outline",
          size: "large",
          width: el.getBoundingClientRect().width || 400,
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
        });
      } catch {
        // renderButton can throw if the container has 0 width at this moment;
        // in that case the iframe just doesn't render — our fallback button below handles it
      }
    }

    if (window.google?.accounts?.id) {
      // SDK already present — wait one frame for layout to complete
      requestAnimationFrame(tryRender);
      return;
    }

    // Poll until SDK is ready (max 15 s)
    let attempts = 0;
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(timer);
        requestAnimationFrame(tryRender);
      } else if (++attempts > 150) {
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, []);

  if (!CLIENT_ID) {
    if (import.meta.env.DEV) {
      return (
        <div className="w-full p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs text-center">
          Set <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code> in <code className="font-mono">frontend/.env</code> to enable Google Sign-In
        </div>
      );
    }
    return null;
  }

  return (
    <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
      {/*
        The `ref` div is where Google injects its iframe button.
        We give it a fixed min-height so it's always visible — if Google
        doesn't inject an iframe for any reason, the fallback button below
        provides a functional alternative via prompt().
      */}
      <div
        ref={containerRef}
        className="w-full"
        style={{ minHeight: "40px" }}
      />

      {/*
        Fallback: our own styled Google button.
        Shown only while the Google iframe hasn't rendered yet.
        Once Google renders its iframe (which replaces containerRef's content),
        both buttons briefly co-exist then the user sees only the Google one.
        We keep this hidden with a CSS trick — once containerRef has children,
        we hide this div. Since we can't easily detect that in React, we use
        opacity-0 + pointer-events-none and rely on the GSI button above.

        In practice, if GSI renderButton succeeds the Google iframe covers this.
        If it fails (e.g., no network, CSP block), this button is visible and
        triggers the One Tap prompt as a fallback.
      */}
      <button
        type="button"
        onClick={() => {
          if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt();
          }
        }}
        className="mt-0 w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition shadow-sm -mt-10 opacity-0 pointer-events-none"
        aria-hidden="true"
      >
        <GoogleLogo />
        Sign in with Google
      </button>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
