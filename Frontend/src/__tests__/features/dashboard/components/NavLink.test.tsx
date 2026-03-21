import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavLink } from '@/features/dashboard/components/NavLink';

describe('NavLink', () => {
  it('renders a routed anchor', () => {
    render(
      <MemoryRouter>
        <NavLink to='/dashboard' activeClassName='active'>Dashboard</NavLink>
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
  });
});
