import { Category, categoryMeta } from '@/lib/domain';
import { formatPkr } from '@/lib/currency';
import { cn } from '@/lib/utils';

/**
 * Customer-facing: item, prices, and location only — no AI marketing copy.
 * Extra fields from `Offer` are accepted for spread compatibility but not rendered.
 */
export interface OfferCardProps {
  merchantName: string;
  category: Category;
  distanceMeters: number;
  offerText: string;
  reasonWhyNow?: string;
  expiresInMinutes: number;
  originalPrice?: number;
  offerPrice?: number;
  discountPercentage?: number;
  targetItem?: string;
  merchantAddress?: string;
  claimed?: boolean;
  couponCode?: string;
  charmLine?: string;
  charmSubtext?: string;
  onClaim?: () => void;
}

export const OfferCard = (props: OfferCardProps) => {
  const {
    merchantName,
    category,
    targetItem,
    originalPrice,
    offerPrice,
    discountPercentage,
    merchantAddress,
    claimed,
    couponCode,
    onClaim,
  } = props;

  const meta = categoryMeta[category];
  const hasPrice = typeof originalPrice === 'number' || typeof offerPrice === 'number';
  const itemLabel = String(targetItem || '').trim() || 'Selected item';
  const disc =
    typeof discountPercentage === 'number' && Number.isFinite(discountPercentage) ? discountPercentage : null;

  const formatMoney = (value?: number) => formatPkr(value);

  return (
    <article
      className={cn(
        'group relative w-full overflow-hidden transition-all duration-300',
        'rounded-[1.75rem] border-2',
        claimed
          ? 'bg-muted/50 border-muted opacity-[0.75] grayscale cursor-default'
          : [
              'border-warning/20 bg-gradient-to-br from-card via-primary-soft/45 to-warning-soft/50',
              'shadow-md shadow-primary/5 ring-1 ring-warning-soft/40',
              'hover:shadow-lg hover:shadow-primary/8 hover:-translate-y-0.5 hover:ring-warning-soft/60',
            ]
      )}
    >
      {!claimed && (
        <>
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-warning-soft/70 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl"
            aria-hidden
          />
        </>
      )}

      <div className="relative p-4 xs:p-5 sm:p-6">
        <div className="flex items-start gap-3 min-w-0 mb-4">
          <div
            className={cn(
              'h-12 w-12 rounded-2xl flex items-center justify-center text-lg shrink-0',
              'ring-2 ring-white/90 shadow-sm',
              claimed
                ? 'bg-muted text-muted-foreground'
                : `bg-category-${category}-bg text-category-${category}-fg`
            )}
          >
            <i className={`bi ${meta.icon}`} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3
              className={cn(
                'font-semibold text-sm leading-tight text-foreground truncate',
                claimed && 'text-muted-foreground'
              )}
            >
              {merchantName}
            </h3>
            {merchantAddress ? (
              <p className="mt-1.5 text-xs text-muted-foreground leading-snug line-clamp-2">
                <span
                  className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-warning-soft/80 text-[hsl(var(--warning-fg))]/80"
                  aria-hidden
                >
                  <i className="bi bi-geo-alt text-[10px]" />
                </span>
                {merchantAddress}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            'mb-4 rounded-2xl border px-3.5 py-3.5',
            claimed
              ? 'border-border/60 bg-muted/40'
              : 'border-warning/25 bg-white/50 backdrop-blur-[2px] shadow-sm'
          )}
        >
          <p className="text-[10px] uppercase tracking-wider font-medium text-[hsl(var(--warning-fg))]/80">Item</p>
          <p className={cn('text-base font-semibold mt-1', claimed ? 'text-muted-foreground' : 'text-foreground')}>
            {itemLabel}
            {disc != null && disc > 0 ? (
              <span className="ml-2 font-semibold text-primary tabular-nums">({disc}% off)</span>
            ) : null}
          </p>
        </div>

        {hasPrice ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 mb-4">
            <div
              className={cn(
                'rounded-2xl p-3.5 border-2',
                claimed
                  ? 'bg-muted/80 border-transparent'
                  : 'bg-warning-soft/40 border-warning/20 shadow-sm'
              )}
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Actual price</p>
              <p className={cn('text-sm font-bold mt-1 tabular-nums', claimed ? 'text-muted-foreground' : 'text-foreground')}>
                {formatMoney(originalPrice)}
              </p>
            </div>
            <div
              className={cn(
                'rounded-2xl p-3.5 border-2',
                claimed ? 'bg-muted/80 border-transparent' : 'bg-success-soft border-success/20 shadow-sm'
              )}
            >
              <p
                className={cn('text-[10px] uppercase tracking-wider font-medium', claimed ? 'text-muted-foreground' : 'text-success')}
              >
                After offer
              </p>
              <p className={cn('text-sm font-bold mt-1 tabular-nums', claimed ? 'text-muted-foreground' : 'text-success')}>
                {formatMoney(offerPrice)}
              </p>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          disabled={claimed}
          onClick={() => onClaim?.()}
          className={cn(
            'w-full min-h-12 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all',
            claimed
              ? 'bg-success-soft text-success cursor-default'
              : [
                  'bg-primary text-primary-foreground',
                  'shadow-md shadow-primary/25',
                  'ring-2 ring-warning-soft/50 ring-offset-2 ring-offset-background',
                  'hover:bg-[hsl(var(--primary-hover))] active:scale-[0.99]',
                ]
          )}
        >
          {claimed ? `Claimed${couponCode ? ` · ${couponCode}` : ''}` : 'Claim offer'}
        </button>
      </div>
    </article>
  );
};
