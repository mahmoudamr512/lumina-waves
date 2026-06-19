import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import {
  LuminaWaveMark,
  LuminaWordmark,
  LuminaLogo,
  BAR_HEIGHTS,
} from '@/components/brand';

/** Stub matchMedia (jsdom doesn't implement it) so useReducedMotion works. */
function setReducedMotion(prefersReduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? prefersReduced : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  setReducedMotion(false);
});

describe('LuminaWaveMark', () => {
  it('renders an <svg>', () => {
    const { container } = render(<LuminaWaveMark />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders one rect per bar in the height profile', () => {
    const { container } = render(<LuminaWaveMark />);
    // bars + the baseline glow rect
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(BAR_HEIGHTS.length + 1);
  });

  it('emits a gradient for the default (gold) variant', () => {
    const { container } = render(<LuminaWaveMark />);
    expect(container.querySelector('linearGradient')).toBeInTheDocument();
  });

  it('does NOT emit a gradient for variant="mono"', () => {
    const { container } = render(<LuminaWaveMark variant="mono" />);
    expect(container.querySelector('linearGradient')).not.toBeInTheDocument();
  });

  it('renders without throwing when prefers-reduced-motion is set and animated', () => {
    setReducedMotion(true);
    expect(() =>
      render(<LuminaWaveMark animated title="Lumina Waves" />),
    ).not.toThrow();
  });

  it('exposes an accessible name when title is given', () => {
    const { container } = render(<LuminaWaveMark title="Lumina Waves" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(container.querySelector('title')?.textContent).toBe('Lumina Waves');
  });
});

describe('gradient id uniqueness', () => {
  it('gives two instances on one page distinct gradient ids', () => {
    const { container } = render(
      <>
        <LuminaWaveMark />
        <LuminaWaveMark />
      </>,
    );
    const ids = Array.from(container.querySelectorAll('linearGradient')).map(
      (g) => g.getAttribute('id'),
    );
    const uniqueIds = new Set(ids);
    expect(ids.length).toBeGreaterThan(0);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('LuminaWordmark', () => {
  it('renders the three wordmark lines', () => {
    const { getByText } = render(<LuminaWordmark />);
    expect(getByText('LUMINA')).toBeInTheDocument();
    expect(getByText('WAVES')).toBeInTheDocument();
    expect(getByText('PRODUCTIONS')).toBeInTheDocument();
  });
});

describe('LuminaLogo', () => {
  it('renders the mark (an <svg>) in the default stacked layout', () => {
    const { container } = render(<LuminaLogo />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders the wordmark alongside the mark in stacked/horizontal layouts', () => {
    const { container, getByText } = render(<LuminaLogo layout="horizontal" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(getByText('LUMINA')).toBeInTheDocument();
  });

  it('layout="mark" renders only the mark (no wordmark text)', () => {
    const { container, queryByText } = render(<LuminaLogo layout="mark" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(queryByText('LUMINA')).not.toBeInTheDocument();
  });
});

describe('wave height profile', () => {
  it('is symmetric and peaks in the centre', () => {
    const n = BAR_HEIGHTS.length;
    for (let i = 0; i < n; i++) {
      expect(BAR_HEIGHTS[i]).toBe(BAR_HEIGHTS[n - 1 - i]);
    }
    const max = Math.max(...BAR_HEIGHTS);
    expect(BAR_HEIGHTS[Math.floor(n / 2)]).toBe(max);
  });
});
