import { render, screen } from '@testing-library/react';
import { FormAlert } from '@/components/FormAlert';

describe('FormAlert', () => {
  it('renders message prop content', () => {
    render(<FormAlert variant='success' message='Saved successfully' />);
    expect(screen.getByRole('alert')).toHaveTextContent('Saved successfully');
  });

  it('supports children content', () => {
    render(<FormAlert variant='info'>Helpful note</FormAlert>);
    expect(screen.getByRole('alert')).toHaveTextContent('Helpful note');
  });

  it('returns null when there is no content', () => {
    const { container } = render(<FormAlert />);
    expect(container).toBeEmptyDOMElement();
  });
});
