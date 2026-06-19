import { describe, it, expect } from 'vitest';
import { BAR_HEIGHTS } from '@/components/brand/waveGeometry';
import { WAVE_BARS as MJS_BARS } from '../../scripts/svgGeometry.mjs';

// The standalone SVG generator keeps its own copy of the wave geometry (it must
// run as plain Node ESM at build time). Guard against the two copies drifting.
describe('wave geometry sync', () => {
  it('the build-script profile matches the component profile', () => {
    const mjsHeights = MJS_BARS.map((b: { height: number }) => b.height);
    expect(mjsHeights).toEqual([...BAR_HEIGHTS]);
  });
});
