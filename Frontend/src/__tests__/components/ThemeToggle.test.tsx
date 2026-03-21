import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/context/theme';
import { ThemeToggleButton, ThemeToggleFab } from '@/components/ThemeToggle';

function renderInTheme(ui: React.ReactElement) {
  return render(<ThemeProvider defaultTheme='dark'>{ui}</ThemeProvider>);
}

describe('ThemeToggle', () => {
  it('toggles the label when clicked', () => {
    renderInTheme(<ThemeToggleButton showLabel />);
    expect(screen.getByRole('button', { name: /toggle theme/i })).toHaveTextContent(/dark mode/i);
    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('renders the floating action button', () => {
    renderInTheme(<ThemeToggleFab />);
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
  });
});
