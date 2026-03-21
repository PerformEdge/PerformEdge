import { render, screen } from '@testing-library/react';
import { Button, buttonClasses } from '@/components/ui/button';

describe('button.tsx', () => {
  it('builds class names for variants and sizes', () => {
    expect(buttonClasses({ variant: 'outline', size: 'sm' })).toContain('border');
    expect(buttonClasses({ size: 'icon' })).toContain('w-10');
  });

  it('renders a button with content', () => {
    render(<Button variant='secondary'>Click</Button>);
    expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
  });
});
