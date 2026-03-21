import { render, screen } from '@testing-library/react';
import { AttendanceChart } from '@/features/dashboard/components/AttendanceChart';

describe('AttendanceChart', () => {
  it('renders a chart placeholder', () => {
    render(<AttendanceChart />);
    expect(screen.getByTestId('chart-bar')).toBeInTheDocument();
  });
});
