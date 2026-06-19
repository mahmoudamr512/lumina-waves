import type { BrandVariant } from './types';

export interface LuminaWordmarkProps {
  className?: string;
  /**
   * Fill treatment for the wordmark text:
   * - `gold` (default): metallic gold gradient clipped to the text.
   * - `mono`: solid gold-400.
   * - `currentColor`: inherits the surrounding `color`.
   */
  variant?: BrandVariant;
}

/**
 * The "LUMINA / WAVES / PRODUCTIONS" lockup, rendered as crisp HTML text in the
 * Cinzel display serif. Purely centred, so it is RTL-safe. "WAVES" is flanked by
 * two short horizontal rules.
 *
 * This is a presentational component with no client-side behaviour, so it can be
 * server-rendered.
 */
export function LuminaWordmark({ className, variant = 'gold' }: LuminaWordmarkProps) {
  const textClass =
    variant === 'gold'
      ? 'text-gold-metallic'
      : variant === 'mono'
        ? 'text-gold-400'
        : 'text-current';

  // The flanking rules / muted text follow the same paint as the wordmark.
  const ruleColor =
    variant === 'currentColor' ? 'bg-current' : 'bg-gold-400/60';

  return (
    <div
      className={`flex flex-col items-center font-display leading-none ${textClass} ${className ?? ''}`}
    >
      <span className="text-[2.4em] font-semibold tracking-[0.22em]">LUMINA</span>

      <span className="mt-[0.45em] flex w-full items-center justify-center gap-[0.6em]">
        <span className={`h-px w-[1.4em] ${ruleColor}`} aria-hidden="true" />
        <span className="text-[0.95em] font-medium tracking-[0.5em]">WAVES</span>
        <span className={`h-px w-[1.4em] ${ruleColor}`} aria-hidden="true" />
      </span>

      <span className="mt-[0.5em] text-[0.55em] font-normal tracking-[0.62em] opacity-90">
        PRODUCTIONS
      </span>
    </div>
  );
}
