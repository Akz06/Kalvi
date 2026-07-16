import { useEffect, useRef, useState } from "react";

interface Props {
  onToken: (idToken: string) => void;
  label?: string;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: (cb?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
        };
      };
    };
    __kalviGCb?: (r: { credential: string }) => void;
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function GoogleSignInButton({
  onToken,
  label = "Continue with Google",
  disabled = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialised = useRef(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [useCustomBtn, setUseCustomBtn] = useState(false);

  function initAndRender() {
    if (!window.google?.accounts?.id || !containerRef.current || initialised.current) return;

    window.__kalviGCb = (r) => onToken(r.credential);

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID!,
      callback: window.__kalviGCb,
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: false,
    });

    // Try renderButton first — this is the most reliable approach
    try {
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        width: containerRef.current.offsetWidth || 400,
        text: label === "Continue with Google" ? "continue_with" : "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
      });
      initialised.current = true;
      setSdkReady(true);
    } catch {
      // renderButton failed — fall back to custom styled button
      setUseCustomBtn(true);
      setSdkReady(true);
      initialised.current = true;
    }
  }

  useEffect(() => {
    if (!CLIENT_ID) {
      // No client ID — show custom button that explains the issue in dev
      setUseCustomBtn(true);
      setSdkReady(true);
      return;
    }

    // SDK already loaded synchronously
    if (window.google?.accounts?.id) {
      // Wait one frame so container has layout dimensions
      requestAnimationFrame(() => initAndRender());
      return;
    }

    // SDK loading asynchronously — poll for it
    const t = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(t);
        requestAnimationFrame(() => initAndRender());
      }
    }, 50);

    // Timeout after 5s — fall back to custom button
    const timeout = setTimeout(() => {
      clearInterval(t);
      setUseCustomBtn(true);
      setSdkReady(true);
    }, 5000);

    return () => {
      clearInterval(t);
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update callback when onToken changes
  useEffect(() => {
    window.__kalviGCb = (r) => onToken(r.credential);
  }, [onToken]);

  function handleCustomClick() {
    if (!CLIENT_ID) return;

    // Re-initialise with fresh callback then prompt
    window.__kalviGCb = (r) => onToken(r.credential);

    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: window.__kalviGCb,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      });
      window.google.accounts.id.prompt();
    }
  }

  // The Google renderButton div — always in DOM so renderButton has a target
  return (
    <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
      {/* Container Google renders its iframe button into */}
      <div
        ref={containerRef}
        className="w-full"
        style={{ minHeight: 44 }}
      />

      {/* Skeleton shown while SDK loads */}
      {!sdkReady && (
        <div className="w-full h-11 rounded-lg bg-slate-100 animate-pulse flex items-center justify-center gap-2 text-slate-400 text-sm -mt-11">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Loading…
        </div>
      )}

      {/* Custom fallback button — used when renderButton fails or no SDK */}
      {sdkReady && useCustomBtn && CLIENT_ID && (
        <button
          type="button"
          onClick={handleCustomClick}
          disabled={disabled}
          className="-mt-11 w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66 2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>{label}</span>
        </button>
      )}

      {/* Dev warning — only when no CLIENT_ID at all */}
      {sdkReady && !CLIENT_ID && (
        <div className="w-full h-11 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 flex items-center justify-center text-xs text-amber-700 font-medium -mt-11">
          ⚠ Set VITE_GOOGLE_CLIENT_ID to enable Google Sign-In
        </div>
      )}
    </div>
  );
}
