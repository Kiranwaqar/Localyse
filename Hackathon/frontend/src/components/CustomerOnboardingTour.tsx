import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { completeCustomerGuide, hasCompletedCustomerGuide } from '@/lib/customerOnboarding';

type Step = {
  emoji: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    emoji: '✨',
    title: "Hey — welcome to Localyse!",
    body:
      "We bundle live city offers into one cosy app. Below is your quick cheat sheet — no pressure, you can poke around anytime.",
  },
  {
    emoji: '🏠',
    title: 'Home is your live window',
    body:
      "Browse what’s happening right now, filter by category, and tap Claim when something feels right — that saves your coupon.",
  },
  {
    emoji: '📍',
    title: 'Map = offers around you',
    body:
      "Pins show where merchants are cheering for foot traffic today. Tap through when you’re out and deciding where to swing by.",
  },
  {
    emoji: '🌟',
    title: 'For you remembers your vibe',
    body:
      "This tab reshapes picks from coupons you actually claim — not just cookie settings — so favourites feel sharper over time.",
  },
  {
    emoji: '💳',
    title: 'Wallet keeps money sense tidy',
    body:
      "Drop your PKR balance, split it gently across buckets, then get calmer hints about deals that respect what you earmarked.",
  },
  {
    emoji: '🧾',
    title: 'History & Profile tucked at the edges',
    body:
      "History holds codes you’ve redeemed. Profile tweaks your hello + preferences whenever you evolve your tastebuds.",
  },
];

const BUBBLE =
  'relative overflow-hidden rounded-[1.85rem] border-2 border-primary/25 bg-gradient-to-br from-[#fdf2ff] via-white to-[#f3f0ff] shadow-[0_20px_50px_-20px_rgba(91,61,146,0.35)] px-6 py-7 sm:px-8 sm:py-8 max-w-[min(100vw-2rem,22rem)]';

export function CustomerOnboardingTour() {
  const location = useLocation();
  const session = getSession();
  const userId = session?._id ?? '';
  const isCustomer = session?.role === "customer";

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !isCustomer || !userId) return;
    if (!location.pathname.startsWith("/app")) return;
    if (hasCompletedCustomerGuide(userId)) return;
    const t = window.setTimeout(() => {
      setStep(0);
      setOpen(true);
    }, 400);
    return () => window.clearTimeout(t);
  }, [mounted, isCustomer, userId, location.pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
      if (userId) completeCustomerGuide(userId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, userId]);

  const dismiss = () => {
    setOpen(false);
    if (userId) completeCustomerGuide(userId);
  };

  const goNext = () => {
    if (step >= STEPS.length - 1) dismiss();
    else setStep((s) => s + 1);
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  if (!mounted || !open) return null;

  const curr = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-5 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-guide-title"
      aria-describedby="customer-guide-desc"
    >
      <div className="absolute inset-0 bg-foreground/[0.12] backdrop-blur-[3px]" aria-hidden />
      <div className={cn(BUBBLE, 'z-[1] text-center animate-in fade-in-0 zoom-in-95 duration-300')}>
        <div className="pointer-events-none absolute -top-10 -right-6 h-24 w-24 rounded-full bg-primary/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-4 h-28 w-28 rounded-full bg-lavender/30 blur-2xl" />

        <p className="text-4xl sm:text-[2.75rem] leading-none mb-4 select-none" aria-hidden>
          {curr.emoji}
        </p>
        <h2 id="customer-guide-title" className="text-lg sm:text-xl font-bold text-foreground tracking-tight px-1">
          {curr.title}
        </h2>
        <p id="customer-guide-desc" className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          {curr.body}
        </p>

        <div className="flex items-center justify-center gap-2 mt-5">
          {STEPS.map((_, i) => (
            <span
              key={String(i)}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === step ? "bg-primary scale-125" : "bg-primary/20"
              )}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col xs:flex-row gap-2 xs:justify-center xs:gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="h-11 min-h-11 rounded-2xl border-2 border-primary/25 bg-white/70 px-5 text-xs font-semibold text-foreground hover:bg-white transition"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={dismiss}
              className="h-11 min-h-11 rounded-2xl border-2 border-transparent px-5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
            >
              Skip tour
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            className="h-11 min-h-11 rounded-2xl bg-primary text-primary-foreground px-8 text-xs font-semibold shadow-md hover:brightness-[1.05] active:scale-[0.99] transition touch-manipulation"
          >
            {isLast ? "Let’s explore!" : "Next bubbly tip"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
