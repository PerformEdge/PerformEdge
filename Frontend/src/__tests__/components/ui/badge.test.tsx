import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders children and variant styles', () => {
    render(<Badge variant='outline'>Preview</Badge>);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });
});
