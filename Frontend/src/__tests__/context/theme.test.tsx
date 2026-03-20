import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/context/theme';

function Consumer() {
  const { theme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span>{theme}</span>
      <button onClick={() => setTheme('light')}>set-light</button>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  );
}

describe('theme context', () => {
  it('provides theme controls', () => {
    render(
      <ThemeProvider defaultTheme='dark'>
        <Consumer />
      </ThemeProvider>
    );
    expect(screen.getByText('dark')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'set-light' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('throws when useTheme is called without a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Consumer />)).toThrow(/useTheme must be used within ThemeProvider/i);
  });
});
