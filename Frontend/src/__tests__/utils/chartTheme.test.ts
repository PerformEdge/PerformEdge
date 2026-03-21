import { applyChartTheme } from '@/utils/chartTheme';
import { Chart as ChartJS } from 'chart.js';

describe('applyChartTheme', () => {
  it('updates chart defaults for dark mode', () => {
    applyChartTheme('dark');
    expect(ChartJS.defaults.plugins.tooltip.borderWidth).toBe(1);
  });

  it('updates chart defaults for light mode', () => {
    applyChartTheme('light');
    expect(ChartJS.defaults.plugins.tooltip.borderWidth).toBe(1);
  });
});
