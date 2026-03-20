import { render, screen } from '@testing-library/react';
import { Toaster } from '@/components/ui/sonner';

describe('Toaster', () => {
  it('renders the wrapped sonner component', () => {
    render(<Toaster theme='light' />);
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });
});
