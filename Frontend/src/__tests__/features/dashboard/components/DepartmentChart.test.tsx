import { render, screen } from '@testing-library/react';
import { DepartmentChart } from '@/features/dashboard/components/DepartmentChart';

describe('DepartmentChart', () => {
  it('renders a doughnut chart placeholder', () => {
    render(<DepartmentChart />);
    expect(screen.getByTestId('chart-doughnut')).toBeInTheDocument();
  });
});
