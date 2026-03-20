import { render, screen } from '@testing-library/react';
import { Reveal } from '@/components/Reveal';

describe('Reveal', () => {
  it('renders children', () => {
    render(<Reveal className='hero'>Visible content</Reveal>);
    expect(screen.getByText('Visible content')).toBeInTheDocument();
  });
});
