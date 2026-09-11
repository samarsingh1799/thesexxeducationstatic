type AdSlotProps = {
  slotId: string;
  minHeight?: number;
  className?: string;
  /** Shows the small "Advertisement" divider label above the reserved space. */
  label?: string;
};

/**
 * Space-reserved ad placeholder. No ad network is wired up yet — this
 * exists so ad placements can be dropped in later without shifting layout
 * (CLS) or ever blocking article content/LCP.
 */
export function AdSlot({ slotId, minHeight = 250, className, label }: AdSlotProps) {
  return (
    <div className={className}>
      {label && (
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      )}
      <div data-ad-slot={slotId} role="presentation" aria-hidden="true" style={{ minHeight }} />
    </div>
  );
}
