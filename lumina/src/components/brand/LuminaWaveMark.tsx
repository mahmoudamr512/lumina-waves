'use client';

import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  VIEWBOX,
  WAVE_BARS,
  BAR_GEOMETRY,
} from './waveGeometry';
import { GOLD_400, GOLD_GRADIENT_STOPS, type BrandCommonProps } from './types';

export interface LuminaWaveMarkProps extends BrandCommonProps {
  /** Pixel size of the (square) mark. Number → px, string passed through. Default 96. */
  size?: number | string;
  /**
   * When true the bars gently pulse like an equalizer (staggered, infinite).
   * Always disabled when the user prefers reduced motion.
   */
  animated?: boolean;
  /** Accessible label; when omitted the mark is treated as decorative. */
  title?: string;
}

/**
 * The circular Lumina Waves soundwave mark (the "icon").
 *
 * Pure SVG, resolution-independent, themeable and RTL-safe (the geometry is
 * fully symmetric). A unique gradient id is derived from `useId()` so multiple
 * instances on a page never collide. The static geometry renders identically on
 * the server; only the optional pulse animation needs the client.
 */
export function LuminaWaveMark({
  className,
  size = 96,
  variant = 'gold',
  animated = false,
  title,
}: LuminaWaveMarkProps) {
  const reactId = useId();
  const reducedMotion = useReducedMotion();
  const gradientId = `lumina-mark-gradient-${reactId}`;
  const glowId = `lumina-mark-glow-${reactId}`;

  // Resolve the paint applied to ring, baseline and bars.
  const paint =
    variant === 'gold'
      ? `url(#${gradientId})`
      : variant === 'mono'
        ? GOLD_400
        : 'currentColor';

  const shouldAnimate = animated && !reducedMotion;
  const { center, barWidth, ringRadius, ringStroke } = BAR_GEOMETRY;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}

      {variant === 'gold' ? (
        <defs>
          {/* 135deg metallic gradient: top-left → bottom-right. */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            {GOLD_GRADIENT_STOPS.map((s) => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
          <linearGradient id={glowId} x1="0" y1="0.5" x2="1" y2="0.5">
            <stop offset="0%" stopColor={GOLD_400} stopOpacity="0" />
            <stop offset="50%" stopColor="#FBF3D9" stopOpacity="0.7" />
            <stop offset="100%" stopColor={GOLD_400} stopOpacity="0" />
          </linearGradient>
        </defs>
      ) : null}

      {/* Outer ring. */}
      <circle
        cx={center}
        cy={center}
        r={ringRadius}
        stroke={paint}
        strokeWidth={ringStroke}
      />

      {/* Subtle horizontal baseline glow through the middle. */}
      <rect
        x={center - ringRadius + 6}
        y={center - 0.5}
        width={(ringRadius - 6) * 2}
        height={1}
        fill={variant === 'gold' ? `url(#${glowId})` : paint}
        opacity={variant === 'gold' ? 1 : 0.35}
      />

      {/* Symmetric bars. */}
      <g fill={paint}>
        {WAVE_BARS.map((bar) => {
          // Stagger pulse outward from the centre for an organic equalizer feel.
          const delay = Math.abs(bar.index - (WAVE_BARS.length - 1) / 2) * 0.05;
          const scale = 0.55 + bar.amplitude * 0.45;
          return (
            <motion.rect
              key={bar.index}
              x={bar.x - barWidth / 2}
              y={bar.y}
              width={barWidth}
              height={bar.height}
              rx={barWidth / 2}
              style={{ originX: '50%', originY: '50%', transformBox: 'fill-box' }}
              animate={
                shouldAnimate
                  ? { scaleY: [scale, 1, scale], opacity: [0.7, 1, 0.7] }
                  : undefined
              }
              transition={
                shouldAnimate
                  ? {
                      duration: 1.4,
                      delay,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
                  : undefined
              }
            />
          );
        })}
      </g>
    </svg>
  );
}
