import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';

describe('Feature DashboardLayout', () => {
  it('renders sidebar navigation and children', () => {
    render(
      <MemoryRouter>
        <DashboardLayout>
          <div>Inner content</div>
        </DashboardLayout>
      </MemoryRouter>
    );

    expect(screen.getByText('PerformEdge')).toBeInTheDocument();
    expect(screen.getByText('Inner content')).toBeInTheDocument();
  });
});
