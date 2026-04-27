import { cn } from '@/lib/utils';

type MerchantAiRationaleBubbleProps = {
  text: string;
  className?: string;
};

/**
 * Merchant-only: explains why the AI suggested this offer. Not shown to customers.
 */
export const MerchantAiRationaleBubble = ({ text, className }: MerchantAiRationaleBubbleProps) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;

  return (
    <div className={cn('relative z-10 mb-3 animate-fade-up', className)} role="status" aria-live="polite">
      <div
        className={cn(
          'relative rounded-[1.35rem] border-2 border-primary/20 bg-gradient-to-br from-lavender-soft via-primary-soft/80 to-card',
          'px-4 py-3.5 shadow-md',
          'before:absolute before:left-1/2 before:top-full before:z-0 before:h-3 before:w-3 before:-translate-x-1/2 before:-translate-y-[6px] before:rotate-45',
          'before:border-b-2 before:border-r-2 before:border-primary/20 before:bg-gradient-to-br before:from-lavender-soft before:to-primary-soft/80'
        )}
      >
        <div className="relative z-[1] flex items-start gap-2.5">
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-base shadow-sm ring-1 ring-primary/15"
            aria-hidden
          >
            <i className="bi bi-stars text-primary text-lg" />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">AI insight for you</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/90 text-pretty">{trimmed}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
