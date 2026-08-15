import { describe, expect, it } from 'vitest';
import { QUALITY_LEVELS } from '../client/src/quality/qualityLevels';

describe('quality ladder', () => {
  it('keeps all intermediate degradation steps at 720p before 480p', () => {
    const descending = [...QUALITY_LEVELS].reverse();
    const after1080p = descending.slice(descending.findIndex(q => q.height === 720));
    const first480p = after1080p.findIndex(q => q.height === 480);
    expect(after1080p.slice(0, first480p).every(q => q.height === 720)).toBe(true);
    expect(after1080p[first480p].height).toBe(480);
  });
  it('provides progressively higher-bitrate 1080p tiers', () => {
    const fullHd = QUALITY_LEVELS.filter(q => q.height === 1080);
    expect(fullHd.map(q => q.bitrate)).toEqual([3_200_000, 5_000_000]);
  });
  it('provides normal and high-bitrate 4K tiers', () => {
    const ultraHd = QUALITY_LEVELS.filter(q => q.height === 2160);
    expect(ultraHd.map(q => q.bitrate)).toEqual([15_000_000, 25_000_000]);
  });
  it('is ordered by increasing bitrate', () => {
    expect(QUALITY_LEVELS.map(q => q.bitrate)).toEqual([...QUALITY_LEVELS].map(q => q.bitrate).sort((a, b) => a - b));
  });
});
