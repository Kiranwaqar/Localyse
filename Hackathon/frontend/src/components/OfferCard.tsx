import { Category, categoryMeta } from '@/lib/domain';
import { cn } from '@/lib/utils';

export interface OfferCardProps {
  merchantName: string;
  category: Category;
  distanceMeters: number;
  offerText: string;
  reasonWhyNow: string;
  expiresInMinutes: number;
  originalPrice?: number;
  offerPrice?: number;
  discountPercentage?: number;
  merchantAddress?: string;
  claimed?: boolean;
  couponCode?: string;
  onClaim?: (merchantName: string, offerText: string) => void;
}

export const OfferCard = ({
  merchantName,
  category,
  offerText,
  reasonWhyNow,
  originalPrice,
  offerPrice,
  discountPercentage,
  merchantAddress,
  claimed,
  couponCode,
  onClaim,
}: OfferCardProps) => {
  const meta = categoryMeta[category];
  const hasPrice = typeof originalPrice === 'number' || typeof offerPrice === 'number';
  const formatMoney = (value?: number) =>
    typeof value === 'number' && Number.isFinite(value) ? `$${value.toFixed(2)}` : 'Unavailable';

  return (
    <article
      className={cn(
        'group relative w-full rounded-2xl border shadow-sm overflow-hidden transition-all duration-200',
        claimed
          ? 'bg-muted/60 border-muted opacity-60 grayscale cursor-default'
          : 'bg-card border-border/70 hover:shadow-md hover:border-border'
      )}
    >
      <div className="p-3.5 xs:p-4 sm:p-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'h-10 w-10 xs:h-11 xs:w-11 rounded-xl flex items-center justify-center text-base xs:text-lg shrink-0',
                claimed
                  ? 'bg-muted text-muted-foreground'
                  : `bg-category-${category}-bg text-category-${category}-fg`
              )}
            >
              <i className={`bi ${meta.icon}`} />
            </div>
            <div className="min-w-0">
              <h3 className={cn('font-semibold text-sm xs:text-[15px] leading-tight truncate', claimed ? 'text-muted-foreground' : 'text-card-foreground')}>
                {merchantName}
              </h3>
              {merchantAddress && (
                <p className={cn('mt-1 text-[11px] leading-snug line-clamp-2', claimed ? 'text-muted-foreground' : 'text-muted-foreground')}>
                  <i className="bi bi-geo-alt mr-1" />
                  {merchantAddress}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Offer headline — dominant */}
        <p className={cn('text-lg xs:text-xl sm:text-2xl font-semibold tracking-tight leading-snug mb-4 text-pretty break-words', claimed ? 'text-muted-foreground' : 'text-card-foreground')}>
          {offerText}
        </p>

        {hasPrice && (
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 mb-4">
            <div className={cn('rounded-xl p-3', claimed ? 'bg-muted' : 'bg-secondary/70')}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Actual price</p>
              <p className={cn('text-sm font-semibold mt-1', claimed ? 'text-muted-foreground' : 'text-foreground')}>
                {formatMoney(originalPrice)}
              </p>
            </div>
            <div className={cn('rounded-xl p-3', claimed ? 'bg-muted' : 'bg-success-soft')}>
              <p className={cn('text-[10px] uppercase tracking-wider', claimed ? 'text-muted-foreground' : 'text-success')}>
                After offer
              </p>
              <p className={cn('text-sm font-semibold mt-1', claimed ? 'text-muted-foreground' : 'text-success')}>
                {formatMoney(offerPrice)}
              </p>
              {discountPercentage ? (
                <p className="text-[10px] text-muted-foreground mt-0.5">{discountPercentage}% off</p>
              ) : null}
            </div>
          </div>
        )}

        {/* Context badge */}
        <div className={cn('inline-flex max-w-full items-start gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full', claimed ? 'bg-muted text-muted-foreground' : 'bg-primary-soft text-primary')}>
          <i className="bi bi-info-circle text-[11px]" />
          <span className="break-words">{reasonWhyNow}</span>
        </div>

        <button
          disabled={claimed}
          onClick={() => onClaim?.(merchantName, offerText)}
          className={cn(
            'w-full mt-5 min-h-11 rounded-xl px-3 py-2 font-medium text-sm transition-all break-words',
            claimed
              ? 'bg-success-soft text-success cursor-default'
              : 'bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))] active:scale-[0.99]'
          )}
        >
          {claimed ? `Offer claimed${couponCode ? ` · ${couponCode}` : ''}` : 'Claim offer'}
        </button>
      </div>
    </article>
  );
};
