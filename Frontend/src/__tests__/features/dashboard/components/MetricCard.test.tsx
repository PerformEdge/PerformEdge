import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { MetricCard } from '@/features/dashboard/components/MetricCard';

describe('MetricCard', () => {
  it('renders title, value, and trend', () => {
    render(<MetricCard title='Employees' value='42' icon={Users} trend='+5%' trendUp />);
    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('+5%')).toBeInTheDocument();
  });
});
