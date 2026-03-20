import { render } from '@testing-library/react';
import { Separator } from '@/components/ui/separator';

describe('Separator', () => {
  it('renders a horizontal divider', () => {
    const { container } = render(<Separator className='extra' />);
    expect(container.firstChild).toHaveClass('h-px');
  });
});
