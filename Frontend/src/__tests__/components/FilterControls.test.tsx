import { render, screen, fireEvent } from '@testing-library/react';
import FilterControls from '@/components/FilterControls';

describe('FilterControls', () => {
  const props = {
    start: '2025-01-01',
    end: '2025-01-07',
    setStart: vi.fn(),
    setEnd: vi.fn(),
    department: 'Engineering',
    setDepartment: vi.fn(),
    locationFilter: 'Head Office',
    setLocationFilter: vi.fn(),
  };

  it('opens the date popover and clears selected dates', () => {
    render(<FilterControls {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /select date range/i }));
    expect(screen.getByText(/select date range/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(props.setStart).toHaveBeenCalledWith('');
    expect(props.setEnd).toHaveBeenCalledWith('');
  });

  it('selects department and location options', () => {
    render(<FilterControls {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /department/i }));
    fireEvent.click(screen.getByText('HR'));
    expect(props.setDepartment).toHaveBeenCalledWith('HR');

    fireEvent.click(screen.getByRole('button', { name: /location/i }));
    fireEvent.click(screen.getByText('Remote'));
    expect(props.setLocationFilter).toHaveBeenCalledWith('Remote');
  });
});
