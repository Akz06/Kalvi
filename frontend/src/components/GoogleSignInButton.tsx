import { useEffect, useRef } from "react";

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
          prompt: () => void;
        };
      };
    };
    __kalviGoogleCallback?: (response: { credential: string }) => void;
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function GoogleSignInButton({ onToken, disabled = false }: Props) {
  const btnRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Always keep callback up to date
    window.__kalviGoogleCallback = (response) => {
      onToken(response.credential);
    };
  }, [onToken]);

  useEffect(() => {
    if (!CLIENT_ID || initialized.current || !btnRef.current) return;

    function init() {
      if (!window.google?.accounts?.id || !btnRef.current) return;
      initialized.current = true;

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID!,
        callback: (r: { credential: string }) => window.__kalviGoogleCallback?.(r),
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "outline",
        size: "large",
        width: btnRef.current.offsetWidth || 400,
        text: "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
      });
    }

    // SDK already loaded
    if (window.google?.accounts?.id) {
      init();
      return;
    }

    // Wait for SDK to load
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        init();
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  if (!CLIENT_ID) return null;

  return (
    <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <div ref={btnRef} className="w-full" />
    </div>
  );
}
