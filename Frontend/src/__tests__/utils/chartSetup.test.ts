import { vi } from 'vitest';

describe('chartSetup', () => {
  it('registers chart building blocks', async () => {
    const register = vi.fn();
    vi.doMock('chart.js', () => ({
      Chart: { register },
      ArcElement: 'ArcElement',
      BarElement: 'BarElement',
      CategoryScale: 'CategoryScale',
      LinearScale: 'LinearScale',
      Tooltip: 'Tooltip',
      Legend: 'Legend',
      LineElement: 'LineElement',
      PointElement: 'PointElement',
      Filler: 'Filler',
      Title: 'Title',
    }));
    await import('@/utils/chartSetup');
    expect(register).toHaveBeenCalled();
  });
});
