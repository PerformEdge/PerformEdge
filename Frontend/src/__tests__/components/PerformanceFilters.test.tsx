import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PerformanceFilters from '@/components/PerformanceFilters';

describe('PerformanceFilters', () => {
  const props = {
    dateRange: '2025-01-01 to 2025-01-07',
    onDateRangeChange: vi.fn(),
    department: '',
    onDepartmentChange: vi.fn(),
    location: '',
    onLocationChange: vi.fn(),
  };

  it('loads remote options and renders placeholders', async () => {
    render(<PerformanceFilters {...props} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'Department' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Location' })).toBeInTheDocument();
  });

  it('applies a valid date range', () => {
    render(<PerformanceFilters {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /2025-01-01 - 2025-01-07/i }));
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(props.onDateRangeChange).toHaveBeenCalledWith('2025-01-01 to 2025-01-07');
  });
});
