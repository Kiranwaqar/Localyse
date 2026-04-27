import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { googleAuth } from '@/lib/api';
import type { Role, Session } from '@/lib/auth';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

const loadGsi = () =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return;
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Sign-In could not be loaded.')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Google Sign-In could not be loaded.'));
    document.head.appendChild(s);
  });

type Intent = 'signin' | 'signup';

type Props = {
  role: Role;
  intent: Intent;
  category?: string;
  /** When true, shows a disabled placeholder instead of the live Google control (e.g. merchant must pick category). */
  blocked?: string | null;
  onSuccess: (session: Session) => void;
  onError: (message: string) => void;
};

/** GSI `width` is in px; allowed range 320–1000 (per Google’s widget options). */
const toButtonWidth = (w: number) => {
  if (!Number.isFinite(w) || w <= 0) return 400;
  return Math.max(320, Math.min(1000, Math.floor(w)));
};

const GoogleSignInButton = ({ role, intent, category, blocked, onSuccess, onError }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widthProbeRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const [loadingScript, setLoadingScript] = useState(false);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useLayoutEffect(() => {
    const el = widthProbeRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w && w > 0) setMeasuredWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [clientId, blocked]);

  const buttonWidth = toButtonWidth(measuredWidth);

  useEffect(() => {
    if (!clientId) return;
    if (blocked) return;

    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    setLoadingScript(true);

    (async () => {
      try {
        await loadGsi();
        if (cancelled || !el || !window.google?.accounts?.id) return;

        el.innerHTML = '';
        const gsi = window.google.accounts.id;
        gsi.initialize({
          client_id: clientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) {
              onErrorRef.current('Google did not return a sign-in token. Please try again.');
              return;
            }
            try {
              const body: {
                credential: string;
                role: Role;
                intent: Intent;
                category?: string;
              } = {
                credential: response.credential,
                role,
                intent,
              };
              if (role === 'merchant' && category) {
                body.category = category;
              }
              const session = await googleAuth(body);
              onSuccessRef.current(session);
            } catch (e) {
              onErrorRef.current(e instanceof Error ? e.message : 'Sign-in with Google failed.');
            }
          },
          auto_select: false,
          itp_support: true,
        });
        gsi.renderButton(el, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: buttonWidth,
          logo_alignment: 'left',
        });
      } catch (e) {
        if (!cancelled) {
          onErrorRef.current(e instanceof Error ? e.message : 'Could not start Google Sign-In.');
        }
      } finally {
        if (!cancelled) setLoadingScript(false);
      }
    })();

    return () => {
      cancelled = true;
      el.innerHTML = '';
    };
  }, [clientId, role, intent, category, blocked, buttonWidth]);

  if (!clientId) {
    return (
      <div
        ref={widthProbeRef}
        className="w-full min-w-0 max-w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 sm:px-4 text-left"
      >
        <p className="text-xs font-medium text-foreground">Google Sign-In is not configured</p>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 leading-relaxed break-words">
          Add <code className="text-foreground/90">VITE_GOOGLE_CLIENT_ID</code> and matching{' '}
          <code className="text-foreground/90">GOOGLE_CLIENT_ID</code> in your environment, then restart the app.
        </p>
      </div>
    );
  }

  if (blocked) {
    return (
      <div ref={widthProbeRef} className="w-full min-w-0 max-w-full">
        <div
          className="w-full min-h-11 min-[360px]:min-h-12 rounded-xl border border-dashed border-border bg-muted/40 flex items-center justify-center px-2.5 sm:px-3 text-center"
          title={blocked}
          role="status"
        >
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">{blocked}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={widthProbeRef} className="w-full min-w-0 max-w-full flex flex-col items-stretch gap-1.5">
      <div className="w-full min-w-0 flex justify-center overflow-x-auto [scrollbar-width:thin] sm:overflow-x-visible">
        <div
          ref={containerRef}
          className="min-h-11 w-full min-w-0 max-w-full flex items-center justify-center py-0.5 [&>div]:!max-w-full"
          data-testid="google-sign-in-mount"
          aria-hidden={loadingScript}
        />
      </div>
      {loadingScript && (
        <span className="text-[10px] text-muted-foreground text-center sm:text-left">Loading Google…</span>
      )}
    </div>
  );
};

export default GoogleSignInButton;
