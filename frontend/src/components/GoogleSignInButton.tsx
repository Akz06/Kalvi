import { useEffect, useRef } from "react";

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
          prompt: () => void;
        };
      };
    };
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

export default function GoogleSignInButton({ onToken, label = "Continue with Google" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;

    function init() {
      window.google!.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response: { credential: string }) => {
          onToken(response.credential);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (ref.current) {
        window.google!.accounts.id.renderButton(ref.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: label === "Continue with Google" ? "continue_with" : "signin_with",
          shape: "rectangular",
          width: ref.current.offsetWidth || 380,
          logo_alignment: "left",
        });
      }
    }

    // Google SDK may load asynchronously — wait for it
    if (window.google?.accounts) {
      init();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts) {
          clearInterval(interval);
          init();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [onToken, label]);

  if (!CLIENT_ID) return null;

  return (
    <div className="w-full">
      {/* Google renders its own button here */}
      <div ref={ref} className="w-full flex justify-center" />
    </div>
  );
}
