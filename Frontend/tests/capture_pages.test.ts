import { vi } from 'vitest';

describe('capture_pages.js', () => {
  it('attempts to capture the configured pages', async () => {
    vi.resetModules();
    const goto = vi.fn(async () => undefined);
    const waitForTimeout = vi.fn(async () => undefined);
    const title = vi.fn(async () => 'Demo');
    const screenshot = vi.fn(async () => undefined);
    const on = vi.fn();
    const close = vi.fn(async () => undefined);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    vi.doMock('playwright', () => ({
      chromium: {
        launch: vi.fn(async () => ({
          newPage: async () => ({ goto, waitForTimeout, title, screenshot, on }),
          close,
        })),
      },
    }));

    await import('../capture_pages.js');

    await vi.waitFor(() => {
      expect(goto).toHaveBeenCalledTimes(2);
      expect(screenshot).toHaveBeenCalledTimes(2);
      expect(close).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });
});
